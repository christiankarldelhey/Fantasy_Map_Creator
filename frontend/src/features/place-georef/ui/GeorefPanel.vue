<template>
  <div v-if="georef.enabled.value" class="georef-root">
    <!-- Left: list / carousel -->
    <aside class="georef-panel georef-list">
      <div class="row">
        <button :class="{ on: georef.mode.value === 'position' }" @click="georef.mode.value = 'position'">
          Pendientes ({{ georef.pending.value.length }})
        </button>
        <button :class="{ on: georef.mode.value === 'edit' }" @click="georef.mode.value = 'edit'">
          Posicionadas ({{ georef.positioned.value.length }})
        </button>
      </div>
      <div v-if="georef.regionFilter.value" class="filter-chip">
        región: {{ georef.regionFilter.value.name }}
        <button @click="georef.regionFilter.value = null">✕</button>
      </div>
      <div class="row">
        <button @click="georef.step(-1)">‹</button>
        <span class="count">{{ georef.activeIndex.value + 1 || 0 }}/{{ georef.list.value.length }}</span>
        <button @click="georef.step(1)">›</button>
      </div>
      <ul class="items">
        <li
          v-for="p in georef.list.value" :key="p.id"
          :class="{ sel: p.id === georef.activePlace.value?.id }"
          @click="georef.selectPlace(p)"
        >
          <b>{{ p.id }}</b> {{ p.name }}
        </li>
      </ul>
    </aside>

    <!-- Right: ficha read + edit form -->
    <aside v-if="georef.activePlace.value" class="georef-panel georef-editor">
      <header>
        <b>{{ georef.activePlace.value.id }}</b>
        <span>{{ txt(georef.activePlace.value.payload?.name) || georef.activePlace.value.name }}</span>
      </header>

      <!-- Ficha data (read only, scrollable) -->
      <section class="ficha">
        <p v-if="txt(georef.activePlace.value.payload?.type)" class="meta">
          {{ txt(georef.activePlace.value.payload?.type) }}
          <span v-if="georef.activePlace.value.tags?.length">· {{ georef.activePlace.value.tags.join(', ') }}</span>
        </p>
        <p v-if="txt(georef.activePlace.value.payload?.anchor_hint)" class="anchor">
          ⌖ {{ txt(georef.activePlace.value.payload?.anchor_hint) }}
          <template v-if="georef.activePlace.value.payload?.location_ref">
            · location {{ georef.activePlace.value.payload.location_ref.id }} {{ georef.activePlace.value.payload.location_ref.name }}
          </template>
          <template v-if="georef.activePlace.value.payload?.approx_point">
            <br />
            <button class="approx" @click="georef.useApproxPoint()">
              ir a {{ georef.activePlace.value.payload.approx_point.lon }}, {{ georef.activePlace.value.payload.approx_point.lat }}
            </button>
            <span class="hint">{{ georef.activePlace.value.payload.approx_point.basis }}</span>
          </template>
        </p>
        <p v-if="metaLine" class="meta">{{ metaLine }}</p>
        <p v-if="txt(georef.activePlace.value.payload?.note)"><i>{{ txt(georef.activePlace.value.payload?.note) }}</i></p>
        <p v-if="txt(georef.activePlace.value.payload?.lore)"><i>{{ txt(georef.activePlace.value.payload?.lore) }}</i></p>
        <p v-if="txt(georef.activePlace.value.payload?.base_lore)">{{ txt(georef.activePlace.value.payload?.base_lore) }}</p>
        <p v-if="txt(georef.activePlace.value.payload?.base)">{{ txt(georef.activePlace.value.payload?.base) }}</p>
        <div v-for="(s, i) in sections" :key="`s${i}`" class="block">
          <b>{{ txt(s.label) || s.id }}</b>
          <p>{{ txt(s.text) }}</p>
        </div>
        <div v-for="(v, i) in variants" :key="i" class="block">
          <b>{{ txt(v.label) }}</b>
          <p>{{ txt(v.text) }}</p>
        </div>
        <div v-if="txt(georef.activePlace.value.payload?.secret)" class="block">
          <b>Secreto</b>
          <p>{{ txt(georef.activePlace.value.payload?.secret) }}</p>
        </div>
        <div v-for="(o, i) in options" :key="`o${i}`" class="block">
          <b>◈ {{ txt(o.id) }}</b>
          <p>{{ txt(o.result) }}</p>
        </div>
        <div v-for="(b, i) in beats" :key="`b${i}`" class="block">
          <b>♦ {{ b.key || b.id || 'beat' }}</b>
          <p>{{ txt(b.text || b) }}</p>
        </div>
        <div v-if="refsText" class="block"><b>refs</b><p class="meta">{{ refsText }}</p></div>
        <div v-if="depictionsText" class="block"><b>depicts</b><p class="meta">{{ depictionsText }}</p></div>
        <p v-if="scopeLine" class="meta">{{ scopeLine }}</p>
        <details class="raw">
          <summary>JSON completo</summary>
          <pre>{{ rawPayload }}</pre>
        </details>
      </section>

      <!-- Editable -->
      <section class="form">
        <label>Region
          <select v-model.number="georef.draft.value.region_id">
            <option :value="null">—</option>
            <option v-for="r in regionOptions" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
          <span v-if="georef.clickRegion.value" class="hint">click: {{ georef.clickRegion.value.name }}</span>
        </label>
        <label>size_radius km
          <input type="number" step="0.1" min="0" v-model.number="georef.draft.value.size_radius_km" />
        </label>
        <label>influence_radius km
          <input type="number" step="1" min="0" v-model.number="georef.draft.value.influence_radius_km" />
        </label>

        <template v-if="georef.mode.value === 'position'">
          <label>type
            <select v-model="georef.draft.value.location_type">
              <option :value="null">—</option>
              <option v-for="t in locationTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label>custom type
            <input type="text" v-model="georef.draft.value.custom_type" placeholder="(si no está en la lista)" />
          </label>
          <label>location name
            <input type="text" v-model="georef.draft.value.loc_name" />
          </label>
          <label>description <span class="hint">(opcional)</span>
            <textarea rows="2" v-model="georef.draft.value.description"></textarea>
          </label>
          <label>visible_in_map
            <select v-model="georef.draft.value.visible_in_map">
              <option :value="false">false</option>
              <option :value="true">true</option>
            </select>
          </label>
        </template>

        <!-- Candidates -->
        <div v-if="georef.candidates.value.length" class="candidates">
          <b>Candidatas ({{ georef.candidates.value.length }})</b>
          <div v-for="c in georef.candidates.value" :key="c.id" class="cand">
            <span>
              {{ c.name }} <i>{{ c.location_type }}</i> — {{ c.distance_km }}km
              <template v-if="c.anchored_places">· {{ c.anchored_places }} fichas</template>
            </span>
            <button :disabled="georef.saving.value" @click="georef.saveAdopt(c)">es esta</button>
          </div>
        </div>

        <div class="actions">
          <button
            v-if="georef.mode.value === 'position'"
            :disabled="georef.saving.value || georef.draft.value.lon === null"
            @click="georef.saveCreate()"
          >crear nueva</button>
          <button
            v-else
            :disabled="georef.saving.value"
            @click="georef.saveEdit()"
          >guardar</button>
        </div>
        <p v-if="georef.error.value" class="err">{{ georef.error.value }}</p>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { usePlaceGeoref } from '../model/usePlaceGeoref'

