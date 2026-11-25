'use strict';
// 投影専用画面。参加者としては一切登録せず、見るだけ。
// 「今読み上げられている札と状況」「ランキング」を常時表示し、
// 試合結果が出たときだけ一定時間、結果画面に切り替える。
const socket = io();
const $ = id => document.getElementById(id);

const RANK_ICONS = ['🥇', '🥈', '🥉'];
const rankIcon = r => (r <= 3 ? RANK_ICONS[r - 1] : String(r));
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtPts = n => Math.round(n || 0).toLocaleString('ja-JP');

let hostId = null;

let lastPlayers = null;
function renderRanking(players) {
  lastPlayers = players;
  const all = Object.entries(players || {})
    .filter(([id, p]) => id !== hostId && (p.isBot || p.joined))
    .sort(KRank.compareEntries);
  const ranks = KRank.listRanks(all);
  const allTied = all.length > 1 && all[0][1].score === all[all.length - 1][1].score;
  $('pjRanking').innerHTML = all.map(([id, p], i) => `
    <div class="pj-rank-row">
      <span class="pj-rank-no">${allTied ? '－' : rankIcon(ranks[i])}</span>
      <span class="pj-rank-name">${escHtml(p.name)}${p.isBot ? '<span class="pj-rank-cpu">CPU</span>' : ''}</span>
      <span class="pj-rank-score">${fmtPts(p.score)}点</span>
    </div>`).join('');
  $('pjRankCount').textContent = all.length ? `（${all.length}人）` : '';
}

function setStatus(text) { $('pjStatus').textContent = text; }
function setYomi(text) { $('pjYomi').textContent = text || ''; }

let resultTimer = null;
function showResult(title, players, round) {
  clearTimeout(resultTimer);
  const all = Object.entries(players || {})
    .filter(([id, p]) => id !== hostId && (p.isBot || p.joined))
    .sort(KRank.compareEntries);
  const ranks = KRank.listRanks(all);
  $('pjResultTitle').textContent = title;
  $('pjResultTable').innerHTML = all.map(([id, p], i) => `
    <div class="pj-rank-row">
      <span class="pj-rank-no">${rankIcon(ranks[i])}</span>
      <span class="pj-rank-name">${escHtml(p.name)}${p.isBot ? '<span class="pj-rank-cpu">CPU</span>' : ''}</span>
      <span class="pj-rank-score">${fmtPts(p.score)}点</span>
    </div>`).join('');
  $('pjResult').classList.remove('hidden');
  resultTimer = setTimeout(() => $('pjResult').classList.add('hidden'), 10000);
}
function hideResult() { clearTimeout(resultTimer); $('pjResult').classList.add('hidden'); }

socket.on('connect', () => socket.emit('join_projector'));

socket.on('projector_init', (d) => {
  hostId = null;   // 投影画面はホストIDを特定しないので、全員をランキング対象にする
  renderRanking(d.players);
  if (d.phase === 'reading' || d.phase === 'decoy') setStatus('📢 読み上げ中…');
  else if (d.phase === 'lobby') setStatus('ホストが大会モードを開始するまでお待ちください');
  else setStatus('進行中…');
});

socket.on('read_card', ({ card }) => {
  hideResult();
  setStatus('📢 読み上げ中…');
  setYomi(card ? card.yomi : '');
});
socket.on('decoy_read', () => {
  hideResult();
  setStatus('📢 読み上げ中…（ダミー）');
  setYomi('');
});
socket.on('card_taken', ({ by, result }) => {
  setStatus(`✅ そこまで！ ${by.name} が獲得（+${fmtPts(result ? result.awarded : 0)}点）`);
});
socket.on('time_up', () => {
  setStatus('⏱ そこまで！（時間切れ）');
  setYomi('');
});
socket.on('tie_order', ({ ties }) => {
  if (!lastPlayers) return;
  Object.entries(ties).forEach(([id, tie]) => { if (lastPlayers[id]) lastPlayers[id].tie = tie; });
  renderRanking(lastPlayers);
});
socket.on('game_waiting', (d) => {
  setStatus('⏳ 次の札を待っています…');
  setYomi('');
  renderRanking(d.players);
});
socket.on('players_updated', (players) => renderRanking(players));

socket.on('round_finished', (d) => {
  showResult(d.isFinal ? `🏆 第${d.round}試合（最終）終了！` : `第${d.round}試合終了！`, d.players, d.round);
});
socket.on('event_round_finished', (d) => {
  const label = d.isFinal ? '🏆 本戦 最終結果' : `🏁 ${{ main: '本戦', revival: '敗者復活戦' }[d.stage] || d.stage}の結果`;
  showResult(label, d.players);
});

// 緊急停止のお知らせ（投影画面にも出す）
let pjPause = { active: false, resumeAt: 0 };
let pjPauseTick = null;
function pjRenderPause() {
  const ov = document.getElementById('oPause');
  if (!ov) return;
  if (pjPauseTick) { clearInterval(pjPauseTick); pjPauseTick = null; }
  if (!pjPause.active) { ov.classList.add('hidden'); return; }
  document.getElementById('pauseMsg').textContent = pjPause.resumeAt
    ? 'まもなくゲームを再開します。席について待っていてください。'
    : '現在トラブル対応中です。ゲーム再開までしばらくお待ちください。';
  ov.classList.remove('hidden');
  const cnt = document.getElementById('pauseCount');
  const upd = () => { cnt.textContent = pjPause.resumeAt ? Math.max(0, Math.ceil((pjPause.resumeAt - Date.now()) / 1000)) + '秒' : ''; };
  upd();
  if (pjPause.resumeAt) pjPauseTick = setInterval(upd, 250);
}
socket.on('pause_state', (st) => { pjPause = st || { active: false, resumeAt: 0 }; pjRenderPause(); });
