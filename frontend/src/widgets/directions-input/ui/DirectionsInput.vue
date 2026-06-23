<template>
  <div class="directions-container absolute top-4 left-4 z-[9999] bg-white rounded-lg shadow-lg p-4 w-[400px] border border-gray-100 flex flex-col gap-3">
    <!-- Header/Controls row -->
    <div class="flex items-center gap-3 w-full">
      <!-- Back button -->
      <button
        @click="handleBack"
        class="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        title="Exit directions"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>

      <span class="text-sm font-semibold text-gray-700">Directions</span>

      <div class="ml-auto flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded font-medium">
        <span>🚶 Walk MVP</span>
      </div>
    </div>

    <!-- Inputs & Connection Line Grid -->
    <div class="flex items-center gap-2 w-full relative">
      <!-- Decorator Line (Origin to Destination) -->
      <div class="flex flex-col items-center justify-between h-20 w-8 py-3">
        <!-- Origin Icon: small circle -->
        <div class="w-4 h-4 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
        </div>
        <!-- Vertical dashed connector -->
        <div class="flex-grow border-l-2 border-dashed border-gray-300 my-1"></div>
        <!-- Destination Icon: standard map pin -->
        <MapPin class="w-4.5 h-4.5 text-rose-600" />
      </div>

      <!-- Inputs column -->
      <div class="flex-grow flex flex-col gap-3">
        <!-- Origin Input (Locked to Character) -->
        <div class="relative w-full">
          <Input
            v-model="originQuery"
            readonly
            :placeholder="characterData?.name || 'Aranath'"
            class="w-full bg-gray-50/60 text-sm h-10 border-gray-200 cursor-not-allowed font-semibold text-gray-700 focus-visible:ring-0 focus-visible:border-gray-200"
          />
        </div>

        <!-- Destination Input -->
        <Popover v-model:open="showDestDropdown">
          <PopoverTrigger as-child>
            <div class="relative w-full">
              <Input
                v-model="destQuery"
                @input="handleDestInput"
                @focus="showDestDropdown = true"
                placeholder="Search destination..."
                :class="['w-full bg-white pr-9 text-sm h-10 border-gray-200 focus-visible:ring-rose-500', destinationPoint ? 'font-medium text-gray-900' : '']"
              />
              <button
                v-if="destQuery.length > 0"
                @click="clearDestination"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </PopoverTrigger>
          <PopoverContent class="w-[280px] p-0 z-[10000]" align="start">
            <div v-if="destLoading" class="p-4 text-center text-sm text-gray-500">
              Searching...
            </div>
            <div
              v-else-if="destResults.length === 0 && destQuery.length >= 2"
              class="p-4 text-center text-sm text-gray-500"
            >
              No results found
            </div>
            <div v-else class="max-h-60 overflow-y-auto">
              <div
                v-for="result in destResults"
                :key="`dest-${result.type}-${result.id}`"
                @click="selectDestResult(result)"
                class="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center justify-between group"
              >
                <div class="flex items-center gap-3">
                  <span class="text-gray-400">
                    <svg
                      v-if="result.type === 'location'"
                      class="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <svg
                      v-else
                      class="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </span>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">{{ result.name }}</div>
                    <div class="text-xs text-gray-500 capitalize">{{ result.type }}</div>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>

    <!-- Route summary and loading states -->
    <div v-if="routeLoading" class="flex flex-col items-center justify-center py-6 border-t border-gray-100">
      <div class="animate-spin rounded-full h-6 w-6 border-2 border-rose-600 border-t-transparent mb-2"></div>
      <span class="text-xs text-gray-500 font-medium">Calculating shortest route...</span>
    </div>

    <div v-else-if="routeError" class="p-3 border-t border-gray-100 text-xs text-red-600 bg-red-50 rounded-md font-medium">
      ⚠️ {{ routeError }}
    </div>

    <div v-else-if="routeData" class="flex flex-col gap-3 border-t border-gray-100 pt-3 max-h-[300px] overflow-y-auto pr-1">
      <!-- Summary metrics card -->
      <div class="flex items-center justify-between bg-rose-50/50 border border-rose-100/50 rounded-lg p-3">
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-rose-600 leading-none">
            {{ formatDistance(routeData.summary.total_distance_m) }}
          </span>
          <span class="text-[10px] text-rose-500 font-semibold uppercase tracking-wider mt-1">Total Distance</span>
        </div>
        <div class="h-8 border-l border-rose-200/60"></div>
        <div class="flex flex-col items-end">
          <span class="text-2xl font-bold text-gray-700 leading-none">
            {{ formatTime(routeData.summary.total_time_seconds) }}
          </span>
          <span class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1">
            Walk Duration ({{ calculateTravelDays(routeData.summary.total_time_seconds) }} days)
          </span>
        </div>
      </div>

      <!-- Segment breakdown list -->
      <div class="flex flex-col gap-2 pl-2">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Itinerary Steps</span>

        <!-- Step 1: Off-road start -->
        <div v-if="routeData.geometry.off_road_start" class="flex gap-3 relative">
          <div class="flex flex-col items-center w-4">
            <div class="w-2.5 h-2.5 rounded-full border border-gray-400 bg-gray-100 flex items-center justify-center"></div>
            <div class="flex-grow border-l border-dashed border-gray-300 h-10 my-0.5"></div>
          </div>
          <div class="flex flex-col pb-4">
            <span class="text-xs font-semibold text-gray-700">Walk off-road</span>
            <span class="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Walk {{ formatDistance(routeData.geometry.off_road_start.properties.distance_m || 0) }} to join the roads</span>
              <span v-if="routeData.geometry.off_road_start.properties.biome_type && routeData.geometry.off_road_start.properties.biome_type !== 'plain'" class="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] lowercase font-semibold">
                {{ routeData.geometry.off_road_start.properties.biome_type }}
              </span>
              <span v-if="routeData.geometry.off_road_start.properties.altitude_type && routeData.geometry.off_road_start.properties.altitude_type !== 'plain'" class="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] lowercase font-semibold">
                {{ routeData.geometry.off_road_start.properties.altitude_type.replace('_', ' ') }}
              </span>
            </span>
          </div>
        </div>

        <!-- Step 2: On-road roads list -->
        <div v-for="(road, idx) in groupedRoads" :key="`road-step-${idx}`" class="flex gap-3 relative">
          <div class="flex flex-col items-center w-4">
            <div class="w-3 h-3 rounded-full border-2 border-rose-500 bg-rose-500 flex items-center justify-center">
              <div class="w-1 h-1 rounded-full bg-white"></div>
            </div>
            <div class="flex-grow border-l-2 border-rose-200 h-10 my-0.5"></div>
          </div>
          <div class="flex flex-col pb-4">
            <span class="text-xs font-bold text-gray-800">{{ road.name }}</span>
            <span class="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5 capitalize">
              <span>Follow road for {{ formatDistance(road.length) }}</span>
              <span v-if="road.terrain_type" class="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] lowercase font-medium">
                {{ road.terrain_type }}
              </span>
              <span v-if="road.biome_type && road.biome_type !== 'plain'" class="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] lowercase font-semibold">
                {{ road.biome_type }}
              </span>
              <span v-if="road.altitude_type && road.altitude_type !== 'plain'" class="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] lowercase font-semibold">
                {{ road.altitude_type.replace('_', ' ') }}
              </span>
            </span>
          </div>
        </div>

        <!-- Step 3: Off-road end -->
        <div v-if="routeData.geometry.off_road_end" class="flex gap-3 relative">
          <div class="flex flex-col items-center w-4">
            <div class="w-2.5 h-2.5 rounded-full border border-gray-400 bg-gray-100 flex items-center justify-center"></div>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-gray-700">Walk off-road</span>
            <span class="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Walk {{ formatDistance(routeData.geometry.off_road_end.properties.distance_m || 0) }} to reach destination</span>
              <span v-if="routeData.geometry.off_road_end.properties.biome_type && routeData.geometry.off_road_end.properties.biome_type !== 'plain'" class="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] lowercase font-semibold">
                {{ routeData.geometry.off_road_end.properties.biome_type }}
              </span>
              <span v-if="routeData.geometry.off_road_end.properties.altitude_type && routeData.geometry.off_road_end.properties.altitude_type !== 'plain'" class="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] lowercase font-semibold">
                {{ routeData.geometry.off_road_end.properties.altitude_type.replace('_', ' ') }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Start Adventure Button -->
    <div v-if="routeData" class="border-t border-gray-100 pt-3 flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-gray-600">Language:</label>
        <select
          v-model="narrativeLanguage"
          class="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="english">English</option>
          <option value="spanish">Español</option>
        </select>
      </div>
      <button
        @click="handleStartAdventure"
        class="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        <Compass class="w-4 h-4" />
        Start Adventure
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ArrowLeft, MapPin, X, Compass } from '@lucide/vue'
import { useSearch } from '@/entities/search'
import type { SearchResult } from '@/entities/search'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDirections, mapSearchResultToPoint } from '@/composables/useDirections'
import { useCharacter } from '@/composables/useCharacter'

