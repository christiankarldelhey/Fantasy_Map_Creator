<template>
  <MapViewer mode="wander" />
</template>

<script setup lang="ts">
import { MapViewer } from '@/widgets/map-viewer'
import { useModeTheme } from '@/composables/useModeTheme'

useModeTheme('wander')
</script>

<script lang="ts">
export default {
  name: 'WanderPage'
}
</script>
