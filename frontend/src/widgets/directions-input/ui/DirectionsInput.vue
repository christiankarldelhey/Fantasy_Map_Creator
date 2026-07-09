<template>
  <div class="directions-container absolute top-[100px] left-4 z-[9999] w-[400px] bg-parchment-base rounded-lg shadow-2xl border-2 border-gold flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="flex items-center gap-3 px-4 py-3 border-b-2 border-earth-dark bg-parchment-light">
      <button
        @click="handleBack"
        class="p-1 rounded-md hover:bg-parchment-dark transition-colors text-ink-brown hover:text-ink-black"
        title="Exit directions"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <span class="font-serif font-semibold text-ink-black">Directions</span>
    </header>

    <!-- Inputs -->
    <div class="px-4 pt-4 pb-3 flex items-center gap-2 w-full">
      <!-- Decorator line -->
      <div class="flex flex-col items-center justify-between h-20 w-6 py-2 shrink-0">
        <div class="w-3 h-3 rounded-full border-2 border-gold-base bg-parchment-base"></div>
        <div class="flex-grow border-l-2 border-dashed border-earth-dark my-1"></div>
        <MapPin class="w-4 h-4 text-gold-base" />
      </div>

      <!-- Inputs column -->
      <div class="flex-grow flex flex-col gap-2">
        <!-- Origin (explore = searchable + map click; wander = locked to character) -->
        <Popover v-if="explore" v-model:open="showOriginDropdown">
          <PopoverTrigger as-child>
            <div class="relative w-full">
              <Input
                v-model="originQuery"
                @input="handleOriginInput"
                @focus="showOriginDropdown = true"
                placeholder="Search origin or click on the map"
                :class="['w-full pr-8 text-sm h-9 border-earth-dark bg-parchment-base focus-visible:ring-gold font-book', originPoint ? 'font-semibold text-ink-black' : 'text-ink-brown']"
              />
              <button
                v-if="originQuery.length > 0"
                @click="clearOrigin"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink-black transition-colors"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </PopoverTrigger>
          <PopoverContent class="w-[280px] p-0 z-[10000] bg-parchment-base border-2 border-gold" align="start">
            <div v-if="originLoading" class="p-4 text-center text-sm text-ink-brown font-book">Searching…</div>
            <div v-else-if="originResults.length === 0 && originQuery.length >= 2" class="p-4 text-center text-sm text-ink-faded font-book italic">No results found</div>
            <div v-else class="max-h-60 overflow-y-auto">
              <div
                v-for="result in originResults"
                :key="`origin-${result.type}-${result.id}`"
                @click="selectOriginResult(result)"
                class="px-4 py-2.5 hover:bg-parchment-dark cursor-pointer border-b border-earth-dark last:border-0 flex items-center gap-3"
              >
                <Circle class="w-3.5 h-3.5 text-gold-base shrink-0" />
                <div>
                  <div class="font-serif font-semibold text-ink-black text-sm">{{ result.name }}</div>
                  <div class="text-xs text-ink-brown capitalize font-book">{{ result.type }}</div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          v-else
          v-model="originQuery"
          readonly
          :placeholder="guest ? 'Click on the map to set your starting point' : (activeCharacter?.name || 'Traveller')"
          class="w-full bg-parchment-dark/40 text-sm h-9 border-earth-dark cursor-not-allowed font-semibold text-ink-black focus-visible:ring-0 font-book"
        />

        <!-- Destination -->
        <Popover v-model:open="showDestDropdown">
          <PopoverTrigger as-child>
            <div class="relative w-full">
              <Input
                v-model="destQuery"
                @input="handleDestInput"
                @focus="showDestDropdown = true"
                placeholder="Search destination…"
                :class="['w-full pr-8 text-sm h-9 border-earth-dark bg-parchment-base focus-visible:ring-gold font-book', destinationPoint ? 'font-semibold text-ink-black' : 'text-ink-brown']"
              />
              <button
                v-if="destQuery.length > 0"
                @click="clearDestination"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink-black transition-colors"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </PopoverTrigger>
          <PopoverContent class="w-[280px] p-0 z-[10000] bg-parchment-base border-2 border-gold" align="start">
            <div v-if="destLoading" class="p-4 text-center text-sm text-ink-brown font-book">Searching…</div>
            <div v-else-if="destResults.length === 0 && destQuery.length >= 2" class="p-4 text-center text-sm text-ink-faded font-book italic">No results found</div>
            <div v-else class="max-h-60 overflow-y-auto">
              <div
                v-for="result in destResults"
                :key="`dest-${result.type}-${result.id}`"
                @click="selectDestResult(result)"
                class="px-4 py-2.5 hover:bg-parchment-dark cursor-pointer border-b border-earth-dark last:border-0 flex items-center gap-3"
              >
                <MapPin class="w-3.5 h-3.5 text-gold-base shrink-0" />
                <div>
                  <div class="font-serif font-semibold text-ink-black text-sm">{{ result.name }}</div>
                  <div class="text-xs text-ink-brown capitalize font-book">{{ result.type }}</div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <!-- Swap origin/destination (explore only) -->
      <button
        v-if="explore"
        @click="handleSwap"
        title="Swap origin and destination"
        class="p-1.5 rounded-md text-ink-brown hover:text-ink-black hover:bg-parchment-dark transition-colors shrink-0"
      >
        <ArrowUpDown class="w-4 h-4" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="routeLoading" class="flex flex-col items-center justify-center py-6 border-t-2 border-earth-dark">
      <div class="animate-spin rounded-full h-5 w-5 border-2 border-gold-base border-t-transparent mb-2"></div>
      <span class="text-xs text-ink-brown font-book italic">Calculating route…</span>
    </div>

    <!-- Error -->
    <div v-else-if="routeError" class="mx-4 mb-3 p-3 border border-earth-dark bg-parchment-dark rounded text-xs text-ink-black font-book">
      ⚠️ {{ routeError }}
    </div>

    <!-- Route summary + itinerary -->
    <div v-else-if="routeData" class="flex flex-col border-t-2 border-earth-dark max-h-[320px] overflow-y-auto">
      <!-- Summary metrics -->
      <div class="flex items-center justify-between px-4 py-3 bg-parchment-light border-b border-earth-dark">
        <div class="flex flex-col">
          <span class="text-xl font-serif font-bold text-gold-base leading-none">
            {{ formatDistance(routeData.summary.total_distance_m) }}
          </span>
          <span class="text-[10px] text-ink-brown font-book uppercase tracking-wider mt-1">Total distance</span>
        </div>
        <div class="h-8 border-l border-earth-dark"></div>
        <div class="flex flex-col items-end">
          <span class="text-xl font-serif font-bold text-ink-black leading-none">
            {{ formatTime(routeData.summary.total_time_seconds) }}
          </span>
          <span class="text-[10px] text-ink-brown font-book uppercase tracking-wider mt-1">
            {{ calculateTravelDays(routeData.summary.total_time_seconds) }} days walking
          </span>
        </div>
      </div>

      <!-- Itinerary steps -->
      <div class="px-4 py-3 flex flex-col gap-0">
        <p class="text-[10px] font-serif font-semibold text-ink-brown uppercase tracking-widest mb-3">Itinerary</p>

        <!-- Off-road start -->
        <div v-if="routeData.geometry.off_road_start" class="flex gap-3">
          <div class="flex flex-col items-center w-4 shrink-0">
            <div class="w-2.5 h-2.5 rounded-full border-2 border-earth-dark bg-parchment-dark mt-0.5"></div>
            <div class="flex-grow border-l border-dashed border-earth-dark my-1"></div>
          </div>
          <div class="pb-4">
            <p class="text-xs font-semibold text-ink-black font-serif">Off-road approach</p>
            <p class="text-[11px] text-ink-brown font-book mt-0.5 flex flex-wrap gap-1.5 items-center">
              <span>{{ formatDistance(routeData.geometry.off_road_start.properties.distance_m || 0) }} to reach the road</span>
              <span v-if="routeData.geometry.off_road_start.properties.biome_type && routeData.geometry.off_road_start.properties.biome_type !== 'plain'" class="px-1.5 py-0.5 bg-parchment-dark border border-earth-dark rounded text-[10px] text-ink-black lowercase font-book">{{ routeData.geometry.off_road_start.properties.biome_type }}</span>
              <span v-if="routeData.geometry.off_road_start.properties.altitude_type && routeData.geometry.off_road_start.properties.altitude_type !== 'plain'" class="px-1.5 py-0.5 bg-parchment-dark border border-earth-dark rounded text-[10px] text-ink-black lowercase font-book">{{ routeData.geometry.off_road_start.properties.altitude_type.replace('_', ' ') }}</span>
            </p>
          </div>
        </div>

        <!-- On-road segments -->
        <div v-for="(road, idx) in groupedRoads" :key="`road-step-${idx}`" class="flex gap-3">
          <div class="flex flex-col items-center w-4 shrink-0">
            <div class="w-3 h-3 rounded-full border-2 border-gold-base bg-gold-base mt-0.5 flex items-center justify-center">
              <div class="w-1 h-1 rounded-full bg-parchment-base"></div>
            </div>
            <div class="flex-grow border-l-2 border-gold-base/40 my-1"></div>
          </div>
          <div class="pb-4">
            <p class="text-xs font-serif font-bold text-ink-black">{{ road.name }}</p>
            <p class="text-[11px] text-ink-brown font-book mt-0.5 flex flex-wrap gap-1.5 items-center capitalize">
              <span>{{ formatDistance(road.length) }}</span>
              <span v-if="road.terrain_type" class="px-1.5 py-0.5 bg-parchment-dark border border-earth-dark rounded text-[10px] text-ink-black lowercase font-book">{{ road.terrain_type }}</span>
              <span v-if="road.biome_type && road.biome_type !== 'plain'" class="px-1.5 py-0.5 bg-parchment-dark border border-earth-dark rounded text-[10px] text-ink-black lowercase font-book">{{ road.biome_type }}</span>
              <span v-if="road.altitude_type && road.altitude_type !== 'plain'" class="px-1.5 py-0.5 bg-parchment-dark border border-earth-dark rounded text-[10px] text-ink-black lowercase font-book">{{ road.altitude_type.replace('_', ' ') }}</span>
            </p>
          </div>
        </div>

        <!-- Off-road end -->
        <div v-if="routeData.geometry.off_road_end" class="flex gap-3">
          <div class="flex flex-col items-center w-4 shrink-0">
            <div class="w-2.5 h-2.5 rounded-full border-2 border-earth-dark bg-parchment-dark mt-0.5"></div>
          </div>
          <div>
            <p class="text-xs font-semibold text-ink-black font-serif">Off-road arrival</p>
            <p class="text-[11px] text-ink-brown font-book mt-0.5 flex flex-wrap gap-1.5 items-center">
              <span>{{ formatDistance(routeData.geometry.off_road_end.properties.distance_m || 0) }} to reach destination</span>
              <span v-if="routeData.geometry.off_road_end.properties.biome_type && routeData.geometry.off_road_end.properties.biome_type !== 'plain'" class="px-1.5 py-0.5 bg-parchment-dark border border-earth-dark rounded text-[10px] text-ink-black lowercase font-book">{{ routeData.geometry.off_road_end.properties.biome_type }}</span>
              <span v-if="routeData.geometry.off_road_end.properties.altitude_type && routeData.geometry.off_road_end.properties.altitude_type !== 'plain'" class="px-1.5 py-0.5 bg-parchment-dark border border-earth-dark rounded text-[10px] text-ink-black lowercase font-book">{{ routeData.geometry.off_road_end.properties.altitude_type.replace('_', ' ') }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer: guest CTA (sign in) -->
    <footer v-if="routeData && guest" class="px-4 py-3 border-t-2 border-earth-dark bg-parchment-light flex flex-col gap-2">
      <p class="text-xs font-book text-ink-brown italic text-center">
        Sign in to turn this route into an adventure.
      </p>
      <Button
        variant="primary"
        size="md"
        class="w-full"
        @click="emit('login')"
      >
        <Compass class="w-4 h-4 mr-2" />
        Sign in to begin your adventure
      </Button>
    </footer>

    <!-- Footer: Start Adventure (wander mode only) -->
    <footer v-else-if="routeData && !explore" class="px-4 py-3 border-t-2 border-earth-dark bg-parchment-light flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <label class="text-xs font-book text-ink-brown">Language:</label>
        <select
          v-model="narrativeLanguage"
          class="text-xs border border-earth-dark bg-parchment-base text-ink-black rounded px-2 py-1 font-book"
        >
          <option value="english">English</option>
          <option value="spanish">Español</option>
        </select>
      </div>
      <Button
        variant="primary"
        size="md"
        class="w-full"
        @click="handleStartAdventure"
      >
        <Compass class="w-4 h-4 mr-2" />
        Start Adventure
      </Button>
    </footer>

    <!-- Footer: Go to wander mode (explore mode, logged in) -->
    <footer v-else-if="routeData && explore && !guest" class="px-4 py-3 border-t-2 border-earth-dark bg-parchment-light flex flex-col gap-2">
      <p class="text-xs font-book text-ink-brown italic text-center">
        Adventures can only be started in wander mode.
      </p>
      <Button
        variant="primary"
        size="md"
        class="w-full"
        @click="handleGoToWander"
      >
        <Compass class="w-4 h-4 mr-2" />
        Go to wander mode
      </Button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, toRefs } from 'vue'
