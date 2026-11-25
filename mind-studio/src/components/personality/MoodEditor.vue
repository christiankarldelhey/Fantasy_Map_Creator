<script setup lang="ts">
import { reactive } from 'vue'
import { patchMood } from '../../api'
import { t } from '../../lib/i18n'
import { moodLabel } from '../../lib/labels'
import { moodWord } from '../../lib/moodSpace'
import type { MindDetail } from '../../types'
import SliderField from '../ui/SliderField.vue'

const props = withDefaults(defineProps<{ mind: MindDetail; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ saved: []; error: [message: string] }>()

const mood = reactive({
  valence: props.mind.mood.valence ?? 0,
  arousal: props.mind.mood.arousal ?? 0,
})

const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`

async function save() {
  try {
    await patchMood(props.mind.character_id, { valence: mood.valence, arousal: mood.arousal })
    emit('saved')
  } catch (e) {
    emit('error', (e as Error).message)
  }
}
</script>

<template>
  <div class="mood">
    <p class="now">{{ t('per.mood.feels') }} <span class="badge badge-accent">{{ moodLabel(moodWord(mood)) }}</span></p>
    <div class="fields">
      <SliderField
        v-model="mood.valence"
        :label="t('per.mood.valence')"
        :help="t('per.mood.valence.help')"
        :low="t('per.mood.valence.low')"
        :high="t('per.mood.valence.high')"
        :min="-1"
        :format="signed"
        :disabled="disabled"
        @commit="save"
      />
      <SliderField
        v-model="mood.arousal"
        :label="t('per.mood.arousal')"
        :help="t('per.mood.arousal.help')"
        :low="t('per.mood.arousal.low')"
        :high="t('per.mood.arousal.high')"
        :min="-1"
        :disabled="disabled"
        @commit="save"
      />
    </div>
  </div>
</template>

<style scoped>
.now { margin: 0 0 16px; }
.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 32px; }
@media (max-width: 800px) { .fields { grid-template-columns: 1fr; } }
</style>
