<script setup lang="ts">
import { t } from '../../lib/i18n'
import { label, MEMORY_KIND, tagLabel } from '../../lib/labels'
import type { MemoryNode } from '../../types'
import MeterBar from '../ui/MeterBar.vue'

defineProps<{ memories: MemoryNode[]; forgotten?: boolean }>()

const feeling = (v: number) =>
  v <= -0.2 ? t('mem.feel.neg') : v >= 0.2 ? t('mem.feel.pos') : t('mem.feel.neutral')

// The felt word as the pull stamped it — first pull word wins.
const feltWord = (m: MemoryNode) => m.felt?.find((f) => f.word)?.word ?? null
</script>

<template>
  <table v-if="memories.length" class="table">
    <thead>
      <tr>
        <th>{{ t('mem.col.memory') }}</th>
        <th>{{ t('mem.col.tags') }}</th>
        <th>{{ t('mem.col.kind') }}</th>
        <th>{{ t('mem.col.feeling') }}</th>
        <th v-if="!forgotten" :title="t('mem.col.strength.help')">{{ t('mem.col.strength') }}</th>
        <th :title="t('mem.col.importance.help')">{{ t('mem.col.importance') }}</th>
        <th :title="t('mem.col.evoked.help')">{{ t('mem.col.evoked') }}</th>
        <th v-if="!forgotten" :title="t('mem.col.voiced.help')">{{ t('mem.col.voiced') }}</th>
        <th>{{ forgotten ? t('mem.col.forgottenIn') : t('mem.col.since') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="m in memories" :key="m.id">
        <td class="text">
          {{ m.desc }}
          <span v-if="m.consolidated" class="badge cons" :title="t('mem.consolidated')">◆</span>
        </td>
        <td class="tags">
          <span v-for="tag in m.tags" :key="tag" class="tag" :title="tag">{{ tagLabel(tag) }}</span>
        </td>
        <td><span class="badge">{{ label(MEMORY_KIND, m.kind) }}</span></td>
        <td :class="['feel', feeling(m.valence).toLowerCase()]">
          {{ feeling(m.valence) }}<template v-if="feltWord(m)"> · {{ feltWord(m) }}</template>
        </td>
        <td v-if="!forgotten"><MeterBar :value="m.strength" /></td>
        <td><MeterBar :value="m.importance" /></td>
        <td class="num">{{ m.evocations }}</td>
        <td v-if="!forgotten" class="num">{{ m.voiced }}</td>
        <td class="num">
          {{ forgotten
            ? (m.forgotten_episode != null ? t('mem.ep', { n: m.forgotten_episode }) : '—')
            : (m.born_episode != null ? t('mem.ep', { n: m.born_episode }) : t('mem.preset')) }}
        </td>
      </tr>
    </tbody>
  </table>
  <p v-else class="empty">{{ forgotten ? t('mem.empty.forgotten') : t('mem.empty.alive') }}</p>
</template>

<style scoped src="./table.css"></style>
<style scoped>
.feel { font-size: 13px; color: var(--text-dim); }
.feel.positivo, .feel.positive { color: var(--positive); }
.feel.negativo, .feel.negative { color: var(--danger); }
.tags { max-width: 220px; }
.tag {
  display: inline-block;
  font-family: var(--mono);
  font-size: 11px;
  padding: 1px 6px;
  margin: 1px 3px 1px 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
  white-space: nowrap;
}
.cons { font-size: 9px; padding: 1px 5px; margin-left: 6px; color: var(--accent); }
</style>
