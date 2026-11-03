export type ChapterPanel = 'narrative' | 'prompt' | 'open' | 'close' | 'system'

/** Clicking the chapter row opens a collapsed chapter on its narrative and collapses an open one. */
export function panelAfterChapterToggle(current: ChapterPanel | null | undefined): ChapterPanel | null {
  return current ? null : 'narrative'
}

/** Closing the admin tools while a tool panel is showing returns to the narrative, so the reader is never stranded without the tab row. */
export function panelAfterToolsToggle(current: ChapterPanel | null | undefined, toolsOpen: boolean): ChapterPanel | null {
  if (!current) return null
  if (!toolsOpen && current !== 'narrative') return 'narrative'
  return current
}
