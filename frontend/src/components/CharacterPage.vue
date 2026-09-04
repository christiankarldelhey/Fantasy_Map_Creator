<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import type { CharacterState } from '@/composables/useCharacter'
import { useCharacter } from '@/composables/useCharacter'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useInventory } from '@/composables/useInventory'

const { t } = useI18n()

interface CharacterPageProps {
  character: CharacterState
  open?: boolean
}

const props = withDefaults(defineProps<CharacterPageProps>(), {
  open: true,
})

const emit = defineEmits<{
  close: []
  reset: []
}>()

const { isMobile } = useBreakpoint()
const { resetCharacter, localizedDescription } = useCharacter()
const { inventory, fetchInventory, clearInventory } = useInventory()

const isDead = computed(() => props.character.status === 'dead')

const abilityList = computed(() => [
  { label: t('character.abilities.tracking'), value: props.character.skill_tracking ?? 0 },
  { label: t('character.abilities.persuasion'), value: props.character.skill_persuasion ?? 0 },
  { label: t('character.abilities.ranged'), value: props.character.skill_ranged ?? 0 },
  { label: t('character.abilities.melee'), value: props.character.skill_melee ?? 0 },
  { label: t('character.abilities.lore'), value: props.character.skill_lore ?? 0 },
  { label: t('character.abilities.stealth'), value: props.character.skill_stealth ?? 0 },
  { label: t('character.abilities.endurance'), value: props.character.skill_endurance ?? 0 },
])

const isFatigued = computed(() => (props.character.fatigue ?? 0) > 40)
const woundedLabel = computed(() => {
  if (props.character.wounded === 'badly_wounded') return t('character.woundedBadly')
  if (props.character.wounded === 'wounded') return t('character.nursingWound')
  return null
})

const fullImageUrl = computed(() => {
  return new URL(`/src/assets/characters/${props.character.name}_full.png`, import.meta.url).href
})

// Load inventory when the page opens
watch(() => props.open, (isOpen) => {
  if (isOpen && props.character.id) {
    fetchInventory(props.character.id)
  } else if (!isOpen) {
    clearInventory()
  }
}, { immediate: true })

// Group inventory by category for display
const groupedInventory = computed(() => {
  const groups: Record<string, typeof inventory.value> = {}
  for (const item of inventory.value) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return groups
})

const categoryLabels = computed<Record<string, string>>(() => ({
  garment: t('character.categories.garment'),
  provision: t('character.categories.provision'),
  ammunition: t('character.categories.ammunition'),
  weapon: t('character.categories.weapon'),
  tool: t('character.categories.tool'),
  container: t('character.categories.container'),
}))

const categoryOrder = ['garment', 'weapon', 'provision', 'ammunition', 'tool', 'container']

function itemProse(item: typeof inventory.value[0]): string {
  if (item.qty > 1 && item.prose_plural) return item.prose_plural
  return item.prose_singular
}

function waterSummary(item: typeof inventory.value[0]): string {
  const capacity = item.effects?.water_capacity ?? 0
  const current = item.fill ?? 0
  if (current === 0) return t('character.water.empty')
  if (current <= capacity / 4) return t('character.water.nearlyDry')
  if (current <= capacity / 2) return t('character.water.aboutHalf')
  if (current < capacity) return t('character.water.moreThanHalf')
  return t('character.water.full')
}

