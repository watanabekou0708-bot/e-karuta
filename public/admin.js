'use strict';
// 大会設定の管理画面。?host を付けて開いたブラウザからのみ変更できる
// （ロビーの「⚙️ 大会設定を開く」からは、ホストのときだけ ?host 付きのリンクが渡される）。
const HOST_PARAM = new URLSearchParams(location.search).has('host');
const HOST_VALUE = new URLSearchParams(location.search).get('host') || '1';
const HOST_Q = HOST_PARAM ? encodeURIComponent(HOST_VALUE) : '';
const socket = io({ query: { host: HOST_PARAM ? HOST_VALUE : '' } });
const $ = id => document.getElementById(id);
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let isHost = false;
let schedule = [];
let scheduleLog = {};

function pct(ratio) { return Math.round(ratio * 100); }

function applyLockState() {
  const locked = !isHost;
  ['cfgMainCutRatio', 'cfgMainMaxRounds', 'cfgRevivalMaxRounds', 'cfgRevivalCutRatio', 'cfgTestCpuFill', 'cfgSaveBtn', 'srvRestartBtn', 'srvStopBtn', 'pauseBtn', 'resumeBtn'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = locked;
  });
  $('adminNotHost').classList.toggle('hidden', isHost);
  if (!isHost) $('surveyToggleBtn').textContent = '教卓PCでのみ操作できます';
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
    mainMaxRounds:    +$('cfgMainMaxRounds').value || 5,
    revivalMaxRounds: +$('cfgRevivalMaxRounds').value || 2,
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
    const r = await fetch('/api/loadtest/logs?host=' + HOST_Q);
    const d = await r.json();
    renderLogList(d.files || []);
  } catch (e) { /* 取得できなければ一覧は変えない */ }
}
function renderLogList(files) {
  $('ltLogList').innerHTML = files.map(f => `
    <div class="admin-sched-row" style="grid-template-columns:1fr auto auto">
      <span>${escHtml(f.name)}</span>
      <span class="admin-hint">${fmtBytes(f.sizeBytes)}</span>
      <a class="btn-sched-start" href="/api/loadtest/logs/${encodeURIComponent(f.name)}?host=${HOST_Q}" download>⬇ ダウンロード</a>
    </div>`).join('') || '<p class="ov-sub">まだ負荷テストのログがありません。</p>';
}

async function fetchBottestLogs() {
  try {
    const r = await fetch('/api/bottest/logs?host=' + HOST_Q);
    const d = await r.json();
    renderBtLogList(d.files || []);
  } catch (e) { /* 取得できなければ一覧は変えない */ }
}
function renderBtLogList(files) {
  $('btLogList').innerHTML = files.map(f => `
    <div class="admin-sched-row" style="grid-template-columns:1fr auto auto">
      <span>${escHtml(f.name)}</span>
      <span class="admin-hint">${fmtBytes(f.sizeBytes)}</span>
      <a class="btn-sched-start" href="/api/bottest/logs/${encodeURIComponent(f.name)}?host=${HOST_Q}" download>⬇ ダウンロード</a>
    </div>`).join('') || '<p class="ov-sub">まだ実機ボットテストのログがありません。</p>';
}
setInterval(fetchBottestLogs, 15000);

// 所要時間の記録（logs/timing-*.md）の一覧
async function fetchTimingLogs() {
  try {
    const r = await fetch('/api/timing/logs?host=' + HOST_Q);
    const d = await r.json();
    $('tmLogList').innerHTML = (d.files || []).map(f => `
      <div class="admin-sched-row" style="grid-template-columns:1fr auto auto">
        <span>${escHtml(f.name)}${f.current ? '（今回の起動分）' : ''}</span>
        <span class="admin-hint">${fmtBytes(f.sizeBytes)}</span>
        <a class="btn-sched-start" href="/api/timing/logs/${encodeURIComponent(f.name)}?host=${HOST_Q}" download>⬇ ダウンロード</a>
      </div>`).join('') || '<p class="ov-sub">まだ記録がありません（最初の試合が終わると作られます）。</p>';
  } catch (e) { /* 取得できなければ一覧は変えない */ }
}
setInterval(fetchTimingLogs, 15000);

