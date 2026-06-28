<template>
  <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm">
    <div class="bg-parchment-base rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 text-center border-2 border-gold">
      <h1 class="text-3xl font-serif font-bold text-ink-black mb-4">Well met, traveller.</h1>
      <p class="text-lg text-ink-brown mb-4 leading-relaxed font-book">
        This is the Middle-earth Wandering Simulator — a place to breathe life into a character and roam freely, from the shadow of the Misty Mountains to the shores of Lindon.
      </p>
      <p class="text-base text-ink-brown mb-4 leading-relaxed font-book">
        Two souls walk these lands for you to inhabit: <strong class="font-semibold text-ink-black">Aranath</strong>, a Dúnedain ranger resting in Bree, and <strong class="font-semibold text-ink-black">Celebrian</strong>, an Elf of Lórien dwelling in Cerin Amroth. You may switch between them freely on the map — though be warned, an adventure abandoned cannot be reclaimed.
      </p>
      <p class="text-sm text-ink-light italic mb-8 font-book">
        A personal hobby and portfolio project, made for love of the work — no coin sought, no rights claimed. Built in respect of J.R.R. Tolkien's legendarium and of MERP (© Iron Crown Enterprises).
      </p>
      <Button
        @click="handleWalk"
        variant="primary"
        size="lg"
      >
        Walk the Lands
      </Button>
    </div>
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
import SeasonSelectModal from './SeasonSelectModal.vue'
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  dismiss: []
}>()

const router = useRouter()
const showSeasonSelect = ref(false)

function handleWalk() {
  showSeasonSelect.value = true
}

function handleSeasonSelected() {
  showSeasonSelect.value = false
  emit('dismiss')
  router.push('/wander')
}
</script>
