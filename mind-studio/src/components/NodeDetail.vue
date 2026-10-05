<script setup lang="ts">
import { computed } from 'vue'
import { percent } from '../lib/format'
import type { MindAt } from '../lib/mindAt'
import type { NodeRef } from './nodeRef'

const props = defineProps<{
  picked: NodeRef
  snapshot: MindAt
}>()

const emit = defineEmits<{
  close: []
  pick: [ref: NodeRef]
}>()

const memory = computed(() =>
  props.picked.kind === 'memory'
    ? props.snapshot.memories.find((m) => m.id === props.picked.id) ?? null
    : null,
)
const belief = computed(() =>
  props.picked.kind === 'belief'
    ? props.snapshot.beliefs.find((b) => b.id === props.picked.id) ?? null
    : null,
)
const need = computed(() =>
  props.picked.kind === 'need'
    ? props.snapshot.needs.find((n) => (n.id ?? n.key) === props.picked.id) ?? null
    : null,
)

const evidence = computed(() =>
  (belief.value?.evidence ?? []).map((id) => ({
    id,
    memory: props.snapshot.memories.find((m) => m.id === id) ?? null,
  })),
)

const PHASE: Record<string, string> = {
  alive: 'vivo',
  newborn: 'nace en este episodio',
  fading: 'se apaga en este episodio',
  trace: 'olvidado — queda el rastro',
}
</script>

<template>
  <div class="detail" role="dialog" aria-label="Detalle">
    <button class="close" aria-label="Cerrar" @click="emit('close')">×</button>

    <template v-if="memory">
      <p class="eyebrow">{{ memory.kind === 'pattern' ? 'Patrón' : 'Recuerdo' }} · {{ PHASE[memory.phase] }}</p>
      <p class="body">{{ memory.desc }}</p>
      <dl class="facts">
        <div><dt>fuerza</dt><dd>{{ percent(memory.strengthAt) }}</dd></div>
        <div><dt>importancia</dt><dd>{{ percent(memory.importance) }}</dd></div>
        <div><dt>evocado</dt><dd>{{ memory.evocations }}×</dd></div>
        <div><dt>resonó</dt><dd>{{ memory.voiced }}×</dd></div>
        <div><dt>nació</dt><dd>ep. {{ memory.born_episode ?? '—' }}</dd></div>
        <div v-if="memory.forgotten_episode != null"><dt>se perdió</dt><dd>ep. {{ memory.forgotten_episode }}</dd></div>
        <div v-else><dt>fijado</dt><dd>{{ memory.consolidated ? 'sí' : 'no' }}</dd></div>
      </dl>
    </template>

    <template v-else-if="belief">
      <p class="eyebrow">
        Creencia · {{ belief.origin === 'seed' ? 'de origen' : `nació en el episodio ${belief.born_episode}` }}
      </p>
      <p class="body belief">{{ belief.statement }}</p>
      <dl class="facts">
        <div><dt>convicción</dt><dd>{{ percent(belief.confidence) }}</dd></div>
        <div><dt>estado</dt><dd>{{ belief.status }}</dd></div>
        <div><dt>alcance</dt><dd>{{ belief.horizon }}</dd></div>
      </dl>
      <template v-if="evidence.length">
        <p class="eyebrow">Se sostiene en</p>
        <ul class="evidence">
          <li v-for="e in evidence" :key="e.id">
            <button v-if="e.memory" @click="emit('pick', { kind: 'memory', id: e.id })">
              {{ e.memory.desc }}
            </button>
            <span v-else class="gone">un recuerdo que todavía no existía en este episodio</span>
          </li>
        </ul>
      </template>
    </template>

    <template v-else-if="need">
      <p class="eyebrow">Necesidad · {{ need.key }}</p>
      <p class="body">{{ need.description }}</p>
      <dl class="facts">
        <div><dt>urgencia</dt><dd>{{ percent(need.urgency) }}</dd></div>
      </dl>
    </template>

    <p v-else class="body gone">Esto no existe en este episodio.</p>
  </div>
</template>

<style scoped>
.detail {
  position: absolute;
  left: 18px;
  bottom: 18px;
  width: min(360px, 60%);
  max-height: 60%;
  overflow-y: auto;
  background: var(--paper);
  color: var(--paper-ink);
  padding: 16px 18px 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
  transform: rotate(-0.6deg);
  clip-path: polygon(0 1%, 99% 0, 100% 99%, 1% 100%);
}
.detail .eyebrow { color: #6d6252; margin: 0 0 6px; }
.close {
  position: absolute;
  top: 6px;
  right: 10px;
  background: none;
  border: 0;
  font-size: 20px;
  color: #6d6252;
}
.body {
  font-family: var(--prose);
  font-size: 15px;
  line-height: 1.5;
  margin: 0 0 12px;
}
.body.belief { font-family: var(--display); font-style: italic; font-size: 20px; line-height: 1.25; }
.facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 10px;
  margin: 0 0 10px;
}
.facts dt { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #6d6252; }
.facts dd { margin: 0; font-size: 13px; }
.evidence { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.evidence button {
  text-align: left;
  background: none;
  border: 0;
  padding: 2px 0;
  color: var(--paper-ink);
  font-size: 12px;
  text-decoration: underline dotted #a09380;
}
.gone { color: #8b8070; font-style: italic; font-size: 12px; }
</style>
