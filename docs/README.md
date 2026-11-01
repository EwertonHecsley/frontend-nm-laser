# 📚 Documentação — CRM NM Laser (Frontend)

Documentação técnica completa do frontend do CRM clínico NM Laser, escrita para servir de contexto profundo a IAs e desenvolvedores: arquitetura, rotas, componentes, estado, autenticação, integração com API, serviços, tipos, bibliotecas e guias de extensão.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS 4 + shadcn/ui + radix-ui · React Hook Form + Zod · Zustand · sonner · Vitest

**Princípio central de segurança:** o navegador conversa **apenas** com um BFF same-origin do próprio Next.js (`/api/backend/*`); os tokens JWT vivem em cookies `HttpOnly` e a URL do backend (`BACKEND_API_URL`) nunca é exposta ao bundle client.

---

## 📄 Índice de Documentos

| Documento | Conteúdo |
|---|---|
| **[SETUP_REFERENCE.md](./SETUP_REFERENCE.md)** | Stack completa (bibliotecas e versões), scripts, `tsconfig`/ESLint/Next config, env vars e glossário de domínio |
| **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** | Visão geral do produto, objetivos, estrutura de pastas, perfis de usuário (RBAC), fluxos de autenticação e decisões de design |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Arquitetura em camadas: proxy (RBAC), App Router, BFF, HTTP client com refresh interceptor, store Zustand, services e fluxos críticos end-to-end |
| **[MODULES_AND_FEATURES.md](./MODULES_AND_FEATURES.md)** | Cada módulo funcional em detalhe (login, dashboard, cidades, pacientes, agendamentos, sessões, áreas, pacotes, vendas, equipe, settings) com matrizes de permissão e regras de negócio |
| **[API_INTEGRATION.md](./API_INTEGRATION.md)** | BFF same-origin, allowlist do proxy, contratos de endpoints e services tipados, interceptores, erros normalizados e limitações de contrato |
| **[SECURITY.md](./SECURITY.md)** | Cookies de sessão HttpOnly, RBAC em camadas, CSP e security headers, sanitização, CSRF, revogação e checklist de segurança para novas features |
| **[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)** | Filosofia server-first, slices Zustand (auth/session/ui/filters), seletores atômicos, React Hook Form + Zod e `use-api-query` |
| **[TESTING.md](./TESTING.md)** | Stack de testes, organização co-localizada, o que cobrir por camada e gaps atuais |
| **[PERFORMANCE.md](./PERFORMANCE.md)** | Server Components first, otimizações implementadas, riscos conhecidos e recomendações priorizadas |
| **[EXTENSIBILITY_GUIDE.md](./EXTENSIBILITY_GUIDE.md)** | Checklist completo "adicionar um módulo" (tipos → permissões → service → BFF → rotas → RBAC → feature → nav), guidelines de UI/UX e roadmap de ideias |

## 📁 Estrutura do Projeto (referência rápida)

```
src/
├── proxy.ts                  # Middleware: sessão + RBAC por rota
├── app/
│   ├── (auth)/login/         # Login público
│   ├── (app)/                # Área autenticada (shell + guard por página)
│   │   ├── page.tsx          # Dashboard (ManagerDashboard p/ gestora)
│   │   ├── cities|patients|appointments|sessions|sales|areas|packages|users/
│   │   └── forbidden/ settings/
│   └── api/
│       ├── auth/             # login | logout | refresh | change-password (BFF)
│       └── backend/[...path]/ # Proxy allowlist → backend NestJS
├── components/               # ui/ (shadcn), layout/ (app-shell), providers/
├── features/                 # Componentes por domínio (ex.: sales-view)
├── hooks/                    # use-api-query, use-debounced-value, use-pagination, use-permission
├── lib/                      # auth/ (jwt, cookies, permissions, session), http/, security/, server/, format/
├── services/                 # Clientes tipados por entidade (com sanitização)
├── store/                    # Zustand: slices auth/session/ui/filters + seletores
└── types/                    # Contratos de domínio (paciente, sessão, venda…)
```

## 🔑 Perfis e Permissões (RESUMO — detalhes em SECURITY.md / MODULES_AND_FEATURES.md)

| Recurso | gestora | vendas | aplicadora |
|---|---|---|---|
| Cidades | ler + gerenciar | ler | ler |
| Pacientes | CRUD completo | ler + criar/editar | ler |
| Agendamentos | CRUD | CRUD | ler + alterar status |
| Sessões | CRUD | ler | registrar (não edita) |
| Áreas / Pacotes | gerenciar | ler | — |
| Vendas | CRUD | ler + criar | ler |
| Equipe (users) | CRUD | — | — |

## 🚀 Como Iniciar

```bash
cp .env.example .env.local   # ajuste BACKEND_API_URL
npm install
npm run dev                  # http://localhost:3000
npm run check                # typecheck + lint + build (gate de qualidade)
```

## 🗺️ Modelo de Dados (resumo)

- **Cidade** → pacientes e agendamentos referenciam
- **Paciente** → agendamentos, sessões e vendas vinculados
- **Agendamento** → status (`scheduled|arrived|performed|missed|rescheduled|cancelled`); pode gerar sessão
- **Área** + **Pacote** (`items: [{ areaId, sessionsCount }]`) → base da venda
- **Venda** → saldo por área (`sessionsCount/used/remaining`); status de pagamento `open → confirmed` (irreversível)
- **Sessão** → consome 1 unidade de cada `areaId` da venda quando `completed`; assinatura opcional (desenho/data-URL ou texto) tratada como opaca

## ⚠️ Limitações Conhecidas (do contrato atual)

- `GET /appointments` e `GET /sessions` **sem paginação** no backend
- Backend não expõe listagem de usuários → `professionalId`/`applicatorId` ficam como UUID opcional
- `PATCH /patients/:id` rejeita `cpf` (campo somente leitura na edição)
- Sem modo offline; exclusões bloqueadas pelo backend quando há vínculos de integridade
- Pagamentos parcelados fora de escopo — faturamento acompanhado pelas vendas

## 🆘 Referências Externas

- [Next.js](https://nextjs.org/docs) · [React 19](https://react.dev) · [TypeScript](https://typescriptlang.org)
- [Tailwind 4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) · [Radix UI](https://radix-ui.com)
- [Zustand](https://zustand.docs.pmnd.rs) · [React Hook Form](https://react-hook-form.com) · [Zod](https://zod.dev)
- Contrato do backend: `backend-api.md` (raiz do repositório)

---

*Última atualização: 2026-11-01 — versão do projeto 1.0.0*