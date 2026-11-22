<script setup lang="ts">
// ============================================================================
// MoodSpace — the valence × arousal circumplex (ADR 0017 · MOOD_DIMS)
// ----------------------------------------------------------------------------
// The mood is a point in this space: x = valence (wellbeing), y =
// arousal (energy) — never a list of emotions. Two fixed things live
// here: the TEMPERAMENT (dashed ring — the nature the mood regresses
// to) and the running MOOD (amber dot — drag it anywhere on the disc
// to set the weather). Selecting a day event draws its stamped pull
// (mood_pull): a dashed line to the word's target and the arrow of how
// far the mood would actually move — (target − mood) × gain.
// ============================================================================
import { computed, shallowRef, useTemplateRef } from 'vue'
import { MOOD_SECTORS, moodWord, pullVec, toPx, toSpace, type MoodPoint } from '../../lib/moodSpace'
import { moodLabel } from '../../lib/labels'
import type { Mood, PerceivedEvent } from '../../types'

const props = defineProps<{
  mood: Mood
  temperament: Record<string, number>
  event?: PerceivedEvent | null
}>()
const emit = defineEmits<{ move: [pos: MoodPoint] }>()

// -- geometry ---------------------------------------------------------------
const SIZE = 360
const C = SIZE / 2
const R = 118
const PX = (p: MoodPoint) => toPx(p, C, R)

// Quadrant tints — the Russell layout: afraid (top-left), excited
// (top-right), relaxed (bottom-right), sad (bottom-left). Blurred so
// the hues bleed into each other like the reference chart.
const QUADRANTS = [
  { x: 0, y: 0, color: '#d8b84e' }, // top-left:    afraid / angry
  { x: 1, y: 0, color: '#57a773' }, // top-right:   alert / excited
  { x: 1, y: 1, color: '#5f8fc9' }, // bottom-right: content / relaxed
  { x: 0, y: 1, color: '#c96a6a' }, // bottom-left:  sad / depressed
]

// Feeling names at each sector's centre angle — the same words the
// engine resolves for a mood point there (MOOD_SECTORS mirrors
// voice.py's wheel).
const REGION_R = 0.72
const REGIONS = MOOD_SECTORS.map((s) => {
  const rad = (s.deg * Math.PI) / 180
  return {
    label: moodLabel(s.word),
    x: Math.cos(rad) * REGION_R,
    y: -Math.sin(rad) * REGION_R,
  }
})

// -- points ------------------------------------------------------------------
const drag = shallowRef<MoodPoint | null>(null)
const moodPos = computed<MoodPoint>(() => drag.value ?? {
  valence: props.mood.valence ?? 0,
  arousal: props.mood.arousal ?? 0,
})
const moodPx = computed(() => PX(moodPos.value))
const tempPos = computed<MoodPoint>(() => ({
  valence: props.temperament?.valence ?? 0,
  arousal: props.temperament?.arousal ?? 0,
}))
const tempPx = computed(() => PX(tempPos.value))

// The selected event's pull — an arrow out of the mood point ending
// where the pull would land it, plus the refracted target it aims at.
const pull = computed(() => {
  const e = props.event
  if (!e) return null
  const v = pullVec(e, moodPos.value)
  if (!v || (!v.dv && !v.da)) return null
  const target = e.mood_pull?.length
    ? e.mood_pull.reduce(
        (acc, p) => (p.gain > acc.gain ? p : acc), e.mood_pull[0]).target
    : null
  return {
    x1: moodPx.value.x, y1: moodPx.value.y,
    x2: moodPx.value.x + v.dv * R, y2: moodPx.value.y - v.da * R,
    target: target ? PX({ valence: target.valence, arousal: target.arousal }) : null,
    word: v.word,
  }
})

const eventTitle = computed(() => {
  const e = props.event
  return e
    ? e.reading ?? e.data?.reading ?? e.data?.description ?? e.data?.name
      ?? e.subject ?? e.type
    : null
})

