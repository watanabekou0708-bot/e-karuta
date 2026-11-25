'use strict';
// ヘッドフォン確認。参加者が大会モードを選ぶと、待機画面の前に3けたの番号を音声で流して入力させる。
// ブラウザはヘッドフォンを着けているかを検出できないので、「音が聞こえて番号を入力できること」で確認する。
// 番号は端末ごとにサーバーが決め、答え合わせもサーバーが行う。一度合えば、ページを読み込み直すまで聞かない。
// 出す・閉じるの判断は game.js の syncWaiting()、教卓の大会設定で「確認しない」にもできる。
window.KHeadphone = (() => {
  const CODE_PATTERN = /^[0-9]{3}$/;
  const PART_GAP_MS = 500;
  const WRONG_MESSAGE = 'コードが違います。';
  const NO_VOICE_MESSAGE = '音声を用意できません。先生に知らせてください。';

  let socket = null;
  let enabled = true;     // 教卓の設定（確認をするか）
  let passed = false;     // この画面で確認に合格したか
  let open = false;       // 確認の画面を出しているか
  let sound = null;       // 再生中の音声
  let playToken = 0;      // 再生の世代（古い再生の続きを止める）
  let hooks = { onPass: () => {}, onBack: () => {} };

  const el = id => document.getElementById(id);
  const setStatus = text => { el('hpStatus').textContent = text; };
  function setError(text) {
    el('hpError').textContent = text;
    el('hpError').classList.toggle('hidden', !text);
  }
  function stopSound() {
    playToken++;
    if (sound) { sound.stop(); sound = null; }
  }
  function showRetry(on) {
    el('hpRetry').classList.toggle('hidden', !on);
  }

  // サーバーに番号の音声をもらって流す
  function playCode() {
    stopSound();
    const token = playToken;
    const stale = () => token !== playToken || !open;
    const failed = () => {
      setStatus('');
      setError(NO_VOICE_MESSAGE);
      showRetry(true);
    };
    showRetry(false);
    setStatus('音声を準備しています…');
    socket.timeout(20000).emit('headphone_code_start', async (err, res) => {
      if (stale()) return;
      if (err || !res || !res.ok) { failed(); return; }
      const loaded = await Voice.preload(res.items, { ensure: true });
      if (stale()) return;
      if (loaded.failed) { failed(); return; }
      setStatus('🔊 番号を読み上げています');
      sound = Voice.play(res.items, { gapMs: PART_GAP_MS, onDone: () => { if (!stale()) setStatus('聞こえた番号を入力してください'); } });
    });
  }

  function submit() {
    const input = el('hpInput');
    const code = input.value.normalize('NFKC').trim();   // 全角の数字でも受け付ける
    if (!CODE_PATTERN.test(code)) { setError('3けたの数字を入力してください。'); input.focus(); return; }
    socket.timeout(10000).emit('headphone_code_check', { code }, (err, res) => {
      if (!open) return;
      if (err || !res) { setError('通信できませんでした。もう一度押してください。'); return; }
      if (res.correct) { passed = true; close(); hooks.onPass(); return; }
      input.value = '';
      input.focus();
      if (!res.expired) setError(WRONG_MESSAGE);
      playCode();   // もう一度音声を流す（サーバーが番号を忘れていた場合は新しい番号になる）
    });
  }

  function show() {
    open = true;
    el('hpInput').value = '';
    setError('');
    el('oHeadphone').classList.remove('hidden');
    playCode();
  }
  function close() {
    open = false;
    stopSound();
    el('oHeadphone').classList.add('hidden');
  }

  return {
    init(o) {
      socket = o.socket;
      hooks = { onPass: o.onPass, onBack: o.onBack };
      el('hpForm').addEventListener('submit', e => { e.preventDefault(); submit(); });
      el('hpRetry').addEventListener('click', () => { setError(''); playCode(); });
      el('hpBack').addEventListener('click', () => { close(); hooks.onBack(); });
    },
    setEnabled(on) { enabled = on; },
    // 確認がまだ必要か（合格前で、教卓の設定が「確認する」）
    isRequired: () => enabled && !passed,
    // wanted=true なら確認の画面を出す（出ていればそのまま）。false なら閉じる
    sync(wanted) {
      if (wanted && !open) show();
      else if (!wanted && open) close();
    },
  };
})();
