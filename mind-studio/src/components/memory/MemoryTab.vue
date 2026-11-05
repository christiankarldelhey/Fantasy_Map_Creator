<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { MindDetail } from '../../types'
import TabNav from '../TabNav.vue'
import BeliefList from './BeliefList.vue'
import MemoryList from './MemoryList.vue'
import MusingList from './MusingList.vue'

type View = 'alive' | 'forgotten' | 'beliefs' | 'musings'

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
  props.mind.beliefs.filter((b) => matches(b.statement)).sort((a, b) => b.strength - a.strength),
)
const musings = computed(() => props.mind.musings.filter((m) => matches(m.statement)))

const views = computed(() => [
  { id: 'alive' as const, label: 'Recuerdos', count: alive.value.length },
  { id: 'forgotten' as const, label: 'Olvidados', count: forgotten.value.length },
  { id: 'beliefs' as const, label: 'Creencias', count: beliefs.value.length },
  { id: 'musings' as const, label: 'Voz interior', count: musings.value.length },
])

const HELP: Record<View, string> = {
  alive: 'Lo que recuerda de sus viajes. Los recuerdos se debilitan con el tiempo salvo que algo los vuelva a traer.',
  forgotten: 'Recuerdos que se debilitaron hasta perderse. Queda su rastro, pero ya no influyen.',
  beliefs: 'Lo que tiene por cierto. Algunas vienen del preset y otras las aprendió reflexionando sobre lo vivido.',
  musings: 'Frases escritas de antemano que le dan color a su forma de pensar. No son creencias: el narrador las usa como inspiración.',
}
</script>

<template>
  <div class="memory">
    <div class="toolbar">
      <TabNav v-model="view" :tabs="views" />
      <input v-model="query" class="field search" type="search" placeholder="Buscar…" aria-label="Buscar" />
    </div>
    <p class="help muted">{{ HELP[view] }}</p>

    <MemoryList v-if="view === 'alive'" :memories="alive" />
    <MemoryList v-else-if="view === 'forgotten'" :memories="forgotten" forgotten />
    <BeliefList v-else-if="view === 'beliefs'" :beliefs="beliefs" />
    <MusingList v-else :musings="musings" />
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.toolbar :deep(.tabs) { flex: 1; }
.search { width: 220px; padding: 6px 10px; margin-bottom: 6px; }
.help { margin: 16px 0; font-size: 13px; max-width: 80ch; }
</style>
