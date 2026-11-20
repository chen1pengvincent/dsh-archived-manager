import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function makeReact(values) {
  let index = 0, refIndex = 0, effectIndex = 0;
  const state = values.slice();
  if (state[1]) state[1] = state[1].map((item) => item.capabilities !== undefined ? item : {
    ...item, capabilities: item.missing ? { forget: true } : { unarchive: true, hide: true, purge: true },
  });
  if (state[2]) state[2] = state[2].map((item) => item.capabilities !== undefined ? item : {
    ...item, capabilities: { restore: true, discard: true },
  });
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
    fetch(url, options) {
      if (!url.endsWith('/preview')) throw new Error('unmocked request: ' + url);
      const body = JSON.parse(options.body);
      const items = body.ids ? react.state[1].filter((item) => body.ids.includes(item.id)) :
        body.items ? react.state[2].filter((item) => body.items.some((target) => target.id === item.id && target.batch === item.batch)) : react.state[2];
      const targets = items.map((item) => ({ id: item.id, batch: item.batch, title: item.title, bytes: item.bytes ?? item.sizeBytes }));
      return response({ targets, blocked: [], previewToken: 'preview-token' });
    },
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

function preview(kind, entries = [], extra = {}) {
  return {
    kind, targets: entries.map((item) => ({ ...item, bytes: item.bytes ?? item.sizeBytes })),
    blocked: [], checked: false, previewToken: 'preview-token', ...extra,
  };
}

function pageValues(overrides) {
  const base = [
    'archived', [], [], 'ready', null, [], null, false, null,
    [], '', 'all', 'lastUsed', '', 'movedAt', null,
    { trashRetentionDays: 0 }, { bytes: 0, files: 0 }, null,
    null, '', {}, null, '', 0, '', [],
    [], false, null,
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
  assert.equal(registered.spec.label(), '会话管理');
  const text = textOf(registered.component());
  assert.ok(text.includes('会话管理'), text);
  assert.ok(!text.includes('Session Manager'), text);
});

test('client survives a shell without a settings domain', async () => {
  const client = await loadClient(makeReact([]));
  const ctx = { inject(names, callback) { callback({ slots: undefined }); } };
  assert.doesNotThrow(() => client.apply(ctx));
});


test('the workbench keeps its controls and list area across tabs, empty, loading and stale states', async () => {
  const structuralSlots = ['am-viewbar', 'am-controls', 'am-summary', 'am-toolbar', 'am-list-area'];
  for (const tab of ['archived', 'removed']) {
    const querySlot = tab === 'archived' ? 10 : 13;
    for (const values of [
      { 3: 'ready' },
      { 1: [ITEM], 2: [REMOVED], [querySlot]: 'no-match' },
      { 3: 'loading' },
      { 3: 'stale', 1: [ITEM], 2: [REMOVED] },
    ]) {
      const tree = await renderPage(pageValues({ 0: tab, ...values }));
      const workbench = findByClass(tree, 'am-workbench');
      assert.deepEqual(workbench.children.map((node) => node.props.className), structuralSlots);
      assert.equal(findByClass(tree, 'am-stats-grid'), undefined);
      assert.ok(findByClass(workbench, 'am-refresh'));
      assert.ok(buttonNamed(workbench, '范围'));
      assert.ok(buttonNamed(workbench, '批量操作 ▾'));
    }
  }
  const empty = await renderPage(pageValues({}));
  assert.ok(textOf(findByClass(empty, 'am-list-area')).includes('暂无已归档会话'));
  assert.equal(checkboxOf(findByClass(empty, 'am-toolbar')).props.disabled, true);
  assert.equal(buttonNamed(findByClass(empty, 'am-toolbar'), '彻底删除').props.disabled, true);
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
    const summary = findByClass(tree, 'am-summary');
    assert.ok(summary);
    assert.equal(textOf(summary).includes('0 B'), false);
    const viewbar = findByClass(tree, 'am-viewbar');
    assert.notEqual(viewbar, undefined);
    assert.notEqual(findByClass(viewbar, 'am-refresh'), undefined);
    if (phase === 'loading') assert.equal(findByClass(viewbar, 'am-refresh').props.disabled, true);
  }
});

test('the confirm flow renders as a modal with release summary', async () => {
  const values = ['archived', [ITEM], [], 'ready', null, [], preview('purge', [ITEM]), false, null];
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
  assert.ok(text.includes('预计释放 121 KB'), text);
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
  const values = ['archived', [missing], [], 'ready', null, [], preview('cleanup', [missing]), false, null];
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
  const hide = buttons.find((node) => textOf(node) === '移到最近删除');
  const cleanup = buttons.find((node) => textOf(node).indexOf('清理失效记录') === 0);
  assert.equal(purge.props.disabled, true, 'the permanent action stays in its fixed position');
  assert.equal(hide, undefined);
  assert.notEqual(cleanup, undefined);
  assert.equal(cleanup.props.disabled, false);
});

