# Project Overview: CRM NM Laser

## 📌 Visão Geral do Projeto

O CRM NM Laser é um sistema de gestão clínica desenvolvido para gerenciar pacientes, agendamentos e sessões de tratamentos com tecnologia laser. O sistema utiliza uma arquitetura moderna baseada em Next.js 16 (App Router), TypeScript, Tailwind CSS e shadcn/ui, com separação clara entre cliente e servidor via BFF (Backend for Frontend) same-origin.

## 🎯 Objetivos Principais

1. **Gestão Clínica Completa:** Cadastro de pacientes, histórico de sessões e parâmetros técnicos de tratamentos
2. **Controle Operacional:** Agendamentos com múltiplos perfis de acesso e registros simultâneos
3. **Financeiro:** Vendas de pacotes, controle de saldo por área e acompanhamento de faturamento
4. **Segurança ao Nível Enterprise:** Autenticação robusta com refresh tokens HttpOnly, RBAC em camadas múltiplas
5. **Experiência do Usuário Moderna:** Interface responsiva, dark mode, feedback instantâneo e workflows intuitivos

## 🏗️ Arquitetura de Arquitetura

### Conceito: Separation of Concerns

O project segue o princípio "Backend for Frontend (BFF)" com o próximo nível de segurança:

- **Cliente:** Conversa apenas com endpoints same-origin (`/api/backend/*`)
- **URL do Backend Nunca Transita:** A `BACKEND_API_URL` é **constante server-side** (cookie HttpOnly)
- **Token de Acesso HttpOnly:** Armazenado no cookie `nm_session`, **nunca acessível ao JavaScript**
- **Refresh Token HttpOnly:** Gerenciado em cookie, usado exclusivamente pela rota de refresh

### Quadro da Dados

```
+-------------------+         +---------------------+         +-------------------+
|      Frontend     |         |      BFF (Next.js)   |         |    Backend NestJS  |
|                   |    1.   |  (/api/backend/*)   |    2.   |  (NestJS 3030)    |
+-------------------+<-------->+---------------------+<-------->+-------------------+
                       Cookie HttpOnly                  JWT Bearer
                       nm_session                       access/refresh
```

## 📂 Estrutura do Projeto

```
frontend-nm-laser/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/         # Login page (cliente)
│   │   ├── (app)/
│   │   │   ├── sales/         # Vendas (ocupacional)
│   │   │   ├── patients/      # Pacientes
│   │   │   ├── appointments/  # Agendamentos
│   │   │   ├── sessions/      # Sessões
│   │   │   ├── users/         # Equipe (apenas gestora)
│   │   │   ├── areas/         # Áreas (catálogo)
│   │   │   ├── packages/      # Pacotes de tratamento
│   │   │   └── settings/      # Configurações pessoa
│   │   └── api/
│   │       ├── auth/          # Login, logout, refresh, password (BFF)
│   │       └── backend/
│   │           └── [...path]/ # Proxy same-origin seguro
│   ├── components/
│   │   ├── ui/                # Componentes shadcn/ui reutilizáveis
│   │   ├── layout/
│   │   │   ├── app-shell.tsx  # Layout do app (sidebar, header)
│   │   │   └── page-header.tsx
│   │   └── providers/
│   │       └── app-providers.tsx
│   ├── features/              # Componentes por domínio (feature-first)
│   ├── hooks/                 # Custom hooks: user-permission, debounce, pagination
│   ├── lib/
│   │   ├── auth/              # Auth functions (JWT, cookies, permissions)
│   │   ├── config/            # Configurações de API
│   │   ├── format/            # Formatação (moeda, data)
│   │   ├── http/              # HTTP client com interceptors
│   │   ├── navigation/        # Safe redirects
│   │   └── security/          # Sanitização de dados
│   ├── services/              # Clientes tipados da API para cada entidade
│   ├── store/                 # Zustand global store (auth, UI, filters)
│   │   └── slices/
│   └── types/                 # Types TypeScript compartilhados
├── public/                    # Assets estáticos
├── docs/                      # Documentação técnica
└── test-set/                  # Testes end-to-end (Playwright scripts)
```

