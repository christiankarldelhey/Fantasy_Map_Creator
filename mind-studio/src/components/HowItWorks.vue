<script setup lang="ts">
import { computed } from 'vue'
import { STEPS } from './tour'

const props = defineProps<{ step: number }>()

const emit = defineEmits<{
  go: [step: number]
  close: []
}>()

const current = computed(() => STEPS[props.step]!)
</script>

<template>
  <div class="tour" role="dialog" aria-label="Cómo funciona una mente">
    <p class="eyebrow">Cómo funciona una mente · {{ step + 1 }} / {{ STEPS.length }}</p>
    <h2 class="title">{{ current.title }}</h2>
    <p class="body">{{ current.body }}</p>
    <div class="nav">
      <button class="link" :disabled="step === 0" @click="emit('go', step - 1)">← antes</button>
      <span class="dots" aria-hidden="true">
        <i v-for="(_, i) in STEPS" :key="i" :class="{ on: i === step }" />
      </span>
      <button v-if="step < STEPS.length - 1" class="link" @click="emit('go', step + 1)">después →</button>
      <button v-else class="link" @click="emit('close')">listo</button>
    </div>
    <button class="close" aria-label="Cerrar" @click="emit('close')">×</button>
  </div>
</template>

<style scoped>
.tour {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%) rotate(-0.4deg);
  width: min(460px, 90%);
  background: var(--paper);
  color: var(--paper-ink);
  padding: 16px 22px 14px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6);
  z-index: 20;
  animation: drop 0.4s ease-out;
}
@keyframes drop {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px) rotate(-1.5deg); }
}
.tour .eyebrow { color: #6d6252; margin: 0 0 4px; }
.title { font-family: var(--display); font-weight: 400; font-size: 28px; margin: 0 0 6px; line-height: 1.1; }
.body { font-family: var(--prose); font-size: 14.5px; line-height: 1.5; margin: 0 0 12px; }
.nav { display: flex; align-items: center; justify-content: space-between; }
.link { background: none; border: 0; color: var(--paper-ink); font-size: 12px; text-decoration: underline; }
.link:disabled { opacity: 0.3; cursor: default; }
.dots { display: flex; gap: 5px; }
.dots i { width: 6px; height: 6px; border-radius: 50%; background: #c7bba6; }
.dots i.on { background: var(--tangerine); }
.close { position: absolute; top: 6px; right: 10px; background: none; border: 0; font-size: 20px; color: #6d6252; }
</style>
