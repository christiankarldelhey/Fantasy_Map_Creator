<script setup lang="ts">
// ============================================================================
// NatureEditor — the mind's nature (ADR 0017): temperament + personality
// ----------------------------------------------------------------------------
// Temperament is the resting point the mood regresses to — the "fixed
// mood": the character's nature, not its weather. Personality is the
// couplings: how much the lived day moves the mood (moodiness), how
// stubbornly relations resist contradiction (resistance), how much the
// pick varies between like options (choice_variability), and per-dim
// feeling gains (sensitivity).
//
// The preset select imprints an authored archetype's nature — it only
// writes temperament + personality; identity, wiring, concerns and
// everything lived (beliefs, memories) stay untouched.
// ============================================================================
import { onMounted, reactive, shallowRef } from 'vue'
import {
  applyPersonalityPreset, fetchPresets, patchPersonality, patchTemperament,
} from '../../api'
import type { MindDetail, PresetNature } from '../../types'
import SliderField from '../ui/SliderField.vue'

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ saved: []; error: [message: string] }>()

const temperament = reactive({
  valence: props.mind.temperament?.valence ?? 0,
  arousal: props.mind.temperament?.arousal ?? 0,
})

const personality = reactive({
  moodiness: (props.mind.personality?.moodiness as number) ?? 0.3,
  resistance: (props.mind.personality?.resistance as number) ?? 0,
  choice_variability: (props.mind.personality?.choice_variability as number) ?? 0.3,
})

const sensitivity = reactive<Record<string, number>>({
  affection: ((props.mind.personality?.sensitivity as Record<string, number>)?.affection) ?? 1,
  trust: ((props.mind.personality?.sensitivity as Record<string, number>)?.trust) ?? 1,
  fear: ((props.mind.personality?.sensitivity as Record<string, number>)?.fear) ?? 1,
  familiarity: ((props.mind.personality?.sensitivity as Record<string, number>)?.familiarity) ?? 1,
})

async function saveTemperament() {
  try {
    const saved = await patchTemperament(props.mind.character_id, {
      valence: temperament.valence,
      arousal: temperament.arousal,
    })
    Object.assign(temperament, saved)
    emit('saved')
  } catch (e) {
    emit('error', (e as Error).message)
  }
}

async function savePersonality() {
  try {
    const saved = await patchPersonality(props.mind.character_id, {
      moodiness: personality.moodiness,
      resistance: personality.resistance,
      choice_variability: personality.choice_variability,
      sensitivity: { ...sensitivity },
    })
    emit('saved')
    void saved
  } catch (e) {
    emit('error', (e as Error).message)
  }
}

// -- presets ---------------------------------------------------------------
const presets = shallowRef<PresetNature[]>([])
const picked = shallowRef('')
const applying = shallowRef(false)

onMounted(async () => {
  try {
    presets.value = await fetchPresets()
  } catch {
    presets.value = []
  }
})

async function applyPreset() {
  if (!picked.value || applying.value) return
  applying.value = true
  try {
    const saved = await applyPersonalityPreset(props.mind.character_id, picked.value)
    Object.assign(temperament, {
      valence: saved.temperament.valence ?? 0,
      arousal: saved.temperament.arousal ?? 0,
    })
    const p = saved.personality as Record<string, number & Record<string, number>>
    personality.moodiness = p.moodiness ?? 0.3
    personality.resistance = p.resistance ?? 0
    personality.choice_variability = p.choice_variability ?? 0.3
    if (p.sensitivity) Object.assign(sensitivity, p.sensitivity)
    emit('saved')
  } catch (e) {
    emit('error', (e as Error).message)
  } finally {
    applying.value = false
  }
}

