<template>
  <div class="chapter-narrative font-reading" :class="compact ? 'chapter-narrative--compact' : ''">
    <p v-for="(paragraph, i) in paragraphs" :key="i" :class="i === 0 && hasDropCap(paragraph) ? 'has-drop-cap' : ''">{{ paragraph }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { splitParagraphs } from '../model/splitParagraphs'
import { hasDropCap } from '../model/hasDropCap'

const props = defineProps<{ text: string | null | undefined; compact?: boolean }>()
const paragraphs = computed(() => splitParagraphs(props.text))
</script>

<style scoped>
/* Cormorant Garamond has fine strokes and a small x-height: full-strength
   ink and a generous line-height keep Regular weight readable on screen. */
.chapter-narrative {
  max-width: 42rem;
  margin-inline: auto;
  color: var(--text-ink-black);
  font-weight: 400;
  font-size: 1.3125rem;
  line-height: 1.6;
  text-align: left;
  hyphens: manual;
  text-wrap: pretty;
  font-feature-settings: 'kern' 1, 'liga' 1, 'onum' 1;
}
.chapter-narrative--compact {
  font-size: 1.1875rem;
  line-height: 1.55;
}
.chapter-narrative p {
  white-space: pre-line;
}
.chapter-narrative p + p {
  margin-top: 0.9em;
}
.chapter-narrative p.has-drop-cap::first-letter {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 600;
  float: left;
  font-size: 3.9em;
  line-height: 0.74;
  padding: 0.03em 0.07em 0 0;
  color: theme('colors.gold.base');
}
</style>
