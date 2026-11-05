<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import {
  EPISODE_STATUS, label, moodLabel, NEEDS, PHASES, SILENCED_KIND, SILENCED_REASON,
} from '../../lib/labels'
import type { EpisodeView, LensLine } from '../../types'
import PanelCard from '../ui/PanelCard.vue'

const props = defineProps<{ episode: EpisodeView }>()

const brief = computed(() => props.episode.brief)
const focusLine = computed(() => props.episode.lens.find((l) => l.section === 'focus') ?? null)

// Episodes from before the brief (C35) only carry Lens sections.
const LEGACY: Record<string, string> = {
  beliefs: 'Lo que tenía por cierto',
  yesterday: 'Lo que recordaba de ayer',
  evoked: 'Recuerdos que volvieron',
  today: 'Lo que le preocupaba',
  needs: 'Lo que pedía el cuerpo',
}

const groups = computed(() => {
  const sections = brief.value
    ? [['carried', 'Lo que traía al empezar el día'], ['day', 'Lo que le pasó en el día']]
    : Object.entries(LEGACY)
  return sections
    .map(([section, title]) => ({
      section,
      title,
      lines: props.episode.lens.filter((l) => l.section === section),
    }))
    .filter((g) => g.lines.length)
})

const resonated = computed(() => props.episode.lens.filter((l) => l.resonated).length)
const silenced = computed(() => brief.value?.silenced ?? [])

const translation = computed(() => props.episode.narrative_translation)
const lang = shallowRef<'reader' | 'inner'>('reader')
const paragraphs = computed(() => {
  const text = lang.value === 'reader' && translation.value ? translation.value.text : (props.episode.narrative ?? '')
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
})

const phase = (line: Pick<LensLine, 'phase'>) => (line.phase ? label(PHASES, line.phase) : null)
</script>

<template>
  <div class="detail">
    <header class="head">
      <h2>Episodio {{ episode.idx ?? '—' }}</h2>
      <span class="muted mono">{{ episode.date ?? 'sin fecha' }}</span>
      <span class="badge">{{ label(EPISODE_STATUS, episode.status) }}</span>
      <span class="badge badge-accent">Ánimo: {{ moodLabel(episode.mood.dominant) }}</span>
      <span v-for="n in episode.needs_active" :key="n.key" class="badge need">{{ label(NEEDS, n.key) }}</span>
    </header>

    <PanelCard
      title="El centro del día"
      description="Lo más importante que vivió ese día. El narrador construye el capítulo alrededor de esto."
    >
      <template v-if="focusLine">
        <p class="focus">{{ focusLine.text }}</p>
        <p class="meta">
          <span v-if="phase(focusLine)" class="badge">{{ phase(focusLine) }}</span>
          <span v-if="focusLine.why" class="muted">Por qué: {{ focusLine.why }}</span>
        </p>
      </template>
      <p v-else class="empty">Un día tranquilo: nada pesó lo suficiente para ser el centro.</p>
      <p v-if="brief?.chosen_by === 'rules'" class="muted small">Elegido por reglas automáticas (el director no intervino).</p>
    </PanelCard>

    <PanelCard
      v-if="groups.length"
      title="Lo que la mente le pasó al narrador"
      :description="`Material que la mente aportó para escribir el capítulo. ${resonated} de ${episode.lens.length} elementos aparecieron en la narración.`"
    >
      <section v-for="g in groups" :key="g.section" class="group">
        <h4>{{ g.title }}</h4>
        <ul>
          <li v-for="(l, i) in g.lines" :key="i" :class="{ used: l.resonated }">
            <span class="dot" :title="l.resonated ? 'Apareció en la narración' : 'No apareció en la narración'" />
            <div>
              <p>{{ l.text }} <span v-if="phase(l)" class="badge">{{ phase(l) }}</span></p>
              <p v-if="l.why" class="muted small">{{ l.why }}</p>
            </div>
          </li>
        </ul>
      </section>
      <p class="legend muted small"><span class="dot used-dot" /> Apareció en la narración <span class="dot" /> No apareció</p>
    </PanelCard>

    <PanelCard title="Narración" description="El capítulo que se escribió para este día.">
      <template v-if="translation && episode.narrative" #actions>
        <div class="switch">
          <button :class="['btn', { 'btn-primary': lang === 'reader' }]" @click="lang = 'reader'">{{ translation.language }}</button>
          <button :class="['btn', { 'btn-primary': lang === 'inner' }]" @click="lang = 'inner'">english (original)</button>
        </div>
      </template>
      <article v-if="paragraphs.length" class="prose">
        <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
      </article>
      <p v-else class="empty">Este episodio no tiene narración guardada.</p>
    </PanelCard>

    <details v-if="silenced.length" class="silenced">
      <summary>Lo que se descartó ({{ silenced.length }})</summary>
      <p class="muted small">Recuerdos, creencias y frases que la mente consideró pero no usó, y por qué.</p>
      <ul>
        <li v-for="(s, i) in silenced" :key="i">
          <span class="badge">{{ label(SILENCED_KIND, s.kind) }}</span>
          <div>
            <p>{{ s.text }}</p>
            <p class="muted small">{{ SILENCED_REASON[s.reason] ?? s.reason }}</p>
          </div>
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.detail { display: grid; gap: 20px; min-width: 0; }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.head h2 { font-size: 20px; margin-right: 4px; }
.mono { font-family: var(--mono); font-size: 12px; }
.need { color: var(--danger); border-color: rgba(224, 112, 124, 0.35); }
.small { font-size: 13px; }
p { margin: 0; }

.focus { font-size: 16px; line-height: 1.55; max-width: 75ch; }
.meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline; margin-top: 10px; font-size: 13px; }

.group + .group { margin-top: 18px; }
.group h4 { font-size: 13px; color: var(--text-dim); font-weight: 500; margin-bottom: 8px; }
.group ul, .silenced ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.group li { display: grid; grid-template-columns: 12px 1fr; gap: 10px; align-items: start; }
.group li p + p { margin-top: 2px; }
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  border: 1.5px solid var(--text-faint);
}
.used .dot, .used-dot { background: var(--accent); border-color: var(--accent); }
.legend { display: flex; align-items: center; gap: 6px; margin-top: 16px; }
.legend .dot { margin-top: 0; }
.legend .dot:not(.used-dot) { margin-left: 12px; }

.switch { display: flex; gap: 6px; }
.prose { font-family: var(--serif); font-size: 16px; line-height: 1.7; max-width: 70ch; }
.prose p + p { margin-top: 1em; }

.silenced { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 22px; }
.silenced summary { cursor: pointer; font-weight: 500; color: var(--text-dim); }
.silenced > p { margin: 10px 0 14px; }
.silenced li { display: grid; grid-template-columns: 110px 1fr; gap: 12px; align-items: start; }
.silenced li .badge { justify-self: start; }
</style>
