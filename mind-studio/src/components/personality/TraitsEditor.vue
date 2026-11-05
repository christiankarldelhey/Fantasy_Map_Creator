<script setup lang="ts">
import { reactive } from 'vue'
import { patchTraits } from '../../api'
import { TRAITS } from '../../lib/labels'
import type { MindDetail } from '../../types'
import SliderField from '../ui/SliderField.vue'

const props = defineProps<{ mind: MindDetail; keys: readonly string[] }>()
const emit = defineEmits<{ saved: []; error: [message: string] }>()

const values = reactive<Record<string, number>>(
  Object.fromEntries(props.keys.map((k) => [k, props.mind.traits[k]?.value ?? 0.5])),
)

async function save(key: string) {
  try {
    await patchTraits(props.mind.character_id, { [key]: values[key]! })
    emit('saved')
  } catch (e) {
    emit('error', (e as Error).message)
  }
}
</script>

<template>
  <div class="traits">
    <SliderField
      v-for="key in keys"
      :key="key"
      v-model="values[key]!"
      :label="TRAITS[key]?.label ?? key"
      :help="TRAITS[key]?.help"
      :low="TRAITS[key]?.low"
      :high="TRAITS[key]?.high"
      @commit="save(key)"
    />
  </div>
</template>

<style scoped>
.traits { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 32px; }
@media (max-width: 800px) { .traits { grid-template-columns: 1fr; } }
</style>
