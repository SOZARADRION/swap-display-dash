# Arquitetura

## Camadas

- **Interface:** React 19, TypeScript, Tailwind CSS, componentes Radix/shadcn e ícones Lucide.
- **Aplicação web:** TanStack Start, TanStack Router e Vite. A configuração habilita modo SPA.
- **Dados:** Supabase Auth, PostgreSQL, políticas RLS, funções SQL e Realtime.
- **Desktop:** Tauri 2 e Rust, com plugins de atualização, processo e log.

## Rotas atuais

| URL            | Responsabilidade                              |
| -------------- | --------------------------------------------- |
| `/`            | Monitor de pedidos de troca                   |
| `/alugueis`    | Monitor de pedidos de aluguel                 |
| `/auth`        | Acesso e cadastro                             |
| `/novo`        | Registro de pedidos para administradores      |
| `/gerenciar`   | Gestão de pedidos para administradores        |
| `/historico`   | Histórico de alterações para administradores  |
| `/usuarios`    | Gestão de usuários para o proprietário        |
| `/minha-conta` | Conta e recursos de atualização do aplicativo |

O agrupamento `_authenticated` não faz parte da URL. Seu `beforeLoad` verifica o usuário e carrega papéis de acesso. Os monitores também consultam o acesso antes de buscar dados.

As restrições da interface ajudam a navegação; as políticas e funções do banco determinam a autorização efetiva. Aplique as migrações antes de validar os papéis em um ambiente novo.

## Arquivos gerados e integração

- `src/routeTree.gen.ts`: gerado pelo roteador; não editar manualmente.
- `src/integrations/supabase/types.ts`: tipos do banco; sincronizar quando o esquema mudar.
- Os clientes Supabase possuem comentários de geração automática; coordenar mudanças com a integração existente.
- `.lovable/` e `AGENTS.md`: metadados e orientações da integração Lovable; preservar.
- `docs/archive/estrutura-original.txt`: inventário histórico, movido da raiz sem alteração do conteúdo; não descreve necessariamente a versão atual.

## Limites de execução

O cliente `client.ts` utiliza a chave publicável e a sessão do usuário. O cliente `client.server.ts` usa uma chave administrativa que ignora RLS; deve permanecer em operações confiáveis de servidor. Sua presença no código não significa que a chave deva ser configurada no navegador ou no aplicativo desktop.

O pacote desktop carrega os recursos de `dist/client`. Fluxos que dependam de servidor precisam de uma estratégia própria de hospedagem antes de serem usados no desktop.
