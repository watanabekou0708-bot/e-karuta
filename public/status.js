'use strict';
// 勝敗一覧（教卓PC用）。サーバーから3秒ごとに最新の一覧を取得して表示する。
// 本戦・敗者復活戦の各試合の結果（通過／敗退／最終）と、いまの状態を参加者ごとに一覧できる。
const HOST_PARAM = new URLSearchParams(location.search).has('host');
const HOST_VALUE = new URLSearchParams(location.search).get('host') || '1';
const socket = io({ query: { host: HOST_PARAM ? HOST_VALUE : '' } });
const $ = id => document.getElementById(id);
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 状態の表示順と名称
const STATES = [
  ['final', '最終順位'], ['playing', '試合中'], ['alive', '本戦 勝ち残り'],
  ['revival_wait', '復活戦 挑戦待ち'], ['out', '敗退'], ['idle', '未出場'],
];
const STATE_ORDER = Object.fromEntries(STATES.map(([k], i) => [k, i]));
const RESULT_CLASS = { '通過': 'r-pass', '敗退': 'r-out', '最終': 'r-final' };
let filter = 'all';
let latest = null;

function renderResults(list) {
  if (!list.length) return '<span class="st-none">—</span>';
  return list.map(h => `<span class="st-res ${RESULT_CLASS[h.result] || ''}">第${h.round}試合 ${escHtml(h.result)}（${h.rank}位・${h.score}点）</span>`).join('');
}

function render() {
  const d = latest;
  if (!d) return;
  const stageText = d.stage === 'main' ? ` 第${d.mainRound}試合` : d.stage === 'revival' ? ` 第${d.revivalRound}試合` : '';
  $('stNow').textContent = d.active
    ? `${d.stageLabel || '大会 開始前'}${stageText}　（本戦 最大${d.mainMaxRounds}試合・敗者復活 最大${d.revivalMaxRounds}試合）`
    : '大会モードは開始前です';

  const counts = {};
  d.rows.forEach(r => { counts[r.state] = (counts[r.state] || 0) + 1; });
  $('stSummary').innerHTML =
    `<button class="st-chip s-all ${filter === 'all' ? 'active' : ''}" data-f="all"><b>${d.rows.length}</b><small>全員</small></button>` +
    STATES.map(([k, label]) => `<button class="st-chip s-${k} ${filter === k ? 'active' : ''}" data-f="${k}"><b>${counts[k] || 0}</b><small>${label}</small></button>`).join('');

  const q = $('stSearch').value.trim().toLowerCase();
  const rows = d.rows
    .filter(r => (filter === 'all' || r.state === filter) && (!q || r.name.toLowerCase().includes(q)))
    .sort((a, b) => (STATE_ORDER[a.state] - STATE_ORDER[b.state]) || a.name.localeCompare(b.name, 'ja'));
  $('stRows').innerHTML = rows.map(r => `<tr>
      <td class="st-name">${escHtml(r.name)}${r.online ? '' : '<span class="st-off">（未接続）</span>'}</td>
      <td>${r.grade ? escHtml(r.grade) + '年' : ''}${r.course ? ' ' + escHtml(r.course) : ''}</td>
      <td><span class="st-badge s-${r.state}">${escHtml(r.text)}</span></td>
      <td>${renderResults(r.main)}</td>
      <td>${renderResults(r.revival)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="st-none">該当する参加者がいません</td></tr>';
  $('stUpdated').textContent = '最終更新 ' + new Date().toLocaleTimeString('ja-JP', { hour12: false });
}

function refresh() {
  socket.emit('get_event_status', d => {
    if (!d || d.forbidden) {
      $('stForbidden').classList.remove('hidden');
      $('stBody').classList.add('hidden');
      $('stNow').textContent = '';
      return;
    }
    $('stForbidden').classList.add('hidden');
    $('stBody').classList.remove('hidden');
    latest = d;
    render();
  });
}

$('stSummary').addEventListener('click', e => {
  const b = e.target.closest('[data-f]');
  if (!b) return;
  filter = b.dataset.f;
  render();
});
$('stSearch').addEventListener('input', render);
socket.on('connect', refresh);
setInterval(refresh, 3000);