import { ArrowLeft, MapPin, X, Compass, Circle, ArrowUpDown } from '@lucide/vue'
import { useSearch } from '@/entities/search'
import type { SearchResult } from '@/entities/search'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDirections, mapSearchResultToPoint } from '@/composables/useDirections'
import { useCharacter } from '@/composables/useCharacter'
import { useLanguage } from '@/composables/useLanguage'

const props = withDefaults(defineProps<{
  guest?: boolean
  explore?: boolean
}>(), {
  guest: false,
  explore: false
})

const { guest, explore } = toRefs(props)

const emit = defineEmits<{
  'select-origin': [point: any]
  'select-destination': [point: any]
  'exit': []
  'start-adventure': [payload: { origin: any; destination: any; language: string }]
  'login': []
  'go-to-wander': []
}>()

// Search instance for destination
const {
  query: destSearchQuery,
  results: destResults,
  loading: destLoading,
  search: searchDest
} = useSearch()

// Search instance for origin (explore mode only)
const {
  query: originSearchQuery,
  results: originResults,
  loading: originLoading,
  search: searchOrigin
} = useSearch()

const {
  origin: originPoint,
  destination: destinationPoint,
  routeData,
  routeLoading,
  routeError,
  setOrigin,
  setDestination,
  swapPoints,
  exitDirections,
} = useDirections()

