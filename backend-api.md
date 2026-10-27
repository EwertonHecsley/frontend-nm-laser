# Backend CRM NM Laser — Documentação para consumo do Frontend

Base URL: `http://localhost:3030` (configurável via env). Autenticação: JWT Bearer em todas as rotas exceto `/auth/login` e `/health`.

## Autenticação
- POST /auth/login — body `{ email, password }` → `{ accessToken }`.
- POST /auth/change-password — body `{ currentPassword, newPassword }` (autenticado).
- Enviar `Authorization: Bearer <token>`.

## Perfis (roles): gestora, vendas, aplicadora.

### Usuários / Equipe (gestora)
- GET /users — lista subordinados (`vendas`, `aplicadora`)
- POST /users `{ name, email, role, password }`
- GET /users/:id
- PATCH /users/:id `{ name?, email?, role?, password? }`
- DELETE /users/:id — bloqueia se houver vendas, agendamentos ou sessões vinculadas

## Módulos e endpoints

### Cidades
- GET /cities — lista
- POST /cities { name } (gestora, vendas)
- GET /cities/:id
- PATCH /cities/:id { name }
- DELETE /cities/:id — bloqueia se houver pacientes ou agendamentos vinculados

### Pacientes
- GET /patients?page=&limit=&search=
- POST /patients { fullName, birthDate, cpf, address, cityId, whatsapp? }
- GET /patients/:id
- PATCH /patients/:id
- DELETE /patients/:id — bloqueia se houver agendamentos, compras ou sessões vinculadas

### Agendamentos
- GET /appointments?from=&to=&cityId=&professionalId=
- POST /appointments { patientId, cityId, professionalId?, scheduledAt, status? }
- GET /appointments/:id
- PATCH /appointments/:id { patientId?, cityId?, professionalId?, scheduledAt?, status? }
- DELETE /appointments/:id — bloqueia se houver sessão vinculada
Status: scheduled, arrived, performed, missed, rescheduled, cancelled.

### Sessões
- POST /sessions { appointmentId?, saleId?, patientId, areaIds?, sessionNumber, performedAt, applicatorId?, potency?, frequency?, technique?, energyAccumulated?, observations?, signature?, status? }
- GET /sessions?patientId=
- GET /sessions/overview?patientId=&status=&from=&to=&search=&limit= — painel consolidado:
  `{ stats: { total, completed, inProgress, cancelled, patients }, sessions: [{ ...sessão, patient: { id, fullName }, packageName, areas }] }`.
  Os `stats` ignoram o filtro de status; o filtro de status é aplicado somente à lista.
- GET /sessions/:id
- PATCH /sessions/:id { appointmentId?, saleId?, areaIds?, sessionNumber?, performedAt?, applicatorId?, potency?, frequency?, technique?, energyAccumulated?, observations?, signature?, status? }
- DELETE /sessions/:id — exclusivo da gestora; remove a sessão e recalcula o saldo consumido
Status da sessão: completed, in_progress, cancelled (padrão: completed).
- `saleId` vincula a sessão ao pacote vendido para a paciente.
- `areaIds` informa as áreas aplicadas (ex.: axila, buço). Só são aceitas áreas do pacote da venda.
- Ao criar/atualizar como `completed`, o backend valida e desconta o saldo por área. Cada sessão concluída consome uma unidade de cada área informada.
- A assinatura é opcional e pode ser uma imagem em data URL (desenho no tablet/celular ou nome digitado convertido em assinatura) ou texto legado. Tamanho máximo: 120.000 caracteres.
- A resposta das sessões inclui `saleId` e `areas: [{ id, name }]`.


### Áreas
- GET /areas — lista o catálogo (axila, buço, virilha…)
- POST /areas { name } (gestora)
- GET /areas/:id
- PATCH /areas/:id { name } (gestora)
- DELETE /areas/:id (gestora) — bloqueia se a área estiver em pacotes ou sessões

### Pacotes
- GET /packages — lista pacotes com `items: [{ areaId, areaName, sessionsCount }]`
- POST /packages { name, items: [{ areaId, sessionsCount }] } (gestora)
- GET /packages/:id
- PATCH /packages/:id { name?, items? } (gestora)
- DELETE /packages/:id (gestora) — bloqueia se o pacote já foi vendido

### Vendas
- GET /sales?patientId= — vendas da paciente com saldo por área:
  `areas: [{ areaId, areaName, sessionsCount, used, remaining }]`
- POST /sales { patientId, packageId, consultantId?, value, discount? } (gestora, vendas)
- GET /sales/:id
- PATCH /sales/:id { consultantId?, value?, discount? } (gestora, vendas)
- DELETE /sales/:id (gestora) — bloqueia se houver tratamentos, sessões ou pagamentos vinculados

### Pagamentos
- Não será implementado módulo de pagamentos. As compras são lançadas em `/sales` e o faturamento é acompanhado pela gestora.

## IDs e versionamento
- UUIDs estáveis gerados no servidor; version e timestamps em todas entidades.

## Erros
- Formato padronizado via filtro de exceções; códigos HTTP convencionais.

## Offline
- Não há suporte a offline/sincronização. O sistema é totalmente web.
EOF
echo done