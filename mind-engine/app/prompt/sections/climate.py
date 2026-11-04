# ============================================================================
# Climate state prompt section
# ----------------------------------------------------------------------------
# Port of backend/domains/story/services/prompt/sections/climateSection.js.
# ============================================================================


def climate_state_section(climate_state_text=''):
    if not climate_state_text:
        return ''
    return f'{climate_state_text}\n'
