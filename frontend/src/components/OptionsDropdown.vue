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
        <component
          v-for="item in menuItems"
          :is="item.href ? 'a' : 'button'"
          :key="item.key"
          :href="item.href"
          :target="item.href ? '_blank' : undefined"
          :rel="item.href ? 'noopener noreferrer' : undefined"
          @click="() => item.onClick?.()"
          class="w-full text-left px-4 py-2 text-xs text-ink-brown hover:bg-[var(--bg-parchment-dark)] transition-colors flex items-center gap-2 font-sans"
        >
          <component :is="item.icon" v-if="item.icon" :size="14" />
          {{ item.label }}
        </component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type Component } from 'vue'
import { LogOut, Sun, User, Map, Compass, LogIn, Wrench } from '@lucide/vue'

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

type MenuItem = {
  key: string
  label: string
  icon?: Component
  href?: string
  onClick?: () => void
}

const PROJECT_URL = 'https://christiandelhey.com/projects/middle-earth-wandering-simulator/'

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []

  if (props.isGuest) {
    items.push({ key: 'how-i-made-this', label: 'How I Made This', icon: Wrench, href: PROJECT_URL, onClick: closeDropdown })
    items.push({ key: 'sign-in', label: 'Sign in', icon: LogIn, onClick: handleSignIn })
  } else {
    if (props.mode === 'wander') {
      items.push({ key: 'change-season', label: 'Change Season', icon: Sun, onClick: handleChangeSeason })
      items.push({ key: 'change-character', label: 'Change Character', icon: User, onClick: handleChangeCharacter })
      items.push({ key: 'go-to-explore', label: 'Go to explore mode', icon: Map, onClick: handleGoToExplore })
    } else {
      items.push({ key: 'go-to-wander', label: 'Go to wander mode', icon: Compass, onClick: handleGoToWander })
    }

    items.push({ key: 'how-i-made-this', label: 'How I Made This', icon: Wrench, href: PROJECT_URL, onClick: closeDropdown })
    items.push({ key: 'sign-out', label: 'Sign out', icon: LogOut, onClick: handleSignOut })
  }

  return items
})

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
