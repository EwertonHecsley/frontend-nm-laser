# CRM NM Laser — API Reference para o Frontend

**Versão do documento:** 1.0  
**Baseado no código-fonte enviado em 21/10/2026.**  
**Objetivo:** orientar a integração do frontend com os endpoints que aparecem implementados no snapshot analisado.

> Importante: este documento descreve o comportamento observável no código fornecido, não garante que o backend tenha sido executado ou testado. Recursos que existem apenas no schema do banco ou em documentação interna não são considerados endpoints disponíveis.

## 1. Estado de implementação

### Endpoints encontrados no código

| Método | Rota | Disponibilidade no código | Acesso |
|---|---|---|---|
| POST | `/auth/login` | Implementado | Público |
| GET | `/health` | Implementado e marcado `@Public()` | Público |
| GET | `/cities` | Implementado | Qualquer usuário autenticado |
| POST | `/cities` | Implementado | `gestora` |
| GET | `/cities/:id` | Implementado | Qualquer usuário autenticado |
| PATCH | `/cities/:id` | Implementado | `gestora` |
| DELETE | `/cities/:id` | Implementado | `gestora` |
| GET | `/patients` | Implementado | Qualquer usuário autenticado |
| POST | `/patients` | Implementado | `gestora`, `vendas` |
| GET | `/patients/:id` | Implementado | Qualquer usuário autenticado |
| PATCH | `/patients/:id` | Implementado | `gestora`, `vendas` |
| DELETE | `/patients/:id` | Implementado | `gestora` |
| GET | `/appointments` | Implementado | Qualquer usuário autenticado |
| POST | `/appointments` | Implementado | `gestora`, `vendas`, `aplicadora` |
| GET | `/appointments/:id` | Implementado | Qualquer usuário autenticado |
| PATCH | `/appointments/:id` | Implementado | `gestora`, `vendas`, `aplicadora` |
| POST | `/sessions` | Implementado | `gestora`, `aplicadora` |
| GET | `/sessions?patientId=...` | Implementado | Qualquer usuário autenticado |
| GET | `/sessions/:id` | Implementado | Qualquer usuário autenticado |
| PATCH | `/sessions/:id` | Implementado | `gestora`, `aplicadora` |
| POST | `/sync` | Módulo registrado no `AppModule`; serviço ainda não aplica payload às entidades | Parcialmente disponível (idempotência apenas) |

### Endpoints que NÃO estão implementados neste snapshot

Não foram encontrados controllers/endpoints de API para:
- catálogo de áreas;
- cadastro/consulta de tipos de pacote;
- relacionamento de áreas do pacote;
- vendas;
- pagamentos/parcelas;
- gestão de usuários;
- consulta de agenda com dados expandidos da paciente/profissional;
- fluxo de criação de uma remarcação que preserve e relacione o agendamento anterior.

Essas tabelas/entidades existirem no schema Drizzle não significa que a API REST correspondente esteja disponível.

## 2. URL, autenticação e formato

- Base local padrão: `http://localhost:3030`
- Não há prefixo global `/api` no `main.ts`.
- JSON é o formato de entrada/saída esperado.
- Todas as rotas são protegidas por JWT global, exceto `/auth/login`.
- Cabeçalho após login:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

O token é emitido com expiração de 1 dia no código atual. O payload inclui `sub` (ID do usuário) e `role`.

### Login

`POST /auth/login`

Body:
```json
{
  "email": "gestora@example.com",
  "password": "password123"
}
```

Validação: `email` deve ser e-mail válido; `password` deve ser string com no mínimo 6 caracteres.

Resposta `200`:
```json
{
  "accessToken": "<jwt>"
}
```

Credenciais incorretas resultam em `401 Unauthorized`.

**Atenção:** o segredo JWT possui fallback `dev-secret` no código. Não utilizar esse fallback em produção; configurar `JWT_SECRET` forte e obrigatório no ambiente de produção.

## 3. Convenções de resposta e erros

### Erro

O filtro global retorna o formato:

```json
{
  "statusCode": 400,
  "message": "Mensagem ou objeto de validação",
  "timestamp": "2026-10-21T12:00:00.000Z"
}
```

O campo `message` pode ser uma string ou um array/objeto fornecido pelo NestJS, portanto o frontend não deve assumir que será sempre string.

