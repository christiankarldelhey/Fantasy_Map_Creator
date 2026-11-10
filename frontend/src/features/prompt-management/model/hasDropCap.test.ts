import { describe, expect, it } from 'vitest'
import { hasDropCap } from './hasDropCap'

describe('hasDropCap', () => {
  it('skips short paragraphs, which a two-line capital would overflow into the next one', () => {
    expect(hasDropCap('El helecho había vuelto a tragar el sendero.')).toBe(false)
  })

  it('needs at least 160 characters', () => {
    expect(hasDropCap('a'.repeat(159))).toBe(false)
    expect(hasDropCap('a'.repeat(160))).toBe(true)
  })

  it('ignores surrounding whitespace', () => {
    expect(hasDropCap('   ' + 'a'.repeat(159) + '   ')).toBe(false)
  })

  it('is false for empty input', () => {
    expect(hasDropCap('')).toBe(false)
  })
})
