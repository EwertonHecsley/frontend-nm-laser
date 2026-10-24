# Design system — CRM NM Laser

Este documento propõe uma base visual consistente para o CRM. **Tokens e componentes são propostas de interface**, não requisitos de negócio. Preserve a identidade visual que já existir no frontend de destino; adote estes valores apenas quando o projeto não tiver um sistema definido.

## Princípios

1. **Clareza operacional:** priorizar agenda, identificação da paciente e ações frequentes, sem sobrecarregar a tela.
2. **Estado explícito:** todo status deve ter texto e indicador visual; nunca depender apenas de cor.
3. **Dados confiáveis:** exibir datas, horários, paginação e erros a partir da API; não preencher falhas com dados inventados.
4. **Acessibilidade:** contraste adequado, foco visível, navegação por teclado e rótulos associados aos campos.
5. **Privacidade:** mostrar somente os dados pessoais necessários à tarefa; evitar CPF completo fora do cadastro/edição autorizados.
6. **Responsivo:** tornar agenda, formulários e tabelas utilizáveis em desktop e tablet; não presumir um breakpoint específico do dispositivo da equipe.

## Tokens propostos

### Cores

| Token | Valor | Uso proposto |
|---|---|---|
| `color-brand-700` | `#155E63` | Marca, navegação ativa e ações principais |
| `color-brand-600` | `#0F766E` | Links e elementos interativos |
| `color-brand-50` | `#F0FDFA` | Fundo de destaque discreto |
| `color-neutral-950` | `#17212B` | Texto principal |
| `color-neutral-700` | `#465462` | Texto secundário |
| `color-neutral-500` | `#718096` | Texto auxiliar e ícones não essenciais |
| `color-neutral-200` | `#DCE3E8` | Bordas e divisores |
| `color-neutral-100` | `#F3F6F8` | Fundo de página/seções |
| `color-neutral-0` | `#FFFFFF` | Superfícies e campos |
| `color-success-700` | `#166534` | Confirmações |
| `color-warning-700` | `#92400E` | Avisos |
| `color-danger-700` | `#B42318` | Erros e ações destrutivas |
| `color-focus` | `#2563EB` | Anel de foco acessível |

O par texto/fundo deve atingir contraste WCAG AA; validar cada uso final, especialmente badges e texto pequeno. Não usar `color-neutral-500` para texto pequeno sobre branco sem verificar contraste.

### Tipografia

- Fonte de interface proposta: `Inter`, com fallback `system-ui, sans-serif`.
- Texto base: `16px` / `1.5`.
- Texto auxiliar: mínimo `14px` / `1.4`.
- Título de página: `24–30px`, peso `600–700`.
- Título de seção: `18–20px`, peso `600`.
- Labels de formulário: `14–16px`, peso `500–600`.
- Valores tabulares e datas: usar alinhamento consistente; não reduzir fonte para acomodar tabelas, prefira rolagem horizontal ou layout alternativo.

### Espaçamento, raios e elevação

- Escala de espaçamento: `4, 8, 12, 16, 24, 32, 48, 64px`.
- Raio de controle: `8px`; cartão: `12px`; modal: `16px`; badge: pill.
- Bordas de `1px`; sombras leves apenas para menus, popovers e modais.
- Conteúdo principal com largura fluida e limite confortável; largura exata fica a cargo do layout já existente.

### Exemplo de tokens CSS

```css
:root {
  --color-brand-700: #155e63;
  --color-brand-600: #0f766e;
  --color-brand-50: #f0fdfa;
  --color-text: #17212b;
  --color-text-muted: #465462;
  --color-border: #dce3e8;
  --color-surface: #ffffff;
  --color-page: #f3f6f8;
  --color-danger: #b42318;
  --color-focus: #2563eb;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --radius-control: 8px;
  --radius-card: 12px;
}
```

O exemplo é uma referência; não adicione CSS global ou dependências sem verificar a arquitetura do frontend destino.

## Componentes e comportamento

### Navegação e estrutura