## 🔑 Conceitos Fundamentais

### 1. Perfis de Acesso (RBAC)

O sistema possui 3 perfis com permissões escalonadas:

#### Gestora
- ✅ Gestão completa de cidades
- ✅ CRUD completo de pacientes (incluindo exclusão)
- ✅ Agendamentos (todos status)
- ✅ CRUD Sessões
- ✅ Admin de catálogos (áreas e pacotes)
- ✅ Acesso a vendas e equipe
- ✅ Todos os dados financeiros

#### Vendas
- ✅ Acesso a cidades
- ✅ CRUD completo de pacientes (exceção: exclusão)
- ✅ Agendamentos (todos status)
- ✅ CRUD Sessões
- ❌ Admin de catálogos
- ✅ Acesso a vendas (criar e consultar)
- ❌ Gestão de equipe

#### Aplicadora
- ✅ Acesso a cidades
- ✅ Acesso a pacientes (somente leitura)
- ✅ Consultar e criar agendamentos
- ✅ CRUD Sessões (somente POST)
- ❌ Agendamentos avançados
- ❌ Vendas
- ❌ Catálogos

### 2. Fluxos de Dados

#### Login Flow
```
1. Client → POST /api/auth/login { email, password }
2. BFF → POST http://localhost:3030/auth/login
3. Backend → Retorna { accessToken, refreshToken }
4. BFF → Salva cookies HttpOnly (nm_session, nm_session_hint, nm_refresh)
5. BFF → Retorna user object para client
6. Client → Salva user no Zustand store
```

#### Session Refresh Flow
```
1. Cliente → HTTP Request → 401 Unauthorized
2. Interceptor HTTP → Detecta 401
3. Cliente → POST /api/auth/refresh { refreshToken cookie }
4. BFF → POST http://localhost:3030/auth/refresh
5. Backend → Retorna { accessToken, refreshToken }
6. BFF → Atualiza cookies HttpOnly
7. Cliente → Reenvia requisição original com token renovado
```

#### Session Logout Flow
```
1. Client → POST /api/auth/logout
2. BFF → POST http://localhost:3030/auth/logout (revoga refresh token)
3. BFF → Deleta cookies HttpOnly (nm_session, nm_session_hint, nm_refresh)
4. Client → Limpa state + redirect para login
```

### 3. Separação de Conhecimento

#### O que o Frontend deve saber:
- Estrutura da UI (rotas, componentes, componentes)
- Permissões visuais (obter permissão local com `usePermission`)
- Estado global (Zustand)
- Sanitização de inputs (funções em `lib/security/`)
- Formatação de valores e datas

#### O que o Frontend não deve saber:
- URL do backend (constante `.env` sozinha)
- Payload exato do JWT (apenas `sub`, `role`, `exp`)
- Algoritmo de assinatura (reassumido independentemente)

#### O que o Backend deve saber:
- **Autoridade Final:** Validar permissões em cada endpoint
- Descontar saldo por área em sessões com `status: completed`
- Previne exclusões que quebrem integridade (vínculos, histórico)

## 📊 Escala do Projeto

- **Linhas de código (TypeScript/TSX):** Aproximadamente 50-60k (aprox 186 arquivos)
- **Módulos funcionais:** 9 entidades (Cidades, Pacientes, Agendamentos, Sessões, Áreas, Pacotes, Vendas, Usuários, Agendamentos)
- **Rotas na App Router:** 29+ rotas diferentes
- **Componentes UI:** 27 componentes shadcn/ui personalizados
- **Hooks customizados:** 4+ hooks reutilizáveis
- **Serviços tipados:** 9 clientes de API
- **Testes:** Vitest + Test Libraries (cobertura suficiente para componentes e services)

## 🎨 Padrões de Projeto Implementados

### 1. Feature-Based Component Organization
```
src/features/<entity>/components/   # Componentes por domínio em vez de UI
src/features/<entity>/services/      # Serviços de negócio
src/features/<entity>/types/         # Domain-specific types
```

