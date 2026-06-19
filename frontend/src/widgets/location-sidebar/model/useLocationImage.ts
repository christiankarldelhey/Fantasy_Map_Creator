import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { generateImageUrls } from '@/composables/useImageResolution'
import type { LocationDetails } from './types'

export function useLocationImage(location: Ref<LocationDetails | null>) {
  const currentFallbackIndex = ref(0)

  const imageUrls = computed(() => {
    if (!location.value) return []
    
    // Determine if this is a region or location based on the type
    const isRegion = location.value.type === 'Region' || location.value.region_type !== undefined
    
    const urls = generateImageUrls(isRegion ? 'region' : 'location', {
      url_path: location.value.url_path,
      location_type: location.value.type,
      slug: location.value.slug,
      name: location.value.name
    })
    
    return urls
  })

  const currentImageUrl = computed(() => {
    return imageUrls.value[currentFallbackIndex.value] || ''
  })

  const handleImageError = () => {
    if (currentFallbackIndex.value < imageUrls.value.length - 1) {
      currentFallbackIndex.value++
    }
  }

  // Reset fallback index when location changes
  watch(location, () => {
    currentFallbackIndex.value = 0
  })

  return {
    imageUrls,
    currentImageUrl,
    handleImageError
  }
}
