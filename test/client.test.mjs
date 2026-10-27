import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function makeReact(values) {
  let index = 0;
  return {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
    useState: (initial) => {
      const value = index < values.length ? values[index++] : initial;
      return [value === undefined ? initial : value, () => {}];
    },
    useEffect: () => {},
    useRef: (initial) => ({ current: initial === undefined ? null : initial }),
  };
}

async function loadClient(react) {
  const code = await readFile(new URL('../client/index.js', import.meta.url), 'utf8');
  let captured;
  const fakeRequire = (name) => {
    if (name === 'react') return react;
    throw new Error('unexpected require: ' + name);
  };
  const sandbox = {
    window: { __ModuleLoader__: { load(entry) { captured = entry.factory(fakeRequire); } } },
    document: {
      createElement: () => ({ setAttribute() {}, textContent: '' }),
      head: { appendChild() {} },
    },
    navigator: { language: 'zh-CN' },
    Symbol, Object, Array, Date, JSON, Math, RegExp, String, Number, isFinite, Error, console,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return captured;
}

function textOf(node) {
  if (node === null || node === undefined || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return textOf(node.children);
}

function findAll(node, predicate, out) {
  const result = out || [];
  if (node === null || node === undefined || typeof node !== 'object') return result;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, result);
    return result;
  }
  if (predicate(node)) result.push(node);
  for (const child of node.children || []) findAll(child, predicate, result);
  return result;
}

