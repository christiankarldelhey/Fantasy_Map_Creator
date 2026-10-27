import { describe, expect, it, vi } from 'vitest'
import { makeFakeMap } from '@/test-utils/fakeMap'
import { resolveHoverName, useMapHover, type HoverPopup } from './useMapHover'

const location = (name: string) => ({
  layer: { id: 'locations-major' },
  properties: { name }
})
const region = (name: string, id = 7) => ({
  layer: { id: 'regions-fill' },
  properties: { name, id }
})

const makePopup = () => {
  const calls: string[] = []
  const popup: HoverPopup = {
    setLngLat: vi.fn(() => popup),
    setText: vi.fn(() => popup),
    addTo: vi.fn(() => popup),
    remove: vi.fn(() => {
      calls.push('remove')
      return popup
    })
  }
  return { popup, calls }
}

describe('resolveHoverName', () => {
  it('prefers the location name over the region name', () => {
    const hit = resolveHoverName([location('Bree'), region('Eriador', 7)])
    expect(hit).toEqual({ name: 'Bree', regionId: 7 })
  })

  it('returns the region name when only a region is under the cursor', () => {
    const hit = resolveHoverName([region('Rhovanion', 12)])
    expect(hit).toEqual({ name: 'Rhovanion', regionId: 12 })
  })

  it('returns null over unnamed space', () => {
    expect(resolveHoverName([])).toBeNull()
    expect(resolveHoverName([{ layer: { id: 'water-fill' }, properties: {} }])).toBeNull()
  })
})

describe('useMapHover', () => {
  it('shows the popup with the region name and exposes hoveredRegionId', () => {
    const map = makeFakeMap({ layers: ['regions-fill'] })
    map.setFeatures([region('Eriador', 7)])
    const { popup } = makePopup()

    let t = 1000
    const { hoveredRegionId, attachHover } = useMapHover({ now: () => t })
    attachHover(map, popup)
    map.fire('mousemove', { point: { x: 1, y: 1 }, lngLat: { lng: -70, lat: -42 }, originalEvent: {} })

    expect(popup.setText).toHaveBeenCalledWith('Eriador')
    expect(popup.addTo).toHaveBeenCalled()
    expect(hoveredRegionId.value).toBe(7)
  })

  it('hides the popup and clears the region over unnamed space', () => {
    const map = makeFakeMap({ layers: ['regions-fill'] })
    map.setFeatures([])
    const { popup } = makePopup()
    const { hoveredRegionId, attachHover } = useMapHover({ now: () => 1000 })
    attachHover(map, popup)

    map.fire('mousemove', { point: { x: 1, y: 1 }, lngLat: { lng: 0, lat: 0 }, originalEvent: {} })

    expect(popup.remove).toHaveBeenCalled()
    expect(hoveredRegionId.value).toBeNull()
  })

  it('throttles hit-testing to ~90ms', () => {
    const map = makeFakeMap({ layers: ['regions-fill'] })
    map.setFeatures([region('Eriador')])
    let t = 1000
    const { attachHover } = useMapHover({ now: () => t, throttleMs: 90 })
    attachHover(map, makePopup().popup)

    map.fire('mousemove', { point: { x: 1, y: 1 }, lngLat: { lng: 0, lat: 0 }, originalEvent: {} })
    t += 30
    map.fire('mousemove', { point: { x: 2, y: 2 }, lngLat: { lng: 0, lat: 0 }, originalEvent: {} })
    expect(map.queryRenderedFeatures).toHaveBeenCalledTimes(1)

    t += 100
    map.fire('mousemove', { point: { x: 3, y: 3 }, lngLat: { lng: 0, lat: 0 }, originalEvent: {} })
    expect(map.queryRenderedFeatures).toHaveBeenCalledTimes(2)
  })

  it('hides and skips hit-testing while the mouse is dragging', () => {
    const map = makeFakeMap({ layers: ['regions-fill'] })
    map.setFeatures([region('Eriador')])
    const { popup } = makePopup()
    const { attachHover } = useMapHover({ now: () => 1000 })
    attachHover(map, popup)

    map.fire('mousemove', { point: { x: 1, y: 1 }, lngLat: { lng: 0, lat: 0 }, originalEvent: { buttons: 1 } })

    expect(map.queryRenderedFeatures).not.toHaveBeenCalled()
    expect(popup.remove).toHaveBeenCalled()
  })

  it('hides the popup when the cursor leaves the canvas', () => {
    const map = makeFakeMap({ layers: ['regions-fill'] })
    const { popup } = makePopup()
    const { attachHover } = useMapHover()
    attachHover(map, popup)

    map.fire('mouseout')

    expect(popup.remove).toHaveBeenCalled()
  })
})
