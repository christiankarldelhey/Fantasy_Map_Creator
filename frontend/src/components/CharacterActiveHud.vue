<template>
  <div
    class="character-active-hud absolute top-4 left-4 z-[9999] cursor-pointer"
    :class="{ 'character-active-hud--dead': isDead }"
    @click="emit('open-character')"
  >
    <div class="character-avatar">
      <img
        v-if="activeCharacter"
        :src="getCharacterImage(activeCharacter.name)"
        :alt="activeCharacter.name"
        class="w-full h-full object-cover"
        :class="{ 'grayscale opacity-70': isDead }"
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
      <div class="bars">
        <div class="bar energy-bar" title="Energy">
          <div class="bar-fill energy-fill" :class="energyFillClass" :style="{ width: `${energyPct}%` }"></div>
        </div>
        <div class="bar shadow-bar" title="Shadow">
          <div class="bar-fill shadow-fill" :style="{ width: `${shadowPct}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCharacter } from '@/composables/useCharacter'

const emit = defineEmits<{
  'open-character': []
}>()

const { activeCharacter } = useCharacter()

const isDead = computed(() => activeCharacter.value?.status === 'dead')

const energyPct = computed(() => {
  const e = activeCharacter.value?.energy ?? 0
  return Math.max(0, Math.min(100, Math.round(e)))
})

const shadowPct = computed(() => {
  const s = activeCharacter.value?.shadow ?? 0
  return Math.max(0, Math.min(100, Math.round(s)))
})

const energyFillClass = computed(() => {
  if (energyPct.value >= 70) return 'energy-fill--high'
  if (energyPct.value >= 30) return 'energy-fill--medium'
  return 'energy-fill--low'
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

.character-active-hud--dead .character-panel {
  opacity: 0.7;
  filter: grayscale(0.6);
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

.bars {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bar {
  width: 100%;
  height: 5px;
  background: var(--bg-parchment-dark);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.energy-fill--high {
  background: #556b2f;   /* dark olive green */
}

.energy-fill--medium {
  background: #d4a520;   /* antique gold */
}

.energy-fill--low {
  background: #8b0000;   /* dark red */
}

.shadow-fill {
  background: #000;
}
</style>
