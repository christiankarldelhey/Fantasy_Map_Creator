<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ChevronDown, ChevronRight, Plus, FileDown, Copy, Check } from '@lucide/vue'
import { useTrips, type TripDay } from '../model/useTrips'
import { useCharacter } from '@/composables/useCharacter'
import { useLanguage } from '@/composables/useLanguage'
import { useUserSettings } from '@/composables/useUserSettings'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'
import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { Modal } from '@/components/ui/modal'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { JsonViewer } from 'vue3-json-viewer'
import 'vue3-json-viewer/dist/vue3-json-viewer.css'
import './json-viewer-custom.css'

const props = withDefaults(defineProps<{
  tripId: string
  mobile?: boolean
}>(), {
  mobile: false,
})

const emit = defineEmits<{ (e: 'close'): void; (e: 'day-generated', day: TripDay): void }>()

const { trip, days, loading, generating, error, getTrip, getDays, generateDay } = useTrips()
const { activeCharacter, fetchActiveCharacter } = useCharacter()

function getCharacterImage(name: string): string {
  return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
}
const { language } = useLanguage()
const { saveUserSettings } = useUserSettings()
const { setTripDate, resetToRealTime } = useGlobalClimateTime()

const expanded = ref<Record<string, 'narrative' | 'prompt' | 'code' | null>>({})
const copied = ref<Record<string, { prompt?: boolean; code?: boolean }>>({})
const copiedAllCodes = ref(false)
const exportingPdf = ref(false)
const showCancelModal = ref(false)
const showDeathModal = ref(false)
const isTripDead = ref(false)

const title = computed(() => trip.value?.name || 'Journey')

function syncTripDateToClimate() {
  const lastDay = days.value[days.value.length - 1]
  const dateStr = lastDay?.date || trip.value?.start_date
  if (dateStr) setTripDate(dateStr)
}

