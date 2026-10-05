<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { humanize, moodColor } from '../lib/format'
import type { CharacterCard, Mood } from '../types'

const props = defineProps<{
  character: CharacterCard
  condition: Record<string, unknown>
  mood: Mood
  preset: string
  counts: { alive: number; forgotten: number; beliefs: number }
}>()

const expanded = shallowRef(false)

const initial = computed(() => (props.character.name ?? '?').trim().charAt(0).toUpperCase())

const skills = computed(() =>
  Object.entries(props.character.skills ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, label: humanize(key), value: Math.max(0, Math.min(10, value)) })),
)

const condition = computed(() =>
  Object.entries(props.condition ?? {})
    .filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([key, v]) => ({
      key,
      label: humanize(key),
      value: Array.isArray(v) ? v.map((x) => humanize(String(x))).join(' · ') : String(v),
    })),
)

const moodStyle = computed(() => ({ background: moodColor(props.mood) }))
</script>

<template>
  <aside class="card">
    <div class="portrait" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <defs>
          <filter id="pencil">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
        <g filter="url(#pencil)">
          <circle cx="60" cy="60" r="52" class="ring" />
          <circle cx="60" cy="60" r="47" class="ring ring-2" />
        </g>
        <text x="60" y="78" text-anchor="middle" class="initial">{{ initial }}</text>
      </svg>
      <span class="mood-dot" :style="moodStyle" :title="`ánimo: ${mood.dominant ?? '—'}`" />
    </div>

    <h1 class="name">{{ character.name ?? 'Sin nombre' }}</h1>
    <p class="meta">
      <span class="tape-label">{{ preset }}</span>
      <span class="mood">ánimo: <b>{{ mood.dominant ?? '—' }}</b></span>
    </p>

    <dl class="tally">
      <div><dt>recuerdos</dt><dd>{{ counts.alive }}</dd></div>
      <div><dt>olvidados</dt><dd>{{ counts.forgotten }}</dd></div>
      <div><dt>creencias</dt><dd>{{ counts.beliefs }}</dd></div>
    </dl>

    <section v-if="character.foundational_phrase" class="block">
      <h3 class="eyebrow">Frase fundacional</h3>
      <blockquote :class="['phrase', { 'is-open': expanded }]">
        {{ character.foundational_phrase }}
      </blockquote>
      <button class="more" @click="expanded = !expanded">
        {{ expanded ? 'menos' : 'leer entera' }}
      </button>
    </section>

    <section v-if="skills.length" class="block">
      <h3 class="eyebrow">Lo que sabe hacer</h3>
      <ul class="skills">
        <li v-for="s in skills" :key="s.key">
          <span class="skill-name">{{ s.label }}</span>
          <span class="ticks" :aria-label="`${s.value} de 10`">
            <i v-for="n in 10" :key="n" :class="{ on: n <= s.value }" />
          </span>
        </li>
      </ul>
    </section>

    <section v-if="condition.length" class="block">
      <h3 class="eyebrow">Lo que el mundo reporta</h3>
      <dl class="condition">
        <div v-for="c in condition" :key="c.key">
          <dt>{{ c.label }}</dt>
          <dd>{{ c.value }}</dd>
        </div>
      </dl>
    </section>
  </aside>
</template>

<style scoped>
.card {
  overflow-y: auto;
  padding: 22px 20px 28px;
  border-right: 1px solid var(--chalk-faint);
  background: linear-gradient(180deg, rgba(17, 26, 41, 0.85), rgba(11, 17, 28, 0.6));
}

.portrait { position: relative; width: 112px; margin: 0 0 10px -4px; }
.portrait svg { width: 112px; height: 112px; display: block; }
.ring { fill: none; stroke: var(--chalk-dim); stroke-width: 1.2; }
.ring-2 { stroke: var(--chalk-faint); stroke-dasharray: 4 6; }
.initial { font-family: var(--display); font-size: 58px; fill: var(--paper); }
.mood-dot {
  position: absolute;
  right: 8px;
  bottom: 12px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--night);
}

.name {
  font-family: var(--display);
  font-weight: 400;
  font-size: 42px;
  line-height: 1;
  margin: 0 0 8px;
  color: var(--paper);
  letter-spacing: -0.01em;
}

.meta { display: flex; align-items: center; gap: 12px; margin: 0 0 18px; }
.mood { color: var(--chalk-dim); }
.mood b { color: var(--chalk); font-weight: 400; }

.tally {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 0 22px;
  border-top: 1px solid var(--chalk-faint);
  border-bottom: 1px solid var(--chalk-faint);
}
.tally div { padding: 8px 0; }
.tally dt { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--chalk-dim); }
.tally dd { margin: 0; font-family: var(--display); font-size: 28px; color: var(--paper); line-height: 1.1; }

.block { margin-bottom: 22px; }
.block h3 { margin: 0 0 8px; }

.phrase {
  margin: 0;
  font-family: var(--prose);
  font-style: italic;
  font-size: 13.5px;
  line-height: 1.55;
  color: #d7cfbe;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  border-left: 2px solid var(--tangerine);
  padding-left: 10px;
}
.phrase.is-open { display: block; }
.more {
  background: none;
  border: 0;
  padding: 4px 0 0 12px;
  color: var(--amber);
  font-size: 11px;
  text-decoration: underline dotted;
}

.skills { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.skills li { display: grid; grid-template-columns: 92px 1fr; align-items: center; }
.skill-name { color: var(--chalk); text-transform: lowercase; }
.ticks { display: flex; gap: 3px; }
.ticks i {
  width: 9px;
  height: 9px;
  border: 1px solid var(--chalk-faint);
  transform: rotate(45deg) scale(0.75);
}
.ticks i.on { background: var(--amber); border-color: var(--amber); box-shadow: 0 0 6px rgba(255, 189, 89, 0.5); }

.condition { margin: 0; display: grid; gap: 4px; }
.condition div { display: grid; grid-template-columns: 92px 1fr; }
.condition dt { color: var(--chalk-dim); text-transform: lowercase; }
.condition dd { margin: 0; color: var(--chalk); }
</style>
