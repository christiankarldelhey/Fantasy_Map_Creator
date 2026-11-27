<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { t } from '../../lib/i18n'
import {
  BELIEF_HORIZON, BELIEF_KIND, humanize, label, tagLabel,
} from '../../lib/labels'
import type { MemoryNode } from '../../types'
import MeterBar from '../ui/MeterBar.vue'

const props = defineProps<{ memories: MemoryNode[] }>()

const feeling = (v: number) =>
  v <= -0.2 ? t('mem.feel.neg') : v >= 0.2 ? t('mem.feel.pos') : t('mem.feel.neutral')

// The felt word as the pull stamped it — first pull word wins — else
// the imprint-derived word the memory was born with.
const feltOf = (m: MemoryNode) =>
  m.felt?.find((f) => f.word)?.word ?? m.feeling ?? null

// What the memory refers to: its Subject tags humanized ('entity:X' →
// 'X'), plus the stored entity/region anchors when they add a name the
// subjects don't carry. A ref chip is the memory's "about" — deduped
// by display name, since 'entity:deer' and 'family:deer' are one deer.
const refs = (m: MemoryNode) => {
  const out: { key: string; name: string }[] = []
  const seen = new Set<string>()
  const push = (key: string, name: string) => {
    const label = humanize(name)
    if (seen.has(label.toLowerCase())) return
    seen.add(label.toLowerCase())
    out.push({ key, name: label })
  }
  for (const s of m.subjects ?? []) push(s, s.split(':').pop() ?? s)
  for (const [k, v] of [['entity', m.entity_id], ['region', m.region]] as const) {
    if (v) push(`${k}:${v}`, v)
  }
  return out
}

// Tag chips skip whatever a ref chip already says — by key (the same
// tag string) and by display name (a 'npc:bungo' chip under an
// 'entity:bungo' ref is still one Bungo) — and never repeat themselves.
const tagChips = (m: MemoryNode) => {
  const keys = new Set(m.subjects ?? [])
  if (m.entity_id) keys.add(`entity:${m.entity_id}`)
  if (m.region) keys.add(`region:${m.region}`)
  const names = new Set(refs(m).map((r) => r.name.toLowerCase()))
  const out: { tag: string; label: string }[] = []
  for (const tag of m.tags ?? []) {
    if (keys.has(tag)) continue
    keys.add(tag)
    const label = tagLabel(tag)
    if (names.has(label.toLowerCase())) continue
    names.add(label.toLowerCase())
    out.push({ tag, label })
  }
  return out
}

// The continuum tier — convictions read off their facet; the column
// falls back for rows serialized before `depth` shipped.
const depthOf = (m: MemoryNode) =>
  m.depth ?? (m.kind === 'conviction'
    ? 'conviction'
    : m.consolidated ? 'consolidated' : 'fresh')

// --- sortable columns -------------------------------------------------------
type SortKey =
  'desc' | 'tags' | 'depth' | 'feel' | 'strength' | 'importance'
  | 'evoked' | 'voiced' | 'since'

const DEPTH_RANK: Record<string, number> = {
  fresh: 0, consolidated: 1, conviction: 2,
}

const keyOf: Record<SortKey, (m: MemoryNode) => string | number> = {
  desc: (m) => m.desc.toLowerCase(),
  tags: (m) => (refs(m)[0]?.name ?? tagChips(m)[0]?.label ?? '').toLowerCase(),
  depth: (m) => DEPTH_RANK[depthOf(m)] ?? 0,
  feel: (m) => m.valence,
  strength: (m) => m.strength,
  importance: (m) => m.importance,
  evoked: (m) => m.evocations,
  voiced: (m) => m.voiced,
  since: (m) => m.born_episode ?? -1,
}

const sort = shallowRef<{ key: SortKey; dir: 1 | -1 }>({
  key: 'strength', dir: -1,
})
const toggle = (key: SortKey) => {
  sort.value = sort.value.key === key
    ? { key, dir: (sort.value.dir * -1) as 1 | -1 }
    : { key, dir: -1 }
}
const arrow = (key: SortKey) =>
  sort.value.key === key ? (sort.value.dir === 1 ? '↑' : '↓') : ''

