# Relatório de QA — Swap Display Dash

**Data** 17/11/2026 · **Revisão** `fe86759c95c561ad20d07e5be68fa1a33994b4ab` · **Ambiente** Windows, Node.js 26.13.0, npm 11.20.0, Chrome e Playwright. A CI do projeto especifica Node.js 24.

**Parecer** Validação web parcial. As falhas confirmadas afetam a criação de pedidos e a interpretação do monitor durante uma indisponibilidade. O aceite depende da correção desses fluxos e da validação integrada em homologação.

## Defeitos confirmados

### QA-01 — Alta — O formulário de pedido trava quando a consulta da sessão falha

1. Abra **Novo pedido** como administrador e preencha os campos com dados válidos.
2. Após o formulário carregar, simule HTTP 503 na próxima chamada a `GET /auth/v1/user`.
3. Clique em **Registrar pedido**.

**Obtido** O navegador registra `Cannot read properties of null (reading 'id')`. O botão permanece desabilitado em **Registrando...** e nenhum pedido é enviado.

**Esperado** A interface deve informar o problema, preservar os campos preenchidos e liberar uma nova tentativa ou orientar a reautenticação.

**Causa no código** O formulário acessa `userData.user!.id` após `getUser()`, antes de tratar a ausência do usuário. [Fonte](https://github.com/SOZARADRION/swap-display-dash/blob/fe86759c95c561ad20d07e5be68fa1a33994b4ab/src/routes/_authenticated/novo.tsx#L52-L60)

### QA-02 — Alta — Monitor apresenta falha de leitura como ausência de pedidos

1. Abra o monitor de trocas com uma sessão de técnico.
2. Simule HTTP 503 na consulta inicial a `equipment_requests`.

**Obtido** As três colunas exibem **Sem pedidos** sem mensagem de erro.

**Esperado** O monitor deve indicar que a consulta falhou e permitir nova tentativa. A mensagem **Sem pedidos** deve aparecer após uma leitura bem-sucedida que retorne zero registros para a coluna.

**Impacto** A equipe pode interpretar uma indisponibilidade como ausência de trabalho pendente. A inspeção encontrou o mesmo tratamento da consulta no monitor de aluguéis. [Trocas](https://github.com/SOZARADRION/swap-display-dash/blob/fe86759c95c561ad20d07e5be68fa1a33994b4ab/src/routes/index.tsx#L80-L99) · [Aluguéis](https://github.com/SOZARADRION/swap-display-dash/blob/fe86759c95c561ad20d07e5be68fa1a33994b4ab/src/routes/alugueis.tsx#L79-L98)

### QA-03 — Média — Cadastro orienta login imediato quando a resposta não traz sessão

1. Abra **Entrar** e selecione **Cadastre-se**.
2. Preencha e-mail e senha válidos. Simule uma resposta de cadastro bem-sucedida com usuário e sem sessão, como no fluxo em que a confirmação por e-mail é exigida.
3. Envie o formulário.

**Obtido** A interface mostra **Cadastro criado! Você já pode entrar.**

**Esperado** Se a conta exigir confirmação, a interface deve orientar a verificação do e-mail antes da tentativa de login. [Fonte](https://github.com/SOZARADRION/swap-display-dash/blob/fe86759c95c561ad20d07e5be68fa1a33994b4ab/src/routes/auth.tsx#L36-L45)

### QA-04 — Média — Monitor de administrador ultrapassa a largura da tela no celular

1. Configure a janela do Chrome para 360 × 800 px.
2. Abra o monitor de trocas com perfil de administrador.

**Obtido** A largura rolável do documento chega a 814 px em uma janela de 360 px. Parte da interface exige rolagem horizontal.

**Esperado** O cabeçalho e a navegação devem se adaptar à largura disponível e manter os controles acessíveis na tela. [Fonte](https://github.com/SOZARADRION/swap-display-dash/blob/fe86759c95c561ad20d07e5be68fa1a33994b4ab/src/routes/index.tsx#L117-L158)

## Cenários funcionais aprovados

| Cenário | Resultado observado |
| --- | --- |
| Visitante abre `/novo` | Redirecionado para `/auth`. O Chrome registrou React #418 no acesso direto com o HTML estático usado neste teste. A rota completou o redirecionamento. A ocorrência no servidor web e no Tauri ainda precisa ser verificada. |
| Login com credenciais inválidas | Exibiu a mensagem de erro e liberou nova tentativa. |
| Técnico abre trocas, aluguéis e `/novo` | Exibiu os registros de cada monitor e a mensagem de acesso restrito em `/novo`. |
| Administrador registra troca | Rejeitou nome composto só por espaços sem enviar a requisição. Com dados válidos, removeu os espaços nas extremidades do nome, enviou o pedido e retornou ao monitor. |
| Administrador gerencia pedidos | Enviou alteração para **Concluído**. Cancelar a confirmação impediu a exclusão. Confirmar enviou a solicitação e exibiu a mensagem de sucesso. |

## Verificações do projeto

| Verificação | Resultado |
| --- | --- |
| `npm ci` | Instalou 408 pacotes. Avisos de descontinuação em `tsconfck` e Recharts 2. |
| `npm run typecheck` | Aprovado. |
| `npm run lint` | Aprovado com seis avisos de Fast Refresh e zero erros. |
| `npm run format:check` | Reprovado. O Prettier apontou 20 arquivos, uma pendência já descrita na documentação de manutenção. |
| `npm run build` padrão | Bloqueado neste ambiente. O esbuild recebeu acesso negado ao resolver o arquivo de configuração do Vite. |
| Compilação para os testes de interface | Concluída com `--configLoader native` e o mesmo ajuste na chamada de preview da dependência TanStack instalada na cópia local. A pré-renderização e o `postbuild` geraram `dist/client/index.html`. Maior pacote JS com 679,65 kB minificados e 203,64 kB gzip. |

## Escopo e limites

Os testes usaram o HTML estático do build local no Chrome e respostas simuladas do Supabase, com sessões e registros fictícios. O código versionado ficou intacto. As verificações de perfil cobrem o comportamento da interface. Permissões efetivas do banco (RLS), persistência, migrações, eventos Realtime, entrega de e-mail, Google OAuth, administração de usuários, atualização assinada e instalador Tauri ficaram fora da validação. A geração de registros de auditoria depende dos gatilhos do banco e deve ser validada em homologação.
