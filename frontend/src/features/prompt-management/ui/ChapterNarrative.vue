<template>
  <div class="chapter-narrative font-reading" :class="compact ? 'chapter-narrative--compact' : ''">
    <p v-for="(paragraph, i) in paragraphs" :key="i">{{ paragraph }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { splitParagraphs } from '../model/splitParagraphs'

const props = defineProps<{ text: string | null | undefined; compact?: boolean }>()
const paragraphs = computed(() => splitParagraphs(props.text))
</script>

<style scoped>
/* Cormorant Garamond has fine strokes and a small x-height: Medium weight,
   a larger size and full-strength ink keep it readable on screen. */
.chapter-narrative {
  max-width: 38rem;
  margin-inline: auto;
  color: var(--text-ink-black);
  font-weight: 500;
  font-size: 1.375rem;
  line-height: 1.6;
  text-align: left;
  hyphens: auto;
  text-wrap: pretty;
  font-feature-settings: 'kern' 1, 'liga' 1, 'onum' 1;
}
.chapter-narrative--compact {
  font-size: 1.25rem;
  line-height: 1.55;
}
.chapter-narrative p {
  white-space: pre-line;
}
.chapter-narrative p + p {
  margin-top: 0.9em;
}
.chapter-narrative p:first-child::first-letter {
  font-family: 'Cinzel', Georgia, serif;
  font-weight: 600;
  float: left;
  font-size: 3.3em;
  line-height: 0.82;
  padding: 0.04em 0.1em 0 0;
  color: theme('colors.gold.base');
}
</style>
