import { randomUUID } from 'node:crypto';
import { copyFile, cp, link, mkdir, readFile, readdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

async function publishAssets(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) {
      await publishAssets(from, to);
    } else {
      try {
        // O staging está no mesmo volume; o arquivo completo entra sem sobrescrever nada.
        await link(from, to);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const [candidate, published] = await Promise.all([readFile(from), readFile(to)]);
        if (!candidate.equals(published)) throw new Error(`Arquivo versionado já publicado com outro conteúdo: ${entry.name}`);
      }
    }
  }
}

export async function publishPreview(staging, destination) {
  const index = join(staging, 'index.html');
  const pendingIndex = join(staging, `.preview-index-${randomUUID()}.html`);
  await copyFile(index, pendingIndex);
  try {
    await publishAssets(join(staging, 'assets'), join(destination, 'assets'));
    for (const name of await readdir(staging)) {
      if (name === 'assets' || name === 'index.html' || name.startsWith('.preview-index-')) continue;
      await cp(join(staging, name), join(destination, name), { recursive: true });
    }
    // Só publica a página inicial depois que todos os arquivos estão disponíveis.
    await rename(pendingIndex, join(destination, 'index.html'));
  } finally {
    await rm(pendingIndex, { force: true });
  }
}
