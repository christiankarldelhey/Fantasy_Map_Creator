# ============================================================================
# The Episode brief — candidates, Focus and what stays silent
# ----------------------------------------------------------------------------
# The Lens is a brief, not an inventory (CONTEXT.md · Lens, Focus). This
# module is the deterministic half: it narrows everything the Mind holds
# down to the candidates that touch this Episode, splits them by time and
# picks a Focus. The LLM director refines the pick; when it is absent (NPC
# minds) or fails, this pick IS the brief.
#
# Two parts, by time — the Lens never names what has not been lived yet:
#   carried  what the Character brings in before anything happens: the
#            entering Mood's cause, Needs already open, Beliefs, Musings
#            and Memories that connect to nothing scheduled today
#   day      what the Episode does to it, each line anchored to the phase
#            where it happens (morning / afternoon / night)
#
# Every candidate that does not make the brief lands in `silenced` with
# its reason, so the Studio can show why a Belief never spoke.
# ============================================================================
import re

from app.mind.attitudes import (
    conviction_facet, conviction_statement, conviction_subjects,
    is_attitude, ladder_norm, match_level,
)
from app.mind.kinds import ROLE_FRAME, ROLE_VOICE, kinds
from app.mind.retrieval import felt_proximity
from app.mind.voice import FELT_ALIAS, mood_name, phrases
from app.mind.provisioning import DEFAULT_WIRING
from app.mind.steps import step
from app.mind.tags import (
    contact_tags as _contact_tags,
    tag_facet,
    tag_family,
)

LINE_CAP = 3
PHASES = {
    'morning': 'morning', 'midday': 'afternoon', 'afternoon': 'afternoon',
    'evening': 'night', 'night': 'night',
}
# Focus eligibility is declared in the Kind Registry ('mind.kinds',
# #167): 'frame' kinds narrate the day's context and 'voice' kinds are
# the mind's own body — neither can take the Focus.
# Score of a solitude line: below the weakest touched belief (strength
# 2.5/5 × the candidate floor 0.3), equal for all so rotation chooses.
SOLITUDE_SCORE = 0.12
_STOP = {
    'that', 'this', 'with', 'from', 'than', 'they', 'them', 'their', 'there',
    'what', 'when', 'have', 'been', 'into', 'only', 'more', 'still', 'every',
    'which', 'about', 'other', 'after', 'before', 'where', 'under', 'over',
    'like', 'some', 'each', 'does', 'will', 'just', 'once', 'never', 'today',
    'road', 'day', 'days',
}
_WORD_RE = re.compile(r'[a-z]+')


def _stems(text):
    """Content-word stems — a coarse, deterministic 'is this about the
    same thing': 'a warm meal and ale' meets 'a hot meal bought at the inn'
    on 'meal'. The director catches what words alone miss."""
    return {
        w[:5] for w in _WORD_RE.findall((text or '').lower())
        if len(w) >= 4 and w not in _STOP
    }


def _phase(item):
    return PHASES.get(((item.get('when') or {}).get('phase') or ''))


def _touches(tags_a, text_a, tags_b, text_b):
    """Two pieces of the Mind connect when they share a content tag or a
    content word."""
    return bool(set(tags_a or []) & set(tags_b or [])) or bool(
        _stems(text_a) & _stems(text_b)
    )


def _event_id(i):
    return f'event:{i}'


def brief_lines(brief):
    """Every line the brief speaks: the Focus, then carried and day lines."""
    brief = brief or {}
    focus = [brief['focus']] if brief.get('focus') else []
    return focus + list(brief.get('carried') or []) + list(brief.get('day') or [])


def need_origins(session, game_id, needs, entering_mood, mind=None):
    """Where each open Need comes from, in the World voice
    ('mind.need_origin.<key>'): '3 days without a proper meal'. The shadow
    is told through what the entering mood carries; with nothing carried
    it stays nameless rather than invented."""
    cause = (entering_mood or {}).get('cause') or {}
    out = {}
    for n in needs or []:
        key = n.get('key') or ''
        phrase_key = f'mind.need_origin.{key}'
        if key == 'unrest' and not (
            cause.get('reading') and (cause.get('valence') or 0.0) < 0
        ):
            phrase_key = 'mind.need_origin.unrest.nameless'
        options = phrases(phrase_key, session, game_id)
        if not options:
            continue
        days = (n.get('source') or {}).get('days')
        # Singular/plural (#86): '{days_text}' reads 'a day' / '3 days'
        # so a lone day never speaks '1 days'; raw {days} stays for
        # pack rows that still use it.
        days_text = (
            'a day' if days == 1
            else f'{days} days' if days is not None else 'days')
        try:
            out[key] = options[0].format(
                days=days,
                days_text=days_text,
                cause=cause.get('reading'),
            )
        except (KeyError, IndexError):
            continue
    return out


