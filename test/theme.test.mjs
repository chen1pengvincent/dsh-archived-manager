import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('workbench uses the content surface, not the elevated overlay color', async () => {
  const source = await readFile(new URL('../client/index.js', import.meta.url), 'utf8');
  assert.ok(source.includes('--am-surface:var(--dsw-alias-bg-layer-1,#fff)'));
  assert.ok(source.includes('body[data-ds-dark-theme] .am-page'));
  assert.ok(source.includes('background:var(--am-surface)'));
  assert.ok(!source.includes('.am-workbench{position:relative;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.2));border-radius:14px;background:var(--dsw-alias-bg-overlay,#1c2030)}'));
  assert.ok(source.includes('.am-btn:disabled,.am-btn.primary:disabled,.am-btn.danger:disabled,.am-btn.hazard:disabled{opacity:1;color:var(--am-text-tertiary)'));
});

test('selected rows keep accent feedback while the toolbar stays neutral', async () => {
  const source = await readFile(new URL('../client/index.js', import.meta.url), 'utf8');
  const selectedRule = '.am-row.selected,.am-row.selected:hover{background:var(--am-accent-soft);box-shadow:inset 0 0 0 1px var(--am-accent)}';
  assert.ok(source.includes(selectedRule), 'selected rows need a visible accent surface and outline');
  assert.ok(source.indexOf(selectedRule) > source.indexOf('.am-row:hover{'), 'selection must win over the hover background');
  assert.ok(!source.includes('.am-toolbar.active'), 'the select-all toolbar must never take selection highlight');
});

test('day and night text and semantic colors meet the contrast targets', () => {
  const night = {
    primary: '#f9fafb',
    secondary: '#e1e5ee',
    tertiary: '#adb2b8',
    accent: '#93c5fd',
    danger: '#ff9c8f',
    success: '#4ed17e',
    warning: '#f7ad31',
  };
  for (const [name, color] of Object.entries(night)) {
    assert.ok(contrast(color, '#232324') >= 4.5, name + ' must meet WCAG AA on the night surface');
  }
  assert.ok(contrast(night.secondary, '#232324') >= 7, 'secondary night text should be especially readable');
  assert.ok(contrast(night.tertiary, '#232324') >= 7, 'tertiary night text should be especially readable');
  assert.ok(contrast(night.accent, '#232324') >= 7, 'night accent should be especially readable');
  assert.ok(contrast(night.danger, '#232324') >= 7, 'night danger should be especially readable');

  const day = {
    secondary: '#545557',
    tertiary: '#65676b',
    accent: '#2563eb',
    success: '#147d45',
    danger: '#b42318',
    warning: '#a15c00',
  };
  for (const [name, color] of Object.entries(day)) {
    assert.ok(contrast(color, '#ffffff') >= 4.5, name + ' must meet WCAG AA on the day surface');
  }
});
