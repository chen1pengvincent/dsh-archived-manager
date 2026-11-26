import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { apply, name } from '../lib/index.js';

test('the plugin entry registers all exact routes once webServer is available', async (t) => {
  assert.equal(name, 'archived-manager');
  const registered = [];
  const seen = new Set();
  const home = await mkdtemp(join(tmpdir(), 'am-entry-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const host = {
    get: (key) => key === 'dshHomePath' ? home : undefined,
    webServer: {
      register(route) {
        if (seen.has(route.path)) throw new Error('duplicate exact route ' + route.path);
        seen.add(route.path);
        registered.push(route);
        return () => {};
      },
    },
    effect(factory) {
      const dispose = factory();
      t.after(() => { if (typeof dispose === 'function') dispose(); });
    },
  };
  let injected;
  const ctx = {
    inject(names, callback) {
      injected = names;
      callback(host);
    },
  };
  apply(ctx);
  assert.deepEqual([...injected], ['webServer']);
  const paths = registered.map((route) => route.path).sort();
  assert.equal(new Set(paths).size, paths.length, 'every exact route path must be unique');
  assert.deepEqual(paths, [
    '/archived-manager/diagnose',
    '/archived-manager/discard',
    '/archived-manager/empty-trash',
    '/archived-manager/files',
    '/archived-manager/forget',
    '/archived-manager/health',
    '/archived-manager/hide',
    '/archived-manager/list',
    '/archived-manager/open-folder',
    '/archived-manager/pending',
    '/archived-manager/pending/add',
    '/archived-manager/pending/clear',
    '/archived-manager/pending/forget',
    '/archived-manager/preview',
    '/archived-manager/purge',
    '/archived-manager/removed',
    '/archived-manager/repair',
    '/archived-manager/restore',
    '/archived-manager/settings',
    '/archived-manager/settings/save',
    '/archived-manager/unarchive',
    '/archived-manager/update/check',
    '/archived-manager/update/prepare',
    '/archived-manager/update/status',
  ]);
  for (const route of registered) {
    assert.equal(route.kind, 'exact');
    assert.equal(typeof route.handler, 'function');
  }
});

test('a failed route registration releases the routes already mounted', () => {
  const registered = new Set();
  const scope = {
    get: (key) => key === 'dshHomePath' ? tmpdir() : undefined,
    effect(factory, label) {
      if (label === 'archived-manager: http routes') factory();
    },
    webServer: {
      register(route) {
        if (registered.size === 2) throw new Error('web server unavailable');
        registered.add(route.path);
        return () => registered.delete(route.path);
      },
    },
  };
  assert.throws(() => apply({ inject: (_, attach) => attach(scope) }), /web server unavailable/);
  assert.equal(registered.size, 0);
});
