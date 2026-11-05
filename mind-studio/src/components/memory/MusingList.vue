<script setup lang="ts">
import { concernLabel } from '../../lib/labels'
import type { MusingNode } from '../../types'

defineProps<{ musings: MusingNode[] }>()
</script>

<template>
  <ul v-if="musings.length" class="list">
    <li v-for="m in musings" :key="m.id">
      <p class="statement">{{ m.statement }}</p>
      <div v-if="m.tags.length" class="tags">
        <span class="muted small">Aparece con:</span>
        <span v-for="t in m.tags" :key="t" class="badge" :title="t">{{ concernLabel(t) }}</span>
      </div>
    </li>
  </ul>
  <p v-else class="empty">Este personaje no tiene frases de voz interior.</p>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
li {
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.statement { margin: 0 0 8px; font-family: var(--serif); font-size: 15px; line-height: 1.55; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.small { font-size: 12px; }
</style>
