# ============================================================================
# Mind Tuner + Narration Tuner — SQLAdmin mounted at /admin
# ----------------------------------------------------------------------------
# Two admin surfaces in one mount:
#   Narration Tuner — the NL pack per game (bands / thresholds / phrase
#     lists / facets). Saving an nl_* row invalidates the resolver cache,
#     so the next reading or prompt line uses the edit immediately.
#   Mind Tuner — molds and their children, living brains (config editable),
#     beliefs; readonly inspection of episodes and memories, plus a
#     character-level inspector view and a pure-read NL tester.
#
# Auth: ADMIN_USER / ADMIN_PASSWORD env vars. If either is unset the admin
# is mounted but no one can log in — safe by default, never open.
# ============================================================================
import html
import json
import os

from sqladmin import Admin, BaseView, ModelView, expose
from sqladmin.authentication import AuthenticationBackend
from sqladmin.filters import OperationColumnFilter
from starlette.middleware import Middleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import HTMLResponse

from app.db import SessionLocal
from app.mind.nl_resolver import (
    band_phrase, invalidate, resolve_event_reading, threshold,
)
from app.mind.perceive import perceive_events
from app.mind.provisioning import get_or_create_brain
from app.mind.tables import (
    Belief, Brain, BrainMold, BrainNlOverride, CompositeRule, Episode,
    PackVersion,
    Facet, Memory, MoldStarterBelief,
    MoldThemeWeight, MoldWiring, Need, NlBand, NlPhraseList, NlThreshold,
)


class _AdminAuth(AuthenticationBackend):
    """Session login from env credentials. Missing env = nobody logs in."""

    async def login(self, request):
        form = await request.form()
        user = os.environ.get('ADMIN_USER')
        password = os.environ.get('ADMIN_PASSWORD')
        ok = (
            user
            and password
            and form.get('username') == user
            and form.get('password') == password
        )
        if ok:
            request.session['admin'] = True
            return True
        return False

    async def logout(self, request):
        request.session.clear()
        return True

    async def authenticate(self, request):
        return bool(request.session.get('admin'))


def _filters(*cols):
    """sqladmin>=0.32 wants filter objects in column_filters, not bare columns."""
    return [OperationColumnFilter(c) for c in cols]


class _InvalidateNlCache:
    """Saving or deleting an nl_* row must be live on the next reading."""

    async def on_model_change(self, data, model, is_created, request):
        invalidate(model.game_id)

    async def after_model_delete(self, model, request):
        invalidate(model.game_id)


# --------------------------------------------------------------------------
# Narration Tuner
# --------------------------------------------------------------------------
class NlBandAdmin(_InvalidateNlCache, ModelView, model=NlBand):
    name = 'Bands'
    category = 'Narration Tuner'
    column_list = [
        NlBand.game_id, NlBand.table_name, NlBand.ordinal,
        NlBand.below, NlBand.phrase, NlBand.meta,
    ]
    column_filters = _filters(NlBand.game_id, NlBand.table_name)
    column_searchable_list = [NlBand.table_name, NlBand.phrase]


class NlThresholdAdmin(_InvalidateNlCache, ModelView, model=NlThreshold):
    name = 'Thresholds'
    category = 'Narration Tuner'
    column_list = [NlThreshold.game_id, NlThreshold.key, NlThreshold.value]
    column_filters = _filters(NlThreshold.game_id, NlThreshold.key)
    column_searchable_list = [NlThreshold.key]


class NlPhraseListAdmin(_InvalidateNlCache, ModelView, model=NlPhraseList):
    name = 'Phrase lists'
    category = 'Narration Tuner'
    column_list = [
        NlPhraseList.game_id, NlPhraseList.key,
        NlPhraseList.ordinal, NlPhraseList.phrase,
    ]
    column_filters = _filters(NlPhraseList.game_id, NlPhraseList.key)
    column_searchable_list = [NlPhraseList.key, NlPhraseList.phrase]


class FacetAdmin(_InvalidateNlCache, ModelView, model=Facet):
    name = 'Facets'
    category = 'Narration Tuner'
    column_list = [
        Facet.game_id, Facet.event_type, Facet.field_path,
        Facet.unit, Facet.description,
    ]
    column_filters = _filters(Facet.game_id, Facet.event_type)


