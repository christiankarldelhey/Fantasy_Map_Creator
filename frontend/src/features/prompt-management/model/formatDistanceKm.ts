/** Distance in km with the locale's separators and at most one decimal ("26,3" in es, "26.3" in en). */
export function formatDistanceKm(km: number | null | undefined, locale: string): string {
  if (km === null || km === undefined || Number.isNaN(Number(km))) return ''
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Number(km))
}
