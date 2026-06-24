<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 text-center">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Well met, traveller.</h1>
      <p class="text-lg text-gray-700 mb-6 leading-relaxed">
        Rest your feet a while and read. This is the Middle-earth Wandering Simulator. A place to breathe life into a character and roam the lands freely, from the Rhovanion on the east to the shores of Lindon. Or, if you'd rather, simply unroll the map and wander it with your eyes.
      </p>
      <p class="text-sm text-gray-500 italic mb-8">
        A personal hobby and portfolio project, made for love of the work — no coin sought, no rights claimed. Built in respect of J.R.R. Tolkien's legendarium and of MERP (© Iron Crown Enterprises).
      </p>
      <p class="text-xl font-semibold text-gray-900 mb-6">What will it be?</p>
      <div class="flex flex-col gap-4">
        <button
          @click="handleExplore"
          class="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors"
        >
          Unroll the Map
        </button>
        <button
          @click="handleWalk"
          class="px-6 py-3 bg-stone-700 hover:bg-stone-800 text-white font-semibold rounded-lg transition-colors"
        >
          Walk the Lands
        </button>
        <button
          @click="handleResume"
          class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
        >
          Resume a Journey
        </button>
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

const emit = defineEmits<{
  dismiss: []
}>()

const router = useRouter()
const { activeCharacter } = useCharacter()
const showCharacterSelect = ref(false)
const showSeasonSelect = ref(false)

function handleExplore() {
  emit('dismiss')
  router.push('/explore')
}

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
