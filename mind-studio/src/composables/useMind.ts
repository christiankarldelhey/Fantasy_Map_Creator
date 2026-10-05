import { computed, shallowRef, watch, type Ref } from 'vue'
import { fetchMind } from '../api'
import { mindAt } from '../lib/mindAt'
import type { MindDetail } from '../types'

/** One Mind and the Episode the tape is parked on. Opens on its most
 *  recent Episode — the Mind as it is now. */
export function useMind(characterId: Ref<string | null>) {
  const mind = shallowRef<MindDetail | null>(null)
  const episodeIdx = shallowRef<number | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef<string | null>(null)

  watch(characterId, async (id, _prev, onCleanup) => {
    if (!id) return
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    loading.value = true
    error.value = null
    try {
      const detail = await fetchMind(id, controller.signal)
      mind.value = detail
      episodeIdx.value = detail.episodes.at(-1)?.idx ?? null
    } catch (e) {
      if (!controller.signal.aborted) error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }, { immediate: true })

  const indices = computed(() =>
    (mind.value?.episodes ?? []).map((e) => e.idx).filter((i): i is number => i != null),
  )

  const snapshot = computed(() =>
    mind.value && episodeIdx.value != null ? mindAt(mind.value, episodeIdx.value) : null,
  )

  function goTo(idx: number) {
    if (indices.value.includes(idx)) episodeIdx.value = idx
  }

  function step(delta: number) {
    const list = indices.value
    const at = list.indexOf(episodeIdx.value ?? -1)
    const next = list[Math.min(list.length - 1, Math.max(0, at + delta))]
    if (next != null) episodeIdx.value = next
  }

  return { mind, episodeIdx, snapshot, indices, loading, error, goTo, step }
}
