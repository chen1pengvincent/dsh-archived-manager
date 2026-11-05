import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function makeReact(values) {
  let index = 0, refIndex = 0, effectIndex = 0;
  const state = values.slice();
  const refs = [], effects = [];
  return {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
    useState: (initial) => {
      const slot = index++;
      if (slot >= state.length || state[slot] === undefined) state[slot] = initial;
      return [state[slot], (next) => {
        const current = state[slot] === undefined ? initial : state[slot];
        state[slot] = typeof next === 'function' ? next(current) : next;
      }];
    },
    useEffect: (fn, deps) => { effects[effectIndex++] = { fn, deps }; },
    useRef: (initial) => { const slot = refIndex++; return refs[slot] || (refs[slot] = { current: initial === undefined ? null : initial }); },
    reset() { index = 0; refIndex = 0; effectIndex = 0; },
    state, effects,
  };
}

async function loadClient(react, language = 'zh-CN', extras = {}) {
  const code = await readFile(new URL('../client/index.js', import.meta.url), 'utf8');
  let captured;
  const fakeRequire = (name) => {
    if (name === 'react') return react;
    throw new Error('unexpected require: ' + name);
  };
  const { window: extraWindow, document: extraDocument, ...globals } = extras;
  const sandbox = {
    window: { __ModuleLoader__: { load(entry) { captured = entry.factory(fakeRequire); } }, ...extraWindow },
    document: {
      createElement: () => ({ setAttribute() {}, textContent: '' }),
      head: { appendChild() {} },
      ...extraDocument,
    },
    navigator: { language },
    Symbol, Object, Array, Date, JSON, Math, RegExp, String, Number, isFinite, Error, console, URL,
    ...globals,
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
    null, '', {}, {}, false, '', false, 0, '', [],
  ];
  return base.map((value, index) => Object.prototype.hasOwnProperty.call(overrides, index) ? overrides[index] : value);
}

async function pageRenderer(values, extras = {}) {
  const react = makeReact(values);
  const client = await loadClient(react, 'zh-CN', extras);
  let component;
  client.apply({
    inject(names, callback) {
      callback({
        slots: {
          inject(name, factory) { factory(); },
          register(spec, rendered) { component = rendered; return () => {}; },
        },
      });
    },
  });
  const render = () => {
    react.reset();
    return component();
  };
  render.state = react.state;
  render.effects = react.effects;
  return render;
}

async function renderPage(values) {
  const render = await pageRenderer(values);
  return render();
}

function listRows(tree) {
  return findAll(tree, (node) => node.props && node.props.role === 'listitem');
}

function assertRowSelection(row, expected, message) {
  const classes = row.props.className.split(/\s+/);
  const checkbox = findAll(row, (node) => node.type === 'input' && node.props.type === 'checkbox')[0];
  assert.equal(classes.includes('selected'), expected, message + ': row highlight');
  assert.equal(checkbox.props.checked, expected, message + ': checkbox');
}

function assertToolbarNeutral(tree, message) {
  const toolbar = findByClass(tree, 'am-toolbar');
  assert.notEqual(toolbar, undefined, message + ': toolbar exists');
  assert.equal(toolbar.props.className, 'am-toolbar', message + ': toolbar never takes selection highlight');
}

