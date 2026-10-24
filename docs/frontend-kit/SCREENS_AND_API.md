# Telas e integração com a API

## 1. Contrato confirmado

Fonte: controllers, DTOs e services atuais do backend. As rotas protegidas exigem:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

- Base local: `http://localhost:3000`, sem prefixo `/api`.
- Swagger: `GET /docs`.
- CORS: desenvolvimento permite portas locais comuns (`5173`, `4173`). Em produção, o backend deve receber `CORS_ORIGINS` com as origens exatas.
- Login retorna `{ accessToken }`; token JWT expira em 1 dia. Não há rota de refresh nem logout no servidor.
- A resposta de erro tem `{ statusCode, message, timestamp }`; `message` pode ser string ou estrutura do Nest.
- `GET /patients` retorna `{ data, meta: { page, limit, total, totalPages } }`.
- `GET /cities`, `GET /appointments` e `GET /sessions` retornam arrays.
- Recursos individuais e mutações retornam registro diretamente quando implementado; não assumir envelope `{ data }`.
- Campos são filtrados por DTO: campos extras podem resultar em `400`.

Antes de implementar ou atualizar uma integração, consultar `/docs` no backend alvo e comparar com esta referência. Quando documentação e código divergirem, não adivinhar: registrar a divergência e confirmar a API executável.

## 2. Endpoints disponíveis

| Método/rota | Acesso observado | Uso no frontend |
|---|---|---|
| `GET /health` | Público | Diagnóstico; não é dashboard |
| `POST /auth/login` | Público | Login por e-mail/senha |
| `POST /auth/google` | Público | Login com ID token Google, se o provedor for configurado |
| `GET /auth/me` | JWT | Identidade, nome, e-mail e perfil da sessão |
| `POST /auth/register/request-pin` | `gestora` | Solicitar PIN de cadastro |
| `POST /auth/register/verify` | `gestora` | Validar PIN e criar usuário do perfil `vendas` |
| `GET /cities` | JWT | Listar cidades |
| `GET /cities/:id` | JWT | Consultar cidade |
| `POST /cities` | `gestora` | Criar cidade |
| `PATCH /cities/:id` | `gestora` | Editar cidade |
| `DELETE /cities/:id` | `gestora` | Remover cidade |
| `GET /patients?page=&limit=&search=` | JWT | Buscar/listar pacientes com paginação |
| `GET /patients/:id` | JWT | Consultar paciente |
| `POST /patients` | `gestora`, `vendas` | Cadastrar paciente |
| `PATCH /patients/:id` | `gestora`, `vendas` | Editar paciente |
| `DELETE /patients/:id` | `gestora` | Remover paciente |
| `GET /appointments?from=&to=&cityId=&professionalId=` | JWT | Consultar agendamentos |
| `GET /appointments/:id` | JWT | Consultar agendamento |
| `POST /appointments` | `gestora`, `vendas`, `aplicadora` | Criar agendamento |
| `PATCH /appointments/:id` | `gestora`, `vendas`, `aplicadora` | Atualizar dados/status |
| `GET /sessions?patientId=` | JWT | Histórico de sessões por paciente |
| `GET /sessions/:id` | JWT | Consultar sessão |
| `POST /sessions` | `gestora`, `aplicadora` | Registrar sessão realizada |

O guard de papel no servidor é a autoridade de acesso. A interface pode ocultar/desabilitar ações para melhorar UX, mas jamais é o controle de segurança.

## 3. Matriz de telas

