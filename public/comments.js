'use strict';
// 観戦コメントの表示（観戦者と競技者の画面に流す）。
//  ・届いたコメントはいったん順番待ちに入れ、少しずつ間を空けて流す（リアルタイムでは流さない）
//  ・かるたの読み上げ中（「マウスを定位置に戻します」から「そこまで」まで）は絶対に流さない。
//    流れている途中で読み上げが始まったら、透明にしていって消す
//  ・表示のオン・オフは端末ごとに切り替えられる（このブラウザに保存する）
// 読み上げの開始・終了は game.js が setQuiet() で知らせる。
window.KComments = (() => {
  const LANES = 6;              // 縦方向の段の数
  const RELEASE_GAP_MS = 700;   // 順番待ちのコメントを流す間隔
  const FADE_MS = 350;          // 読み上げ開始で消すときの時間（読み上げの開始予定は通知の約0.4秒後）
  const QUEUE_MAX = 30;         // ためておく数の上限（超えた分は古いものから捨てる）
  const STORE_KEY = 'karutaShowComments';

  let quiet = false;
  let enabled = readEnabled();
  let queue = [];
  let timer = null;
  let lastReleaseAt = 0;
  let lane = 0;

  function readEnabled() {
    try { return localStorage.getItem(STORE_KEY) !== '0'; } catch (e) { return true; }
  }
  const layer = id => document.getElementById(id);
  const shownNodes = () => ['commentLayer', 'reactFloat'].flatMap(id => (layer(id) ? [...layer(id).children] : []));

  function fadeOutShown() {
    shownNodes().forEach(node => {
      node.classList.add('fading');
      setTimeout(() => node.remove(), FADE_MS + 50);
    });
  }

  function schedule() {
    if (timer || quiet || !enabled || !queue.length) return;
    timer = setTimeout(() => {
      timer = null;
      if (quiet || !enabled || !queue.length) return;
      lastReleaseAt = Date.now();
      queue.shift()();
      schedule();
    }, Math.max(0, lastReleaseAt + RELEASE_GAP_MS - Date.now()));
  }
  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }
  // show: 画面に出す処理。順番が来たときに呼ぶ
  function enqueue(show) {
    if (!enabled) return;
    queue.push(show);
    if (queue.length > QUEUE_MAX) queue.shift();
    schedule();
  }

  // コメントを画面の右から左へ流す。長い文章ほど長い時間をかける
  function flyComment({ name, color, text, isMe }) {
    const box = layer('commentLayer');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'spec-comment' + (isMe ? ' me' : '');
    const who = document.createElement('b');
    who.style.color = color || '#8fb4ff';
    who.textContent = name ? `${name}： ` : '';
    const body = document.createElement('span');
    body.textContent = text;   // textContent で入れるのでHTMLは解釈されない
    el.append(who, body);
    el.style.top = (lane++ % LANES) * (100 / LANES) + '%';
    const durationMs = Math.max(6000, Math.min(14000, 6000 + text.length * 180));
    el.style.animationDuration = durationMs + 'ms';
    box.appendChild(el);
    setTimeout(() => el.remove(), durationMs + 200);
  }

  return {
    comment(data) { enqueue(() => flyComment(data)); },
    // 絵文字リアクションなど、コメント以外の流れる表示も同じ順番待ちに入れる
    effect(show) { enqueue(show); },
    setQuiet(on) {
      if (quiet === on) return;
      quiet = on;
      if (quiet) { stopTimer(); fadeOutShown(); } else schedule();
    },
    isQuiet: () => quiet,
    isEnabled: () => enabled,
    setEnabled(on) {
      enabled = on;
      try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch (e) { /* 保存できなくても今の画面では効く */ }
      if (!on) { stopTimer(); queue = []; shownNodes().forEach(node => node.remove()); }
    },
    clear() {
      stopTimer();
      queue = [];
      shownNodes().forEach(node => node.remove());
    },
  };
})();
