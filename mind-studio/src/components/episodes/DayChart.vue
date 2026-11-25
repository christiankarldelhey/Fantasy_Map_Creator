<script setup lang="ts">
// ============================================================================
// DayChart — the episode's numbers over the day
// ----------------------------------------------------------------------------
// X is the hour of day; every perceived event is a dot on the timeline
// (hover/click shows it). Each numeric metric the episode carries is a
// line — body (energy/shadow), mood (valence/world valence), and the
// rest (salience, severity, felt dims). Lines interpolate between the
// event points where they were measured, so a drop reads as a slope
// rather than a cliff. Series toggle by group in the legend.
// ============================================================================
import { computed, reactive } from 'vue'
import { t } from '../../lib/i18n'
import { label, moodLabel, PHASES } from '../../lib/labels'
import { resolveMoodName, unPull, type MoodPoint } from '../../lib/moodSpace'
import type { EpisodeMood, PerceivedEvent } from '../../types'

const props = defineProps<{
  episode: { perceived: PerceivedEvent[]; mood: EpisodeMood }
  selectedEvent?: PerceivedEvent | null
}>()
const emit = defineEmits<{ select: [e: PerceivedEvent | null] }>()

// Phase → its hour window, for events that carry a phase but no exact
// hour: they spread inside the window so stacked events stay visible
// instead of collapsing into a single dot.
const PHASE_SPAN: Record<string, [number, number]> = {
  dawn: [5, 7], morning: [7, 12], midday: [11, 13], afternoon: [13, 17],
  evening: [17, 20], before_sleep: [20, 22], night: [22, 24],
  mid_night: [0, 3],
}
// Midpoint of each phase's window — the mood arc anchors here.
const PHASE_HOUR = Object.fromEntries(
  Object.entries(PHASE_SPAN).map(([k, [a, b]]) => [k, (a + b) / 2]),
)

const hours = computed<number[]>(() => {
  const evs = props.episode.perceived
  // Group untimed events by phase so each spreads across its window.
  const buckets = new Map<string, number[]>()
  evs.forEach((e, i) => {
    if (typeof e.when?.hour === 'number') return
    const ph = e.when?.phase ?? ''
    if (!buckets.has(ph)) buckets.set(ph, [])
    buckets.get(ph)!.push(i)
  })
  const out = new Array<number>(evs.length)
  evs.forEach((e, i) => {
    if (typeof e.when?.hour === 'number') { out[i] = e.when.hour; return }
    const [a, b] = PHASE_SPAN[e.when?.phase ?? ''] ?? [6, 22]
    const idx = buckets.get(e.when?.phase ?? '')!
    const n = idx.length
    // Spread inside the window, first event a bit in, last a bit out.
    out[i] = n === 1 ? (a + b) / 2 : a + 0.6 + (idx.indexOf(i) / (n - 1)) * (b - a - 1.2)
  })
  return out
})

const hourOf = (_e: PerceivedEvent, i: number) => hours.value[i]

// -- series -------------------------------------------------------------
// Only the Mood series draw: what each event felt like (valence), what
// the world objectively meant (world valence), and the day's own arc
// per phase. Each point keeps its event so hovering a peak can name it.
interface Pt { h: number; v: number; e?: PerceivedEvent }
interface Series { key: string; group: string; label: string; color: string; points: Pt[] }

const GROUPS = ['mood'] as const
const GROUP_COLOR: Record<string, string> = { mood: '#7c9ee0' }

const series = computed<Series[]>(() => {
  const out: Series[] = []
  const evs = props.episode.perceived
  const pts = (pick: (e: PerceivedEvent) => number | null): Pt[] =>
    evs.map((e, i) => ({ h: hourOf(e, i), v: pick(e), e }))
      .filter((p): p is { h: number; v: number; e: PerceivedEvent } => p.v != null)
      .sort((a, b) => a.h - b.h)

  const push = (key: string, color: string, points: Pt[]) => {
    if (points.length) {
      out.push({ key, group: 'mood', label: t(`dc.s.${key}`), color, points })
    }
  }

  // Mood — what each moment felt like, plus the day's arc as anchors.
  push('valence', '#7c9ee0', pts((e) => e.valence ?? null))
  push('world_valence', '#b9c8e8', pts((e) => e.world_valence ?? null))
  const arcPts = (props.episode.mood?.arc ?? [])
    .map((a) => ({ h: PHASE_HOUR[a.phase] ?? 12, v: a.valence }))
  push('mood_arc', '#3f66b8', arcPts)
  return out
})