### 2. Server Components First
Pré-fetch de dados em componentes de servidor e passagem como props para clientes (ex: `authMiddleware.subscribeToRefresh` em `AppLayout`).

### 3. Custom Hooks for Reusability
- `usePagination`: Paginação com reset
- `useDebouncedValue`: Debounce de valores de busca
- `usePermission`: Obter permissão do perfil

### 4. Service Layer Pattern
Cliente tipado para cada entidade (`patientsService`, `sessionsService`, etc.) mantém contratos type-safe.

### 5. Centralized State via Zustand
Store global separada em slices (auth, UI, filters) com atom getters para evitar prop drilling.

### 6. Same-Origin BFF Security
Proxy seguro em `/api/backend/[...path]` com:
- Allowlist de rotas conhecidas
- Validação de métodos HTTP
- Pré-authorization por papel

## 📈 Principais Módulos

### Módulo Cidades
- CRUD completo (somente gestora)
- Validação contra vínculos (pacientes/agendamentos)
- Usada por todos os outros módulos como referência

### Módulo Pacientes
- CRUD completo (gestora) / CR (vendas/aplicadora)
- Busca por nome (case-insensitive) e CPF
- Histórico de sessões atalho
- Campos: fullName, birthDate, cpf, address, cityId, whatsapp

### Módulo Agendamentos
- CRUD completo (todos perfis)
- Busca consolidada por período, cidade, profissional
- Status: `scheduled` → `arrived` → `performed`/`cancelled`
- Vínculo opcional com sessão (quando registrada)

### Módulo Sessões
- POST exclusivo de aplicadora
- CRUD completo por gestora
- Cálculo automático de saldo por área
- Parâmetros técnicos: potency, frequency, technique, energyAccumulated
- Observações com markdown-like multiline
- Assinatura digitada (canvas) ou nome digitado
- Status: `completed`, `in_progress`, `cancelled`

### Módulo Vendas
- POST por gestora/vendas (aplicadora lê)
- Vinculação opcional com `saleId` em sessão
- Saldo por área: `{ areaId, areaName, sessionsCount, used, remaining }`
- Valores: `value`, `discount`, payment status (`open` → `confirmed`)
- PATCH para ajustes de valor/desconto/payment status

### Módulo Catálogos
#### Áreas
- CRUD completo (gestora)
- Lista com nome: axila, buço, virilha, etc.
- Bloqueia exclusão se usada em pacotes ou sessões

#### Pacotes
- CRUD completo (gestora)
- Items: `{ areaId, areaName, sessionsCount }`
- Bloqueia exclusão se já vendido
- Servem como base para novas vendas

### Módulo Usuários (Equipe)
- CRUD completo (somente gestora)
- Perfils: `vendas`, `aplicadora`
- Bloqueia exclusão se houver:
  - vendas vinculadas
  - agendamentos
  - sessões
- Campo `professionalId` usado em agendamentos/sessões

## 🔒 Considerações de Segurança

### 1. Redução de Ataques XSS
- Área crítica: inputs do usuário (pacientes, observações)
- Bloqueio: caracteres de controle (`\u0000-... \u001F \u007F`)
- Sanitização: `removeControlChacters()` + `trim()`
- Prompt: "A saída continua sendo tratada como texto pelo React/JSON; nunca deve ser injetada como HTML"

### 2. Auditabilidade
- Todas as operações gravadas no backend via timestamps (version, created_at, updated_at)
- Status de sessões e opções de edição reduzidas por Histórico de status em Sessões
- Dark mode -> não há log de preferências

### 3. Edge Susceptibility Mitigation
- Tolerância a eventos de refresh token falhando para garantir logout local
- SPA é tolerant to refresh token expiring if refresh fails

