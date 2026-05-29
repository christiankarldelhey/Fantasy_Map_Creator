export const MAP_COLORS = {
  // Agua (Unificado para ríos, arroyos, lagos)
  water: {
    primary: '#1d4ed8',      // Azul agua unificado hermoso para ríos, arroyos, lagos
    opacityLine: 0.8,
    opacityFill: 0.5,        // Opacidad del fill de lagos
    outline: '#1e40af',      // Borde del agua
    lineWidthRiver: 2.5,
    lineWidthStream: 1.0
  },
  
  // Caminos por tipo (columna 'name' de la tabla 'roads')
  roads: {
    trail: '#78350f',        // Sendero (marrón claro)
    regular: '#b45309',      // Camino regular (ámbar/marrón)
    main: '#9a3412',         // Camino principal (rojo/marrón)
    royal: '#7c2d12',        // Calzada real (rojo oscuro)
    default: '#4b5563',
    widthTrail: 1.0,
    widthRegular: 1.8,
    widthMain: 2.5,
    widthRoyal: 3.5,
    opacity: 0.8
  },

  // Biomas (sin lagos ya que fueron migrados a agua)
  biomes: {
    forest: '#166534',
    desert: '#fef08a',
    marsh: '#14532d',
    default: '#22c55e',
    fillOpacity: 0.3          // Opacidad visible para ver los polígonos de biomas
  },

  // Regiones Políticas (Reinos y colores actuales de useRegionLayer.ts)
  regions: {
    gondor: '#3b82f6',
    rohan: '#f59e0b',
    mordor: '#7c2d12',
    rivendell: '#8b5cf6',
    shire: '#22c55e',
    default: '#94a3b8',
    fillColor: '#0d9488',
    fillOpacity: 0.0,         // Seteado en 0 para remover la película/capa de opacidad sobre el mapa
    outlineColor: '#0d9488',
    outlineWidth: 1.5
  },

  // Capa de Altitud (DEM visual)
  altitude: {
    plain: '#22c55e',
    hills: '#a16207',
    mountains_low: '#94a3b8',
    mountains_med: '#475569',
    mountains_high: '#334155',
    default: '#64748b',
    fillOpacityPlain: 0.0,    // Desactivada la opacidad
    fillOpacityHills: 0.0,
    fillOpacityLow: 0.0,
    fillOpacityMed: 0.0,
    fillOpacityHigh: 0.0,
    outlineColorHills: '#713f12',
    outlineColorLow: '#475569',
    outlineColorMed: '#1e293b',
    outlineColorHigh: '#0f172a',
    outlineColorDefault: '#334155',
    outlineWidthHigh: 2.0,
    outlineWidthDefault: 1.0
  },

  // Ubicaciones (Locations)
  locations: {
    primary: '#e11d48',
    stroke: '#ffffff'
  }
} as const