test('the quarantine tab offers bulk restore, individual discard and retention controls', async () => {
  const client = await loadClient(makeReact(pageValues({
    0: 'removed', 2: [REMOVED], 16: { trashRetentionDays: 30 }, 17: { bytes: 6500000, files: 37 }, 18: 'scope',
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
  assert.ok(text.includes('自动清理 · 30 天'), text);
  assert.ok(text.includes('30 天'), text);
  assert.ok(text.includes('附件'), text);
  const buttons = findAll(tree, (node) => node.type === 'button');
  assert.notEqual(buttons.find((node) => textOf(node) === '恢复到侧栏'), undefined);
  assert.notEqual(buttons.find((node) => textOf(node) === '彻底删除'), undefined);
  assert.notEqual(buttons.find((node) => textOf(node) === '清空全部 (1)'), undefined);
  assert.ok(findAll(tree, (node) => node.props['aria-label'] === '自动清理').some((node) => node.type === 'button'));
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
  const client = await loadClient(makeReact(pageValues({ 6: preview('retention', [], { days: 30 }) })));
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
  assert.ok(text.includes('保存自动清理设置'), text);
  assert.ok(text.includes('满 30 天'), text);
  const go = findAll(modal, (node) => node.type === 'button' && textOf(node) === '保存设置')[0];
  assert.notEqual(go, undefined);
  assert.equal(go.props.disabled, true);
});


test('a partial failure exposes the failed session and reason in the result dialog', async () => {
  const render = await pageRenderer(pageValues({
    1: [ITEM],
    15: { title: '部分完成：成功 1 个，失败 1 个', failures: [{ title: '测试会话', reason: '会话正在运行' }] },
  }));
  const tree = render();
  assert.equal(findByClass(tree, 'am-report'), undefined);
  assert.ok(textOf(findByClass(tree, 'am-summary')).includes('部分完成'));
  const dialog = openResults(render);
  assert.ok(textOf(dialog).includes('测试会话 · 会话正在运行'));
  assert.equal(listRows(render()).length, 1);
});

test('archived rows expose native unarchive before the quarantine action', async () => {
  const client = await loadClient(makeReact(pageValues({ 1: [ITEM], 5: [ITEM.id], 18: 'batch' })));
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
  assert.ok(textOf(tree).includes('移到最近删除'));
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
  const client = await loadClient(makeReact(pageValues({ 0: 'removed', 2: [REMOVED], 9: [key], 18: 'batch' })));
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
  assert.ok(textOf(findByClass(tree, 'am-toolbar')).includes('已选 1 条'));
  const buttons = findAll(tree, (node) => node.type === 'button');
  const restore = buttons.find((node) => textOf(node) === '恢复到侧栏 (1)');
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
    6: preview('discard', [REMOVED]),
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
  assert.ok(text.includes('彻底删除最近删除中的 1 个会话'), text);
  assert.ok(text.includes('独立文件会保留'), text);
  const go = findAll(modal, (node) => node.type === 'button' && textOf(node) === '彻底删除 1 条')[0];
  assert.notEqual(go, undefined);
  assert.equal(go.props.disabled, true);
});


test('sorting uses an in-app dropdown and the details dialog shows full timestamps', async () => {
  const render = await pageRenderer(pageValues({ 1: [ITEM], 18: 'sort' }));
  const tree = render();
  assert.equal(findAll(tree, (node) => node.type === 'select').length, 0);
  const trigger = findAll(tree, (node) => node.type === 'button' && node.props['aria-label'] === '排序')[0];
  assert.equal(trigger.props['aria-haspopup'], 'listbox');
  assert.equal(trigger.props['aria-expanded'], true);
  const menu = findByClass(tree, 'am-select-menu');
  for (const label of ['最后使用', '首次发现归档', '体积', '标题']) assert.ok(textOf(menu).includes(label));
  assert.equal(findByClass(tree, 'am-row-times'), undefined);
  buttonNamed(listRows(tree)[0], ITEM.title).props.onClick(event());
  assert.equal(findByClass(render(), 'am-select-menu'), undefined);
  const times = findByClass(findByClass(render(), 'am-info-modal'), 'am-row-times');
  assert.ok(textOf(times).includes('最后使用'));
  assert.ok(textOf(times).includes('首次发现归档'));
  assert.ok(textOf(times).includes('2026'));
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
  assert.ok(menuText.includes('关闭'), menuText);
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
function selectBatchAction(render, label, trigger) {
  const open = event();
  if (trigger) open.currentTarget = trigger;
  buttonNamed(render(), '批量操作 ▾').props.onClick(open);
  buttonNamed(findByClass(render(), 'am-batch-menu'), label).props.onClick(event());
}

function openResults(render) {
  buttonNamed(render(), '查看结果').props.onClick(event());
  return findByClass(render(), 'am-info-modal');
}

const manyItems = (count, extra = {}) => Array.from({ length: count }, (_, index) => ({ ...ITEM, id: 'session-item-' + index, title: '会话 ' + index, ...extra }));

test('each bulk action enforces 200 targets, while a mixed selection may exceed 200 in total', async () => {
  for (const count of [200, 201]) {
    const items = manyItems(count);
    const calls = [];
    const render = await pageRenderer(pageValues({ 1: items, 5: items.map((item) => item.id), 18: 'batch' }), { fetch: (url) => { calls.push(url); return new Promise(() => {}); } });
    const tree = render();
    const action = buttonNamed(tree, '取消归档 (' + count + ')');
    assert.equal(action.props.disabled, count > 200);
    assert.equal(buttonNamed(tree, '彻底删除 (' + count + ')').props.disabled, count > 200);
    assert.equal(findAll(tree, (node) => node.props.className === 'am-selected-count').length, 1);
    action.props.onClick(event());
    if (count <= 200) buttonNamed(findByClass(render(), 'am-modal'), '取消归档').props.onClick(event());
    assert.equal(calls.length, count > 200 ? 0 : 1);
    if (count > 200) assert.ok(textOf(tree).includes('单次最多处理 200 条'));
  }
  const files = manyItems(200);
  const missing = { ...ITEM, id: 'missing', missing: true };
  const tree = await renderPage(pageValues({ 1: [...files, missing], 5: [...files.map((item) => item.id), missing.id], 18: 'batch' }));
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
  assert.ok(textOf(findByClass(tree, 'am-toolbar')).includes('已选 1 条'));
  render.state[10] = '';
  tree = render();
  assertRowSelection(listRows(tree).find((row) => textOf(row).includes('running')), false, 'running row');
  assert.equal(checkboxOf(listRows(tree).find((row) => textOf(row).includes('running'))).props.disabled, true);
});

test('in-flight mutation freezes selection and filtering and rejects duplicate submit before rerender', async () => {
  const calls = [];
  const render = await pageRenderer(pageValues({ 1: [ITEM], 5: [ITEM.id] }), { fetch: (url) => { calls.push(url); return new Promise(() => {}); } });
  selectBatchAction(render, '取消归档 (1)');
  const action = buttonNamed(findByClass(render(), 'am-modal'), '取消归档');
  action.props.onClick(event());
  action.props.onClick(event());
  assert.equal(calls.length, 1);
  let tree = render();
  assert.ok(textOf(tree).includes('正在处理 1 条'));
  assert.equal(checkboxOf(listRows(tree)[0]).props.disabled, true);
  assert.equal(findAll(tree, (node) => node.type === 'input' && node.props.type === 'search')[0].props.disabled, true);
  checkboxOf(listRows(tree)[0]).props.onChange();
  checkboxOf(findByClass(tree, 'am-toolbar')).props.onChange();
  assert.equal(buttonNamed(tree, '批量操作 ▾').props.disabled, true);
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
  selectBatchAction(render, '取消归档 (7)');
  buttonNamed(findByClass(render(), 'am-modal'), '取消归档').props.onClick(event());
  await tick();
  let tree = render();
  assert.equal(listRows(tree).length, 6);
  assert.equal(findByClass(tree, 'am-report'), undefined);
  const dialog = openResults(render);
  assert.equal(findAll(dialog, (node) => node.props.className === 'am-report-item').length, 6);
  assert.ok(textOf(dialog).includes('原因 6'));
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
  selectBatchAction(render, '清理失效记录 (1)');
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
  selectBatchAction(render, '取消归档 (1)');
  buttonNamed(findByClass(render(), 'am-modal'), '取消归档').props.onClick(event());
  await tick();
  const tree = render();
  assert.equal(calls.filter((url) => url.endsWith('/unarchive')).length, 1);
  assert.equal(calls.filter((url) => url.endsWith('/list')).length, 1);
  assert.ok(textOf(findByClass(tree, 'am-summary')).includes('刷新失败'));
  const dialog = openResults(render);
  assert.ok(textOf(dialog).includes('结果未确认'));
  assert.ok(textOf(dialog).includes('列表尚未刷新'));
  assert.equal(listRows(tree).length, 1);
  assert.equal(buttonNamed(tree, '批量操作 ▾').props.disabled, true);
  assertRowSelection(listRows(tree)[0], true, 'uncertain result retains selection');
});

test('quarantine global clear includes hidden entries, freezes the full snapshot, and is separate from selected deletion', async () => {
  const hidden = { ...REMOVED, id: 'hidden', title: '未匹配会话' };
  const calls = [];
  const render = await pageRenderer(pageValues({ 0: 'removed', 2: [REMOVED, hidden], 13: 'no-match' }), { fetch: (url, options) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, body });
    if (url.endsWith('/preview')) return response({ targets: [REMOVED, hidden], blocked: [], previewToken: 'global-preview' });
    return new Promise(() => {});
  } });
  const tree = render();
  assert.equal(checkboxOf(findByClass(tree, 'am-toolbar')).props.disabled, true);
  buttonNamed(tree, '清空全部 (2)').props.onClick(event());
  await tick();
  let modal = findByClass(render(), 'am-modal');
  assert.ok(textOf(modal).includes('范围包含搜索隐藏的记录'));
  assert.ok(textOf(modal).includes('清空最近删除'));
  checkboxOf(modal).props.onChange({ target: { checked: true } });
  render.state[2] = [REMOVED, hidden, { ...REMOVED, id: 'arrived-later' }];
  modal = findByClass(render(), 'am-modal');
  buttonNamed(modal, '彻底删除 2 条').props.onClick(event());
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body, { action: 'empty' });
  assert.equal(calls[1].body.previewToken, 'global-preview');
  assert.deepEqual(calls[1].body.items, [{ id: REMOVED.id, batch: REMOVED.batch }, { id: hidden.id, batch: hidden.batch }]);
});

test('every destructive confirmation appears once and names its actual target count', async () => {
  for (const confirm of [
    preview('purge', [ITEM]),
    preview('hide', [ITEM]),
    preview('cleanup', [ITEM]),
    preview('discard', [REMOVED]),
    preview('empty', [REMOVED]),
    preview('retention', [], { days: 30 }),
  ]) {
    const tree = await renderPage(pageValues({ 1: [ITEM], 2: [REMOVED], 6: confirm }));
    assert.equal(findAll(tree, (node) => node.props.role === 'dialog').length, 1, confirm.kind);
  }
});

test('recorded files load only on demand and use exact archived or quarantine identities for folder opens', async () => {
  for (const entry of [ITEM, REMOVED]) {
    const isRemoved = Boolean(entry.batch);
    const calls = [];
    const fileData = { ok: true, coverage: 'recorded-only', files: [{ path: '/tmp/output/a.txt', name: 'a.txt', directory: '/tmp/output', sources: ['write'], status: 'file-missing', reason: '文件已不存在', canOpen: true }, { path: '/tmp/gone/b.txt', name: 'b.txt', directory: '/tmp/gone', status: 'parent-missing', reason: '父目录已不存在', canOpen: false }], workspace: { path: '/tmp/work', status: 'available', canOpen: true } };
    const render = await pageRenderer(pageValues({ 0: isRemoved ? 'removed' : 'archived', 1: isRemoved ? [] : [entry], 2: isRemoved ? [entry] : [] }), { fetch: (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return response(url.endsWith('/files') ? fileData : { ok: true }); } });
    let tree = render();
    assert.equal(calls.length, 0);
    buttonNamed(listRows(tree)[0], entry.title).props.onClick(event());
    assert.equal(calls.length, 0, 'opening details does not fetch file locations');
    buttonNamed(findByClass(render(), 'am-info-modal'), '查看关联文件').props.onClick(event());
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
  const mismatch = await renderPage(pageValues({ 19: { runtimeVersion: '0.2.6', installedVersion: '0.3.1', sourceKind: 'link' } }));
  assert.ok(textOf(mismatch).includes('更新待生效'));
  const calls = [], opened = [];
  const controlUrl = 'http://localhost:3119/archived-manager/update-control/' + 'a'.repeat(48);
  const status = { ok: true, runtimeVersion: '0.3.1', installedVersion: '0.3.1', sourceKind: 'link', busy: false, canUpdate: true, job: null };
  const release = { id: 17, version: '0.3.1', htmlUrl: 'https://github.com/chen1pengvincent/dsh-archived-manager/releases/tag/v0.3.1' };
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
  assert.ok(textOf(tree).includes('已是最新稳定版 v0.3.1'));
  buttonNamed(tree, '切换为发布版').props.onClick(event());
  await tick();
  assert.deepEqual(calls.find((call) => call.url.endsWith('/prepare')).body, { releaseId: 17, version: '0.3.1', switchFromLink: true });
  assert.equal(opened[0][0], controlUrl);
  assert.equal(findAll(render(), (node) => node.type === 'a' && node.props.href === controlUrl).length, 1, 'fallback link remains when popup is blocked');
});

test('update installation is unavailable during a data operation, during update, or when a downgrade would be required', async () => {
  const status = { runtimeVersion: '0.3.1', installedVersion: '0.3.1', sourceKind: 'release', canUpdate: true, release: { id: 1, version: '0.4.1' }, relation: 'newer' };
  for (const changes of [{ 7: true }, { 19: { ...status, busy: true } }]) {
    const tree = await renderPage(pageValues({ 1: [ITEM], 18: 'version', 19: status, ...changes }));
    assert.equal(buttonNamed(tree, '更新到 v0.4.1').props.disabled, true);
    assert.equal(buttonNamed(tree, '取消归档').props.disabled, true);
  }
  const tree = await renderPage(pageValues({ 18: 'version', 19: { ...status, sourceKind: 'link', relation: 'older', release: { version: '0.2.6' } } }));
  assert.equal(buttonNamed(tree, '切换为发布版'), undefined);
  assert.ok(textOf(tree).includes('不会自动降级'));
});

test('unknown sizes are shown as unconfirmed and excluded from list, selection and confirmation totals', async () => {
  const unknown = { ...ITEM, id: 'unknown', title: '不可核对会话', sizeKnown: false, sizeBytes: 0, sizeWarning: '无法确认会话日志大小，未计入日志占用', protected: true, protectionReason: '含异常链接，未处理' };
  const known = { ...ITEM, sizeKnown: true, sizeWarning: '存在未读取的非会话文件或不支持的日志格式' };
  const tree = await renderPage(pageValues({ 1: [known, unknown], 5: [known.id, unknown.id], 18: 'batch' }));
  const rows = listRows(tree);
  const unknownRow = rows.find((row) => textOf(row).includes('不可核对会话'));
  const knownRow = rows.find((row) => textOf(row).includes('测试会话'));
  assert.equal(textOf(findByClass(unknownRow, 'am-log-size')), '日志占用 未确认');
  assert.equal(textOf(findByClass(knownRow, 'am-log-size')), '日志占用 121 KB');
  const detailRender = await pageRenderer(pageValues({ 1: [known, unknown] }));
  for (const item of [known, unknown]) {
    buttonNamed(detailRender(), item.title).props.onClick(event());
    const details = findByClass(detailRender(), 'am-info-modal');
    assert.ok(textOf(details).includes(item.protectionReason || item.sizeWarning));
    buttonNamed(details, '关闭').props.onClick(event());
  }
  for (const className of ['am-summary', 'am-batch-menu']) {
    const text = textOf(findByClass(tree, className));
    assert.ok(text.includes('121 KB'), className + ' ' + text);
    assert.ok(text.includes('1 条日志大小未确认，未计入合计'), className + ' ' + text);
  }
  const confirmation = await renderPage(pageValues({
    1: [known, unknown], 6: preview('purge', [known, { ...unknown, sizeBytes: undefined }]),
  }));
  const confirmationSize = textOf(findByClass(confirmation, 'am-modal-summary'));
  assert.ok(confirmationSize.includes('121 KB'));
  assert.ok(confirmationSize.includes('1 条日志大小未确认，未计入合计'));
  const onlyUnknown = await renderPage(pageValues({ 0: 'removed', 2: [{ ...REMOVED, sizeKnown: false, bytes: 0, sizeWarning: '未能读取日志' }] }));
  assert.equal(textOf(findByClass(listRows(onlyUnknown)[0], 'am-log-size')), '日志占用 未确认');
  assert.ok(textOf(findByClass(onlyUnknown, 'am-summary')).includes('日志占用 未确认'));
});

test('dialog focus waits through refresh, then falls back to a current enabled selection or refresh control', async () => {
  for (const nextPhase of ['ready', 'stale']) {
    let focused = 'body';
    const original = { isConnected: true, disabled: false, focus() { focused = 'original'; } };
    const render = await pageRenderer(pageValues({ 1: [ITEM], 5: [ITEM.id] }), {
      document: { activeElement: original }, window: { addEventListener() {}, removeEventListener() {} },
    });
    selectBatchAction(render, '移到最近删除 (1)', original);
    let tree = render();
    const cancel = buttonNamed(findByClass(tree, 'am-modal'), '取消');
    cancel.props.ref.current = { isConnected: true, disabled: false, focus() { focused = 'cancel'; } };
    const dialogEffect = render.effects.findLast((entry) => entry.deps[0] === true && entry.deps[1] === false);
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
  const render = await pageRenderer(pageValues({ 0: 'removed', 26: warnings }));
  let tree = render();
  assert.ok(textOf(findByClass(tree, 'am-summary')).includes('无法确认的批次'));
  assert.ok(textOf(tree).includes('没有可显示的最近删除会话'));
  assert.ok(textOf(tree).includes('最近删除（已知 0）'));
  const details = openResults(render);
  assert.ok(textOf(details).includes('已知会话数量不包含这些内容'));
  assert.ok(textOf(details).includes('legacy-corrupt · 隔离清单无法读取，内容已保留'));
  assert.equal(textOf(tree).includes('最近删除为空'), false);
  assert.equal(checkboxOf(findByClass(tree, 'am-toolbar')).props.disabled, true);
  tree = await renderPage(pageValues({ 0: 'removed', 2: [REMOVED], 26: warnings }));
  assert.equal(listRows(tree).length, 1);
  assert.ok(textOf(tree).includes('最近删除（已知 1）'));
  assert.equal(buttonNamed(tree, '恢复到侧栏').props.disabled, false, 'a warning does not lock verified entries');
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
  assert.ok(textOf(openResults(render)).includes('unknown-batch · 无法核对，已保留'));
  assert.ok(textOf(tree).includes('没有可显示的最近删除会话'));
  assert.equal(textOf(tree).includes('最近删除为空'), false);
});

test('version details toggle shares the version row and exposes its keyboard-accessible disclosure state', async () => {
  const render = await pageRenderer(pageValues({ 19: { runtimeVersion: '0.4.3', installedVersion: '0.4.3', sourceKind: 'link', busy: false } }));
  let tree = render();
  const line = findByClass(tree, 'am-version-line');
  assert.ok(textOf(line).includes('v0.4.3'));
  const toggle = buttonNamed(line, '版本详情');
  assert.notEqual(toggle, undefined, 'the disclosure button is on the version row');
  assert.equal(toggle.props.type, 'button');
  assert.equal(toggle.props['aria-expanded'], false);
  assert.equal(findByClass(tree, 'am-version-details'), undefined, 'collapsed details do not reserve a second row');
  assert.notEqual(toggle.props.tabIndex, -1);
  toggle.props.onClick(event());
  tree = render();
  const panel = findByClass(tree, 'am-version-details');
  assert.equal(panel.props.id, toggle.props['aria-controls']);
  assert.ok(textOf(panel).includes('页面版本：v0.4.3'));
  assert.ok(textOf(panel).includes('服务版本：0.4.3'));
  assert.equal(buttonNamed(tree, '版本详情').props['aria-expanded'], true);
  buttonNamed(tree, '版本详情').props.onClick(event());
  assert.equal(findByClass(render(), 'am-version-details'), undefined);
});

test('individual and bulk deletion buttons open the same explicit confirmation without a more menu', async () => {
  for (const isRemoved of [false, true]) {
    const another = isRemoved ? { ...REMOVED, id: 'session-another', title: '另一个隔离会话' } : { ...ITEM, id: 'session-another', title: '另一个会话' };
    const entries = isRemoved ? [REMOVED, another] : [ITEM, another];
    const selection = entries.map((item) => isRemoved ? item.batch + '/' + item.id : item.id);
    const values = pageValues({ 0: isRemoved ? 'removed' : 'archived', 1: isRemoved ? [] : entries, 2: isRemoved ? entries : [], 5: isRemoved ? [] : selection, 9: isRemoved ? selection : [] });
    const render = await pageRenderer(values);
    let tree = render();
    assert.equal(findAll(tree, (node) => node.props['aria-haspopup'] === 'menu').length, 0);
    const rowDelete = buttonNamed(listRows(tree)[0], '彻底删除');
    assert.notEqual(rowDelete, undefined);
    assert.ok(rowDelete.props.className.split(' ').includes('danger'));
    rowDelete.props.onClick(event());
    tree = render();
    assert.equal(findAll(tree, (node) => node.props.role === 'dialog').length, 1);
    let modal = findByClass(tree, 'am-modal');
    assert.equal(buttonNamed(modal, '彻底删除 1 条').props.disabled, true);
    buttonNamed(modal, '取消').props.onClick(event());
    tree = render();
    const batchDelete = buttonNamed(findByClass(tree, 'am-toolbar'), '彻底删除 (2)');
    assert.notEqual(batchDelete, undefined);
    assert.ok(batchDelete.props.className.split(' ').includes('danger'));
    batchDelete.props.onClick(event());
    modal = findByClass(render(), 'am-modal');
    assert.equal(buttonNamed(modal, '彻底删除 2 条').props.disabled, true);
    await tick();
    assert.deepEqual([...render.state[6].targets].map((item) => isRemoved ? item.batch + '/' + item.id : item.id), selection);
  }
});

test('delete preview uses host targets and retains skipped selections when scope changes', async () => {
  const allowed = { ...ITEM, capabilities: { unarchive: true, hide: true, purge: true } };
  const changed = { ...allowed, id: 'changed', title: '状态已变化的会话' };
  const protectedItem = { ...allowed, id: 'protected', title: '受保护会话', capabilities: {
    unarchive: true,
    hide: { code: 'protected-content', reason: '日志目录包含独立文件' },
    purge: { code: 'protected-content', reason: '日志目录包含独立文件' },
  } };
  const calls = [];
  const render = await pageRenderer(pageValues({
    1: [allowed, changed, protectedItem], 5: [allowed.id, changed.id, protectedItem.id],
  }), { fetch: (url, options) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, body });
    if (url.endsWith('/preview')) return response({
      targets: [{ id: allowed.id, title: allowed.title, bytes: allowed.sizeBytes }],
      blocked: [{ id: changed.id, code: 'occupied', reason: '宿主仍占用会话' }],
      previewToken: 'exact-purge',
    });
    if (url.endsWith('/purge')) return response({ ok: true, results: [{ id: allowed.id, ok: true }] });
    if (url.endsWith('/list')) return response({ items: [changed, protectedItem], removed: [] });
    if (url.endsWith('/settings')) return response({ settings: { trashRetentionDays: 0 } });
    throw new Error(url);
  } });
  const tree = render();
  const protectedRow = listRows(tree).find((row) => textOf(row).includes('受保护会话'));
  assert.equal(buttonNamed(protectedRow, '取消归档').props.disabled, false);
  assert.equal(buttonNamed(protectedRow, '彻底删除').props.disabled, true);
  assert.equal(findByClass(protectedRow, 'am-badge').props.title, '日志目录包含独立文件');
  buttonNamed(tree, '彻底删除 (2)').props.onClick(event());
  assert.ok(textOf(findByClass(render(), 'am-modal')).includes('正在核对操作范围'));
  assert.deepEqual(calls[0].body, { action: 'purge', ids: [allowed.id, changed.id] });
  await tick();
  let modal = findByClass(render(), 'am-modal');
  assert.ok(textOf(modal).includes('待处理 2 条'));
  assert.ok(textOf(modal).includes('状态已变化的会话 · 宿主仍占用会话'));
  assert.ok(textOf(modal).includes('受保护会话 · 日志目录包含独立文件'));
  assert.equal(buttonNamed(modal, '彻底删除 1 条').props.disabled, true);
  checkboxOf(modal).props.onChange({ target: { checked: true } });
  modal = findByClass(render(), 'am-modal');
  buttonNamed(modal, '彻底删除 1 条').props.onClick(event());
  await tick();
  assert.deepEqual(calls[1].body, { ids: [allowed.id], confirm: 'PURGE', previewToken: 'exact-purge' });
  assert.deepEqual([...render.state[5]], [changed.id, protectedItem.id]);
  assert.ok(textOf(openResults(render)).includes('跳过 2 条'));
});

test('one-click move uses a host preview before committing and opens Recently Deleted from the result', async () => {
  const calls = [];
  const render = await pageRenderer(pageValues({ 1: [ITEM] }), { fetch: (url, options) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, body });
    if (url.endsWith('/preview')) return response({ targets: [{ id: ITEM.id, bytes: ITEM.sizeBytes }], blocked: [], previewToken: 'exact-move' });
    if (url.endsWith('/hide')) return response({ results: [{ id: ITEM.id, ok: true, action: 'hide' }] });
    if (url.endsWith('/list')) return response({ items: [], removed: [REMOVED] });
    if (url.endsWith('/settings')) return response({ settings: { trashRetentionDays: 0 } });
    throw new Error(url);
  } });
  const action = buttonNamed(listRows(render())[0], '移到最近删除');
  action.props.onClick(event());
  action.props.onClick(event());
  assert.equal(calls.length, 1);
  assert.equal(findByClass(render(), 'am-modal'), undefined);
  await tick();
  assert.deepEqual(calls[0].body, { action: 'hide', ids: [ITEM.id] });
  assert.deepEqual(calls[1].body, { ids: [ITEM.id], previewToken: 'exact-move' });
  buttonNamed(openResults(render), '查看最近删除').props.onClick(event());
  assert.equal(render.state[0], 'removed');
});

