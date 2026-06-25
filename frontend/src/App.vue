<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserSettings } from '@/composables/useUserSettings'
import { useLanguage } from '@/composables/useLanguage'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'

const { fetchUserSettings } = useUserSettings()
const { initializeFromBackend: initializeLanguage } = useLanguage()
const { initializeFromBackend: initializeClimateTime } = useGlobalClimateTime()

onMounted(async () => {
  try {
    // Load user settings from backend
    await fetchUserSettings()
    // Initialize language and climate time from backend settings
    initializeLanguage()
    initializeClimateTime()
  } catch (err) {
    console.error('Failed to load user settings on app startup:', err)
  }
})
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style scoped>
#app {
  width: 100%;
  height: 100vh;
}
</style>
