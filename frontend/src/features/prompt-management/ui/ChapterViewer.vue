<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loader2, ScrollText, ChevronDown, ChevronRight, Plus, FileDown } from '@lucide/vue'
import { useTrips, type TripDay } from '../model/useTrips'
import { useCharacter } from '@/composables/useCharacter'
import { useLanguage } from '@/composables/useLanguage'
import { jsPDF } from 'jspdf'

const props = defineProps<{
  tripId: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const { trip, days, loading, generating, error, getTrip, getDays, generateDay } = useTrips()
const { activeCharacter } = useCharacter()
const { language } = useLanguage()

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
    await generateDay(props.tripId, { language: language.value })
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
      <div class="flex gap-3">
        <!-- Action Button (Generate / Save PDF) -->
        <button
          v-if="isTripComplete"
          class="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          :disabled="exportingPdf"
          @click="generateAdventurePDF"
        >
          <Loader2 v-if="exportingPdf" class="w-4 h-4 animate-spin" />
          <FileDown v-else class="w-4 h-4" />
          {{ exportingPdf ? labels.savingPdfBtn : labels.savePdfBtn }}
        </button>
        <button
          v-else
          class="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          :disabled="generating"
          @click="handleGenerateNext"
        >
          <Loader2 v-if="generating" class="w-4 h-4 animate-spin" />
          <Plus v-else class="w-4 h-4" />
          {{ generating ? labels.generatingBtn : labels.generateBtn }}
        </button>

        <!-- Cancel/Close Button -->
        <button
          class="py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          @click="emit('close')"
        >
          {{ isTripComplete ? labels.closeBtn : labels.cancelBtn }}
        </button>
      </div>
    </footer>
  </div>
</template>
