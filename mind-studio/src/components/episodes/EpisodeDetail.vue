<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { t } from '../../lib/i18n'
import {
  EPISODE_STATUS, label, moodLabel, NEEDS, PHASES, SILENCED_KIND, SILENCED_REASON,
} from '../../lib/labels'
import { moodWord } from '../../lib/moodSpace'
import type { EpisodeView, LensLine, MindDetail, PerceivedEvent } from '../../types'
import PanelCard from '../ui/PanelCard.vue'
import DayChart from './DayChart.vue'
import LivedView from './LivedView.vue'

const props = defineProps<{
  episode: EpisodeView
  /** The mind's current Condition — shown only when this is the latest
   *  episode (the state is as it stands now, not as it stood then). */
  condition?: Record<string, unknown>
  needs?: MindDetail['needs']
  latest?: boolean
}>()

// The event under the cursor on the day chart — its popup names the
// mood it left.
const selectedEvent = shallowRef<PerceivedEvent | null>(null)

const brief = computed(() => props.episode.brief)
const focusLine = computed(() => props.episode.lens.find((l) => l.section === 'focus') ?? null)
const silenced = computed(() => brief.value?.silenced ?? [])

const translation = computed(() => props.episode.narrative_translation)
const lang = shallowRef<'reader' | 'inner'>('reader')
const paragraphs = computed(() => {
  const text = lang.value === 'reader' && translation.value ? translation.value.text : (props.episode.narrative ?? '')
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
})

const phase = (line: Pick<LensLine, 'phase'>) => (line.phase ? label(PHASES, line.phase) : null)

// The mind's condition right now — only meaningful on the latest day.
// Open needs already in the episode's needs_active aren't repeated.
const openNeeds = computed(() =>
  (props.needs ?? []).filter((n) => n.status === 'open'
    && !props.episode.needs_active.some((a) => a.key === n.key)))
const conditionBits = computed(() =>
  Object.entries(props.condition ?? {})
    .filter(([, v]) => v !== null && v !== '' && v !== 'none'
      && !(Array.isArray(v) && !v.length) && v !== false)
    .map(([key, v]) => ({
      key,
      value: Array.isArray(v) ? v.join(', ') : String(v),
    })))
</script>

<template>
  <div class="detail">
    <header class="head">
      <h2>{{ t('ep.episode', { n: episode.idx ?? '—' }) }}</h2>
      <span class="muted mono">{{ episode.date ?? t('ep.nodate') }}</span>
      <span class="badge">{{ label(EPISODE_STATUS, episode.status) }}</span>
      <span class="badge badge-accent">{{ t('ep.mood', { mood: moodLabel(moodWord(episode.mood)) }) }}</span>
      <span v-for="n in episode.needs_active" :key="n.key" class="badge need">{{ label(NEEDS, n.key) }}</span>
      <template v-if="latest">
        <span
          v-for="n in openNeeds" :key="`open-${n.id}`"
          class="badge need open"
          :title="n.description"
        >{{ label(NEEDS, n.key) }}</span>
        <span
          v-for="c in conditionBits" :key="`cond-${c.key}`"
          class="badge warn"
        >{{ c.key }}: {{ c.value }}</span>
      </template>
    </header>

    <PanelCard
      :title="t('ep.focus')"
      :description="t('ep.focus.desc')"
    >
      <template v-if="focusLine">
        <p class="focus">{{ focusLine.text }}</p>
        <p class="meta">
          <span v-if="phase(focusLine)" class="badge">{{ phase(focusLine) }}</span>
        </p>
      </template>
      <p v-else class="empty">{{ t('ep.focus.empty') }}</p>
    </PanelCard>

    <PanelCard
      :title="t('ep.day')"
      :description="t('ep.day.desc')"
    >
      <DayChart
        v-if="episode.perceived.length"
        :episode="episode"
        :selected-event="selectedEvent"
        @select="selectedEvent = $event"
      />
    </PanelCard>

    <PanelCard
      v-if="episode.lived.length"
      :title="t('ep.lived')"
      :description="t('ep.lived.desc')"
    >
      <LivedView :events="episode.events" :lived="episode.lived" :mood="episode.mood" />
    </PanelCard>

    <PanelCard :title="t('ep.narrative')" :description="t('ep.narrative.desc')">
      <template v-if="translation && episode.narrative" #actions>
        <div class="switch">
          <button :class="['btn', { 'btn-primary': lang === 'reader' }]" @click="lang = 'reader'">{{ translation.language }}</button>
          <button :class="['btn', { 'btn-primary': lang === 'inner' }]" @click="lang = 'inner'">{{ t('ep.narrative.inner') }}</button>
        </div>
      </template>
      <article v-if="paragraphs.length" class="prose">
        <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
      </article>
      <p v-else class="empty">{{ t('ep.narrative.empty') }}</p>
    </PanelCard>

    <details v-if="silenced.length" class="silenced">
      <summary>{{ t('ep.silenced', { n: silenced.length }) }}</summary>
      <p class="muted small">{{ t('ep.silenced.desc') }}</p>
      <ul>
        <li v-for="(s, i) in silenced" :key="i">
          <span class="badge">{{ label(SILENCED_KIND, s.kind) }}</span>
          <div>
            <p>{{ s.text }}</p>
            <p class="muted small">{{ label(SILENCED_REASON, s.reason) }}</p>
          </div>
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.detail { display: grid; gap: 20px; min-width: 0; }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.head h2 { font-size: 20px; margin-right: 4px; }
.mono { font-family: var(--mono); font-size: 12px; }
.need { color: var(--danger); border-color: rgba(224, 112, 124, 0.35); }
.need.open { border-style: dashed; }
.warn { color: #d8b84e; border-color: rgba(216, 184, 78, 0.35); }
.small { font-size: 13px; }
p { margin: 0; }

.focus { font-size: 16px; line-height: 1.55; max-width: 75ch; }
.meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline; margin-top: 10px; font-size: 13px; }

.silenced ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }

.switch { display: flex; gap: 6px; }
.prose { font-family: var(--serif); font-size: 16px; line-height: 1.7; max-width: 70ch; }
.prose p + p { margin-top: 1em; }

.silenced { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 22px; }
.silenced summary { cursor: pointer; font-weight: 500; color: var(--text-dim); }
.silenced > p { margin: 10px 0 14px; }
.silenced li { display: grid; grid-template-columns: 110px 1fr; gap: 12px; align-items: start; }
.silenced li .badge { justify-self: start; }
</style>