const dominance = computed(() => props.mood.dominance)
const cause = computed(() => props.mood.cause?.reading ?? null)

// -- drag the mood point ------------------------------------------------------
const svg = useTemplateRef<SVGSVGElement>('svg')
const dragging = shallowRef(false)

function pointFromEvent(e: PointerEvent): MoodPoint {
  const rect = svg.value!.getBoundingClientRect()
  return toSpace(
    ((e.clientX - rect.left) / rect.width) * SIZE,
    ((e.clientY - rect.top) / rect.height) * SIZE,
    C, R,
  )
}

function onDown(e: PointerEvent) {
  dragging.value = true
  svg.value?.setPointerCapture(e.pointerId)
  drag.value = pointFromEvent(e)
}
function onMove(e: PointerEvent) {
  if (dragging.value) drag.value = pointFromEvent(e)
}
function onUp() {
  if (!dragging.value) return
  dragging.value = false
  if (drag.value) emit('move', {
    valence: Math.round(drag.value.valence * 1000) / 1000,
    arousal: Math.round(drag.value.arousal * 1000) / 1000,
  })
  drag.value = null
}

const signed = (v?: number) => `${(v ?? 0) > 0 ? '+' : ''}${(v ?? 0).toFixed(2)}`
</script>

<template>
  <div class="space">
    <svg
      ref="svg"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      class="svg"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <defs>
        <clipPath id="disc"><circle :cx="C" :cy="C" :r="R" /></clipPath>
        <filter id="soft"><feGaussianBlur stdDeviation="26" /></filter>
        <radialGradient id="fade" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stop-color="#161c25" stop-opacity="0" />
          <stop offset="100%" stop-color="#161c25" stop-opacity="0.55" />
        </radialGradient>
        <marker
          id="arrowPush" markerWidth="8" markerHeight="8"
          refX="6" refY="4" orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="#7dd87d" />
        </marker>
      </defs>

      <!-- the feeling disc: 4 tinted quadrants, blurred into a wash -->
      <g clip-path="url(#disc)">
        <g filter="url(#soft)">
          <rect
            v-for="(q, i) in QUADRANTS" :key="i"
            :x="q.x ? C : C - R" :y="q.y ? C : C - R"
            :width="R" :height="R"
            :fill="q.color" opacity="0.55"
          />
        </g>
        <circle :cx="C" :cy="C" :r="R" fill="url(#fade)" />
      </g>
      <circle :cx="C" :cy="C" :r="R" class="ring" />
      <circle :cx="C" :cy="C" :r="R * 0.5" class="ring inner" />

      <!-- feeling names -->
      <text
        v-for="r in REGIONS" :key="r.label"
        :x="C + r.x * R" :y="C + r.y * R"
        class="region"
      >{{ r.label }}</text>

      <!-- axes -->
      <line :x1="C" :y1="C - R - 22" :x2="C" :y2="C + R + 22" class="axis" />
      <line :x1="C - R - 22" :y1="C" :x2="C + R + 22" :y2="C" class="axis" />
      <text :x="C" :y="C - R - 28" class="axis-label" text-anchor="middle">Agitación (+)</text>
      <text :x="C" :y="C + R + 38" class="axis-label" text-anchor="middle">Agitación (−)</text>
      <text :x="C - R - 28" :y="C" class="axis-label" text-anchor="middle" :transform="`rotate(-90 ${C - R - 28} ${C})`">Valencia (−)</text>
      <text :x="C + R + 28" :y="C" class="axis-label" text-anchor="middle" :transform="`rotate(90 ${C + R + 28} ${C})`">Valencia (+)</text>

      <!-- neutral core — the engine names this ring 'steady' -->
      <circle :cx="C" :cy="C" r="26" class="core" />
      <text :x="C" :y="C + 4" class="core-label">Tranquilo</text>

      <!-- selected event's pull: dashed aim at the refracted target,
           solid arrow the distance the mood would actually travel -->
      <template v-if="pull">
        <line
          v-if="pull.target"
          :x1="pull.x1" :y1="pull.y1"
          :x2="pull.target.x" :y2="pull.target.y"
          class="aim"
        />
        <line
          :x1="pull.x1" :y1="pull.y1"
          :x2="pull.x2" :y2="pull.y2"
          class="push" marker-end="url(#arrowPush)"
        />
        <circle
          v-if="pull.target"
          :cx="pull.target.x" :cy="pull.target.y" r="4"
          class="target"
        />
      </template>

      <!-- temperament: the fixed nature the mood regresses to -->
      <circle :cx="tempPx.x" :cy="tempPx.y" r="7" class="temperament" />
      <text :x="tempPx.x + 11" :y="tempPx.y - 6" class="pt-label temp">naturaleza</text>

      <!-- mood: the running weather — drag anywhere on the disc -->
      <circle :cx="moodPx.x" :cy="moodPx.y" r="14" class="halo" />
      <circle :cx="moodPx.x" :cy="moodPx.y" r="6" class="mood" />
      <text :x="moodPx.x + 11" :y="moodPx.y + 14" class="pt-label">
        {{ moodLabel(moodWord(mood)) }}
      </text>
    </svg>

    <div class="readout">
      <span>ánimo <b>{{ moodLabel(moodWord(mood)) }}</b></span>
      <span class="mono">valencia {{ signed(mood.valence) }}</span>
      <span class="mono">agitación {{ signed(mood.arousal) }}</span>
      <span v-if="dominance != null" class="mono">dominancia {{ signed(dominance) }}</span>
    </div>
    <p v-if="cause" class="cause">«{{ cause }}»</p>
    <p v-if="event && eventTitle" class="event-note">
      <span class="badge">{{ event.type }}</span> {{ eventTitle }}
      <template v-if="pull?.word"> — tira a «{{ moodLabel(pull.word) }}»</template>
      <template v-else-if="!pull"> — sin tirón sobre el ánimo</template>
    </p>
    <p class="hint muted">
      Punto ámbar: el ánimo ahora (arrastrá para moverlo). Anillo azul:
      la naturaleza, fija. El punto verde es adónde tira el evento
      elegido; la flecha, cuánto llega a mover.
    </p>
  </div>
