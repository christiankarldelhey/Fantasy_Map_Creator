<script setup lang="ts" generic="T extends string">
defineProps<{ tabs: readonly { id: T; label: string; count?: number }[] }>()

const active = defineModel<T>({ required: true })
</script>

<template>
  <nav class="tabs" role="tablist">
    <button
      v-for="t in tabs"
      :key="t.id"
      role="tab"
      :aria-selected="active === t.id"
      :class="['tab', { on: active === t.id }]"
      @click="active = t.id"
    >
      {{ t.label }}
      <span v-if="t.count != null" class="count">{{ t.count }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); }
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dim);
}
.tab:hover { color: var(--text); }
.tab.on { color: var(--text); border-bottom-color: var(--accent); }
.count {
  font-size: 11px;
  font-family: var(--mono);
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-dim);
}
</style>
