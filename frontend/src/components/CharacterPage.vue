<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'
import type { CharacterState } from '@/composables/useCharacter'

interface CharacterPageProps {
  character: CharacterState
  open?: boolean
}

const props = withDefaults(defineProps<CharacterPageProps>(), {
  open: true,
})

const emit = defineEmits<{
  close: []
}>()

const fullImageUrl = computed(() => {
  return new URL(`/src/assets/characters/${props.character.name}_full.png`, import.meta.url).href
})
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
          <div
            v-if="open"
            class="relative z-[10001] flex h-[80vh] max-h-[800px] w-full max-w-5xl overflow-hidden rounded-xl border-2 border-gold bg-parchment-base shadow-2xl"
          >
            <button
              @click="emit('close')"
              class="absolute right-4 top-4 z-10 rounded-md p-1 text-ink-brown transition-colors hover:bg-parchment-dark hover:text-ink-black"
              aria-label="Close"
            >
              <X class="h-5 w-5" />
            </button>

            <div class="h-full w-auto flex-shrink-0 overflow-hidden bg-parchment-aged">
              <img
                :src="fullImageUrl"
                :alt="character.name"
                class="h-full w-auto max-w-none object-contain"
              />
            </div>

            <div class="flex h-full flex-1 flex-col overflow-y-auto p-8">
              <div class="mb-2 flex items-center gap-3">
                <h1 class="font-serif text-3xl font-bold text-ink-black">
                  {{ character.name }}
                </h1>
                <span
                  v-if="character.permadeath"
                  class="text-lg text-ink-brown"
                  title="Permadeath enabled"
                >
                  ☠
                </span>
              </div>

              <p class="font-book text-lg italic text-gold-base">
                {{ character.type }}
              </p>

              <div class="mt-6">
                <p class="font-book text-base leading-relaxed text-ink-black">
                  {{ character.description }}
                </p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
