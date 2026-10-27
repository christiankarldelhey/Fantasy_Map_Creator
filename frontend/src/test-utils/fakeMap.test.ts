import { describe, expect, it } from 'vitest'
import { makeFakeMap } from './fakeMap'

describe('makeFakeMap', () => {
  it('delivers a fired mousemove to handlers registered with on', () => {
    const map = makeFakeMap()
    const seen: unknown[] = []
    map.on('mousemove', (e) => seen.push(e))

    map.fire('mousemove', { lngLat: { lng: -70, lat: -42 }, point: { x: 10, y: 20 } })

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ lngLat: { lng: -70, lat: -42 } })
  })

  it('queryRenderedFeatures returns only features of the requested layers', () => {
    const map = makeFakeMap({ layers: ['regions-fill', 'locations-major'] })
    map.setFeatures([
      { layer: { id: 'regions-fill' }, properties: { name: 'Eriador' } },
      { layer: { id: 'water-fill' }, properties: { name: 'Brandywine' } },
    ])

    const hits = map.queryRenderedFeatures({ x: 1, y: 1 }, { layers: ['regions-fill'] })

    expect(hits).toHaveLength(1)
    expect(hits[0]?.properties?.name).toBe('Eriador')
  })

  it('getLayer reports only the layers registered on the fake', () => {
    const map = makeFakeMap({ layers: ['regions-fill'] })

    expect(map.getLayer('regions-fill')).toBeTruthy()
    expect(map.getLayer('water-fill')).toBeUndefined()
  })
})
