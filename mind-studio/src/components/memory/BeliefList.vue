<script setup lang="ts">
import { t } from '../../lib/i18n'
import { BELIEF_HORIZON, BELIEF_KIND, BELIEF_ORIGIN, humanize, label } from '../../lib/labels'
import type { BeliefNode } from '../../types'
import MeterBar from '../ui/MeterBar.vue'

defineProps<{ beliefs: BeliefNode[] }>()

// The subject as the host worded it; fall back to the tag's last
// segment ('entity:rivendell' → 'rivendell') — same as RelationList.
const name = (subject: string) => humanize(subject.split(':').pop() ?? subject)
</script>

<template>
  <table v-if="beliefs.length" class="table">
    <thead>
      <tr>
        <th>{{ t('belief.col.belief') }}</th>
        <th>{{ t('belief.col.subject') }}</th>
        <th>{{ t('belief.col.about') }}</th>
        <th :title="t('belief.col.horizon.help')">{{ t('belief.col.horizon') }}</th>
        <th>{{ t('belief.col.origin') }}</th>
        <th :title="t('belief.col.strength.help')">{{ t('belief.col.strength') }}</th>
        <th>{{ t('belief.col.since') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="b in beliefs" :key="b.id">
        <td class="text">{{ b.statement }}</td>
        <td class="subject">
          <template v-if="b.subjects?.length">
            <span v-for="s in b.subjects" :key="s" class="subj">
              {{ name(s) }}
              <span class="sub muted">{{ s }}</span>
            </span>
          </template>
          <span v-else class="muted">—</span>
        </td>
        <td><span class="badge">{{ label(BELIEF_KIND, b.kind) }}</span></td>
        <td class="muted">{{ label(BELIEF_HORIZON, b.horizon) }}</td>
        <td class="muted">{{ label(BELIEF_ORIGIN, b.origin) }}</td>
        <td class="strength">
          <MeterBar :value="b.strength" :max="5" />
          <span class="num">{{ b.strength.toFixed(1) }}</span>
        </td>
        <td class="num">{{ b.born_episode != null ? t('mem.ep', { n: b.born_episode }) : t('mem.preset') }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else class="empty">{{ t('mem.empty.beliefs') }}</p>
</template>

<style scoped src="./table.css"></style>
<style scoped>
.strength { white-space: nowrap; }
.strength .num { margin-left: 8px; }
.subject { white-space: nowrap; }
.subj { display: inline-block; margin-right: 16px; }
.sub { display: block; font-family: var(--mono); font-size: 11px; margin-top: 2px; }
</style>
