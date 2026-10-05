<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { patchConcerns, patchTraits } from '../api'
import { concernLabel, KNOWN_CONCERNS, percent } from '../lib/format'
import type { MindDetail } from '../types'

// 'Dar forma' — the Mind's six dials and what weighs on it. Writes land
// per change; the parent refreshes the mind when the sheet closes.

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const ORDER = ['memoria', 'atencion', 'piel', 'rumia', 'costumbre', 'conviccion']

const traits = reactive<Record<string, number>>(
  Object.fromEntries(
    ORDER.map((k) => [k, props.mind.traits[k]?.value ?? 0.5]),
  ),
)
const concerns = reactive<Record<string, number>>({ ...props.mind.concerns })
const newConcern = shallowRef('')
const error = shallowRef<string | null>(null)
const dirty = shallowRef(false)

async function saveTrait(key: string) {
  try {
    await patchTraits(props.mind.character_id, { [key]: traits[key]! })
    dirty.value = true
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function saveConcern(key: string) {
  try {
    await patchConcerns(props.mind.character_id, { [key]: concerns[key]! })
    dirty.value = true
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function removeConcern(key: string) {
  delete concerns[key]
  try {
    await patchConcerns(props.mind.character_id, { [key]: null })
    dirty.value = true
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function addConcern() {
  const key = newConcern.value.trim()
  if (!key) return
  concerns[key] = concerns[key] ?? 0.5
  newConcern.value = ''
  await saveConcern(key)
}

function close() {
  if (dirty.value) emit('saved')
  emit('close')
}
</script>

<template>
  <div class="veil" @click.self="close">
    <aside class="sheet">
      <header class="head">
        <div>
          <h2>dar forma a esta mente</h2>
          <p class="sub">
            {{ mind.character.name ?? mind.character_id }} · preset «{{ mind.preset }}»
            — los cambios valen para los episodios que vienen
          </p>
        </div>
        <button class="close" @click="close">hecho</button>
      </header>

      <p v-if="error" class="err">No se guardó: {{ error }}</p>

      <section class="block">
        <h3 class="eyebrow">Cómo es</h3>
        <div v-for="key in ORDER" :key="key" class="trait">
          <div class="trait-head">
            <span class="trait-name">{{ mind.traits[key]?.label ?? key }}</span>
            <span class="trait-help">{{ mind.traits[key]?.help }}</span>
          </div>
          <div class="dial">
            <span class="pole">{{ mind.traits[key]?.low }}</span>
            <input
              v-model.number="traits[key]"
              type="range" min="0" max="1" step="0.05"
              @change="saveTrait(key)"
            />
            <span class="pole">{{ mind.traits[key]?.high }}</span>
          </div>
        </div>
      </section>

      <section class="block">
        <h3 class="eyebrow">Le pesa</h3>
        <p class="hint">
          Lo que esta mente nota y recuerda por encima de lo demás — no dice
          si le gusta o le da miedo, solo que pesa.
        </p>
        <ul class="concerns">
          <li v-for="(w, key) in concerns" :key="key">
            <div class="c-label">
              <span>{{ concernLabel(String(key)) }}</span>
              <code>{{ key }}</code>
            </div>
            <input
              v-model.number="concerns[key]"
              type="range" min="0" max="1" step="0.05"
              @change="saveConcern(String(key))"
            />
            <b>{{ percent(w) }}</b>
            <button class="drop" title="deja de pesarle" @click="removeConcern(String(key))">×</button>
          </li>
        </ul>
        <div class="add">
          <input
            v-model="newConcern"
            list="known-concerns"
            placeholder="algo que le pese… (tag:entity_type:undead)"
            @keyup.enter="addConcern"
          />
          <datalist id="known-concerns">
            <option v-for="k in KNOWN_CONCERNS" :key="k" :value="k">{{ concernLabel(k) }}</option>
          </datalist>
          <button class="add-btn" :disabled="!newConcern.trim()" @click="addConcern">añadir</button>
        </div>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.veil {
  position: fixed;
  inset: 0;
  background: rgba(6, 10, 16, 0.65);
  display: flex;
  justify-content: flex-end;
  z-index: 30;
}
.sheet {
  width: 420px;
  max-width: 92vw;
  height: 100%;
  overflow-y: auto;
  padding: 26px 26px 40px;
  background: linear-gradient(180deg, rgba(17, 26, 41, 0.97), rgba(11, 17, 28, 0.97));
  border-left: 1px solid var(--chalk-faint);
  animation: slide-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);
}
@keyframes slide-in { from { transform: translateX(40px); opacity: 0; } }

.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.head h2 { margin: 0; font-family: var(--display); font-weight: 400; font-size: 30px; color: var(--paper); }
.sub { margin: 4px 0 0; font-family: var(--prose); font-style: italic; font-size: 12.5px; color: var(--chalk-dim); }
.close {
  background: none;
  border: 1px solid var(--chalk-faint);
  border-radius: 3px;
  color: var(--amber);
  padding: 4px 12px;
  cursor: pointer;
  font-family: var(--type);
  font-size: 11px;
  letter-spacing: 0.08em;
}
.err { color: var(--rose); font-size: 12px; }

.block { margin-bottom: 30px; }
.block .eyebrow { margin-bottom: 10px; }

.trait { margin-bottom: 16px; }
.trait-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 2px; }
.trait-name { font-family: var(--display); font-size: 19px; color: var(--paper); }
.trait-help { font-family: var(--prose); font-style: italic; font-size: 11.5px; color: var(--chalk-dim); text-align: right; }
.dial { display: grid; grid-template-columns: 1fr 2fr 1fr; align-items: center; gap: 10px; }
.pole { font-size: 10px; color: var(--chalk-dim); letter-spacing: 0.04em; }
.pole:last-child { text-align: right; }
.dial input[type='range'] { width: 100%; accent-color: var(--amber); }

.hint { font-family: var(--prose); font-style: italic; font-size: 12px; color: var(--chalk-dim); margin: 0 0 12px; }

.concerns { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 10px; }
.concerns li {
  display: grid;
  grid-template-columns: 130px 1fr 34px 18px;
  align-items: center;
  gap: 10px;
}
.c-label { display: grid; }
.c-label span { color: var(--chalk); font-size: 12px; }
.c-label code { font-family: var(--type); font-size: 9.5px; color: var(--chalk-dim); }
.concerns input[type='range'] { width: 100%; accent-color: var(--amber); }
.concerns b { color: var(--amber); font-weight: 400; font-size: 11px; text-align: right; }
.drop {
  background: none; border: 0; color: var(--chalk-dim);
  font-size: 16px; cursor: pointer; padding: 0 2px;
}
.drop:hover { color: var(--rose); }

.add { display: flex; gap: 8px; }
.add input {
  flex: 1;
  background: rgba(11, 17, 28, 0.7);
  border: 1px dashed var(--chalk-faint);
  border-radius: 3px;
  color: var(--paper);
  font-family: var(--type);
  font-size: 11.5px;
  padding: 6px 8px;
}
.add-btn {
  background: none;
  border: 1px solid var(--chalk-faint);
  border-radius: 3px;
  color: var(--amber);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 11px;
}
.add-btn:disabled { opacity: 0.4; cursor: default; }
</style>
