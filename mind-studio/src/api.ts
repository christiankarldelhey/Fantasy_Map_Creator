import type { Accent, MindDetail, MindList, VoiceBand, VoicePack } from './types'

const BASE = `${import.meta.env.BASE_URL}api`

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  // Same-origin + HTTP Basic: the browser asks for credentials once.
  const res = await fetch(`${BASE}${path}`, {
    signal,
    credentials: 'same-origin',
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const fetchMinds = (signal?: AbortSignal) =>
  getJson<MindList>('/minds', signal)

export const fetchMind = (characterId: string, signal?: AbortSignal) =>
  getJson<MindDetail>(`/minds/${encodeURIComponent(characterId)}`, signal)

export async function patchCard(
  characterId: string,
  patch: Partial<import('./types').CharacterCard>,
): Promise<void> {
  const res = await fetch(`${BASE}/minds/${encodeURIComponent(characterId)}/card`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
}

async function patchJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
}

export const patchTraits = (characterId: string, traits: Record<string, number>) =>
  patchJson(`/minds/${encodeURIComponent(characterId)}/traits`, { traits })

export const patchConcerns = (
  characterId: string,
  weights: Record<string, number | null>,
) => patchJson(`/minds/${encodeURIComponent(characterId)}/concerns`, { weights })

// --- La voz del mundo + el acento de una mente -----------------------------

const enc = encodeURIComponent

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const fetchVoice = (signal?: AbortSignal) =>
  getJson<VoicePack>('/voice', signal)

export const putBandTable = (table: string, rows: VoiceBand[]) =>
  putJson<Record<string, unknown>>(`/voice/bands/${enc(table)}`, rows)
export const deleteBandTable = (table: string) =>
  deleteJson<Record<string, unknown>>(`/voice/bands/${enc(table)}`)

export const putThreshold = (key: string, value: number) =>
  putJson<Record<string, unknown>>(`/voice/thresholds/${enc(key)}`, { value })
export const deleteThreshold = (key: string) =>
  deleteJson<Record<string, unknown>>(`/voice/thresholds/${enc(key)}`)

export const putPhrases = (key: string, phrases: string[]) =>
  putJson<Record<string, unknown>>(`/voice/phrases/${enc(key)}`, { phrases })
export const deletePhrases = (key: string) =>
  deleteJson<Record<string, unknown>>(`/voice/phrases/${enc(key)}`)

export const putFacet = (
  eventType: string,
  fieldPath: string,
  body: { unit: string | null; description: string | null },
) => putJson<unknown[]>(`/voice/facets/${enc(eventType)}/${enc(fieldPath)}`, body)
export const deleteFacet = (eventType: string, fieldPath: string) =>
  deleteJson<unknown[]>(`/voice/facets/${enc(eventType)}/${enc(fieldPath)}`)

export const fetchAccent = (characterId: string, signal?: AbortSignal) =>
  getJson<Accent>(`/minds/${enc(characterId)}/accent`, signal)

const accent = (id: string) => `/minds/${enc(id)}/accent`

export const putAccentPhrases = (id: string, key: string, phrases: string[]) =>
  putJson<Accent>(`${accent(id)}/phrases/${enc(key)}`, { phrases })
export const deleteAccentPhrases = (id: string, key: string) =>
  deleteJson<Accent>(`${accent(id)}/phrases/${enc(key)}`)
export const putAccentThreshold = (id: string, key: string, value: number) =>
  putJson<Accent>(`${accent(id)}/thresholds/${enc(key)}`, { value })
export const deleteAccentThreshold = (id: string, key: string) =>
  deleteJson<Accent>(`${accent(id)}/thresholds/${enc(key)}`)
