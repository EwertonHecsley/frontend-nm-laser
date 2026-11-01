# Performance: CRM NM Laser

## 🎯 Estratégia Geral

1. **Server Components por padrão** — dados iniciais buscados no RSC; client components apenas onde há interatividade (forms, filtros, shell)
2. **Client JS mínimo** — páginas passam props pré-computadas (`canWrite`, `initialPatientId`, `user`) para views client
3. **Abort-first fetching** — todo fetch client usa `AbortSignal` (unmount/troca de filtro cancelam requests)
4. **Seletores atômicos Zustand** — evita re-render global
5. **Debounce nas buscas** — 350ms default

---

## 🚄 Server-first Patterns

- `src/app/(app)/page.tsx` — dashboard com painéis informativos sem JS essencial
- Páginas `sales/page.tsx` etc. — `getServerSession()` + `hasPermission()` no servidor; view recebe permissões prontas
- `layout.tsx` hidrata sessão (`setSessionUser`) uma vez por navegação server

Sugestões de aprofundamento:
- `loading.tsx` já presente no grupo `(app)` (Suspense stream)
- Prefetch: Next App Router prefetches `<Link>`s automaticamente no viewport

---

## 🧰 Otimizações Implementadas

| Otimização | Local |
|---|---|
| Turbopack dev + Tailwind 4 plugin | `next.config.ts` (`turbopack.rules`) |
| Fonte com `display: swap` (Inter) | `app/layout.tsx` |
| CSP com `upgrade-insecure-requests` em prod | `next.config.ts` |
| Memoização de slice de paginação | `usePagination` (`useMemo` em `pageItems`) |
| Refresh em voo compartilhado (anti-storm) | `lib/http/client.ts` (`refreshInFlight`) |
| Timeout default 20s com `AbortSignal.timeout/any` | `lib/http/client.ts` |
| Skeleton loaders (`components/ui/skeleton`) | listas/cards |
| `viewport` theme/meta declarativa | `layout.tsx` |

---

## 🧪 React 19 / Next 16 Notes

- `react@19.3.0` — Server Components, `use()` hooks
- Next 16 App Router + Turbopack — atenção às aletrações da versão (AGENTS.md aponta docs em `node_modules/next/dist/docs/`)
- `searchParams` em páginas server é Promise (await antes de usar) — já seguido no código

---

## 📉 Riscos de Performance Conhecidos

1. **`GET /appointments` e `GET /sessions` sem paginação** — listas extensas transferem payloads grandes; mitigar com overview endpoint (`sessions/overview`) e filtros no servidor
2. **Busca client-side redundante** em alguns catálogos — mover para query server quando volume crescer
3. **Assinaturas em data URL (120k chars)** — payload pesado por sessão; considerar compressão (WebP) ou upload binário no backend
4. **Zustand sem persistência de UI** — `sidebarCollapsed` reseta a cada reload (menor UX/energy waste)
5. **Imagens inline (signature) na tabelas** de histórico podem pesar — lazy render com detalhe sob demanda

---

## 💡 Recomendações de Otimização (priorizadas)

1. **Server Actions para mutations de formulário** — elimina roundtrip client→BFF→backend nos casos simples (create/update), com `revalidate`
2. **Paginação server-side em overview e agendas** (exige contrato backend) — maior ganho em escala
3. **Cache de catálogos (SWR/React Query)** — cidades/áreas/pacotes mudam raramente; dedupe entre telas
4. **Code-split de telas pesadas** — signature pad (`signature_pad`) e date pickers devem ser `dynamic(() => import(...), { ssr: false })`
5. **Prefetch inteligente de listas** — "Próxima página" já carregada (patients)
6. **Virtualização** (TanStack Virtual) para tabelas com centenas de itens quando a paginação chegar
7. **Persistir `sidebarCollapsed`** com `zustand/persist` — pequeno custo, grande UX
8. **Analíticas de Web Vitals** (`web-vitals`) enviadas ao backend/BFF para monitorar LCP/INP/CLS

---

## 🖋️ Acessibilidade ↔ Performance

- `focus-visible:ring-*` padronizado nos links/botões
- `aria-current="page"` na navegação
- `Sheet`/`Dialog` com titulação `sr-only`
- Navegação teclado-first nos dropdowns (Radix)

---

*Documentação de performance — atualizada em 2026-11-01*