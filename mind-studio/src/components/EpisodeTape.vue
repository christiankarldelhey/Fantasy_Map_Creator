<script setup lang="ts">
import { computed } from 'vue'
import { moodColor } from '../lib/format'
import type { EpisodeView } from '../types'

const props = defineProps<{
  episodes: EpisodeView[]
  marks: Map<number, { born: number; lost: number; beliefs: number; resonated: number }>
  playing: boolean
}>()

const current = defineModel<number | null>({ required: true })

const emit = defineEmits<{
  play: []
  stop: []
}>()

function toggle() {
  if (props.playing) emit('stop')
  else emit('play')
}

const frames = computed(() =>
  props.episodes
    .filter((e) => e.idx != null)
    .map((e) => ({
      idx: e.idx as number,
      date: e.date,
      mood: e.mood,
      color: moodColor(e.mood),
      marks: props.marks.get(e.idx as number),
    })),
)

/** Drag along the strip to scrub: the frame under the pointer wins. */
function scrub(ev: PointerEvent) {
  if (ev.type === 'pointermove' && ev.buttons !== 1) return
  const el = document
    .elementsFromPoint(ev.clientX, ev.clientY)
    .find((n) => (n as HTMLElement).dataset?.idx)
  const idx = el ? Number((el as HTMLElement).dataset.idx) : NaN
  if (!Number.isNaN(idx)) current.value = idx
}

function onKey(ev: KeyboardEvent) {
  const list = frames.value.map((f) => f.idx)
  const at = list.indexOf(current.value ?? -1)
  if (ev.key === 'ArrowRight' && at < list.length - 1) current.value = list[at + 1]!
  if (ev.key === 'ArrowLeft' && at > 0) current.value = list[at - 1]!
  if (ev.key === ' ') {
    ev.preventDefault()
    toggle()
  }
}
</script>

<template>
  <section class="tape" aria-label="La cinta de episodios">
    <button
      class="transport"
      :aria-label="playing ? 'Pausar' : 'Reproducir la vida'"
      @click="toggle"
    >
      <svg v-if="!playing" viewBox="0 0 20 20"><path d="M6 4 L16 10 L6 16 Z" /></svg>
      <svg v-else viewBox="0 0 20 20"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" /></svg>
    </button>

    <div
      class="strip"
      tabindex="0"
      role="slider"
      :aria-valuenow="current ?? undefined"
      aria-label="Episodio"
      @pointerdown="scrub"
      @pointermove="scrub"
      @keydown="onKey"
    >
      <div
        v-for="f in frames"
        :key="f.idx"
        :data-idx="f.idx"
        :class="['frame', { 'is-current': f.idx === current, 'is-past': current != null && f.idx < current }]"
      >
        <span class="sprockets" aria-hidden="true" />
        <span class="frame-body" :data-idx="f.idx">
          <span class="frame-no" :data-idx="f.idx">{{ f.idx }}</span>
          <span class="frame-mood" :style="{ background: f.color }" :data-idx="f.idx" />
          <span class="frame-marks" :data-idx="f.idx">
            <i v-if="f.marks?.born" class="m-born" :title="`${f.marks.born} recuerdos nacen`">+{{ f.marks.born }}</i>
            <i v-if="f.marks?.lost" class="m-lost" :title="`${f.marks.lost} recuerdos se apagan`">−{{ f.marks.lost }}</i>
            <i v-if="f.marks?.beliefs" class="m-belief" :title="`${f.marks.beliefs} creencias nacen`">✦{{ f.marks.beliefs }}</i>
          </span>
          <span class="frame-date" :data-idx="f.idx">{{ f.date }}</span>
        </span>
        <span class="sprockets" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.tape {
  display: flex;
  align-items: stretch;
  gap: 14px;
  padding: 10px 18px 14px;
}

.transport {
  flex: none;
  width: 46px;
  border: 1px solid var(--chalk-faint);
  background: var(--night-2);
  border-radius: 50%;
  height: 46px;
  align-self: center;
  display: grid;
  place-items: center;
  transition: border-color 0.2s, background 0.2s;
}
.transport:hover { border-color: var(--amber); background: var(--night-3); }
.transport svg { width: 18px; height: 18px; fill: var(--amber); }

.strip {
  flex: 1;
  display: flex;
  overflow-x: auto;
  background: #07090e;
  border-top: 1px solid #000;
  border-bottom: 1px solid #000;
  outline: none;
  cursor: ew-resize;
  touch-action: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}
.strip:focus-visible { box-shadow: inset 0 0 0 1px var(--amber); }

.frame {
  flex: 1 0 92px;
  max-width: 150px;
  display: flex;
  flex-direction: column;
  padding: 0 4px;
  border-right: 2px solid #07090e;
}

.sprockets {
  height: 9px;
  background:
    radial-gradient(circle at 50% 50%, #1d2533 2.2px, transparent 2.6px) 0 0 / 13px 9px repeat-x;
  opacity: 0.9;
}

.frame-body {
  position: relative;
  height: 58px;
  margin: 2px 0;
  background: linear-gradient(180deg, #1a2333, #121a27);
  border-radius: 2px;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
  padding: 6px 8px;
  gap: 2px 8px;
  opacity: 0.55;
  transition: opacity 0.3s, transform 0.3s, box-shadow 0.3s;
}
.frame.is-past .frame-body { opacity: 0.75; }
.frame.is-current .frame-body {
  opacity: 1;
  background: linear-gradient(180deg, #2a2f38, #1b1f27);
  box-shadow: 0 0 0 1px var(--amber), 0 0 24px rgba(255, 189, 89, 0.25);
}

.frame-no {
  font-family: var(--display);
  font-size: 30px;
  line-height: 1;
  color: var(--paper);
}
.frame-mood {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  justify-self: end;
  margin-top: 4px;
  box-shadow: 0 0 10px currentColor;
}
.frame-marks {
  grid-column: 1 / -1;
  display: flex;
  gap: 6px;
  font-style: normal;
  font-size: 10.5px;
}
.frame-marks i { font-style: normal; }
.m-born { color: var(--amber); }
.m-lost { color: var(--chalk-dim); }
.m-belief { color: var(--tangerine); }
.frame-date {
  position: absolute;
  right: 8px;
  bottom: 5px;
  font-size: 9px;
  color: var(--chalk-dim);
  letter-spacing: 0.05em;
}
</style>
