<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { t } from '../../lib/i18n'
import type { MindDetail } from '../../types'
import TabNav from '../TabNav.vue'
import BeliefList from './BeliefList.vue'
import MemoryList from './MemoryList.vue'
import MusingList from './MusingList.vue'
import RelationList from './RelationList.vue'

type View = 'alive' | 'forgotten' | 'beliefs' | 'musings' | 'relations'

const props = defineProps<{ mind: MindDetail }>()

const view = shallowRef<View>('alive')
const query = shallowRef('')

const matches = (text: string) => text.toLowerCase().includes(query.value.trim().toLowerCase())

const alive = computed(() =>
  props.mind.memories
    .filter((m) => m.state === 'alive' && matches(m.desc))
    .sort((a, b) => b.strength - a.strength),
)
const forgotten = computed(() =>
  props.mind.memories
    .filter((m) => m.state !== 'alive' && matches(m.desc))
    .sort((a, b) => (b.forgotten_episode ?? 0) - (a.forgotten_episode ?? 0)),
)
const beliefs = computed(() =>
  props.mind.beliefs
    .filter((b) => matches(b.statement) || (b.subjects ?? []).some(matches))
    .sort((a, b) => b.strength - a.strength),
)
const musings = computed(() => props.mind.musings.filter((m) => matches(m.statement)))
const relations = computed(() =>
  props.mind.relations
    .filter((r) => matches(r.subject) || matches(r.display_name ?? ''))
    .sort((a, b) =>
      (Math.abs(b.affection) + Math.abs(b.fear) + Math.abs(b.trust))
      - (Math.abs(a.affection) + Math.abs(a.fear) + Math.abs(a.trust))),
)

const views = computed(() => [
  { id: 'alive' as const, label: t('mem.alive'), count: alive.value.length },
  { id: 'relations' as const, label: t('mem.relations'), count: relations.value.length },
  { id: 'beliefs' as const, label: t('mem.beliefs'), count: beliefs.value.length },
  { id: 'musings' as const, label: t('mem.musings'), count: musings.value.length },
  { id: 'forgotten' as const, label: t('mem.forgotten'), count: forgotten.value.length, dim: true },
])
</script>

<template>
  <div class="memory">
    <div class="toolbar">
      <TabNav v-model="view" :tabs="views" />
      <input v-model="query" class="field search" type="search" :placeholder="t('mem.search')" aria-label="Search" />
    </div>
    <p class="help muted">{{ t(`mem.${view}.help`) }}</p>

    <MemoryList v-if="view === 'alive'" :memories="alive" />
    <MemoryList v-else-if="view === 'forgotten'" :memories="forgotten" forgotten />
    <BeliefList v-else-if="view === 'beliefs'" :beliefs="beliefs" />
    <RelationList v-else-if="view === 'relations'" :relations="relations" />
    <MusingList v-else :musings="musings" />
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.toolbar :deep(.tabs) { flex: 1; }
.search { width: 220px; padding: 6px 10px; margin-bottom: 6px; }
.help { margin: 16px 0; font-size: 13px; max-width: 80ch; }
</style>
