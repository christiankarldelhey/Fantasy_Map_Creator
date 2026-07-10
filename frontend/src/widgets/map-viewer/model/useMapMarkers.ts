import { ref } from 'vue'
import maplibregl from 'maplibre-gl'

function getPinColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--btn-leather').trim()
  return value || '#8b4513'
}

function getCenterColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--bg-parchment-light').trim()
  return value || '#faf3e0'
}

function setMarkerCenterColor(marker: maplibregl.Marker, color: string) {
  const circles = marker.getElement().querySelectorAll('svg circle')
  circles.forEach((circle) => {
    if (circle.getAttribute('fill')?.toLowerCase() === '#ffffff') {
      circle.setAttribute('fill', color)
    }
  })
}

export function useMapMarkers() {
  const currentMarker = ref<maplibregl.Marker | null>(null)

  function addMarker(map: maplibregl.Map, lng: number, lat: number) {
    // Remove existing marker if any
    removeMarker()

    // Create the default MapLibre marker with the theme leather color,
    // then recolor only the central circle to the theme's light parchment.
    const marker = new maplibregl.Marker({ color: getPinColor() })
      .setLngLat([lng, lat])
      .addTo(map)

    setMarkerCenterColor(marker, getCenterColor())

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