</template>

<style scoped>
.space { display: grid; gap: 8px; justify-items: center; }
.svg { width: 100%; max-width: 360px; cursor: crosshair; touch-action: none; user-select: none; }

.ring { fill: none; stroke: var(--border-strong); stroke-width: 1.2; }
.ring.inner { stroke: var(--border); stroke-dasharray: 3 5; opacity: 0.7; }
.axis { stroke: var(--text-faint); stroke-width: 1; }
.axis-label { fill: var(--text-faint); font-size: 10px; }
.region { fill: var(--text); font-size: 10.5px; text-anchor: middle; opacity: 0.75; pointer-events: none; }
.core { fill: var(--surface-2); stroke: var(--border-strong); }
.core-label { fill: var(--text-dim); font-size: 10px; text-anchor: middle; pointer-events: none; }

.push { stroke: #7dd87d; stroke-width: 1.8; }
.aim { stroke: #7dd87d; stroke-width: 1; stroke-dasharray: 3 4; opacity: 0.6; }
.target { fill: #7dd87d; opacity: 0.85; }

.temperament { fill: none; stroke: var(--positive); stroke-width: 1.6; stroke-dasharray: 4 3; }
.pt-label { fill: var(--accent); font-size: 10px; font-family: var(--mono); pointer-events: none; }
.pt-label.temp { fill: var(--positive); }
.halo { fill: var(--accent); opacity: 0.18; }
.mood { fill: var(--accent); stroke: var(--bg); stroke-width: 1.5; }

.readout { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: var(--text-dim); }
.mono { font-family: var(--mono); }
.cause { margin: 0; font-family: var(--serif); font-style: italic; color: var(--text-dim); }
.event-note { margin: 0; font-size: 12.5px; }
.hint { margin: 0; font-size: 12px; max-width: 380px; text-align: center; }
</style>
