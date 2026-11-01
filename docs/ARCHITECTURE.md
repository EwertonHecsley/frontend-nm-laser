# Architecture: CRM NM Laser Frontend

## 🏗️ Visão Arquitetural

O frontend do CRM NM Laser adota uma arquitetura em camadas com foco em segurança, tipagem forte e DX (Developer Experience). A premissa central é que o **navegador nunca conversa diretamente com o backend NestJS** — toda a comunicação passa por um BFF (Backend for Frontend) same-origin do próprio Next.js.

### Princípios Arquiteturais

1. **Zero exposição de backend:** `BACKEND_API_URL` só existe do lado do servidor; o JS do navegador vê apenas `/api/backend/*`
2. **Token nunca tocado por JS:** Access e refresh tokens vivem em cookies `HttpOnly`
3. **Autorização em camadas (defense in depth):** Proxy (middleware) → Server Components → Componentes de UI → BFF → Backend (autoridade final)
4. **Server Components First:** Dados iniciais são buscados no servidor sempre que possível
5. **Feature-first:** Componentes de domínio agrupados em `src/features/*`, infra genérica em `src/components/*`
6. **Fail-safe:** Erros de renovação/venda nunca bloqueiam o logout local; Assinatura é opaca (não alterada pelo frontend)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (SPA-like)                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ RSC HTML   │  │ Client     │  │ Zustand      │  │ http client │  │
│  │ (layouts)  │  │ Components │  │ Store        │  │ (fetch+)    │  │
│  └────────────┘  └────────────┘  └──────────────┘  └──────┬──────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                    same-origin fetch (credentials: same-origin)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (Node runtime)                     │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ proxy.ts       │  │ Route Handlers   │  │ Server Components    │  │
│  │ (middleware)   │  │ /api/auth/*      │  │ (getServerSession)   │  │
│  │ RBAC + session │  │ /api/backend/*   │  │                      │  │
│  └────────────────┘  │ (allowlist+RBAC) │  │                      │  │
│                      └───────┬──────────┘  └──────────────────────┘  │
│                              │ backendFetch (server-only)            │
└──────────────────────────────┼───────────────────────────────────────┘
                               ▼
                    ┌────────────────────┐
                    │  NestJS Backend    │
                    │  localhost:3030    │
                    │  JWT authority     │
                    └────────────────────┘
```

---

## 📁 Estrutura de Diretórios

```
src/
├── proxy.ts                    # Middleware (RBAC + sessão + redirect)
├── app/
│   ├── layout.tsx              # Root layout (Inter, metadata, providers)
│   ├── globals.css             # Tailwind 4 + tokens de tema (brand teal #155e63)
│   ├── (auth)/
│   │   └── login/page.tsx      # Tela pública de login
│   ├── (app)/                  # Route group autenticado
│   │   ├── layout.tsx          # App shell guard + refetch de sessão
│   │   ├── error.tsx           # Error boundary do grupo
│   │   ├── loading.tsx         # Suspense fallback
│   │   ├── not-found.tsx
│   │   ├── page.tsx            # Dashboard (ManagerDashboard p/ gestora)
│   │   ├── forbidden/          # 403 da aplicação
│   │   ├── cities/  (+new, [id]/edit)
│   │   ├── patients/ (+new, [id]/edit, [id]/history)
│   │   ├── appointments/ (+new, [id]/edit)
│   │   ├── sessions/ (+new, [id])
│   │   ├── sales/ (+new, [id]/edit)
│   │   ├── areas/ (+new, [id]/edit)
│   │   ├── packages/ (+new, [id]/edit)
│   │   ├── users/ (+new, [id]/edit)
│   │   └── settings/           # Troca de senha
│   └── api/                    # Route Handlers (Node runtime)
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   ├── refresh/route.ts
│       │   └── change-password/route.ts
│       └── backend/
│           └── [...path]/route.ts   # BFF allowlist proxy
├── components/
│   ├── ui/                     # 27 componentes shadcn/ui
│   ├── layout/
│   │   ├── app-shell.tsx       # Sidebar + header + user menu
│   │   └── page-header.tsx
│   └── providers/app-providers.tsx
├── features/                   # Componentes por domínio
│   ├── dashboard/
│   ├── cities/
│   ├── patients/
│   ├── appointments/
│   ├── sessions/
│   ├── sales/
│   ├── areas/
│   ├── packages/
│   ├── users/
│   └── settings/
├── hooks/
│   ├── use-api-query.ts        # Fetch de dados com abort + erro normalizado
│   ├── use-debounced-value.ts  # Debounce de busca (350ms)
│   ├── use-pagination.ts       # Paginação client-side com resetKey
│   ├── use-permission.ts       # hasPermission(role, permission)
│   └── index.ts
├── lib/
│   ├── auth/
│   │   ├── constants.ts        # Nomes de cookies, paths
│   │   ├── cookies.ts          # set/clear session cookies (server)
│   │   ├── jwt.ts              # decode puro (sem verificação HMAC)
│   │   ├── permissions.ts      # ROLE_PERMISSIONS + hasPermission
│   │   ├── route-access.ts     # Regras de RBAC por rota (proxy)
│   │   ├── role-labels.ts      # Labels pt-BR dos papéis
│   │   ├── session.ts          # getServerSession() (RSC)
│   │   └── middleware.ts       # AuthMiddleware (client fallback/legado)
│   ├── config/api.ts           # API_BASE_PATH (NEXT_PUBLIC_API_BASE_PATH)
│   ├── format/
│   │   ├── currency.ts         # Formatação BRL
│   │   └── date.ts             # datas pt-BR (date-fns)
│   ├── http/
│   │   ├── client.ts           # fetch wrapper + refresh interceptor
│   │   └── errors.ts           # ApiError, normalizeApiError, mensagens
│   ├── navigation/safe-redirect.ts  # next=safe (só paths relativos)
│   ├── security/sanitize.ts    # sanitizeText/Email/onlyDigits/…
│   ├── server/
│   │   ├── backend.ts          # backendFetch (BACKEND_API_URL)
│   │   ├── env.ts              # env server-only
│   │   └── http.ts             # jsonError, isSameOriginRequest
│   ├── utils.ts                # cn() (clsx + tailwind-merge)
│   └── whatsapp.ts             # link wa.me com sanitização
├── services/                   # Clientes tipados por entidade
│   ├── auth.service.ts
│   ├── cities.service.ts
│   ├── patients.service.ts
│   ├── appointments.service.ts
│   ├── sessions.service.ts
│   ├── areas.service.ts
│   ├── packages.service.ts
│   ├── sales.service.ts        # + sales.service.test.ts
│   ├── users.service.ts
│   ├── reports.service.ts
│   └── index.ts                # barrel
├── store/
│   ├── index.ts                # useAppStore (composição de slices)
│   ├── types.ts                # AuthSlice, SessionSlice, UISlice, FiltersSlice
│   ├── selectors.ts            # selectUser, selectRole, … (seletores atômicos)
│   └── slices/
│       ├── auth-slice.ts       # login/logout/status/error
│       ├── session-slice.ts    # user, setSessionUser, clearSession, hasRole
│       ├── ui-slice.ts         # mobileNavOpen, sidebarCollapsed
│       └── filters-slice.ts    # selectedCityId, appointmentPeriod
└── types/                      # Contratos de domínio (barrel em index.ts)
    ├── auth.ts  common.ts  user.ts
    ├── city.ts  area.ts  package.ts
    ├── patient.ts  session.ts
    ├── appointment.ts  sale.ts
```

---

## ⚙️ Camadas em Detalhe

### 1. Camada de Proxy (`src/proxy.ts`)

Middleware do Next.js (matcher exclui `/api`, `_next/static`, `_next/image`, `favicon.ico`, arquivos com extensão). Responsabilidades:

1. **Kelley de login:** Se já autenticado com access token fresco, redireciona `/login` → `/`
2. **Detecção de sessão expirada com refresh pendente:** Se o access token venceu mas o cookie `nm_refresh` existe, **mantém a navegação**, remove os cookies de sessão vencidos e preserva `nm_refresh`. O interceptor do client HTTP chamará `/api/auth/refresh` na primeira chamada de API
3. **Sem refresh → logout forçado:** redirect `LOGIN_PATH?next=<path>` e limpeza de todos os cookies
4. **RBAC por rota:** `getAllowedRoles(pathname)` consulta `route-access.ts`; se o papel não estiver na lista, redirect para `/forbidden`

Importante: o proxy **não** valida a assinatura do JWT (decodifica apenas payload em `lib/auth/jwt.ts`); a verificação real é sempre do backend. O middleware existe para **experiência de navegação**.

### 2. Camada de Rotas (App Router)

**Route groups:**
- `(auth)` — rotas públicas (login). Layout mínimo, sem shell
- `(app)` — rotas autenticadas. Layout busca a sessão com `getServerSession()` e, quando válida, hidrata a sessão (`setSessionUser`) e renderiza `<AppShell user={user}>`

**Páginas de servidor replicam o guard:**

```ts
// Exemplo: src/app/(app)/sales/page.tsx
export default async function SalesPage({ searchParams }) {
  const user = await getServerSession();
  if (!user) redirect(LOGIN_PATH);
  if (!hasPermission(user.role, "sales:read")) redirect(FORBIDDEN_PATH);

  const params = await searchParams;
  const initialPatientId = /* sanitizado, truncado a 128 char */;
  return <SalesView initialPatientId={initialPatientId} canWrite={…} role={…} userId={…} />;
}
```

Componentes de feature recebem **permissões pré-computadas** (`canWrite`, `role`, `userId`) como props — evita divergência entre server e client state.

**Dashboard condicional:** `src/app/(app)/page.tsx` renderiza `<ManagerDashboard />` para gestora e um painel operacional diferente para vendas/aplicadora.

### 3. Camada de Providers

`AppProviders` (`components/providers/app-providers.tsx`) envolve a aplicação com:
- `Toaster` (sonner) para notificações
- `next-themes` provider (dark mode com attribute class)
- Tooltip provider (necessário por Radix)

### 4. Camada de UI (components)

- **`components/ui/*`** — 27 primitivas shadcn (button, card, dialog, sheet, select, command, table, pagination, confirm-delete-dialog, skeleton, sidebar, etc.), construídas sobre `radix-ui` e estilizadas com Tailwind + CVA (`class-variance-authority`)
- **`components/layout/app-shell.tsx`** — Shell do app:
  - Sidebar desktop colapsável (`sidebarCollapsed` no store, largura alterna 64→76px com tooltips)
  - Mobile: Sheet lateral (`mobileNavOpen` no store)
  - Navegação por `NAV_ITEMS` **filtrada por permissão** do papel (Vendas/Equipe só aparecem com permissão)
  - Títulos de página derivados do pathname via `getPageTitle()`
  - Menu de usuário: avatar com iniciais derivadas do e-mail, role badge, link para `/settings`, logout
  - Logout: `logout()` do store → `router.replace("/login")` + `router.refresh()`

### 5. Camada de Features

Cada domínio tem seus componentes de UI, formulários e tabelas em `src/features/<domínio>/components/*-view.tsx` (ex.: `SalesView`, `ManagerDashboard`). Páginas em `app/` são enxutas: guard + fetch inicial + composição.

### 6. Camada de Hooks

| Hook | Responsabilidade |
|---|---|
| `use-api-query.ts` | Fetch declarativo com `AbortController`, estado `loading/data/error`, erros normalizados via `helpers` |
| `use-debounced-value.ts` | Debounce genérico (default 350ms) para campos de busca |
| `use-pagination.ts` | Paginação client-side com `pageSize` e `resetKey` (resets ao trocar filtro/busca) |
| `use-permission.ts` | Lê `role` do store e delega a `hasPermission()`; conveniência de UI |

### 7. Camada de Services

Clientes tipados + sanitização no ponto de escrita. Cada service:
- Usa `http.*` (`get/post/patch/delete`) com paths relativos
- Normaliza/sanitiza payload (ex.: `uppercaseText`, `onlyDigits`, limite de chars)
- Usa `encodeURIComponent` nos IDs
- Aceita `{ signal?: AbortSignal }` para cancelamento

Exemplo (patients): create envia `fullName` uppercase + troca de whitespace + sanitize; update **nunca envia cpf** (backend rejeita).

### 8. Camada de Store (Zustand)

Store única `useAppStore` composta de 4 slices (padrão slicing do Zustand):

| Slice | Campos | Ações |
|---|---|---|
| `AuthSlice` | `status: idle|authenticating|authenticated|unauthenticated`, `error` | `login(input)`, `logout()` |
| `SessionSlice` | `user: AuthUser \| null` | `setSessionUser()`, `clearSession()`, `hasRole(role)` |
| `UISlice` | `mobileNavOpen`, `sidebarCollapsed` | `setMobileNavOpen()`, `toggleMobileNav()`, `toggleSidebar()` |
| `FiltersSlice` | `selectedCityId`, `appointmentPeriod {from,to}` | `setSelectedCityId()`, `setAppointmentPeriod()`, `resetFilters()` |

Para leituras, **sempre** use seletores em `store/selectors.ts` (ex.: `useAppStore(selectUser)`) — evita re-renders globais.

### 9. Camada de HTTP (`lib/http`)

**`client.ts`** — wrapper de fetch:
- Base: `API_BASE_PATH` (`/api/backend`); paths `api/auth/*` usam a própria origem
- `same-origin`, `cache: no-store`, default `timeoutMs = 20_000` com `AbortSignal.timeout` + combinação `AbortSignal.any`
- Query builder que **ignora** `undefined/null/""` e suporta arrays (multi-values)
- Em erro de rede: `ApiError` com status 0 (offline) ou 408 (timeout)
- Resposta 204 → `undefined`; JSON ou texto conforme `content-type`

**Interceptor de renovação (`401`):**
1. Se 401 e não for path de auth (`/api/auth/login|refresh|logout`) e não estiver abortado e estiver em `window`:
2. Dispara uma **única** `startRefresh()` (promise compartilhada `refreshInFlight` evita loop/storm)
3. `POST /api/auth/refresh` (cookie only)
4. Sucesso → reexecuta a requisição original; falha → despreza e o evento já foi propagado (ver abaixo)

**Handle 401 em requests de login:** mensagem "E-mail ou senha inválidos."
**Handle 401 em outros requests:** `window.dispatchEvent(new Event("nm:unauthorized"))` — usado por listeners para reações de UI (ex.: redirecionar ao login via AuthMiddleware legado em `lib/auth/middleware.ts`).

**`errors.ts`** — `ApiError(status, body)` + mapa de mensagens pt-BR por status (400/401/403/404/408/409/429/500/502/503). `normalizeApiError` extrai `message` do corpo (string, array ou objeto aninhado), filtrando "Internal server error"; para 401/403/5xx preserva a mensagem genérica do frontend (não vaza detalhes do servidor).

### 10. Camada de Autenticação (`lib/auth`)

**Cookies (nomes definitivos):**
| Cookie | Conteúdo | Persistência |
|---|---|---|
| `nm_session` | Access token JWT | HttpOnly, Secure (prod), SameSite=Lax, priority high, maxAge = `min(exp-now, 24h)` |
| `nm_session_hint` | base64url({email}) | Idem — **não é HttpOnly obrigatório**, é hint de exibição |
| `nm_refresh` | Refresh token opaco | HttpOnly, SameSite=Lax, maxAge até 7 dias (se decodificável e `exp` presente) |

**`jwt.ts`:** decode base64url sem verificação; payload esperado `{ sub, role, name?, iat?, exp? }`; `isAccessTokenFresh`/`isRefreshTokenFresh` comparam `exp`.

**`session.ts`:** `getServerSession()` (server-only) lê `nm_session` + `nm_session_hint` → `AuthUser { id, name, role, email }`.

**`permissions.ts`:** 18 permissions + matriz RBAC; `hasPermission(role, perm)`.

**`route-access.ts`:** regras de rotas (regex) usadas pelo proxy (ex.: `/users(/.*)?` → só gestora; `/sessions/new` → gestora|aplicadora; `/patients/new` → gestora|vendas).

**`middleware.ts` (legado/fallback):** Classe client-side `AuthMiddleware` + hook `useAuthMiddleware()`. Escuta eventos `nm:unauthorized`/`nm:auth-refresh`, permite subscrever um callback de refresh (`subscribeToRefresh`) — auxiliar para reações de UI fora do fluxo do interceptor. Integração fraca com localStorage (`nm_refresh_token`) como fallback histórico; o fluxo primário de renovação hoje é o do `http/client.ts` via cookie.

### 11. Camada de Route Handlers (BFF)

Todos os BFFs exigem **same-origin** (`isSameOriginRequest`), **JSON content-type** e **payload até 16KB**; usam `jsonError(status, msg)` com `Cache-Control: no-store`.

| Rota | Papel |
|---|---|
| `POST /api/auth/login` | Valida Zod (email≤254, senha 6-200), sanitizeEmail, chama `backendFetch("/auth/login")`, valida `accessToken`/`refreshToken`, grava cookies, retorna `{ user }` |
| `POST /api/auth/refresh` | Lê cookie `nm_refresh` → `backendFetch("/auth/refresh")` → rotaciona cookies → 204 |
| `POST /api/auth/logout` | Revoga no backend (best-effort) → limpa cookies → 204 |
| `POST /api/auth/change-password` | Requer sessão fresca; valida Zod (senha nova ≥8); chama backend; backend revoga todos os refresh tokens → limpa sessão local e pede relogin |
| `ANY /api/backend/[...path]` | Proxy allowlist: só recursos conhecidos (`cities`, `patients`, `appointments`, `sessions`, `areas`, `packages`, `sales`, `users`), valida método (405 para não mapeados) e RBAC antes de encaminhar via `backendFetch` |

`lib/server/backend.ts` monta as chamadas ao NestJS usando `BACKEND_API_URL` (server-only) e injeta `Authorization: Bearer` quando aplicável.

`lib/server/http.ts` fornece `jsonError()` e verificação de origem (defesas CSRF: SameSite=Lax + checagem same-origin + rotas mutantes sempre POST/PATCH/DELETE a partir do app).

---

## 🔄 Fluxos Críticos

### Fluxo de Login (end-to-end)
```
1. Usuário preenche /login → form React Hook Form + Zod
2. useAppStore.login() → authService.login() → http.post("api/auth/login")
3. BFF valida (same-origin, Zod, sanitiza email) → backendFetch("/auth/login")
4. Backend: valida credenciais, retorna { accessToken, refreshToken, user? }
5. BFF: valida tokens (tamanho, exp decodável) → setSessionCookies()
6. BFF responde { user: { id, name, email, role } } (sem tokens no body!)
7. Client: setSessionUser(user) → status: "authenticated"
8. Navega para next (safe-redirect) ou "/"
```

### Fluxo de Navegação autenticada (Server)
```
1. Request (page) → proxy.ts avalia: sessão fresca? refresh cookie?
2. RBAC por rota em route-access.ts → /forbidden se sem papel
3. Layout (app): getServerSession() → hidrata store (setSessionUser)
4. Página: revalida permissões com hasPermission(), monta component de feature com permissões em props
```

### Fluxo de Renovação Silenciosa (Client)
```
1. Requisição recebe 401 → interceptor em http/client.ts
2. POST /api/auth/refresh (cookie nm_refresh) → BFF → Backend NestJS
3. Backend gira { accessToken, refreshToken } → BFF atualiza os 3 cookies
4. Interceptor reenvia a requisição original com credencial renovada
5. Se refresh falha → cookie vencido → próximo page load: proxy força /login
```

### Fluxo de Logout
```
1. AppShell → useAppStore.logout() → authService.logout()
2. POST /api/auth/logout → BFF revoga refresh no backend (best-effort)
3. Limpa os 3 cookies → resposta 204
4. store: clearSession() → status unauthenticated
5. router.replace("/login") + router.refresh()
```

---

## 🧩 Padrões de Código

- **Barrels:** `types/index.ts`, `services/index.ts` unificação import
- **cn()** de `cn@0.5.0` (wrapper clsx+tailwind-merge) para classes
- **CVA** para variantes de botões/badges (button tem `xs/icon-sm/lg` extras)
- **`fetch` sempre via `lib/http/client.ts`** no browser; nunca `window.alert` — sempre `sonner` toasts
- **IDs sempre `encodeURIComponent`** nos paths; inputs sanitizados em `lib/security/sanitize.ts`
- **Testes co-localizados** (`*.test.ts(x)`) com Vitest + Happy DOM; Testing Library para componentes

---

## 🚧 Decisões Pendentes / Conhecidas

1. **Não há paginação server-side** em `GET /appointments` e `GET /sessions` (contrato backend) — potencial gargalo visível conforme volume cresce
2. **`professionalId`/`applicatorId` são UUID livres** (não lista de usuários) porque o backend não expõe listagem; quando existir, trocar por `<Select>` tipado
3. **Pagamentos parcelados não implementados** — status é controlado na venda (`open` → `confirmed`)
4. **Sem modo offline** — sistema totalmente web
5. **Multi-tenancy/branding não configurável** — tema fixo teal (#155e63)

---

## 📚 Referência Rápida de Import

```ts
// State
import { useAppStore, selectUser, selectRole } from "@/store";

// HTTP & services
import { http } from "@/lib/http/client";         // raro; use services
import { patientsService, sessionsService } from "@/services";

// Permissões
import { hasPermission } from "@/lib/auth/permissions";
import { usePermission } from "@/hooks";

// Sessão (server)
import { getServerSession } from "@/lib/auth/session";

// Sanitização
import { sanitizeEmail, onlyDigits, sanitizeSingleLine } from "@/lib/security/sanitize";

// UI
import { Button } from "@/components/ui/button";
import { card, Dialog, Sheet, Select, Table } from "@/components/ui/*";
```

---

*Documentação da arquitetura do CRM NM Laser — atualizada em 2026-11-01*