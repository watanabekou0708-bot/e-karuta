'use strict';
// 投影専用画面。参加者としては一切登録せず、見るだけ。
// 「今読み上げられている札と状況」「ランキング」を常時表示し、
// 試合結果が出たときだけ一定時間、結果画面に切り替える。
const socket = io();
const $ = id => document.getElementById(id);

const RANK_ICONS = ['🥇', '🥈', '🥉'];
const rankIcon = r => (r <= 3 ? RANK_ICONS[r - 1] : String(r));
function competitionRanks(sortedEntries) {
  const ranks = [];
  sortedEntries.forEach(([, p], i) => {
    ranks.push(i > 0 && p.score === sortedEntries[i - 1][1].score ? ranks[i - 1] : i + 1);
  });
  return ranks;
}
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtPts = n => Math.round(n || 0).toLocaleString('ja-JP');

let hostId = null;

function renderRanking(players) {
  const all = Object.entries(players || {})
    .filter(([id, p]) => id !== hostId && (p.isBot || p.joined))
    .sort(([, a], [, b]) => b.score - a.score);
  const ranks = competitionRanks(all);
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
    .sort(([, a], [, b]) => b.score - a.score);
  const ranks = competitionRanks(all);
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
