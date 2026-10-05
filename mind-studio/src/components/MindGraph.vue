<script setup lang="ts">
import { computed } from 'vue'
import { VIEW, cable, type Point } from '../lib/layout'
import type { BeliefAt, MemoryAt, MindAt } from '../lib/mindAt'
import type { NodeRef } from './nodeRef'
import type { Spotlight } from './tour'

const props = defineProps<{
  snapshot: MindAt
  positions: Map<string, Point>
  focus: NodeRef | null
  spotlight: Spotlight | null
}>()

const emit = defineEmits<{
  focus: [ref: NodeRef | null]
  pick: [ref: NodeRef]
}>()

const PORT: Point = { x: VIEW.w - 18, y: VIEW.cy }
const NEED_Y = VIEW.h - 70

const at = (id: string): Point => props.positions.get(id) ?? { x: VIEW.cx, y: VIEW.cy }

const memoryById = computed(
  () => new Map(props.snapshot.memories.map((m) => [m.id, m])),
)

const threads = computed(() =>
  props.snapshot.beliefs.flatMap((b) =>
    b.evidence
      .map((id) => memoryById.value.get(id))
      .filter((m): m is MemoryAt => !!m)
      .map((m) => ({
        id: `${b.id}:${m.id}`,
        d: cable(at(b.id), at(m.id), 0.12),
        lost: m.phase === 'trace' || m.phase === 'fading',
        lit: isFocused('belief', b.id) || isFocused('memory', m.id),
      })),
  ),
)

const needs = computed(() => {
  const list = props.snapshot.needs
  const span = Math.min(420, 150 * list.length)
  return list.map((n, i) => {
    const x = VIEW.cx - span / 2 + (list.length > 1 ? (i * span) / (list.length - 1) : span / 2)
    const mem = props.snapshot.memories.find((m) => m.tags.includes(`need:${n.key}`))
    const from = mem ? at(mem.id) : { x, y: VIEW.cy + 120 }
    return {
      ...n,
      x,
      mem,
      string: `M${from.x},${from.y} C${from.x},${(from.y + NEED_Y) / 2} ${x},${NEED_Y - 60} ${x},${NEED_Y - 14}`,
      // A heavier need hangs lower and bigger.
      size: 12 + n.urgency * 14,
    }
  })
})

const resonance = computed(() => [
  ...props.snapshot.memories
    .filter((m) => m.voicedNow)
    .map((m) => ({ id: m.id, d: cable(at(m.id), PORT, 0.05) })),
  ...props.snapshot.beliefs
    .filter((b) => b.resonatedNow)
    .map((b) => ({ id: b.id, d: cable(at(b.id), PORT, 0.05) })),
])

function isFocused(kind: NodeRef['kind'], id: string) {
  return props.focus?.kind === kind && props.focus.id === id
}

function bulbRadius(m: MemoryAt) {
  return 4 + Math.sqrt(m.importance) * 9
}

function memoryClass(m: MemoryAt) {
  return [
    'memory', `is-${m.phase}`,
    {
      'is-pattern': m.kind === 'pattern',
      'is-fixed': m.consolidated,
      'is-evoked': m.evokedNow,
      'is-focus': isFocused('memory', m.id),
      'is-cold': m.valence < -0.15,
      'is-warm': m.valence > 0.15,
    },
  ]
}

function beliefClass(b: BeliefAt) {
  return [
    'belief', `is-${b.origin}`,
    {
      'is-newborn': b.newborn,
      'is-lens': b.inLens,
      'is-quiet': b.status !== 'active',
      'is-focus': isFocused('belief', b.id),
    },
  ]
}

function shortLabel(text: string, words = 5) {
  const parts = text.split(/\s+/)
  return parts.length > words ? `${parts.slice(0, words).join(' ')}…` : text
}

const focusLabel = computed(() => {
  const f = props.focus
  if (!f) return null
  if (f.kind === 'memory') {
    const m = memoryById.value.get(f.id)
    return m ? { p: at(m.id), text: m.desc } : null
  }
  if (f.kind === 'belief') {
    const b = props.snapshot.beliefs.find((x) => x.id === f.id)
    return b ? { p: at(b.id), text: b.statement } : null
  }
  const n = needs.value.find((x) => x.id === f.id || x.key === f.id)
  return n ? { p: { x: n.x, y: NEED_Y }, text: n.description } : null
})

