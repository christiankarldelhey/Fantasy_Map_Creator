<script setup lang="ts">
import { t } from '../../lib/i18n'
import type { EpisodeView } from '../../types'

defineProps<{ episodes: EpisodeView[] }>()

const selected = defineModel<string | null>({ required: true })
</script>

<template>
  <ul class="list" role="listbox" :aria-label="t('epl.aria')">
    <li v-for="e in episodes" :key="e.id">
      <button
        role="option"
        :aria-selected="selected === e.id"
        :class="['item', { on: selected === e.id }]"
        :title="e.brief?.focus?.text ?? undefined"
        @click="selected = e.id"
      >
        <span class="title">{{ t('epl.episode', { n: e.idx ?? '—' }) }}</span>
        <span class="date">{{ e.date ?? '' }}</span>
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
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  text-align: left;
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.item:hover { border-color: var(--border-strong); }
.item.on { border-color: var(--accent); background: var(--accent-soft); }
.title { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.date { font-family: var(--mono); font-size: 11px; color: var(--text-faint); white-space: nowrap; flex: none; }
</style>