test('client bundle exports a plugin and registers the settings section', async () => {
  const client = await loadClient(makeReact([]));
  assert.equal(client.name, 'archived-manager');
  assert.deepEqual([...client.inject], ['slots', 'locale']);
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

test('the page follows the DSH locale service even when navigator is en-US', async () => {
  const client = await loadClient(makeReact(pageValues({ 1: [ITEM] })), 'en-US');
  const dictionaries = {};
  const locale = {
    register(ns, dictionary) {
      dictionaries[ns] = dictionary;
      return () => {};
    },
    bind(ns) {
      return (key, vars) => {
        const dictionary = dictionaries[ns] && dictionaries[ns].zh;
        let text = dictionary && dictionary[key];
        if (typeof text !== 'string') return key;
        if (vars) {
          for (const [name, value] of Object.entries(vars)) text = text.replaceAll('{' + name + '}', String(value));
        }
        return text;
      };
    },
  };
  let registered;
  const ctx = {
    locale,
    effect(factory) { return factory(); },
    inject(names, callback) {
      assert.deepEqual([...names], ['slots']);
      callback({
        slots: {
          inject(name, factory) { assert.equal(name, 'settings.section'); factory(); },
          register(spec, component) { registered = { spec, component }; return () => {}; },
        },
      });
    },
  };
  client.apply(ctx);
  assert.ok(dictionaries.archivedManager, 'dictionary registered');
  assert.deepEqual(
    Object.keys(dictionaries.archivedManager.zh).sort(),
    Object.keys(dictionaries.archivedManager.en).sort(),
  );
  assert.equal(registered.spec.locale, 'archivedManager');
  assert.equal(registered.spec.label(), '归档会话');
  const text = textOf(registered.component());
  assert.ok(text.includes('归档会话管理'), text);
  assert.ok(!text.includes('Archived session manager'), text);
});

test('client survives a shell without a settings domain', async () => {
  const client = await loadClient(makeReact([]));
  const ctx = { inject(names, callback) { callback({ slots: undefined }); } };
  assert.doesNotThrow(() => client.apply(ctx));
});

test('the empty page keeps a compact overview inside the workbench', async () => {
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
  assert.notEqual(findByClass(tree, 'am-workbench'), undefined);
  assert.equal(findByClass(tree, 'am-stats-grid'), undefined);
  assert.notEqual(findByClass(tree, 'am-summary'), undefined);
  assert.equal(findAll(tree, (node) => node.props && node.props.className === 'am-stat').length, 0);
  assert.equal(findByClass(tree, 'am-toolbar'), undefined);
  assert.equal(findByClass(tree, 'am-controls'), undefined);
  assert.notEqual(findByClass(tree, 'am-empty-card'), undefined);
  assert.notEqual(findByClass(tree, 'am-scope'), undefined);
  const head = findByClass(tree, 'am-head');
  assert.notEqual(head, undefined);
  assert.equal(findByClass(head, 'am-refresh'), undefined);
  const viewbar = findByClass(tree, 'am-viewbar');
  assert.notEqual(viewbar, undefined);
  assert.notEqual(findByClass(viewbar, 'am-refresh'), undefined);
  assert.ok(textOf(tree).includes('暂无已归档会话'));
});

test('loading and initial failure do not show fake zero-value scope data', async () => {
  for (const phase of ['loading', 'failed']) {
    const client = await loadClient(makeReact(['archived', [], [], phase, null, [], null, false, null]));
    let component;
    client.apply({
      inject(names, callback) {
        callback({
          slots: {
            inject(name, factory) { factory(); },
            register(spec, rendered) { component = rendered; return () => {}; },
          },
        });
      },
    });
    const tree = component();
    assert.equal(findByClass(tree, 'am-stats-grid'), undefined);
    assert.equal(findByClass(tree, 'am-scope'), undefined);
    const viewbar = findByClass(tree, 'am-viewbar');
    assert.notEqual(viewbar, undefined);
    assert.notEqual(findByClass(viewbar, 'am-refresh'), undefined);
    if (phase === 'loading') assert.equal(findByClass(viewbar, 'am-refresh').props.disabled, true);
  }
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
  assert.ok(text.includes('实际释放量以处理结果为准'), text);
  assert.equal(findAll(tree, (node) => node.props.role === 'dialog').length, 1);
  assert.ok(findByClass(modal, 'am-modal').props.className.includes('danger'));
  const go = findAll(modal, (node) => node.type === 'button' && textOf(node) === '彻底删除 1 条')[0];
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

test('with only stale rows selected only the applicable cleanup action is offered', async () => {
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
  assert.equal(purge, undefined);
  assert.equal(hide, undefined);
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
  assert.ok(text.includes('自动清理：移入满 30 天'), text);
  assert.ok(text.includes('30 天'), text);
  assert.ok(text.includes('附件'), text);
  const buttons = findAll(tree, (node) => node.type === 'button');
  assert.notEqual(buttons.find((node) => textOf(node) === '恢复会话'), undefined);
  assert.equal(buttons.find((node) => textOf(node) === '彻底删除'), undefined);
  assert.notEqual(buttons.find((node) => textOf(node) === '隔离区 · 更多'), undefined);
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
  const unarchiveButtons = findAll(tree, (node) => node.type === 'button' && textOf(node).startsWith('取消归档'));
  assert.ok(unarchiveButtons.length >= 2);
  assert.ok(unarchiveButtons.some((node) => node.props.disabled === false));
  assert.ok(textOf(tree).includes('移入隔离区'));
});

test('archived rows highlight exactly their own selection for all, single and none', async () => {
  const other = { ...ITEM, id: 'session-cccccccc-cccc-4ccc-8ccc-cccccccccccc', title: '另一个会话' };
  const cases = [
    { name: 'select all', selected: [ITEM.id, other.id], expected: [true, true] },
    { name: 'first only', selected: [ITEM.id], expected: [true, false] },
    { name: 'second only', selected: [other.id], expected: [false, true] },
    { name: 'none', selected: [], expected: [false, false] },
  ];
  for (const scenario of cases) {
    const tree = await renderPage(pageValues({ 1: [ITEM, other], 5: scenario.selected }));
    const rows = listRows(tree);
    assert.equal(rows.length, 2, scenario.name);
    rows.forEach((row, index) => assertRowSelection(row, scenario.expected[index], scenario.name + ' row ' + index));
    assertToolbarNeutral(tree, scenario.name);
  }
});

test('quarantine rows use the same per-entry selection highlight contract', async () => {
  const other = { ...REMOVED, id: 'session-dddddddd-dddd-4ddd-8ddd-dddddddddddd', title: '另一个隔离会话' };
  const firstKey = REMOVED.batch + '/' + REMOVED.id;
  const secondKey = other.batch + '/' + other.id;
  const cases = [
    { selected: [firstKey, secondKey], expected: [true, true] },
    { selected: [firstKey], expected: [true, false] },
    { selected: [secondKey], expected: [false, true] },
    { selected: [], expected: [false, false] },
  ];
  for (const [index, scenario] of cases.entries()) {
    const tree = await renderPage(pageValues({ 0: 'removed', 2: [REMOVED, other], 9: scenario.selected }));
    const rows = listRows(tree);
    assert.equal(rows.length, 2);
    rows.forEach((row, rowIndex) => assertRowSelection(row, scenario.expected[rowIndex], 'quarantine case ' + index + ' row ' + rowIndex));
    assertToolbarNeutral(tree, 'quarantine case ' + index);
  }
});

test('clicking select all and row checkboxes updates highlights after rerender', async () => {
  const other = { ...ITEM, id: 'session-cccccccc-cccc-4ccc-8ccc-cccccccccccc', title: '另一个会话' };
  const render = await pageRenderer(pageValues({ 1: [ITEM, other] }));
  const checkbox = (node) => findAll(node, (child) => child.type === 'input' && child.props.type === 'checkbox')[0];

  let tree = render();
  let rows = listRows(tree);
  checkbox(rows[0]).props.onChange();
  tree = render();
  rows = listRows(tree);
  assertRowSelection(rows[0], true, 'single unselected row becomes selected');
  assertRowSelection(rows[1], false, 'single selection leaves other row untouched');
  assertToolbarNeutral(tree, 'archived single click');

  checkbox(findByClass(tree, 'am-toolbar')).props.onChange();
  tree = render();
  rows = listRows(tree);
  rows.forEach((row, index) => assertRowSelection(row, true, 'clicked select all row ' + index));
  assertToolbarNeutral(tree, 'archived select-all click');

  checkbox(rows[0]).props.onChange();
  tree = render();
  rows = listRows(tree);
  assertRowSelection(rows[0], false, 'deselected first row');
  assertRowSelection(rows[1], true, 'second row remains selected');
  const mixedSelectAll = checkbox(findByClass(tree, 'am-toolbar'));
  assert.equal(mixedSelectAll.props['aria-checked'], 'mixed');

  checkbox(rows[1]).props.onChange();
  tree = render();
  rows = listRows(tree);
  rows.forEach((row, index) => assertRowSelection(row, false, 'deselected all row ' + index));
  assert.equal(findByClass(tree, 'am-toolbar').props.className.includes('active'), false);

  const selectAllAgain = checkbox(findByClass(tree, 'am-toolbar'));
  selectAllAgain.props.onChange();
  tree = render();
  listRows(tree).forEach((row, index) => assertRowSelection(row, true, 'reselected all row ' + index));
  checkbox(findByClass(tree, 'am-toolbar')).props.onChange();
  tree = render();
  listRows(tree).forEach((row, index) => assertRowSelection(row, false, 'clicked select all off row ' + index));
});

test('quarantine select-all clicks also drive per-row highlights and partial selection', async () => {
  const other = { ...REMOVED, id: 'session-dddddddd-dddd-4ddd-8ddd-dddddddddddd', title: '另一个隔离会话' };
  const render = await pageRenderer(pageValues({ 0: 'removed', 2: [REMOVED, other] }));
  const checkbox = (node) => findAll(node, (child) => child.type === 'input' && child.props.type === 'checkbox')[0];

  let tree = render();
  let rows = listRows(tree);
  checkbox(rows[0]).props.onChange();
  tree = render();
  rows = listRows(tree);
  assertRowSelection(rows[0], true, 'quarantine single unselected row becomes selected');
  assertRowSelection(rows[1], false, 'quarantine single selection leaves other row untouched');

  checkbox(findByClass(tree, 'am-toolbar')).props.onChange();
  tree = render();
  rows = listRows(tree);
  rows.forEach((row, index) => assertRowSelection(row, true, 'quarantine clicked all row ' + index));

  checkbox(rows[0]).props.onChange();
  tree = render();
  rows = listRows(tree);
  assertRowSelection(rows[0], false, 'quarantine deselected first');
  assertRowSelection(rows[1], true, 'quarantine second remains selected');

  checkbox(findByClass(tree, 'am-toolbar')).props.onChange();
  tree = render();
  listRows(tree).forEach((row, index) => assertRowSelection(row, true, 'quarantine partial to all row ' + index));
  checkbox(findByClass(tree, 'am-toolbar')).props.onChange();
  tree = render();
  listRows(tree).forEach((row, index) => assertRowSelection(row, false, 'quarantine clicked all off row ' + index));
});

test('a selected quarantine entry enables bulk restore and bulk delete', async () => {
  const key = REMOVED.batch + '/' + REMOVED.id;
  const client = await loadClient(makeReact(pageValues({ 0: 'removed', 2: [REMOVED], 9: [key], 18: 'removed-batch' })));
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
  assert.ok(textOf(tree).includes('已选 1 条隔离会话'), textOf(tree));
  const buttons = findAll(tree, (node) => node.type === 'button');
  const restore = buttons.find((node) => textOf(node) === '恢复会话');
  const discard = buttons.find((node) => textOf(node) === '彻底删除 (1)');
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
  const go = findAll(modal, (node) => node.type === 'button' && textOf(node) === '彻底删除 1 条')[0];
  assert.notEqual(go, undefined);
  assert.equal(go.props.disabled, true);
});

test('sort and retention use in-app dropdowns, and times are not collapsed', async () => {
  const client = await loadClient(makeReact(pageValues({
    1: [ITEM],
    18: 'sort', 22: { [ITEM.id]: true },
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
  assert.ok(timeText.includes('归档记录时间'), timeText);
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
    18: 'retention', 25: true,
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

const tick = () => new Promise((resolve) => setImmediate(resolve));
const response = (data, status = 200) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => data });
const buttonNamed = (tree, name) => findAll(tree, (node) => node.type === 'button' && textOf(node) === name)[0];
const checkboxOf = (tree) => findAll(tree, (node) => node.type === 'input' && node.props.type === 'checkbox')[0];
const event = () => ({ currentTarget: { focus() {}, isConnected: true }, preventDefault() {}, stopPropagation() {} });
const manyItems = (count, extra = {}) => Array.from({ length: count }, (_, index) => ({ ...ITEM, id: 'session-item-' + index, title: '会话 ' + index, ...extra }));

test('each bulk action enforces 200 targets, while a mixed selection may exceed 200 in total', async () => {
  for (const count of [200, 201]) {
    const items = manyItems(count);
    const calls = [];
    const render = await pageRenderer(pageValues({ 1: items, 5: items.map((item) => item.id) }), { fetch: (url) => { calls.push(url); return new Promise(() => {}); } });
    const tree = render();
    const action = buttonNamed(tree, '取消归档 (' + count + ')');
    assert.equal(action.props.disabled, count > 200);
    assert.equal(findAll(tree, (node) => node.props.className === 'am-selected-count').length, 1);
    action.props.onClick(event());
    assert.equal(calls.length, count > 200 ? 0 : 1);
    if (count > 200) assert.ok(textOf(tree).includes('单次最多处理 200 条'));
  }
  const files = manyItems(200);
  const missing = { ...ITEM, id: 'missing', missing: true };
  const tree = await renderPage(pageValues({ 1: [...files, missing], 5: [...files.map((item) => item.id), missing.id] }));
  assert.equal(buttonNamed(tree, '取消归档 (200)').props.disabled, false);
  assert.equal(buttonNamed(tree, '清理失效记录 (1)').props.disabled, false);
  assert.equal(textOf(tree).includes('单次最多处理 200 条'), false);
});

test('running and hidden entries never contribute to selected count, highlights, or action scope', async () => {
  const running = { ...ITEM, id: 'running', title: 'running', running: true };
  const hidden = { ...ITEM, id: 'hidden', title: 'other' };
  const render = await pageRenderer(pageValues({ 1: [ITEM, running, hidden], 5: [ITEM.id, running.id, hidden.id], 10: '测试' }));
  let tree = render();
  assert.equal(listRows(tree).length, 1);
  assert.ok(textOf(tree).includes('已选 1 条（有文件 1 · 失效 0）'));
  render.state[10] = '';
  tree = render();
  assertRowSelection(listRows(tree).find((row) => textOf(row).includes('running')), false, 'running row');
  assert.equal(checkboxOf(listRows(tree).find((row) => textOf(row).includes('running'))).props.disabled, true);
});

test('in-flight mutation freezes selection and filtering and rejects duplicate submit before rerender', async () => {
  const calls = [];
  const render = await pageRenderer(pageValues({ 1: [ITEM], 5: [ITEM.id] }), { fetch: (url) => { calls.push(url); return new Promise(() => {}); } });
  const action = buttonNamed(render(), '取消归档 (1)');
  action.props.onClick(event());
  action.props.onClick(event());
  assert.equal(calls.length, 1);
  let tree = render();
  assert.ok(textOf(tree).includes('正在处理 1 条'));
  assert.equal(checkboxOf(listRows(tree)[0]).props.disabled, true);
  assert.equal(findAll(tree, (node) => node.type === 'input' && node.props.type === 'text')[0].props.disabled, true);
  checkboxOf(listRows(tree)[0]).props.onChange();
  checkboxOf(findByClass(tree, 'am-toolbar')).props.onChange();
  buttonNamed(tree, '取消选择').props.onClick(event());
  tree = render();
  assertRowSelection(listRows(tree)[0], true, 'still selected while processing');
});

test('all failure reasons remain available after partial success and the other tab keeps its selection', async () => {
  const items = manyItems(7);
  const results = items.map((item, index) => ({ id: item.id, ok: index === 0, error: '原因 ' + index }));
  const removedKey = REMOVED.batch + '/' + REMOVED.id;
  const render = await pageRenderer(pageValues({ 1: items, 2: [REMOVED], 5: items.map((item) => item.id), 9: [removedKey] }), { fetch: (url) => {
    if (url.endsWith('/unarchive')) return response({ ok: false, results });
    if (url.endsWith('/list')) return response({ items: items.slice(1), removed: [REMOVED] });
    if (url.endsWith('/settings')) return response({ settings: { trashRetentionDays: 0 } });
    throw new Error('unexpected ' + url);
  } });
  buttonNamed(render(), '取消归档 (7)').props.onClick(event());
  await tick();
  let tree = render();
  assert.equal(listRows(tree).length, 6);
  assert.equal(findAll(findByClass(tree, 'am-report'), (node) => node.props.className === 'am-report-item').length, 4);
  assert.equal(textOf(findByClass(tree, 'am-report')).includes('原因 6'), false);
  buttonNamed(tree, '查看全部 6 条原因').props.onClick(event());
  tree = render();
  assert.equal(findAll(findByClass(tree, 'am-report'), (node) => node.props.className === 'am-report-item').length, 6);
  assert.ok(textOf(tree).includes('原因 6'));
  assert.equal(render.state[9][0], removedKey);
  assert.deepEqual([...render.state[5]], items.slice(1).map((item) => item.id));
});

test('cleaning only stale records preserves selected file-backed records', async () => {
  const missing = { ...ITEM, id: 'missing', missing: true };
  const render = await pageRenderer(pageValues({ 1: [ITEM, missing], 5: [ITEM.id, missing.id] }), { fetch: (url) => {
    if (url.endsWith('/forget')) return response({ ok: true, results: [{ id: missing.id, ok: true }] });
    if (url.endsWith('/list')) return response({ items: [ITEM], removed: [] });
    if (url.endsWith('/settings')) return response({ settings: { trashRetentionDays: 0 } });
    throw new Error(url);
  } });
  buttonNamed(render(), '清理失效记录 (1)').props.onClick(event());
  buttonNamed(findByClass(render(), 'am-modal'), '清理记录').props.onClick(event());
  await tick();
  assert.deepEqual([...render.state[5]], [ITEM.id]);
  assertRowSelection(listRows(render())[0], true, 'unaffected selected file-backed record');
});

test('lost mutation response reconciles once, retains the last list and blocks changes if refresh fails', async () => {
  const calls = [];
  const render = await pageRenderer(pageValues({ 1: [ITEM], 5: [ITEM.id] }), { fetch: (url) => {
    calls.push(url);
    if (url.endsWith('/settings')) return response({ settings: { trashRetentionDays: 0 } });
    return Promise.reject(new Error('connection lost'));
  } });
  buttonNamed(render(), '取消归档 (1)').props.onClick(event());
  await tick();
  const tree = render();
  assert.equal(calls.filter((url) => url.endsWith('/unarchive')).length, 1);
  assert.equal(calls.filter((url) => url.endsWith('/list')).length, 1);
  assert.ok(textOf(tree).includes('结果未确认'));
  assert.ok(textOf(tree).includes('列表尚未刷新'));
  assert.equal(listRows(tree).length, 1);
  assert.equal(buttonNamed(tree, '取消归档 (1)').props.disabled, true);
  assertRowSelection(listRows(tree)[0], true, 'uncertain result retains selection');
});

test('quarantine global clear includes hidden entries, freezes the full snapshot, and is separate from selected deletion', async () => {
  const hidden = { ...REMOVED, id: 'hidden', title: '未匹配会话' };
  const calls = [];
  const render = await pageRenderer(pageValues({ 0: 'removed', 2: [REMOVED, hidden], 13: 'no-match', 18: 'quarantine-global' }), { fetch: (url, options) => {
    calls.push({ url, body: options.body && JSON.parse(options.body) });
    return new Promise(() => {});
  } });
  const tree = render();
  assert.equal(findByClass(tree, 'am-toolbar'), undefined);
  buttonNamed(tree, '清空隔离区 (2)').props.onClick(event());
  let modal = findByClass(render(), 'am-modal');
  assert.ok(textOf(modal).includes('包括当前搜索未显示的记录'));
  assert.ok(textOf(modal).includes('清空隔离区全部 2 条'));
  checkboxOf(modal).props.onChange({ target: { checked: true } });
  render.state[2] = [REMOVED, hidden, { ...REMOVED, id: 'arrived-later' }];
  modal = findByClass(render(), 'am-modal');
  buttonNamed(modal, '清空隔离区全部 2 条').props.onClick(event());
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body.items, [{ id: REMOVED.id, batch: REMOVED.batch }, { id: hidden.id, batch: hidden.batch }]);
});

test('every destructive confirmation appears once and names its actual target count', async () => {
  for (const confirm of [
    { kind: 'purge', ids: [ITEM.id], checked: false },
    { kind: 'hide', ids: [ITEM.id], checked: true },
    { kind: 'cleanup', ids: [ITEM.id], checked: true },
    { kind: 'discard', items: [{ id: REMOVED.id, batch: REMOVED.batch }], checked: false },
    { kind: 'empty', items: [{ id: REMOVED.id, batch: REMOVED.batch }], checked: false },
    { kind: 'retention', days: 30, checked: false },
  ]) {
    const tree = await renderPage(pageValues({ 1: [ITEM], 2: [REMOVED], 6: confirm }));
    assert.equal(findAll(tree, (node) => node.props.role === 'dialog').length, 1, confirm.kind);
  }
});

test('recorded files load only on demand and use exact archived or quarantine identities for folder opens', async () => {
  for (const entry of [ITEM, REMOVED]) {
    const isRemoved = Boolean(entry.batch), key = isRemoved ? entry.batch + '/' + entry.id : entry.id;
    const calls = [];
    const fileData = { ok: true, coverage: 'recorded-only', files: [{ path: '/tmp/output/a.txt', name: 'a.txt', directory: '/tmp/output', sources: ['write'], status: 'file-missing', reason: '文件已不存在', canOpen: true }, { path: '/tmp/gone/b.txt', name: 'b.txt', directory: '/tmp/gone', status: 'parent-missing', reason: '父目录已不存在', canOpen: false }], workspace: { path: '/tmp/work', status: 'available', canOpen: true } };
    const render = await pageRenderer(pageValues({ 0: isRemoved ? 'removed' : 'archived', 1: isRemoved ? [] : [entry], 2: isRemoved ? [entry] : [], 22: { [key]: true } }), { fetch: (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return response(url.endsWith('/files') ? fileData : { ok: true }); } });
    let tree = render();
    assert.equal(calls.length, 0);
    buttonNamed(tree, '查看关联文件').props.onClick(event());
    await tick();
    tree = render();
    assert.ok(textOf(tree).includes('文件已不存在'));
    assert.ok(textOf(tree).includes('可能不包含全部历史产物'));
    const opens = findAll(tree, (node) => node.type === 'button' && textOf(node) === '打开所在文件夹');
    assert.equal(opens[0].props.disabled, false);
    assert.equal(opens[1].props.disabled, true);
    opens[0].props.onClick(event());
    buttonNamed(tree, '打开工作区').props.onClick(event());
    await tick();
    const identity = isRemoved ? { id: entry.id, batch: entry.batch } : { id: entry.id };
    assert.deepEqual(calls[0].body, identity);
    assert.deepEqual(calls[1].body, { ...identity, path: '/tmp/output/a.txt' });
    assert.deepEqual(calls[2].body, { ...identity, workspace: true });
  }
});

test('version label distinguishes runtime mismatch and a local source can explicitly switch at the same version', async () => {
  const mismatch = await renderPage(pageValues({ 19: { runtimeVersion: '0.2.6', installedVersion: '0.3.0', sourceKind: 'link' } }));
  assert.ok(textOf(mismatch).includes('更新待生效'));
  const calls = [], opened = [];
  const controlUrl = 'http://localhost:3119/archived-manager/update-control/' + 'a'.repeat(48);
  const status = { ok: true, runtimeVersion: '0.3.0', installedVersion: '0.3.0', sourceKind: 'link', busy: false, canUpdate: true, job: null };
  const release = { id: 17, version: '0.3.0', htmlUrl: 'https://github.com/chen1pengvincent/dsh-archived-manager/releases/tag/v0.3.0' };
  const render = await pageRenderer(pageValues({ 19: status }), { window: { open: (...args) => opened.push(args), location: { origin: 'http://localhost:3119' } }, fetch: (url, options) => {
    calls.push({ url, body: options.body && JSON.parse(options.body) });
    if (url.endsWith('/check')) return response({ ...status, release, relation: 'same', checkedAt: 1793900000000 });
    if (url.endsWith('/prepare')) return response({ ok: true, controlUrl, job: { id: 'job', phase: 'prepared', controlUrl } });
    if (url.endsWith('/status')) return response(status);
    throw new Error(url);
  } });
  buttonNamed(render(), '检查更新').props.onClick(event());
  await tick();
  assert.equal(calls.length, 1, 'checking never installs');
  let tree = render();
  assert.ok(textOf(tree).includes('已是最新稳定版 v0.3.0'));
  buttonNamed(tree, '切换为发布版').props.onClick(event());
  await tick();
  assert.deepEqual(calls.find((call) => call.url.endsWith('/prepare')).body, { releaseId: 17, version: '0.3.0', switchFromLink: true });
  assert.equal(opened[0][0], controlUrl);
  assert.equal(findAll(render(), (node) => node.type === 'a' && node.props.href === controlUrl).length, 1, 'fallback link remains when popup is blocked');
});

test('update installation is unavailable during a data operation, during update, or when a downgrade would be required', async () => {
  const status = { runtimeVersion: '0.3.0', installedVersion: '0.3.0', sourceKind: 'release', canUpdate: true, release: { id: 1, version: '0.4.0' }, relation: 'newer' };
  for (const changes of [{ 7: true }, { 19: { ...status, busy: true } }]) {
    const tree = await renderPage(pageValues({ 1: [ITEM], 19: status, ...changes }));
    assert.equal(buttonNamed(tree, '更新到 v0.4.0').props.disabled, true);
    assert.equal(buttonNamed(tree, '取消归档').props.disabled, true);
  }
  const tree = await renderPage(pageValues({ 19: { ...status, sourceKind: 'link', relation: 'older', release: { version: '0.2.6' } } }));
  assert.equal(buttonNamed(tree, '切换为发布版'), undefined);
  assert.ok(textOf(tree).includes('不会自动降级'));
});

test('unknown sizes are shown as unconfirmed and excluded from list, selection and confirmation totals', async () => {
  const unknown = { ...ITEM, id: 'unknown', title: '不可核对会话', sizeKnown: false, sizeBytes: 0, sizeWarning: '无法确认会话日志大小，未计入日志占用', protected: true, protectionReason: '含异常链接，未处理' };
  const known = { ...ITEM, sizeKnown: true, sizeWarning: '存在未读取的非会话文件或不支持的日志格式' };
  const tree = await renderPage(pageValues({ 1: [known, unknown], 5: [known.id, unknown.id], 22: { [unknown.id]: true, [known.id]: true }, 6: { kind: 'purge', ids: [known.id, unknown.id], checked: false } }));
  const rows = listRows(tree);
  const unknownRow = rows.find((row) => textOf(row).includes('不可核对会话'));
  const knownRow = rows.find((row) => textOf(row).includes('测试会话'));
  assert.equal(textOf(findByClass(unknownRow, 'am-log-size')), '会话日志 未确认');
  assert.equal(textOf(findByClass(knownRow, 'am-log-size')), '会话日志 121 KB');
  assert.ok(textOf(unknownRow).includes('含异常链接，未处理'));
  assert.ok(textOf(knownRow).includes('存在未读取的非会话文件'));
  for (const className of ['am-summary', 'am-toolbar', 'am-modal-summary']) {
    const text = textOf(findByClass(tree, className));
    assert.ok(text.includes('121 KB'), className + ' ' + text);
    assert.ok(text.includes('1 条日志大小未确认，未计入合计'), className + ' ' + text);
  }
  const onlyUnknown = await renderPage(pageValues({ 0: 'removed', 2: [{ ...REMOVED, sizeKnown: false, bytes: 0, sizeWarning: '未能读取日志' }] }));
  assert.equal(textOf(findByClass(listRows(onlyUnknown)[0], 'am-log-size')), '会话日志 未确认');
  assert.ok(textOf(findByClass(onlyUnknown, 'am-summary')).includes('会话日志 未确认'));
});

test('dialog focus waits through refresh, then falls back to a current enabled selection or refresh control', async () => {
  for (const nextPhase of ['ready', 'stale']) {
    let focused = 'body';
    const original = { isConnected: true, disabled: false, focus() { focused = 'original'; } };
    const render = await pageRenderer(pageValues({ 1: [ITEM], 5: [ITEM.id] }), { document: { activeElement: original, addEventListener() {}, removeEventListener() {} } });
    buttonNamed(render(), '移入隔离区 (1)').props.onClick(event());
    let tree = render();
    const cancel = buttonNamed(findByClass(tree, 'am-modal'), '取消');
    cancel.props.ref.current = { isConnected: true, disabled: false, focus() { focused = 'cancel'; } };
    const dialogEffect = render.effects.find((entry) => entry.deps.length === 1 && entry.deps[0] === true);
    const cleanup = dialogEffect.fn();
    assert.equal(focused, 'cancel');
    original.isConnected = false;
    render.state[6] = null;
    render.state[3] = 'loading';
    tree = render();
    const bindControls = (tree) => {
      const all = checkboxOf(findByClass(tree, 'am-toolbar'));
      all.props.ref({ isConnected: true, disabled: all.props.disabled, focus() { focused = 'all'; } });
      const refresh = findByClass(tree, 'am-refresh');
      refresh.props.ref.current = { isConnected: true, disabled: refresh.props.disabled, focus() { focused = 'refresh'; } };
    };
    bindControls(tree);
    cleanup();
    focused = 'body';
    render.effects.find((entry) => entry.deps.length === 6).fn();
    assert.equal(focused, 'body', 'all current controls are disabled while refreshing');
    render.state[3] = nextPhase;
    tree = render();
    bindControls(tree);
    render.effects.find((entry) => entry.deps.length === 6).fn();
    assert.equal(focused, nextPhase === 'ready' ? 'all' : 'refresh', nextPhase);
  }
});

test('unreadable quarantine batches remain visible as warnings and never imply the entire quarantine is empty', async () => {
  const warnings = [{ batch: 'legacy-corrupt', reason: '隔离清单无法读取，内容已保留' }];
  let tree = await renderPage(pageValues({ 0: 'removed', 28: warnings }));
  assert.equal(findAll(tree, (node) => String(node.props.className || '').split(' ').includes('am-removed-warnings')).length, 1);
  assert.ok(textOf(tree).includes('没有可列出的隔离会话'));
  assert.ok(textOf(tree).includes('隔离区（已知 0）'));
  assert.ok(textOf(tree).includes('已知会话数量不包含这些内容'));
  assert.ok(textOf(tree).includes('legacy-corrupt · 隔离清单无法读取，内容已保留'));
  assert.equal(textOf(tree).includes('隔离区为空'), false);
  assert.equal(findByClass(tree, 'am-toolbar'), undefined);
  tree = await renderPage(pageValues({ 0: 'removed', 2: [REMOVED], 28: warnings }));
  assert.equal(listRows(tree).length, 1);
  assert.ok(textOf(tree).includes('隔离区（已知 1）'));
  assert.equal(buttonNamed(tree, '恢复会话').props.disabled, false, 'a warning does not lock verified entries');
});

test('list refresh stores quarantine warnings returned alongside known entries', async () => {
  const warnings = [{ batch: 'unknown-batch', reason: '无法核对，已保留' }];
  const render = await pageRenderer(pageValues({ 0: 'removed' }), { fetch: (url) => {
    if (url.endsWith('/list')) return response({ items: [], removed: [], removedWarnings: warnings });
    if (url.endsWith('/settings')) return response({ settings: { trashRetentionDays: 0 } });
    throw new Error(url);
  } });
  findByClass(render(), 'am-refresh').props.onClick(event());
  await tick();
  const tree = render();
  assert.ok(textOf(tree).includes('unknown-batch · 无法核对，已保留'));
  assert.ok(textOf(tree).includes('没有可列出的隔离会话'));
  assert.equal(textOf(tree).includes('隔离区为空'), false);
});
