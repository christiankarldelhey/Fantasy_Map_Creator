// Desktop ChapterViewer: half the viewport, never narrower than this.
export const CHAPTER_PANEL_MIN_WIDTH_PX = 448

// Breathing room between the panel and the route fitted on the map.
const CHAPTER_PANEL_MAP_MARGIN_PX = 44

/** Right padding for map.fitBounds so a trip-day route stays clear of the ChapterViewer. */
export function chapterPanelMapPadding(viewportWidth: number): number {
  return Math.round(Math.max(viewportWidth / 2, CHAPTER_PANEL_MIN_WIDTH_PX) + CHAPTER_PANEL_MAP_MARGIN_PX)
}
