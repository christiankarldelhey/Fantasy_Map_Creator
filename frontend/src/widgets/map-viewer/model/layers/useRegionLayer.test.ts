import { describe, expect, it, vi } from 'vitest'
import { makeFakeMap } from '@/test-utils/fakeMap'
import { useRegionLayer } from './useRegionLayer'
import { MAP_COLORS } from '../../config/mapColors'

const paintCalls = (map: ReturnType<typeof makeFakeMap>) =>
  vi.mocked(map.setPaintProperty).mock.calls

describe('highlightRegionBorder', () => {
  it('paints the selected region red and the hovered region neutral', () => {
    const map = makeFakeMap({ layers: ['regions-outline'] })
    const { highlightRegionBorder } = useRegionLayer()

    highlightRegionBorder(map, 5, 3)

    const color = paintCalls(map).find(([, p]) => p === 'line-color')?.[2]
    expect(color).toEqual([
      'case',
      ['==', ['get', 'id'], 5], '#ef4444',
      ['==', ['get', 'id'], 3], MAP_COLORS.regions.hoverColor,
      MAP_COLORS.regions.outlineColor
    ])
  })

  it('keeps the selected region red when it is also hovered', () => {
    const map = makeFakeMap({ layers: ['regions-outline'] })
    const { highlightRegionBorder } = useRegionLayer()

    highlightRegionBorder(map, 5, 5)

    const color = paintCalls(map).find(([, p]) => p === 'line-color')?.[2]
    expect(color).toEqual([
      'case',
      ['==', ['get', 'id'], 5], '#ef4444',
      MAP_COLORS.regions.outlineColor
    ])
  })

  it('makes every border transparent when nothing is selected or hovered', () => {
    const map = makeFakeMap({ layers: ['regions-outline'] })
    const { highlightRegionBorder } = useRegionLayer()

    highlightRegionBorder(map, null, null)

    const opacity = paintCalls(map).find(([, p]) => p === 'line-opacity')?.[2]
    expect(opacity).toBe(0)
  })
})
