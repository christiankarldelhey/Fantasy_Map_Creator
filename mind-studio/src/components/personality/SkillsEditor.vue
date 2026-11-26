<script setup lang="ts">
import { reactive } from 'vue'
import { patchCard } from '../../api'
import { SKILLS, skillHelp, skillLabel } from '../../lib/labels'
import type { MindDetail } from '../../types'
import SliderField from '../ui/SliderField.vue'

const props = defineProps<{ mind: MindDetail; editable: boolean }>()
const emit = defineEmits<{ saved: []; error: [message: string] }>()

// The ten host skills always show; a skill the card never carried reads 0.
const keys = [...new Set([...Object.keys(SKILLS), ...Object.keys(props.mind.character.skills ?? {})])]
const values = reactive<Record<string, number>>(
  Object.fromEntries(keys.map((k) => [k, props.mind.character.skills?.[k] ?? 0])),
)

async function save() {
  try {
    await patchCard(props.mind.character_id, { skills: { ...values } })
    emit('saved')
  } catch (e) {
    emit('error', (e as Error).message)
  }
}
</script>

<template>
  <div class="skills">
    <SliderField
      v-for="key in keys"
      :key="key"
      v-model="values[key]!"
      :label="skillLabel(key)"
      :help="skillHelp(key)"
      :min="0"
      :max="10"
      :step="1"
      :format="(v) => `${v} / 10`"
      :disabled="!editable"
      @commit="save"
    />
  </div>
</template>

<style scoped>
.skills { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 32px; }
@media (max-width: 800px) { .skills { grid-template-columns: 1fr; } }
</style>
