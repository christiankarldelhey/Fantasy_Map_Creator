<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { patchCard } from '../api'
import { humanize, moodColor } from '../lib/format'
import type { CharacterCard, Mood } from '../types'

const props = defineProps<{
  character: CharacterCard
  characterId: string
  condition: Record<string, unknown>
  mood: Mood
  preset: string
  counts: { alive: number; forgotten: number; beliefs: number }
}>()

const emit = defineEmits<{ saved: [] }>()

const expanded = shallowRef(false)
const editing = shallowRef(false)
const saving = shallowRef(false)
const saveError = shallowRef<string | null>(null)
const draft = reactive({
  name: '',
  entity_name: '',
  portrait_url: '',
  description: '',
  description_es: '',
  foundational_phrase: '',
  voice_instructions: '',
})
const draftSkills = reactive<Record<string, number>>({})

// The authored source stays read-only — copies are what players shape.
const editable = computed(() => props.character.kind !== 'original')

function startEdit() {
  Object.assign(draft, {
    name: props.character.name ?? '',
    entity_name: props.character.entity_name ?? '',
    portrait_url: props.character.portrait_url ?? '',
    description: props.character.description ?? '',
    description_es: props.character.description_es ?? '',
    foundational_phrase: props.character.foundational_phrase ?? '',
    voice_instructions: props.character.voice_instructions ?? '',
  })
  Object.keys(draftSkills).forEach((k) => delete draftSkills[k])
  Object.assign(draftSkills, props.character.skills)
  saveError.value = null
  editing.value = true
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    await patchCard(props.characterId, {
      ...draft,
      skills: { ...draftSkills },
    })
    editing.value = false
    emit('saved')
  } catch (e) {
    saveError.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

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

const lineage = computed(() =>
  props.character.kind === 'original'
    ? 'original'
    : props.character.original
      ? `copia de ${props.character.original}`
      : 'copia',
)
</script>

<template>
  <aside class="card">
    <div class="portrait" aria-hidden="true">
      <img v-if="character.portrait_url" :src="character.portrait_url" :alt="character.name ?? ''" class="portrait-img" />
      <svg v-else viewBox="0 0 120 120">
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
    <p class="lineage">
      <span v-if="character.entity_name">{{ character.entity_name }}</span>
      <span class="kind">{{ lineage }}</span>
      <button v-if="editable && !editing" class="edit" @click="startEdit">editar ficha</button>
    </p>

    <div v-if="editing" class="editform">
      <label>nombre<input v-model="draft.name" /></label>
      <label>gente / tipo<input v-model="draft.entity_name" /></label>
      <label>retrato (url)<input v-model="draft.portrait_url" placeholder="https://…" /></label>
      <label>descripción<textarea v-model="draft.description" rows="3" /></label>
      <label>descripción (es)<textarea v-model="draft.description_es" rows="3" /></label>
      <label>frase fundacional<textarea v-model="draft.foundational_phrase" rows="4" /></label>
      <label>cómo habla<textarea v-model="draft.voice_instructions" rows="3" /></label>

      <fieldset class="skill-edit">
        <legend>lo que sabe hacer</legend>
        <label v-for="(v, k) in draftSkills" :key="k">
          <span>{{ humanize(String(k)) }}</span>
          <input v-model.number="draftSkills[k]" type="range" min="0" max="10" step="1" />
          <b>{{ v }}</b>
        </label>
      </fieldset>

      <p v-if="saveError" class="save-error">No se guardó: {{ saveError }}</p>
      <div class="edit-actions">
        <button class="save" :disabled="saving" @click="save">{{ saving ? 'guardando…' : 'guardar' }}</button>
        <button class="cancel" @click="editing = false">cancelar</button>
      </div>
    </div>

    <template v-else>
    <p v-if="character.description" class="description">{{ character.description }}</p>

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
    </template>
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
.portrait-img {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  object-fit: cover;
  margin: 4px;
  border: 1px solid var(--chalk-dim);
  filter: sepia(0.25) saturate(0.85);
}
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

.meta { display: flex; align-items: center; gap: 12px; margin: 0 0 6px; }
.mood { color: var(--chalk-dim); }
.mood b { color: var(--chalk); font-weight: 400; }

.lineage {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 11.5px;
  color: var(--chalk-dim);
  letter-spacing: 0.04em;
}
.lineage .kind { font-style: italic; font-family: var(--prose); }

.description {
  margin: 0 0 20px;
  font-family: var(--prose);
  font-size: 13px;
  line-height: 1.5;
  color: var(--chalk);
}

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

.edit {
  margin-left: auto;
  background: none;
  border: 1px dashed var(--chalk-faint);
  border-radius: 3px;
  padding: 2px 8px;
  color: var(--amber);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.edit:hover { border-color: var(--amber); }

.editform { display: grid; gap: 10px; }
.editform label {
  display: grid;
  gap: 3px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}
.editform input, .editform textarea {
  background: rgba(11, 17, 28, 0.7);
  border: 1px solid var(--chalk-faint);
  border-radius: 3px;
  color: var(--paper);
  font-family: var(--prose);
  font-size: 12.5px;
  padding: 6px 8px;
  resize: vertical;
}
.editform input:focus, .editform textarea:focus { outline: none; border-color: var(--amber); }

.skill-edit {
  border: 1px dashed var(--chalk-faint);
  border-radius: 3px;
  margin: 0;
  padding: 8px 10px 10px;
  display: grid;
  gap: 6px;
}
.skill-edit legend {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--chalk-dim);
  padding: 0 4px;
}
.skill-edit label {
  display: grid;
  grid-template-columns: 80px 1fr 18px;
  align-items: center;
  gap: 8px;
  text-transform: none;
  letter-spacing: 0;
}
.skill-edit input[type='range'] { accent-color: var(--amber); padding: 0; }
.skill-edit b { color: var(--amber); font-weight: 400; text-align: right; }

.save-error { color: var(--rose); font-size: 11.5px; margin: 0; }
.edit-actions { display: flex; gap: 10px; }
.save {
  background: var(--amber);
  border: 0;
  border-radius: 3px;
  color: var(--night);
  font-weight: 700;
  padding: 6px 14px;
  cursor: pointer;
}
.save:disabled { opacity: 0.5; cursor: default; }
.cancel {
  background: none;
  border: 0;
  color: var(--chalk-dim);
  text-decoration: underline dotted;
  cursor: pointer;
}
</style>
