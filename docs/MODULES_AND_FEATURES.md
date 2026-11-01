# Módulos e Funcionalidades: CRM NM Laser

Este documento detalha cada módulo funcional do CRM, incluindo comportamento de UI, permissões e regras de negócio aplicadas no frontend. A autoridade final de autorização sempre é o backend; o frontend esconde/bloqueia ações por conveniência.

Índice de módulos:

1. [Autenticação e Sessão](#1-autenticação-e-sessão)
2. [Dashboard / Visão Geral](#2-dashboard--visão-geral)
3. [Cidades](#3-cidades)
4. [Pacientes](#4-pacientes)
5. [Agendamentos](#5-agendamentos)
6. [Sessões](#6-sessões)
7. [Áreas (Catálogo)](#7-áreas-catálogo)
8. [Pacotes (Catálogo)](#8-pacotes-catálogo)
9. [Vendas](#9-vendas)
10. [Equipe / Usuários](#10-equipe--usuários)
11. [Configurações (Troca de Senha)](#11-configurações-troca-de-senha)

---

## 1. Autenticação e Sessão

**Rota:** `/login` · **Grupo:** `(auth)`

### Funcionalidade
- Formulário de e-mail + senha (React Hook Form + Zod)
- Após sucesso, hidrata `useAppStore` (`setSessionUser`) e redireciona para `next` (validado por `safe-redirect.ts`, apenas paths relativos) ou `/`
- Se o usuário já possui sessão válida, o proxy redireciona `/login` → `/`

### Regras
- BFF valida: same-origin, Content-Type JSON, corpo ≤ 16KB, Zod (email ≤254, senha 6–200)
- Senha nunca é logada; e-mail é `sanitizeEmail` (trim + lowercase)
- Erros exibidos: credenciais inválidas (401), rate limit (429), backend indisponível (502)
- Cookies gravados: `nm_session` (JWT), `nm_session_hint` (e-mail em base64), `nm_refresh` (até 7 dias)

### Sessão ativa
- Layout `(app)` busca `getServerSession()`; nessas páginas o usuário é injetado no `AppShell`
- Renovação silenciosa: 401 em rota protegida → `POST /api/auth/refresh` → retry automático (uma única tentativa em voo)
- Expiração sem refresh → proxy redireciona `/?next=<rota>` para `/login`

---

## 2. Dashboard / Visão Geral

**Rota:** `/` · **Permissão:** autenticado

### Comportamento condicional por papel
- **gestora:** renderiza `<ManagerDashboard />` (src/features/dashboard) — painel de gestão com indicadores operacionais
- **vendas / aplicadora:** painel operacional com hero (nome do usuário, descrição de abilities do papel) e grid de cards "Módulos" (Cidades, Pacientes, Agendamentos, Sessões) + cards informativos (Sessão protegida, Perfil de acesso)

### Destaques de UI
- Hero com gradiente da marca (`#155e63 → #0f766e → #115e59`)
- Cards de módulo com hover state e ícone
- Labelling correto (`aria-labelledby`), foco visível com ring

---

## 3. Cidades

**Rotas:** `/cities`, `/cities/new`, `/cities/[id]/edit` · **Service:** `cities.service.ts`

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar | ✅ | ✅ | ✅ |
| Criar/Editar | ✅ | ❌ | ❌ |
| Excluir | ✅ (bloqueada com vínculos) | ❌ | ❌ |

### Funcionalidades
- Listagem de todas as cidades (sem paginação server-side; listagem simples)
- Criação/edição com campo `name` (sanitizado: `sanitizeSingleLine`)
- Exclusão bloqueada se houver pacientes ou agendamentos vinculados (backend retorna 409; frontend mostra toast com a mensagem)

### Acesso às rotas
- Proxy: `/cities/new` e `/cities/[id]/edit` exigem gestora
- Sidebar: item "Cidades" visível a todos

---

## 4. Pacientes

**Rotas:** `/patients`, `/patients/new`, `/patients/[id]/edit`, `/patients/[id]/history` · **Service:** `patients.service.ts`

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar/Buscar | ✅ | ✅ | ✅ |
| Criar/Editar | ✅ | ✅ | ❌ |
| Excluir | ✅ (bloqueada com vínculos) | ❌ | ❌ |
| Histórico | ✅ | ✅ | ✅ |

### Listagem
- Paginada **server-side**: `GET patients?page=&limit=&search=` → `PaginatedResponse<Patient>` (default page 1, limit 20)
- Busca por **nome ou CPF**, debounced 350ms (`useDebouncedValue`)
- Paginação client-side complementar quando aplicável (`use-pagination.ts`)

### Formulário (criar/editar)
Campos:
- `fullName` — obrigatório, uppercase pt-BR, single-line, ≤180
- `birthDate` — data (date-fns)
- `cpf` — **somente dígitos**; na edição o campo é somente-leitura (backend rejeita `cpf` em PATCH)
- `address` — uppercase, ≤240
- `cityId` — select alimentado pelo catálogo de cidades
- `whatsapp` — opcional, `onlyDigits` (o utilitário `lib/whatsapp.ts` gera link `wa.me` para contato rápido quando existe)

### Histórico do paciente
- Atalho (botão) na listagem/detalhe para `/patients/[id]/history`
- Lista as sessões do paciente (`GET sessions?patientId=`) com parâmetros técnicos e assinatura, agrupadas por data

### Regras
- Payload de criação: `toCreatePayload` sanitiza todos os campos antes do POST
- Payload de edição: constrói objeto parcial apenas com campos alterados (PATCH)

---

## 5. Agendamentos

**Rotas:** `/appointments`, `/appointments/new`, `/appointments/[id]/edit` · **Service:** `appointments.service.ts`

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar/Filtrar | ✅ | ✅ | ✅ |
| Criar | ✅ | ✅ | ✅ (rota `/appointments/new` exige gestora/vendas; aplicadora pode escrever status) |
| Editar | ✅ | ✅ | ✅ (write em status) |
| Excluir | ✅ (bloqueada com sessão vinculada) | ✅ | ✅ |

> Nota: a matriz de `route-access.ts` restringe `/appointments/new` a gestora/vendas; `appointments:write` existe para aplicadora (alteração rápida de status na agenda).

### Listagem / Agenda
- Filtros: período (`from`/`to`), `cityId`, `professionalId`
- O período é persistido no store global `FiltersSlice.appointmentPeriod` (compartilhado entre telas)
- Backend **não pagina** `GET /appointments` — listagem completa por filtro
- Colunas principais: paciente, cidade, profissional (`professionalName` vindo da listagem), horário, status
- Alteração rápida de status inline (badge/button) — statuses: `scheduled`, `arrived`, `performed`, `missed`, `rescheduled`, `cancelled`

### Formulário
- `patientId` — seleção de paciente (busca)
- `cityId` — catálogo de cidades
- `professionalId` — **UUID opcional** (o backend não expõe listagem de usuários; campo é texto/UUID)
- `scheduledAt` — data/hora (day picker + hora)
- `status` — default `scheduled`

### Regras
- Exclusão bloqueada quando existe sessão vinculada (409)
- PATCH parcial — apenas campos enviados

---

## 6. Sessões

**Rotas:** `/sessions`, `/sessions/new`, `/sessions/[id]` · **Service:** `sessions.service.ts`

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar/Detalhe/Histórico | ✅ | ✅ | ✅ |
| Registrar (nova) | ✅ | ❌ | ✅ |
| Editar parâmetros | ✅ | ❌ | ❌ (apenas criar; edição exclusiva da gestora) |
| Excluir | ✅ exclusivo | ❌ | ❌ |

> Rota `/sessions/new` → gestora e aplicadora (`route-access.ts`); `sessions:write` cobre gestora e aplicadora. Vendas apenas lê.

### Registro de sessão (formulário técnico)
Campos:
- `patientId` — obrigatório
- `performedAt` — data/hora
- `sessionNumber` — opcional, ≤40
- `status` — `completed` (default) | `in_progress` | `cancelled`
- `appointmentId` — vínculo opcional com agendamento
- `saleId` — vínculo opcional ao pacote vendido (permite desconto de saldo)
- `groupId` — vínculo opcional de grupo/venda consolidada (detail via `getGroup`)
- `areaIds` — multi-select das áreas **do pacote da venda** (backend valida vínculo); deduplicadas no payload
- `applicatorId` — UUID opcional
- `potency` (≤80), `frequency` (≤80), `technique` (≤120), `energyAccumulated` (≤80) — parâmetros técnicos
- `observations` — multiline, ≤2000
- `signature` — assinatura opcional: desenho via `signature_pad` (data URL) **ou** nome digitado convertido; tratada como **opaca** (tamanho máx. 120.000 chars; nunca alterada pelo frontend)

### Regras de saldo
- Ao criar/atualizar com `status: completed`, o backend valida e desconta **1 unidade de cada área informada** do pacote vinculado à venda
- O frontend exibe feedback de saldo (`sessionGroup`/`sale.areas[].remaining`) e bloqueia informa further quando necessário

### Visão geral (overview)
- `GET sessions/overview?patientId=&status=&from=&to=&search=&limit=` → `{ stats: { total, completed, inProgress, cancelled, patients }, sessions: [...] }`
- Stats **ignoram** o filtro de status; o status filtra apenas a lista (contrato backend)
- Painel consolidado para gestora (quantitativos) e histórico do aplicador

### Detalhe e grupo
- `GET sessions/:id` — retorno com `patient: { id, fullName }`, `saleId`, `packageName`, `areas: [{ id, name }]`
- `GET sessions/groups/:id` → `SessionGroupDetail` — sessões relacionadas por venda/grupo

### Exclusão
- Exclusiva da gestora; recalcula o saldo consumido no backend

---

## 7. Áreas (Catálogo)

**Rotas:** `/areas`, `/areas/new`, `/areas/[id]/edit` · **Service:** `areas.service.ts`

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar | ✅ (catálogo público do app) | ✅ | ✅ |
| Criar/Editar | ✅ | ❌ | ❌ |
| Excluir | ✅ (bloqueada se usada em pacotes/sessões) | ❌ | ❌ |

- CRUD simples com campo `name` (ex.: axila, buço, virilha)
- Áreas não-gestoras aparecem em selects de filtros/sessões (como catálogo de referência)

---

## 8. Pacotes (Catálogo)

**Rotas:** `/packages`, `/packages/new`, `/packages/[id]/edit` · **Service:** `packages.service.ts`

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar | ✅ | ✅ (consumido por vendas) | — |
| Criar/Editar | ✅ | ❌ | ❌ |
| Excluir | ✅ (bloqueada se vendido) | ❌ | ❌ |

### Funcionalidades
- `GET /packages` → pacotes com `items: [{ areaId, areaName, sessionsCount }]`
- Formulário constrói itens dinâmicos (área + quantidade de sessões)
- Pacote é a base para a venda: escolhido no formulário de nova venda; define as áreas aplicáveis e o saldo da paciente

---

## 9. Vendas

**Rotas:** `/sales`, `/sales/new`, `/sales/[id]/edit` · **Service:** `sales.service.ts` (com teste `sales.service.test.ts`)

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar | ✅ | ✅ | ✅ (somente leitura) |
| Criar | ✅ | ✅ | ❌ |
| Editar | ✅ | ✅ (apenas próprias, com prioridade menor — backend decide) | ❌ |
| Excluir | ✅ (bloqueada com vínculos) | ❌ | ❌ |

### Listagem
- Filtro por `patientId` (deep-link `/sales?patientId=<uuid>`, sanitizado ≤128 na página server)
- Vendas com **saldo por área**: `areas: [{ areaId, areaName, sessionsCount, used, remaining }]`
- Faturamento acompanhado pela gestora (valor - desconto; sem módulo de pagamento separado)

### Formulário (nova venda)
- `patientId` — obrigatório
- `packageId` — define áreas e quantas sessões por área
- `value`, `discount` — monetário (BRL via `lib/format/currency.ts`)
- `paymentMethod` — enum (meio de pagamento)
- `paymentStatus` — inicia `open`; PATCH pode mover para `confirmed`
- `consultantId` — opcional (quem vendeu)

### Regras
- Nova venda: sempre `paymentStatus: "open"`
- Confirmação: gestora confirma qualquer venda; vendas confirma somente as próprias
- Venda confirmada **não pode ser reaberta**
- Sessões futuras apontam `saleId` desta venda para consumir saldo

---

## 10. Equipe / Usuários

**Rotas:** `/users/new`, `/users/[id]/edit` · **Service:** `users.service.ts`

| Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Listar (`GET /users`) | ✅ (subordinados vendas/aplicadora) | ❌ | ❌ |
| Criar | ✅ | ❌ | ❌ |
| Editar | ✅ | ❌ | ❌ |
| Excluir | ✅ (bloqueada com vendas/agendamentos/sessões) | ❌ | ❌ |

### Funcionalidades
- Cadastro: `name`, `email`, `role` (vendas|aplicadora), `password`
- Edição: campos opcionais (PATCH)
- A listagem de usuários alimenta selects de `professionalId`/`applicatorId` quando disponível; quando não, esses campos permanecem UUID opcional (limitação contratual — ver README)
- Todas as rotas `/users*` exigem gestora (proxy + páginas + BFF)

---

## 11. Configurações (Troca de Senha)

**Rota:** `/settings` · **Service:** `authService.changePassword`

### Funcionalidade
- Formulário: senha atual + nova senha (≥8 chars, ≤200, Zod no BFF)
- Fluxo: BFF encaminha com `Authorization: Bearer <access>`; em sucesso o backend **revoga todos os refresh tokens do usuário**; o frontend limpa cookies/instrui novo login
- Mensagens: sucesso ("Senha alterada com sucesso. Faça login novamente."), senha atual inválida (400 com mensagem do backend), rate limit (429)

---

## 🔀 Matriz Consolidada de Permissões (UI)

| Módulo / Ação | gestora | vendas | aplicadora |
|---|---|---|---|
| Cidades — ler/gerenciar | ✅/✅ | ✅/❌ | ✅/❌ |
| Pacientes — ler | ✅ | ✅ | ✅ |
| Pacientes — criar/editar | ✅ | ✅ | ❌ |
| Pacientes — excluir | ✅ | ❌ | ❌ |
| Agendamentos — ler/escrever | ✅/✅ | ✅/✅ | ✅/✅ (status) |
| Sessões — ler | ✅ | ✅ | ✅ |
| Sessões — registrar/editar | ✅/✅ | ❌ | ✅/❌ |
| Áreas/Pacotes — gerenciar | ✅ | ❌ | ❌ |
| Vendas — ler/criar | ✅/✅ | ✅/✅ | ✅/❌ |
| Vendas — editar Próprias/excluir | ✅ | ✅ propias/❌ | ❌ |
| Equipe (users) | ✅ | ❌ | ❌ |
| Settings (senha própria) | ✅ | ✅ | ✅ |

---

## 🎯 Oportunidades de Melhoria por Módulo (sugestões para IA)

- **Pacientes:** paginação já server-side — adicionar ordenação e filtros por cidade; export CSV
- **Agendamentos:** visualização de calendário (week/month) em vez de tabela; drag-and-drop de reagendamento
- **Sessões:** timeline por paciente com gráfico de consumo de saldo por área; modo offline para registro em local sem rede
- **Vendas:** relatório de faturamento por período/consultante (`reports.service.ts` já existe como base); gráficos de receita
- **Equipe:** listagem geral (quando backend expuser `GET /users` para gestora completa) e métricas por profissional
- **Global:** toasts consolidados, skeletons consistentes, empty states ilustrados, command palette já disponível via `cmdk`

---

*Documentação de módulos do CRM NM Laser — atualizada em 2026-11-01*