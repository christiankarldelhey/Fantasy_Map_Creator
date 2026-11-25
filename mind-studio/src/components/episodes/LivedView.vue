<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  BedDouble, Brain, ChevronRight, Cloudy, Dot, Footprints, HeartPulse,
  MapPin, Moon, Mountain, Soup, Sparkles, Sunrise, Swords, Users,
} from '@lucide/vue'
import { t } from '../../lib/i18n'
import { label, moodLabel, PHASES } from '../../lib/labels'
import { resolveMoodName, unPull, type MoodPoint } from '../../lib/moodSpace'
import type { Mood, PerceivedEvent } from '../../types'

// One row per perceived event — the detail is the post-perception
// record only (what the mind lived), never the raw wire version.
// Rows stay in prompt order (= chronological), grouped under phase
// titles (morning / afternoon / night…).
const props = defineProps<{
  events: Record<string, unknown>[]
  lived: Record<string, unknown>[]
  /** The episode's final mood — the anchor the per-event mood names
   *  are walked back from. */
  mood?: Mood
}>()

interface Row {
  key: string
  i: number
  lived: Record<string, unknown>
  synthetic: boolean
}

const rows = computed<Row[]>(() => {
  const byId = new Map<string, Record<string, unknown>>()
  for (const e of props.events) {
    const id = e.id as string | undefined
    if (id) byId.set(id, e)
  }
  const usedRaw = new Set<Record<string, unknown>>()
  const out: Row[] = []
  let cursor = 0
  for (const [i, item] of props.lived.entries()) {
    let raw: Record<string, unknown> | null = null
    const id = item.id as string | undefined
    if (id && byId.has(id) && !usedRaw.has(byId.get(id)!)) {
      raw = byId.get(id)!
    } else if (item.source !== 'mind' && cursor < props.events.length) {
      // Pair by position for world items without an id — the perceived
      // day keeps the wire's order.
      raw = props.events[cursor]
    }
    if (raw) usedRaw.add(raw)
    cursor += 1
    out.push({
      key: id ?? `${item.type}-${out.length}`,
      i,
      lived: item,
      synthetic: item.source === 'mind' || !raw,
    })
  }
  return out
})

// -- phase grouping -----------------------------------------------------------
const PHASE_ORDER = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'evening', 'night']

const phaseOf = (item: Record<string, unknown>): string => {
  const when = item.when as { phase?: string; hour?: number } | undefined
  const p = when?.phase?.toLowerCase()
  if (p) return p
  const h = when?.hour
  if (typeof h === 'number') return h < 13 ? 'morning' : h < 19 ? 'afternoon' : 'night'
  return 'day'
}

