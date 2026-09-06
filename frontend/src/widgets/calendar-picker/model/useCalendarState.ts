import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalClimateTime } from '@/composables/useGlobalClimateTime'

export function useCalendarState() {
  const { locale } = useI18n()
  const { currentClimateTime, isRealTime, updateClimateTime, resetToRealTime } = useGlobalClimateTime()

  const selectedHour = computed(() => currentClimateTime.value.getHours())

  const formattedDateNoYear = computed(() => {
    return currentClimateTime.value.toLocaleDateString(locale.value, {
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

  const selectedMonth = computed(() => currentClimateTime.value.getMonth())
  const selectedDay = computed(() => currentClimateTime.value.getDate())

  function updateMonth(month: number) {
    const newDate = new Date(currentClimateTime.value)
    newDate.setFullYear(1950)
    newDate.setMonth(month)
    // Clamp day to the new month's length
    const maxDay = new Date(1950, month + 1, 0).getDate()
    newDate.setDate(Math.min(newDate.getDate(), maxDay))
    updateClimateTime(newDate)
  }

  function updateDay(day: number) {
    const newDate = new Date(currentClimateTime.value)
    newDate.setFullYear(1950)
    newDate.setDate(day)
    updateClimateTime(newDate)
  }

  const daysInMonth = computed(() => {
    const m = currentClimateTime.value.getMonth()
    return new Date(1950, m + 1, 0).getDate()
  })

  function updateHour(hour: number) {
    const newDate = new Date(currentClimateTime.value)
    newDate.setHours(hour, 0, 0, 0)
    updateClimateTime(newDate)
  }

  return {
    selectedHour,
    selectedMonth,
    selectedDay,
    daysInMonth,
    displayText,
    formattedDateNoYear,
    timeFormatted,
    isRealTime,
    updateMonth,
    updateDay,
    updateHour,
    resetToNow: resetToRealTime
  }
}
