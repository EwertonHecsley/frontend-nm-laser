# State: CRM NM Laser

## 🧠 Filosofia

O estado é dividido por "dono":

| Dono | Ferramenta | Exemplos |
|---|---|---|
| Roda do app para componentes Cliente | Zustand | auth, sessão UI, filtros |
| Feed do servidor (server constraints) | Server Components + fetch/props | página carrega dados iniciais e passa como props |
| Formulários locais | React Hook Form + Zod | criação/edição de registros |
| Estado efêmero de componentes | React `useState` | toggles, seleção de colunas |

Regra prática: **dados do backend, cuja fonte é o servidor da página com props**; **UX global e permissões via Zustand**.

---

## 🗄️ Store Zustand (`src/store/`)

### Composição

```ts
// store/index.ts
export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createSessionSlice(...args),
  ...createUISlice(...args),
  ...createFiltersSlice(...args),
}));
```

Slices podem ler/escrever em outros via `get()` (padrão padrão do Zustand).

### Slices

#### `AuthSlice`
```ts
status: "idle" | "authenticating" | "authenticated" | "unauthenticated";
error: string | null;
login(input: LoginInput, { signal }?): Promise<AuthUser>;
logout(): Promise<void>;
```
- `login()`: seta status `authenticating` → chama `authService.login` → `setSessionUser` → `authenticated` (ou `unauthenticated` + `error` via `getErrorMessage`)
- Abort → volta para `idle` (não é erro de usuário)
- `logout()`: revoga BFF (best-effort) e limpa sessão em `finally`

#### `SessionSlice`
```ts
user: AuthUser | null;
setSessionUser(user | null): void;
clearSession(): void;
hasRole(role: Role): boolean;
```
- Populada pelo layout `(app)` no servidor (via `setSessionUser`) quando página renderiza; carrega com `getServerSession()`
- `AuthUser { id, name, email, role }` — derivado do JWT **sem verificar assinatura** (frontend confia só para UX)

#### `UISlice`
```ts
mobileNavOpen: boolean;
sidebarCollapsed: boolean;
setMobileNavOpen / toggleMobileNav / toggleSidebar
```
- `sidebarCollapsed` persiste visual do AppShell (largura 64→76px); sem persistência localStorage (não-persistisse no momento)

#### `FiltersSlice`
```ts
selectedCityId: string | null;
appointmentPeriod: { from: string; to: string };
setSelectedCityId / setAppointmentPeriod / resetFilters
```
- Filtros compartilhados entre páginas/agendamentos — sobrevivem a navegações client-side

### Seletores (`store/selectors.ts`)
```ts
export const selectUser = (s: AppStore) => s.user;
export const selectRole = (s: AppStore) => s.user?.role ?? null;
export const selectSidebarCollapsed = (s: AppStore) => s.sidebarCollapsed;
// ...
```
**Sempre** consumir com seletores atômicos para minimizar re-render:
```ts
const collapsed = useAppStore(selectSidebarCollapsed); // ✅
const { user, logout } = useAppStore(); // ❌ re-renderiza em qualquer mudança
```

---

## 🩺 Sessão: Server é a fonte da verdade

1. `src/app/(app)/layout.tsx` (Server) → `getServerSession()` (cookies) → se válido: `setSessionUser(user)` (hidrata o store)
2. Client: `usePermission`/`hasPermission` usam `selectRole` do store
3. O JWT não é verificável no client (sem chave) — papel/usuario é apenas UX; **toda decisão real é do backend**
4. Se o token expira: `http/client.ts` renova via BFF; se falhou, proxy redireciona para login na próxima navegação

`AuthMiddleware` (`lib/auth/middleware.ts`) é um mecanismo **auxiliar/client-side** que escuta `nm:unauthorized` (disparado pelo client HTTP em 401 pós-falha de refresh) e permite que componentes assinem callbacks de renovação. Considere `useAuthMiddleware` como hook legado/bastante compatível — a renovação primária é transparente no `http/client.ts`.

---

## 🔄 Formulários: React Hook Form + Zod

Convenções:
- Schemas locais por formulário (feature), com mensagens pt-BR
- `@hookform/resolvers/zod` para tipagem derivada (`z.infer`)
- `defaultValues` alimentados por dados do server (edição) ou vazios (criação)
- Erros de API entram via `toast.error(getErrorMessage(err))` — não poluem `formState.errors` (exceto conflito de campo específica, quando o payload 400 traz per-campo)

Exemplo de padrão de submit:
```ts
async function onSubmit(values) {
  try {
    await service.create(values);
    toast.success("Registro criado.");
    router.push("/entidade");
    router.refresh(); // revalida RSC
  } catch (e) {
    toast.error(getErrorMessage(e));
  }
}
```

---

## 📡 Dados: use-api-query

`src/hooks/use-api-query.ts` encapsula o ciclo de fetch do lado do cliente:

```ts
const { data, error, isLoading, refetch } = useApiQuery((signal) =>
  sessionsService.overview({ patientId }, { signal })
);
```

Responsabilidades:
- AbortController gerenciado no unmount/rechave
- Erros normalizados (`ApiError`) — `isLoading` separado de `error`
- Sem cache global (fetch em cima de Server Components + router.refresh() revalida)

Casos com uso típico:
- Listagens admin com busca debounced (patients)
- Overviews agregados (sessions)
- Carregamento sob demanda (informações de edição)

---

## 🎛️ UI state no AppShell

- `sidebarCollapsed` (desktop, lg+) — largura animada 200ms; tooltips quando colapsado
- `mobileNavOpen` — controla `Sheet` (mobile <lg)
- `getPageTitle(pathname)` — derivado de path, não do estado (header mostra contexto)

---

## 🧪 Testes de Estado

- `store/slices/session-slice.test.ts` — sessão/hydration
- `hooks/use-permission.test.tsx` — matriz RBAC por papel
- Store em geral: testar slices isolados com `create()`

---

## 🧭 Regras para Extensões de Estado

1. **Server-first:** só mova para o store o que precisa sobreviver a navegação client ou ser lido em vários lugares
2. **Persistência:** se um slice precisar sobreviver a reload, considere `zustand/persist` (examplar: `sidebarCollapsed`), com `name` único
3. **Nada de dados derivados no store** (ex.: contagens) — derive com seletores/memo
4. **Never store tokens em JS** — cookies HttpOnly são a fonte; o store guarda apenas `AuthUser` derivado
5. **Cross-slice actions:** dentro do slice use `set`/`get` completos (`get().clearSession()`)


---

*Documentação de gerenciamento de estado — atualizada em 2026-11-01*