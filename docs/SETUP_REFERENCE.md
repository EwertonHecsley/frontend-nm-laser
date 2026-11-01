# Setup & Referência de Bases: CRM NM Laser

## 🧱 Topologia do Projeto (Resumo do prototipo)

A tabela a seguir lista tecnologias instaladas no projeto (fonte: `package.json` avaliado em 2026-11).

### Produção

| Lib | Versão | Função |
|---|---|---|
| `next` | 16.4.3 | App Router, Turbopack, Route Handlers |
| `react` / `react-dom` | 19.3.0 | UI e RSC |
| `tailwindcss` + `@tailwindcss/turbopack` | 4.x | Estilização (CSS-first via `@theme`) |
| `tw-animate-css` | 1.4.0 | Animações |
| `shadcn` | 4.22.1 | UI registry + tailwind base |
| `radix-ui` | 1.8.1 | Primitives A11y (dialog/sheet/select/dropdown/command) |
| `class-variance-authority` | 0.7.1 | Variantes de componentes |
| `cn` | 0.5.0 | Merge de classes (clsx+tailwind-merge) |
| `lucide-react` | 1.61.0 | Ícones |
| `react-hook-form` + `@hookform/resolvers` | 7.91 / 6.0 | Forms |
| `zod` | 4.6.7 | Validação (client + BFF) |
| `zustand` | 5.0.16 | Store global (slices) |
| `date-fns` | 4.4.0 | Datas pt-BR |
| `react-day-picker` | 10.0.2 | Date pickers |
| `signature_pad` | 5.1.4 | Assinatura das sessões |
| `sonner` | 2.0.8 | Toasts |
| `cmdk` | 1.1.1 | Command palette |
| `next-themes` | 0.4.6 | Temas (provider presente) |
| `@fontsource/caveat` | 5.3.0 | Fonte assinatura/note |

### Desenvolvimento

| Lib | Versão | Função |
|---|---|---|
| `typescript` | 5.x | strict |
| `eslint` + `eslint-config-next` | 9 / 16.4.3 | core-web-vitals + TS |
| `vitest` + `@vitest/ui` + `vite` | 5.0.5 / 8.3.5 | Testes |
| `@testing-library/{react,jest-dom,user-event,dom}` | 10/16/7/14 | Componentes |
| `happy-dom` | 21.0.4 | DOM em Vitest |
| `jest` (residual) | 30.5.2 | Mantido no package mas o runner é Vitest — pode ser removido |

---

## ⚙️ Scripts

| Script | Comando | Uso |
|---|---|---|
| `dev` | `next dev` | Servidor com Turbopack |
| `build` | `next build` | Build de produção |
| `start` | `next start` | Serve o build |
| `lint` | `eslint .` | Lint core-web-vitals + TS |
| `typecheck` | `tsc --noEmit` | Tipos |
| `check` | typecheck + lint + build | Gate de PR |
| `test` / `test:ui` / `test:coverage` | Vitest | Testes |

## 🌱 Environment (`.env.example`)

```bash
BACKEND_API_URL=http://localhost:3030        # server-only (nunca no bundle)
NEXT_PUBLIC_API_BASE_PATH=/api/backend       # público (BFF prefix)
```

Requisitos: Node 20+, backend NestJS no ar.

---

## 🧷 Configurações Notáveis

### `tsconfig.json`
- `strict: true`, `moduleResolution: bundler`, `isolatedModules`, `jsx: react-jsx`
- Paths: `@/* → ./src/*`

### `eslint.config.mjs`
Flat config: `eslint-config-next/core-web-vitals` + `/typescript`; ignores padrão (.next, out, build).

### `components.json`
Configuração shadcn — estilo padrão, alias `@/components`, `@/lib/utils`.

### `next.config.ts`
- reactStrictMode, poweredByHeader off
- Headers de segurança globais (CSP e afins — ver SECURITY.md)
- Turbopack rule para processar CSS com plugin Tailwind

---

## 🧭 Convenções de Branch/PR (sugerido)

- Conventional Commits (`feat:`, `fix:`, `chore:`…)
- PR deve passar `npm run check`
- Atualizar `docs/` quando alterar arquitetura/segurança

---

## 🧮 Glossário de Domínio

| Termo | Significado |
|---|---|
| Área | Região corporal de aplicação (axila, buço…) com contagem de sessões |
| Pacote | Combinação de áreas + nº de sessões por área |
| Venda | Compra de um pacote por uma paciente; gera saldo por área |
| Saldo | `remaining = sessionsCount - used` por área na venda |
| Sessão | Registro de procedimento com parâmetros técnicos; consome saldo quando `completed` |
| Grupo (`groupId`) | Agrupamento de sessões por venda/tratamento |
| Aplicador(a) | Profissional que executa a sessão (`applicatorId`) |
| Profissional | Quem atende o agendamento (`professionalId`) |
| Gestora | Papel administrativo com acesso completo |
| Vendas | Papel comercial (pacientes + agendamentos + vendas) |
| Aplicadora | Papel operacional (agenda + sessões) |

---

*Setup and reference — atualizado em 2026-11-01*