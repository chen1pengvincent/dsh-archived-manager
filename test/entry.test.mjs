import test from 'node:test';
import assert from 'node:assert/strict';

import { apply, name } from '../lib/index.js';

test('the plugin entry registers all exact routes once webServer is available', () => {
  assert.equal(name, 'archived-manager');
  const registered = [];
  const seen = new Set();
  const host = {
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
      return () => { if (typeof dispose === 'function') dispose(); };
    },
  };
  let injected;
  const ctx = {
    get(serviceName) {
      if (serviceName === 'dshHomePath') return () => '/tmp/am-entry-home';
      return undefined;
    },
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
    '/archived-manager/discard',
    '/archived-manager/empty-trash',
    '/archived-manager/forget',
    '/archived-manager/health',
    '/archived-manager/hide',
    '/archived-manager/list',
    '/archived-manager/purge',
    '/archived-manager/removed',
    '/archived-manager/restore',
    '/archived-manager/settings',
    '/archived-manager/settings/save',
    '/archived-manager/unarchive',
  ]);
  for (const route of registered) {
    assert.equal(route.kind, 'exact');
    assert.equal(typeof route.handler, 'function');
  }
});
