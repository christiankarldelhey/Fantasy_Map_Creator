import { ref, onMounted, onUnmounted, readonly } from 'vue'

// Tailwind-aligned breakpoints
const MOBILE_MAX = 639 // < sm (640px) => mobile
const TABLET_MAX = 1023 // < lg (1024px) => tablet

const isMobile = ref(false)
const isTablet = ref(false)

let mobileQuery: MediaQueryList | null = null
let tabletQuery: MediaQueryList | null = null
let listenerCount = 0

function update() {
  isMobile.value = mobileQuery?.matches ?? false
  isTablet.value = tabletQuery?.matches ?? false
}

/**
 * Reactive viewport breakpoints backed by matchMedia.
 * - isMobile: viewport width <= 639px
 * - isTablet: viewport width 640px..1023px
 */
export function useBreakpoint() {
  onMounted(() => {
    if (!mobileQuery) {
      mobileQuery = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
      tabletQuery = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`)
    }
    if (listenerCount === 0) {
      mobileQuery.addEventListener('change', update)
      tabletQuery!.addEventListener('change', update)
    }
    listenerCount++
    update()
  })

  onUnmounted(() => {
    listenerCount = Math.max(0, listenerCount - 1)
    if (listenerCount === 0) {
      mobileQuery?.removeEventListener('change', update)
      tabletQuery?.removeEventListener('change', update)
    }
  })

  return {
    isMobile: readonly(isMobile),
    isTablet: readonly(isTablet),
  }
}
