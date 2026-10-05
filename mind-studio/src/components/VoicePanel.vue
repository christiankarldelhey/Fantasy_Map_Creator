<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import {
  deleteBandTable,
  deleteFacet,
  deletePhrases,
  deleteThreshold,
  fetchVoice,
  putBandTable,
  putFacet,
  putPhrases,
  putThreshold,
} from '../api'
import {
  domainLabel,
  groupByDomain,
  humanize,
  voiceKeyLabel,
} from '../lib/format'
import type { VoiceBand, VoicePack } from '../types'

// 'La voz del mundo' — how the Host's numbers and data become words.
// Every section edits the game pack; a key with stored rows overrides
// the built-in default wholesale, so reverting just deletes the rows.

const emit = defineEmits<{ close: [] }>()

const voice = shallowRef<VoicePack | null>(null)
const error = shallowRef<string | null>(null)
const filter = shallowRef('')

// Drafts: bands and phrase banks edit locally, then PUT the whole key.
const bandDrafts = reactive<Record<string, VoiceBand[]>>({})
const phraseDrafts = reactive<Record<string, string>>({})

fetchVoice().then((v) => {
  voice.value = v
  for (const [table, b] of Object.entries(v.bands)) {
    bandDrafts[table] = b.rows.map((r) => ({ ...r }))
  }
  for (const [key, p] of Object.entries(v.phrases)) {
    phraseDrafts[key] = p.items.join('\n')
  }
})

function fail(e: unknown) {
  error.value = (e as Error).message
}

const matches = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return (key: string, extra = '') =>
    !q || key.toLowerCase().includes(q) || extra.toLowerCase().includes(q)
})

const bandTables = computed(() =>
  Object.entries(voice.value?.bands ?? {}).filter(([t, b]) =>
    matches.value(t, b.rows.map((r) => r.phrase ?? '').join(' ')),
  ),
)
const thresholdGroups = computed(() =>
  groupByDomain(voice.value?.thresholds ?? {})
    .map(([d, items]) => [
      d,
      items.filter(([k]) => matches.value(k)),
    ] as [string, [string, { value: number; custom: boolean }][]])
    .filter(([, items]) => items.length),
)
const phraseGroups = computed(() =>
  groupByDomain(voice.value?.phrases ?? {})
    .map(([d, items]) => [
      d,
      items.filter(([k, p]) => matches.value(k, p.items.join(' '))),
    ] as [string, [string, { items: string[]; custom: boolean }][]])
    .filter(([, items]) => items.length),
)
const facets = computed(() =>
  (voice.value?.facets ?? []).filter((f) =>
    matches.value(`${f.event_type}.${f.field_path}`, f.description ?? ''),
  ),
)

async function saveBandTable(table: string) {
  try {
    await putBandTable(table, bandDrafts[table] ?? [])
    const v = await fetchVoice()
    voice.value = v
    bandDrafts[table] = v.bands[table]?.rows.map((r) => ({ ...r })) ?? []
  } catch (e) { fail(e) }
}

async function revertBandTable(table: string) {
  try {
    await deleteBandTable(table)
    const v = await fetchVoice()
    voice.value = v
    bandDrafts[table] = v.bands[table]?.rows.map((r) => ({ ...r })) ?? []
  } catch (e) { fail(e) }
}

async function saveThreshold(key: string, ev: Event) {
  const value = Number((ev.target as HTMLInputElement).value)
  if (Number.isNaN(value)) return
  try {
    await putThreshold(key, value)
    if (voice.value) voice.value.thresholds[key] = { value, custom: true }
  } catch (e) { fail(e) }
}

async function revertThreshold(key: string) {
  try {
    const updated = await deleteThreshold(key)
    if (voice.value) {
      const t = (updated as Record<string, { value: number; custom: boolean }>)[key]
      if (t) voice.value.thresholds[key] = t
    }
  } catch (e) { fail(e) }
}

async function savePhrases(key: string) {
  const items = (phraseDrafts[key] ?? '').split('\n').filter((p) => p.trim())
  try {
    await putPhrases(key, items)
    if (voice.value) voice.value.phrases[key] = { items, custom: true }
  } catch (e) { fail(e) }
}

async function revertPhrases(key: string) {
  try {
    const updated = await deletePhrases(key)
    const v = await fetchVoice()
    voice.value = v
    phraseDrafts[key] = v.phrases[key]?.items.join('\n') ?? ''
    void updated
  } catch (e) { fail(e) }
}