const sorted = computed(() => {
  const k = keyOf[sort.value.key]
  return [...props.memories].sort((a, b) => {
    const va = k(a); const vb = k(b)
    const c = typeof va === 'string'
      ? va.localeCompare(vb as string)
      : va - (vb as number)
    return c * sort.value.dir
  })
})
</script>

<template>
  <table v-if="sorted.length" class="table">
    <thead>
      <tr>
        <th class="sortable" :class="{ on: sort.key === 'desc' }" @click="toggle('desc')">
          {{ t('mem.col.memory') }}<span class="arrow">{{ arrow('desc') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'tags' }" @click="toggle('tags')">
          {{ t('mem.col.tags') }}<span class="arrow">{{ arrow('tags') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'depth' }" @click="toggle('depth')">
          {{ t('mem.col.kind') }}<span class="arrow">{{ arrow('depth') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'feel' }" @click="toggle('feel')">
          {{ t('mem.col.feeling') }}<span class="arrow">{{ arrow('feel') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'strength' }" :title="t('mem.col.strength.help')" @click="toggle('strength')">
          {{ t('mem.col.strength') }}<span class="arrow">{{ arrow('strength') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'importance' }" :title="t('mem.col.importance.help')" @click="toggle('importance')">
          {{ t('mem.col.importance') }}<span class="arrow">{{ arrow('importance') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'evoked' }" :title="t('mem.col.evoked.help')" @click="toggle('evoked')">
          {{ t('mem.col.evoked') }}<span class="arrow">{{ arrow('evoked') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'voiced' }" :title="t('mem.col.voiced.help')" @click="toggle('voiced')">
          {{ t('mem.col.voiced') }}<span class="arrow">{{ arrow('voiced') }}</span>
        </th>
        <th class="sortable" :class="{ on: sort.key === 'since' }" @click="toggle('since')">
          {{ t('mem.col.since') }}<span class="arrow">{{ arrow('since') }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="m in sorted" :key="m.id">
        <td class="text">{{ m.desc }}</td>
        <td class="tags">
          <span v-for="r in refs(m)" :key="r.key" class="tag ref" :title="r.key">{{ r.name }}</span>
          <span v-for="c in tagChips(m)" :key="c.tag" class="tag" :title="c.tag">{{ c.label }}</span>
        </td>
        <td>
          <span :class="['badge', `depth-${depthOf(m)}`]">{{ t(`mem.depth.${depthOf(m)}`) }}</span>
          <div v-if="m.conviction" class="muted facet">
            {{ label(BELIEF_KIND, m.conviction.kind) }}<template v-if="m.conviction.horizon"> · {{ label(BELIEF_HORIZON, m.conviction.horizon) }}</template>
          </div>
          <div v-else-if="m.kind === 'pattern'" class="muted facet">{{ t('mem.kind.pattern') }}</div>
        </td>
        <td :class="['feel', feeling(m.valence).toLowerCase()]">
          {{ feeling(m.valence) }}<template v-if="feltOf(m)"> · {{ feltOf(m) }}</template>
        </td>
        <td><MeterBar :value="m.strength" /></td>
        <td><MeterBar :value="m.importance" /></td>
        <td class="num">{{ m.evocations }}</td>
        <td class="num">{{ m.voiced }}</td>
        <td class="num">
          {{ m.born_episode != null ? t('mem.ep', { n: m.born_episode }) : t('mem.preset') }}
        </td>
      </tr>
    </tbody>
  </table>
  <p v-else class="empty">{{ t('mem.empty.alive') }}</p>
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
.tag.ref {
  color: var(--accent);
  border-color: var(--border-strong);
  background: var(--accent-soft);
}
.depth-conviction { color: var(--accent); border-color: var(--accent); }
.facet { font-size: 11px; margin-top: 4px; }
th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { color: var(--text); }
th.sortable.on { color: var(--accent); }
th.sortable .arrow { margin-left: 4px; font-size: 10px; }
</style>
