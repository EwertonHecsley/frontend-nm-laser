# API Integration: CRM NM Laser

Este documento descreve como o frontend se integra ao backend NestJS, a arquitetura do BFF (Backend for Frontend), contratos de endpoints, tratamento de erros e padrões de requisição. Fonte complementar: `backend-api.md` na raiz do projeto.

---

## 🏛️ Visão Geral da Integração

```
Browser                     Next.js Server (BFF)                     NestJS Backend
  │                                │                                      │
  │  fetch("/api/backend/…")       │                                      │
  │───────────────────────────────▶│  backendFetch("/cities", {Bearer})   │
  │                                │─────────────────────────────────────▶│
  │                                │◀─────────────────────────────────────│
  │  ◀──── JSON ───────────────────│                                      │
```

### Variáveis de ambiente

| Variável | Escopo | Padrão | Função |
|---|---|---|---|
| `BACKEND_API_URL` | server-only | `http://localhost:3030` | URL interna do NestJS — **nunca vai ao bundle client** |
| `NEXT_PUBLIC_API_BASE_PATH` | público | `/api/backend` | Prefixo same-origin usado pelo `http client` |

- `lib/config/api.ts` expõe `API_BASE_PATH` (normaliza barras finais)
- `lib/server/backend.ts` (`backendFetch`) é **server-only** e monta as chamadas ao backend proxy/autenticação
- `lib/server/env.ts` centraliza leitura de env no servidor

---

## 🌐 BFF

### 1. Proxy de recursos: `src/app/api/backend/[...path]/route.ts`
- **Allowlist de recursos:** apenas `cities`, `patients`, `appointments`, `sessions`, `areas`, `packages`, `sales`, `users`
- **Validação de método:** métodos não mapeados para o recurso → `405`. `GET/POST/PATCH/DELETE` são os únicos encaminhados
- **RBAC prévia:** aplica permissões (matriz `lib/auth/permissions.ts`) antes de encaminhar; a API continua sendo autoridade final
- **Encaminhamento:** reescreve para `${BACKEND_API_URL}/<path>` com header `Authorization: Bearer <access token>` extraído do cookie de sessão

### 2. BFF de autenticação: `src/app/api/auth/*`
Todas as rotas:
- Exigem `isSameOriginRequest(request)` (senão `403`)
- Exigem `Content-Type: application/json` (senão `415`)
- Limitam corpo a 16KB (`413`)
- Respondem com `Cache-Control: no-store`

| Rota | Detalhes |
|---|---|
| `POST /api/auth/login` | Zod: `email` ≤254, `password` 6–200; `sanitizeEmail`; chama `POST /auth/login` no backend; valida `accessToken` (payload decodável + fresh) e `refreshToken` opaco (20–200 chars); grava 3 cookies; devolve `{ user }` — sem tokens no body |
| `POST /api/auth/refresh` | Lê cookie `nm_refresh`; chama `POST /auth/refresh`; valida par; rotaciona os 3 cookies; responde `204`. Abort → `499` |
| `POST /api/auth/logout` | Best-effort `POST /auth/logout` com o refresh (revogação); sempre limpa os cookies; `204` |
| `POST /api/auth/change-password` | Requer access fresh; Zod: current 1–200, new 8–200; repassa ao backend com Bearer; backend revoga todos os refresh do usuário → limpa sessão local e devolve mensagem |

### Mensagens mapeadas (login)
| Backend | Resposta BFF |
|---|---|
| 401 | "E-mail ou senha inválidos." |
| 429 | "Muitas tentativas de login…" |
| 5xx | 502 "O serviço de autenticação está indisponível." |
| 400 | 400 com `extractApiMessage(payload)` |

---

## 🔌 HTTP Client (`lib/http/client.ts`)

Assinatura principal:

```ts
http.get<T>(path, options?)
http.post<T>(path, body?, options?)
http.patch<T>(path, body?, options?)
http.delete<T = void>(path, options?)
```

`options` (`RequestOptions`): `query?`, `body?`, `headers?`, `timeoutMs?` (default 20s), extras de `RequestInit` (`signal` etc.).

### Comportamentos
1. **Path resolution:** `http.get("patients")` → `${API_BASE_PATH}/patients`; `http.get("api/auth/login")` usa a origem (rota do próprio BFF); barras iniciais removidas
2. **Query builder:** ignora `undefined/null/""`; suporta array → múltiplos `key=value`
3. **Headers:** `Accept: application/json` sempre; `Content-Type: application/json` quando há body
4. **Credenciais:** `credentials: "same-origin"`, `cache: "no-store"`
5. **Timeout:** `AbortSignal.timeout(timeoutMs)` combinado com o `signal` externo via `AbortSignal.any`
6. **Erros de rede:** abort do caller → rethrow; timeout → `ApiError(408, "A requisição demorou demais…")`; offline → `ApiError(0, "Não foi possível conectar…")`
7. **204** → `undefined as T`; senão parse JSON/texto conforme `content-type`

