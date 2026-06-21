import { computed } from 'vue'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'

export function useCalendarState() {
  const { currentClimateTime, isRealTime, updateClimateTime, resetToRealTime } = useGlobalClimateTime()

  const selectedHour = computed(() => currentClimateTime.value.getHours())

  const formattedDateNoYear = computed(() => {
    return currentClimateTime.value.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    })
  })

  const timeFormatted = computed(() => {
    const hours = String(currentClimateTime.value.getHours()).padStart(2, '0')
    return `${hours}:00`
  })

  const displayText = computed(() => {
    return `${formattedDateNoYear.value} • ${timeFormatted.value}`
  })

  const dateInputString = computed({
    get() {
      const date = currentClimateTime.value
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    set(val: string) {
      const parts = val.split('-')
      if (parts.length === 3) {
        const year = 1950
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        
        const newDate = new Date(currentClimateTime.value)
        newDate.setFullYear(year)
        newDate.setMonth(month)
        newDate.setDate(day)
        
        updateClimateTime(newDate)
      }
    }
  })

  function updateHour(hour: number) {
    const newDate = new Date(currentClimateTime.value)
    newDate.setHours(hour, 0, 0, 0)
    updateClimateTime(newDate)
  }

  return {
    selectedHour,
    displayText,
    formattedDateNoYear,
    timeFormatted,
    isRealTime,
    dateInputString,
    updateHour,
    resetToNow: resetToRealTime
  }
}
