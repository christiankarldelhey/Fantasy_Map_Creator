import { describe, expect, it } from 'vitest'
import { panelAfterChapterToggle, panelAfterToolsToggle } from './chapterPanels'

describe('panelAfterChapterToggle', () => {
  it('opens a collapsed chapter on its narrative', () => {
    expect(panelAfterChapterToggle(null)).toBe('narrative')
    expect(panelAfterChapterToggle(undefined)).toBe('narrative')
  })

  it('collapses an open chapter, whichever panel is showing', () => {
    expect(panelAfterChapterToggle('narrative')).toBeNull()
    expect(panelAfterChapterToggle('prompt')).toBeNull()
  })
})

describe('panelAfterToolsToggle', () => {
  it('falls back to the narrative when the tools close while a tool panel is open', () => {
    expect(panelAfterToolsToggle('prompt', false)).toBe('narrative')
    expect(panelAfterToolsToggle('system', false)).toBe('narrative')
  })

  it('keeps the narrative and a collapsed chapter as they are', () => {
    expect(panelAfterToolsToggle('narrative', false)).toBe('narrative')
    expect(panelAfterToolsToggle(null, false)).toBeNull()
  })

  it('does not touch the panel when the tools open', () => {
    expect(panelAfterToolsToggle('narrative', true)).toBe('narrative')
    expect(panelAfterToolsToggle('open', true)).toBe('open')
  })
})
