<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <section class="card">
    <header class="head">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="description" class="desc">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="actions"><slot name="actions" /></div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 22px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
h3 { font-size: 15px; }
.desc { margin: 4px 0 0; font-size: 13px; color: var(--text-dim); max-width: 60ch; }
.actions { display: flex; gap: 8px; flex-shrink: 0; }
</style>