def _had_contact(perceived_day):
    """Did anyone at all touch this mind today? A noticed event carrying
    an entity (the host's own declaration that somebody was there) breaks
    solitude; weather, roads and aches are not company."""
    for item in perceived_day or []:
        if item.get('perception') == 'unnoticed':
            continue
        for t in _contact_tags(item.get('tags') or []):
            if t.startswith(('entity:', 'tag:entity_type:')):
                return True
    return False


_DANGER_IMPRINT_FLOOR = 0.15


def _had_danger(perceived_day):
    """Did the day carry menace? Whatever the semantics wrote into the
    item's imprint as fear — the attack, the wound, the patrol too
    close — or the wire's own declared `danger`. Tracks and far shapes
    stay under the floor: a sign is not a threat."""
    for item in perceived_day or []:
        if item.get('perception') == 'unnoticed':
            continue
        data = item.get('data') or {}
        if (data.get('danger') or 0) > 0:
            return True
        if (item.get('imprint') or {}).get('fear', 0.0) \
                >= _DANGER_IMPRINT_FLOOR:
            return True
    return False


def _open_physical_need(needs):
    """A physiological need open — the body is being asked for."""
    for n in needs or []:
        ntype = (
            n.get('type') if isinstance(n, dict)
            else getattr(n, 'type', None)
        )
        if ntype == 'physiological':
            return True
    return False


# C3 — the contexts a voice may ask of the DAY as a whole, declared as a
# registry: a new context is an entry here, never another if. Each
# evaluator reads the full perceived day (and the needs snapshot), not
# one item — 'safe' is the day nothing dangerous happened, which no
# single item can say.
_DAY_CONTEXT_EVALS = {
    'solitude':    lambda day, needs: not _had_contact(day),
    'company':     lambda day, needs: _had_contact(day),
    'danger':      lambda day, needs: _had_danger(day),
    'safe':        lambda day, needs: not _had_danger(day),
    'deprivation': lambda day, needs: _open_physical_need(needs),
}


def _day_contexts(perceived_day, needs_active):
    """The contexts true of this day — presence and absence alike."""
    return {
        name for name, check in _DAY_CONTEXT_EVALS.items()
        if check(perceived_day, needs_active or [])
    }


def _declared_contexts(tags):
    """The 'context:*' asks a voice carries — the kind of day it speaks
    on ('context:solitude' → 'solitude')."""
    return {
        t.split(':', 1)[1] for t in (tags or [])
        if t.startswith('context:')
    }


# The tags that name the SAME thing — 'the same orcs' beats 'the same
# kind of moment' as the reason a memory came back. Flag families say
# only the shape of the rhyme.
_VIA_SUBJECT_FAMS = frozenset({
    'entity', 'entity_type', 'npc', 'place', 'family', 'kind',
    'food', 'drink', 'race', 'need', 'topic', 'form', 'rest', 'felt',
})


def _memory_felt_word(felt, session=None, game_id=None):
    """The word for what was actually felt — named off the pull's real
    landing point, not the world's suggestion: a pull authored 'afraid'
    that the personality refracted toward alertness narrates 'watchful'.
    The authored word stays as the fallback for pulls stored without a
    target, canonicalized so a stored 'tense' still says 'afraid'."""
    for pull in felt or []:
        name = mood_name(pull.get('target'), session, game_id)
        if name and name != 'steady':
            return name
    for pull in felt or []:
        w = pull.get('word')
        if w:
            return FELT_ALIAS.get(w, w)
    return None


