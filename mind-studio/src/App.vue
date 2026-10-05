<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import CharacterCard from './components/CharacterCard.vue'
import EpisodePanel from './components/EpisodePanel.vue'
import EpisodeTape from './components/EpisodeTape.vue'
import HowItWorks from './components/HowItWorks.vue'
import MindGraph from './components/MindGraph.vue'
import NodeDetail from './components/NodeDetail.vue'
import TopBar from './components/TopBar.vue'
import type { NodeRef } from './components/nodeRef'
import { STEPS, type Spotlight } from './components/tour'
import { useMind } from './composables/useMind'
import { useMinds } from './composables/useMinds'
import { usePlayback } from './composables/usePlayback'
import { layoutMind } from './lib/layout'
import { episodeMarks } from './lib/mindAt'

const { minds, selectedId, error: rosterError, select } = useMinds()
const { mind, episodeIdx, snapshot, indices, loading, error, goTo, step } = useMind(selectedId)

const focus = shallowRef<NodeRef | null>(null)
const picked = shallowRef<NodeRef | null>(null)
const tourStep = shallowRef<number | null>(null)

const positions = computed(() =>
  mind.value ? layoutMind(mind.value.beliefs, mind.value.memories) : new Map(),
)
const marks = computed(() => (mind.value ? episodeMarks(mind.value) : new Map()))

const { playing, play, stop } = usePlayback(
  () => step(1),
  () => episodeIdx.value === indices.value.at(-1),
)

function startPlay() {
  play(() => { if (indices.value[0] != null) goTo(indices.value[0]) })
}

watch(selectedId, () => {
  picked.value = null
  focus.value = null
  stop()
})

const spotlight = computed<Spotlight | null>(() =>
  tourStep.value == null ? null : STEPS[tourStep.value]!.spotlight,
)

/** Each tour step parks the tape where its idea is visible. */
function tourGo(next: number) {
  tourStep.value = next
  const m = mind.value
  if (!m) return
  const spot = STEPS[next]!.spotlight
  const pick = (score: (k: number) => number) => {
    const best = [...indices.value].sort((a, b) => score(b) - score(a) || a - b)[0]
    if (best != null) goTo(best)
  }
  if (spot === 'memories') pick((k) => marks.value.get(k)?.born ?? 0)
  if (spot === 'traces') goTo(indices.value.at(-1)!)
  if (spot === 'beliefs') {
    const born = m.beliefs.map((b) => b.born_episode).filter((k): k is number => k != null)
    if (born.length) goTo(Math.min(...born) + 1 <= indices.value.at(-1)! ? Math.min(...born) + 1 : Math.min(...born))
  }
  if (spot === 'lens' || spot === 'resonance') pick((k) => marks.value.get(k)?.resonated ?? 0)
}

function openTour() {
  stop()
  picked.value = null
  tourGo(0)
}
</script>

<template>
  <div :class="['studio', spotlight && `spot-${spotlight}`]">
    <TopBar
      class="region-top"
      :minds="minds"
      :selected-id="selectedId"
      @select="select"
      @tour="openTour"
    />

    <p v-if="rosterError || error" class="notice">
      No pude leer la mente ({{ rosterError || error }}). ¿Está corriendo el story-engine?
    </p>
    <p v-else-if="!mind && !loading && !minds.length" class="notice">
      Todavía no hay mentes. Aparecen en cuanto un personaje vive su primer episodio.
    </p>

    <main v-if="mind && snapshot" class="stage">
      <CharacterCard
        class="region-card"
        :character="mind.character"
        :condition="mind.condition"
        :mood="snapshot.episode.mood"
        :preset="mind.preset"
        :counts="snapshot.counts"
      />

      <div class="region-graph">
        <MindGraph
          :snapshot="snapshot"
          :positions="positions"
          :focus="focus"
          :spotlight="spotlight"
          @focus="focus = $event"
          @pick="picked = $event"
        />
        <NodeDetail
          v-if="picked"
          :picked="picked"
          :snapshot="snapshot"
          @close="picked = null"
          @pick="picked = $event"
        />
        <HowItWorks
          v-if="tourStep != null"
          :step="tourStep"
          @go="tourGo"
          @close="tourStep = null"
        />
        <ul class="legend" aria-label="Cómo leer el cableado">
          <li><i class="lg-bulb" />recuerdo</li>
          <li><i class="lg-trace" />olvidado</li>
          <li><i class="lg-lamp" />creencia</li>
          <li><i class="lg-evoked" />vuelve hoy</li>
          <li><i class="lg-wire" />resonó</li>
          <li><i class="lg-need" />necesidad</li>
        </ul>
      </div>

      <EpisodePanel
        class="region-panel"
        :snapshot="snapshot"
        :focus="focus"
        @focus="focus = $event"
      />
    </main>

    <EpisodeTape
      v-if="mind"
      v-model="episodeIdx"
      class="region-tape"
      :episodes="mind.episodes"
      :marks="marks"
      :playing="playing"
      @play="startPlay"
      @stop="stop"
    />
  </div>
</template>

<style scoped>
.studio {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.stage {
  min-height: 0;
  display: grid;
  grid-template-columns: 300px 1fr 380px;
}

.region-graph { position: relative; min-width: 0; min-height: 0; }

.notice {
  margin: 40px auto;
  max-width: 480px;
  font-family: var(--prose);
  font-size: 16px;
  color: var(--chalk-dim);
  text-align: center;
}

.legend {
  position: absolute;
  right: 16px;
  bottom: 12px;
  display: flex;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--chalk-dim);
}
.legend li { display: flex; align-items: center; gap: 5px; }
.legend i { display: inline-block; width: 10px; height: 10px; }
.lg-bulb { border-radius: 50%; background: radial-gradient(var(--amber-hot), var(--tangerine)); }
.lg-trace { border-radius: 50%; border: 1px dashed var(--chalk-dim); }
.lg-lamp { border-radius: 3px; border: 1.4px solid var(--paper); }
.lg-evoked { border-radius: 50%; border: 1.5px solid var(--ruin); }
.lg-wire { height: 0 !important; border-top: 1.5px dashed var(--amber); width: 14px !important; }
.lg-need { border: 1.4px solid var(--rose); clip-path: polygon(25% 0, 75% 0, 100% 100%, 0 100%); }

/* Tour: dim the regions that are not being explained. */
.region-card, .region-panel, .region-tape, .region-top { transition: opacity 0.5s; }
.spot-tape .region-card, .spot-tape .region-panel,
.spot-lens .region-card, .spot-lens .region-tape,
.spot-memories .region-card, .spot-memories .region-panel,
.spot-traces .region-card, .spot-traces .region-panel,
.spot-beliefs .region-card, .spot-beliefs .region-panel,
.spot-resonance .region-card { opacity: 0.25; }
.spot-tape .region-graph, .spot-lens .region-graph { opacity: 0.35; transition: opacity 0.5s; }

@media (max-width: 1100px) {
  .stage { grid-template-columns: 1fr; grid-template-rows: auto 60vh auto; overflow-y: auto; }
  .region-card, .region-panel { border: 0; }
}
</style>