# --------------------------------------------------------------------------
# Mind Tuner — molds and their children (the nature you can edit)
# --------------------------------------------------------------------------
class BrainMoldAdmin(ModelView, model=BrainMold):
    name = 'Brain molds'
    category = 'Mind Tuner'
    column_list = [
        BrainMold.game_id, BrainMold.slug, BrainMold.name, BrainMold.description,
    ]
    column_filters = _filters(BrainMold.game_id, BrainMold.slug)


class MoldThemeWeightAdmin(ModelView, model=MoldThemeWeight):
    name = 'Mold theme weights'
    category = 'Mind Tuner'
    column_list = [MoldThemeWeight.mold_id, MoldThemeWeight.key, MoldThemeWeight.weight]
    column_filters = _filters(MoldThemeWeight.mold_id, MoldThemeWeight.key)


class MoldWiringAdmin(ModelView, model=MoldWiring):
    name = 'Mold wiring'
    category = 'Mind Tuner'
    column_list = [MoldWiring.mold_id, MoldWiring.key, MoldWiring.value]
    column_filters = _filters(MoldWiring.mold_id, MoldWiring.key)


class MoldStarterBeliefAdmin(ModelView, model=MoldStarterBelief):
    name = 'Mold starter beliefs'
    category = 'Mind Tuner'
    column_list = [
        MoldStarterBelief.mold_id, MoldStarterBelief.kind,
        MoldStarterBelief.statement, MoldStarterBelief.confidence,
        MoldStarterBelief.tags, MoldStarterBelief.boosts,
    ]
    column_filters = _filters(MoldStarterBelief.mold_id, MoldStarterBelief.kind)


class CompositeRuleAdmin(ModelView, model=CompositeRule):
    """B9: declarative multi-day states — editable rules instead of
    hardcoded detectors (snowbound = temp<=1 AND precip>0, N days)."""

    name = 'Composite rules'
    category = 'Mind Tuner'
    column_list = [
        CompositeRule.game_id, CompositeRule.key, CompositeRule.need_type,
        CompositeRule.event_type, CompositeRule.streak_days,
        CompositeRule.conditions, CompositeRule.description,
    ]
    column_filters = _filters(CompositeRule.game_id, CompositeRule.key)


class PackVersionAdmin(ModelView, model=PackVersion):
    """B10 (PRD §9.2): the version ledger — drafts live in their own
    namespace, archives hold frozen snapshots for rollback. Clone/promote
    run through the API; this view is the audit trail."""

    name = 'Pack versions'
    category = 'Mind Tuner'
    column_list = [
        PackVersion.game_id, PackVersion.version, PackVersion.status,
        PackVersion.namespace, PackVersion.note, PackVersion.created_at,
    ]
    column_filters = _filters(PackVersion.game_id, PackVersion.status)
    can_create = False
    can_edit = False
    can_delete = False


class BrainNlOverrideAdmin(ModelView, model=BrainNlOverride):
    """B7: one brain's own NL voice — band/threshold/phrase rows that
    replace the game pack for that character alone."""

    name = 'Brain NL overrides'
    category = 'Mind Tuner'
    column_list = [
        BrainNlOverride.brain_id, BrainNlOverride.kind,
        BrainNlOverride.key, BrainNlOverride.ordinal,
        BrainNlOverride.below, BrainNlOverride.phrase,
        BrainNlOverride.value,
    ]
    column_filters = _filters(BrainNlOverride.brain_id, BrainNlOverride.kind,
                              BrainNlOverride.key)


class BrainAdmin(ModelView, model=Brain):
    """Living brains: the cloned config is editable per character; content
    (mood/counters) is visible but belongs to the life lived."""

    name = 'Brains'
    category = 'Mind Tuner'
    column_list = [
        Brain.game_id, Brain.character_id, Brain.mold_slug, Brain.mood,
    ]
    column_filters = _filters(Brain.game_id, Brain.character_id, Brain.mold_slug)
    column_searchable_list = [Brain.character_id]


class BeliefAdmin(ModelView, model=Belief):
    """Beliefs per character — creating a row here is how you seed a
    backstory conviction by hand (origin stays editable)."""

    name = 'Beliefs'
    category = 'Mind Tuner'
    column_list = [
        Belief.character_id, Belief.kind, Belief.statement,
        Belief.confidence, Belief.status, Belief.origin, Belief.boosts,
    ]
    column_filters = _filters(
        Belief.game_id, Belief.character_id, Belief.kind, Belief.status,
    )
    column_searchable_list = [Belief.character_id, Belief.statement]


