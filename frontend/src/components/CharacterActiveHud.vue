<template>
  <div class="character-active-hud absolute top-[72px] left-4 z-[9999]">
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
        <div class="character-name">{{ activeCharacter?.name }}</div>
        <span v-if="activeCharacter?.permadeath" class="permadeath-skull" title="Permadeath enabled">☠</span>
      </div>
      <div class="character-race">{{ activeCharacter?.type }}</div>
      <div class="resistance-bar" title="Resistance">
        <div class="resistance-fill" :style="{ width: `${resistancePct}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCharacter } from '@/composables/useCharacter'

const { activeCharacter } = useCharacter()

const RESISTANCE_MAX = 20

const resistancePct = computed(() => {
  const r = activeCharacter.value?.resistance ?? 0
  return Math.min(100, Math.round((r / RESISTANCE_MAX) * 100))
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
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 3px solid var(--accent-gold);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 0 10px rgba(217, 119, 6, 0.5);
  z-index: 2;
}

.character-panel {
  background: var(--bg-parchment);
  border: 2px solid var(--accent-gold);
  border-radius: 0 8px 8px 0;
  padding: 6px 12px;
  min-width: 140px;
  height: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  margin-left: -8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.character-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.character-name {
  color: var(--text-ink-black);
  font-family: 'Cinzel', Georgia, serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.permadeath-skull {
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.75;
  color: var(--text-ink-black);
}

.character-race {
  color: var(--text-ink-brown);
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 11px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resistance-bar {
  width: 100%;
  height: 5px;
  background: var(--bg-parchment-dark);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 2px;
}

.resistance-fill {
  height: 100%;
  background: var(--accent-gold);
  transition: width 0.3s ease;
}
</style>
