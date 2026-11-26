window.__ModuleLoader__.load({ id: "dsh-archived-manager", factory: (require) => {

	var module = { exports: {} };
	var exports = module.exports;
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

	var React = require("react");
	var h = React.createElement;
	var useState = React.useState;
	var useEffect = React.useEffect;

	var API = "/archived-manager";
	var CLIENT_VERSION = "0.4.4";
	var MAX_BATCH = 200;
	var GUIDE_CODES = ["restart-required", "running", "occupied", "occupancy-unavailable"];
	var LANG = typeof navigator !== "undefined" && navigator.language ? String(navigator.language).toLowerCase() : "";
	var ZH = LANG.indexOf("zh") === 0;

	var STR_ZH = {
		section: "会话管理",
		title: "会话管理",
		subtitle: "从 DSH 侧栏归档会话，在这里找回或清理。",
		tabArchived: "已归档",
		tabRemoved: "最近删除",
		refresh: "刷新列表",
		loading: "正在读取…",
		failed: "读取失败：{message}",
		retry: "重试",
		selectAll: "全选当前结果",
		selected: "已选 {n} 条",
		hide: "移到最近删除",
		unarchive: "取消归档",
		purge: "彻底删除",
		restore: "恢复到侧栏",
		emptyTrash: "清空全部",
		hideConfirmTitle: "移到最近删除 {n} 个会话？",
		hideConfirmBody: "日志会移到最近删除，可恢复到侧栏。此操作保留日志占用。",
		purgeConfirmTitle: "彻底删除 {n} 个会话？",
		purgeConfirmBody: "只删除已核验的会话日志。删除后无法恢复。",
		purgeCheck: "我确认永久删除上述会话日志",
		emptyConfirmTitle: "清空最近删除？",
		discardTitle: "彻底删除最近删除中的 {n} 个会话？",
		discardBody: "只删除已核验的会话日志。删除后无法恢复。",
		cancel: "取消",
		busy: "处理中…",
		missing: "日志缺失",
		running: "运行中",
		noTitle: "（无标题）",
		size: "体积",
		workspace: "工作区",
		movedAt: "移入时间",
		tipMovedAtLabel: "移到最近删除的时间；由插件记录，恢复后清除。",
		forget: "清除归档记录",
		emptyTitle: "暂无已归档会话",
		emptyHint: "在会话菜单里归档后，这里会显示；取消归档会让它回到侧栏。",
		emptyRemovedTitle: "最近删除为空",
		emptyRemovedHint: "移到最近删除的会话会出现在这里，可恢复或永久删除。",
		lastUsedLabel: "最后使用",
		archivedLabel: "首次发现归档",
		unknownTime: "未记录",
		releaseLine: "预计释放 {size} 的会话日志",
		cleanup: "清理失效记录",
		cleanupTitle: "清理 {n} 条失效归档记录？",
		cleanupBody: "这些会话的文件已不存在，只会移除归档记录，不会删除任何文件。",
		confirmCleanup: "清理记录",
		selectedSplit: "已选 {n} 条（有日志 {files} · 失效 {missing}）",
		searchPlaceholder: "搜索标题、工作区或 ID",
		searchAria: "搜索归档会话",
		clearSearch: "清除搜索",
		filterAll: "全部",
		filterFiles: "有日志",
		filterMissing: "日志缺失",
		sortLabel: "排序",
		sortLastUsed: "最后使用",
		sortArchived: "首次发现归档",
		sortSize: "体积",
		sortTitle: "标题",
		sortMoved: "移入时间",
		filteredEmpty: "没有匹配的归档会话",
		filteredEmptyHint: "清空搜索或切换筛选后再试。",
		clearFilters: "清除筛选",
		showing: "显示 {shown} / {total}",
		removedSearchPlaceholder: "搜索最近删除中的会话",
		removedSelected: "已选 {n} 条会话",
		removedEmptyFilter: "没有匹配的会话",
		toastUnarchive: "已回到侧栏 {n} 条",
		toastHide: "已移到最近删除 {n} 个（可恢复）",
		toastPurge: "已彻底删除 {n} 个会话，释放 {size}",
		toastRestore: "已恢复 {n} 条会话日志",
		toastDiscard: "已彻底删除 {n} 条会话日志，释放 {size}",
		toastCleanup: "已清理 {n} 条失效记录",
		toastReminders: "，停止 {n} 个提醒",
		retentionTitle: "最近删除自动清理",
		retentionNever: "关闭",
		retentionConfirmTitle: "保存自动清理设置？",
		retentionConfirmBody: "移到最近删除满 {days} 天后，已核验的会话日志会自动永久删除。",
		retentionCheck: "我确认已到期及后续到期的会话日志会被永久删除",
		confirmRetention: "保存设置",
		retentionSaved: "已保存：最近删除保留 {days} 天",
		retentionOff: "已关闭最近删除自动清理",
		retentionSwept: "已清理 {n} 条过期会话日志，释放 {size}",
		scopeNote: "删除范围为已核验的会话日志。独立文件、项目改动和共享附件（{size}，{files} 个）会保留。",
		tipLastUsedLabel: "最后一次在该会话发送消息的时间（来自投影缓存）",
		tipArchivedLabel: "插件首次观测到该会话进入归档集合的时间；旧记录无法回溯，显示「未记录」。",
		errRunning: "会话正在运行，请先停止",
		errNotArchived: "会话已不在归档集合",
		errFilesExist: "会话文件还在，请用移到最近删除或彻底删除",
		errFilesMissing: "会话文件已不存在，请用清理失效记录",
		errConflict: "最近删除已有同名目录",
		errInvalid: "参数无效",
		errNotFound: "最近删除条目不存在",
		errExists: "原目录已存在，无法恢复",
		errConfirm: "缺少确认",
		errStorage: "文件操作失败",
		errSchedule: "提醒停止失败",
		errGeneric: "操作失败",
		clearSelection: "取消选择",
		details: "详情",
		close: "关闭",
		filterLabel: "状态",
		retentionControl: "自动清理",
		retentionShort: "{n} 天",
		retentionExplanation: "移入满期限后永久删除会话日志。",
		batchActions: "批量操作",
		operationDetails: "查看结果",
		operationIdle: "操作结果",
		scopeLabel: "范围",
		scopeTitle: "日志统计范围",
		refreshFailed: "刷新失败",
		files: "已记录的关联文件",
		loadFiles: "查看关联文件",
		filesEmpty: "未找到已记录的文件位置",
		filesCoverage: "仅展示已记录的文件位置，可能不包含全部历史产物。彻底删除会话日志后，文件仍在原处，文件位置记录随日志删除。",
		openFolder: "打开所在文件夹",
		openWorkspace: "打开工作区",
		workspacePath: "会话工作区",
		folder: "所在文件夹",
		path: "完整路径",
		fileMissing: "文件已不存在",
		unavailable: "当前位置不可打开",
		batchLimit: "单次最多处理 200 条，请缩小筛选范围或取消部分选择",
		processing: "正在处理 {n} 条",
		selectionPruned: "筛选或会话状态已变化，已取消选择 {n} 条不再显示或不可操作的会话。",
		unknownResult: "结果未确认。正在刷新核对当前状态；不会自动重复提交。",
		staleList: "列表尚未刷新，暂不可修改会话。请刷新列表后重试。",
		runningLocked: "运行中，暂不可操作",
		logSize: "日志占用",
		resultSummary: "完成：成功 {ok} 条，失败 {fail} 条，跳过 {skip} 条",
		settings: "设置",
		retentionDisabled: "关闭",
		retentionAfter: "移入满 {n} 天",
		versionDetails: "版本详情",
		checkUpdate: "检查更新",
		checkingUpdate: "正在检查更新…",
		pageVersion: "页面版本",
		serviceVersion: "服务版本",
		installedVersion: "已安装版本",
		notProvided: "未提供",
		pendingUpdate: "更新待生效",
		localSource: "本地源码",
		releaseSource: "GitHub 发布版",
		unknownSource: "来源未确认",
		missingSource: "插件未安装",
		updateTo: "更新到 v{version}",
		switchRelease: "切换为发布版",
		latestRelease: "已是最新稳定版 v{version}",
		aheadRelease: "当前版本高于最新稳定版 v{version}，不会自动降级",
		releaseNotes: "更新说明",
		checkedAt: "核对时间",
		updateFailed: "无法检查更新：{message}",
		updateContinue: "查看更新进度或恢复安装",
		updatePreparing: "正在准备独立更新页面…",
		updateHandoff: "在独立更新页确认目标版本并查看安装结果。",
		updateBusy: "插件更新中，暂不可修改会话数据",
		filesFailed: "读取文件位置失败：{message}",
		noWorkspace: "未记录工作区位置",
		operationUnknown: "操作结果未确认",
		confirmCount: "彻底删除 {n} 条",
		checkedRelease: "稳定版 v{version}",
		source: "安装来源",
		rangeChanged: "操作范围已变化，本次未执行。请刷新后重新核对。",
		sizeUnknown: "未确认",
		sizePartial: "{n} 条日志大小未确认，未计入合计",
		removedWarningsTitle: "{n} 个无法确认的批次已保留",
		removedWarningsHint: "已知会话数量不包含这些内容。文件仍保留在原处。",
		removedUnlistedTitle: "没有可显示的最近删除会话",
		removedUnlistedHint: "有内容暂时无法核对，请查看批次提示。",
		knownTabCount: "{label}（已知 {n}）",
		previewScope: "操作范围",
		previewLoading: "正在核对操作范围…",
		previewFailed: "无法核对操作范围：{message}",
		previewReady: "本次处理 {n} 条",
		previewBlocked: "待处理 {n} 条",
		previewNone: "本次没有可处理的会话。",
		previewAll: "范围包含搜索隐藏的记录。",
		previewUnavailable: "宿主尚未提供此操作的资格，请刷新列表或重启 DSH。",
		previewFileNote: "独立文件会保留。请先保存需要的文件位置；彻底删除日志后，无法再从此会话查看这些位置。",
		protectedReason: "有操作暂不可用",
		occupied: "宿主占用中",
		errOccupied: "会话仍被 DSH 占用。请完全退出 DSH 后重新打开，再彻底删除。",
		errRestartRequired: "会话仍由当前 DSH 进程加载。请完全退出 DSH 后重新打开再删除。",
		restartBadge: "需重启 DSH",
		restartAction: "处理",
		guideOpen: "查看解决步骤",
		guideTitle: "会话仍被 DSH 占用",
		guideIntro: "DSH 会在会话被加载后一直持有写入锁，即使当前没有运行回合。停止回合或任务不会释放它，只有完全退出 DSH 进程才会释放。",
		guideChecking: "正在检测占用…",
		guideStepTitle: "请按顺序操作",
		guideStep1: "1. 保存需要保留的内容。彻底删除后，会话日志无法恢复。",
		guideStep2: "2. 完全退出 DSH：macOS 按 Cmd+Q（或菜单栏、程序坞退出）；Windows 从托盘或任务管理器退出。确认没有 DSH 窗口或后台进程。",
		guideStep3: "3. 重新打开 DSH，回到「会话管理」。不要先打开要删除的会话。",
		guideStep4: "4. 点击「重新检测」。若仍显示已加载，先打开另一个会话，再完全退出并重开，避免 DSH 启动时又加载它；锁释放后点「继续删除」，仍会先预览并二次确认。",
		guideStep5: "5. 若仍提示被其他进程占用，按上方进程名和 PID 退出对应进程；不要手动删除 session.lock，锁由系统释放。",
		guideClose: "关闭",
		guideRecheck: "重新检测",
		guideContinue: "继续删除",
		guideRecord: "记录并在重启后继续",
		guideRecorded: "已记录。请完全退出 DSH 后重新打开，列表顶部会出现继续入口。",
		guideFree: "写入锁已释放，可以继续删除。",
		guideLoaded: "当前 DSH 已加载该会话；空闲状态也会持有写入锁。",
		guideRunning: "会话正在运行。请先在会话中停止当前回合；若仍被占用，完全退出 DSH 后重开。",
		guideActivity: "仍有活动：{items}。请先结束这些活动；若仍被占用，完全退出 DSH 后重开。",
		guideExternal: "另一个进程持有写入锁：{holder}。请退出该 DSH 进程后重试。",
		guideSelf: "当前 DSH 进程（PID {pid}）持有写入锁；请完全退出 DSH。",
		guideUnknown: "无法确认写入锁状态。请完全退出 DSH 后重开。",
		guideMissing: "会话日志已缺失，无法删除；请使用「清理失效记录」。",
		guideUnavailable: "无法核对该会话：{reason}",
		guideNoHolder: "未能识别占用进程",
		guideMixed: "同时包含已归档和最近删除会话，请在顶部待删提示中分别继续删除。",
		pendingTitle: "有 {n} 个会话待彻底删除",
		pendingBody: "上次操作因 DSH 占用未完成。记录会保留，不会自动删除；完全退出并重开 DSH 后可从这里继续。",
		pendingArchived: "继续删除 {n} 个已归档会话",
		pendingRemoved: "继续删除 {n} 个最近删除会话",
		pendingClear: "清除待删记录",
		pendingClearConfirm: "清除 {n} 条待删记录？只移除记录，不会删除任何文件。",
		pendingCleared: "已清除待删记录",
		pendingFailed: "无法清除待删记录：{message}",
		viewRemoved: "查看最近删除",
		partialReason: "部分完成：{reason}",
		partialMoved: "日志已移到最近删除，请在该列表核对剩余步骤。{reason}",
		partialRestored: "日志已恢复到原位置，仍有步骤待核对。{reason}",
		resultSummaryPartial: "成功 {ok} 条，部分完成 {partial} 条，失败 {fail} 条，跳过 {skip} 条",
		repair: "核对并继续",
		toastRepair: "已完成 {n} 条待核对操作",
		unarchiveTitle: "取消归档 {n} 个会话？",
		unarchiveBody: "这些会话会回到侧栏，日志仍在原位置。",
		restoreTitle: "恢复 {n} 个会话到侧栏？",
		restoreBody: "日志会移回原位置。原工作区无法关联时，会在结果中提示。",
		retentionPreview: "按 {days} 天计算，当前有 {n} 条会话日志可以在保存时清理。",
	};

	var STR_EN = {
		section: "Session Manager",
		title: "Session Manager",
		subtitle: "Archive conversations from the DSH sidebar. Find, restore, or clean them up here.",
		tabArchived: "Archived",
		tabRemoved: "Recently Deleted",
		refresh: "Refresh list",
		loading: "Loading…",
		failed: "Failed: {message}",
		retry: "Retry",
		selectAll: "Select all results",
		selected: "{n} selected",
		hide: "Move to Recently Deleted",
		unarchive: "Unarchive",
		purge: "Delete permanently",
		restore: "Restore to sidebar",
		emptyTrash: "Empty all",
		hideConfirmTitle: "Move {n} session(s) to Recently Deleted?",
		hideConfirmBody: "The logs move to Recently Deleted and can be restored to the sidebar. They still use space.",
		purgeConfirmTitle: "Permanently delete {n} session(s)?",
		purgeConfirmBody: "Only verified session logs are deleted. This is permanent.",
		purgeCheck: "I understand this cannot be undone",
		emptyConfirmTitle: "Empty Recently Deleted?",
		discardTitle: "Permanently delete {n} recently deleted session(s)?",
		discardBody: "Only verified session logs are deleted. This is permanent.",
		cancel: "Cancel",
		busy: "Working…",
		missing: "Logs missing",
		running: "Running",
		noTitle: "(untitled)",
		size: "Size",
		workspace: "Workspace",
		movedAt: "recently deleted",
		tipMovedAtLabel: "When the session was moved into Recently Deleted; recorded by the plugin and cleared on restore.",
		forget: "Clear archive record",
		emptyTitle: "No archived sessions",
		emptyHint: "Archive a conversation from its menu and it appears here; unarchive returns it to the sidebar.",
		emptyRemovedTitle: "Recently Deleted is empty",
		emptyRemovedHint: "Sessions moved here can be restored or deleted permanently.",
		lastUsedLabel: "Last used",
		archivedLabel: "Archive first observed",
		unknownTime: "not recorded",
		releaseLine: "About {size} of session logs can be removed",
		cleanup: "Clean up records",
		cleanupTitle: "Clean up {n} stale archive record(s)?",
		cleanupBody: "These sessions no longer have files; only the archive records are removed. No files are touched.",
		confirmCleanup: "Clean records",
		selectedSplit: "{n} selected ({files} with logs · {missing} missing)",
		searchPlaceholder: "Search sessions",
		searchAria: "Search archived sessions by title, workspace or ID",
		clearSearch: "Clear search",
		filterAll: "All",
		filterFiles: "With logs",
		filterMissing: "Logs missing",
		sortLabel: "Sort",
		sortLastUsed: "Last used",
		sortArchived: "Archive first observed",
		sortSize: "Size",
		sortTitle: "Title",
		sortMoved: "Date deleted",
		filteredEmpty: "No matching archived sessions",
		filteredEmptyHint: "Clear the search or switch the filter and try again.",
		clearFilters: "Clear filters",
		showing: "{shown}/{total} shown",
		removedSearchPlaceholder: "Search recently deleted sessions",
		removedSelected: "{n} recently deleted sessions selected",
		removedEmptyFilter: "No matching recently deleted sessions",
		toastUnarchive: "Unarchived {n}",
		toastHide: "Moved {n} session(s) to Recently Deleted (recoverable)",
		toastPurge: "Deleted {n} session(s), freed {size}",
		toastRestore: "Restored {n} session(s) to their original locations; workspace results are reported separately",
		toastDiscard: "Permanently deleted {n} recently deleted session(s), freed {size}",
		toastCleanup: "Cleaned up {n} stale record(s)",
		toastReminders: ", stopped {n} reminder(s)",
		retentionTitle: "Recently Deleted retention",
		retentionNever: "Off",
		retentionConfirmTitle: "Save automatic cleanup settings?",
		retentionConfirmBody: "Verified logs in Recently Deleted are permanently removed after {days} days.",
		retentionCheck: "I confirm that currently expired and future expired session logs will be permanently removed",
		confirmRetention: "Save settings",
		retentionSaved: "Saved: Recently Deleted keeps sessions for {days} days",
		retentionOff: "Automatic Recently Deleted cleanup is off",
		retentionSwept: "Cleaned {n} expired recently deleted session(s), freed {size}",
		scopeNote: "Totals cover session log directories only. Attachments ({size}, {files} files) are shared across sessions and are not removed with a session; project files are untouched.",
		tipLastUsedLabel: "When a message was last sent in this session (from the projection cache)",
		tipArchivedLabel: "When the plugin first observed this session entering the archive set; older records cannot be recovered and show \"not recorded\".",
		errRunning: "The session is running; stop it first",
		errNotArchived: "The session is no longer archived",
		errFilesExist: "Session files still exist; use Recently Deleted or permanent deletion",
		errFilesMissing: "Session files are gone; clean the stale record instead",
		errConflict: "A directory with the same name already exists in Recently Deleted",
		errInvalid: "Invalid request",
		errNotFound: "Recently Deleted entry does not exist",
		errExists: "The original directory already exists; cannot restore",
		errConfirm: "Confirmation is missing",
		errStorage: "The file operation failed",
		errSchedule: "Failed to stop reminders",
		errGeneric: "The operation failed",
		clearSelection: "Clear selection",
		details: "Details",
		close: "Close",
		filterLabel: "Status",
		retentionControl: "Auto cleanup",
		retentionShort: "{n} days",
		retentionExplanation: "Session logs are permanently deleted after this retention period.",
		batchActions: "Bulk actions",
		operationDetails: "View result",
		operationIdle: "Results",
		scopeLabel: "Scope",
		scopeTitle: "Session log scope",
		refreshFailed: "Refresh failed",
		files: "Recorded associated files",
		loadFiles: "View associated files",
		filesEmpty: "No recorded file locations found",
		filesCoverage: "Recorded locations only; some historical outputs may not be listed. The workspace is shown separately.",
		openFolder: "Open containing folder",
		openWorkspace: "Open workspace",
		workspacePath: "Session workspace",
		folder: "Containing folder",
		path: "Full path",
		fileMissing: "File no longer exists",
		unavailable: "This location cannot be opened",
		batchLimit: "Up to 200 entries per action. Narrow the filter or deselect some entries.",
		processing: "Processing {n} entries",
		selectionPruned: "Filters or session state changed; {n} hidden or unavailable entries were deselected.",
		unknownResult: "Result unconfirmed. Refreshing to reconcile current state; the request will not be repeated automatically.",
		staleList: "The list could not be refreshed. Refresh it before changing sessions.",
		runningLocked: "Running; actions unavailable",
		logSize: "Log size",
		resultSummary: "Done: {ok} succeeded, {fail} failed, {skip} skipped",
		settings: "Settings",
		retentionDisabled: "off",
		retentionAfter: "after {n} days in Recently Deleted",
		versionDetails: "Version details",
		checkUpdate: "Check for updates",
		checkingUpdate: "Checking for updates…",
		pageVersion: "Page version",
		serviceVersion: "Service version",
		installedVersion: "Installed version",
		notProvided: "Not provided",
		pendingUpdate: "Update pending activation",
		localSource: "Local source",
		releaseSource: "GitHub release",
		unknownSource: "Unknown source",
		missingSource: "Not installed",
		updateTo: "Update to v{version}",
		switchRelease: "Switch to release",
		latestRelease: "Latest stable version v{version}",
		aheadRelease: "Current version is newer than stable v{version}; no automatic downgrade",
		releaseNotes: "Release notes",
		checkedAt: "Checked at",
		updateFailed: "Could not check for updates: {message}",
		updateContinue: "View update progress or recover installation",
		updatePreparing: "Preparing an independent update page…",
		updateHandoff: "Confirm the target version and review results in the independent update page.",
		updateBusy: "Plugin update in progress; session changes are unavailable",
		filesFailed: "Could not read file locations: {message}",
		noWorkspace: "No workspace location recorded",
		operationUnknown: "Operation result unconfirmed",
		confirmCount: "Delete {n} permanently",
		checkedRelease: "Stable v{version}",
		source: "Installation source",
		rangeChanged: "The scope changed. Refresh the list and review it again.",
		sizeUnknown: "Unconfirmed",
		sizePartial: "Log size unconfirmed for {n} entries; excluded from total",
		removedWarningsTitle: "{n} unverified Recently Deleted batches were kept",
		removedWarningsHint: "The known session count excludes these contents. Their files remain in place.",
		removedUnlistedTitle: "No listable recently deleted sessions",
		removedUnlistedHint: "No readable Recently Deleted session records are available. Retained contents may remain; see the batch notices.",
		knownTabCount: "{label} ({n} known)",
		previewScope: "Operation scope",
		previewLoading: "Checking the scope…",
		previewFailed: "Could not check the scope: {message}",
		previewReady: "{n} to process",
		previewBlocked: "{n} needing attention",
		previewNone: "No sessions can be processed for this action.",
		previewAll: "The scope includes records hidden by search.",
		previewUnavailable: "The host has not reported eligibility for this action. Refresh the list or restart DSH.",
		previewFileNote: "Independent files stay in place. Save any locations you need before permanently deleting the log, which also removes this session's record of those locations.",
		protectedReason: "Some actions are unavailable",
		occupied: "In use by DSH",
		errOccupied: "DSH still has this session in use. Fully quit and reopen DSH before permanently deleting it.",
		errRestartRequired: "DSH still has this session loaded. Fully quit and reopen DSH before deleting it.",
		restartBadge: "Restart DSH",
		restartAction: "Resolve",
		guideOpen: "View steps",
		guideTitle: "This session is still in use by DSH",
		guideIntro: "DSH keeps a write lock for as long as it has the session loaded, even when no turn is running. Stopping a turn or task does not release it; only fully quitting the DSH process does.",
		guideChecking: "Checking the lock…",
		guideStepTitle: "Do these in order",
		guideStep1: "1. Save anything you need. Permanently deleting a session log cannot be undone.",
		guideStep2: "2. Fully quit DSH: on macOS press Cmd+Q (or quit from the menu bar or Dock); on Windows quit from the tray or Task Manager. Make sure no DSH window or background process remains.",
		guideStep3: "3. Reopen DSH and return to Session Manager. Do not open the session you want to delete.",
		guideStep4: "4. Click Recheck. If it still says loaded, open a different session, then fully quit and reopen so DSH does not load it at startup. Once the lock is released, click Continue deletion; you will still see a preview and a second confirmation.",
		guideStep5: "5. If another process still holds the lock, quit the process named above by PID. Do not delete session.lock manually; the OS releases the lock.",
		guideClose: "Close",
		guideRecheck: "Recheck",
		guideContinue: "Continue deletion",
		guideRecord: "Remember and continue after restart",
		guideRecorded: "Saved. Fully quit DSH and reopen it; a continue entry will appear at the top of the list.",
		guideFree: "The write lock is released. You can continue.",
		guideLoaded: "DSH currently has this session loaded; an idle session still holds the write lock.",
		guideRunning: "A turn is running. Stop it in the session first; if the session is still locked, fully quit and reopen DSH.",
		guideActivity: "Activity remains: {items}. Finish it first; if the session is still locked, fully quit and reopen DSH.",
		guideExternal: "Another process holds the write lock: {holder}. Quit that DSH process and retry.",
		guideSelf: "The current DSH process (PID {pid}) holds the write lock. Fully quit DSH.",
		guideUnknown: "The write lock state could not be confirmed. Fully quit and reopen DSH.",
		guideMissing: "The session log is already missing; there is nothing to delete. Use Clear stale record.",
		guideUnavailable: "Could not check this session: {reason}",
		guideNoHolder: "could not identify the holder",
		guideMixed: "The selection mixes archived and recently deleted sessions. Continue them separately from the pending banner at the top.",
		pendingTitle: "{n} session(s) awaiting permanent deletion",
		pendingBody: "The last attempt was blocked by DSH. The record is kept and nothing is deleted automatically. Fully quit and reopen DSH, then continue here.",
		pendingArchived: "Continue deleting {n} archived session(s)",
		pendingRemoved: "Continue deleting {n} recently deleted session(s)",
		pendingClear: "Clear pending records",
		pendingClearConfirm: "Clear {n} pending record(s)? This removes only the records; no files are deleted.",
		pendingCleared: "Pending records cleared",
		pendingFailed: "Could not clear pending records: {message}",
		viewRemoved: "View Recently Deleted",
		partialReason: "Partially complete: {reason}",
		partialMoved: "Logs moved to Recently Deleted. Check the remaining steps there. {reason}",
		partialRestored: "Logs restored to their original location. Some steps still need attention. {reason}",
		resultSummaryPartial: "{ok} succeeded, {partial} partially complete, {fail} failed, {skip} skipped",
		repair: "Check and continue",
		toastRepair: "Completed {n} pending operation(s)",
		unarchiveTitle: "Unarchive {n} session(s)?",
		unarchiveBody: "These sessions will return to the sidebar. The logs stay in their original locations.",
		restoreTitle: "Restore {n} session(s) to the sidebar?",
		restoreBody: "The logs return to their original locations. The result will show if the original workspace could not be linked.",
		retentionPreview: "With a {days}-day limit, {n} session log(s) can be removed when you save.",
	};

	var STR = ZH ? STR_ZH : STR_EN;
	var LOCALE_NS = "archivedManager";
	var translate = null;
	var localeReady = false;

	function tr(key, vars) {
		var text;
		if (translate) {
			try {
				text = translate(key, vars);
			} catch (error) {
				text = undefined;
			}
		}
		if (typeof text !== "string" || text === key) text = STR[key] || key;
		if (vars) {
			Object.keys(vars).forEach(function (name) {
				text = text.replace(new RegExp("\\{" + name + "\\}", "g"), String(vars[name]));
			});
		}
		return text;
	}

	function fmtSize(bytes) {
		var value = Number(bytes) || 0;
		if (value < 1024) return Math.round(value) + " B";
		var units = ["KB", "MB", "GB", "TB"];
		var index = -1;
		do {
			value = value / 1024;
			index += 1;
		} while (value >= 1024 && index < units.length - 1);
		return (value >= 100 ? Math.round(value) : value.toFixed(1)) + " " + units[index];
	}

	function fmtTime(ms) {
		if (typeof ms !== "number" || !isFinite(ms)) return "—";
		try {
			return new Date(ms).toLocaleString(ZH ? "zh-CN" : "en-US", {
				year: "numeric", month: "2-digit", day: "2-digit",
				hour: "2-digit", minute: "2-digit"
			});
		} catch (error) {
			return new Date(ms).toISOString();
		}
	}

	function request(path, body) {
		var options = { headers: { "x-archived-manager": "1" }, credentials: "same-origin" };
		if (body !== undefined) {
			options.method = "POST";
			options.headers["content-type"] = "application/json";
			options.body = JSON.stringify(body);
		}
		return fetch(API + path, options).then(function (response) {
			return response.json().catch(function () { return {}; }).then(function (data) {
				if (!response.ok) {
					var message = data && data.error ? data.error : "HTTP " + response.status;
					var error = new Error(message);
					error.status = response.status;
					error.code = data && data.code;
					throw error;
				}
				if (!data || typeof data !== "object" || (data.ok === false && !Array.isArray(data.results))) throw new Error(data && data.error || "Invalid response");
				return data;
			});
		});
	}

	function fmtAge(ms) {
		if (typeof ms !== "number" || !isFinite(ms)) return "—";
		var days = Math.floor((Date.now() - ms) / 86400000);
		if (days <= 0) return ZH ? "今天" : "today";
		if (days === 1) return ZH ? "1 天前" : "1 day ago";
		return ZH ? days + " 天前" : days + " days ago";
	}

	function timeItem(key, label, tip, value) {
		return h("span", { key: key, className: "am-time" }, [
			h("span", { key: "label", className: "am-meta-label", title: tip }, label),
			h("span", { key: "value", className: "am-time-value" }, value)
		]);
	}

	function errorText(code, message) {
		var codes = {
			running: "errRunning",
			"not-archived": "errNotArchived",
			"files-exist": "errFilesExist",
			"files-missing": "errFilesMissing",
			conflict: "errConflict",
			invalid: "errInvalid",
			"not-found": "errNotFound",
			exists: "errExists",
			confirm: "errConfirm",
			storage: "errStorage",
			schedule: "errSchedule",
			occupied: "errOccupied",
			"restart-required": "errRestartRequired",
		};
		var key = code && codes[code];
		/* The host knows which activity or process still holds this session. Prefer its
		   precise reason over the generic occupied copy; fall back to the copy when a
		   result only carries a code. */
		if (key && !(code === "occupied" && typeof message === "string" && message.trim() !== "")) return tr(key);
		if (typeof message === "string" && message.trim() !== "") return message;
		return tr("errGeneric");
	}

	function capability(item, action) {
		if (item.running) return { code: "running" };
		if (item.capabilities && Object.prototype.hasOwnProperty.call(item.capabilities, action)) return item.capabilities[action];
		if (action === "unarchive" && !item.missing) return true;
		return { reason: tr("previewUnavailable") };
	}

	function targetOf(item) {
		return item.batch ? { id: item.id, batch: item.batch } : { id: item.id };
	}

	function summarize(results) {
		var summary = { ok: 0, fail: 0, partial: 0, skip: 0, bytes: 0, reminders: 0, failures: [], successes: [], warnings: [] };
		(Array.isArray(results) ? results : []).forEach(function (result) {
			if (result && result.ok === true) {
				summary.ok += 1;
				summary.successes.push(result);
				if (result.warning) summary.warnings.push(result);
				summary.bytes += Number(result.bytes) || 0;
				summary.reminders += Number(result.reminders) || 0;
			} else {
				if (result && result.partial) summary.partial += 1;
				else if (result && result.skipped) summary.skip += 1;
				else summary.fail += 1;
				summary.failures.push(result || { code: "storage" });
			}
		});
		return summary;
	}
	var CSS = [
		".am-page{--am-text-primary:var(--dsw-alias-label-primary,#0f1115);--am-text-secondary:var(--dsw-alias-label-secondary,#545557);--am-text-tertiary:var(--dsw-alias-label-tertiary,#65676b);--am-surface:var(--dsw-alias-bg-layer-1,#fff);--am-accent:var(--dsw-static-blue-600,#2563eb);--am-accent-soft:rgba(37,99,235,.09);--am-success:#147d45;--am-danger:#b42318;--am-warning:#a15c00;display:flex;flex-direction:column;gap:20px;max-width:1080px;padding:6px 0 40px;font-size:13px;color:var(--am-text-primary)}",
		".am-title{font-size:18px;line-height:1.4;font-weight:600}",
		".am-sub{font-size:13px;line-height:1.75;color:var(--am-text-secondary);margin-top:6px;max-width:760px}",
		"body[data-ds-dark-theme] .am-page{--am-text-primary:var(--dsw-static-neutral-bluish-50,#f9fafb);--am-text-secondary:var(--dsw-static-neutral-bluish-200,#e1e5ee);--am-text-tertiary:var(--dsw-static-neutral-bluish-400,#adb2b8);--am-accent:var(--dsw-static-blue-300,#93c5fd);--am-accent-soft:rgba(147,197,253,.16);--am-success:var(--dsw-static-green-400,#4ed17e);--am-danger:#ff9c8f;--am-warning:var(--dsw-static-amber-400,#f7ad31)}",
		".am-workbench{position:relative;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.2));border-radius:14px;background:var(--am-surface)}",
		".am-viewbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.14))}",
		".am-viewbar .am-tabs{flex:0 0 auto}",
		".am-viewbar .am-refresh{margin-left:auto}",
		".am-refresh-icon{width:14px;height:14px;flex:none}",
		".am-refresh-icon.spinning{animation:am-spin .8s linear infinite}",
		".am-btn{height:32px;padding:0 13px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.32));background:transparent;color:var(--am-text-primary);font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:6px}",
		".am-btn{transition:background .12s ease,border-color .12s ease,color .12s ease}",
		".am-btn:hover:not(:disabled){background:var(--dsw-alias-bg-l1,rgba(127,127,127,.08))}",
		".am-btn:focus-visible,.am-tab:focus-visible,.am-check:focus-visible{outline:2px solid var(--am-accent);outline-offset:2px}",
		".am-btn:disabled,.am-btn.primary:disabled,.am-btn.danger:disabled,.am-btn.hazard:disabled{opacity:1;color:var(--am-text-tertiary);border-color:var(--dsw-alias-border-l1,rgba(127,127,127,.22));background:transparent;cursor:not-allowed}",
		".am-btn.primary{border-color:var(--am-success);color:var(--am-success)}",
		".am-btn.danger{border-color:var(--am-danger);color:var(--am-danger)}",
		".am-btn.danger:hover:not(:disabled){background:rgba(217,45,32,.08)}",
		".am-btn.hazard{background:#d92d20;border-color:#d92d20;color:#fff;font-weight:600}",
		".am-btn.hazard:hover:not(:disabled){background:#b42318;border-color:#b42318}",
		".am-btn.batch{height:32px;padding:0 11px;font-size:12px}",
		".am-tabs{display:inline-flex;align-self:flex-start;gap:4px;padding:4px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:10px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-tab{height:32px;padding:0 16px;border-radius:7px;border:none;background:transparent;color:var(--am-text-secondary);font-size:12px;cursor:pointer}",
		".am-tab:hover{color:var(--am-text-primary)}",
		".am-tab.active{background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16));color:var(--am-text-primary);font-weight:600}",
		".am-search{display:flex;align-items:center;gap:8px;flex:1 1 260px;min-width:200px;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-radius:8px;background:transparent;color:var(--am-text-primary)}",
		".am-search:focus-within{border-color:var(--am-accent);box-shadow:0 0 0 2px var(--am-accent-soft)}",
		".am-search input{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;color:inherit;font-size:13px;appearance:none}",
		".am-search input::placeholder{color:var(--am-text-tertiary);opacity:1}",
		".am-search-icon{display:flex;flex:none;color:var(--am-text-secondary)}",
		".am-search-clear{width:20px;height:20px;border:0;border-radius:50%;background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16));color:var(--am-text-secondary);font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}",
		".am-search-clear:hover{color:var(--am-text-primary)}",
		".am-sort{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--am-text-secondary);white-space:nowrap}",
		".am-select{position:relative;display:inline-flex;min-width:0;font-size:12px}",
		".am-select-trigger{height:32px;min-width:104px;padding:0 8px 0 10px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-radius:7px;background:transparent;color:var(--am-text-primary);font-size:12px;display:inline-flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;white-space:nowrap;transition:border-color .12s ease,background .12s ease}",
		".am-select-trigger:hover{background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-select-trigger:disabled{opacity:1;color:var(--am-text-tertiary);border-color:var(--dsw-alias-border-l1,rgba(127,127,127,.22));cursor:not-allowed}",
		".am-select-trigger:focus-visible{outline:2px solid var(--am-accent);outline-offset:1px;border-color:var(--am-accent)}",
		".am-select-trigger.open{border-color:var(--am-accent)}",
		".am-select-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
		".am-select-chevron{display:flex;flex:none;color:var(--am-text-secondary);transition:transform .15s ease}",
		".am-select-trigger.open .am-select-chevron{transform:rotate(180deg)}",
		".am-select-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:100;min-width:100%;width:max-content;max-width:240px;padding:4px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));border-radius:10px;background:var(--am-surface);box-shadow:0 12px 28px rgba(0,0,0,.18);animation:am-menu .12s ease-out;transform-origin:top left}",
		".am-select-right .am-select-menu{left:auto;right:0;transform-origin:top right}",
		".am-select-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:8px 9px;border:0;border-radius:6px;background:transparent;color:var(--am-text-primary);font-size:12px;line-height:1.4;text-align:left;cursor:pointer;white-space:nowrap;transition:background .1s ease,color .1s ease}",
		".am-select-option:hover,.am-select-option:focus-visible{background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16))}",
		".am-select-option:focus-visible{outline:2px solid var(--am-accent);outline-offset:-2px}",
		".am-select-option.selected,.am-select-option.selected:hover,.am-select-option.selected:focus-visible{background:var(--am-accent-soft);color:var(--am-accent);font-weight:600}",
		".am-select-check{font-size:11px;line-height:1}",
		".am-meta-label{text-decoration:underline dotted;text-underline-offset:2px;cursor:help}",
		".am-empty-actions{display:flex;gap:8px;margin-top:2px}",
		".am-list{display:flex;flex-direction:column;overflow:hidden}",
		".am-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12));background:transparent}",
		".am-row:last-child{border-bottom:none}",
		".am-row{transition:background .12s ease}",
		".am-row:hover{background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-row.selected,.am-row.selected:hover{background:var(--am-accent-soft);box-shadow:inset 0 0 0 1px var(--am-accent)}",
		".am-main{min-width:0;display:flex;flex-direction:column;gap:3px}",
		".am-titleline{display:flex;align-items:center;gap:8px;min-width:0}",
		".am-row-title{flex:0 1 auto;min-width:0;font-size:14px;line-height:1.45;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
		".am-row-meta{font-size:12px;line-height:1.6;color:var(--am-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}",
		".am-row-times{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:18px;row-gap:3px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.6}",
		".am-time{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}",
		".am-time-value{font-variant-numeric:tabular-nums}",
		".am-row-actions{display:flex;align-items:center;gap:8px;justify-self:end;flex-wrap:wrap;justify-content:flex-end}",
		".am-badges{display:flex;align-items:center;gap:6px;flex:none}",
		".am-badge{display:inline-flex;align-items:center;height:22px;padding:0 7px;border-radius:6px;font-size:11px;line-height:1;font-weight:500;border:1px solid transparent;background:var(--dsw-alias-bg-l2,rgba(127,127,127,.14));color:var(--am-text-secondary);cursor:help;white-space:nowrap}",
		".am-badge.ok{color:var(--am-success);background:color-mix(in srgb,var(--am-success) 10%,transparent);border-color:color-mix(in srgb,var(--am-success) 28%,transparent)}",
		".am-badge.warn{color:var(--am-warning);background:color-mix(in srgb,var(--am-warning) 10%,transparent);border-color:color-mix(in srgb,var(--am-warning) 28%,transparent)}",
		".am-badge.danger{color:var(--am-danger);background:color-mix(in srgb,var(--am-danger) 10%,transparent);border-color:color-mix(in srgb,var(--am-danger) 28%,transparent)}",
		".am-badge.muted{color:var(--am-text-secondary);background:var(--dsw-alias-bg-l2,rgba(127,127,127,.12))}",
		".am-check{width:16px;height:16px;flex:none;accent-color:var(--am-accent);cursor:pointer}",
		".am-check:disabled{cursor:not-allowed;opacity:.5}",
		".am-checkline{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--am-text-primary);cursor:pointer}",
		".am-empty-card{display:flex;flex-direction:column;align-items:center;gap:9px;padding:44px 20px;text-align:center;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.025))}",
		".am-empty-title{font-size:14px;font-weight:600}",
		".am-empty-hint{font-size:12px;line-height:1.7;color:var(--am-text-secondary);max-width:460px}",
		".am-empty{font-size:13px;line-height:1.7;color:var(--am-text-secondary);padding:18px 12px;text-align:center}",
		".am-modal-backdrop{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.5);backdrop-filter:blur(3px);animation:am-fade .12s ease-out}",
		".am-modal{width:min(460px,100%);max-height:calc(100vh - 80px);overflow:auto;display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:14px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));background:var(--dsw-alias-bg-overlay,#1c2030);box-shadow:0 20px 48px rgba(0,0,0,.5);outline:none;animation:am-pop .14s ease-out}",
		".am-modal.danger{border-color:color-mix(in srgb,var(--am-danger) 55%,transparent)}",
		".am-modal-title{font-size:16px;line-height:1.4;font-weight:600}",
		".am-modal-body{font-size:13px;line-height:1.75;color:var(--am-text-secondary)}",
		".am-modal-summary{font-size:13px;line-height:1.6;color:var(--am-text-secondary)}",
		".am-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:4px}",
		".am-modal-actions .am-btn{height:32px;padding:0 16px}",
		".am-pending-banner{display:grid;gap:9px;padding:11px 13px;border:1px solid color-mix(in srgb,var(--am-warning) 34%,transparent);border-radius:9px;background:color-mix(in srgb,var(--am-warning) 7%,transparent)}",
		".am-pending-text strong{font-size:13px;font-weight:600}.am-pending-text p{margin:3px 0 0;font-size:12px;line-height:1.6;color:var(--am-text-secondary)}",
		".am-pending-actions{display:flex;flex-wrap:wrap;gap:8px}",
		".am-pending-actions .am-btn{height:30px;padding-inline:12px}",
		".am-guide-modal{width:min(520px,100%)}",
		".am-guide-scroll{display:grid;gap:10px;overflow:auto;min-height:0;padding:2px;font-size:13px;line-height:1.65}",
		".am-guide-intro{margin:0;color:var(--am-text-secondary)}",
		".am-guide-list{display:grid;gap:6px;margin:0;padding:0;list-style:none}",
		".am-guide-list li{display:grid;gap:2px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:8px;min-width:0}",
		".am-guide-state{font-size:12px;line-height:1.6;color:var(--am-warning);overflow-wrap:anywhere}",
		".am-guide-steps-title{font-size:13px;font-weight:600}",
		".am-guide-steps{display:grid;gap:6px;margin:0;padding-inline-start:20px;font-size:12px;color:var(--am-text-secondary)}",
		".am-guide-steps li{padding-inline-start:2px}",
		".am-guide-link{display:flex;justify-content:flex-start}",
		".am-preview{display:flex;flex-direction:column;gap:9px;padding-block:2px;max-height:42vh;overflow:auto;min-height:0}.am-preview-set{flex-shrink:0}.am-preview:focus-visible{outline:2px solid var(--am-accent);outline-offset:2px}.am-preview-set{border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));padding:8px 12px;border-radius:8px;line-height:1.55;overflow-wrap:anywhere}.am-preview-set ul{padding-inline-start:18px;margin:4px 0 0}",
		"@keyframes am-spin{to{transform:rotate(360deg)}}",
		"@keyframes am-fade{from{opacity:0}to{opacity:1}}",
		"@keyframes am-pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}",
		"@keyframes am-menu{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}",
		"@media (prefers-reduced-motion:reduce){.am-modal,.am-modal-backdrop,.am-select-menu,.am-refresh-icon.spinning{animation:none}}",
		".am-page{gap:14px;min-width:0}.am-head{display:grid;gap:8px}.am-workbench{container-type:inline-size}",
		".am-version,.am-popover-anchor{position:relative;min-width:0}.am-version{width:max-content;max-width:100%;font-size:12px;line-height:1.6}.am-version-line{display:flex;align-items:center;gap:8px}.am-version-label{width:72px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-version-line .am-btn{flex:none}.am-version-line .am-btn[aria-disabled=true]{color:var(--am-text-tertiary);cursor:wait}.am-version a{color:var(--am-accent);text-decoration:underline}.am-update-result{display:grid;gap:6px;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18))}.am-update-result .am-btn{justify-self:start}",
		".am-popover{display:grid;gap:5px;padding:10px 12px;min-width:0;width:max-content;max-width:290px;font-size:12px;line-height:1.6;overflow-wrap:anywhere}.am-version-details{width:284px}.am-popover-hint,.am-scope{margin:4px 0;color:var(--am-text-secondary);font-size:12px;line-height:1.55}.am-batch-menu .am-btn{justify-content:flex-start;text-align:start}.am-help{font-size:12px;line-height:1.55;color:var(--am-text-secondary)}",
		".am-viewbar{flex-wrap:nowrap;gap:8px}.am-viewbar .am-tabs{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);flex:0 1 284px;min-width:0}.am-tab{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-inline:8px}",
		".am-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,168px) minmax(0,138px);gap:8px;padding:8px 12px}.am-controls .am-select,.am-controls .am-select-trigger{width:100%;min-width:0}.am-context-control,.am-sort,.am-search{min-width:0}.am-search input::-webkit-search-cancel-button{appearance:none}.am-search-clear{flex:none}.am-select-menu{max-height:min(330px,56vh);overflow:auto;translate:var(--am-popover-shift,0px) 0}.am-select-menu .am-popover-hint{padding-inline:8px;white-space:normal}.am-select-option{white-space:normal}.am-select-option-label{min-width:0;overflow-wrap:anywhere}",
		".am-summary,.am-toolbar{display:grid;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12));font-size:12px}.am-summary{grid-template-columns:minmax(0,1.65fr) 53px minmax(0,1fr) 90px 92px;color:var(--am-text-secondary)}.am-summary-total,.am-summary-status,.am-selected-count,.am-stats{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-quiet,.am-quiet:disabled{border-color:transparent}.am-summary .am-btn,.am-batch>.am-btn{width:100%;min-width:0;padding-inline:5px}.am-empty-all span,.am-batch-purge span,.am-batch>.am-btn span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.am-invisible{visibility:hidden}",
		".am-toolbar{grid-template-columns:max-content minmax(0,1fr) 113px 148px}.am-toolbar label{min-width:0;white-space:nowrap}.am-selected-count{font-weight:600;color:var(--am-accent)}.am-batch-purge{min-width:0;padding-inline:6px}.am-batch .am-popover{left:auto;right:0;width:max-content}",
		".am-list-area,.am-empty-card{min-height:144px}.am-empty-card{box-sizing:border-box;justify-content:center;padding:15px 18px}",
		".am-list{overflow:visible}.am-row{grid-template-columns:28px minmax(120px,1fr) minmax(64px,90px) auto;gap:12px;padding:10px 12px}.am-row-title{display:block;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;border:0;padding:0;background:transparent;color:var(--am-text-primary);text-align:left;cursor:pointer;font:inherit;font-size:14px;font-weight:500;line-height:1.5}.am-row-title:hover{text-decoration:underline}.am-row-title:focus-visible,.am-search-clear:focus-visible,.am-info-scroll:focus-visible{outline:2px solid var(--am-accent);outline-offset:2px}.am-titleline{align-items:center}.am-check-target{display:flex;width:28px;min-height:28px;align-items:center;justify-content:center;cursor:pointer}.am-check{margin:0}.am-log-size{display:flex;flex-direction:column;gap:2px;align-items:flex-end;font-size:12px;font-variant-numeric:tabular-nums}.am-log-size strong{font-weight:500}.am-badge{flex:none;font-size:12px}.am-row-actions{gap:6px;max-width:100%}",
		".am-warning-text{color:var(--am-warning);overflow-wrap:anywhere}.am-select-option:disabled{color:var(--am-text-tertiary);cursor:not-allowed}.am-details,.am-report{display:grid;gap:6px;min-width:0;font-size:12px;line-height:1.6}.am-report p{margin:0}.am-report-list{display:grid;gap:4px;padding-inline-start:18px;margin:4px 0 0}.am-report-item,.am-path{white-space:pre-wrap;overflow-wrap:anywhere}.am-path{user-select:text}.am-info-scroll{overflow:auto;min-height:0;padding:3px}.am-info-modal .am-modal-actions{flex:none}.am-file-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.am-file-list p{margin:0}.am-file{display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:9px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16));border-radius:8px;min-width:0}.am-file>div{max-width:100%}.am-modal{background:var(--am-surface)}.am-modal-actions{flex-wrap:wrap}",
		"@container (max-width:820px){.am-row{grid-template-columns:28px minmax(0,1fr) auto}.am-row-actions{grid-column:2/-1;justify-self:start;justify-content:flex-start;padding-top:2px}.am-log-size{grid-column:3;grid-row:1}}",
		"@container (max-width:520px){.am-controls{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.am-search{grid-column:1/-1}.am-summary{grid-template-columns:minmax(0,1fr) 53px 90px 92px;grid-template-rows:32px 18px;gap:3px 5px}.am-summary-status{grid-row:2;grid-column:1/-1}.am-toolbar{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:28px 32px;gap:4px 6px}.am-toolbar .am-stats,.am-toolbar .am-selected-count{justify-self:end}.am-viewbar .am-refresh{width:34px;padding:0;flex:none}.am-refresh span{display:none}}",
		"@container (max-width:380px){.am-summary{grid-template-columns:minmax(0,1fr) 44px 73px 79px;grid-template-rows:32px 24px;padding-inline:8px}.am-summary-total{grid-column:1/3;grid-row:1}.am-scope-anchor{grid-column:2;grid-row:2}.am-summary-status{grid-column:1;grid-row:2}.am-result{grid-column:3;grid-row:1}.am-empty-all{grid-column:4;grid-row:1}.am-controls,.am-toolbar,.am-viewbar{padding-inline:8px}.am-row{grid-template-columns:24px minmax(0,1fr);gap:6px}.am-log-size{grid-column:2;grid-row:auto;flex-direction:row;gap:7px;align-items:baseline}.am-row-actions{grid-column:2}.am-row-actions .am-btn{padding-inline:6px}.am-row .am-titleline{gap:4px}}",
		"@media (max-width:520px){.am-modal-backdrop{padding:12px}.am-version-line{gap:5px}.am-version-label{width:56px}.am-version-line .am-btn{padding-inline:8px}}",
	].join("\n");

	var stylesInjected = false;
	function injectStyles() {
		if (stylesInjected || typeof document === "undefined") return;
		stylesInjected = true;
		var style = document.createElement("style");
		style.setAttribute("data-dsh-archived-manager", "1");
		style.textContent = CSS;
		document.head.appendChild(style);
	}
	function Page(props) {
		if (props && typeof props.t === "function") translate = props.t;
		var tabState = useState("archived");
		var tab = tabState[0];
		var setTab = tabState[1];
		var itemsState = useState([]);
		var items = itemsState[0];
		var setItems = itemsState[1];
		var removedState = useState([]);
		var removed = removedState[0];
		var setRemoved = removedState[1];
		var phaseState = useState("loading");
		var phase = phaseState[0];
		var setPhase = phaseState[1];
		var errorState = useState(null);
		var error = errorState[0];
		var setError = errorState[1];
		var selectedState = useState([]);
		var selected = selectedState[0];
		var setSelected = selectedState[1];
		var confirmState = useState(null);
		var confirm = confirmState[0];
		var setConfirm = confirmState[1];
		var busyState = useState(false);
		var busy = busyState[0];
		var setBusy = busyState[1];
		var toastState = useState(null);
		var toast = toastState[0];
		var setToast = toastState[1];
		var removedSelectedState = useState([]);
		var removedSelected = removedSelectedState[0];
		var setRemovedSelected = removedSelectedState[1];
		var queryState = useState("");
		var query = queryState[0];
		var setQuery = queryState[1];
		var filterState = useState("all");
		var filter = filterState[0];
		var setFilter = filterState[1];
		var sortState = useState("lastUsed");
		var sort = sortState[0];
		var setSort = sortState[1];
		var removedQueryState = useState("");
		var removedQuery = removedQueryState[0];
		var setRemovedQuery = removedQueryState[1];
		var removedSortState = useState("movedAt");
		var removedSort = removedSortState[0];
		var setRemovedSort = removedSortState[1];
		var reportState = useState(null);
		var report = reportState[0];
		var setReport = reportState[1];
		var settingsState = useState({ trashRetentionDays: 0 });
		var settings = settingsState[0];
		var setSettings = settingsState[1];
		var attachmentsState = useState({ bytes: 0, files: 0 });
		var attachments = attachmentsState[0];
		var setAttachments = attachmentsState[1];
		var menuState = useState(null);
		var menu = menuState[0];
		var setMenu = menuState[1];

		var updateState = useState(null);
		var update = updateState[0], setUpdate = updateState[1];
		var updatePhaseState = useState("");
		var updatePhase = updatePhaseState[0], setUpdatePhase = updatePhaseState[1];
		var filesState = useState({});
		var files = filesState[0], setFiles = filesState[1];
		var infoState = useState(null);
		var info = infoState[0], setInfo = infoState[1];
		var selectionNoticeState = useState("");
		var selectionNotice = selectionNoticeState[0], setSelectionNotice = selectionNoticeState[1];
		var operationCountState = useState(0);
		var operationCount = operationCountState[0], setOperationCount = operationCountState[1];
		var updateErrorState = useState("");
		var updateError = updateErrorState[0], setUpdateError = updateErrorState[1];
		var removedWarningsState = useState([]);
		var removedWarnings = removedWarningsState[0], setRemovedWarnings = removedWarningsState[1];
		var pendingState = useState([]);
		var pending = pendingState[0];
		var setPending = pendingState[1];
		var pendingBusyState = useState(false);
		var pendingBusy = pendingBusyState[0];
		var setPendingBusy = pendingBusyState[1];
		var guideState = useState(null);
		var guide = guideState[0];
		var setGuide = guideState[1];
		var pendingWarningState = useState(null);
		var pendingWarning = pendingWarningState[0], setPendingWarning = pendingWarningState[1];
		var dialogOpen = confirm !== null || info !== null || guide !== null;
		var locked = busy || Boolean(update && update.busy) || updatePhase === "preparing" || phase !== "ready";
		var actionRef = React.useRef(false);
		var updateRef = React.useRef(false);
		var statusRequest = React.useRef(null);
		var returnFocusRef = React.useRef(null);
		var cancelRef = React.useRef(null);
		var refreshRef = React.useRef(null);
		var archivedAllRef = React.useRef(null);
		var removedAllRef = React.useRef(null);
		var loadRef = React.useRef(false);
		var hasSnapshotRef = React.useRef(false);
		var confirmRef = React.useRef(null);
		var menuRef = React.useRef(null);
		var menuTriggerRef = React.useRef(null);
		var pendingFocusRef = React.useRef(false);

		function keyOf(entry) {
			return entry.batch + "/" + entry.id;
		}

		function load(options) {
			var opts = options || {};
			var silent = opts.silent === true;
			if (loadRef.current) return Promise.resolve();
			loadRef.current = true;
			setPhase("loading");
			if (silent !== true) setError(null);
			return Promise.all([
				request("/list"),
				Promise.resolve().then(function () { return request("/settings"); }).catch(function () { return null; }),
				Promise.resolve().then(function () { return request("/pending"); }).catch(function () { return null; })
			]).then(function (pair) {
				var data = pair[0] || {};
				if (!Array.isArray(data.items) || !Array.isArray(data.removed)) throw new Error("Incomplete session list response");
				var settingsData = pair[1];
				var pendingData = pair[2];
				var nextItems = Array.isArray(data.items) ? data.items : [];
				var nextRemoved = Array.isArray(data.removed) ? data.removed : [];
				hasSnapshotRef.current = true;
				setItems(nextItems);
				setRemoved(nextRemoved);
				setPendingWarning(pendingData && typeof pendingData.warning === "string" ? pendingData.warning : null);
				setPending(pendingData && Array.isArray(pendingData.items) ? pendingData.items : []);
				setRemovedWarnings(Array.isArray(data.removedWarnings) ? data.removedWarnings : []);
				setAttachments(data.attachments && typeof data.attachments === "object"
					? { bytes: Number(data.attachments.bytes) || 0, files: Number(data.attachments.files) || 0 }
					: { bytes: 0, files: 0 });
				if (settingsData && settingsData.settings) {
					setSettings({ trashRetentionDays: Number(settingsData.settings.trashRetentionDays) || 0 });
				} else {
					setSettings(function (current) { return Object.assign({}, current, { unavailable: true }); });
				}
				if (opts.keepSelection !== true) {
					setSelected([]);
					setRemovedSelected([]);
				}
				setPhase("ready");
			}).catch(function (failure) {
				setError(String(failure && failure.message ? failure.message : failure));
				setPhase(hasSnapshotRef.current ? "stale" : "failed");
			}).finally(function () {
				loadRef.current = false;
			});
		}

		function guideEntry(item) {
			return { id: item.id, batch: item.batch, title: item.title, missing: item.missing === true };
		}

		function diagnoseInto(entries, token) {
			return request("/diagnose", { items: entries.map(targetOf) }).then(function (data) {
				if (!Array.isArray(data.items)) throw new Error("Incomplete diagnosis response");
				setGuide(function (current) {
					return current && current.token === token
						? Object.assign({}, current, { diagnosis: data.items, loading: false, error: null })
						: current;
				});
			}).catch(function (error) {
				setGuide(function (current) {
					return current && current.token === token
						? Object.assign({}, current, { loading: false, error: errorText(error.code, error.message) })
						: current;
				});
			});
		}

		function openGuide(entries, options) {
			var seen = new Set();
			var list = (entries || []).filter(function (item) {
				if (!item || !item.id) return false;
				var key = (item.batch || "") + "/" + item.id;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
			if (!list.length) return;
			var token = String(Date.now()) + ":" + Math.random();
			returnFocusRef.current = options && options.trigger || document.activeElement;
			setMenu(null);
			var kinds = new Set(list.map(function (entry) { return entry.batch ? "discard" : "purge"; }));
			setGuide({
				token: token,
				kind: kinds.size === 1 ? list[0].batch ? "discard" : "purge" : null,
				entries: list.map(guideEntry),
				diagnosis: null,
				loading: true,
				error: null
			});
			diagnoseInto(list, token);
		}

		function recheckGuide() {
			if (!guide || guide.loading) return;
			var token = guide.token;
			setGuide(Object.assign({}, guide, { loading: true, error: null, diagnosis: null }));
			diagnoseInto(guide.entries, token);
		}

		function holderText(holder) {
			if (!holder) return tr("guideNoHolder");
			return (holder.name ? holder.name + " " : "") + "(PID " + holder.pid + ")";
		}

		function activityText(activities) {
			var labels = (activities || []).map(function (activity) {
				var items = (activity.items || []).filter(function (item) { return typeof item === "string" && item; });
				return activity.kind + (items.length ? " · " + items.join(" / ") : "");
			});
			return labels.join("；");
		}

		function diagnosisText(entry) {
			if (!entry) return tr("guideUnknown");
			switch (entry.state) {
				case "free": return tr("guideFree");
				case "missing": return tr("guideMissing");
				case "unavailable": return tr("guideUnavailable", { reason: entry.reason || "—" });
				case "running": return tr("guideRunning");
				case "activity": return tr("guideActivity", { items: activityText(entry.activities) });
				case "loaded": return tr("guideLoaded");
				case "external":
					if (entry.holder && entry.holder.self) return tr("guideSelf", { pid: entry.holder.pid });
					return tr("guideExternal", { holder: holderText(entry.holder) });
				default:
					return tr("guideUnknown") + (entry.lock && entry.lock.reason ? " " + entry.lock.reason : "");
			}
		}

		function guideAllFree() {
			return Boolean(guide && !guide.loading && !guide.error && Array.isArray(guide.diagnosis) && guide.diagnosis.length > 0
				&& guide.diagnosis.every(function (entry) { return entry.state === "free"; }));
		}

		function pendingActionItems(entries, kind) {
			return (entries || []).map(function (entry) {
				var item = { id: entry.id, title: entry.title || entry.id, capabilities: {} };
				if (entry.batch) item.batch = entry.batch;
				var action = kind || (entry.scope === "removed" ? "discard" : "purge");
				item.capabilities[action] = true;
				return item;
			});
		}

		function continueGuide() {
			if (!guide || !guide.kind || !guideAllFree()) return;
			var kind = guide.kind;
			var items = pendingActionItems(guide.entries, kind);
			setGuide(null);
			openConfirm(kind, items, { force: true });
		}

		function recordGuide() {
			if (!guide || pendingBusy) return;
			var items = guide.entries.map(function (entry) {
				var item = { id: entry.id, scope: entry.batch ? "removed" : "archived", title: entry.title || entry.id };
				if (entry.batch) item.batch = entry.batch;
				return item;
			});
			setPendingBusy(true);
			request("/pending/add", {
				items: items,
				reason: { code: "restart-required", message: tr("errRestartRequired") }
			}).then(function (data) {
				if (Array.isArray(data.items)) setPending(data.items);
				setGuide(null);
				setToast({ kind: "ok", text: tr("guideRecorded") });
			}).catch(function (error) {
				var message = errorText(error.code, error.message);
				setGuide(function (current) { return current ? Object.assign({}, current, { error: message }) : current; });
				setToast({ kind: "bad", text: message });
			}).finally(function () {
				setPendingBusy(false);
			});
		}

		function clearPendingRecords() {
			if (pendingBusy) return;
			if (pending.length > 0) {
				var accepted = true;
				try { accepted = window.confirm(tr("pendingClearConfirm", { n: pending.length })); }
				catch (error) { accepted = false; }
				if (!accepted) return;
			}
			setPendingBusy(true);
			request("/pending/clear", {}).then(function (data) {
				setPendingWarning(null);
				setPending(Array.isArray(data.items) ? data.items : []);
				setToast({ kind: "ok", text: tr("pendingCleared") });
			}).catch(function (error) {
				setToast({ kind: "bad", text: tr("pendingFailed", { message: errorText(error.code, error.message) }) });
			}).finally(function () {
				setPendingBusy(false);
			});
		}

		function pendingBanner() {
			if (pending.length === 0 && !pendingWarning) return null;
			var archived = pending.filter(function (entry) { return entry.scope !== "removed"; });
			var removedPending = pending.filter(function (entry) { return entry.scope === "removed"; });
			return h("div", { key: "pending-banner", className: "am-pending-banner", role: "status", "aria-live": "polite" }, [
				h("div", { key: "text", className: "am-pending-text" }, [
					pending.length ? h("strong", { key: "title" }, tr("pendingTitle", { n: pending.length })) : null,
					pending.length ? h("p", { key: "body" }, tr("pendingBody")) : null,
					pendingWarning ? h("p", { key: "warning", className: "am-warning-text" }, pendingWarning) : null
				]),
				h("div", { key: "actions", className: "am-pending-actions" }, [
					archived.length ? button("continue-archived", tr("pendingArchived", { n: archived.length }), function () {
						openConfirm("purge", pendingActionItems(archived), { force: true });
					}, locked || pendingBusy) : null,
					removedPending.length ? button("continue-removed", tr("pendingRemoved", { n: removedPending.length }), function () {
						openConfirm("discard", pendingActionItems(removedPending), { force: true });
					}, locked || pendingBusy) : null,
					button("clear-pending", tr("pendingClear"), clearPendingRecords, pendingBusy || locked)
				])
			]);
		}

		function guidePanel() {
			if (guide === null) return null;
			var allFree = guideAllFree();
			var diagnosis = Array.isArray(guide.diagnosis) ? guide.diagnosis : [];
			var labels = guide.entries.map(function (entry) { return entry.title || entry.id; });
			return h("div", {
				key: "guide", className: "am-modal-backdrop",
				onMouseDown: function (event) { if (event.currentTarget === event.target && !pendingBusy) setGuide(null); }
			}, h("div", {
				className: "am-modal am-guide-modal", ref: confirmRef, tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-label": tr("guideTitle")
			}, [
				h("div", { key: "title", className: "am-modal-title" }, tr("guideTitle")),
				h("div", { key: "body", className: "am-guide-scroll", tabIndex: 0 }, [
					h("p", { key: "intro", className: "am-guide-intro" }, tr("guideIntro")),
					guide.loading ? h("p", { key: "checking", className: "am-guide-checking", role: "status" }, tr("guideChecking"))
						: guide.error ? h("p", { key: "error", className: "am-warning-text", role: "alert" }, tr("guideUnavailable", { reason: guide.error }))
						: h("ul", { key: "states", className: "am-guide-list" }, diagnosis.map(function (entry, index) {
							return h("li", { key: entry.id + ":" + (entry.batch || "") + ":" + index }, [
								h("strong", { key: "name" }, labels[index] || entry.id),
								h("span", { key: "state", className: "am-guide-state" }, diagnosisText(entry))
							]);
						})),
					h("strong", { key: "steps-title", className: "am-guide-steps-title" }, tr("guideStepTitle")),
					h("ol", { key: "steps", className: "am-guide-steps" }, [
						tr("guideStep1"), tr("guideStep2"), tr("guideStep3"), tr("guideStep4"), tr("guideStep5")
					].map(function (step, index) { return h("li", { key: index }, step); }))
				]),
				h("div", { key: "actions", className: "am-modal-actions" }, [
					h("button", { key: "guide-close", type: "button", ref: cancelRef, className: "am-btn", disabled: pendingBusy, onClick: function () { setGuide(null); } }, tr("guideClose")),
					button("guide-recheck", tr("guideRecheck"), recheckGuide, guide.loading || pendingBusy),
					button("guide-record", tr("guideRecord"), recordGuide, pendingBusy),
					allFree && guide.kind ? button("guide-continue", tr("guideContinue"), continueGuide, pendingBusy) : null,
					!guide.kind ? h("p", { key: "mixed-hint", className: "am-help" }, tr("guideMixed")) : null
				])
			]));
		}

		useEffect(function () {
			void load();
		}, []);

		useEffect(function () {
			if (dialogOpen || busy) setMenu(null);
		}, [dialogOpen, busy]);

		useEffect(function () {
			if (menu === null) return;
			if (locked && menu !== "version" && menu !== "scope") setMenu(null);
		}, [menu, locked]);

		useEffect(function () {
			if (menu === null || !menuRef.current) return;
			var target = menuRef.current.querySelector('[aria-selected="true"]')
				|| menuRef.current.querySelector('[role="option"]')
				|| (menu === "batch" ? menuRef.current.querySelector("button:not(:disabled)") : null);
			if (target && typeof target.focus === "function") target.focus();
		}, [menu]);

		useEffect(function () {
			if (menu === null) return undefined;
			function onDown(event) {
				if (menuRef.current && menuRef.current.contains(event.target)) return;
				if (menuTriggerRef.current && menuTriggerRef.current.contains(event.target)) return;
				if (menu === "version" && event.target.closest(".am-version-line")) return;
				setMenu(null);
			}
			function position() {
				var popup = menuRef.current;
				if (!popup) return;
				var page = popup.closest(".am-page");
				if (!page) return;
				var bounds = page.getBoundingClientRect();
				popup.style.maxWidth = Math.min(290, Math.max(0, bounds.width - 12)) + "px";
				popup.style.setProperty("--am-popover-shift", "0px");
				var rect = popup.getBoundingClientRect();
				var shift = rect.left < bounds.left + 5 ? bounds.left + 5 - rect.left
					: rect.right > bounds.right - 5 ? bounds.right - 5 - rect.right : 0;
				popup.style.setProperty("--am-popover-shift", shift + "px");
			}
			function onKey(event) {
				if (event.key !== "Escape") return;
				event.preventDefault();
				event.stopPropagation();
				setMenu(null);
				if (menuTriggerRef.current && typeof menuTriggerRef.current.focus === "function") {
					menuTriggerRef.current.focus();
				}
			}
			document.addEventListener("mousedown", onDown);
			// Catch Escape before the enclosing DSH Settings dialog handles it.
			window.addEventListener("keydown", onKey, true);
			window.addEventListener("resize", position);
			position();
			var observer = menuRef.current && typeof window.ResizeObserver === "function" ? new window.ResizeObserver(position) : null;
			if (observer) observer.observe(menuRef.current);
			return function () {
				if (observer) observer.disconnect();
				document.removeEventListener("mousedown", onDown);
				window.removeEventListener("keydown", onKey, true);
				window.removeEventListener("resize", position);
			};
		}, [menu]);

		useEffect(function () {
			if (!dialogOpen) return undefined;
			function onKey(event) {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					if (guide !== null && pendingBusy) return;
					if (!actionRef.current || info !== null || guide !== null) {
						setConfirm(null);
						setInfo(null);
						setGuide(null);
					}
					return;
				}
				if (event.key !== "Tab" || !confirmRef.current) return;
				var nodes = Array.prototype.slice.call(confirmRef.current.querySelectorAll(
					"button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']"
				)).filter(function (node) { return node.getClientRects().length > 0; });
				if (nodes.length === 0) return;
				var first = nodes[0];
				var last = nodes[nodes.length - 1];
				var active = document.activeElement;
				if (!confirmRef.current.contains(active)) {
					event.preventDefault();
					first.focus();
					return;
				}
				if (event.shiftKey && (active === first || active === confirmRef.current)) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && active === last) {
					event.preventDefault();
					first.focus();
				}
			}
			window.addEventListener("keydown", onKey, true);
			if (cancelRef.current && typeof cancelRef.current.focus === "function") cancelRef.current.focus();
			return function () {
				window.removeEventListener("keydown", onKey, true);
				pendingFocusRef.current = true;
			};
		}, [dialogOpen, info !== null, guide !== null, pendingBusy]);

		// Closing a submitted dialog often coincides with a list refresh. Wait
		// until a connected target is enabled; focusing disabled buttons is a no-op.
		useEffect(function () {
			if (!pendingFocusRef.current || dialogOpen || busy || update && update.busy || updatePhase === "preparing") return;
			var candidates = [returnFocusRef.current, tab === "removed" ? removedAllRef.current : archivedAllRef.current, refreshRef.current];
			for (var index = 0; index < candidates.length; index++) {
				var target = candidates[index];
				if (target && target.isConnected !== false && !target.disabled && typeof target.focus === "function") {
					target.focus();
					pendingFocusRef.current = false;
					return;
				}
			}
		}, [dialogOpen, phase, busy, Boolean(update && update.busy), updatePhase, tab]);

		useEffect(function () {
			var last = 0;
			function refresh() {
				if (locked || actionRef.current || dialogOpen) return;
				var now = Date.now();
				if (now - last < 5000) return;
				last = now;
				void load({ silent: true, keepSelection: true });
			}
			function onVisibility() {
				if (document.visibilityState === "visible") refresh();
			}
			window.addEventListener("focus", refresh);
			document.addEventListener("visibilitychange", onVisibility);
			var timer = setInterval(onVisibility, 60000);
			return function () {
				window.removeEventListener("focus", refresh);
				document.removeEventListener("visibilitychange", onVisibility);
				clearInterval(timer);
			};
		}, [locked, dialogOpen]);

		function itemText(item) {
			return [
				item && item.title ? item.title : "",
				item && item.workspace && item.workspace.title ? item.workspace.title : "",
				item && item.id ? item.id : ""
			].join(" ").toLowerCase();
		}

		function entryText(entry) {
			return [
				entry && entry.title ? entry.title : "",
				entry && entry.workspace ? typeof entry.workspace === "object" ? entry.workspace.title || "" : entry.workspace : "",
				entry && entry.id ? entry.id : ""
			].join(" ").toLowerCase();
		}

		var normalizedQuery = query.trim().toLowerCase();
		var normalizedRemovedQuery = removedQuery.trim().toLowerCase();

		function compareItems(a, b) {
			if (sort === "size") return (b.sizeBytes || 0) - (a.sizeBytes || 0) || String(a.id).localeCompare(String(b.id));
			if (sort === "archived") return (b.archivedAt || 0) - (a.archivedAt || 0) || String(a.id).localeCompare(String(b.id));
			if (sort === "title") return String(a.title || "").localeCompare(String(b.title || ""), ZH ? "zh-CN" : "en") || String(a.id).localeCompare(String(b.id));
			return (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0) || String(a.id).localeCompare(String(b.id));
		}

		function compareRemoved(a, b) {
			if (removedSort === "size") return (b.bytes || 0) - (a.bytes || 0) || String(a.id).localeCompare(String(b.id));
			if (removedSort === "title") return String(a.title || "").localeCompare(String(b.title || ""), ZH ? "zh-CN" : "en") || String(a.id).localeCompare(String(b.id));
			return (b.movedAt || 0) - (a.movedAt || 0) || String(a.id).localeCompare(String(b.id));
		}

		var filteredItems = items.filter(function (item) {
			if (normalizedQuery !== "" && itemText(item).indexOf(normalizedQuery) < 0) return false;
			if (filter === "files") return !item.missing;
			if (filter === "missing") return item.missing;
			return true;
		});
		var sortedItems = filteredItems.sort(compareItems);
		var filteredRemoved = removed.filter(function (entry) {
			return normalizedRemovedQuery === "" || entryText(entry).indexOf(normalizedRemovedQuery) >= 0;
		});
		var sortedRemoved = filteredRemoved.sort(compareRemoved);
		var selectable = sortedItems.filter(function (item) { return !item.running; });
		var allowed = new Set(selectable.map(function (item) { return item.id; }));
		var allowedRemoved = new Set(sortedRemoved.map(keyOf));
		selected = selected.filter(function (id) { return allowed.has(id); });
		removedSelected = removedSelected.filter(function (key) { return allowedRemoved.has(key); });
		var selectedIds = new Set(selected);
		var removedKeys = new Set(removedSelected);
		var selectedItems = items.filter(function (item) { return selectedIds.has(item.id); });
		var selectedRemovedEntries = removed.filter(function (entry) { return removedKeys.has(keyOf(entry)); });
		var allSelected = selectable.length > 0 && selectedIds.size === selectable.length;
		var allRemovedSelected = sortedRemoved.length > 0 && removedKeys.size === sortedRemoved.length;
		var missingCount = items.filter(function (item) { return item.missing; }).length;
		var filesCount = items.length - missingCount;

		useEffect(function () {
			var pruned = selectedState[0].length - selected.length + removedSelectedState[0].length - removedSelected.length;
			if (selected.length !== selectedState[0].length) setSelected(selected);
			if (removedSelected.length !== removedSelectedState[0].length) setRemovedSelected(removedSelected);
			if (pruned > 0) setSelectionNotice(tr("selectionPruned", { n: pruned }));
		}, [query, filter, removedQuery, items, removed]);

		function syncAllRef(node) {
			archivedAllRef.current = node;
			if (node) node.indeterminate = selected.length > 0 && !allSelected;
		}

		function syncRemovedRef(node) {
			removedAllRef.current = node;
			if (node) node.indeterminate = removedSelected.length > 0 && !allRemovedSelected;
		}

		function toggle(id) {
			if (locked || actionRef.current) return;
			setSelected(function (current) {
				return current.indexOf(id) >= 0
					? current.filter(function (value) { return value !== id; })
					: current.concat([id]);
			});
		}

		function toggleAll() {
			if (locked || actionRef.current) return;
			setSelected(allSelected ? [] : selectable.map(function (item) { return item.id; }));
		}

		function toggleRemoved(key) {
			if (locked || actionRef.current) return;
			setRemovedSelected(function (current) {
				return current.indexOf(key) >= 0
					? current.filter(function (value) { return value !== key; })
					: current.concat([key]);
			});
		}

		function toggleAllRemoved() {
			if (locked || actionRef.current) return;
			setRemovedSelected(allRemovedSelected ? [] : sortedRemoved.map(keyOf));
		}

		function clearFilters() {
			if (locked || actionRef.current) return;
			setQuery("");
			setFilter("all");
		}

		function clearRemovedFilters() {
			if (locked || actionRef.current) return;
			setRemovedQuery("");
		}

		function failureTitle(failure) {
			if (!failure) return tr("errGeneric");
			if (failure.title && failure.title !== failure.id) return failure.title;
			var entry = (failure.batch ? removed : items).find(function (candidate) {
				return candidate.id === failure.id && (!failure.batch || candidate.batch === failure.batch);
			});
			return entry && entry.title || failure.id || tr("errGeneric");
		}

		function failureReason(failure) {
			var reason = errorText(failure && failure.code, failure && (failure.error || failure.reason));
			if (!failure || !failure.partial) return reason;
			var label = failure.logsMoved ? "partialMoved" : failure.logsRestored ? "partialRestored" : "partialReason";
			return tr(label, { reason: failure.error || reason });
		}

		function reminderText(count) {
			return count > 0 ? tr("toastReminders", { n: count }) : "";
		}

		function finish(summary, meta) {
			actionRef.current = false;
			setBusy(false);
			setConfirm(null);
			var failures = summary.failures;
			var successes = summary.successes;
			var blocked = meta.blocked || [];
			var reasons = failures.concat(blocked, summary.warnings);
			var resultTitle = tr(summary.partial ? "resultSummaryPartial" : "resultSummary", {
				ok: summary.ok, partial: summary.partial, fail: summary.fail, skip: summary.skip + blocked.length
			});
			if (meta.scope === "removed") {
				var successKeys = successes.map(keyOf);
				setRemovedSelected(function (current) {
					var next = current.filter(function (key) { return successKeys.indexOf(key) < 0; });
					failures.forEach(function (failure) {
						var entry = removed.filter(function (candidate) { return candidate.id === failure.id && (!failure.batch || candidate.batch === failure.batch); })[0];
						if (entry && next.indexOf(keyOf(entry)) < 0) next.push(keyOf(entry));
					});
					return next;
				});
				if (!meta.preserveRows) setRemoved(function (current) { return current.filter(function (entry) { return successKeys.indexOf(keyOf(entry)) < 0; }); });
			} else {
				var successIds = successes.map(function (item) { return item.id; });
				setSelected(function (current) {
					var next = current.filter(function (id) { return successIds.indexOf(id) < 0; });
					failures.forEach(function (failure) { if (failure.id && next.indexOf(failure.id) < 0) next.push(failure.id); });
					return next;
				});
				setItems(function (current) { return current.filter(function (item) { return successIds.indexOf(item.id) < 0; }); });
			}
			setFiles(function (current) {
				var next = Object.assign({}, current);
				successes.forEach(function (entry) { delete next[entry.batch ? keyOf(entry) : entry.id]; });
				return next;
			});
			setReport(reasons.length ? {
				title: resultTitle,
				failures: reasons.map(function (entry) {
					var code = entry.code || (entry.warning ? "protected-content" : undefined);
					return Object.assign({
						title: failureTitle(entry),
						reason: entry.warning || failureReason(entry)
					}, entry.id ? { id: entry.id } : {}, entry.batch ? { batch: entry.batch } : {}, code ? { code: code } : {});
				})
			} : null);
			setToast({
				kind: failures.length ? "bad" : "ok",
				text: failures.length ? resultTitle : meta.ok(summary),
				showRemoved: meta.showRemoved && (summary.ok > 0 || failures.some(function (failure) { return failure.recoveryBatch; }))
			});
			void load({ silent: true, keepSelection: true });
		}

		function failRequest(failure) {
			actionRef.current = false;
			setBusy(false);
			setConfirm(null);
			setReport({ title: failure && failure.code === "state-changed" ? tr("rangeChanged") : tr("operationUnknown"), failures: [{ title: failure && failure.code === "state-changed" ? tr("rangeChanged") : tr("unknownResult"), reason: errorText(failure && failure.code, failure && failure.message) }] });
			setPhase("stale");
			void load({ silent: true, keepSelection: true });
		}

		function beginAction(count, allowAll) {
			if (locked || actionRef.current) return false;
			if (!allowAll && (count < 1 || count > MAX_BATCH)) {
				setToast({ kind: "bad", text: tr("batchLimit") });
				return false;
			}
			actionRef.current = true;
			setBusy(true);
			setOperationCount(count);
			setToast(null);
			setReport(null);
			setMenu(null);
			return true;
		}

		function runAction(path, body, meta) {
			var count = (body.ids || body.items || []).length;
			if (!beginAction(count, meta.allowAll)) return;
			request(path, body).then(function (data) {
				if (!Array.isArray(data.results) || data.results.length !== count) throw new Error("Incomplete action response");
				var expected = (body.ids || body.items).map(function (entry) { return typeof entry === "string" ? entry : fileKey(entry); }).sort();
				var actual = data.results.map(function (entry) { return meta.scope === "archived" ? entry.id : keyOf(entry); }).sort();
				if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error("Mismatched action response");
				finish(summarize(data.results), meta);
			}).catch(failRequest);
		}

		function actionResult(kind, summary) {
			var labels = {
				unarchive: "toastUnarchive", hide: "toastHide", purge: "toastPurge", cleanup: "toastCleanup",
				restore: "toastRestore", discard: "toastDiscard", empty: "toastDiscard", repair: "toastRepair"
			};
			return tr(labels[kind], { n: summary.ok, size: fmtSize(summary.bytes) }) + reminderText(summary.reminders);
		}

		function runPlan(plan) {
			var paths = {
				unarchive: "/unarchive", hide: "/hide", purge: "/purge", cleanup: "/forget",
				restore: "/restore", discard: "/discard", empty: "/empty-trash", repair: "/repair"
			};
			var kind = plan.kind;
			var targets = plan.targets;
			if (kind === "retention") {
				runRetention(plan.days, plan);
				return;
			}
			if (targets.length === 0) return;
			var isRemoved = kind === "restore" || kind === "discard" || kind === "empty" || kind === "repair" && Boolean(targets[0].batch);
			var body = isRemoved || kind === "repair"
				? { items: targets.map(targetOf) }
				: { ids: targets.map(function (entry) { return entry.id; }) };
			var confirmation = { purge: "PURGE", discard: "DISCARD", empty: "EMPTY" };
			if (confirmation[kind]) body.confirm = confirmation[kind];
			if (plan.previewToken) body.previewToken = plan.previewToken;
			runAction(paths[kind], body, {
				scope: isRemoved ? "removed" : "archived",
				allowAll: kind === "empty",
				preserveRows: kind === "repair",
				showRemoved: kind === "hide",
				blocked: plan.blocked,
				ok: function (summary) { return actionResult(kind, summary); }
			});
		}

		function runRetention(days, plan) {
			var targets = plan ? plan.targets : [];
			if (!beginAction(targets.length, true)) return;
			var body = { trashRetentionDays: days };
			if (plan) {
				body.items = targets.map(targetOf);
				body.previewToken = plan.previewToken;
			}
			request("/settings/save", body).then(function (data) {
				if (!data.settings) throw new Error("Incomplete retention response");
				setSettings({ trashRetentionDays: Number(data.settings.trashRetentionDays) || 0 });
				var result = summarize(data.swept && data.swept.results || []);
				if (data.swept && data.swept.warning) result.warnings.push({ title: tr("retentionTitle"), warning: data.swept.warning });
				finish(result, {
					scope: "removed",
					blocked: plan && plan.blocked,
					ok: function (summary) {
						var text = days === 0 ? tr("retentionOff") : tr("retentionSaved", { days: days });
						return text + (summary.ok ? " · " + tr("retentionSwept", { n: summary.ok, size: fmtSize(summary.bytes) }) : "");
					}
				});
			}).catch(failRequest);
		}

		function localPlan(kind, entries) {
			var targets = [], blocked = [];
			var action = kind === "cleanup" ? "forget" : kind;
			entries.forEach(function (item) {
				var access = capability(item, action);
				if (access === true) {
					targets.push(Object.assign(targetOf(item), { title: item.title }));
				} else {
					blocked.push(Object.assign(targetOf(item), { title: item.title, code: access && access.code, reason: access && access.reason }));
				}
			});
			return { kind: kind, targets: targets, blocked: blocked, checked: false };
		}

		function previewPlan(plan, input) {
			return request("/preview", input).then(function (data) {
				if (!Array.isArray(data.targets) || !Array.isArray(data.blocked) || typeof data.previewToken !== "string" || !data.previewToken) throw new Error("Incomplete preview response");
				return Object.assign({}, plan, {
					targets: data.targets,
					blocked: plan.blocked.concat(data.blocked),
					previewToken: data.previewToken,
					loading: false
				});
			});
		}

		function openConfirm(kind, entries, options) {
			if (locked || actionRef.current || (dialogOpen && !(options && options.force))) return;
			var plan = localPlan(kind, entries);
			var global = kind === "empty" || kind === "retention";
			if (!global && plan.targets.length > MAX_BATCH) {
				setToast({ kind: "bad", text: tr("batchLimit") });
				return;
			}
			var quick = options && options.quick && plan.targets.length === 1 && plan.blocked.length === 0;
			var serverPreview = global || (plan.targets.length > 0 && kind !== "unarchive" && kind !== "cleanup" && kind !== "repair");
			if (quick && !serverPreview) {
				runPlan(plan);
				return;
			}
			returnFocusRef.current = options && options.trigger || document.activeElement;
			setMenu(null);
			if (!serverPreview) {
				setConfirm(plan);
				return;
			}
			var input = { action: kind };
			if (kind === "retention") {
				plan.days = options.days;
				input.trashRetentionDays = options.days;
			} else if (kind === "restore" || kind === "discard") {
				input.items = plan.targets.map(targetOf);
			} else if (!global) {
				input.ids = plan.targets.map(function (entry) { return entry.id; });
			}

			if (quick) {
				if (!beginAction(1, false)) return;
				previewPlan(plan, input).then(function (checked) {
					actionRef.current = false;
					setBusy(false);
					if (checked.targets.length === 1 && checked.blocked.length === 0) runPlan(checked);
					else setConfirm(checked);
				}, function (error) {
					actionRef.current = false;
					setBusy(false);
					setConfirm(Object.assign({}, plan, { error: errorText(error.code, error.message) }));
				});
				return;
			}

			plan.loading = true;
			setConfirm(plan);
			previewPlan(plan, input).then(function (checked) {
				setConfirm(function (current) { return current === plan ? checked : current; });
			}, function (error) {
				setConfirm(function (current) {
					return current === plan ? Object.assign({}, plan, { error: errorText(error.code, error.message), loading: false }) : current;
				});
			});
		}

		function changeRetention(value) {
			if (locked || settings.unavailable || actionRef.current) return;
			var days = Number(value);
			if (days === settings.trashRetentionDays) return;
			if (days === 0) runRetention(0);
			else openConfirm("retention", [], { days: days });
		}

		function button(key, label, onClick, disabled, danger) {
			return h("button", { key: key, type: "button", className: "am-btn" + (danger ? " danger" : ""), disabled: Boolean(disabled), onClick: function (event) {
				if (!disabled) onClick(event);
			} }, label);
		}


		function fileKey(item) { return item.batch ? keyOf(item) : item.id; }
		function fileRequest(item) { return item.batch ? { id: item.id, batch: item.batch } : { id: item.id }; }
		function getFiles(item) {
			var key = fileKey(item);
			if (files[key] && files[key].loading) return;
			setFiles(function (current) { var next = Object.assign({}, current); next[key] = { loading: true }; return next; });
			request("/files", fileRequest(item)).then(function (data) {
				if (!Array.isArray(data.files)) throw new Error("Invalid file response");
				setFiles(function (current) { var next = Object.assign({}, current); next[key] = data; return next; });
			}).catch(function (error) {
				setFiles(function (current) { var next = Object.assign({}, current); next[key] = { error: String(error.message || error) }; return next; });
			});
		}
		function openFolder(item, file, workspace) {
			var body = Object.assign({}, fileRequest(item));
			if (workspace) body.workspace = true;
			else body.path = file.path;
			request("/open-folder", body).catch(function (error) { setToast({ kind: "bad", text: errorText(error.code, error.message) }); getFiles(item); });
		}
		function fileLocations(item) {
			var data = files[fileKey(item)];
			if (!data) return button("files", tr("loadFiles"), function () { getFiles(item); }, false);
			if (data.loading) return h("p", { key: "files", role: "status" }, tr("loading"));
			if (data.error) return h("div", { key: "files", role: "status" }, [tr("filesFailed", { message: data.error }), button("retry", tr("retry"), function () { getFiles(item); }, false)]);
			return h("div", { key: "files", className: "am-file-list" }, [
				h("strong", { key: "title" }, tr("files")),
				h("p", { key: "coverage", className: "am-help" }, tr("filesCoverage")),
				data.warning ? h("p", { key: "warning", className: "am-warning-text" }, data.warning) : null,
				data.files.length === 0 ? h("p", { key: "empty" }, tr("filesEmpty")) : data.files.map(function (file, index) {
					return h("div", { key: file.path + index, className: "am-file" }, [
						h("strong", { key: "name" }, file.name || file.path),
						h("div", { key: "path", className: "am-path" }, tr("path") + "：" + file.path),
						h("div", { key: "folder", className: "am-path" }, tr("folder") + "：" + file.directory),
						file.reason ? h("div", { key: "reason", className: "am-warning-text" }, file.reason) : file.status !== "exists" && file.status !== "available" ? h("div", { key: "status", className: "am-help" }, file.status === "file-missing" || file.status === "missing" ? tr("fileMissing") : file.canOpen ? "" : tr("unavailable")) : null,
						button("open", tr("openFolder"), function () { openFolder(item, file, false); }, !file.canOpen)
					]);
				}),
				h("div", { key: "workspace", className: "am-file" }, [
					h("strong", { key: "title" }, tr("workspacePath")),
					data.workspace ? h("div", { key: "path", className: "am-path" }, data.workspace.path) : h("span", { key: "none" }, tr("noWorkspace")),
					data.workspace && data.workspace.reason ? h("div", { key: "reason", className: "am-help" }, data.workspace.reason) : null,
					data.workspace ? button("open", tr("openWorkspace"), function () { openFolder(item, null, true); }, !data.workspace.canOpen) : null
				])
			]);
		}

		function sizeInfo(entries, isRemoved) {
			return entries.reduce(function (info, item) {
				var value = isRemoved ? item.bytes : item.sizeBytes;
				if (item.sizeKnown === false || typeof value !== "number" || !isFinite(value) || value < 0) info.unknown += 1;
				else info.bytes += value;
				return info;
			}, { bytes: 0, unknown: 0 });
		}
		function logSizeText(item, isRemoved) {
			if (!isRemoved && item.missing) return "—";
			var info = sizeInfo([item], isRemoved);
			return info.unknown ? tr("sizeUnknown") : fmtSize(info.bytes);
		}
		function summarySize(entries, isRemoved) {
			var info = sizeInfo(entries, isRemoved);
			return tr("logSize") + " " + (entries.length > 0 && info.unknown === entries.length ? tr("sizeUnknown") : fmtSize(info.bytes))
				+ (info.unknown ? " · " + tr("sizePartial", { n: info.unknown }) : "");
		}

		function details(item, removedItem) {
			var workspace = item.workspace && typeof item.workspace === "object" ? item.workspace.path : item.workspacePath;
			var actions = removedItem ? ["restore", "discard"] : item.missing ? ["forget"] : ["purge"];
			var blockers = actions.map(function (action) { return capability(item, action); }).filter(function (access) { return access !== true; })
				.map(function (access) { return errorText(access.code, access.reason); });
			var warnings = Array.from(new Set([item.protectionReason, item.sizeWarning].concat(blockers).filter(Boolean)));
			return h("div", { key: "details", className: "am-details" }, [
				h("div", { key: "id", className: "am-path" }, "ID：" + item.id),
				warnings.map(function (warning) { return h("div", { key: warning, className: "am-warning-text" }, warning); }),
				workspace ? h("div", { key: "workspace", className: "am-path" }, tr("workspacePath") + "：" + workspace) : null,
				h("div", { key: "times", className: "am-row-meta am-row-times" }, removedItem
					? timeItem("moved", tr("movedAt"), tr("tipMovedAtLabel"), fmtTime(item.movedAt))
					: [timeItem("last", tr("lastUsedLabel"), tr("tipLastUsedLabel"), fmtTime(item.lastUsedAt)), timeItem("archived", tr("archivedLabel"), tr("tipArchivedLabel"), typeof item.archivedAt === "number" ? fmtTime(item.archivedAt) : tr("unknownTime"))]),
				fileLocations(item)
			]);
		}
		function rowMain(item, removedItem) {
			var workspace = item.workspace && typeof item.workspace === "object" ? item.workspace.title : item.workspace;
			var access = capability(item, removedItem ? "discard" : "purge");
			var restoreAccess = removedItem ? capability(item, "restore") : true;
			var blocked = access !== true ? access : restoreAccess !== true ? restoreAccess : null;
			return h("div", { key: "main", className: "am-main" }, [
				h("div", { key: "titleline", className: "am-titleline" }, [
					h("button", { key: "title", type: "button", className: "am-row-title", title: item.title || item.id, "aria-haspopup": "dialog", onClick: function (event) { openInfo({ item: item, removed: removedItem }, event.currentTarget); } }, item.title || tr("noTitle")),
					item.running ? h("span", { key: "running", className: "am-badge danger" }, tr("running")) : item.missing ? h("span", { key: "missing", className: "am-badge warn" }, tr("missing")) : blocked ? h("span", { key: "protected", className: "am-badge warn", title: errorText(blocked.code, blocked.reason) }, tr(blocked.code === "occupied" ? "occupied" : blocked.code === "restart-required" ? "restartBadge" : "protectedReason")) : null
				]),
				h("div", { key: "meta", className: "am-row-meta", title: workspace || "" }, (workspace || "—") + " · " + (removedItem ? tr("movedAt") : tr("lastUsedLabel")) + " " + (typeof (removedItem ? item.movedAt : item.lastUsedAt) === "number" ? fmtAge(removedItem ? item.movedAt : item.lastUsedAt) : tr("unknownTime")))
			]);
		}

		function actionButton(item, key, kind, label, quick, danger) {
			var action = kind === "cleanup" ? "forget" : kind;
			return button(key, tr(label), function () { openConfirm(kind, [item], { quick: quick }); },
				locked || capability(item, action) !== true, danger);
		}

		function archivedRow(item) {
			var checked = selectedIds.has(item.id);
			var restart = capability(item, "purge");
			var restartButton = restart && GUIDE_CODES.indexOf(restart.code) !== -1
				? button("guide", tr("restartAction"), function () { openGuide([item]); }, locked)
				: null;
			// An unfinished quarantine entry blocks hide/purge but is repaired in
			// Recently Deleted; give the row a direct, non-destructive way there.
			var repairInRemoved = restart && restart.code === "repair-required"
				? button("goto-removed", tr("viewRemoved"), function () { setTab("removed"); }, locked)
				: null;
			var actions = item.running
				? [h("span", { key: "running-locked", className: "am-help" }, tr("runningLocked")), restartButton].filter(Boolean)
				: item.missing
				? [actionButton(item, "cleanup", "cleanup", "cleanup"), repairInRemoved].filter(Boolean)
				: [
					restartButton,
					repairInRemoved,
					actionButton(item, "unarchive", "unarchive", "unarchive", true),
					actionButton(item, "hide", "hide", "hide", true),
					actionButton(item, "purge", "purge", "purge", false, true)
				].filter(Boolean);
			if (capability(item, "repair") === true) actions = [actionButton(item, "repair", "repair", "repair", true)];
			return h("div", { key: item.id, className: "am-row" + (checked ? " selected" : ""), role: "listitem" }, [
				h("label", { key: "check", className: "am-check-target" }, h("input", { type: "checkbox", className: "am-check", checked: checked, disabled: locked || Boolean(item.running), onChange: function () { if (!item.running) toggle(item.id); }, "aria-label": item.title || item.id })),
				rowMain(item, false),
				h("div", { key: "size", className: "am-log-size" }, [h("span", { key: "label", className: "am-help" }, tr("logSize")), h("strong", { key: "value" }, logSizeText(item, false))]),
				h("div", { key: "actions", className: "am-row-actions" }, actions)
			]);
		}
		function removedRow(entry) {
			var key = keyOf(entry), checked = removedKeys.has(key);
			var restart = capability(entry, "discard");
			var restartButton = restart && GUIDE_CODES.indexOf(restart.code) !== -1
				? button("guide", tr("restartAction"), function () { openGuide([entry]); }, locked)
				: null;
			var actions = capability(entry, "repair") === true
				? [actionButton(entry, "repair", "repair", "repair", true)]
				: [restartButton, actionButton(entry, "restore", "restore", "restore", true), actionButton(entry, "discard", "discard", "purge", false, true)].filter(Boolean);
			return h("div", { key: key, className: "am-row" + (checked ? " selected" : ""), role: "listitem" }, [
				h("label", { key: "check", className: "am-check-target" }, h("input", { type: "checkbox", className: "am-check", checked: checked, disabled: locked, onChange: function () { toggleRemoved(key); }, "aria-label": entry.title || entry.id })),
				rowMain(entry, true),
				h("div", { key: "size", className: "am-log-size" }, [h("span", { key: "label", className: "am-help" }, tr("logSize")), h("strong", { key: "value" }, logSizeText(entry, true))]),
				h("div", { key: "actions", className: "am-row-actions" }, actions)
			]);
		}

		function validControlUrl(value) {
			if (typeof value !== "string") return false;
			try {
				var base = window.location && window.location.origin;
				var url = new URL(value, base || "http://localhost");
				return /^https?:$/.test(url.protocol) && /^\/archived-manager\/update-control\/[a-f0-9]{48}$/.test(url.pathname)
					&& !url.search && !url.hash && (url.origin === base || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname));
			} catch (error) { return false; }
		}

		function updateStatus() {
			if (statusRequest.current || updateRef.current) return;
			var reading = request("/update/status");
			statusRequest.current = reading;
			reading.then(function (data) {
				if (statusRequest.current !== reading) return;
				setUpdate(function (current) {
					if (current && Object.keys(data).every(function (key) {
						return key === "job" ? JSON.stringify(current.job) === JSON.stringify(data.job) : current[key] === data[key];
					})) return current;
					return Object.assign({}, current || {}, data);
				});
			}).catch(function () { /* an explicit check reports its own error */ }).finally(function () {
				if (statusRequest.current === reading) statusRequest.current = null;
			});
		}
		useEffect(function () {
			var timer;
			function check() {
				if (document.visibilityState !== "hidden") updateStatus();
			}
			function onVisibility() {
				clearInterval(timer);
				if (document.visibilityState !== "hidden") {
					check();
					timer = setInterval(check, 5000);
				}
			}
			window.addEventListener("focus", check);
			document.addEventListener("visibilitychange", onVisibility);
			onVisibility();
			return function () {
				statusRequest.current = null;
				window.removeEventListener("focus", check);
				document.removeEventListener("visibilitychange", onVisibility);
				clearInterval(timer);
			};
		}, []);
		function checkUpdate(trigger) {
			if (updateRef.current || update && update.busy) return;
			menuTriggerRef.current = trigger;
			setMenu("version");
			statusRequest.current = null;
			updateRef.current = true;
			setUpdatePhase("checking"); setUpdateError("");
			request("/update/check", {}).then(function (data) { setUpdate(data); }).catch(function (error) { setUpdateError(tr("updateFailed", { message: error.message || error })); }).finally(function () { updateRef.current = false; setUpdatePhase(""); });
		}
		function prepareUpdate() {
			if (locked || actionRef.current || updateRef.current || !update || !update.release || !update.canUpdate) return;
			statusRequest.current = null;
			updateRef.current = true; setUpdatePhase("preparing"); setUpdateError("");
			request("/update/prepare", { releaseId: update.release.id, version: update.release.version, switchFromLink: update.sourceKind === "link" }).then(function (data) {
				if (!validControlUrl(data.controlUrl)) throw new Error("Invalid update control URL");
				setUpdate(function (current) { return Object.assign({}, current, { job: data.job, controlUrl: data.controlUrl }); });
				window.open(data.controlUrl, "_blank", "noopener,noreferrer");
			}).catch(function (error) { setUpdateError(error.message || String(error)); }).finally(function () { updateRef.current = false; setUpdatePhase(""); void updateStatus(); });
		}
		function togglePopover(id, trigger) {
			menuTriggerRef.current = trigger;
			setMenu(menu === id ? null : id);
		}

		function popover(id, label, content, className) {
			return menu === id ? h("div", {
				key: "popover", id: "am-popover-" + id, ref: menuRef, role: "region", "aria-label": label,
				className: "am-select-menu am-popover" + (className ? " " + className : "")
			}, content) : null;
		}

		function versionPanel() {
			var mismatch = update && ((update.runtimeVersion && update.runtimeVersion !== CLIENT_VERSION) || (update.installedVersion && update.installedVersion !== CLIENT_VERSION));
			var source = update && update.sourceKind;
			var sourceText = source === "link" ? tr("localSource") : source === "release" ? tr("releaseSource") : source === "missing" ? tr("missingSource") : tr("unknownSource");
			var release = update && update.release;
			var control = update && (update.controlUrl || update.job && update.job.controlUrl);
			var currentVersion = "v" + CLIENT_VERSION;
			var version = mismatch ? tr("pendingUpdate") : currentVersion;
			var detailsLabel = tr("versionDetails");
			return h("div", { key: "version", className: "am-version" }, [
				h("div", { key: "line", className: "am-version-line" }, [
					h("span", { key: "version", className: "am-version-label", title: mismatch ? currentVersion + " · " + version : currentVersion }, version),
					h("button", {
						key: "details-toggle", type: "button", className: "am-btn am-version-toggle", "aria-expanded": menu === "version", "aria-controls": "am-popover-version",
						onClick: function (event) { togglePopover("version", event.currentTarget); }
					}, detailsLabel),
					h("button", {
						key: "check", type: "button", className: "am-btn am-check-update", "aria-controls": "am-popover-version",
						"aria-expanded": menu === "version", "aria-disabled": Boolean(updatePhase || update && update.busy),
						onClick: function (event) { checkUpdate(event.currentTarget); }
					}, tr("checkUpdate"))
				]),
				popover("version", detailsLabel, [
					h("strong", { key: "title" }, detailsLabel),
					h("div", { key: "page" }, tr("pageVersion") + "：" + currentVersion),
					h("div", { key: "runtime" }, tr("serviceVersion") + "：" + (update && update.runtimeVersion || tr("notProvided"))),
					h("div", { key: "installed" }, tr("installedVersion") + "：" + (update && update.installedVersion || tr("notProvided"))),
					h("div", { key: "source" }, tr("source") + "：" + sourceText),
					h("div", { key: "check-status", role: "status", className: updateError ? "am-warning-text" : "am-help" },
						updatePhase === "checking" ? tr("checkingUpdate") : updateError || (update && update.busy ? tr("updateBusy") : "")),
					release && updatePhase !== "checking" && !updateError ? h("div", { key: "release", className: "am-update-result" }, [
						h("div", { key: "relation", role: "status" }, update.relation === "same" ? tr("latestRelease", { version: release.version }) : update.relation === "older" ? tr("aheadRelease", { version: release.version }) : tr("checkedRelease", { version: release.version })),
						release.htmlUrl && /^https:\/\/github\.com\/chen1pengvincent\/dsh-archived-manager\/releases\//.test(release.htmlUrl) ? h("a", { key: "notes", href: release.htmlUrl, target: "_blank", rel: "noopener noreferrer" }, tr("releaseNotes")) : null,
						update.checkedAt ? h("div", { key: "checked", className: "am-help" }, tr("checkedAt") + " " + fmtTime(typeof update.checkedAt === "number" ? update.checkedAt : Date.parse(update.checkedAt))) : null,
						(source === "link" || update.relation === "newer") && update.relation !== "older" ? button("install", updatePhase === "preparing" ? tr("updatePreparing") : source === "link" ? tr("switchRelease") : tr("updateTo", { version: release.version }), prepareUpdate, locked || !update.canUpdate || updatePhase !== "") : null,
						!update.canUpdate && update.capabilityReason ? h("div", { key: "reason", className: "am-help" }, update.capabilityReason) : null
					]) : null,
					validControlUrl(control) ? h("div", { key: "control", className: "am-update-result" }, [
						h("a", { key: "link", href: control, target: "_blank", rel: "noopener noreferrer" }, tr("updateContinue")),
						h("div", { key: "hint", className: "am-help" }, tr("updateHandoff"))
					]) : null,
					update && update.job && update.job.error ? h("div", { key: "jobError", className: "am-warning-text", role: "status" }, update.job.error) : null
				], "am-version-details")
			]);
		}

		function refreshButton() {
			return h("button", {
				key: "refresh",
				ref: refreshRef,
				type: "button",
				className: "am-btn am-refresh",
				disabled: busy || Boolean(update && update.busy) || phase === "loading",
				title: tr("refresh"),
				"aria-label": tr("refresh"),
				onClick: function () { void load({ keepSelection: true }); }
			}, [
				h("svg", {
					key: "icon",
					className: phase === "loading" ? "am-refresh-icon spinning" : "am-refresh-icon",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.8,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true"
				}, [
					h("path", { key: "a", d: "M20 11a8.1 8.1 0 0 0-15.5 2m-.5-4v4h4" }),
					h("path", { key: "b", d: "M4 13a8.1 8.1 0 0 0 15.5-2m.5 4v-4h-4" })
				]),
				h("span", { key: "text" }, tr("refresh"))
			]);
		}

		function emptyCard(key, title, hint, action) {
			return h("div", { key: key, className: "am-empty-card" }, [
				h("div", { key: "title", className: "am-empty-title" }, title),
				h("div", { key: "hint", className: "am-empty-hint" }, hint),
				action ? h("div", { key: "actions", className: "am-empty-actions" }, action) : null
			]);
		}

		function confirmPanel() {
			if (confirm === null) return null;
			var kind = confirm.kind;
			var targets = confirm.targets;
			var blocked = confirm.blocked;
			var count = targets.length;
			var isRetention = kind === "retention";
			var deletesLogs = kind === "purge" || kind === "discard" || kind === "empty";
			var danger = deletesLogs || isRetention;
			var titles = {
				unarchive: "unarchiveTitle", hide: "hideConfirmTitle", purge: "purgeConfirmTitle", empty: "emptyConfirmTitle",
				cleanup: "cleanupTitle", discard: "discardTitle", restore: "restoreTitle", retention: "retentionConfirmTitle", repair: "repair"
			};
			var labels = {
				unarchive: "unarchive", hide: "hide", purge: "confirmCount", empty: "confirmCount",
				cleanup: "confirmCleanup", discard: "confirmCount", restore: "restore", retention: "confirmRetention", repair: "repair"
			};
			var bodies = {
				unarchive: "unarchiveBody", hide: "hideConfirmBody", purge: "purgeConfirmBody", empty: "purgeConfirmBody",
				cleanup: "cleanupBody", discard: "discardBody", restore: "restoreBody", retention: "retentionConfirmBody"
			};
			var title = tr(titles[kind], { n: count });
			var label = tr(labels[kind], { n: count });
			var ready = !confirm.loading && !confirm.error;
			var scopeAllowsSubmit = ready && (count > 0 || isRetention);
			var restartBlocked = blocked.filter(function (entry) { return entry.code === "restart-required" || entry.code === "occupied" || entry.code === "running" || entry.code === "occupancy-unavailable" || entry.code === "running"; });
			var size = sizeInfo(targets, true);
			var planContent = ready ? [
				kind === "empty" ? h("div", { key: "all", className: "am-help" }, tr("previewAll")) : null,
				isRetention ? h("div", { key: "retention", className: "am-modal-summary" }, tr("retentionPreview", { n: count, days: confirm.days })) : null,
				deletesLogs && count > 0 ? h("div", { key: "size", className: "am-modal-summary" },
					size.unknown ? summarySize(targets, true) : tr("releaseLine", { size: fmtSize(size.bytes) })) : null,
				targets.length > 0 ? h("div", { key: "targets", className: "am-preview-set" }, [
					isRetention ? null : h("strong", { key: "count" }, tr("previewReady", { n: count })),
					h("ul", { key: "list" }, targets.map(function (entry) {
						return h("li", { key: fileKey(entry) }, failureTitle(entry));
					}))
				]) : !isRetention ? h("div", { key: "none", className: "am-modal-summary" }, tr("previewNone")) : null,
				blocked.length > 0 ? h("div", { key: "blocked", className: "am-preview-set am-warning-text" }, [
					h("strong", { key: "count" }, tr("previewBlocked", { n: blocked.length })),
					h("ul", { key: "list" }, blocked.map(function (entry, index) {
						return h("li", { key: index }, (failureTitle(entry)) + " · " + failureReason(entry));
					}))
				]) : null,
				restartBlocked.length > 0 ? h("div", { key: "restart-guide", className: "am-guide-link" },
					button("open-guide", tr("guideOpen"), function () {
						var entries = restartBlocked.slice();
						setConfirm(null);
						openGuide(entries);
					}, busy)) : null,
				danger && count > 0 ? h("div", { key: "file-note", className: "am-help" }, tr("previewFileNote")) : null
			] : h("div", { className: "am-modal-summary", role: "status" },
				confirm.loading ? tr("previewLoading") : tr("previewFailed", { message: confirm.error }));
			return h("div", {
				className: "am-modal-backdrop",
				onMouseDown: function (event) {
					if (event.target === event.currentTarget && busy !== true) setConfirm(null);
				}
			}, h("div", {
				className: "am-modal" + (danger ? " danger" : ""),
				ref: confirmRef,
				tabIndex: -1,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": title,
				onMouseDown: function (event) { event.stopPropagation(); }
			}, [
				h("div", { key: "title", className: "am-modal-title" }, title),
				bodies[kind] ? h("div", { key: "body", className: "am-modal-body" }, tr(bodies[kind], { days: confirm.days })) : null,
				h("div", { key: "plan", className: "am-preview", role: "region", "aria-label": tr("previewScope"), "aria-live": "polite", tabIndex: ready && (count + blocked.length > 4) ? 0 : undefined }, planContent),
				danger && scopeAllowsSubmit ? h("label", { key: "check", className: "am-checkline" }, [
					h("input", {
						key: "box", type: "checkbox", className: "am-check", checked: confirm.checked, disabled: busy,
						onChange: function (event) {
							setConfirm(Object.assign({}, confirm, { checked: event.target.checked }));
						}
					}),
					h("span", { key: "text" }, tr(isRetention ? "retentionCheck" : "purgeCheck"))
				]) : null,
				h("div", { key: "actions", className: "am-modal-actions" }, [
					h("button", { key: "cancel", ref: cancelRef, type: "button", className: "am-btn", disabled: busy, onClick: function () { setConfirm(null); } }, tr("cancel")),
					ready && !scopeAllowsSubmit ? null : h("button", {
						key: "go", type: "button", className: "am-btn " + (danger ? "hazard" : "primary"),
						disabled: locked || !scopeAllowsSubmit || danger && !confirm.checked,
						onClick: function () { if (scopeAllowsSubmit && (!danger || confirm.checked)) runPlan(confirm); }
					}, label)
				])
			]));
		}

		function searchGlyph() {
			return h("span", { key: "icon", className: "am-search-icon", "aria-hidden": "true" },
				h("svg", {
					width: 14,
					height: 14,
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.8,
					"stroke-linecap": "round"
				}, [
					h("circle", { key: "circle", cx: 11, cy: 11, r: 6 }),
					h("path", { key: "line", d: "m16 16 4 4" })
				])
			);
		}

		function dropdown(id, value, options, onChange, ariaLabel, presentation) {
			var style = presentation || {};
			var disabled = locked || style.disabled;
			var current = options.filter(function (option) { return String(option.value) === String(value); })[0];
			var open = menu === id;

			function closeAndFocus() {
				setMenu(null);
				if (menuTriggerRef.current && typeof menuTriggerRef.current.focus === "function") {
					menuTriggerRef.current.focus();
				}
			}

			function choose(next) {
				if (disabled || actionRef.current) return;
				closeAndFocus();
				onChange(next);
			}

			function toggle(event) {
				if (disabled || actionRef.current) return;
				if (open) {
					setMenu(null);
					if (typeof event.currentTarget.focus === "function") event.currentTarget.focus();
					return;
				}
				menuTriggerRef.current = event.currentTarget;
				setMenu(id);
			}

			function onTriggerKey(event) {
				if (disabled || actionRef.current) return;
				if (event.key === "ArrowDown") {
					event.preventDefault();
					menuTriggerRef.current = event.currentTarget;
					setMenu(id);
				} else if (event.key === "Escape" && open) {
					event.preventDefault();
					event.stopPropagation();
					setMenu(null);
					event.currentTarget.focus();
				}
			}

			function onMenuKey(event) {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					closeAndFocus();
					return;
				}
				if (!menuRef.current) return;
				var nodes = Array.prototype.slice.call(menuRef.current.querySelectorAll('[role="option"]'));
				if (nodes.length === 0) return;
				var index = nodes.indexOf(document.activeElement);
				var next;
				if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % nodes.length;
				else if (event.key === "ArrowUp") next = index <= 0 ? nodes.length - 1 : index - 1;
				else if (event.key === "Home") next = 0;
				else if (event.key === "End") next = nodes.length - 1;
				else return;
				event.preventDefault();
				nodes[next].focus();
			}

			function onBlur(event) {
				if (!open) return;
				var next = event.relatedTarget;
				if (!next || event.currentTarget.contains(next)) return;
				setMenu(null);
			}

			var chevron = h("span", { key: "chevron", className: "am-select-chevron", "aria-hidden": "true" },
				h("svg", { width: 10, height: 10, viewBox: "0 0 24 24", fill: "none" },
					h("path", { d: "M6 9l6 6 6-6", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })));

			return h("div", {
				key: id,
				className: "am-select" + (style.alignRight ? " am-select-right" : ""),
				onBlur: onBlur
			}, [
				h("button", {
					key: "trigger",
					type: "button",
					className: "am-select-trigger" + (open ? " open" : ""),
					"aria-haspopup": "listbox",
					"aria-expanded": open,
					"aria-disabled": locked,
					"aria-label": ariaLabel,
					disabled: locked,
					onClick: toggle,
					onKeyDown: onTriggerKey
				}, [
					h("span", { key: "value", className: "am-select-value" }, style.label || (current ? current.label : "")),
					chevron
				]),
				open ? h("div", {
					key: "menu",
					className: "am-select-menu",
					ref: menuRef,
					onKeyDown: onMenuKey
				}, [
					h("div", { key: "options", role: "listbox", "aria-label": ariaLabel }, options.map(function (option) {
						var selected = String(option.value) === String(value);
						return h("button", {
							key: String(option.value),
							type: "button",
							role: "option",
							"aria-selected": selected,
							className: "am-select-option" + (selected ? " selected" : ""),
							onClick: function () { choose(option.value); }
						}, [
							h("span", { key: "label", className: "am-select-option-label" }, option.label),
							selected ? h("span", { key: "check", className: "am-select-check", "aria-hidden": "true" }, "✓") : null
						]);
					})),
					style.hint ? h("p", { key: "hint", className: "am-popover-hint" }, style.hint) : null
				]) : null
			]);
		}

		function selectionBar(isRemoved) {
			var entries = isRemoved ? selectedRemovedEntries : selectedItems;
			var count = entries.length;
			var total = isRemoved ? sortedRemoved.length : selectable.length;
			var actions = [];
			var primaryKind = isRemoved ? "discard" : "purge";
			var primaryCount = localPlan(primaryKind, entries).targets.length;
			var exceeded = primaryCount > MAX_BATCH;
			var filesCount = entries.filter(function (entry) { return !entry.missing; }).length;
			function add(kind, label) {
				var eligible = localPlan(kind, entries).targets.length;
				if (!eligible) return;
				if (eligible > MAX_BATCH) exceeded = true;
				actions.push(button(kind, tr(label) + " (" + eligible + ")", function () {
					openConfirm(kind, entries, { trigger: menuTriggerRef.current });
				}, locked || eligible > MAX_BATCH));
			}
			if (count > 0) {
				if (isRemoved) add("restore", "restore");
				else {
					add("unarchive", "unarchive");
					add("hide", "hide");
					add("cleanup", "cleanup");
				}
				actions.push(button("clear", tr("clearSelection"), function () {
					if (actionRef.current) return;
					setMenu(null);
					if (isRemoved) setRemovedSelected([]);
					else setSelected([]);
					var checkbox = isRemoved ? removedAllRef.current : archivedAllRef.current;
					if (checkbox) checkbox.focus();
				}, locked));
			}
			if (exceeded) {
				actions.push(h("p", { key: "limit", className: "am-popover-hint" }, tr("batchLimit")));
			}
			var batchLabel = tr("batchActions");
			var summary = isRemoved ? tr("removedSelected", { n: count }) : tr("selectedSplit", { n: count, files: filesCount, missing: count - filesCount });
			return h("div", { key: "toolbar", className: "am-toolbar" }, [
				h("label", { key: "all", className: "am-checkline" }, [
					h("input", { key: "box", type: "checkbox", className: "am-check", ref: isRemoved ? syncRemovedRef : syncAllRef, checked: isRemoved ? allRemovedSelected : allSelected, "aria-checked": count > 0 && !(isRemoved ? allRemovedSelected : allSelected) ? "mixed" : isRemoved ? allRemovedSelected : allSelected, disabled: locked || total === 0, onChange: isRemoved ? toggleAllRemoved : toggleAll }),
					h("span", { key: "text" }, tr("selectAll"))
				]),
				h("span", { key: "count", className: count > 0 ? "am-selected-count" : "am-stats", role: "status", title: summary + " · " + summarySize(entries, isRemoved) }, tr("selected", { n: count })),
				h("div", { key: "batch", className: "am-popover-anchor am-batch" }, [
					h("button", {
						key: "trigger", type: "button", className: "am-btn", "aria-expanded": menu === "batch", "aria-controls": "am-popover-batch", disabled: locked || !count,
						onClick: function (event) { togglePopover("batch", event.currentTarget); }
					}, [h("span", { key: "label" }, batchLabel), h("span", { key: "arrow", "aria-hidden": "true" }, "▾")]),
					popover("batch", batchLabel, [
						h("p", { key: "selection", className: "am-popover-hint" }, summary + " · " + summarySize(entries, isRemoved)),
						actions
					], "am-batch-menu")
				]),
				h("button", {
					key: "purge", type: "button", className: "am-btn danger am-batch-purge",
					title: primaryCount > MAX_BATCH ? tr("batchLimit") : tr("purge"),
					disabled: locked || !primaryCount || primaryCount > MAX_BATCH,
					onClick: function () { openConfirm(primaryKind, entries); }
				}, h("span", null, tr("purge") + (primaryCount > 0 ? " (" + primaryCount + ")" : "")))
			]);
		}

		function openInfo(value, trigger) {
			if (dialogOpen) return;
			returnFocusRef.current = trigger;
			setMenu(null);
			setInfo(value);
		}

		function infoPanel() {
			if (info === null) return null;
			var item = info.item;
			var title = item ? item.title || tr("noTitle") : tr("operationIdle");
			var reasons = report ? report.failures : [];
			var loadError = phase === "failed" || phase === "stale";
			var warnings = info.showWarnings ? removedWarnings : [];
			var guideTargets = item && ["restart-required", "running", "occupied", "occupancy-unavailable"].includes(capability(item, info.removed ? "discard" : "purge").code) ? [item]
				: !item ? reasons.filter(function (entry) {
					return entry.id && (entry.code === "restart-required" || entry.code === "occupied" || entry.code === "running" || entry.code === "occupancy-unavailable");
				}).map(function (entry) {
					return { id: entry.id, batch: entry.batch, title: entry.title };
				}) : [];
			var content = item ? details(item, info.removed) : h("div", { className: "am-report" }, [
				loadError ? h("p", { key: "error", className: "am-warning-text", role: "alert" }, tr("staleList") + " " + tr("failed", { message: error || "" })) : null,
				report ? h("strong", { key: "report" }, report.title) : null,
				toast && (!report || toast.text !== report.title) ? h("p", { key: "toast" }, toast.text) : null,
				reasons.length ? h("ul", { key: "reasons", className: "am-report-list" }, reasons.map(function (entry, index) {
					return h("li", { key: index, className: "am-report-item" }, entry.title + " · " + entry.reason);
				})) : null,
				warnings.length ? h("div", { key: "warnings" }, [
					h("strong", { key: "title" }, tr("removedWarningsTitle", { n: warnings.length })),
					h("p", { key: "hint" }, tr("removedWarningsHint")),
					h("ul", { key: "reasons", className: "am-report-list" }, warnings.map(function (entry, index) {
						return h("li", { key: index, className: "am-report-item" }, entry.batch + " · " + entry.reason);
					}))
				]) : null
			]);
			return h("div", {
				key: "info", className: "am-modal-backdrop",
				onMouseDown: function (event) { if (event.currentTarget === event.target) setInfo(null); }
			}, h("div", {
				className: "am-modal am-info-modal", ref: confirmRef, tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-label": title
			}, [
				h("div", { key: "title", className: "am-modal-title am-path" }, title),
				h("div", { key: "body", className: "am-info-scroll", tabIndex: 0 }, content),
				h("div", { key: "actions", className: "am-modal-actions" }, [
					guideTargets.length ? button("guide", tr("guideOpen"), function () {
						var entries = guideTargets.slice();
						setInfo(null);
						openGuide(entries);
					}, busy) : null,
					!item && toast && toast.showRemoved && tab !== "removed" ? button("viewRemoved", tr("viewRemoved"), function () {
						setInfo(null);
						setTab("removed");
					}, locked) : null,
					!item && loadError ? button("retry", tr("retry"), function () {
						setInfo(null);
						void load({ keepSelection: true });
					}, busy || Boolean(update && update.busy)) : null,
					h("button", { key: "close", type: "button", ref: cancelRef, className: "am-btn", onClick: function () { setInfo(null); } }, tr("close"))
				])
			]));
		}

		function controls(isRemoved) {
			var value = isRemoved ? removedQuery : query;
			var filterOptions = [
				{ value: "all", label: tr("filterAll") + " (" + items.length + ")" },
				{ value: "files", label: tr("filterFiles") + " (" + filesCount + ")" },
				{ value: "missing", label: tr("filterMissing") + " (" + missingCount + ")" }
			];
			var days = settings.trashRetentionDays || 0;
			var autoLabel = tr("retentionControl");
			var filterLabel = tr("filterLabel");
			var sortOptions = [{ value: isRemoved ? "movedAt" : "lastUsed", label: tr(isRemoved ? "sortMoved" : "sortLastUsed") }];
			if (!isRemoved) sortOptions.push({ value: "archived", label: tr("sortArchived") });
			sortOptions.push({ value: "size", label: tr("sortSize") }, { value: "title", label: tr("sortTitle") });
			return h("div", { key: "controls", className: "am-controls" }, [
				h("div", { key: "search", className: "am-search" }, [
					searchGlyph(),
					h("input", { key: "input", type: "search", value: value, disabled: locked, placeholder: tr("searchPlaceholder"), "aria-label": tr(isRemoved ? "removedSearchPlaceholder" : "searchAria"), onChange: function (event) { if (locked || actionRef.current) return; if (isRemoved) setRemovedQuery(event.target.value); else setQuery(event.target.value); } }),
					h("button", { key: "clear", type: "button", className: "am-search-clear" + (value ? "" : " am-invisible"), disabled: locked || !value, "aria-label": tr("clearSearch"), onClick: function () { if (locked || actionRef.current) return; if (isRemoved) setRemovedQuery(""); else setQuery(""); } }, "×")
				]),
				h("div", { key: "context", className: "am-context-control" }, isRemoved
					? dropdown("retention", String(days), [0, 7, 30, 90].map(function (number) {
						return { value: String(number), label: number === 0 ? tr("retentionNever") : tr("retentionAfter", { n: number }) };
					}), changeRetention, autoLabel, {
						alignRight: false, disabled: settings.unavailable,
						label: autoLabel + " · " + (settings.unavailable ? tr("notProvided") : days ? tr("retentionShort", { n: days }) : tr("retentionDisabled")),
						hint: tr("retentionExplanation")
					})
					: dropdown("filter", filter, filterOptions, setFilter, filterLabel, {
						label: filterLabel + " · " + tr(filter === "all" ? "filterAll" : filter === "files" ? "filterFiles" : "filterMissing")
					})),
				h("div", { key: "sort", className: "am-sort" }, dropdown(isRemoved ? "removedSort" : "sort", isRemoved ? removedSort : sort, sortOptions, function (next) {
					if (isRemoved) setRemovedSort(next);
					else setSort(next);
				}, tr("sortLabel"), { alignRight: true }))
			]);
		}

		function summaryBar(isRemoved, all, visible) {
			var hasSnapshot = hasSnapshotRef.current || phase === "ready" || phase === "stale" || items.length > 0 || removed.length > 0;
			var total = hasSnapshot ? tr("showing", { shown: visible.length, total: all.length }) + " · " + summarySize(visible, isRemoved) : tr("logSize") + " —";
			var failed = phase === "failed" || phase === "stale";
			var hasWarnings = isRemoved && removedWarnings.length > 0;
			var canView = Boolean(failed || report || toast || hasWarnings);
			var status = failed ? tr("refreshFailed")
				: busy ? operationCount ? tr("processing", { n: operationCount }) : tr("busy")
				: phase === "loading" ? tr("loading")
				: hasWarnings ? tr("removedWarningsTitle", { n: removedWarnings.length })
				: selectionNotice || (toast ? toast.text : report ? report.title : "");
			var scopeLabel = tr("scopeLabel");
			return h("div", { key: "summary", className: "am-summary" }, [
				h("span", { key: "total", className: "am-summary-total", title: total }, total),
				h("div", { key: "scope", className: "am-popover-anchor am-scope-anchor" }, [
					h("button", { key: "trigger", type: "button", className: "am-btn am-quiet", disabled: !hasSnapshot, "aria-expanded": menu === "scope", "aria-controls": "am-popover-scope",
						onClick: function (event) { togglePopover("scope", event.currentTarget); }
					}, scopeLabel),
					popover("scope", tr("scopeTitle"), [
						h("strong", { key: "title" }, tr("scopeTitle")),
						h("p", { key: "note", className: "am-scope" }, tr("scopeNote", { size: fmtSize(attachments.bytes), files: attachments.files })),
						h("p", { key: "totals", className: "am-help" }, total)
					])
				]),
				h("span", { key: "status", className: "am-summary-status" + (failed || hasWarnings || toast && toast.kind === "bad" ? " am-warning-text" : ""), role: failed ? "alert" : "status", title: status }, status),
				h("button", { key: "result", type: "button", className: "am-btn am-quiet am-result", "aria-haspopup": "dialog", disabled: !canView,
					onClick: function (event) { openInfo({ showWarnings: hasWarnings }, event.currentTarget); }
				}, tr(canView ? "operationDetails" : "operationIdle")),
				h("button", { key: "empty", type: "button", className: "am-btn danger am-empty-all" + (isRemoved ? "" : " am-invisible"),
					disabled: !isRemoved || removed.length === 0 || locked,
					title: tr("emptyTrash") + " (" + removed.length + ")",
					onClick: function () { openConfirm("empty", []); }
				}, h("span", null, tr("emptyTrash") + (removed.length > 0 ? " (" + removed.length + ")" : "")))
			]);
		}

		var isRemoved = tab === "removed";
		var all = isRemoved ? removed : items;
		var visible = isRemoved ? sortedRemoved : sortedItems;
		var tabNames = [
			{ id: "archived", label: tr("tabArchived") + " (" + items.length + ")" },
			{ id: "removed", label: removedWarnings.length ? tr("knownTabCount", { label: tr("tabRemoved"), n: removed.length }) : tr("tabRemoved") + " (" + removed.length + ")" }
		];
		return h("div", { className: "am-page", "aria-busy": busy || Boolean(update && update.busy) }, [
			h("div", { key: "head", className: "am-head" }, [
				h("div", { key: "text", className: "am-head-text" }, [h("div", { key: "title", className: "am-title" }, tr("title")), h("div", { key: "sub", className: "am-sub" }, tr("subtitle"))]),
				versionPanel(),
				pending.length || pendingWarning ? pendingBanner() : null
			]),
			h("section", { key: "workbench", className: "am-workbench", role: "region", "aria-label": tr("title") }, [
				h("div", { key: "viewbar", className: "am-viewbar" }, [
					h("div", { key: "tabs", className: "am-tabs", role: "tablist", "aria-label": tr("title") }, tabNames.map(function (entry) {
						return h("button", {
							key: entry.id, type: "button", role: "tab", "aria-selected": tab === entry.id, title: entry.label,
							className: "am-tab" + (tab === entry.id ? " active" : ""), disabled: busy || updatePhase === "preparing",
							onClick: function () { if (actionRef.current) return; setTab(entry.id); setMenu(null); }
						}, entry.label);
					})), refreshButton()
				]),
				controls(isRemoved),
				summaryBar(isRemoved, all, visible),
				selectionBar(isRemoved),
				h("div", { key: "list-area", className: "am-list-area", "aria-busy": phase === "loading" }, visible.length > 0
					? h("div", { className: "am-list", role: "list" }, visible.map(isRemoved ? removedRow : archivedRow))
					: phase === "loading" ? emptyCard("loading", tr("loading"), "")
					: phase === "failed" ? emptyCard("failed", tr("refreshFailed"), "")
					: all.length === 0 ? emptyCard("empty", tr(isRemoved ? removedWarnings.length > 0 ? "removedUnlistedTitle" : "emptyRemovedTitle" : "emptyTitle"), tr(isRemoved ? removedWarnings.length > 0 ? "removedUnlistedHint" : "emptyRemovedHint" : "emptyHint"))
					: emptyCard("filtered", tr(isRemoved ? "removedEmptyFilter" : "filteredEmpty"), tr("filteredEmptyHint"), button("clear", tr("clearFilters"), isRemoved ? clearRemovedFilters : clearFilters, locked))
				)
			]),
			confirmPanel(),
			infoPanel(),
			guidePanel()
		]);
	}

	/**
	 * Register the plugin-owned dictionaries with DSH's locale service. The
	 * active UI language then follows Settings → General, not the Electron
	 * renderer's navigator language.
	 */
	function setupLocale(ctx, locale) {
		if (localeReady || !locale || typeof locale.register !== "function") return false;
		try {
			var register = function () {
				return locale.register(LOCALE_NS, { zh: STR_ZH, en: STR_EN });
			};
			if (typeof ctx.effect === "function") ctx.effect(register, "archived-manager: dictionaries");
			else register();
			localeReady = true;
			if (typeof locale.bind === "function") translate = locale.bind(LOCALE_NS);
			return true;
		} catch (error) {
			/* A hot reload can race the old dictionary's teardown; bind the
			 * existing namespace when possible and keep the fallback otherwise. */
			try {
				if (typeof locale.bind === "function") translate = locale.bind(LOCALE_NS);
			} catch (bindError) {
				translate = null;
			}
			return false;
		}
	}

	/**
	 * Register the settings page. slots is resolved through an optional
	 * injection so a shell without the settings domain leaves the host routes
	 * alone instead of failing the whole plugin.
	 */
	function install(ctx) {
		injectStyles();
		try {
			var locale = ctx.locale;
			if (!locale && typeof ctx.get === "function") {
				try { locale = ctx.get("locale"); } catch (error) { locale = undefined; }
			}
			setupLocale(ctx, locale);
		} catch (error) {
			/* keep the navigator fallback on older shells */
		}
		try {
			ctx.inject(["slots"], function (scope) {
				if (scope === null || scope === undefined || scope.slots === undefined) return;
				try {
					scope.slots.inject("settings.section", function () {
						return scope.slots.register({
							name: "settings.section",
							id: "archived-manager",
							order: 55,
							locale: LOCALE_NS,
							label: function () { return tr("section"); }
						}, Page);
					});
				} catch (error) {
					/* no settings domain: host routes remain reachable */
				}
			});
		} catch (error) {
			/* older shell */
		}
	}

	exports.name = "archived-manager";
	exports.inject = ["slots", "locale"];
	exports.apply = install;
	return module.exports;
}});
