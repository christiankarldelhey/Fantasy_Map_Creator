import type { Component } from 'vue'
import { Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, Wind } from '@lucide/vue'

export interface ClimateIcon {
  component: Component | Component[]
  color: string | string[]
  labelKey: string
}

export function getClimateIcon(climate: {
  temperature: number
  humidity: number
  precipitation: number
  wind: number
  cloudCover?: number
}): ClimateIcon {
  const { temperature, precipitation, wind, cloudCover } = climate

  // Snow: temp < 2°C AND precipitation > 0
  if (temperature < 2 && precipitation > 0) {
    return {
      component: CloudSnow,
      color: 'text-cyan-300',
      labelKey: 'climate.snow'
    }
  }

  // Heavy rain: precipitation > 10mm
  if (precipitation > 10) {
    return {
      component: CloudRain,
      color: 'text-blue-500',
      labelKey: 'climate.heavyRain'
    }
  }

  // Moderate rain: precipitation 5-10mm
  if (precipitation >= 5) {
    return {
      component: CloudRain,
      color: 'text-blue-400',
      labelKey: 'climate.moderateRain'
    }
  }

  // Light rain: precipitation 2-5mm
  if (precipitation >= 2) {
    return {
      component: CloudRain,
      color: 'text-blue-400',
      labelKey: 'climate.lightRain'
    }
  }

  // Drizzle: precipitation 0.1-2mm
  if (precipitation >= 0.1) {
    return {
      component: CloudDrizzle,
      color: 'text-blue-300',
      labelKey: 'climate.drizzle'
    }
  }

  // Windy: wind > 20km/h
  if (wind > 20) {
    return {
      component: Wind,
      color: 'text-gray-400',
      labelKey: 'climate.windy'
    }
  }

  // Cloudy: cloudCover > 70%
  if (cloudCover !== undefined && cloudCover > 70) {
    return {
      component: Cloud,
      color: 'text-gray-400',
      labelKey: 'climate.cloudy'
    }
  }

  // Partly cloudy: cloudCover 30-70%
  if (cloudCover !== undefined && cloudCover >= 30) {
    return {
      component: [Sun, Cloud],
      color: ['text-yellow-400', 'text-gray-300'],
      labelKey: 'climate.partlyCloudy'
    }
  }

  // Sunny: cloudCover < 30%
  return {
    component: Sun,
    color: 'text-yellow-500',
    labelKey: 'climate.sunny'
  }
}
