import { computed } from 'vue'
import { useLocationData } from '@/features/location-management'
import { useBiomeData } from '@/features/biome-management'
import { useRegionData } from '@/features/region-management'
import { useRoadData } from '@/features/road-management'
import { useWaterData } from '@/features/water-management'
import { useAltitudeData } from '@/features/altitude-management'

export function useMapDataLoading() {
  const { locations, loading: locationsLoading, error: locationsError, loadLocations } = useLocationData()
  const { biomes, loading: biomesLoading, error: biomesError, loadBiomes } = useBiomeData()
  const { altitude, loading: altitudeLoading, error: altitudeError, loadAltitude } = useAltitudeData()
  const { regions, loading: regionsLoading, error: regionsError, loadRegions } = useRegionData()
  const { roads, loading: roadsLoading, error: roadsError, loadRoads } = useRoadData()
  const { water, loading: waterLoading, error: waterError, loadWater } = useWaterData()

  const loading = computed(() => {
    return (
      locationsLoading.value ||
      biomesLoading.value ||
      altitudeLoading.value ||
      regionsLoading.value ||
      roadsLoading.value ||
      waterLoading.value
    )
  })

  const error = computed(() => {
    return (
      locationsError.value ||
      biomesError.value ||
      altitudeError.value ||
      regionsError.value ||
      roadsError.value ||
      waterError.value ||
      null
    )
  })

  async function loadAllData() {
    await Promise.all([
      loadLocations(),
      loadRegions(),
      loadBiomes(),
      loadAltitude(),
      loadRoads(),
      loadWater()
    ])
  }

  return {
    locations,
    biomes,
    altitude,
    regions,
    roads,
    water,
    loading,
    error,
    loadAllData
  }
}
