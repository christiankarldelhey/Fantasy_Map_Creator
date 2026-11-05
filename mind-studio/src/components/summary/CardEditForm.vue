<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { patchCard } from '../../api'
import type { CharacterCard } from '../../types'

const props = defineProps<{ character: CharacterCard; characterId: string }>()
const emit = defineEmits<{ cancel: []; saved: [] }>()

const FIELDS = [
  { key: 'name', label: 'Nombre', rows: 0 },
  { key: 'entity_name', label: 'Pueblo o tipo', rows: 0 },
  { key: 'portrait_url', label: 'Retrato (URL de imagen)', rows: 0 },
  { key: 'description', label: 'Descripción', rows: 3 },
  { key: 'description_es', label: 'Descripción en español', rows: 3 },
  { key: 'foundational_phrase', label: 'Frase fundacional', rows: 5 },
  { key: 'voice_instructions', label: 'Cómo habla', rows: 3 },
] as const

type Field = (typeof FIELDS)[number]['key']

const draft = reactive(
  Object.fromEntries(FIELDS.map((f) => [f.key, props.character[f.key] ?? ''])) as Record<Field, string>,
)
const saving = shallowRef(false)
const error = shallowRef<string | null>(null)

async function save() {
  saving.value = true
  error.value = null
  try {
    await patchCard(props.characterId, { ...draft })
    emit('saved')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="save">
    <label v-for="f in FIELDS" :key="f.key">
      <span>{{ f.label }}</span>
      <textarea v-if="f.rows" v-model="draft[f.key]" class="field" :rows="f.rows" />
      <input v-else v-model="draft[f.key]" class="field" />
    </label>
    <p v-if="error" class="error">No se guardó: {{ error }}</p>
    <div class="actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.form { display: grid; gap: 14px; max-width: 720px; }
label { display: grid; gap: 6px; }
label span { font-size: 13px; color: var(--text-dim); font-weight: 500; }
.actions { display: flex; gap: 8px; }
</style>
