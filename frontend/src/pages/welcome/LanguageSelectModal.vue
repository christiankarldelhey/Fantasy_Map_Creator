<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 border-2 border-gold">
      <h2 class="text-2xl font-serif font-bold text-ink-black mb-2">{{ t('welcome.languageTitle') }}</h2>
      <p class="text-ink-brown mb-2 font-book">{{ t('welcome.languageSubtitle') }}</p>
      <p class="text-sm text-ink-light italic mb-6 font-book">{{ t('welcome.languageNote') }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          v-for="lang in languages"
          :key="lang.value"
          @click="selectedLanguage = lang.value"
          class="p-4 rounded-lg border-2 transition-all hover:border-gold hover:bg-parchment-dark text-left flex items-center gap-3"
          :class="selectedLanguage === lang.value ? 'border-gold bg-parchment-dark' : 'border-earth-dark'"
        >
          <span class="text-3xl leading-none">{{ lang.flag }}</span>
          <div>
            <h3 class="font-serif font-bold text-lg text-ink-black">{{ lang.label }}</h3>
            <p class="text-base text-ink-brown font-book">{{ lang.native }}</p>
          </div>
        </button>
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
          :disabled="!selectedLanguage"
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
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLanguage } from '@/composables/useLanguage'
import { Button } from '@/components/ui/button'

type Lang = 'english' | 'spanish'

const { t } = useI18n()
const { language, setLanguage } = useLanguage()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const selectedLanguage = ref<Lang>(language.value as Lang)

const languages = [
  { value: 'english' as Lang, flag: '🇬🇧', label: 'English', native: 'English' },
  { value: 'spanish' as Lang, flag: '🇪🇸', label: 'Español', native: 'Spanish' },
]

function handleConfirm() {
  if (!selectedLanguage.value) return
  setLanguage(selectedLanguage.value)
  emit('confirm')
}
</script>
