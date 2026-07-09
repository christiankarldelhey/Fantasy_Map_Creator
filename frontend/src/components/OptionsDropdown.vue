<template>
  <div ref="dropdownContainer" class="absolute top-4 right-4" style="z-index: 99999;">
    <button
      @click="toggleDropdown"
      title="Options"
      :class="buttonClasses"
      :style="buttonStyle"
    >
      <img src="/mews.png" alt="Options" class="w-[18px] h-[18px]" />
      Options
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-parchment)] border border-[var(--accent-gold)] rounded-md shadow-lg z-[10000]"
    >
      <div class="py-1">
        <!-- Guest mode: only Sign in -->
        <template v-if="isGuest">
          <button
            @click="handleSignIn"
            class="w-full text-left px-4 py-2 text-xs text-ink-brown hover:bg-[var(--bg-parchment-dark)] transition-colors flex items-center gap-2 font-sans"
          >
            <LogIn :size="14" />
            Sign in
          </button>
        </template>

        <!-- Logged in: options based on mode -->
        <template v-else>
          <!-- Wander mode options -->
          <template v-if="mode === 'wander'">
            <button
              @click="handleChangeSeason"
              class="w-full text-left px-4 py-2 text-xs text-ink-brown hover:bg-[var(--bg-parchment-dark)] transition-colors flex items-center gap-2 font-sans"
            >
              <Sun :size="14" />
              Change Season
            </button>
            <button
              @click="handleChangeCharacter"
              class="w-full text-left px-4 py-2 text-xs text-ink-brown hover:bg-[var(--bg-parchment-dark)] transition-colors flex items-center gap-2 font-sans"
            >
              <User :size="14" />
              Change Character
            </button>
            <button
              @click="handleGoToExplore"
              class="w-full text-left px-4 py-2 text-xs text-ink-brown hover:bg-[var(--bg-parchment-dark)] transition-colors flex items-center gap-2 font-sans"
            >
              <Map :size="14" />
              Go to explore mode
            </button>
          </template>

          <!-- Explore mode options -->
          <template v-else>
            <button
              @click="handleGoToWander"
              class="w-full text-left px-4 py-2 text-xs text-ink-brown hover:bg-[var(--bg-parchment-dark)] transition-colors flex items-center gap-2 font-sans"
            >
              <Compass :size="14" />
              Go to wander mode
            </button>
          </template>

          <!-- Sign out (both modes) -->
          <button
            @click="handleSignOut"
            class="w-full text-left px-4 py-2 text-xs text-ink-brown hover:bg-[var(--bg-parchment-dark)] transition-colors flex items-center gap-2 font-sans"
          >
            <LogOut :size="14" />
            Sign out
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { LogOut, Sun, User, Map, Compass, LogIn } from '@lucide/vue'

const props = defineProps<{
  mode: 'wander' | 'explore'
  isGuest: boolean
  hasActiveAdventure: boolean
}>()

const emit = defineEmits<{
  'sign-in': []
  'sign-out': []
  'change-season': []
  'change-character': []
  'go-to-explore': []
  'go-to-wander': []
}>()

const isOpen = ref(false)
const dropdownContainer = ref<HTMLElement | null>(null)

const buttonClasses = computed(() => {
  if (props.mode === 'wander') {
    // Same colors as CharacterActiveHud, using IM Fell English (intermediate artistic)
    return 'flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-parchment)] border-2 border-[var(--accent-gold)] text-[var(--text-ink-black)] text-sm cursor-pointer shadow-md font-normal'
  } else {
    // Explore mode: admin minimalist (same height as CalendarPicker: 32px)
    return 'flex items-center gap-2 h-8 px-2 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-sans cursor-pointer shadow-sm font-normal'
  }
})

const buttonStyle = computed(() => {
  if (props.mode === 'wander') {
    return { fontFamily: "'IM Fell English', Georgia, serif" }
  }
  return {}
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

function handleSignIn() {
  closeDropdown()
  emit('sign-in')
}

function handleSignOut() {
  closeDropdown()
  emit('sign-out')
}

function handleChangeSeason() {
  closeDropdown()
  emit('change-season')
}

function handleChangeCharacter() {
  closeDropdown()
  emit('change-character')
}

function handleGoToExplore() {
  closeDropdown()
  emit('go-to-explore')
}

function handleGoToWander() {
  closeDropdown()
  emit('go-to-wander')
}

// Close dropdown when clicking outside
function handleClickOutside(e: MouseEvent) {
  if (dropdownContainer.value && !dropdownContainer.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>
