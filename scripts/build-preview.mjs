import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { build } from 'vite';
import { publishPreview } from './publish-preview.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const staging = await mkdtemp(join(root, '.preview-build-'));
try {
  await build({ root, build: { outDir: staging } });
  await publishPreview(staging, join(root, '.preview-dist'));
} finally {
  await rm(staging, { recursive: true, force: true });
}
