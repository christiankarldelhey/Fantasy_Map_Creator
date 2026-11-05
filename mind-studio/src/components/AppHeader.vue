<script setup lang="ts">
import type { MindSummary } from '../types'

defineProps<{
  minds: readonly MindSummary[]
  selectedId: string | null
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <header class="header">
    <div class="brand">
      <span class="mark" aria-hidden="true">◐</span>
      <span class="name">Mind Studio</span>
    </div>

    <label class="picker">
      <span class="muted">Personaje</span>
      <select
        class="field"
        :value="selectedId ?? ''"
        @change="emit('select', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="m in minds" :key="m.character_id" :value="m.character_id">
          {{ m.name }} · {{ m.episodes }} episodios
        </option>
      </select>
    </label>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.brand { display: flex; align-items: center; gap: 10px; }
.mark { color: var(--accent); font-size: 18px; }
.name { font-weight: 600; font-size: 15px; }
.picker { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.picker select { width: auto; min-width: 220px; padding: 6px 10px; }
</style>
