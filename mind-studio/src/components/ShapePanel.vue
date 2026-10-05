<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import {
  deleteAccentPhrases,
  deleteAccentThreshold,
  fetchAccent,
  fetchVoice,
  patchConcerns,
  patchTraits,
  putAccentPhrases,
  putAccentThreshold,
} from '../api'
import { concernLabel, KNOWN_CONCERNS, percent } from '../lib/format'
import type { Accent, MindDetail } from '../types'

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

// 'Su acento' — this Mind's own way of saying things, overriding the
// World voice for its ears only (brain_nl_overrides, B7).
const accentData = shallowRef<Accent | null>(null)
const accentPhraseDrafts = reactive<Record<string, string>>({})
const accentKeys = shallowRef<{ key: string; kind: 'phrases' | 'threshold' }[]>([])
const newAccentKey = shallowRef('')
let accentWorld: { phrases: Record<string, string[]>; thresholds: Record<string, number> } =
  { phrases: {}, thresholds: {} }

fetchAccent(props.mind.character_id).then((a) => {
  accentData.value = a
  for (const [k, items] of Object.entries(a.phrases)) {
    accentPhraseDrafts[k] = items.join('\n')
  }
})
fetchVoice().then((v) => {
  accentWorld = {
    phrases: Object.fromEntries(
      Object.entries(v.phrases).map(([k, p]) => [k, p.items]),
    ),
    thresholds: Object.fromEntries(
      Object.entries(v.thresholds).map(([k, t]) => [k, t.value]),
    ),
  }
  accentKeys.value = [
    ...Object.keys(v.phrases).map((key) => ({ key, kind: 'phrases' as const })),
    ...Object.keys(v.thresholds).map((key) => ({ key, kind: 'threshold' as const })),
  ]
})

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

async function saveAccentPhrases(key: string) {
  const items = (accentPhraseDrafts[key] ?? '')
    .split('\n')
    .filter((p) => p.trim())
  try {
    accentData.value = await putAccentPhrases(
      props.mind.character_id, key, items,
    )
    accentPhraseDrafts[key] = items.join('\n')
    dirty.value = true
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function removeAccentPhrases(key: string) {
  try {
    accentData.value = await deleteAccentPhrases(props.mind.character_id, key)
    delete accentPhraseDrafts[key]
    dirty.value = true
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function saveAccentThreshold(key: string, ev: Event) {
  const value = Number((ev.target as HTMLInputElement).value)
  if (Number.isNaN(value)) return
  try {
    accentData.value = await putAccentThreshold(
      props.mind.character_id, key, value,
    )
    dirty.value = true
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function removeAccentThreshold(key: string) {
  try {
    accentData.value = await deleteAccentThreshold(props.mind.character_id, key)
    dirty.value = true
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function addAccent() {
  const key = newAccentKey.value.trim()
  if (!key) return
  // Prefill with the World's own words — the accent starts as a copy
  // the user then rewrites.
  if (accentWorld.phrases[key]) {
    accentPhraseDrafts[key] = accentWorld.phrases[key]!.join('\n')
    await saveAccentPhrases(key)
  } else if (accentWorld.thresholds[key] !== undefined) {
    try {
      accentData.value = await putAccentThreshold(
        props.mind.character_id, key, accentWorld.thresholds[key]!,
      )
      dirty.value = true
    } catch (e) {
      error.value = (e as Error).message
    }
  }
  newAccentKey.value = ''
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

      <section class="block">
        <h3 class="eyebrow">Su acento</h3>
        <p class="hint">
          Su propia manera de decir las cosas — solo para sus oídos;
          la voz del mundo queda igual para las demás mentes.
        </p>

        <div v-for="(_, key) in accentData?.phrases ?? {}" :key="key" class="accent-phrase">
          <div class="accent-head">
            <code>{{ key }}</code>
            <button class="drop" title="vuelve a hablar como el mundo" @click="removeAccentPhrases(String(key))">×</button>
          </div>
          <textarea v-model="accentPhraseDrafts[key]" rows="2"></textarea>
          <button class="mini save" @click="saveAccentPhrases(String(key))">guardar</button>
        </div>

        <div
          v-for="(value, key) in accentData?.thresholds ?? {}" :key="key"
          class="accent-threshold"
        >
          <code>{{ key }}</code>
          <input type="number" step="any" :value="value" @change="saveAccentThreshold(String(key), $event)" />
          <button class="drop" title="vuelve al umbral del mundo" @click="removeAccentThreshold(String(key))">×</button>
        </div>

        <div class="add">
          <input
            v-model="newAccentKey"
            list="accent-keys"
            placeholder="qué dice distinto… (night.calm)"
            @keyup.enter="addAccent"
          />
          <datalist id="accent-keys">
            <option v-for="k in accentKeys" :key="k.key" :value="k.key">{{ k.kind }}</option>
          </datalist>
          <button class="add-btn" :disabled="!newAccentKey.trim()" @click="addAccent">añadir</button>
        </div>
      </section>

      <details class="advanced">
        <summary>el cableado · {{ Object.keys(mind.wiring).length }} knobs</summary>
        <p class="hint">
          Solo lectura — los dials de arriba mueven varios knobs a la vez.
          Para tocarlos a mano está la API.
        </p>
        <ul>
          <li v-for="(v, k) in mind.wiring" :key="k">
            <code>{{ k }}</code><i>{{ typeof v === 'number' ? Number(v).toFixed(3) : v }}</i>
          </li>
        </ul>
      </details>
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

.accent-phrase { margin-bottom: 12px; }
.accent-head { display: flex; justify-content: space-between; align-items: center; }
.accent-head code, .accent-threshold code {
  font-family: var(--type); font-size: 10px; color: var(--chalk-dim);
}
.accent-phrase textarea {
  width: 100%; box-sizing: border-box; margin: 4px 0;
  background: rgba(11, 17, 28, 0.7); border: 1px solid var(--chalk-faint);
  border-radius: 3px; color: var(--paper); font-family: var(--prose);
  font-style: italic; font-size: 12px; padding: 5px 7px; resize: vertical;
}
.accent-phrase .mini, .mini.save {
  background: none; border: 1px solid var(--chalk-faint); border-radius: 3px;
  color: var(--amber); font-family: var(--type); font-size: 10px;
  padding: 2px 10px; cursor: pointer;
}
.accent-threshold {
  display: grid; grid-template-columns: 1fr 76px 18px;
  align-items: center; gap: 8px; padding: 4px 0;
}
.accent-threshold input {
  background: rgba(11, 17, 28, 0.7); border: 1px solid var(--chalk-faint);
  border-radius: 3px; color: var(--paper); font-family: var(--type);
  font-size: 11px; padding: 3px 6px;
}

.advanced { border-top: 1px dashed var(--chalk-faint); padding-top: 14px; }
.advanced summary {
  cursor: pointer;
  font-family: var(--type);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}
.advanced ul {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  columns: 2;
  column-gap: 18px;
}
.advanced li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-family: var(--type);
  font-size: 9.5px;
  color: var(--chalk-dim);
  break-inside: avoid;
  padding: 1px 0;
}
.advanced li i { font-style: normal; color: var(--chalk); }
</style>
