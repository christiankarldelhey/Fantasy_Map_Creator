<script setup lang="ts">
import { computed, toRef } from 'vue'
import { X, Navigation } from '@lucide/vue'
import type { LocationDetails } from '../model/types'
import { getClimateIcon } from '../model/useClimateIcon'
import { useLocationImage } from '../model/useLocationImage'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  location: LocationDetails | null
}>()

defineEmits<{
  close: []
  directions: []
}>()

const locationRef = toRef(props, 'location')
const { currentImageUrl, handleImageError } = useLocationImage(locationRef)

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
  <div v-if="location" class="location-sidebar absolute top-[100px] left-4 w-[400px] bg-parchment-base rounded-lg shadow-2xl border-2 border-gold z-[9998] overflow-hidden">
    <button
      @click="$emit('close')"
      class="absolute top-2 right-2 p-1 rounded-md hover:bg-parchment-dark transition-colors z-10 text-ink-brown hover:text-ink-black"
    >
      <X class="w-5 h-5" />
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
          <h3 class="font-serif font-bold text-lg text-gold-base leading-tight">{{ location.name }}</h3>
          <p class="text-xs mt-0.5 capitalize text-ink-brown font-book">{{ location.type.replace('_', ' ') }}</p>
          <p v-if="location.region" class="text-sm mt-2 text-ink-black">
            {{ location.region.name }}
            <span v-if="location.region.kingdom" class="text-ink-light font-normal"> ({{ location.region.kingdom }})</span>
          </p>

          <div class="mt-2 pt-1 space-y-2">
            <div v-if="location.elevation" class="flex items-center gap-2">
              <span class="text-sm font-semibold text-ink-black">🏔</span>
              <span class="text-sm text-ink-black">{{ location.elevation.meters }}m</span>
              <span v-if="location.elevation.terrain_type" class="text-sm text-ink-light font-book">({{ location.elevation.terrain_type }})</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-sm">{{ biomeIcon }}</span>
              <span class="text-sm text-ink-black font-medium">{{ location?.biome?.type?.replace('_', ' ') ?? "Prairie" }}</span>
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
          <span class="text-xs text-ink-light mt-3 font-book">{{ climateIcon.label }}</span>
          <span class="text-sm text-ink-black mt-3 font-book">{{ location.climate.temperature.toFixed(1) }}°C</span>
        </div>
      </div>

      <!-- <div v-if="!isRealTime && location.climate" class="mt-3 flex items-center gap-2 p-2 bg-parchment-dark rounded-lg border-2 border-gold">
        <Clock class="h-4 w-4 text-gold-base" />
        <span class="text-xs text-ink-black font-book">Showing historical climate data</span>
      </div> -->

      <div class="mt-4 flex gap-2">
        <Button
          @click="$emit('directions')"
          variant="primary"
          size="md"
          class="w-full"
        >
          <Navigation class="w-4 h-4 mr-2" />
          I want to go there
        </Button>
      </div>

      <div class="mt-4 pt-3 border-t-2 border-earth-dark"></div>
      
      <div v-if="location.population || location.inhabitants" class="mt-3 space-y-1">
        <p v-if="location.population" class="text-sm text-ink-black font-book">
          <span>👥 {{ location.population }} </span>
          <span v-if="location.inhabitants" class="text-xs text-ink-brown pl-1 font-book"> {{ location.inhabitants }} </span>
        </p>
      </div>
      
      <div v-if="location.description" class="mt-2">
        <p class="text-sm text-ink-black leading-normal font-book">{{ location.description }}</p>
      </div>

      <!-- Region-specific fields -->
      <div v-if="location.type === 'Region'" class="mt-3 space-y-2">
        <div v-if="location.products" class="text-sm text-ink-black font-book">
          <span class="font-serif font-semibold">Products:</span> {{ location.products }}
        </div>
      </div>
    </div>
  </div>
</template>

