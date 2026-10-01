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
from urllib.parse import quote

from sqlalchemy import text
from sqladmin import Admin, BaseView, ModelView, expose
from sqladmin.authentication import AuthenticationBackend
from sqladmin.filters import OperationColumnFilter
from starlette.middleware import Middleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import HTMLResponse, RedirectResponse

from app.db import MIND_SCHEMA, SessionLocal
from app.mind.nl_resolver import (
    band_phrase, invalidate, resolve_event_reading, threshold,
)
from app.mind.perceive import perceive_events
from app.mind.provisioning import (
    NEUTRAL_MOOD, get_or_create_brain, reassign_mold, seed_starter_beliefs,
)
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
    name_plural = 'Bands'
    category = 'Narration Tuner'
    column_descriptions = {
        'table_name': 'Bandable field, e.g. temperature — a numeric field turns into words.',
        'ordinal': 'Tier picked from lowest to highest matching `below`.',
        'below': 'Upper bound: this row wins when value < below.',
        'phrase': 'The words the narrator/mind sees for this tier.',
    }
    column_list = [
        NlBand.game_id, NlBand.table_name, NlBand.ordinal,
        NlBand.below, NlBand.phrase, NlBand.meta,
    ]
    column_filters = _filters(NlBand.game_id, NlBand.table_name)
    column_searchable_list = [NlBand.table_name, NlBand.phrase]


class NlThresholdAdmin(_InvalidateNlCache, ModelView, model=NlThreshold):
    name = 'Thresholds'
    name_plural = 'Thresholds'
    category = 'Narration Tuner'
    column_descriptions = {
        'key': 'Named cutoff, e.g. wind.gusty — used by rules and wording.',
        'value': 'The numeric cutoff.',
    }
    column_list = [NlThreshold.game_id, NlThreshold.key, NlThreshold.value]
    column_filters = _filters(NlThreshold.game_id, NlThreshold.key)
    column_searchable_list = [NlThreshold.key]


class NlPhraseListAdmin(_InvalidateNlCache, ModelView, model=NlPhraseList):
    name = 'Phrase lists'
    name_plural = 'Phrase lists'
    category = 'Narration Tuner'
    column_descriptions = {
        'key': 'Phrase family, e.g. climate.snowbound — a multi-day state or event reading.',
        'ordinal': 'Tier inside the family (0/1/2 = escalating days of the streak).',
        'phrase': 'The line the mind/narrator reads at that tier.',
    }
    column_list = [
        NlPhraseList.game_id, NlPhraseList.key,
        NlPhraseList.ordinal, NlPhraseList.phrase,
    ]
    column_filters = _filters(NlPhraseList.game_id, NlPhraseList.key)
    column_searchable_list = [NlPhraseList.key, NlPhraseList.phrase]


class FacetAdmin(_InvalidateNlCache, ModelView, model=Facet):
    name = 'Facets'
    name_plural = 'Facets'
    category = 'Narration Tuner'
    column_descriptions = {
        'event_type': 'Event type this field belongs to.',
        'field_path': 'Path inside event data that can be banded to words.',
        'unit': 'Unit of the raw value (km, °C, m/s…).',
        'description': 'What this field means — admin-facing.',
    }
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
    name_plural = 'Brain molds'
    category = 'Mind Tuner'
    column_descriptions = {
        'slug': 'Preset id — what brains reference as mold_slug.',
        'name': 'Display name of the preset.',
        'description': 'What this mind archetype is for.',
    }
    column_list = [
        BrainMold.game_id, BrainMold.slug, BrainMold.name, BrainMold.description,
    ]
    column_filters = _filters(BrainMold.game_id, BrainMold.slug)


class MoldThemeWeightAdmin(ModelView, model=MoldThemeWeight):
    name = 'Mold theme weights'
    name_plural = 'Mold theme weights'
    category = 'Mind Tuner'
    column_descriptions = {
        'mold_id': 'Which preset this weight belongs to.',
        'key': 'Tag pattern, e.g. tag:entity_type:undead — `*` suffix matches a family.',
        'weight': 'How much this theme raises salience when it appears (w_theme × weight).',
    }
    column_list = [MoldThemeWeight.mold_id, MoldThemeWeight.key, MoldThemeWeight.weight]
    column_filters = _filters(MoldThemeWeight.mold_id, MoldThemeWeight.key)


