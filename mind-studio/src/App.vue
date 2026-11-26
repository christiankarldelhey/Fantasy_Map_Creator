<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import AppHeader from './components/AppHeader.vue'
import TabNav from './components/TabNav.vue'
import EpisodesTab from './components/episodes/EpisodesTab.vue'
import MemoryTab from './components/memory/MemoryTab.vue'
import PersonalityTab from './components/personality/PersonalityTab.vue'
import SummaryTab from './components/summary/SummaryTab.vue'
import TagsTab from './components/tags/TagsTab.vue'
import MapTab from './components/map/MapTab.vue'
import { t } from './lib/i18n'
import { useMind } from './composables/useMind'
import { useMinds } from './composables/useMinds'

type Tab = 'summary' | 'personality' | 'memory' | 'episodes' | 'tags' | 'map'

const { minds, selectedId, error: rosterError, select } = useMinds()
const { mind, loading, error, refresh } = useMind(selectedId)

const tab = shallowRef<Tab>('summary')

const tabs = computed(() => [
  { id: 'summary' as const, label: t('tab.summary') },
  { id: 'personality' as const, label: t('tab.personality') },
  { id: 'memory' as const, label: t('tab.memory'), count: mind.value?.memories.length },
  { id: 'episodes' as const, label: t('tab.episodes'), count: mind.value?.episodes.length },
  { id: 'tags' as const, label: t('tab.tags') },
  { id: 'map' as const, label: t('tab.map') },
])
</script>

<template>
  <div class="studio">
    <AppHeader :minds="minds" :selected-id="selectedId" :mind="mind" @select="select" />

    <p v-if="rosterError || error" class="notice error">
      {{ t('err.load', { err: rosterError || error || '?' }) }}
    </p>
    <p v-else-if="!loading && !minds.length" class="notice muted">
      {{ t('empty.minds') }}
    </p>

    <main v-if="mind || tab === 'map'" class="main">
      <TabNav v-model="tab" :tabs="tabs" />
      <div class="content">
        <MapTab v-if="tab === 'map'" />
        <template v-else-if="mind">
          <SummaryTab v-if="tab === 'summary'" :mind="mind" @saved="refresh" />
          <PersonalityTab v-else-if="tab === 'personality'" :key="mind.character_id" :mind="mind" @saved="refresh" />
          <MemoryTab v-else-if="tab === 'memory'" :mind="mind" />
          <EpisodesTab
            v-else-if="tab === 'episodes'"
            :key="mind.character_id"
            :mind="mind"
          />
          <TagsTab v-else />
        </template>
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
