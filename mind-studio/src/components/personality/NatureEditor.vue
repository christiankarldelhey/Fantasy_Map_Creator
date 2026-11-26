<script setup lang="ts">
// ============================================================================
// NatureEditor — the mind's nature (ADR 0017), read-only display
// ----------------------------------------------------------------------------
// The temperament itself is drawn on the disc above (the dashed point);
// what remains here are the couplings: how much the lived day moves the
// mood (moodiness), how stubbornly relations resist contradiction
// (resistance), how much the pick varies between like options
// (choice_variability).
// ============================================================================
import { computed } from 'vue'
import { t } from '../../lib/i18n'
import type { MindDetail } from '../../types'
import SliderField from '../ui/SliderField.vue'

const props = defineProps<{ mind: MindDetail }>()

const personality = computed(() => ({
  moodiness: (props.mind.personality?.moodiness as number) ?? 0.3,
  resistance: (props.mind.personality?.resistance as number) ?? 0,
  choice_variability: (props.mind.personality?.choice_variability as number) ?? 0.3,
}))
</script>

<template>
  <div class="block">
    <h4>{{ t('per.couplings') }} <span class="muted">— {{ t('per.couplings.sub') }}</span></h4>
    <div class="fields">
      <SliderField
        :model-value="personality.moodiness"
        :label="t('per.c.moodiness')"
        :help="t('per.c.moodiness.help')"
        :low="t('per.c.moodiness.low')"
        :high="t('per.c.moodiness.high')"
        disabled
      />
      <SliderField
        :model-value="personality.resistance"
        :label="t('per.c.resistance')"
        :help="t('per.c.resistance.help')"
        :low="t('per.c.resistance.low')"
        :high="t('per.c.resistance.high')"
        disabled
      />
      <SliderField
        :model-value="personality.choice_variability"
        :label="t('per.c.variability')"
        :help="t('per.c.variability.help')"
        :low="t('per.c.variability.low')"
        :high="t('per.c.variability.high')"
        disabled
      />
    </div>
  </div>
</template>

<style scoped>
.block h4 { margin: 0 0 14px; font-size: 14px; font-weight: 600; }
.block h4 .muted { font-weight: 400; font-size: 13px; }
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px 32px; }
</style>