class MoldWiringAdmin(ModelView, model=MoldWiring):
    name = 'Mold wiring'
    name_plural = 'Mold wiring'
    category = 'Mind Tuner'
    column_descriptions = {
        'mold_id': 'Which preset this knob belongs to.',
        'key': 'Wiring knob, e.g. decay, retrieval_top_k — see DEFAULT_WIRING in provisioning.py.',
        'value': 'The knob value (float, int, list or dict).',
    }
    column_list = [MoldWiring.mold_id, MoldWiring.key, MoldWiring.value]
    column_filters = _filters(MoldWiring.mold_id, MoldWiring.key)


class MoldStarterBeliefAdmin(ModelView, model=MoldStarterBelief):
    name = 'Mold starter beliefs'
    name_plural = 'Mold starter beliefs'
    category = 'Mind Tuner'
    column_descriptions = {
        'mold_id': 'Which preset seeds this belief.',
        'kind': 'Belief kind (world / self / others…).',
        'statement': 'The seed conviction a fresh brain starts with.',
        'confidence': 'How strongly held (0–1).',
        'boosts': 'Optional theme-weight boosts this belief applies while confident (B6).',
    }
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
    name_plural = 'Composite rules'
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
    name_plural = 'Pack versions'
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
    name_plural = 'Brain NL overrides'
    category = 'Mind Tuner'
    column_descriptions = {
        'brain_id': 'The living brain these phrases belong to.',
        'kind': 'Override kind: band, threshold or phrase list.',
        'key': 'The key this brain answers differently, e.g. climate.drenched.',
        'phrase': 'This brain’s own words for the tier.',
    }
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
    name_plural = 'Brains'
    category = 'Mind Tuner'
    column_descriptions = {
        'character_id': 'Host character id (character_state.id as text).',
        'mold_slug': 'Preset this brain was cloned from.',
        'mood': 'Lived state — visible, not config.',
    }
    column_list = [
        Brain.game_id, Brain.character_id, Brain.mold_slug, Brain.mood,
    ]
    column_filters = _filters(Brain.game_id, Brain.character_id, Brain.mold_slug)
    column_searchable_list = [Brain.character_id]


class BeliefAdmin(ModelView, model=Belief):
    """Beliefs per character — creating a row here is how you seed a
    backstory conviction by hand (origin stays editable)."""

    name = 'Beliefs'
    name_plural = 'Beliefs'
    category = 'Mind Tuner'
    column_list = [
        Belief.character_id, Belief.kind, Belief.horizon,
        Belief.statement,
        Belief.confidence, Belief.status, Belief.origin, Belief.boosts,
    ]
    column_filters = _filters(
        Belief.game_id, Belief.character_id, Belief.kind,
        Belief.horizon, Belief.status,
    )
    column_searchable_list = [Belief.character_id, Belief.statement]


