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
import { computed, reactive, shallowRef } from 'vue'
import { label, PHASES } from '../../lib/labels'
import type { EpisodeMood, PerceivedEvent } from '../../types'

const props = defineProps<{ episode: { perceived: PerceivedEvent[]; mood: EpisodeMood } }>()

// Phase → a representative hour, for events that carry a phase but no
// exact hour (and for the mood arc's three anchor points).
const PHASE_HOUR: Record<string, number> = {
  dawn: 6, morning: 9, midday: 12, afternoon: 15, evening: 18,
  before_sleep: 21, night: 22, mid_night: 2,
}

function hourOf(e: PerceivedEvent, i: number): number {
  if (typeof e.when?.hour === 'number') return e.when.hour
  const ph = e.when?.phase
  if (ph && PHASE_HOUR[ph] != null) return PHASE_HOUR[ph]
  return 4 + i // untimed: spread along the morning so it still shows
}

// -- series -------------------------------------------------------------
interface Pt { h: number; v: number }
interface Series { key: string; group: string; label: string; color: string; points: Pt[] }

const GROUPS = ['body', 'mood', 'otras'] as const
const GROUP_LABEL: Record<string, string> = { body: 'Cuerpo', mood: 'Ánimo', otras: 'Otras mediciones' }
const GROUP_COLOR: Record<string, string> = { body: '#e0707c', mood: '#7c9ee0', otras: '#9aa5b1' }
const SERIES_LABEL: Record<string, string> = {
  energy: 'Energía', shadow: 'Shadow', valence: 'Valencia (cómo lo sintió)',
  world_valence: 'Valencia del mundo', mood_arc: 'Ánimo del día (arco)',
  salience: 'Salience', severity: 'Severidad',
  affection: 'Afecto', trust: 'Confianza', fear: 'Miedo', familiarity: 'Familiaridad',
}

const IMPRINT_COLORS: Record<string, string> = {
  affection: '#e0a03c', trust: '#5fbf8f', fear: '#8f5fbf', familiarity: '#b0a06c',
}

const series = computed<Series[]>(() => {
  const out: Series[] = []
  const evs = props.episode.perceived
  const pts = (pick: (e: PerceivedEvent) => number | null): Pt[] =>
    evs.map((e, i) => ({ h: hourOf(e, i), v: pick(e) }))
      .filter((p): p is Pt => p.v != null)
      .sort((a, b) => a.h - b.h)

  const push = (key: string, group: string, color: string, points: Pt[]) => {
    if (points.length) {
      out.push({ key, group, label: SERIES_LABEL[key] ?? key, color, points })
    }
  }

  // Body — vitals the Host reported on each outcome (new days carry
  // data.after; older days only have shadow_effect deltas).
  push('energy', 'body', '#e0707c', pts((e) => e.data?.after?.energy ?? null))
  const hasAfterShadow = evs.some((e) => e.data?.after?.shadow != null)
  if (hasAfterShadow) {
    push('shadow', 'body', '#222222', pts((e) => e.data?.after?.shadow ?? null))
  } else {
    // Legacy: accumulate the day's shadow deltas from a 0 baseline.
    let run = 0
    const acc: Pt[] = []
    evs.forEach((e, i) => {
      const d = e.data?.shadow_effect
      if (typeof d === 'number' && d !== 0) {
        run += d
        acc.push({ h: hourOf(e, i), v: run })
      }
    })
    push('shadow', 'body', '#222222', acc)
  }

  // Mood — what each moment felt like, plus the day's arc as anchors.
  push('valence', 'mood', '#7c9ee0', pts((e) => e.valence ?? null))
  push('world_valence', 'mood', '#b9c8e8', pts((e) => e.world_valence ?? null))
  const arcPts = (props.episode.mood?.arc ?? [])
    .map((a) => ({ h: PHASE_HOUR[a.phase] ?? 12, v: a.valence }))
  push('mood_arc', 'mood', '#3f66b8', arcPts)

  // Everything else numeric the perception layer produced.
  push('salience', 'otras', '#9aa5b1', pts((e) => e.salience ?? null))
  push('severity', 'otras', '#c46a6a', pts((e) => e.severity ?? null))
  for (const dim of ['affection', 'trust', 'fear', 'familiarity']) {
    push(dim, 'otras', IMPRINT_COLORS[dim] ?? '#9aa5b1',
      pts((e) => (e.imprint || {})[dim] ?? null))
  }
  return out
})

// -- toggles --------------------------------------------------------------
const enabled = reactive<Record<string, boolean>>({})
const active = computed(() =>
  series.value.filter((s) => enabled[s.key] ?? (s.group === 'mood' || s.group === 'body')),
)
const groups = computed(() =>
  GROUPS.map((g) => ({
    key: g,
    label: GROUP_LABEL[g],
    color: GROUP_COLOR[g],
    series: series.value.filter((s) => s.group === g),
  })).filter((g) => g.series.length),
)
function toggleGroup(g: string, on: boolean) {
  for (const s of series.value) if (s.group === g) enabled[s.key] = on
}

// -- geometry ---------------------------------------------------------------
const W = 760
const H = 240
const PAD = { t: 14, r: 14, b: 26, l: 36 }
const X = (h: number) => PAD.l + (h / 24) * (W - PAD.l - PAD.r)

