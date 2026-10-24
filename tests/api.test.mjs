import test from 'node:test'
import assert from 'node:assert/strict'
import {
  API_BASE_URL,
  APPOINTMENT_STATUSES,
  decodeJwtClaims,
  isUuid,
  isoToLocalDateTime,
  localDateTimeToIso,
  queryString,
  safeErrorMessage,
} from '../src/api.mjs'

test('API local usa a porta indicada pela referência detalhada', () => {
  assert.equal(API_BASE_URL, 'http://localhost:3030')
})

test('JWT claims fornecem somente os dados de identidade descritos pela API', () => {
  const payload = Buffer.from(JSON.stringify({ sub: 'user-id', role: 'gestora' })).toString('base64url')
  assert.deepEqual(decodeJwtClaims(`header.${payload}.signature`), { sub: 'user-id', role: 'gestora' })
  assert.equal(decodeJwtClaims('invalid-token'), null)
})

test('queryString skips empty values and encodes filters', () => {
  assert.equal(queryString({ page: 2, search: 'Ana Silva', cityId: '' }), '?page=2&search=Ana+Silva')
})

test('local datetime serialization preserves the local instant through roundtrip', () => {
  const local = '2026-11-05T13:30'
  const iso = localDateTimeToIso(local)
  assert.equal(new Date(iso).getTime(), new Date(local).getTime())
  assert.equal(isoToLocalDateTime(iso), local)
  assert.equal(localDateTimeToIso(''), '')
})

test('structured error messages are converted to safe, generic feedback', () => {
  assert.equal(safeErrorMessage(403, ['forbidden']), 'Você não tem permissão para realizar esta ação.')
  assert.equal(safeErrorMessage(409, { message: 'cpf já cadastrado' }), 'Já existe um cadastro com esses dados.')
  assert.equal(safeErrorMessage(500, 'detail'), 'O serviço está indisponível no momento. Tente novamente mais tarde.')
})

test('appointment status values match the documented API values', () => {
  assert.deepEqual(APPOINTMENT_STATUSES, ['scheduled', 'arrived', 'performed', 'missed', 'rescheduled', 'cancelled'])
})

test('UUID field validation rejects arbitrary user input', () => {
  assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true)
  assert.equal(isUuid('professional-1'), false)
})