test('automatic cleanup submits the selected policy with the acknowledged exact expired set', async () => {
  const old = { ...REMOVED, title: '到期的会话' };
  const calls = [];
  const render = await pageRenderer(pageValues({
    0: 'removed', 2: [old], 16: { trashRetentionDays: 0 }, 18: 'retention',
  }), { fetch: (url, options) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, body });
    if (url.endsWith('/preview')) return response({ targets: [{ id: old.id, batch: old.batch, title: old.title, bytes: old.bytes }], blocked: [], previewToken: 'retention-preview' });
    if (url.endsWith('/settings/save')) return response({ settings: { trashRetentionDays: 7 }, swept: { results: [{ id: old.id, batch: old.batch, ok: true, bytes: old.bytes }] } });
    if (url.endsWith('/list')) return response({ items: [], removed: [] });
    if (url.endsWith('/settings')) return response({ settings: { trashRetentionDays: 7 } });
    throw new Error(url);
  } });
  const option = findAll(render(), (node) => node.props.role === 'option' && textOf(node).startsWith('移入满 7 天'))[0];
  option.props.onClick(event());
  assert.deepEqual(calls[0].body, { action: 'retention', trashRetentionDays: 7 });
  await tick();
  let modal = findByClass(render(), 'am-modal');
  assert.ok(textOf(modal).includes('到期的会话'));
  assert.equal(buttonNamed(modal, '保存设置').props.disabled, true);
  checkboxOf(modal).props.onChange({ target: { checked: true } });
  modal = findByClass(render(), 'am-modal');
  buttonNamed(modal, '保存设置').props.onClick(event());
  await tick();
  assert.deepEqual(calls[1].body, {
    trashRetentionDays: 7, items: [{ id: old.id, batch: old.batch }], previewToken: 'retention-preview',
  });
  assert.equal(render.state[16].trashRetentionDays, 7);
  assert.ok(textOf(render()).includes('已清理 1 条过期会话日志'));
});


