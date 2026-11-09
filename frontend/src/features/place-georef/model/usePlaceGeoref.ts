import { ref, computed, watch } from 'vue'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import api from '@/shared/api/client'

export interface GeorefPlaceItem {
  id: string
  name: string | null
  type: string | null
  region_id: number | null
  location_id: number | null
  size_radius_km: number | null
  influence_radius_km: number | null
  positioned: boolean
  geom: GeoJSON.Geometry | null
}

export interface GeorefPlaceDetail extends GeorefPlaceItem {
  kind: string
  place_ref: string | null
  tags: string[]
  payload: Record<string, any>
}

export interface NearbyCandidate {
  id: number
  name: string
  location_type: string | null
  region_id: number | null
  geom: GeoJSON.Geometry | null
  distance_km: number
  anchored_places: number
}

export interface GeorefDraft {
  lon: number | null
  lat: number | null
  region_id: number | null
  location_type: string | null
  custom_type: string
  visible_in_map: boolean
  loc_name: string
  description: string
  size_radius_km: number | null
  influence_radius_km: number | null
}

export type GeorefMode = 'position' | 'edit'

const SEARCH_KM = 10
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Circle polygon around a point, radius in km — previews size/influence. */
export function circlePolygon(lon: number, lat: number, radiusKm: number, steps = 64): GeoJSON.Feature {
  const coords: [number, number][] = []
  const dLat = (radiusKm / 6371) * (180 / Math.PI)
  const dLon = dLat / Math.cos((lat * Math.PI) / 180)
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    coords.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)])
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] }
  }
}

