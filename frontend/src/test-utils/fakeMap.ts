import { vi } from 'vitest'
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'

type Handler = (event: MapMouseEvent) => void

type FakeFeature = {
  layer: { id: string }
  properties?: Record<string, unknown>
  geometry?: unknown
}

/** Members the fake replaces; the rest of MapLibre's surface stays typed. */
type FakedMembers =
  | 'on' | 'off' | 'once' | 'fire'
  | 'getLayer' | 'queryRenderedFeatures' | 'project'

export type FakeMap = Omit<MapLibreMap, FakedMembers> & {
  on: (type: string, cb: Handler) => FakeMap
  off: (type: string, cb: Handler) => FakeMap
  once: (type: string, cb: Handler) => FakeMap
  /** Fire a MapLibre-style event at every handler registered via `on`. */
  fire: (type: string, event?: Record<string, unknown>) => void
  /** Sugar for the most common event in this codebase. */
  mousemove: (
    lngLat: { lng: number; lat: number },
    point?: { x: number; y: number }
  ) => void
  getLayer: (id: string) => { id: string } | undefined
  queryRenderedFeatures: (
    point: unknown,
    options?: { layers?: string[] }
  ) => FakeFeature[]
  /** Stage what the next queryRenderedFeatures call returns. */
  setFeatures: (features: FakeFeature[]) => void
  /** Register a layer id so getLayer() reports it. */
  addLayer: (id: string) => void
  project: (lngLat: { lng: number; lat: number }) => { lng: number; lat: number }
}

/**
 * A fake of the MapLibre surface composables actually touch: event wiring
 * (on/off/once), layer queries (getLayer, queryRenderedFeatures) and
 * project(). Tests register layers, stage features and fire events — no GL,
 * no DOM.
 */
export function makeFakeMap({ layers = [] as string[] } = {}): FakeMap {
  const handlers = new Map<string, Set<Handler>>()
  const layersPresent = new Set(layers)
  let stagedFeatures: FakeFeature[] = []

  const fire: FakeMap['fire'] = (type, event = {}) => {
    handlers.get(type)?.forEach((handler) => handler({ type, ...event } as MapMouseEvent))
  }

  const map = {
    on: vi.fn((type: string, cb: Handler) => {
      const set = handlers.get(type) ?? new Set<Handler>()
      set.add(cb)
      handlers.set(type, set)
      return map
    }),
    off: vi.fn((type: string, cb: Handler) => {
      handlers.get(type)?.delete(cb)
      return map
    }),
    once: vi.fn((type: string, cb: Handler) => {
      const wrapped: Handler = (e) => {
        handlers.get(type)?.delete(wrapped)
        cb(e)
      }
      return map.on(type, wrapped)
    }),
    fire,
    mousemove: (lngLat: { lng: number; lat: number }, point = { x: 0, y: 0 }) =>
      fire('mousemove', { lngLat, point }),
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
    project: vi.fn((lngLat: { lng: number; lat: number }) => lngLat),
    dragPan: { isActive: () => false }
  }

  return map as unknown as FakeMap
}
