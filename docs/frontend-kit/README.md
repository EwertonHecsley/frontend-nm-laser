# Kit de frontend — CRM NM Laser

Pacote portátil para orientar o desenvolvimento do frontend do CRM. Foi escrito para ser copiado para o repositório da aplicação frontend e orientar agentes de código sem transformar lacunas da API ou decisões pendentes de negócio em fatos.

## Conteúdo

- [Design system](./DESIGN_SYSTEM.md): tokens visuais, componentes, estados, acessibilidade e regras de uso.
- [Telas e contrato da API](./SCREENS_AND_API.md): inventário de telas, fluxos e endpoints confirmados no backend.
- [Instruções gerais para agentes](./AGENTS.md): regras que devem acompanhar qualquer tarefa de frontend.
- [Agente de implementação](./.github/agents/frontend-implementer.agent.md): persona especializada para construir telas e fluxos.

## Como usar no novo projeto

1. Copie este diretório para o repositório frontend, por exemplo como `docs/frontend-kit/`.
2. Copie `docs/frontend-kit/AGENTS.md` para a raiz do frontend como `AGENTS.md`. Se o projeto usar instruções do Copilot, pode colocá-lo como `.github/copilot-instructions.md`; não mantenha os dois arquivos com regras duplicadas.
3. Copie `docs/frontend-kit/.github/agents/frontend-implementer.agent.md` para `.github/agents/frontend-implementer.agent.md` para disponibilizar o agente no seletor do VS Code.
4. Peça ao agente para ler este README, `DESIGN_SYSTEM.md` e `SCREENS_AND_API.md` antes de alterar a interface.
5. Confirme a URL real da API no ambiente local e de deploy. A base local atual é `http://localhost:3000`; o backend não tem prefixo global `/api`.

O pacote é independente do framework. React, Vite, Tailwind, bibliotecas de componentes, roteador, armazenamento do token e hospedagem **não são especificados pelo backend**; o agente deve primeiro inspecionar o frontend de destino e seguir as escolhas já existentes.

## Fonte e nível de confiança

O contrato foi conferido nos controllers, DTOs e serviços existentes em `src/modules/` no backend. O frontend deve tratar o código executável como fonte do contrato, não assumir que uma tabela do banco significa que existe uma API para ela.

Legenda usada na documentação:

- **Implementado:** rota presente no código do backend.
- **Proposta visual:** decisão de interface sugerida neste kit, não requisito de negócio.
- **Pendente/não disponível:** não implementar como funcionalidade real sem confirmação ou endpoint correspondente.

O backend pode evoluir. Antes de integrar, conferir Swagger em `/docs` e validar as rotas no ambiente-alvo. Não copiar credenciais, dados de pacientes ou segredos deste repositório.
