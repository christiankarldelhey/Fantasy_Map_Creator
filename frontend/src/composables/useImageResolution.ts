
export type ImageType = 'location' | 'region' | 'entity'

export interface LocationImageData {
  url_path?: string
  location_type?: string
  slug?: string
  name?: string
}

export interface RegionImageData {
  url_path?: string
  slug?: string
  name?: string
}

export interface EntityImageData {
  url_path?: string
  type?: string
  slug?: string
  name?: string
}

/**
 * Convert string to snake_case
 * @param name - The name to convert
 * @returns snake_case string
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Generate possible image URLs in order of preference
 */
export function generateImageUrls(type: ImageType, data: LocationImageData | RegionImageData | EntityImageData): string[] {
  const urls: string[] = []
  const defaultUrlPath = type === 'location' ? 'assets/locations' : type === 'region' ? 'assets/regions' : 'assets/entities'
  const urlPath = data.url_path || defaultUrlPath
  const slug = data.slug || (data.name ? slugify(data.name) : '')

  if (type === 'location') {
    const locationData = data as LocationImageData
    const locationType = locationData.location_type || 'default'

    // Try specific image: {url_path}/{location_type}/{slug}.jpg
    if (slug) {
      urls.push(`/${urlPath}/${locationType}/${slug}.jpg`)
    }

    // Fallback 1: {url_path}/{location_type}/default/placeholder.jpg
    urls.push(`/${urlPath}/${locationType}/default/placeholder.jpg`)

    // Fallback 2: {url_path}/default/placeholder.jpg
    urls.push(`/${urlPath}/default/placeholder.jpg`)
  } else if (type === 'region') {
    // Use name (without ID suffix) for folder path since folders were created with region names
    const regionSlug = data.name ? slugify(data.name) : slug
    
    // Try: {url_path}/{region_slug}/default/placeholder.jpg
    if (regionSlug) {
      urls.push(`/${urlPath}/${regionSlug}/default/placeholder.jpg`)
    }

    // Fallback: {url_path}/default/placeholder.jpg
    urls.push(`/${urlPath}/default/placeholder.jpg`)
  } else if (type === 'entity') {
    const entityData = data as EntityImageData
    const entityType = entityData.type || 'default'

    // Try specific image: {url_path}/{type}/{slug}.jpg
    if (slug) {
      urls.push(`/${urlPath}/${entityType}/${slug}.jpg`)
    }

    // Fallback 1: {url_path}/{type}/default/placeholder.jpg
    urls.push(`/${urlPath}/${entityType}/default/placeholder.jpg`)

    // Fallback 2: {url_path}/default/placeholder.jpg
    urls.push(`/${urlPath}/default/placeholder.jpg`)
  }

  return urls
}

export function useImageResolution() {
  return {
    slugify,
    generateImageUrls
  }
}
