<template>
  <div class="fixed inset-0 z-[10001] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-3xl w-full mx-4 p-8 border-2 border-gold">
      <h2 class="text-2xl font-serif font-bold text-ink-black mb-2">Whose feet will you walk in?</h2>
      <p class="text-ink-brown mb-6 font-book">Choose a character to begin your journey.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="character in characters"
          :key="character.id"
          @click="selectCharacter(character.id)"
          class="p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-gold hover:bg-parchment-dark"
          :class="selectedCharacterId === character.id ? 'border-gold bg-parchment-dark' : 'border-earth-dark'"
        >
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-gold">
              <img :src="getCharacterImage(character.name)" :alt="character.name" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1">
              <h3 class="font-serif font-bold text-lg text-ink-black">{{ character.name }}</h3>
              <p class="text-sm text-gold-base font-medium mb-2 font-book">{{ character.type }}</p>
              <p class="text-sm text-ink-brown leading-relaxed font-book">{{ character.description }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <Button
          @click="$emit('cancel')"
          variant="outline"
          size="md"
        >
          Cancel
        </Button>
        <Button
          @click="handleConfirm"
          :disabled="!selectedCharacterId"
          variant="primary"
          size="md"
        >
          Continue
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCharacter } from '@/composables/useCharacter'
import { Button } from '@/components/ui/button'

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
