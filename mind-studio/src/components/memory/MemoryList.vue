<script setup lang="ts">
import { label, MEMORY_KIND } from '../../lib/labels'
import type { MemoryNode } from '../../types'
import MeterBar from '../ui/MeterBar.vue'

defineProps<{ memories: MemoryNode[]; forgotten?: boolean }>()

const feeling = (v: number) => (v <= -0.2 ? 'Negativo' : v >= 0.2 ? 'Positivo' : 'Neutro')
</script>

<template>
  <table v-if="memories.length" class="table">
    <thead>
      <tr>
        <th>Recuerdo</th>
        <th>Tipo</th>
        <th>Sensación</th>
        <th v-if="!forgotten" title="Qué tan vivo está el recuerdo">Fuerza</th>
        <th title="Cuánto le marcó cuando lo vivió">Importancia</th>
        <th title="Veces que volvió a su mente">Evocado</th>
        <th>{{ forgotten ? 'Olvidado en' : 'Desde' }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="m in memories" :key="m.id">
        <td class="text">{{ m.desc }}</td>
        <td><span class="badge">{{ label(MEMORY_KIND, m.kind) }}</span></td>
        <td :class="['feel', feeling(m.valence).toLowerCase()]">{{ feeling(m.valence) }}</td>
        <td v-if="!forgotten"><MeterBar :value="m.strength" /></td>
        <td><MeterBar :value="m.importance" /></td>
        <td class="num">{{ m.evocations }}</td>
        <td class="num">
          {{ forgotten ? (m.forgotten_episode != null ? `Ep. ${m.forgotten_episode}` : '—')
            : (m.born_episode != null ? `Ep. ${m.born_episode}` : 'Preset') }}
        </td>
      </tr>
    </tbody>
  </table>
  <p v-else class="empty">{{ forgotten ? 'No olvidó nada todavía.' : 'No hay recuerdos.' }}</p>
</template>

<style scoped src="./table.css"></style>
<style scoped>
.feel { font-size: 13px; color: var(--text-dim); }
.feel.positivo { color: var(--positive); }
.feel.negativo { color: var(--danger); }
</style>
