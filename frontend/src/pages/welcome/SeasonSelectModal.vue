<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 border-2 border-gold">
      <h2 class="text-2xl font-serif font-bold text-ink-black mb-2">{{ t('welcome.seasonTitle') }}</h2>
      <p class="text-ink-brown mb-6 font-book">{{ t('welcome.seasonSubtitle') }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          v-for="season in seasons"
          :key="season.key"
          @click="selectSeason(season.key)"
          class="p-4 rounded-lg border-2 transition-all hover:border-gold hover:bg-parchment-dark text-left flex flex-col gap-1"
          :class="selectedSeason === season.key ? 'border-gold bg-parchment-dark' : 'border-earth-dark'"
        >
          <div class="flex items-center gap-2">
            <component :is="season.icon" class="w-6 h-6 season-icon" :class="season.key" />
            <h3 class="font-serif font-bold text-lg text-ink-black">{{ t(`welcome.seasons.${season.key}.title`) }}</h3>
          </div>
          <p class="text-base text-ink-brown font-book">{{ t(`welcome.seasons.${season.key}.desc`) }}</p>
        </button>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <Button
          @click="$emit('cancel')"
          variant="outline"
          size="md"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          @click="handleConfirm"
          :disabled="!selectedSeason"
          variant="primary"
          size="md"
        >
          {{ t('welcome.beginJourney') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'
import { Button } from '@/components/ui/button'
import { Leaf, Sprout, Sun, Snowflake } from '@lucide/vue'

const { t } = useI18n()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { updateClimateTime } = useGlobalClimateTime()
const selectedSeason = ref<'spring' | 'summer' | 'autumn' | 'winter' | null>(null)

const seasons = [
  { key: 'spring' as const, icon: Sprout },
  { key: 'summer' as const, icon: Sun },
  { key: 'autumn' as const, icon: Leaf },
  { key: 'winter' as const, icon: Snowflake },
]

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