const yRange = computed(() => {
  const vals = active.value.flatMap((s) => s.points.map((p) => p.v))
  if (!vals.length) return [-1, 1]
  let lo = Math.min(...vals, 0)
  let hi = Math.max(...vals, 0)
  if (hi - lo < 0.2) { hi += 0.1; lo -= 0.1 }
  const pad = (hi - lo) * 0.08
  return [lo - pad, hi + pad]
})
const Y = (v: number) => {
  const [lo, hi] = yRange.value
  return PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
}
const path = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.h).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')

const ticks = [0, 6, 12, 18, 24]

// -- event dots + popup -----------------------------------------------------
const markers = computed(() =>
  props.episode.perceived.map((e, i) => ({ e, h: hourOf(e, i), i })),
)
const selected = shallowRef<{ e: PerceivedEvent; x: number } | null>(null)
function pick(m: { e: PerceivedEvent; h: number }) {
  selected.value = { e: m.e, x: X(m.h) }
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
            :checked="g.series.every((s) => enabled[s.key] ?? (s.group !== 'otras'))"
            @change="toggleGroup(g.key, ($event.target as HTMLInputElement).checked)"
          />
          <strong>{{ g.label }}</strong>
        </label>
        <label v-for="s in g.series" :key="s.key" class="series-toggle">
          <input v-model="enabled[s.key]" type="checkbox" />
          <span class="swatch" :style="{ background: s.color }" />
          {{ s.label }}
        </label>
      </div>
    </div>

    <div class="plot">
      <svg :viewBox="`0 0 ${W} ${H}`" class="svg" @click.self="selected = null">
        <!-- zero line -->
        <line
          v-if="yRange[0] < 0 && yRange[1] > 0"
          :x1="PAD.l" :x2="W - PAD.r" :y1="Y(0)" :y2="Y(0)"
          class="zero"
        />
        <!-- hour ticks -->
        <g v-for="t in ticks" :key="t">
          <line :x1="X(t)" :x2="X(t)" :y1="PAD.t" :y2="H - PAD.b" class="grid" />
          <text :x="X(t)" :y="H - 8" class="tick">{{ t }}h</text>
        </g>
        <text :x="6" :y="Y(yRange[1]) + 4" class="tick">{{ yRange[1].toFixed(1) }}</text>
        <text :x="6" :y="Y(yRange[0]) + 4" class="tick">{{ yRange[0].toFixed(1) }}</text>

        <!-- series -->
        <path
          v-for="s in active" :key="s.key"
          :d="path(s.points)" :stroke="s.color" class="line"
          :class="{ dashed: s.key === 'mood_arc' }"
        />
        <g v-for="s in active" :key="s.key + '-dots'">
          <circle
            v-for="(p, i) in s.points" :key="i"
            :cx="X(p.h)" :cy="Y(p.v)" r="2.4" :fill="s.color" class="pt"
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
          <template v-if="selected.e.data.npc_name"> · {{ selected.e.data.npc_name }}</template>
        </p>
        <dl class="pop-vals">
          <template v-if="selected.e.valence != null"><dt>valencia</dt><dd>{{ selected.e.valence.toFixed(2) }}</dd></template>
          <template v-if="selected.e.severity != null"><dt>severidad</dt><dd>{{ selected.e.severity.toFixed(2) }}</dd></template>
          <template v-if="selected.e.data?.shadow_effect"><dt>shadow</dt><dd>{{ selected.e.data.shadow_effect > 0 ? '+' : '' }}{{ selected.e.data.shadow_effect }}</dd></template>
          <template v-if="selected.e.data?.after?.energy != null"><dt>energía</dt><dd>{{ selected.e.data.after.energy }}</dd></template>
          <template v-for="(v, k) in selected.e.imprint" :key="k"><dt>{{ k }}</dt><dd>{{ v.toFixed(2) }}</dd></template>
        </dl>
      </div>
    </div>
    <p class="hint muted">Los puntos sobre el eje son los eventos del día — pasá el mouse o hacé click para verlos.</p>
  </div>
</template>

<style scoped>
.chart { display: grid; gap: 10px; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 28px; }
.legend-group { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; }
.group-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.series-toggle { display: flex; align-items: center; gap: 5px; font-size: 12px; cursor: pointer; color: var(--text-dim); }
.swatch { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }

.plot { position: relative; }
.svg { width: 100%; display: block; }
.grid { stroke: var(--border); stroke-width: 1; }
.zero { stroke: var(--text-faint); stroke-width: 1; stroke-dasharray: 4 4; }
.tick { font-size: 10px; fill: var(--text-faint); font-family: var(--mono); }
.line { fill: none; stroke-width: 1.8; }
.line.dashed { stroke-dasharray: 5 4; }
.pt { stroke: none; }
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
  background: var(--panel, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  padding: 10px 14px;
  font-size: 12.5px;
  z-index: 5;
}
.pop-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 0 0 6px; }
.pop-title { margin: 0 0 6px; font-weight: 500; line-height: 1.35; }
.pop-vals { display: grid; grid-template-columns: auto 1fr; gap: 1px 12px; margin: 8px 0 0; }
.pop-vals dt { color: var(--text-dim); }
.pop-vals dd { margin: 0; font-family: var(--mono); text-align: right; }
.small { font-size: 12px; }
.mono { font-family: var(--mono); }
.hint { font-size: 12px; margin: 0; }
</style>