test('a loaded session explains the restart path instead of only disabling delete', async () => {
  const loaded = {
    ...ITEM,
    loaded: true,
    capabilities: {
      unarchive: true,
      hide: { code: 'restart-required', reason: '会话仍由当前 DSH 进程加载' },
      purge: { code: 'restart-required', reason: '会话仍由当前 DSH 进程加载' },
    },
  };
  const render = await pageRenderer(pageValues({ 1: [loaded] }), { fetch: (url, options) => {
    if (url.endsWith('/diagnose')) return response({ items: [{ id: loaded.id, state: 'loaded', loaded: true, running: false, activities: [] }] });
    throw new Error(url);
  } });
  const tree = render();
  const row = listRows(tree)[0];
  assert.ok(textOf(row).includes('需重启 DSH'));
  buttonNamed(row, '处理').props.onClick(event());
  await tick();
  const guide = findByClass(render(), 'am-guide-modal');
  assert.ok(textOf(guide).includes('当前 DSH 已加载该会话'));
  assert.ok(textOf(guide).includes('Cmd+Q'));
  assert.equal(buttonNamed(guide, '继续删除'), undefined);
  assert.ok(buttonNamed(guide, '记录并在重启后继续'));
});

test('an activity-blocked session still offers the guide', async () => {
  const busy = {
    ...ITEM,
    running: false,
    capabilities: {
      unarchive: true,
      hide: { code: 'occupied', reason: '会话仍有宿主活动' },
      purge: { code: 'occupied', reason: '会话仍有宿主活动' },
    },
  };
  const render = await pageRenderer(pageValues({ 1: [busy] }), { fetch: (url) => {
    if (url.endsWith('/diagnose')) return response({ items: [{ id: busy.id, state: 'activity', loaded: false, running: false, activities: [{ kind: 'job', items: ['同步任务'] }] }] });
    throw new Error(url);
  } });
  const row = listRows(render())[0];
  assert.ok(textOf(row).includes('宿主占用中'));
  buttonNamed(row, '处理').props.onClick(event());
  await tick();
  const guide = findByClass(render(), 'am-guide-modal');
  assert.ok(textOf(guide).includes('同步任务'));
  assert.equal(buttonNamed(guide, '继续删除'), undefined);
});

