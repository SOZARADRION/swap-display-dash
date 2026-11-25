// Prepara os arquivos extras da release: uma cópia do instalador com nome fixo
// e as notas em Markdown. Uso: node scripts/prepare-release.mjs <tag> <owner/repo> <saida>
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [tag, repository, outputDir] = process.argv.slice(2);
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "") || !repository || !outputDir) {
  throw new Error("Uso: prepare-release.mjs <vX.Y.Z> <owner/repo> <saida>");
}

const root = fileURLToPath(new URL("..", import.meta.url));
const version = tag.slice(1);
const config = JSON.parse(await readFile(join(root, "src-tauri/tauri.conf.json"), "utf8"));
if (config.version !== version) {
  throw new Error(`A tag ${tag} não corresponde à versão ${config.version} do tauri.conf.json`);
}

// O cache do Rust pode trazer instaladores antigos: filtra pela versão exata.
const bundleDir = join(root, "src-tauri/target/release/bundle/nsis");
const installers = (await readdir(bundleDir)).filter((name) =>
  name.endsWith(`_${version}_x64-setup.exe`),
);
if (installers.length !== 1) {
  throw new Error(`Esperado 1 instalador da versão ${version}, encontrados ${installers.length}`);
}

await mkdir(outputDir, { recursive: true });
await copyFile(join(bundleDir, installers[0]), join(outputDir, "SwapDisplayDash-Setup.exe"));

const template = await readFile(join(root, ".github/release-notes.md"), "utf8");
const notes = template
  .replaceAll("{{TAG}}", tag)
  .replaceAll("{{VERSION}}", version)
  .replaceAll("{{REPOSITORY}}", repository);
await writeFile(join(outputDir, "notes.md"), `${notes}
`);
