# dsh-archived-manager

[![test](https://github.com/chen1pengvincent/dsh-archived-manager/actions/workflows/test.yml/badge.svg)](https://github.com/chen1pengvincent/dsh-archived-manager/actions/workflows/test.yml)

> DeepSeek Harness（DSH）会话清理工作台。查找和批量取消归档，移到「最近删除」，或彻底删除已核验的会话日志。

[中文文档](#dsh-archived-manager) · [English](#english) · [Releases](https://github.com/chen1pengvincent/dsh-archived-manager/releases)

当前版本 **0.3.5**。归档和即时撤销由 DSH 原生侧栏提供。插件管理归档后的检索、恢复、清理和文件定位。

## 功能

- **取消归档**：调用 DSH 原生 `unarchiveSession`，会话回到侧栏，日志文件原地保留。
- **移到最近删除**：移走会话日志，可单独或批量恢复到侧栏。
- **彻底删除**：经明确确认后永久删除会话日志；项目文件和共享附件不在删除范围内。
- **清理失效记录**：日志目录已不存在时，只移除归档记录，不触碰其他文件。
- **批量与检索**：单选、全选当前筛选结果，按标题/工作区/ID 搜索，按状态筛选，按时间、体积或标题排序。
- **自动清理**：在「最近删除」直接选择关闭、7、30 或 90 天。修改期限前可核对当前会受影响的会话。
- **关联文件**：查看会话中已记录的生成、写入或修改文件的位置，并打开所在文件夹；会话工作区另设入口。
- **版本与手动更新**：显示页面、服务和安装版本；手动检查 GitHub 稳定版，通过独立控制页更新。源码链接只有在明确选择「切换为发布版」后才改变安装来源。
- **本地优先**：无遥测、无后台更新；只有手动检查或更新时访问本仓库 GitHub 发布信息和安装包。管理接口仅接受本机回环、同源且带自定义请求头的调用。

## 安装与升级

### 从 GitHub 安装（推荐）

1. 打开 **DSH → 设置 → 插件 → 安装**。
2. 输入以下 spec：

   ```text
   github:chen1pengvincent/dsh-archived-manager#v0.3.5
   ```

3. 安装后**完全退出并重新打开 DSH**，再硬刷新页面（macOS：`Cmd+Shift+R`）。
4. 打开 **设置 → 会话管理**。

从旧版本升级时，在插件管理页安装新版本，或先 `remove_bundle` 再 `install_bundle`：

```json
{"action":"remove_bundle","target":"dsh-archived-manager"}
{"action":"install_bundle","target":"github:chen1pengvincent/dsh-archived-manager#v0.3.5"}
```

v0.3.0 起可在会话管理页手动检查稳定版并更新。更新控制页会固定目标版本，在卸载前下载并校验安装包；旧插件卸载后，该页仍可展示安装结果，并在失败时提供重试或恢复入口。安装成功后按提示重新打开页面或重启 DSH。

更新期间请保持 DSH 运行。关闭控制页不会取消安装；若整个 DSH 进程在卸载后、安装完成前退出，请在宿主插件管理页使用目标版本的安装地址恢复。控制页会列出该地址。无需额外构建，也无需在本机单独安装 Node.js；Node.js 24+ 仅用于源码开发和测试。

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

### 工作台布局

连续处理多个会话时，工具位置固定，读完提示可以直接回到原来的工作位置。切换「已归档」与「最近删除」、刷新列表或出现空列表与无匹配结果时，页签、搜索与排序、日志摘要和操作栏仍在原位。当前不可用的操作会在对应入口显示禁用状态。

「已归档」在搜索旁提供状态筛选，「最近删除」在同一位置提供自动清理期限。版本详情和检查更新共用版本号旁的浮层。点会话标题或「查看结果」可打开覆盖层，查看会话信息、关联文件和本次处理结果时，列表维持原布局。

紧凑摘要显示当前可见条数和日志占用，「范围」说明统计口径。选中条目时，批量操作可处理取消归档、移入或恢复等任务。所选会话的「彻底删除」和整区的「清空全部」各自拥有固定入口，提交前分别核对范围。

### 已归档

从 DSH 侧栏的会话菜单归档，使用宿主提示立即撤销。需要批量处理时，打开 **设置 → 会话管理 → 已归档**。

| 操作 | 结果 |
|---|---|
| 取消归档 | 通过 DSH 原生接口回到侧栏，日志保留在原目录 |
| 移到最近删除 | 移动已通过校验的日志，移入时磁盘占用不变 |
| 彻底删除 | 确认后永久删除本次列出的会话日志 |
| 清理失效记录 | 日志已经缺失时，仅清除归档记录 |

列表提供搜索、状态筛选和排序。行内标明会话占用、日志缺失或目录受保护。点会话标题可查看具体原因。列表显示的是日志占用，删除预览显示本次可清理的日志。归档首次发现时间由插件记录。

全选作用于当前可见的可选行。选中行和已选数量会突出显示。两个标签分别保存选择，搜索和筛选会清除移出当前结果的选择，排序保留选择。普通批量操作最多处理 200 条。操作执行期间固定范围，结束后可在「查看结果」中查看未处理项。

### 最近删除

- **恢复到侧栏**会先把日志放回原目录，再尝试重新关联工作区。原目录冲突时，日志保留在「最近删除」。日志已经恢复而工作区关联未完成时，页面会单独说明。
- **彻底删除**处理当前确认的会话。**清空全部**单独核对整个「最近删除」，预览包含搜索隐藏项。确认框会列出可处理的会话和跳过原因。
- **自动清理**的下拉菜单始终可见，期限从移入「最近删除」起算。默认关闭。选择 7、30 或 90 天时，先核对已到期条目再保存。关闭后，等待执行的自动清理会重新读取设置。
- 如果某一步已经生效，结果会说明日志或登记的当前状态。对能继续的条目，使用页面给出的后续操作。

界面跟随 **DSH → 设置 → 通用 → 语言** 和宿主主题。窄窗口中控件按行换行，仍按相同顺序排列。键盘可操作版本详情、下拉菜单和确认框。

### 查看关联文件

在会话详情中查看「已记录的关联文件」，包括完整路径、所在文件夹和当前状态。已有文件可在系统文件管理器中显示；文件已失效但原父目录仍有效时，可打开该目录。工作区作为独立入口显示，不等同于产物目录。

列表使用宿主的结构化交付、成功写入和修改记录，覆盖范围取决于会话实际留下的记录。需要继续访问某个文件时，可以先保存它的位置。彻底删除日志会一并移除其中的文件位置记录，独立文件仍留在原处。

## 会话和文件保护

| 范围 | 行为 |
|---|---|
| 会话数据 | 聊天文字、表格、代码块随对应 session 清理；仅处理符合宿主实际存储格式的数据 |
| 独立生成文件及已有项目文件 | 文件及已有修改原地保留 |
| 共享附件 | 原地保留。附件采用内容寻址，可能跨会话共享 |
| 归档记录 | 取消归档、移到最近删除、删除或清理失效记录时按操作更新 |
| 活动与提醒 | 会话仍有宿主活动或写入占用时，页面会提示原因。通过 DSH 结束相关活动后再清理 |
| DSH 工作区账本 | 只通过公开 API 操作，不直接手写 `workspace.json` |

移动、恢复和永久删除前，插件会核对目标路径、会话日志格式，以及 DSH 的活动和写入占用。无法核验或目录内有额外内容的条目会保留，页面会显示原因。批量、清空和自动清理使用同一套日志校验规则。预览与提交之间若目标或日志内容发生变化，需要重新核对。

### legacy v0 会话

v0.3.0 起为安全只识别带版本号的会话格式，导致早期无版本号的 `session.jsonl.zstd` 被判为「无法确认的内容」，永久删除只能逐条失败。v0.3.2 起：

- 识别 generation 0（无版本号文件与 `session.v0.*`）；v1 仍未支持，`session.v5.*` 等未知代仍拒绝。
- v0 的 packed 增量行（`text-chunks` / `reasoning-chunks` / `tool-call-chunks`）按其覆盖的 `seq` 区间校验：分段必须连续、无重叠、无空洞，`dt` 长度必须等于载荷长度减一，时间不得回退；任何一条不满足仍然拒绝，并保持文件原样。
- 继续识别 v2、v3、v4 的会话格式。

## 数据位置

默认 `<DSH_HOME>` 为 `~/.dsh`：

| 数据 | 位置 |
|---|---|
| 最近删除 | `<DSH_HOME>/archived-manager/trash/<批次>/` |
| 最近删除清单 | 每个批次目录中的 `manifest.json` |
| 归档首次观测时间 | `<DSH_HOME>/archived-manager/archive-times.json` |
| 保留策略 | `<DSH_HOME>/archived-manager/settings.json` |
| 手动更新状态 | `<DSH_HOME>/archived-manager/update-state.json` |
| 会话日志 | `<DSH_HOME>/sessions/` |
| 共享附件 | `<DSH_HOME>/attachments/` |

首次运行前已经存在的归档记录无法反推真实归档时间，因此显示「未记录」，不会伪装成插件安装时间。

## 本机 HTTP API

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/archived-manager/list` | 归档和最近删除列表、操作资格与日志体积 |
| POST | `/archived-manager/preview` `{action,ids?,items?,trashRetentionDays?}` | 预览目标、跳过原因、日志体积，并返回 `previewToken` |
| POST | `/archived-manager/unarchive` `{ids}` | 原生取消归档 |
| POST | `/archived-manager/hide` `{ids,previewToken?}` | 移到最近删除 |
| POST | `/archived-manager/purge` `{ids,confirm:"PURGE",previewToken?}` | 永久删除归档会话日志 |
| POST | `/archived-manager/forget` `{ids}` | 清理文件已缺失的归档记录 |
| GET | `/archived-manager/removed` | 最近删除条目 |
| POST | `/archived-manager/restore` `{items:[{batch,id}],previewToken?}` | 从最近删除恢复 |
| POST | `/archived-manager/discard` `{items,confirm:"DISCARD",previewToken?}` | 删除指定的最近删除条目 |
| POST | `/archived-manager/repair` `{items:[{batch,id}]}` | 核对部分完成的操作及剩余登记 |
| POST | `/archived-manager/empty-trash` `{confirm:"EMPTY",items:[{batch,id}],previewToken?}` | 清空最近删除 |
| GET | `/archived-manager/settings` | 读取保留策略 |
| POST | `/archived-manager/settings/save` `{trashRetentionDays,items?,previewToken?}` | 保存保留策略。开启时提交预览对象和凭据 |
| GET | `/archived-manager/health` | 健康检查与版本信息 |
| POST | `/archived-manager/files` `{id,batch?}` | 已记录关联文件及独立工作区信息 |
| POST | `/archived-manager/open-folder` `{id,batch?,path?,workspace?}` | 打开经重新核对的文件位置或工作区 |
| GET | `/archived-manager/update/status` | 实际安装来源、版本及更新任务 |
| POST | `/archived-manager/update/check` | 手动检查最新稳定发布 |
| POST | `/archived-manager/update/prepare` `{releaseId,version,switchFromLink}` | 准备独立更新控制页，确认后再安装 |

管理接口仅接受回环地址、同源请求和 `x-archived-manager: 1`。界面在预览后提交相同对象与 `previewToken`。

## 界面预览

以下图片为 v0.3.5 在真实 DSH 中管理测试会话时的界面：

![归档会话工作台（浅色）](docs/ui-preview.jpg)

![最近删除与批量选择（深色）](docs/ui-preview-dark.jpg)

配色使用 DSH 主题令牌并适配深浅主题。可访问性目标、排版和对比度说明见 [docs/accessibility.md](docs/accessibility.md)。

## 更新记录

### v0.3.5

- 固定页签、检索、紧凑摘要和批量选择的布局，保持切换页签、刷新与空态下的操作位置。
- 将自动清理期限放入固定下拉菜单；版本详情及更新状态使用锚定浮层。会话详情与操作结果在独立覆盖层打开。
- 「彻底删除」和「清空全部」保留各自的直接入口及范围确认。

### v0.3.4

- 新增按实际目标核对的操作预览。「最近删除」明确恢复去向，受保护或占用的条目直接说明原因。
- 修正删除、恢复、工作区登记及自动清理的结果核对。关闭自动清理后，等待执行的任务重新读取规则。
- 文件操作遵守宿主活动和写入占用。列表用轻量元数据展示日志占用，选定操作再核验日志正文。

### v0.3.3

- **重写 README。** 重新组织安装/升级、已归档与隔离区操作、选中契约、删除范围、数据位置、本机 API、legacy v0 支持和开发验证，补充 v0.3.2 的格式校验细节。
- 同步 `package.json` 与页面版本号到 `0.3.3`。
- **无功能行为变更**：除页面/包版本号常量外，代码逻辑与 v0.3.2 相同，仅为文档与版本号发布。

### v0.3.2

- 识别 legacy v0 会话日志（`session.jsonl.zstd`，无版本号），这类会话现在能正常列出、查看并彻底删除。此前 0.3.0 起的格式校验把它们判为「无法确认的内容」，永久删除只能逐条失败。
- v0 的 packed 增量行按连续 `seq` 覆盖区间校验：分段必须无重叠、无空洞，`dt` 长度必须与载荷一致，时间不得回退；任何一条不满足仍然按「无法确认」拒绝并保持文件原样。
- v2 / v3 / v4 的判定与删除路径未改动；未知代（如 `session.v5.*`）仍然拒绝。
- 验证：`npm test` 141/141；本机 181 个真实会话目录（21 个 v0）全部可识别，21 个 v0 副本全部删除成功，改动前这 21 个全部失败。

### v0.3.1

- 版本详情与版本号同排，收起时不再单独占一行；保留点击与键盘展开。
- 单条与批量的彻底删除改为直接按钮，清空隔离区保留独立的全局入口；确认范围、不可恢复确认及操作期间禁用保持不变。
- 更新真实 DSH 测试会话的深浅主题截图。

### v0.3.0

- 重排列表与紧凑摘要，统一归档和隔离区的选择反馈，强调已选数量。
- 常用恢复与隔离操作直接可达，永久操作收进「更多」；修正重复确认框、操作期间改选、失败详情截断和刷新状态。
- 所有清理路径按宿主格式验证 session，保护混入目录的独立文件与未知内容。
- 新增已记录关联文件位置、打开文件夹和独立的工作区入口。
- 新增可信版本展示、稳定版手动更新和明确的源码链接切换流程；独立控制页提供进度、失败重试及恢复安装。

## 开发与验证

要求 Node.js 24+（原生 Zstandard 解码），无第三方运行依赖；DSH 使用其自带运行时：

```bash
npm test
node --check client/index.js
npm pack
```

测试覆盖会话文件操作、状态变化、恢复、批量选择、保留策略、版本更新和主题。GitHub Actions 对 push 和 pull request 自动运行测试。

## 已知限制

- 同一 `DSH_HOME` 只支持单实例；多个 DSH 实例同时写同一数据目录不受支持。
- 恢复或取消归档后，侧栏可能需要刷新或重启才能反映宿主内存索引变化。
- 卸载插件会保留「最近删除」的数据；如需清理，请先确认其中没有仍需恢复的会话。
- v1 会话格式仍未支持；未知代（如 `session.v5.*`）继续拒绝，避免误删。

## English

**dsh-archived-manager** adds **Session Manager** to DeepSeek Harness Settings. Archive and undo archive in the native sidebar. Use the manager to find archived sessions, unarchive in bulk, move logs to Recently Deleted, restore them, or permanently delete verified session logs.

### Install

Open **DSH → Settings → Plugins → Install** and enter:

```text
github:chen1pengvincent/dsh-archived-manager#v0.3.5
```

Fully restart DSH after installation, hard-refresh the Web UI, then open **Settings → Session Manager**. Node.js 24+ is needed only for development and tests.

### Workspace layout in 0.3.5

Search, sort, the log summary, operation results, and bulk selection stay in place when you switch tabs, refresh, or have no results. The dropdown beside search filters archived sessions or sets retention in Recently Deleted. Version details and update status share an anchored panel. Session details and operation results open over the list.

The bulk **Delete permanently** action uses the current selection. **Empty all** previews Recently Deleted, including entries hidden by search. Each action has its own confirmation. The layout adapts to narrower windows and follows the DSH theme.

The manager previews the sessions an action will affect and shows why any will be skipped. Restore reports log recovery separately from workspace reattachment. Cleanup respects DSH activity and write ownership, and scheduled cleanup reads the current retention setting before acting. The list uses lightweight file metadata, with full verification before moving or removing logs.

### Selection feedback

Checked rows and the selected count are highlighted while the toolbar stays neutral. Select-all covers every selectable row in the current filtered result. Selection is pruned by filters and refreshed availability, kept separate per tab, and frozen while an action runs. A selected action supports up to 200 applicable items.

### Safety and privacy

Session operations are local, with no telemetry or background updates. Only manual update checks and installation access this repository's GitHub releases. Loopback-only management routes require same-origin requests and a custom header. All cleanup paths verify the host session format; unknown files or unsafe paths preserve the item. Independent generated files, existing project modifications and shared attachments are never deleted or moved.

The recorded-files view shows paths from structured delivery, write, and edit events. Save any paths you need before permanent deletion removes the recorded locations from the session. The independent files stay on disk. Workspace access has its own entry.

Manual updates use a separate control page that survives removal of the target plugin, verifies the pinned release package before removal, and offers retry or recovery. Keep DSH running during installation. If the whole process exits between removal and successful installation, recover through the native plugin manager using the displayed release address. Source-linked installs change source only after an explicit switch confirmation; the checkout remains untouched.

See the Chinese sections above for the operation matrix, data paths, API table, security controls, development commands, and release notes.

## License

MIT — see [LICENSE](LICENSE).
