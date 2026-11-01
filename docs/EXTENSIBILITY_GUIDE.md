# Guide of Extensibility: CRM NM Laser

Este guia explica **como estender o projeto** de forma idiomática: adicionar um módulo CRUD completo, novas rotas, permissões, componentes de UI e integrações, mantendo os padrões estabelecidos.

---

## ✅ Checklist Para um Novo Módulo (ex.: "produtos")

1. **Tipos** — criar `src/types/<entidade>.ts` e exportar em `src/types/index.ts`
2. **Permissões** — adicionar em `src/lib/auth/permissions.ts` (ex.: `products:read`, `products:write`) e definir a matriz por papel
3. **Service** — criar `src/services/<entidade>.service.ts` com sanitização em `toCreatePayload`/`toUpdatePayload`; exportar em `services/index.ts`
4. **BFF allowlist** — incluir o recurso no `/api/backend/[...path]/route.ts` (recursos/rbac/métodos)
5. **Rotas** — adicionar páginas em `src/app/(app)/<entidade>/` (lista, `new`, `[id]/edit`) replicando o guard server-side
6. **RBAC do proxy** — adicionar regras em `src/lib/auth/route-access.ts` (ex.: `{ pattern: /^\/products\/new\/?$/, roles: ["gestora"] }`)
7. **Feature components** — `src/features/<entidade>/components/<entidade>-view.tsx` + formulários
8. **Navegação** — item em `NAV_ITEMS` (`components/layout/app-shell.tsx`) com `permission` opcional
9. **Título de página** — mapear pathname em `getPageTitle()` no AppShell
10. **Testes** — Vitest para o service e componentes críticos
11. **`npm run check`** — typecheck + lint + build

---

## 🧱 1. Tipos (`src/types/`)

```ts
// src/types/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  areaIds: string[];
}

export type CreateProductInput = {
  name: string;
  price: number;
  areaIds?: string[];
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type ProductListParams = { search?: string; page?: number; limit?: number };
```

```ts
// src/types/index.ts — adicionar
export * from "./product";
```

Conveções:
- Inputs de criação separados de update (PATCH parcial via `Partial<>`)
- Params de listagem em `<Entidade>ListParams`
- **Sugestão:** gerar a partir do OpenAPI/DTOs do backend quando possível (elimina drift)

---

## 🔐 2. Permissões (`src/lib/auth/permissions.ts`)

```ts
export type Permission =
  // ... existentes
  | "products:read"
  | "products:write";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  gestora:  [..., "products:read", "products:write"],
  vendas:   [..., "products:read"],
  aplicadora: [...], // nada
};
```

Lembre: a autoridade real é o backend — a matriz aqui só esconde UI e protege rotas no proxy/BFF.

---

## 📡 3. Service (`src/services/`)

```ts
import { http } from "@/lib/http/client";
import { sanitizeSingleLine, uppercaseText } from "@/lib/security/sanitize";
import type {
  CreateProductInput, PaginatedResponse, Product, ProductListParams, UpdateProductInput,
} from "@/types";

function toCreatePayload(input: CreateProductInput) {
  return {
    name: sanitizeSingleLine(uppercaseText(input.name), 140),
    price: input.price,
    ...(input.areaIds?.length ? { areaIds: [...new Set(input.areaIds)] } : {}),
  };
}

export const productsService = {
  list(params: ProductListParams = {}, options?: { signal?: AbortSignal }) {
    return http.get<PaginatedResponse<Product>>("products", {
      query: { page: params.page ?? 1, limit: params.limit ?? 20, search: params.search },
      signal: options?.signal,
    });
  },
  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<Product>(`products/${encodeURIComponent(id)}`, { signal: options?.signal });
  },
  create(input: CreateProductInput) {
    return http.post<Product>("products", toCreatePayload(input));
  },
  update(id: string, input: UpdateProductInput) {
    const { name, price, areaIds } = input;
    return http.patch<Product>(`products/${encodeURIComponent(id)}`, {
      ...(name !== undefined ? { name: sanitizeSingleLine(uppercaseText(name), 140) } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(areaIds !== undefined ? { areaIds: [...new Set(areaIds)] } : {}),
    });
  },
  remove(id: string) {
    return http.delete(`products/${encodeURIComponent(id)}`);
  },
};
```

```ts
// src/services/index.ts — adicionar
export * from "./products.service";
```

