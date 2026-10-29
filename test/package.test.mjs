import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('package exposes localized plugin metadata and the DSH bundle contract', async () => {
  const pkg = await readJson('../package.json');
  const en = await readJson('../locale/en.json');
  const zh = await readJson('../locale/zh.json');
  assert.equal(pkg.version, '0.2.3');
  assert.deepEqual(pkg.dsh, {
    bundle: { patch: './cordis.patch.yml' },
    client: { platform: 'web' },
  });
  assert.ok(pkg.files.includes('locale/'));
  assert.equal(pkg.exports['./locale/en.json'], './locale/en.json');
  assert.equal(pkg.exports['./locale/zh.json'], './locale/zh.json');
  assert.equal(en.meta.title, 'Archived session manager');
  assert.equal(zh.meta.title, '归档会话管理');
  assert.ok(en.meta.description);
  assert.ok(zh.meta.description);
});
