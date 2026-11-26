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

const frac = computed(() =>
  Math.max(0, Math.min(1, (model.value - props.min) / (props.max - props.min))),
)
// Bipolar ranges (−1..1 temperament) anchor at the centre: negative
// fills left, positive right. One-sided ranges fill from the left.
const bipolar = computed(() => props.min < 0 && props.max > 0)
const barFill = computed(() => {
  if (!bipolar.value) return { left: '0', width: `${frac.value * 100}%` }
  const zero = -props.min / (props.max - props.min)
  const v = (model.value - props.min) / (props.max - props.min)
  return v >= zero
    ? { left: `${zero * 100}%`, width: `${(v - zero) * 100}%` }
    : { left: `${v * 100}%`, width: `${(zero - v) * 100}%` }
})
const shown = computed(() =>
  props.format ? props.format(model.value) : `${Math.round(frac.value * 100)}`,
)
</script>

<template>
  <div :class="['slider', { disabled }]">
    <div class="top">
      <span class="label">{{ label }}</span>
      <span class="value">{{ shown }}</span>
    </div>
    <p v-if="help" class="help">{{ help }}</p>
    <div v-if="disabled" class="bar" role="meter" :aria-valuenow="model">
      <span v-if="bipolar" class="zero" :style="{ left: `${(-min / (max - min)) * 100}%` }" />
      <span class="fill" :style="barFill" />
    </div>
    <input
      v-else
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
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
.bar {
  position: relative;
  height: 7px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  overflow: hidden;
}
.bar .fill {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
}
.bar .zero {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border-strong);
}
.disabled .label, .disabled .help, .disabled .poles { opacity: 0.8; }
</style>