const groups = computed(() => {
  const buckets = new Map<string, Row[]>()
  for (const r of rows.value) {
    const ph = phaseOf(r.lived)
    if (!buckets.has(ph)) buckets.set(ph, [])
    buckets.get(ph)!.push(r)
  }
  const order = [...buckets.keys()].sort((a, b) => {
    const ia = PHASE_ORDER.indexOf(a)
    const ib = PHASE_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  return order.map((phase) => ({ phase, rows: buckets.get(phase)! }))
})

// -- mood word per event ------------------------------------------------------
// Same reconstruction as the day chart: the episode's final mood
// walked backward through each event's pull. A row names the mood it
// left — shown only when the word actually changed.
const moodWords = computed(() => {
  const items = props.lived
  const after = new Array<MoodPoint>(items.length)
  let pos: MoodPoint = {
    valence: props.mood?.valence ?? 0,
    arousal: props.mood?.arousal ?? 0,
  }
  for (let i = items.length - 1; i >= 0; i--) {
    after[i] = pos
    pos = unPull(items[i] as unknown as PerceivedEvent, pos)
  }
  return {
    start: resolveMoodName(pos.valence, pos.arousal),
    words: after.map((p) => resolveMoodName(p.valence, p.arousal)),
  }
})

const wordAt = (i: number): string | null => {
  const { words, start } = moodWords.value
  const prev = i > 0 ? words[i - 1] : start
  return words[i] !== prev ? words[i] : null
}

// -- icons --------------------------------------------------------------------
const KIND_ICON: Record<string, Component> = {
  wake: Sunrise,
  climate: Cloudy,
  land: Mountain,
  travel: Footprints,
  place: MapPin,
  interaction: Swords,
  encounter: Users,
  rest: BedDouble,
  sleep: Moon,
  meal: Soup,
  body: HeartPulse,
  moment: Sparkles,
  musing: Brain,
  memory: Brain,
}
const icon = (r: Row) =>
  r.synthetic ? Brain : KIND_ICON[String(r.lived.type ?? '')] ?? Dot

const fmt = (v: unknown) => JSON.stringify(v, null, 2)
const reading = (e: Record<string, unknown>) =>
  (e.reading as string) || '—'
</script>

<template>
  <div class="lived">
    <template v-for="g in groups" :key="g.phase">
      <h4 class="phase-title">{{ label(PHASES, g.phase) }}</h4>
      <details v-for="r in g.rows" :key="r.key" class="row">
        <summary>
          <component :is="icon(r)" :size="14" :stroke-width="2" class="icon" />
          <span class="type">{{ r.lived.type }}</span>
          <span v-if="r.synthetic" class="badge mind">{{ t('lv.mind') }}</span>
          <span
            v-else-if="r.lived.perception && r.lived.perception !== 'noticed'"
            class="badge warn"
          >{{ r.lived.perception }}</span>
          <span class="reading">{{ reading(r.lived) }}</span>
          <span class="tail">
            <span v-if="wordAt(r.i)" class="mood-word">{{ moodLabel(wordAt(r.i)!) }}</span>
            <ChevronRight :size="14" class="chev" />
          </span>
        </summary>
        <div class="col">
          <p v-if="r.lived.reading" class="full-reading">«{{ r.lived.reading }}»</p>
          <h5>{{ t('lv.lived') }}</h5>
          <pre>{{ fmt(r.lived) }}</pre>
        </div>
      </details>
    </template>
    <p v-if="!rows.length" class="empty">{{ t('lv.empty') }}</p>
  </div>
</template>

<style scoped>
.lived { display: grid; gap: 8px; }
.phase-title {
  font-size: 11px; font-weight: 500; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-faint);
  margin: 14px 0 2px; padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.phase-title:first-child { margin-top: 0; }
.row { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.row summary {
  display: flex; align-items: baseline; gap: 10px;
  padding: 10px 14px; cursor: pointer; list-style: none;
}
.row summary::-webkit-details-marker { display: none; }
.tail { margin-left: auto; display: flex; align-items: baseline; gap: 10px; flex: none; }
.chev { color: var(--text-faint); flex: none; align-self: center; transition: transform 0.15s ease; }
.row[open] .chev { transform: rotate(90deg); }
.icon { color: var(--text); flex: none; align-self: center; }
.type { font-family: var(--mono); font-size: 12px; font-weight: 600; min-width: 90px; }
.reading {
  font-size: 13px; color: var(--text-dim);
  flex: 0 1 auto; max-width: 58ch;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mood-word { font-size: 12.5px; font-weight: 600; color: var(--accent); white-space: nowrap; }
.badge { font-size: 11px; }
.badge.warn { color: var(--danger); border-color: rgba(224, 112, 124, 0.35); }
.badge.mind { color: var(--text-dim); }
.col { padding: 12px 14px; min-width: 0; border-top: 1px solid var(--border); }
.col h5 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); margin: 0 0 8px; font-weight: 500; }
.full-reading {
  margin: 0 0 12px;
  font-family: var(--serif);
  font-style: italic;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--text);
  max-width: 72ch;
}
pre {
  font-family: var(--mono); font-size: 11.5px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word; margin: 0;
  max-height: 320px; overflow: auto;
}
.empty { color: var(--text-dim); font-size: 13px; }
</style>