def _evocation_via(memory_tags, item_tags):
    """Why this memory woke: the contact tag it shares with the item
    that stirred it — a subject tag first ('the same X'), then a flag
    ('another land crossed into'), then a shared coarse facet
    ('facet:tag:food'). Returns the winning tag or None."""
    shared = _contact_tags(memory_tags or []) & _contact_tags(
        item_tags or [])
    if not shared:
        facets = {
            f for f in (tag_facet(t) for t in _contact_tags(
                item_tags or [])) if f
        } & {
            f for f in (tag_facet(t) for t in _contact_tags(
                memory_tags or [])) if f
        }
        return f'facet:{sorted(facets)[0]}' if facets else None
    return sorted(
        shared,
        key=lambda t: (0 if tag_family(t) in _VIA_SUBJECT_FAMS else 1,
                       t))[0]


@step('Lens')
def build_brief(perceived_day, evoked, beliefs, needs, entering_mood,
                wiring=None, anchors=None, need_origins=None,
                session=None, game_id=None, mind=None, episode_idx=None,
                musings=None):
    """Narrow the Mind to this Episode. Returns
    {focus, carried, day, silenced} — each line a dict with id, kind,
    text, part ('carried'|'day'), phase (day lines), score and why."""
    w = {**DEFAULT_WIRING, **(wiring or {})}
    focus_min = w.get('focus_min_salience', 0.45)
    urgent = w.get('need_deep_urgency', 0.6)
    salient_min = w.get('focus_candidate_min_salience', 0.3)
    anchors = anchors or {}
    need_origins = need_origins or {}
    silenced = []
    # The day's frame: kinds the registry declares 'frame' (weather,
    # land, mileage) or 'voice' (needs earn lines through the needs
    # path, never the Focus).
    frame_types = {
        k for k, v in kinds(session, game_id).items()
        if v.get('role') in (ROLE_FRAME, ROLE_VOICE)
    }
    # C3: the day's contexts — solitude, company, danger, safe,
    # deprivation — computed once over the whole day; 'context:*' voices
    # gate on them.
    contexts = _day_contexts(perceived_day, needs)

    # --- today's moments: every noticed, read event; the salient ones are
    # the Focus candidates and day lines. The inner voice hears more than
    # the Lens does (#158): frame and voice kinds (weather, mileage, the
    # body's own reports) never take the Focus but still carry the tags
    # a Musing may answer to — including ambient tags like weather,
    # which only the voice may treat as the thing it is ABOUT.
    moments = []
    voice_moments = []
    for i, item in enumerate(perceived_day or []):
        if item.get('perception') == 'unnoticed':
            continue
        sal = item.get('salience') or 0.0
        tags = item.get('tags') or []
        subtype = (item.get('data') or {}).get('subtype')
        if tags or item.get('type'):
            voice_moments.append({
                'id': _event_id(i), 'kind': 'event', 'part': 'day',
                'phase': _phase(item),
                'text': item.get('reading') or '',
                'type': item.get('type'), 'score': sal,
                'tags': sorted(
                    set(tags) | {f"type:{item.get('type')}"}
                    | ({f"tag:subtype:{subtype}"} if subtype else set())
                ),
            })
        # Frame check matches the type OR its subtype — 'terrain' in the
        # excluded list still frames a land/terrain event under the
        # umbrella, and 'land' would frame them all.
        if (item.get('type') in frame_types
                or subtype in frame_types
                or not item.get('reading')):
            continue
        content = _contact_tags(tags)
        moments.append({
            'id': _event_id(i), 'kind': 'event', 'part': 'day',
            'phase': _phase(item), 'text': item['reading'], 'score': sal,
            'tags': sorted(content),
            # Beliefs may also answer to what KIND of moment this is (a
            # night's rest, a meal, a crossing) — memories may not: the
            # same rest must not evoke every past rest, but a belief
            # about the campfire is exactly about any campfire. The land
            # subtype rides along as the umbrella's shape-tag.
            'touch_tags': sorted(
                content
                | {f"type:{item.get('type')}"}
                | ({f"tag:subtype:{subtype}"} if subtype else set())
            ),
            'why': f'salience {sal:.2f}',
        })
    events = [m for m in moments if m['score'] >= salient_min]
    day_tags = set().union(*(set(e['tags']) for e in events)) if events else set()
    day_text = ' '.join(e['text'] for e in events)

    # --- beliefs: what the day puts at stake, or what solitude brings up
    # A belief may answer to a moment too small to be a Focus candidate —
    # a forgettable night by the fire is still the campfire it is about.
    # Tagged beliefs touch by tag only (a poem's 'space' must not meet a
    # track's 'wide-spaced'); untagged ones keep the word door. Among the
    # moments it touches, the one sharing the most tags wins, and every
    # extra shared tag adds `belief_specificity_bonus` to its score — the
    # thought about orc SIGNS beats the generic one about orcs.
    bonus = w.get('belief_specificity_bonus', 0.25)
    belief_lines = []
    for b in beliefs or []:
        # An Attitude's Subject is part of what it answers to.
        btags = set(b.tags or []) | set(conviction_subjects(b) or [])
        btags = {ladder_norm(t) for t in btags}
        statement = conviction_statement(b)
        hit, overlap = None, 0
        for m in moments:
            if btags:
                n = len(btags & {ladder_norm(t) for t in m['touch_tags']})
            else:
                n = 1 if _stems(statement) & _stems(m['text']) else 0
            if n and (hit is None or (n, m['score']) > (overlap, hit['score'])):
                hit, overlap = m, n
        if hit is None:
            # 'context:*' beliefs ask nothing of the day but its shape —
            # they speak when the day IS the kind of day they are about:
            # the thoughts a person keeps for solitude, for safe days,
            # for company (seed thoughts, authored personality). Days
            # that are not that kind keep them quiet.
            declared = _declared_contexts(b.tags)
            if not declared:
                silenced.append({
                    'kind': 'belief', 'text': statement,
                    'stage': 'filter',
                    'reason': 'nothing in the Episode puts it at stake',
                })
                continue
            missing = declared - contexts
            if missing:
                silenced.append({
                    'kind': 'belief', 'text': statement,
                    'stage': 'filter',
                    'reason': (
                        'the day had company'
                        if missing == {'solitude'}
                        else f'the day was not {sorted(missing)[0]}'
                    ),
                })
                continue
            # A flat score, below anything the day actually touched:
            # free-floating thought yields to what happened, and a wandering
            # mind surfaces any of its thoughts — strength doesn't pick,
            # rotation does (else the most-held one speaks every quiet day).
            belief_lines.append({
                'id': f'belief:{b.id}', 'kind': 'belief', 'part': 'carried',
                'phase': None, 'text': statement,
                'score': SOLITUDE_SCORE,
                'solitude': True, 'tagged': True,
                'context': sorted(declared),
                'why': 'the mind alone with itself'
                       if declared == {'solitude'}
                       else f"the day itself: {sorted(declared)[0]}",
            })
            continue
        belief_lines.append({
            'id': f'belief:{b.id}', 'kind': 'belief', 'part': 'day',
            'phase': hit['phase'], 'text': statement,
            'score': (
                ((conviction_facet(b, 'strength', 0.0) or 0.0) / 5)
                * max(hit['score'], salient_min)
                * (1 + bonus * (overlap - 1))
            ),
            'connects_to': hit['id'], 'tagged': bool(btags),
            'att_level': (
                match_level(b, hit['touch_tags']) if is_attitude(b) else 0
            ),
            'why': f'at stake in: {hit["text"][:60]}',
        })
    # One encounter, one attitude: the narrowest subject speaks for it
    # (the horses of Mordor over horses); wider ones step back.
    narrowest = {}
    for line in belief_lines:
        if line.get('att_level'):
            key = line['connects_to']
            narrowest[key] = max(narrowest.get(key, 0), line['att_level'])
    kept = []
    for line in belief_lines:
        lvl = line.get('att_level')
        if lvl and lvl < narrowest[line['connects_to']]:
            silenced.append({
                'kind': 'belief', 'text': line['text'], 'stage': 'filter',
                'reason': 'a closer attitude speaks for this encounter',
            })
            continue
        kept.append(line)
    belief_lines = kept

    # --- musings: the authored inner voice ------------------------------
    # Same tag contact as beliefs (a musing tagged for orc signs still
    # beats a generic one), but a Musing carries nothing to weigh: the
    # moment's salience and tag specificity are the whole score — no
    # strength, no attitudes, and 'context:solitude' asks nothing of
    # the day exactly like a seed belief did. A line that spoke lately
    # stays quiet for 'musing_refractory_episodes' — the thought needs
    # time to gather before it can be the mind's reply again (#86).
    # The voice hears every perceived item — the weather, the road's
    # mileage, the body's own reports (#158) — and the Personality's
    # `reflectiveness` bends how loudly it answers.
    refractory = int(w.get('musing_refractory_episodes') or 0)
    refl = (mind.personality or {}).get('reflectiveness') if mind else None
    voice_gain = 1.0 if refl is None else float(refl)
    musing_by_id = {m.id: m for m in musings or []}
    musing_lines = []
    for m in musings or []:
        if (
            refractory and episode_idx is not None
            and getattr(m, 'last_spoke_episode', None) is not None
            # Strictly a PAST episode: diff 0 is this same Episode being
            # rebuilt — its own answer must stay replayable.
            and 0 < episode_idx - m.last_spoke_episode <= refractory
        ):
            silenced.append({
                'kind': 'musing', 'text': m.statement,
                'stage': 'filter',
                'reason': 'it spoke lately; the thought is still settling',
            })
            continue
        mtags = {ladder_norm(t) for t in (m.tags or [])}
        hit, overlap = None, 0
        for mo in voice_moments:
            if mtags:
                n = len(
                    mtags & {ladder_norm(t) for t in mo['tags']})
            else:
                n = 1 if _stems(m.statement) & _stems(mo['text']) else 0
            if n and (hit is None or (n, mo['score']) > (overlap, hit['score'])):
                hit, overlap = mo, n
        if hit is None:
            declared = _declared_contexts(m.tags)
            if not declared:
                silenced.append({
                    'kind': 'musing', 'text': m.statement,
                    'stage': 'filter',
                    'reason': 'nothing in the Episode calls this voice up',
                })
                continue
            missing = declared - contexts
            if missing:
                silenced.append({
                    'kind': 'musing', 'text': m.statement,
                    'stage': 'filter',
                    'reason': (
                        'the day had company'
                        if missing == {'solitude'}
                        else f'the day was not {sorted(missing)[0]}'
                    ),
                })
                continue
            musing_lines.append({
                'id': f'musing:{m.id}', 'kind': 'musing', 'part': 'carried',
                'phase': None, 'text': m.statement,
                'score': SOLITUDE_SCORE * voice_gain,
                'solitude': True, 'tagged': True,
                'context': sorted(declared),
                'why': 'the mind alone with itself'
                       if declared == {'solitude'}
                       else f"the day itself: {sorted(declared)[0]}",
            })
            continue
        musing_lines.append({
            'id': f'musing:{m.id}', 'kind': 'musing', 'part': 'day',
            'phase': hit['phase'], 'text': m.statement,
            'score': (
                max(hit['score'], salient_min)
                * (1 + bonus * (overlap - 1))
                * voice_gain
            ),
            'connects_to': hit['id'], 'tagged': bool(mtags),
            'why': f'called up by: {(hit["text"] or hit["type"] or "")[:60]}',
        })

    # A line that made the brief has spoken: the refractory clock starts
    # now, whether the narrator ends up using the words or not.
    for line in musing_lines:
        m = musing_by_id.get(line['id'].split(':', 1)[1])
        if m is not None and episode_idx is not None:
            m.last_spoke_episode = episode_idx

    # --- memories: evoked by the day; anchored ones wait for their phase -
    memory_lines = []
    for m in evoked or []:
        anchor = anchors.get(m.id)
        if anchor is not None:
            ev_id = _event_id(anchor)
            ev = next((e for e in events if e['id'] == ev_id), None)
            item = (perceived_day or [])[anchor]
            phase = _phase(item)
            data = item.get('data') or {}
            via = _evocation_via(
                getattr(m, 'tags', None), item.get('tags'))
            if via is None:
                # The rhyme no tag can name — what woke it was how it
                # FELT (delta_felt did the lifting at retrieve).
                day_targets = [
                    p['target'] for p in (item.get('mood_pull') or [])
                    if p.get('target')]
                if day_targets and felt_proximity(
                        getattr(m, 'felt', None), day_targets) >= 0.8:
                    via = 'felt:rhyme'
            memory_lines.append({
                'id': f'memory:{m.id}', 'kind': 'memory', 'part': 'day',
                'phase': phase, 'text': m.desc,
                # WHY the day woke it — the tag (or coarse facet) the
                # memory shares with the item that stirred it, so the
                # narrator sees the rhyme instead of guessing at it.
                'via': via,
                # HOW it felt back then — the pull that actually landed
                # through this personality, so the narrator can carry
                # the charge, not just the fact.
                'felt': _memory_felt_word(
                    getattr(m, 'felt', None), session, game_id),
                # The item that stirred it — the memory rides INSIDE that
                # event's beat, not floating in the phase (evoked rides
                # with what woke it).
                'anchor': anchor,
                # Who stirred it — lets the prompt hang the echo on that
                # encounter instead of floating it in the phase.
                'subject': (
                    data.get('entity_name') or data.get('name')
                    or data.get('entity')
                ),
                'score': (m.importance or 0.0) * (ev['score'] if ev else 0.5),
                'connects_to': ev_id if ev else None,
                'why': 'stirred by what happens' + (f' {phase}' if phase else ''),
            })
        else:
            memory_lines.append({
                'id': f'memory:{m.id}', 'kind': 'memory', 'part': 'carried',
                'phase': None, 'text': m.desc,
                'felt': _memory_felt_word(
                    getattr(m, 'felt', None), session, game_id),
                'score': (m.importance or 0.0) * 0.5,
                'why': 'resonates with the Episode as a whole',
            })

    # --- needs: new, worsening, touched — or past the urgency line -------
    need_lines = []
    for n in needs or []:
        u = n.get('urgency') or 0.0
        text = n.get('description') or n.get('key')
        origin = need_origins.get(n.get('key'))
        # An origin the description already says is noise — 'days beneath
        # a sunless sky' after 'day upon day beneath a sunless sky — the
        # light itself is missed' adds nothing.
        if origin:
            said = set(re.findall(r"[a-z']+", text.lower()))
            own = set(re.findall(r"[a-z']+", origin.lower())) - {
                'a', 'an', 'the', 'of', 'in', 'on', 'and', 'to'}
            if own and len(own - said) / len(own) < 0.5:
                origin = None
        line_text = f'{text} — {origin}' if origin else text
        touched = _touches(
            [f'need:{n.get("key")}'], text, day_tags, day_text,
        ) or bool(n.get('entity') and f'entity:{n["entity"]}' in day_tags)
        reasons = [
            r for r, ok in (
                ('past the urgency line', u >= urgent),
                ('new', n.get('is_new')),
                ('worsening', n.get('worsening')),
                ('touched by the Episode', touched),
            ) if ok
        ]
        if not reasons:
            silenced.append({
                'kind': 'need', 'text': text, 'stage': 'filter',
                'reason': 'stable and untouched by the Episode',
            })
            continue
        # A need born today was born OF today — it speaks at night, after
        # whatever opened it, never before. New to the Mind is not born
        # today: two days without food were already two days old.
        days = (n.get('source') or {}).get('days')
        born_today = bool(n.get('is_new')) and not (days and days > 1)
        need_lines.append({
            'id': f'need:{n.get("id") or n.get("key")}', 'kind': 'need',
            'key': n.get('key'),
            'part': 'day' if born_today else 'carried',
            'phase': 'night' if born_today else None,
            'text': line_text, 'score': u, 'urgent': u >= urgent,
            'why': ', '.join(reasons),
        })

    # --- the entering mood, through its cause ----------------------------
    # A strong mood speaks even unconnected: it is how the Character walks
    # into the Episode, not something the day must earn.
    mood_lines = []
    cause = (entering_mood or {}).get('cause')
    # The Reflection's prose overlay speaks when the cause carries one.
    wording = (cause or {}).get('prose') or (cause or {}).get('reading')
    if wording:
        strength = abs((entering_mood or {}).get('valence') or 0.0)
        mood_lines.append({
            'id': 'mood:cause', 'kind': 'mood', 'part': 'carried',
            'phase': None, 'text': wording, 'score': strength,
            'tags': cause.get('tags') or [],
            'urgent': strength >= w.get('focus_mood_strong', 0.4),
            'why': 'what the mood carries in from before',
        })

    # --- Focus: usually today's loudest event; a pressing need or a
    # strongly held memory may take the centre instead --------------------
    focus = None
    best_event = max(events, key=lambda e: e['score'], default=None)
    if best_event and best_event['score'] >= focus_min:
        focus = best_event
    urgent_need = max(
        (n for n in need_lines if n['urgent']), key=lambda n: n['score'],
        default=None,
    )
    if urgent_need and (focus is None or urgent_need['score'] > focus['score']):
        focus = urgent_need
    strong_memory = max(
        (m for m in memory_lines
         if m['score'] >= w.get('focus_memory_min', 0.8)),
        key=lambda m: m['score'], default=None,
    )
    if strong_memory and (focus is None or strong_memory['score'] > focus['score']):
        focus = strong_memory

    # --- lines: what connects to the Focus, capped; urgent needs always --
    # Lines are the inner side — the day's events reach the narrator
    # through the phase blocks anyway; only one of them is the Focus.
    pool = (
        belief_lines + musing_lines + memory_lines + need_lines
        + mood_lines
    )
    # Deterministic variety for a mind with many thoughts: the beliefs
    # that tie on score (same strength, same touch) rotate by Episode,
    # so a different one speaks each quiet day. Replay-stable: the order
    # depends only on the Episode's own index.
    if episode_idx is not None:
        eligible = [c for c in pool if c['kind'] in ('belief', 'musing')]
        if eligible:
            off = (episode_idx * LINE_CAP) % len(eligible)
            rotated = eligible[off:] + eligible[:off]
            it = iter(rotated)
            pool = [
                next(it) if c['kind'] in ('belief', 'musing') else c
                for c in pool
            ]

    def connected(c):
        # A memory the day itself stirred is connected BY the day —
        # evocation already was the relevance vote; the Focus does not
        # get to veto what the road brought back to mind.
        if c['kind'] == 'memory' and c.get('connects_to'):
            return True
        # A quiet Episode is 'the road and the body': with no Focus, the
        # needs that earned a place still speak; memories and beliefs
        # have nothing to connect to and stay silent — except solitude
        # thoughts, whose whole point is the day that touched nobody.
        # A belief the day touched still speaks: a quiet day with a fire
        # at night is a day for the thought about the fire.
        if focus is None:
            # A carried mood-cause is already self-explaining — it is
            # what the Character walks in with, like an open need.
            return (
                c['kind'] in ('need', 'mood') or bool(c.get('solitude'))
                or (c['kind'] in ('belief', 'musing')
                    and bool(c.get('connects_to')))
            )
        # Solitude lines only exist on days nobody touched the mind; a
        # striking ruin seen alone is still a day alone.
        if c.get('solitude'):
            return True
        if c.get('connects_to') == focus['id']:
            return True
        # A need born today is what the day did to the body — it belongs
        # to whatever the day turned on.
        if c['kind'] == 'need' and c['part'] == 'day':
            return True
        if focus['kind'] == 'event' and c.get('phase') and (
            c.get('phase') == focus.get('phase')
        ) and c['kind'] != 'event':
            return True
        if c.get('tagged'):
            return False
        return _touches(
            c.get('tags'), c['text'], focus.get('tags'), focus['text']
        )

    chosen, chosen_ids = [], set()
    for c in sorted(pool, key=lambda c: c['score'], reverse=True):
        if focus is not None and c['id'] == focus['id']:
            continue
        must = c.get('urgent')
        if must or (connected(c) and len(chosen) < LINE_CAP):
            chosen.append(c)
            chosen_ids.add(c['id'])
    for c in pool:
        if c['id'] in chosen_ids or (focus and c['id'] == focus['id']):
            continue
        silenced.append({
            'kind': c['kind'], 'text': c['text'], 'stage': 'pick',
            'reason': (
                'past the line cap' if connected(c)
                else 'quiet Episode — no Focus to connect to' if focus is None
                else 'does not connect to the Focus'
            ),
        })

    def strip(c):
        return {
            k: v for k, v in c.items()
            if k not in ('tags', 'touch_tags', 'urgent', 'tagged',
                         'att_level')
        }

    lines = [strip(c) for c in chosen]
    return {
        'focus': strip(focus) if focus else None,
        'carried': [c for c in lines if c['part'] == 'carried'],
        'day': [c for c in lines if c['part'] == 'day'],
        'silenced': silenced,
        'chosen_by': 'rules',
        # Everything that passed the filter — what the director picks
        # from. Not stored: the caller pops it before persisting.
        'candidates': [
            {k: v for k, v in c.items()
             if k not in ('tags', 'touch_tags', 'tagged', 'att_level')}
            for c in events + pool
        ],
    }
