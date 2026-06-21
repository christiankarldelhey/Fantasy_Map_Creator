import { ref, computed, watch } from 'vue'

function force1950(date: Date): Date {
  const d = new Date(date)
  d.setFullYear(1950)
  return d
}

const currentClimateTime = ref<Date>(force1950(new Date()))
const isRealTime = ref<boolean>(true)

export function useGlobalClimateTime() {
  function updateClimateTime(date: Date) {
    currentClimateTime.value = force1950(date)
    isRealTime.value = false
  }

  function resetToRealTime() {
    currentClimateTime.value = force1950(new Date())
    isRealTime.value = true
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
    resetToRealTime
  }
}