### Interceptor de renovação (401)
```ts
if (error.status === 401 && !isAuthPath && !aborted && typeof window !== "undefined") {
  const refreshed = await startRefresh();  // promise única compartilhada
  if (refreshed) return executeRequest(...); // retry da original
}
```
- `startRefresh()` → `POST /api/auth/refresh` (cookie-only). `refreshInFlight` evita storm de renovações em paralelo
- No login (`isLoginRequest`), 401 gera mensagem normal ("E-mail ou senha inválidos.")
- Demais 401 (após falha de refresh): dispatch `window.dispatchEvent(new Event("nm:unauthorized"))` para subscribers de UI

---

## 🧨 Erros (`lib/http/errors.ts`)

```ts
class ApiError extends Error {
  readonly status: number;   // 0 = rede, 408 = timeout, etc.
  readonly body: unknown;    // payload cru para casos especiais
}
```

- `normalizeApiError(status, payload)` → mensagem pt-BR por status (tabela 400/401/403/404/408/409/429/500/502/503); para 4xx não sensíveis extrai `message` do corpo (string/array/objeto aninhado), filtrando "Internal server error"
- `getErrorMessage(error)` — wrapper seguro para exibir em toasts/labels
- `isAbortError(error)` — detecta `AbortError`/`TimeoutError` (DOMException)

---

## 📡 Serviços por Entidade (`src/services/`)

Todos os services usam `http.*`, sanitizam payload e aceitam `{ signal?: AbortSignal }`.

### `auth.service.ts`
| Método | Caminho | Retorno |
|---|---|---|
| `login(input)` | `api/auth/login` (BFF) | `AuthUser` |
| `logout()` | `api/auth/logout` | `void` |
| `changePassword(input)` | `api/auth/change-password` | `{ message }` |
| `refreshSession()` | `api/auth/refresh` | `AuthUser \| null` (swallow) |

### `cities.service.ts`
- `list()`, `getById(id)`, `create({ name })`, `update(id, { name })`, `remove(id)`
- Regra: exclusão bloqueada com vínculos (pacientes/agendamentos)

### `patients.service.ts`
| Método | Caminho | Query/Notes |
|---|---|---|
| `list(params)` | `patients` | `page` (≥1), `limit` (default 20), `search` → `PaginatedResponse<Patient>` |
| `getById(id)` | `patients/:id` | `encodeURIComponent` |
| `create(input)` | `patients` | `toCreatePayload`: uppercase, digits, limits |
| `update(id, input)` | `patients/:id` | PATCH parcial; **nunca envia `cpf`** |
| `remove(id)` | `patients/:id` | — |

Tipos-chave: `Patient { id, fullName, birthDate, cpf, address, city: { id, name }, whatsapp? }`.

### `appointments.service.ts`
- `list({ from, to, cityId, professionalId })` → lista completa (sem paginação contract)
- `getById`, `create({ patientId, cityId, professionalId?, scheduledAt, status? })`, `update` (PATCH parcial), `remove`
- Statuses: `scheduled, arrived, performed, missed, rescheduled, cancelled`

### `sessions.service.ts`
| Método | Caminho | Notas |
|---|---|---|
| `listByPatient(patientId)` | `sessions?patientId=` | histórico do paciente |
| `overview(filters)` | `sessions/overview` | `{ stats, sessions }`; stats ignoram filtro de status |
| `getById(id)` | `sessions/:id` | inclui `patient`, `saleId`, `areas` |
| `getGroup(id)` | `sessions/groups/:id` | `SessionGroupDetail` |
| `create(input)` | `sessions` | valida/desconta saldo quando `completed` |
| `update(id, input)` | `sessions/:id` | nota: backend é a autoridade para desconto |
| `remove(id)` | `sessions/:id` | só gestora |

Payload builder cuida de: `areaIds` dedupe, campos técnicos (potency/frequency/technique/energyAccumulated) sani­ tizados, `observations` ≤2000, `signature` **opaca** (não sanitary), nulos convertidos para `null` no PATCH.

### `areas.service.ts`
- `list()`, `getById`, `create({ name })`, `update`, `remove` (bloqueio de vínculos)

### `packages.service.ts`
- `list()` → items `[{ areaId, areaName, sessionsCount }]`
- `getById`, `create({ name, items })`, `update`, `remove` (bloqueado se vendido)

