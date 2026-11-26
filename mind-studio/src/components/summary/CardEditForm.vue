<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { patchCard } from '../../api'
import { t } from '../../lib/i18n'
import type { CharacterCard } from '../../types'

const props = defineProps<{ character: CharacterCard; characterId: string }>()
const emit = defineEmits<{ cancel: []; saved: [] }>()

const FIELDS = computed(() => [
  { key: 'name', label: t('card.name'), rows: 0 },
  { key: 'entity_name', label: t('card.entity'), rows: 0 },
  { key: 'portrait_url', label: t('card.portrait'), rows: 0 },
  { key: 'description', label: t('card.descEn'), rows: 3 },
  { key: 'description_es', label: t('card.descEs'), rows: 3 },
  { key: 'foundational_phrase', label: t('card.lens'), rows: 5 },
  { key: 'voice_instructions', label: t('card.voice'), rows: 3 },
] as const)

type Field = 'name' | 'entity_name' | 'portrait_url' | 'description'
  | 'description_es' | 'foundational_phrase' | 'voice_instructions'

const draft = reactive(
  Object.fromEntries(FIELDS.value.map((f) => [f.key, props.character[f.key] ?? ''])) as Record<Field, string>,
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
    <p v-if="error" class="error">{{ t('card.err', { err: error }) }}</p>
    <div class="actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('card.saving') : t('card.save') }}</button>
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">{{ t('card.cancel') }}</button>
    </div>
  </form>
</template>

<style scoped>
.form { display: grid; gap: 14px; max-width: 720px; }
label { display: grid; gap: 6px; }
label span { font-size: 13px; color: var(--text-dim); font-weight: 500; }
.actions { display: flex; gap: 8px; }
</style>
