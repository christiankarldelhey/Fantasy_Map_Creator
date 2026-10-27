import { describe, expect, it } from 'vitest'
import { chapterPanelMapPadding } from './layout'

describe('chapterPanelMapPadding', () => {
  it('reserves half the viewport plus a margin on wide screens', () => {
    expect(chapterPanelMapPadding(1440)).toBe(764)
    expect(chapterPanelMapPadding(1920)).toBe(1004)
  })

  it('never reserves less than the panel minimum width plus the margin', () => {
    expect(chapterPanelMapPadding(800)).toBe(492)
  })
})
