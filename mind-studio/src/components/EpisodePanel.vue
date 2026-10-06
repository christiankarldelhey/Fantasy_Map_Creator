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
const proseLang = shallowRef<'inner' | 'reader'>('reader')

const focusText = computed(() => props.snapshot.episode.brief?.focus?.text ?? null)

// ADR 0003: the Mind narrates in the inner language (English); another
// reader language is a translation kept beside it.
const translation = computed(() => props.snapshot.episode.narrative_translation)
const hasBoth = computed(() => !!translation.value && !!props.snapshot.episode.narrative)

const paragraphs = computed(() => {
  const text =
    proseLang.value === 'reader' && translation.value
      ? translation.value.text
      : (props.snapshot.episode.narrative ?? '')
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
})
</script>

<template>
  <aside class="panel">
    <header class="panel-head">
      <p class="eyebrow">Episodio {{ snapshot.episode.idx }} · {{ snapshot.episode.date }}</p>
      <p v-if="focusText" class="focus-title">{{ focusText }}</p>
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
        :brief="snapshot.episode.brief"
        :focus="focus"
        @focus="emit('focus', $event)"
      />
      <article v-else class="prose">
        <nav v-if="hasBoth" class="lang-tabs">
          <button
            :class="{ 'is-on': proseLang === 'reader' }"
            @click="proseLang = 'reader'"
          >{{ translation!.language }}</button>
          <button
            :class="{ 'is-on': proseLang === 'inner' }"
            @click="proseLang = 'inner'"
          >english · lo que midió la Mind</button>
        </nav>
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
.panel-head .eyebrow { margin: 0 0 6px; }
.focus-title {
  margin: 0 0 10px;
  font-family: var(--display);
  font-size: 20px;
  line-height: 1.15;
  color: var(--paper);
}

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

.lang-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
.lang-tabs button {
  background: none;
  border: 1px solid var(--chalk-faint);
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--chalk-dim);
}
.lang-tabs button.is-on { color: var(--amber); border-color: var(--amber); }

.prose {
  font-family: var(--prose);
  font-size: 15px;
  line-height: 1.65;
  color: #ddd5c4;
  font-weight: 350;
}
.prose p { margin: 0 0 1em; }
.prose p:first-of-type::first-letter {
  font-family: var(--display);
  font-size: 3.1em;
  float: left;
  line-height: 0.8;
  padding: 6px 8px 0 0;
  color: var(--amber);
}
.empty { color: var(--chalk-dim); font-style: italic; font-family: var(--type); font-size: 12px; }
</style>
