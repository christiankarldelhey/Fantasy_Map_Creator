<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { MindDetail } from '../../types'
import EpisodeDetail from './EpisodeDetail.vue'
import EpisodeList from './EpisodeList.vue'

const props = defineProps<{ mind: MindDetail }>()

// Newest first, opened on the latest — the Mind as it is now.
const episodes = computed(() => [...props.mind.episodes].reverse())
const selectedId = shallowRef<string | null>(episodes.value[0]?.id ?? null)
const selected = computed(() => episodes.value.find((e) => e.id === selectedId.value) ?? null)
</script>

<template>
  <div v-if="episodes.length" class="layout">
    <EpisodeList v-model="selectedId" :episodes="episodes" />
    <EpisodeDetail v-if="selected" :key="selected.id" :episode="selected" />
  </div>
  <p v-else class="empty">Este personaje todavía no vivió ningún episodio.</p>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: start; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
</style>
