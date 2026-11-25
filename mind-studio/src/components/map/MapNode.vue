<script setup lang="ts">
// A map node: the label is a Concept (or a contract part), the hover tip
// explains it in the glossary's own words, the chevron opens the real
// data it carried on the golden day.
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { MapNodeData } from '../../composables/useMindMap'

const props = defineProps<{ data: MapNodeData }>()

const expanded = ref(false)
const hover = ref(false)

const pretty = computed(() =>
  props.data.example === undefined
    ? ''
    : JSON.stringify(props.data.example, null, 1).slice(0, 2400),
)
</script>

<template>
  <div
    :class="['map-node', data.kind]"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <Handle type="target" :position="Position.Left" />
    <div class="head">
      <div class="titles">
        <span class="title">{{ data.title }}</span>
        <span v-if="data.sub" class="sub">{{ data.sub }}</span>
      </div>
      <button
        v-if="data.example !== undefined || data.rules?.length"
        class="chev"
        :class="{ open: expanded }"
        @click.stop="expanded = !expanded"
      >⌄</button>
    </div>

    <div v-if="expanded" class="body" @wheel.stop>
      <pre v-if="data.example !== undefined" class="json">{{ pretty }}</pre>
      <ul v-if="data.rules?.length" class="rules">
        <li v-for="(r, i) in data.rules" :key="i">{{ r }}</li>
      </ul>
    </div>

    <div v-if="hover && (data.tip || data.meta) && !expanded" class="tip">
      <p v-if="data.tip" class="def">{{ data.tip }}</p>
      <p v-if="data.meta" class="meta">{{ data.meta }}</p>
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.map-node {
  position: relative;
  min-width: 150px;
  max-width: 240px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 12px;
}
.map-node.world {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.map-node.contract {
  border-color: var(--positive);
}
.map-node.part { border-style: dashed; }
.map-node.step {
  border-color: var(--border-strong);
  background: var(--surface-2);
}
.map-node.kind { min-width: 110px; }
.map-node.concept {
  border-style: dotted;
  border-color: var(--accent);
  background: var(--bg);
  min-width: 120px;
}
.map-node.io {
  border-color: var(--positive);
  border-style: dashed;
  font-family: var(--mono);
}
.map-node.lane {
  background: transparent;
  border: 0;
  color: var(--text-faint);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  pointer-events: none;
}

.head { display: flex; align-items: center; gap: 8px; }
.titles { display: flex; flex-direction: column; min-width: 0; }
.title { font-weight: 600; white-space: nowrap; }
.sub {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
}
.chev {
  margin-left: auto;
  border: 0;
  background: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: transform 0.15s;
}
.chev.open { transform: rotate(180deg); }

.body {
  margin-top: 8px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
  max-height: 300px;
  overflow: auto;
}
.json {
  margin: 0;
  font-family: var(--mono);
  font-size: 10.5px;
  line-height: 1.45;
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-word;
}
.rules {
  margin: 6px 0 0;
  padding-left: 16px;
  font-size: 10.5px;
  color: var(--text-faint);
}

.tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 20;
  width: 280px;
  background: var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 10px 12px;
  pointer-events: none;
}
.tip .def { margin: 0; font-size: 12px; line-height: 1.5; }
.tip .meta {
  margin: 6px 0 0;
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-faint);
}
</style>
