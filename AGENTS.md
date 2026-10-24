# Instruções para agentes de frontend — CRM NM Laser

Leia `docs/frontend-kit/README.md`, `DESIGN_SYSTEM.md` e `SCREENS_AND_API.md` antes de planejar ou editar telas. Estas regras acompanham o kit quando ele for copiado para o repositório frontend.

## Fonte da verdade

1. Inspecione o repositório frontend de destino antes de escolher framework, roteador, CSS, estado, fetch ou componentes. Reutilize a stack já instalada.
2. Para integração, confira Swagger e código backend atual. O contrato de referência deste kit descreve apenas rotas presentes no backend examinado; não invente endpoints ou campos.
3. Use a legenda Implementado / Proposta visual / Pendente. Não transformar proposta de UI em regra de negócio.
4. Se API e este documento divergirem, reporte a divergência e baseie-se no backend executável; não contorne contrato com campos fictícios.
5. Quando o pedido depender de regra pendente, não endureça a regra no frontend. Peça confirmação ou deixe o comportamento explicitamente configurável e temporário.

## Regras não negociáveis

- O modo offline foi descartado pelo responsável: não implemente IndexedDB, fila de sincronização, retries de escrita em background nem use `/sync`.
- Não invente módulos de vendas, pacotes, pagamentos, leads, metas, relatórios ou listagem de usuários: não há endpoints correspondentes.
- Não use dados pessoais reais de pacientes em testes, exemplos, seeds, screenshots ou logs. Use dados claramente fictícios.
- Não exponha CPF completo, assinatura, token, credenciais ou dados de atendimento em logs, URLs, analytics ou mensagens de erro.
- Não armazene segredos de backend/Supabase no cliente. Uma chave pública do Supabase só poderá ser usada quando a integração com Supabase estiver definida; nunca usar `service_role` no frontend.
- Não considerar ocultar botões como autorização; a API decide acesso. Usar o perfil de `/auth/me` para a experiência e tratar `401`/`403`.
- Não apresentar dados mockados como reais ou como resultado de sucesso do servidor.
- Não fazer deploy, commits, mudanças destrutivas ou adicionar dependências sem pedido/autorização.

## Como implementar uma tela

1. Resuma o objetivo, a rota da UI, as rotas HTTP confirmadas e o papel que pode executar ações.
2. Liste os estados de carregamento, vazio, erro, não autorizado e sucesso relevantes.
3. Verifique os tipos/DTOs e o envelope real de resposta. A API não possui um envelope uniforme.
4. Implemente a menor fatia vertical coerente com padrões existentes e tokens do design system.
5. Garanta acessibilidade básica: labels, teclado, foco, mensagens associadas, contraste e status não comunicados só por cor.
6. Evite escritas repetidas e não repita automaticamente mutações após erro de rede.
7. Execute testes, lint e build pertinentes do projeto frontend. Relate resultados e limitações.
8. Atualize documentação do contrato/tela caso a mudança revele uma divergência confirmada; não altere o contrato do backend por conta própria.

## Regras de integração

- Configurar base URL via variável de ambiente apropriada ao framework existente; não fixar URL de produção no código.
- Base local atual: `http://localhost:3000`; nenhuma rota tem prefixo `/api`.
- Incluir Bearer token em rotas autenticadas e nunca registrar seu valor.
- Não assumir refresh token ou logout remoto; não há endpoints para isso.
- Em falha `401`, limpar a sessão local e pedir login. Em `403`, explicar falta de acesso. Em `409`, mostrar conflito de forma contextual. Em `5xx`/rede, não simular sucesso.
- Valores de `from`, `to`, `scheduledAt`, `performedAt` devem preservar instante/timezone; serializar em ISO compatível com o backend.
- CORS local aceita origens comuns de Vite (`localhost` e `127.0.0.1`, portas 5173/4173). Em produção o backend precisa de `CORS_ORIGINS` com a origem real.
- A futura troca para Supabase altera conexão/infraestrutura, mas não autoriza o frontend a contornar API e acessar tabelas diretamente. Integrar diretamente ao Supabase somente após decisão explícita sobre RLS, autenticação e exposição pública.

## Critérios de conclusão

- A tela funciona com a API real, ou está explicitamente marcada como bloqueada por endpoint inexistente.
- Sem valores ou estados inventados apresentados como funcionais.
- Formulários validam o que for visível no contrato e exibem as respostas do servidor com segurança.
- Testes relevantes passam; build e lint passam ou falhas existentes são descritas.
- Estados de carregamento, vazio, erro e autorização foram considerados.
- Nenhum dado pessoal ou segredo aparece nos artefatos criados.
