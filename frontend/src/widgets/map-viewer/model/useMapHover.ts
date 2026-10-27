import { ref } from 'vue'
import type { LngLatLike, MapMouseEvent } from 'maplibre-gl'

/** The slice of maplibregl.Popup the hover handler uses — injectable for tests. */
export type HoverPopup = {
  setLngLat(lngLat: LngLatLike): HoverPopup
  setText(text: string): HoverPopup
  addTo(map: unknown): HoverPopup
  remove(): HoverPopup
}

type HoverFeature = {
  layer?: { id?: string }
  properties?: Record<string, unknown> | null
}

/** The slice of MapLibre attachHover needs — the real Map and fakes both fit. */
export type HoverMap = {
  on(type: string, cb: (e: MapMouseEvent) => void): unknown
  getLayer(id: string): unknown
  queryRenderedFeatures(point: unknown, options?: { layers?: string[] }): HoverFeature[]
}

const LOCATION_LAYER_IDS = new Set([
  'locations-major',
  'locations-medium',
  'locations-minor'
])

const HOVER_LAYER_IDS = [
  'locations-major',
  'locations-medium',
  'locations-minor',
  'regions-fill'
]

export type HoverHit = { name: string; regionId: number | null }

/**
 * Pick what the hover UI should show from rendered features: a location name
 * wins over the region name (same precedence as the click handler), and the
 * region id rides along so the caller can highlight the region border.
 */
export function resolveHoverName(features: HoverFeature[]): HoverHit | null {
  const locationFeature = features.find((f) => LOCATION_LAYER_IDS.has(f.layer?.id ?? ''))
  const regionFeature = features.find((f) => f.layer?.id === 'regions-fill')

  const locName = locationFeature?.properties?.name
  const regName = regionFeature?.properties?.name
  const name =
    (typeof locName === 'string' && locName) ||
    (typeof regName === 'string' && regName) ||
    null
  if (!name) return null

  const rawId = regionFeature?.properties?.id
  const regionId = typeof rawId === 'number' ? rawId : null
  return { name, regionId }
}

/**
 * Wire hover affordances on the map: a name-only popup that follows the
 * cursor plus the hovered region id (for border highlighting). Hit-testing
 * is throttled and skipped while dragging — all client-side, no backend.
 */
export function useMapHover({
  throttleMs = 90,
  now = () => Date.now()
} = {}) {
  const hoveredRegionId = ref<number | null>(null)
  let lastHitAt = 0

  const attachHover = (map: HoverMap, popup: HoverPopup) => {
    const hide = () => {
      popup.remove()
      hoveredRegionId.value = null
    }

    map.on('mousemove', (e: MapMouseEvent) => {
      if (e.originalEvent.buttons) return hide()
      const t = now()
      if (t - lastHitAt < throttleMs) return
      lastHitAt = t

      const layers = HOVER_LAYER_IDS.filter((id) => map.getLayer(id))
      const hit = resolveHoverName(
        map.queryRenderedFeatures(e.point, { layers })
      )
      if (!hit) return hide()

      popup.setLngLat(e.lngLat).setText(hit.name).addTo(map)
      hoveredRegionId.value = hit.regionId
    })

    map.on('mouseout', hide)
  }

  return { hoveredRegionId, attachHover }
}
