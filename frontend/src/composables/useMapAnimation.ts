import { ref } from 'vue'

type AnimationCallback = (geometry: any, duration?: number) => void

const animationCallback = ref<AnimationCallback | null>(null)

export function useMapAnimation() {
  function setAnimationCallback(callback: AnimationCallback) {
    animationCallback.value = callback
  }

  function triggerAnimation(geometry: any, duration?: number) {
    if (animationCallback.value) {
      animationCallback.value(geometry, duration)
    }
  }

  return {
    setAnimationCallback,
    triggerAnimation
  }
}
