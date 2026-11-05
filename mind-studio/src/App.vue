<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import AppHeader from './components/AppHeader.vue'
import TabNav from './components/TabNav.vue'
import EpisodesTab from './components/episodes/EpisodesTab.vue'
import MemoryTab from './components/memory/MemoryTab.vue'
import PersonalityTab from './components/personality/PersonalityTab.vue'
import SummaryTab from './components/summary/SummaryTab.vue'
import { useMind } from './composables/useMind'
import { useMinds } from './composables/useMinds'

type Tab = 'summary' | 'personality' | 'memory' | 'episodes'

const { minds, selectedId, error: rosterError, select } = useMinds()
const { mind, loading, error, refresh } = useMind(selectedId)

const tab = shallowRef<Tab>('summary')

const tabs = computed(() => [
  { id: 'summary' as const, label: 'Resumen' },
  { id: 'personality' as const, label: 'Personalidad' },
  { id: 'memory' as const, label: 'Memoria', count: mind.value?.memories.length },
  { id: 'episodes' as const, label: 'Episodios', count: mind.value?.episodes.length },
])
</script>

<template>
  <div class="studio">
    <AppHeader :minds="minds" :selected-id="selectedId" @select="select" />

    <p v-if="rosterError || error" class="notice error">
      No se pudo cargar la mente ({{ rosterError || error }}). Revisá que el mind-engine esté corriendo.
    </p>
    <p v-else-if="!loading && !minds.length" class="notice muted">
      Todavía no hay mentes. Se crean cuando un personaje vive su primer episodio de viaje.
    </p>

    <main v-if="mind" class="main">
      <TabNav v-model="tab" :tabs="tabs" />
      <div class="content">
        <SummaryTab v-if="tab === 'summary'" :mind="mind" @saved="refresh" />
        <PersonalityTab v-else-if="tab === 'personality'" :key="mind.character_id" :mind="mind" @saved="refresh" />
        <MemoryTab v-else-if="tab === 'memory'" :mind="mind" />
        <EpisodesTab v-else :key="mind.character_id" :mind="mind" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.studio { height: 100%; display: flex; flex-direction: column; }
.main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 28px 0;
}
.content { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 0 48px; }
.notice { margin: 48px auto; max-width: 520px; text-align: center; }
</style>
