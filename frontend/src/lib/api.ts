import type { ApiResponse, ApiError } from '@/types/api'

const TOKEN_KEY = 'ct_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class HttpError extends Error {
  status: number
  data: ApiError

  constructor(status: number, data: ApiError) {
    super(data.message || `HTTP ${status}`)
    this.status = status
    this.data = data
  }
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  signal?: AbortSignal
  isFormData?: boolean
  raw?: boolean // binary response için
}

export async function apiFetch<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = 'GET', body, query, signal, isFormData, raw } = opts

  let url = path.startsWith('http') ? path : path
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v))
    }
    const s = qs.toString()
    if (s) url += (url.includes('?') ? '&' : '?') + s
  }

  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let requestBody: BodyInit | undefined
  if (isFormData && body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  const resp = await fetch(url, { method, headers, body: requestBody, signal })

  if (resp.status === 401) {
    clearToken()
    // Listen for this dispatched event in App.tsx for redirect
    window.dispatchEvent(new CustomEvent('ct:unauthorized'))
    throw new HttpError(401, { message: 'Oturum sona erdi' })
  }

  if (raw) {
    return (await resp.blob()) as T
  }

  const contentType = resp.headers.get('content-type') || ''
  let payload: ApiResponse<T> | string

  if (contentType.includes('application/json')) {
    payload = await resp.json()
  } else {
    payload = await resp.text()
  }

  if (!resp.ok) {
    const errData: ApiError =
      typeof payload === 'object' && 'data' in payload
        ? (payload.data as ApiError)
        : { message: `HTTP ${resp.status}` }
    throw new HttpError(resp.status, errData)
  }

  if (typeof payload === 'object' && 'success' in payload) {
    if (!payload.success) {
      throw new HttpError(resp.status, payload.data as ApiError)
    }
    return payload.data as T
  }

  return payload as T
}

// Sık kullanılan helper'lar
export const api = {
  get: <T = unknown>(path: string, query?: FetchOpts['query']) =>
    apiFetch<T>(path, { method: 'GET', query }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T = unknown>(path: string, query?: FetchOpts['query']) =>
    apiFetch<T>(path, { method: 'DELETE', query }),
  upload: <T = unknown>(path: string, formData: FormData) =>
    apiFetch<T>(path, { method: 'POST', body: formData, isFormData: true }),
  download: (path: string) => apiFetch<Blob>(path, { method: 'POST', raw: true }),
}
