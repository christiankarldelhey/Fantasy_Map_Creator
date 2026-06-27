<template>
  <div class="date-season-panel absolute top-4 right-4 z-[9999] cursor-pointer" @click="handleClick">
    <div class="date-panel">
      <div class="season-icon" :class="season">
        <component :is="seasonIcon" class="w-full h-full" />
      </div>
      <div class="date-content">
        <div class="date-row">
          <div class="date-text">{{ formattedDate }}</div>
          <div class="time-text">{{ formattedTime }}</div>
        </div>
        <div class="region-text">{{ regionName }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'
import { useCharacter } from '@/composables/useCharacter'
import { Leaf, Sprout, Sun, Snowflake } from '@lucide/vue'

const emit = defineEmits<{
  click: []
}>()

const { currentClimateTime } = useGlobalClimateTime()
const { activeCharacter } = useCharacter()

const formattedDate = computed(() => {
  const date = currentClimateTime.value
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
})

const formattedTime = computed(() => {
  const date = currentClimateTime.value
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
})

const regionName = computed(() => {
  return activeCharacter.value?.current_region || 'Unknown region'
})

const season = computed(() => {
  const month = currentClimateTime.value.getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
})

const seasonIcon = computed(() => {
  switch (season.value) {
    case 'spring': return Sprout
    case 'summer': return Sun
    case 'autumn': return Leaf
    case 'winter': return Snowflake
  }
})

function handleClick() {
  emit('click')
}
</script>

<style scoped>
.date-season-panel {
  display: flex;
  align-items: center;
}

.date-panel {
  background: var(--bg-parchment);
  border: 2px solid var(--accent-gold);
  border-radius: 8px;
  padding: 7px 14px;
  min-width: 168px;
  height: 58px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.season-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 4px;
  opacity: 0.7;
}

.season-icon.spring {
  color: #22c55e;
}

.season-icon.summer {
  color: #eab308;
}

.season-icon.autumn {
  color: #a16207;
}

.season-icon.winter {
  color: #3b82f6;
}

.date-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-text {
  color: var(--text-ink-black);
  font-family: 'Cinzel', Georgia, serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-text {
  color: var(--text-ink-brown);
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 12px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.region-text {
  color: var(--text-ink-brown);
  font-family: 'IM Fell English', Georgia, serif;
  font-size: 11px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}
</style>