test('a loaded unfinished removed session still offers the guide', async () => {
  const entry = {
    ...REMOVED,
    loaded: true,
    capabilities: {
      restore: { code: 'restart-required', reason: '加载中' },
      discard: { code: 'restart-required', reason: '加载中' },
      repair: { code: 'restart-required', reason: '加载中' },
    },
  };
  const render = await pageRenderer(pageValues({ 0: 'removed', 2: [entry] }));
  const row = listRows(render())[0];
  assert.ok(textOf(row).includes('需重启 DSH'));
  assert.notEqual(buttonNamed(row, '处理'), undefined);
});

test('an activity-blocked unfinished removed session still offers the guide', async () => {
  const entry = {
    ...REMOVED,
    capabilities: {
      restore: { code: 'occupied', reason: '会话仍有宿主活动' },
      discard: { code: 'occupied', reason: '会话仍有宿主活动' },
      repair: { code: 'occupied', reason: '会话仍有宿主活动' },
    },
  };
  const render = await pageRenderer(pageValues({ 0: 'removed', 2: [entry] }));
  const row = listRows(render())[0];
  assert.ok(textOf(row).includes('宿主占用中'));
  assert.notEqual(buttonNamed(row, '处理'), undefined);
});

test('an unfinished archived session links to Recently Deleted', async () => {
  const pending = {
    ...ITEM,
    capabilities: {
      unarchive: true,
      hide: { code: 'repair-required', reason: '上次操作尚未完成' },
      purge: { code: 'repair-required', reason: '上次操作尚未完成' },
    },
  };
  const render = await pageRenderer(pageValues({ 1: [pending] }));
  const row = listRows(render())[0];
  assert.notEqual(buttonNamed(row, '查看最近删除'), undefined);
});

