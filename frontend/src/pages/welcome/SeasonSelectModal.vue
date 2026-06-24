<template>
  <div class="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">In what season would you set out?</h2>
      <p class="text-gray-600 mb-6">Choose the time of year for your journey.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          @click="selectSeason('spring')"
          class="p-4 rounded-lg border-2 transition-all hover:border-green-500 hover:bg-green-50 text-left"
          :class="selectedSeason === 'spring' ? 'border-green-500 bg-green-50' : 'border-gray-200'"
        >
          <h3 class="font-bold text-lg text-gray-900">Spring</h3>
          <p class="text-sm text-gray-600">For new green and the long light returning; for those who like to begin.</p>
        </button>
        <button
          @click="selectSeason('summer')"
          class="p-4 rounded-lg border-2 transition-all hover:border-amber-500 hover:bg-amber-50 text-left"
          :class="selectedSeason === 'summer' ? 'border-amber-500 bg-amber-50' : 'border-gray-200'"
        >
          <h3 class="font-bold text-lg text-gray-900">Summer</h3>
          <p class="text-sm text-gray-600">For warm roads and far horizons; for those who would rather be anywhere but indoors.</p>
        </button>
        <button
          @click="selectSeason('autumn')"
          class="p-4 rounded-lg border-2 transition-all hover:border-orange-500 hover:bg-orange-50 text-left"
          :class="selectedSeason === 'autumn' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'"
        >
          <h3 class="font-bold text-lg text-gray-900">Autumn</h3>
          <p class="text-sm text-gray-600">For woodsmoke and gold and the turning of the year; for those who love a little melancholy.</p>
        </button>
        <button
          @click="selectSeason('winter')"
          class="p-4 rounded-lg border-2 transition-all hover:border-blue-500 hover:bg-blue-50 text-left"
          :class="selectedSeason === 'winter' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
        >
          <h3 class="font-bold text-lg text-gray-900">Winter</h3>
          <p class="text-sm text-gray-600">For hard frost and clear stars and an empty road; for those who like the cold and the quiet.</p>
        </button>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          @click="handleConfirm"
          :disabled="!selectedSeason"
          class="px-6 py-2 bg-stone-700 hover:bg-stone-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          Begin Journey
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { updateClimateTime } = useGlobalClimateTime()
const selectedSeason = ref<'spring' | 'summer' | 'autumn' | 'winter' | null>(null)

function selectSeason(season: 'spring' | 'summer' | 'autumn' | 'winter') {
  selectedSeason.value = season
}

function handleConfirm() {
  if (!selectedSeason.value) return

  const seasonDates: Record<'spring' | 'summer' | 'autumn' | 'winter', Date> = {
    spring: new Date(1950, 4, 1, 7, 0, 0), // May 1, 1950, 7 AM
    summer: new Date(1950, 6, 25, 7, 0, 0), // July 25, 1950, 7 AM
    autumn: new Date(1950, 9, 20, 7, 0, 0), // October 20, 1950, 7 AM
    winter: new Date(1950, 0, 20, 7, 0, 0) // January 20, 1950, 7 AM
  }

  updateClimateTime(seasonDates[selectedSeason.value])
  emit('confirm')
}
</script>
