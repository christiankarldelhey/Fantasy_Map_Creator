<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { t } from '../../lib/i18n'
import { moodLabel } from '../../lib/labels'
import { moodWord } from '../../lib/moodSpace'
import type { MindDetail } from '../../types'
import MoodSpace from '../episodes/MoodSpace.vue'
import PanelCard from '../ui/PanelCard.vue'
import NatureEditor from './NatureEditor.vue'
import SkillsEditor from './SkillsEditor.vue'

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ saved: [] }>()

const status = shallowRef<{ kind: 'ok' | 'error'; text: string } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

function onSaved() {
  status.value = { kind: 'ok', text: t('per.saved') }
  clearTimeout(timer)
  timer = setTimeout(() => { status.value = null }, 2000)
  emit('saved')
}

function onError(message: string) {
  clearTimeout(timer)
  status.value = { kind: 'error', text: t('per.saveErr', { err: message }) }
}

// Read-only by default: each writable card opens behind a pencil.
const editingSkills = shallowRef(false)

const skillsEditable = computed(
  () => props.mind.character.kind !== 'original' && props.mind.character.adopted,
)
const wiring = computed(() => Object.entries(props.mind.wiring))

const moodName = computed(() => moodLabel(moodWord(props.mind.mood)))
const tempName = computed(() =>
  moodLabel(moodWord({
    valence: props.mind.temperament?.valence ?? 0,
    arousal: props.mind.temperament?.arousal ?? 0,
  })))
</script>

<template>
  <div class="stack">
    <p class="intro muted">
      {{ t('per.intro') }}
      <span v-if="status" :class="['status', status.kind]">{{ status.text }}</span>
    </p>

    <PanelCard :title="t('per.chart')" :description="t('per.chart.desc')">
      <MoodSpace :mood="mind.mood" :temperament="mind.temperament" readonly large>
        <template #side>
          <div class="points">
            <p class="pt mood-pt">
              <span class="dot" />
              <b>{{ t('per.chart.mood') }}</b> — {{ moodName }}
            </p>
            <p class="pt temp-pt">
              <span class="dot" />
              <b>{{ t('per.chart.temp') }}</b> — {{ tempName }}
            </p>
          </div>
          <p class="legend muted">{{ t('per.chart.legend') }}</p>
        </template>
      </MoodSpace>
    </PanelCard>

    <PanelCard :title="t('per.temp')">
      <NatureEditor :mind="mind" />
    </PanelCard>

    <PanelCard :title="t('per.skills')" :description="t('per.skills.desc')">
      <template #actions>
        <button v-if="skillsEditable" class="btn edit" @click="editingSkills = !editingSkills">
          {{ editingSkills ? '✓ ' + t('per.done') : '✎ ' + t('per.edit') }}
        </button>
      </template>
      <p v-if="!skillsEditable" class="muted small lock">{{ t('per.skills.readonly') }}</p>
      <SkillsEditor
        :mind="mind"
        :editable="skillsEditable && editingSkills"
        @saved="onSaved"
        @error="onError"
      />
    </PanelCard>

    <details class="advanced">
      <summary>{{ t('per.wiring', { n: wiring.length }) }}</summary>
      <p class="muted">{{ t('per.wiring.desc') }}</p>
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

.points { display: grid; gap: 8px; margin-top: 6px; }
.pt { display: flex; align-items: baseline; gap: 8px; margin: 0; font-size: 14px; }
.pt .dot { width: 10px; height: 10px; border-radius: 50%; align-self: center; flex-shrink: 0; }
.mood-pt .dot { background: var(--accent); }
.temp-pt .dot { border: 1.6px dashed var(--positive); }
.legend { margin: 6px 0 0; font-size: 13px; line-height: 1.6; max-width: 52ch; }

.edit { font-size: 12px; padding: 4px 10px; }
.lock { margin: 0 0 14px; font-size: 13px; }

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
