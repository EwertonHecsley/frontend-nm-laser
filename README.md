# NM Laser CRM — frontend

Frontend React + Vite para os fluxos cobertos pelo contrato HTTP descrito em `docs/API_REFERENCE_FRONTEND.md`.

## Executar

Requer Node.js e npm.

```sh
npm install
npm run dev
```

O servidor de desenvolvimento usa `http://localhost:5173`. Configure a API com `VITE_API_BASE_URL`; o fallback local é `http://localhost:3030`, sem prefixo `/api`. Copie `.env.example` para `.env` se precisar ajustar essa configuração.

O token JWT fica somente em memória no navegador e desaparece ao atualizar ou fechar a aba. O backend não oferece refresh/logout remoto. O contrato detalhado não inclui `/auth/me`: a interface lê `sub` e `role` do payload do JWT somente para personalizar a experiência; a API continua sendo a autoridade de autorização. Nome e e-mail do usuário não estão disponíveis no contrato atual.

## Validação

```sh
npm test
npm run build
```

## Limites conhecidos do contrato

- `docs/API_REFERENCE_FRONTEND.md` descreve o snapshot detalhado e é a referência adotada na integração. Há divergências com `docs/backend-api.md` e `docs/frontend-kit/SCREENS_AND_API.md`: a porta local é `3030`; criação de cidade é apenas para `gestora`; `/sync`, `/auth/me` e cadastro por PIN não estão disponíveis/confirmados na referência detalhada. Não são chamados fluxos ausentes.
- Não há endpoints documentados para login Google, dashboard/KPIs, profissionais ou gestão de usuários; esses fluxos não são apresentados.
- O `PATCH /patients/:id` não aceita `cpf`; CPF é solicitado apenas no cadastro.
- IDs de paciente e profissional em agendamentos não são escolhidos de listas inventadas; é necessário usar UUID obtido de fonte autorizada.
- A busca de pacientes é limitada a nome: busca por CPF foi omitida porque o contrato envia `search` na query string e CPF não deve aparecer em URLs.
- A captura de assinatura de sessão não está disponível até existir definição operacional para sua finalidade, proteção e retenção.
- A API permanece responsável por autorizar operações; as ações ocultadas por perfil são somente uma conveniência de interface.
