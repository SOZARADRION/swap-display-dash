# Desktop e releases

## Desenvolvimento no Windows

Além de Node.js 24 e npm, o Tauri requer Rust compatível com o projeto
(`rust-version = 1.90`), ferramentas C++ do Microsoft Visual Studio e WebView2.
Consulte os [pré-requisitos oficiais do Tauri](https://v2.tauri.app/start/prerequisites/).

Em um terminal:

```powershell
npm run dev
```

Em outro terminal, na mesma pasta:

```powershell
npm run desktop:dev
```

O `beforeDevCommand` está vazio na configuração atual; o Tauri espera que o Vite já esteja atendendo em `http://localhost:8080`.

## Build

```powershell
npm run desktop:build
```

O Tauri executa `npm run build` e utiliza `dist/client`. Instaladores com atualização assinada exigem as credenciais de assinatura apropriadas. Não publique artefatos gerados com configuração fictícia de Supabase.

## Release existente

O workflow `.github/workflows/release.yml` é acionado por tags `v*`.
Ele usa Windows, Node.js 24, Rust e a ação oficial do Tauri para gerar um instalador NSIS e um **rascunho** de release. Criar uma tag inicia esse processo; esta organização documental não cria tags nem publica instaladores.

Variáveis do repositório usadas pelo workflow:

- `SUPABASE_URL`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_PUBLISHABLE_KEY`

Segredos usados para assinatura:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

O `GITHUB_TOKEN` é fornecido pelo GitHub Actions. A chave pública do atualizador e o endpoint de `latest.json` já estão em `src-tauri/tauri.conf.json`; a chave privada nunca deve ser adicionada ao repositório.

Antes de uma nova versão, confira a consistência de versão entre `package.json`, `src-tauri/Cargo.toml`, `Cargo.lock` e `tauri.conf.json`. O identificador desktop ainda usa um nome genérico; alterá-lo exige planejamento para não afetar instalações existentes.
