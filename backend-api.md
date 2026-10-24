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
- POST /sessions { appointmentId?, patientId, sessionNumber, performedAt, applicatorId?, potency?, frequency?, technique?, energyAccumulated?, observations?, signature? }
- GET /sessions?patientId=
- GET /sessions/:id

### Sync (offline)
- POST /sync { operations: [{ idempotencyKey, entityType, action, payload }] }
- Resposta: { results: [{ idempotencyKey, status: applied|duplicate|conflict|error }] }

### Pacotes/Áreas/Vendas/Pagamentos
- Entidades: areas, packages (sessionsCount), packageAreas, sales, payments.
- Endpoints a serem expostos conforme módulos (a implementar conforme necessidade).

## IDs e versionamento
- UUIDs estáveis gerados no servidor; version e timestamps em todas entidades.

## Erros
- Formato padronizado via filtro de exceções; códigos HTTP convencionais.

## Offline
- Idempotência por idempotencyKey; conflitos retornados explicitamente.
EOF
echo done