async function saveFacet(
  f: { event_type: string; field_path: string; unit: string | null; description: string | null },
) {
  try {
    await putFacet(f.event_type, f.field_path, {
      unit: f.unit, description: f.description,
    })
    if (voice.value) {
      const row = voice.value.facets.find(
        (x) => x.event_type === f.event_type && x.field_path === f.field_path,
      )
      if (row) row.custom = true
    }
  } catch (e) { fail(e) }
}

async function revertFacet(f: { event_type: string; field_path: string }) {
  try {
    await deleteFacet(f.event_type, f.field_path)
    voice.value = await fetchVoice()
  } catch (e) { fail(e) }
}
</script>

<template>
  <div class="veil" @click.self="emit('close')">
    <aside class="sheet">
      <header class="head">
        <div>
          <h2>la voz del mundo</h2>
          <p class="sub">
            cómo los números y los datos del mundo se vuelven palabras —
            vale para todas las mentes de este juego
          </p>
        </div>
        <button class="close" @click="emit('close')">hecho</button>
      </header>

      <input
        v-model="filter"
        class="search"
        placeholder="filtrar… (hambre, clima, puente)"
      />
      <p v-if="error" class="err">No se guardó: {{ error }}</p>
      <p v-if="!voice" class="hint">leyendo la voz…</p>

      <template v-if="voice">
        <details class="block" open>
          <summary>cómo se dicen los números</summary>
          <p class="hint">
            El primer tramo donde cae el valor dice su frase.
          </p>
          <details v-for="[table, band] in bandTables" :key="table" class="sub">
            <summary>
              {{ humanize(table) }}
              <i v-if="band.custom" class="badge">propia</i>
              <button
                v-if="band.custom" class="revert" title="volver al idioma por defecto"
                @click.prevent="revertBandTable(table)"
              >por defecto</button>
            </summary>
            <div class="band-rows">
              <div v-for="(row, i) in bandDrafts[table]" :key="i" class="band-row">
                <span class="when">
                  <template v-if="row.above_m !== null">desde</template>
                  <template v-else-if="row.below !== null">menos de</template>
                  <template v-else>en adelante</template>
                  <input
                    v-if="row.above_m !== null" v-model.number="row.above_m" type="number" step="any"
                  />
                  <input
                    v-else-if="row.below !== null" v-model.number="row.below" type="number" step="any"
                  />
                </span>
                <input v-model="row.phrase" class="phrase" placeholder="cómo se dice…" />
                <button class="drop" @click="bandDrafts[table]!.splice(i, 1)">×</button>
              </div>
              <div class="row-actions">
                <button
                  class="mini"
                  @click="bandDrafts[table]!.push({ below: null, above_m: null, phrase: '', phrases: null })"
                >+ fila</button>
                <button class="mini save" @click="saveBandTable(table)">guardar</button>
              </div>
            </div>
          </details>
        </details>

        <details class="block">
          <summary>umbrales — cuándo el número se vuelve palabra</summary>
          <details v-for="[domain, items] in thresholdGroups" :key="domain" class="sub">
            <summary>{{ domainLabel(domain) }}</summary>
            <div v-for="[key, t] in items" :key="key" class="kv-row">
              <span class="k" :title="key">{{ voiceKeyLabel(key) }}</span>
              <input
                type="number" step="any" :value="t.value"
                @change="saveThreshold(key, $event)"
              />
              <i v-if="t.custom" class="badge">propio</i>
              <button
                v-if="t.custom" class="revert" @click="revertThreshold(key)"
              >×</button>
            </div>
          </details>
        </details>

        <details class="block">
          <summary>las frases — qué palabras usa</summary>
          <details v-for="[domain, items] in phraseGroups" :key="domain" class="sub">
            <summary>{{ domainLabel(domain) }} <i>{{ items.length }}</i></summary>
            <details v-for="[key, p] in items" :key="key" class="leaf">
              <summary>
                {{ voiceKeyLabel(key) }}
                <i v-if="p.custom" class="badge">propia</i>
                <button
                  v-if="p.custom" class="revert" @click.prevent="revertPhrases(key)"
                >por defecto</button>
              </summary>
              <textarea
                v-model="phraseDrafts[key]" rows="3"
                placeholder="una frase por línea — elige una al azar"
              ></textarea>
              <button class="mini save" @click="savePhrases(key)">guardar</button>
            </details>
          </details>
        </details>

        <details class="block">
          <summary>lo que la mente lee</summary>
          <p class="hint">
            Los campos del evento que la mente convierte en noticia.
          </p>
          <div v-for="f in facets" :key="`${f.event_type}.${f.field_path}`" class="facet-row">
            <span class="k">{{ f.event_type }}·{{ humanize(f.field_path) }}</span>
            <input v-model="f.unit" placeholder="unidad" @change="saveFacet(f)" />
            <input
              v-model="f.description" placeholder="qué es" class="desc"
              @change="saveFacet(f)"
            />
            <i v-if="f.custom" class="badge">propio</i>
            <button v-if="f.custom" class="revert" @click="revertFacet(f)">×</button>
          </div>
        </details>
      </template>
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
  width: 520px;
  max-width: 94vw;
  height: 100%;
  overflow-y: auto;
  padding: 26px 26px 40px;
  background: linear-gradient(180deg, rgba(17, 26, 41, 0.97), rgba(11, 17, 28, 0.97));
  border-left: 1px solid var(--chalk-faint);
  animation: slide-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);
}
@keyframes slide-in { from { transform: translateX(40px); opacity: 0; } }

