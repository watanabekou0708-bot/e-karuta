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
const STATE_LABEL = Object.fromEntries(STATES);
const RESULT_CLASS = { '通過': 'r-pass', '敗退': 'r-out', '最終': 'r-final' };

// ── 列の定義 ──────────────────────────────────────────────
//  get     … 絞り込みに使う値   options … ▼メニューのチェック項目（無い列は名前の検索欄で絞り込む）
//  compare … 昇順の比較
const GRADES = ['1', '2', '3'];
const COURSES = [
  'アプリコース', 'プログラムコース', 'ITスペシャリストコース', '画像クリエイトコース',
  'ITエンジニアコース', 'ビジュアルデザインコース', 'ビジネスITコース',
];
const NONE = '未設定';
const NO_RESULT = '結果なし';
const collator = new Intl.Collator('ja', { numeric: true });
const plainName = r => r.rawName || r.name;
const latestOf = list => list[list.length - 1] || null;
const byIndex = (options, get) => (a, b) => options.indexOf(get(a)) - options.indexOf(get(b));
// 結果の列は、直近の試合の点数が高い順を昇順とする（結果の無い人は最後）
const byResult = key => (a, b) => {
  const x = latestOf(a[key]), y = latestOf(b[key]);
  return !x || !y ? (x ? -1 : y ? 1 : 0) : y.score - x.score;
};
function choiceColumn(key, title, options, get, labelOf = v => v) {
  return { key, title, options, get, labelOf, compare: byIndex(options, get) };
}
const resultColumn = (key, title) => ({
  key, title, options: ['通過', '敗退', '最終', NO_RESULT], labelOf: v => v,
  get: r => (latestOf(r[key]) || { result: NO_RESULT }).result,
  compare: byResult(key),
});
const COLUMNS = [
  { key: 'name', title: '名前', compare: (a, b) => collator.compare(plainName(a), plainName(b)) },
  choiceColumn('grade', '学年', [...GRADES, NONE], r => (GRADES.includes(String(r.grade)) ? String(r.grade) : NONE), v => (v === NONE ? v : v + '年')),
  choiceColumn('course', 'コース', [...COURSES, NONE], r => (COURSES.includes(r.course) ? r.course : NONE)),
  choiceColumn('state', 'いまの状態', STATES.map(([k]) => k), r => r.state, v => STATE_LABEL[v]),
  resultColumn('main', '本戦の結果'),
  resultColumn('revival', '敗者復活戦の結果'),
];
const columnOf = key => COLUMNS.find(c => c.key === key);
const picked = Object.fromEntries(COLUMNS.filter(c => c.options).map(c => [c.key, new Set()]));   // 列ごとの絞り込み（空＝すべて）
let sort = { key: 'state', dir: 1 };
let menuKey = null;   // ▼メニューを開いている列
let latest = null;

function renderResults(list) {
  if (!list.length) return '<span class="st-none">—</span>';
  return list.map(h => `<span class="st-res ${RESULT_CLASS[h.result] || ''}">第${h.round}試合 ${escHtml(h.result)}（${h.rank}位・${h.score}点）</span>`).join('');
}

const searchText = () => $('stSearch').value.trim().toLowerCase();
function visibleRows(rows) {
  const q = searchText();
  const col = columnOf(sort.key);
  return rows
    .filter(r => (!q || r.name.toLowerCase().includes(q)) && Object.entries(picked).every(([key, set]) => !set.size || set.has(columnOf(key).get(r))))
    .sort((a, b) => sort.dir * col.compare(a, b) || (STATE_ORDER[a.state] - STATE_ORDER[b.state]) || collator.compare(plainName(a), plainName(b)));
}

// 見出し：名前を押すと並び替え、▼で並び替えと絞り込みのメニュー
function renderHead() {
  $('stHead').innerHTML = '<tr>' + COLUMNS.map(c => `<th aria-sort="${sort.key !== c.key ? 'none' : sort.dir > 0 ? 'ascending' : 'descending'}">
    <button class="st-sort" data-sort="${c.key}">${c.title}<span class="st-arrow">${sort.key !== c.key ? '' : sort.dir > 0 ? '▲' : '▼'}</span></button>
    <button class="st-menu-btn ${c.options && picked[c.key].size ? 'on' : ''}" data-menu="${c.key}" aria-label="${c.title}の並び替えと絞り込み">▼</button></th>`).join('') + '</tr>';
}

function renderActive() {
  const chips = [];
  if (searchText()) chips.push(`<button class="st-filter" data-clear="name">名前「${escHtml($('stSearch').value.trim())}」 ×</button>`);
  COLUMNS.filter(c => c.options).forEach(c => picked[c.key].forEach(v =>
    chips.push(`<button class="st-filter" data-clear="${c.key}" data-v="${escHtml(v)}">${c.title}：${escHtml(c.labelOf(v))} ×</button>`)));
  if (chips.length) chips.push('<button class="st-filter" data-clear="all">条件をすべて解除</button>');
  $('stActive').innerHTML = chips.join('');
}