const labelLines = computed(() => {
  const text = focusLabel.value?.text ?? ''
  const lines: string[] = []
  let line = ''
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > 38) {
      lines.push(line.trim())
      line = w
      if (lines.length === 4) break
    } else line += ' ' + w
  }
  if (lines.length < 4 && line.trim()) lines.push(line.trim())
  else if (lines.length === 4) lines[3] += '…'
  return lines
})

const labelBox = computed(() => {
  const p = focusLabel.value?.p
  if (!p) return null
  const w = 268
  const h = 14 + labelLines.value.length * 15
  const x = Math.min(VIEW.w - w - 10, Math.max(10, p.x + 16))
  const y = Math.min(VIEW.h - h - 10, Math.max(10, p.y - h - 12))
  return { x, y, w, h }
})

function focusOn(ref: NodeRef | null) {
  emit('focus', ref)
}
</script>

<template>
  <svg
    :class="['graph', spotlight && `spot-${spotlight}`]"
    :viewBox="`0 0 ${VIEW.w} ${VIEW.h}`"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="El cableado de la mente"
    @mouseleave="focusOn(null)"
  >
    <defs>
      <filter id="wobble" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="3.2" />
      </filter>
      <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <radialGradient id="bulb">
        <stop offset="0%" stop-color="var(--amber-hot)" />
        <stop offset="45%" stop-color="var(--amber)" />
        <stop offset="100%" stop-color="var(--tangerine)" stop-opacity="0.15" />
      </radialGradient>
    </defs>

    <!-- The chalk guide the past coils along. -->
    <g class="guides" filter="url(#wobble)">
      <ellipse :cx="VIEW.cx" :cy="VIEW.cy" rx="150" ry="120" />
      <ellipse :cx="VIEW.cx" :cy="VIEW.cy" rx="300" ry="170" />
      <ellipse :cx="VIEW.cx" :cy="VIEW.cy" rx="440" ry="235" />
    </g>

    <!-- Evidence: the threads a belief hangs from. -->
    <g class="threads" filter="url(#wobble)">
      <path
        v-for="t in threads"
        :key="t.id"
        :d="t.d"
        :class="['thread', { 'is-lost': t.lost, 'is-lit': t.lit }]"
      />
    </g>

    <!-- What resonated in the prose runs out to the narration. -->
    <g class="resonance">
      <path v-for="r in resonance" :key="r.id" :d="r.d" class="resonance-wire" />
      <g :transform="`translate(${PORT.x},${PORT.y})`" class="port">
        <circle r="7" />
        <text x="6" y="-16" text-anchor="end">a la narración</text>
      </g>
    </g>

    <!-- Needs: weights on a string, pulling the mind down. -->
    <g class="needs">
      <g
        v-for="n in needs"
        :key="n.key"
        :class="['need', { 'is-focus': isFocused('need', n.id ?? n.key) }]"
        @mouseenter="focusOn({ kind: 'need', id: n.id ?? n.key })"
        @click="emit('pick', { kind: 'need', id: n.id ?? n.key })"
      >
        <path :d="n.string" class="need-string" filter="url(#wobble)" />
        <g :transform="`translate(${n.x},${NEED_Y})`">
          <path
            class="need-weight"
            :d="`M${-n.size * 0.6},${-n.size * 0.5} L${n.size * 0.6},${-n.size * 0.5} L${n.size},${n.size * 0.6} L${-n.size},${n.size * 0.6} Z`"
          />
          <text class="need-key" y="4" text-anchor="middle">{{ n.key }}</text>
          <text class="need-urgency" :y="n.size * 0.6 + 16" text-anchor="middle">
            {{ Math.round(n.urgency * 100) }}
          </text>
        </g>
      </g>
    </g>

    <!-- Memories: bulbs on the spiral. -->
    <g class="memories">
      <g
        v-for="m in snapshot.memories"
        :key="m.id"
        :class="memoryClass(m)"
        :transform="`translate(${at(m.id).x},${at(m.id).y})`"
        @mouseenter="focusOn({ kind: 'memory', id: m.id })"
        @click="emit('pick', { kind: 'memory', id: m.id })"
      >
        <circle
          v-if="m.phase !== 'trace'"
          class="halo"
          :r="bulbRadius(m) * 2.2"
          :style="{ opacity: 0.12 + m.strengthAt * 0.55 }"
          filter="url(#glow)"
        />
        <circle
          class="glass"
          :r="bulbRadius(m)"
          :style="{ fillOpacity: m.phase === 'trace' ? 0 : 0.18 + m.strengthAt * 0.82 }"
        />
        <circle v-if="m.kind === 'pattern'" class="loop" :r="bulbRadius(m) + 5" />
        <circle v-if="m.evokedNow" class="evoked-ring" :r="bulbRadius(m) + 4" />
        <circle class="hit" :r="Math.max(12, bulbRadius(m) + 4)" />
      </g>
    </g>

    <!-- Beliefs: the lamps at the centre. -->
    <g class="beliefs">
      <g
        v-for="b in snapshot.beliefs"
        :key="b.id"
        :class="beliefClass(b)"
        :transform="`translate(${at(b.id).x},${at(b.id).y})`"
        @mouseenter="focusOn({ kind: 'belief', id: b.id })"
        @click="emit('pick', { kind: 'belief', id: b.id })"
      >
        <circle class="lamp-halo" :r="26 + b.confidence * 10" filter="url(#glow)" />
        <rect class="lamp" x="-15" y="-15" width="30" height="30" rx="7" />
        <path class="filament" d="M-7,4 L-3,-5 L0,3 L3,-5 L7,4" />
        <text class="belief-label" y="32" text-anchor="middle">
          {{ shortLabel(b.statement, 4) }}
        </text>
        <circle class="hit" r="22" />
      </g>
    </g>

    <!-- The note pinned to whatever is in focus. -->
    <g v-if="labelBox" class="pinned" pointer-events="none">
      <rect
        :x="labelBox.x"
        :y="labelBox.y"
        :width="labelBox.w"
        :height="labelBox.h"
        class="pinned-paper"
      />
      <text :x="labelBox.x + 10" :y="labelBox.y + 18" class="pinned-text">
        <tspan
          v-for="(line, i) in labelLines"
          :key="i"
          :x="labelBox.x + 10"
          :dy="i === 0 ? 0 : 15"
        >{{ line }}</tspan>
      </text>
    </g>
  </svg>
