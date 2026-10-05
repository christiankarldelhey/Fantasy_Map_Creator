<script setup lang="ts">
import type { MindSummary } from '../types'

defineProps<{
  minds: readonly MindSummary[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  tour: []
}>()

function onChange(ev: Event) {
  emit('select', (ev.target as HTMLSelectElement).value)
}
</script>

<template>
  <header class="bar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">◐</span>
      <span class="brand-name">Mind Studio</span>
      <span class="brand-sub">ver una mente</span>
    </div>

    <div class="actions">
      <button class="tour" @click="emit('tour')">¿Cómo funciona una mente?</button>
      <label class="switch">
        <span class="eyebrow">mente</span>
        <select :value="selectedId ?? ''" @change="onChange">
          <option v-for="m in minds" :key="m.character_id" :value="m.character_id">
            {{ m.name }} — {{ m.episodes }} ep.{{ m.character_id !== m.name ? ` (${m.character_id})` : '' }}
          </option>
        </select>
      </label>
    </div>
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--chalk-faint);
}
.brand { display: flex; align-items: baseline; gap: 10px; }
.brand-mark { color: var(--amber); font-size: 18px; }
.brand-name { font-family: var(--display); font-size: 24px; color: var(--paper); }
.brand-sub { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--chalk-dim); }

.actions { display: flex; align-items: center; gap: 18px; }

.tour {
  background: none;
  border: 0;
  font-family: var(--display);
  font-style: italic;
  font-size: 16px;
  color: var(--amber);
  text-decoration: underline;
  text-decoration-style: wavy;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

.switch { display: flex; align-items: center; gap: 8px; }
.switch select {
  background: var(--paper);
  color: var(--paper-ink);
  font-family: var(--type);
  font-size: 12px;
  border: 0;
  padding: 4px 8px;
  transform: rotate(-0.8deg);
  max-width: 280px;
}
</style>
