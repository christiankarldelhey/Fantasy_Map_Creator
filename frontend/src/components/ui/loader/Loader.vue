<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'inline' | 'fullscreen'
  class?: string
}

const props = withDefaults(defineProps<LoaderProps>(), {
  size: 'md',
  variant: 'inline',
})

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
}

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
</script>

<template>
  <div :class="containerClass">
    <div :class="spinnerClass" />
    <span v-if="$slots.default" class="ml-3 text-ink-brown font-book text-sm">
      <slot />
    </span>
  </div>
</template>
