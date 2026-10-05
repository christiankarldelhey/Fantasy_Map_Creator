import type { MindDetail, MindList } from './types'

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
