<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  help?: string
  low?: string
  high?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  /** How the current value reads; defaults to a 0–100 percent. */
  format?: (v: number) => string
}>(), { min: 0, max: 1, step: 0.05 })

const model = defineModel<number>({ required: true })
const emit = defineEmits<{ commit: [value: number] }>()

const shown = computed(() =>
  props.format ? props.format(model.value) : `${Math.round(((model.value - props.min) / (props.max - props.min)) * 100)}`,
)
</script>

<template>
  <div :class="['slider', { disabled }]">
    <div class="top">
      <span class="label">{{ label }}</span>
      <span class="value">{{ shown }}</span>
    </div>
    <p v-if="help" class="help">{{ help }}</p>
    <input
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :aria-label="label"
      @change="emit('commit', model)"
    />
    <div v-if="low || high" class="poles">
      <span>{{ low }}</span>
      <span>{{ high }}</span>
    </div>
  </div>
</template>

<style scoped>
.slider { display: grid; gap: 4px; }
.top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.label { font-weight: 500; }
.value {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--accent);
  min-width: 3ch;
  text-align: right;
}
.help { margin: 0; font-size: 13px; color: var(--text-dim); }
.poles { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--text-faint); }
.disabled { opacity: 0.55; }
</style>
