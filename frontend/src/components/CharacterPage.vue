<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'
import type { CharacterState } from '@/composables/useCharacter'
import { useCharacter } from '@/composables/useCharacter'
import { useBreakpoint } from '@/composables/useBreakpoint'

interface CharacterPageProps {
  character: CharacterState
  open?: boolean
}

const props = withDefaults(defineProps<CharacterPageProps>(), {
  open: true,
})

const emit = defineEmits<{
  close: []
  reset: []
}>()

const { isMobile } = useBreakpoint()
const { resetCharacter } = useCharacter()

const isDead = computed(() => props.character.status === 'dead')

const fullImageUrl = computed(() => {
  return new URL(`/src/assets/characters/${props.character.name}_full.png`, import.meta.url).href
})

async function handleReset() {
  try {
    await resetCharacter(props.character.id)
    emit('reset')
    emit('close')
  } catch (err) {
    console.error('Failed to reset character:', err)
  }
}
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
            :class="['relative z-[10001] overflow-hidden rounded-xl border-2 border-gold bg-parchment-base shadow-2xl', isMobile ? 'flex flex-col h-[90vh] w-full max-w-md' : 'flex h-[80vh] max-h-[800px] w-full max-w-5xl']"
          >
            <button
              @click="emit('close')"
              class="absolute right-4 top-4 z-10 rounded-md p-1 text-ink-brown transition-colors hover:bg-parchment-dark hover:text-ink-black"
              aria-label="Close"
            >
              <X class="h-5 w-5" />
            </button>

            <div :class="['overflow-hidden bg-parchment-aged', isMobile ? 'h-48 w-full flex-shrink-0' : 'h-full w-auto flex-shrink-0']">
              <img
                :src="fullImageUrl"
                :alt="character.name"
                :class="['object-contain', isMobile ? 'h-full w-full' : 'h-full w-auto max-w-none']"
              />
            </div>

            <div :class="['flex flex-col overflow-y-auto', isMobile ? 'flex-1 p-6' : 'h-full flex-1 p-8']">
              <div class="mb-2 flex items-center gap-3">
                <h1 :class="['font-serif font-bold text-ink-black', isMobile ? 'text-2xl' : 'text-3xl']">
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

              <p :class="['font-book italic text-gold-base', isMobile ? 'text-base' : 'text-lg']">
                {{ character.type }}
              </p>

              <div class="mt-6">
                <p :class="['font-book leading-relaxed text-ink-black', isMobile ? 'text-sm' : 'text-base']">
                  {{ character.description }}
                </p>
              </div>

              <div v-if="isDead" class="mt-8">
                <button
                  class="rounded-md bg-parchment-dark px-4 py-2 font-serif font-semibold text-ink-black shadow-sm ring-1 ring-gold transition hover:bg-parchment-aged"
                  @click="handleReset"
                >
                  Revive — restore energy and shadow
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