### Regras de ouro dos services
- **Sanitize no ponto de escrita** (`sanitizeSingleLine`, `uppercaseText`, `onlyDigits`)
- `encodeURIComponent` em todos os IDs de path
- Query: `undefined/null/""` são omitidos automaticamente pelo client
- `signal` sempre repassado (cancelamentos em listagens)
- PATCH: objeto parcial — só campos definidos

---

## 🛂 4. BFF Allowlist (`src/app/api/backend/[...path]/route.ts`)

Adicionar `products` ao conjunto conhecido + tabela recurso→(método, permissão):

```ts
products: {
  GET:    "products:read",
  POST:   "products:write",
  PATCH:  "products:write",
  DELETE: "products:write",
}
```

Sem essa entrada o proxy responde `405`. Método não listado → negado por padrão.

---

## 🛣️ 5. Rotas e RBAC de Páginas

```ts
// src/lib/auth/route-access.ts — adicionar
{ pattern: /^\/products\/?$/,            roles: ["gestora", "vendas", "aplicadora"] },
{ pattern: /^\/products\/new\/?$/,       roles: ["gestora"] },
{ pattern: /^\/products\/[^/]+\/edit\/?$/, roles: ["gestora"] },
```

```tsx
// src/app/(app)/products/page.tsx
import { redirect } from "next/navigation";
import { ProductsView } from "@/features/products/components/products-view";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session";

export const metadata = { title: "Produtos" };

export default async function ProductsPage() {
  const user = await getServerSession();
  if (!user) redirect(LOGIN_PATH);
  if (!hasPermission(user.role, "products:read")) redirect(FORBIDDEN_PATH);

  return (
    <ProductsView
      canWrite={hasPermission(user.role, "products:write")}
      role={user.role}
    />
  );
}
```

Repita o padrão para `new` (guard em `products:write`) e `[id]/edit` (carrega registro no servidor e passa `initialData`).

---

## 🧩 6. Feature Components (`src/features/`)

```tsx
// src/features/products/components/products-view.tsx
"use client";

import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePagination } from "@/hooks/use-pagination";
import { useApiQuery } from "@/hooks/use-api-query";
import { productsService } from "@/services";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/http/errors";
```

Padrões a seguir (copiar de um módulo existente, ex.: `features/patients`):
- Busca com `useDebouncedValue(search, 350)`
- Dados com `useApiQuery` (abort, loading, error normalizado via `ApiError`)
- Paginação com `usePagination(items, { pageSize, resetKey: debouncedSearch })`
- Mutação: `try/catch` + `toast.error(getErrorMessage(e))` / `toast.success(...)`
- Exclusão com `<ConfirmDeleteDialog>` (dialog de confirmação)
- Permissões recebidas por props do server (`canWrite`) — não as recompute no client da página; dentro do componente cliente `usePermission` também é aceitável
- Empty state amigável + `<Skeleton>` enquanto carrega

### Formulário (React Hook Form + Zod)

```tsx
const schema = z.object({
  name: z.string().min(2, "Informe o nome").max(140),
  price: z.coerce.number().positive("Preço inválido"),
  areaIds: z.array(z.string().uuid()).optional(),
});

const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), ... });

async function onSubmit(values: z.infer<typeof schema>) {
  try {
    await productsService.create(values);
    toast.success("Produto criado.");
    router.push("/products"); router.refresh();
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
}
```

---

## 🧭 7. Navegação (AppShell)

```tsx
// components/layout/app-shell.tsx
const NAV_ITEMS = [
  // ...,
  { label: "Produtos", href: "/products", icon: Package },
];
// com permissão:
{ label: "Produtos", href: "/products", icon: Package, permission: "products:read" }
```

E no `getPageTitle(pathname)` adicione os casos `produtos/new`, regex de edit e fallback `startsWith("/products")`.

---

## ⚙️ 8. Infra Adicional

### Novo campo no store (Zustand)
```ts
// store/types.ts
export interface FiltersSlice {
  // ...
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
}
// store/slices/filters-slice.ts — implementar e incluir em resetFilters()
// selectors — adicionar selectProductId
```

Use seletores atômicos (`useAppStore(selectProductId)`) sempre.

