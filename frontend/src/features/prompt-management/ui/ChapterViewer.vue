<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight, Plus, FileDown, Copy, Check, RotateCcw, Sprout, Sun, Leaf, Snowflake } from '@lucide/vue'
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
import ChapterNarrative from './ChapterNarrative.vue'
import { formatDistanceKm } from '../model/formatDistanceKm'
import { seasonForMonth } from '@/shared/lib/season'
import { panelAfterChapterToggle, panelAfterToolsToggle } from '../model/chapterPanels'
import { useAuth } from '@/composables/useAuth'

const { t, locale } = useI18n()
const { isAdmin } = useAuth()

const SEASON_ICONS = { spring: Sprout, summer: Sun, autumn: Leaf, winter: Snowflake }
const seasonOf = (date: string) => seasonForMonth(new Date(date).getMonth())

const props = withDefaults(defineProps<{
  tripId: string
  mobile?: boolean
}>(), {
  mobile: false,
})

const emit = defineEmits<{ (e: 'close'): void; (e: 'day-generated', day: TripDay): void }>()

const { trip, days, loading, generating, error, quotaReached, getTrip, getDays, generateDay, redoNarration, getSystemPrompt } = useTrips()
const { activeCharacter, fetchActiveCharacter } = useCharacter()

function getCharacterImage(name: string): string {
  return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
}
const { language } = useLanguage()
const { saveUserSettings } = useUserSettings()
const { setTripDate, resetToRealTime } = useGlobalClimateTime()

const expanded = ref<Record<string, 'narrative' | 'prompt' | 'open' | 'close' | 'system' | null>>({})
// Admin-only: whether a chapter's tab row (Narrativa/Prompt/Open/Close/Sistema + redo) is revealed.
const toolsOpen = ref<Record<string, boolean>>({})
const copied = ref<Record<string, { prompt?: boolean; open?: boolean; close?: boolean; system?: boolean }>>({})
const systemPrompt = ref<string>('')
const copiedAllCodes = ref(false)
const exportingPdf = ref(false)
const showCancelModal = ref(false)
const showDeathModal = ref(false)
const isTripDead = ref(false)
const redoingDay = ref<number | null>(null)

const title = computed(() => trip.value?.name || t('chapter.journeyFallback'))

function syncTripDateToClimate() {
  const lastDay = days.value[days.value.length - 1]
  const dateStr = lastDay?.date || trip.value?.start_date
  if (dateStr) setTripDate(dateStr)
}

const isTripComplete = computed(() => {
  if (isTripDead.value) return true
  if (trip.value?.status === 'dead' || trip.value?.status === 'completed') return true
  if (days.value.length === 0) return false
  const lastDay = days.value[days.value.length - 1]
  return !!lastDay.is_last_day
})

const labels = computed(() => {
  const characterName = activeCharacter.value?.name || t('directions.traveller')
  return {
    adventureText: t('chapter.adventureOf'),
    characterText: characterName,
    chaptersText: t('chapter.chapters'),
    chapterLabel: t('chapter.chapterLabel'),
    distanceLabel: t('chapter.distance'),
    regionsLabel: t('chapter.regions'),
    savePdfBtn: t('chapter.savePdf'),
    savingPdfBtn: t('chapter.savingPdf'),
    generateBtn: t('chapter.generate'),
    generatingBtn: t('chapter.generating'),
    cancelBtn: t('chapter.cancel'),
    closeBtn: t('chapter.close')
  }
})

function toggleChapter(day: TripDay) {
  expanded.value = { ...expanded.value, [day.id]: panelAfterChapterToggle(expanded.value[day.id]) }
}

function toggleTools(day: TripDay) {
  const open = !toolsOpen.value[day.id]
  toolsOpen.value = { ...toolsOpen.value, [day.id]: open }
  expanded.value = { ...expanded.value, [day.id]: panelAfterToolsToggle(expanded.value[day.id], open) }
}

function toggle(day: TripDay, panel: 'narrative' | 'prompt' | 'open' | 'close' | 'system') {
  const current = expanded.value[day.id]
  expanded.value = { ...expanded.value, [day.id]: current === panel ? null : panel }
}

function jsonCopy(payload: unknown) {
  return JSON.stringify(payload ?? null, null, 2)
}