Códigos que podem ocorrer:
- `400`: validação de entrada;
- `401`: token ausente/inválido ou credenciais incorretas;
- `403`: usuário autenticado sem o perfil exigido;
- `404`: recurso não encontrado em serviços que tratam esse caso;
- `409`: CPF duplicado ou horário ocupado, nos fluxos em que o código lança conflito;
- `500`: erro inesperado. O filtro não expõe o detalhe interno da exceção.

### Validação global

O `ValidationPipe` está configurado com:
- `whitelist: true`;
- `forbidNonWhitelisted: true`;
- `transform: true`.

Campos extras que não existam no DTO são rejeitados. O frontend deve enviar somente campos documentados para cada operação.

### Campos de auditoria

As respostas que retornam diretamente registros do Drizzle podem conter `id`, `createdAt`, `updatedAt` e `version`. `version` é atualmente uma string no schema, não um inteiro.

Não há contrato uniforme de DTO de resposta e não há garantia de que todas as entidades exponham exatamente o mesmo conjunto de campos.

## 4. Cidades

### `GET /cities`

Lista todas as cidades. Não há paginação nem filtros implementados.

Resposta: array de objetos cidade, cada um com estrutura equivalente a:
```json
{
  "id": "uuid",
  "name": "Patos",
  "createdAt": "2026-10-21T12:00:00.000Z",
  "updatedAt": "2026-10-21T12:00:00.000Z",
  "version": "1"
}
```

Os valores são ilustrativos.

### `GET /cities/:id`

Retorna uma cidade. O código atual lança um `Error('Not found')` comum quando não encontra o ID; isso pode virar `500`, não `404`. Recomenda-se corrigir o serviço para lançar `NotFoundException`.

### `POST /cities`

Permissão: `gestora`.

Body:
```json
{ "name": "Patos" }
```

`name`: string não vazia.

Resposta: registro criado.

### `PATCH /cities/:id`

Permissão: `gestora`.

Body parcial:
```json
{ "name": "Cajazeiras" }
```

### `DELETE /cities/:id`

Permissão: `gestora`.

O serviço não retorna um corpo específico após a exclusão. No código atual, também não verifica explicitamente se o registro existia antes de excluir.

## 5. Pacientes

### Modelo retornado

Os registros incluem normalmente:
```json
{
  "id": "uuid",
  "fullName": "Maria Silva",
  "birthDate": "1990-01-01T00:00:00.000Z",
  "cpf": "12345678901",
  "address": "Rua Exemplo, 123",
  "cityId": "uuid-da-cidade",
  "whatsapp": "83999999999",
  "createdAt": "2026-10-21T12:00:00.000Z",
  "updatedAt": "2026-10-21T12:00:00.000Z",
  "version": "1"
}
```
`whatsapp` pode ser `null`. Datas são serializadas em JSON como strings ISO.

### `GET /patients`

Query params:
- `page`: inteiro a partir de 1; padrão `1`;
- `limit`: inteiro de 1 a 100; padrão `20`;
- `search`: opcional; pesquisa por nome ou CPF.

