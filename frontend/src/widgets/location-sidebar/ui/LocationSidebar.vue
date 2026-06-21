<script setup lang="ts">
import { computed, toRef } from 'vue'
import { X, Navigation, Clock } from '@lucide/vue'
import type { LocationDetails } from '../model/types'
import { getClimateIcon } from '../model/useClimateIcon'
import { useLocationImage } from '../model/useLocationImage'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'

const props = defineProps<{
  location: LocationDetails | null
}>()

defineEmits<{
  close: []
  directions: []
}>()

const locationRef = toRef(props, 'location')
const { currentImageUrl, handleImageError } = useLocationImage(locationRef)
const { isRealTime } = useGlobalClimateTime()

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
      v-if="currentImageUrl"
      :src="currentImageUrl"
      @error="handleImageError"
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
              <span class="text-sm text-gray-700 font-medium">{{ location?.biome?.type?.replace('_', ' ') ?? "Prairie" }}</span>
            </div>
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
        </div>
      </div>

      <div v-if="!isRealTime && location.climate" class="mt-3 flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
        <Clock class="h-4 w-4 text-amber-600" />
        <span class="text-xs text-amber-800">Showing historical climate data</span>
      </div>

      <div class="mt-4 flex gap-2">
        <button
          @click="$emit('directions')"
          class="w-full py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Navigation class="w-4 h-4" />
          Directions
        </button>
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

      <!-- Region-specific fields -->
      <div v-if="location.type === 'Region'" class="mt-3 space-y-2">
        <div v-if="location.products" class="text-sm text-gray-600">
          <span class="font-semibold">Products:</span> {{ location.products }}
        </div>
      </div>
    </div>
  </div>
</template>

