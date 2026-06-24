<template>
  <div class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Whose feet will you walk in?</h2>
      <p class="text-gray-600 mb-6">Choose a character to begin your journey.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="character in characters"
          :key="character.id"
          @click="selectCharacter(character.id)"
          class="p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-amber-500 hover:bg-amber-50"
          :class="selectedCharacterId === character.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'"
        >
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-300">
              <img :src="getCharacterImage(character.name)" :alt="character.name" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-lg text-gray-900">{{ character.name }}</h3>
              <p class="text-sm text-amber-700 font-medium mb-2">{{ character.type }}</p>
              <p class="text-sm text-gray-600 leading-relaxed">{{ character.description }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-6 flex justify-end">
        <button
          @click="handleConfirm"
          :disabled="!selectedCharacterId"
          class="px-6 py-2 bg-stone-700 hover:bg-stone-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCharacter } from '@/composables/useCharacter'

const emit = defineEmits<{
  confirm: [characterId: number]
  cancel: []
}>()

const { characters, setActiveCharacter, fetchAllCharacters } = useCharacter()
const selectedCharacterId = ref<number | null>(null)

onMounted(async () => {
  await fetchAllCharacters()
})

function getCharacterImage(name: string): string {
  return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
}

function selectCharacter(id: number) {
  selectedCharacterId.value = id
}

async function handleConfirm() {
  if (selectedCharacterId.value) {
    await setActiveCharacter(selectedCharacterId.value)
    emit('confirm', selectedCharacterId.value)
  }
}
</script>
