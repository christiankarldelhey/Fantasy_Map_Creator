<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ScrollText, ChevronDown, ChevronRight, Plus, FileDown } from '@lucide/vue'
import { useTrips, type TripDay } from '../model/useTrips'
import { useCharacter } from '@/composables/useCharacter'
import { useLanguage } from '@/composables/useLanguage'
import { useMapAnimation } from '@/composables/useMapAnimation'
import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'

const props = defineProps<{
  tripId: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const { trip, days, loading, generating, error, getTrip, getDays, generateDay } = useTrips()
const { activeCharacter, fetchAllCharacters } = useCharacter()
const { language } = useLanguage()
const { triggerAnimation } = useMapAnimation()

const expanded = ref<Record<string, 'narrative' | 'prompt' | null>>({})
const exportingPdf = ref(false)

const title = computed(() => trip.value?.name || 'Journey')

const isTripComplete = computed(() => {
  if (days.value.length === 0) return false
  const lastDay = days.value[days.value.length - 1]
  return !!lastDay.is_last_day
})

const labels = computed(() => {
  const characterName = activeCharacter.value?.name || 'Traveller'
  return {
    adventureText: 'An adventure of',
    characterText: characterName,
    chaptersText: 'Chapters',
    chapterLabel: 'Chapter',
    distanceLabel: 'Distance',
    regionsLabel: 'Regions',
    savePdfBtn: 'Save adventure as PDF',
    savingPdfBtn: 'Saving PDF...',
    generateBtn: 'Generate next day',
    generatingBtn: 'Writing the next chapter…',
    cancelBtn: 'Cancel adventure',
    closeBtn: 'Close adventure'
  }
})

function toggle(day: TripDay, panel: 'narrative' | 'prompt') {
  const current = expanded.value[day.id]
  expanded.value = { ...expanded.value, [day.id]: current === panel ? null : panel }
}

async function handleGenerateNext() {
  if (!props.tripId) return
  try {
    const newDay = await generateDay(props.tripId, { language: language.value })
    // Refresh character position from backend after day generation
    await fetchAllCharacters()
    // Trigger character animation along the day's route
    if (newDay?.geometry) {
      triggerAnimation(newDay.geometry, 10000) // 10 seconds
    }
  } catch {
    /* error surfaced via `error` ref */
  }
}

async function generateAdventurePDF() {
  if (!trip.value || days.value.length === 0) return
  exportingPdf.value = true

  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4'
    })

    const margin = 54
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const maxLineWidth = pageWidth - (margin * 2)

    let y = margin

    // Check page break function
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
        return true
      }
      return false
    }

    // --- Title ---
    doc.setFont('times', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(115, 74, 18) // #734a12 - dark amber
    const titleText = trip.value.name || 'A Journey in Middle-earth'
    const titleLines = doc.splitTextToSize(titleText, maxLineWidth)
    doc.text(titleLines, margin, y)
    y += (titleLines.length * 32) + 15

    // --- Subtitle / Metadata ---
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(80, 80, 80)
    const totalKm = days.value.reduce((acc, d) => acc + (d.distance_km || 0), 0).toFixed(1)
    const metaText = `${labels.value.adventureText} ${totalKm} km.`
    doc.text(metaText, margin, y)
    y += 25

    // Divider
    doc.setDrawColor(200, 190, 180)
    doc.setLineWidth(1)
    doc.line(margin, y, pageWidth - margin, y)
    y += 30

    // --- Character ---
    if (activeCharacter.value) {
      doc.setFont('times', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(50, 50, 50)
      doc.text(labels.value.characterText + ': ' + activeCharacter.value.name, margin, y)
      y += 20

      if (activeCharacter.value.current_location || activeCharacter.value.current_region) {
        doc.setFont('times', 'italic')
        doc.setFontSize(11)
        doc.setTextColor(100, 100, 100)
        const locationText = `Last seen at: ${activeCharacter.value.current_location || ''} (${activeCharacter.value.current_region || ''})`
        doc.text(locationText, margin, y)
        y += 20
      }
      y += 10
    }

    // --- Chapters ---
    for (const day of days.value) {
      // Add a page for each chapter
      doc.addPage()
      y = margin

      // Chapter Title
      doc.setFont('times', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(115, 74, 18)
      doc.text(`${labels.value.chapterLabel} ${day.day_number}`, margin, y)
      y += 25

      // Chapter Metadata
      doc.setFont('times', 'italic')
      doc.setFontSize(11)
      doc.setTextColor(120, 120, 120)
      const dateStr = day.date ? day.date.slice(0, 10) : ''
      const regionsStr = (day.regions || []).map(r => r.name).join(', ')
      const chMeta = `${dateStr}  ·  ${day.distance_km} km  ·  ${regionsStr}`
      doc.text(chMeta, margin, y)
      y += 15

      // Chapter Divider
      doc.setDrawColor(230, 220, 210)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 25

      // Chapter Narrative
      if (day.narrative) {
        doc.setFont('times', 'normal')
        doc.setFontSize(12)
        doc.setTextColor(40, 40, 40)
        
        // Split narrative into paragraphs
        const paragraphs = day.narrative.split('\n')
        for (const para of paragraphs) {
          if (!para.trim()) {
            y += 10
            continue
          }
          const paraLines = doc.splitTextToSize(para, maxLineWidth)
          
          for (const line of paraLines) {
            checkPageBreak(18)
            doc.text(line, margin, y)
            y += 18
          }
          y += 12 // Space between paragraphs
        }
      } else {
        doc.setFont('times', 'italic')
        doc.setFontSize(11)
        doc.setTextColor(150, 150, 150)
        doc.text('No narrative generated for this chapter.', margin, y)
        y += 20
      }
    }

    // Save PDF
    const filename = `${trip.value.name ? trip.value.name.replace(/[^a-zA-Z0-9]/g, '_') : 'adventure'}.pdf`
    doc.save(filename)
  } catch (err) {
    console.error('Error generating PDF:', err)
  } finally {
    exportingPdf.value = false
  }
}

async function loadTripData() {
  if (!props.tripId) return
  await getTrip(props.tripId)
  await getDays(props.tripId)
  // Expand the latest day's narrative by default
  const last = days.value[days.value.length - 1]
  if (last) expanded.value = { [last.id]: 'narrative' }
}

onMounted(loadTripData)

watch(() => props.tripId, (newTripId, oldTripId) => {
  if (newTripId && newTripId !== oldTripId) {
    loadTripData()
  }
})
</script>

<template>
  <div class="chapter-viewer fixed right-0 top-0 h-full w-full max-w-xl bg-parchment-base shadow-2xl border-l-2 border-gold flex flex-col z-50">
    <!-- Header -->
    <header class="flex items-center justify-between px-5 py-4 border-b-2 border-earth-dark bg-parchment-light">
      <div class="flex items-center gap-2">
        <ScrollText class="w-5 h-5 text-gold-base" />
        <h2 class="text-lg font-serif font-semibold text-ink-black">{{ title }}</h2>
      </div>
      <Button variant="ghost" size="sm" @click="emit('close')">
        Close
      </Button>
    </header>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      <Loader v-if="loading && days.length === 0" variant="inline">
        Loading chapters…
      </Loader>

      <p v-if="error" class="text-sm text-destructive bg-parchment-dark border-2 border-destructive rounded-md p-3 font-book">
        {{ error }}
      </p>

      <article
        v-for="day in days"
        :key="day.id"
        class="bg-parchment-light rounded-lg border-2 border-earth-dark shadow-md overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-earth-dark bg-parchment-base">
          <h3 class="font-serif font-semibold text-ink-black">
            Chapter {{ day.day_number }}
          </h3>
          <p class="text-xs text-ink-brown mt-0.5 font-book">
            {{ day.date?.slice(0, 10) }} · {{ day.distance_km }} km ·
            {{ (day.regions || []).map((r) => r.name).join(', ') || 'unknown lands' }}
          </p>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-earth-dark text-sm">
          <button
            class="flex items-center gap-1 px-4 py-2 font-medium transition-colors"
            :class="expanded[day.id] === 'narrative' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black'"
            @click="toggle(day, 'narrative')"
          >
            <component :is="expanded[day.id] === 'narrative' ? ChevronDown : ChevronRight" class="w-4 h-4" />
            Narrative
          </button>
          <button
            class="flex items-center gap-1 px-4 py-2 font-medium transition-colors"
            :class="expanded[day.id] === 'prompt' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black'"
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
            class="font-book text-ink-black leading-relaxed whitespace-pre-wrap"
          >{{ day.narrative }}</p>
          <p v-else class="text-sm text-ink-faded italic font-book">No narrative was generated for this day.</p>
        </div>

        <div v-if="expanded[day.id] === 'prompt'" class="px-4 py-4">
          <pre class="text-xs text-ink-brown whitespace-pre-wrap font-mono bg-parchment-dark rounded-md p-3 border border-earth-dark">{{ day.prompt }}</pre>
        </div>
      </article>

      <p v-if="!loading && days.length === 0 && !error" class="text-sm text-ink-faded italic text-center py-8 font-book">
        No chapters yet. Generate the first day to begin the tale.
      </p>
    </div>

    <!-- Footer -->
    <footer class="px-5 py-4 border-t-2 border-earth-dark bg-parchment-light">
      <div class="flex gap-3">
        <!-- Action Button (Generate / Save PDF) -->
        <Button
          v-if="isTripComplete"
          variant="secondary"
          size="md"
          class="flex-1"
          :disabled="exportingPdf"
          @click="generateAdventurePDF"
        >
          <Loader v-if="exportingPdf" size="sm" variant="inline" class="mr-2" />
          <FileDown v-else class="w-4 h-4 mr-2" />
          {{ exportingPdf ? labels.savingPdfBtn : labels.savePdfBtn }}
        </Button>
        <Button
          v-else
          variant="primary"
          size="md"
          class="flex-1"
          :disabled="generating"
          @click="handleGenerateNext"
        >
          <Loader v-if="generating" size="sm" variant="inline" class="mr-2" />
          <Plus v-else class="w-4 h-4 mr-2" />
          {{ generating ? labels.generatingBtn : labels.generateBtn }}
        </Button>

        <!-- Cancel/Close Button -->
        <Button
          variant="outline"
          size="md"
          @click="emit('close')"
        >
          {{ isTripComplete ? labels.closeBtn : labels.cancelBtn }}
        </Button>
      </div>
    </footer>
  </div>
</template>
