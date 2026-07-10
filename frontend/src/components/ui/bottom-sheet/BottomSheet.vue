<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** Height (in vh) of the sheet when expanded. */
  expandedVh?: number
  /** Height (in px) of the sheet when collapsed (peek). */
  collapsedPx?: number
  /** Controls whether the sheet is expanded. Supports v-model:expanded. */
  expanded?: boolean
  /** Show the drag handle at the top. */
  showHandle?: boolean
}>(), {
  expandedVh: 85,
  collapsedPx: 132,
  expanded: true,
  showHandle: true,
})

const emit = defineEmits<{
  'update:expanded': [value: boolean]
}>()

const isExpanded = ref(props.expanded)
watch(() => props.expanded, (v) => { isExpanded.value = v })

function setExpanded(v: boolean) {
  if (isExpanded.value === v) return
  isExpanded.value = v
  emit('update:expanded', v)
}

function toggle() {
  setExpanded(!isExpanded.value)
}

const sheetStyle = computed(() => {
  const height = isExpanded.value
    ? `${props.expandedVh}vh`
    : `calc(${props.collapsedPx}px + env(safe-area-inset-bottom, 0px))`
  return { height }
})

// Basic touch drag: swipe down collapses, swipe up expands.
let startY = 0
let dragging = false

function onTouchStart(e: TouchEvent) {
  startY = e.touches[0].clientY
  dragging = true
}

function onTouchMove(e: TouchEvent) {
  if (!dragging) return
  const delta = e.touches[0].clientY - startY
  if (Math.abs(delta) < 40) return
  if (delta > 0) setExpanded(false)
  else setExpanded(true)
  dragging = false
}

function onTouchEnd() {
  dragging = false
}
</script>

<template>
  <div
    class="bottom-sheet fixed inset-x-0 bottom-0 z-[10000] flex flex-col bg-parchment-base border-t-2 border-gold rounded-t-2xl shadow-2xl transition-[height] duration-300 ease-out"
    :style="sheetStyle"
  >
    <div
      v-if="showHandle"
      class="shrink-0 flex flex-col items-center pt-2 pb-1 cursor-pointer select-none touch-none"
      @click="toggle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="w-10 h-1.5 rounded-full bg-earth-dark/40"></div>
    </div>

    <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
      <slot :expanded="isExpanded" :toggle="toggle" />
    </div>
  </div>
</template>