### `sales.service.ts`
- `list({ patientId })` → vendas + saldo por área (`areas[].remaining`)
- `create({ patientId, packageId, consultantId?, value, discount?, paymentMethod, paymentStatus? })` — inicia `open`
- `getById`, `update` (PATCH parcial; confirm exclusivo "venda própria" para vendas; confirmada não reabre)
- `remove` — só gestora; bloqueado com vínculos
- Coberto por teste: `sales.service.test.ts`

### `users.service.ts`
- `list()` → subordinados (vendas/aplicadora)
- `getById`, `create({ name, email, role, password })`, `update` (PATCH opcional), `remove` (bloqueio)

### `reports.service.ts`
- Relatórios (faturamento/consultoria) — base para evolução de dashboards

---

## 🧾 Contratos de Dados (`src/types/`)

### `common.ts`
- `PaginatedResponse<T> { data: T[]; page; limit; total; totalPages; ... }`
- `ApiErrorBody { message: string \| string[] \| object }`

### `auth.ts`
- `role = "gestora" \| "vendas" \| "aplicadora"` + `isRole()`
- `AccessTokenPayload { sub, role, name?, iat?, exp? }`
- `RefreshTokenPayload { sub, iat?, exp? }` (opaco no backend: `exp` pode não existir)
- `LoginInput`, `LoginResponse { accessToken, refreshToken }`, `AuthSessionResponse { user }`, `AuthUser { id, name, email, role }`, `ChangePasswordInput`
- `SESSION_*` consts em `lib/auth/constants.ts`

### `city.ts`
- `City { id, name }`

### `patient.ts`
- `Patient`, `PatientListParams { page?, limit?, search? }`
- `CreatePatientInput` (fullName, birthDate, cpf, address, cityId, whatsapp?)
- `UpdatePatientInput` (sem cpf!)

### `appointment.ts`
- `AppointmentStatus` enum-like union
- `Appointment`, `CreateAppointmentInput`, `UpdateAppointmentInput`, list filters

### `session.ts`
- `SessionStatus = "completed" \| "in_progress" \| "cancelled"`
- `SessionRecord` (com `patient`, `saleId`, `packageName`, `areas`)
- `CreateSessionInput` / `UpdateSessionInput` (todos os técnicos + signature)
- `SessionOverviewFilters { patientId?, status?, from?, to?, search?, limit? }`
- `SessionOverview { stats: { total, completed, inProgress, cancelled, patients }, sessions: [...] }`
- `SessionGroupDetail`

### `sale.ts`
- `SaleArea { areaId, areaName, sessionsCount, used, remaining }`
- `Sale`, `SaleListParams { patientId }`, `CreateSaleInput`, `UpdateSaleInput`
- `paymentStatus: "open" \| "confirmed"`, `paymentMethod` enum

### `user.ts`
- `ManagedRole = "vendas" \| "aplicadora"` (gestão restrita)
- `User`, `CreateUserInput`, `UpdateUserInput`

---

## 🧪 Testes da Camada de API

- `lib/http/client.test.ts` / `errors.test.ts` — comportamento do client (retry, query, timeout), normalização de erros
- `services/sales.service.test.ts` — payload/sanitização da venda
- `lib/auth/jwt.test.ts`, `permissions.test.ts` — decode e RBAC

---

## ⚠️ Limitações e Armadilhas Conhecidas

1. **`PATCH /patients/:id` não aceita `cpf`** — o service nunca inclui o campo
2. **Backend não expõe `GET /users` completo** — `professionalId`/`applicatorId` ficam como UUID opcional
3. **Sem paginação** em `GET /appointments` e `GET /sessions` — cuidado com volumes grandes no client
4. **Refresh tokens são opacos** — `exp` pode ausente; cookies usam default 7 dias quando indecodificável
5. **Vendas confirmadas são imutáveis** (`paymentStatus: confirmed` não reabre)
6. **`499` interno** em rotas do BFF quando `request.signal.aborted` (cliente cancelou) — não é status HTTP real
7. **CORS não é necessário** — tudo é same-origin; o backend só é alcançado pelo server

---

## 🔧 Recomendações para Evolução

- **Server Actions:** substituir calls do client por Server Actions onde a UX permite (menos roundtrips,mutação com revalidate)
- **Contrato tipado compartilhado:** gerar `types/` a partir do OpenAPI do NestJS (se disponível) para eliminar drift
- **SWR/cache:** adicionar camada de cache (React Query/SWR) para listas que se repetem entre telas (cidades, áreas, pacotes)
- **Retries:** backoff opcional para 5xx em reads (GET/PATCH idempotente)
- **Observabilidade:** correlação de request IDs nos BFFs (tracing BFF→backend)

---

*Documentação de integração de API — atualizada em 2026-11-01*