import { describe, expect, it } from 'vitest'
import { formatDistanceKm } from './formatDistanceKm'

describe('formatDistanceKm', () => {
  it('uses the locale decimal separator, one decimal', () => {
    expect(formatDistanceKm(26.253, 'es')).toBe('26,3')
    expect(formatDistanceKm(26.253, 'en')).toBe('26.3')
  })

  it('drops a trailing .0', () => {
    expect(formatDistanceKm(45, 'es')).toBe('45')
  })

  it('formats thousands with the locale grouping', () => {
    expect(formatDistanceKm(1234.56, 'en')).toBe('1,234.6')
  })

  it('returns an empty string for missing values', () => {
    expect(formatDistanceKm(null, 'es')).toBe('')
    expect(formatDistanceKm(undefined, 'es')).toBe('')
  })
})