</template>

<style scoped>
.graph {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
}

.guides ellipse {
  fill: none;
  stroke: var(--chalk-faint);
  stroke-width: 0.8;
  stroke-dasharray: 2 7;
  opacity: 0.6;
}

.thread {
  fill: none;
  stroke: var(--chalk-dim);
  stroke-width: 1;
  opacity: 0.55;
  transition: opacity 0.6s, stroke 0.3s;
}
.thread.is-lost { stroke-dasharray: 3 5; opacity: 0.25; }
.thread.is-lit { stroke: var(--paper); opacity: 1; stroke-width: 1.4; }

.resonance-wire {
  fill: none;
  stroke: var(--amber);
  stroke-width: 1.3;
  stroke-dasharray: 5 6;
  opacity: 0.85;
  animation: current 1.4s linear infinite;
}
@keyframes current { to { stroke-dashoffset: -22; } }

.port circle { fill: var(--night); stroke: var(--amber); stroke-width: 1.5; }
.port text {
  font-family: var(--type);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  fill: var(--amber);
}

/* --- memories ------------------------------------------------------- */
.memory { cursor: pointer; transition: opacity 0.8s; }
.memory .halo { fill: var(--amber); transition: opacity 0.8s; }
.memory .glass {
  fill: url(#bulb);
  stroke: var(--amber);
  stroke-width: 0.8;
  transition: fill-opacity 0.8s, r 0.4s;
}
.memory.is-cold .glass { stroke: var(--ruin); }
.memory.is-warm .glass { stroke: var(--tangerine); }
.memory.is-fixed .glass { stroke-width: 2; }
.memory .loop { fill: none; stroke: var(--amber); stroke-width: 0.8; stroke-dasharray: 1 3; }
.memory .hit { fill: transparent; }

.memory.is-newborn { animation: born 1.2s ease-out both; }
@keyframes born {
  from { opacity: 0; transform-box: fill-box; }
  to { opacity: 1; }
}
.memory.is-newborn .glass { stroke: var(--paper); stroke-width: 1.6; }

.memory.is-fading { animation: flicker 2.4s steps(1) both; }
@keyframes flicker {
  0%, 12%, 20%, 34% { opacity: 1; }
  8%, 16%, 28%, 44% { opacity: 0.25; }
  60%, 100% { opacity: 0.3; }
}

.memory.is-trace .glass {
  fill: none;
  stroke: var(--chalk-faint);
  stroke-dasharray: 2 3;
  stroke-width: 1;
}

.memory .evoked-ring {
  fill: none;
  stroke: var(--ruin);
  stroke-width: 1.5;
  animation: pulse 2s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(1.35); }
}

