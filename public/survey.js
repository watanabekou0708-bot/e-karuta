'use strict';
// プレイ後アンケート（案C）の画面側。game.js の後に読み込み、同じ socket を使う。
//  ・出すかどうかはサーバーが survey_state で知らせる（教卓PCの大会設定画面で切り替え）
//  ・結果画面を読めるように少し待ってから出す。「ホームに戻る」「ロビーに戻る」を押したときはすぐ出す
window.KSurvey = (() => {
  const SHOW_DELAY_MS = 30 * 1000;
  const SCALE_LABELS = ['とても悪い', '悪い', 'ふつう', '良い', 'とても良い'];
  // 選択肢はサーバーの survey.js と同じにする（違う値は保存されない）
  const CHOICES = {
    good: ['札を取る操作', '読み上げの声', '実況（DJ）', '得点の表示', '見た目・デザイン', '敗者復活戦', '観戦モード', '用語の勉強になった'],
    bad:  ['クリックしても取れない', 'マウスカーソルが変・動かない', '札の文字が読みにくい', '音が出ない・ずれる・途切れる',
      '画面が止まった・動きが重い', '次の画面や観戦に正しく移らない', '何をすればいいか分からない', '特になし'],
  };
  const NONE = '特になし';   // ほかの「困ったところ」と同時には選べない

  const $s = id => document.getElementById(id);
  let state = { open: false, sessionId: null };
  let timer = null;
  let filledFor = null;      // 入力欄を準備した回（同じ回なら、閉じて開き直しても入力を残す）
  let skippedFor = null;     // 「答えずに閉じる」を押した回

  const pending = () => state.open && skippedFor !== state.sessionId && !(typeof BOT_LINK !== 'undefined' && BOT_LINK);
  const pressed = b => b.getAttribute('aria-pressed') === 'true';

  function makeButton(value, html, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sv-opt'; b.dataset.value = value; b.innerHTML = html;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => onClick(b));
    return b;
  }
  function buildForm() {
    document.querySelectorAll('#oSurvey .sv-scale').forEach(box => SCALE_LABELS.forEach((label, i) => {
      box.append(makeButton(i + 1, `<b>${i + 1}</b>${label}`, b => {
        [...box.children].forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        $s('svMsg').textContent = '';
      }));
    }));
    document.querySelectorAll('#oSurvey .sv-chips').forEach(box => CHOICES[box.dataset.key].forEach(label => {
      box.append(makeButton(label, label, b => {
        const on = !pressed(b);
        b.setAttribute('aria-pressed', String(on));
        if (on && box.dataset.key === 'bad') {
          [...box.children].forEach(x => { if (x !== b && (b.dataset.value === NONE || x.dataset.value === NONE)) x.setAttribute('aria-pressed', 'false'); });
        }
      }));
    }));
  }
  function resetForm() {
    document.querySelectorAll('#oSurvey .sv-opt').forEach(b => b.setAttribute('aria-pressed', 'false'));
    $s('svComment').value = '';
    $s('svMsg').textContent = '';
  }
  function collect() {
    const data = { sessionId: state.sessionId, comment: $s('svComment').value.trim() };
    document.querySelectorAll('#oSurvey .sv-scale').forEach(box => {
      const b = [...box.children].find(pressed);
      data[box.dataset.key] = b ? Number(b.dataset.value) : null;
    });
    document.querySelectorAll('#oSurvey .sv-chips').forEach(box => {
      data[box.dataset.key] = [...box.children].filter(pressed).map(b => b.dataset.value);
    });
    return data;
  }

  function hideForm() { $s('oSurvey').classList.add('hidden'); }
  function cancelTimer() { if (timer) { clearTimeout(timer); timer = null; } }
  function showNow() {
    if (!pending()) return;
    cancelTimer();
    if (document.pointerLockElement) document.exitPointerLock();
    $s('svSend').disabled = false;
    $s('oSurvey').classList.remove('hidden');
  }

  function submit(e) {
    e.preventDefault();
    const data = collect();
    if (![data.operation, data.visibility, data.clarity].every(Boolean)) {
      $s('svMsg').textContent = '1〜3 の質問を選んでから送信してください。';
      return;
    }
    $s('svSend').disabled = true;
    $s('svMsg').textContent = '送信中…';
    socket.timeout(8000).emit('survey_submit', data, (err, res) => {
      if (!err && res && res.ok) {
        state.open = false;
        $s('svMsg').textContent = 'ご協力ありがとうございました。';
        setTimeout(hideForm, 2000);
        return;
      }
      $s('svSend').disabled = false;
      $s('svMsg').textContent = res && res.reason === 'closed'
        ? '受付は終了しました。「答えずに閉じる」を押してください。'
        : '送信できませんでした。もう一度「送信する」を押してください。';
    });
  }

  buildForm();
  $s('surveyForm').addEventListener('submit', submit);
  $s('svSkip').addEventListener('click', () => { skippedFor = state.sessionId; cancelTimer(); hideForm(); });

  socket.on('survey_state', next => {
    const wasOpen = state.open;
    state = next || { open: false, sessionId: null };
    if (!state.open) { cancelTimer(); if (wasOpen) hideForm(); return; }
    if (filledFor !== state.sessionId) { resetForm(); filledFor = state.sessionId; }
    // 教卓PCが「出さない」から「出す」に戻した場合は、一度閉じた人にも改めて出す
    if (!wasOpen) skippedFor = null;
    if (pending() && !timer && $s('oSurvey').classList.contains('hidden')) timer = setTimeout(showNow, SHOW_DELAY_MS);
  });
  socket.on('back_to_lobby', showNow);

  return { showNow };
})();
