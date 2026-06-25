<script setup lang="ts">
import { Loader } from '@/components/ui/loader'

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
      :phrases="['Loading map data...']"
    />

    <div
      v-if="error"
      class="absolute top-4 right-4 z-[1000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md max-w-md shadow-md"
    >
      <strong class="font-bold">Error: </strong>
      <span>{{ error }}</span>
    </div>
  </div>
</template>
