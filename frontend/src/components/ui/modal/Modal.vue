<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'
import { cn } from '@/lib/utils'

interface ModalProps {
  open?: boolean
  title?: string
  showClose?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  class?: string
}

const props = withDefaults(defineProps<ModalProps>(), {
  open: true,
  showClose: true,
  size: 'md',
})

const emit = defineEmits<{
  close: []
}>()

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const modalClass = computed(() => 
  cn(
    'bg-parchment-base rounded-lg shadow-2xl border-2 border-gold',
    sizeClasses[props.size],
    props.class
  )
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm p-4"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="open" :class="modalClass">
            <!-- Header -->
            <div v-if="title || showClose" class="flex items-center justify-between px-6 py-4 border-b border-earth-dark">
              <h2 v-if="title" class="font-serif text-xl font-semibold text-ink-black">{{ title }}</h2>
              <button
                v-if="showClose"
                @click="emit('close')"
                class="p-1 rounded-md hover:bg-parchment-dark transition-colors text-ink-brown hover:text-ink-black"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-4">
              <slot />
            </div>

            <!-- Footer (optional) -->
            <div v-if="$slots.footer" class="px-6 py-4 border-t border-earth-dark bg-parchment-dark/50">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
