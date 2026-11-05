<script setup lang="ts">
import { reactive } from 'vue'
import { patchMood } from '../../api'
import { moodLabel } from '../../lib/labels'
import type { MindDetail } from '../../types'
import SliderField from '../ui/SliderField.vue'

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ saved: []; error: [message: string] }>()

const mood = reactive({
  valence: props.mind.mood.valence ?? 0,
  arousal: props.mind.mood.arousal ?? 0,
  dominant: props.mind.mood.dominant,
})

const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`

async function save() {
  try {
    const saved = await patchMood(props.mind.character_id, { valence: mood.valence, arousal: mood.arousal })
    mood.dominant = saved.dominant
    emit('saved')
  } catch (e) {
    emit('error', (e as Error).message)
  }
}
</script>

<template>
  <div class="mood">
    <p class="now">Hoy se siente: <span class="badge badge-accent">{{ moodLabel(mood.dominant) }}</span></p>
    <div class="fields">
      <SliderField
        v-model="mood.valence"
        label="Estado de ánimo"
        help="De negativo a positivo."
        low="Muy mal"
        high="Muy bien"
        :min="-1"
        :format="signed"
        @commit="save"
      />
      <SliderField
        v-model="mood.arousal"
        label="Agitación"
        help="Qué tan revuelto o calmo está."
        low="En calma"
        high="Muy agitado"
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
