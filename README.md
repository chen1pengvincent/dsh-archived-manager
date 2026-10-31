# dsh-archived-manager

[![test](https://github.com/chen1pengvincent/dsh-archived-manager/actions/workflows/test.yml/badge.svg)](https://github.com/chen1pengvincent/dsh-archived-manager/actions/workflows/test.yml)

> DeepSeek Harness（DSH）归档会话管理插件：原生取消归档、可恢复隔离区、彻底删除、批量选择、检索与保留策略。

[中文文档](#dsh-archived-manager) · [English](#english) · [Releases](https://github.com/chen1pengvincent/dsh-archived-manager/releases)

## 功能

- **取消归档**：调用 DSH 原生 `unarchiveSession`，会话回到侧栏，日志文件原地保留。
- **移入隔离区**：把会话日志目录移入插件隔离区；可从隔离区单独或批量恢复。
- **彻底删除**：经明确确认后永久删除会话日志；项目文件和共享附件不在删除范围内。
- **清理失效记录**：日志目录已不存在时，只移除归档记录，不触碰其他文件。
- **批量与检索**：单选、全选当前筛选结果，按标题/工作区/ID 搜索，按状态筛选，按时间、体积或标题排序。
- **隔离区保留策略**：永不自动清理，或保留 7 / 30 / 90 天；默认永不。
- **本地优先**：运行时无遥测，不主动发起外部网络请求；管理接口仅接受本机回环、同源且带自定义请求头的调用。

## 安装与升级

### 从 GitHub 安装（推荐）

1. 打开 **DSH → 设置 → 插件 → 安装**。
2. 输入以下 spec：

   ```text
   github:chen1pengvincent/dsh-archived-manager#v0.2.6
   ```

3. 安装后**完全退出并重新打开 DSH**，再硬刷新页面（macOS：`Cmd+Shift+R`）。
4. 打开 **设置 → 归档会话**。

从旧版本升级时，用新版本 spec 重新安装并重启。无需额外构建，也无需在本机单独安装 Node.js；Node.js 20+ 仅用于源码开发和测试。

### 本地源码安装

```bash
git clone https://github.com/chen1pengvincent/dsh-archived-manager.git
```

在 DSH 插件安装入口使用：

```text
link:/absolute/path/to/dsh-archived-manager
```

把路径替换为实际 checkout。链接安装后，替换已加载的 Host/Client 代码仍需要重启 DSH，不能只依据磁盘文件变化判断新版本已经生效。

## 使用

### 已归档

每行显示标题、工作区、状态、最后使用时间、归档时间和会话日志目录体积。可执行：

| 操作 | 文件在盘 | 文件缺失 |
|---|---|---|
| 取消归档 | 回到侧栏，文件原地保留 | 使用“清理失效记录” |
| 移入隔离区 | 移动日志目录，可恢复 | 不处理该记录 |
| 彻底删除 | 永久删除日志目录，需确认 | 使用“清理失效记录” |
| 清理失效记录 | 不适用 | 只移除归档记录 |

运行中的会话不可选择或删除；请先停止对应会话。

### 选中与高亮契约

高亮由**每一行自己的选中状态**决定，而不是由“是否点击了全选”单独决定：

- **全选**：当前筛选结果中的所有可选行都显示强调色背景和完整内描边；运行中行不参与全选。
- **单选**：只有对应行高亮，其他行保持原样。
- **取消选择**：该行高亮立即消退；全部取消后，列表不再保留选中高亮。
- **隔离区**：使用同一套逐行高亮规则。
- **工具条**：永远不参与选中高亮；只显示全选/半选状态、已选数量和批量操作可用性，不因单选或全选出现选中背景或描边。

搜索和筛选会改变当前可见集合；“全选”只作用于当前可见结果，不会在后台选中其他结果。

### 隔离区

- 单独或批量**恢复**到原会话目录；
- 单独或批量**彻底删除**；
- **清空隔离区**；
- 配置自动保留期限。开启自动清理需要二次确认，保存后立即检查过期条目。

危险操作使用模态确认框，并要求勾选不可恢复确认。界面语言跟随 **DSH → 设置 → 通用 → 语言**，旧版缺少 locale 服务时才回退到浏览器语言。

## 删除范围与安全边界

| 范围 | 行为 |
|---|---|
| 会话日志 | 只有明确执行彻底删除、隔离区删除或过期清理时才永久删除 |
| 项目文件 | 不删除、不移动 |
| 共享附件 | 不随会话删除；附件采用内容寻址，可能跨会话共享 |
| 归档记录 | 取消归档、隔离、删除或清理失效记录时按操作更新 |
| 定时提醒 | 删除或隔离前停止关联提醒，避免留下孤儿任务 |
| DSH 工作区账本 | 只通过公开 API 操作，不直接手写 `workspace.json` |

其他保护措施：

- 只接受 UUID 形状的会话 ID；校验真实路径、manifest 目录和恢复目标，拒绝路径穿越。
- 删除和统计不跟随符号链接。
- 非归档会话、运行中会话及缺少确认的危险请求会被拒绝。
- Host 内串行执行变更操作，前端在请求期间禁用相关按钮。
- HTTP 路由校验回环地址、同源和 `x-archived-manager: 1` 自定义头。

## 数据位置

默认 `<DSH_HOME>` 为 `~/.dsh`：

| 数据 | 位置 |
|---|---|
| 隔离区 | `<DSH_HOME>/archived-manager/trash/<批次>/` |
| 隔离区 manifest | 每个批次目录中的 `manifest.json` |
| 归档首次观测时间 | `<DSH_HOME>/archived-manager/archive-times.json` |
| 保留策略 | `<DSH_HOME>/archived-manager/settings.json` |
| 会话日志 | `<DSH_HOME>/sessions/` |
| 共享附件 | `<DSH_HOME>/attachments/` |

首次运行前已经存在的归档记录无法反推真实归档时间，因此显示“未记录”，不会伪装成插件安装时间。

## 本机 HTTP API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/archived-manager/list` | 归档列表、隔离区列表与体积统计 |
| POST | `/archived-manager/unarchive` `{ids}` | 原生取消归档 |
| POST | `/archived-manager/hide` `{ids}` | 移入隔离区 |
| POST | `/archived-manager/purge` `{ids, confirm:"PURGE"}` | 永久删除归档会话日志 |
| POST | `/archived-manager/forget` `{ids}` | 清理文件已缺失的归档记录 |
| GET | `/archived-manager/removed` | 隔离区条目 |
| POST | `/archived-manager/restore` `{items:[{batch,id}]}` | 从隔离区恢复 |
| POST | `/archived-manager/discard` `{items, confirm:"DISCARD"}` | 删除指定隔离区条目 |
| POST | `/archived-manager/empty-trash` `{confirm:"EMPTY"}` | 清空隔离区 |
| GET | `/archived-manager/settings` | 读取保留策略 |
| POST | `/archived-manager/settings/save` `{trashRetentionDays}` | 保存保留策略并检查过期条目 |
| GET | `/archived-manager/health` | 健康检查与版本信息 |

这些接口不是公网 API，不应通过反向代理暴露。

## 界面预览

以下图片使用模拟数据，仅用于说明布局：

![归档会话工作台](docs/ui-preview.png)

![空状态](docs/ui-preview-empty.png)

![排序下拉菜单](docs/ui-preview-menu.png)

配色使用 DSH 主题令牌并适配深浅主题。可访问性目标、排版和对比度说明见 [docs/accessibility.md](docs/accessibility.md)。

## 开发与验证

要求 Node.js 20+，无第三方运行依赖：

```bash
npm test
node --check client/index.js
npm pack
```

测试覆盖 Host 文件操作、路径与路由安全、归档/隔离/恢复/删除、保留策略、Client 设置页注册、搜索筛选、模态框、选中行高亮（全选/单选/无选择）、隔离区高亮、深浅主题和 WCAG 对比度。GitHub Actions 对 push 和 pull request 自动运行测试。

### v0.2.6 修复内容

- 修正工具条随单选或全选出现高亮的错误交互：全选工具条永不做选中高亮。
- 删除归档区与隔离区工具条的 `active` 状态绑定及对应 CSS，不只调整触发条件。
- 只有数据行根据自身 `checked` 状态显示或消退高亮；全选高亮全部可选数据行，单选只高亮对应数据行。
- 新增工具条在无选择、单选、全选和实际点击重渲染后均保持普通样式的回归断言，同时保留数据行高亮测试。
- 不改变归档、取消归档、隔离、恢复、删除或保留策略的数据操作行为。

## 已知限制

- 同一 `DSH_HOME` 只支持单实例；多个 DSH 实例同时写同一数据目录不受支持。
- 恢复或取消归档后，侧栏可能需要刷新或重启才能反映宿主内存索引变化。
- 卸载插件不会自动删除隔离区；如需清理，请先确认其中没有仍需恢复的会话。

## English

**dsh-archived-manager** adds an **Archived Sessions** page to DeepSeek Harness Settings. It supports native unarchive, recoverable quarantine, permanent session-log deletion, stale-record cleanup, search/filter/sort, bulk actions, and optional 7/30/90-day quarantine retention.

### Install

Open **DSH → Settings → Plugins → Install** and enter:

```text
github:chen1pengvincent/dsh-archived-manager#v0.2.6
```

Fully restart DSH after installation, hard-refresh the Web UI, then open **Settings → Archived Sessions**. Node.js 20+ is needed only for development and tests.

### Selection feedback

Every data row derives its highlight from its own checked state. Select-all highlights every selectable data row in the current filtered result; a single selection highlights only that row; deselecting removes the highlight. Quarantine rows follow the same contract. The select-all toolbar never takes selection highlight: it only shows checkbox state, selection count, and action availability.

### Safety and privacy

Runtime operations are local. The plugin has no telemetry and does not initiate external network requests. Its loopback-only HTTP routes require same-origin requests and a custom header. Permanent deletion is scoped to session logs; project files and shared attachments are not deleted. Dangerous actions require explicit confirmation.

See the Chinese sections above for the operation matrix, data paths, API table, security controls, development commands, and v0.2.6 release notes.

## License

MIT — see [LICENSE](LICENSE).
