<template>
  <div class="calendar-picker-container z-[9999]">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child>
        <button
          class="flex items-center gap-2 h-8 px-3 bg-parchment-base rounded-md shadow-sm hover:shadow transition-shadow border border-[var(--accent-gold)] text-ink-brown hover:text-ink-black hover:bg-parchment-dark"
        >
          <Calendar class="h-4 w-4 text-ink-light" />
          <span class="text-xs font-medium text-ink-black">{{ displayText }}</span>
          <ChevronDown class="h-4 w-4 text-ink-light" />
        </button>
      </PopoverTrigger>
      <PopoverContent class="w-72 p-4 z-[10000] bg-white" align="end">
        <div class="space-y-4 bg-white">
          <div class="flex items-center justify-between border-b border-gray-100 pb-2">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</span>
            <button
              v-if="!isRealTime"
              @click="handleResetToNow"
              class="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 transition-colors font-medium"
            >
              <RotateCcw class="h-3 w-3" />
              Reset to Now
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Select Date</label>
              <input
                type="date"
                v-model="dateInputString"
                class="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">
                Select Hour: {{ selectedHour }}:00
              </label>
              <input
                type="range"
                min="0"
                max="23"
                :value="selectedHour"
                @input="handleHourChange"
                class="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-600"
              />
              <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          <div v-if="!isRealTime" class="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
            <Clock class="h-3.5 w-3.5 text-amber-600" />
            <span class="text-[10px] text-amber-800 font-medium font-sans">Historical mode active (1950)</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Calendar, Clock, ChevronDown, RotateCcw } from '@lucide/vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCalendarState } from '../model/useCalendarState'

const isOpen = ref(false)

const {
  selectedHour,
  displayText,
  isRealTime,
  dateInputString,
  updateHour,
  resetToNow
} = useCalendarState()

function handleHourChange(event: Event) {
  const target = event.target as HTMLInputElement
  const hour = parseInt(target.value, 10)
  updateHour(hour)
}

function handleResetToNow() {
  resetToNow()
  isOpen.value = false
}
</script>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #57534e;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #57534e;
  cursor: pointer;
  border: none;
}
</style>
