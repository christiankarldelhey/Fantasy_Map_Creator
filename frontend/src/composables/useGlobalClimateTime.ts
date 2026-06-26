import { ref, computed, watch } from 'vue'
import { useUserSettings } from './useUserSettings'

function force1950(date: Date): Date {
  const d = new Date(date)
  d.setFullYear(1950)
  return d
}

const currentClimateTime = ref<Date>(force1950(new Date()))
const isRealTime = ref<boolean>(true)

export function useGlobalClimateTime() {
  const { user, savePartialSettings } = useUserSettings()

  function updateClimateTime(date: Date) {
    currentClimateTime.value = force1950(date)
    isRealTime.value = false
    // Persist to backend
    savePartialSettings({
      current_climate_time: currentClimateTime.value.toISOString(),
      is_real_time: false
    }).catch(err => {
      console.error('Failed to save climate time to backend:', err)
    })
  }

  function setTripDate(dateStr: string) {
    const parsed = new Date(dateStr)
    if (isNaN(parsed.getTime())) return
    currentClimateTime.value = force1950(parsed)
    isRealTime.value = false
  }

  function resetToRealTime() {
    currentClimateTime.value = force1950(new Date())
    isRealTime.value = true
    // Persist to backend
    savePartialSettings({
      current_climate_time: currentClimateTime.value.toISOString(),
      is_real_time: true
    }).catch(err => {
      console.error('Failed to save climate time to backend:', err)
    })
  }

  // Initialize climate time from backend settings if available
  function initializeFromBackend() {
    if (user.value?.settings?.current_climate_time) {
      const parsedDate = new Date(user.value.settings.current_climate_time)
      if (!isNaN(parsedDate.getTime())) {
        currentClimateTime.value = force1950(parsedDate)
        isRealTime.value = user.value.settings.is_real_time ?? true
        console.log('✅ Loaded climate time from backend settings:', {
          time: currentClimateTime.value,
          isRealTime: isRealTime.value
        })
      }
    }
  }

  const timestamp1950 = computed(() => {
    const date = currentClimateTime.value
    const year = date.getFullYear() // Always 1950
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:00:00`
  })

  const timestampISO = computed(() => {
    return currentClimateTime.value.toISOString()
  })

  watch(isRealTime, (realTime) => {
    if (realTime) {
      const interval = setInterval(() => {
        if (isRealTime.value) {
          currentClimateTime.value = force1950(new Date())
        } else {
          clearInterval(interval)
        }
      }, 60000)
    }
  })

  return {
    currentClimateTime,
    isRealTime,
    timestamp1950,
    timestampISO,
    updateClimateTime,
    setTripDate,
    resetToRealTime,
    initializeFromBackend
  }
}
