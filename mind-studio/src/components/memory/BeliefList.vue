<script setup lang="ts">
import { BELIEF_HORIZON, BELIEF_KIND, BELIEF_ORIGIN, label } from '../../lib/labels'
import type { BeliefNode } from '../../types'
import MeterBar from '../ui/MeterBar.vue'

defineProps<{ beliefs: BeliefNode[] }>()
</script>

<template>
  <table v-if="beliefs.length" class="table">
    <thead>
      <tr>
        <th>Creencia</th>
        <th>Sobre qué</th>
        <th title="Pasajera: se desvanece con los días. Duradera: no caduca sola.">Duración</th>
        <th>Origen</th>
        <th title="Qué tan firme la sostiene, de 0 a 5">Firmeza</th>
        <th>Desde</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="b in beliefs" :key="b.id">
        <td class="text">{{ b.statement }}</td>
        <td><span class="badge">{{ label(BELIEF_KIND, b.kind) }}</span></td>
        <td class="muted">{{ label(BELIEF_HORIZON, b.horizon) }}</td>
        <td class="muted">{{ label(BELIEF_ORIGIN, b.origin) }}</td>
        <td class="strength">
          <MeterBar :value="b.strength" :max="5" />
          <span class="num">{{ b.strength.toFixed(1) }}</span>
        </td>
        <td class="num">{{ b.born_episode != null ? `Ep. ${b.born_episode}` : 'Preset' }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else class="empty">No tiene creencias todavía.</p>
</template>

<style scoped src="./table.css"></style>
<style scoped>
.strength { white-space: nowrap; }
.strength .num { margin-left: 8px; }
</style>