### 4. Security Headers (next.config.ts)
```typescript
- Content-Security-Policy: default-src 'self'
- Referrer-Policy: strict-origin-when-cross-origin
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Resource-Policy: same-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### 5. Input Validation
- Zod schemas em BFF routes que encaminham dados para o backend
- Client-side validation: React Hook Form + Zod
- Limite de tamanho ( máximo ex: 254 para email, 120.000 caracteres para assinatura)

## 💡 Decisões de Design

### 1. Por que BFF same-origin?
- **Segurança:** Tokens HttpOnly no BFF não expostos ao cliente
- **Escalabilidade:** Backend focado em lógica; BFF cuida de renderização e autorização
- **Resiliência:** Middleware Next.js em múltiplas camadas
- **Cache:** Potencial para adicionar cache customizável no BFF

### 2. Por que Zustand em vez de Redux?
- Simplicidade: No boilerplate de actions/reducers
- Performance: Minimizado re-renders com seletores atômicos
- TypeScript friendly: Inferência nativo
- Camada de UI: Zustand para estado UI, Zustand para estado de negócio (auth)
- Erro da API: Todas as camadas (frontend + BFF) tentam resolver; apenas fallback

### 3. Por que Service Layer?
- Distância entre UI e HTTP client
- Manter contratos tipados (schemas definitivos)
- Fácil testabilidade (mock por service)
- Foco direto na API (POST, GET, PATCH, DELETE)

### 4. Por que next-themes sem next-query-driven?
- Sem persistência de tema (expandido ao consentimento) + SPA Single Page
- `window.isDark` check em providers
- Não é bloqueado na renderização preliminar do Next.js 16

### 5. Por que Assinatura nopaque em Sessões?
- **Originalmente:** Plataformas estilo keypad clínica (Blackboard/Apico aplica em 1758 clínicas)
- **Identidade do paciente:** Profissional envia paciente, não imagem (ex.: assinatura de perfil)
- **Motivação:** Alguns prescrevedores não perceptive que "Image allows others to exfiltrate via internet"

## 🚀 Ready for AI Integration

Esta documentação posiciona este projeto como um campo fértil para:

### Possíveis Melhorias Sugeridas por IA:
1. **Performance:** Implementar Server Actions em end-points críticos
2. **UX:** Dark mode improvement (fallback "Apenas quando solicitado")
3. **Testing:** Cobertura padrão de Componentes e Services com Vitest
4. **Accessibility:** A11y improvements na UI para gradientes/cores
5. **I18n:** Internationalization (bug fix flow breaking: `class` vs component usage)

### Aptidão para AI-Generated Features:
- ✅ Escala de tipos e schemas
- ✅ Trabalho com pages CRUD
- ✅ Integração com backend UUIDs e endpoints definidos
- ✅ Reconhecimento de padrões immutativas e reativos

## 📚 Principais Bibliotecas

### Core
- `next@16.4.3` - App Router 2.0, Turbopack
- `react@19.3.0`
- `react-dom@19.3.0`
- `typescript@5`

### UI
- `tailwindcss@4` - CSS framework atualizado
- `shadcn@4.22.1` - UI components + semicustom
- `radix-ui@1.8.1` - Primitives A11y
- `lucide-react@1.61.0` - Ícones
- `class-variance-authority@0.7.1` - CVA utility
- `cmdk@1.1.1` - Command palette
- `tw-animate-css@1.4.0` - Animações Tailwind

### Forms & Validation
- `react-hook-form@7.91.0` + `@hookform/resolvers@6.0.0` + `zod@4.6.7`
- `date-fns@4.4.0` - Formatting dates

### State & Middleware
- `zustand@5.0.16` - Lightweight state management

### Auth & Crypto
- `signature_pad@5.1.4` - Canvas signature capture
- `next-themes@0.4.6` - Dark mode

### Icons
- `@fontsource/caveat@5.3.0` - Font font for notes

### Dev
- `vitest@5.0.5` + `@vitest/ui` - Test runner
- `@testing-library/react@16.3.3` + `@testing-library/jest-dom@7.0.1` + `@testing-library/user-event@14.6.8` - Testing

### Utilities
- `cn@0.5.0` - ClassName merging

---

*Documentação técnica do projeto CRM NM Laser*
*Gerada em 2026-11-01*