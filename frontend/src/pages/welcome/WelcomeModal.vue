<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 text-center border-2 border-gold">
      <h1 class="text-3xl font-serif font-bold text-ink-black mb-4">{{ t('welcome.wellMet') }}</h1>
      <p class="text-lg text-ink-brown mb-4 leading-relaxed font-book">
        {{ t('welcome.intro') }}
      </p>
      <i18n-t keypath="welcome.souls" tag="p" class="text-base text-ink-brown mb-4 leading-relaxed font-book">
        <template #aranath><strong class="font-semibold text-ink-black">Aranath</strong></template>
        <template #celebrian><strong class="font-semibold text-ink-black">Celebrian</strong></template>
      </i18n-t>
      <p class="text-sm text-ink-light italic mb-8 font-book">
        {{ t('welcome.credits') }}
      </p>
      <Button
        @click="handleWalk"
        variant="primary"
        size="lg"
      >
        {{ t('welcome.walkTheLands') }}
      </Button>
    </div>
    <LanguageSelectModal
      v-if="showLanguageSelect"
      @confirm="handleLanguageSelected"
      @cancel="showLanguageSelect = false"
    />
    <CharacterSelectModal
      v-if="showCharacterSelect"
      :is-onboarding="true"
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
import { useI18n } from 'vue-i18n'
import CharacterSelectModal from './CharacterSelectModal.vue'
import SeasonSelectModal from './SeasonSelectModal.vue'
import LanguageSelectModal from './LanguageSelectModal.vue'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

const emit = defineEmits<{
  dismiss: []
}>()

const router = useRouter()
const showLanguageSelect = ref(false)
const showCharacterSelect = ref(false)
const showSeasonSelect = ref(false)

function handleWalk() {
  showLanguageSelect.value = true
}

function handleLanguageSelected() {
  showLanguageSelect.value = false
  showCharacterSelect.value = true
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
