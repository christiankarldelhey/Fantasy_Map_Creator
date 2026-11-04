import type { MindDetail, MindList, Mood } from './types'

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

async function patchJson<T = void>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const patchTraits = (characterId: string, traits: Record<string, number>) =>
  patchJson(`/minds/${encodeURIComponent(characterId)}/traits`, { traits })

export const patchMood = (
  characterId: string,
  mood: { valence?: number; arousal?: number },
) => patchJson<Mood>(`/minds/${encodeURIComponent(characterId)}/mood`, mood)

export const patchConcerns = (
  characterId: string,
  weights: Record<string, number | null>,
) => patchJson(`/minds/${encodeURIComponent(characterId)}/concerns`, { weights })
