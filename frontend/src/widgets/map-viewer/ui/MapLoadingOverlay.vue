<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Loader } from '@/components/ui/loader'

const { t } = useI18n()

defineProps<{
  loading: boolean
  error: string | null
}>()
</script>

<template>
  <div>
    <Loader
      v-if="loading"
      variant="fullscreen"
      size="lg"
      :phrases="[t('map.loadingData')]"
    />

    <div
      v-if="error"
      class="absolute top-4 right-4 z-[1000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md max-w-md shadow-md"
    >
      <strong class="font-bold">{{ t('map.errorPrefix') }}</strong>
      <span>{{ error }}</span>
    </div>
  </div>
</template>
