<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { X } from '@lucide/vue'
import type { LocationDetails } from '../model/types'
import { getClimateIcon } from '../model/useClimateIcon'

const props = defineProps<{
  location: LocationDetails | null
}>()

defineEmits<{
  close: []
}>()

const climateIcon = computed(() => {
  if (!props.location?.climate) return null
  return getClimateIcon(props.location.climate)
})

const biomeIcon = computed(() => {
  const biomeName = props.location?.biome?.name.toLowerCase()
  switch (biomeName) {
    case 'forest':
      return '🌳'
    case 'desert':
      return '🌵'
    case 'marshes':
      return '🌿'
    default:
      return '🌾'
  }
})

const currentTime = ref('')

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

let timeInterval: number | null = null

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 60000) // Update every minute
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

// function formatDistance(km?: number): string {
//   if (!km) return ''
//   return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(1)}km`
// }

// function formatNeighbors(neighbors: Array<{ region_name: string; weight: number }>): string {
//   return neighbors
//     .map(n => `${n.region_name} (${(n.weight * 100).toFixed(0)}%)`)
//     .join(', ')
// }

</script>



<template>
  <div v-if="location" class="location-sidebar absolute top-[72px] left-4 w-[400px] bg-white rounded-lg shadow-lg z-[9998] overflow-hidden">
    <button
      @click="$emit('close')"
      class="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
    >
      <X class="w-5 h-5 text-gray-500" />
    </button>

    <img
      src="@/assets/locations/placeholder.jpg"
      alt="Location image"
      class="w-full h-48 object-cover"
    />

    <div class="p-4">
      <div class="flex flex-row justify-between">
      <div>
        <h3 class="font-bold text-lg text-rose-600 leading-tight">{{ location.name }}</h3>
        <p class="text-xs mt-0.5 capitalize">{{ location.type.replace('_', ' ') }}</p>
        <p v-if="location.region" class="text-sm mt-2">
            {{ location.region.name }}
            <span v-if="location.region.kingdom" class="text-gray-500 font-normal"> ({{ location.region.kingdom }})</span>
        </p>
        
      <div class="mt-2 pt-1 space-y-2">
        <div v-if="location.elevation" class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700">🏔</span>
          <span class="text-sm text-gray-700">{{ location.elevation.meters }}m</span>
          <span v-if="location.elevation.terrain_type" class="text-sm text-gray-500">({{ location.elevation.terrain_type }})</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm">{{ biomeIcon }}</span>
          <span class="text-sm text-gray-700 font-medium">{{ location?.biome?.name?.replace('_', ' ') ?? "Prairie" }}</span>
        </div>

        <!-- <div v-if="location.road" class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700">🛤️</span>
          <span class="text-sm text-gray-700 font-medium">{{ location.road.name }}</span>
          <span v-if="location.road.terrain_type" class="text-sm text-gray-500">({{ location.road.terrain_type }})</span>
        </div> -->

        <!-- <div v-if="location.water" class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700">💧</span>
          <span class="text-sm text-gray-700 font-medium">{{ location.water.name }}</span>
          <span class="text-sm text-gray-500">({{ location.water.water_type }})</span>
        </div> -->

      </div>
      </div>
        <div v-if="climateIcon && location.climate" class="flex flex-col items-center">
          <div class="flex items-center">
            <template v-if="Array.isArray(climateIcon.component)">
              <component
                v-for="(comp, index) in climateIcon.component"
                :key="index"
                :is="comp"
                :class="['h-9 w-9', Array.isArray(climateIcon.color) ? climateIcon.color[index] : climateIcon.color]"
              />
            </template>
            <component
              v-else
              :is="climateIcon.component"
              :class="['h-9 w-9', climateIcon.color]"
            />
          </div>
          <span class="text-xs text-gray-500 mt-3">{{ climateIcon.label }}</span>
          <span class="text-sm text-gray-700 mt-3">{{ location.climate.temperature.toFixed(1) }}°C</span>
          <span class="text-sm text-gray-400 mt-2">{{ currentTime }}</span>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-gray-100"></div>
        <div v-if="location.population || location.inhabitants" class="mt-3 space-y-1">
          <p v-if="location.population" class="text-sm text-gray-600">
            <span>👥 {{ location.population }} </span>
            <span v-if="location.inhabitants" class="text-xs text-gray-600 pl-1"> {{ location.inhabitants }} </span>
          </p>
        </div>
        <div v-if="location.description" class="mt-2">
          <p class="text-sm text-gray-600 leading-normal">{{ location.description }}</p>
        </div>



      <!-- <div v-if="location.climate" class="mt-4 pt-3 border-t border-dashed border-gray-100">
        <div class="flex items-center justify-between">
          <span class="text-[10px] uppercase tracking-wider text-teal-500 font-bold">Climate (1950)</span>
          <span v-if="location.climate.isTransitionZone" class="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">Transition</span>
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
          <div class="flex items-center gap-1">
            <span>🌡️</span> <span>Temp: <strong>{{ location.climate.temperature.toFixed(1) }}°C</strong></span>
          </div>
          <div class="flex items-center gap-1">
            <span>💧</span> <span>Hum: <strong>{{ location.climate.humidity.toFixed(0) }}%</strong></span>
          </div>
          <div class="flex items-center gap-1">
            <span>🌧️</span> <span>Rain: <strong>{{ location.climate.precipitation.toFixed(2) }} mm</strong></span>
          </div>
          <div class="flex items-center gap-1">
            <span>💨</span> <span>Wind: <strong>{{ location.climate.wind.toFixed(1) }} km/h</strong></span>
          </div>
        </div>
        <div v-if="location.climate.isTransitionZone" class="mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          <div class="flex items-center gap-1.5">
            <span class="text-sm">🔄</span>
            <span class="text-xs text-amber-700 font-semibold">Transition Zone</span>
            <span class="text-xs text-amber-600">({{ formatDistance(location.climate.transitionDistanceKm) }} from boundary)</span>
          </div>
          <p v-if="location.climate.neighboringRegions && location.climate.neighboringRegions.length > 1" class="text-[10px] text-gray-400 mt-1 italic leading-tight">
            Blended with: {{ formatNeighbors(location.climate.neighboringRegions) }}
          </p>
        </div>
      </div> -->
    </div>
  </div>
</template>

