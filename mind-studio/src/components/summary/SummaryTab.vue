<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { locale, t } from '../../lib/i18n'
import { portraitSrc } from '../../lib/urls'
import type { MindDetail } from '../../types'
import PanelCard from '../ui/PanelCard.vue'
import CardEditForm from './CardEditForm.vue'

const props = defineProps<{ mind: MindDetail }>()
const emit = defineEmits<{ saved: [] }>()

const editing = shallowRef(false)

const character = computed(() => props.mind.character)
const editable = computed(() => character.value.kind !== 'original' && character.value.adopted)

// Convention-guessed portraits can 404 for names without a file — the
// placeholder initial is the fallback, not a broken icon.
const brokenSrc = shallowRef<string | null>(null)
const portrait = computed(() => {
  const src = portraitSrc(character.value.portrait_url, character.value.name)
  return src && src !== brokenSrc.value ? src : null
})

const description = computed(() =>
  locale.value === 'es'
    ? character.value.description_es || character.value.description
    : character.value.description || character.value.description_es)

const lineage = computed(() =>
  character.value.kind === 'original'
    ? t('sum.original')
    : character.value.original
      ? t('sum.copyOf', { name: character.value.original })
      : t('sum.copy'),
)

function onSaved() {
  editing.value = false
  emit('saved')
}
</script>

<template>
  <div class="grid">
    <PanelCard :title="t('sum.who')" class="span-2">
      <template #actions>
        <button v-if="editable && !editing" class="btn" @click="editing = true">{{ t('sum.edit') }}</button>
      </template>

      <CardEditForm
        v-if="editing"
        :character="character"
        :character-id="mind.character_id"
        @cancel="editing = false"
        @saved="onSaved"
      />

      <div v-else class="identity">
        <img
          v-if="portrait" :src="portrait" alt="" class="portrait"
          @error="brokenSrc = portrait"
        />
        <div v-else class="portrait placeholder" aria-hidden="true">
          {{ (character.name ?? '?').charAt(0).toUpperCase() }}
        </div>
        <div class="who">
          <h2 class="char-name">{{ character.name ?? '—' }}</h2>
          <div class="tags">
            <span v-if="character.entity_name" class="badge">{{ character.entity_name }}</span>
            <span class="badge badge-accent" :title="t('sum.preset', { name: '' }).trim()">{{ t('sum.preset', { name: mind.preset }) }}</span>
            <span class="badge">{{ lineage }}</span>
          </div>
          <p v-if="description" class="description">{{ description }}</p>
          <p v-if="!editable" class="muted small">
            {{ character.kind === 'original' ? t('sum.noedit.original') : t('sum.noedit.pending') }}
          </p>
        </div>
      </div>
    </PanelCard>

    <PanelCard
      v-if="character.foundational_phrase"
      :title="t('sum.lens')"
      :description="t('sum.lens.desc')"
      class="span-2"
    >
      <blockquote class="phrase">{{ character.foundational_phrase }}</blockquote>
    </PanelCard>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.span-2 { grid-column: span 2; }

.identity { display: flex; gap: 24px; align-items: flex-start; }
.portrait {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border-strong);
}
.placeholder {
  display: grid;
  place-items: center;
  background: var(--surface-2);
  font-size: 48px;
  font-weight: 600;
  color: var(--text-dim);
}
.who { display: grid; gap: 10px; min-width: 0; }
.char-name { font-size: 26px; font-weight: 600; letter-spacing: -0.01em; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.description { margin: 0; color: var(--text); max-width: 75ch; }
.small { font-size: 13px; margin: 0; }

.phrase {
  margin: 0;
  padding-left: 16px;
  border-left: 2px solid var(--accent);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.65;
  white-space: pre-line;
  max-width: 75ch;
}

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: auto; }
}
</style>