function render() {
  const d = latest;
  if (!d) return;
  const stageText = d.stage === 'main' ? ` 第${d.mainRound}試合` : d.stage === 'revival' ? ` 第${d.revivalRound}試合` : '';
  $('stNow').textContent = d.active
    ? `${d.stageLabel || '大会 開始前'}${stageText}　（本戦 最大${d.mainMaxRounds}試合・敗者復活 最大${d.revivalMaxRounds}試合）`
    : '大会モードは開始前です';

  // 状態ごとの人数。押すと「いまの状態」の列をその状態だけに絞り込む
  const counts = {};
  d.rows.forEach(r => { counts[r.state] = (counts[r.state] || 0) + 1; });
  const onlyState = k => picked.state.size === 1 && picked.state.has(k);
  $('stSummary').innerHTML =
    `<button class="st-chip s-all ${picked.state.size ? '' : 'active'}" data-f="all"><b>${d.rows.length}</b><small>全員</small></button>` +
    STATES.map(([k, label]) => `<button class="st-chip s-${k} ${onlyState(k) ? 'active' : ''}" data-f="${k}"><b>${counts[k] || 0}</b><small>${label}</small></button>`).join('');

  const rows = visibleRows(d.rows);
  const gradeCol = columnOf('grade'), courseCol = columnOf('course');
  $('stRows').innerHTML = rows.map(r => `<tr>
      <td class="st-name">${escHtml(plainName(r))}${r.online ? '' : '<span class="st-off">（未接続）</span>'}</td>
      <td>${gradeCol.get(r) === NONE ? '<span class="st-none">—</span>' : escHtml(gradeCol.labelOf(gradeCol.get(r)))}</td>
      <td>${courseCol.get(r) === NONE ? '<span class="st-none">—</span>' : escHtml(r.course)}</td>
      <td><span class="st-badge s-${r.state}">${escHtml(r.text)}</span></td>
      <td>${renderResults(r.main)}</td>
      <td>${renderResults(r.revival)}</td>
    </tr>`).join('') || `<tr><td colspan="${COLUMNS.length}" class="st-none">該当する参加者がいません</td></tr>`;
  renderActive();
  $('stUpdated').textContent = `${rows.length} / ${d.rows.length}人を表示　最終更新 ${new Date().toLocaleTimeString('ja-JP', { hour12: false })}`;
}
function redraw() { renderHead(); render(); }

function closeMenu() {
  menuKey = null;
  $('stMenu').classList.add('hidden');
}
function openMenu(key, anchor) {
  const col = columnOf(key);
  const menu = $('stMenu');
  menuKey = key;
  menu.innerHTML = '<button data-msort="1">▲ 昇順で並び替え</button><button data-msort="-1">▼ 降順で並び替え</button>' + (col.options
    ? '<hr>' + col.options.map(v => `<label><input type="checkbox" value="${escHtml(v)}" ${picked[key].has(v) ? 'checked' : ''}>${escHtml(col.labelOf(v))}</label>`).join('') + '<hr><button data-mclear="1">この列の絞り込みを解除</button>'
    : '<hr><label>名前は上の検索欄で絞り込めます</label>');
  menu.classList.remove('hidden');
  const box = anchor.getBoundingClientRect();
  menu.style.left = Math.max(16, Math.min(box.left, innerWidth - menu.offsetWidth - 16)) + 'px';
  menu.style.top = Math.max(8, Math.min(box.bottom + 4, innerHeight - menu.offsetHeight - 8)) + 'px';
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

document.addEventListener('click', e => {
  const b = e.target.closest('button');
  const inMenu = !!e.target.closest('#stMenu');
  if (!inMenu && !(b && b.dataset.menu)) closeMenu();
  if (!b) return;
  const d = b.dataset;
  if (d.f) { picked.state = new Set(d.f === 'all' ? [] : [d.f]); redraw(); }
  else if (d.sort) { sort = { key: d.sort, dir: sort.key === d.sort ? -sort.dir : 1 }; redraw(); }
  else if (d.menu) { if (menuKey === d.menu) closeMenu(); else openMenu(d.menu, b); }
  else if (d.msort) { sort = { key: menuKey, dir: Number(d.msort) }; closeMenu(); redraw(); }
  else if (d.mclear) { picked[menuKey].clear(); closeMenu(); redraw(); }
  else if (d.clear) {
    if (d.clear === 'all') Object.values(picked).forEach(set => set.clear());
    else if (d.clear !== 'name') picked[d.clear].delete(d.v);
    if (d.clear === 'all' || d.clear === 'name') $('stSearch').value = '';
    redraw();
  }
});
document.addEventListener('change', e => {
  if (!menuKey || !e.target.closest('#stMenu')) return;
  picked[menuKey][e.target.checked ? 'add' : 'delete'](e.target.value);
  redraw();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
$('stSearch').addEventListener('input', render);
renderHead();
socket.on('connect', refresh);
setInterval(refresh, 3000);
