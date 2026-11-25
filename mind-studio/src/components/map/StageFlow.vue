<script setup lang="ts">
// StageFlow — a stage drawn as the process it is: in → numbered steps →
// out, each card carrying the one-line job and a running example. All
// copy comes from i18n under `prefix` (.in/.out/.pN.t/.pN.d/.pN.e).
import { ChevronRight } from '@lucide/vue'
import { t } from '../../lib/i18n'

defineProps<{ prefix: string; steps: number }>()
</script>

<template>
  <div class="flow">
    <div class="end">
      <b>{{ t(`${prefix}.in`) }}</b>
      <span>{{ t(`${prefix}.in.sub`) }}</span>
    </div>
    <template v-for="i in steps" :key="i">
      <ChevronRight :size="15" class="arrow" />
      <div class="step">
        <header>
          <span class="n">{{ i }}</span>
          <b>{{ t(`${prefix}.p${i}.t`) }}</b>
        </header>
        <p>{{ t(`${prefix}.p${i}.d`) }}</p>
        <code>{{ t(`${prefix}.p${i}.e`) }}</code>
      </div>
    </template>
    <ChevronRight :size="15" class="arrow" />
    <div class="end out">
      <b>{{ t(`${prefix}.out`) }}</b>
      <span>{{ t(`${prefix}.out.sub`) }}</span>
    </div>
  </div>
</template>

<style scoped>
.flow {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  gap: 4px;
  overflow-x: auto;
  padding: 12px;
  margin-bottom: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.end, .step {
  flex: 0 0 auto;
  width: 200px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 10px 12px;
}
.end {
  width: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  border-style: dashed;
  border-color: var(--border-strong);
}
.end b { font-family: var(--mono); font-size: 12px; color: var(--text); }
.end span { font-size: 11px; color: var(--text-faint); line-height: 1.35; }
.end.out { border-color: var(--accent); }
.end.out b { color: var(--accent); }
.step header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
}
.step .n {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
  font-weight: 600;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.step b { font-size: 12px; color: var(--text); }
.step p {
  margin: 0 0 7px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--text-dim);
}
.step code {
  display: block;
  font-size: 10.5px;
  line-height: 1.35;
  color: var(--accent);
  background: var(--surface-2);
  border-radius: 4px;
  padding: 4px 6px;
}
.arrow { align-self: center; color: var(--text-faint); flex: 0 0 auto; }
</style>
