# ============================================================================
# Narrative eval runner
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/evals/evalRunner.js.
# ============================================================================
from app.evals.narrative_checks import (
    check_encounters_presented,
    check_lens_reference,
    check_opening,
    check_prompt_quotes,
    check_scenery_inventory,
)


def run_narrative_evals(narrative, day=None, character_name='Aranath', impressions=None):
    day = day or {}

    if not narrative:
        print('=== narrative eval skipped (no narrative generated) ===')
        return {'ok': True, 'checks': [], 'failed': []}

    print('=== narrative eval start (day', day.get('day_number'), ') ===')
    checks = [
        check_opening(narrative, character_name),
        check_prompt_quotes(narrative, day.get('prompt')),
        check_encounters_presented(narrative, day.get('encounters')),
        check_scenery_inventory(narrative),
        check_lens_reference(narrative, impressions),
    ]
    failed = [c for c in checks if not c['ok']]
    ok = len(failed) == 0
    print('=== narrative eval end ===')
    print('overall:', 'PASS' if ok else 'FAIL')
    print('passed:', len(checks) - len(failed), '/', len(checks))
    if failed:
        print('failed checks:')
        for f in failed:
            print(' -', f['name'], ':', f['reason'])
    return {'ok': ok, 'checks': checks, 'failed': failed}
