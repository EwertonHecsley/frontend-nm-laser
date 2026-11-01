# Security: CRM NM Laser

Este documento descreve as medidas de segurança implementadas no frontend e no BFF.

---

## 🛡️ Modelo de Segurança

### Fundamentos (defense in depth)

1. **Backend é a autoridade final** — cada endpoint valida papel + vínculos; frontend e BFF protegem por UX/Custo
2. **Tokens nunca expostos ao JS**
3. **Same-origin por padrão** — navegador apenas fala com o próprio Next.js
4. **Sanitização antes de enviar** (menos caracteres de controle, upper/digits, limites)
5. **Headers de segurança no edge** (`next.config.ts`)

---

## 🍪 Cookies de Sessão

| Cookie | Conteúdo | Flags |
|---|---|---|
| `nm_session` | Access token (JWT) | HttpOnly, Secure (prod), SameSite=Lax, Path=/, priority high |
| `nm_session_hint` | `{email}` base64 | Idem — apenas hint de exibição de usuário |
| `nm_refresh` | Refresh token opaco | Idem, Max-Age ≤ 7 dias |

- `getSessionMaxAge(payload)`: `min(max(exp-now, 60s), 24h)` — nunca maior que 24h
- Refresh token: quando `exp` decodificável → `min(remaining, 7d)`; senão default 7d (validade real verificada pelo backend)
- `clearSessionCookies()` sobrescreve com `maxAge: 0` (limpeza garantida)

### Intervalo Maxim (24h)
```ts
export function getSessionMaxAge(payload) {
  if (!payload.exp) return 60 * 60 * 24;
  const remaining = payload.exp - Math.floor(Date.now() / 1000);
  return Math.min(Math.max(remaining, 60), 60 * 60 * 24);
}

export const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
```

---

## 🎭 RBAC (Role-Based Access Control)

### Papéis
- `gestora` — todas as permissões (18)
- `vendas` — 10 permissions (patients write; sessions read; sales read/write)
- `aplicadora` — 7 permissions (patients read; sessions read/write)

### Permissões (18)
```
cities:read        cities:manage
patients:read      patients:write     patients:delete
appointments:read  appointments:create  appointments:write  appointments:delete
sessions:read      sessions:write     sessions:delete
catalog:manage
sales:read         sales:write        sales:delete
users:read         users:manage
```

### Camadas de autorização (ordem)

1. **Proxy (`src/proxy.ts`)** — regex `route-access.ts` verifica papel por pathname; senão → `/forbidden`
2. **Server Components** — cada página faz `getServerSession()` + `hasPermission()`; senão `redirect(FORBIDDEN_PATH)` ou `redirect(LOGIN_PATH)` (sem sessão)
3. **Sidebar/nav** — `NAV_ITEMS` filtra itens sem `permission`
4. **Componentes** — `usePermission()`/canWrite props escondem botões/ações
5. **BFF (`/api/backend/*`)** — valida recurso na allowlist, método, papel (por HTTP/permissions) antes de encaminhar
6. **Backend NestJS** — reinicia tudo; retorna 403/409 conforme regra

> Nunca confie em esconder UI como segurança. As camadas 1–5 existem por UX e redução de custo; a definitiva é a 6.

---

## 🔐 Headers de Segurança (`next.config.ts`)

```ts
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isDev ? "" : "upgrade-insecure-requests",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];
```

Também: `poweredByHeader: false` (remove X-Powered-By) e `reactStrictMode: true`.

**Nota:** `connect-src 'self'` só funciona pois toda API é same-origin; se o frontend passar a falar com o backend diretamente (anti-padrão aqui), headers precisam reajuste.

---

## 🧼 Sanitização (`lib/security/sanitize.ts`)

```ts
sanitizeText(v)        // NFC + remove controle (\u0000-\u0008,\u000B,\u000C,\u000E-\u001F,\u007F) + trim
sanitizeEmail(v)       // sanitizeText + lowercase
uppercaseText(v)       // toLocaleUpperCase("pt-BR")
onlyDigits(v)          // não-dígitos fora
sanitizeSingleLine(v,max) // sanitizeText + colapsa whitespace + slice(max)
sanitizeMultiline(v,max)  // sanitizeText + slice(max)
```

