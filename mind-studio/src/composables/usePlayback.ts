import { onUnmounted, shallowRef } from 'vue'

/** Run the tape: advance one Episode every `everyMs` until the end. */
export function usePlayback(
  step: () => void,
  atEnd: () => boolean,
  everyMs = 1800,
) {
  const playing = shallowRef(false)
  let timer: ReturnType<typeof setInterval> | undefined

  function stop() {
    playing.value = false
    clearInterval(timer)
  }

  function play(rewind: () => void) {
    if (atEnd()) rewind()
    playing.value = true
    timer = setInterval(() => {
      if (atEnd()) return stop()
      step()
    }, everyMs)
  }

  onUnmounted(stop)
  return { playing, play, stop }
}