const props = defineProps<{
  georef: ReturnType<typeof usePlaceGeoref>
  regionOptions: { id: number; name: string }[]
  locationTypes: string[]
}>()

/** Bilingual field → display string (es first, en fallback, raw otherwise). */
function txt(field: unknown): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (typeof field === 'object') {
    const f = field as Record<string, unknown>
    return (f.es as string) || (f.en as string) || ''
  }
  return String(field)
}

function payloadList(key: string): Record<string, any>[] {
  const active = props.georef.activePlace.value?.payload as Record<string, unknown> | undefined
  const v = active?.[key]
  return Array.isArray(v) ? v : []
}
// variants is a real column since #106; options/beats/sections stay in payload.
const variants = computed(() => props.georef.activePlace.value?.variants ?? [])
const options = computed(() => payloadList('options'))
const beats = computed(() => payloadList('beats'))
const sections = computed(() => payloadList('sections'))

/** Small facts line: kind, region, channel, traveller_use. */
const metaLine = computed(() => {
  const p = props.georef.activePlace.value?.payload as Record<string, unknown> | undefined
  if (!p) return ''
  const parts = [
    p.kind, p.region,
    p.channel ? `canal: ${p.channel}` : null,
    txt(p.traveller_use) ? `uso: ${txt(p.traveller_use)}` : null,
  ].filter(Boolean)
  return parts.join(' · ')
})

