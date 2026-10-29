window.__ModuleLoader__.load({ id: "dsh-archived-manager", factory: (require) => {

	var module = { exports: {} };
	var exports = module.exports;
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

	var React = require("react");
	var h = React.createElement;
	var useState = React.useState;
	var useEffect = React.useEffect;

	var API = "/archived-manager";
	var LANG = typeof navigator !== "undefined" && navigator.language ? String(navigator.language).toLowerCase() : "";
	var ZH = LANG.indexOf("zh") === 0;

	var STR_ZH = {
		section: "归档会话",
		title: "归档会话管理",
		subtitle: "先归档，再在这里批量管理。取消归档让会话回到侧栏；移入隔离区保留文件；彻底删除只清理会话日志。",
		tabArchived: "已归档",
		tabRemoved: "隔离区",
		refresh: "刷新",
		loading: "正在读取…",
		failed: "读取失败：{message}",
		retry: "重试",
		emptyArchived: "当前没有已归档会话。",
		emptyRemoved: "隔离区是空的。",
		selectAll: "全选",
		selected: "已选 {n} 个",
		hide: "移入隔离区",
		unarchive: "取消归档",
		purge: "彻底删除",
		restore: "恢复",
		emptyTrash: "清空隔离区",
		hideConfirmTitle: "移入隔离区 {n} 个会话？",
		hideConfirmBody: "会话文件会移动到隔离区，DSH 所有列表都不再显示；可随时从「隔离区」恢复。项目文件与附件不受影响。",
		purgeConfirmTitle: "彻底删除 {n} 个会话？",
		purgeConfirmBody: "只删除会话日志目录，无法恢复；项目文件与附件不受影响。",
		purgeCheck: "我已知晓：删除后不可恢复",
		emptyConfirmTitle: "清空隔离区？",
		emptyConfirmBody: "隔离区里的 {n} 个会话会被永久删除，无法恢复；项目文件与附件不受影响。",
		discardTitle: "彻底删除 {n} 个隔离会话？",
		discardBody: "隔离区里的会话日志会被永久删除，无法恢复。项目文件与附件不受影响。",
		cancel: "取消",
		confirmHide: "移入隔离区",
		confirmPurge: "彻底删除",
		confirmEmpty: "清空隔离区",
		confirmDiscard: "彻底删除",
		busy: "处理中…",
		restoreConfirm: "",
		restoreDone: "已恢复",
		missing: "文件缺失",
		running: "运行中",
		resident: "驻留中",
		noTitle: "（无标题）",
		size: "体积",
		workspace: "工作区",
		created: "创建时间",
		movedAt: "移入时间",
		tipMovedAtLabel: "移入隔离区的时间；由插件记录，恢复后清除。",
		resultOk: "完成：成功 {ok} 个，失败 {fail} 个",
		resultFail: "失败：{message}",
		forget: "清除归档记录",
		forgetConfirmTitle: "清除 {n} 条归档记录？",
		forgetConfirmBody: "这些会话在磁盘上已经不存在，只会从归档集合移除记录，不影响任何文件。",
		trashStats: "隔离区：{n} 条 · {size}",
		archivedStats: "已归档：{n} 条 · 合计可释放 {size}",
		statsMissing: "（其中 {n} 条文件缺失）",
		statArchived: "已归档会话",
		statArchivedHint: "全部归档记录",
		statReleasable: "可释放空间",
		statReleasableHint: "仅会话日志目录",
		statMissing: "文件缺失",
		statMissingHint: "仅剩归档记录",
		statTrash: "隔离区",
		statTrashHint: "隔离区占用 {size}",
		emptyTitle: "暂无已归档会话",
		emptyHint: "在会话菜单里归档后，这里会显示；取消归档会让它回到侧栏。",
		emptyRemovedTitle: "隔离区为空",
		emptyRemovedHint: "移入隔离区的会话会出现在这里，可恢复或永久删除。",
		badgeArchived: "文件在盘",
		badgeMissing: "文件缺失",
		tipArchived: "文件仍在磁盘（会话目录 {size}）。取消归档会回到侧栏；移入隔离区会保留文件；彻底删除才清理日志。",
		tipMissing: "该会话的日志目录已不存在，只剩归档记录。清理只删这条记录，不动任何文件。",
		lastUsedLabel: "最后使用",
		archivedLabel: "归档于",
		unknownTime: "未记录",
		sizeUsed: "会话目录 {size}（彻底删除可释放）",
		sizeMissing: "会话目录 0 B（文件已不存在）",
		releaseLine: "将释放约 {size}（仅会话日志）",
		hideSummary: "文件会移入隔离区，暂不释放空间；清空隔离区后才释放。",
		noFilesLine: "没有文件会被删除",
		modalClearTitle: "清理 {n} 条失效归档记录？",
		modalClearBody: "这些会话的文件已不存在，只会移除归档记录，不会删除任何文件。",
		modalMixedBody: "其中 {missing} 条文件缺失，只会清除记录；其余 {present} 条日志会被永久删除。",
		hideMixedBody: "其中 {missing} 条文件缺失，只会清除记录；其余 {present} 条会移入隔离区（保留文件，可恢复）。",
		clearCheck: "我已知晓：这些归档记录将被清除",
		cleanup: "清理失效记录",
		cleanupTitle: "清理 {n} 条失效归档记录？",
		cleanupBody: "这些会话的文件已不存在，只会移除归档记录，不会删除任何文件。",
		confirmCleanup: "清理记录",
		ignoredNote: "另有 {n} 条文件缺失的记录不会被此操作处理。",
		selectedSplit: "已选 {n} 个（有文件 {files} · 失效 {missing}）",
		hideShort: "移入",
		cleanupShort: "清理记录",
		tipHideAction: "移入隔离区：文件保留，可随时恢复",
		tipCleanupAction: "只删除归档记录，不动任何文件",
		cleanupHint: "所选记录的文件均已不存在，请用「清理失效记录」",
		selectHint: "勾选会话后可批量操作",
		confirmClear: "清理记录",
		close: "关闭",
		searchPlaceholder: "搜索标题、工作区或 ID",
		searchAria: "搜索归档会话",
		clearSearch: "清除搜索",
		filterAll: "全部",
		filterFiles: "有文件",
		filterMissing: "文件缺失",
		sortLabel: "排序",
		sortLastUsed: "最后使用",
		sortArchived: "归档时间",
		sortSize: "体积",
		sortTitle: "标题",
		sortMoved: "移入时间",
		filteredEmpty: "没有匹配的归档会话",
		filteredEmptyHint: "清空搜索或切换筛选后再试。",
		clearFilters: "清除筛选",
		showing: "显示 {shown} / {total}",
		removedSearchPlaceholder: "搜索隔离会话",
		removedSelectHint: "勾选隔离会话后可批量恢复或删除",
		removedSelected: "已选 {n} 个隔离会话",
		removedEmptyFilter: "没有匹配的隔离会话",
		discardShort: "彻底删除",
		tipDiscardAction: "永久删除隔离区中的会话日志",
		tipUnarchiveAction: "回到侧栏，文件原地保留（DSH 原生取消归档）",
		unarchiveDone: "已取消归档，会话回到侧栏",
		toastUnarchive: "已取消归档 {n} 个",
		toastIgnored: "，{n} 条失效记录未处理",
		toastHide: "已移入隔离区 {n} 个（可恢复）",
		toastPurge: "已彻底删除 {n} 个会话，释放 {size}",
		toastRestore: "已恢复 {n} 个会话",
		toastDiscard: "已永久删除 {n} 个隔离会话，释放 {size}",
		toastEmpty: "已清空隔离区，释放 {size}",
		toastCleanup: "已清理 {n} 条失效记录",
		toastReminders: "，停止 {n} 个提醒",
		toastPartial: "完成 {ok} 个，失败 {fail} 个",
		reportTitle: "部分完成：成功 {ok} 个，失败 {fail} 个",
		reportMore: "还有 {n} 条失败未显示",
		reportDismiss: "知道了",
		retentionTitle: "隔离区自动清理",
		retentionLabel: "保留期限",
		retentionNever: "永不",
		retentionDays: "{n} 天",
		retentionHint: "开启后，超过期限的隔离会话会在后台被永久删除；默认关闭。",
		retentionWarn: "自动清理不可恢复",
		retentionConfirmTitle: "开启隔离区自动清理？",
		retentionConfirmBody: "超过 {days} 天的隔离会话会被永久删除，无法恢复。保存后立即生效。",
		retentionCheck: "我已知晓：过期隔离会话会被自动删除",
		confirmRetention: "开启",
		retentionSaved: "已保存：隔离区保留 {days} 天",
		retentionOff: "已关闭隔离区自动清理",
		retentionSwept: "已清理 {n} 条过期隔离会话，释放 {size}",
		scopeNote: "统计仅含会话日志目录。附件 {size}（{files} 个）跨会话共享，删除会话不会清理；项目文件也不受影响。",
		scopeNoteShort: "仅清理会话日志；附件与项目文件不受影响。",
		tipLastUsedLabel: "最后一次在该会话发送消息的时间（来自投影缓存）",
		tipArchivedLabel: "插件首次观测到该会话进入归档集合的时间；旧记录无法回溯，显示「未记录」。",
		errRunning: "会话正在运行，请先停止",
		errNotArchived: "会话已不在归档集合",
		errFilesExist: "会话文件还在，请用移入隔离区或彻底删除",
		errFilesMissing: "会话文件已不存在，请用清理失效记录",
		errConflict: "隔离区已有同名目录",
		errInvalid: "参数无效",
		errNotFound: "隔离区条目不存在",
		errExists: "原目录已存在，无法恢复",
		errConfirm: "缺少确认",
		errStorage: "文件操作失败",
		errSchedule: "提醒停止失败",
		errGeneric: "操作失败",
	};

	var STR_EN = {
		section: "Archived sessions",
		title: "Archived session manager",
		subtitle: "Archive first, then manage in bulk. Unarchive returns a session to the sidebar; quarantine keeps the files; permanent deletion removes only the session logs.",
		tabArchived: "Archived",
		tabRemoved: "Quarantine",
		refresh: "Refresh",
		loading: "Loading…",
		failed: "Failed: {message}",
		retry: "Retry",
		emptyArchived: "No archived sessions.",
		emptyRemoved: "The quarantine is empty.",
		selectAll: "Select all",
		selected: "{n} selected",
		hide: "Move to quarantine",
		unarchive: "Unarchive",
		purge: "Delete permanently",
		restore: "Restore",
		emptyTrash: "Empty quarantine",
		hideConfirmTitle: "Move {n} session(s) to the quarantine?",
		hideConfirmBody: "The session files move into the quarantine and disappear from every DSH list; restore them later from Quarantine. Project files and attachments are not touched.",
		purgeConfirmTitle: "Permanently delete {n} session(s)?",
		purgeConfirmBody: "Only the session log directories are removed, permanently and without recovery. Project files and attachments are not touched.",
		purgeCheck: "I understand this cannot be undone",
		emptyConfirmTitle: "Empty the quarantine?",
		emptyConfirmBody: "{n} quarantined session(s) will be permanently deleted and cannot be recovered. Project files and attachments are not touched.",
		discardTitle: "Permanently delete {n} quarantined session(s)?",
		discardBody: "The quarantined session logs will be permanently deleted and cannot be recovered. Project files and attachments are not touched.",
		cancel: "Cancel",
		confirmHide: "Move to quarantine",
		confirmPurge: "Delete permanently",
		confirmEmpty: "Empty quarantine",
		confirmDiscard: "Delete permanently",
		busy: "Working…",
		restoreConfirm: "",
		restoreDone: "Restored",
		missing: "Files missing",
		running: "Running",
		resident: "Resident",
		noTitle: "(untitled)",
		size: "Size",
		workspace: "Workspace",
		created: "Created",
		movedAt: "Quarantined",
		tipMovedAtLabel: "When the session was moved into quarantine; recorded by the plugin and cleared on restore.",
		resultOk: "Done: {ok} succeeded, {fail} failed",
		resultFail: "Failed: {message}",
		forget: "Clear archive record",
		forgetConfirmTitle: "Clear {n} archive record(s)?",
		forgetConfirmBody: "These sessions no longer exist on disk; only the archive record is removed and no files are touched.",
		trashStats: "Quarantine: {n} · {size}",
		archivedStats: "Archived: {n} · up to {size} releasable",
		statsMissing: " ({n} with files missing)",
		statArchived: "Archived sessions",
		statArchivedHint: "All archive records",
		statReleasable: "Releasable space",
		statReleasableHint: "Session logs only",
		statMissing: "Files missing",
		statMissingHint: "Records only",
		statTrash: "Quarantine",
		statTrashHint: "{size} in quarantine",
		emptyTitle: "No archived sessions",
		emptyHint: "Archive a conversation from its menu and it appears here; unarchive returns it to the sidebar.",
		emptyRemovedTitle: "The quarantine is empty",
		emptyRemovedHint: "Quarantined sessions appear here and can be restored or deleted permanently.",
		badgeArchived: "Files present",
		badgeMissing: "Files missing",
		tipArchived: "The files are still on disk ({size} session directory). Unarchive returns it to the sidebar; quarantine keeps the files; only permanent deletion removes the logs.",
		tipMissing: "This session's log directory is gone; only the archive record remains. Clearing removes just this record and touches no files.",
		lastUsedLabel: "Last used",
		archivedLabel: "Archived",
		unknownTime: "not recorded",
		sizeUsed: "{size} session directory (freed by permanent deletion)",
		sizeMissing: "0 B session directory (files missing)",
		releaseLine: "About {size} will be freed (session logs only)",
		hideSummary: "Files move into the quarantine; space is freed only after the quarantine is emptied.",
		noFilesLine: "No files will be deleted",
		modalClearTitle: "Clean up {n} stale archive record(s)?",
		modalClearBody: "These sessions no longer have files; only the archive records are removed. No files are touched.",
		modalMixedBody: "{missing} row(s) have no files and only lose their records; the other {present} log(s) will be deleted permanently.",
		hideMixedBody: "{missing} row(s) have no files and only lose their records; the other {present} will be quarantined (files kept, restorable).",
		clearCheck: "I understand these archive records will be cleared",
		cleanup: "Clean up records",
		cleanupTitle: "Clean up {n} stale archive record(s)?",
		cleanupBody: "These sessions no longer have files; only the archive records are removed. No files are touched.",
		confirmCleanup: "Clean records",
		ignoredNote: "{n} record(s) with missing files are not touched by this action.",
		selectedSplit: "{n} selected ({files} with files · {missing} stale)",
		hideShort: "Move",
		cleanupShort: "Clean up",
		tipHideAction: "Move to quarantine: files are kept and can be restored",
		tipCleanupAction: "Removes only the archive record; no files are touched",
		cleanupHint: "Every selected record has no files; use Clean up records",
		selectHint: "Select sessions to act in bulk",
		confirmClear: "Clean records",
		close: "Close",
		searchPlaceholder: "Search title, workspace or ID",
		searchAria: "Search archived sessions",
		clearSearch: "Clear search",
		filterAll: "All",
		filterFiles: "With files",
		filterMissing: "Files missing",
		sortLabel: "Sort",
		sortLastUsed: "Last used",
		sortArchived: "Archived time",
		sortSize: "Size",
		sortTitle: "Title",
		sortMoved: "Quarantined",
		filteredEmpty: "No matching archived sessions",
		filteredEmptyHint: "Clear the search or switch the filter and try again.",
		clearFilters: "Clear filters",
		showing: "Showing {shown} / {total}",
		removedSearchPlaceholder: "Search quarantined sessions",
		removedSelectHint: "Select quarantined sessions to restore or delete in bulk",
		removedSelected: "{n} quarantined session(s) selected",
		removedEmptyFilter: "No matching quarantined sessions",
		discardShort: "Delete permanently",
		tipDiscardAction: "Permanently delete the quarantined session logs",
		tipUnarchiveAction: "Return to the sidebar; files stay in place (DSH native unarchive)",
		unarchiveDone: "Unarchived; the session is back in the sidebar",
		toastUnarchive: "Unarchived {n} session(s)",
		toastIgnored: ", {n} stale record(s) left untouched",
		toastHide: "Moved {n} session(s) to the quarantine (recoverable)",
		toastPurge: "Deleted {n} session(s), freed {size}",
		toastRestore: "Restored {n} session(s)",
		toastDiscard: "Permanently deleted {n} quarantined session(s), freed {size}",
		toastEmpty: "Quarantine emptied, freed {size}",
		toastCleanup: "Cleaned up {n} stale record(s)",
		toastReminders: ", stopped {n} reminder(s)",
		toastPartial: "{ok} succeeded, {fail} failed",
		reportTitle: "Partially done: {ok} succeeded, {fail} failed",
		reportMore: "{n} more failure(s) not shown",
		reportDismiss: "Dismiss",
		retentionTitle: "Quarantine retention",
		retentionLabel: "Keep for",
		retentionNever: "Never",
		retentionDays: "{n} days",
		retentionHint: "When enabled, quarantined sessions older than the limit are deleted permanently in the background. Off by default.",
		retentionWarn: "Automatic cleanup cannot be undone",
		retentionConfirmTitle: "Enable automatic quarantine cleanup?",
		retentionConfirmBody: "Quarantined sessions older than {days} days will be permanently deleted and cannot be recovered. This takes effect immediately after saving.",
		retentionCheck: "I understand expired quarantined sessions will be deleted automatically",
		confirmRetention: "Enable",
		retentionSaved: "Saved: quarantine keeps sessions for {days} days",
		retentionOff: "Automatic quarantine cleanup is off",
		retentionSwept: "Cleaned {n} expired quarantined session(s), freed {size}",
		scopeNote: "Totals cover session log directories only. Attachments ({size}, {files} files) are shared across sessions and are not removed with a session; project files are untouched.",
		scopeNoteShort: "Only session logs are removed; attachments and project files are untouched.",
		tipLastUsedLabel: "When a message was last sent in this session (from the projection cache)",
		tipArchivedLabel: "When the plugin first observed this session entering the archive set; older records cannot be recovered and show \"not recorded\".",
		errRunning: "The session is running; stop it first",
		errNotArchived: "The session is no longer archived",
		errFilesExist: "Session files still exist; use quarantine or permanent deletion",
		errFilesMissing: "Session files are gone; clean the stale record instead",
		errConflict: "A directory with the same name already exists in the quarantine",
		errInvalid: "Invalid request",
		errNotFound: "The quarantine entry does not exist",
		errExists: "The original directory already exists; cannot restore",
		errConfirm: "Confirmation is missing",
		errStorage: "The file operation failed",
		errSchedule: "Failed to stop reminders",
		errGeneric: "The operation failed",
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

	function summarize(results) {
		var summary = { ok: 0, fail: 0, bytes: 0, reminders: 0, failures: [] };
		(Array.isArray(results) ? results : []).forEach(function (result) {
			if (result && result.ok === true) {
				summary.ok += 1;
				summary.bytes += Number(result.bytes) || 0;
				summary.reminders += Number(result.reminders) || 0;
			} else {
				summary.fail += 1;
				summary.failures.push(result || { code: "storage" });
			}
		});
		return summary;
	}
	var CSS = [
		".am-page{display:flex;flex-direction:column;gap:20px;max-width:1080px;padding:6px 0 40px;font-size:12px;color:var(--dsw-alias-label-primary,#e8ecff)}",
		".am-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}",
		".am-head-text{flex:1 1 auto;min-width:0}",
		".am-title{font-size:16px;line-height:1.35;font-weight:600}",
		".am-sub{font-size:12px;line-height:1.75;color:var(--dsw-alias-label-secondary,#8a93a6);margin-top:6px;max-width:720px}",
		".am-btn{height:30px;padding:0 13px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.32));background:transparent;color:var(--dsw-alias-label-primary,#e8ecff);font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:6px}",
		".am-btn{transition:background .12s ease,border-color .12s ease,color .12s ease}",
		".am-btn:hover:not(:disabled){background:var(--dsw-alias-bg-l1,rgba(127,127,127,.08))}",
		".am-btn:focus-visible,.am-tab:focus-visible,.am-check:focus-visible{outline:2px solid var(--dsw-alias-button-info-fill,#3b82f6);outline-offset:2px}",
		".am-btn:disabled{opacity:.4;cursor:not-allowed}",
		".am-btn.primary{border-color:var(--dsw-alias-state-success-primary,#4cc38a);color:var(--dsw-alias-state-success-primary,#4cc38a)}",
		".am-btn.danger{border-color:var(--dsw-alias-state-error-primary,#ff6b6b);color:var(--dsw-alias-state-error-primary,#ff6b6b)}",
		".am-btn.danger:hover:not(:disabled){background:rgba(217,45,32,.08)}",
		".am-btn.hazard{background:#d92d20;border-color:#d92d20;color:#fff;font-weight:600}",
		".am-btn.hazard:hover:not(:disabled){background:#b42318;border-color:#b42318}",
		".am-btn.batch{height:30px;padding:0 11px;font-size:11px}",
		".am-tabs{display:inline-flex;align-self:flex-start;gap:4px;padding:4px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:10px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-tab{height:30px;padding:0 16px;border-radius:7px;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#8a93a6);font-size:12px;cursor:pointer}",
		".am-tab:hover{color:var(--dsw-alias-label-primary,#e8ecff)}",
		".am-tab.active{background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16));color:var(--dsw-alias-label-primary,#e8ecff);font-weight:600}",
		".am-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}",
		".am-stat{padding:12px 14px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:10px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.04));min-width:0}",
		".am-stat-label{font-size:11px;line-height:1.4;color:var(--dsw-alias-label-secondary,#8a93a6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
		".am-stat-value{font-size:18px;line-height:1.3;font-weight:600;margin-top:4px;font-variant-numeric:tabular-nums}",
		".am-stat-hint{font-size:10px;line-height:1.4;margin-top:3px;color:var(--dsw-alias-label-secondary,#8a93a6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
		".am-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:10px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.03))}",
		".am-toolbar-group{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
		".am-toolbar.active{border-color:rgba(59,130,246,.45);background:rgba(59,130,246,.05)}",
		".am-spacer{flex:1 1 auto}",
		".am-stats{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
		".am-search{display:flex;align-items:center;gap:8px;flex:1 1 260px;min-width:200px;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#e8ecff)}",
		".am-search:focus-within{border-color:var(--dsw-alias-button-info-fill,#3b82f6);box-shadow:0 0 0 2px rgba(59,130,246,.15)}",
		".am-search input{flex:1 1 auto;min-width:0;border:0;outline:0;background:transparent;color:inherit;font-size:12px;appearance:none}",
		".am-search input::placeholder{color:var(--dsw-alias-label-secondary,#8a93a6);opacity:.8}",
		".am-search-icon{display:flex;flex:none;color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-search-clear{width:20px;height:20px;border:0;border-radius:50%;background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16));color:var(--dsw-alias-label-secondary,#8a93a6);font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}",
		".am-search-clear:hover{color:var(--dsw-alias-label-primary,#e8ecff)}",
		".am-filter{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:9px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-chip{height:26px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#8a93a6);font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}",
		".am-chip.active{background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16));color:var(--dsw-alias-label-primary,#e8ecff);font-weight:600}",
		".am-chip-count{font-size:10px;opacity:.7;font-variant-numeric:tabular-nums}",
		".am-sort{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary,#8a93a6);white-space:nowrap}",
		".am-select{position:relative;display:inline-flex;min-width:0;font-size:11px}",
		".am-select-trigger{height:30px;min-width:104px;padding:0 8px 0 10px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary,#e8ecff);font-size:11px;display:inline-flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;white-space:nowrap;transition:border-color .12s ease,background .12s ease}",
		".am-select-trigger:hover{background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-select-trigger:disabled{opacity:.55;cursor:not-allowed}",
		".am-select-trigger:focus-visible{outline:2px solid rgba(59,130,246,.35);outline-offset:1px;border-color:var(--dsw-alias-button-info-fill,#3b82f6)}",
		".am-select-trigger.open{border-color:var(--dsw-alias-button-info-fill,#3b82f6)}",
		".am-select-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
		".am-select-chevron{display:flex;flex:none;color:var(--dsw-alias-label-secondary,#8a93a6);transition:transform .15s ease}",
		".am-select-trigger.open .am-select-chevron{transform:rotate(180deg)}",
		".am-select-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:100;min-width:100%;width:max-content;max-width:240px;padding:4px;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.3));border-radius:10px;background:var(--dsw-alias-bg-overlay,#1c2030);box-shadow:0 12px 28px rgba(0,0,0,.18);animation:am-menu .12s ease-out;transform-origin:top left}",
		".am-select-right .am-select-menu{left:auto;right:0;transform-origin:top right}",
		".am-select-option{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:7px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#e8ecff);font-size:11px;line-height:1.4;text-align:left;cursor:pointer;white-space:nowrap;transition:background .1s ease,color .1s ease}",
		".am-select-option:hover,.am-select-option:focus-visible{background:var(--dsw-alias-bg-l2,rgba(127,127,127,.16))}",
		".am-select-option:focus-visible{outline:2px solid rgba(59,130,246,.45);outline-offset:-2px}",
		".am-select-option.selected,.am-select-option.selected:hover,.am-select-option.selected:focus-visible{background:rgba(59,130,246,.14);color:var(--dsw-alias-button-info-fill,#3b82f6);font-weight:600}",
		".am-select-check{font-size:11px;line-height:1}",
		".am-scope{font-size:11px;line-height:1.65;color:var(--dsw-alias-label-secondary,#8a93a6);padding:0 2px}",
		".am-meta-label{text-decoration:underline dotted;text-underline-offset:2px;cursor:help}",
		".am-report{display:flex;flex-direction:column;gap:7px;padding:10px 12px;border:1px solid rgba(232,178,91,.35);border-radius:10px;background:rgba(232,178,91,.06)}",
		".am-report-title{font-size:12px;font-weight:600;color:var(--dsw-alias-state-warning-primary,#d97706)}",
		".am-report-list{display:flex;flex-direction:column;gap:3px;font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-report-item{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
		".am-report-actions{display:flex;justify-content:flex-end}",
		".am-retention{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:10px;background:var(--dsw-alias-bg-l1,rgba(127,127,127,.03));font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-retention-label{font-weight:600;color:var(--dsw-alias-label-primary,#e8ecff)}",
		".am-retention-hint{flex:1 1 300px;min-width:220px}",
		".am-retention-warn{color:var(--dsw-alias-state-warning-primary,#d97706);font-weight:500}",
		".am-empty-actions{display:flex;gap:8px;margin-top:2px}",
		".am-list{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));border-radius:12px;overflow:hidden}",
		".am-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.12));background:transparent}",
		".am-row:last-child{border-bottom:none}",
		".am-row{transition:background .12s ease}",
		".am-row:hover{background:var(--dsw-alias-bg-l1,rgba(127,127,127,.05))}",
		".am-row-plain{grid-template-columns:minmax(0,1fr) auto}",
		".am-main{min-width:0;display:flex;flex-direction:column;gap:3px}",
		".am-titleline{display:flex;align-items:center;gap:8px;min-width:0}",
		".am-row-title{flex:0 1 auto;min-width:0;font-size:13px;line-height:1.45;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
		".am-row-meta{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary,#8a93a6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}",
		".am-row-times{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:18px;row-gap:3px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.6}",
		".am-time{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}",
		".am-time-value{font-variant-numeric:tabular-nums}",
		".am-row-actions{display:flex;align-items:center;gap:8px;justify-self:end;flex-wrap:wrap;justify-content:flex-end}",
		".am-badges{display:flex;align-items:center;gap:6px;flex:none}",
		".am-badge{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:6px;font-size:10px;line-height:1;font-weight:500;border:1px solid transparent;background:var(--dsw-alias-bg-l2,rgba(127,127,127,.14));color:var(--dsw-alias-label-secondary,#8a93a6);cursor:help;white-space:nowrap}",
		".am-badge.ok{color:var(--dsw-alias-state-success-primary,#4cc38a);background:rgba(76,195,138,.1);border-color:rgba(76,195,138,.25)}",
		".am-badge.warn{color:var(--dsw-alias-state-warning-primary,#e8b25b);background:rgba(232,178,91,.1);border-color:rgba(232,178,91,.25)}",
		".am-badge.danger{color:var(--dsw-alias-state-error-primary,#ff6b6b);background:rgba(255,107,107,.1);border-color:rgba(255,107,107,.25)}",
		".am-badge.muted{color:var(--dsw-alias-label-secondary,#8a93a6);background:var(--dsw-alias-bg-l2,rgba(127,127,127,.12))}",
		".am-check{width:16px;height:16px;flex:none;accent-color:var(--dsw-alias-button-info-fill,#3b82f6);cursor:pointer}",
		".am-check:disabled{cursor:not-allowed;opacity:.5}",
		".am-checkline{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-primary,#e8ecff);cursor:pointer}",
		".am-empty-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:52px 20px;border:1px dashed var(--dsw-alias-border-l2,rgba(127,127,127,.32));border-radius:12px;text-align:center}",
		".am-empty-icon{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-l2,rgba(127,127,127,.12));color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-empty-title{font-size:13px;font-weight:600}",
		".am-empty-hint{font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary,#8a93a6);max-width:420px}",
		".am-empty{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary,#8a93a6);padding:18px 12px;text-align:center}",
		".am-modal-backdrop{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.5);backdrop-filter:blur(3px);animation:am-fade .12s ease-out}",
		".am-modal{width:min(460px,100%);max-height:calc(100vh - 80px);overflow:auto;display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:14px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));background:var(--dsw-alias-bg-overlay,#1c2030);box-shadow:0 20px 48px rgba(0,0,0,.5);outline:none;animation:am-pop .14s ease-out}",
		".am-modal.danger{border-color:rgba(217,45,32,.55)}",
		".am-modal-title{font-size:15px;line-height:1.4;font-weight:600}",
		".am-modal-body{font-size:12px;line-height:1.75;color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-modal-summary{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:4px}",
		".am-modal-actions .am-btn{height:32px;padding:0 16px}",
		".am-toast{font-size:12px;line-height:1.55;padding:9px 12px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18))}",
		".am-toast.ok{color:var(--dsw-alias-state-success-primary,#4cc38a)}",
		".am-toast.bad{color:var(--dsw-alias-state-error-primary,#ff6b6b)}",
		".am-error-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 20px;border:1px solid rgba(217,45,32,.22);border-radius:12px;background:rgba(217,45,32,.04);text-align:center}",
		".am-error-icon{display:flex;color:var(--dsw-alias-state-error-primary,#d92d20)}",
		".am-error-text{font-size:12px;line-height:1.7;color:var(--dsw-alias-state-error-primary,#d92d20);max-width:560px}",
		".am-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:64px 0;font-size:12px;color:var(--dsw-alias-label-secondary,#8a93a6)}",
		".am-spinner{width:16px;height:16px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));border-top-color:var(--dsw-alias-button-info-fill,#3b82f6);animation:am-spin .8s linear infinite}",
		"@keyframes am-spin{to{transform:rotate(360deg)}}",
		"@keyframes am-fade{from{opacity:0}to{opacity:1}}",
		"@keyframes am-pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}",
		"@keyframes am-menu{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}",
		"@media (prefers-reduced-motion:reduce){.am-modal,.am-modal-backdrop,.am-spinner,.am-select-menu{animation:none}}",
		"@media (max-width:980px){.am-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}",
		"@media (max-width:420px){.am-stats-grid{grid-template-columns:minmax(0,1fr)}}",
		"@media (max-width:860px){.am-row{grid-template-columns:24px minmax(0,1fr)}.am-row-actions{grid-column:2;justify-self:start;padding-top:6px}.am-row-plain{grid-template-columns:minmax(0,1fr)}.am-row-plain .am-row-actions{grid-column:1}}",
		"@media (max-width:720px){.am-search{flex-basis:100%}.am-sort{margin-left:auto}}",
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
			if (silent !== true) {
				setPhase("loading");
				setError(null);
				setReport(null);
			}
			return Promise.all([
				request("/list"),
				request("/settings").catch(function () { return null; })
			]).then(function (pair) {
				var data = pair[0] || {};
				var settingsData = pair[1];
				var nextItems = Array.isArray(data.items) ? data.items : [];
				var nextRemoved = Array.isArray(data.removed) ? data.removed : [];
				setItems(nextItems);
				setRemoved(nextRemoved);
				setAttachments(data.attachments && typeof data.attachments === "object"
					? { bytes: Number(data.attachments.bytes) || 0, files: Number(data.attachments.files) || 0 }
					: { bytes: 0, files: 0 });
				if (settingsData && settingsData.settings) {
					setSettings({ trashRetentionDays: Number(settingsData.settings.trashRetentionDays) || 0 });
				}
				if (opts.keepSelection === true) {
					var allowedItems = {};
					nextItems.forEach(function (item) { allowedItems[item.id] = true; });
					setSelected(function (current) {
						return current.filter(function (id) { return allowedItems[id] === true; });
					});
					var allowedEntries = {};
					nextRemoved.forEach(function (entry) { allowedEntries[keyOf(entry)] = true; });
					setRemovedSelected(function (current) {
						return current.filter(function (key) { return allowedEntries[key] === true; });
					});
				} else {
					setSelected([]);
					setRemovedSelected([]);
				}
				setPhase("ready");
			}).catch(function (failure) {
				if (silent) return;
				setError(String(failure && failure.message ? failure.message : failure));
				setPhase("failed");
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
				if (event.key === "Escape" && busy !== true) {
					event.preventDefault();
					setConfirm(null);
					return;
				}
				if (event.key !== "Tab" || !confirmRef.current) return;
				var nodes = Array.prototype.slice.call(confirmRef.current.querySelectorAll(
					"button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]"
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
			if (confirmRef.current && typeof confirmRef.current.focus === "function") confirmRef.current.focus();
			return function () { document.removeEventListener("keydown", onKey); };
		}, [confirm, busy]);

		useEffect(function () {
			var last = 0;
			function refresh() {
				if (busy === true || confirm !== null) return;
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
		}, [busy, confirm]);

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
		var sortedItems = filteredItems.slice().sort(compareItems);
		var filteredRemoved = removed.filter(function (entry) {
			return normalizedRemovedQuery === "" || entryText(entry).indexOf(normalizedRemovedQuery) >= 0;
		});
		var sortedRemoved = filteredRemoved.slice().sort(compareRemoved);

		var filesCount = items.filter(function (item) { return !item.missing; }).length;
		var missingCount = items.filter(function (item) { return item.missing; }).length;
		var archivedBytes = items.reduce(function (sum, item) { return sum + (item.sizeBytes || 0); }, 0);
		var removedBytes = removed.reduce(function (sum, entry) { return sum + (entry.bytes || 0); }, 0);
		var selectable = sortedItems.filter(function (item) { return !item.running; });
		var allSelected = selectable.length > 0 && selectable.every(function (item) { return selected.indexOf(item.id) >= 0; });
		var selectedItems = items.filter(function (item) { return selected.indexOf(item.id) >= 0; });
		var selectedWithFiles = selectedItems.filter(function (item) { return !item.missing && !item.running; });
		var selectedMissing = selectedItems.filter(function (item) { return item.missing; });
		var allRemovedSelected = sortedRemoved.length > 0 && sortedRemoved.every(function (entry) { return removedSelected.indexOf(keyOf(entry)) >= 0; });
		var selectedRemovedEntries = removed.filter(function (entry) { return removedSelected.indexOf(keyOf(entry)) >= 0; });

		useEffect(function () {
			setSelected(function (current) {
				var allowed = {};
				sortedItems.forEach(function (item) { allowed[item.id] = true; });
				var next = current.filter(function (id) { return allowed[id] === true; });
				return next.length === current.length ? current : next;
			});
			setRemovedSelected(function (current) {
				var allowed = {};
				sortedRemoved.forEach(function (entry) { allowed[keyOf(entry)] = true; });
				var next = current.filter(function (key) { return allowed[key] === true; });
				return next.length === current.length ? current : next;
			});
		}, [query, filter, removedQuery]);

		function syncAllRef(node) {
			if (node) node.indeterminate = selected.length > 0 && !allSelected;
		}

		function syncRemovedRef(node) {
			if (node) node.indeterminate = removedSelected.length > 0 && !allRemovedSelected;
		}

		function toggle(id) {
			setSelected(function (current) {
				return current.indexOf(id) >= 0
					? current.filter(function (value) { return value !== id; })
					: current.concat([id]);
			});
		}

		function toggleAll() {
			setSelected(allSelected ? [] : selectable.map(function (item) { return item.id; }));
		}

		function toggleRemoved(key) {
			setRemovedSelected(function (current) {
				return current.indexOf(key) >= 0
					? current.filter(function (value) { return value !== key; })
					: current.concat([key]);
			});
		}

		function toggleAllRemoved() {
			setRemovedSelected(allRemovedSelected ? [] : sortedRemoved.map(keyOf));
		}

		function clearFilters() {
			setQuery("");
			setFilter("all");
		}

		function clearRemovedFilters() {
			setRemovedQuery("");
		}

		function failureTitle(failure) {
			var id = failure && failure.id;
			var item = items.filter(function (candidate) { return candidate.id === id; })[0];
			if (item) return item.title || item.id;
			var entry = removed.filter(function (candidate) { return candidate.id === id; })[0];
			if (entry) return entry.title || entry.id;
			return id || tr("errGeneric");
		}

		function failureReason(failure) {
			return errorText(failure && failure.code, failure && failure.error);
		}

		function reminderText(count) {
			return count > 0 ? tr("toastReminders", { n: count }) : "";
		}

		function finish(summary, meta) {
			setBusy(false);
			setConfirm(null);
			var failures = summary.failures || [];
			if (meta.scope === "removed") {
				var keys = [];
				failures.forEach(function (failure) {
					var entry = removed.filter(function (candidate) { return candidate.id === failure.id; })[0];
					if (entry) keys.push(keyOf(entry));
				});
				setRemovedSelected(keys);
				setSelected([]);
			} else {
				var kept = Array.isArray(meta.keepIds) ? meta.keepIds : [];
				var nextSelected = failures.map(function (failure) { return failure.id; }).filter(Boolean);
				kept.forEach(function (id) {
					if (nextSelected.indexOf(id) < 0) nextSelected.push(id);
				});
				setSelected(nextSelected);
				setRemovedSelected([]);
			}
			if (failures.length > 0) {
				setReport({
					title: tr("reportTitle", { ok: summary.ok, fail: summary.fail }),
					failures: failures.slice(0, 4).map(function (failure) {
						return { title: failureTitle(failure), reason: failureReason(failure) };
					}),
					more: failures.length > 4 ? failures.length - 4 : 0
				});
				setToast({
					kind: "bad",
					text: tr("toastPartial", { ok: summary.ok, fail: summary.fail })
						+ "：" + failureTitle(failures[0]) + " · " + failureReason(failures[0])
				});
			} else {
				setReport(null);
				setToast({
					kind: "ok",
					text: typeof meta.ok === "function" ? meta.ok(summary) : tr("resultOk", { ok: summary.ok, fail: 0 })
				});
			}
			void load({ silent: true, keepSelection: true });
		}

		function failRequest(failure) {
			setBusy(false);
			setConfirm(null);
			setToast({
				kind: "bad",
				text: tr("resultFail", { message: errorText(failure && failure.code, failure && failure.message) })
			});
		}

		function runAction(path, body, meta) {
			setBusy(true);
			setReport(null);
			request(path, body).then(function (data) {
				finish(summarize(data && data.results), meta);
			}).catch(failRequest);
		}

		function runUnarchive(ids, keepIds) {
			var kept = Array.isArray(keepIds) ? keepIds : [];
			runAction("/unarchive", { ids: ids }, {
				scope: "archived",
				keepIds: kept,
				ok: function (summary) {
					return tr("toastUnarchive", { n: summary.ok }) + (kept.length > 0 ? tr("toastIgnored", { n: kept.length }) : "");
				}
			});
		}

		function runHide(ids, keepIds) {
			runAction("/hide", { ids: ids }, {
				scope: "archived",
				keepIds: Array.isArray(keepIds) ? keepIds : [],
				ok: function (summary) {
					return tr("toastHide", { n: summary.ok }) + reminderText(summary.reminders)
						+ (Array.isArray(keepIds) && keepIds.length > 0 ? tr("toastIgnored", { n: keepIds.length }) : "");
				}
			});
		}

		function runPurge(ids, keepIds) {
			runAction("/purge", { ids: ids, confirm: "PURGE" }, {
				scope: "archived",
				keepIds: Array.isArray(keepIds) ? keepIds : [],
				ok: function (summary) {
					return tr("toastPurge", { n: summary.ok, size: fmtSize(summary.bytes) }) + reminderText(summary.reminders)
						+ (Array.isArray(keepIds) && keepIds.length > 0 ? tr("toastIgnored", { n: keepIds.length }) : "");
				}
			});
		}

		function runCleanup(ids) {
			runAction("/forget", { ids: ids }, {
				scope: "archived",
				ok: function (summary) { return tr("toastCleanup", { n: summary.ok }) + reminderText(summary.reminders); }
			});
		}

		function runRestore(items) {
			runAction("/restore", { items: items }, {
				scope: "removed",
				ok: function (summary) { return tr("toastRestore", { n: summary.ok }); }
			});
		}

		function runDiscard(items) {
			runAction("/discard", { items: items, confirm: "DISCARD" }, {
				scope: "removed",
				ok: function (summary) { return tr("toastDiscard", { n: summary.ok, size: fmtSize(summary.bytes) }) + reminderText(summary.reminders); }
			});
		}

		function removedItems(entries) {
			return entries.map(function (entry) { return { batch: entry.batch, id: entry.id }; });
		}

		function runEmpty() {
			setBusy(true);
			setReport(null);
			request("/empty-trash", { confirm: "EMPTY" }).then(function (data) {
				setBusy(false);
				setConfirm(null);
				setRemovedSelected([]);
				setToast({ kind: "ok", text: tr("toastEmpty", { size: fmtSize(data && data.bytes) }) });
				void load({ silent: true, keepSelection: true });
			}).catch(failRequest);
		}

		function runRetention(days) {
			setBusy(true);
			setReport(null);
			request("/settings/save", { trashRetentionDays: days }).then(function (data) {
				setBusy(false);
				setConfirm(null);
				if (data && data.settings) setSettings({ trashRetentionDays: Number(data.settings.trashRetentionDays) || 0 });
				var text = days === 0 ? tr("retentionOff") : tr("retentionSaved", { days: days });
				if (data && data.swept && data.swept.removed > 0) {
					text += " · " + tr("retentionSwept", { n: data.swept.removed, size: fmtSize(data.swept.bytes) });
				}
				setToast({ kind: "ok", text: text });
				void load({ silent: true, keepSelection: true });
			}).catch(failRequest);
		}

		function changeRetention(value) {
			var days = Number(value);
			if (days === settings.trashRetentionDays) return;
			if (days === 0) {
				runRetention(0);
				return;
			}
			setConfirm({ kind: "retention", days: days, checked: false });
		}

		function rowBadges(item) {
			var badges = [];
			if (item.running) badges.push(h("span", { key: "run", className: "am-badge danger" }, tr("running")));
			else if (item.resident) badges.push(h("span", { key: "res", className: "am-badge warn" }, tr("resident")));
			badges.push(item.missing
				? h("span", { key: "status", className: "am-badge muted", title: tr("tipMissing") }, tr("badgeMissing"))
				: h("span", {
					key: "status",
					className: "am-badge ok",
					title: tr("tipArchived", { size: fmtSize(item.sizeBytes) })
				}, tr("badgeArchived")));
			return badges;
		}

		function archivedRow(item) {
			var checked = selected.indexOf(item.id) >= 0;
			var workspace = item.workspace && item.workspace.title ? item.workspace.title : "—";
			var firstMeta = [
				workspace,
				item.missing ? tr("sizeMissing") : tr("sizeUsed", { size: fmtSize(item.sizeBytes) })
			].join(" · ");
			var lastUsedValue = typeof item.lastUsedAt === "number" ? fmtTime(item.lastUsedAt) : "—";
			var archivedValue = typeof item.archivedAt === "number" ? fmtTime(item.archivedAt) : tr("unknownTime");
			var actions = item.missing
				? h("button", {
					key: "cleanup",
					type: "button",
					className: "am-btn batch",
					disabled: busy,
					title: tr("tipCleanupAction"),
					onClick: function () { setConfirm({ kind: "cleanup", ids: [item.id], checked: true }); }
				}, tr("cleanupShort"))
				: [
					h("button", {
						key: "unarchive",
						type: "button",
						className: "am-btn batch",
						disabled: busy || item.running,
						title: tr("tipUnarchiveAction"),
						onClick: function () { runUnarchive([item.id]); }
					}, tr("unarchive")),
					h("button", {
						key: "hide",
						type: "button",
						className: "am-btn batch",
						disabled: busy || item.running,
						title: tr("tipHideAction"),
						onClick: function () { setConfirm({ kind: "hide", ids: [item.id], checked: true }); }
					}, tr("hide")),
					h("button", {
						key: "purge",
						type: "button",
						className: "am-btn batch danger",
						disabled: busy || item.running,
						title: tr("scopeNoteShort"),
						onClick: function () { setConfirm({ kind: "purge", ids: [item.id], checked: false }); }
					}, tr("purge"))
				];
			return h("div", { key: item.id, className: "am-row", role: "listitem" }, [
				h("input", {
					key: "check",
					type: "checkbox",
					className: "am-check",
					checked: checked,
					disabled: Boolean(item.running),
					onChange: function () { toggle(item.id); },
					"aria-label": item.title || item.id
				}),
				h("div", { key: "main", className: "am-main" }, [
					h("div", { key: "titleline", className: "am-titleline" }, [
						h("div", { key: "title", className: "am-row-title", title: item.title || item.id }, item.title || tr("noTitle")),
						h("div", { key: "badges", className: "am-badges" }, rowBadges(item))
					]),
					h("div", { key: "meta1", className: "am-row-meta", title: firstMeta }, firstMeta),
					h("div", { key: "meta2", className: "am-row-meta am-row-times" }, [
						timeItem("lu", tr("lastUsedLabel"), tr("tipLastUsedLabel"), lastUsedValue),
						timeItem("ar", tr("archivedLabel"), tr("tipArchivedLabel"), archivedValue)
					])
				]),
				h("div", { key: "actions", className: "am-row-actions" }, actions)
			]);
		}

		function removedRow(entry) {
			var key = keyOf(entry);
			var checked = removedSelected.indexOf(key) >= 0;
			var workspace = entry.workspace || "—";
			var firstMeta = [workspace, fmtSize(entry.bytes)].join(" · ");
			return h("div", { key: key, className: "am-row", role: "listitem" }, [
				h("input", {
					key: "check",
					type: "checkbox",
					className: "am-check",
					checked: checked,
					disabled: busy,
					onChange: function () { toggleRemoved(key); },
					"aria-label": entry.title || entry.id
				}),
				h("div", { key: "main", className: "am-main" }, [
					h("div", { key: "titleline", className: "am-titleline" }, [
						h("div", { key: "title", className: "am-row-title", title: entry.title || entry.id }, entry.title || tr("noTitle"))
					]),
					h("div", { key: "meta1", className: "am-row-meta", title: firstMeta }, firstMeta),
					h("div", { key: "meta2", className: "am-row-meta am-row-times" }, [
						timeItem("mv", tr("movedAt"), tr("tipMovedAtLabel"), fmtTime(entry.movedAt)),
						h("span", { key: "age", className: "am-time am-time-age" }, fmtAge(entry.movedAt))
					])
				]),
				h("div", { key: "actions", className: "am-row-actions" }, [
					h("button", {
						key: "restore",
						type: "button",
						className: "am-btn batch primary",
						disabled: busy,
						onClick: function () { runRestore([{ batch: entry.batch, id: entry.id }]); }
					}, tr("restore")),
					h("button", {
						key: "discard",
						type: "button",
						className: "am-btn batch danger",
						disabled: busy,
						title: tr("tipDiscardAction"),
						onClick: function () {
							setConfirm({
								kind: "discard",
								items: [{ batch: entry.batch, id: entry.id }],
								checked: false
							});
						}
					}, tr("discardShort"))
				])
			]);
		}

		function statCard(key, label, value, hint) {
			return h("div", { key: key, className: "am-stat" }, [
				h("div", { key: "label", className: "am-stat-label" }, label),
				h("div", { key: "value", className: "am-stat-value" }, value),
				hint ? h("div", { key: "hint", className: "am-stat-hint" }, hint) : null
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
			var isHide = kind === "hide";
			var isPurge = kind === "purge";
			var isEmpty = kind === "empty";
			var isCleanup = kind === "cleanup";
			var isDiscard = kind === "discard";
			var isRetention = kind === "retention";
			var ids = Array.isArray(confirm.ids) ? confirm.ids : [];
			var targets = items.filter(function (item) { return ids.indexOf(item.id) >= 0; });
			var chosenRemoved = isDiscard
				? removed.filter(function (entry) {
					return (confirm.items || []).some(function (item) {
						return item && item.batch === entry.batch && item.id === entry.id;
					});
				})
				: [];
			var count = isEmpty ? removed.length : isDiscard ? chosenRemoved.length : ids.length;
			var ignored = Number(confirm.ignored) || 0;
			var bytes = isDiscard
				? chosenRemoved.reduce(function (sum, entry) { return sum + (entry.bytes || 0); }, 0)
				: isEmpty
					? removedBytes
					: targets.reduce(function (sum, item) { return sum + (item.sizeBytes || 0); }, 0);
			var danger = isPurge || isEmpty || isDiscard || isRetention;
			var title;
			var bodyText;
			var summary;
			var confirmLabel;
			var buttonClass;
			var run;
			if (isHide) {
				title = tr("hideConfirmTitle", { n: count });
				bodyText = tr("hideConfirmBody");
				summary = tr("hideSummary");
				confirmLabel = tr("confirmHide");
				buttonClass = "primary";
				run = function () { runHide(ids, confirm.ignoredIds); };
			} else if (isPurge) {
				title = tr("purgeConfirmTitle", { n: count });
				bodyText = tr("purgeConfirmBody");
				summary = tr("releaseLine", { size: fmtSize(bytes) });
				confirmLabel = tr("confirmPurge");
				buttonClass = "hazard";
				run = function () { runPurge(ids, confirm.ignoredIds); };
			} else if (isEmpty) {
				title = tr("emptyConfirmTitle");
				bodyText = tr("emptyConfirmBody", { n: count });
				summary = tr("releaseLine", { size: fmtSize(bytes) });
				confirmLabel = tr("confirmEmpty");
				buttonClass = "hazard";
				run = function () { runEmpty(); };
			} else if (isCleanup) {
				title = tr("cleanupTitle", { n: count });
				bodyText = tr("cleanupBody");
				summary = "";
				confirmLabel = tr("confirmCleanup");
				buttonClass = "";
				run = function () { runCleanup(ids); };
			} else if (isDiscard) {
				title = tr("discardTitle", { n: count });
				bodyText = tr("discardBody");
				summary = tr("releaseLine", { size: fmtSize(bytes) });
				confirmLabel = tr("confirmDiscard");
				buttonClass = "hazard";
				run = function () { runDiscard(confirm.items || []); };
			} else {
				title = tr("retentionConfirmTitle");
				bodyText = tr("retentionConfirmBody", { days: confirm.days });
				summary = tr("retentionWarn");
				confirmLabel = tr("confirmRetention");
				buttonClass = "hazard";
				run = function () { runRetention(confirm.days); };
			}
			if (ignored > 0 && (isHide || isPurge)) {
				bodyText = bodyText + " " + tr("ignoredNote", { n: ignored });
			}
			var actions = [
				h("button", {
					key: "cancel",
					type: "button",
					className: "am-btn",
					disabled: busy,
					onClick: function () { setConfirm(null); }
				}, tr("cancel"))
			];
			actions.push(h("button", {
				key: "go",
				type: "button",
				className: "am-btn " + buttonClass,
				disabled: busy || (danger && confirm.checked !== true),
				onClick: run
			}, confirmLabel));
			return h("div", {
				className: "am-modal-backdrop",
				onMouseDown: function (event) {
					if (event.target === event.currentTarget && busy !== true) setConfirm(null);
				}
			}, [
				h("div", {
					key: "card",
					className: "am-modal" + (danger ? " danger" : ""),
					ref: confirmRef,
					tabIndex: -1,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": title,
					onMouseDown: function (event) { event.stopPropagation(); }
				}, [
					h("div", { key: "title", className: "am-modal-title" }, title),
					h("div", { key: "body", className: "am-modal-body" }, bodyText),
					summary ? h("div", { key: "summary", className: "am-modal-summary" }, summary) : null,
					danger ? h("label", { key: "check", className: "am-checkline" }, [
						h("input", {
							key: "box",
							type: "checkbox",
							className: "am-check",
							checked: confirm.checked === true,
							onChange: function (event) {
								setConfirm(Object.assign({}, confirm, { checked: event.target.checked }));
							}
						}),
						h("span", { key: "text" }, isRetention ? tr("retentionCheck") : tr("purgeCheck"))
					]) : null,
					h("div", { key: "actions", className: "am-modal-actions" }, actions)
				])
			]);
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
				onClick: function () { setFilter(id); }
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
				closeAndFocus();
				onChange(next);
			}

			function toggle(event) {
				if (busy === true) return;
				if (open) {
					setMenu(null);
					if (typeof event.currentTarget.focus === "function") event.currentTarget.focus();
					return;
				}
				menuTriggerRef.current = event.currentTarget;
				setMenu(id);
			}

			function onTriggerKey(event) {
				if (busy === true) return;
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
					"aria-disabled": busy === true,
					"aria-label": ariaLabel,
					disabled: busy === true,
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

		var children = [];
		children.push(h("div", { key: "head", className: "am-head" }, [
			h("div", { key: "text", className: "am-head-text" }, [
				h("div", { key: "title", className: "am-title" }, tr("title")),
				h("div", { key: "sub", className: "am-sub" }, tr("subtitle"))
			]),
			h("button", {
				key: "refresh",
				type: "button",
				className: "am-btn",
				disabled: busy || phase === "loading",
				onClick: function () { void load(); }
			}, tr("refresh"))
		]));

		if (toast !== null) {
			children.push(h("div", {
				key: "toast",
				className: "am-toast " + (toast.kind === "ok" ? "ok" : "bad"),
				role: "status",
				"aria-live": "polite"
			}, toast.text));
		}

		children.push(h("div", { key: "tabs", className: "am-tabs", role: "tablist", "aria-label": tr("title") }, [
			h("button", {
				key: "archived",
				type: "button",
				role: "tab",
				"aria-selected": tab === "archived",
				className: "am-tab" + (tab === "archived" ? " active" : ""),
				onClick: function () { setTab("archived"); setConfirm(null); setReport(null); }
			}, tr("tabArchived") + " (" + items.length + ")"),
			h("button", {
				key: "removed",
				type: "button",
				role: "tab",
				"aria-selected": tab === "removed",
				className: "am-tab" + (tab === "removed" ? " active" : ""),
				onClick: function () { setTab("removed"); setConfirm(null); setReport(null); }
			}, tr("tabRemoved") + " (" + removed.length + ")")
		]));

		if (phase === "loading") {
			children.push(h("div", { key: "loading", className: "am-loading" }, [
				h("span", { key: "spinner", className: "am-spinner" }),
				h("span", { key: "text" }, tr("loading"))
			]));
		} else if (phase === "failed") {
			children.push(h("div", { key: "error", className: "am-error-card" }, [
				h("div", { key: "icon", className: "am-error-icon", "aria-hidden": "true" },
					h("svg", {
						width: 24,
						height: 24,
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: 1.7,
						"stroke-linecap": "round",
						"stroke-linejoin": "round"
					}, [
						h("path", { key: "tri", d: "M12 3 2.8 20h18.4L12 3z" }),
						h("path", { key: "line", d: "M12 9v5" }),
						h("path", { key: "dot", d: "M12 17.2v.1" })
					])
				),
				h("div", { key: "text", className: "am-error-text" }, tr("failed", { message: error })),
				h("button", {
					key: "retry",
					type: "button",
					className: "am-btn batch",
					onClick: function () { void load(); }
				}, tr("retry"))
			]));
		} else {
			if (items.length > 0 || removed.length > 0) {
				children.push(h("div", { key: "stats-grid", className: "am-stats-grid" }, [
					statCard("archived", tr("statArchived"), String(items.length), tr("statArchivedHint")),
					statCard("releasable", tr("statReleasable"), fmtSize(archivedBytes), tr("statReleasableHint")),
					statCard("missing", tr("statMissing"), String(missingCount), tr("statMissingHint")),
					statCard("trash", tr("statTrash"), String(removed.length), tr("statTrashHint", { size: fmtSize(removedBytes) }))
				]));
				children.push(h("div", { key: "scope", className: "am-scope" },
					tr("scopeNote", { size: fmtSize(attachments.bytes), files: attachments.files })
				));
			}
			if (tab === "archived") {
				if (items.length === 0) {
					children.push(emptyCard("empty", tr("emptyTitle"), tr("emptyHint")));
				} else {
					children.push(h("div", { key: "controls", className: "am-controls" }, [
						h("div", { key: "search", className: "am-search" }, [
							searchGlyph(),
							h("input", {
								key: "input",
								type: "text",
								value: query,
								placeholder: tr("searchPlaceholder"),
								"aria-label": tr("searchAria"),
								onChange: function (event) { setQuery(event.target.value); }
							}),
							query !== "" ? h("button", {
								key: "clear",
								type: "button",
								className: "am-search-clear",
								"aria-label": tr("clearSearch"),
								onClick: function () { setQuery(""); }
							}, "×") : null
						]),
						h("div", { key: "filter", className: "am-filter", role: "group", "aria-label": tr("filterAll") }, [
							filterChip("all", tr("filterAll"), items.length),
							filterChip("files", tr("filterFiles"), filesCount),
							filterChip("missing", tr("filterMissing"), missingCount)
						]),
						h("div", { key: "sort", className: "am-sort" }, [
							h("span", { key: "label" }, tr("sortLabel")),
							dropdown("sort", sort, [
								{ value: "lastUsed", label: tr("sortLastUsed") },
								{ value: "archived", label: tr("sortArchived") },
								{ value: "size", label: tr("sortSize") },
								{ value: "title", label: tr("sortTitle") }
							], function (value) { setSort(value); }, tr("sortLabel"), true)
						]),
						query !== "" || filter !== "all" ? h("span", { key: "showing", className: "am-stats" },
							tr("showing", { shown: sortedItems.length, total: items.length })) : null
					]));
					if (sortedItems.length > 0) children.push(h("div", { key: "toolbar", className: "am-toolbar" + (selected.length > 0 ? " active" : "") }, [
						h("div", { key: "left", className: "am-toolbar-group" }, [
							h("label", { key: "all", className: "am-checkline" }, [
								h("input", {
									key: "box",
									type: "checkbox",
									className: "am-check",
									ref: syncAllRef,
									checked: allSelected,
									"aria-checked": selected.length > 0 && !allSelected ? "mixed" : allSelected,
									disabled: selectable.length === 0 || busy,
									onChange: toggleAll
								}),
								h("span", { key: "text" }, tr("selectAll"))
							]),
							h("span", {
								key: "count",
								className: "am-stats",
								title: selected.length > 0 && selectedWithFiles.length === 0 ? tr("cleanupHint") : undefined
							}, selected.length > 0
								? tr("selectedSplit", { n: selected.length, files: selectedWithFiles.length, missing: selectedMissing.length })
								: tr("selectHint"))
						]),
						h("div", { key: "space", className: "am-spacer" }),
						h("div", { key: "right", className: "am-toolbar-group" }, [
							h("button", {
								key: "unarchive",
								type: "button",
								className: "am-btn",
								disabled: busy || selectedWithFiles.length === 0,
								title: tr("tipUnarchiveAction"),
								onClick: function () {
									runUnarchive(selectedWithFiles.map(function (item) { return item.id; }), selectedMissing.map(function (item) { return item.id; }));
								}
							}, tr("unarchive")),
							h("button", {
								key: "hide",
								type: "button",
								className: "am-btn",
								disabled: busy || selectedWithFiles.length === 0,
								title: selectedWithFiles.length === 0 && selectedMissing.length > 0 ? tr("cleanupHint") : tr("tipHideAction"),
								onClick: function () {
									setConfirm({
										kind: "hide",
										ids: selectedWithFiles.map(function (item) { return item.id; }),
										ignored: selectedMissing.length,
										ignoredIds: selectedMissing.map(function (item) { return item.id; }),
										checked: true
									});
								}
							}, tr("hide")),
							selectedMissing.length > 0 ? h("button", {
								key: "cleanup",
								type: "button",
								className: "am-btn",
								disabled: busy,
								onClick: function () {
									setConfirm({
										kind: "cleanup",
										ids: selectedMissing.map(function (item) { return item.id; }),
										checked: true
									});
								}
							}, tr("cleanup") + " (" + selectedMissing.length + ")") : null,
							h("button", {
								key: "purge",
								type: "button",
								className: "am-btn danger",
								disabled: busy || selectedWithFiles.length === 0,
								title: selectedWithFiles.length === 0 && selectedMissing.length > 0 ? tr("cleanupHint") : tr("scopeNoteShort"),
								onClick: function () {
									setConfirm({
										kind: "purge",
										ids: selectedWithFiles.map(function (item) { return item.id; }),
										ignored: selectedMissing.length,
										ignoredIds: selectedMissing.map(function (item) { return item.id; }),
										checked: false
									});
								}
							}, tr("purge"))
						])
					]));
					if (report !== null) {
						children.push(h("div", { key: "report", className: "am-report" }, [
							h("div", { key: "title", className: "am-report-title" }, report.title),
							h("div", { key: "list", className: "am-report-list" }, report.failures.map(function (failure, index) {
								return h("div", { key: index, className: "am-report-item", title: failure.title + " · " + failure.reason },
									failure.title + " · " + failure.reason);
							})),
							report.more > 0 ? h("div", { key: "more", className: "am-report-item" }, tr("reportMore", { n: report.more })) : null,
							h("div", { key: "actions", className: "am-report-actions" },
								h("button", {
									type: "button",
									className: "am-btn batch",
									onClick: function () { setReport(null); }
								}, tr("reportDismiss"))
							)
						]));
					}
					children.push(sortedItems.length === 0
						? emptyCard("filtered", tr("filteredEmpty"), tr("filteredEmptyHint"),
							h("button", {
								key: "clear",
								type: "button",
								className: "am-btn batch",
								onClick: clearFilters
							}, tr("clearFilters")))
						: h("div", { key: "list", className: "am-list", role: "list" }, sortedItems.map(archivedRow)));
				}
			} else {
				if (removed.length > 0) {
					children.push(h("div", { key: "controls", className: "am-controls" }, [
						h("div", { key: "search", className: "am-search" }, [
							searchGlyph(),
							h("input", {
								key: "input",
								type: "text",
								value: removedQuery,
								placeholder: tr("removedSearchPlaceholder"),
								"aria-label": tr("removedSearchPlaceholder"),
								onChange: function (event) { setRemovedQuery(event.target.value); }
							}),
							removedQuery !== "" ? h("button", {
								key: "clear",
								type: "button",
								className: "am-search-clear",
								"aria-label": tr("clearSearch"),
								onClick: function () { setRemovedQuery(""); }
							}, "×") : null
						]),
						h("div", { key: "sort", className: "am-sort" }, [
							h("span", { key: "label" }, tr("sortLabel")),
							dropdown("removedSort", removedSort, [
								{ value: "movedAt", label: tr("sortMoved") },
								{ value: "size", label: tr("sortSize") },
								{ value: "title", label: tr("sortTitle") }
							], function (value) { setRemovedSort(value); }, tr("sortLabel"), true)
						]),
						removedQuery !== "" ? h("span", { key: "showing", className: "am-stats" },
							tr("showing", { shown: sortedRemoved.length, total: removed.length })) : null
					]));
					if (sortedRemoved.length > 0) children.push(h("div", { key: "toolbar", className: "am-toolbar" + (removedSelected.length > 0 ? " active" : "") }, [
						h("div", { key: "left", className: "am-toolbar-group" }, [
							h("label", { key: "all", className: "am-checkline" }, [
								h("input", {
									key: "box",
									type: "checkbox",
									className: "am-check",
									ref: syncRemovedRef,
									checked: allRemovedSelected,
									"aria-checked": removedSelected.length > 0 && !allRemovedSelected ? "mixed" : allRemovedSelected,
									disabled: sortedRemoved.length === 0 || busy,
									onChange: toggleAllRemoved
								}),
								h("span", { key: "text" }, tr("selectAll"))
							]),
							h("span", { key: "count", className: "am-stats" }, removedSelected.length > 0
								? tr("removedSelected", { n: removedSelected.length })
								: tr("removedSelectHint"))
						]),
						h("div", { key: "space", className: "am-spacer" }),
						h("div", { key: "right", className: "am-toolbar-group" }, [
							h("button", {
								key: "restore",
								type: "button",
								className: "am-btn primary",
								disabled: busy || selectedRemovedEntries.length === 0,
								onClick: function () { runRestore(removedItems(selectedRemovedEntries)); }
							}, tr("restore")),
							h("button", {
								key: "discard",
								type: "button",
								className: "am-btn danger",
								disabled: busy || selectedRemovedEntries.length === 0,
								title: tr("tipDiscardAction"),
								onClick: function () {
									setConfirm({
										kind: "discard",
										items: removedItems(selectedRemovedEntries),
										checked: false
									});
								}
							}, tr("purge")),
							h("button", {
								key: "empty",
								type: "button",
								className: "am-btn danger",
								disabled: busy,
								onClick: function () { setConfirm({ kind: "empty", ids: [], checked: false }); }
							}, tr("emptyTrash"))
						])
					]));
				}
				children.push(h("div", { key: "retention", className: "am-retention" }, [
					h("span", { key: "label", className: "am-retention-label" }, tr("retentionTitle")),
					h("div", { key: "select", className: "am-sort" }, [
						h("span", { key: "text" }, tr("retentionLabel")),
						dropdown("retention", String(settings.trashRetentionDays || 0), [
							{ value: "0", label: tr("retentionNever") },
							{ value: "7", label: tr("retentionDays", { n: 7 }) },
							{ value: "30", label: tr("retentionDays", { n: 30 }) },
							{ value: "90", label: tr("retentionDays", { n: 90 }) }
						], changeRetention, tr("retentionLabel"), false)
					]),
					h("span", { key: "hint", className: "am-retention-hint" }, tr("retentionHint")),
					settings.trashRetentionDays > 0
						? h("span", { key: "warn", className: "am-retention-warn" }, tr("retentionWarn"))
						: null
				]));
				if (report !== null) {
					children.push(h("div", { key: "report", className: "am-report" }, [
						h("div", { key: "title", className: "am-report-title" }, report.title),
						h("div", { key: "list", className: "am-report-list" }, report.failures.map(function (failure, index) {
							return h("div", { key: index, className: "am-report-item", title: failure.title + " · " + failure.reason },
								failure.title + " · " + failure.reason);
						})),
						report.more > 0 ? h("div", { key: "more", className: "am-report-item" }, tr("reportMore", { n: report.more })) : null,
						h("div", { key: "actions", className: "am-report-actions" },
							h("button", {
								type: "button",
								className: "am-btn batch",
								onClick: function () { setReport(null); }
							}, tr("reportDismiss"))
						)
					]));
				}
				children.push(removed.length === 0
					? emptyCard("empty", tr("emptyRemovedTitle"), tr("emptyRemovedHint"))
					: sortedRemoved.length === 0
						? emptyCard("filtered", tr("removedEmptyFilter"), tr("filteredEmptyHint"),
							h("button", {
								key: "clear",
								type: "button",
								className: "am-btn batch",
								onClick: clearRemovedFilters
							}, tr("clearFilters")))
						: h("div", { key: "list", className: "am-list", role: "list" }, sortedRemoved.map(removedRow)));
			}
		}

		children.push(confirmPanel());
		return h("div", { className: "am-page", "aria-busy": busy === true }, children);
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