Aplicação típica:
- Pacientes: `fullName` (uppercase, 180), `address` (uppercase, 240), `whatsapp` (digits), `cpf` (digits)
- Sessões: `potency/frequency/technique` (80), `technique` (120), `energy` (80), `observations` (2000), `areaIds` dedupe
- Nota: a saída é tratada como texto (React/JSON) — **nunca injete HTML** (dangerouslySetInnerHTML é proibido)

---

## 🧾 Validação (Zod)

- BFF login/change-password: schemas de tamanho/formato no servidor
- Forms client: React Hook Form + Zod com mensagens pt-BR
- Zod v4: APIs novas (`z.email()`, `.safeParse`)
- **Server sempre revalida** — nunca confie apenas na validação client

---

## 🚨 CSRF e Abusos

Mitigações em cadeia:
1. `SameSite=Lax` em todos os cookies de sessão — bloqueia envio a partir de sites de terceiros em POST
2. BFF auth: `isSameOriginRequest(request)` rejeita `403` origens cruzadas
3. Mutação sempre via POST/PATCH/DELETE — sem efeitos colaterais em GET
4. Limite de corpo (`413`) e `Content-Type JSON` estrito (`415`)
5. `CSP form-action 'self'` restringe submissões externas

---

## 🔓 Fluxo de Revogação

- **Logout:** BFF tenta revogar refresh no backend antes de limpar cookies; falha não bloqueia logout local
- **Troca de senha:** backend revoga **todos** os refresh tokens do usuário; BFF limpa sessão e o frontend pede novo login (não há sessão parcial)
- **Proxy:** com access expirado e sem refresh → limpa tudo e vai para `/login?next=<path>`
- Com access expirado e refresh presente → preserva refresh; o interceptor renova na primeira chamada de API (renovação "lazy" para não perder a navegação)

---

## 🕵️ Throttling/Rate-Limit

- 429 no login/change-password → mensagem amigável ("Muitas tentativas…")
- O backend NestJS decide a janela; o frontend apenas mapeia o status
- Sugerido: instrumentar cliente para backoff automático em 429 (não implementado)

---

## 🧪 Testes de Segurança

- `lib/auth/jwt.test.ts` — decode/fresh helpers
- `lib/http/errors.test.ts` — normalização e vazamento (401/403/5xx usam mensagens genéricas)
- `lib/http/client.test.ts` — cycle de refresh, timeout, query building
- `store/slices/session-slice.test.ts` — hidratação de sessão
- `hooks/use-permission.test.tsx` — matriz RBAC

---

## ⚠️ Vulnerabilidades Conhecidas e Notas

1. **JWT decodificado sem verificação no frontend** (por design) — papel/id usados só para UI; servidor sempre considera;
2. **`unsafe-inline` no CSP** (script, style) — necessário hoje por Tailwind/hydration; evoluir para nonces/hashes se possível;
3. **Legado `AuthMiddleware`** com fallback localStorage (`nm_refresh_token`) — Martelar caminho máximo: cookie HttpOnly deve ser absolutamente a única via de refresh;
4. **Nenhum captcha/MFA** — login depende apenas de rate-limit do backend;
5. **Sem antivírus/verificação MIME** para assinatura (data URL ≤120k chars) — conteúdo é opaco;
6. **Sem mínimo de complexidade de senha** além de length (8+ change / 6+ login) — sugerido fortalecer com backend policy.

---

## 🔎 Checklist de Segurança Para Novas Features

- [ ] Nova rota tem regra em `route-access.ts` (+páginas com guard)
- [ ] Recurso adicionado ao allowlist do BFF com método+permissão
- [ ] Inputs sanitizados (`sanitize*`) antes de payload
- [ ] `usePermission`/props de canWrite controlam UI
- [ ] Backend revalida toda mutação (contrato confirmado)
- [ ] Erros: msgs genéricas para 401/403/5xx; nunca vaze stack/log do server
- [ ] Nenhum token/secreto no `localStorage` ou `document.cookie` (JS)
- [ ] CSP/headers não quebram (checar `npm run check` + smoke de headers)

---

*Documentação de segurança — atualizada em 2026-11-01*