| Tela/fluxo | Estado de API | Escopo recomendado |
|---|---|---|
| Login | Implementado | E-mail/senha; chamar `/auth/login`, depois `/auth/me`; exibir erros de autenticação |
| Login Google | Parcial/opcional | Só mostrar quando `GOOGLE_CLIENT_ID` e login Google estiverem configurados no ambiente |
| Estrutura autenticada | Implementado | Identidade/perfil via `/auth/me`; navegação para módulos disponíveis |
| Lista de cidades | Implementado | `GET /cities`; estados carregando/vazio/erro |
| Cadastro/edição de cidade | Implementado, gestora | Formulário `name`; carregar a lista após sucesso |
| Lista de pacientes | Implementado | `GET /patients?page=&limit=&search=`; busca por nome/CPF; paginação |
| Cadastro/edição de paciente | Implementado, gestora/vendas | Campos descritos na seção 4; tratar CPF inválido, duplicado e cityId inválido |
| Detalhe de paciente | Implementado | `/patients/:id`; seção de histórico carrega `/sessions?patientId=...` |
| Agenda/lista de agendamentos | Implementado em dados | Consultar filtros; não há calendário otimizado, join de nomes ou API de profissionais |
| Criar/editar agendamento | Implementado | Campos do DTO; atualizar lista após resposta; não pressupor histórico de reagendamento |
| Registro de sessão | Implementado | Ação disponível para gestora/aplicadora; enviar o DTO da seção 4 |
| Fluxo de cadastro por PIN | Implementado com limitações | Duas etapas para a gestora, se e-mail estiver configurado; não tratar como fluxo de recuperação de senha |
| Dashboard com KPIs | Não há endpoint de agregação | Não inventar vendas, metas, faturamento ou gráfico; propor apenas após decisão e fontes de dados |
| Usuários/permissões | Sem endpoints de consulta/CRUD | Não criar tela de gestão de usuários; fluxo PIN cria `vendas`, não perfis arbitrários |
| Pacotes, áreas, vendas, pagamentos e leads | Sem endpoints REST | Não criar telas que salvem dados fictícios nem alegar que funcionam |
| Sincronização offline | Não funcional para o produto | Não usar `/sync`; o usuário decidiu não utilizar modo offline |

## 4. Campos e fluxos

### Login

Request:

```json
{ "email": "usuario@exemplo.com", "password": "senha" }
```

Fluxo:

1. Enviar `POST /auth/login`.
2. Guardar o `accessToken` de acordo com uma estratégia de sessão segura escolhida após inspecionar o frontend. O backend atualmente exige Bearer token; não existe cookie HttpOnly emitido por ele.
3. Chamar `GET /auth/me` para obter perfil e identidade.
4. Se `/auth/me` falhar com `401`, limpar credenciais locais e exigir novo login.
5. No logout do frontend, limpar o token e estado local; não existe endpoint de logout/revogação.

Não gravar o token em logs, URLs, mensagens de erro, analytics ou telemetria. A escolha entre memória e persistência local é decisão de segurança do frontend e deve ser documentada. Nunca armazenar um segredo de serviço Supabase ou segredo JWT no navegador.

### Paciente

`POST /patients`:

```json
{
  "fullName": "Nome de teste fictício",
  "birthDate": "1990-01-01",
  "cpf": "52998224725",
  "address": "Endereço fictício",
  "cityId": "uuid-de-cidade",
  "whatsapp": "11999999999"
}
```

- Obrigatórios no DTO: `fullName`, `birthDate`, `cpf`, `address`, `cityId`; `whatsapp` é opcional.
- O backend valida os dígitos do CPF e salva apenas números. CPF duplicado pode resultar em `409`; CPF inválido, em `400`.
- Para selecionar cidade, carregar `/cities`; o identificador deve ser UUID existente.
- `GET /patients` usa página a partir de 1, `limit` de 1 a 100 (padrão 20) e busca por nome/CPF.
- Usar dados fictícios em fixtures, exemplos e screenshots.

### Agendamento

`POST /appointments`:

```json
{
  "patientId": "uuid-de-paciente",
  "cityId": "uuid-de-cidade",
  "professionalId": "uuid-opcional",
  "scheduledAt": "2026-11-05T13:30:00.000Z"
}
```

- `patientId`, `cityId` e `scheduledAt` são obrigatórios; `professionalId` é opcional.
- Status possíveis: `scheduled`, `arrived`, `performed`, `missed`, `rescheduled`, `cancelled`. O backend atualmente aceita status no create e no patch.
- Filtros: `from`, `to`, `cityId`, `professionalId`. `from` e `to` são comparações de instante inclusivas.
- `professionalId` é UUID de usuário, mas não existe endpoint de listagem de usuários. Não fabricar dropdown de profissionais a partir de nomes ou IDs fixos; quando o frontend não tiver fonte confiável, deixar o campo opcional ou sinalizar a dependência ao responsável.
- O conflito implementado é igualdade exata do horário para o mesmo profissional; não anunciar verificação por duração/sobreposição.
- A API não retorna dados expandidos de paciente/profissional nem preserva uma trilha completa de remarcações. Não apresentar isso como funcionalidade.
- O intervalo de 45 dias não é imposto. Não calcular automaticamente a próxima sessão.

