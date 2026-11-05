<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { patchConcerns } from '../../api'
import { concernLabel, KNOWN_CONCERNS } from '../../lib/labels'
import type { MindDetail } from '../../types'

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ saved: []; error: [message: string] }>()

const concerns = reactive<Record<string, number>>({ ...props.mind.concerns })
const adding = shallowRef('')

const available = computed(() => KNOWN_CONCERNS.filter((k) => !(k in concerns)))

async function save(weights: Record<string, number | null>) {
  try {
    await patchConcerns(props.mind.character_id, weights)
    emit('saved')
  } catch (e) {
    emit('error', (e as Error).message)
  }
}

function remove(key: string) {
  delete concerns[key]
  save({ [key]: null })
}

function add() {
  const key = adding.value
  if (!key) return
  concerns[key] = 0.5
  adding.value = ''
  save({ [key]: 0.5 })
}
</script>

<template>
  <ul v-if="Object.keys(concerns).length" class="list">
    <li v-for="(w, key) in concerns" :key="key">
      <div class="name">
        <span>{{ concernLabel(String(key)) }}</span>
        <code>{{ key }}</code>
      </div>
      <input
        v-model.number="concerns[key]"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :aria-label="`Importancia de ${concernLabel(String(key))}`"
        @change="save({ [key]: concerns[key]! })"
      />
      <span class="value">{{ Math.round(w * 100) }}</span>
      <button class="btn btn-ghost remove" title="Quitar" @click="remove(String(key))">Quitar</button>
    </li>
  </ul>
  <p v-else class="empty">No tiene temas destacados: presta la misma atención a todo.</p>

  <div class="add">
    <select v-model="adding" class="field">
      <option value="" disabled>Elegir un tema para agregar…</option>
      <option v-for="k in available" :key="k" :value="k">{{ concernLabel(k) }}</option>
    </select>
    <button class="btn" :disabled="!adding" @click="add">Agregar</button>
  </div>
</template>

<style scoped>
.list { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 4px; }
.list li {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 2fr 40px auto;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.name { display: grid; }
.name span { font-weight: 500; }
.value { font-family: var(--mono); font-size: 12px; color: var(--accent); text-align: right; }
.remove { padding: 4px 10px; font-size: 12px; }
.remove:hover { color: var(--danger); }
.add { display: flex; gap: 8px; max-width: 480px; margin-top: 12px; }
.add select { flex: 1; }
</style>
