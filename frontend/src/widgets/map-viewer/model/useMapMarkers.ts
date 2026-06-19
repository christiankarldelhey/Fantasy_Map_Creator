import { ref } from 'vue'
import maplibregl from 'maplibre-gl'

export function useMapMarkers() {
  const currentMarker = ref<maplibregl.Marker | null>(null)

  function addMarker(map: maplibregl.Map, lng: number, lat: number) {
    // Remove existing marker if any
    removeMarker()

    // Create new marker
    const marker = new maplibregl.Marker()
      .setLngLat([lng, lat])
      .addTo(map)

    currentMarker.value = marker
  }

  function removeMarker() {
    if (currentMarker.value) {
      currentMarker.value.remove()
      currentMarker.value = null
    }
  }

  return {
    currentMarker,
    addMarker,
    removeMarker
  }
}
