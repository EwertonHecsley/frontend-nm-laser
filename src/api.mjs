const configuredApiBaseUrl = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3030'
let apiBaseUrlEnd = configuredApiBaseUrl.length
while (apiBaseUrlEnd > 0 && configuredApiBaseUrl[apiBaseUrlEnd - 1] === '/') apiBaseUrlEnd -= 1
export const API_BASE_URL = configuredApiBaseUrl.slice(0, apiBaseUrlEnd)

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'arrived',
  'performed',
  'missed',
  'rescheduled',
  'cancelled',
]

export const STATUS_LABELS = {
  scheduled: 'Agendada',
  arrived: 'Chegou / aguardando',
  performed: 'Realizada',
  missed: 'Faltou',
  rescheduled: 'Remarcada',
  cancelled: 'Cancelada',
}

export function localDateTimeToIso(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function isoToLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function queryString(entries) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value).trim())
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

function normalizedMessages(message) {
  if (typeof message === 'string') return message.toLowerCase()
  if (Array.isArray(message)) return message.map(normalizedMessages).join(' ')
  if (message && typeof message === 'object') {
    return Object.values(message).map(normalizedMessages).join(' ')
  }
  return ''
}

export function safeErrorMessage(status, message) {
  const normalized = normalizedMessages(message)
  if (status === 401) return 'Credenciais inválidas ou sessão expirada. Entre novamente.'
  if (status === 403) return 'Você não tem permissão para realizar esta ação.'
  if (status === 404) return 'O registro solicitado não foi encontrado ou não está mais disponível.'
  if (status === 409) {
    if (/cpf|document/.test(normalized)) return 'Já existe um cadastro com esses dados.'
    if (/hor.rio|schedule|professional/.test(normalized)) return 'A API informou um conflito para este agendamento.'
    return 'A API informou um conflito. Revise os dados e tente novamente.'
  }
  if (status === 400 || status === 422) return 'A API não aceitou os dados. Confira os campos e tente novamente.'
  if (status >= 500) return 'O serviço está indisponível no momento. Tente novamente mais tarde.'
  return 'Não foi possível concluir a solicitação. Tente novamente.'
}

let accessToken = null
let unauthorizedHandler = () => {}

export function setAccessToken(token) {
  accessToken = typeof token === 'string' && token ? token : null
}

export function decodeJwtClaims(token) {
  if (typeof token !== 'string') return null
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), (character) => character.codePointAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes))
    return claims && typeof claims === 'object' && !Array.isArray(claims) ? claims : null
  } catch {
    return null
  }
}

export function getAccessTokenClaims() {
  return decodeJwtClaims(accessToken)
}

export function clearAccessToken() {
  accessToken = null
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  constructor(status, message) {
    super(safeErrorMessage(status, message))
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(0)
  }

  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const error = new ApiError(response.status, body?.message)
    if (response.status === 401) {
      clearAccessToken()
      unauthorizedHandler()
    }
    throw error
  }
  return body
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
