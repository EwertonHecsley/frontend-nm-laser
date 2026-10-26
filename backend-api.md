# Backend CRM NM Laser — Documentação para consumo do Frontend

Base URL: `http://localhost:3030` (configurável via env). Autenticação: JWT Bearer em todas as rotas exceto `/auth/login` e `/health`.

## Autenticação
- POST /auth/login — body `{ email, password }` → `{ accessToken }`.
- Enviar `Authorization: Bearer <token>`.

## Perfis (roles): gestora, vendas, aplicadora.

## Módulos e endpoints

### Cidades
- GET /cities — lista
- POST /cities { name } (gestora, vendas)
- GET /cities/:id
- PATCH /cities/:id { name }

### Pacientes
- GET /patients?page=&limit=&search=
- POST /patients { fullName, birthDate, cpf, address, cityId, whatsapp? }
- GET /patients/:id
- PATCH /patients/:id

### Agendamentos
- GET /appointments?from=&to=&cityId=&professionalId=
- POST /appointments { patientId, cityId, professionalId?, scheduledAt, status? }
- GET /appointments/:id
- PATCH /appointments/:id { patientId?, cityId?, professionalId?, scheduledAt?, status? }
Status: scheduled, arrived, performed, missed, rescheduled, cancelled.

### Sessões
- POST /sessions { appointmentId?, saleId?, patientId, areaIds?, sessionNumber, performedAt, applicatorId?, potency?, frequency?, technique?, energyAccumulated?, observations?, signature?, status? }
- GET /sessions?patientId=
- GET /sessions/overview?patientId=&status=&from=&to=&search=&limit= — painel consolidado:
  `{ stats: { total, completed, inProgress, cancelled, patients }, sessions: [{ ...sessão, patient: { id, fullName }, packageName, areas }] }`.
  Os `stats` ignoram o filtro de status; o filtro de status é aplicado somente à lista.
- GET /sessions/:id
- PATCH /sessions/:id { appointmentId?, saleId?, areaIds?, sessionNumber?, performedAt?, applicatorId?, potency?, frequency?, technique?, energyAccumulated?, observations?, signature?, status? }
Status da sessão: completed, in_progress, cancelled (padrão: completed).
- `saleId` vincula a sessão ao pacote vendido para a paciente.
- `areaIds` informa as áreas aplicadas (ex.: axila, buço). Só são aceitas áreas do pacote da venda.
- Ao criar/atualizar como `completed`, o backend valida e desconta o saldo por área. Cada sessão concluída consome uma unidade de cada área informada.
- A resposta das sessões inclui `saleId` e `areas: [{ id, name }]`.


### Sync (offline)
- POST /sync { operations: [{ idempotencyKey, entityType, action, payload }] }
- Resposta: { results: [{ idempotencyKey, status: applied|duplicate|conflict|error }] }

### Áreas
- GET /areas — lista o catálogo (axila, buço, virilha…)
- POST /areas { name } (gestora)
- GET /areas/:id
- PATCH /areas/:id { name } (gestora)

### Pacotes
- GET /packages — lista pacotes com `items: [{ areaId, areaName, sessionsCount }]`
- POST /packages { name, items: [{ areaId, sessionsCount }] } (gestora)
- GET /packages/:id
- PATCH /packages/:id { name?, items? } (gestora)

### Vendas
- GET /sales?patientId= — vendas da paciente com saldo por área:
  `areas: [{ areaId, areaName, sessionsCount, used, remaining }]`
- POST /sales { patientId, packageId, consultantId?, value, discount? } (gestora, vendas)
- GET /sales/:id
- PATCH /sales/:id { consultantId?, value?, discount? } (gestora, vendas)

### Pagamentos
- Entidades no schema: payments (sem endpoints implementados).

## IDs e versionamento
- UUIDs estáveis gerados no servidor; version e timestamps em todas entidades.

## Erros
- Formato padronizado via filtro de exceções; códigos HTTP convencionais.

## Offline
- Idempotência por idempotencyKey; conflitos retornados explicitamente.
EOF
echo done