const { language: narrativeLanguage } = useLanguage()

const { activeCharacter } = useCharacter()

const originQuery = ref('')
const destQuery = ref('')
const showDestDropdown = ref(false)
const showOriginDropdown = ref(false)

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
watch([originPoint, activeCharacter], ([newPoint, newChar]) => {
  // Only sync character position to origin when NOT in explore mode
  if (explore.value) {
    originQuery.value = newPoint ? newPoint.name : ''
    return
  }

  if (newPoint && newChar && (newPoint.name === 'Company' || newPoint.name === newChar.name || newPoint.name === 'Aranath')) {
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

function handleOriginInput() {
  originSearchQuery.value = originQuery.value
  if (originQuery.value.length >= 2) {
    searchOrigin(originQuery.value)
    showOriginDropdown.value = true
  } else {
    originResults.value = []
    if (originQuery.value.length === 0) {
      setOrigin(null)
    }
  }
}

function selectOriginResult(result: SearchResult) {
  const point = mapSearchResultToPoint(result)
  setOrigin(point)
  showOriginDropdown.value = false
  emit('select-origin', point)
}

function clearOrigin() {
  originQuery.value = ''
  originSearchQuery.value = ''
  originResults.value = []
  setOrigin(null)
  showOriginDropdown.value = false
}

function handleSwap() {
  swapPoints()
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

function handleGoToWander() {
  emit('go-to-wander')
}
</script>