const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`
const gain = (v: number) => `×${Number(v).toFixed(2)}`

const SENS_LABEL: Record<string, string> = {
  affection: 'Afecto', trust: 'Confianza', fear: 'Miedo', familiarity: 'Familiaridad',
}
</script>

<template>
  <div class="nature">
    <div class="preset">
      <label class="preset-label">
        Personalidad preconfigurada
        <select v-model="picked" class="select">
          <option value="" disabled>Elegir un arquetipo…</option>
          <option v-for="p in presets" :key="p.slug" :value="p.slug">
            {{ p.name ?? p.slug }}
          </option>
        </select>
      </label>
      <button class="btn" :disabled="!picked || applying" @click="applyPreset">
        {{ applying ? 'Aplicando…' : 'Aplicar' }}
      </button>
      <p class="muted small">
        Copia solo el temperamento y los acoples del arquetipo — la identidad, los rasgos y lo vivido no se tocan.
      </p>
    </div>

    <div class="block">
      <h4>Temperamento <span class="muted">— el punto de reposo del ánimo</span></h4>
      <p class="muted small">
        A dónde vuelve el ánimo cuando nada lo empuja. El mood de arriba es el tiempo de hoy; esto es el clima del personaje.
      </p>
      <div class="fields">
        <SliderField
          v-model="temperament.valence"
          label="Ánimo de base"
          help="Pesimista ↔ optimista por naturaleza."
          low="Pesimista"
          high="Optimista"
          :min="-1"
          :format="signed"
          @commit="saveTemperament"
        />
        <SliderField
          v-model="temperament.arousal"
          label="Agitación de base"
          help="Calmo ↔ revuelto por naturaleza."
          low="Apacible"
          high="Inquieto"
          :min="-1"
          :format="signed"
          @commit="saveTemperament"
        />
      </div>
    </div>

    <div class="block">
      <h4>Acoples <span class="muted">— cómo conecta el temperamento con lo vivido</span></h4>
      <div class="fields">
        <SliderField
          v-model="personality.moodiness"
          label="Volubilidad (moodiness)"
          help="Qué tan rápido el ánimo se mueve y regresa al temperamento."
          low="Estable — el ánimo aguanta"
          high="Cambia con cada cosa"
          @commit="savePersonality"
        />
        <SliderField
          v-model="personality.resistance"
          label="Terquedad (resistance)"
          help="Cuánto se resiste a cambiar de parecer: lo que contradice lo que ya siente entra amortiguado."
          low="Escucha las contradicciones"
          high="Nada le mueve un juicio"
          @commit="savePersonality"
        />
        <SliderField
          v-model="personality.choice_variability"
          label="Variabilidad de elección"
          help="Entre opciones parejas, cuánto varía la elección que toma."
          low="Siempre la más preferida"
          high="Impredecible"
          @commit="savePersonality"
        />
      </div>

      <details class="sens">
        <summary>Sensibilidad por dimensión <span class="muted">— cuánto le llega cada clase de sentimiento</span></summary>
        <div class="fields">
          <SliderField
            v-for="(label, dim) in SENS_LABEL" :key="dim"
            v-model="sensitivity[dim]"
            :label="label"
            help="Ganancia: 1 es normal, 0 no lo siente, 2 le llega el doble."
            low="No lo siente"
            high="Le llega el doble"
            :max="2"
            :format="gain"
            @commit="savePersonality"
          />
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.nature { display: grid; gap: 22px; }
.preset { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
.preset-label { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
.select {
  font: inherit;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel, #fff);
}
.preset > p { flex-basis: 100%; margin: 0; }
.small { font-size: 12px; }
.block h4 { margin: 0 0 6px; font-size: 14px; font-weight: 600; }
.block h4 .muted { font-weight: 400; font-size: 13px; }
.block > p { margin: 0 0 12px; }
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px 32px; }
.sens { margin-top: 18px; border-top: 1px solid var(--border); padding-top: 12px; }
.sens summary { cursor: pointer; font-size: 13px; color: var(--text-dim); font-weight: 500; }
.sens .fields { margin-top: 14px; }
</style>
