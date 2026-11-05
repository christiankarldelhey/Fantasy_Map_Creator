import { shallowRef, watch, type Ref } from 'vue'
import { fetchMind } from '../api'
import type { MindDetail } from '../types'

/** The open Mind, re-fetched whenever the selection changes. */
export function useMind(characterId: Ref<string | null>) {
  const mind = shallowRef<MindDetail | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef<string | null>(null)

  watch(characterId, async (id, _prev, onCleanup) => {
    if (!id) return
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    loading.value = true
    error.value = null
    try {
      mind.value = await fetchMind(id, controller.signal)
    } catch (e) {
      if (!controller.signal.aborted) error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }, { immediate: true })

  /** Re-fetch after an edit. */
  async function refresh() {
    const id = characterId.value
    if (id) mind.value = await fetchMind(id)
  }

  return { mind, loading, error, refresh }
}