Resposta:
```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "Maria Silva",
      "birthDate": "1990-01-01T00:00:00.000Z",
      "cpf": "12345678901",
      "address": "Rua Exemplo, 123",
      "cityId": "uuid-da-cidade",
      "whatsapp": null,
      "createdAt": "2026-10-21T12:00:00.000Z",
      "updatedAt": "2026-10-21T12:00:00.000Z",
      "version": "1"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### `POST /patients`

Permissão: `gestora`, `vendas`.

Body:
```json
{
  "fullName": "Maria Silva",
  "birthDate": "1990-01-01",
  "cpf": "12345678901",
  "address": "Rua Exemplo, 123",
  "cityId": "uuid-da-cidade",
  "whatsapp": "83999999999"
}
```

Obrigatórios:
- `fullName`: string não vazia;
- `birthDate`: string de data válida;
- `cpf`: string com no mínimo 11 caracteres; o código não valida os dígitos verificadores nem normaliza pontuação;
- `address`: string não vazia;
- `cityId`: UUID existente;
- `whatsapp`: opcional, string.

CPF duplicado é tratado como `409 Conflict` pelo serviço.

### `GET /patients/:id`

Retorna um registro ou `404` quando não encontrado.

### `PATCH /patients/:id`

Permissão: `gestora`, `vendas`.

Todos os campos abaixo são opcionais: `fullName`, `birthDate`, `address`, `cityId`, `whatsapp`.

**Limitação atual:** o DTO de atualização não aceita `cpf`. Para alterar CPF, é necessário definir e implementar um fluxo específico; não envie esse campo, pois campos extras são rejeitados.

### `DELETE /patients/:id`

Permissão: `gestora`. Exclusão física no código atual; não há soft delete documentado.

## 6. Agendamentos

### Status aceitos

- `scheduled`
- `arrived`
- `performed`
- `missed`
- `rescheduled`
- `cancelled`

No código, o status padrão ao criar agendamento é `scheduled`, representando um agendamento futuro. O status `arrived` deve ser usado quando a paciente já chegou à recepção.

### `GET /appointments`

Query params opcionais:
- `from`: data/hora ISO; filtra `scheduledAt >= from`;
- `to`: data/hora ISO; filtra `scheduledAt <= to`;
- `cityId`: UUID;
- `professionalId`: UUID.

Resposta: array de registros de agendamento. Não há paginação, ordenação declarada ou expansão de paciente/cidade/profissional; o frontend pode precisar buscar esses registros separadamente.

### `POST /appointments`

Permissão: `gestora`, `vendas`, `aplicadora`.

Body:
```json
{
  "patientId": "uuid-da-paciente",
  "cityId": "uuid-da-cidade",
  "professionalId": "uuid-do-usuario",
  "scheduledAt": "2026-11-05T13:30:00.000Z",
  "status": "scheduled"
}
```

Obrigatórios: `patientId`, `cityId`, `scheduledAt`. `professionalId` e `status` são opcionais.

O código tenta impedir dois agendamentos para o mesmo profissional no mesmo instante exato, retornando `409` quando encontra correspondência. Não verifica sobreposição por duração, e a verificação pode não ser suficiente para impedir condições de corrida.

### `GET /appointments/:id`

Retorna um agendamento ou `404`.

### `PATCH /appointments/:id`

Permissão: `gestora`, `vendas`, `aplicadora`.

Campos opcionais: `patientId`, `cityId`, `professionalId`, `scheduledAt`, `status`.

**Limitações relevantes para o frontend:**
- A atualização de status não aplica uma máquina de estados nem valida transições.
- O serviço não registra histórico de mudanças.
- Enviar `status: "rescheduled"` não cria automaticamente outro agendamento nem relaciona o novo ao original.
- Não há endpoint dedicado para remarcação.
- Não há regra de intervalo de 45 dias implementada neste contrato.
- O backend não vincula automaticamente a criação de sessão à mudança do agendamento para `performed`.

## 7. Sessões realizadas

### `POST /sessions`

Permissão: `gestora`, `aplicadora`.

Body:
```json
{
  "appointmentId": "uuid-do-agendamento",
  "patientId": "uuid-da-paciente",
  "sessionNumber": "1",
  "performedAt": "2026-11-05T13:35:00.000Z",
  "applicatorId": "uuid-do-usuario",
  "potency": "exemplo",
  "frequency": "exemplo",
  "technique": "exemplo",
  "energyAccumulated": "exemplo",
  "observations": "Observação da sessão",
  "signature": "conteúdo definido pela integração"
}
```

Obrigatórios: `patientId`, `sessionNumber`, `performedAt`.

Opcionais: `appointmentId`, `applicatorId`, `potency`, `frequency`, `technique`, `energyAccumulated`, `observations`, `signature`.

Os campos técnicos e assinatura são tratados como strings. O código não especifica formato da assinatura, tamanho máximo, armazenamento de arquivo ou codificação; alinhar isso antes de enviar assinatura real.

Resposta: registro criado.

### `GET /sessions?patientId=<uuid>`

Retorna uma lista de sessões da paciente. O parâmetro `patientId` deve ser informado; não há paginação.

### `GET /sessions/:id`

Retorna uma sessão ou `404`.

### `PATCH /sessions/:id`

Permissão: `gestora`, `aplicadora`.

Permite editar os dados da sessão (status, agendamento vinculado, parâmetros técnicos, número da sessão, data/hora e observações).

Body: campos opcionais a serem atualizados (`status`, `appointmentId`, `sessionNumber`, `performedAt`, `applicatorId`, `potency`, `frequency`, `technique`, `energyAccumulated`, `observations`, `signature`).

Resposta: registro atualizado.


## 8. Health check

`GET /health` retorna:
```json
{ "status": "ok" }
```

O health check está marcado como `@Public()` e não exige JWT.

## 9. Sincronização offline — bloqueada no estado atual

O código contém `SyncController`, `SyncService` e DTOs de sync, mas `SyncModule` não é importado em `AppModule`. Portanto, `POST /sync` não é registrado no snapshot enviado e não deve ser consumido pelo frontend ainda.

Além disso, o serviço de sync atual apenas grava a chave em `sync_operations` e devolve `applied`/`duplicate`. Ele não aplica o `payload` às tabelas de pacientes/agendamentos/sessões. Isso não é sincronização funcional de dados.

O contrato interno também diverge:
- `docs/sync-contract.md` usa `entity`, `action`, `payload`, `expectedVersion`;
- DTO atual usa `entityType`, `action`, `payload`, sem `expectedVersion`;
- o serviço não verifica `expectedVersion`, não implementa conflitos reais e não devolve `entityId`, `version`, `conflict` ou `error` detalhado;
- `idempotencyKey`, `entityType` e `action` são validados apenas como strings, sem regras de valores permitidos;
- os IDs são gerados pelo servidor nos registros atuais; o contrato de IDs locais do frontend ainda não está implementado nos endpoints de criação.

**Recomendação:** não ativar a fila offline contra esse endpoint até implementar e testar o contrato completo. O frontend pode construir a interface de estado offline, mas deve manter a sincronização de dados atrás de um adapter/feature flag até o contrato estar funcional.

## 10. Perfis e permissões efetivas no código

| Recurso | gestora | vendas | aplicadora |
|---|---:|---:|---:|
| Consultar cidades | Sim | Sim | Sim |
| Criar/editar/excluir cidades | Sim | Não | Não |
| Consultar pacientes | Sim | Sim | Sim |
| Criar/editar pacientes | Sim | Sim | Não |
| Excluir pacientes | Sim | Não | Não |
| Consultar agendamentos | Sim | Sim | Sim |
| Criar/editar agendamentos | Sim | Sim | Sim |
| Criar sessão | Sim | Não | Sim |
| Consultar sessões | Sim | Sim | Sim |

A tabela reflete os decorators dos controllers enviados. Ela não substitui a validação de permissões de negócio, e não há escopo por cidade implementado nos controllers examinados.

## 11. Exemplos de integração

### Login e listar pacientes (curl)

```bash
TOKEN=$(curl -s -X POST http://localhost:3030/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"gestora@example.com","password":"password123"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).accessToken")

curl 'http://localhost:3030/patients?page=1&limit=20&search=Maria' \
  -H "Authorization: Bearer $TOKEN"
```

As credenciais acima correspondem ao seed incluído no código e são apenas para ambiente local de desenvolvimento. Nunca as utilize em produção.

## 12. Pendências recomendadas antes da integração completa

### P0 — bloqueia fluxos centrais
1. Importar `SyncModule` no `AppModule` somente quando o serviço de sync estiver funcional; atualmente a rota não existe.
2. Implementar sincronização real, incluindo aplicação das operações às entidades, IDs de cliente, idempotência, versionamento e conflitos.
3. Corrigir o status padrão do agendamento para um estado apropriado de agendamento futuro, após confirmar a regra com a gestora.
4. Definir o vínculo transacional entre sessão realizada, status do agendamento e consumo do saldo.
5. Implementar endpoints/fluxos de pacotes, áreas, vendas e pagamentos se fizerem parte do MVP.

### P1 — segurança e consistência
1. Definir se `/health` deve ser público e aplicar `@Public()` se necessário.
2. Tornar erros de cidade não encontrada um `404` e padronizar exclusões.
3. Validar CPF de forma apropriada e decidir normalização.
4. Validar relações entre paciente, agendamento, cidade e profissional.
5. Definir regra para conflitos de horário e remarcação com histórico.
6. Rever o fallback `dev-secret` e exigir `JWT_SECRET` em produção.
7. Definir formato e limites para a assinatura.

### P2 — experiência do frontend
1. Adicionar ordenação e paginação à agenda quando necessário.
2. Documentar DTOs de resposta com OpenAPI decorators.
3. Criar endpoint de usuário atual (`GET /auth/me` ou equivalente) se o frontend precisar obter nome e perfil sem decodificar o JWT.
4. Documentar limites e formatos de campos com exemplos reais não sensíveis.

---
**Regra para a equipe frontend:** se um comportamento estiver listado em “limitações” ou “pendências”, não o trate como garantido pela API. Use mocks temporários claramente isolados ou aguarde o endpoint/contrato correspondente.
