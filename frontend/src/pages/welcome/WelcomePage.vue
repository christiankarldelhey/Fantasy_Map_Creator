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
import { useUserSettings } from '@/composables/useUserSettings'

const router = useRouter()
const { user } = useUserSettings()
const showWelcome = ref(false)

onMounted(() => {
  if (user.value?.active_character_id) {
    // User already has a character, go straight to the map
    router.replace('/wander')
  } else {
    showWelcome.value = true
  }
})

function handleDismiss() {
  showWelcome.value = false
  router.replace('/wander')
}
</script>

<script lang="ts">
export default {
  name: 'WelcomePage'
}
</script>
