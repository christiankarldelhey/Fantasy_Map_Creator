<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Map from '@arcgis/core/Map'
import MapView from '@arcgis/core/views/MapView'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer'
import Basemap from '@arcgis/core/Basemap'
import { useMapData } from '@/composables/useMapData'
import MAPBOX_CONFIG from '@/config/mapbox'

const mapDiv = ref<HTMLDivElement | null>(null)
let view: MapView | null = null

const { locations, regions, loading, error, loadAll } = useMapData()

onMounted(async () => {
  if (!mapDiv.value) return

  // Crear capa de tiles de Mapbox
  const mapboxLayer = new WebTileLayer({
    urlTemplate: MAPBOX_CONFIG.getTileUrl(),
    copyright: MAPBOX_CONFIG.copyright
  })

  // Crear basemap personalizado
  const customBasemap = new Basemap({
    baseLayers: [mapboxLayer],
    title: 'Middle Earth',
    id: 'middle-earth-basemap'
  })

  // Crear mapa
  const map = new Map({
    basemap: customBasemap
  })

  // Crear vista del mapa
  view = new MapView({
    container: mapDiv.value,
    map: map,
    center: MAPBOX_CONFIG.defaultCenter,
    zoom: MAPBOX_CONFIG.defaultZoom,
    constraints: {
      minZoom: 3,
      maxZoom: 18
    },
    popup: {
      dockEnabled: true,
      dockOptions: {
        position: 'bottom-right',
        breakpoint: false
      }
    }
  })

  // Esperar a que el mapa esté listo
  await view.when()
  console.log('✅ MapView ready')
  console.log('Center:', view.center.longitude, view.center.latitude)
  console.log('Zoom:', view.zoom)

  // Cargar datos del backend
  try {
    await loadAll()
    console.log('✅ Data loaded:')
    console.log('  Locations:', locations.value?.features.length)
    console.log('  Regions:', regions.value?.features.length)
  } catch (err) {
    console.error('❌ Failed to load data:', err)
  }
})

onUnmounted(() => {
  if (view) {
    view.destroy()
  }
})
</script>