const emit = defineEmits<{
  'select-origin': [point: any]
  'select-destination': [point: any]
  'exit': []
  'start-adventure': [payload: { origin: any; destination: any; language: string }]
}>()

// Search instance for destination
const {
  query: destSearchQuery,
  results: destResults,
  loading: destLoading,
  search: searchDest
} = useSearch()

const {
  origin: originPoint,
  destination: destinationPoint,
  routeData,
  routeLoading,
  routeError,
  setDestination,
  exitDirections,
} = useDirections()

const narrativeLanguage = ref<'english' | 'spanish'>('english')

const { characterData } = useCharacter()

const originQuery = ref('')
const destQuery = ref('')
const showDestDropdown = ref(false)

// Formatting helpers
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m} mins`
}

function formatDistance(m: number): string {
  if (m < 1000) {
    return `${Math.round(m)} m`
  }
  return `${(m / 1000).toFixed(1)} km`
}

function calculateTravelDays(seconds: number): number {
  const hoursPerDay = 12
  const totalHours = seconds / 3600
  return Math.ceil(totalHours / hoursPerDay)
}

// Group roads sequentially by name to make the itinerary readable
const groupedRoads = computed(() => {
  if (!routeData.value || !routeData.value.geometry.on_road) return []
  
  const features = routeData.value.geometry.on_road.features
  const groups: { 
    name: string; 
    length: number; 
    terrain_type?: string; 
    difficulty?: number; 
    biome_type?: string; 
    altitude_type?: string;
  }[] = []
  
  features.forEach(f => {
    const props = (f as any).properties || {}
    const name = props.name || 'Unnamed Road'
    const length = props.segment_length || 0
    
    if (groups.length > 0 && groups[groups.length - 1].name === name) {
      groups[groups.length - 1].length += length
    } else {
      groups.push({
        name,
        length,
        terrain_type: props.terrain_type,
        difficulty: props.difficulty,
        biome_type: props.biome_type,
        altitude_type: props.altitude_type
      })
    }
  })
  
  return groups
})

// Sync input text with reactive composable state and character data
watch([originPoint, characterData], ([newPoint, newChar]) => {
  if (newPoint && newChar && (newPoint.name === 'Compañía' || newPoint.name === newChar.name || newPoint.name === 'Aranath')) {
    const name = newChar.name || 'Aranath'
    const loc = newChar.current_location || newChar.current_region || ''
    originQuery.value = loc ? `${name} (${loc})` : name
  } else {
    originQuery.value = newPoint ? newPoint.name : ''
  }
}, { immediate: true })

watch(destinationPoint, (newVal) => {
  destQuery.value = newVal ? newVal.name : ''
}, { immediate: true })

function handleDestInput() {
  destSearchQuery.value = destQuery.value
  if (destQuery.value.length >= 2) {
    searchDest(destQuery.value)
    showDestDropdown.value = true
  } else {
    destResults.value = []
    if (destQuery.value.length === 0) {
      setDestination(null)
    }
  }
}

function selectDestResult(result: SearchResult) {
  const point = mapSearchResultToPoint(result)
  setDestination(point)
  showDestDropdown.value = false
  emit('select-destination', point)
}

function clearDestination() {
  destQuery.value = ''
  destSearchQuery.value = ''
  destResults.value = []
  setDestination(null)
  showDestDropdown.value = false
}

function handleBack() {
  exitDirections()
  emit('exit')
}

function handleStartAdventure() {
  if (!originPoint.value || !destinationPoint.value) return
  emit('start-adventure', {
    origin: originPoint.value,
    destination: destinationPoint.value,
    language: narrativeLanguage.value,
  })
}
</script>

<style scoped>
/* Scoped styles to match search-container spacing */
.directions-container {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -1px rgba(0, 0, 0, 0.04);
}
</style>