# --------------------------------------------------------------------------
# Mind Tuner — readonly lived state
# --------------------------------------------------------------------------
class EpisodeAdmin(ModelView, model=Episode):
    name = 'Episodes'
    name_plural = 'Episodes'
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
    name_plural = 'Memories'
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
    name_plural = 'Needs'
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
table{{border-collapse:collapse;margin:.5em 0 1.5em}}
th,td{{border:1px solid #ddd;padding:.3em .6em;text-align:left;font-size:.9em;vertical-align:top}}
select,input[type=checkbox]{{width:auto}}
button{{cursor:pointer}}
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
    category = 'Narration Tuner'

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
    category = 'Mind State'

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


class MindTunerView(BaseView):
    """Per-character mind hub: pick a user -> one of their characters ->
    the brain dashboard. Config (mold/preset, wiring, theme_weights) is
    editable here; the lived content (memories, beliefs, needs, episodes)
    is read in place. Templates (characters with no owner) group first."""

    name = 'Minds'
    icon = 'fa-solid fa-brain'
    category = 'Mind Tuner'

    @expose('/mind-tuner', methods=['GET', 'POST'])
    async def mind_tuner(self, request):
        game_id = request.query_params.get('game') or 'middle_earth'
        if request.method == 'POST':
            return await self._act(request, game_id)
        character_id = request.query_params.get('character_id') or ''
        msg = request.query_params.get('msg') or ''
        banner = (
            f'<div class="result"><b>{html.escape(msg)}</b></div>'
            if msg else ''
        )
        if character_id:
            body = self._dashboard(game_id, character_id)
        else:
            body = self._landing(game_id)
        return _page('Mind Tuner', banner + body)

    # ------------------------------------------------------------------
    # Landing: the roster — users and their characters' brains.
    # ------------------------------------------------------------------
    def _landing(self, game_id):
        session = SessionLocal()
        try:
            rows = session.execute(text(f"""
                SELECT COALESCE(u.username, u.email, '(templates)') AS owner,
                       cs.id::text AS cid, cs.slug, cs.name,
                       b.id AS brain_id, b.mold_slug,
                       (SELECT count(*) FROM {MIND_SCHEMA}.memories m
                         WHERE m.character_id = cs.id::text
                           AND m.game_id = :game) AS mem_count
                FROM character_state cs
                LEFT JOIN users u ON u.id = cs.owner_user_id
                LEFT JOIN {MIND_SCHEMA}.brains b
                  ON b.character_id = cs.id::text AND b.game_id = :game
                ORDER BY owner, cs.name
            """), {'game': game_id}).all()
            orphans = session.execute(text(f"""
                SELECT b.character_id, b.mold_slug,
                       (SELECT count(*) FROM {MIND_SCHEMA}.memories m
                         WHERE m.character_id = b.character_id
                           AND m.game_id = :game) AS mem_count
                FROM {MIND_SCHEMA}.brains b
                LEFT JOIN character_state cs ON cs.id::text = b.character_id
                WHERE b.game_id = :game AND cs.id IS NULL
                ORDER BY b.character_id
            """), {'game': game_id}).all()
        finally:
            session.close()
        out = [
            f'<h2>Mind Tuner <small>({html.escape(game_id)})</small></h2>',
            '<p>Pick a character to inspect and tune its mind.</p>',
            '<table><tr><th>owner</th><th>character</th><th>slug</th>'
            '<th>mold</th><th>memories</th><th></th></tr>',
        ]
        for owner, cid, slug, name, brain_id, mold, mem_count in rows:
            link = (
                f'<a href="?character_id={html.escape(cid)}">open</a>'
                if brain_id else '<i>no brain yet</i>'
            )
            out.append(
                f'<tr><td>{html.escape(str(owner))}</td>'
                f'<td>{html.escape(name or "")}</td>'
                f'<td><code>{html.escape(slug)}</code></td>'
                f'<td>{html.escape(mold or "—")}</td>'
                f'<td>{mem_count}</td><td>{link}</td></tr>'
            )
        out.append('</table>')
        if orphans:
            out.append(
                f'<details><summary>orphan brains ({len(orphans)}) — '
                'no character row</summary><table><tr><th>character_id</th>'
                '<th>mold</th><th>memories</th><th></th></tr>'
            )
            for cid, mold, mem_count in orphans:
                out.append(
                    f'<tr><td><code>{html.escape(cid)}</code></td>'
                    f'<td>{html.escape(mold or "—")}</td><td>{mem_count}</td>'
                    f'<td><a href="?character_id={html.escape(cid)}">open</a>'
                    '</td></tr>'
                )
            out.append('</table></details>')
        return ''.join(out)

    # ------------------------------------------------------------------
    # Dashboard: one brain — editable nature, readable nurture.
    # ------------------------------------------------------------------
    def _dashboard(self, game_id, character_id):
        session = SessionLocal()
        try:
            brain = (
                session.query(Brain)
                .filter_by(game_id=game_id, character_id=character_id)
                .one_or_none()
            )
            if brain is None:
                return (
                    '<div class="result">no brain for '
                    f'<code>{html.escape(character_id)}</code> — it is '
                    'provisioned on first mind open.</div>'
                    '<p><a href="?">back</a></p>'
                )
            char = session.execute(text("""
                SELECT cs.name, cs.slug,
                       COALESCE(u.username, u.email) AS owner
                FROM character_state cs
                LEFT JOIN users u ON u.id = cs.owner_user_id
                WHERE cs.id::text = :cid
            """), {'cid': character_id}).first()
            molds = (
                session.query(BrainMold)
                .filter_by(game_id=game_id).order_by(BrainMold.slug).all()
            )
            beliefs = (
                session.query(Belief)
                .filter_by(game_id=game_id, character_id=character_id)
                .order_by(Belief.status, Belief.confidence.desc()).all()
            )
            memories = (
                session.query(Memory)
                .filter_by(game_id=game_id, character_id=character_id)
                .order_by(Memory.importance.desc()).limit(40).all()
            )
            needs = (
                session.query(Need)
                .filter_by(game_id=game_id, character_id=character_id)
                .order_by(Need.urgency.desc()).all()
            )
            episodes = (
                session.query(Episode)
                .filter_by(game_id=game_id, character_id=character_id)
                .order_by(Episode.created_at.desc()).limit(15).all()
            )
        finally:
            session.close()

        cid = html.escape(character_id)
        h = [
            '<p><a href="?">&larr; all minds</a></p>',
            f'<h2>{html.escape(char.name if char and char.name else character_id)}'
            f' <small><code>{cid}</code></small></h2>',
            '<p>'
            f'owner: <b>{html.escape(str(char.owner)) if char and char.owner else "—"}</b> · '
            f'brain: <code>{html.escape(brain.id)}</code> · '
            f'mold: <b>{html.escape(brain.mold_slug)}</b></p>',
            '<h3>mood &amp; counters</h3>',
            f'<pre>{html.escape(json.dumps({"mood": brain.mood, "counters": brain.counters}, indent=2))}</pre>',
        ]

        # --- config forms -------------------------------------------------
        h.append('<h3>preset (brain mold)</h3><form method="post">'
                 f'<input type="hidden" name="character_id" value="{cid}">'
                 '<input type="hidden" name="action" value="apply_mold">'
                 '<select name="slug">')
        for m in molds:
            sel = ' selected' if m.slug == brain.mold_slug else ''
            h.append(
                f'<option value="{html.escape(m.slug)}"{sel}>'
                f'{html.escape(m.slug)}</option>'
            )
        h.append('</select> '
                 '<label style="display:inline"><input type="checkbox" '
                 'name="reclone"> reclone wiring + theme weights '
                 '(memories &amp; beliefs kept)</label> '
                 '<button type="submit">apply</button></form>')

        h.append(
            '<h3>wiring</h3><form method="post">'
            f'<input type="hidden" name="character_id" value="{cid}">'
            '<input type="hidden" name="action" value="wiring">'
            f'<textarea name="value" rows="12">{html.escape(json.dumps(brain.wiring, indent=2, sort_keys=True))}</textarea>'
            '<button type="submit">save wiring</button></form>'
            '<h3>theme weights</h3><form method="post">'
            f'<input type="hidden" name="character_id" value="{cid}">'
            '<input type="hidden" name="action" value="theme_weights">'
            f'<textarea name="value" rows="8">{html.escape(json.dumps(brain.theme_weights, indent=2, sort_keys=True))}</textarea>'
            '<button type="submit">save theme weights</button></form>'
        )
        h.append(
            '<h3>reset</h3><form method="post" onsubmit="return confirm('
            "'Wipe all memories, beliefs, needs and episodes? Mold config "
            "survives and starter beliefs are re-seeded.')\">"
            f'<input type="hidden" name="character_id" value="{cid}">'
            '<input type="hidden" name="action" value="reset">'
            '<button type="submit">wipe lived mind</button></form>'
        )

        # --- lived content -------------------------------------------------
        h.append('<h3>needs</h3><table><tr><th>key</th><th>type</th>'
                 '<th>status</th><th>urgency</th><th>description</th></tr>')
        for n in needs:
            h.append(
                f'<tr><td>{html.escape(n.key)}</td><td>{html.escape(n.type)}</td>'
                f'<td>{html.escape(n.status)}</td><td>{n.urgency:.2f}</td>'
                f'<td>{html.escape(n.description or "")}</td></tr>'
            )
        h.append('</table><h3>beliefs</h3><table><tr><th>kind</th>'
                 '<th>horizon</th><th>conf</th><th>status</th>'
                 '<th>origin</th><th>statement</th></tr>')
        for b in beliefs:
            h.append(
                f'<tr><td>{html.escape(b.kind)}</td>'
                f'<td>{html.escape(b.horizon or "")}</td>'
                f'<td>{b.confidence:.2f}</td>'
                f'<td>{html.escape(b.status)}</td>'
                f'<td>{html.escape(b.origin)}</td>'
                f'<td>{html.escape(b.statement)}</td></tr>'
            )
        h.append('</table><h3>memories (top 40 by importance)</h3>'
                 '<table><tr><th>imp</th><th>str</th><th>evoc</th>'
                 '<th>cons</th><th>kind</th><th>desc</th></tr>')
        for m in memories:
            h.append(
                f'<tr><td>{m.importance:.2f}</td><td>{m.strength:.2f}</td>'
                f'<td>{m.evocations}</td>'
                f'<td>{"✓" if m.consolidated else ""}</td>'
                f'<td>{html.escape(m.kind)}</td>'
                f'<td>{html.escape(m.desc)}</td></tr>'
            )
        h.append('</table><h3>recent episodes</h3><table><tr><th>id</th>'
                 '<th>ref</th><th>status</th><th>mood</th></tr>')
        for e in episodes:
            h.append(
                f'<tr><td>{e.id}</td>'
                f'<td>{html.escape(e.episode_ref or "")}</td>'
                f'<td>{html.escape(e.status or "")}</td>'
                f'<td><code>{html.escape(json.dumps(e.mood or {}))}</code></td></tr>'
            )
        h.append('</table>')
        return ''.join(h)

    # ------------------------------------------------------------------
    # Writes.
    # ------------------------------------------------------------------
    async def _act(self, request, game_id):
        form = await request.form()
        character_id = (form.get('character_id') or '').strip()
        action = form.get('action') or ''
        msg = 'nothing done'

        session = SessionLocal()
        try:
            if action == 'apply_mold':
                brain = reassign_mold(
                    session, game_id, character_id,
                    form.get('slug') or '',
                    reclone=bool(form.get('reclone')),
                )
                session.commit()
                msg = (
                    f'mold set to {brain.mold_slug}'
                    + (' (recloned)' if form.get('reclone') else '')
                    if brain else 'brain not found'
                )
            elif action in ('wiring', 'theme_weights'):
                brain = (
                    session.query(Brain)
                    .filter_by(game_id=game_id, character_id=character_id)
                    .one_or_none()
                )
                if brain is None:
                    msg = 'brain not found'
                else:
                    try:
                        value = json.loads(form.get('value') or '{}')
                    except json.JSONDecodeError as exc:
                        msg = f'invalid JSON: {exc}'
                    else:
                        if isinstance(value, dict):
                            setattr(brain, action, value)
                            session.commit()
                            msg = f'{action} saved'
                        else:
                            msg = 'expected a JSON object'
            elif action == 'reset':
                brain = (
                    session.query(Brain)
                    .filter_by(game_id=game_id, character_id=character_id)
                    .one_or_none()
                )
                if brain is None:
                    msg = 'brain not found'
                else:
                    for model in (Memory, Belief, Need, Episode):
                        session.query(model).filter_by(
                            game_id=game_id, character_id=character_id
                        ).delete()
                    brain.mood = dict(NEUTRAL_MOOD)
                    brain.counters = {}
                    mold = (
                        session.query(BrainMold)
                        .filter_by(game_id=game_id, slug=brain.mold_slug)
                        .one_or_none()
                    )
                    seeds = seed_starter_beliefs(
                        session, game_id, character_id, mold
                    )
                    session.commit()
                    msg = f'mind wiped; {len(seeds)} starter beliefs re-seeded'
        finally:
            session.close()

        return RedirectResponse(
            f'/admin/mind-tuner?character_id={quote(character_id)}'
            f'&msg={quote(msg)}',
            status_code=303,
        )


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
        NlTesterView, MindInspectorView, MindTunerView,
    ):
        admin.add_view(view)
    return admin
