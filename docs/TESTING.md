# Testing: CRM NM Laser

## 🧰 Stack de Testes

| Ferramenta | Uso |
|---|---|
| `vitest@5` + `@vitest/ui` | Runner (watch/UI/coverage) |
| `happy-dom` | Ambiente DOM leve |
| `@testing-library/react` + `jest-dom` + `user-event` | Componentes |
| `vite@8` | Base de build do Vitest |

Scripts:
```bash
npm run test           # watch
npm run test:ui        # Vitest UI
npm run test:coverage  # cobertura
```

## 📂 Organização

Co-localização (padrão do repo):
```
src/lib/http/errors.test.ts
src/lib/http/client.test.ts
src/lib/auth/jwt.test.ts
src/lib/auth/permissions.test.ts
src/services/sales.service.test.ts
src/store/slices/session-slice.test.ts
src/hooks/use-permission.test.tsx
src/hooks/use-debounced-value.test.tsx
```

## 🧪 O Que Cobrir (checklist por camada)

### Services
- Payload builders (`toCreatePayload`/`toUpdatePayload`): sanitização (`uppercaseText`, `onlyDigits`, limites), PATCH parcial, dedupe de arrays (`areaIds`)
- Campos proibidos (ex.: `cpf` em PATCH de pacientes deve NÃO apertar)
- Query params (`page`, `limit`, `search`; nulos/strings vazias omitidos)

### HTTP client
- URL building (`API_BASE_PATH`, `api/auth/*` na origem)
- Timeout (20s) → `ApiError 408`; rede → `ApiError 0`
- 204 → `undefined`; JSON/texto por content-type
- Refresifier: 401 em path protegido → `startRefresh` única → retry; 401 no login → mensagem dedicada; `nm:unauthorized` dispatch

### Auth lib
- `decodeAccessToken/decodeRefreshToken` (payload válido, formato inválido, base64url)
- `isAccessTokenFresh`/`isRefreshTokenFresh` (com `exp` presente/ausente)
- `sessions`: encode/decode sessionHint; `getSessionMaxAge` clamp (60s…24h)
- RBAC: `hasPermission` por papel, incluindo `null/undefined`

### Store
- Slices isolados: login ciclo (`idle → authenticating → authenticated/unauthenticated`), abort → `idle`
- `logout` — limpa mesmo com falha de BFF (best-effort)
- Seletores atômicos retornam slices corretos

### Hooks
- `useDebouncedValue` — timing com fake timers
- `usePagination` — páginas, clamps, `resetKey` reseta página
- `usePermission` — true/false por matriz

### Componentes (Testing Library)
- `AppShell`: navegação filtrada por permissão; logout flow
- Formulários: submissão com sucesso/erro (`toast` mock), validação
- `ConfirmDeleteDialog`: abrir/confirmar/cancelar

## 🧹 Convenções

- Mocks de services com `vi.mock("@/services")` (ou módulo específico)
- Sonner: mock `toast` (spy) para asserts de mensagens
- Horários: mínimo uso de datas reais — mockar `Date.now` quando necessário
- `userEvent` para interações (type/click); `waitFor`/`findBy*` para async

---

## 📊 Cobertura Atual e Gaps

Presente: auth lib, HTTP, alguns services (sales), slices de sessão, hooks básicos.

Gaps sugeridos:
- Formulários por feature (pacientes/agendamentos/sessões/vendas)
- AppShell (nav + permissões)
- BFF route handlers (login/refresh/logout/backend proxy) via `node:test` ou Vitest com mocks de `fetch`/cookies
- `lib/whatsapp.ts` (sanitização de telefone/link)

---

*Documentação de testes — atualizada em 2026-11-01*