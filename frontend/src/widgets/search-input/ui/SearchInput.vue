<template>
  <div class="search-container absolute top-4 left-[220px] z-[9999]">
    <Popover v-model:open="showDropdown">
      <PopoverTrigger as-child>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
          <Input
            v-model="searchQuery"
            @input="handleInput"
            @focus="showDropdown = true"
            placeholder="Search locations or regions..."
            :class="['w-72 bg-parchment-base pl-9 text-ink-black placeholder:text-ink-light border-earth-dark', searchQuery.length > 0 ? 'pr-9' : '']"
          />
          <button
            v-if="searchQuery.length > 0"
            @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink-black transition-colors"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent class="w-72 p-0 z-[10000] bg-parchment-base border border-earth-dark" align="start">
        <div v-if="loading" class="p-4 text-center text-sm text-ink-brown">
          Searching...
        </div>
        <div
          v-else-if="results.length === 0 && searchQuery.length >= 2"
          class="p-4 text-center text-sm text-ink-brown"
        >
          No results found
        </div>
        <div v-else class="max-h-96 overflow-y-auto">
          <div
            v-for="result in results"
            :key="`${result.type}-${result.id}`"
            @click="selectResult(result)"
            class="px-4 py-3 hover:bg-parchment-dark cursor-pointer flex items-center justify-between group"
          >
            <div class="flex items-center gap-3">
              <span class="text-ink-light">
                <svg
                  v-if="result.type === 'location'"
                  class="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </span>
              <div>
                <div class="font-medium text-ink-black text-sm">{{ result.name }}</div>
                <div class="text-xs text-ink-brown capitalize">{{ result.type }}</div>
              </div>
            </div>
            <svg
              class="w-4 h-4 text-ink-faded group-hover:text-ink-light"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, X } from '@lucide/vue'
import { useSearch } from '@/entities/search'
import type { SearchResult } from '@/entities/search'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const emit = defineEmits<{
  select: [result: SearchResult]
  clear: []
}>()

const { query, results, loading, search } = useSearch()

const searchQuery = ref('')
const showDropdown = ref(false)

function handleInput() {
  query.value = searchQuery.value
  if (searchQuery.value.length >= 2) {
    search(searchQuery.value)
    showDropdown.value = true
  } else {
    results.value = []
  }
}

function clearSearch() {
  searchQuery.value = ''
  query.value = ''
  results.value = []
  showDropdown.value = false
  emit('clear')
}

function selectResult(result: SearchResult) {
  emit('select', result)
  showDropdown.value = false
  searchQuery.value = ''
  query.value = ''
  results.value = []
}

defineExpose({
  searchQuery,
  setSearchQuery: (value: string) => {
    searchQuery.value = value
  }
})
</script>
