<script setup lang="ts">
import { moodLabel } from '../../lib/labels'
import type { EpisodeView } from '../../types'

defineProps<{ episodes: EpisodeView[] }>()

const selected = defineModel<string | null>({ required: true })
</script>

<template>
  <ul class="list" role="listbox" aria-label="Episodios">
    <li v-for="e in episodes" :key="e.id">
      <button
        role="option"
        :aria-selected="selected === e.id"
        :class="['item', { on: selected === e.id }]"
        @click="selected = e.id"
      >
        <span class="row">
          <span class="title">Episodio {{ e.idx ?? '—' }}</span>
          <span class="date">{{ e.date ?? '' }}</span>
        </span>
        <span class="focus">{{ e.brief?.focus?.text ?? 'Sin centro definido' }}</span>
        <span class="mood">Ánimo: {{ moodLabel(e.mood.dominant) }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
  position: sticky;
  top: 0;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}
.item {
  width: 100%;
  display: grid;
  gap: 4px;
  text-align: left;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.item:hover { border-color: var(--border-strong); }
.item.on { border-color: var(--accent); background: var(--accent-soft); }
.row { display: flex; justify-content: space-between; gap: 8px; }
.title { font-weight: 600; font-size: 13px; }
.date { font-family: var(--mono); font-size: 11px; color: var(--text-faint); }
.focus {
  font-size: 13px;
  color: var(--text-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mood { font-size: 12px; color: var(--text-faint); }
</style>
