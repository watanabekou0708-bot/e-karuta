'use strict';
// 大会モードの入場番号。大会設定で「ON」のとき、参加者は3けたの番号を合わせた人だけが大会モードに入れる。
// 番号はサーバーが自動で作って大会設定画面（教卓PC）にだけ表示し、答え合わせもサーバーが行う。
// 画面の順番は「入場番号 → ヘッドフォン確認 → 待機画面」。出す・閉じるの判断は game.js の syncWaiting()。
window.KEntry = (() => {
  const CODE_PATTERN = /^[0-9]{3}$/;
  const WRONG_MESSAGE = '番号が違います。';
  const WAIT_MESSAGE = '少し待ってから、もう一度押してください。';
  const NETWORK_MESSAGE = '通信できませんでした。もう一度押してください。';

  let socket = null;
  let enabled = true;       // 教卓の設定（番号が必要か）
  let passedCode = null;    // この画面で合格した番号（通信が切れて再接続したときに送り直す）
  let open = false;         // 入力画面を出しているか
  let hooks = { onPass: () => {}, onBack: () => {} };

  const el = id => document.getElementById(id);
  function setError(text) {
    el('entryError').textContent = text;
    el('entryError').classList.toggle('hidden', !text);
  }

  // サーバーに答え合わせをしてもらう。done には返事（通信できなければ null）を渡す
  function check(code, done) {
    socket.timeout(10000).emit('entry_code_check', { code }, (err, res) => {
      if (!err && res && res.correct) passedCode = code;
      done(err ? null : res);
    });
  }

  function submit() {
    const input = el('entryInput');
    const code = input.value.normalize('NFKC').trim();   // 全角の数字でも受け付ける
    if (!CODE_PATTERN.test(code)) { setError('3けたの数字を入力してください。'); input.focus(); return; }
    check(code, res => {
      if (!open) return;
      if (!res) { setError(NETWORK_MESSAGE); return; }
      if (res.correct) { close(); hooks.onPass(); return; }
      if (!res.wait) input.value = '';
      input.focus();
      setError(res.wait ? WAIT_MESSAGE : WRONG_MESSAGE);
    });
  }

  function show() {
    open = true;
    el('entryInput').value = '';
    setError('');
    el('oEntryCode').classList.remove('hidden');
    el('entryInput').focus();
  }
  function close() {
    open = false;
    el('oEntryCode').classList.add('hidden');
  }

  return {
    init(o) {
      socket = o.socket;
      hooks = { onPass: o.onPass, onBack: o.onBack };
      el('entryForm').addEventListener('submit', e => { e.preventDefault(); submit(); });
      el('entryBack').addEventListener('click', () => { close(); hooks.onBack(); });
    },
    setEnabled(on) { enabled = on; },
    // 教卓で設定を切り替えた（番号が作り直された）：合格を取り消す
    reset(on) { enabled = on; passedCode = null; },
    // 通信が切れて再接続した：サーバーでは新しい接続になるので、合格した番号を送り直す
    resend() {
      const code = passedCode;
      if (!code) return;
      passedCode = null;
      check(code, () => hooks.onPass());   // 番号が変わっていれば、入力画面が出る
    },
    // 番号の入力がまだ必要か（教卓の設定が「ON」で、合格前）
    isRequired: () => enabled && !passedCode,
    isEnabled: () => enabled,
    // wanted=true なら入力画面を出す（出ていればそのまま）。false なら閉じる
    sync(wanted) {
      if (wanted && !open) show();
      else if (!wanted && open) close();
    },
  };
})();