### Novo hook
```ts
// hooks/use-<nome>.ts — "use client"; teste co-localizado use-<nome>.test.tsx
export function useXyz() { /* ... */ }
export { useXyz } from "./use-xyz"; // em hooks/index.ts se conveniente
```

### Novo componente UI (shadcn)
```bash
npx shadcn@latest add <componente>
```
Componentes ficam em `src/components/ui/*` sobre `radix-ui` + CVA + `cn()`.

### Nova variável de ambiente
1. Server-only: adicione em `lib/server/env.ts` (nunca `NEXT_PUBLIC_*`)
2. Pública: `NEXT_PUBLIC_*` em `.env.example`, consuma via `lib/config/*`
3. Documente no README (tabela de envs)

---

## 🖥️ UI/UX Guidelines do Projeto

- **Tema:** teal da marca `#155e63` (primary/brand); tokens em `globals.css` (`--brand`, `--primary`, `sidebar-*`)
- **Layout:** conteúdo centralizado `max-w-6xl`, paddings `px-4 md:px-8`
- **Tabela:** `<Table>` + cabeçalho sticky opcional; ações na última coluna
- **Diálogos:** confirmação sempre via `ConfirmDeleteDialog`; nunca `window.confirm`
- **Toasts:** sempre `sonner` com mensagens do `getErrorMessage` (pt-BR, nunca status cru)
- **A11y:** `aria-current="page"` em nav ativa, labels `aria-label` em botões de ícone, `sr-only` em títulos de Sheet, foco visível (`ring`) — atenção ao criar novos componentes
- **Responsividade:** sidebar desktop + Sheet mobile; grid `sm:grid-cols-2 xl:grid-cols-4` para cards
- **Datas/moeda:** sempre `lib/format/date.ts` e `lib/format/currency.ts` (pt-BR/BRL)

---

## 🧪 Testes

```ts
// services/products.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
// mock do http e validar toCreatePayload (sanitize/uppercase)

// hooks/use-xyz.test.tsx — renderHook + happy-dom
// components — Testing Library: render/query/interact
```

Comando: `npm run test` (watch), `npm run test:coverage`.

---

## 🚀 Ideias de Evolução (Roadmap sugerido para IA)

### Curto prazo
1. **Ordenação e filtros avançados nas listas** (pacientes por cidade; sessões por status/período persistidos no `FiltersSlice`)
2. **Export CSV/Excel** de pacientes, agendamentos e vendas (client-side com dados já carregados)
3. **Paginação server-side em agendamentos/sessões** (requer evolução do contrato backend)
4. **Command palette (⌘K)** já instalado (`cmdk`) — expor navegação e ações rápidas ("novo paciente", "nova venda")

### Médio prazo
5. **Relatórios e gráficos** — dashboards de faturamento (receita por período/consultante) com `reports.service.ts` como base; sugerir Recharts
6. **Calendário de agendamentos** (week/month view) com reagendamento drag-and-drop
7. **Notificações internas** — lembretes de agendamento do dia para aplicadoras
8. **Assinatura em PDF** — emitir comprovante de sessão assinado (signature_pad already integrates)

### Estruturais
9. **OpenAPI codegen** para `src/types` (fim do drift de contrato)
10. **React Query/SWR** para cache entre telas de catálogo (cidades/áreas/pacotes)
11. **PWA/offline-first para sessões** — registro local com sync quando voltar a rede (atualmente proibido pelo contrato; exige backend)
12. **Audit trail visual** — histórico de alterações por registro (exige backend)

### UI/UX
13. **Modo claro/escuro com persistência** via `next-themes` (provider já presente)
14. **Mobile-first refinado** para registro de sessões em tablets do consultório (assinatura full-screen)
15. **Skeletons e empty states padronizados** — extrair `<ListState>` reutilizável

---

## 📏 Convenções de Código do Repositório

- TypeScript **strict**; `paths` `@/*` → `src/*`
- Nomes: `use-*` (hooks), `*-service` (services), `*-slice` (store), `<domain>-view.tsx` (features)
- Imports tipados via barrel (`@/types`, `@/services`)
- Não usar `any`; payloads construídos com spreads condicionais para PATCH parciais
- Comentários de negócio (contratos do backend) valiosa — ex.: "backend rejeita `cpf` no PATCH"
- `npm run check` antes de qualquer PR (typecheck + lint + build)

---

*Guia de extensibilidade — atualizado em 2026-11-01*