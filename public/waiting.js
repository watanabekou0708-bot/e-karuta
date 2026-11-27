'use strict';
// 大会モードの待機画面（開始前）。ロビーで「大会モード」を選ぶと表示する。
//  ・学生の画面：「準備完了！」と、アクセスしている参加者の一覧
//  ・ホストの画面：「○名準備完了！」と、準備完了の参加者の一覧（ユーザー名順／クラス名順）
// 「準備完了」＝この画面を開いていること。game.js の syncWaiting() がサーバーに知らせる。
window.KWaiting = (() => {
  // クラス名順で分ける順番（参加画面の選択肢の並び）
  const CLASSES = [['ITエキスパート科', 'IE'], ['ITビジネス科', 'IB']];
  const NO_CLASS = 'クラス未設定';

  // 名前の昇順。学年・クラスの記号を除いた名前で比べ、数字は大きさの順にする（2 が 10 より先）。
  // 漢字は読みが分からないため、読みの順にはならない。
  const collator = new Intl.Collator('ja', { numeric: true });
  const byName = (a, b) => collator.compare(a.rawName || a.name, b.rawName || b.name) || collator.compare(a.name, b.name);

  let sortKey = 'name';   // 'name' | 'class'（ホストの画面だけで切り替える）
  let last = null;        // 直近の表示内容（並び替えボタンで描き直すため）

  const el = id => document.getElementById(id);
  function make(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }
  const tile = (p, myId) => make('div', 'wt-tile' + (p.id === myId ? ' me' : ''), p.name + (p.id === myId ? '（あなた）' : ''));

  // クラスごとに見出しを入れて、学年の順・名前の順に並べる。該当者のいないクラスは出さない
  function classNodes(list, myId) {
    const known = new Set(CLASSES.map(([className]) => className));
    const groups = [
      ...CLASSES.map(([className, abbr]) => [`${abbr}　${className}`, list.filter(p => p.className === className)]),
      [NO_CLASS, list.filter(p => !known.has(p.className))],
    ];
    const byGradeName = (a, b) => String(a.grade || '').localeCompare(String(b.grade || '')) || byName(a, b);
    return groups.filter(([, members]) => members.length)
      .flatMap(([title, members]) => [make('div', 'wt-group', `${title}（${members.length}名）`), ...members.sort(byGradeName).map(p => tile(p, myId))]);
  }

  // ホストの画面の補足：待機画面を開いていない人の数。入場番号がONのときは、番号を入れていない人を分けて数える
  function hostNote(members, entryRequired) {
    const notReady = members.filter(p => !p.eventReady);
    const excluded = entryRequired ? notReady.filter(p => !p.entryPassed).length : 0;
    const included = notReady.length - excluded;
    return [
      included ? `このほかに待機画面を開いていない参加者が ${included}名います（開始すると参加者に含まれます）` : '',
      excluded ? `入場番号を入れていない人が ${excluded}名います（開始しても参加者に含まれません）` : '',
    ].filter(Boolean).join('／');
  }

  // view: { players, hostId, myId, isHost, entryRequired }
  function render(view) {
    last = view;
    const { players, hostId, myId, isHost, entryRequired } = view;
    // 参加登録している人（CPUと進行役を除く）
    const members = Object.entries(players || {})
      .filter(([id, p]) => !p.isBot && p.joined && id !== hostId)
      .map(([id, p]) => ({ ...p, id }));
    const ready = members.filter(p => p.eventReady);
    const shown = isHost ? ready : members;

    el('wtReady').textContent = isHost ? `${ready.length}名準備完了！` : '準備完了！';
    el('wtNote').classList.toggle('hidden', isHost);
    el('wtSort').classList.toggle('hidden', !isHost);
    el('wtSub').textContent = isHost ? hostNote(members, entryRequired) : `参加中のユーザー（${members.length}名）`;
    document.querySelectorAll('#wtSort button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sort === sortKey)));

    // 中身を入れ替えても、一覧のスクロール位置は保つ
    const list = el('wtList');
    const top = list.scrollTop;
    list.replaceChildren(...(isHost && sortKey === 'class' ? classNodes(shown, myId) : [...shown].sort(byName).map(p => tile(p, myId))));
    list.scrollTop = top;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('#wtSort button');
    if (!b || !last) return;
    sortKey = b.dataset.sort;
    el('wtList').scrollTop = 0;
    render(last);
  });

  return { render };
})();