### Sessão realizada

`POST /sessions` aceita:

```json
{
  "appointmentId": "uuid-opcional-do-agendamento",
  "patientId": "uuid-da-paciente",
  "sessionNumber": "1",
  "performedAt": "2026-11-05T14:00:00.000Z",
  "applicatorId": "uuid-opcional-do-usuario",
  "potency": "texto",
  "frequency": "texto",
  "technique": "texto",
  "energyAccumulated": "texto",
  "observations": "texto",
  "signature": "conteudo-capturado-pelo-frontend"
}
```

- Obrigatórios: `patientId`, `sessionNumber`, `performedAt`. Os demais campos listados são opcionais no DTO atual.
- Com `appointmentId`, o backend confere se existe e pertence à paciente, então marca o agendamento como `performed`.
- Não concluir que a assinatura é prova legal de identidade; captura, evidência, obrigatoriedade, proteção e retenção continuam exigindo decisão operacional.
- A assinatura e demais dados sensíveis nunca devem aparecer em logs, URLs, fixtures ou mensagens de erro.

### Cadastro por PIN

- `POST /auth/register/request-pin`: `{ "email": "...", "name": "..." }`.
- `POST /auth/register/verify`: `{ "email": "...", "pin": "123456", "password": "...", "name": "..." }`.
- Ambas as rotas requerem sessão com papel `gestora`.
- O PIN expira em 10 minutos no código e fica em memória do processo; não mostrar PIN na interface, não criar reenvio contínuo e informar falha de envio.
- O fluxo atual cria somente usuários com papel `vendas`.

## 5. Autorização na experiência

| Papel recebido em `/auth/me` | Ações liberadas pelo backend |
|---|---|
| `gestora` | CRUD de cidades; criar/editar/remover pacientes; criar/editar agendamentos; criar sessões; pedir/verificar PIN |
| `vendas` | Criar/editar pacientes; criar/editar agendamentos |
| `aplicadora` | Criar/editar agendamentos; registrar sessões |

Todas as roles autenticadas podem consultar cidades, pacientes, agendamentos e sessões. As permissões não incluem escopo por cidade. Este mapa descreve os decorators atuais, não uma aprovação final de permissões de negócio.

Na UI:

- ocultar/desabilitar apenas ações incompatíveis com o papel atual;
- se o backend retornar `403`, manter o servidor como autoridade e exibir mensagem clara;
- não inferir papel de conteúdo do token quando `/auth/me` está disponível;
- não criar mudança de papel, convite ou tela de usuários não suportados pela API.

## 6. Estados de interface e erros

Cada tela com dados remotos deve contemplar:

- carregando (sem duplicar requisições);
- carregada com dados;
- vazio (orientação para próxima ação quando houver);
- erro de rede/servidor com opção de tentar novamente;
- operação em andamento e confirmação apenas após sucesso;
- falta de autorização (`403`) e sessão expirada (`401`).

Tratar `message` como dado variável, não concatenar objetos/arrays como se fossem texto. Não renderizar HTML vindo de respostas. Evitar retentativa automática de mutações, que pode criar duplicações.

## 7. Não implementar por inferência

- Sem offline, IndexedDB, fila local, badge de pendências ou chamadas a `/sync`.
- Sem API de venda, pacote, pagamento, lead, meta, relatório ou dashboard financeiro.
- Sem lista de aplicadoras/usuários até existir endpoint/fonte aprovada.
- Sem impor intervalo entre sessões, duração do procedimento, expediente, rota, dias por cidade ou disponibilidade.
- Sem transições de status inventadas ou lógica de “sessão contabilizada”.
- Sem identidade visual oficial, logo, nome de pessoa ou conteúdo comercial inventado. Use os tokens propostos como fallback e solicite assets oficiais quando necessários.

Se uma tela solicitada depender de qualquer item acima, implemente somente o que o contrato permite e registre a dependência; não use mocks como se fossem dados reais.
