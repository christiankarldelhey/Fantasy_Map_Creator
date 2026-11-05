<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { CONDITION, label, moodLabel, NEEDS } from '../../lib/labels'
import type { MindDetail } from '../../types'
import PanelCard from '../ui/PanelCard.vue'
import CardEditForm from './CardEditForm.vue'

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ saved: [] }>()

const editing = shallowRef(false)

const character = computed(() => props.mind.character)
const editable = computed(() => character.value.kind !== 'original' && character.value.adopted)
const lastEpisode = computed(() => props.mind.episodes.at(-1) ?? null)

const lineage = computed(() =>
  character.value.kind === 'original'
    ? 'Personaje original'
    : character.value.original
      ? `Copia de ${character.value.original}`
      : 'Copia',
)

const stats = computed(() => {
  const m = props.mind
  return [
    { label: 'Episodios vividos', value: m.episodes.length },
    { label: 'Recuerdos activos', value: m.memories.filter((x) => x.state === 'alive').length },
    { label: 'Recuerdos olvidados', value: m.memories.filter((x) => x.state !== 'alive').length },
    { label: 'Creencias', value: m.beliefs.length },
    { label: 'Frases de voz interior', value: m.musings.length },
  ]
})

const condition = computed(() =>
  Object.entries(props.mind.condition ?? {})
    .filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([key, v]) => ({
      key,
      label: label(CONDITION, key),
      value: Array.isArray(v) ? v.join(', ') : v === 'none' ? 'ninguna' : String(v),
    })),
)

const needs = computed(() => lastEpisode.value?.needs_active ?? [])

const valence = computed(() => props.mind.mood.valence ?? 0)
const moodText = computed(() => {
  const v = valence.value
  if (v <= -0.25) return 'Arrastra un ánimo negativo.'
  if (v >= 0.25) return 'Viene de buen ánimo.'
  return 'Su ánimo está en equilibrio.'
})

function onSaved() {
  editing.value = false
  emit('saved')
}
</script>

<template>
  <div class="grid">
    <PanelCard title="Quién es" class="span-2">
      <template #actions>
        <button v-if="editable && !editing" class="btn" @click="editing = true">Editar ficha</button>
      </template>

      <CardEditForm
        v-if="editing"
        :character="character"
        :character-id="mind.character_id"
        @cancel="editing = false"
        @saved="onSaved"
      />

      <div v-else class="identity">
        <img v-if="character.portrait_url" :src="character.portrait_url" alt="" class="portrait" />
        <div v-else class="portrait placeholder" aria-hidden="true">
          {{ (character.name ?? '?').charAt(0).toUpperCase() }}
        </div>
        <div class="who">
          <h2 class="char-name">{{ character.name ?? 'Sin nombre' }}</h2>
          <div class="tags">
            <span v-if="character.entity_name" class="badge">{{ character.entity_name }}</span>
            <span class="badge badge-accent" title="Configuración de mente de la que partió">Preset: {{ mind.preset }}</span>
            <span class="badge">{{ lineage }}</span>
          </div>
          <p v-if="character.description" class="description">{{ character.description }}</p>
          <p v-if="!editable" class="muted small">
            {{ character.kind === 'original'
              ? 'Los personajes originales no se editan desde acá.'
              : 'Esta ficha todavía no se puede editar: se habilita después del primer episodio.' }}
          </p>
        </div>
      </div>
    </PanelCard>

    <PanelCard
      title="Cómo está ahora"
      description="El ánimo actual de la mente y el estado físico que informa el juego."
    >
      <dl class="rows">
        <div>
          <dt>Ánimo</dt>
          <dd><span class="badge badge-accent">{{ moodLabel(mind.mood.dominant) }}</span> <span class="muted">{{ moodText }}</span></dd>
        </div>
        <div v-for="c in condition" :key="c.key">
          <dt>{{ c.label }}</dt>
          <dd>{{ c.value }}</dd>
        </div>
        <div>
          <dt>Necesidades</dt>
          <dd>
            <template v-if="needs.length">
              <span v-for="n in needs" :key="n.key" class="badge need">{{ label(NEEDS, n.key) }}</span>
            </template>
            <span v-else class="muted">Ninguna en el último episodio</span>
          </dd>
        </div>
      </dl>
    </PanelCard>

    <PanelCard title="En números">
      <dl class="stats">
        <div v-for="s in stats" :key="s.label">
          <dd>{{ s.value }}</dd>
          <dt>{{ s.label }}</dt>
        </div>
      </dl>
      <p v-if="lastEpisode" class="muted small last">
        Último episodio: #{{ lastEpisode.idx }} · {{ lastEpisode.date ?? 'sin fecha' }}
      </p>
    </PanelCard>

    <PanelCard
      v-if="character.foundational_phrase"
      title="Frase fundacional"
      description="El texto base que define la identidad del personaje para el narrador."
      class="span-2"
    >
      <blockquote class="phrase">{{ character.foundational_phrase }}</blockquote>
    </PanelCard>

    <PanelCard
      v-if="character.voice_instructions"
      title="Cómo habla"
      description="Instrucciones de voz que recibe el narrador."
      class="span-2"
    >
      <p class="prose">{{ character.voice_instructions }}</p>
    </PanelCard>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.span-2 { grid-column: span 2; }

.identity { display: flex; gap: 20px; align-items: flex-start; }
.portrait {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border-strong);
}
.placeholder {
  display: grid;
  place-items: center;
  background: var(--surface-2);
  font-size: 36px;
  font-weight: 600;
  color: var(--text-dim);
}
.who { display: grid; gap: 10px; min-width: 0; }
.char-name { font-size: 26px; font-weight: 600; letter-spacing: -0.01em; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.description { margin: 0; color: var(--text); max-width: 75ch; }
.small { font-size: 13px; margin: 0; }

.rows { display: grid; gap: 12px; margin: 0; }
.rows div { display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: baseline; }
.rows dt { color: var(--text-dim); font-size: 13px; }
.rows dd { margin: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
.need { color: var(--danger); border-color: rgba(224, 112, 124, 0.35); }

.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px; margin: 0; }
.stats dd { margin: 0; font-size: 26px; font-weight: 600; font-family: var(--mono); }
.stats dt { font-size: 13px; color: var(--text-dim); }
.last { margin-top: 16px; }

.phrase {
  margin: 0;
  padding-left: 16px;
  border-left: 2px solid var(--accent);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.65;
  white-space: pre-line;
  max-width: 75ch;
}
.prose { margin: 0; white-space: pre-line; max-width: 75ch; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: auto; }
}
</style>
