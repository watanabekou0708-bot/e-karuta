'use strict';
// 仮想カーソル（Pointer Lock）。
// 現実のかるたのように「手の定位置」を決めておく。ブラウザは本物のカーソルを強制移動できないため、
// Pointer Lock で本物のカーソルを隠し、マウスの動き量だけを受け取って画面上に仮想カーソルを描く。
// カーソルは普通は自由に動かせる（札を取れない間も同じ）。定位置の円へ戻すのは、
// 読み上げ開始の合図（「読み上げます」の発声開始）で game.js が moveHome() を呼んだときだけ。
// Pointer Lock が使えない／拒否された場合は、本物のカーソルのまま（制限なし）で遊べる。
window.KCursor = (() => {
  const st = {
    enabled: false,    // 対局中で、札を取る側の画面か
    locked: false,     // Pointer Lock が成立しているか
    fallback: false,   // Pointer Lock が使えない（本物のカーソルのまま遊ぶ）
    allowed: true,     // 今、札を取れる状態か（カーソルの動きには影響しない）
    x: 0, y: 0,        // 仮想カーソルの画面座標
  };
  let hooks = { home: () => ({ x: innerWidth / 2, y: innerHeight - 80 }), click: () => {}, hover: () => {}, move: () => {}, ready: () => {} };
  const $ = id => document.getElementById(id);
  const lockTarget = () => document.documentElement;

  function render() {
    const el = $('vCursor');
    if (!el) return;
    el.style.transform = `translate(${st.x}px, ${st.y}px)`;
    hooks.hover(st.x, st.y, st.locked);
    if (st.locked) hooks.move(st.x, st.y);
  }

  function moveHome() {
    const h = hooks.home();
    st.x = h.x; st.y = h.y;
    render();
  }

  function updateUi() {
    const cur = $('vCursor');
    const prompt = $('lockPrompt');
    const showCursor = st.enabled && st.locked;
    if (cur) cur.classList.toggle('hidden', !showCursor);
    if (prompt) prompt.classList.toggle('hidden', !(st.enabled && !st.locked && !st.fallback));
    document.body.classList.toggle('vcursor-on', showCursor);
    if (st.enabled && (st.locked || st.fallback)) hooks.ready();   // 仮想カーソル（または通常カーソル）に移った
  }

  // requestPointerLock は環境によって例外を投げたり Promise を reject したりするので、必ず Promise にそろえて受ける
  function tryLock(opts) {
    try {
      const p = lockTarget().requestPointerLock(opts);
      return p && p.then ? p : Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }
  // Esc で解除した直後（約1秒以内）に再要求するとブラウザが拒否する。拒否されても通常カーソルに固定せず、
  // 少し待って自動で再試行し、それでもだめなら案内を出したままにして、もう一度押せるようにする。
  // 通常カーソルで遊ぶのは、ブラウザが Pointer Lock に対応していないときだけ。
  const RELOCK_COOLDOWN_MS = 1300;
  const MAX_LOCK_TRIES = 3;
  let lastUnlockAt = 0, lockTries = 0, lockTimer = null, lockPending = false;
  function lockFailed() {
    if (!lockPending) return;              // rejectとpointerlockerrorの二重通知を1回にまとめる
    lockPending = false;
    if (st.locked || !st.enabled) return;
    if (++lockTries < MAX_LOCK_TRIES) {
      clearTimeout(lockTimer);
      lockTimer = setTimeout(attemptLock, RELOCK_COOLDOWN_MS);
    } else {
      lockTries = 0;                       // あきらめて案内を残す（もう一度クリックすれば試せる）
      const hint = $('lockPromptHint');
      if (hint) hint.textContent = 'うまく切り替わりませんでした。1秒ほど待ってからもう一度クリックしてください。';
      updateUi();
    }
  }
  function attemptLock() {
    if (st.locked || !st.enabled || lockPending) return;
    lockPending = true;
    // まず OS のマウス加速なし(unadjustedMovement)で試し、だめなら通常の Pointer Lock
    tryLock({ unadjustedMovement: true })
      .catch(() => tryLock())
      .then(() => { lockPending = false; }, lockFailed);
  }
  function requestLock() {
    if (!lockTarget().requestPointerLock) { st.fallback = true; updateUi(); return; }
    st.fallback = false;
    lockTries = 0;
    clearTimeout(lockTimer);
    const hint = $('lockPromptHint');
    if (hint) hint.textContent = '';
    const wait = Math.max(0, lastUnlockAt + RELOCK_COOLDOWN_MS - Date.now());   // 解除直後は少し待ってから要求
    if (wait > 0) lockTimer = setTimeout(attemptLock, wait); else attemptLock();
  }

  function releaseLock() {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  }

  document.addEventListener('pointerlockchange', () => {
    st.locked = document.pointerLockElement === lockTarget();
    if (st.locked) { st.fallback = false; lockPending = false; lockTries = 0; clearTimeout(lockTimer); moveHome(); }
    else lastUnlockAt = Date.now();
    updateUi();
    if (!st.locked) hooks.hover(-1, -1, false);
  });
  document.addEventListener('pointerlockerror', lockFailed);

  document.addEventListener('mousemove', e => {
    if (!st.locked || !st.enabled) return;
    st.x = Math.max(0, Math.min(innerWidth - 1, st.x + e.movementX));
    st.y = Math.max(0, Math.min(innerHeight - 1, st.y + e.movementY));
    render();
  }, true);

  document.addEventListener('mousedown', e => {
    if (!st.locked || !st.enabled) return;
    e.preventDefault();
    if (e.button === 0) hooks.click(st.x, st.y);
  }, true);

  window.addEventListener('DOMContentLoaded', () => {
    const prompt = $('lockPrompt');
    if (prompt) prompt.addEventListener('click', requestLock);
  });

  return {
    init(h) { hooks = Object.assign(hooks, h); },
    setEnabled(on) {
      if (st.enabled === on) return;
      st.enabled = on;
      if (!on) releaseLock();
      updateUi();
    },
    // 準備完了の通知を（再）送るために、今の状態でもう一度 ready フックを呼ぶ
    notifyReady() { if (st.enabled && (st.locked || st.fallback)) hooks.ready(); },
    setAllowed(a) { st.allowed = a; },
    // 仮想カーソルを使っている（Pointer Lock 成立中）か
    isVirtual() { return st.enabled && st.locked; },
    // 札を取る操作を受け付けてよい状態か。Pointer Lock を使う設定なのにまだ固定されていない間は受け付けない。
    canAct() { return !st.enabled || st.locked || st.fallback; },
    isFallback() { return st.fallback; },
    moveHome, render,
    state: st,
    // テスト用：Pointer Lock を使わずに仮想カーソルを強制的に有効化する
    _forceLocked(on) { st.locked = on; if (on) moveHome(); updateUi(); },
  };
})();
