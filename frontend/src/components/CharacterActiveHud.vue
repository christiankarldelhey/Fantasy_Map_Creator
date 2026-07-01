<template>
  <div class="character-active-hud absolute top-4 left-4 z-[9999]">
    <div class="character-avatar">
      <img
        v-if="activeCharacter"
        :src="getCharacterImage(activeCharacter.name)"
        :alt="activeCharacter.name"
        class="w-full h-full object-cover"
      />
    </div>
    <div class="character-panel">
      <div class="character-header">
        <div class="character-name">
          {{ activeCharacter?.name }}
          <span v-if="activeCharacter?.permadeath" class="permadeath-skull" title="Permadeath enabled">☠</span>
        </div>
        <div class="character-type">{{ activeCharacter?.type }}</div>
      </div>
      <div class="resistance-bar" title="Resistance">
        <div class="resistance-fill" :style="{ width: `${resistancePct}%` }"></div>
      </div>
      <div class="date-season-row">
        <div class="date-text">{{ formattedDate }}</div>
        <div class="season-info">
          <component :is="seasonIcon" class="season-icon-svg" :class="season" />
          <span class="season-name">{{ seasonLabel }}</span>
        </div>
        <div class="region-text">{{ regionName }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCharacter } from '@/composables/useCharacter'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'
import { Leaf, Sprout, Sun, Snowflake } from '@lucide/vue'

const { activeCharacter } = useCharacter()
const { currentClimateTime } = useGlobalClimateTime()

const RESISTANCE_MAX = 20

const resistancePct = computed(() => {
  const r = activeCharacter.value?.resistance ?? 0
  return Math.min(100, Math.round((r / RESISTANCE_MAX) * 100))
})

const formattedDate = computed(() => {
  return currentClimateTime.value.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
})

const regionName = computed(() => {
  return activeCharacter.value?.current_region || 'Unknown'
})

const season = computed(() => {
  const month = currentClimateTime.value.getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
})

const seasonLabel = computed(() => {
  return season.value.charAt(0).toUpperCase() + season.value.slice(1)
})

const seasonIcon = computed(() => {
  switch (season.value) {
    case 'spring': return Sprout
    case 'summer': return Sun
    case 'autumn': return Leaf
    case 'winter': return Snowflake
  }
})

function getCharacterImage(name: string): string {
  return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
}
</script>

<style scoped>
.character-active-hud {
  display: flex;
  align-items: center;
  gap: 0;
}

.character-avatar {
  width: 77px;
  height: 77px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 4px solid var(--accent-gold);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 0 10px rgba(217, 119, 6, 0.5);
  z-index: 2;
}

.character-panel {
  background: var(--bg-parchment);
  border: 2px solid var(--accent-gold);
  border-radius: 0 8px 8px 0;
  padding: 6px 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  margin-left: -10px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.character-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.character-name {
  color: var(--text-ink-black);
  font-family: 'Cinzel', Georgia, serif;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.permadeath-skull {
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.75;
  color: var(--text-ink-black);
}

.character-type {
  color: var(--text-ink-brown);
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 10px;
  font-style: italic;
  line-height: 1.1;
  white-space: nowrap;
  flex-shrink: 0;
}

.resistance-bar {
  width: 100%;
  height: 5px;
  background: var(--bg-parchment-dark);
  border-radius: 3px;
  overflow: hidden;
}

.resistance-fill {
  height: 100%;
  background: var(--accent-gold);
  transition: width 0.3s ease;
}

.date-season-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.date-text {
  color: var(--text-ink-black);
  font-family: 'Cinzel', Georgia, serif;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.season-info {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.season-icon-svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.85;
}

.season-icon-svg.spring {
  color: #22c55e;
}

.season-icon-svg.summer {
  color: #eab308;
}

.season-icon-svg.autumn {
  color: #a16207;
}

.season-icon-svg.winter {
  color: #3b82f6;
}

.season-name {
  color: var(--text-ink-brown);
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 10px;
  font-style: italic;
  white-space: nowrap;
}

.region-text {
  color: var(--text-ink-brown);
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 10px;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}
</style>
