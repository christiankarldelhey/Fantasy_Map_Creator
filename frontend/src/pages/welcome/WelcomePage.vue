<template>
  <div class="relative w-full h-screen">
    <MapViewer mode="explore" />
    <WelcomeModal v-if="showWelcome" @dismiss="handleDismiss" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MapViewer } from '@/widgets/map-viewer'
import WelcomeModal from './WelcomeModal.vue'

const router = useRouter()
const showWelcome = ref(false)

onMounted(() => {
  const hasSeenWelcome = localStorage.getItem('me-welcome-seen')
  if (!hasSeenWelcome) {
    showWelcome.value = true
  } else {
    // If already seen, redirect to explore
    router.replace('/explore')
  }
})

function handleDismiss() {
  localStorage.setItem('me-welcome-seen', 'true')
  showWelcome.value = false
  router.replace('/explore')
}
</script>

<script lang="ts">
export default {
  name: 'WelcomePage'
}
</script>