- Cabeçalho ou sidebar com identidade do produto, navegação para módulos disponíveis e identidade/perfil retornados pela API.
- Não exibir opções de vendas/pacotes/leads como se funcionassem: não há endpoints implementados para esses módulos.
- Em telas menores, usar navegação compacta acessível; não esconder a única forma de acessar funções importantes.
- Informar o ambiente de teste quando aplicável; não mostrar segredos ou tokens na interface.

### Botões

- **Primário:** uma ação principal por formulário/tela (por exemplo, “Salvar paciente”).
- **Secundário:** ações alternativas não destrutivas.
- **Destrutivo:** remover/excluir, com confirmação contextual e mensagem clara. Nunca executar exclusão por clique acidental.
- Mostrar estado ocupado e bloquear envio repetido enquanto a requisição estiver em andamento.
- Não representar ações impossíveis com botões ativos; desabilitados devem ter explicação acessível.

### Formulários

- Label persistente acima do campo; placeholder serve apenas como exemplo, não como label.
- Indicar campos obrigatórios no formulário e exibir erros próximos ao campo.
- Preservar o que a pessoa digitou quando a API retorna erro.
- Exibir confirmação de sucesso apenas após resposta bem-sucedida do servidor.
- Máscara de CPF/telefone é apresentação; enviar valores compatíveis com validação do backend. O backend normaliza CPF para dígitos e verifica os dígitos validadores.
- Datas devem ser serializadas em formato ISO aceito pelo backend e apresentadas no fuso local; não mudar o instante ao converter fuso.

### Tabelas, listas e agenda

- Indicar carregamento, vazio, erro e paginação em separado.
- Preservar filtros de período/cidade na URL se o roteador existente permitir.
- Status de agendamento deve mostrar rótulo legível e cor/ícone secundários.
- A API de agendamentos não expande paciente ou profissional; não assumir nomes nos registros retornados.
- Não criar disponibilidade, duração ou detecção de sobreposição no frontend: a API atual não expõe esses contratos.

### Feedback

- Sucesso: feedback breve e específico após confirmação da API.
- Erro: explicar a ação que falhou e oferecer nova tentativa quando seguro.
- `401`: limpar sessão local e redirecionar ao login, sem repetir a operação automaticamente.
- `403`: indicar falta de permissão; não sugerir que a pessoa pode corrigir isso alterando o cliente.
- `404`: informar que o registro não foi encontrado ou não está mais disponível.
- `409`: explicar conflito (por exemplo, horário indisponível ou CPF duplicado) quando a resposta indicar essa causa.
- `5xx` ou falha de rede: informar indisponibilidade; não simular sucesso e não enfileirar operações offline.

## Cores dos status da agenda

As cores abaixo foram indicadas no levantamento de negócio; o **status textual vindo da API permanece a fonte de verdade**. Associar sempre texto, cor e, se útil, ícone. Os valores hex são propostas para implementar essa associação.

| Status da API | Texto sugerido | Cor proposta |
|---|---|---|
| `scheduled` | Agendada | Neutro `#475569` — o levantamento não definiu uma cor |
| `arrived` | Chegou / aguardando | Rosa `#BE185D` |
| `performed` | Realizada | Azul `#1D4ED8` |
| `missed` | Faltou | Laranja `#C2410C` |
| `rescheduled` | Remarcada | Amarelo escuro `#854D0E` em fundo claro |
| `cancelled` | Cancelada | Vermelho `#B42318` |

Não inventar estados `no-show-unjustified` ou `counted`: o significado/status correspondente não está implementado como valor de API. “Sessão realizada” é um registro separado; não inferir detalhes da evolução somente pelo status.

## Acessibilidade mínima

- Meta WCAG 2.2 AA para fluxos principais.
- Todos os controles acessíveis por teclado; foco sempre visível.
- Usar `label`, descrição e mensagem de erro programaticamente associadas ao campo.
- Modais mantêm foco, fecham de modo previsível e anunciam o título.
- Não comunicar status apenas com cor.
- Respeitar preferência de movimento reduzido; evitar animação necessária para compreender uma ação.
- Tabelas têm cabeçalhos; imagens/ícones informativos têm texto alternativo ou nome acessível.