# --------------------------------------------------------------------------
# Mind Tuner — readonly lived state
# --------------------------------------------------------------------------
class EpisodeAdmin(ModelView, model=Episode):
    name = 'Episodes'
    category = 'Mind State'
    column_list = [
        Episode.game_id, Episode.character_id, Episode.episode_ref,
        Episode.status, Episode.created_at,
    ]
    column_filters = _filters(Episode.game_id, Episode.character_id, Episode.status)
    column_searchable_list = [Episode.character_id, Episode.episode_ref]
    can_create = False
    can_edit = False
    can_delete = False


class MemoryAdmin(ModelView, model=Memory):
    name = 'Memories'
    category = 'Mind State'
    column_list = [
        Memory.character_id, Memory.desc, Memory.importance,
        Memory.strength, Memory.evocations, Memory.consolidated,
    ]
    column_filters = _filters(Memory.character_id, Memory.consolidated, Memory.kind)
    column_searchable_list = [Memory.character_id, Memory.desc]
    can_create = False
    can_edit = False
    can_delete = False


class NeedAdmin(ModelView, model=Need):
    """Open/resolved intentions — detector needs re-open on their own;
    closing a thread by hand is a legit admin act, so edit stays on."""

    name = 'Needs'
    category = 'Mind State'
    column_list = [
        Need.character_id, Need.key, Need.type, Need.status,
        Need.urgency, Need.description,
    ]
    column_filters = _filters(
        Need.game_id, Need.character_id, Need.type, Need.status,
    )
    column_searchable_list = [Need.character_id, Need.key, Need.description]
    can_create = False
    can_delete = False


# --------------------------------------------------------------------------
# Custom views — NL tester + mind inspector (read-only, no LLM)
# --------------------------------------------------------------------------
_PAGE = """<!doctype html><html><head><title>{title}</title><style>
body{{font-family:monospace;margin:2em;max-width:900px}}
label{{display:block;margin-top:.8em;font-weight:bold}}
input,textarea{{width:100%;padding:.4em;font-family:monospace}}
button{{margin-top:1em;padding:.6em 1.5em}}
.result{{background:#f4f4f4;border:1px solid #ddd;padding:1em;margin-top:1.5em;white-space:pre-wrap}}
a{{font-size:.85em}}
</style></head><body><a href="/admin">&larr; admin</a>{body}</body></html>"""


def _page(title, body):
    return HTMLResponse(_PAGE.format(title=title, body=body))


class NlTesterView(BaseView):
    """Value -> resolved phrase; EventIn JSON -> reading (+ salience if a
    character_id is given). Pure reads through the resolver — no writes,
    no LLM."""

    name = 'NL Tester'
    icon = 'fa-solid fa-flask'

    @expose('/nl-tester', methods=['GET', 'POST'])
    async def nl_tester(self, request):
        result = None
        if request.method == 'POST':
            form = await request.form()
            result = self._run(form)
        return _page('NL Tester', self._form() + (result or ''))

    def _form(self):
        return """
<h2>NL Tester</h2>
<form method="post">
<label>game_id</label><input name="game_id" value="middle_earth">
<label>Band: table name (e.g. temperature)</label><input name="table">
<label>Band: value</label><input name="value">
<label>Threshold key</label><input name="threshold_key">
<label>EventIn JSON (optional — overrides band test)</label>
<textarea name="event_json" rows="6"></textarea>
<label>character_id (optional — computes salience via that brain)</label>
<input name="character_id">
<button type="submit">Resolve</button>
</form>"""

    def _run(self, form):
        game_id = form.get('game_id') or 'middle_earth'
        out = {'game_id': game_id}
        try:
            session = SessionLocal()
            try:
                event_json = (form.get('event_json') or '').strip()
                character_id = (form.get('character_id') or '').strip()
                if event_json:
                    event = json.loads(event_json)
                    out['reading'] = resolve_event_reading(
                        session, game_id, event
                    )
                    if character_id:
                        brain = get_or_create_brain(
                            session, game_id, character_id
                        )
                        perceived = perceive_events(
                            session, game_id, brain, [event]
                        )
                        out['salience'] = perceived[0]['salience']
                        out['tags'] = perceived[0]['tags']
                elif form.get('threshold_key'):
                    key = form['threshold_key']
                    out['threshold'] = {key: threshold(session, game_id, key)}
                elif form.get('table'):
                    value = float(form['value'])
                    out['band'] = {
                        'table': form['table'], 'value': value,
                        'phrase': band_phrase(
                            session, game_id, form['table'], value
                        ),
                    }
            finally:
                session.close()
        except Exception as exc:  # noqa: BLE001 — show the error to the admin
            out['error'] = f'{type(exc).__name__}: {exc}'
        return f'<div class="result">{html.escape(json.dumps(out, indent=2))}</div>'


