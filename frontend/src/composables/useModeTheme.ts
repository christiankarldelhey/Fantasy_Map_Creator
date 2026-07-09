import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import { applyModeTheme, clearModeTheme, type MapMode } from '@/app/theme/applyModeTheme'

/**
 * Apply the dual-mode theme to the document body so that
 * all UI components — including teleported modals, popovers and dropdowns —
 * inherit the correct CSS variables.
 */
export function useModeTheme(mode: Ref<MapMode | undefined> | MapMode) {
  function setTheme() {
    const currentMode = typeof mode === 'object' && 'value' in mode ? mode.value : mode
    applyModeTheme(document.body, currentMode || 'explore')
  }

  function resetTheme() {
    clearModeTheme(document.body)
  }

  onMounted(() => {
    setTheme()
  })

  onUnmounted(() => {
    resetTheme()
  })

  if (typeof mode === 'object' && 'value' in mode) {
    watch(mode, setTheme)
  }
}
