<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loader2, ScrollText, ChevronDown, ChevronRight, Plus } from '@lucide/vue'
import { useTrips, type TripDay } from '../model/useTrips'
import { useCharacter } from '@/composables/useCharacter'

const props = defineProps<{
  tripId: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const { trip, days, loading, generating, error, getTrip, getDays, generateDay } = useTrips()
const { fetchCharacterPosition } = useCharacter()

const expanded = ref<Record<string, 'narrative' | 'prompt' | null>>({})

const title = computed(() => trip.value?.name || 'Journey')

function toggle(day: TripDay, panel: 'narrative' | 'prompt') {
  const current = expanded.value[day.id]
  expanded.value = { ...expanded.value, [day.id]: current === panel ? null : panel }
}

async function handleGenerateNext() {
  if (!props.tripId) return
  try {
    await generateDay(props.tripId)
    // Update character position to the end of the newly generated day
    await fetchCharacterPosition()
  } catch {
    /* error surfaced via `error` ref */
  }
}

onMounted(async () => {
  await getTrip(props.tripId)
  await getDays(props.tripId)
  // Expand the latest day's narrative by default
  const last = days.value[days.value.length - 1]
  if (last) expanded.value = { [last.id]: 'narrative' }
})
</script>

<template>
  <div class="chapter-viewer fixed right-0 top-0 h-full w-full max-w-xl bg-stone-50 shadow-2xl border-l border-stone-200 flex flex-col z-50">
    <!-- Header -->
    <header class="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white">
      <div class="flex items-center gap-2">
        <ScrollText class="w-5 h-5 text-amber-700" />
        <h2 class="text-lg font-serif font-semibold text-stone-800">{{ title }}</h2>
      </div>
      <button
        class="text-stone-400 hover:text-stone-700 text-sm"
        @click="emit('close')"
      >
        Close
      </button>
    </header>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      <div v-if="loading && days.length === 0" class="flex items-center gap-2 text-stone-500 py-8 justify-center">
        <Loader2 class="w-5 h-5 animate-spin" />
        Loading chapters…
      </div>

      <p v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
        {{ error }}
      </p>

      <article
        v-for="day in days"
        :key="day.id"
        class="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-stone-100">
          <h3 class="font-serif font-semibold text-stone-800">
            Chapter {{ day.day_number }}
          </h3>
          <p class="text-xs text-stone-500 mt-0.5">
            {{ day.date?.slice(0, 10) }} · {{ day.distance_km }} km ·
            {{ (day.regions || []).map((r) => r.name).join(', ') || 'unknown lands' }}
          </p>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-stone-100 text-sm">
          <button
            class="flex items-center gap-1 px-4 py-2 font-medium transition-colors"
            :class="expanded[day.id] === 'narrative' ? 'text-amber-700 bg-amber-50' : 'text-stone-500 hover:text-stone-700'"
            @click="toggle(day, 'narrative')"
          >
            <component :is="expanded[day.id] === 'narrative' ? ChevronDown : ChevronRight" class="w-4 h-4" />
            Narrative
          </button>
          <button
            class="flex items-center gap-1 px-4 py-2 font-medium transition-colors"
            :class="expanded[day.id] === 'prompt' ? 'text-amber-700 bg-amber-50' : 'text-stone-500 hover:text-stone-700'"
            @click="toggle(day, 'prompt')"
          >
            <component :is="expanded[day.id] === 'prompt' ? ChevronDown : ChevronRight" class="w-4 h-4" />
            Prompt
          </button>
        </div>

        <!-- Panels -->
        <div v-if="expanded[day.id] === 'narrative'" class="px-4 py-4">
          <p
            v-if="day.narrative"
            class="font-serif text-stone-700 leading-relaxed whitespace-pre-wrap"
          >{{ day.narrative }}</p>
          <p v-else class="text-sm text-stone-400 italic">No narrative was generated for this day.</p>
        </div>

        <div v-if="expanded[day.id] === 'prompt'" class="px-4 py-4">
          <pre class="text-xs text-stone-600 whitespace-pre-wrap font-mono bg-stone-50 rounded-md p-3 border border-stone-100">{{ day.prompt }}</pre>
        </div>
      </article>

      <p v-if="!loading && days.length === 0 && !error" class="text-sm text-stone-400 italic text-center py-8">
        No chapters yet. Generate the first day to begin the tale.
      </p>
    </div>

    <!-- Footer -->
    <footer class="px-5 py-4 border-t border-stone-200 bg-white">
      <button
        class="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        :disabled="generating"
        @click="handleGenerateNext"
      >
        <Loader2 v-if="generating" class="w-4 h-4 animate-spin" />
        <Plus v-else class="w-4 h-4" />
        {{ generating ? 'Writing the next chapter…' : 'Generate next day' }}
      </button>
    </footer>
  </div>
</template>
