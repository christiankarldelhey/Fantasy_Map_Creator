<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { fetchTags } from '../../api'
import type { TagRegistry } from '../../types'
import PanelCard from '../ui/PanelCard.vue'

// The shared Tag registry (ADR-0016): one flat vocabulary every consumer
// consults — gating, memory, retrieval, needs, attitudes. Read-only; the
// seed file is the source of truth.

const registry = shallowRef<TagRegistry | null>(null)
const error = shallowRef<string | null>(null)

onMounted(async () => {
  try {
    registry.value = await fetchTags()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<template>
  <p v-if="error" class="notice error">
    No se pudo cargar el registro de tags ({{ error }}). ¿Está seedeada la tabla narration_tags?
  </p>
  <p v-else-if="!registry" class="notice muted">Cargando registro…</p>

  <div v-else class="grid">
    <PanelCard
      v-for="fam in registry.families"
      :key="fam.family"
      :title="fam.family"
      :description="fam.description.es || fam.description.en || ''"
    >
      <div class="consumers">
        <span v-for="c in fam.consumers" :key="c" class="badge badge-accent">{{ c }}</span>
        <span v-if="fam.open" class="badge" title="Familia de valor abierto (pattern)">valor abierto</span>
      </div>
      <div class="values">
        <span v-for="v in fam.values" :key="v" class="tag">{{ fam.family }}:{{ v }}</span>
        <span v-if="fam.open" class="tag open">{{ fam.family}}:*</span>
      </div>
    </PanelCard>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.consumers { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.values { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  font-family: var(--mono);
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
}
.tag.open { color: var(--text); border-style: dashed; }
.notice { margin: 48px auto; max-width: 520px; text-align: center; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