.memory.is-focus .glass { stroke: var(--paper); stroke-width: 2.2; }

/* --- beliefs -------------------------------------------------------- */
.belief { cursor: pointer; }
.belief .lamp-halo { fill: var(--paper); opacity: 0.08; transition: opacity 0.6s; }
.belief .lamp {
  fill: var(--night-3);
  stroke: var(--paper);
  stroke-width: 1.4;
}
.belief.is-reflected .lamp { stroke: var(--tangerine); }
.belief .filament {
  fill: none;
  stroke: var(--chalk-dim);
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.belief.is-lens .filament { stroke: var(--amber-hot); }
.belief.is-lens .lamp-halo { fill: var(--amber); opacity: 0.32; }
.belief.is-quiet { opacity: 0.4; }
.belief.is-newborn .lamp { animation: ignite 1.6s ease-out both; }
@keyframes ignite {
  0% { stroke-opacity: 0; }
  30% { stroke-opacity: 1; stroke-width: 4; }
  100% { stroke-width: 1.4; }
}
.belief.is-focus .lamp { stroke-width: 2.4; }
.belief .hit { fill: transparent; }

.belief-label {
  font-family: var(--display);
  font-style: italic;
  font-size: 12.5px;
  fill: var(--chalk-dim);
}
.belief.is-lens .belief-label { fill: var(--paper); }

/* --- needs ---------------------------------------------------------- */
.need { cursor: pointer; }
.need-string { fill: none; stroke: var(--chalk-dim); stroke-width: 0.9; opacity: 0.6; }
.need-weight {
  fill: var(--night-3);
  stroke: var(--rose);
  stroke-width: 1.4;
  animation: sway 5s ease-in-out infinite;
  transform-origin: 0 -20px;
}
@keyframes sway {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}
.need-key {
  font-family: var(--type);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  fill: var(--paper);
}
.need-urgency { font-family: var(--type); font-size: 9px; fill: var(--rose); }
.need.is-focus .need-weight { stroke-width: 2.4; }

/* --- tour spotlights: dim everything but the part being explained --- */
.graph > g { transition: opacity 0.5s; }
.spot-memories > g:not(.memories),
.spot-traces > g:not(.memories),
.spot-beliefs > g:not(.beliefs):not(.threads),
.spot-resonance > g:not(.resonance):not(.memories):not(.beliefs) { opacity: 0.12; }
.spot-traces .memory:not(.is-trace):not(.is-fading) { opacity: 0.15; }
.spot-resonance .memory:not(.is-evoked),
.spot-resonance .belief:not(.is-lens) { opacity: 0.2; }
.spot-traces .memory.is-trace .glass { stroke: var(--chalk); }

/* --- pinned note ---------------------------------------------------- */
.pinned-paper {
  fill: var(--paper);
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
}
.pinned-text {
  font-family: var(--type);
  font-size: 11.5px;
  fill: var(--paper-ink);
}
</style>
