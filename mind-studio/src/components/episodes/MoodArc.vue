<script setup lang="ts">
// ============================================================================
// MoodArc — the day's emotional plot (ADR 0017 · lens.mood_arc)
// ----------------------------------------------------------------------------
// One card per lived phase: how it felt (valence + the mood phrase) and
// the heaviest reading that caused it. The TURN marks the phase where
// the standing mood swung hard. Below, the expandable trace: what each
// perceived event left on the felt substrate, in order.
// ============================================================================
import { computed } from 'vue'
import { label, moodLabel, PHASES } from '../../lib/labels'
import { moodWord } from '../../lib/moodSpace'
import type { EpisodeMood } from '../../types'

const props = defineProps<{ mood: EpisodeMood }>()

const arc = computed(() => props.mood.arc ?? [])
const turn = computed(() => props.mood.turn ?? null)
const trace = computed(() => props.mood.trace ?? [])
const feltDims = computed(() => Object.keys(props.mood.felt ?? {}))

const signed = (v: number) => `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}`
const phaseLabel = (p: string) => label(PHASES, p)
</script>

<template>
  <div class="arc">
    <div v-if="arc.length" class="phases">
      <div
        v-for="p in arc" :key="p.phase"
        class="phase" :class="{ turn: turn?.phase === p.phase }"
      >
        <p class="phase-name">
          {{ phaseLabel(p.phase) }}
          <span v-if="turn?.phase === p.phase" class="badge badge-accent">giro</span>
        </p>
        <p class="phase-mood">
          <span class="val" :class="{ neg: p.valence < 0 }">{{ signed(p.valence) }}</span>
          <span class="muted">{{ moodLabel(moodWord(p)) }}</span>
        </p>
        <p v-if="p.cause" class="phase-cause">«{{ p.cause }}»</p>
      </div>
    </div>
    <p v-else class="muted">Este episodio no registró arco de ánimo (es anterior a ADR 0017 o no tuvo eventos con huella).</p>

    <details v-if="trace.length" class="trace">
      <summary>Huella por evento ({{ trace.length }})</summary>
      <p class="muted small">
        Lo que cada momento dejó en el sustrato sentido — afecto, confianza, miedo, familiaridad — en el orden en que se sintió.
      </p>
      <ul>
        <li v-for="(t, i) in trace" :key="i">
          <span class="t-reading">{{ t.reading ?? t.subject ?? '—' }}</span>
          <span class="t-felt mono">
            <template v-for="(v, d) in t.felt ?? {}" :key="d">
              <span class="dim" :class="{ neg: v < 0 }">{{ d }} {{ signed(v) }}</span>
            </template>
          </span>
        </li>
      </ul>
    </details>

    <p v-if="feltDims.length" class="felt-total muted small">
      Acumulado del día:
      <span v-for="d in feltDims" :key="d" class="dim mono" :class="{ neg: (mood.felt?.[d] ?? 0) < 0 }">
        {{ d }} {{ signed(mood.felt?.[d] ?? 0) }}
      </span>
      <template v-if="mood.need_pressure"> · presión de necesidades {{ mood.need_pressure.toFixed(2) }}</template>
    </p>
  </div>
</template>

<style scoped>
.arc { display: grid; gap: 14px; }
.phases { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.phase {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
}
.phase.turn { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.phase-name { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim); margin: 0 0 6px; text-transform: capitalize; }
.phase-mood { display: flex; align-items: baseline; gap: 8px; margin: 0; }
.val { font-family: var(--mono); font-size: 15px; }
.val.neg { color: var(--danger); }
.phase-cause { margin: 8px 0 0; font-size: 12.5px; color: var(--text-dim); font-style: italic; line-height: 1.4; }

.trace { border-top: 1px solid var(--border); padding-top: 10px; }
.trace summary { cursor: pointer; font-size: 13px; color: var(--text-dim); font-weight: 500; }
.trace > p { margin: 8px 0 10px; }
.trace ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.trace li { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: baseline; font-size: 12.5px; }
.t-reading { line-height: 1.35; }
.t-felt { display: flex; flex-wrap: wrap; gap: 6px; }
.dim { font-size: 11.5px; }
.dim.neg { color: var(--danger); }
.mono { font-family: var(--mono); }
.small { font-size: 12px; }
.felt-total { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
</style>