function findByClass(node, className) {
  if (node === null || node === undefined || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByClass(child, className);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const classes = node.props && typeof node.props.className === 'string' ? node.props.className.split(/\s+/) : [];
  if (classes.includes(className)) return node;
  for (const child of node.children || []) {
    const found = findByClass(child, className);
    if (found !== undefined) return found;
  }
  return undefined;
}

const ITEM = {
  id: 'session-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: '测试会话',
  workspace: { title: '工作', path: '/tmp/proj' },
  lastUsedAt: 1700000000000,
  archivedAt: 1790000000000,
  sizeBytes: 123456,
  missing: false,
  running: false,
  resident: false,
};

const REMOVED = {
  batch: '20261026-1000',
  id: 'session-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: '隔离会话',
  workspace: '工作',
  movedAt: Date.now() - 3 * 86400000,
  bytes: 1024 * 1024,
};

function pageValues(overrides) {
  const base = [
    'archived', [], [], 'ready', null, [], null, false, null,
    [], '', 'all', 'lastUsed', '', 'movedAt', null,
    { trashRetentionDays: 0 }, { bytes: 0, files: 0 }, null,
  ];
  return base.map((value, index) => Object.prototype.hasOwnProperty.call(overrides, index) ? overrides[index] : value);
}

test('client bundle exports a plugin and registers the settings section', async () => {
  const client = await loadClient(makeReact([]));
  assert.equal(client.name, 'archived-manager');
  assert.deepEqual([...client.inject], ['slots']);
  assert.equal(typeof client.apply, 'function');
  const registered = [];
  const ctx = {
    inject(names, callback) {
      assert.deepEqual([...names], ['slots']);
      callback({
        slots: {
          inject(name, factory) { assert.equal(name, 'settings.section'); factory(); },
          register(spec, component) { registered.push({ spec, component }); return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  assert.equal(registered.length, 1);
  assert.equal(registered[0].spec.name, 'settings.section');
  assert.equal(registered[0].spec.id, 'archived-manager');
  assert.equal(registered[0].spec.order, 55);
  assert.equal(typeof registered[0].spec.label(), 'string');
  assert.equal(typeof registered[0].component, 'function');
  const tree = registered[0].component();
  assert.equal(tree.type, 'div');
  assert.equal(tree.props.className, 'am-page');
  assert.ok(tree.children.length >= 3);
});

test('client survives a shell without a settings domain', async () => {
  const client = await loadClient(makeReact([]));
  const ctx = { inject(names, callback) { callback({ slots: undefined }); } };
  assert.doesNotThrow(() => client.apply(ctx));
});

test('the empty page renders stats, a toolbar and an empty card', async () => {
  const values = ['archived', [], [], 'ready', null, [], null, false, null];
  const client = await loadClient(makeReact(values));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  assert.equal(findByClass(tree, 'am-stats-grid'), undefined);
  assert.equal(findAll(tree, (node) => node.props && node.props.className === 'am-stat').length, 0);
  assert.equal(findByClass(tree, 'am-toolbar'), undefined);
  assert.notEqual(findByClass(tree, 'am-empty-card'), undefined);
  assert.ok(textOf(tree).includes('暂无已归档会话'));
});

test('the confirm flow renders as a modal with release summary', async () => {
  const values = ['archived', [ITEM], [], 'ready', null, [], { kind: 'purge', ids: [ITEM.id], checked: false }, false, null];
  const client = await loadClient(makeReact(values));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  const modal = findByClass(tree, 'am-modal-backdrop');
  assert.notEqual(modal, undefined);
  const text = textOf(modal);
  assert.ok(text.includes('彻底删除 1 个会话'), text);
  assert.ok(text.includes('将释放约'), text);
  assert.ok(findByClass(modal, 'am-modal').props.className.includes('danger'));
  const go = findAll(modal, (node) => node.type === 'button' && textOf(node) === '彻底删除')[0];
  assert.notEqual(go, undefined);
  assert.ok(go.props.className.includes('hazard'), go.props.className);
  assert.equal(go.props.disabled, true);
  assert.equal(textOf(tree).includes('测试会话'), true);
});

test('stale records have their own cleanup modal without a danger checkbox', async () => {
  const missing = { ...ITEM, missing: true, sizeBytes: 0 };
  const values = ['archived', [missing], [], 'ready', null, [], { kind: 'cleanup', ids: [missing.id], checked: true }, false, null];
  const client = await loadClient(makeReact(values));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  const modal = findByClass(tree, 'am-modal-backdrop');
  assert.notEqual(modal, undefined);
  const text = textOf(modal);
  assert.ok(text.includes('清理 1 条失效归档记录'), text);
  assert.ok(text.includes('不会删除任何文件'), text);
  assert.equal(text.includes('我已知晓'), false);
});

test('with only stale rows selected the file operations are disabled and cleanup is offered', async () => {
  const missing = { ...ITEM, missing: true, sizeBytes: 0 };
  const values = ['archived', [missing], [], 'ready', null, [missing.id], null, false, null];
  const client = await loadClient(makeReact(values));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  const buttons = findAll(tree, (node) => node.type === 'button');
  const purge = buttons.find((node) => textOf(node) === '彻底删除');
  const hide = buttons.find((node) => textOf(node) === '移入隔离区');
  const cleanup = buttons.find((node) => textOf(node).indexOf('清理失效记录') === 0);
  assert.notEqual(purge, undefined);
  assert.equal(purge.props.disabled, true);
  assert.notEqual(hide, undefined);
  assert.equal(hide.props.disabled, true);
  assert.notEqual(cleanup, undefined);
  assert.equal(cleanup.props.disabled, false);
});

test('the quarantine tab offers bulk restore, individual discard and retention controls', async () => {
  const client = await loadClient(makeReact(pageValues({
    0: 'removed', 2: [REMOVED], 16: { trashRetentionDays: 30 }, 17: { bytes: 6500000, files: 37 },
  })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  const text = textOf(tree);
  assert.ok(text.includes('隔离区自动清理'), text);
  assert.ok(text.includes('30 天'), text);
  assert.ok(text.includes('附件'), text);
  const buttons = findAll(tree, (node) => node.type === 'button');
  assert.notEqual(buttons.find((node) => textOf(node) === '恢复'), undefined);
  assert.notEqual(buttons.find((node) => textOf(node) === '彻底删除'), undefined);
  assert.notEqual(buttons.find((node) => textOf(node) === '清空隔离区'), undefined);
  assert.notEqual(findByClass(tree, 'am-retention'), undefined);
});

test('search narrows the list and the showing counter follows it', async () => {
  const other = { ...ITEM, id: 'session-cccccccc-cccc-4ccc-8ccc-cccccccccccc', title: '另一个会话', missing: true, sizeBytes: 0 };
  const client = await loadClient(makeReact(pageValues({ 1: [ITEM, other], 10: '测试' })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  assert.ok(textOf(tree).includes('显示 1 / 2'), textOf(tree));
});

test('the retention confirmation is a danger modal with its own checkbox', async () => {
  const client = await loadClient(makeReact(pageValues({ 6: { kind: 'retention', days: 30, checked: false } })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  const modal = findByClass(tree, 'am-modal-backdrop');
  assert.notEqual(modal, undefined);
  const text = textOf(modal);
  assert.ok(text.includes('开启隔离区自动清理'), text);
  assert.ok(text.includes('超过 30 天'), text);
  const go = findAll(modal, (node) => node.type === 'button' && textOf(node) === '开启')[0];
  assert.notEqual(go, undefined);
  assert.equal(go.props.disabled, true);
});

test('a partial failure report renders the failed session and reason', async () => {
  const client = await loadClient(makeReact(pageValues({
    1: [ITEM],
    15: { title: '部分完成：成功 1 个，失败 1 个', failures: [{ title: '测试会话', reason: '会话正在运行' }], more: 0 },
  })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  assert.notEqual(findByClass(tree, 'am-report'), undefined);
  assert.ok(textOf(tree).includes('测试会话 · 会话正在运行'), textOf(tree));
});

test('archived rows expose native unarchive before the quarantine action', async () => {
  const client = await loadClient(makeReact(pageValues({ 1: [ITEM], 5: [ITEM.id] })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  const unarchiveButtons = findAll(tree, (node) => node.type === 'button' && textOf(node) === '取消归档');
  assert.ok(unarchiveButtons.length >= 2);
  assert.ok(unarchiveButtons.some((node) => node.props.disabled === false));
  assert.ok(textOf(tree).includes('移入隔离区'));
});

test('a selected quarantine entry enables bulk restore and bulk delete', async () => {
  const key = REMOVED.batch + '/' + REMOVED.id;
  const client = await loadClient(makeReact(pageValues({ 0: 'removed', 2: [REMOVED], 9: [key] })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  assert.ok(textOf(tree).includes('已选 1 个隔离会话'), textOf(tree));
  const buttons = findAll(tree, (node) => node.type === 'button');
  const restore = buttons.find((node) => textOf(node) === '恢复');
  const discard = buttons.find((node) => textOf(node) === '彻底删除');
  assert.notEqual(restore, undefined);
  assert.equal(restore.props.disabled, false);
  assert.notEqual(discard, undefined);
  assert.equal(discard.props.disabled, false);
});

test('discarding a quarantine entry uses the danger modal and names the scope', async () => {
  const values = pageValues({
    0: 'removed',
    2: [REMOVED],
    6: { kind: 'discard', items: [{ batch: REMOVED.batch, id: REMOVED.id }], checked: false },
  });
  const client = await loadClient(makeReact(values));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  const modal = findByClass(tree, 'am-modal-backdrop');
  assert.notEqual(modal, undefined);
  const text = textOf(modal);
  assert.ok(text.includes('彻底删除 1 个隔离会话'), text);
  assert.ok(text.includes('项目文件与附件不受影响'), text);
  const go = findAll(modal, (node) => node.type === 'button' && textOf(node) === '彻底删除')[0];
  assert.notEqual(go, undefined);
  assert.equal(go.props.disabled, true);
});

test('sort and retention use in-app dropdowns, and times are not collapsed', async () => {
  const client = await loadClient(makeReact(pageValues({
    1: [ITEM],
    18: 'sort',
  })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  assert.equal(findAll(tree, (node) => node.type === 'select').length, 0);
  const trigger = findByClass(tree, 'am-select-trigger');
  assert.notEqual(trigger, undefined);
  assert.equal(trigger.props['aria-haspopup'], 'listbox');
  assert.equal(trigger.props['aria-expanded'], true);
  const menu = findByClass(tree, 'am-select-menu');
  assert.notEqual(menu, undefined);
  const menuText = textOf(menu);
  assert.ok(menuText.includes('最后使用'), menuText);
  assert.ok(menuText.includes('归档时间'), menuText);
  assert.ok(menuText.includes('体积'), menuText);
  assert.ok(menuText.includes('标题'), menuText);
  const times = findByClass(tree, 'am-row-times');
  assert.notEqual(times, undefined);
  const timeText = textOf(times);
  assert.ok(timeText.includes('最后使用'), timeText);
  assert.ok(timeText.includes('归档于'), timeText);
  assert.ok(timeText.includes('2026'), timeText);
  assert.equal(findAll(tree, (node) => {
    const className = node.props && typeof node.props.className === 'string' ? node.props.className : '';
    return className.includes('am-row-meta') && className.includes('am-row-times');
  }).length, 1);
});

test('the quarantine retention picker is also an in-app dropdown', async () => {
  const client = await loadClient(makeReact(pageValues({
    0: 'removed',
    2: [REMOVED],
    16: { trashRetentionDays: 30 },
    18: 'retention',
  })));
  let component;
  const ctx = {
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  const tree = component();
  assert.equal(findAll(tree, (node) => node.type === 'select').length, 0);
  const menu = findByClass(tree, 'am-select-menu');
  assert.notEqual(menu, undefined);
  const menuText = textOf(menu);
  assert.ok(menuText.includes('永不'), menuText);
  assert.ok(menuText.includes('7 天'), menuText);
  assert.ok(menuText.includes('30 天'), menuText);
  assert.ok(menuText.includes('90 天'), menuText);
  const selected = findAll(menu, (node) => node.props && node.props['aria-selected'] === true);
  assert.equal(selected.length, 1);
  assert.equal(textOf(selected[0]).includes('30 天'), true);
});
