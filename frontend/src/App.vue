<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useUserSettings } from '@/composables/useUserSettings'
import { useLanguage } from '@/composables/useLanguage'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'

const { restoreSession, currentUser } = useAuth()
const { user } = useUserSettings()
const { initializeFromBackend: initializeLanguage } = useLanguage()
const { initializeFromBackend: initializeClimateTime } = useGlobalClimateTime()

onMounted(async () => {
  try {
    const restored = await restoreSession()
    if (restored && currentUser.value) {
      // Sync useUserSettings with the restored user
      user.value = currentUser.value
      initializeLanguage()
      initializeClimateTime()
    }
  } catch (err) {
    console.error('Failed to restore session on app startup:', err)
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
