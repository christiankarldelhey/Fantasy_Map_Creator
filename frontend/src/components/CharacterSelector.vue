<template>
  <div class="character-selector">
    <h3 class="selector-title">Select Character</h3>
    <div class="character-list">
      <div
        v-for="character in characters"
        :key="character.id"
        class="character-item"
        :class="{ active: character.active, inactive: !character.active }"
        @click="selectCharacter(character.id)"
      >
        <div class="character-avatar">
          <img :src="getCharacterImage(character.name)" :alt="character.name" />
        </div>
        <div class="character-info">
          <div class="character-name">{{ character.name }}</div>
          <div class="character-type">{{ character.type }}</div>
          <div class="character-location">
            {{ character.current_location || 'Unknown' }}
          </div>
        </div>
        <div class="character-status">
          <span v-if="character.active" class="status-badge active">Active</span>
          <span v-else class="status-badge inactive">Inactive</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCharacter } from '@/composables/useCharacter'

const { characters, setActiveCharacter } = useCharacter()

function getCharacterImage(name: string): string {
  return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
}

async function selectCharacter(id: number) {
  await setActiveCharacter(id)
}
</script>

<style scoped>
.character-selector {
  background: rgba(26, 26, 26, 0.95);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.selector-title {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.character-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.character-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.character-item.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.character-item.inactive {
  opacity: 0.5;
}

.character-item.inactive:hover {
  opacity: 0.7;
}

.character-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.character-item.active .character-avatar {
  border-color: #3b82f6;
}

.character-info {
  flex: 1;
  min-width: 0;
}

.character-name {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.character-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-bottom: 2px;
}

.character-location {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.character-status {
  flex-shrink: 0;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #3b82f6;
  color: #fff;
}

.status-badge.inactive {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}
</style>