// ── プレイ後アンケート：出す／出さないの切り替え、回答数、結果のダウンロード ──
let surveyEnabled = true;
function toggleSurvey() { socket.emit('set_survey_enabled', !surveyEnabled); }
socket.on('survey_summary', (s) => {
  surveyEnabled = !!s.enabled;
  const btn = $('surveyToggleBtn');
  btn.disabled = false;
  btn.textContent = surveyEnabled ? '現在：アンケートを出す（押すと「出さない」）' : '現在：アンケートを出さない（押すと「出す」）';
  btn.className = 'btn ' + (surveyEnabled ? 'btn-green' : 'btn-blue');
  btn.setAttribute('aria-pressed', String(surveyEnabled));
  $('surveyStatus').textContent = s.accepting
    ? `回答済み ${s.answered}人 / 対象 ${s.targets}人${surveyEnabled ? '' : '（「出さない」のため受付を止めています）'}`
    : 'いまは受付前です。';
  fetchSurveyLogs();
});
async function fetchSurveyLogs() {
  try {
    const r = await fetch('/api/survey/logs?host=' + HOST_Q);
    const d = await r.json();
    $('svLogList').innerHTML = (d.files || []).map(f => `
      <div class="admin-sched-row" style="grid-template-columns:1fr auto auto">
        <span>${escHtml(f.name)}${f.current ? '（今回の起動分）' : ''}</span>
        <span class="admin-hint">${fmtBytes(f.sizeBytes)}</span>
        <a class="btn-sched-start" href="/api/survey/logs/${encodeURIComponent(f.name)}?host=${HOST_Q}" download>⬇ ダウンロード</a>
      </div>`).join('') || '<p class="ov-sub">まだ回答がありません。</p>';
  } catch (e) { /* 取得できなければ一覧は変えない */ }
}

socket.on('connect', () => { socket.emit('join_admin'); socket.emit('join_load_test_monitor'); fetchLoadtestLogs(); fetchBottestLogs(); fetchTimingLogs(); fetchSurveyLogs(); });
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

// ── サーバーの停止・再起動 ──
let supervised = false;
let runMode = 'standalone';
function serverControl(action) {
  if (!isHost) return;
  const again = supervised ? 'この画面（教卓PC）の「起動」ボタンを使います。' : runMode === 'systemd' ? 'サーバー上で sudo systemctl start ekaruta を実行します。' : 'コマンドで node server.js を実行します。';
  const msg = action === 'stop'
    ? 'サーバーを停止します。進行中の試合・大会の状態は失われ、全員の接続が切れます。\n再び起動するには' + again + '\nよろしいですか？'
    : 'サーバーを再起動します。進行中の試合・大会の状態は失われ、全員の接続が切れます。\nよろしいですか？';
  if (!confirm(msg)) return;
  socket.emit('server_control', action);
}
socket.on('server_control_result', (r) => { if (r && !r.ok) alert(r.msg); });
socket.on('server_going_down', (d) => {
  $('srvCtlNote').textContent = d.action === 'restart'
    ? '再起動中です…数秒後に自動で再接続します。'
    : 'サーバーを停止しました。' + (supervised ? '教卓PCで http://localhost:' + location.port + '/ を開くと「起動」ボタンが出ます。' : '');
});
socket.on('admin_init', (d) => {
  supervised = !!d.supervised;
  runMode = d.runMode || 'standalone';
  $('srvCtlNote').textContent = runMode === 'systemd' ? '※サービス（systemd）で動いています。再起動はサービスの設定（Restart=）によって自動で立ち上がります。停止すると、サーバー上で起動し直すまで動きません。' : (supervised ? '' : '※「起動.bat」を使わず直接起動しています。再起動は自動で行えますが、停止後の画面からの起動はできません。');
});

// ── 緊急停止・再開 ──
function pauseGame() { if (isHost && confirm('緊急停止します。音声が終わった段階でゲームが一時中断し、全員の画面にお知らせが出ます。よろしいですか？')) socket.emit('admin_pause'); }
function resumeGame() { if (isHost && confirm('再開します。「まもなく再開します」と表示され、30秒後に次の札から再開します。よろしいですか？')) socket.emit('admin_resume'); }
let pauseCountdown = null;
function renderPauseStatus(st) {
  st = st || {};
  const status = $('pauseStatus');
  if (pauseCountdown) { clearInterval(pauseCountdown); pauseCountdown = null; }
  const pb = $('pauseBtn'), rb = $('resumeBtn');
  if (pb) pb.disabled = !isHost || !!st.active || !!st.requested;
  if (rb) rb.disabled = !isHost || !(st.active || st.requested) || !!st.resumeAt;
  if (!status) return;
  if (st.active && st.resumeAt) {
    const upd = () => { status.textContent = '再開まであと ' + Math.max(0, Math.ceil((st.resumeAt - Date.now()) / 1000)) + ' 秒…'; };
    upd(); pauseCountdown = setInterval(upd, 250);
  } else if (st.active) status.textContent = '⏸ 停止中です。再開するには「再開」を押してください。';
  else if (st.requested) status.textContent = '音声が終わるのを待っています。終わり次第、一時中断します。';
  else status.textContent = '';
}
socket.on('pause_state', renderPauseStatus);
socket.on('admin_init', (d) => renderPauseStatus(d.pause));
