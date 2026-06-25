<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'inline' | 'fullscreen'
  class?: string
  phrases?: string[]
}

const props = withDefaults(defineProps<LoaderProps>(), {
  size: 'md',
  variant: 'inline',
  phrases: () => [],
})

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
}

const currentPhraseIndex = ref(0)
let intervalId: number | null = null

const containerClass = computed(() => {
  if (props.variant === 'fullscreen') {
    return 'fixed inset-0 z-[99999] flex items-center justify-center bg-parchment-base/90 backdrop-blur-sm'
  }
  return 'flex items-center justify-center'
})

const spinnerClass = computed(() =>
  cn(
    'rounded-full border-gold border-t-transparent animate-spin',
    sizeClasses[props.size],
    props.class
  )
)

const currentPhrase = computed(() => {
  if (props.phrases.length === 0) return null
  return props.phrases[currentPhraseIndex.value]
})

onMounted(() => {
  if (props.phrases.length > 1) {
    intervalId = window.setInterval(() => {
      currentPhraseIndex.value = (currentPhraseIndex.value + 1) % props.phrases.length
    }, 2000)
  }
})

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <div :class="containerClass">
    <div class="flex flex-col items-center gap-4">
      <div :class="spinnerClass" />
      <span v-if="currentPhrase" class="text-ink-brown font-book text-lg text-center px-4">
        {{ currentPhrase }}
      </span>
      <span v-else-if="$slots.default" class="ml-3 text-ink-brown font-book text-sm">
        <slot />
      </span>
    </div>
  </div>
</template>
