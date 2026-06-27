<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 text-center border-2 border-gold">
      <h1 class="text-3xl font-serif font-bold text-ink-black mb-4">Well met, traveller.</h1>
      <p class="text-lg text-ink-brown mb-6 leading-relaxed font-book">
        Rest your feet a while and read. This is the Middle-earth Wandering Simulator. A place to breathe life into a character and roam the lands freely, from the Black Forest to the shores of Lindon.
      </p>
      <p class="text-sm text-ink-light italic mb-8 font-book">
        A personal hobby and portfolio project, made for love of the work — no coin sought, no rights claimed. Built in respect of J.R.R. Tolkien's legendarium and of MERP (© Iron Crown Enterprises).
      </p>
      <p class="text-xl font-serif font-semibold text-ink-black mb-6">What will it be?</p>
      <div class="flex flex-col gap-4">
        <Button
          @click="handleWalk"
          variant="primary"
          size="lg"
        >
          Walk the Lands
        </Button>
        <Button
          @click="handleResume"
          variant="secondary"
          size="lg"
        >
          Resume a Journey
        </Button>
      </div>
    </div>
    <CharacterSelectModal
      v-if="showCharacterSelect"
      @confirm="handleCharacterSelected"
      @cancel="showCharacterSelect = false"
    />
    <SeasonSelectModal
      v-if="showSeasonSelect"
      @confirm="handleSeasonSelected"
      @cancel="showSeasonSelect = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacter } from '@/composables/useCharacter'
import CharacterSelectModal from './CharacterSelectModal.vue'
import SeasonSelectModal from './SeasonSelectModal.vue'
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  dismiss: []
}>()

const router = useRouter()
const { activeCharacter } = useCharacter()
const showCharacterSelect = ref(false)
const showSeasonSelect = ref(false)

function handleWalk() {
  showCharacterSelect.value = true
}

function handleResume() {
  if (activeCharacter.value) {
    emit('dismiss')
    router.push('/wander')
  } else {
    // No active character, go to character selection
    showCharacterSelect.value = true
  }
}

function handleCharacterSelected() {
  showCharacterSelect.value = false
  showSeasonSelect.value = true
}

function handleSeasonSelected() {
  showSeasonSelect.value = false
  emit('dismiss')
  router.push('/wander')
}
</script>
