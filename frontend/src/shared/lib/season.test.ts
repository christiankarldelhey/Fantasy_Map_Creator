import { describe, expect, it } from 'vitest'
import { seasonForMonth } from './season'

describe('seasonForMonth (0 = January)', () => {
  it('maps December to February to winter', () => {
    expect([11, 0, 1].map(seasonForMonth)).toEqual(['winter', 'winter', 'winter'])
  })

  it('maps March to May to spring', () => {
    expect([2, 3, 4].map(seasonForMonth)).toEqual(['spring', 'spring', 'spring'])
  })

  it('maps June to August to summer', () => {
    expect([5, 6, 7].map(seasonForMonth)).toEqual(['summer', 'summer', 'summer'])
  })

  it('maps September to November to autumn', () => {
    expect([8, 9, 10].map(seasonForMonth)).toEqual(['autumn', 'autumn', 'autumn'])
  })
})
