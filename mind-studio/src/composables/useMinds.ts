import { readonly, shallowRef } from 'vue'
import { fetchMinds } from '../api'
import type { MindSummary } from '../types'

/** The roster, and which Mind is open — by default the one that lived
 *  last (the Mind you are playing right now). */
export function useMinds() {
  const minds = shallowRef<MindSummary[]>([])
  const selectedId = shallowRef<string | null>(null)
  const error = shallowRef<string | null>(null)

  fetchMinds()
    .then((list) => {
      minds.value = list.minds
      selectedId.value ??= list.default
    })
    .catch((e: Error) => { error.value = e.message })

  function select(id: string) {
    selectedId.value = id
  }

  return {
    minds: readonly(minds),
    selectedId: readonly(selectedId),
    error: readonly(error),
    select,
  }
}
