<script setup lang="ts">
// ============================================================================
// RelationList — the standing the lived day sedimented, per subject
// ----------------------------------------------------------------------------
// A Relation (CONTEXT.md) is never declared, only accreted: affection
// and trust are bipolar (−1 is hatred / active distrust, not
// indifference), fear and familiarity unipolar. `feeling` is the word
// the engine derives from the vector; the four bars show the vector.
// ============================================================================
import { locale, t } from '../../lib/i18n'
import { humanize } from '../../lib/labels'
import type { RelationNode } from '../../types'
import MeterBar from '../ui/MeterBar.vue'

const props = defineProps<{ relations: RelationNode[] }>()

// The subject as the host worded it; fall back to the tag's last
// segment ('entity:rivendell' → 'rivendell').
const name = (r: RelationNode) =>
  r.display_name ?? humanize(r.subject.split(':').pop() ?? r.subject)

const ORIGIN: Record<string, { es: string; en: string }> = {
  seed: { es: 'Del preset', en: 'Seeded' },
  heard: { es: 'Escuchada', en: 'Heard' },
  lived: { es: 'Vivida', en: 'Lived' },
}
const originLabel = (o: string) => ORIGIN[o]?.[locale.value] ?? o

// Bipolar dims read as distance from 0 in either direction.
const bipolar = (v: number) => Math.abs(v)

const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`
</script>

<template>
  <table v-if="relations.length" class="table">
    <thead>
      <tr>
        <th>{{ t('rel.col.subject') }}</th>
        <th>{{ t('rel.col.feeling') }}</th>
        <th :title="t('rel.bipolar.help')">{{ t('rel.col.affection') }}</th>
        <th :title="t('rel.bipolar.help')">{{ t('rel.col.trust') }}</th>
        <th>{{ t('rel.col.fear') }}</th>
        <th>{{ t('rel.col.familiarity') }}</th>
        <th>{{ t('rel.col.origin') }}</th>
        <th>{{ t('rel.col.fed') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="r in props.relations" :key="r.id">
        <td class="text">
          {{ name(r) }}
          <span class="sub muted">{{ r.subject }}</span>
        </td>
        <td><span v-if="r.feeling" class="badge badge-accent">{{ r.feeling }}</span><span v-else class="muted">—</span></td>
        <td><span class="meter-cell"><MeterBar :value="bipolar(r.affection)" /><i :class="{ neg: r.affection < 0 }">{{ signed(r.affection) }}</i></span></td>
        <td><span class="meter-cell"><MeterBar :value="bipolar(r.trust)" /><i :class="{ neg: r.trust < 0 }">{{ signed(r.trust) }}</i></span></td>
        <td><span class="meter-cell"><MeterBar :value="r.fear" /><i>{{ r.fear.toFixed(2) }}</i></span></td>
        <td><span class="meter-cell"><MeterBar :value="r.familiarity" /><i>{{ r.familiarity.toFixed(2) }}</i></span></td>
        <td class="muted">{{ originLabel(r.origin) }}</td>
        <td class="num">{{ r.last_fed_episode != null ? t('mem.ep', { n: r.last_fed_episode }) : '—' }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else class="empty">{{ t('mem.empty.relations') }}</p>
</template>

<style scoped src="./table.css"></style>
<style scoped>
.sub { display: block; font-family: var(--mono); font-size: 11px; margin-top: 2px; }
.meter-cell { display: inline-flex; align-items: center; gap: 8px; }
.meter-cell i { font-style: normal; font-family: var(--mono); font-size: 11.5px; color: var(--text-dim); min-width: 4.5ch; }
.meter-cell i.neg { color: var(--danger); }
</style>
