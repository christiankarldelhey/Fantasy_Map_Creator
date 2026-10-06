<script setup lang="ts">
import { computed } from 'vue'
import type { EpisodeBrief, LensLine } from '../types'
import type { NodeRef } from './nodeRef'

const props = defineProps<{
  lines: LensLine[]
  brief?: EpisodeBrief | null
  focus: NodeRef | null
}>()

const emit = defineEmits<{
  focus: [ref: NodeRef | null]
}>()

const LEGACY_LABELS: Record<string, string> = {
  beliefs: 'Lo que tiene por cierto',
  yesterday: 'Lo que recuerda de ayer',
  evoked: 'Recuerdos que vuelven',
  today: 'Lo que le pesa hoy',
  needs: 'Lo que pide el cuerpo',
}
const LEGACY_ORDER = ['beliefs', 'yesterday', 'evoked', 'today', 'needs']

const BRIEF_LABELS: Record<string, string> = {
  carried: 'Lo que trae al empezar',
  day: 'Lo que el día le hace',
}
const BRIEF_ORDER = ['carried', 'day']

const hasBrief = computed(() => !!props.brief)

const groups = computed(() =>
  (hasBrief.value ? BRIEF_ORDER : LEGACY_ORDER).map((section) => ({
    section,
    label: hasBrief.value
      ? BRIEF_LABELS[section]!
      : LEGACY_LABELS[section]!,
    lines: props.lines
      .map((line, i) => ({ ...line, key: `${section}-${i}` }))
      .filter((l) => l.section === section),
  })).filter((g) => g.lines.length),
)

const focusLine = computed(() =>
  props.lines.find((l) => l.section === 'focus') ?? null,
)

const silenced = computed(() => props.brief?.silenced ?? [])
const withoutDirector = computed(() => props.brief?.chosen_by === 'rules')

const resonatedCount = computed(() => props.lines.filter((l) => l.resonated).length)

function refOf(line: LensLine) {
  return line.ref
}

function isFocused(line: LensLine) {
  return !!line.ref && props.focus?.id === line.ref.id
}
</script>

<template>
  <div class="lens">
    <p class="lens-score">
      <b>{{ resonatedCount }}</b> de {{ lines.length }} líneas resonaron en la prosa
    </p>
    <p v-if="withoutDirector" class="by-rules">
      Focus elegido por las reglas — el director no intervino en este episodio.
    </p>

    <!-- El Focus: la única cosa sobre la que gira el Episode -->
    <div v-if="hasBrief" class="focus-block">
      <h4 class="eyebrow">El centro</h4>
      <p v-if="focusLine" class="focus-line">
        {{ focusLine.text }}
        <span v-if="focusLine.phase" class="phase">{{ focusLine.phase }}</span>
      </p>
      <p v-else class="focus-none">Un tramo quieto — nada pesó lo bastante.</p>
      <p v-if="focusLine?.why" class="why">{{ focusLine.why }}</p>
    </div>

    <div v-for="g in groups" :key="g.section" class="lens-group">
      <h4 class="eyebrow">{{ g.label }}</h4>
      <ul>
        <li
          v-for="line in g.lines"
          :key="line.key"
          :class="['lens-line', {
            'is-resonated': line.resonated,
            'is-linked': !!line.ref,
            'is-focus': isFocused(line),
          }]"
          @mouseenter="emit('focus', refOf(line))"
          @mouseleave="emit('focus', null)"
        >
          <span class="mark" :title="line.resonated ? 'resonó' : 'no resonó'">
            {{ line.resonated ? '●' : '○' }}
          </span>
          <span class="body">
            <span class="text">
              {{ line.text }}
              <span v-if="line.phase" class="phase">{{ line.phase }}</span>
            </span>
            <span v-if="line.why" class="why">{{ line.why }}</span>
          </span>
        </li>
      </ul>
    </div>

    <!-- Lo que quedó en silencio, plegado por defecto -->
    <details v-if="silenced.length" class="silenced">
      <summary>Lo que quedó en silencio ({{ silenced.length }})</summary>
      <ul>
        <li v-for="(s, i) in silenced" :key="i" class="silenced-line">
          <span class="kind">{{ s.kind }}</span>
          <span class="body">
            <span class="text">{{ s.text }}</span>
            <span class="why">{{ s.reason }}</span>
          </span>
        </li>
      </ul>
    </details>

    <p v-if="!lines.length" class="empty">La mente no le dijo nada al narrador en este episodio.</p>
  </div>
</template>

<style scoped>
.lens-score {
  margin: 0 0 14px;
  color: var(--chalk-dim);
}
.lens-score b { color: var(--amber); font-weight: 400; font-size: 15px; }

.by-rules {
  margin: -6px 0 14px;
  font-size: 11px;
  color: var(--chalk-dim);
  font-style: italic;
}

.focus-block {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-left: 2px solid var(--amber);
  background: rgba(255, 189, 89, 0.05);
}
.focus-block h4 { margin: 0 0 4px; }
.focus-line {
  margin: 0;
  font-family: var(--display);
  font-size: 19px;
  color: var(--paper);
}
.focus-none { margin: 0; color: var(--chalk-dim); font-style: italic; font-size: 12px; }
.phase {
  margin-left: 8px;
  font-family: var(--type);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--chalk-dim);
  border: 1px solid var(--chalk-faint);
  border-radius: 8px;
  padding: 1px 7px;
  vertical-align: middle;
}

.lens-group { margin-bottom: 14px; }
.lens-group h4 { margin: 0 0 6px; }
.lens-group ul { list-style: none; margin: 0; padding: 0; }

.lens-line {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 8px;
  padding: 5px 8px 5px 4px;
  border-left: 2px solid transparent;
  color: var(--chalk-dim);
  font-size: 12px;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.lens-line.is-linked { cursor: crosshair; }
.lens-line.is-resonated { color: var(--chalk); }
.lens-line.is-resonated .mark { color: var(--amber); }
.lens-line.is-focus,
.lens-line.is-linked:hover {
  background: rgba(255, 189, 89, 0.06);
  border-left-color: var(--amber);
  color: var(--paper);
}
.mark { color: var(--chalk-faint); font-size: 10px; padding-top: 2px; }
.body { display: flex; flex-direction: column; gap: 2px; }
.why { font-size: 10.5px; color: var(--chalk-faint); font-style: italic; }

.silenced { margin-top: 6px; }
.silenced summary {
  cursor: pointer;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--chalk-dim);
}
.silenced ul { list-style: none; margin: 8px 0 0; padding: 0; }
.silenced-line {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px;
  padding: 4px 4px 4px 6px;
  font-size: 11px;
  color: var(--chalk-faint);
}
.silenced-line .kind {
  font-family: var(--type);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-top: 1px;
}

.empty { color: var(--chalk-dim); font-style: italic; }
</style>
