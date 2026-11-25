<script setup lang="ts">
// MapTab — the living map drawn from graph.json (ADR-0021): WORLD → the
// Open contract → its parts → the anatomy of an Event → its kinds; then
// INSIDE THE MIND — the traced open → narrate → close chains.
import { computed, markRaw, ref } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import MapNode from './MapNode.vue'
import StageFlow from './StageFlow.vue'
import { useMindMap } from '../../composables/useMindMap'
import { t } from '../../lib/i18n'

const { graph, error, loading, nodes, edges, stage } = useMindMap()

// Stages are unveiled one at a time as each gets its explainer — the
// manifest still knows them all; the UI only lists what is ready.
// x = explainer key prefix, f = flow key prefix, n = process steps.
const EXPLAINERS: Record<string, { x: string; f: string; n: number }> = {
  'perception': { x: 'map.perc', f: 'map.flow', n: 7 },
  'needs/mood': { x: 'map.imp', f: 'map.impf', n: 5 },
}
const VISIBLE_STAGES = Object.keys(EXPLAINERS)
const cfg = computed(() => EXPLAINERS[stage.value])

// The technical trace mounts lazily — a hidden canvas can't fit its view.
const traceOpen = ref(false)

const stageLabel = (s: string) => {
  if (s === 'overview') return 'General'
  const key = `map.stage.${s}`
  const v = t(key)
  return v === key ? s.replace('/', ' · ') : v
}

// Vue Flow's NodeComponent prop contract is wider than ours — the node
// only reads `data`, so the cast stays at the seam.
const nodeTypes = { map: markRaw(MapNode) } as any
</script>

<template>
  <div class="map-tab">
    <p v-if="error" class="notice error">
      No se pudo cargar el mapa ({{ error }}). Corré
      <code>cd mind-engine && .venv/bin/python scripts/mind_map.py --update</code>.
    </p>
    <p v-else-if="loading" class="notice muted">Cargando el mapa…</p>

    <template v-else>
      <p class="caption">
        Día dorado: <b>{{ graph?.meta.golden_day?.label }}</b> — todo nodo lleva
        la data real que transformó. Hover explica el concepto; ⌄ abre la data.
      </p>
      <div class="stages">
        <button
          v-for="s in ['overview', ...VISIBLE_STAGES]"
          :key="s"
          :class="['chip', { active: stage === s }]"
          @click="stage = s"
        >{{ stageLabel(s) }}</button>
      </div>
      <template v-if="cfg">
        <details class="explain" open>
          <summary>
            <span class="xt">{{ t(`${cfg.x}.title`) }}</span>
            <span class="xh">{{ t(`${cfg.x}.hint`) }}</span>
          </summary>
          <div class="xbody">
            <p v-html="t(`${cfg.x}.intro`)"></p>
            <ol>
              <li v-for="i in cfg.n" :key="i">
                <span v-html="t(`${cfg.x}.s${i}`)"></span>
                <i class="ej">{{ t(`${cfg.f}.p${i}.e`) }}</i>
              </li>
            </ol>
            <p class="xout" v-html="t(`${cfg.x}.out`)"></p>
          </div>
        </details>
        <StageFlow :prefix="cfg.f" :steps="cfg.n" />
        <details
          class="explain trace"
          @toggle="traceOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary>
            <span class="xt">{{ t('map.trace') }}</span>
          </summary>
          <VueFlow
            v-if="traceOpen"
            class="canvas"
            :nodes="nodes"
            :edges="edges"
            :node-types="nodeTypes"
            :nodes-draggable="true"
            fit-view-on-init
            :min-zoom="0.05"
          >
            <Background :gap="24" pattern-color="#1c2430" />
            <Controls position="bottom-right" />
          </VueFlow>
        </details>
      </template>
      <VueFlow
        v-else
        class="canvas"
        :nodes="nodes"
        :edges="edges"
        :node-types="nodeTypes"
        :nodes-draggable="true"
        fit-view-on-init
        :min-zoom="0.05"
      >
        <Background :gap="24" pattern-color="#1c2430" />
        <Controls position="bottom-right" />
      </VueFlow>
    </template>
  </div>
</template>

<style scoped>
.map-tab { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.caption { margin: 0 0 8px; font-size: 13px; color: var(--text-dim); }
.caption b { color: var(--text); font-weight: 600; }
.stages { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  text-transform: capitalize;
}
.chip.active {
  border-color: var(--accent);
  color: var(--text);
  background: var(--accent-soft);
}
.explain {
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  margin-bottom: 10px;
}
.explain summary {
  cursor: pointer;
  padding: 8px 12px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}
.explain .xt { font-weight: 600; color: var(--text); }
.explain .xh { font-family: var(--mono); font-size: 11px; color: var(--text-faint); }
.explain .xbody { padding: 0 14px 12px; font-size: 13px; color: var(--text-dim); line-height: 1.55; }
.explain .xbody :deep(p) { margin: 4px 0 8px; }
.explain .xbody :deep(ol) { margin: 0 0 8px; padding-left: 18px; }
.explain .xbody :deep(li) { margin-bottom: 6px; }
.explain .xbody :deep(li b) { color: var(--text); }
.explain .xbody li .ej {
  display: block;
  margin-top: 2px;
  font-family: var(--mono);
  font-style: normal;
  font-size: 11px;
  color: var(--accent);
}
.explain .xbody :deep(code) {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--accent);
  background: var(--surface-2);
  border-radius: 3px;
  padding: 0 3px;
}
.explain .xout { color: var(--text-faint); }
.explain.trace .canvas { border: none; border-radius: 0 0 var(--radius) var(--radius); min-height: 480px; }
.canvas {
  flex: 1;
  min-height: 480px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>

<style>
/* Vue Flow edges — unscoped so the lib's SVG picks them up */
.vue-flow__edge.reads path { stroke: var(--text-faint); stroke-dasharray: 4 4; }
.vue-flow__edge.cross path { stroke: var(--positive); }
.vue-flow__edge path { stroke: var(--border-strong); }
</style>
