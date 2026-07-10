<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { Leaf, Sprout, Sun, Snowflake, LogOut, User, Map, Compass, LogIn, Wrench, MoreVertical, Calendar } from '@lucide/vue'
import { useCharacter } from '@/composables/useCharacter'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'

const props = defineProps<{
  mode: 'wander' | 'explore'
  isGuest: boolean
  hasActiveAdventure: boolean
}>()

const emit = defineEmits<{
  'open-character': []
  'sign-in': []
  'sign-out': []
  'change-season': []
  'change-character': []
  'go-to-explore': []
  'go-to-wander': []
  'open-calendar': []
}>()

const { activeCharacter } = useCharacter()
const { currentClimateTime } = useGlobalClimateTime()

const RESISTANCE_MAX = 20
const resistancePct = computed(() => {
  const r = activeCharacter.value?.resistance ?? 0
  return Math.min(100, Math.round((r / RESISTANCE_MAX) * 100))
})

const formattedDate = computed(() =>
  currentClimateTime.value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
)

const season = computed(() => {
  const month = currentClimateTime.value.getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
})

const seasonIcon = computed(() => {
  switch (season.value) {
    case 'spring': return Sprout
    case 'summer': return Sun
    case 'autumn': return Leaf
    default: return Snowflake
  }
})

function getCharacterImage(name: string): string {
  return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
}

// --- Options menu ---
const isOpen = ref(false)
const container = ref<HTMLElement | null>(null)
const PROJECT_URL = 'https://christiandelhey.com/projects/middle-earth-wandering-simulator/'

type MenuItem = { key: string; label: string; icon?: Component; href?: string; onClick?: () => void }

const menuItems = computed<MenuItem[]>(() => {
  const close = () => { isOpen.value = false }
  const items: MenuItem[] = []
  if (props.isGuest) {
    items.push({ key: 'sign-in', label: 'Sign in', icon: LogIn, onClick: () => { close(); emit('sign-in') } })
  } else {
    if (props.mode === 'wander') {
      items.push({ key: 'change-season', label: 'Change Season', icon: Sun, onClick: () => { close(); emit('change-season') } })
      items.push({ key: 'change-character', label: 'Change Character', icon: User, onClick: () => { close(); emit('change-character') } })
      items.push({ key: 'go-to-explore', label: 'Go to explore mode', icon: Map, onClick: () => { close(); emit('go-to-explore') } })
    } else {
      items.push({ key: 'open-calendar', label: 'Date & Time', icon: Calendar, onClick: () => { close(); emit('open-calendar') } })
      items.push({ key: 'go-to-wander', label: 'Go to wander mode', icon: Compass, onClick: () => { close(); emit('go-to-wander') } })
    }
    items.push({ key: 'sign-out', label: 'Sign out', icon: LogOut, onClick: () => { close(); emit('sign-out') } })
  }
  items.push({ key: 'how-i-made-this', label: 'How I Made This', icon: Wrench, href: PROJECT_URL, onClick: close })
  return items
})

function handleClickOutside(e: MouseEvent) {
  if (container.value && !container.value.contains(e.target as Node)) isOpen.value = false
}
onMounted(() => window.addEventListener('click', handleClickOutside))
onUnmounted(() => window.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="mobile-topbar fixed top-0 inset-x-0 z-[9999] flex items-center gap-2 px-3 py-2 bg-parchment-base border-b-2 border-gold shadow-md"
       style="padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));">
    <!-- Character info (wander) -->
    <button
      v-if="mode === 'wander' && activeCharacter"
      class="flex items-center gap-2 min-w-0 flex-1 text-left"
      @click="emit('open-character')"
    >
      <img
        :src="getCharacterImage(activeCharacter.name)"
        :alt="activeCharacter.name"
        class="w-9 h-9 rounded-full object-cover border-2 border-gold shrink-0"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-serif font-semibold text-sm text-ink-black truncate">{{ activeCharacter.name }}</span>
          <span v-if="activeCharacter.permadeath" class="text-xs text-ink-black/70 shrink-0" title="Permadeath">☠</span>
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-ink-brown font-book">
          <span class="font-serif text-ink-black">{{ formattedDate }}</span>
          <component :is="seasonIcon" class="w-3 h-3 shrink-0 opacity-80" />
          <span class="truncate">{{ activeCharacter.current_region || 'Unknown' }}</span>
        </div>
      </div>
    </button>

    <!-- Brand (explore / guest) -->
    <div v-else class="flex items-center gap-2 min-w-0 flex-1">
      <img src="/logo-mews.png" alt="MEWS" class="w-8 h-8 rounded-full object-cover shrink-0" />
      <span class="font-serif font-semibold text-sm text-ink-black truncate">Middle-earth</span>
    </div>

    <!-- Resistance bar (wander) -->
    <div v-if="mode === 'wander' && activeCharacter" class="w-16 h-1.5 rounded-full bg-parchment-dark overflow-hidden shrink-0" title="Resistance">
      <div class="h-full bg-gold transition-all duration-300" :style="{ width: `${resistancePct}%` }"></div>
    </div>

    <!-- Options -->
    <div ref="container" class="relative shrink-0">
      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg bg-parchment-base border-2 border-gold text-ink-black"
        title="Options"
        @click="isOpen = !isOpen"
      >
        <MoreVertical class="w-5 h-5" />
      </button>
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-2 w-52 bg-parchment-base border border-gold rounded-md shadow-lg z-[10001] py-1"
      >
        <template v-for="item in menuItems" :key="item.key">
          <hr v-if="item.key === 'how-i-made-this'" class="border-t border-gold opacity-50 my-1" />
          <component
            :is="item.href ? 'a' : 'button'"
            :href="item.href"
            :target="item.href ? '_blank' : undefined"
            :rel="item.href ? 'noopener noreferrer' : undefined"
            @click="() => item.onClick?.()"
            class="w-full text-left px-4 py-2.5 text-sm text-ink-brown hover:bg-parchment-dark transition-colors flex items-center gap-2 font-sans"
          >
            <component :is="item.icon" v-if="item.icon" :size="16" />
            {{ item.label }}
          </component>
        </template>
      </div>
    </div>
  </div>
</template>
