<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { MindDetail } from '../../types'
import PanelCard from '../ui/PanelCard.vue'
import MoodEditor from './MoodEditor.vue'
import NatureEditor from './NatureEditor.vue'
import SkillsEditor from './SkillsEditor.vue'

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ saved: [] }>()

const status = shallowRef<{ kind: 'ok' | 'error'; text: string } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

function onSaved() {
  status.value = { kind: 'ok', text: 'Cambios guardados' }
  clearTimeout(timer)
  timer = setTimeout(() => { status.value = null }, 2000)
  emit('saved')
}

function onError(message: string) {
  clearTimeout(timer)
  status.value = { kind: 'error', text: `No se guardó: ${message}` }
}

const skillsEditable = computed(
  () => props.mind.character.kind !== 'original' && props.mind.character.adopted,
)
const wiring = computed(() => Object.entries(props.mind.wiring))
</script>

<template>
  <div class="stack">
    <p class="intro muted">
      Todo lo de esta pestaña se guarda automáticamente al soltar el control y vale para los próximos episodios.
      <span v-if="status" :class="['status', status.kind]">{{ status.text }}</span>
    </p>

    <PanelCard
      title="Ánimo actual"
      description="Cómo se siente la mente en este momento. Lo que viva en el próximo episodio lo va a ir modificando."
    >
      <MoodEditor :mind="mind" @saved="onSaved" @error="onError" />
    </PanelCard>

    <PanelCard
      title="Naturaleza"
      description="Lo que el personaje ES: el punto de reposo al que el ánimo regresa y cómo lo sacude lo vivido. Si el ánimo de arriba es el tiempo de hoy, esto es el clima."
    >
      <NatureEditor :mind="mind" @saved="onSaved" @error="onError" />
    </PanelCard>

    <PanelCard
      title="Habilidades"
      description="Lo que sabe hacer, de 0 a 10. El juego las usa para resolver pruebas y la mente para saber de qué es capaz."
    >
      <SkillsEditor :mind="mind" :editable="skillsEditable" @saved="onSaved" @error="onError" />
    </PanelCard>

    <details class="advanced">
      <summary>Configuración técnica ({{ wiring.length }} parámetros)</summary>
      <p class="muted">
        Solo lectura. Son los valores internos que mueven los rasgos de arriba; cada rasgo ajusta varios a la vez.
      </p>
      <dl class="wiring">
        <div v-for="[k, v] in wiring" :key="k">
          <dt><code>{{ k }}</code></dt>
          <dd>{{ typeof v === 'number' ? Number(v).toFixed(3) : String(v) }}</dd>
        </div>
      </dl>
    </details>
  </div>
</template>

<style scoped>
.stack { display: grid; gap: 20px; }
.intro { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 13px; }
.status { font-weight: 500; }
.status.ok { color: var(--positive); }
.status.error { color: var(--danger); }

.advanced {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 22px;
}
.advanced summary { cursor: pointer; font-weight: 500; color: var(--text-dim); }
.advanced p { font-size: 13px; }
.wiring {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 4px 24px;
  margin: 0;
}
.wiring div { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; border-bottom: 1px solid var(--border); }
.wiring dd { margin: 0; font-family: var(--mono); font-size: 12px; }
</style>
