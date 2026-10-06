# ============================================================================
# C35 — the Lens director picks the Focus; the rules guard it
# ----------------------------------------------------------------------------
# The director chooses among the candidates the rules let through. Its pick
# is validated (a non-urgent need cannot be the Focus, events are never
# lines, urgent lines always speak) and any failure keeps the rules' brief.
# NPC (degraded) minds never call it.
# ============================================================================
import json
import uuid
from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.main as main_module
import app.mind.director as director_module
from app.mind.director import apply_decision, direct, director_enabled
from app.mind.focus import build_brief


def _event(reading, salience, phase, tags):
    return {'type': 'encounter', 'reading': reading, 'salience': salience,
            'when': {'phase': phase}, 'tags': tags, 'perception': 'noticed'}


ORCS = _event('orc boots, a pursuit gait', 0.7, 'afternoon',
              ['entity:orc_trackers', 'tag:entity_type:orcs'])
DWARVES = _event('dwarves with news of the eastern road', 0.5, 'morning',
                 ['entity:dwarves', 'tag:entity_type:dwarves'])
GRATITUDE = SimpleNamespace(
    id='g', statement='After danger passes, gratitude is the sharpest feeling.',
    tags=['tag:entity_type:orcs'], confidence=0.8,
)
HUNGER = {'key': 'hunger', 'id': 'nd1', 'description': 'food crowds every thought',
          'urgency': 0.65, 'source': {'days': 3}}
TIRED = {'key': 'exhaustion', 'id': 'nd2', 'description': 'the legs ask for the end',
         'urgency': 0.4, 'worsening': True}


def _rules():
    brief = build_brief([DWARVES, ORCS], [], [GRATITUDE], [HUNGER, TIRED], {})
    return brief, brief.pop('candidates')


def test_director_pick_is_applied_with_its_reasons():
    brief, cands = _rules()
    directed = apply_decision(brief, cands, {
        'focus': 'event:0', 'focus_why': 'the dwarves name the road he seeks',
        'lines': [{'id': 'need:nd2', 'why': 'the long talk costs him the light'}],
    })
    assert directed['chosen_by'] == 'director'
    assert directed['focus']['text'].startswith('dwarves')
    assert directed['focus']['why'] == 'the dwarves name the road he seeks'
    texts = [l['text'] for l in directed['carried'] + directed['day']]
    assert 'the legs ask for the end' in texts
    # The urgent need speaks whatever the director picked.
    assert any(t.startswith('food crowds every thought') for t in texts)
    # What it left out is silenced with that reason.
    reasons = {s['text']: s['reason'] for s in directed['silenced']}
    assert reasons[GRATITUDE.statement] == 'the director left it out'


def test_a_non_urgent_need_cannot_be_the_focus():
    brief, cands = _rules()
    assert apply_decision(brief, cands, {'focus': 'need:nd2', 'lines': []}) is None


def test_unknown_ids_are_rejected_and_events_are_never_lines():
    brief, cands = _rules()
    assert apply_decision(brief, cands, {'focus': 'event:99'}) is None
    directed = apply_decision(brief, cands, {
        'focus': 'event:1', 'lines': [{'id': 'event:0'}, {'id': 'belief:g'}],
    })
    kinds = [l['kind'] for l in directed['carried'] + directed['day']]
    assert 'event' not in kinds
    assert 'belief' in kinds


def test_a_quiet_pick_is_allowed():
    brief, cands = _rules()
    directed = apply_decision(brief, cands, {'focus': None, 'lines': []})
    assert directed['focus'] is None


def test_any_failure_keeps_the_rules(monkeypatch):
    brief, cands = _rules()

    def boom(*a, **k):
        raise TimeoutError('groq slow')
    monkeypatch.setattr(director_module, 'complete_json', boom)
    assert direct(brief, cands, 'Aranath') is None
    monkeypatch.setattr(director_module, 'complete_json', lambda *a, **k: 'not json')
    assert direct(brief, cands, 'Aranath') is None


def test_npc_minds_never_call_the_director(monkeypatch):
    monkeypatch.setenv('MIND_DIRECTOR', 'on')
    assert director_enabled({}) is True
    assert director_enabled({'degraded': True}) is False


def test_open_uses_the_director_when_enabled(monkeypatch):
    monkeypatch.setenv('MIND_DIRECTOR', 'on')
    seen = {}

    def fake(prompt, **k):
        seen['prompt'] = prompt
        return json.dumps({'focus': 'event:0', 'focus_why': 'the orcs, again',
                           'lines': []})
    monkeypatch.setattr(director_module, 'complete_json', fake)
    client = TestClient(main_module.app)
    r = client.post('/episodes', json={
        'game_id': 'middle_earth',
        'character': {'id': f'dir-{uuid.uuid4().hex[:8]}', 'name': 'Aranath'},
        'episode_ref': 'd1',
        'events': [{
            'type': 'encounter',
            'when': {'episode': 1, 'date': '1950-10-08', 'phase': 'afternoon'},
            'data': {'entity': 'orc_trackers', 'entity_name': 'Orc Trackers',
                     'entity_type': 'orcs', 'form': 'attacks', 'danger': 4,
                     'prose_hint': 'orc boots, a pursuit gait'},
        }],
        'day': {},
    })
    assert r.status_code == 200, r.text
    brief = r.json()['psyche_packet']['brief']
    assert brief['chosen_by'] == 'director'
    assert brief['focus']['why'] == 'the orcs, again'
    assert 'Orc Trackers' in seen['prompt']['user']
    assert 'candidates' not in brief
