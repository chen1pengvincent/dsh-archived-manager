# 可访问性、配色与排版

## 为什么夜间曾经难读

夜间工作台误用了 DSH 的 `--dsw-alias-bg-overlay`（当前约 `#61666b`）。它适合弹层，不适合承载大面积正文。次级文字、三级提示和低透明度禁用态叠在这个中灰表面上，导致对比度不足。

现在工作台、指标和下拉菜单统一使用 DSH 的内容表面 `--dsw-alias-bg-layer-1`（夜间约 `#232324`）。弹窗仍保留 overlay 语义。

## 行业依据

- [WCAG 2.2 SC 1.4.3 Contrast (Minimum)](https://w3c.github.io/wcag/understanding/contrast-minimum.html)：普通正文对比度至少 4.5:1，大号文字至少 3:1。
- [Apple Human Interface Guidelines — Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)：至少 4.5:1，尤其小字建议争取 7:1；使用随外观变化的标签色，避免硬编码不自适应的颜色。
- [Primer — Increase contrast for dark fg.subtle](https://github.com/primer/primitives/commit/da4ffd338a41bb1f653e096c8b886db4834b3715)：夜间弱化文字也需要专门提升对比度。
- [Atlassian Design — Elevation](https://atlassian.design/foundations/elevation)：表面层级与文字层级分别表达，不能把层级灰色同时当作背景与弱化文字。
- [Atlassian Design — Design tokens](https://atlassian.design/foundations/tokens/design-tokens)：优先语义令牌，避免破坏深色主题的硬编码。

本插件不另设字体族，沿用 DSH 系统字体，避免中西文混排风格不一致。

## 夜间令牌

背景为 `#232324`。目标不仅是达到 4.5:1，也尽量让次级信息接近或超过 7:1。

| 语义 | 颜色 | 对比度 |
|---|---|---:|
| 主文字 | `#f9fafb` | 15.03:1 |
| 次级文字 | `#e1e5ee` | 12.45:1 |
| 三级提示/禁用态 | `#adb2b8` | 7.36:1 |
| 选中/聚焦蓝 | `#93c5fd` | 8.45:1 |
| 成功绿 | `#4ed17e` | 8.03:1 |
| 警告黄 | `#f7ad31` | 8.21:1 |
| 危险红 | `#ff9c8f` | 7.78:1 |

弹窗正文使用次级文字 `#e1e5ee`，在 overlay `#61666b` 上为 4.60:1，仍达到 WCAG AA。

## 日间令牌

背景为白色。日间弱化色与强调色也全部达到 4.5:1。

| 语义 | 颜色 | 对比度 |
|---|---|---:|
| 次级文字 | `#545557` | 7.39:1 |
| 三级提示 | `#65676b` | 5.66:1 |
| 选中/聚焦蓝 | `#2563eb` | 5.17:1 |
| 成功绿 | `#147d45` | 5.19:1 |
| 警告黄 | `#a15c00` | 5.19:1 |
| 危险红 | `#b42318` | 6.57:1 |

禁用按钮不再使用“语义色 + 40%/55% 透明度”。现在统一使用三级提示色和弱边框，保持“不可操作”的语义，同时仍能读出按钮名称与原因。

## 排版

- 页面标题：18px / 600
- 页面说明：13px
- 正文与按钮：12–13px
- 指标数值：22px / 600
- 会话标题：14px / 500
- 会话元信息、时间、范围说明：12px
- 徽章：11px
- 保留工作台分区，不用增加卡片数量来制造层级；窄屏继续自动换行，不截断时间。

## 自动约束

`test/theme.test.mjs` 做两类回归：

1. 禁止工作台重新使用 overlay，并要求禁用按钮使用三级提示色；
2. 计算日夜语义色的实际 WCAG 对比度，正文全部 ≥ 4.5:1，夜间次级文字、三级提示、选中蓝和危险红额外要求 ≥ 7:1。
