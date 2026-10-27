# CRM NM Laser — Frontend

Frontend do CRM clínico da NM Laser, construído com Next.js (App Router), TypeScript, Tailwind CSS e shadcn/ui. O navegador conversa apenas com um BFF same-origin do próprio Next.js; o token de acesso fica em cookie HttpOnly e nunca é exposto ao JavaScript da página.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS 4 + shadcn/ui + `radix-ui`
- React Hook Form + Zod
- Zustand
- sonner (toasts)
- lucide-react (ícones)

## Requisitos

- Node.js 20+
- Backend NestJS do CRM disponível (padrão `http://localhost:3030`)

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e ajuste conforme o ambiente:

| Variável | Descrição | Padrão |
|---|---|---|
| `BACKEND_API_URL` | URL interna do backend NestJS. Nunca é exposta ao navegador. | `http://localhost:3030` |
| `NEXT_PUBLIC_API_BASE_PATH` | Caminho same-origin do BFF consumido pelo cliente HTTP. | `/api/backend` |

## Scripts

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run start      # inicia o build de produção
npm run lint       # ESLint
npm run typecheck  # checagem de tipos (tsc --noEmit)
npm run check      # typecheck + lint + build
```

## Arquitetura

```
src/
  app/                     Rotas (App Router)
    (auth)/login/          Tela de login
    (app)/                 Área autenticada (layout + app shell)
      cities/              Cidades
      patients/            Pacientes
      appointments/        Agendamentos
      sessions/            Sessões
    api/
      auth/                Login, logout e sessão (BFF de autenticação)
      backend/[...path]/    Proxy same-origin para o backend (BFF)
  components/              UI, layout e providers
  features/                Regras e componentes por domínio
  hooks/                   Hooks reutilizáveis (query, debounce, permissão)
  lib/                     Auth, HTTP, formatação, segurança e config
  services/                Clientes tipados da API
  store/                   Zustand (slices + seletores)
  types/                   Tipos compartilhados
```

### Segurança

- **Sessão HttpOnly:** o token JWT é gravado em cookie `HttpOnly` pela rota de login do BFF. O cliente usa apenas o cookie de sessão; a URL interna do backend não é exposta.
- **BFF com allowlist:** `src/app/api/backend/[...path]/route.ts` só aceita recursos conhecidos (`cities`, `patients`, `appointments`, `sessions`, `areas`, `packages`, `sales` e `users`), valida método HTTP e aplica permissões por perfil antes de encaminhar. Métodos não mapeados são negados por padrão (`405`).
- **Autorização em camadas:** proxy (`src/proxy.ts`), páginas de servidor, componentes e BFF checam permissões; a API continua sendo a autoridade final.
- **Cabeçalhos de segurança:** CSP e demais headers configurados em `next.config.ts`.
- **Sanitização:** entradas são normalizadas em `src/lib/security/sanitize.ts` antes do envio.

### Perfis e permissões (RBAC)

| Recurso | gestora | vendas | aplicadora |
|---|---|---|---|
| Cidades (ler) | sim | sim | sim |
| Cidades (gerenciar) | sim | não | não |
| Pacientes (ler) | sim | sim | sim |
| Pacientes (criar/editar) | sim | sim | não |
| Pacientes (excluir) | sim | não | não |
| Agendamentos (ler/escrever) | sim | sim | sim |
| Sessões (ler) | sim | sim | sim |
| Sessões (registrar) | sim | não | sim |

## Módulos

- **Cidades:** listagem, busca, criação, edição e exclusão.
- **Pacientes:** listagem paginada com busca por nome/CPF, criação, edição, exclusão e atalho para o histórico de sessões.
- **Agendamentos:** agenda com filtros por período, cidade e profissional, criação, edição, alteração rápida de status e exclusão de registros sem sessão vinculada.
- **Sessões:** registro de sessão com parâmetros técnicos, assinatura opcional (desenho ou nome digitado) e histórico por paciente.
- **Vendas:** lançamento de compras e acompanhamento de faturamento pela gestora.
- **Catálogos:** áreas e pacotes com exclusão bloqueada quando houver vínculos.
- **Equipe:** cadastro e exclusão de integrantes sem vínculos operacionais.

## Limitações conhecidas

- O backend não expõe listagem de usuários/profissionais, então `professionalId` (agendamentos) e `applicatorId` (sessões) são informados como UUID opcional.
- `GET /appointments` e `GET /sessions` não possuem paginação; listas extensas podem exigir evolução do contrato.
- `PATCH /patients/:id` não aceita `cpf`; o campo é somente leitura na edição e nunca é enviado.
- O sistema é totalmente web; não há modo offline nem sincronização.
- Exclusões são permitidas apenas quando não há histórico ou vínculos que possam quebrar a integridade dos dados. Cidades, pacientes, áreas, pacotes, integrantes, agendamentos, sessões e compras possuem validação de vínculos no backend.
- Pagamentos não serão implementados separadamente: a gestora acompanha o faturamento pelas compras lançadas.
