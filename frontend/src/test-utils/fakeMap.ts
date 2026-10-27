import { vi } from 'vitest'
import type {
  LngLatLike,
  Map as MapLibreMap,
  MapMouseEvent,
} from 'maplibre-gl'

type Handler = (event: MapMouseEvent) => void

export type FakeFeature = {
  layer: { id: string }
  properties?: Record<string, unknown>
  geometry?: unknown
}

/** Members the fake replaces; the rest of MapLibre's surface stays typed. */
type FakedMembers =
  | 'on' | 'off' | 'fire'
  | 'getLayer' | 'queryRenderedFeatures' | 'project' | 'setPaintProperty'

export type FakeMap = Omit<MapLibreMap, FakedMembers> & {
  /** Accepts both MapLibre forms: (type, cb) and (type, layerId, cb). */
  on: (type: string, layerOrCb: string | Handler, cb?: Handler) => FakeMap
  off: (type: string, layerOrCb: string | Handler, cb?: Handler) => FakeMap
  /** Fire a MapLibre-style event at every handler registered via `on`. */
  fire: (type: string, event?: Record<string, unknown>) => void
  getLayer: (id: string) => { id: string } | undefined
  queryRenderedFeatures: (
    point: unknown,
    options?: { layers?: string[] }
  ) => FakeFeature[]
  /** Stage what the next queryRenderedFeatures call returns. */
  setFeatures: (features: FakeFeature[]) => void
  /** Register a layer id so getLayer() reports it. */
  addLayer: (id: string) => void
  setPaintProperty: (layer: string, prop: string, value: unknown) => void
  /** Deterministic stand-in: echoes coords into x/y, not a real projection. */
  project: (lngLat: LngLatLike) => { x: number; y: number }
}

/**
 * A fake of the MapLibre surface composables actually touch: event wiring
 * (on/off), layer queries (getLayer, queryRenderedFeatures) and project().
 * Tests register layers, stage features and fire events — no GL, no DOM.
 * Layer-scoped on() is accepted but not filtered: firing delivers to every
 * handler of that event type.
 */
export function makeFakeMap({ layers = [] as string[] } = {}): FakeMap {
  const handlers = new Map<string, Set<Handler>>()
  const layersPresent = new Set(layers)
  let stagedFeatures: FakeFeature[] = []

  const fire: FakeMap['fire'] = (type, event = {}) => {
    handlers
      .get(type)
      ?.forEach((handler) => handler({ type, ...event } as MapMouseEvent))
  }

  const map = {
    on: vi.fn((type: string, layerOrCb: string | Handler, cb?: Handler) => {
      const handler = typeof layerOrCb === 'function' ? layerOrCb : cb
      if (!handler) return map
      const set = handlers.get(type) ?? new Set<Handler>()
      set.add(handler)
      handlers.set(type, set)
      return map
    }),
    off: vi.fn((type: string, layerOrCb: string | Handler, cb?: Handler) => {
      const handler = typeof layerOrCb === 'function' ? layerOrCb : cb
      if (handler) handlers.get(type)?.delete(handler)
      return map
    }),
    fire,
    getLayer: vi.fn((id: string) => (layersPresent.has(id) ? { id } : undefined)),
    queryRenderedFeatures: vi.fn(
      (_point: unknown, options?: { layers?: string[] }) =>
        stagedFeatures.filter(
          (f) => !options?.layers || options.layers.includes(f.layer.id)
        )
    ),
    setFeatures: (features: FakeFeature[]) => {
      stagedFeatures = features
    },
    addLayer: (id: string) => {
      layersPresent.add(id)
    },
    setPaintProperty: vi.fn<(layer: string, prop: string, value: unknown) => void>(),
    project: vi.fn((lngLat: LngLatLike) => {
      const [lng, lat] = Array.isArray(lngLat)
        ? lngLat
        : ['lng' in lngLat ? lngLat.lng : lngLat.lon, lngLat.lat]
      return { x: lng, y: lat }
    })
  }

  // The object literal only covers the faked members; the rest of MapLibre's
  // surface is unimplemented by design.
  return map as unknown as FakeMap
}