async function copyToClipboard(text: string | null | undefined, dayId: string, type: 'prompt' | 'open' | 'close' | 'system') {
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
    const payload = days.value.map((d) => ({
      day_number: d.day_number,
      open: d.mind_open ?? null,
      close: d.mind_close ?? null,
    }))
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

async function handleRedoNarration(day: TripDay) {
  if (!props.tripId || redoingDay.value !== null) return
  redoingDay.value = day.day_number
  try {
    const updated = await redoNarration(props.tripId, day.day_number, { language: language.value })
    expanded.value = { [updated.id]: 'narrative' }
  } catch {
    /* error surfaced via `error` ref */
  } finally {
    redoingDay.value = null
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

    // Paint parchment background on the current page
    const paintBackground = () => {
      doc.setFillColor(250, 243, 224) // #faf3e0
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
    }

    let y = margin

    // Paint first page background
    paintBackground()

    // Check page break function
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage()
        paintBackground()
        y = margin
        return true
      }
      return false
    }

    // --- Title ---
    doc.setFont('times', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(115, 74, 18) // #734a12 - dark amber
    const titleText = trip.value.name || t('chapter.pdf.title')
    const titleLines = doc.splitTextToSize(titleText, maxLineWidth)
    doc.text(titleLines, margin, y)
    y += (titleLines.length * 32) + 15

    // --- Subtitle / Metadata ---
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(80, 80, 80)
    const totalKm = days.value.reduce((acc, d) => acc + (d.distance_km || 0), 0).toFixed(1)
    const metaText = t('chapter.pdf.subtitleMeta', { adventureText: labels.value.adventureText, totalKm })
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
        const locationText = t('chapter.pdf.lastSeenAt', { location: activeCharacter.value.current_location || '', region: activeCharacter.value.current_region || '' })
        doc.text(locationText, margin, y)
        y += 20
      }
      y += 10
    }

    // --- Chapters ---
    for (const day of days.value) {
      // Add a page for each chapter
      doc.addPage()
      paintBackground()
      y = margin

      // Chapter Title
      doc.setFont('times', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(115, 74, 18)
      doc.text(t('chapter.pdf.chapterHeading', { chapterLabel: labels.value.chapterLabel, n: day.day_number }), margin, y)
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
        doc.text(t('chapter.pdf.noNarrative'), margin, y)
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
  systemPrompt.value = await getSystemPrompt()
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
  <div v-if="!mobile" class="chapter-viewer chapter-pages fixed right-0 top-0 h-full w-1/2 min-w-[28rem] bg-parchment-light flex flex-col z-50">
    <!-- Old-book page edges: a slow wobble along the page, a faster jitter between pages, uneven wear. -->
    <svg width="0" height="0" class="absolute" aria-hidden="true" focusable="false">
      <filter id="chapter-book-edge" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.09 0.012" numOctaves="3" seed="11" result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="wavy" />
        <feTurbulence type="fractalNoise" baseFrequency="0.35 0.025" numOctaves="2" seed="4" result="wear" />
        <feColorMatrix in="wear" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.8 0.6" result="wearAlpha" />
        <feComposite in="wavy" in2="wearAlpha" operator="in" />
      </filter>
    </svg>
    <div class="chapter-pages-edge" aria-hidden="true"></div>
    <header class="px-6 pt-5 shrink-0">
      <div class="chapter-column flex items-center gap-2 pb-3 border-b border-earth-dark/20">
        <img
          v-if="activeCharacter"
          :src="getCharacterImage(activeCharacter.name)"
          :alt="activeCharacter.name"
          class="w-7 h-7 rounded-full object-cover border border-gold"
          :style="{ filter: 'sepia(100%) brightness(0.7) opacity(0.8)' }"
        />
        <h2 class="min-w-0 truncate text-base font-serif font-semibold text-ink-black/90">{{ title }}</h2>
        <button
          class="p-1 rounded-md text-ink-brown/40 hover:text-ink-brown/80 hover:bg-parchment-dark transition-colors"
          :title="copiedAllCodes ? t('chapter.copiedAll') : t('chapter.copyAllCodes')"
          @click="copyAllCodes"
        >
          <component :is="copiedAllCodes ? Check : Copy" class="w-4 h-4" />
        </button>
      </div>
    </header>

    <div class="chapter-scroll flex-1 overflow-y-auto px-6 pb-2">
      <Loader v-if="loading && days.length === 0" variant="inline">
        {{ t('chapter.loadingChapters') }}
      </Loader>

      <p v-if="error" class="text-sm text-destructive bg-parchment-dark border-2 border-destructive rounded-md p-3 font-book">
        {{ error }}
      </p>

      <article
        v-for="(day, dayIndex) in days"
        :key="day.id"
        :id="`chapter-${day.id}`"
        :class="['chapter-column', dayIndex > 0 ? 'border-t border-earth-dark/25' : '']"
      >
        <div class="py-3">
          <div
            class="group flex items-baseline justify-between gap-3 cursor-pointer select-none"
            role="button"
            tabindex="0"
            :aria-expanded="!!expanded[day.id]"
            @click="toggleChapter(day)"
            @keydown.enter.prevent="toggleChapter(day)"
            @keydown.space.prevent="toggleChapter(day)"
          >
            <div class="flex flex-wrap items-baseline gap-x-3 min-w-0">
              <h3 class="font-serif font-semibold text-ink-black/90 group-hover:text-gold-base transition-colors">{{ t('chapter.chapterN', { n: day.day_number }) }}</h3>
              <p class="text-[0.9375rem] text-ink-black/75 font-reading">
            {{ formatDistanceKm(day.distance_km, locale) }} km ·
            {{ (day.regions || []).map((r) => r.name).join(', ') || t('chapter.unknownLands') }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-gold-base" :title="t(`welcome.seasons.${seasonOf(day.date)}.title`)">
                <component :is="SEASON_ICONS[seasonOf(day.date)]" class="w-4 h-4" />
              </span>
              <span class="font-serif text-sm text-ink-brown">{{ new Date(day.date).toLocaleDateString(locale, { month: 'long', day: 'numeric' }) }}</span>
              <button
                v-if="isAdmin && expanded[day.id]"
                class="-mr-1 p-0.5 rounded text-ink-faded hover:text-ink-black/80 transition-colors"
                :title="t('chapter.tools')"
                :aria-expanded="!!toolsOpen[day.id]"
                @click.stop="toggleTools(day)"
              >
                <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="toolsOpen[day.id] ? 'rotate-180' : ''" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="isAdmin && expanded[day.id] && toolsOpen[day.id]" class="flex border-b border-earth-dark/25 text-sm mt-3">
          <button
            class="flex items-center gap-1 pr-4 py-2 font-medium border-b-2 -mb-px transition-colors"
            :class="expanded[day.id] === 'narrative' ? 'text-gold-base border-gold' : 'border-transparent text-ink-brown hover:text-ink-black/90'"
            @click="toggle(day, 'narrative')"
          >
            <component :is="expanded[day.id] === 'narrative' ? ChevronDown : ChevronRight" class="w-4 h-4" />
            {{ t('chapter.tabs.narrative') }}
          </button>
          <div class="ml-auto flex items-center">
            <template v-if="isAdmin">
            <button
              class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
              :class="expanded[day.id] === 'prompt' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
              @click="toggle(day, 'prompt')"
            >
              <component :is="expanded[day.id] === 'prompt' ? ChevronDown : ChevronRight" class="w-4 h-4" />
              {{ t('chapter.tabs.prompt') }}
            </button>
            <button
              class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
              :class="expanded[day.id] === 'open' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
              @click="toggle(day, 'open')"
            >
              <component :is="expanded[day.id] === 'open' ? ChevronDown : ChevronRight" class="w-4 h-4" />
              {{ t('chapter.tabs.open') }}
            </button>
            <button
              class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
              :class="expanded[day.id] === 'close' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
              @click="toggle(day, 'close')"
            >
              <component :is="expanded[day.id] === 'close' ? ChevronDown : ChevronRight" class="w-4 h-4" />
              {{ t('chapter.tabs.close') }}
            </button>
            <button
              class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
              :class="expanded[day.id] === 'system' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
              @click="toggle(day, 'system')"
            >
              <component :is="expanded[day.id] === 'system' ? ChevronDown : ChevronRight" class="w-4 h-4" />
              {{ t('chapter.tabs.system') }}
            </button>
            </template>
            <button
              class="flex items-center px-2 py-2 text-xs border-b-2 border-transparent -mb-px text-ink-faded hover:text-gold-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :title="t('chapter.redo')"
              :disabled="redoingDay !== null"
              @click="handleRedoNarration(day)"
            >
              <Loader v-if="redoingDay === day.day_number" size="sm" variant="inline" class="w-4 h-4" />
              <RotateCcw v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="expanded[day.id] === 'narrative'" class="pt-5 pb-8">
          <ChapterNarrative v-if="day.narrative" :text="day.narrative" />
          <p v-else class="text-sm text-ink-faded italic font-book">{{ t('chapter.noNarrative') }}</p>
        </div>

        <div v-if="expanded[day.id] === 'prompt'" class="px-4 py-4 relative">
          <button
            class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors"
            :title="copied[day.id]?.prompt ? t('chapter.copied') : t('chapter.copyPrompt')"
            @click="copyToClipboard(day.prompt, day.id, 'prompt')"
          >
            <component :is="copied[day.id]?.prompt ? Check : Copy" class="w-4 h-4" />
          </button>
          <pre class="text-xs text-ink-brown whitespace-pre-wrap font-mono bg-parchment-dark rounded-md p-3 border border-earth-dark">{{ day.prompt }}</pre>
        </div>

        <div v-if="expanded[day.id] === 'open'" class="px-4 py-4 relative">
          <button
            v-if="day.mind_open"
            class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors z-10"
            :title="copied[day.id]?.open ? t('chapter.copied') : t('chapter.copyJson')"
            @click="copyToClipboard(jsonCopy(day.mind_open), day.id, 'open')"
          >
            <component :is="copied[day.id]?.open ? Check : Copy" class="w-4 h-4" />
          </button>
          <JsonViewer
            v-if="day.mind_open"
            :value="day.mind_open"
            :expand-depth="1"
            :copyable="false"
            :sort="false"
            theme="dark"
          />
          <p v-else class="text-sm text-ink-faded italic">{{ t('chapter.notAvailable') }}</p>
        </div>

        <div v-if="expanded[day.id] === 'close'" class="px-4 py-4 relative">
          <button
            v-if="day.mind_close"
            class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors z-10"
            :title="copied[day.id]?.close ? t('chapter.copied') : t('chapter.copyJson')"
            @click="copyToClipboard(jsonCopy(day.mind_close), day.id, 'close')"
          >
            <component :is="copied[day.id]?.close ? Check : Copy" class="w-4 h-4" />
          </button>
          <JsonViewer
            v-if="day.mind_close"
            :value="day.mind_close"
            :expand-depth="1"
            :copyable="false"
            :sort="false"
            theme="dark"
          />
          <p v-else class="text-sm text-ink-faded italic">{{ t('chapter.notAvailable') }}</p>
        </div>

        <div v-if="expanded[day.id] === 'system'" class="px-4 py-4 relative">
          <button
            class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors"
            :title="copied[day.id]?.system ? t('chapter.copied') : t('chapter.copySystem')"
            @click="copyToClipboard(systemPrompt, day.id, 'system')"
          >
            <component :is="copied[day.id]?.system ? Check : Copy" class="w-4 h-4" />
          </button>
          <div class="space-y-3 text-xs text-ink-brown">
            <div>
              <h4 class="font-semibold mb-1">{{ t('chapter.systemPrompt') }}</h4>
              <pre class="whitespace-pre-wrap font-mono bg-parchment-dark rounded-md p-3 border border-earth-dark">{{ systemPrompt || t('chapter.notAvailable') }}</pre>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div><span class="font-semibold">{{ t('chapter.provider') }}</span> {{ day.ia_provider ?? '—' }}</div>
              <div><span class="font-semibold">{{ t('chapter.temperature') }}</span> {{ day.temperature ?? '—' }}</div>
              <div><span class="font-semibold">{{ t('chapter.frequencyPenalty') }}</span> {{ day.frequency_penalty ?? '—' }}</div>
              <div><span class="font-semibold">{{ t('chapter.presencePenalty') }}</span> {{ day.presence_penalty ?? '—' }}</div>
              <div><span class="font-semibold">{{ t('chapter.topP') }}</span> {{ day.top_p ?? '—' }}</div>
            </div>
          </div>
        </div>
      </article>

      <p v-if="!loading && days.length === 0 && !error" class="text-sm text-ink-faded italic text-center py-8 font-book">
        {{ t('chapter.noChapters') }}
      </p>
    </div>

    <footer class="px-6 pt-2 pb-5 shrink-0">
      <div class="chapter-column flex items-center justify-between gap-4">
        <button
          class="text-sm text-ink-brown/70 hover:text-destructive underline-offset-4 hover:underline transition-colors"
          @click="isTripComplete ? emit('close') : handleCancelClick()"
        >
          {{ isTripComplete ? labels.closeBtn : labels.cancelBtn }}
        </button>
        <Button
          v-if="isTripComplete"
          variant="secondary"
          size="md"
          class="shadow-none"
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
          class="shadow-none"
          :disabled="generating || quotaReached"
          @click="handleGenerateNext"
        >
          <Loader v-if="generating" size="sm" variant="inline" class="mr-2" />
          <Plus v-else class="w-4 h-4 mr-2" />
          {{ generating ? labels.generatingBtn : labels.generateBtn }}
        </Button>
      </div>
    </footer>
  </div>

  <!-- Mobile: bottom sheet -->
  <BottomSheet v-else :expanded-vh="92" :collapsed-px="200">
    <template #default>
      <div class="flex flex-col h-full">
        <header class="flex items-center justify-between px-4 py-3 border-b border-earth-dark/30 bg-parchment-light shrink-0">
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
              :title="copiedAllCodes ? t('chapter.copiedAll') : t('chapter.copyAllCodes')"
              @click="copyAllCodes"
            >
              <component :is="copiedAllCodes ? Check : Copy" class="w-4 h-4" />
            </button>
          </div>
          <button @click="emit('close')" class="p-1 rounded-md hover:bg-parchment-dark text-ink-brown">
            <ChevronDown class="w-5 h-5" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-4 pb-2">
          <Loader v-if="loading && days.length === 0" variant="inline">
            {{ t('chapter.loadingChapters') }}
          </Loader>

          <p v-if="error" class="text-sm text-destructive bg-parchment-dark border-2 border-destructive rounded-md p-3 font-book">
            {{ error }}
          </p>

          <article
        v-for="(day, dayIndex) in days"
        :key="day.id"
        :id="`chapter-${day.id}`"
        :class="dayIndex > 0 ? 'border-t border-earth-dark/25' : ''"
      >
            <div class="px-4 py-3">
              <div
            class="group flex items-baseline justify-between gap-3 cursor-pointer select-none"
            role="button"
            tabindex="0"
            :aria-expanded="!!expanded[day.id]"
            @click="toggleChapter(day)"
            @keydown.enter.prevent="toggleChapter(day)"
            @keydown.space.prevent="toggleChapter(day)"
          >
                <div class="flex flex-wrap items-baseline gap-x-3 min-w-0">
                  <h3 class="font-serif font-semibold text-ink-black/90 group-hover:text-gold-base transition-colors">{{ t('chapter.chapterN', { n: day.day_number }) }}</h3>
                  <p class="text-[0.9375rem] text-ink-black/75 font-reading">
                {{ formatDistanceKm(day.distance_km, locale) }} km ·
                {{ (day.regions || []).map((r) => r.name).join(', ') || t('chapter.unknownLands') }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-gold-base" :title="t(`welcome.seasons.${seasonOf(day.date)}.title`)">
                    <component :is="SEASON_ICONS[seasonOf(day.date)]" class="w-4 h-4" />
                  </span>
                  <span class="font-serif text-sm text-ink-brown">{{ new Date(day.date).toLocaleDateString(locale, { month: 'long', day: 'numeric' }) }}</span>
                  <button
                    v-if="isAdmin && expanded[day.id]"
                    class="-mr-1 p-0.5 rounded text-ink-faded hover:text-ink-black/80 transition-colors"
                    :title="t('chapter.tools')"
                    :aria-expanded="!!toolsOpen[day.id]"
                    @click.stop="toggleTools(day)"
                  >
                    <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="toolsOpen[day.id] ? 'rotate-180' : ''" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="isAdmin && expanded[day.id] && toolsOpen[day.id]" class="flex border-b border-earth-dark/25 text-sm mt-3 px-2">
              <button
                class="flex items-center gap-1 px-3 py-2 font-medium border-b-2 -mb-px transition-colors"
                :class="expanded[day.id] === 'narrative' ? 'text-gold-base border-gold' : 'border-transparent text-ink-brown hover:text-ink-black/90'"
                @click="toggle(day, 'narrative')"
              >
                <component :is="expanded[day.id] === 'narrative' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                {{ t('chapter.tabs.narrative') }}
              </button>
              <div class="ml-auto flex items-center">
                <template v-if="isAdmin">
                <button
                  class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
                  :class="expanded[day.id] === 'prompt' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
                  @click="toggle(day, 'prompt')"
                >
                  <component :is="expanded[day.id] === 'prompt' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                  {{ t('chapter.tabs.prompt') }}
                </button>
                <button
                  class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
                  :class="expanded[day.id] === 'open' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
                  @click="toggle(day, 'open')"
                >
                  <component :is="expanded[day.id] === 'open' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                  {{ t('chapter.tabs.open') }}
                </button>
                <button
                  class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
                  :class="expanded[day.id] === 'close' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
                  @click="toggle(day, 'close')"
                >
                  <component :is="expanded[day.id] === 'close' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                  {{ t('chapter.tabs.close') }}
                </button>
                <button
                  class="flex items-center gap-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
                  :class="expanded[day.id] === 'system' ? 'text-gold-base border-gold' : 'border-transparent text-ink-faded hover:text-ink-black/90'"
                  @click="toggle(day, 'system')"
                >
                  <component :is="expanded[day.id] === 'system' ? ChevronDown : ChevronRight" class="w-4 h-4" />
                  {{ t('chapter.tabs.system') }}
                </button>
                </template>
                <button
                  class="flex items-center px-2 py-2 text-xs border-b-2 border-transparent -mb-px text-ink-faded hover:text-gold-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :title="t('chapter.redo')"
                  :disabled="redoingDay !== null"
                  @click="handleRedoNarration(day)"
                >
                  <Loader v-if="redoingDay === day.day_number" size="sm" variant="inline" class="w-4 h-4" />
                  <RotateCcw v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-if="expanded[day.id] === 'narrative'" class="px-4 pt-5 pb-8">
              <ChapterNarrative v-if="day.narrative" :text="day.narrative" compact />
              <p v-else class="text-sm text-ink-faded italic font-book">{{ t('chapter.noNarrative') }}</p>
            </div>

            <div v-if="expanded[day.id] === 'prompt'" class="px-4 py-4 relative">
              <button
                class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors"
                :title="copied[day.id]?.prompt ? t('chapter.copied') : t('chapter.copyPrompt')"
                @click="copyToClipboard(day.prompt, day.id, 'prompt')"
              >
                <component :is="copied[day.id]?.prompt ? Check : Copy" class="w-4 h-4" />
              </button>
              <pre class="text-xs text-ink-brown whitespace-pre-wrap font-mono bg-parchment-dark rounded-md p-3 border border-earth-dark">{{ day.prompt }}</pre>
            </div>

            <div v-if="expanded[day.id] === 'open'" class="px-4 py-4 relative">
              <button
                v-if="day.mind_open"
                class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors z-10"
                :title="copied[day.id]?.open ? t('chapter.copied') : t('chapter.copyJson')"
                @click="copyToClipboard(jsonCopy(day.mind_open), day.id, 'open')"
              >
                <component :is="copied[day.id]?.open ? Check : Copy" class="w-4 h-4" />
              </button>
              <JsonViewer
                v-if="day.mind_open"
                :value="day.mind_open"
                :expand-depth="1"
                :copyable="false"
                :sort="false"
                theme="dark"
              />
              <p v-else class="text-sm text-ink-faded italic">{{ t('chapter.notAvailable') }}</p>
            </div>

            <div v-if="expanded[day.id] === 'close'" class="px-4 py-4 relative">
              <button
                v-if="day.mind_close"
                class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors z-10"
                :title="copied[day.id]?.close ? t('chapter.copied') : t('chapter.copyJson')"
                @click="copyToClipboard(jsonCopy(day.mind_close), day.id, 'close')"
              >
                <component :is="copied[day.id]?.close ? Check : Copy" class="w-4 h-4" />
              </button>
              <JsonViewer
                v-if="day.mind_close"
                :value="day.mind_close"
                :expand-depth="1"
                :copyable="false"
                :sort="false"
                theme="dark"
              />
              <p v-else class="text-sm text-ink-faded italic">{{ t('chapter.notAvailable') }}</p>
            </div>

            <div v-if="expanded[day.id] === 'system'" class="px-4 py-4 relative">
              <button
                class="absolute top-5 right-5 p-1.5 rounded-md hover:bg-parchment-base text-ink-brown hover:text-ink-black/90 transition-colors"
                :title="copied[day.id]?.system ? t('chapter.copied') : t('chapter.copySystem')"
                @click="copyToClipboard(systemPrompt, day.id, 'system')"
              >
                <component :is="copied[day.id]?.system ? Check : Copy" class="w-4 h-4" />
              </button>
              <div class="space-y-3 text-xs text-ink-brown">
                <div>
                  <h4 class="font-semibold mb-1">{{ t('chapter.systemPrompt') }}</h4>
                  <pre class="whitespace-pre-wrap font-mono bg-parchment-dark rounded-md p-3 border border-earth-dark">{{ systemPrompt || t('chapter.notAvailable') }}</pre>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div><span class="font-semibold">{{ t('chapter.provider') }}</span> {{ day.ia_provider ?? '—' }}</div>
                  <div><span class="font-semibold">{{ t('chapter.temperature') }}</span> {{ day.temperature ?? '—' }}</div>
                  <div><span class="font-semibold">{{ t('chapter.frequencyPenalty') }}</span> {{ day.frequency_penalty ?? '—' }}</div>
                  <div><span class="font-semibold">{{ t('chapter.presencePenalty') }}</span> {{ day.presence_penalty ?? '—' }}</div>
                  <div><span class="font-semibold">{{ t('chapter.topP') }}</span> {{ day.top_p ?? '—' }}</div>
                </div>
              </div>
            </div>
          </article>

          <p v-if="!loading && days.length === 0 && !error" class="text-sm text-ink-faded italic text-center py-8 font-book">
            {{ t('chapter.noChapters') }}
          </p>
        </div>

        <footer class="px-4 py-3 border-t border-earth-dark/30 bg-parchment-light shrink-0">
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
              :disabled="generating || quotaReached"
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
    :title="t('chapter.cancelModal.title')"
    size="sm"
    @close="showCancelModal = false"
  >
    <p class="text-ink-black/90 font-book">{{ t('chapter.cancelModal.body') }}</p>
    <template #footer>
      <div class="flex gap-3 justify-end">
        <Button variant="outline" size="md" @click="showCancelModal = false">
          {{ t('chapter.cancelModal.keep') }}
        </Button>
        <Button variant="primary" size="md" @click="handleCancelAdventure">
          {{ t('chapter.cancelModal.confirm') }}
        </Button>
      </div>
    </template>
  </Modal>

  <!-- Permadeath Modal -->
  <Modal
    v-if="showDeathModal"
    :open="showDeathModal"
    :title="t('chapter.deathModal.title')"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    @close="showDeathModal = false"
  >
    <div class="text-center space-y-4 py-2">
      <p class="text-4xl">☠</p>
      <i18n-t keypath="chapter.deathModal.fallen" tag="p" class="font-serif text-ink-black/90 text-base leading-relaxed">
        <template #name><strong>{{ activeCharacter?.name || t('chapter.deathModal.fallenFallback') }}</strong></template>
      </i18n-t>
      <p class="font-book text-ink-brown text-sm leading-relaxed">
        {{ t('chapter.deathModal.body') }}
      </p>
    </div>
    <template #footer>
      <div class="flex justify-center">
        <Button variant="primary" size="md" :disabled="exportingPdf" @click="handleDeathConfirm">
          <Loader v-if="exportingPdf" size="sm" variant="inline" class="mr-2" />
          <FileDown v-else class="w-4 h-4 mr-2" />
          {{ exportingPdf ? t('chapter.deathModal.saving') : t('chapter.deathModal.savePdf') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
/* One reading column shared by the header, chapter title, tabs, text and footer. */
.chapter-column {
  width: 100%;
  max-width: 42rem;
  margin-inline: auto;
}
/* The text fades into the footer instead of being cut by a rule. */
.chapter-scroll {
  mask-image: linear-gradient(to bottom, #000 calc(100% - 1.75rem), transparent);
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 1.75rem), transparent);
}

/* The panel is the top page of an open book: the pages beneath peek out on its
   left edge. Each page is a 1px edge plus 2px of paper that darkens with depth;
   an SVG filter (see the template) makes the edges slightly irregular. */
.chapter-pages {
  box-shadow: -28px 0 30px -10px rgb(44 36 22 / 0.35);
}
.chapter-pages-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  right: calc(100% - 3px);
  width: 21px;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(to left,
    var(--bg-parchment-light) 0 3px,
    color-mix(in srgb, var(--text-ink-brown) 55%, transparent) 3px 4px,
    color-mix(in srgb, var(--bg-parchment-light) 93%, #000) 4px 6px,
    color-mix(in srgb, var(--text-ink-brown) 46%, transparent) 6px 7px,
    color-mix(in srgb, var(--bg-parchment-light) 89%, #000) 7px 9px,
    color-mix(in srgb, var(--text-ink-brown) 38%, transparent) 9px 10px,
    color-mix(in srgb, var(--bg-parchment-light) 85%, #000) 10px 12px,
    color-mix(in srgb, var(--text-ink-brown) 30%, transparent) 12px 13px,
    color-mix(in srgb, var(--bg-parchment-light) 81%, #000) 13px 15px,
    color-mix(in srgb, var(--text-ink-brown) 22%, transparent) 15px 16px,
    color-mix(in srgb, var(--bg-parchment-light) 77%, #000) 16px 18px,
    color-mix(in srgb, var(--text-ink-brown) 15%, transparent) 18px 19px,
    color-mix(in srgb, var(--bg-parchment-light) 73%, #000) 19px 21px);
  filter: url(#chapter-book-edge);
}
/* Paper curving into the spine: a soft shade along the inner left edge. */
.chapter-pages::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 2rem;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(to right, rgb(44 36 22 / 0.08), transparent);
}

/* Aged paper: fine grain and large faint blotches over the parchment base,
   a worn tint toward the edges, and a sparse fiber noise laid over the ink. */
.chapter-pages {
  background-image:
    url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20220%20220%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%222%22%20seed%3D%227%22/%3E%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%200.25%20%200%200%200%200%200.19%20%200%200%200%200%200.11%20%200%200%200%200.07%200.03%22/%3E%3C/filter%3E%3Crect%20width%3D%22220%22%20height%3D%22220%22%20filter%3D%22url%28%23n%29%22/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201200%201200%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.008%22%20numOctaves%3D%222%22%20seed%3D%223%22/%3E%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%200.32%20%200%200%200%200%200.22%20%200%200%200%200%200.09%20%200%200%200%200.05%200.0%22/%3E%3C/filter%3E%3Crect%20width%3D%221200%22%20height%3D%221200%22%20filter%3D%22url%28%23n%29%22/%3E%3C/svg%3E"),
    radial-gradient(120% 140% at 50% 40%, transparent 55%, rgb(60 42 20 / 0.07));
  background-size: 220px 220px, 1200px 1200px, 100% 100%;
}
.chapter-pages::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20180%20180%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.75%22%20numOctaves%3D%222%22%20seed%3D%2213%22/%3E%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%200.14%20%200%200%200%200%200.1%20%200%200%200%200%200.05%20%200%200%200%200.12%200.04%22/%3E%3C/filter%3E%3Crect%20width%3D%22180%22%20height%3D%22180%22%20filter%3D%22url%28%23n%29%22/%3E%3C/svg%3E");
  background-size: 180px 180px;
  mix-blend-mode: multiply;
  opacity: 0.55;
}
.dark .chapter-pages {
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201200%201200%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.008%22%20numOctaves%3D%222%22%20seed%3D%223%22/%3E%3CfeColorMatrix%20type%3D%22matrix%22%20values%3D%220%200%200%200%200.32%20%200%200%200%200%200.22%20%200%200%200%200%200.09%20%200%200%200%200.05%200.0%22/%3E%3C/filter%3E%3Crect%20width%3D%221200%22%20height%3D%221200%22%20filter%3D%22url%28%23n%29%22/%3E%3C/svg%3E");
}
.dark .chapter-pages::after {
  opacity: 0.25;
}
</style>
