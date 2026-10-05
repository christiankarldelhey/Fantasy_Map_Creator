<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { MindAt } from '../lib/mindAt'
import LensList from './LensList.vue'
import type { NodeRef } from './nodeRef'

const props = defineProps<{
  snapshot: MindAt
  focus: NodeRef | null
}>()

const emit = defineEmits<{
  focus: [ref: NodeRef | null]
}>()

const tab = shallowRef<'lens' | 'prose'>('lens')

const paragraphs = computed(() =>
  (props.snapshot.episode.narrative ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean),
)
</script>

<template>
  <aside class="panel">
    <header class="panel-head">
      <p class="eyebrow">Episodio {{ snapshot.episode.idx }} · {{ snapshot.episode.date }}</p>
      <nav class="tabs" role="tablist">
        <button
          role="tab"
          :aria-selected="tab === 'lens'"
          :class="['tab', { 'is-on': tab === 'lens' }]"
          @click="tab = 'lens'"
        >Lo que le susurró</button>
        <button
          role="tab"
          :aria-selected="tab === 'prose'"
          :class="['tab', { 'is-on': tab === 'prose' }]"
          @click="tab = 'prose'"
        >La narración</button>
      </nav>
    </header>

    <div class="panel-body">
      <LensList
        v-if="tab === 'lens'"
        :lines="snapshot.episode.lens"
        :focus="focus"
        @focus="emit('focus', $event)"
      />
      <article v-else class="prose">
        <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        <p v-if="!paragraphs.length" class="empty">
          Este episodio todavía no tiene narración guardada.
        </p>
      </article>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid var(--chalk-faint);
  background: linear-gradient(180deg, rgba(17, 26, 41, 0.85), rgba(11, 17, 28, 0.6));
}

.panel-head { padding: 18px 20px 0; }
.panel-head .eyebrow { margin: 0 0 10px; }

.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--chalk-faint); }
.tab {
  background: none;
  border: 0;
  padding: 7px 10px;
  font-family: var(--display);
  font-size: 17px;
  color: var(--chalk-dim);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab.is-on { color: var(--paper); border-bottom-color: var(--amber); }
.tab:hover { color: var(--chalk); }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
}

.prose {
  font-family: var(--prose);
  font-size: 15px;
  line-height: 1.65;
  color: #ddd5c4;
  font-weight: 350;
}
.prose p { margin: 0 0 1em; }
.prose p:first-child::first-letter {
  font-family: var(--display);
  font-size: 3.1em;
  float: left;
  line-height: 0.8;
  padding: 6px 8px 0 0;
  color: var(--amber);
}
.empty { color: var(--chalk-dim); font-style: italic; font-family: var(--type); font-size: 12px; }
</style>