export function usePlaceGeoref() {
  const enabled = ref(false)
  const mode = ref<GeorefMode>('position')
  const pending = ref<GeorefPlaceItem[]>([])
  const positioned = ref<GeorefPlaceItem[]>([])
  const activePlace = ref<GeorefPlaceDetail | null>(null)
  const candidates = ref<NearbyCandidate[]>([])
  const clickRegion = ref<{ id: number; name: string } | null>(null)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const draft = ref<GeorefDraft>(emptyDraft())
  let map: MapLibreMap | null = null
  let regionsData: GeoJSON.FeatureCollection | null = null

  function emptyDraft(): GeorefDraft {
    return {
      lon: null, lat: null,
      region_id: null, location_type: null, custom_type: '',
      visible_in_map: false, loc_name: '', description: '',
      size_radius_km: null, influence_radius_km: null
    }
  }

  const list = computed(() => (mode.value === 'position' ? pending.value : positioned.value))
  const activeIndex = computed(() => list.value.findIndex((p) => p.id === activePlace.value?.id))

  // ------------------------------------------------------------------
  // API
  // ------------------------------------------------------------------
  async function loadLists() {
    const [a, b] = await Promise.all([
      api.get<{ places: GeorefPlaceItem[] }>('/admin/georef/places', { params: { status: 'unpositioned' } }),
      api.get<{ places: GeorefPlaceItem[] }>('/admin/georef/places', { params: { status: 'positioned' } })
    ])
    pending.value = a.data.places
    positioned.value = b.data.places
    refreshMapSources()
  }

  async function selectPlace(item: GeorefPlaceItem) {
    const { data } = await api.get<GeorefPlaceDetail>(`/admin/georef/places/${item.id}`)
    activePlace.value = data
    candidates.value = []
    clickRegion.value = null
    draft.value = {
      ...emptyDraft(),
      region_id: data.region_id,
      loc_name: data.name || '',
      size_radius_km: data.size_radius_km,
      influence_radius_km: data.influence_radius_km
    }
    if (data.geom?.type === 'Point') {
      draft.value.lon = data.geom.coordinates[0]
      draft.value.lat = data.geom.coordinates[1]
    }
    refreshMapSources()
  }

  function step(delta: number) {
    const l = list.value
    if (l.length === 0) return
    const next = l[((activeIndex.value < 0 ? 0 : activeIndex.value) + delta + l.length) % l.length]
    void selectPlace(next)
  }

  async function onMapClick(lngLat: { lng: number; lat: number }, point: [number, number]) {
    if (mode.value === 'edit') {
      const feats = map?.queryRenderedFeatures(point, { layers: ['georef-place-points'] }) ?? []
      const hit = feats[0]?.properties?.id
      const target = hit ? positioned.value.find((p) => p.id === hit) : undefined
      if (target) void selectPlace(target)
      return
    }
    if (!activePlace.value) return
    draft.value.lon = lngLat.lng
    draft.value.lat = lngLat.lat
    const { data } = await api.get<{ candidates: NearbyCandidate[]; region: { id: number; name: string } | null }>(
      '/admin/georef/locations/nearby',
      { params: { lon: lngLat.lng, lat: lngLat.lat, km: SEARCH_KM } }
    )
    candidates.value = data.candidates
    clickRegion.value = data.region
    if (!draft.value.region_id && data.region) draft.value.region_id = data.region.id
    refreshMapSources()
  }

  async function saveAdopt(candidate: NearbyCandidate) {
    if (!activePlace.value || draft.value.lon === null) return
    saving.value = true
    error.value = null
    try {
      await api.patch(`/admin/georef/places/${activePlace.value.id}`, {
        lon: draft.value.lon, lat: draft.value.lat,
        location_id: candidate.id,
        region_id: draft.value.region_id,
        size_radius_km: draft.value.size_radius_km,
        influence_radius_km: draft.value.influence_radius_km
      })
      await afterSave()
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message
    } finally {
      saving.value = false
    }
  }

  async function saveCreate() {
    if (!activePlace.value || draft.value.lon === null || draft.value.lat === null) return
    saving.value = true
    error.value = null
    try {
      const { data: loc } = await api.post<{ id: number }>('/admin/georef/locations', {
        name: draft.value.loc_name || activePlace.value.name || 'Unnamed',
        location_type: draft.value.custom_type || draft.value.location_type,
        description: draft.value.description || null,
        lon: draft.value.lon, lat: draft.value.lat,
        visible_in_map: draft.value.visible_in_map,
        region_id: draft.value.region_id
      })
      await api.patch(`/admin/georef/places/${activePlace.value.id}`, {
        lon: draft.value.lon, lat: draft.value.lat,
        location_id: loc.id,
        region_id: draft.value.region_id,
        size_radius_km: draft.value.size_radius_km,
        influence_radius_km: draft.value.influence_radius_km
      })
      await afterSave()
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message
    } finally {
      saving.value = false
    }
  }

  async function saveEdit() {
    if (!activePlace.value) return
    saving.value = true
    error.value = null
    try {
      const body: Record<string, unknown> = {
        region_id: draft.value.region_id,
        size_radius_km: draft.value.size_radius_km,
        influence_radius_km: draft.value.influence_radius_km
      }
      if (draft.value.lon !== null && draft.value.lat !== null) {
        body.lon = draft.value.lon
        body.lat = draft.value.lat
      }
      await api.patch(`/admin/georef/places/${activePlace.value.id}`, body)
      await afterSave()
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message
    } finally {
      saving.value = false
    }
  }

  async function afterSave() {
    const prevId = activePlace.value?.id
    await loadLists()
    const stillHere = list.value.find((p) => p.id === prevId)
    if (stillHere) await selectPlace(stillHere)
    else step(0)
  }

  // ------------------------------------------------------------------
  // Map wiring
  // ------------------------------------------------------------------
  function attachMap(m: MapLibreMap, regions: GeoJSON.FeatureCollection | null) {
    map = m
    regionsData = regions
    m.addSource('georef-places', { type: 'geojson', data: EMPTY_FC })
    m.addSource('georef-draft', { type: 'geojson', data: EMPTY_FC })
    m.addSource('georef-radii', { type: 'geojson', data: EMPTY_FC })
    m.addSource('georef-region', { type: 'geojson', data: EMPTY_FC })
    m.addSource('georef-candidates', { type: 'geojson', data: EMPTY_FC })

    m.addLayer({
      id: 'georef-radius-influence', type: 'fill', source: 'georef-radii',
      filter: ['==', ['get', 'ring'], 'influence'],
      paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.06 }
    })
    m.addLayer({
      id: 'georef-radius-size', type: 'fill', source: 'georef-radii',
      filter: ['==', ['get', 'ring'], 'size'],
      paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.15 }
    })
    m.addLayer({
      id: 'georef-radius-outline', type: 'line', source: 'georef-radii',
      paint: { 'line-color': '#7c3aed', 'line-width': 1.5, 'line-dasharray': [2, 2] }
    })
    m.addLayer({
      id: 'georef-region-outline', type: 'line', source: 'georef-region',
      paint: { 'line-color': '#d97706', 'line-width': 3, 'line-opacity': 0.9 }
    })
    m.addLayer({
      id: 'georef-place-points', type: 'circle', source: 'georef-places',
      paint: { 'circle-radius': 5, 'circle-color': '#7c3aed', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 }
    })
    m.addLayer({
      id: 'georef-candidate-points', type: 'circle', source: 'georef-candidates',
      paint: { 'circle-radius': 6, 'circle-color': '#d97706', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 }
    })
    m.addLayer({
      id: 'georef-draft-point', type: 'circle', source: 'georef-draft',
      paint: { 'circle-radius': 7, 'circle-color': '#dc2626', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }
    })
    refreshMapSources()
  }

  function refreshMapSources() {
    if (!map) return
    const set = (id: string, data: GeoJSON.GeoJSON) =>
      (map!.getSource(id) as GeoJSONSource | undefined)?.setData(data)

    set('georef-places', {
      type: 'FeatureCollection',
      features: positioned.value
        .filter((p) => p.geom?.type === 'Point')
        .map((p) => ({ type: 'Feature' as const, properties: { id: p.id }, geometry: p.geom as GeoJSON.Point }))
    })

    const d = draft.value
    set('georef-draft', d.lon !== null && d.lat !== null
      ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [d.lon, d.lat] } }] }
      : EMPTY_FC)

    const radii: GeoJSON.Feature[] = []
    if (d.lon !== null && d.lat !== null) {
      if (d.size_radius_km) radii.push({ ...circlePolygon(d.lon, d.lat, d.size_radius_km), properties: { ring: 'size' } })
      if (d.influence_radius_km) radii.push({ ...circlePolygon(d.lon, d.lat, d.influence_radius_km), properties: { ring: 'influence' } })
    }
    set('georef-radii', { type: 'FeatureCollection', features: radii })

    set('georef-candidates', {
      type: 'FeatureCollection',
      features: candidates.value
        .filter((c) => c.geom?.type === 'Point')
        .map((c) => ({ type: 'Feature' as const, properties: { id: c.id }, geometry: c.geom as GeoJSON.Point }))
    })

    const regionFeature = regionsData?.features.find((f) => f.properties?.id === d.region_id)
    set('georef-region', regionFeature
      ? { type: 'FeatureCollection', features: [regionFeature] }
      : EMPTY_FC)
  }

  watch(draft, refreshMapSources, { deep: true })

  function toggle() {
    enabled.value = !enabled.value
    if (enabled.value) {
      void loadLists()
    } else {
      activePlace.value = null
      candidates.value = []
      draft.value = emptyDraft()
      refreshMapSources()
    }
  }

  return {
    enabled, mode, pending, positioned, list, activePlace, activeIndex,
    candidates, clickRegion, draft, saving, error,
    loadLists, selectPlace, step, onMapClick,
    saveAdopt, saveCreate, saveEdit,
    attachMap, refreshMapSources, toggle
  }
}
