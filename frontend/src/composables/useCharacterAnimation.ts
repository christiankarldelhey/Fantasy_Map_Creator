import { ref } from 'vue'
import maplibregl from 'maplibre-gl'
import api from '@/shared/api/client'
import { useCharacter } from './useCharacter'
import { useUserSettings } from './useUserSettings'
import {
  initTripDayRoute,
  updateTripDayRouteProgress,
  clearTripDayRoute,
  drawCompletedRoute,
  drawRemainingRoute,
} from './useMapRoutes'

// ============================================================================
// useCharacterAnimation
// Encapsulates the rAF animation loop, route_completed backend update,
// and character marker management.
// ============================================================================

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

const ANIMATION_DURATION_MS = 8000

export function useCharacterAnimation() {
  const { activeCharacter, fetchAllCharacters, updateActiveCharacterPosition } = useCharacter()
  const { user, fetchUserSettings } = useUserSettings()

  const isAnimating = ref(false)
  let animationFrameId: number | null = null
  let currentAnimatingDay: any = null
  const characterMarkers: Map<number, maplibregl.Marker> = new Map()

  // --------------------------------------------------------------------------
  // Marker management
  // --------------------------------------------------------------------------
  function getCharacterImageUrl(name: string): string {
    return new URL(`/src/assets/characters/${name}.png`, import.meta.url).href
  }

  function updateCharacterMarkers(map: maplibregl.Map, characters: any[]) {
    characterMarkers.forEach((m) => m.remove())
    characterMarkers.clear()

    characters.forEach((character) => {
      const { current_lng: lng, current_lat: lat } = character
      if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) return

      const el = document.createElement('div')
      el.className = 'character-marker'
      Object.assign(el.style, {
        width: '53px',
        height: '53px',
        borderRadius: '50%',
        backgroundImage: `url(${getCharacterImageUrl(character.name)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        cursor: 'pointer',
      })

      if (character.is_active_for_user ?? character.active) {
        Object.assign(el.style, {
          border: '3px solid #d97706',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), 0 0 10px rgba(217,119,6,0.5)',
          filter: 'none',
        })
      } else {
        Object.assign(el.style, {
          border: '3px solid rgba(128,128,128,0.5)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          filter: 'grayscale(100%) opacity(0.6)',
        })
      }

      el.title = character.name

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map)

      characterMarkers.set(character.id, marker)
    })
  }

  function removeAllMarkers() {
    characterMarkers.forEach((m) => m.remove())
    characterMarkers.clear()
  }

  // --------------------------------------------------------------------------
  // Animation
  // --------------------------------------------------------------------------
  function cancelCurrentAnimation() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null

      // Persist route_completed for the interrupted day
      if (currentAnimatingDay?.trip_id && currentAnimatingDay?.geometry) {
        api.patch(`/trips/${currentAnimatingDay.trip_id}/route-completed`, {
          day_geometry: currentAnimatingDay.geometry,
        }).catch((err) => console.error('❌ Failed to update route_completed on cancel:', err))
      }
      currentAnimatingDay = null
    }
  }

  async function startAnimation(map: maplibregl.Map, day: any, activeTripId: string | null) {
    if (!activeCharacter.value) return

    cancelCurrentAnimation()
    currentAnimatingDay = day

    if (!characterMarkers.get(activeCharacter.value.id)) return

    // Parse geometry
    let coords: any
    if (typeof day.geometry === 'string') {
      try { coords = JSON.parse(day.geometry) } catch { return }
    } else {
      coords = day.geometry
    }

    const rawCoords = coords?.coordinates
    if (!rawCoords || rawCoords.length < 2) return

    const validCoords: number[][] = rawCoords.filter(
      (c: any) => c?.length === 2 && !isNaN(c[0]) && !isNaN(c[1])
    )
    if (validCoords.length < 2) return

    // Fit map to route bounds
    const bounds = validCoords.reduce(
      (b: maplibregl.LngLatBounds, c: any) => b.extend(c as [number, number]),
      new maplibregl.LngLatBounds(validCoords[0] as [number, number], validCoords[0] as [number, number])
    )
    map.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 620 },
      maxZoom: 7,
      duration: 1200,
    })

    initTripDayRoute(map, validCoords, false)

    isAnimating.value = true
    const startTime = performance.now()

    function animate(now: number) {
      const m = characterMarkers.get(activeCharacter.value!.id)
      if (!m) return

      const elapsed = now - startTime
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1)
      const eased = easeOutCubic(progress)
      const totalSegments = validCoords.length - 1
      const segmentProgress = eased * totalSegments
      const segIdx = Math.max(0, Math.min(Math.floor(segmentProgress), totalSegments - 1))
      const segT = segmentProgress - segIdx

      const start = validCoords[segIdx]
      const end = validCoords[segIdx + 1]

      if (progress >= 1) {
        const finalPos = validCoords[validCoords.length - 1] as [number, number]
        m.setLngLat(finalPos)
        updateTripDayRouteProgress(map, validCoords, finalPos, totalSegments)
        isAnimating.value = false
        animationFrameId = null
        currentAnimatingDay = null

        onAnimationComplete(map, day, activeTripId)
        return
      }

      if (!start || !end) return

      const currentPos: [number, number] = [
        start[0] + (end[0] - start[0]) * segT,
        start[1] + (end[1] - start[1]) * segT,
      ]

      m.setLngLat(currentPos)
      updateTripDayRouteProgress(map, validCoords, currentPos, segIdx)

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
  }

  async function onAnimationComplete(map: maplibregl.Map, day: any, activeTripId: string | null) {
    // 1. Update character position
    if (day.end_lng !== undefined && day.end_lat !== undefined) {
      try {
        await updateActiveCharacterPosition(day.end_lng, day.end_lat)
        await fetchAllCharacters()
      } catch (err) {
        console.error('❌ Failed to update character position:', err)
      }
    }

    // 2. Update route_completed in backend
    if (day.trip_id && day.geometry) {
      try {
        await api.patch(`/trips/${day.trip_id}/route-completed`, { day_geometry: day.geometry })
        await fetchUserSettings()
      } catch (err) {
        console.error('❌ Failed to update route_completed:', err)
      }
    }

    // 3. Redraw routes if still on the same trip
    if (activeTripId && user.value?.active_trip?.route) {
      drawRemainingRoute(map, user.value.active_trip.route)
      drawCompletedRoute(map, user.value.active_trip.route_completed)
    }

    // 4. Clear day route overlay
    clearTripDayRoute(map)
  }

  return {
    isAnimating,
    characterMarkers,
    updateCharacterMarkers,
    removeAllMarkers,
    startAnimation,
    cancelCurrentAnimation,
  }
}
