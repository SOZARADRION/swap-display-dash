# Como contribuir

1. Leia o README e `AGENTS.md`.
2. Prepare o ambiente com `npm ci` e `.env.example`.
3. Crie uma branch curta e descritiva para a alteração.
4. Mantenha as mudanças focadas e preserve as rotas geradas pelo TanStack.
5. Execute `npm run typecheck`, `npm run lint` e `npm run build`.
6. Descreva no pull request o problema, a mudança e os testes executados.

Se uma verificação falhar por um problema já existente, registre a falha e sua origem; não informe que o projeto inteiro passou. Evite reformatar todos os arquivos junto com uma alteração funcional.

A formatação é verificada separadamente com `npm run format:check`. Há diferenças históricas de estilo; formate os arquivos que editar e evite misturar uma normalização completa com alterações funcionais. O workflow Quality verifica tipos, lint e build, sem depender de credenciais de banco ou assinatura.

## Fluxos que merecem teste manual

- Acesso com cada papel de usuário e rejeição de acessos indevidos.
- Criação de pedido, mudança de status e atualização do monitor.
- Separação entre troca e aluguel.
- Registro das alterações no histórico.
- Saída da conta e comportamento das rotas protegidas.
- No desktop, carregamento da interface e atualização assinada em ambiente de teste.

Use um projeto Supabase de desenvolvimento e dados fictícios. Não altere dados reais para verificar o aplicativo.

## Lovable e histórico

O projeto está conectado ao Lovable. Commits enviados à branch conectada sincronizam com o editor. Não reescreva histórico publicado, não use push forçado e não altere os metadados da integração sem necessidade.

## Licença

Ainda não há licença declarada no repositório. Não acrescente uma licença em nome do autor sem que ele escolha os termos.
