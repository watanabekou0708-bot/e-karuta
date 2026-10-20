'use strict';
// 大会設定の管理画面。?host を付けて開いたブラウザからのみ変更できる
// （ロビーの「⚙️ 大会設定を開く」からは、ホストのときだけ ?host 付きのリンクが渡される）。
const HOST_PARAM = new URLSearchParams(location.search).has('host');
const socket = io({ query: { host: HOST_PARAM ? '1' : '' } });
const $ = id => document.getElementById(id);
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let isHost = false;
let schedule = [];
let scheduleLog = {};

function pct(ratio) { return Math.round(ratio * 100); }

function applyLockState() {
  const locked = !isHost;
  ['cfgMainCutRatio', 'cfgMainMaxRounds', 'cfgRevivalMaxRounds', 'cfgRevivalCutRatio', 'cfgTestCpuFill', 'cfgSaveBtn'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = locked;
  });
  $('adminNotHost').classList.toggle('hidden', isHost);
  $('adminConfigNote').textContent = '大会モード進行中でも変更できます。変更は次に始まる試合・敗者復活戦から反映され、今進行中の試合には影響しません。';
}

function fillConfig(cfg) {
  $('cfgMainCutRatio').value     = pct(cfg.mainCutRatio);
  $('cfgMainMaxRounds').value    = cfg.mainMaxRounds;
  $('cfgRevivalMaxRounds').value = cfg.revivalMaxRounds;
  $('cfgRevivalCutRatio').value  = pct(cfg.revivalCutRatio);
  $('cfgTestCpuFill').checked    = !!cfg.testCpuFill;
}

function saveConfig() {
  if (!isHost) return;
  socket.emit('set_event_config', {
    mainCutRatio:     (+$('cfgMainCutRatio').value || 50) / 100,
    mainMaxRounds:    +$('cfgMainMaxRounds').value || 7,
    revivalMaxRounds: +$('cfgRevivalMaxRounds').value || 5,
    revivalCutRatio:  (+$('cfgRevivalCutRatio').value || 50) / 100,
    testCpuFill:      $('cfgTestCpuFill').checked,
  });
  const saved = $('cfgSaved');
  saved.classList.remove('hidden');
  setTimeout(() => saved.classList.add('hidden'), 2000);
}

function renderSchedule() {
  $('scheduleRows').innerHTML = schedule.map(row => {
    const started = scheduleLog[row.id];
    const startedStr = started ? new Date(started).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="admin-sched-row" data-id="${escHtml(row.id)}">
      <input class="admin-sched-label" value="${escHtml(row.label)}" placeholder="例：本戦1回戦" ${isHost ? '' : 'disabled'}
        onchange="updateRow('${row.id}', 'label', this.value)">
      <input class="admin-sched-time" type="time" value="${escHtml(row.plannedAt)}" ${isHost ? '' : 'disabled'}
        onchange="updateRow('${row.id}', 'plannedAt', this.value)">
      <button class="btn-sched-start" ${isHost ? '' : 'disabled'} onclick="markStarted('${row.id}')">開始</button>
      <span class="admin-sched-actual">${startedStr ? '実績 ' + startedStr : ''}</span>
      <button class="btn-sched-del" ${isHost ? '' : 'disabled'} onclick="removeRow('${row.id}')">✕</button>
    </div>`;
  }).join('') || '<p class="ov-sub">まだ行がありません。「＋ 行を追加」で追加してください。</p>';
}

function pushSchedule() { if (isHost) socket.emit('set_schedule', schedule); }

function addScheduleRow() {
  if (!isHost) return;
  schedule.push({ id: Math.random().toString(36).slice(2), label: '', plannedAt: '' });
  renderSchedule();
  pushSchedule();
}
function updateRow(id, key, value) {
  const row = schedule.find(r => r.id === id);
  if (!row) return;
  row[key] = value;
  pushSchedule();
}
function removeRow(id) {
  schedule = schedule.filter(r => r.id !== id);
  renderSchedule();
  pushSchedule();
}
function markStarted(id) {
  socket.emit('mark_schedule_started', { id });
}

// ── 負荷テスト ──────────────────────────────────────────
function fmtBytes(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + 'KB';
  return n + 'B';
}
function renderLtAdminStatus(st) {
  $('ltaRunning').textContent = st.running ? '実行中' : '停止中';
  $('ltaConnected').textContent = st.running ? `${st.connected} / ${st.botCount}` : '—';
  $('ltaPing').textContent = st.running && st.avgPingMs != null ? `${st.avgPingMs}ms / ${st.maxPingMs}ms` : '—';
  $('ltaCpu').textContent = st.running && st.cpuPercent != null ? `${st.cpuPercent}%` : '—';
  if (!st.running) fetchLoadtestLogs();   // 終わったばかりなら、ログ一覧を更新しておく
}
async function fetchLoadtestLogs() {
  try {
    const r = await fetch('/api/loadtest/logs?host=' + (HOST_PARAM ? '1' : ''));
    const d = await r.json();
    renderLogList(d.files || []);
  } catch (e) { /* 取得できなければ一覧は変えない */ }
}
function renderLogList(files) {
  $('ltLogList').innerHTML = files.map(f => `
    <div class="admin-sched-row" style="grid-template-columns:1fr auto auto">
      <span>${escHtml(f.name)}</span>
      <span class="admin-hint">${fmtBytes(f.sizeBytes)}</span>
      <a class="btn-sched-start" href="/api/loadtest/logs/${encodeURIComponent(f.name)}?host=${HOST_PARAM ? '1' : ''}" download>⬇ ダウンロード</a>
    </div>`).join('') || '<p class="ov-sub">まだ負荷テストのログがありません。</p>';
}

async function fetchBottestLogs() {
  try {
    const r = await fetch('/api/bottest/logs?host=' + (HOST_PARAM ? '1' : ''));
    const d = await r.json();
    renderBtLogList(d.files || []);
  } catch (e) { /* 取得できなければ一覧は変えない */ }
}
function renderBtLogList(files) {
  $('btLogList').innerHTML = files.map(f => `
    <div class="admin-sched-row" style="grid-template-columns:1fr auto auto">
      <span>${escHtml(f.name)}</span>
      <span class="admin-hint">${fmtBytes(f.sizeBytes)}</span>
      <a class="btn-sched-start" href="/api/bottest/logs/${encodeURIComponent(f.name)}?host=${HOST_PARAM ? '1' : ''}" download>⬇ ダウンロード</a>
    </div>`).join('') || '<p class="ov-sub">まだ実機ボットテストのログがありません。</p>';
}
setInterval(fetchBottestLogs, 15000);

socket.on('connect', () => { socket.emit('join_admin'); socket.emit('join_load_test_monitor'); fetchLoadtestLogs(); fetchBottestLogs(); });
socket.on('load_test_status', renderLtAdminStatus);
socket.on('admin_init', (d) => {
  isHost = !!d.isHost;
  fillConfig(d.eventConfig);
  schedule = d.schedule || [];
  scheduleLog = d.scheduleLog || {};
  applyLockState();
  renderSchedule();
});
socket.on('event_config', (cfg) => fillConfig(cfg));
socket.on('schedule_updated', (d) => {
  schedule = d.schedule || [];
  scheduleLog = d.scheduleLog || {};
  renderSchedule();
});
