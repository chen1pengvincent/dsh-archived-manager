window.__ModuleLoader__.load({ id: "dsh-archived-manager", factory: (require) => {

	var module = { exports: {} };
	var exports = module.exports;
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

	var React = require("react");
	var h = React.createElement;
	var useState = React.useState;
	var useEffect = React.useEffect;

	var API = "/archived-manager";
	var CLIENT_VERSION = "0.3.4";
	var MAX_BATCH = 200;
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
		missing: "文件缺失",
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
		selectedSplit: "已选 {n} 条（有文件 {files} · 失效 {missing}）",
		selectHint: "勾选会话后可批量操作",
		searchPlaceholder: "搜索标题、工作区或 ID",
		searchAria: "搜索归档会话",
		clearSearch: "清除搜索",
		filterAll: "全部",
		filterFiles: "有文件",
		filterMissing: "文件缺失",
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
		reportDismiss: "知道了",
		retentionTitle: "最近删除自动清理",
		retentionLabel: "保留期限",
		retentionNever: "关闭",
		retentionDays: "{n} 天",
		retentionHint: "开启后，移到最近删除满保留期限的会话日志会自动永久删除。",
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
		showAllReasons: "查看全部 {n} 条原因",
		showLess: "收起原因",
		runningLocked: "运行中，暂不可操作",
		logSize: "日志占用",
		resultSummary: "完成：成功 {ok} 条，失败 {fail} 条，跳过 {skip} 条",
		settings: "设置",
		retentionSummary: "自动清理：{value}",
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
		updateUnknown: "更新状态未确认，请重新核对",
		updateContinue: "查看更新进度或恢复安装",
		updatePreparing: "正在准备独立更新页面…",
		updateHandoff: "在独立更新页确认目标版本并查看安装结果。",
		versionChecking: "页面 v{version} · 版本信息待核对",
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
		protectedItem: "已保护",
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
		missing: "Files missing",
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
		selectedSplit: "{n} selected ({files} with files · {missing} missing)",
		selectHint: "Select sessions to act in bulk",
		searchPlaceholder: "Search title, workspace or ID",
		searchAria: "Search archived sessions",
		clearSearch: "Clear search",
		filterAll: "All",
		filterFiles: "With files",
		filterMissing: "Files missing",
		sortLabel: "Sort",
		sortLastUsed: "Last used",
		sortArchived: "Archive first observed",
		sortSize: "Size",
		sortTitle: "Title",
		sortMoved: "recently deleted",
		filteredEmpty: "No matching archived sessions",
		filteredEmptyHint: "Clear the search or switch the filter and try again.",
		clearFilters: "Clear filters",
		showing: "Showing {shown} / {total}",
		removedSearchPlaceholder: "Search recently deleted sessions",
		removedSelected: "{n} recently deleted sessions selected",
		removedEmptyFilter: "No matching recently deleted sessions",
		toastUnarchive: "Unarchived {n} session(s)",
		toastHide: "Moved {n} session(s) to Recently Deleted (recoverable)",
		toastPurge: "Deleted {n} session(s), freed {size}",
		toastRestore: "Restored {n} session(s) to their original locations; workspace results are reported separately",
		toastDiscard: "Permanently deleted {n} recently deleted session(s), freed {size}",
		toastCleanup: "Cleaned up {n} stale record(s)",
		toastReminders: ", stopped {n} reminder(s)",
		reportDismiss: "Dismiss",
		retentionTitle: "Recently Deleted retention",
		retentionLabel: "Keep for",
		retentionNever: "Off",
		retentionDays: "{n} days",
		retentionHint: "When enabled, recently deleted sessions older than the limit are deleted permanently in the background. Off by default.",
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
		showAllReasons: "View all {n} reasons",
		showLess: "Show fewer reasons",
		runningLocked: "Running; actions unavailable",
		logSize: "Log size",
		resultSummary: "Done: {ok} succeeded, {fail} failed, {skip} skipped",
		settings: "Settings",
		retentionSummary: "Automatic cleanup: {value}",
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
		updateUnknown: "Update state unconfirmed. Check again.",
		updateContinue: "View update progress or recover installation",
		updatePreparing: "Preparing an independent update page…",
		updateHandoff: "Confirm the target version and review results in the independent update page.",
		versionChecking: "Page v{version} · awaiting version verification",
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
		protectedItem: "Protected",
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
		};
		var key = code && codes[code];
		if (key) return tr(key);
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
		".am-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}",
		".am-head-text{flex:1 1 auto;min-width:0}",
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
		".am-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12));background:transparent}",
		".am-toolbar-group{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
		".am-spacer{flex:1 1 auto}",
		".am-stats{font-size:12px;line-height:1.5;color:var(--am-text-secondary)}",
		".am-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12))}",
		".am-search{display:flex;align-items:center;gap:8px;flex:1 1 260px;min-width:200px;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-radius:8px;background:transparent;color:var(--am-text-primary)}",
		".am-search:focus-within{border-color:var(--am-accent);box-shadow:0 0 0 2px var(--am-accent-soft)}",
		".am-search input{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;color:inherit;font-size:13px;appearance:none}",
		".am-search input::placeholder{color:var(--am-text-tertiary);opacity:1}",
		".am-search-icon{display:flex;flex:none;color:var(--am-text-secondary)}",
		".am-search-clear{width:20px;height:20px;border:0;border-radius:50%;background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16));color:var(--am-text-secondary);font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}",
		".am-search-clear:hover{color:var(--am-text-primary)}",
		".am-filter{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:9px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-chip{height:28px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--am-text-secondary);font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}",
		".am-chip.active{background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16));color:var(--am-text-primary);font-weight:600}",
		".am-chip-count{font-size:11px;opacity:.8;font-variant-numeric:tabular-nums}",
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
		".am-scope{font-size:12px;line-height:1.65;color:var(--am-text-tertiary);padding:12px 14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12));border-radius:0 0 13px 13px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.025))}",
		".am-meta-label{text-decoration:underline dotted;text-underline-offset:2px;cursor:help}",
		".am-report{display:flex;flex-direction:column;gap:7px;padding:12px 14px;border-bottom:1px solid rgba(232,178,91,.3);background:rgba(232,178,91,.06)}",
		".am-report-title{font-size:13px;font-weight:600;color:var(--am-warning)}",
		".am-report-list{display:flex;flex-direction:column;gap:3px;font-size:12px;line-height:1.55;color:var(--am-text-secondary)}",
		".am-report-item{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
		".am-report-actions{display:flex;justify-content:flex-end}",
		".am-retention{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12));background:var(--dsw-alias-bg-l1,rgba(127,127,127,.035));font-size:12px;line-height:1.6;color:var(--am-text-secondary)}",
		".am-retention-label{font-weight:600;color:var(--am-text-primary)}",
		".am-retention-hint{flex:1 1 300px;min-width:220px}",
		".am-retention-warn{color:var(--am-warning);font-weight:500}",
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
		".am-empty-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-l2,rgba(127,127,127,.12));color:var(--am-text-secondary)}",
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
		".am-preview{display:flex;flex-direction:column;gap:9px;padding-block:2px;max-height:42vh;overflow:auto;min-height:0}.am-preview-set{flex-shrink:0}.am-preview:focus-visible{outline:2px solid var(--am-accent);outline-offset:2px}.am-preview-set{border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));padding:8px 12px;border-radius:8px;line-height:1.55;overflow-wrap:anywhere}.am-preview-set ul{padding-inline-start:18px;margin:4px 0 0}.am-toast{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;line-height:1.55;padding:9px 12px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18))}",
		".am-toast.ok{color:var(--am-success)}",
		".am-toast.bad{color:var(--am-danger)}",
		".am-error-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 20px;border:1px solid color-mix(in srgb,var(--am-danger) 25%,transparent);border-radius:12px;background:color-mix(in srgb,var(--am-danger) 5%,transparent);text-align:center}",
		".am-error-icon{display:flex;color:var(--am-danger)}",
		".am-error-text{font-size:13px;line-height:1.7;color:var(--am-danger);max-width:560px}",
		".am-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:48px 0;font-size:13px;color:var(--am-text-secondary)}",
		".am-spinner{width:16px;height:16px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-top-color:var(--am-accent);animation:am-spin .8s linear infinite}",
		"@keyframes am-spin{to{transform:rotate(360deg)}}",
		"@keyframes am-fade{from{opacity:0}to{opacity:1}}",
		"@keyframes am-pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}",
		"@keyframes am-menu{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}",
		"@media (prefers-reduced-motion:reduce){.am-modal,.am-modal-backdrop,.am-spinner,.am-select-menu,.am-refresh-icon.spinning{animation:none}}",
		"@media (max-width:860px){.am-row{grid-template-columns:24px minmax(0,1fr)}.am-row-actions{grid-column:2;justify-self:start;padding-top:6px}}",
		"@media (max-width:720px){.am-search{flex-basis:100%}.am-sort{margin-left:auto}}",
		".am-page{gap:14px;min-width:0}.am-workbench{container-type:inline-size}",
		".am-head{flex-wrap:wrap;gap:12px}.am-head-text{flex:1 1 270px}.am-version{flex:0 1 420px;min-width:0;font-size:12px;line-height:1.6}.am-version-line,.am-update-result{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.am-version-label{font-weight:600}.am-version-details{margin-top:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16));border-radius:8px}.am-version a{color:var(--am-accent);text-decoration:underline}.am-update-result{margin-top:6px}.am-help{font-size:12px;line-height:1.6;color:var(--am-text-secondary)}",
		".am-summary{display:flex;gap:14px;flex-wrap:wrap;padding:9px 14px;color:var(--am-text-secondary);font-size:12px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12))}.am-toolbar{gap:8px}.am-selected-count{font-size:12px;font-weight:700;color:var(--am-accent)}.am-batch-limit{flex-basis:100%;color:var(--am-warning);font-size:12px}.am-notice{padding:9px 14px;font-size:12px;color:var(--am-text-secondary);border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12))}",
		".am-list{overflow:visible}.am-row{grid-template-columns:28px minmax(120px,1fr) minmax(64px,90px) auto;gap:12px;padding:14px}.am-row-title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;overflow:hidden;overflow-wrap:anywhere;border:0;padding:0;background:transparent;color:var(--am-text-primary);text-align:left;cursor:pointer;font:inherit;font-size:14px;font-weight:500;line-height:1.5}.am-row-title:focus-visible,.am-page summary:focus-visible,.am-search-clear:focus-visible{outline:2px solid var(--am-accent);outline-offset:3px}.am-titleline{align-items:flex-start}.am-check-target{display:flex;width:28px;min-height:28px;align-items:center;justify-content:center;cursor:pointer}.am-check{margin:0}.am-log-size{display:flex;flex-direction:column;gap:2px;align-items:flex-end;font-size:12px;font-variant-numeric:tabular-nums}.am-log-size strong{font-weight:500}.am-badge{font-size:12px}.am-row-actions{gap:6px;max-width:100%}",
		".am-warning-text{color:var(--am-warning);overflow-wrap:anywhere}.am-select-option:disabled{color:var(--am-text-tertiary);cursor:not-allowed}.am-details{grid-column:2/-1;min-width:0;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16));font-size:12px;line-height:1.6}.am-path{overflow-wrap:anywhere;white-space:pre-wrap;user-select:text}.am-file-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}.am-file-list p{margin:0}.am-file{display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:10px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.16));border-radius:8px;min-width:0}.am-file>div{max-width:100%}.am-report-item{white-space:normal;overflow-wrap:anywhere;overflow:visible}.am-report-actions{gap:8px;flex-wrap:wrap}.am-retention-settings{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex-basis:100%}.am-retention-hint{min-width:0}.am-search{min-width:0}.am-modal{background:var(--am-surface)}.am-modal-actions{flex-wrap:wrap}.am-chip:disabled{cursor:not-allowed;color:var(--am-text-tertiary)}",
		"@container (max-width:820px){.am-row{grid-template-columns:28px minmax(0,1fr) auto}.am-row-actions{grid-column:2/-1;justify-self:start;justify-content:flex-start;padding-top:2px}.am-log-size{grid-column:3;grid-row:1}.am-details{grid-column:2/-1}.am-search{flex-basis:100%}.am-controls{align-items:flex-start}.am-sort{margin-left:0}}",
		"@container (max-width:480px){.am-row{grid-template-columns:28px minmax(0,1fr);gap:8px}.am-log-size{grid-column:2;grid-row:auto;flex-direction:row;gap:8px;align-items:baseline}.am-row-actions{grid-column:2;flex-wrap:wrap}.am-btn{white-space:normal;height:auto;min-height:32px;padding:6px 10px;line-height:1.4}.am-row-title{-webkit-line-clamp:3}.am-filter{flex-wrap:wrap}.am-viewbar{gap:6px}.am-tab{padding:0 10px}.am-head{display:block}.am-version{margin-top:10px}.am-time{white-space:normal}.am-details{grid-column:1/-1}.am-modal-backdrop{padding:12px}}",
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
		var expandedState = useState({});
		var expanded = expandedState[0], setExpanded = expandedState[1];
		var reportAllState = useState(false);
		var reportAll = reportAllState[0], setReportAll = reportAllState[1];
		var selectionNoticeState = useState("");
		var selectionNotice = selectionNoticeState[0], setSelectionNotice = selectionNoticeState[1];
		var retentionExpandedState = useState(false);
		var retentionExpanded = retentionExpandedState[0], setRetentionExpanded = retentionExpandedState[1];
		var operationCountState = useState(0);
		var operationCount = operationCountState[0], setOperationCount = operationCountState[1];
		var updateErrorState = useState("");
		var updateError = updateErrorState[0], setUpdateError = updateErrorState[1];
		var removedWarningsState = useState([]);
		var removedWarnings = removedWarningsState[0], setRemovedWarnings = removedWarningsState[1];
		var versionDetailsState = useState(false);
		var versionDetails = versionDetailsState[0], setVersionDetails = versionDetailsState[1];
		var locked = busy || Boolean(update && update.busy) || updatePhase === "preparing" || phase !== "ready";
		var actionRef = React.useRef(false);
		var updateRef = React.useRef(false);
		var returnFocusRef = React.useRef(null);
		var cancelRef = React.useRef(null);
		var refreshRef = React.useRef(null);
		var archivedAllRef = React.useRef(null);
		var removedAllRef = React.useRef(null);
		var pendingFocusRef = React.useRef(false);
		var loadRef = React.useRef(false);
		var confirmRef = React.useRef(null);
		var menuRef = React.useRef(null);
		var menuTriggerRef = React.useRef(null);

		function keyOf(entry) {
			return entry.batch + "/" + entry.id;
		}

		function load(options) {
			var opts = options || {};
			var silent = opts.silent === true;
			if (loadRef.current) return Promise.resolve();
			loadRef.current = true;
			setPhase("loading");
			if (silent !== true) {
				setError(null);
				setReport(null);
			}
			return Promise.all([
				request("/list"),
				request("/settings").catch(function () { return null; })
			]).then(function (pair) {
				var data = pair[0] || {};
				if (!Array.isArray(data.items) || !Array.isArray(data.removed)) throw new Error("Incomplete session list response");
				var settingsData = pair[1];
				var nextItems = Array.isArray(data.items) ? data.items : [];
				var nextRemoved = Array.isArray(data.removed) ? data.removed : [];
				setItems(nextItems);
				setRemoved(nextRemoved);
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
				setPhase(items.length > 0 || removed.length > 0 ? "stale" : "failed");
			}).finally(function () {
				loadRef.current = false;
			});
		}

		useEffect(function () {
			void load();
		}, []);

		useEffect(function () {
			if (toast === null) return undefined;
			var timer = setTimeout(function () { setToast(null); }, 6000);
			return function () { clearTimeout(timer); };
		}, [toast]);

		useEffect(function () {
			if (confirm !== null || busy === true) setMenu(null);
		}, [confirm, busy]);

		useEffect(function () {
			if (menu === null) return;
			if (menu === "sort" && (tab !== "archived" || items.length === 0)) setMenu(null);
			else if (menu === "removedSort" && (tab !== "removed" || removed.length === 0)) setMenu(null);
			else if (menu === "retention" && tab !== "removed") setMenu(null);
		}, [menu, tab, items.length, removed.length]);

		useEffect(function () {
			if (menu === null || !menuRef.current) return;
			var target = menuRef.current.querySelector('[aria-selected="true"]')
				|| menuRef.current.querySelector('[role="option"]');
			if (target && typeof target.focus === "function") target.focus();
		}, [menu]);

		useEffect(function () {
			if (menu === null) return undefined;
			function onDown(event) {
				if (menuRef.current && menuRef.current.contains(event.target)) return;
				if (menuTriggerRef.current && menuTriggerRef.current.contains(event.target)) return;
				setMenu(null);
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
			document.addEventListener("keydown", onKey);
			return function () {
				document.removeEventListener("mousedown", onDown);
				document.removeEventListener("keydown", onKey);
			};
		}, [menu]);

		useEffect(function () {
			if (confirm === null) return undefined;
			function onKey(event) {
				if (event.key === "Escape" && !actionRef.current) {
					event.preventDefault();
					setConfirm(null);
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
			document.addEventListener("keydown", onKey);
			if (cancelRef.current && typeof cancelRef.current.focus === "function") cancelRef.current.focus();
			return function () {
				document.removeEventListener("keydown", onKey);
				pendingFocusRef.current = true;
			};
		}, [confirm !== null]);

		// Closing a submitted dialog often coincides with a list refresh. Wait
		// until a connected target is enabled; focusing disabled buttons is a no-op.
		useEffect(function () {
			if (!pendingFocusRef.current || confirm !== null || busy || update && update.busy || updatePhase === "preparing") return;
			var candidates = [returnFocusRef.current, tab === "removed" ? removedAllRef.current : archivedAllRef.current, refreshRef.current];
			for (var index = 0; index < candidates.length; index++) {
				var target = candidates[index];
				if (target && target.isConnected !== false && !target.disabled && typeof target.focus === "function") {
					target.focus();
					pendingFocusRef.current = false;
					return;
				}
			}
		}, [confirm !== null, phase, busy, Boolean(update && update.busy), updatePhase, tab]);

		useEffect(function () {
			var last = 0;
			function refresh() {
				if (locked || actionRef.current || confirm !== null) return;
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
		}, [locked, confirm]);

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
				entry && entry.workspace ? entry.workspace : "",
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
					return { title: failureTitle(entry), reason: entry.warning || failureReason(entry) };
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
			setReport(null);
			setReportAll(false);
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
			if (locked || actionRef.current || confirm !== null) return;
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
			returnFocusRef.current = document.activeElement;
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
			var key = fileKey(item);
			if (!expanded[key]) return null;
			var workspace = item.workspace && typeof item.workspace === "object" ? item.workspace.path : item.workspacePath;
			return h("div", { key: "details", className: "am-details", id: "am-detail-" + key.replace(/[^a-zA-Z0-9_-]/g, "-") }, [
				h("div", { key: "title", className: "am-path" }, item.title || tr("noTitle")),
				h("div", { key: "id", className: "am-path" }, "ID：" + item.id),
				item.protectionReason ? h("div", { key: "protection", className: "am-warning-text" }, item.protectionReason) : null,
				item.sizeWarning && item.sizeWarning !== item.protectionReason ? h("div", { key: "sizeWarning", className: "am-warning-text" }, item.sizeWarning) : null,
				workspace ? h("div", { key: "workspace", className: "am-path" }, tr("workspacePath") + "：" + workspace) : null,
				h("div", { key: "times", className: "am-row-meta am-row-times" }, removedItem
					? timeItem("moved", tr("movedAt"), tr("tipMovedAtLabel"), fmtTime(item.movedAt))
					: [timeItem("last", tr("lastUsedLabel"), tr("tipLastUsedLabel"), fmtTime(item.lastUsedAt)), timeItem("archived", tr("archivedLabel"), tr("tipArchivedLabel"), typeof item.archivedAt === "number" ? fmtTime(item.archivedAt) : tr("unknownTime"))]),
				fileLocations(item)
			]);
		}
		function rowMain(item, removedItem) {
			var key = fileKey(item), open = Boolean(expanded[key]);
			var workspace = item.workspace && typeof item.workspace === "object" ? item.workspace.title : item.workspace;
			var access = capability(item, removedItem ? "discard" : "purge");
			var restoreAccess = removedItem ? capability(item, "restore") : true;
			var blocked = access !== true ? access : restoreAccess !== true ? restoreAccess : null;
			var blockedReason = blocked && errorText(blocked.code, blocked.reason);
			return h("div", { key: "main", className: "am-main" }, [
				h("div", { key: "titleline", className: "am-titleline" }, [
					h("button", { key: "title", type: "button", className: "am-row-title", title: item.title || item.id, "aria-expanded": open, "aria-controls": open ? "am-detail-" + key.replace(/[^a-zA-Z0-9_-]/g, "-") : undefined, onClick: function () { setExpanded(function (current) { var next = Object.assign({}, current); next[key] = !current[key]; return next; }); } }, item.title || tr("noTitle")),
					item.running ? h("span", { key: "running", className: "am-badge danger" }, tr("running")) : item.missing ? h("span", { key: "missing", className: "am-badge warn" }, tr("missing")) : blocked ? h("span", { key: "protected", className: "am-badge warn" }, tr(blocked.code === "occupied" ? "occupied" : "protectedReason")) : null
				]),
				h("div", { key: "meta", className: "am-row-meta", title: workspace || "" }, (workspace || "—") + " · " + (removedItem ? tr("movedAt") : tr("lastUsedLabel")) + " " + (typeof (removedItem ? item.movedAt : item.lastUsedAt) === "number" ? fmtAge(removedItem ? item.movedAt : item.lastUsedAt) : tr("unknownTime"))),
				blockedReason && !item.running && !item.missing ? h("div", { key: "blocked", className: "am-help am-warning-text" }, blockedReason) : null,
				h("span", { key: "hint", className: "am-help" }, tr("details") + (open ? " ▴" : " ▾"))
			]);
		}

		function actionButton(item, key, kind, label, quick, danger) {
			var action = kind === "cleanup" ? "forget" : kind;
			return button(key, tr(label), function () { openConfirm(kind, [item], { quick: quick }); },
				locked || capability(item, action) !== true, danger);
		}

		function archivedRow(item) {
			var checked = selectedIds.has(item.id);
			var actions = item.running ? h("span", { className: "am-help" }, tr("runningLocked")) : item.missing
				? actionButton(item, "cleanup", "cleanup", "cleanup")
				: [
					actionButton(item, "unarchive", "unarchive", "unarchive", true),
					actionButton(item, "hide", "hide", "hide", true),
					actionButton(item, "purge", "purge", "purge", false, true)
				];
			if (capability(item, "repair") === true) actions = [actionButton(item, "repair", "repair", "repair", true)];
			return h("div", { key: item.id, className: "am-row" + (checked ? " selected" : ""), role: "listitem" }, [
				h("label", { key: "check", className: "am-check-target" }, h("input", { type: "checkbox", className: "am-check", checked: checked, disabled: locked || Boolean(item.running), onChange: function () { if (!item.running) toggle(item.id); }, "aria-label": item.title || item.id })),
				rowMain(item, false),
				h("div", { key: "size", className: "am-log-size" }, [h("span", { key: "label", className: "am-help" }, tr("logSize")), h("strong", { key: "value" }, logSizeText(item, false))]),
				h("div", { key: "actions", className: "am-row-actions" }, actions), details(item, false)
			]);
		}
		function removedRow(entry) {
			var key = keyOf(entry), checked = removedKeys.has(key);
			var actions = capability(entry, "repair") === true
				? [actionButton(entry, "repair", "repair", "repair", true)]
				: [actionButton(entry, "restore", "restore", "restore", true), actionButton(entry, "discard", "discard", "purge", false, true)];
			return h("div", { key: key, className: "am-row" + (checked ? " selected" : ""), role: "listitem" }, [
				h("label", { key: "check", className: "am-check-target" }, h("input", { type: "checkbox", className: "am-check", checked: checked, disabled: locked, onChange: function () { toggleRemoved(key); }, "aria-label": entry.title || entry.id })),
				rowMain(entry, true),
				h("div", { key: "size", className: "am-log-size" }, [h("span", { key: "label", className: "am-help" }, tr("logSize")), h("strong", { key: "value" }, logSizeText(entry, true))]),
				h("div", { key: "actions", className: "am-row-actions" }, actions),
				details(entry, true)
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
			return request("/update/status").then(function (data) { setUpdate(function (current) { return Object.assign({}, current || {}, data); }); setUpdateError(""); }).catch(function () { setUpdateError(tr("updateUnknown")); });
		}
		useEffect(function () {
			void updateStatus();
			function check() { void updateStatus(); }
			window.addEventListener("focus", check);
			var timer = setInterval(check, 5000);
			return function () { window.removeEventListener("focus", check); clearInterval(timer); };
		}, []);
		function checkUpdate() {
			if (updateRef.current) return;
			updateRef.current = true;
			setUpdatePhase("checking"); setUpdateError("");
			request("/update/check", {}).then(function (data) { setUpdate(data); }).catch(function (error) { setUpdateError(tr("updateFailed", { message: error.message || error })); }).finally(function () { updateRef.current = false; setUpdatePhase(""); });
		}
		function prepareUpdate() {
			if (locked || actionRef.current || updateRef.current || !update || !update.release || !update.canUpdate) return;
			updateRef.current = true; setUpdatePhase("preparing"); setUpdateError("");
			request("/update/prepare", { releaseId: update.release.id, version: update.release.version, switchFromLink: update.sourceKind === "link" }).then(function (data) {
				if (!validControlUrl(data.controlUrl)) throw new Error("Invalid update control URL");
				setUpdate(function (current) { return Object.assign({}, current, { job: data.job, controlUrl: data.controlUrl }); });
				window.open(data.controlUrl, "_blank", "noopener,noreferrer");
			}).catch(function (error) { setUpdateError(error.message || String(error)); }).finally(function () { updateRef.current = false; setUpdatePhase(""); void updateStatus(); });
		}
		function versionPanel() {
			var mismatch = update && ((update.runtimeVersion && update.runtimeVersion !== CLIENT_VERSION) || (update.installedVersion && update.installedVersion !== CLIENT_VERSION));
			var confirmed = update && update.runtimeVersion === CLIENT_VERSION && update.installedVersion === CLIENT_VERSION;
			var source = update && update.sourceKind;
			var sourceText = source === "link" ? tr("localSource") : source === "release" ? tr("releaseSource") : source === "missing" ? tr("missingSource") : tr("unknownSource");
			var release = update && update.release;
			var control = update && (update.controlUrl || update.job && update.job.controlUrl);
			return h("div", { key: "version", className: "am-version" }, [
				h("div", { key: "line", className: "am-version-line" }, [
					h("span", { key: "version", className: "am-version-label" }, mismatch ? tr("pendingUpdate") : confirmed ? "v" + CLIENT_VERSION : tr("versionChecking", { version: CLIENT_VERSION })),
					h("button", { key: "details-toggle", type: "button", className: "am-btn am-version-toggle", "aria-expanded": versionDetails, "aria-controls": "am-version-details", onClick: function () { setVersionDetails(!versionDetails); } }, tr("versionDetails")),
					source === "link" ? h("span", { key: "source", className: "am-badge muted" }, tr("localSource")) : null,
					button("check", updatePhase === "checking" ? tr("checkingUpdate") : tr("checkUpdate"), checkUpdate, updatePhase !== "" || Boolean(update && update.busy))
				]),
				versionDetails ? h("div", { key: "details", id: "am-version-details", className: "am-version-details" }, [
					h("div", { key: "page" }, tr("pageVersion") + "：v" + CLIENT_VERSION),
					h("div", { key: "runtime" }, tr("serviceVersion") + "：" + (update && update.runtimeVersion || tr("notProvided"))),
					h("div", { key: "installed" }, tr("installedVersion") + "：" + (update && update.installedVersion || tr("notProvided"))),
					h("div", { key: "source" }, tr("source") + "：" + sourceText)
				]) : null,
				updateError ? h("div", { key: "error", className: "am-warning-text", role: "status" }, updateError) : null,
				update && update.busy ? h("div", { key: "busy", role: "status" }, tr("updateBusy")) : null,
				release ? h("div", { key: "release", className: "am-update-result" }, [
					h("span", { key: "relation" }, update.relation === "same" ? tr("latestRelease", { version: release.version }) : update.relation === "older" ? tr("aheadRelease", { version: release.version }) : tr("checkedRelease", { version: release.version })),
					release.htmlUrl && /^https:\/\/github\.com\/chen1pengvincent\/dsh-archived-manager\/releases\//.test(release.htmlUrl) ? h("a", { key: "notes", href: release.htmlUrl, target: "_blank", rel: "noopener noreferrer" }, tr("releaseNotes")) : null,
					update.checkedAt ? h("span", { key: "checked", className: "am-help" }, tr("checkedAt") + " " + fmtTime(typeof update.checkedAt === "number" ? update.checkedAt : Date.parse(update.checkedAt))) : null,
					(source === "link" || update.relation === "newer") && update.relation !== "older" ? button("install", updatePhase === "preparing" ? tr("updatePreparing") : source === "link" ? tr("switchRelease") : tr("updateTo", { version: release.version }), prepareUpdate, locked || !update.canUpdate || updatePhase !== "") : null,
					!update.canUpdate && update.capabilityReason ? h("div", { key: "reason", className: "am-help" }, update.capabilityReason) : null
				]) : null,
				validControlUrl(control) ? h("div", { key: "control", className: "am-update-result" }, [h("a", { key: "link", href: control, target: "_blank", rel: "noopener noreferrer" }, tr("updateContinue")), h("span", { key: "hint", className: "am-help" }, tr("updateHandoff"))]) : null,
				update && update.job && update.job.error ? h("div", { key: "jobError", className: "am-warning-text", role: "status" }, update.job.error) : null
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
				h("div", { key: "icon", className: "am-empty-icon", "aria-hidden": "true" },
					h("svg", {
						width: 22,
						height: 22,
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: 1.6,
						"stroke-linecap": "round",
						"stroke-linejoin": "round"
					}, [
						h("path", { key: "box", d: "M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" }),
						h("path", { key: "lid", d: "M3 4h18v4H3z" })
					])
				),
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

		function filterChip(id, label, count) {
			return h("button", {
				key: id,
				type: "button",
				className: "am-chip" + (filter === id ? " active" : ""),
				"aria-pressed": filter === id,
				disabled: locked,
				onClick: function () { if (!locked && !actionRef.current) setFilter(id); }
			}, [
				h("span", { key: "label" }, label),
				h("span", { key: "count", className: "am-chip-count" }, String(count))
			]);
		}

		function dropdown(id, value, options, onChange, ariaLabel, alignRight) {
			var current = options.filter(function (option) { return String(option.value) === String(value); })[0];
			var open = menu === id;

			function closeAndFocus() {
				setMenu(null);
				if (menuTriggerRef.current && typeof menuTriggerRef.current.focus === "function") {
					menuTriggerRef.current.focus();
				}
			}

			function choose(next) {
				if (locked || actionRef.current) return;
				closeAndFocus();
				onChange(next);
			}

			function toggle(event) {
				if (locked || actionRef.current) return;
				if (open) {
					setMenu(null);
					if (typeof event.currentTarget.focus === "function") event.currentTarget.focus();
					return;
				}
				menuTriggerRef.current = event.currentTarget;
				setMenu(id);
			}

			function onTriggerKey(event) {
				if (locked || actionRef.current) return;
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
				className: "am-select" + (alignRight ? " am-select-right" : ""),
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
					h("span", { key: "value", className: "am-select-value" }, current ? current.label : ""),
					chevron
				]),
				open ? h("div", {
					key: "menu",
					className: "am-select-menu",
					role: "listbox",
					"aria-label": ariaLabel,
					ref: menuRef,
					onKeyDown: onMenuKey
				}, options.map(function (option) {
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
				})) : null
			]);
		}

		function selectionBar(isRemoved) {
			var entries = isRemoved ? selectedRemovedEntries : selectedItems;
			var count = entries.length;
			var total = isRemoved ? sortedRemoved.length : selectable.length;
			var filesCount = entries.filter(function (entry) { return !entry.missing; }).length;
			var actions = [];
			var exceeded = false;
			function add(kind, label, danger) {
				var eligible = localPlan(kind, entries).targets.length;
				if (!eligible) return;
				if (eligible > MAX_BATCH) exceeded = true;
				actions.push(button(kind, tr(label) + " (" + eligible + ")", function () {
					openConfirm(kind, entries);
				}, locked || eligible > MAX_BATCH, danger));
			}
			if (count > 0) {
				actions.push(button("clear", tr("clearSelection"), function () { if (actionRef.current) return; if (isRemoved) setRemovedSelected([]); else setSelected([]); }, locked));
				if (isRemoved) {
					add("restore", "restore");
					add("discard", "purge", true);
				} else {
					add("unarchive", "unarchive");
					add("hide", "hide");
					add("cleanup", "cleanup");
					add("purge", "purge", true);
				}
			}
			return h("div", { key: "toolbar", className: "am-toolbar" }, [
				h("div", { key: "selection", className: "am-toolbar-group" }, [
					h("label", { key: "all", className: "am-checkline" }, [h("input", { key: "box", type: "checkbox", className: "am-check", ref: isRemoved ? syncRemovedRef : syncAllRef, checked: isRemoved ? allRemovedSelected : allSelected, "aria-checked": count > 0 && !(isRemoved ? allRemovedSelected : allSelected) ? "mixed" : isRemoved ? allRemovedSelected : allSelected, disabled: locked || total === 0, onChange: isRemoved ? toggleAllRemoved : toggleAll }), h("span", { key: "text" }, tr("selectAll"))]),
					h("span", { key: "count", className: count > 0 ? "am-selected-count" : "am-stats", role: "status" }, count > 0 ? isRemoved ? tr("removedSelected", { n: count }) : tr("selectedSplit", { n: count, files: filesCount, missing: count - filesCount }) : tr("selectHint")),
					count > 0 ? h("span", { key: "bytes", className: "am-help" }, summarySize(entries, isRemoved)) : null
				]),
				actions.length ? h("div", { key: "actions", className: "am-toolbar-group" }, actions) : null,
				exceeded ? h("div", { key: "limit", className: "am-batch-limit", role: "status" }, tr("batchLimit")) : null
			]);
		}
		function reportPanel() {
			if (!report) return null;
			var reasons = Array.isArray(report.failures) ? report.failures : [];
			return h("div", { key: "report", className: "am-report", role: "status" }, [
				h("div", { key: "title", className: "am-report-title" }, report.title),
				h("div", { key: "reasons", className: "am-report-list" }, (reportAll ? reasons : reasons.slice(0, 4)).map(function (failure, index) { return h("div", { key: index, className: "am-report-item" }, failure.title + " · " + failure.reason); })),
				h("div", { key: "actions", className: "am-report-actions" }, [reasons.length > 4 ? button("all", reportAll ? tr("showLess") : tr("showAllReasons", { n: reasons.length }), function () { setReportAll(!reportAll); }, false) : null, button("dismiss", tr("reportDismiss"), function () { setReport(null); }, false)])
			]);
		}
		function controls(isRemoved) {
			var value = isRemoved ? removedQuery : query;
			return h("div", { key: "controls", className: "am-controls" }, [
				h("div", { key: "search", className: "am-search" }, [searchGlyph(), h("input", { key: "input", type: "text", value: value, disabled: locked, placeholder: tr(isRemoved ? "removedSearchPlaceholder" : "searchPlaceholder"), "aria-label": tr(isRemoved ? "removedSearchPlaceholder" : "searchAria"), onChange: function (event) { if (locked || actionRef.current) return; if (isRemoved) setRemovedQuery(event.target.value); else setQuery(event.target.value); } }), value !== "" ? h("button", { key: "clear", type: "button", className: "am-search-clear", disabled: locked, "aria-label": tr("clearSearch"), onClick: function () { if (locked || actionRef.current) return; if (isRemoved) setRemovedQuery(""); else setQuery(""); } }, "×") : null]),
				!isRemoved ? h("div", { key: "filter", className: "am-filter", role: "group", "aria-label": tr("filterAll") }, [filterChip("all", tr("filterAll"), items.length), filterChip("files", tr("filterFiles"), filesCount), filterChip("missing", tr("filterMissing"), missingCount)]) : null,
				h("div", { key: "sort", className: "am-sort" }, [h("span", { key: "label" }, tr("sortLabel")), dropdown(isRemoved ? "removedSort" : "sort", isRemoved ? removedSort : sort, isRemoved ? [{ value: "movedAt", label: tr("sortMoved") }, { value: "size", label: tr("sortSize") }, { value: "title", label: tr("sortTitle") }] : [{ value: "lastUsed", label: tr("sortLastUsed") }, { value: "archived", label: tr("sortArchived") }, { value: "size", label: tr("sortSize") }, { value: "title", label: tr("sortTitle") }], function (next) { if (isRemoved) setRemovedSort(next); else setSort(next); }, tr("sortLabel"), true)])
			]);
		}
		function retentionPanel() {
			return h("div", { key: "retention", className: "am-retention" }, [
				h("span", { key: "summary", className: "am-retention-label" }, tr("retentionSummary", { value: settings.unavailable ? tr("notProvided") : settings.trashRetentionDays > 0 ? tr("retentionAfter", { n: settings.trashRetentionDays }) : tr("retentionDisabled") })),
				button("settings", tr("settings"), function () { setRetentionExpanded(!retentionExpanded); }, locked || settings.unavailable),
				removed.length > 0 ? button("empty", tr("emptyTrash") + " (" + removed.length + ")", function () { openConfirm("empty", []); }, locked, true) : null,
				retentionExpanded ? h("div", { key: "settingsPanel", className: "am-retention-settings" }, [h("span", { key: "title" }, tr("retentionTitle")), dropdown("retention", String(settings.trashRetentionDays || 0), [{ value: "0", label: tr("retentionNever") }, { value: "7", label: tr("retentionDays", { n: 7 }) }, { value: "30", label: tr("retentionDays", { n: 30 }) }, { value: "90", label: tr("retentionDays", { n: 90 }) }], changeRetention, tr("retentionLabel"), false), h("span", { key: "hint", className: "am-retention-hint" }, tr("retentionHint"))]) : null
			]);
		}

		var children = [];
		var workspace = [];
		children.push(h("div", { key: "head", className: "am-head" }, [h("div", { key: "text", className: "am-head-text" }, [h("div", { key: "title", className: "am-title" }, tr("title")), h("div", { key: "sub", className: "am-sub" }, tr("subtitle"))]), versionPanel()]));
		if (toast) children.push(h("div", { key: "toast", className: "am-toast " + (toast.kind === "ok" ? "ok" : "bad"), role: "status", "aria-live": "polite" }, [
			h("span", { key: "text" }, toast.text),
			toast.showRemoved && tab !== "removed" ? button("viewRemoved", tr("viewRemoved"), function () { setTab("removed"); }, locked) : null
		]));
		workspace.push(h("div", { key: "viewbar", className: "am-viewbar" }, [h("div", { key: "tabs", className: "am-tabs", role: "tablist", "aria-label": tr("title") }, [
			h("button", { key: "archived", type: "button", role: "tab", "aria-selected": tab === "archived", className: "am-tab" + (tab === "archived" ? " active" : ""), disabled: busy || updatePhase === "preparing", onClick: function () { if (actionRef.current) return; setTab("archived"); setMenu(null); } }, tr("tabArchived") + " (" + items.length + ")"),
			h("button", { key: "removed", type: "button", role: "tab", "aria-selected": tab === "removed", className: "am-tab" + (tab === "removed" ? " active" : ""), disabled: busy || updatePhase === "preparing", onClick: function () { if (actionRef.current) return; setTab("removed"); setMenu(null); } }, removedWarnings.length > 0 ? tr("knownTabCount", { label: tr("tabRemoved"), n: removed.length }) : tr("tabRemoved") + " (" + removed.length + ")")]), refreshButton()]));
		if (phase === "loading") workspace.push(h("div", { key: "loading", className: "am-loading", role: "status" }, tr("loading")));
		if (phase === "failed" || phase === "stale") workspace.push(h("div", { key: "error", className: "am-report", role: "alert" }, [h("span", { key: "text" }, tr("staleList") + " " + tr("failed", { message: error || "" })), button("retry", tr("retry"), function () { void load({ keepSelection: true }); }, busy || Boolean(update && update.busy))]));
		if (busy) workspace.push(h("div", { key: "progress", className: "am-notice", role: "status" }, operationCount ? tr("processing", { n: operationCount }) : tr("busy")));
		if (selectionNotice) workspace.push(h("div", { key: "selectionNotice", className: "am-notice", role: "status" }, selectionNotice));
		if (report) workspace.push(reportPanel());
		var hasSnapshot = phase === "ready" || phase === "stale" || items.length > 0 || removed.length > 0 || removedWarnings.length > 0;
		if (hasSnapshot) {
			var isRemoved = tab === "removed", all = isRemoved ? removed : items, visible = isRemoved ? sortedRemoved : sortedItems;
			if (all.length > 0) workspace.push(controls(isRemoved));
			var totalSize = summarySize(visible, isRemoved);
			workspace.push(h("div", { key: "summary", className: "am-summary" }, [h("span", { key: "count" }, tr("showing", { shown: visible.length, total: all.length })), h("span", { key: "bytes" }, totalSize), !isRemoved && visible.some(function (item) { return item.running; }) ? h("span", { key: "running" }, tr("running") + " " + visible.filter(function (item) { return item.running; }).length) : null, !isRemoved && visible.some(function (item) { return item.missing; }) ? h("span", { key: "missing" }, tr("missing") + " " + visible.filter(function (item) { return item.missing; }).length) : null]));
			if (isRemoved && removedWarnings.length > 0) workspace.push(h("div", { key: "removedWarnings", className: "am-report am-removed-warnings", role: "status" }, [
				h("div", { key: "title", className: "am-report-title" }, tr("removedWarningsTitle", { n: removedWarnings.length })),
				h("div", { key: "hint", className: "am-help" }, tr("removedWarningsHint")),
				h("div", { key: "reasons", className: "am-report-list" }, removedWarnings.map(function (warning, index) { return h("div", { key: index, className: "am-report-item" }, warning.batch + " · " + warning.reason); }))
			]));
			if (isRemoved) workspace.push(retentionPanel());
			if (visible.length > 0) workspace.push(selectionBar(isRemoved));
			workspace.push(all.length === 0 ? emptyCard("empty", tr(isRemoved ? removedWarnings.length > 0 ? "removedUnlistedTitle" : "emptyRemovedTitle" : "emptyTitle"), tr(isRemoved ? removedWarnings.length > 0 ? "removedUnlistedHint" : "emptyRemovedHint" : "emptyHint")) : visible.length === 0 ? emptyCard("filtered", tr(isRemoved ? "removedEmptyFilter" : "filteredEmpty"), tr("filteredEmptyHint"), button("clear", tr("clearFilters"), isRemoved ? clearRemovedFilters : clearFilters, locked)) : h("div", { key: "list", className: "am-list", role: "list" }, visible.map(isRemoved ? removedRow : archivedRow)));
			workspace.push(h("div", { key: "scope", className: "am-scope" }, tr("scopeNote", { size: fmtSize(attachments.bytes), files: attachments.files })));
		}
		children.push(h("section", { key: "workbench", className: "am-workbench", role: "region", "aria-label": tr("title") }, workspace));
		children.push(confirmPanel());
		return h("div", { className: "am-page", "aria-busy": busy || Boolean(update && update.busy) }, children);

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
