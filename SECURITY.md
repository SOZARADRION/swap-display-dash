# Configuração e dados

## Credenciais

- Não versione `.env`, chaves administrativas, chaves privadas de assinatura ou senhas.
- Campos `VITE_*` fazem parte do código entregue ao navegador/desktop.
- Use apenas a chave publicável do Supabase no cliente e mantenha as políticas RLS ativas.
- O cliente administrativo pertence exclusivamente a operações confiáveis no servidor.

## Relatar um problema

Não abra uma issue pública com credenciais, dados de clientes ou detalhes exploráveis de uma vulnerabilidade. Se o repositório oferecer a opção **Security → Report a vulnerability**, use esse canal privado. Caso contrário, solicite ao mantenedor um canal privado sem divulgar os detalhes na solicitação.

## Revisões pendentes

A configuração desktop atualmente possui `csp: null`. Uma política de conteúdo adequada precisa ser estudada e testada com os recursos usados pelo Tauri. Esta revisão documental não muda as permissões do aplicativo nem certifica a segurança da implantação.

A validação de acesso deve considerar as políticas do banco e os papéis de usuário, além das restrições exibidas na interface.