// -- toggles --------------------------------------------------------------
const enabled = reactive<Record<string, boolean>>({})
const defaultOn = (_s: Series) => true
const isOn = (s: Series) => enabled[s.key] ?? defaultOn(s)
const active = computed(() => series.value.filter(isOn))
const groups = computed(() =>
  GROUPS.map((g) => ({
    key: g,
    label: t(`dc.g.${g}`),
    color: GROUP_COLOR[g],
    series: series.value.filter((s) => s.group === g),
  })).filter((g) => g.series.length),
)
function toggleGroup(g: string, on: boolean) {
  for (const s of series.value) if (s.group === g) enabled[s.key] = on
}

// -- geometry ---------------------------------------------------------------
const W = 760
const H = 300
const PAD = { t: 14, r: 14, b: 26, l: 36 }
const X = (h: number) => PAD.l + (h / 24) * (W - PAD.l - PAD.r)

// Each series owns its full height — units differ wildly (energy ~50 vs
// valence ~1), so values normalise to the plot and the legend carries
// the real min–max. The popup always shows raw numbers.
function spanOf(s: Series): [number, number] {
  const vals = s.points.map((p) => p.v)
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (hi - lo < 0.05) { hi = lo + 0.05 }
  return [lo, hi]
}
const Y = (s: Series, v: number) => {
  const [lo, hi] = spanOf(s)
  return PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
}
const path = (s: Series) =>
  s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.h).toFixed(1)},${Y(s, p.v).toFixed(1)}`).join(' ')
const range = (s: Series) => {
  const [lo, hi] = spanOf(s)
  return `${lo.toFixed(2)}…${hi.toFixed(2)}`
}

const ticks = [0, 6, 12, 18, 24]

// -- event dots + popup -----------------------------------------------------
const markers = computed(() =>
  props.episode.perceived.map((e, i) => ({ e, h: hourOf(e, i), i })),
)
// The popup centres on the event, clamped so it never spills outside
// the plot — ancestors clip overflow-x, an off-edge popup gets cut.
const POP_HALF = 170
const selected = computed(() => {
  const e = props.selectedEvent ?? null
  if (!e) return null
  const i = props.episode.perceived.indexOf(e)
  if (i < 0) return null
  const raw = X(hours.value[i])
  return { e, i, x: Math.min(Math.max(raw, POP_HALF), W - POP_HALF) }
})
// The mood each event left the day in: the episode's final mood walked
// backward through every pull (pullVec read in reverse), so a hovered
// point names the feeling it ended with — not a raw number.
const afterPos = computed<MoodPoint[]>(() => {
  const evs = props.episode.perceived
  const out = new Array<MoodPoint>(evs.length)
  let pos: MoodPoint = {
    valence: props.episode.mood?.valence ?? 0,
    arousal: props.episode.mood?.arousal ?? 0,
  }
  for (let i = evs.length - 1; i >= 0; i--) {
    out[i] = pos
    pos = unPull(evs[i], pos)
  }
  return out
})
const wordAfter = computed(() => {
  const sel = selected.value
  if (!sel) return null
  const p = afterPos.value[sel.i]
  return resolveMoodName(p.valence, p.arousal)
})
const wordBefore = computed(() => {
  const sel = selected.value
  if (!sel) return null
  const p = unPull(props.episode.perceived[sel.i], afterPos.value[sel.i])
  return resolveMoodName(p.valence, p.arousal)
})
function pick(m: { e: PerceivedEvent }) {
  emit('select', m.e)
}
const titleOf = (e: PerceivedEvent) =>
  e.reading ?? e.data?.reading ?? e.data?.description ?? e.data?.name
  ?? e.data?.record ?? e.subject ?? e.type
</script>

<template>
  <div class="chart">
    <div class="legend">
      <div v-for="g in groups" :key="g.key" class="legend-group">
        <label class="group-toggle" :style="{ color: g.color }">
          <input
            type="checkbox"
            :checked="g.series.every(isOn)"
            :indeterminate="g.series.some(isOn) && !g.series.every(isOn)"
            @change="toggleGroup(g.key, ($event.target as HTMLInputElement).checked)"
          />
          <strong>{{ g.label }}</strong>
        </label>
        <label v-for="s in g.series" :key="s.key" class="series-toggle">
          <input
            type="checkbox"
            :checked="isOn(s)"
            @change="enabled[s.key] = ($event.target as HTMLInputElement).checked"
          />
          <span class="swatch" :style="{ background: s.color }" />
          {{ s.label }} <span class="range mono">{{ range(s) }}</span>
        </label>
      </div>
    </div>

    <div class="plot">
      <svg :viewBox="`0 0 ${W} ${H}`" class="svg" @click.self="emit('select', null)">
        <!-- hour ticks -->
        <g v-for="t in ticks" :key="t">
          <line :x1="X(t)" :x2="X(t)" :y1="PAD.t" :y2="H - PAD.b" class="grid" />
          <text :x="X(t)" :y="H - 8" class="tick">{{ t }}h</text>
        </g>

        <!-- series (each normalised to full height; real range in legend) -->
        <path
          v-for="s in active" :key="s.key"
          :d="path(s)" :stroke="s.color" class="line"
          :class="{ dashed: s.key === 'mood_arc' }"
        />
        <g v-for="s in active" :key="s.key + '-dots'">
          <circle
            v-for="(p, i) in s.points" :key="i"
            :cx="X(p.h)" :cy="Y(s, p.v)" r="2.4" :fill="s.color" class="pt"
            :class="{ hit: p.e }"
            @mouseenter="p.e && pick({ e: p.e })"
          />
        </g>

        <!-- event markers on the timeline -->
        <g v-for="m in markers" :key="m.i">
          <line
            :x1="X(m.h)" :x2="X(m.h)" :y1="H - PAD.b" :y2="H - PAD.b - 6"
            class="marker-tick"
          />
          <circle
            :cx="X(m.h)" :cy="H - PAD.b - 10" r="4"
            class="marker" :class="`t-${m.e.type}`"
            @click.stop="pick(m)"
            @mouseenter="pick(m)"
          >
            <title>{{ titleOf(m.e) }}</title>
          </circle>
        </g>
      </svg>

      <div
        v-if="selected"
        class="popup"
        :style="{ left: `${(selected.x / W) * 100}%` }"
      >
        <p class="pop-head">
          <span class="badge badge-accent">{{ selected.e.type }}</span>
          <span class="muted mono">
            {{ typeof selected.e.when?.hour === 'number' ? `${selected.e.when.hour}h` : label(PHASES, selected.e.when?.phase ?? '') }}
          </span>
        </p>
        <p class="pop-title">{{ titleOf(selected.e) }}</p>
        <p v-if="selected.e.data?.act" class="muted small">
          act: {{ selected.e.data.act }}<template v-if="selected.e.data.outcome"> · {{ selected.e.data.outcome }}</template>
          <template v-if="selected.e.data.npc_name ?? selected.e.data.entity_name"> · {{ selected.e.data.npc_name ?? selected.e.data.entity_name }}</template>
        </p>
        <p v-if="wordAfter" class="pop-mood">
          {{ moodLabel(wordAfter) }}
          <span v-if="wordBefore && wordBefore !== wordAfter" class="pop-was muted">
            {{ t('dc.before') }}: {{ moodLabel(wordBefore) }}
          </span>
        </p>
      </div>
    </div>
    <p class="hint muted">{{ t('dc.hint') }}</p>
  </div>
</template>

<style scoped>
.chart { display: grid; gap: 10px; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 28px; }
.legend-group { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; }
.group-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.series-toggle { display: flex; align-items: center; gap: 5px; font-size: 12px; cursor: pointer; color: var(--text-dim); }
.swatch { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
.range { font-size: 11px; color: var(--text-faint); }

.plot { position: relative; }
.svg { width: 100%; display: block; }
.grid { stroke: var(--border); stroke-width: 1; }
.zero { stroke: var(--text-faint); stroke-width: 1; stroke-dasharray: 4 4; }
.tick { font-size: 10px; fill: var(--text-faint); font-family: var(--mono); }
.line { fill: none; stroke-width: 1.8; }
.line.dashed { stroke-dasharray: 5 4; }
.pt { stroke: none; }
.pt.hit { cursor: pointer; }
.pt.hit:hover { stroke: var(--text); stroke-width: 1; }
.marker-tick { stroke: var(--text-faint); stroke-width: 1; }
.marker { fill: var(--accent); stroke: var(--bg, #fff); stroke-width: 1.5; cursor: pointer; }
.marker.t-interaction { fill: #e0707c; }
.marker.t-moment { fill: #e0a03c; }
.marker.t-land { fill: #5fbf8f; }
.marker.t-rest { fill: #7c9ee0; }

.popup {
  position: absolute;
  bottom: 34px;
  transform: translateX(-50%);
  min-width: 220px;
  max-width: 320px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
  padding: 10px 14px;
  font-size: 12.5px;
  z-index: 20;
}
.pop-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 0 0 6px; }
.pop-title { margin: 0 0 6px; font-weight: 500; line-height: 1.35; }
.pop-mood { margin: 8px 0 0; font-size: 15px; font-weight: 600; color: var(--accent); display: flex; align-items: baseline; gap: 10px; }
.pop-was { font-size: 11.5px; font-weight: 400; }
.small { font-size: 12px; }
.mono { font-family: var(--mono); }
.hint { font-size: 12px; margin: 0; }
</style>