async function handleReset() {
  try {
    await resetCharacter(props.character.id)
    emit('reset')
    emit('close')
  } catch (err) {
    console.error('Failed to reset character:', err)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-black/60 backdrop-blur-sm p-4"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open"
            :class="['relative z-[10001] overflow-hidden rounded-xl border-2 border-gold bg-parchment-base shadow-2xl', isMobile ? 'flex flex-col h-[90vh] w-full max-w-md' : 'flex h-[80vh] max-h-[800px] w-full max-w-5xl']"
          >
            <button
              @click="emit('close')"
              class="absolute right-4 top-4 z-10 rounded-md p-1 text-ink-brown transition-colors hover:bg-parchment-dark hover:text-ink-black"
              :aria-label="t('common.close')"
            >
              <X class="h-5 w-5" />
            </button>

            <div :class="['overflow-hidden bg-parchment-aged', isMobile ? 'h-48 w-full flex-shrink-0' : 'h-full w-auto flex-shrink-0']">
              <img
                :src="fullImageUrl"
                :alt="character.name"
                :class="['object-contain', isMobile ? 'h-full w-full' : 'h-full w-auto max-w-none']"
              />
            </div>

            <div :class="['flex flex-col overflow-y-auto', isMobile ? 'flex-1 p-6' : 'h-full flex-1 p-8']">
              <div class="mb-2 flex items-center gap-3">
                <h1 :class="['font-serif font-bold text-ink-black', isMobile ? 'text-2xl' : 'text-3xl']">
                  {{ character.name }}
                </h1>
                <span
                  v-if="character.permadeath"
                  class="text-lg text-ink-brown"
                  :title="t('character.permadeathEnabled')"
                >
                  ☠
                </span>
              </div>

              <p :class="['font-book italic text-gold-base', isMobile ? 'text-base' : 'text-lg']">
                {{ character.type }}
              </p>

              <div class="mt-6">
                <p :class="['font-book leading-relaxed text-ink-black', isMobile ? 'text-sm' : 'text-base']">
                  {{ localizedDescription(character) }}
                </p>
              </div>

              <!-- Abilities -->
              <div class="mt-6">
                <h2 class="mb-3 font-serif text-sm uppercase tracking-wide text-gold-base">{{ t('character.abilitiesLabel') }}</h2>
                <div class="space-y-2">
                  <div v-for="ability in abilityList" :key="ability.label" class="flex items-center gap-3">
                    <span class="w-24 flex-shrink-0 font-book text-sm text-ink-black">{{ ability.label }}</span>
                    <div class="h-2 flex-1 overflow-hidden rounded-full bg-parchment-dark">
                      <div
                        class="h-full rounded-full bg-gold-base"
                        :style="{ width: `${(ability.value / 10) * 100}%` }"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Coins + hunger -->
              <div class="mt-6 flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="font-serif text-lg text-gold-base" :title="t('character.coins')">⬡</span>
                  <span class="font-serif font-semibold text-ink-black">{{ character.coins ?? 100 }}</span>
                  <span class="font-book text-sm text-ink-brown">{{ t('character.coinsUnit') }}</span>
                </div>
                <div v-if="(character.days_without_food ?? 0) > 0" class="flex items-center gap-2">
                  <span class="text-ink-brown" :title="t('character.daysWithoutFood')">🍖</span>
                  <span class="font-book text-sm italic text-ink-brown">{{ t('character.noDecentMealDays', { n: character.days_without_food }, character.days_without_food ?? 0) }}</span>
                </div>
                <div v-if="(character.days_without_water ?? 0) > 0" class="flex items-center gap-2">
                  <span class="text-ink-brown" :title="t('character.daysWithoutWater')">💧</span>
                  <span class="font-book text-sm italic text-ink-brown">{{ t('character.noDecentDrinkDays', { n: character.days_without_water }, character.days_without_water ?? 0) }}</span>
                </div>
                <div v-if="isFatigued" class="flex items-center gap-2">
                  <span class="text-ink-brown" :title="t('character.fatigued')">😮‍💨</span>
                  <span class="font-book text-sm italic text-ink-brown">{{ t('character.wearyFromRoad') }}</span>
                </div>
                <div v-if="woundedLabel" class="flex items-center gap-2">
                  <span class="text-ink-brown" :title="t('character.wounded')">🩸</span>
                  <span class="font-book text-sm italic text-ink-brown">{{ woundedLabel }}</span>
                </div>
              </div>

              <!-- Inventory panel -->
              <div v-if="inventory.length > 0" class="mt-8">
                <h2 class="mb-3 font-serif text-sm uppercase tracking-wide text-gold-base">{{ t('character.equipage') }}</h2>
                <div class="space-y-4">
                  <div v-for="category in categoryOrder" :key="category">
                    <div v-if="groupedInventory[category]">
                      <p class="mb-1 font-book text-xs uppercase tracking-wide text-ink-brown">{{ categoryLabels[category] }}</p>
                      <ul class="space-y-0.5">
                        <li v-for="item in groupedInventory[category]" :key="item.id" class="font-book text-sm text-ink-black">
                          <span v-if="item.category === 'container'">{{ itemProse(item) }} ({{ waterSummary(item) }})</span>
                          <span v-else>{{ itemProse(item) }}</span>
                          <span v-if="item.equipped" class="ml-1 text-xs italic text-gold-base">{{ t('character.worn') }}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="isDead" class="mt-8">
                <button
                  class="rounded-md bg-parchment-dark px-4 py-2 font-serif font-semibold text-ink-black shadow-sm ring-1 ring-gold transition hover:bg-parchment-aged"
                  @click="handleReset"
                >
                  {{ t('character.reviveBtn') }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