/** Geo/biome/road references used by anchor hints (refs column since #106). */
const refsText = computed(() => {
  const a = props.georef.activePlace.value
  const p = a?.payload as Record<string, unknown> | undefined
  if (!a?.refs && !p?.geo) return ''
  return JSON.stringify(a.refs ?? p.geo)
})

/** Features this record depicts (depiction_id bindings, ADR-0014). */
const depictionsText = computed(() => {
  const d = props.georef.activePlace.value?.depictions as
    | { table: string; id: number; name: string }[]
    | undefined
  if (!d?.length) return ''
  return d.map((x) => `${x.table}:${x.id} ${x.name || ''}`).join(' · ')
})

/** Scope columns on the record: type, region, cultural_family, priority. */
const scopeLine = computed(() => {
  const p = props.georef.activePlace.value
  if (!p) return ''
  const parts = [
    p.type ? `type: ${p.type}` : null,
    p.region_id != null ? `region: ${p.region_id}` : null,
    p.cultural_family ? `family: ${p.cultural_family}` : null,
    p.priority != null ? `priority: ${p.priority}` : null,
  ].filter(Boolean)
  return parts.join(' · ')
})

const rawPayload = computed(() =>
  JSON.stringify(props.georef.activePlace.value?.payload ?? {}, null, 1))
</script>

<script lang="ts">
export default { name: 'GeorefPanel' }
</script>

<style scoped>
.georef-root {
  position: absolute; inset: 0; pointer-events: none; z-index: 10000;
  display: flex; justify-content: space-between;
}
.georef-panel {
  pointer-events: auto; background: #fffdf5; border: 1px solid #b8a67a;
  margin: 12px; padding: 10px; font: 13px/1.4 serif; color: #2b2015;
  overflow-y: auto; box-shadow: 0 2px 10px rgba(0,0,0,.25);
}
.georef-list { width: 240px; }
.georef-editor { width: 340px; }
.row { display: flex; gap: 6px; margin-bottom: 6px; }
.row button { flex: 1; border: 1px solid #b8a67a; background: #f5eeda; padding: 3px 6px; cursor: pointer; }
.row button.on { background: #7c3aed; color: #fff; }
.count { flex: 1; text-align: center; align-self: center; }
.filter-chip {
  display: flex; justify-content: space-between; align-items: center;
  background: #ead9ff; border: 1px solid #7c3aed; padding: 2px 6px;
  margin-bottom: 6px; font-size: 12px;
}
.filter-chip button { border: 0; background: none; cursor: pointer; font-weight: bold; }
.items { list-style: none; margin: 0; padding: 0; }
.items li { padding: 3px 5px; cursor: pointer; border-bottom: 1px solid #eee3c8; }
.items li.sel { background: #ead9ff; }
header { border-bottom: 1px solid #b8a67a; margin-bottom: 6px; display: flex; gap: 8px; }
.ficha { max-height: 46vh; overflow-y: auto; border-bottom: 1px solid #b8a67a; margin-bottom: 8px; padding-bottom: 6px; }
.ficha .raw { margin-top: 6px; }
.ficha .raw summary { cursor: pointer; color: #6b5a3a; font-size: 12px; }
.ficha .raw pre { white-space: pre-wrap; word-break: break-word; font-size: 10px; max-height: 30vh; overflow-y: auto; background: #f5eeda; padding: 6px; }
.ficha .meta { color: #6b5a3a; font-size: 12px; }
.ficha .block { margin: 6px 0; }
.ficha .anchor { background: #f5eeda; border-left: 3px solid #7c3aed; padding: 3px 6px; font-size: 12px; }
.ficha .anchor .approx { border: 1px solid #7c3aed; background: #fff; color: #7c3aed; padding: 1px 6px; margin: 3px 6px 0 0; cursor: pointer; font-size: 11px; }
.form label { display: block; margin: 6px 0; font-size: 12px; }
.form select, .form input, .form textarea {
  width: 100%; border: 1px solid #b8a67a; background: #fff; padding: 3px 5px; font: inherit;
}
.hint { color: #8a7348; font-size: 11px; }
.candidates { margin: 8px 0; }
.cand { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 3px 0; border-bottom: 1px dashed #ddd; }
.cand button { border: 1px solid #d97706; background: #fdf3e3; padding: 2px 8px; cursor: pointer; }
.actions { margin-top: 8px; }
.actions button { width: 100%; background: #7c3aed; color: #fff; border: 0; padding: 6px; cursor: pointer; }
.actions button:disabled { opacity: .5; }
.err { color: #b91c1c; margin-top: 6px; }
</style>
