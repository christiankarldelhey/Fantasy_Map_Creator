<script setup lang="ts">
import { computed } from 'vue'
import type { LensLine, LensSection } from '../types'
import type { NodeRef } from './nodeRef'

const props = defineProps<{
  lines: LensLine[]
  focus: NodeRef | null
}>()

const emit = defineEmits<{
  focus: [ref: NodeRef | null]
}>()

const LABELS: Record<LensSection, string> = {
  beliefs: 'Lo que tiene por cierto',
  yesterday: 'Lo que recuerda de ayer',
  evoked: 'Recuerdos que vuelven',
  today: 'Lo que le pesa hoy',
  needs: 'Lo que pide el cuerpo',
}
const ORDER: LensSection[] = ['beliefs', 'yesterday', 'evoked', 'today', 'needs']

const groups = computed(() =>
  ORDER.map((section) => ({
    section,
    label: LABELS[section],
    lines: props.lines
      .map((line, i) => ({ ...line, key: `${section}-${i}` }))
      .filter((l) => l.section === section),
  })).filter((g) => g.lines.length),
)

const resonatedCount = computed(() => props.lines.filter((l) => l.resonated).length)

function isFocused(line: LensLine) {
  return !!line.ref && props.focus?.id === line.ref.id
}
</script>

<template>
  <div class="lens">
    <p class="lens-score">
      <b>{{ resonatedCount }}</b> de {{ lines.length }} líneas resonaron en la prosa
    </p>
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
          @mouseenter="emit('focus', line.ref)"
          @mouseleave="emit('focus', null)"
        >
          <span class="mark" :title="line.resonated ? 'resonó' : 'no resonó'">
            {{ line.resonated ? '●' : '○' }}
          </span>
          <span class="text">{{ line.text }}</span>
        </li>
      </ul>
    </div>
    <p v-if="!lines.length" class="empty">La mente no le dijo nada al narrador en este episodio.</p>
  </div>
</template>

<style scoped>
.lens-score {
  margin: 0 0 14px;
  color: var(--chalk-dim);
}
.lens-score b { color: var(--amber); font-weight: 400; font-size: 15px; }

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

.empty { color: var(--chalk-dim); font-style: italic; }
</style>
