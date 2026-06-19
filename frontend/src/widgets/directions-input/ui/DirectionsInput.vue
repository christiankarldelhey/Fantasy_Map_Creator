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
        <!-- Origin Input (Search or Map Click) -->
        <Popover v-model:open="showOriginDropdown">
          <PopoverTrigger as-child>
            <div class="relative w-full">
              <Input
                v-model="originQuery"
                @input="handleOriginInput"
                @focus="showOriginDropdown = true"
                placeholder="Search origin or click in the map"
                :class="['w-full bg-white pr-9 text-sm h-10 border-gray-200 focus-visible:ring-rose-500', originPoint ? 'font-medium text-gray-900' : '']"
              />
              <button
                v-if="originQuery.length > 0"
                @click="clearOrigin"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </PopoverTrigger>
          <PopoverContent class="w-[280px] p-0 z-[10000]" align="start">
            <div v-if="originLoading" class="p-4 text-center text-sm text-gray-500">
              Searching...
            </div>
            <div
              v-else-if="originResults.length === 0 && originQuery.length >= 2"
              class="p-4 text-center text-sm text-gray-500"
            >
              No results found
            </div>
            <div v-else class="max-h-60 overflow-y-auto">
              <div
                v-for="result in originResults"
                :key="`origin-${result.type}-${result.id}`"
                @click="selectOriginResult(result)"
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

      <!-- Swap button (⇅) -->
      <button
        @click="handleSwap"
        class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors self-center flex items-center justify-center h-10 w-10 border border-gray-100"
        title="Swap origin and destination"
      >
        <ArrowUpDown class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowLeft, ArrowUpDown, MapPin, X } from '@lucide/vue'
import { useSearch } from '@/entities/search'
import type { SearchResult } from '@/entities/search'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDirections, mapSearchResultToPoint } from '@/composables/useDirections'

const emit = defineEmits<{
  'select-origin': [point: any]
  'select-destination': [point: any]
  'exit': []
}>()

// Independent search instances for origin and destination
const {
  query: originSearchQuery,
  results: originResults,
  loading: originLoading,
  search: searchOrigin
} = useSearch()

const {
  query: destSearchQuery,
  results: destResults,
  loading: destLoading,
  search: searchDest
} = useSearch()

const {
  origin: originPoint,
  destination: destinationPoint,
  setOrigin,
  setDestination,
  swapPoints,
  exitDirections
} = useDirections()

const originQuery = ref('')
const destQuery = ref('')
const showOriginDropdown = ref(false)
const showDestDropdown = ref(false)

// Sync input text with reactive composable state
watch(originPoint, (newVal) => {
  originQuery.value = newVal ? newVal.name : ''
}, { immediate: true })

watch(destinationPoint, (newVal) => {
  destQuery.value = newVal ? newVal.name : ''
}, { immediate: true })

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

function selectOriginResult(result: SearchResult) {
  const point = mapSearchResultToPoint(result)
  setOrigin(point)
  showOriginDropdown.value = false
  emit('select-origin', point)
}

function selectDestResult(result: SearchResult) {
  const point = mapSearchResultToPoint(result)
  setDestination(point)
  showDestDropdown.value = false
  emit('select-destination', point)
}

function clearOrigin() {
  originQuery.value = ''
  originSearchQuery.value = ''
  originResults.value = []
  setOrigin(null)
  showOriginDropdown.value = false
}

function clearDestination() {
  destQuery.value = ''
  destSearchQuery.value = ''
  destResults.value = []
  setDestination(null)
  showDestDropdown.value = false
}

function handleSwap() {
  swapPoints()
}

function handleBack() {
  exitDirections()
  emit('exit')
}
</script>

<style scoped>
/* Scoped styles to match search-container spacing */
.directions-container {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -1px rgba(0, 0, 0, 0.04);
}
</style>