.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.head h2 { margin: 0; font-family: var(--display); font-weight: 400; font-size: 30px; color: var(--paper); }
.sub { margin: 4px 0 0; font-family: var(--prose); font-style: italic; font-size: 12.5px; color: var(--chalk-dim); }
.close {
  background: none; border: 1px solid var(--chalk-faint); border-radius: 3px;
  color: var(--amber); padding: 4px 12px; cursor: pointer;
  font-family: var(--type); font-size: 11px; letter-spacing: 0.08em;
}
.err { color: var(--rose); font-size: 12px; }
.hint { font-family: var(--prose); font-style: italic; font-size: 12px; color: var(--chalk-dim); margin: 0 0 10px; }

.search {
  width: 100%; box-sizing: border-box; margin-bottom: 16px;
  background: rgba(11, 17, 28, 0.7); border: 1px dashed var(--chalk-faint);
  border-radius: 3px; color: var(--paper); font-family: var(--type);
  font-size: 11.5px; padding: 6px 8px;
}

.block { border-top: 1px dashed var(--chalk-faint); padding: 12px 0; }
.block > summary {
  cursor: pointer; font-family: var(--type); font-size: 10px;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--chalk-dim);
}
.sub { margin: 6px 0 4px 8px; }
.sub > summary, .leaf > summary {
  cursor: pointer; font-size: 12px; color: var(--chalk); padding: 3px 0;
}
.sub > summary i { color: var(--chalk-dim); font-style: normal; font-size: 10px; }
.leaf { margin-left: 14px; }

.badge {
  font-style: normal; font-size: 9px; color: var(--tangerine);
  border: 1px solid var(--tangerine); border-radius: 2px;
  padding: 0 4px; margin-left: 6px; letter-spacing: 0.05em;
}
.revert {
  background: none; border: 0; color: var(--chalk-dim); cursor: pointer;
  font-size: 10px; text-decoration: underline; padding: 0 4px;
}
.revert:hover { color: var(--rose); }

input, textarea {
  background: rgba(11, 17, 28, 0.7); border: 1px solid var(--chalk-faint);
  border-radius: 3px; color: var(--paper); font-family: var(--prose);
  font-size: 12px; padding: 4px 6px;
}
input[type='number'] { width: 72px; font-family: var(--type); font-size: 11px; }
textarea { width: 100%; box-sizing: border-box; resize: vertical; margin: 4px 0; }

.band-rows { display: grid; gap: 6px; margin: 6px 0 10px 8px; }
.band-row { display: grid; grid-template-columns: 150px 1fr 18px; align-items: center; gap: 8px; }
.when { font-size: 10px; color: var(--chalk-dim); display: flex; align-items: center; gap: 5px; }
.when input { width: 60px; }
.phrase { width: 100%; box-sizing: border-box; font-style: italic; }
.drop { background: none; border: 0; color: var(--chalk-dim); cursor: pointer; font-size: 15px; padding: 0; }
.drop:hover { color: var(--rose); }
.row-actions { display: flex; gap: 10px; justify-content: flex-end; }

.kv-row { display: grid; grid-template-columns: 1fr 80px auto auto; align-items: center; gap: 8px; padding: 2px 0 2px 8px; }
.kv-row .k, .facet-row .k { font-size: 11.5px; color: var(--chalk); }
.facet-row { display: grid; grid-template-columns: 130px 60px 1fr auto auto; align-items: center; gap: 6px; padding: 3px 0 3px 8px; }
.facet-row input { font-size: 10.5px; padding: 3px 5px; }
.facet-row .desc { width: 100%; box-sizing: border-box; }

.mini {
  background: none; border: 1px dashed var(--chalk-faint); border-radius: 3px;
  color: var(--chalk); font-family: var(--type); font-size: 10px;
  padding: 3px 10px; cursor: pointer;
}
.mini.save { color: var(--amber); border-style: solid; }
.mini:hover { border-color: var(--amber); color: var(--amber); }
</style>
