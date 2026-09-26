import { cp, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const sourceDir = new URL('../assets/', import.meta.url);
const targetDir = new URL('../dist/assets/', import.meta.url);

await mkdir(targetDir, { recursive: true });
const files = await readdir(sourceDir);
const runtimeAssets = files.filter((name) => /^product-(pvc|aluminium|wood|doors|sliding)\.svg$/.test(name));

if (runtimeAssets.length !== 5) {
  throw new Error(`Expected 5 runtime product assets, found ${runtimeAssets.length}`);
}

for (const name of runtimeAssets) {
  await cp(new URL(name, sourceDir), new URL(name, targetDir));
}

console.log(`Copied ${runtimeAssets.length} runtime product assets to dist/assets`);
