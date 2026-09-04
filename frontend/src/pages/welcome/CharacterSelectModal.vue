<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-3xl w-full mx-4 p-8 border-2 border-gold">
      <h2 class="text-2xl font-serif font-bold text-ink-black mb-2">{{ t('welcome.whoseFeet') }}</h2>
      <p class="text-ink-brown mb-6 font-book">{{ t('welcome.chooseCharacter') }}</p>
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
              <p class="text-base text-gold-base font-medium mb-2 font-book">{{ character.type }}</p>
              <p class="text-base text-ink-brown leading-relaxed font-book">{{ localizedDescription(character) }}</p>
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
          {{ t('common.cancel') }}
        </Button>
        <Button
          @click="handleConfirm"
          :disabled="!selectedCharacterId"
          variant="primary"
          size="md"
        >
          {{ t('common.continue') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCharacter } from '@/composables/useCharacter'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

const props = defineProps<{
  isOnboarding?: boolean
}>()

const emit = defineEmits<{
  confirm: [characterId: number]
  cancel: []
}>()

const { characters, setActiveCharacter, fetchAllCharacters, localizedDescription } = useCharacter()
const selectedCharacterId = ref<number | null>(null)
const loading = ref(false)

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
  if (!selectedCharacterId.value) return
  loading.value = true
  try {
    // clone-all already created the user's clones; we just need to set the
    // selected one as active (works for both onboarding and character switch).
    await setActiveCharacter(selectedCharacterId.value)
    emit('confirm', selectedCharacterId.value)
  } finally {
    loading.value = false
  }
}
</script>
