'use strict';
// アンケート専用ページ（survey.html）の動き。ゲームとは接続せず、回答を /api/survey に送るだけ。
(() => {
  const SCALE_LABELS = ['とても悪い', '悪い', 'ふつう', '良い', 'とても良い'];
  // 選択肢はサーバーの survey.js と同じにする（違う値は保存されない）
  const CHOICES = {
    good: ['札を取る操作', '読み上げの声', '実況（DJ）', '得点の表示', '見た目・デザイン', '敗者復活戦', '観戦モード', '用語の勉強になった'],
    bad:  ['クリックしても取れない', 'マウスカーソルが変・動かない', '札の文字が読みにくい', '音が出ない・ずれる・途切れる',
      '画面が止まった・動きが重い', '次の画面や観戦に正しく移らない', '何をすればいいか分からない', '特になし'],
  };
  const NONE = '特になし';   // ほかの「困ったところ」と同時には選べない
  const TIMEOUT_MS = 10000;

  const $ = id => document.getElementById(id);
  const pressed = b => b.getAttribute('aria-pressed') === 'true';

  function makeButton(value, html, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt'; b.dataset.value = value; b.innerHTML = html;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => onClick(b));
    return b;
  }

  // 5段階（1つだけ選ぶ）と、当てはまるものを選ぶボタンを作る
  document.querySelectorAll('.scale').forEach(box => SCALE_LABELS.forEach((label, i) => {
    box.append(makeButton(i + 1, `<b>${i + 1}</b>${label}`, b => {
      [...box.children].forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('msg').textContent = '';
    }));
  }));
  document.querySelectorAll('.chips').forEach(box => CHOICES[box.dataset.key].forEach(label => {
    box.append(makeButton(label, label, b => {
      const on = !pressed(b);
      b.setAttribute('aria-pressed', String(on));
      if (on && box.dataset.key === 'bad') {
        [...box.children].forEach(x => { if (x !== b && (b.dataset.value === NONE || x.dataset.value === NONE)) x.setAttribute('aria-pressed', 'false'); });
      }
    }));
  }));

  function collect() {
    const data = { comment: $('comment').value.trim() };
    document.querySelectorAll('.scale').forEach(box => {
      const b = [...box.children].find(pressed);
      data[box.dataset.key] = b ? Number(b.dataset.value) : null;
    });
    document.querySelectorAll('.chips').forEach(box => {
      data[box.dataset.key] = [...box.children].filter(pressed).map(b => b.dataset.value);
    });
    return data;
  }

  $('surveyForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = collect();
    if (![data.operation, data.visibility, data.clarity].every(Boolean)) {
      $('msg').textContent = '1〜3 の質問を選んでから送信してください。';
      return;
    }
    $('send').disabled = true;   // 二重送信を防ぐ
    $('msg').textContent = '送信中…';
    let result = null;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    try {
      const res = await fetch('api/survey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: abort.signal });
      result = await res.json();
    } catch (err) { /* 通信できなかった場合は下の案内を出す */ }
    clearTimeout(timer);
    if (result && result.ok) {
      $('surveyForm').hidden = true;
      $('thanks').hidden = false;
      $('thanksText').focus();
      return;
    }
    $('send').disabled = false;
    $('msg').textContent = result && result.reason === 'busy'
      ? '混み合っています。1分ほど待ってから、もう一度「送信する」を押してください。'
      : '送信できませんでした。もう一度「送信する」を押してください。';
  });
})();
