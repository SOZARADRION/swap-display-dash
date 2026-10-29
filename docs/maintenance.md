# Manutenção e validação

## Revisão de organização — 28/10/2026

- Instalação com `npm ci --no-audit --no-fund` concluída.
- TypeScript passou com `npm run typecheck`.
- ESLint passou após separar a formatação: zero erros e seis avisos de Fast Refresh preexistentes.
- Compilação web passou com `npm run build`, incluindo o `postbuild` que prepara o HTML desktop.
- O lint original apresentou 7.041 erros de formatação e seis avisos de Fast Refresh. Muitos erros eram diferenças CRLF/LF no Windows.

A revisão separa ESLint e Prettier: `npm run lint` mantém as regras de código;
`npm run format:check` expõe a dívida de formatação. Nenhuma regra de acesso,
negócio ou tipagem foi desativada para fazer as verificações passarem.
Arquivos gerados pelo roteador e compilador ficam fora do lint.

`.gitattributes` e `.editorconfig` padronizam finais de linha para novas edições,
sem uma reescrita geral dos arquivos existentes nesta entrega.

## Próximas melhorias

- Normalizar a formatação em uma alteração própria, revisável.
- Separar exports compartilhados que geram avisos de Fast Refresh.
- Avaliar divisão do pacote principal: o build avisa sobre um chunk maior que 500 kB.
- Planejar atualização de dependências descontinuadas: a instalação avisa sobre `tsconfck` e Recharts 2.
- Rever a política CSP desktop, hoje `null`, com testes dos recursos necessários.
- Escolher uma licença e revisar os metadados genéricos do pacote e aplicativo desktop com o autor.
- Criar testes automatizados para fluxos de acesso, pedidos e histórico em ambiente isolado.

## Limites desta verificação

Não foram executados instaladores Tauri, assinatura, atualizações desktop ou
fluxos com usuários e banco Supabase. Não foram aplicadas migrações nem criadas
tags/releases. Build e TypeScript não substituem validar os fluxos com cada
papel de usuário em ambiente de desenvolvimento.
