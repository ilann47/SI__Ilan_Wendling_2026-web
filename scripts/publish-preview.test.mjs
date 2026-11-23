import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publishPreview } from './publish-preview.mjs';

test('a publicação troca a página inicial sem remover arquivos de abas antigas', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'yes7parking-preview-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const destination = join(root, 'preview');
  const version = async (name, bundle, content = bundle) => {
    const stage = join(root, name);
    await mkdir(join(stage, 'assets'), { recursive: true });
    await writeFile(join(stage, 'index.html'), `<script src="/assets/${bundle}"></script>`);
    await writeFile(join(stage, 'assets', bundle), content);
    return stage;
  };

  await publishPreview(await version('v1', 'old.js'), destination);
  await publishPreview(await version('v2', 'new.js'), destination);
  assert.match(await readFile(join(destination, 'index.html'), 'utf8'), /new\.js/);
  assert.equal(await readFile(join(destination, 'assets', 'old.js'), 'utf8'), 'old.js');
  assert.equal(await readFile(join(destination, 'assets', 'new.js'), 'utf8'), 'new.js');

  await assert.rejects(publishPreview(await version('conflict', 'old.js', 'changed'), destination), /old\.js/);
  assert.match(await readFile(join(destination, 'index.html'), 'utf8'), /new\.js/);
  assert.equal(await readFile(join(destination, 'assets', 'old.js'), 'utf8'), 'old.js');
});
