<template>
  <div class="fixed inset-0 z-[10002] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 border-2 border-gold">
      <h2 class="text-2xl font-serif font-bold text-ink-black mb-2">In what season would you set out?</h2>
      <p class="text-ink-brown mb-6 font-book">Choose the time of year for your journey.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          @click="selectSeason('spring')"
          class="p-4 rounded-lg border-2 transition-all hover:border-gold hover:bg-parchment-dark text-left flex flex-col gap-1"
          :class="selectedSeason === 'spring' ? 'border-gold bg-parchment-dark' : 'border-earth-dark'"
        >
          <div class="flex items-center gap-2">
            <Sprout class="w-6 h-6 season-icon spring" />
            <h3 class="font-serif font-bold text-lg text-ink-black">Spring</h3>
          </div>
          <p class="text-sm text-ink-brown font-book">For new green and the long light returning; for those who like to begin.</p>
        </button>
        <button
          @click="selectSeason('summer')"
          class="p-4 rounded-lg border-2 transition-all hover:border-gold hover:bg-parchment-dark text-left flex flex-col gap-1"
          :class="selectedSeason === 'summer' ? 'border-gold bg-parchment-dark' : 'border-earth-dark'"
        >
          <div class="flex items-center gap-2">
            <Sun class="w-6 h-6 season-icon summer" />
            <h3 class="font-serif font-bold text-lg text-ink-black">Summer</h3>
          </div>
          <p class="text-sm text-ink-brown font-book">For warm roads and far horizons; for those who would rather be anywhere but indoors.</p>
        </button>
        <button
          @click="selectSeason('autumn')"
          class="p-4 rounded-lg border-2 transition-all hover:border-gold hover:bg-parchment-dark text-left flex flex-col gap-1"
          :class="selectedSeason === 'autumn' ? 'border-gold bg-parchment-dark' : 'border-earth-dark'"
        >
          <div class="flex items-center gap-2">
            <Leaf class="w-6 h-6 season-icon autumn" />
            <h3 class="font-serif font-bold text-lg text-ink-black">Autumn</h3>
          </div>
          <p class="text-sm text-ink-brown font-book">For woodsmoke and gold and the turning of the year; for those who love a little melancholy.</p>
        </button>
        <button
          @click="selectSeason('winter')"
          class="p-4 rounded-lg border-2 transition-all hover:border-gold hover:bg-parchment-dark text-left flex flex-col gap-1"
          :class="selectedSeason === 'winter' ? 'border-gold bg-parchment-dark' : 'border-earth-dark'"
        >
          <div class="flex items-center gap-2">
            <Snowflake class="w-6 h-6 season-icon winter" />
            <h3 class="font-serif font-bold text-lg text-ink-black">Winter</h3>
          </div>
          <p class="text-sm text-ink-brown font-book">For hard frost and clear stars and an empty road; for those who like the cold and the quiet.</p>
        </button>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <Button
          @click="$emit('cancel')"
          variant="outline"
          size="md"
        >
          Cancel
        </Button>
        <Button
          @click="handleConfirm"
          :disabled="!selectedSeason"
          variant="primary"
          size="md"
        >
          Begin Journey
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'
import { Button } from '@/components/ui/button'
import { Leaf, Sprout, Sun, Snowflake } from '@lucide/vue'

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

<style scoped>
.season-icon.spring {
  color: #3d7c47;
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
</style>