class MindInspectorView(BaseView):
    """One-character state dump: brain config + mood, beliefs, memories,
    episodes — the same picture GET /mind/state returns, human-readable."""

    name = 'Mind Inspector'
    icon = 'fa-solid fa-brain'

    @expose('/mind-inspector', methods=['GET', 'POST'])
    async def inspector(self, request):
        result = None
        if request.method == 'POST':
            form = await request.form()
            character_id = (form.get('character_id') or '').strip()
            game_id = (form.get('game_id') or '').strip() or None
            if character_id:
                result = self._inspect(game_id, character_id)
        return _page('Mind Inspector', self._form() + (result or ''))

    def _form(self):
        return """
<h2>Mind Inspector</h2>
<form method="post">
<label>character_id</label><input name="character_id">
<label>game_id (optional)</label><input name="game_id">
<button type="submit">Inspect</button>
</form>"""

    def _inspect(self, game_id, character_id):
        session = SessionLocal()
        try:
            brain = (
                session.query(Brain)
                .filter_by(character_id=character_id, **(
                    {'game_id': game_id} if game_id else {}
                ))
                .one_or_none()
            )
            if brain is None:
                return '<div class="result">no brain for this character</div>'
            beliefs = (
                session.query(Belief)
                .filter_by(character_id=character_id)
                .all()
            )
            memories = (
                session.query(Memory)
                .filter_by(character_id=character_id)
                .order_by(Memory.importance.desc())
                .all()
            )
            episodes = (
                session.query(Episode)
                .filter_by(character_id=character_id)
                .order_by(Episode.created_at.desc())
                .all()
            )
            needs = (
                session.query(Need)
                .filter_by(character_id=character_id)
                .order_by(Need.urgency.desc())
                .all()
            )
            dump = {
                'brain': {
                    'mold_slug': brain.mold_slug,
                    'theme_weights': brain.theme_weights,
                    'wiring': brain.wiring,
                    'mood': brain.mood,
                    'counters': brain.counters,
                },
                'beliefs': [
                    {'kind': b.kind, 'statement': b.statement,
                     'confidence': b.confidence, 'status': b.status,
                     'origin': b.origin}
                    for b in beliefs
                ],
                'memories': [
                    {'desc': m.desc, 'importance': m.importance,
                     'strength': round(m.strength, 3),
                     'evocations': m.evocations,
                     'consolidated': m.consolidated}
                    for m in memories
                ],
                'episodes': [
                    {'ref': e.episode_ref, 'status': e.status,
                     'mood': e.mood}
                    for e in episodes
                ],
                'needs': [
                    {'key': n.key, 'type': n.type, 'status': n.status,
                     'urgency': n.urgency, 'description': n.description}
                    for n in needs
                ],
            }
            return (
                f'<div class="result">{html.escape(json.dumps(dump, indent=2))}</div>'
            )
        finally:
            session.close()


def mount_admin(app, engine):
    """Mount the tuners. Called only when the Mind persistence layer is
    available — a broken mind never takes down the narrator."""
    secret = os.environ.get('ADMIN_SECRET_KEY') or 'story-engine-admin-secret'
    admin = Admin(
        app,
        engine,
        base_url='/admin',
        title='Story Engine — Tuners',
        authentication_backend=_AdminAuth(secret),
        middlewares=[
            Middleware(SessionMiddleware, secret_key=secret),
        ],
    )
    for view in (
        NlBandAdmin, NlThresholdAdmin, NlPhraseListAdmin, FacetAdmin,
        BrainMoldAdmin, MoldThemeWeightAdmin, MoldWiringAdmin,
        MoldStarterBeliefAdmin, BrainAdmin, BeliefAdmin,
        BrainNlOverrideAdmin, CompositeRuleAdmin, PackVersionAdmin,
        EpisodeAdmin, MemoryAdmin, NeedAdmin,
        NlTesterView, MindInspectorView,
    ):
        admin.add_view(view)
    return admin
