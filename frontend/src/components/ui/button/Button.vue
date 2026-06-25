<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-leather-base text-white hover:bg-leather-light shadow-md',
        secondary: 'bg-earth-base text-ink-black hover:bg-earth-light shadow-md border border-earth-dark',
        danger: 'bg-destructive text-white hover:bg-red-900 shadow-md',
        ghost: 'hover:bg-parchment-dark text-ink-black hover:text-ink-black',
        outline: 'border-2 border-gold text-ink-black hover:bg-parchment-dark',
        gold: 'bg-gold-base text-ink-black hover:bg-gold-light shadow-md',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gold'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  class?: string
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
})
</script>

<template>
  <button :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)">
    <slot />
  </button>
</template>
