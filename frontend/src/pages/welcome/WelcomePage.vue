<template>
  <div class="relative w-full h-screen">
    <MapViewer mode="wander" />
    <WelcomeModal v-if="showWelcome" @dismiss="handleDismiss" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MapViewer } from '@/widgets/map-viewer'
import WelcomeModal from './WelcomeModal.vue'
import api from '@/shared/api/client'

const router = useRouter()
const showWelcome = ref(false)

onMounted(async () => {
  const alreadySeen = localStorage.getItem('me-welcome-seen')
  if (alreadySeen) {
    router.replace('/wander')
    return
  }
  try {
    await api.post('/character/clone-all')
  } catch (err) {
    console.error('Failed to provision characters:', err)
  }
  showWelcome.value = true
})

function handleDismiss() {
  showWelcome.value = false
  localStorage.setItem('me-welcome-seen', '1')
  router.replace('/wander')
}
</script>

<script lang="ts">
export default {
  name: 'WelcomePage'
}
</script>
