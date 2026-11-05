<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ value: number; max?: number; label?: string }>(), { max: 1 })

const pct = computed(() => Math.round(Math.max(0, Math.min(1, props.value / props.max)) * 100))
</script>

<template>
  <span class="meter" :title="label ?? `${pct}%`" role="meter" :aria-valuenow="value" :aria-valuemax="max">
    <span class="fill" :style="{ width: `${pct}%` }" />
  </span>
</template>

<style scoped>
.meter {
  display: inline-block;
  width: 72px;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-2);
  overflow: hidden;
  vertical-align: middle;
}
.fill { display: block; height: 100%; background: var(--accent); border-radius: 3px; }
</style>
