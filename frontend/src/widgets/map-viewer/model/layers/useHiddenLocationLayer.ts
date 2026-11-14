import type { Map as MapLibreMap, GeoJSONSource, LayerSpecification } from 'maplibre-gl'
import { circlePolygon } from '@/features/place-georef/model/usePlaceGeoref'

// ---------------------------------------------------------------------------
// Hidden locations (admin "Show all locations"): ghost rendering for the
// points `visible_in_map` keeps off the traveller's map — pale circles plus
// the anchored ficha's size/influence radii as translucent rings.
// ---------------------------------------------------------------------------

const SOURCE_ID = 'locations-hidden'
const RADII_SOURCE_ID = 'locations-hidden-radii'

export const HIDDEN_POINTS_LAYER_ID = 'locations-hidden-points'

const LAYER_IDS = [
  'locations-hidden-influence',
  'locations-hidden-size',
  'locations-hidden-radii-outline',
  HIDDEN_POINTS_LAYER_ID,
] as const

// Same location family as the live points, paler — these are places the
// map does not show travellers.
const HIDDEN_COLORS = {
  point: '#b98d5f',
  stroke: '#7a6647',
  ring: '#8a7350',
} as const

/** size/influence circles as ring-tagged polygons, built from point + km. */
function radiiCollection(data: GeoJSON.FeatureCollection | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const f of data?.features ?? []) {
    if (f.geometry?.type !== 'Point') continue
    const [lon, lat] = f.geometry.coordinates
    const size = f.properties?.size_radius_km
    const influence = f.properties?.influence_radius_km
    if (size) features.push({ ...circlePolygon(lon, lat, size), properties: { ring: 'size' } })
    if (influence) features.push({ ...circlePolygon(lon, lat, influence), properties: { ring: 'influence' } })
  }
  return { type: 'FeatureCollection', features }
}

export function useHiddenLocationLayer() {
  const addHiddenLocationsLayer = (map: MapLibreMap, data: GeoJSON.FeatureCollection) => {
    if (!map) return

    const setData = (id: string, fc: GeoJSON.FeatureCollection) => {
      const source = map.getSource(id) as GeoJSONSource | undefined
      if (source) source.setData(fc)
      else map.addSource(id, { type: 'geojson', data: fc })
    }
    setData(SOURCE_ID, data)
    setData(RADII_SOURCE_ID, radiiCollection(data))

    const addIfMissing = (layer: LayerSpecification) => {
      if (!map.getLayer(layer.id)) map.addLayer(layer)
    }

    addIfMissing({
      id: 'locations-hidden-influence',
      type: 'fill',
      source: RADII_SOURCE_ID,
      filter: ['==', ['get', 'ring'], 'influence'],
      paint: { 'fill-color': HIDDEN_COLORS.ring, 'fill-opacity': 0.05 },
    })
    addIfMissing({
      id: 'locations-hidden-size',
      type: 'fill',
      source: RADII_SOURCE_ID,
      filter: ['==', ['get', 'ring'], 'size'],
      paint: { 'fill-color': HIDDEN_COLORS.ring, 'fill-opacity': 0.12 },
    })
    addIfMissing({
      id: 'locations-hidden-radii-outline',
      type: 'line',
      source: RADII_SOURCE_ID,
      paint: {
        'line-color': HIDDEN_COLORS.ring,
        'line-opacity': 0.3,
        'line-width': 1,
        'line-dasharray': [2, 2],
      },
    })
    addIfMissing({
      id: HIDDEN_POINTS_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': 4.4,
        'circle-color': HIDDEN_COLORS.point,
        'circle-opacity': 0.55,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': HIDDEN_COLORS.stroke,
      },
    })

    map.on('mouseenter', HIDDEN_POINTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', HIDDEN_POINTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
    })
  }

  const removeHiddenLocationsLayer = (map: MapLibreMap) => {
    if (!map) return
    for (const id of LAYER_IDS) {
      if (map.getLayer(id)) map.removeLayer(id)
    }
    if (map.getSource(RADII_SOURCE_ID)) map.removeSource(RADII_SOURCE_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
  }

  return {
    addHiddenLocationsLayer,
    removeHiddenLocationsLayer,
  }
}