test('guide continues to the normal preview only after the lock is free', async () => {
  const loaded = {
    ...ITEM,
    loaded: true,
    capabilities: { unarchive: true, hide: { code: 'restart-required', reason: '加载中' }, purge: { code: 'restart-required', reason: '加载中' } },
  };
  const render = await pageRenderer(pageValues({ 1: [loaded] }), { fetch: (url) => {
    if (url.endsWith('/diagnose')) return response({ items: [{ id: loaded.id, state: 'free', loaded: false, running: false, activities: [] }] });
    if (url.endsWith('/preview')) return response(preview('purge', [loaded]));
    throw new Error(url);
  } });
  buttonNamed(listRows(render())[0], '处理').props.onClick(event());
  await tick();
  let guide = findByClass(render(), 'am-guide-modal');
  const recheck = buttonNamed(guide, '重新检测');
  recheck.props.onClick(event());
  await tick();
  guide = findByClass(render(), 'am-guide-modal');
  assert.ok(textOf(guide).includes('写入锁已释放'));
  buttonNamed(guide, '继续删除').props.onClick(event());
  await tick();
  const modal = findByClass(render(), 'am-modal');
  assert.ok(textOf(modal).includes('彻底删除 1 条'));
});

test('the pending banner resumes the saved deletion scope', async () => {
  const pending = [{ id: ITEM.id, scope: 'archived', title: ITEM.title, at: Date.now(), lastCode: 'restart-required' }];
  const render = await pageRenderer(pageValues({ 1: [ITEM], 27: pending }), { fetch: (url) => {
    if (url.endsWith('/preview')) return response(preview('purge', [ITEM]));
    throw new Error(url);
  } });
  const tree = render();
  assert.ok(textOf(tree).includes('有 1 个会话待彻底删除'));
  buttonNamed(tree, '继续删除 1 个已归档会话').props.onClick(event());
  await tick();
  const modal = findByClass(render(), 'am-modal');
  assert.ok(textOf(modal).includes('彻底删除 1 条'));
});
