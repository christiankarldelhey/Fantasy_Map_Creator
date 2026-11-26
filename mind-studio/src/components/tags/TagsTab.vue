<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { fetchTags } from '../../api'
import { pick, t } from '../../lib/i18n'
import type { TagFamily, TagRegistry } from '../../types'
import PanelCard from '../ui/PanelCard.vue'

// The shared Tag registry (ADR-0016): one flat vocabulary every consumer
// consults — gating, memory, retrieval, needs, attitudes. Read-only; the
// seed file is the source of truth.

// Mirror of app/mind/tags.py TAG_CLASSES — the Mind's reading of what
// each family can do. The registry is declarative; this is how the
// engine actually consumes it. Update together.
const TAG_CLASSES: Record<string, Set<string>> = {
  type: new Set(['ambient']),
  weather: new Set(['ambient', 'pattern']),
  food: new Set(['subject', 'pattern']),
  drink: new Set(['subject', 'pattern']),
  kind: new Set(['subject']),
  region: new Set(['ambient', 'subject', 'pattern']),
  entity: new Set(['subject', 'pattern', 'cause']),
  entity_type: new Set(['subject', 'pattern', 'cause']),
  npc: new Set(['subject', 'pattern', 'cause']),
  family: new Set(['subject', 'pattern']),
  race: new Set(['subject']),
  place: new Set(['subject', 'pattern']),
  form: new Set(['cause']),
  rest: new Set(['pattern']),
  topic: new Set(['pattern']),
  subtype: new Set(['ambient']),
  act: new Set(['ambient']),
}

type Category = 'subjects' | 'forms' | 'patterns' | 'ambient' | 'marks'

const classesOf = (family: string) => TAG_CLASSES[family] ?? new Set<string>()

function categoryOf(fam: TagFamily): Category {
  const cls = classesOf(fam.family)
  if (fam.family === 'tag' || cls.size === 0) return 'marks'
  if ([...cls].every((c) => c === 'ambient')) return 'ambient'
  if (cls.has('subject')) return 'subjects'
  if (cls.has('cause')) return 'forms'
  return 'patterns'
}

const registry = shallowRef<TagRegistry | null>(null)
const error = shallowRef<string | null>(null)

onMounted(async () => {
  try {
    registry.value = await fetchTags()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

const CATEGORIES: Category[] = ['subjects', 'forms', 'patterns', 'ambient', 'marks']

const grouped = computed(() => {
  const out = new Map<Category, TagFamily[]>(CATEGORIES.map((c) => [c, []]))
  for (const fam of registry.value?.families ?? []) {
    out.get(categoryOf(fam))!.push(fam)
  }
  return CATEGORIES
    .filter((c) => out.get(c)!.length)
    .map((c) => ({ cat: c, families: out.get(c)! }))
})
</script>

<template>
  <p v-if="error" class="notice error">{{ t('tags.err', { err: error }) }}</p>
  <p v-else-if="!registry" class="notice muted">{{ t('tags.loading') }}</p>

  <div v-else>
    <p class="intro muted">{{ t('tags.intro') }}</p>

    <section v-for="g in grouped" :key="g.cat" class="cat">
      <h3 class="cat-title">{{ t(`tags.cat.${g.cat}`) }}</h3>
      <p class="cat-desc muted">{{ t(`tags.cat.${g.cat}.desc`) }}</p>

      <div class="grid">
        <PanelCard
          v-for="fam in g.families"
          :key="fam.family"
          :title="fam.family"
          :description="pick(fam.description)"
        >
          <div class="classes">
            <span
              v-for="c in [...classesOf(fam.family)]" :key="c"
              class="badge cls"
              :title="t(`tags.class.${c}.help`)"
            >{{ t(`tags.class.${c}`) }}</span>
            <span v-for="c in fam.consumers" :key="c" class="badge badge-accent">{{ c }}</span>
            <span v-if="fam.open" class="badge" :title="t('tags.open.help')">{{ t('tags.open') }}</span>
          </div>
          <div class="values">
            <span v-for="v in fam.values" :key="v" class="tag">{{ fam.family }}:{{ v }}</span>
            <span v-if="fam.open" class="tag open">{{ fam.family}}:*</span>
          </div>
        </PanelCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
.intro { margin: 0 0 28px; font-size: 13.5px; line-height: 1.6; max-width: 95ch; }
.cat { margin-bottom: 28px; }
.cat-title { font-size: 14px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-dim); }
.cat-desc { margin: 0 0 14px; font-size: 13px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.classes { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.cls { color: var(--positive); border-color: rgba(125, 216, 125, 0.3); }
.values { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  font-family: var(--mono);
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
}
.tag.open { color: var(--text); border-style: dashed; }
.notice { margin: 48px auto; max-width: 520px; text-align: center; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
