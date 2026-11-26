<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { CONDITION, label, moodLabel, NEEDS } from '../lib/labels'
import { moodWord } from '../lib/moodSpace'
import { locale, setLocale, t, type Locale } from '../lib/i18n'
import { portraitSrc } from '../lib/urls'
import type { MindDetail, MindSummary } from '../types'

const props = defineProps<{
  minds: readonly MindSummary[]
  selectedId: string | null
  mind: MindDetail | null
}>()

const emit = defineEmits<{ select: [id: string] }>()

const selected = computed(() =>
  props.minds.find((m) => m.character_id === props.selectedId) ?? null)

// The card field, else the host's '/portraits/<Name>.png' convention —
// a failed guess falls back to the placeholder initial.
const brokenSrc = shallowRef<string | null>(null)
const avatar = computed(() => {
  const src = portraitSrc(selected.value?.portrait_url, selected.value?.name)
  return src && src !== brokenSrc.value ? src : null
})

const openNeeds = computed(() =>
  (props.mind?.needs ?? []).filter((n) => n.status === 'open'))

const conditionNotes = computed(() => {
  const c = props.mind?.condition ?? {}
  const out: { key: string; value: string }[] = []
  if (c.wounded && c.wounded !== 'none' && c.wounded !== false)
    out.push({ key: 'wounded', value: String(c.wounded) })
  if (typeof c.energy === 'number' && c.energy < 40)
    out.push({ key: 'energy', value: `${c.energy}` })
  if (typeof c.shadow === 'number' && c.shadow > 0)
    out.push({ key: 'shadow', value: `${c.shadow}` })
  return out
})

const langs: { id: Locale; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'en', label: 'EN' },
]
</script>

<template>
  <header class="header">
    <div class="brand">
      <span class="mark" aria-hidden="true">◐</span>
      <span class="name">{{ t('app.title') }}</span>
    </div>

    <div v-if="mind" class="state">
      <span class="badge badge-accent" :title="t('ep.mood', { mood: '' }).trim()">
        {{ moodLabel(moodWord(mind.mood)) }}
      </span>
      <span
        v-for="n in openNeeds" :key="n.key"
        class="badge need"
      >{{ label(NEEDS, n.key) }}</span>
      <span
        v-for="c in conditionNotes" :key="c.key"
        class="badge warn"
      >{{ label(CONDITION, c.key) }} {{ c.value !== 'true' ? c.value : '' }}</span>
    </div>

    <div class="right">
      <label class="picker">
        <img
          v-if="avatar"
          :src="avatar"
          alt="" class="avatar"
          @error="brokenSrc = avatar"
        />
        <span v-else class="avatar placeholder" aria-hidden="true">
          {{ (selected?.name ?? '?').charAt(0).toUpperCase() }}
        </span>
        <select
          class="field"
          :value="selectedId ?? ''"
          @change="emit('select', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="m in minds" :key="m.character_id" :value="m.character_id">
            {{ m.name }} · {{ m.episodes }} {{ t('nav.episodes') }}
          </option>
        </select>
      </label>

      <div class="langs" role="group" aria-label="Language">
        <button
          v-for="l in langs" :key="l.id"
          :class="['lang', { on: locale === l.id }]"
          @click="setLocale(l.id)"
        >{{ l.label }}</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.mark { color: var(--accent); font-size: 18px; }
.name { font-weight: 600; font-size: 15px; }

.state { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
.need { color: var(--danger); border-color: rgba(224, 112, 124, 0.35); }
.warn { color: #d8b84e; border-color: rgba(216, 184, 78, 0.35); }

.right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.picker { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.picker select { width: auto; min-width: 200px; padding: 6px 10px; }
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-strong);
  flex-shrink: 0;
}
.placeholder {
  display: grid;
  place-items: center;
  background: var(--surface-2);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
}

.langs { display: flex; gap: 2px; }
.lang {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  font-family: var(--mono);
  color: var(--text-dim);
  cursor: pointer;
}
.lang:hover { color: var(--text); }
.lang.on { color: var(--accent); border-color: var(--border); }
</style>
