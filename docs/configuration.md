# Configuração local

## Variáveis

Copie `.env.example` para `.env` e preencha os valores do seu ambiente.

| Variável                        | Destino                    | Finalidade                                        |
| ------------------------------- | -------------------------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Web/desktop                | URL do projeto Supabase                           |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Web/desktop                | Chave publicável do cliente                       |
| `SUPABASE_URL`                  | Servidor                   | URL usada no contexto de servidor                 |
| `SUPABASE_PUBLISHABLE_KEY`      | Servidor                   | Chave publicável no contexto de servidor          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Somente servidor, opcional | Cliente administrativo; nunca incluir em `VITE_*` |

As variáveis `VITE_*` são incorporadas ao código distribuído. Use a chave publicável, com RLS configurada; não use `service_role` ou `sb_secret_*` nesses campos.

Após alterar as variáveis, reinicie o servidor de desenvolvimento. Builds já gerados precisam ser refeitos para incorporar mudanças em `VITE_*`.

## Preparar o Supabase

1. Use um projeto de desenvolvimento separado de dados reais.
2. Revise as migrações em `supabase/migrations/` e aplique-as em ordem de data no ambiente correto. A configuração versionada identifica um projeto existente; não vincule outro projeto nem execute migrações sem conferir o destino.
3. Configure autenticação por e-mail e, se necessário, o provedor Google.
4. Configure os redirecionamentos permitidos para o ambiente local e para o ambiente de implantação. O código usa a origem atual para compor redirecionamentos.
5. Verifique as tabelas, políticas RLS, funções de gestão e acesso a Realtime.
6. Prepare os papéis de teste de acordo com as migrações. Um cadastro novo não equivale automaticamente a um administrador ou proprietário.

As migrações alteram permissões e estruturas do banco. A revisão deste repositório não aplica mudanças em um banco remoto nem cria usuários de produção.

## Diagnóstico

| Sintoma                          | Conferir                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Mensagem de variável ausente     | `.env`, nomes das variáveis e reinício do Vite                                |
| Acesso negado a uma tela         | Papel do usuário e regras do banco                                            |
| Login Google não retorna         | Provedor e URLs de redirecionamento                                           |
| Painel não atualiza              | Autenticação, acesso às tabelas e Realtime                                    |
| Desktop não encontra a interface | `npm run build`, pasta `dist/client` e servidor local no modo desenvolvimento |