const isTripComplete = computed(() => {
  if (isTripDead.value) return true
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

function toggle(day: TripDay, panel: 'narrative' | 'prompt' | 'code') {
  const current = expanded.value[day.id]
  expanded.value = { ...expanded.value, [day.id]: current === panel ? null : panel }
}

function jsonCopy(day: TripDay) {
  return JSON.stringify(day, null, 2)
}

async function copyToClipboard(text: string | null | undefined, dayId: string, type: 'prompt' | 'code') {
  try {
    await navigator.clipboard.writeText(text ?? '')
    copied.value = { ...copied.value, [dayId]: { ...copied.value[dayId], [type]: true } }
    setTimeout(() => {
      copied.value = { ...copied.value, [dayId]: { ...copied.value[dayId], [type]: false } }
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

async function copyAllCodes() {
  try {
    const payload = days.value
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    copiedAllCodes.value = true
    setTimeout(() => {
      copiedAllCodes.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy all codes:', err)
  }
}

async function handleGenerateNext() {
  if (!props.tripId) return
  try {
    const newDay = await generateDay(props.tripId, { language: language.value })
    if (newDay?.date) setTripDate(newDay.date)
    // Emit event for MapViewer to handle animation
    if (newDay?.geometry) {
      emit('day-generated', newDay)
    }
    // Auto-expand the narrative tab for the newly generated day
    if (newDay?.id) {
      expanded.value = { [newDay.id]: 'narrative' }
      await nextTick()
      const el = document.getElementById(`chapter-${newDay.id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    // Permadeath: traveller was slain this chapter
    if (newDay?.trip_status === 'dead') {
      isTripDead.value = true
      showDeathModal.value = true
    }
  } catch {
    /* error surfaced via `error` ref */
  }
}

async function handleDeathConfirm() {
  showDeathModal.value = false
  await generateAdventurePDF()
}

async function handleCancelAdventure() {
  try {
    await saveUserSettings({ active_trip_id: null })
    resetToRealTime()
    showCancelModal.value = false
    emit('close')
  } catch (err) {
    console.error('Failed to cancel adventure:', err)
  }
}

function handleCancelClick() {
  showCancelModal.value = true
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
  // The backend activates the trip's character; refresh local state
  await fetchActiveCharacter()
  syncTripDateToClimate()
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
  <!-- Desktop: right sidebar -->
  <div v-if="!mobile" class="chapter-viewer fixed right-0 top-0 h-full w-full max-w-xl bg-parchment-base shadow-2xl border-l-2 border-gold flex flex-col z-50">
    <header class="flex items-center justify-between px-5 py-4 border-b-2 border-earth-dark bg-parchment-light">
      <div class="flex items-center gap-2">
        <img
          v-if="activeCharacter"
          :src="getCharacterImage(activeCharacter.name)"
          :alt="activeCharacter.name"
          class="w-8 h-8 rounded-full object-cover border border-gold"
          :style="{ filter: 'sepia(100%) brightness(0.7) opacity(0.8)' }"
        />
        <h2 class="text-lg font-serif font-semibold text-ink-black/90">{{ title }}</h2>
        <button
          class="p-1 rounded-md text-ink-brown/40 hover:text-ink-brown/80 hover:bg-parchment-dark transition-colors"
          :title="copiedAllCodes ? 'Copied all codes' : 'Copy all day codes'"
          @click="copyAllCodes"
        >
          <component :is="copiedAllCodes ? Check : Copy" class="w-4 h-4" />
        </button>
      </div>
    </header>

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
        :id="`chapter-${day.id}`"
        class="bg-parchment-light rounded-lg border-2 border-earth-dark shadow-md overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-earth-dark bg-parchment-base">
          <div class="flex items-center justify-between">
            <h3 class="font-serif font-semibold text-ink-black/90">Chapter {{ day.day_number }}</h3>
            <span class="font-serif text-sm text-ink-brown">{{ new Date(day.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) }}</span>
          </div>
          <p class="text-xs text-ink-brown mt-0.5 font-book">
            {{ day.distance_km }} km ·
            {{ (day.regions || []).map((r) => r.name).join(', ') || 'unknown lands' }}
          </p>
        </div>

        <div class="flex border-b border-earth-dark text-sm">
          <button
            class="flex items-center gap-1 px-4 py-2 font-medium transition-colors"
            :class="expanded[day.id] === 'narrative' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black/90'"
            @click="toggle(day, 'narrative')"
          >
            <component :is="expanded[day.id] === 'narrative' ? ChevronDown : ChevronRight" class="w-4 h-4" />
            Narrative
          </button>
          <button
            class="flex items-center gap-1 px-4 py-2 font-medium transition-colors"
            :class="expanded[day.id] === 'prompt' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black/90'"
            @click="toggle(day, 'prompt')"
          >
            <component :is="expanded[day.id] === 'prompt' ? ChevronDown : ChevronRight" class="w-4 h-4" />
            Prompt
          </button>
          <button
            class="flex items-center gap-1 px-4 py-2 font-medium transition-colors"
            :class="expanded[day.id] === 'code' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black/90'"
            @click="toggle(day, 'code')"
          >
            <component :is="expanded[day.id] === 'code' ? ChevronDown : ChevronRight" class="w-4 h-4" />
            Code
          </button>
        </div>

        <div v-if="expanded[day.id] === 'narrative'" class="px-4 py-4">
          <p
            v-if="day.narrative"
            class="font-book text-ink-black/90 leading-relaxed whitespace-pre-wrap"
          >{{ day.narrative }}</p>
          <p v-else class="text-sm text-ink-faded italic font-book">No narrative was generated for this day.</p>
        </div>

        <div v-if="expanded[day.id] === 'prompt'" class="px-4 py-4 relative">
          <button
            class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors"
            :title="copied[day.id]?.prompt ? 'Copied' : 'Copy prompt to clipboard'"
            @click="copyToClipboard(day.prompt, day.id, 'prompt')"
          >
            <component :is="copied[day.id]?.prompt ? Check : Copy" class="w-4 h-4" />
          </button>
          <pre class="text-xs text-ink-brown whitespace-pre-wrap font-mono bg-parchment-dark rounded-md p-3 border border-earth-dark">{{ day.prompt }}</pre>
        </div>

        <div v-if="expanded[day.id] === 'code'" class="px-4 py-4 relative">
          <button
            class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors z-10"
            :title="copied[day.id]?.code ? 'Copied' : 'Copy JSON object to clipboard'"
            @click="copyToClipboard(jsonCopy(day), day.id, 'code')"
          >
            <component :is="copied[day.id]?.code ? Check : Copy" class="w-4 h-4" />
          </button>
          <JsonViewer
            :value="day"
            :expand-depth="1"
            :copyable="false"
            :sort="false"
            theme="dark"
          />
        </div>
      </article>

      <p v-if="!loading && days.length === 0 && !error" class="text-sm text-ink-faded italic text-center py-8 font-book">
        No chapters yet. Generate the first day to begin the tale.
      </p>
    </div>

    <footer class="px-5 py-4 border-t-2 border-earth-dark bg-parchment-light">
      <div class="flex gap-3">
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

        <Button
          variant="outline"
          size="md"
          @click="isTripComplete ? emit('close') : handleCancelClick()"
        >
          {{ isTripComplete ? labels.closeBtn : labels.cancelBtn }}
        </Button>
      </div>
    </footer>
  </div>

  <!-- Mobile: bottom sheet -->
  <BottomSheet v-else :expanded-vh="92" :collapsed-px="200">
    <template #default>
      <div class="flex flex-col h-full">
        <header class="flex items-center justify-between px-4 py-3 border-b-2 border-earth-dark bg-parchment-light shrink-0">
          <div class="flex items-center gap-2">
            <img
              v-if="activeCharacter"
              :src="getCharacterImage(activeCharacter.name)"
              :alt="activeCharacter.name"
              class="w-7 h-7 rounded-full object-cover border border-gold"
              :style="{ filter: 'sepia(100%) brightness(0.7) opacity(0.8)' }"
            />
            <h2 class="text-base font-serif font-semibold text-ink-black/90">{{ title }}</h2>
            <button
              class="p-1 rounded-md text-ink-brown/40 hover:text-ink-brown/80 hover:bg-parchment-dark transition-colors"
              :title="copiedAllCodes ? 'Copied all codes' : 'Copy all day codes'"
              @click="copyAllCodes"
            >
              <component :is="copiedAllCodes ? Check : Copy" class="w-4 h-4" />
            </button>
          </div>
          <button @click="emit('close')" class="p-1 rounded-md hover:bg-parchment-dark text-ink-brown">
            <ChevronDown class="w-5 h-5" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Loader v-if="loading && days.length === 0" variant="inline">
            Loading chapters…
          </Loader>

          <p v-if="error" class="text-sm text-destructive bg-parchment-dark border-2 border-destructive rounded-md p-3 font-book">
            {{ error }}
          </p>

          <article
            v-for="day in days"
            :key="day.id"
            :id="`chapter-${day.id}`"
            class="bg-parchment-light rounded-lg border-2 border-earth-dark shadow-md overflow-hidden"
          >
            <div class="px-4 py-3 border-b border-earth-dark bg-parchment-base">
              <div class="flex items-center justify-between">
                <h3 class="font-serif font-semibold text-ink-black/90">Chapter {{ day.day_number }}</h3>
                <span class="font-serif text-sm text-ink-brown">{{ new Date(day.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) }}</span>
              </div>
              <p class="text-xs text-ink-brown mt-0.5 font-book">
                {{ day.distance_km }} km ·
                {{ (day.regions || []).map((r) => r.name).join(', ') || 'unknown lands' }}
              </p>
            </div>

            <div class="flex border-b border-earth-dark text-sm">
              <button
                class="flex items-center gap-1 px-3 py-2 font-medium transition-colors"
                :class="expanded[day.id] === 'narrative' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black/90'"
                @click="toggle(day, 'narrative')"
              >
                <component :is="expanded[day.id] === 'narrative' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                Narrative
              </button>
              <button
                class="flex items-center gap-1 px-3 py-2 font-medium transition-colors"
                :class="expanded[day.id] === 'prompt' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black/90'"
                @click="toggle(day, 'prompt')"
              >
                <component :is="expanded[day.id] === 'prompt' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                Prompt
              </button>
              <button
                class="flex items-center gap-1 px-3 py-2 font-medium transition-colors"
                :class="expanded[day.id] === 'code' ? 'text-gold-base bg-parchment-dark' : 'text-ink-brown hover:text-ink-black/90'"
                @click="toggle(day, 'code')"
              >
                <component :is="expanded[day.id] === 'code' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                Code
              </button>
            </div>

            <div v-if="expanded[day.id] === 'narrative'" class="px-4 py-4">
              <p
                v-if="day.narrative"
                class="font-book text-ink-black/90 leading-relaxed whitespace-pre-wrap"
              >{{ day.narrative }}</p>
              <p v-else class="text-sm text-ink-faded italic font-book">No narrative was generated for this day.</p>
            </div>

            <div v-if="expanded[day.id] === 'prompt'" class="px-4 py-4 relative">
              <button
                class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors"
                :title="copied[day.id]?.prompt ? 'Copied' : 'Copy prompt to clipboard'"
                @click="copyToClipboard(day.prompt, day.id, 'prompt')"
              >
                <component :is="copied[day.id]?.prompt ? Check : Copy" class="w-4 h-4" />
              </button>
              <pre class="text-xs text-ink-brown whitespace-pre-wrap font-mono bg-parchment-dark rounded-md p-3 border border-earth-dark">{{ day.prompt }}</pre>
            </div>

            <div v-if="expanded[day.id] === 'code'" class="px-4 py-4 relative">
              <button
                class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors z-10"
                :title="copied[day.id]?.code ? 'Copied' : 'Copy JSON object to clipboard'"
                @click="copyToClipboard(jsonCopy(day), day.id, 'code')"
              >
                <component :is="copied[day.id]?.code ? Check : Copy" class="w-4 h-4" />
              </button>
              <JsonViewer
                :value="day"
                :expand-depth="1"
                :copyable="false"
                :sort="false"
                theme="dark"
              />
            </div>
          </article>

          <p v-if="!loading && days.length === 0 && !error" class="text-sm text-ink-faded italic text-center py-8 font-book">
            No chapters yet. Generate the first day to begin the tale.
          </p>
        </div>

        <footer class="px-4 py-3 border-t-2 border-earth-dark bg-parchment-light shrink-0">
          <div class="flex gap-3">
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

            <Button
              variant="outline"
              size="md"
              @click="isTripComplete ? emit('close') : handleCancelClick()"
            >
              {{ isTripComplete ? labels.closeBtn : labels.cancelBtn }}
            </Button>
          </div>
        </footer>
      </div>
    </template>
  </BottomSheet>

  <!-- Cancel Confirmation Modal -->
  <Modal
    v-if="showCancelModal"
    :open="showCancelModal"
    title="Cancel Adventure"
    size="sm"
    @close="showCancelModal = false"
  >
    <p class="text-ink-black/90 font-book">Are you sure you want to cancel this adventure?</p>
    <template #footer>
      <div class="flex gap-3 justify-end">
        <Button variant="outline" size="md" @click="showCancelModal = false">
          No, keep it
        </Button>
        <Button variant="primary" size="md" @click="handleCancelAdventure">
          Yes, cancel
        </Button>
      </div>
    </template>
  </Modal>

  <!-- Permadeath Modal -->
  <Modal
    v-if="showDeathModal"
    :open="showDeathModal"
    title="The Journey Ends Here"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    @close="showDeathModal = false"
  >
    <div class="text-center space-y-4 py-2">
      <p class="text-4xl">☠</p>
      <p class="font-serif text-ink-black/90 text-base leading-relaxed">
        <strong>{{ activeCharacter?.name || 'The traveller' }}</strong> has fallen.
      </p>
      <p class="font-book text-ink-brown text-sm leading-relaxed">
        The road goes ever on — but not for them. Their tale is told, their steps recorded.
        The adventure is now preserved.
      </p>
    </div>
    <template #footer>
      <div class="flex justify-center">
        <Button variant="primary" size="md" :disabled="exportingPdf" @click="handleDeathConfirm">
          <Loader v-if="exportingPdf" size="sm" variant="inline" class="mr-2" />
          <FileDown v-else class="w-4 h-4 mr-2" />
          {{ exportingPdf ? 'Saving…' : 'Save adventure as PDF' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
