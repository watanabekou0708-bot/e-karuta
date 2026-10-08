'use strict';

// ── Karuta data（IT用語一覧.xlsm の全790語。karuta-data.js をサーバーと共用）────
// lv: A〜D=出題レベル / 空=レベル未設定（出題せず、ダミー読みにだけ使う）
const KARUTA = window.KARUTA_DATA;
const KMAP = Object.fromEntries(KARUTA.map(k => [k.id, k]));

// ── Text-to-speech（答え合わせ TTS 用）───────────────────
let ttsVoice   = null;
let ttsUnlocked = false;

// 使用する声は Haruka（Windows標準の日本語音声）1本に固定する。
// 「読み上げます」や「そこまで」など発話ごとに違う声が選ばれてしまう
// 不具合の原因は、(1) 優先順位に複数OS由来の声（nanami/keita/kyoko/ichiro）
// が並んでいて端末によって別の声が選ばれていたことと、(2) 発話のたびに
// pickVoice() を呼び直さず、ページ読み込み直後にキャッシュした古い
// ttsVoice（＝音声一覧がまだ揃っていない時点の null）を使い回していた
// ことの2つだった。ここでは対象を1声のみにし、発話の直前に毎回
// pickVoice() を呼び直すことで両方の原因を取り除く。
const TTS_VOICE_PRIORITY = ['haruka'];

function pickVoice() {
  if (!window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices();
  const jaVoices = voices.filter(v => v.lang === 'ja-JP' || v.lang.startsWith('ja'));
  let picked = null;
  for (const name of TTS_VOICE_PRIORITY) {
    picked = jaVoices.find(v => v.name.toLowerCase().includes(name));
    if (picked) break;
  }
  ttsVoice = picked || null;
  return ttsVoice;
}

(function initTts() {
  if (!window.speechSynthesis) return;
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
  pickVoice();
})();

function unlockTts() {
  if (!window.speechSynthesis || ttsUnlocked) return;
  const primer = new SpeechSynthesisUtterance('');
  primer.volume = 0;
  speechSynthesis.speak(primer);
  setTimeout(() => speechSynthesis.cancel(), 0);
  ttsUnlocked = true;
}

// 上の句・下の句をキューに積んで順番に読み上げ（答え合わせ用）

function stopSpeech() {
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// ── DJ 実況（札取得・順位の実況を各自のイヤホンへ）─────────────
// サーバーから届いたコメントをキューに積み、詠み上げ・正解発表の音声が
// 完全に終わったタイミング（finishAnnouncing/finishTimeUp）でのみ再生する。
// 次の詠み上げ等が始まる瞬間は stopDjSpeech() で即座に打ち切り、絶対に
// 重ならないようにする（多少実況が途中で切れるのは許容する）。
let djQueue       = [];
let djSpeaking    = false;
// DJ実況が話し終わるまで、正解発表（そこまで／上の句／下の句）の開始を
// 待たせるための保留関数。DJ実況を最後まで再生してから次に進むため、
// 途中で打ち切ることはしない。
let pendingAfterDj = null;

// entry は文字列（ブラウザ音声）か { text, segments }（segments があり音声が揃っていれば VOICEVOX）
function enqueueDjComment(entry) {
  if (!entry) return;
  djQueue.push(entry);
  tryPlayDjQueue();
}
// DJ の文章を、部品の音声を取ってから（サーバーに無ければ生成を待ってから）順番にキューへ入れる
let djLoadChain = Promise.resolve();
function queueDj(text, segments) {
  djLoadChain = djLoadChain.then(async () => {
    if (!segments || !segments.length) return;
    const r = await Voice.preload(segments, { ensure: true });
    if (r.failed) { console.warn('[voice] 音声ファイルが揃わなかったためDJを省略:', text); return; }
    // 取得に時間がかかっている間に次の読み上げが始まっていたら、読み上げに重ならないよう捨てる
    if (currentPhase === 'reading' || currentPhase === 'decoy') return;
    enqueueDjComment({ text, segments });
  }).catch(() => {});
}

let djGeneration = 0;   // stopDjSpeech() 以前の古い発話の完了通知を無効化する

function stopDjSpeech() {
  djGeneration++;
  djQueue = [];
  djSpeaking = false;
  pendingAfterDj = null;
  if (curDjVoice) { curDjVoice.stop(); curDjVoice = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// ── 「音声が完全に終わってから」実行する保留キュー ─────────────────
// 正解発表（そこまで／上の句／下の句）やDJ実況の再生中に、次の札の詠み上げや
// 試合結果画面が割り込んで音声を打ち切ってしまわないよう、それらの処理を
// 音声が空くまで待たせる。端末ごとに音声の長さが違うため、ホストの完了通知を
// 待たずに各端末が「自分の音声が終わったか」で判断する。
// 万一 onend が発火せず永久に待ち続けないよう、maxMs 経過で強制実行する。
let idleWaiters = [];   // { fn, type }

function audioIdle() {
  return !isAnnouncing && !djSpeaking && !djQueue.length && !pendingAfterDj;
}

function whenAudioIdle(fn, type, maxMs) {
  if (audioIdle()) { fn(); return; }
  const w = { fn, type };
  idleWaiters.push(w);
  setTimeout(() => {
    const i = idleWaiters.indexOf(w);
    if (i !== -1) { idleWaiters.splice(i, 1); fn(); }
  }, maxMs);
}

function flushIdleWaiters() {
  if (!audioIdle() || !idleWaiters.length) return;
  const list = idleWaiters;
  idleWaiters = [];
  list.forEach(w => w.fn());
}

// 保留中の処理のうち、種類が type のものを破棄する（すでに取られた札の詠み上げ
// を後から始めてしまわないようにするため）。
function dropIdleWaiters(type) {
  idleWaiters = idleWaiters.filter(w => w.type !== type);
}

// TTS の onend が発火しない不具合への保険。単純なタイマーだと、実際の再生が
// 予想より長い場合に「読み上げ終了」と誤判定して次の詠み上げが割り込むため、
// 予想時間を過ぎても speechSynthesis がまだ話している間は待ち続ける。

function tryPlayDjQueue() {
  if (djSpeaking || !djQueue.length) {
    // キューが空になったタイミングで、DJ実況待ちの正解発表があればそれを、
    // なければ次の読み上げの自動開始待ちを実行する（音声が重ならないようにするため）。
    if (!djSpeaking && !djQueue.length) {
      if (pendingAfterDj) {
        const fn = pendingAfterDj;
        pendingAfterDj = null;
        const myGen = djGeneration;
        setTimeout(() => { if (myGen === djGeneration) fn(); }, ANNOUNCE_PAUSE_MS);   // DJ の後、間をおいて正解発表へ
      } else {
        flushIdleWaiters();
        maybeAutoReadNext();
      }
    }
    return;
  }
  // 正解発表（そこまで／上の句／下の句）の音声が流れている間は絶対に重ねない。
  if (isAnnouncing) return;
  const entry = djQueue.shift();
  djSpeaking = true;
  const myDjGen = djGeneration;
  const h = Voice.play(entry.segments, { gapMs: 120, onDone: () => {
    if (myDjGen !== djGeneration) return;
    curDjVoice = null; djSpeaking = false; markVoiceEnd(); tryPlayDjQueue();
  } });
  curDjVoice = h;
  if (!h) { djSpeaking = false; tryPlayDjQueue(); }
}

// ── Web Audio API（精密同期再生）────────────────────────────
let audioCtx      = null;
let audioBuffers  = {};   // 数値キー: 上の句MP3 / 'intro': 読み上げますMP3
let curSource     = null;
let curIntro      = null;

// 世代カウンタ（古い onended コールバックを無効化するため）
let audioGeneration = 0;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 30枚の新デッキ用に収録済みのMP3が無いため、音声素材が「一部は収録音声・
// 一部はTTS」で混在しないよう、事前録音音声の読み込みは一切行わず全読み上げを
// 音声合成（speechSynthesis）に統一する。将来 {id}.mp3 等を用意した場合に
// 備え、preloadAudio 自体は残す（中身を空にするだけ）。
async function preloadAudio() {
  console.log('[Audio] 収録音声は使用せず、読み上げは全て音声合成に統一します');
}

// ── VOICEVOX 音声の再生 ───────────────────────────────────────
// サーバーPCが作って配る音声ファイル(voice.js)で、読み上げ・正解発表・DJを再生する。
// 声の割り当て（voice-defs.js）：最初の読み上げ（警告・読み上げます・上の句）とそこまでは四国めたん、
// 答え合わせ（上の句の再読み上げ・下の句）は青山龍星、DJの実況・試合結果はずんだもん。
const VD = window.VOICE_DEFS;
// 音声と音声の間の、通常の短い間（「読み上げます」→上の句、上の句→下の句など）。
const VOICE_PAUSE_MS = 800;
// 「フライングに注意してください」が終わってから、「読み上げます」が始まるまでの間（少し長めに取る）。
const WARN_PAUSE_MS = 1500;
// 結果発表の中の大きな区切り（DJの実況→答え合わせ、そこまで→答え合わせ(DJ無し)、
// 答え合わせ→次の札の「マウスを定位置に戻します」）。そこまで→DJの実況は間を空けない（ポイント表示とほぼ同時にするため）。
const ANNOUNCE_PAUSE_MS = 1500;
let voiceEndedAt = 0;   // 直前の音声（DJ・正解発表）が終わった時刻（サーバー時計）。次の読み上げはここから VOICE_PAUSE_MS あける
function markVoiceEnd() { voiceEndedAt = hiResNow() + serverOffset; }
Voice.init({ getCtx: () => getAudioCtx(), nowServer: () => hiResNow() + serverOffset });
let curVoice = null;      // 読み上げ・正解発表の再生ハンドル
let curDjVoice = null;    // DJ の再生ハンドル
function stopVoice() { if (curVoice) { curVoice.stop(); curVoice = null; } }
function playVoiceItems(items, playAt, gen, onDone, onItemStart) {
  stopVoice();
  curVoice = Voice.play(items, { at: playAt, gapMs: 150, onItemStart, onDone: () => { if (gen === audioGeneration && onDone) onDone(); } });
  if (!curVoice && onDone) setTimeout(() => { if (gen === audioGeneration) onDone(); }, 0);
  return !!curVoice;
}
// 読み上げ：警告の案内 → 「読み上げます」→ 上の句
function playVoiceRead(yomi, playAt, gen, onDone) {
  const items = [{ ...VD.seg(VD.FIXED.warn), gapAfter: WARN_PAUSE_MS }, { ...VD.seg(VD.FIXED.intro), gapAfter: VOICE_PAUSE_MS }, VD.seg(yomi)];
  const ok = playVoiceItems(items, playAt, gen, onDone, i => {
    if (i === 1) armFlying();          // 「読み上げます」の発声開始：カーソルを定位置へ・フライング監視開始
    else if (i === 2) disarmFlying();  // 上の句の1文字目：監視終了
  });
  if (ok) setTimeout(() => { if (gen === audioGeneration && !introStarted) { introStarted = true; syncGrabAvailability(); } }, 9000);
  return ok;
}
// 時間切れ（誰も取れなかった）のときの正解発表：そこまで → 上の句 → 下の句（答え合わせ＝青山龍星）。
// ダミー読みのときは最後に「これは盤面にない札でした」。誰かが取ったときの実況は card_taken 側で別に組み立てる。
function voiceAnnounceItems(yomi, tori, withNotice) {
  const items = [{ ...VD.seg(VD.FIXED.timeup), gapAfter: ANNOUNCE_PAUSE_MS }, ...VD.answerSegments(yomi, tori)];
  if (withNotice) { items[2].gapAfter = VOICE_PAUSE_MS; items.push(VD.seg(VD.FIXED.notice, 'aoyama')); }
  return items;
}

// 読み上げ（警告 → 「読み上げます」→ 上の句）を、事前に用意した音声ファイルで再生する。
// 上の句が終わったら onDone() を呼ぶ（ホスト端末はこれで yomi_finished を送り、制限時間を始める）。
function scheduleReadCard(cardId, playAt, onDone) {
  playAt = Math.max(playAt, voiceEndedAt + ANNOUNCE_PAUSE_MS);
  audioGeneration++;
  const gen = audioGeneration;
  const card = KMAP[cardId];
  if (!card) return;
  playVoiceRead(card.yomi, playAt, gen, () => { if (gen === audioGeneration && onDone) onDone(); });
}

// ダミー読み（盤面に対応する札が無い読み上げ）。音声ファイルで再生し、終わったら onDone()。
function scheduleDecoyRead(decoyId, playAt, fallbackText, onDone) {
  playAt = Math.max(playAt, voiceEndedAt + ANNOUNCE_PAUSE_MS);
  audioGeneration++;
  const gen = audioGeneration;
  if (!fallbackText) return;
  playVoiceRead(fallbackText, playAt, gen, () => { if (gen === audioGeneration && onDone) onDone(); });
}

// 正解発表（上の句・下の句）を Web Audio で再生する。
// speechSynthesis を使わないことで、Web Audio ⇔ speechSynthesis 間の
// 音声デバイスのハンドオフが発生せず、ホスト機特有の遅延が起こらない。
// 対応する MP3 が無い場合は false を返し、呼び出し側で TTS にフォールバックする。
function scheduleAnnounceAudio(cardId, playAt, gen, onDone, prefixId) {
  const prefixBuf = prefixId ? audioBuffers[prefixId] : null;
  const topBuf    = audioBuffers[`${cardId}-top`];
  const bottomBuf = audioBuffers[`${cardId}-bottom`];
  if (!prefixBuf && !topBuf && !bottomBuf) return false;

  const ctx   = getAudioCtx();
  let delay = Math.max(0.05, ((playAt ?? hiResNow()) - hiResNow() - serverOffset) / 1000);

  if (prefixBuf) {
    const src = ctx.createBufferSource();
    src.buffer = prefixBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    curIntro = src;
    delay += prefixBuf.duration + 0.8; // 「そこまで」の後に間を置く
  }

  if (topBuf) {
    const src = ctx.createBufferSource();
    src.buffer = topBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    if (!prefixBuf) curIntro = src;
  }

  const bottomDelay = delay + (topBuf ? topBuf.duration : 0);
  if (bottomBuf) {
    const src = ctx.createBufferSource();
    src.buffer = bottomBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + bottomDelay);
    src.onended = () => { if (gen === audioGeneration) onDone(); };
    curSource = src;
  } else {
    setTimeout(() => { if (gen === audioGeneration) onDone(); }, bottomDelay * 1000);
  }
  return true;
}

function stopAllAudio() {
  audioGeneration++;   // 古い onended コールバックを無効化
  stopSpeech();
  if (curSource) { try { curSource.stop(); } catch(e) {} curSource = null; }
  if (curIntro)  { try { curIntro.stop();  } catch(e) {} curIntro  = null; }
  stopVoice();
  // （以前は AudioContext を suspend していたが、VOICEVOX の音声を Web Audio で再生するようになり、
  //   止めると次の再生の予約時刻がずれるため、止めない）
}

// ── Clock sync（5回計測・中央値でNTP誤差を最小化）────────
// Date.now() は Windows では ~15ms 単位でしか更新されないため、毎回呼ぶと
// 測定ごとに最大15msのジッターが乗ってしまう。起動時に一度だけ Date.now() を
// 基準点に固定し、以降は高分解能の performance.now()（monotonic）からの
// 経過時間を加算してサブミリ秒精度の「現在時刻」を得る。
const clientAnchorDate = Date.now();
const clientAnchorPerf = performance.now();
function hiResNow() {
  return clientAnchorDate + (performance.now() - clientAnchorPerf);
}

function measureOffset() {
  return new Promise(resolve => {
    const t1 = hiResNow();
    socket.emit('time_sync', { t1 });
    socket.once('time_sync', ({ t1: s1, t2 }) => {
      const t3 = hiResNow();
      resolve(t2 - (s1 + t3) / 2);
    });
  });
}

async function syncClock() {
  const offsets = [];
  for (let i = 0; i < 5; i++) {
    offsets.push(await measureOffset());
    if (i < 4) await new Promise(r => setTimeout(r, 100));
  }
  offsets.sort((a, b) => a - b);
  serverOffset = offsets[2]; // 中央値を採用
  console.log(`[Sync] オフセット: ${serverOffset.toFixed(1)} ms（5回中央値）`);
}

// ゲーム中も時計のずれが蓄積しないよう、30秒おきに再同期する
setInterval(syncClock, 30000);

// ── 現在のフェーズ ────────────────────────────────────────
let currentPhase = 'waiting'; // 'waiting' | 'reading' | 'decoy' | 'announcing'
// 今の読み上げで「読み上げます」の発声が始まったか。始まるまでは（警告の案内中は）札を取れない。
let introStarted = true;

// ── 取得通知（画面表示）──────────────────────────────────────
let takenNotifTimer = null;

function showTakenNotif(name, color) {
  const notif = $('takenNotif');
  if (!notif) return;
  if (takenNotifTimer) { clearTimeout(takenNotifTimer); takenNotifTimer = null; }
  notif.style.borderColor = color;
  notif.querySelector('.tn-dot').style.background = color;
  notif.querySelector('.tn-name').textContent = name;
  notif.querySelector('.tn-label').textContent = ' が獲得！';
  notif.className = 'taken-notif';
  void notif.offsetWidth;
  takenNotifTimer = setTimeout(() => {
    notif.classList.add('tn-fade');
    setTimeout(() => notif.classList.add('hidden'), 500);
  }, 2800);
}

function showTimeUpNotif() {
  const notif = $('takenNotif');
  if (!notif) return;
  if (takenNotifTimer) { clearTimeout(takenNotifTimer); takenNotifTimer = null; }
  notif.style.borderColor = '#ffcf5c';
  notif.querySelector('.tn-dot').style.background = '#ffcf5c';
  notif.querySelector('.tn-name').textContent = '⏰ そこまで';
  notif.querySelector('.tn-label').textContent = '！';
  notif.className = 'taken-notif';
  void notif.offsetWidth;
  takenNotifTimer = setTimeout(() => {
    notif.classList.add('tn-fade');
    setTimeout(() => notif.classList.add('hidden'), 500);
  }, 2800);
}

// ── ハウス得点（ハウス編成済みの場合のみ）───────────────────
function computeHouseScores(players) {
  const scores = { A: 0, B: 0, C: 0, D: 0 };
  if (!currentHouses) return scores;
  Object.entries(currentHouses).forEach(([hid, ids]) => {
    ids.forEach(id => {
      const p = players[id];
      if (p) scores[hid] = (scores[hid] || 0) + (p.score || 0);
    });
  });
  return scores;
}

function renderHouseScoreboard(players) {
  if (!currentHouses) return;
  const scores = computeHouseScores(players);
  const html = Object.entries(scores)
    .map(([hid, s]) => `<div class="house-score-chip"><span>${HOUSE_LABELS[hid] || hid}</span><span class="hs-score">${fmtPts(s)}点</span></div>`)
    .join('');
  const wrap = $('houseScoreWrap');
  const list = $('houseScoreList');
  if (list) list.innerHTML = html;
  if (wrap) wrap.classList.remove('hidden');
  const specList = $('specHouseScores');
  if (specList) specList.innerHTML = html;
}

// 点数の表記（12,345）。得点はポイント制（札1枚で最大10万点）。
const fmtPts = n => Math.round(n || 0).toLocaleString('ja-JP');
// 読み上げ用の点数表記（"12340" → "1万2340点"）。server.js の spokenPoints と同じ。
function spokenPoints(n) {
  const v = Math.round(n);
  if (v < 0) return `マイナス${spokenPoints(-v)}`;
  if (v >= 10000) {
    const man = Math.floor(v / 10000), rest = v % 10000;
    return rest ? `${man}万${rest}点` : `${man}万点`;
  }
  return `${v}点`;
}

// 同じ点数なら同順位（1位,1位,3位…）にする。
// sortedEntries は [id, player] を点数の多い順に並べた配列。各要素の順位の配列を返す。
function competitionRanks(sortedEntries) {
  const ranks = [];
  sortedEntries.forEach(([, p], i) => {
    ranks.push(i > 0 && p.score === sortedEntries[i - 1][1].score ? ranks[i - 1] : i + 1);
  });
  return ranks;
}

// ── ランキング（全員分。左の縦いっぱいに表示し、入りきらない分はスクロール）─────────
// 順位は名前の先頭のアイコンだけで示す（🥇🥈🥉／4位以降は数字）。1〜3位が複数名いても
// 色は変えず、自分の行だけを青で強調する。
const RANK_ICONS = ['🥇', '🥈', '🥉'];
const rankIcon = r => (r <= 3 ? RANK_ICONS[r - 1] : String(r));
let lastRankUserScroll = 0;
(function watchRankScroll() {
  const mark = () => { lastRankUserScroll = Date.now(); };
  window.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('top3');
    if (!el) return;
    ['wheel', 'mousedown', 'touchmove'].forEach(ev => el.addEventListener(ev, mark, { passive: true }));
  });
})();

function renderTop3(players) {
  renderHouseScoreboard(players);
  const el = $('top3');
  if (!el) return;
  const all = Object.entries(players)
    .filter(([id, p]) => !(id === liveHostId && isEventMode) && (p.isBot || p.joined))
    .sort(([, a], [, b]) => b.score - a.score);
  const ranks = competitionRanks(all);
  // 全員が同じ点数（試合開始直後の全員0点など）のときは、全員に🥇を付けず「－」にする
  const allTied = all.length > 1 && all[0][1].score === all[all.length - 1][1].score;
  const keep = el.scrollTop;
  el.innerHTML = all.map(([id, p], i) => {
    const cpuTag = p.isBot ? '<span class="t3-cpu">CPU</span>' : '';
    const youTag = id === myId ? '<span class="t3-you">YOU</span>' : '';
    return `<div class="t3-row${id === myId ? ' me' : ''}" data-id="${escHtml(id)}">
      <span class="t3-rank">${allTied ? '－' : rankIcon(ranks[i])}</span>
      <span class="t3-name">${escHtml(p.name)}${cpuTag}${youTag}</span>
      <span class="t3-score">${fmtPts(p.score)}<small>点</small></span>
    </div>`;
  }).join('');
  const cnt = $('rankCount');
  if (cnt) cnt.textContent = `（${all.length}人）`;
  el.scrollTop = keep;
  // 自分の行が画面外ならスクロールして見せる（本人が自分でスクロールして見ている間は触らない）
  if (Date.now() - lastRankUserScroll > 6000) {
    const me = el.querySelector('.t3-row.me');
    if (me) {
      const top = me.offsetTop - el.offsetTop, bottom = top + me.offsetHeight;
      if (top < el.scrollTop) el.scrollTop = top - 4;
      else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight + 4;
    }
  }
}

// ── App state ─────────────────────────────────────────────
const socket    = io();
let myId        = null;
let myIsHost    = false;
let isServerPc  = false;   // サーバーを立ち上げているPC自身のブラウザか（大会モードの操作はここだけ）
let liveHostId  = null;   // ホスト除外フィルタ用
let liveData    = null;
let nameEntered = false;  // doJoin 済みフラグ（init 遅延対策）
let livePlayers = {};
let timerInt    = null;
let seconds     = 0;
let serverOffset = 0;
let gameStarted = false;
let isArranging = false;   // 盤面整理タイム中か（対局画面の上で行う）

// ── トーナメント状態 ──────────────────────────────────────
let currentRound    = 1;
let maxRounds       = 4;
let survivorCount   = 3;
let myIsSpectator   = false;    // 敗退して観戦中か
let liveTotalCards  = 10;       // 今試合の総札数（進捗バー計算用）
let liveEliminatedIds = new Set();

// ── 敗者復活戦状態 ────────────────────────────────────────
let isRevivalMode            = false;
let myIsRevivalSpectator     = false;
let revivalCount             = 1;
let revivalSelectedIds       = new Set();
let revivalRound             = 1;
let revivalMaxRounds         = 3;
let revivalSurvivorCount     = 3;
let revivalEliminatedIds     = new Set();

// ── グループ戦状態 ────────────────────────────────────────
let isGroupMatch         = false;
let groupTier            = null;
let humanGroups          = null;
let myIsGroupSpectator   = false;
let groupParticipantIds  = new Set();
let groupRound           = 1;
let groupMaxRounds       = 3;
let groupSurvivorCount   = 3;
let groupEliminatedIds   = new Set();
let groupHumanCount      = 0;

// ── ポストトーナメント状態 ────────────────────────────────
let postTournament       = false;
let bottomGroupWinners   = null;
let middleGroupWinners   = null;

// ── 大会モード（1/8本番用）状態 ─────────────────────────────
let isEventMode          = false;
let eventStage           = null;
let eventStageLabel      = null;
let eventParticipantIds  = new Set();
let eventGamesPlayed     = {};
let myIsEventSpectator   = false;

// ── 試合開始前の人数内訳（暗記タイムで表示）────────────────
let matchHeadcount = { humanCount: 0, cpuCount: 0, totalCount: 0 };

// 上の句読み上げ中に表示しないが TTS フォールバック用に保持するテキスト
let currentReadingYomiText = '';

// ── Utilities ─────────────────────────────────────────────
const $    = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function startTimer() {
  if (timerInt) clearInterval(timerInt);
  seconds = 0;
  $('timer').textContent = '00:00';
  timerInt = setInterval(() => { seconds++; $('timer').textContent = fmtTime(seconds); }, 1000);
}

function stopTimer() { clearInterval(timerInt); timerInt = null; }

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Host UI ───────────────────────────────────────────────
let lobbyMode             = null;   // null | 'practice' | 'event'（ロビーでホストが選ぶモード）
// postTournament による「練習モードへ自動遷移」は、ロビーに入り直すたびに
// 一度だけ適用する。これが無いと、自動遷移後に「← モード選択に戻る」を押しても
// updateLobbyUI() が呼ばれるたびに practice へ引き戻されてしまい、
// 大会モードを選び直せなくなる（＝大会モードのボタンが出てこない不具合）。
let modeAutoApplied       = false;
let selectedCpuDifficulty = 'normal';

function selectCpuDifficulty(d) {
  selectedCpuDifficulty = d;
  document.querySelectorAll('[data-cpudiff]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cpudiff === d);
  });
}

function startGame() {
  const btn = $('lobbyStartBtn');
  if (btn) btn.disabled = true;
  socket.emit('start_game', {
    cpuDifficulty: selectedCpuDifficulty,
  });
}

function startNextRound() {
  socket.emit('start_next_round');
}

// ── 大会モード（1/8本番用）ホスト操作 ───────────────────────
function startEvent() {
  const btn = $('lobbyEventStartBtn');
  if (btn) btn.disabled = true;
  socket.emit('start_event');
}

function advanceEvent(which) {
  ['evMainBtn', 'evRevivalBtn', 'evNextBtn'].forEach(id => { const b = $(id); if (b) b.disabled = true; });
  socket.emit('advance_event', which ? { which } : {});
}

function switchRrMode(mode) {
  const mainSec    = $('rrMainSection');
  const revivalSec = $('rrRevivalSection');
  const tabMain    = $('rrTabMain');
  const tabRevival = $('rrTabRevival');
  if (mode === 'main') {
    mainSec    && mainSec.classList.remove('hidden');
    revivalSec && revivalSec.classList.add('hidden');
    tabMain    && tabMain.classList.add('active');
    tabRevival && tabRevival.classList.remove('active');
  } else {
    mainSec    && mainSec.classList.add('hidden');
    revivalSec && revivalSec.classList.remove('hidden');
    tabMain    && tabMain.classList.remove('active');
    tabRevival && tabRevival.classList.add('active');
  }
}

function toggleRevivalUser(id) {
  if (revivalSelectedIds.has(id)) {
    revivalSelectedIds.delete(id);
  } else {
    revivalSelectedIds.add(id);
  }
  // チェックボックスの状態を更新
  const cb = document.querySelector(`#rrRevivalUsers [data-id="${id}"]`);
  if (cb) cb.checked = revivalSelectedIds.has(id);
}

function toggleAllRevivalUsers() {
  const items = document.querySelectorAll('#rrRevivalUsers [data-id]');
  const allChecked = [...items].every(cb => cb.checked);
  items.forEach(cb => {
    const id = cb.dataset.id;
    if (allChecked) {
      revivalSelectedIds.delete(id);
      cb.checked = false;
    } else {
      revivalSelectedIds.add(id);
      cb.checked = true;
    }
  });
}

function renderRevivalUserList(players) {
  const ul = $('rrRevivalUsers');
  if (!ul) return;
  ul.innerHTML = '';
  revivalSelectedIds.clear();
  const elimHumans = Object.entries(players)
    .filter(([id, p]) => liveEliminatedIds.has(id) && !p.isBot && p.joined && !(id === liveHostId && isEventMode))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'ja'));

  elimHumans.forEach(([id, p]) => {
    revivalSelectedIds.add(id); // デフォルト全選択
    const item = document.createElement('label');
    item.className = 'rr-user-item';
    item.innerHTML = `
      <input type="checkbox" data-id="${id}" checked onchange="toggleRevivalUser('${id}')">
      <span class="rr-user-dot" style="background:${p.color}"></span>
      <span>${escHtml(p.name)}</span>`;
    ul.appendChild(item);
  });
  if (elimHumans.length === 0) {
    ul.innerHTML = '<div style="padding:.4rem;color:var(--dim);font-size:.85rem">敗退者がいません</div>';
  }
}

// ── House assignment（ハウス編成・大会モード）───────────────
const HOUSE_LABELS = { A: '🔴 Aハウス', B: '🔵 Bハウス', C: '🟢 Cハウス', D: '🟡 Dハウス' };
let myHouse        = null;
let currentHouses  = null;

function assignHouses() {
  socket.emit('assign_houses');
}

function renderHouseList(houses, players) {
  const wrap = $('lobbyHouseList');
  if (!wrap || !houses) return;
  wrap.innerHTML = Object.entries(houses).map(([hid, ids]) => {
    const rows = ids.map(id => {
      const p = players[id];
      if (!p) return '';
      return `<div class="house-member">${escHtml(p.name)} <small>（${escHtml(p.grade || '')}年 ${escHtml(p.course || '')}）</small></div>`;
    }).join('');
    return `<div class="house-block"><div class="house-block-title">${HOUSE_LABELS[hid] || hid}（${ids.length}人）</div>${rows}</div>`;
  }).join('');
}

// ── ロビーのモード選択（練習モード／大会モード）─────────────
function chooseLobbyMode(mode) {
  lobbyMode = mode;
  updateLobbyUI();
}

function backToLobbyModeSelect() {
  lobbyMode = null;
  modeAutoApplied = true;   // 明示的に戻った後は自動選択を再適用しない
  updateLobbyUI();
}

function updateLobbyUI() {
  const startBtn      = $('lobbyStartBtn');
  const waiting        = $('lobbyWaiting');
  const modeSelect      = $('lobbyModeSelect');
  const practiceSection = $('lobbyPracticeSection');
  const eventSection    = $('lobbyEventSection');
  const eventBtn = $('lobbyEventStartBtn');
  if (eventBtn) eventBtn.disabled = false;

  // 最終試合後（postTournament）に戻ってきた場合は練習モードへ自動遷移
  // （ロビーに入り直すたびに一度だけ。手動で戻った後は再適用しない）
  if (postTournament && !lobbyMode && !modeAutoApplied) {
    lobbyMode = 'practice';
    modeAutoApplied = true;
  }
  // 大会モードはサーバーPCだけが選べる。それ以外のユーザーは最初から練習モードの設定画面。
  const canEvent = isServerPc;
  if (!canEvent && !lobbyMode) lobbyMode = 'practice';
  if (!canEvent && lobbyMode === 'event') lobbyMode = 'practice';
  const evBtn = $('btnModeEvent');
  if (evBtn) evBtn.style.display = canEvent ? '' : 'none';
  document.querySelectorAll('#lobbyPracticeSection .btn-back').forEach(b => { b.style.display = canEvent ? '' : 'none'; });

  // 練習ゲームは参加登録済みの誰でも難易度を選んで開始できる（先に押した人の設定が全員に適用される）
  if (modeSelect)      modeSelect.style.display      = !lobbyMode ? '' : 'none';
  if (practiceSection) practiceSection.style.display = lobbyMode === 'practice' ? '' : 'none';
  if (eventSection)    eventSection.style.display    = (canEvent && lobbyMode === 'event') ? '' : 'none';

  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = 'ゲームスタート（全4試合：レベルA→B→C→D）';
  }
  if (waiting) waiting.style.display = 'none';
}

function updateHostNotice() {
  const notice = $('hostNotice');
  if (!notice) return;
  notice.classList.toggle('hidden', !(myIsHost && isEventMode && gameStarted) || isArranging);
  const amSpectating = (myIsSpectator || myIsRevivalSpectator || myIsGroupSpectator || myIsEventSpectator) && !myIsHost && gameStarted;
  const grid = $('grid');
  if (grid) {
    grid.classList.toggle('host-locked', myIsHost && isEventMode && gameStarted && !isArranging);
    grid.classList.toggle('hidden', amSpectating);
    const bw = $('boardWrap');
    if (bw) bw.classList.toggle('hidden', amSpectating);   // 観戦者は盤面の枠ごと隠し、観戦パネルを大きく使う
  }
  const specPanel = $('specPanel');
  if (specPanel) specPanel.classList.toggle('hidden', !amSpectating || isArranging);
  const debugBtn    = $('debugEndBtn');
  const debugCpuBtn = $('debugCpuBtn');
  // 練習モードは誰でも使える。大会モード中はサーバーPCだけ。
  const canDebug = isServerPc || !isEventMode;
  if (debugBtn)    debugBtn.style.display    = (canDebug && gameStarted) ? '' : 'none';
  if (debugCpuBtn) debugCpuBtn.style.display = (canDebug && gameStarted && !isArranging) ? '' : 'none';
  // ラウンドバッジ・観戦バッジ・盤面整理バッジ
  const rb = $('roundBadge');
  const sb = $('spectatorBadge');
  const ab = $('arrangeBadge');
  const groupTierName = groupTier === 'top' ? '上位' : groupTier === 'middle' ? '中位' : '下位';
  const roundLabel = isEventMode
    ? (eventStageLabel || '大会モード')
    : isGroupMatch
    ? `${groupTierName}グループ戦 R${groupRound}／${groupMaxRounds}${groupHumanCount > 0 ? ` (${groupHumanCount}人)` : ''}（通過${groupSurvivorCount}人）`
    : isRevivalMode
    ? `敗者復活戦 R${revivalRound}／${revivalMaxRounds}（通過${revivalRound >= revivalMaxRounds ? revivalCount : revivalSurvivorCount}人）`
    : `第${currentRound}試合`;
  if (rb) {
    rb.textContent = roundLabel;
    rb.classList.toggle('hidden', !gameStarted || isArranging);
  }
  if (ab) ab.classList.toggle('hidden', !isArranging);
  if (sb) sb.classList.toggle('hidden', !amSpectating);
  const rl = $('roundLabel');
  if (rl) rl.textContent = roundLabel;

  // 盤面整理タイム中はカード以外の情報を出さない（即終了デバッグボタンのみ残す）
  const chips       = $('chips');
  const progWrap     = $('progWrap');
  const readingWrap  = document.querySelector('.reading-wrap');
  const sideL = $('sideLeft');
  const sideR = $('sideRight');
  if (chips)       chips.classList.toggle('hidden', isArranging);
  // 盤面整理中も場所は残して見えなくする（display:none にすると盤面の幅が変わり、札の位置関係が崩れる）
  if (readingWrap) readingWrap.classList.toggle('ghost', isArranging);
  if (sideL) sideL.classList.toggle('ghost', isArranging);
  if (sideR) sideR.classList.toggle('ghost', isArranging);
  fitAll();
  refreshDebugButtons();
  // 残り枚数（進捗バー含む）はホストにのみ見せる
  if (progWrap) progWrap.classList.toggle('hidden', isArranging || !(myIsHost && isEventMode));
  const leftCountWrap = $('leftCountWrap');
  if (leftCountWrap) leftCountWrap.classList.toggle('hidden', !(myIsHost && isEventMode));
  // ホスト／観戦・盤面整理タイムの状態もここでまとめて変わるため、ホバー禁止マークも同期する
  syncGrabAvailability();
}

// デバッグ用：CPUに0〜600のランダムポイントを与える（ホストのみ）
function debugGiveCpuPoints() {
  if (!(isServerPc || !isEventMode) || !gameStarted) return;
  socket.emit('debug_cpu_points');
}

// canReadNext: サーバーが「読み上げ可能（waiting フェーズ）」と通知済みか
// isAnnouncing: 正解の上の句・下の句を TTS で読み上げている最中か
// → 両方揃った瞬間、ホスト端末が自動で次の札の読み上げをサーバーへ要求する
// （手動の「読み上げ」ボタンは、万一の取りこぼし時の保険として残す）。
let canReadNext    = false;
let isAnnouncing   = false;
let autoReadPending = false;

function updateReadBtnAvailability() {
  const btn = $('readBtn');
  if (btn) {
    // 練習モードは自動で次の札へ進むため、手動の読み上げボタンは表示しない
    const visible = myIsHost && canReadNext && isEventMode;
    btn.classList.toggle('hidden', !visible);
    btn.disabled = isAnnouncing;
    btn.title = isAnnouncing ? '正解の読み上げ中はお待ちください' : '次の上の句を読み上げる';
  }
  maybeAutoReadNext();
}

// 読み上げ可能になり、正解発表の音声も、DJ実況もすべて終わっていれば、
// ホストの操作を待たずに自動で次の札を読み上げる。「読み上げます」と
// DJ実況の声が重ならないよう、DJがまだキューに残っている／再生中の間は
// 自動読み上げを待たせる（DJ再生完了時に tryPlayDjQueue() から呼び直される）。
// read_next は waiting フェーズでのみ有効なため、二重に届いてもサーバー側で
// 無視される（安全策として autoReadPending でも連打を防ぐ）。
function maybeAutoReadNext() {
  if (!myIsHost || !canReadNext || isAnnouncing || autoReadPending) return;
  if (djSpeaking || djQueue.length) return;
  autoReadPending = true;
  socket.emit('read_next');
}

function showReadBtn() {
  canReadNext = true;
  autoReadPending = false;
  setCurrentPhase('waiting');
  if (myId !== null) myIsHost = (liveHostId === myId);
  updateReadBtnAvailability();
}

function hideReadBtn() {
  canReadNext = false;
  autoReadPending = false;
  updateReadBtnAvailability();
}

function readNext() {
  if (!myIsHost || isAnnouncing) return;
  if (djSpeaking || djQueue.length) return;   // DJ実況が終わるまで次の読み上げを待つ
  socket.emit('read_next');
}

// ── 学年・コース（ハウス編成用）───────────────────────────
// 医療ビジネス科はかるた大会の対象外のため選択肢に含めない
const COURSE_OPTIONS = {
  '1': ['アプリコース', 'プログラムコース'],
  '2': ['ITスペシャリストコース', '画像クリエイトコース', 'ITエンジニアコース', 'ビジュアルデザインコース', 'ビジネスITコース'],
  '3': ['ITスペシャリストコース', '画像クリエイトコース'],
};

function updateCourseOptions() {
  const gradeSel  = $('gradeSelect');
  const courseSel = $('courseSelect');
  if (!gradeSel || !courseSel) return;
  const opts = COURSE_OPTIONS[gradeSel.value] || [];
  courseSel.innerHTML = opts.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
}
updateCourseOptions();

// ── Name entry ────────────────────────────────────────────
// 展示用リンク（アドレスの最後に ?practice を付けたもの）では、名前だけ入力する。
// 学年・コースは大会モードのハウス編成にだけ使うため、練習用リンクでは聞かない。
const PRACTICE_LINK = new URLSearchParams(location.search).has('practice');
(function applyPracticeLink() {
  if (!PRACTICE_LINK) return;
  const row = document.querySelector('.grade-course-row');
  if (row) row.style.display = 'none';
})();

function doJoin() {
  const name = $('nameInput').value.trim();
  if (!name) { $('nameInput').focus(); return; }
  const gradeSel  = $('gradeSelect');
  const courseSel = $('courseSelect');
  const grade  = (!PRACTICE_LINK && gradeSel)  ? gradeSel.value  : null;
  const course = (!PRACTICE_LINK && courseSel) ? courseSel.value : null;
  unlockTts();
  getAudioCtx();
  socket.emit('set_name', { name, grade, course });
  hide('oName');
  nameEntered = true;
  if (liveData) applyInit(liveData);
}

document.getElementById('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doJoin();
});

// ── Apply init state ──────────────────────────────────────
function applyInit(d) {
  myIsHost = (d.hostId === myId);

  // トーナメント状態を同期
  if (d.round)              currentRound  = d.round;
  if (d.maxRounds)          maxRounds     = d.maxRounds;
  if (d.survivorCount)      survivorCount = d.survivorCount;
  if (d.revivalCount)       revivalCount  = d.revivalCount;
  if (d.totalCards)         liveTotalCards = d.totalCards;
  if (d.isRevival !== undefined) isRevivalMode = d.isRevival;
  if (d.isGroupMatch !== undefined) isGroupMatch = d.isGroupMatch;
  if (d.groupTier)          groupTier    = d.groupTier;
  if (d.humanGroups)        humanGroups  = d.humanGroups;
  if (d.groupParticipantIds) groupParticipantIds = new Set(d.groupParticipantIds);
  if (d.postTournament !== undefined) postTournament = d.postTournament;
  if (d.bottomGroupWinners !== undefined) bottomGroupWinners = d.bottomGroupWinners;
  if (d.middleGroupWinners !== undefined) middleGroupWinners = d.middleGroupWinners;
  if (d.eliminatedPlayers) {
    liveEliminatedIds = new Set(d.eliminatedPlayers);
    // 練習モードでは敗退しても観戦モードにはしない（大会モードのみ観戦扱い）
    myIsSpectator = liveEliminatedIds.has(myId) && d.isEvent;
  }
  if (d.revivalRound !== undefined)        revivalRound         = d.revivalRound;
  if (d.revivalMaxRounds !== undefined)    revivalMaxRounds     = d.revivalMaxRounds;
  if (d.revivalSurvivorCount !== undefined) revivalSurvivorCount = d.revivalSurvivorCount;
  if (d.revivalEliminated)                 revivalEliminatedIds = new Set(d.revivalEliminated);
  if (d.groupRound !== undefined)          groupRound           = d.groupRound;
  if (d.groupMaxRounds !== undefined)      groupMaxRounds       = d.groupMaxRounds;
  if (d.groupSurvivorCount !== undefined)  groupSurvivorCount   = d.groupSurvivorCount;
  if (d.groupEliminated)                   groupEliminatedIds   = new Set(d.groupEliminated);
  if (d.houses !== undefined)              currentHouses        = d.houses;
  if (d.isEvent !== undefined)             isEventMode          = d.isEvent;
  if (d.eventStage !== undefined)          eventStage           = d.eventStage;
  if (d.eventStageLabel !== undefined)     eventStageLabel      = d.eventStageLabel;
  if (d.eventParticipantIds)               eventParticipantIds  = new Set(d.eventParticipantIds);
  if (d.eventGamesPlayed)                  eventGamesPlayed     = d.eventGamesPlayed;

  // 復活戦中なら本戦勝者は観戦扱い（復活戦で脱落済みも観戦）。練習モードでは観戦にしない。
  myIsRevivalSpectator = d.isRevival && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost && d.isEvent;
  // グループ戦中ならグループ外または脱落済みは観戦。練習モードでは観戦にしない。
  myIsGroupSpectator   = d.isGroupMatch && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId)) && d.isEvent;
  // 大会モード中は現在のステージの参加者以外は観戦
  myIsEventSpectator   = isEventMode && !myIsHost && !eventParticipantIds.has(myId);

  updateChips(d.players);

  if (d.phase === 'lobby') {
    openLobby(d.players);
  } else if (d.phase === 'memorizing') {
    openArrangeScreen(d.cardOrder, d.cards, d.endsAt, d.players, d.round, d.layout);
  } else if (['waiting', 'reading', 'decoy', 'announcing'].includes(d.phase)) {
    gameStarted = true;
    isArranging = false;
    stopArrangeCountdown();
    hide('oLobby'); hide('oGameOver'); hide('oRoundResult');
    renderGrid(d.cardOrder, new Set(d.remaining), 'play');
    renderTop3(d.players);
    $('leftCount').textContent = d.remaining.length;
    $('progFill').style.width = ((liveTotalCards - d.remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
    isAnnouncing = false;
    if (d.phase === 'waiting') {
      $('readingText').textContent = '— 準備中 —';
      showReadBtn();
    } else {
      introStarted = true;   // 途中参加：発声の開始は分からないので、取れる状態から始める
      setCurrentPhase((d.phase === 'reading' || d.phase === 'decoy') ? d.phase : 'announcing');
      if (d.phase === 'reading' || d.phase === 'decoy') {
        $('readingText').textContent = '📢 読み上げ中...';
      } else {
        $('readingText').textContent = d.currentCard ? d.currentCard.yomi : '—';
      }
      hideReadBtn();
    }
    startTimer();
    updateHostNotice();
  } else if (d.phase === 'round_finished' && d.lastRoundResult) {
    const r = d.lastRoundResult;
    if (r.humanGroups) humanGroups = r.humanGroups;
    showRoundResult(r.round, r.players, r.survivorIds, r.eliminatedIds, r.survivorCount, r.isFinal, r.isRevival, r.isGroupMatch, r.groupTier, r.isRevivalIntermediate, r.revivalRound, r.revivalMaxRounds, r.isGroupMatchIntermediate, r.groupRound, r.groupMaxRounds);
  } else if (d.phase === 'finished') {
    showGameOver(d.players);
  }
}

// ── Lobby ─────────────────────────────────────────────────
function openLobby(players) {
  // 式典が進行中の場合は途中でキャンセルする
  if (_ceremonyTimer) { clearTimeout(_ceremonyTimer); _ceremonyTimer = null; }
  _ceremonyCallback = null;

  stopAllAudio();
  gameStarted          = false;
  syncGrabAvailability();
  isAnnouncing         = false;
  canReadNext          = false;
  currentPhase         = 'waiting';
  currentRound         = 1;
  myIsSpectator        = false;
  myIsRevivalSpectator = false;
  isRevivalMode        = false;
  revivalSelectedIds   = new Set();
  revivalRound         = 1;
  revivalMaxRounds     = 3;
  revivalSurvivorCount = 3;
  revivalEliminatedIds = new Set();
  isGroupMatch         = false;
  groupTier            = null;
  // humanGroups / postTournament / bottomGroupWinners / middleGroupWinners は
  // back_to_lobby / applyInit で設定されるため openLobby ではリセットしない
  myIsGroupSpectator   = false;
  groupParticipantIds  = new Set();
  groupRound           = 1;
  groupMaxRounds       = 3;
  groupSurvivorCount   = 3;
  groupEliminatedIds   = new Set();
  groupHumanCount      = 0;
  liveEliminatedIds    = new Set();
  liveTotalCards       = 10;
  isEventMode          = false;
  eventStage           = null;
  eventParticipantIds  = new Set();
  myIsEventSpectator   = false;
  lobbyMode            = null;
  modeAutoApplied      = false;
  hideScorePanel();
  clearSpectatorChat();
  $('lobbyUrl').textContent = window.location.href;
  renderLobbyList(players);
  hide('oName'); hide('oGameOver'); hide('oRoundResult'); hide('oCeremony'); hide('oEventResult');
  show('oLobby');
  updateLobbyUI();
  updateHostNotice();
}

function renderLobbyList(players) {
  const ul = $('lobbyList');
  ul.innerHTML = '';
  Object.entries(players)
    .filter(([, p]) => !p.isBot && p.joined)   // ロビーには CPU と未参加者を表示しない
    .forEach(([id, p]) => {
      const row = document.createElement('div');
      row.className = 'lobby-row';
      const isHost = id === liveHostId;
      row.innerHTML = `
        <span class="lobby-dot" style="background:${p.color}"></span>
        <span class="lobby-name">${escHtml(p.name)}</span>
        ${id === myId ? '<span class="lobby-you">あなた</span>' : ''}
        ${isHost      ? '<span class="lobby-host">👑 ホスト</span>' : ''}`;
      ul.appendChild(row);
    });
}

function requestLobby() { socket.emit('go_to_lobby'); }

function leaveLobby() {
  if (!confirm('退室しますか？')) return;
  socket.disconnect();
  location.reload();
}

// ── 盤面整理タイム（対局画面そのものの上で行う）─────────────
// 別画面には遷移せず、対局と同じ #grid の上でカードを散らして表示する。
// 上半分（相手側・固定）は自分から見て逆さま、下半分（自分側）だけ
// ドラッグで自由に動かせる、実際の競技かるたのレイアウトを再現する。
// 決めた位置・向き（cardLayout）が、そのまま本番の対局画面に引き継がれる。
let arrangeInterval = null;
let cardLayout = {};   // id → { x, y, rot, zone: 'top'|'bottom' }（x,y は盤面の論理px・札の中心。試合ごとにリセット）
let cardSizes  = {};   // id → { w, h }（札の論理サイズ。用語の長さに合わせて横幅が変わる）

// 盤面は論理サイズ 1280×880 で作り、画面に収まるよう拡大縮小して表示する。
// 盤面整理タイムと対局で同じ論理サイズなので、画面の大きさや左右パネルの有無で札が重なることはない。
// BOARD_W / BOARD_H / HOME は server.js と一致させること（距離ポイントの計算に使う）。
const BOARD_W = 1280;
const BOARD_H = 880;
const HOME    = { x: BOARD_W / 2, y: BOARD_H - 46, r: 38 };   // マウスの定位置（盤面の下端中央）
const BOARD_FAR = Math.hypot(Math.max(HOME.x, BOARD_W - HOME.x), HOME.y);   // 定位置から一番遠い角までの距離(px)
const CARD_W = 180, CARD_H = 100;                                          // 札の大きさ(px)
// 長さの表示と判定は mm。画面の札(横180px)を実物の取り札(横 CARD_REAL_W_MM mm)に見立てた縮尺
// （キャリブレーション）で px から換算する。server.js と同じ式。
const CARD_REAL_W_MM = window.GAME_CONFIG.CARD_REAL_W_MM;
const MM_PER_PX   = CARD_REAL_W_MM / CARD_W;
const BOARD_FAR_MM = BOARD_FAR * MM_PER_PX;
const ACC_FULL_MM = Math.hypot(CARD_W / 2, CARD_H / 2) * MM_PER_PX;       // 札の中心から角まで。これ以上ズレると精度0点
let boardScale = 1;

function fitBoard() {
  const wrap = $('boardWrap'), grid = $('grid');
  if (!wrap || !grid) return;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  if (!w || !h) return;
  boardScale = Math.max(0.25, Math.min(w / BOARD_W, h / BOARD_H, 1.3));
  grid.style.transform = `translate(-50%, -50%) scale(${boardScale})`;
}
function syncHeaderHeight() {
  const hd = document.querySelector('.header');
  if (hd) document.documentElement.style.setProperty('--hdr', hd.offsetHeight + 'px');
}
function fitAll() { syncHeaderHeight(); fitBoard(); fitAllCards(); }
window.addEventListener('resize', fitAll);
window.addEventListener('DOMContentLoaded', () => {
  fitAll();
  const wrap = document.getElementById('boardWrap');
  if (wrap && window.ResizeObserver) new ResizeObserver(fitBoard).observe(wrap);
});

// 札の論理サイズ。どの札も 180×100px で固定（長い用語は文字のほうを scaleX で縮める）。
function measureCardSizes(ids) {
  const sizes = {};
  ids.forEach(id => { sizes[id] = { w: CARD_W, h: CARD_H }; });
  return sizes;
}

// 札の文字を入れる。枠(幅 − 左右の余白0.5rem)に収まらない長さのときは scaleX で横に縮める。
function setCardText(el, text) {
  let t = el.querySelector('.card-text');
  if (!t) { el.textContent = ''; t = document.createElement('span'); t.className = 'card-text'; el.appendChild(t); }
  t.textContent = text;
  fitCardText(el);
}
function fitCardText(el) {
  const t = el.querySelector('.card-text');
  if (!t) return;
  t.style.transform = '';
  const cs = getComputedStyle(el);
  const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const w = t.offsetWidth;
  if (inner > 0 && w > inner) t.style.transform = `scaleX(${(inner / w).toFixed(4)})`;
}
function fitAllCards() { document.querySelectorAll('#grid .card').forEach(fitCardText); }

// 回転した札の多角形（中心 cx,cy・幅 w・高さ h・角度 deg）
function cardPolygon(cx, cy, w, h, deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), hw = w / 2, hh = h / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cx + x * c - y * sn, cy + x * sn + y * c]);
}
// 2つの凸多角形が重なっているか（分離軸判定）
function polysOverlap(A, B) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const p1 = P[i], p2 = P[(i + 1) % P.length];
      const nx = p1[1] - p2[1], ny = p2[0] - p1[0];
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (const q of A) { const d = q[0] * nx + q[1] * ny; if (d < minA) minA = d; if (d > maxA) maxA = d; }
      for (const q of B) { const d = q[0] * nx + q[1] * ny; if (d < minB) minB = d; if (d > maxB) maxB = d; }
      if (maxA < minB || maxB < minA) return false;
    }
  }
  return true;
}
// 整理タイムで札を置くときの重なり判定の余裕(px)。負の値＝札どうしが少し(5px)食い込んでも置ける。
// ぴったり真横に並べたい、という使い方でも弾かれないようにするためのゆるさ。
const DROP_MARGIN = -5;
// 定位置の円の周り（札を置かない範囲）
const HOME_KEEPOUT = cardPolygon(HOME.x, HOME.y, HOME.r * 2 + 56, HOME.r * 2 + 56, 0);
const HOME_KEEPOUT_SOFT = cardPolygon(HOME.x, HOME.y, HOME.r * 2 - 10, HOME.r * 2 - 10, 0);   // ドラッグ時：円の少し内側まで許す

// id の札を (x,y,rot) に置くと、他の札や定位置の円と重なるか
function overlapsOthers(id, x, y, rot, margin) {
  const sz = cardSizes[id];
  if (!sz) return false;
  const mine = cardPolygon(x, y, sz.w + margin * 2, sz.h + margin * 2, rot);
  if (polysOverlap(mine, margin < 0 ? HOME_KEEPOUT_SOFT : HOME_KEEPOUT)) return true;
  return Object.keys(cardLayout).some(oid => {
    if (+oid === +id) return false;
    const el = $(`card-${oid}`);
    if (el && el.classList.contains('removed')) return false;
    const o = cardLayout[oid], osz = cardSizes[oid];
    if (!o || !osz) return false;
    return polysOverlap(mine, cardPolygon(o.x, o.y, osz.w + margin * 2, osz.h + margin * 2, o.rot));
  });
}

// 盤面の配置。サーバーが試合ごとに1つ作って全員に配るので、通常はここでは作らない（保険）。
function generateCardLayout(cardOrder) {
  cardSizes  = measureCardSizes(cardOrder);
  cardLayout = KLayout.generateLayout(cardOrder);
}

// サーバーから届いた配置を画面に反映する（全員同じ配置）
function setServerLayout(layout, cardOrder) {
  const clean = {};
  cardOrder.forEach(id => { if (layout && layout[id]) clean[id] = { ...layout[id] }; });
  if (Object.keys(clean).length !== cardOrder.length) return false;
  cardSizes  = measureCardSizes(cardOrder);
  cardLayout = clean;
  return true;
}

// 配置を、今画面にある札の位置に反映する（教卓PCが並べ替えたとき、他のPCの表示を合わせる）
function applyLayoutToDom() {
  document.querySelectorAll('#grid .card').forEach(el => {
    const id = +el.dataset.id, lay = cardLayout[id];
    if (!lay) return;
    el.style.left = lay.x + 'px';
    el.style.top = lay.y + 'px';
    el.style.transform = `rotate(${lay.rot}deg)`;
  });
}

// 現在の cardOrder に対応する配置が無ければ新規生成する（未整理での参加・ホストなど）
function ensureCardLayout(cardOrder) {
  const ok = cardOrder.length > 0 && cardOrder.every(id => cardLayout[id] && cardSizes[id]);
  if (!ok) generateCardLayout(cardOrder);
}

function openArrangeScreen(cardOrder, cards, endsAt, players, round, layout) {
  setGrabLocked(false);
  if (round) currentRound = round;
  gameStarted  = true;
  isArranging  = true;
  hide('oLobby'); hide('oName'); hide('oGameOver'); hide('oRoundResult'); hide('oEventResult');
  updateChips(players);
  const ids = cardOrder && cardOrder.length ? cardOrder : cards.map(k => k.id);
  if (!(layout && setServerLayout(layout, ids))) generateCardLayout(ids);
  renderGrid(ids, null, 'arrange');
  startArrangeCountdown(endsAt);
  updateHostNotice();
}

function startArrangeCountdown(endsAt) {
  if (arrangeInterval) clearInterval(arrangeInterval);
  const tick = () => {
    const secs = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const el = $('arrangeTimer');
    if (el) el.textContent = fmtTime(secs);
  };
  tick();
  arrangeInterval = setInterval(tick, 500);
}

function stopArrangeCountdown() {
  if (arrangeInterval) { clearInterval(arrangeInterval); arrangeInterval = null; }
}

function skipMemorize() { socket.emit('skip_memorize'); }

// ヘッダーの「即終了（デバッグ）」は、盤面整理タイム中はスキップ、
// 対局中は即試合終了として働く単一のデバッグボタン。
function debugSmartSkip() {
  if (!(isServerPc || !isEventMode)) return;
  if (isArranging) {
    if (!isEventMode && !voiceReadyForSkip()) return;   // 練習モードは音声が揃ってから
    skipMemorize();
    return;
  }
  if (!gameStarted) return;
  socket.emit('debug_end_game');
}

// 下半分のカードをマウスドラッグで自由に動かせるようにする。
// 離した瞬間、正面向き（0度）に整える。他の札や定位置の円に重なる場所には置けず、元の位置に戻る。
function attachFreeDrag(el, id) {
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const gridEl = $('grid');
    const lay = cardLayout[id];
    const start = { x: lay.x, y: lay.y, rot: lay.rot };
    const { w, h } = cardSizes[id];
    el.classList.add('dragging');
    let moved = false;
    const onMove = mv => {
      moved = true;
      const rect = gridEl.getBoundingClientRect();
      let x = (mv.clientX - rect.left) / boardScale;
      let y = (mv.clientY - rect.top) / boardScale;
      x = Math.min(BOARD_W - w / 2 - 8, Math.max(w / 2 + 8, x));
      y = Math.min(BOARD_H - h / 2 - 8, Math.max(BOARD_H / 2 + h / 2 + 8, y));   // 自分側(下半分)にクランプ
      lay.x = x; lay.y = y; lay.rot = 0;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.style.transform = 'rotate(0deg)';
      el.classList.toggle('drag-bad', overlapsOthers(id, x, y, 0, DROP_MARGIN));
    };
    const onUp = () => {
      el.classList.remove('dragging', 'drag-bad');
      if (moved && overlapsOthers(id, lay.x, lay.y, 0, DROP_MARGIN)) {   // 重なる場所には置けない
        lay.x = start.x; lay.y = start.y; lay.rot = start.rot;
        el.style.left = start.x + 'px';
        el.style.top  = start.y + 'px';
        el.style.transform = `rotate(${start.rot}deg)`;
      } else if (moved) {
        socket.emit('set_layout', { layout: cardLayout });   // 全員の配置を合わせる
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Round Result Overlay ─────────────────────────────────
function showRoundResult(round, players, survivorIds, eliminatedIds, sc, isFinal, isRevival, isGroupMatchResult, currentGroupTier, isRevivalIntermediate, rRound, rMax, isGroupMatchIntermediate, gRound, gMax) {
  stopTimer(); stopAllAudio(); hideReadBtn();
  gameStarted = false;
  syncGrabAvailability();

  if (sc !== undefined && !isRevival) survivorCount = sc;

  // ドット（試合進行インジケーター）
  const dots = $('rrDots');
  if (dots) {
    dots.innerHTML = '';
    if (isGroupMatchIntermediate) {
      // グループ戦ラウンド進行ドット
      const totalG = gMax || groupMaxRounds;
      for (let i = 1; i <= totalG; i++) {
        const d = document.createElement('div');
        d.className = 'rr-dot' + (i < (gRound || groupRound) ? ' done' : i === (gRound || groupRound) ? ' active' : '');
        dots.appendChild(d);
      }
    } else if (isRevivalIntermediate) {
      // 復活戦ラウンド進行ドット
      const totalR = rMax || revivalMaxRounds;
      for (let i = 1; i <= totalR; i++) {
        const d = document.createElement('div');
        d.className = 'rr-dot' + (i < (rRound || revivalRound) ? ' done' : i === (rRound || revivalRound) ? ' active' : '');
        dots.appendChild(d);
      }
    } else if (!isRevival) {
      for (let i = 1; i <= maxRounds; i++) {
        const d = document.createElement('div');
        d.className = 'rr-dot' + (isFinal || i < round ? ' done' : i === round ? ' active' : '');
        dots.appendChild(d);
      }
    }
  }

  const title = $('rrTitle');
  if (title) {
    const tierLbl = currentGroupTier === 'top' ? '上位' : currentGroupTier === 'middle' ? '中位' : '下位';
    if (isGroupMatchIntermediate)    title.textContent = `${tierLbl}グループ 第${gRound || groupRound}ラウンド 終了！`;
    else if (isGroupMatchResult)     title.textContent = `${tierLbl}グループ戦 終了！`;
    else if (isRevivalIntermediate)  title.textContent = `復活戦 第${rRound}ラウンド 終了！`;
    else if (isRevival)              title.textContent = '敗者復活戦 終了！';
    else if (isFinal)                title.textContent = '最終試合終了！';
    else                             title.textContent = `第${round}試合 終了！`;
  }

  // 順位表：全参加者（survivorIds ∪ eliminatedIds）
  const promotedSet = new Set([
    ...(bottomGroupWinners || []),
    ...(middleGroupWinners || []),
  ]);
  const table = $('rrTable');
  if (table) {
    table.innerHTML = '';
    const rankEmoji = ['🥇', '🥈', '🥉'];
    const participantIds = new Set([...survivorIds, ...eliminatedIds]);
    const sorted = Object.entries(players)
      .filter(([id, p]) => !(id === liveHostId && isEventMode) && participantIds.has(id) && (p.isBot || p.joined))
      .sort(([, a], [, b]) => b.score - a.score);

    // 練習モードの通常試合結果（このどれにも当てはまらない場合）は、
    // 敗退がなく全員が survivorIds に入るため、CPUの「進出」強調表示は
    // 意味を持たない（誤解を招く）ので付けない。
    const isPracticeNormalRound = !isGroupMatchIntermediate && !isRevivalIntermediate && !isRevival && !isFinal;
    const rrRanks = competitionRanks(sorted);
    sorted.forEach(([id, p], i) => {
      const isSurv = survivorIds.includes(id);
      const isElim = eliminatedIds.includes(id);
      const rank = rrRanks[i];   // 同じ枚数は同順位
      const row = document.createElement('div');
      row.className = 'rr-row'
        + (isSurv && !isGroupMatchResult && !isPracticeNormalRound && p.isBot ? ' survivor' : '')   // 人間は進出の強調表示をしない
        + (isElim ? ' eliminated' : '')
        + (id === myId ? ' me' : '');
      const rankLabel = rankEmoji[rank - 1] || `${rank}位`;
      const cpuBadge  = p.isBot ? ' <small class="rr-cpu">CPU</small>' : '';
      const youBadge  = id === myId ? ' <small>(あなた)</small>' : '';
      let badgeHtml = '';
      if (isGroupMatchIntermediate) {
        badgeHtml = isSurv
          ? '<span class="rr-badge adv">→ 次ラウンドへ</span>'
          : '<span class="rr-badge elim">脱落</span>';
      } else if (isRevivalIntermediate) {
        badgeHtml = isSurv
          ? '<span class="rr-badge adv">→ 次ラウンドへ</span>'
          : '<span class="rr-badge elim">脱落</span>';
      } else if (isRevival) {
        badgeHtml = isSurv
          ? '<span class="rr-badge adv">本戦復帰！</span>'
          : '<span class="rr-badge elim">惜しくも...</span>';
      }
      // 練習モードは敗退がなく全員が次の試合に続けて参加するため、
      // CPU・人間とも「進出」などのバッジは出さない（誤解を招くため）。
      row.innerHTML = `
        <span class="rr-rank">${rankLabel}</span>
        <span class="rr-name">${escHtml(p.name)}${cpuBadge}${youBadge}</span>
        <span class="rr-score">${fmtPts(p.score)}点<small>${p.cards || 0}枚</small></span>
        ${badgeHtml}`;
      table.appendChild(row);
    });
  }

  // 自分のステータス表示
  const myStatus = $('rrMyStatus');
  if (myStatus) {
    if (isFinal) {
      myStatus.textContent = 'お疲れ様でした！';
      myStatus.className = 'rr-my-status';
    } else if (isGroupMatchIntermediate) {
      if (survivorIds.includes(myId)) {
        myStatus.textContent = `✅ 次のラウンドへ進出！（第${(gRound || groupRound) + 1}ラウンド）`;
        myStatus.className = 'rr-my-status adv';
      } else if (eliminatedIds.includes(myId)) {
        myStatus.textContent = '😢 グループ戦から脱落しました';
        myStatus.className = 'rr-my-status elim';
      } else {
        myStatus.textContent = '👀 観戦中';
        myStatus.className = 'rr-my-status';
      }
    } else if (isRevivalIntermediate) {
      if (survivorIds.includes(myId)) {
        myStatus.textContent = `✅ 次のラウンドへ進出！（第${(rRound || revivalRound) + 1}ラウンド）`;
        myStatus.className = 'rr-my-status adv';
      } else if (eliminatedIds.includes(myId)) {
        myStatus.textContent = '😢 復活戦から脱落しました';
        myStatus.className = 'rr-my-status elim';
      } else {
        myStatus.textContent = '👀 観戦中';
        myStatus.className = 'rr-my-status';
      }
    } else if (isRevival) {
      if (survivorIds.includes(myId)) {
        myStatus.textContent = '✅ 本戦に復帰しました！';
        myStatus.className = 'rr-my-status adv';
      } else if (eliminatedIds.includes(myId)) {
        myStatus.textContent = '😢 惜しくも本戦復帰はなりませんでした';
        myStatus.className = 'rr-my-status elim';
      } else if (myIsRevivalSpectator) {
        myStatus.textContent = '👀 本戦勝者として観戦しました';
        myStatus.className = 'rr-my-status';
      } else {
        myStatus.textContent = '';
        myStatus.className = 'rr-my-status';
      }
    } else if (survivorIds.includes(myId) || eliminatedIds.includes(myId)) {
      // 練習モード：進出・敗退の表示はしない（順位と点数は上の表に出ている）
      myStatus.textContent = '';
      myStatus.className = 'rr-my-status';
    } else {
      myStatus.textContent = myIsSpectator ? '👀 観戦中' : '';
      myStatus.className = 'rr-my-status';
    }
  }

  // ── コントロール表示制御 ──────────────────────────────────
  const modeTabs      = $('rrModeTabs');
  const mainSec       = $('rrMainSection');
  const revivalSec    = $('rrRevivalSection');
  const guestWait     = $('rrGuestWait');
  const lobbyBtn      = $('rrLobbyBtn');
  const nextLabel     = $('rrNextRoundLabel');

  const revivalInterSec  = $('rrRevivalInterSection');
  const rrRevRoundLbl    = $('rrRevivalRoundLabel');
  const groupInterSec    = $('rrGroupInterSection');
  const rrGroupRoundLbl  = $('rrGroupRoundLabel');

  // 全セクションを初期化（hidden）
  [modeTabs, mainSec, revivalSec, revivalInterSec, groupInterSec].forEach(el => el && el.classList.add('hidden'));
  if (lobbyBtn) lobbyBtn.classList.add('hidden');
  if (guestWait) guestWait.classList.add('hidden');

  const tierLblForCtrl = currentGroupTier === 'top' ? '上位' : currentGroupTier === 'middle' ? '中位' : '下位';
  if (isGroupMatchIntermediate) {
    // グループ戦中間ラウンド後（通過人数は自動決定・次ラウンド開始後に表示）
    const nextR = (gRound || groupRound) + 1;
    if (rrGroupRoundLbl) rrGroupRoundLbl.textContent = `${tierLblForCtrl}グループ 第${gRound || groupRound}ラウンド終了 → 第${nextR}ラウンドへ`;
    if (myIsHost) {
      if (groupInterSec) groupInterSec.classList.remove('hidden');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else if (isRevivalIntermediate) {
    // 復活戦中間ラウンド後（通過人数は自動決定・次ラウンド開始後に表示）
    if (rrRevRoundLbl) rrRevRoundLbl.textContent = `復活戦 第${rRound || revivalRound}ラウンド終了 → 第${(rRound || revivalRound) + 1}ラウンドへ`;
    if (myIsHost) {
      if (revivalInterSec) revivalInterSec.classList.remove('hidden');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else if (isFinal || isGroupMatchResult) {
    // 最終試合後 / グループ戦後：全員にロビーボタンのみ
    if (lobbyBtn) lobbyBtn.classList.remove('hidden');

    // 上位グループ戦終了時は式典を先行表示し、完了後にランキング画面を表示
    if (isGroupMatchResult && currentGroupTier === 'top') {
      const sorted = Object.entries(players)
        .filter(([id, p]) => !(id === liveHostId && isEventMode) && survivorIds.includes(id) && !p.isBot && p.joined)
        .sort(([, a], [, b]) => b.score - a.score);
      startCeremony(sorted, players, () => {
        hide('oCeremony');
        show('oRoundResult');  // ランキング画面を表示してから手動でロビーへ
      });
      return;
    }
  } else if (isRevival) {
    // 復活戦後：次試合モードのみ（ホスト）。通過人数は自動決定・次試合開始後に表示。
    if (myIsHost) {
      if (mainSec) mainSec.classList.remove('hidden');
      if (nextLabel) nextLabel.textContent = round + 1;
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else {
    // 通常試合後：練習モードは参加者の誰でも次の試合を開始できる（大会モードは別画面）。
    if (myIsHost || !isEventMode) {
      const hasElim = Object.entries(players)
        .some(([id, p]) => liveEliminatedIds.has(id) && !p.isBot && p.joined && !(id === liveHostId && isEventMode));

      if (hasElim && modeTabs) modeTabs.classList.remove('hidden');
      if (mainSec) mainSec.classList.remove('hidden');
      if (nextLabel) nextLabel.textContent = round + 1;

      if (hasElim) renderRevivalUserList(players);

      const tabMain = $('rrTabMain');
      const tabRevival = $('rrTabRevival');
      if (tabMain) tabMain.classList.add('active');
      if (tabRevival) tabRevival.classList.remove('active');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  }

  hide('oLobby'); hide('oGameOver');
  show('oRoundResult');
}

// ── 式典（上位グループ戦結果発表）────────────────────────
let _ceremonyQueue    = [];
let _ceremonyIndex    = 0;
let _ceremonyTimer    = null;
let _ceremonyPlayers  = {};
let _ceremonyCallback = null;

function startCeremony(sortedHumans, players, onComplete) {
  _ceremonyPlayers  = players;
  _ceremonyCallback = onComplete;
  // sortedHumans は [id, player] の配列（1位〜N位順）
  // 発表は 3位→2位→1位 の順なので reverse
  _ceremonyQueue = sortedHumans.slice(0, 3).reverse();
  _ceremonyIndex = 0;

  hide('oLobby'); hide('oGameOver'); hide('oRoundResult');
  show('oCeremony');
  _showCeremonyStep();
}

function _showCeremonyStep() {
  if (_ceremonyIndex >= _ceremonyQueue.length) {
    _endCeremony();
    return;
  }
  const [id, p] = _ceremonyQueue[_ceremonyIndex];
  // displayRank: queue[0]は3位(total=3)、queue[1]は2位、queue[2]は1位
  const totalShown = _ceremonyQueue.length;
  const displayRank = totalShown - _ceremonyIndex;

  const rankLabel = { 1: '🥇 優勝！', 2: '🥈 第2位', 3: '🥉 第3位' }[displayRank] || `第${displayRank}位`;
  const rankCls   = { 1: 'rank-1', 2: 'rank-2', 3: 'rank-3' }[displayRank] || '';

  const step    = $('ceremonyStep');
  const place   = $('ceremonyPlace');
  const avatar  = $('ceremonyAvatar');
  const name    = $('ceremonyName');
  const score   = $('ceremonyScore');
  const promo   = $('ceremonyPromoted');
  const wrap    = $('ceremonyWrap');

  if (step)   step.textContent  = `${totalShown - _ceremonyIndex} / ${totalShown}`;
  if (place)  place.textContent = rankLabel;
  if (avatar) { avatar.style.background = p.color; avatar.textContent = p.name.charAt(0); }
  if (name)   { name.textContent = p.name; name.style.color = p.color; }
  if (score)  score.textContent = `${fmtPts(p.score)} 点`;

  const promoted = new Set([...(bottomGroupWinners || []), ...(middleGroupWinners || [])]);
  if (promo) promo.textContent = promoted.has(id) ? '⬆ 昇格参戦プレイヤー' : '';

  if (wrap) {
    wrap.className = 'ceremony-wrap ' + rankCls;
    void wrap.offsetWidth;
    wrap.classList.add('reveal');
  }

  _ceremonyIndex++;
  const delay = displayRank === 1 ? 4000 : 2800;
  _ceremonyTimer = setTimeout(_showCeremonyStep, delay);
}

function _endCeremony() {
  if (_ceremonyTimer) { clearTimeout(_ceremonyTimer); _ceremonyTimer = null; }
  if (_ceremonyCallback) { _ceremonyCallback(); _ceremonyCallback = null; }
}

function skipCeremony() { _endCeremony(); }

// ── Card grid（盤面整理タイム／対局中で共用）───────────────
// mode: 'arrange'（下半分だけドラッグ可） | 'play'（クリックで札を取る）
// cardLayout に保存された位置・向きをそのまま使うので、整理した配置が
// 対局画面にそのまま引き継がれる。
function renderGrid(cardOrder, remainingSet, mode) {
  const grid = $('grid');
  grid.innerHTML = '';
  const order = cardOrder && cardOrder.length ? cardOrder : KARUTA.map(k => k.id);
  ensureCardLayout(order);
  order.forEach(id => {
    const k = KMAP[id];
    if (!k) return;
    const layout = cardLayout[id] || { x: BOARD_W / 2, y: BOARD_H / 2, rot: 0, zone: 'bottom' };
    const el = document.createElement('div');
    const removed = remainingSet && !remainingSet.has(id);
    el.className   = 'card' + (removed ? ' removed' : '');
    el.id          = `card-${id}`;
    el.dataset.id  = id;
    el.style.left      = layout.x + 'px';
    el.style.top       = layout.y + 'px';
    el.style.transform = `rotate(${layout.rot}deg)`;
    if (mode === 'arrange') {
      el.classList.add(layout.zone === 'top' || !myIsHost ? 'zone-top' : 'draggable');
      if (layout.zone === 'bottom' && myIsHost) attachFreeDrag(el, id);
    } else {
      el.addEventListener('click', ev => onCardClick(id, el, ev));
    }
    grid.appendChild(el);
    setCardText(el, k.tori);
  });
  const home = document.createElement('div');
  home.className = 'home-circle';
  home.id = 'homeCircle';
  home.style.left = HOME.x + 'px';
  home.style.top  = HOME.y + 'px';
  grid.appendChild(home);
  fitAll();
}

// クリック位置の「正確性」と、定位置からの「距離」を求める（どちらも mm）。
//  offsetMm: 札の中心からクリック位置までの距離
//  distMm  : 定位置の円の中心から札の中心までの距離（マウスコントロール力）
function grabGeometry(id, ev) {
  const lay = cardLayout[id];
  if (!lay || !ev || typeof ev.clientX !== 'number') return { offsetMm: ACC_FULL_MM, distMm: BOARD_FAR_MM * 0.5 };
  const rect = $('grid').getBoundingClientRect();
  const px = (ev.clientX - rect.left) / boardScale;
  const py = (ev.clientY - rect.top) / boardScale;
  return {
    offsetMm: Math.hypot(px - lay.x, py - lay.y) * MM_PER_PX,
    distMm:   Math.hypot(lay.x - HOME.x, lay.y - HOME.y) * MM_PER_PX,
  };
}

// お手付きをすると、次の札が読み上げられるまで取れない（手当たり次第のクリック対策）。
// 実際の判定はサーバー側で行う。ここでは表示と無駄な送信を止めるための状態。
let myGrabLocked = false;

function setGrabLocked(locked, msg) {
  myGrabLocked = locked;
  const grid = $('grid');
  if (grid) grid.classList.toggle('grab-locked', locked);
  let banner = $('lockBanner');
  if (locked && !banner) {
    banner = document.createElement('div');
    banner.id = 'lockBanner';
    banner.className = 'lock-banner';
    document.body.appendChild(banner);
  }
  if (banner) {
    if (locked) banner.textContent = msg || '✋ お手付き！次の札が読み上げられるまで取れません';
    banner.classList.toggle('hidden', !locked);
  }
  syncGrabAvailability();
}

// 「今、札を1枚も取れない」状態かどうか（ホバー禁止マーク・クリック禁止マーク共通の判定）。
// 盤面整理タイム中は「取る」操作自体が無い（ドラッグで並べ替えるだけ）ので対象外にする。
function cannotTakeAnyCard() {
  if (isArranging) return false;
  if (!canEverTake()) return true;
  if (myGrabLocked) return true;
  if ((currentPhase === 'reading' || currentPhase === 'decoy') && !introStarted) return true;   // 「読み上げます」の前は取れない
  return currentPhase !== 'reading' && currentPhase !== 'decoy';
}

// この端末のユーザーが（札を取る側として）試合に参加しているか。ホスト(進行役)や観戦者は取れない。
function canEverTake() {
  return !((myIsHost && isEventMode) || myIsSpectator || myIsRevivalSpectator || myIsGroupSpectator || myIsEventSpectator);
}

// currentPhase やロック状態が変わるたびに呼び、盤面に「今は何も取れない」を反映する。
// これを .grid につけておくと、CSS の :hover だけでクリックせずに🚫を出せる
// （毎回どの札をホバーしているか JS で追跡する必要がない）。
// 仮想カーソル(Pointer Lock)にも同じ状態を伝え、取れない間は定位置に戻して動かせなくする。
function syncGrabAvailability() {
  const grid = $('grid');
  const forbidden = cannotTakeAnyCard();
  if (grid) grid.classList.toggle('grab-forbidden', forbidden);
  document.body.classList.toggle('in-game', gameStarted);   // 試合中(盤面整理を含む)は和風の見た目
  if (window.KCursor) {
    KCursor.setEnabled(gameStarted && !isArranging && canEverTake());
    KCursor.setAllowed(!forbidden);
  }
}

// currentPhase の唯一の書き込み口。代入と同時に盤面の表示を同期する。
function setCurrentPhase(p) {
  currentPhase = p;
  if (p !== 'reading' && p !== 'decoy') disarmFlying();
  syncGrabAvailability();
}

// 札の上に🚫を一瞬強調表示する（クリックしたときの合図。ホバーでは常時 CSS 側で表示される）
function flashForbidden(el) {
  el.classList.remove('host-forbidden');
  void el.offsetWidth;
  el.classList.add('host-forbidden');
  setTimeout(() => el.classList.remove('host-forbidden'), 450);
}

function onCardClick(id, el, ev) {
  if (!KCursor.canAct()) return;   // マウスを固定する前（案内の表示中）は取れない
  if (!canEverTake()) {
    if (el.classList.contains('removed')) return;
    flashForbidden(el);
    return;
  }
  if (myGrabLocked) {
    if (!el.classList.contains('removed')) flashForbidden(el);
    return;
  }
  if (el.classList.contains('removed')) return;   // 消えた札はクリック自体が届かない（保険で無視）
  if (el.classList.contains('correct-mine') ||
      el.classList.contains('correct-other') ||
      el.classList.contains('wrong')) {
    // 誰かがすでに取った直後の札（消える演出中）をクリックしたとき
    flashForbidden(el);
    return;
  }
  if ((currentPhase === 'reading' || currentPhase === 'decoy') && !introStarted) {
    // 「マウスを定位置に戻します…」の案内中。まだ「読み上げます」が始まっていないので取れない（お手付きにもならない）
    flashForbidden(el);
    return;
  }
  if (currentPhase !== 'reading' && currentPhase !== 'decoy') {
    // 誰かが札を取った後（正解発表）や、次の札の読み上げがまだ始まっていない間は、
    // そもそも誰も取れない。クリックしても何も起きないと分かりにくいので合図を出す。
    // （ダミー読み中はわざと引っかける仕掛けなので、ここでは対象にしない＝通常どおりお手付き扱い）
    flashForbidden(el);
    return;
  }
  const g = grabGeometry(id, ev);
  const t = hiResNow() + serverOffset;
  disarmFlying();
  socket.emit('grab_card', { cardId: id, t, offsetMm: g.offsetMm, distMm: g.distMm });
  if (currentPhase === 'reading') showPendingPanel(t - currentReadPlayAt, g);   // 判定を待つ0.5秒の間も、自分の数値を即座に出す
}

// ── 仮想カーソルとの連携 ──────────────────────────────────────
function homeScreenPoint() {
  const r = $('grid').getBoundingClientRect();
  return { x: r.left + HOME.x * boardScale, y: r.top + HOME.y * boardScale };
}
// 仮想カーソルでのクリック：カーソル位置にある札（またはボタン）をクリックしたことにする
function virtualClick(x, y) {
  const t = document.elementFromPoint(x, y);
  if (!t || !t.closest) return;
  const card = t.closest('.card');
  if (card && card.dataset.id) { onCardClick(+card.dataset.id, card, { clientX: x, clientY: y }); return; }
  const btn = t.closest('button, a, input, select, label');
  if (btn) btn.click();
}
// 仮想カーソルが乗っている札を、:hover と同じように強調する
let vHoverEl = null;
function updateVHover(x, y, locked) {
  let el = null;
  if (locked && x >= 0) {
    const t = document.elementFromPoint(x, y);
    el = t && t.closest ? t.closest('.card') : null;
  }
  if (vHoverEl && vHoverEl !== el) vHoverEl.classList.remove('vhover');
  if (el) el.classList.add('vhover');
  vHoverEl = el;
}
// ── 試合で使う音声の準備（サーバーが生成 → 各クライアントが先読み）──────────
// サーバーが盤面整理の開始時に生成を始め、できたら voice_ready を送る。クライアントはそれを受けて
// 音声を取得(先読み)し、終わったら「準備完了」になる。練習モードのスキップは、これが終わってから押せる。
let voiceState = { total: 0, done: 0, ready: false, loaded: false, loading: false, items: [], waiting: false };
async function preloadMatchVoice() {
  if (voiceState.loading || voiceState.loaded) return;
  voiceState.loading = true; refreshDebugButtons();
  try { await Voice.preload(voiceState.items, { concurrency: 6 }); } catch (e) {}
  voiceState.loading = false; voiceState.loaded = true; refreshDebugButtons();
}
function applyVoiceSummary(v) {
  if (!v) return;
  voiceState = { total: v.total, done: v.done, ready: !!v.ready, loaded: false, loading: false, items: v.items || [], waiting: false };
  if (v.ready) preloadMatchVoice(); else refreshDebugButtons();
}
socket.on('voice_manifest', d => { voiceState = { total: d.total, done: 0, ready: false, loaded: false, loading: false, items: d.items || [], waiting: false }; refreshDebugButtons(); });
socket.on('voice_progress', d => { voiceState.done = d.done; voiceState.total = d.total; refreshDebugButtons(); });
socket.on('voice_ready', () => { voiceState.ready = true; voiceState.done = voiceState.total; preloadMatchVoice(); });
socket.on('voice_wait', () => { voiceState.waiting = true; refreshDebugButtons(); });
socket.on('skip_denied', () => refreshDebugButtons());

// 盤面整理中の「スキップ」ボタン（デバッグ用ボタンと兼用）。練習モードは音声が揃うまで押せない。
function voiceReadyForSkip() { return voiceState.ready && voiceState.loaded; }
function refreshDebugButtons() {
  const btn = $('debugEndBtn');
  if (!btn) return;
  if (isArranging) {
    const gated = !isEventMode && !voiceReadyForSkip();
    btn.disabled = gated;
    btn.textContent = gated
      ? (voiceState.ready ? '🔊 音声を読み込み中…' : `🔊 音声を準備中 ${voiceState.done}/${voiceState.total}`)
      : '⏭ 盤面整理をスキップ';
    btn.title = gated ? '音声ファイル(VOICEVOX)が用意できるとスキップできます' : '盤面整理を終えて試合を始める（デバッグ用）';
  } else {
    btn.disabled = false;
    btn.textContent = '⏹ 即終了（デバッグ）';
    btn.title = 'デバッグ用：即終了／盤面整理をスキップ';
  }
}

// ── 試合開始の待ち合わせ ───────────────────────────────────────
// 札を取る側の全員が仮想カーソル（Pointer Lock。使えない端末は通常カーソル）に移るまで、
// サーバーは最初の読み上げを始めない。待っている間に、ハンデの内容と自分のハンデを表示する。
let readyState = { active: false, total: 0, ready: 0, deadline: 0, handicap: null };
let readyTick = null;

function handicapHtml() {
  const hc = readyState.handicap;
  if (!hc) return '';
  if (!hc.event && !hc.any) return '<div class="hc-box"><b>ハンデ</b>：なし（学年・コースを入力していない人は、ハンデなしで参加します）</div>';
  const g = hc.rules.grade;
  const prog = hc.rules.programming;
  const mine = (hc.mine && hc.mine[myId]) || { gain: 1, penalty: 1 };
  const has = mine.gain !== 1 || mine.penalty !== 1;
  const row = (label, gain, pen) => `<tr><td>${label}</td><td>×${gain}</td><td>×${pen}</td></tr>`;
  return `<div class="hc-box"><b>ハンデ</b>（学年・コースを入力した人にかかります。複数あてはまる場合は掛け算）
    <table><tr><th>対象</th><th>得点</th><th>お手付き・フライングの減点</th></tr>
      ${row('2年生', g['2'].gain, g['2'].penalty)}
      ${row('3年生', g['3'].gain, g['3'].penalty)}
      ${row('2・3年のプログラミング系コース（ITスペシャリスト・ITエンジニア）にはさらに', prog.gain, prog.penalty)}
      <tr><td>1年生・画像／アプリ系コース</td><td colspan="2">ハンデなし</td></tr>
    </table>
    <div class="hc-mine ${has ? 'has' : 'none'}">あなたのハンデ：${has ? `得点 ×${mine.gain}　減点 ×${mine.penalty}` : 'なし'}</div></div>`;
}
function startStatusHtml() {
  if (!readyState.active) return '';
  const left = Math.max(0, readyState.total - readyState.ready);
  const sec = Math.max(0, Math.ceil((readyState.deadline - Date.now()) / 1000));
  return `<div class="start-status">準備ができた人 ${readyState.ready} / ${readyState.total} 人（あと ${left} 人・最大 あと${sec}秒で開始）</div>
    <div class="start-note">距離・精度は、画面の札＝実物の取り札（横${CARD_REAL_W_MM}mm）の縮尺でmmに換算します。</div>`;
}
function renderStartExtras() {
  document.querySelectorAll('.start-extra').forEach(el => { el.innerHTML = handicapHtml() + startStatusHtml(); });
  const rw = $('readyWait');
  if (rw) rw.classList.toggle('hidden', !(readyState.active && KCursor.state.enabled && (KCursor.state.locked || KCursor.state.fallback)));
}
function reportReadyIfPossible() {
  if (readyState.active) socket.emit('cursor_ready');
  renderStartExtras();
}
socket.on('ready_wait', d => {
  readyState = { active: d.active, total: d.total, ready: d.ready, deadline: d.deadline, handicap: d.handicap };
  if (readyTick) clearInterval(readyTick);
  readyTick = setInterval(renderStartExtras, 500);
  renderStartExtras();
  KCursor.notifyReady();   // すでに仮想カーソルに移っていれば、すぐ準備完了を伝える
});
socket.on('ready_progress', d => { readyState.total = d.total; readyState.ready = d.ready; renderStartExtras(); });
socket.on('ready_release', () => {
  readyState.active = false;
  if (readyTick) { clearInterval(readyTick); readyTick = null; }
  renderStartExtras();
  autoReadPending = false;     // 待ち合わせ中に無視された読み上げ要求をやり直す
  maybeAutoReadNext();
});

// ランキングは、Pointer Lock 中（本物のカーソルが消えている間）も、仮想カーソルを乗せてホイールでスクロールできる
document.addEventListener('wheel', e => {
  if (!KCursor.isVirtual()) return;
  const t = document.elementFromPoint(KCursor.state.x, KCursor.state.y);
  const list = t && t.closest ? t.closest('#top3') : null;
  if (!list) return;
  list.scrollTop += e.deltaY;
  lastRankUserScroll = Date.now();
  e.preventDefault();
}, { passive: false });

// フライング：「読み上げます」の最初の「よ」で全員のカーソルを定位置へ強制移動し、
// 上の句の1文字目が読み上げられる前に定位置の円から出たら反則（お手付きと同じ扱い）。
let flyArmed = false;
let flyTimer = null;
let lastRealMouse = { x: -1, y: -1 };
const outsideHome = (x, y) => { const h = homeScreenPoint(); return Math.hypot(x - h.x, y - h.y) > HOME.r * boardScale; };
function setHomeAlert(on) {
  const h = $('homeCircle');
  if (h) h.classList.toggle('alert', on);
}
function armFlying() {
  currentReadPlayAt = hiResNow() + serverOffset;   // この端末で「読み上げます」が始まった時刻（速度ポイントの基準）
  if (myIsHost) socket.emit('intro_started', { t: currentReadPlayAt });
  introStarted = true;                             // ここから札を取れる
  syncGrabAvailability();
  if (!canEverTake() || myGrabLocked || isArranging) return;
  setHomeAlert(true);                              // 定位置の円を強調（上の句の1文字目が読まれるまで）
  if (KCursor.isVirtual()) {
    KCursor.moveHome();   // 強制移動
    flyArmed = true;
  } else {
    // 本物のカーソルは強制移動できない。円の中にいる場合だけ「出たらフライング」を監視する
    flyArmed = lastRealMouse.x >= 0 && !outsideHome(lastRealMouse.x, lastRealMouse.y);
  }
  if (flyTimer) clearTimeout(flyTimer);
  flyTimer = setTimeout(disarmFlying, 8000);   // 上の句の開始通知が来なくても無期限に監視しない
}
function disarmFlying() {
  flyArmed = false;
  setHomeAlert(false);
  if (flyTimer) { clearTimeout(flyTimer); flyTimer = null; }
}
function checkFlying(x, y) {
  if (!flyArmed || !outsideHome(x, y)) return;
  flyArmed = false;
  socket.emit('flying');
}
document.addEventListener('mousemove', e => {
  lastRealMouse = { x: e.clientX, y: e.clientY };
  if (!KCursor.isVirtual()) checkFlying(e.clientX, e.clientY);
});
KCursor.init({ home: homeScreenPoint, click: virtualClick, hover: updateVHover, move: checkFlying, ready: reportReadyIfPossible });

// ── 判定の内訳パネル ──────────────────────────────────────
// 点数の計算式（server.js と同じ）：速度 + 精度 + 距離（マウスコントロール力）。
const SPEED_MAX_PTS = 400, SPEED_TAU_MS = 2500, ACC_MAX_PTS = 400, CTRL_MAX_PTS = 200;
const ACC_BONUS_THRESHOLD = 350, ACC_BONUS_PTS = 1000;   // 精度が350点以上なら精度ボーナス1000点（札1枚の上限の外）
const speedPts = ms => Math.round(SPEED_MAX_PTS * Math.exp(-Math.max(0, ms) / SPEED_TAU_MS));
const accPts   = mm => Math.round(ACC_MAX_PTS * Math.pow(1 - Math.min(1, Math.max(0, mm / ACC_FULL_MM)), 3));
const ctrlPts  = mm => { const f = Math.min(1, Math.max(0, mm / BOARD_FAR_MM)); return Math.round(CTRL_MAX_PTS * f * f); };
const mmStr = mm => (Math.round(mm * 10) / 10).toFixed(1) + 'mm';
let currentReadPlayAt = 0;   // 今の読み上げの開始予定時刻（サーバー時計）。速度ポイントの基準

const secStr = ms => (Math.max(0, ms) / 1000).toFixed(2) + '秒';
function spRow(label, detail, sub, pts) {
  return `<div class="sp-row"><span class="sp-label">${label}</span>
    <span class="sp-detail">${detail}${sub ? `<small>${sub}</small>` : ''}</span>
    <span class="sp-pts">${pts}</span></div>`;
}
function hideScorePanel() {
  const el = $('scorePanel');
  if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
}
// 自分が札をクリックした瞬間に出す「仮の内訳」（正式な判定は0.5秒後）
function showPendingPanel(speedMs, g) {
  const el = $('scorePanel');
  if (!el) return;
  el.className = 'score-panel';
  el.innerHTML = `<div class="sp-title">⏳ 判定中…（あなたの申告）</div>
    ${spRow('⚡ 速度', secStr(speedMs), '読み上げ開始から', fmtPts(speedPts(speedMs)))}
    ${spRow('🎯 精度', mmStr(g.offsetMm), '札の中心からの距離', fmtPts(accPts(g.offsetMm)))}
    ${spRow('🖱 距離', mmStr(g.distMm), '定位置から札の中心まで', fmtPts(ctrlPts(g.distMm)))}
    ${accPts(g.offsetMm) >= ACC_BONUS_THRESHOLD ? `<div class="sp-row"><span class="sp-label">🎁 精度ボーナス</span><span class="sp-detail">精度${ACC_BONUS_THRESHOLD}点以上</span><span class="sp-pts">+${fmtPts(ACC_BONUS_PTS)}</span></div>` : ''}
    <div class="sp-cont">0.5秒間にクリックした全員のうち、精度の点数が一番高い人が札を取ります。<br>mm は画面の札＝実物の取り札（横${CARD_REAL_W_MM}mm）の縮尺で換算しています。</div>`;
}
// 札を取った人の内訳（全員の画面に表示）。同時に申告した人は縦に1行ずつ並べる。
function showScorePanel(by, r, contenders) {
  const el = $('scorePanel');
  if (!el || !r) return;
  el.className = 'score-panel';
  const hc = r.handicap && r.handicap !== 1
    ? `<div class="sp-row"><span class="sp-label sp-hc">ハンデ</span><span class="sp-detail sp-hc">×${r.handicap}</span><span class="sp-pts sp-hc">${fmtPts(r.wanted - r.base)}</span></div>`
    : '';
  const capNote = r.capped ? '<div class="sp-cont">※ 1試合の上限（2万点）に達しました。</div>' : '';
  // クリックした人は（0.5秒以内に限らず）全員、精度の高い順に並べて表示する。自分の行は目立たせる。
  const list = (contenders || []).length > 1
    ? `<div class="sp-list-title">クリックした人（${contenders.length}人）</div>
      <div class="sp-list" id="spList">
        <div class="sp-li head"><span>名前</span><span>速さ</span><span>中心から</span><span>精度点</span></div>
        ${contenders.map(c => `<div class="sp-li${c.win ? ' win' : ''}${c.id === myId ? ' me' : ''}" id="${c.id === myId ? 'spListMe' : ''}">
          <span class="n">${c.win ? '◎ ' : ''}${escHtml(c.name)}</span><span>${(c.speedMs / 1000).toFixed(2)}秒</span><span>${mmStr(c.offsetMm)}</span><span>${fmtPts(c.key)}</span></div>`).join('')}
      </div>`
    : '';
  el.innerHTML = `<div class="sp-title"><span class="tn-dot" style="background:${by.color || '#4a9eff'}"></span>${escHtml(by.name)} <span style="color:var(--dim);font-weight:400;font-size:.75rem">が獲得</span></div>
    ${spRow('⚡ 速度', secStr(r.speedMs), '読み上げ開始から', fmtPts(r.speedPts))}
    ${spRow('🎯 精度', mmStr(r.offsetMm), '札の中心からの距離', fmtPts(r.accPts))}
    ${spRow('🖱 距離', mmStr(r.distMm), '定位置から札の中心まで', fmtPts(r.ctrlPts))}
    ${hc}
    ${r.bonus ? `<div class="sp-row"><span class="sp-label">🎁 精度ボーナス</span><span class="sp-detail">精度${ACC_BONUS_THRESHOLD}点以上${r.handicap !== 1 ? `（${fmtPts(r.bonusBase)}×${r.handicap}）` : '（別枠）'}</span><span class="sp-pts">+${fmtPts(r.bonus)}</span></div>` : ''}
    <div class="sp-total"><span>獲得ポイント</span><span class="sp-big">+${fmtPts(r.awarded + (r.bonus || 0))}</span></div>
    ${capNote}${list}`;
  // 一覧の中で自分の行が隠れていたら、見える位置までスクロールする（一目でわかるように）
  const me = $('spListMe');
  if (me) me.scrollIntoView({ block: 'nearest' });
}
// お手付き・フライング（自分）
function showMissPanel(penalty, title, detail) {
  const el = $('scorePanel');
  if (!el) return;
  el.className = 'score-panel miss';
  el.innerHTML = `<div class="sp-title">${title || '✋ お手付き'}</div>
    <div class="sp-total"><span>減点</span><span class="sp-miss-big">−${fmtPts(penalty)}</span></div>
    <div class="sp-cont">${detail ? detail + '<br>' : ''}次の札が読み上げられるまで取れません。</div>`;
}

// ── Player chips ──────────────────────────────────────────
// 自分自身のチップのみ表示する（他プレイヤーの一覧は表示しない）
function updateChips(players) {
  livePlayers = players;
  const wrap = $('chips');
  wrap.innerHTML = '';
  const me = players[myId];
  if (me) {
    const c = document.createElement('div');
    c.className = 'chip me';
    c.id = `chip-${myId}`;
    const rankHtml = gameStarted ? `<span class="chip-rank">${myRankLabel(players)}</span>` : '';
    c.innerHTML = `
      <span class="chip-dot" style="background:${me.color}"></span>
      <span class="chip-name">${escHtml(me.name)}</span>
      ${rankHtml}
      <span class="chip-score">${fmtPts(me.score)}点</span>`;
    wrap.appendChild(c);
  }
  if (gameStarted) renderTop3(players);
}

// 自分の現在の順位（ホストを除いた全参加者中の順位）を返す
function myRankLabel(players) {
  const sorted = Object.entries(players)
    .filter(([id]) => !(id === liveHostId && isEventMode))
    .sort(([, a], [, b]) => b.score - a.score);
  const idx = sorted.findIndex(([id]) => id === myId);
  if (idx === -1) return '';
  return `${competitionRanks(sorted)[idx]}位 / ${sorted.length}人中`;
}

// ── Float score label ─────────────────────────────────────
function showFloat(el, text, color) {
  const r = el.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'float-score';
  d.style.cssText = `left:${r.left + r.width / 2 - 16}px;top:${r.top + window.scrollY - 6}px;color:${color}`;
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 950);
}

// ── Game over（第3試合＝全試合終了後）──────────────────────
function showGameOver(players) {
  stopTimer();
  stopAllAudio();
  hideReadBtn();
  gameStarted = false;
  syncGrabAvailability();
  const title = document.querySelector('#oGameOver .ov-title');
  if (title) title.textContent = '🏆 全試合終了！';
  const medals = ['🥇', '🥈', '🥉'];
  const wrap = $('rankings');
  wrap.innerHTML = '';
  const sorted = Object.entries(players)
    .filter(([id]) => !(id === liveHostId && isEventMode))
    .sort(([, a], [, b]) => b.score - a.score);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  top3.forEach(([id, p], i) => {
    const row = document.createElement('div');
    row.className = 'rank-row';
    row.innerHTML = `
      <span class="rank-medal">${medals[i]}</span>
      <span class="rank-name">${escHtml(p.name)}${id === myId ? ' <small>(あなた)</small>' : ''}</span>
      <span class="rank-score">${fmtPts(p.score)}点</span>
      <span class="rank-miss">ミス${p.misses}</span>`;
    wrap.appendChild(row);
  });

  if (rest.length) {
    const othersWrap = document.createElement('div');
    othersWrap.className = 'rank-others';
    rest.forEach(([id, p], i) => {
      const item = document.createElement('div');
      item.className = 'rank-others-item';
      item.innerHTML = `
        <span class="rank-others-pos">${i + 4}位</span>
        <span class="rank-others-name">${escHtml(p.name)}${id === myId ? '<small>(あなた)</small>' : ''}</span>
        <span class="rank-others-score">${fmtPts(p.score)}点</span>`;
      othersWrap.appendChild(item);
    });
    wrap.appendChild(othersWrap);
  }
  hide('oLobby'); hide('oRoundResult');
  show('oGameOver');
}

// ── Socket events ─────────────────────────────────────────
socket.on('init', data => {
  myId       = data.myId;
  isServerPc = !!data.isServerPc;
  liveHostId = data.hostId;
  liveData   = { ...data };
  applyVoiceSummary(data.voice);
  syncClock();
  preloadAudio();
  // doJoin 済みの場合（init 遅延で applyInit が後回しになったケース）
  if (nameEntered) applyInit(liveData);
});

socket.on('player_joined', ({ players }) => {
  if (liveData) liveData.players = players;
  updateChips(players);
  if (!$('oLobby').classList.contains('hidden')) renderLobbyList(players);
});

socket.on('player_left', ({ players }) => {
  if (liveData) liveData.players = players;
  updateChips(players);
  if (!$('oLobby').classList.contains('hidden')) renderLobbyList(players);
});

socket.on('players_updated', players => {
  if (liveData) liveData.players = players;
  updateChips(players);
  if (!$('oLobby').classList.contains('hidden')) renderLobbyList(players);
});

socket.on('houses_assigned', ({ houses, players }) => {
  currentHouses = houses;
  if (liveData) liveData.players = players;
  livePlayers = players;
  myHouse = players[myId] ? players[myId].house : null;
  renderHouseList(houses, players);
});

socket.on('host_changed', ({ hostId }) => {
  if (liveData) liveData.hostId = hostId;
  liveHostId = hostId;
  myIsHost   = (hostId === myId);
  updateLobbyUI();
  if (gameStarted) { updateReadBtnAvailability(); }
  updateHostNotice();
});

socket.on('memorize_start', ({ cardOrder, cards, players, endsAt, round, maxRounds: mr, survivorCount: sc, isRevival: ir, revivalCount: rc, revivalRound: rRound, revivalMaxRounds: rMax, revivalSurvivorCount: rSurv, isGroupMatch: ig, groupTier: gt, groupParticipantIds: gpi, humanGroups: hg, groupRound: gRound, groupMaxRounds: gMax, groupSurvivorCount: gSurv, groupHumanCount: ghc, humanCount: hc, cpuCount: cc, totalCount: tc, layout: lay }) => {
  matchHeadcount = { humanCount: hc || 0, cpuCount: cc || 0, totalCount: tc || 0 };
  if (round)            currentRound  = round;
  if (mr)               maxRounds     = mr;
  if (ir !== undefined) isRevivalMode = ir;
  if (ig !== undefined) isGroupMatch  = ig;
  if (gt)               groupTier     = gt;
  if (hg)               humanGroups   = hg;
  // 新ゲーム開始時（第1試合、通常モード）にポストトーナメント状態をリセット
  if (round === 1 && !ir && !ig) {
    postTournament     = false;
    bottomGroupWinners = null;
    middleGroupWinners = null;
  }
  if (gpi)              groupParticipantIds = new Set(gpi);
  if (rc !== undefined) revivalCount  = rc;
  if (ghc !== undefined) groupHumanCount = ghc;
  if (ig) {
    if (gRound !== undefined)  groupRound         = gRound;
    if (gMax   !== undefined)  groupMaxRounds     = gMax;
    if (gSurv  !== undefined)  groupSurvivorCount = gSurv;
    if (gRound === 1) groupEliminatedIds = new Set();
  }
  if (ir) {
    if (rRound !== undefined)  revivalRound         = rRound;
    if (rMax   !== undefined)  revivalMaxRounds     = rMax;
    if (rSurv  !== undefined)  revivalSurvivorCount = rSurv;
    // 第1ラウンド開始時は脱落済みセットをリセット
    if (rRound === 1) revivalEliminatedIds = new Set();
  }
  if (!ir && !ig && sc !== undefined) {
    survivorCount = sc;
  }
  myIsRevivalSpectator = ir && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost && isEventMode;
  myIsGroupSpectator   = ig && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId)) && isEventMode;
  // グループ戦開始が確定した時点でボタンの一時フィルターをリセット
  ['lobbyGroupBtnTop', 'lobbyGroupBtnMiddle', 'lobbyGroupBtnBottom'].forEach(id => {
    const b = $(id); if (b) b.style.filter = '';
  });
  updateChips(players);
  openArrangeScreen(cardOrder, cards, endsAt, players, round, lay);
});

// ── 大会モード：試合開始（暗記フェーズ）───────────────────
socket.on('event_memorize_start', ({ cardOrder, cards, players, endsAt, stage, stageLabel, participantIds, gamesPlayed, humanCount: hc, cpuCount: cc, totalCount: tc, layout: lay }) => {
  matchHeadcount      = { humanCount: hc || 0, cpuCount: cc || 0, totalCount: tc || 0 };
  isEventMode         = true;
  eventStage          = stage;
  eventStageLabel     = stageLabel;
  eventParticipantIds = new Set(participantIds);
  eventGamesPlayed    = gamesPlayed || {};
  myIsEventSpectator  = !myIsHost && !eventParticipantIds.has(myId);
  updateChips(players);
  openArrangeScreen(cardOrder, cards, endsAt, players, currentRound, lay);
});

socket.on('game_waiting', ({ cardOrder, remaining, players, hostId, round, totalCards, isRevival: ir, isGroupMatch: ig, groupTier: gt, groupParticipantIds: gpi, groupRound: gRound, groupMaxRounds: gMax, isEvent: iev, eventStage: es, eventStageLabel: esl, eventParticipantIds: epi }) => {
  liveHostId = hostId;
  myIsHost   = (hostId === myId);
  if (round)            { currentRound   = round; }
  if (totalCards)       { liveTotalCards  = totalCards; }
  if (ir !== undefined) { isRevivalMode   = ir; }
  if (ig !== undefined) { isGroupMatch    = ig; }
  if (gt)               { groupTier       = gt; }
  if (gpi)              { groupParticipantIds = new Set(gpi); }
  if (gRound !== undefined) { groupRound    = gRound; }
  if (iev !== undefined) { isEventMode = iev; }
  if (esl !== undefined) { eventStageLabel = esl; }
  if (epi) { eventParticipantIds = new Set(epi); }
  if (isEventMode) { myIsEventSpectator = !myIsHost && !eventParticipantIds.has(myId); }
  if (gMax   !== undefined) { groupMaxRounds = gMax; }
  myIsRevivalSpectator = ir && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost && isEventMode;
  myIsGroupSpectator   = ig && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId)) && isEventMode;
  updateChips(players);
  $('leftCount').textContent = remaining.length;
  $('progFill').style.width = ((liveTotalCards - remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
  $('readingText').textContent = '— 準備中 —';
  showReadBtn();

  if (isArranging || !gameStarted) {
    gameStarted = true;
    isArranging = false;
    stopArrangeCountdown();
    hide('oLobby'); hide('oGameOver'); hide('oRoundResult'); hide('oEventResult');
    if (cardOrder) renderGrid(cardOrder, new Set(remaining), 'play');
    startTimer();
    renderTop3(players);
  }
  updateHostNotice();
});

// イントロ（読み上げます）→ 上の句 MP3 を Web Audio で精密同期再生
// playAt = イントロ開始時刻（全 PC でハードウェアレベルで同期）
socket.on('read_card', ({ card, remaining, playAt }) => {
  currentReadPlayAt = playAt;
  introStarted = false;   // 「読み上げます」が始まるまでは取れない
  hideScorePanel();       // 前の札の判定内訳は、次の札が読まれ始めたら消す
  setGrabLocked(false);   // 次の札が読み上げられ始めたので、お手付きのロックを解除
  setCurrentPhase('reading');
  hideReadBtn();
  $('leftCount').textContent = remaining.length;
  $('progFill').style.width = ((liveTotalCards - remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
  currentReadingYomiText = card ? card.yomi : '';
  $('readingText').textContent = card ? '📢 読み上げ中...' : '—';
  // 自分の端末で正解発表やDJ実況がまだ再生中なら、それが終わるまで詠み上げを
  // 始めない（端末ごとに音声の長さが違うため、ホストの進行に合わせて途中で
  // 打ち切ってしまわないようにする）。
  whenAudioIdle(() => {
    isAnnouncing = false;
    stopDjSpeech();
    if (card) {
      scheduleReadCard(card.id, playAt, () => {
        if (myIsHost) socket.emit('yomi_finished', { cardId: card.id });
      });
    }
  }, 'read', 25000);
});

// ダミー読み（盤面に対応する札が無い読み上げ）。取ろうとすると全員お手付き扱い。
// 再生（「これは盤面にない札でした」の案内まで含む）が完全に終わるまで待ち、
// ホスト端末がその完了を decoy_finished でサーバーに通知する。
// 教卓PC（進行役）が並べ替えた配置を、全員の画面に反映する
socket.on('layout', ({ layout, by }) => {
  if (by === myId || !isArranging) return;
  if (setServerLayout(layout, Object.keys(layout))) applyLayoutToDom();
});

socket.on('decoy_read', ({ id, yomi, playAt }) => {
  currentReadPlayAt = playAt;
  introStarted = false;
  hideScorePanel();
  setGrabLocked(false);
  setCurrentPhase('decoy');
  hideReadBtn();
  $('readingText').textContent = '📢 読み上げ中...';
  whenAudioIdle(() => {
    isAnnouncing = false;
    stopDjSpeech();
    scheduleDecoyRead(id, playAt, yomi, () => {
      if (myIsHost) socket.emit('decoy_finished');
    });
  }, 'read', 25000);
});

// 制限時間（10秒）超過。「そこまで」と案内した後、上の句・下の句で正解を発表する。
// 音声はクライアントにまだ無ければ再生前に取得してから鳴らす（途中で無音にならないため）。
socket.on('time_up', ({ card, decoy, playAt }) => {
  dropIdleWaiters('read');   // まだ始められていない詠み上げは取り消す
  stopAllAudio();   // ここで世代カウンタをインクリメントする
  const gen = audioGeneration;
  setCurrentPhase('announcing');
  showTimeUpNotif();

  isAnnouncing = true;
  updateReadBtnAvailability();

  const tStart = hiResNow();
  let finished = false;
  const finishTimeUp = () => {
    if (finished) return;
    finished = true;
    markVoiceEnd();
    isAnnouncing = false;
    updateReadBtnAvailability();
    tryPlayDjQueue();
    if (myIsHost) socket.emit('announce_finished', { durations: { totalMs: Math.round(hiResNow() - tStart) } });
  };

  let items = null;
  if (!card) {
    // ダミー後：そこまで → 上の句 → 下の句 → これは盤面にない札でした
    if (decoy) items = voiceAnnounceItems(decoy.yomi, decoy.tori || '', true);
  } else {
    items = voiceAnnounceItems(card.yomi, card.tori, false);
  }
  if (!items) { finishTimeUp(); return; }
  Voice.preload(items, { ensure: true }).then(() => {
    if (gen !== audioGeneration) return;
    if (!playVoiceItems(items, playAt, gen, finishTimeUp)) finishTimeUp();
  });
});

// DJ 実況コメント。詠み上げ・正解発表の音声とは重ならないよう
// tryPlayDjQueue() 側で待機させる（キューに積むだけならいつ届いても良い）。
socket.on('dj_comment', ({ text, segments }) => queueDj(text, segments));

// 誰かが札を取ったときの一連の流れ。かるた自体は最後まで読み上げてから確定するため、
// この時点でもう読み上げ（警告・読み上げます・上の句）は終わっている。続けて
// 「そこまで」→（間を空けずDJの実況があれば）→（1.5秒）→ 答え合わせ（上の句の再読み上げ・下の句）の順に流す。
// 獲得ポイント・取った人の表示は「そこまで」が鳴り終わったタイミング（DJの実況とほぼ同時）まで隠す。
// DJ・答え合わせの音声は、クライアントにまだ無ければ再生前に取得してから鳴らす
// （無いまま鳴らすと、その部分だけ無音になり「途中で切れた」ように聞こえるため）。
socket.on('card_taken', ({ cardId, by, players, result, contenders, djText, djSegs, playAt }) => {
  dropIdleWaiters('read');   // まだ始められていない詠み上げは取り消す
  stopAllAudio();   // ここで世代カウンタをインクリメントする
  const gen = audioGeneration;
  setCurrentPhase('announcing');
  hideReadBtn();

  isAnnouncing = true;
  updateReadBtnAvailability();

  const tStart = hiResNow();
  const dur = { sokomadeMs: null, djGapMs: null, djMs: null, answerGapMs: null, answerMs: null };
  const finishAll = () => {
    if (gen !== audioGeneration) return;
    markVoiceEnd();
    isAnnouncing = false;
    updateReadBtnAvailability();
    tryPlayDjQueue();
    if (myIsHost) socket.emit('announce_finished', { durations: dur });
  };
  const card = KMAP[cardId];
  const playAnswer = () => {
    const tAnswerStart = hiResNow();
    if (!card) { finishAll(); return; }
    const segs = VD.answerSegments(card.yomi, card.tori);
    Voice.preload(segs, { ensure: true }).then(() => {
      if (gen !== audioGeneration) return;
      const onDone = () => { dur.answerMs = Math.round(hiResNow() - tAnswerStart); finishAll(); };
      if (!playVoiceItems(segs, null, gen, onDone)) onDone();
    });
  };
  const scheduleAnswer = (tFromMs) => {
    setTimeout(() => {
      if (gen !== audioGeneration) return;
      dur.answerGapMs = Math.round(hiResNow() - tFromMs);
      playAnswer();
    }, ANNOUNCE_PAUSE_MS);
  };
  const playDj = () => {
    const tDjGapFrom = hiResNow();
    if (!djSegs || !djSegs.length) { dur.djGapMs = 0; scheduleAnswer(tDjGapFrom); return; }
    Voice.preload(djSegs, { ensure: true }).then(() => {
      if (gen !== audioGeneration) return;
      const tDjStart = hiResNow();
      dur.djGapMs = Math.round(tDjStart - tDjGapFrom);
      const onDjDone = () => { dur.djMs = Math.round(hiResNow() - tDjStart); scheduleAnswer(hiResNow()); };
      if (!playVoiceItems(djSegs, null, gen, onDjDone)) onDjDone();
    });
  };
  const reveal = () => {
    if (gen !== audioGeneration) return;
    dur.sokomadeMs = Math.round(hiResNow() - tStart);
    // ここで初めて「○○が獲得！」・獲得ポイント・札の演出を表示する（DJの実況とほぼ同時にするため）
    showTakenNotif(by.name, by.color || '#4a9eff');
    showScorePanel(by, result, contenders);
    updateChips(players);
    const el = $(`card-${cardId}`);
    if (el) {
      if (by.id === myId) {
        showFloat(el, '+' + fmtPts(result ? result.awarded : 0), '#00e5a0');
        el.classList.add('correct-mine');
      } else {
        el.style.borderColor = by.color;
        el.style.color       = by.color;
        el.style.background  = `linear-gradient(160deg,${by.color}28,${by.color}0a)`;
        setCardText(el, `${by.name} が取得！`);
        el.classList.add('correct-other');
      }
      setTimeout(() => {
        el.style.cssText = '';
        el.classList.remove('correct-mine', 'correct-other');
        el.classList.add('removed');
      }, 680);
    }
    playDj();
  };
  if (!playVoiceItems([VD.seg(VD.FIXED.timeup)], playAt, gen, reveal)) reveal();
});

// フライング（上の句の1文字目が読まれる前に定位置の円から出た）
socket.on('flying_penalty', ({ penalty }) => {
  setGrabLocked(true, '🚨 フライング！上の句の1文字目が読み上げられる前にサークルから出ました（次の札まで取れません）');
  showMissPanel(penalty || 0, '🚨 フライング', '上の句の1文字目が読み上げられる前にサークルから出ました。');
});

socket.on('wrong_grab', ({ cardId, penalty }) => {
  setGrabLocked(true);
  showMissPanel(penalty || 0);
  const el = $(`card-${cardId}`);
  if (!el) return;
  showFloat(el, '−' + fmtPts(penalty || 0), '#ff5555');
  el.classList.add('wrong');
  setTimeout(() => el.classList.remove('wrong'), 450);
});

// ロック中に取ろうとした（画面の表示が遅れていた等）場合の保険
socket.on('grab_locked', () => setGrabLocked(true));

socket.on('game_over', ({ players }) => { showGameOver(players); });

// ── 大会モード：試合終了（結果表示）─────────────────────────
// 最後の札の正解発表・DJ実況が終わってから結果画面を出す（音声が終わる前に
// 結果画面へ切り替わって打ち切られないようにする）。
socket.on('event_round_finished', data => whenAudioIdle(() => onEventRoundFinished(data), 'result', 40000));

function onEventRoundFinished(data) {
  stopTimer(); stopAllAudio(); hideReadBtn();
  gameStarted = false;
  syncGrabAvailability();
  const { stage, players } = data;
  const title    = $('evTitle');
  const table    = $('evTable');
  const myStatus = $('evMyStatus');
  let rows = [];
  let myMsg = '';

  const row = (id, badgeText, badgeCls, extraCls) =>
    ({ id, badgeText, badgeCls, extraCls: extraCls || '' });

  if (stage === 'main') {
    if (title) title.textContent = '本戦 終了！';
    rows = [
      ...data.passers.map(id => row(id, '通過', 'adv', 'survivor')),
      ...data.losers.map(id => row(id, '敗者復活戦へ', 'spec', 'eliminated')),
    ];
    myMsg = data.passers.includes(myId) ? '✅ 本戦を突破しました！'
          : data.losers.includes(myId)  ? '😢 敗退…敗者復活戦のチャンスがあります' : '';
  } else if (stage === 'revival') {
    if (title) title.textContent = '敗者復活戦 終了！';
    rows = [
      ...data.revived.map(id => row(id, '復活！本戦へ', 'adv', 'survivor')),
      ...data.stillOut.map(id => row(id, '敗退', 'elim', 'eliminated')),
    ];
    myMsg = data.revived.includes(myId) ? '🎉 復活しました！本戦に戻ります' : '';
  } else if (stage === 'semis') {
    if (title) title.textContent = '決勝進出決定戦 終了！';
    rows = [
      ...data.finalists.map(id => row(id, '決勝進出！', 'adv', 'survivor')),
      ...data.losers.map(id => row(id, '敗退', 'elim', 'eliminated')),
    ];
    myMsg = data.finalists.includes(myId) ? '🏆 決勝進出です！' : '';
  } else if (stage === 'final5') {
    if (title) title.textContent = '決勝ラウンド 終了！';
    rows = data.finalRanking.map((id, i) =>
      row(id, i < 2 ? `${i + 1}位・決勝戦へ` : `${i + 1}位・3位決定戦へ`, i < 2 ? 'adv' : 'spec'));
    myMsg = '';
  } else if (stage === 'thirdplace') {
    if (title) title.textContent = '3位決定戦 終了！';
    rows = data.ranking.map((id, i) => row(id, `${i + 3}位`, i === 0 ? 'adv' : ''));
    myMsg = data.ranking[0] === myId ? '🥉 3位です！' : '';
  } else if (stage === 'championship') {
    if (title) title.textContent = '🏆 決勝戦 終了！';
    rows = data.ranking.map((id, i) => row(id, i === 0 ? '🥇 優勝！' : '🥈 準優勝', i === 0 ? 'adv' : ''));
    myMsg = data.ranking[0] === myId ? '🥇 優勝おめでとうございます！' : data.ranking[1] === myId ? '🥈 準優勝です！' : '';
  }

  if (table) {
    table.innerHTML = rows.map(r => {
      const p = players[r.id];
      return `<div class="rr-row ${r.extraCls}${r.id === myId ? ' me' : ''}">
        <span class="rr-name">${p ? escHtml(p.name) : r.id}${r.id === myId ? ' <small>(あなた)</small>' : ''}</span>
        <span class="rr-score">${p ? fmtPts(p.score) : ''}点</span>
        ${r.badgeCls ? `<span class="rr-badge ${r.badgeCls}">${escHtml(r.badgeText)}</span>` : ''}
      </div>`;
    }).join('');
  }
  if (myStatus) myStatus.textContent = myMsg;

  hide('oLobby'); hide('oRoundResult'); hide('oGameOver');
  show('oEventResult');
}

socket.on('event_stage_ready', ({ stage, mainReady, revivalReady, mainPoolSize, revivalPoolSize }) => {
  eventStage = stage;
  const hostControls = $('evHostControls');
  const guestWait    = $('evGuestWait');
  const lobbyBtn     = $('evLobbyBtn');
  const mainBtn      = $('evMainBtn');
  const revivalBtn   = $('evRevivalBtn');
  const nextBtn      = $('evNextBtn');

  if (stage === 'done') {
    if (hostControls) hostControls.classList.add('hidden');
    if (guestWait)    guestWait.classList.add('hidden');
    if (lobbyBtn)     lobbyBtn.classList.remove('hidden');
    isEventMode = false;
    return;
  }

  const singleAction = ['final5', 'thirdplace', 'championship'].includes(stage);
  if (myIsHost) {
    if (hostControls) hostControls.classList.remove('hidden');
    if (guestWait)    guestWait.classList.add('hidden');
    if (mainBtn) {
      mainBtn.classList.toggle('hidden', singleAction);
      mainBtn.disabled = !mainReady;
      mainBtn.textContent = `本戦を行う（対象:${mainPoolSize}人）`;
    }
    if (revivalBtn) {
      revivalBtn.classList.toggle('hidden', singleAction);
      revivalBtn.disabled = !revivalReady;
      revivalBtn.textContent = `敗者復活戦を行う（対象:${revivalPoolSize}人）`;
    }
    if (nextBtn) { nextBtn.classList.toggle('hidden', !singleAction); nextBtn.disabled = false; }
  } else {
    if (hostControls) hostControls.classList.add('hidden');
    if (guestWait)    guestWait.classList.remove('hidden');
  }
});

// 最後の札の正解発表・DJ実況が終わってから結果画面を出す。
socket.on('round_finished', data => whenAudioIdle(() => onRoundFinished(data), 'result', 40000));

function onRoundFinished({ round, players, survivorIds, eliminatedIds, survivorCount: sc, isFinal, isRevival, isRevivalIntermediate, revivalRound: rRound, revivalMaxRounds: rMax, eliminatedRevivalIds, isGroupMatch: ig, isGroupMatchIntermediate, groupTier: gt, groupRound: gRound, groupMaxRounds: gMax, humanGroups: hg, cumulativeScores: cs, bottomGroupWinners: bw, middleGroupWinners: mw }) {
  if (!isGroupMatchIntermediate) eliminatedIds.forEach(id => liveEliminatedIds.add(id));
  // 練習モード（このイベントは常に練習モード）では敗退しても観戦モードには移行させない
  if (isGroupMatchIntermediate) {
    // グループ戦中間ラウンド: 脱落者を記録
    eliminatedIds.forEach(id => groupEliminatedIds.add(id));
    if (gRound !== undefined) groupRound     = gRound;
    if (gMax   !== undefined) groupMaxRounds = gMax;
  } else if (isRevivalIntermediate) {
    // 復活戦中間ラウンド: 脱落者を記録、まだ復活戦は続く
    eliminatedIds.forEach(id => revivalEliminatedIds.add(id));
    if (rRound !== undefined) revivalRound      = rRound;
    if (rMax   !== undefined) revivalMaxRounds  = rMax;
  } else if (isRevival) {
    // 復活戦最終ラウンド
    survivorIds.forEach(id => liveEliminatedIds.delete(id));
    isRevivalMode        = false;
    myIsRevivalSpectator = false;
    revivalEliminatedIds = new Set();
  }
  if (ig && !isGroupMatchIntermediate) {
    isGroupMatch        = false;
    myIsGroupSpectator  = false;
    groupParticipantIds = new Set();
    groupEliminatedIds  = new Set();
  }
  if (hg) humanGroups = hg;
  if (gt) groupTier   = gt;
  if (bw !== undefined) bottomGroupWinners = bw;
  if (mw !== undefined) middleGroupWinners = mw;
  showRoundResult(round, players, survivorIds, eliminatedIds, sc, isFinal, isRevival, ig, gt, isRevivalIntermediate, rRound, rMax, isGroupMatchIntermediate, gRound, gMax);

  // 練習モードの結果画面ではDJが各自の順位を読み上げる
  if (!isEventMode && !ig && !isRevival && !isRevivalIntermediate && !isGroupMatchIntermediate) {
    speakRoundResultDj(round, players, new Set([...survivorIds, ...eliminatedIds]));
  }
}

// 「惜しい」を流す条件：順位に関係なく、3位との点差がこの点数以内（約1枚分。server.js の NEAR_POINTS と同じ）
const DJ_CLOSE_MAX_DIFF  = 500;

// DJが名前を呼ぶときは学年・コースのタグなしの名前を使う（サーバー側 djName と同じ）
const rawName = p => (p && (p.rawName || p.name)) || '';

// 試合結果画面のDJ音声（各端末で、その端末のユーザー自身の順位に合わせて読み上げる）。
// 順位は結果画面のランキングと同じく、CPUを含む全参加者の中での順位。
function speakRoundResultDj(round, players, participantIds) {
  const sorted = Object.entries(players)
    .filter(([id, p]) => participantIds.has(id) && (p.isBot || p.joined))
    .sort(([, a], [, b]) => b.score - a.score);

  // 優先度：3位以内「おめでとうございます」→ 3位との点差が約1枚分(3万点)以内なら「惜しい」→「○回戦終了です」。
  // 順位そのものは問わない（何位でも、3位との差が3万点以内なら惜しいを流す）。
  // 上の条件を満たしたら、それ以降のメッセージは読み上げない（1つだけ流す）。
  let line = `${round}回戦終了です。お疲れ様でした。`;
  let lineSegs = VD.roundEndSegments(round);

  // 同じ枚数は同順位（1位,1位,3位…）。結果画面の順位表示と同じ数え方にする。
  const ranks = competitionRanks(sorted);
  const myIdx = sorted.findIndex(([id]) => id === myId);
  if (myIdx !== -1) {
    const rank  = ranks[myIdx];
    const score = sorted[myIdx][1].score;
    if (rank === 1) {
      line = `おめでとうございます。あなたは${spokenPoints(score)}で${rank}位です。`;
      lineSegs = VD.resultCongratsSegments(score, rank);
    } else if (rank === 2 || rank === 3) {
      // 1位との点差を常に伝える（しきい値なし）
      const diff = sorted[0][1].score - score;
      const name = rawName(sorted[myIdx][1]);
      line = `惜しい。${name}さん。あと${spokenPoints(diff)}で優勝でした。`;
      lineSegs = VD.resultNearWinSegments(name, diff);
    } else {
      // 入賞圏内（3位以内）で一番下の人との差。順位の上限は設けない。
      let podiumIdx = -1;
      ranks.forEach((r, i) => { if (r <= 3) podiumIdx = i; });
      if (podiumIdx !== -1) {
        const diff = sorted[podiumIdx][1].score - score;
        if (diff > 0 && diff <= DJ_CLOSE_MAX_DIFF) {
          line = `惜しい。あと${spokenPoints(diff)}で${ranks[podiumIdx]}位でした。`;
          lineSegs = VD.resultCloseSegments(diff, ranks[podiumIdx]);
        }
      }
    }
  }
  // showRoundResult() 内の cancel() 直後に話し始めると取りこぼすことがあるため少し待つ
  setTimeout(() => queueDj(line, lineSegs), 300);
}

socket.on('back_to_lobby', ({ players, postTournament: pt, humanGroups: hg, bottomGroupWinners: bw, middleGroupWinners: mw }) => {
  gameStarted          = false;
  syncGrabAvailability();
  myIsSpectator        = false;
  myIsRevivalSpectator = false;
  myIsGroupSpectator   = false;
  isRevivalMode        = false;
  isGroupMatch         = false;
  groupTier            = null;
  groupParticipantIds  = new Set();
  liveEliminatedIds    = new Set();
  currentRound         = 1;
  liveTotalCards       = 10;
  // ポストトーナメント状態を同期（start_game まで保持）
  if (pt !== undefined) postTournament = pt;
  if (hg !== undefined) humanGroups    = hg;
  if (bw !== undefined) bottomGroupWinners = bw;
  if (mw !== undefined) middleGroupWinners = mw;
  updateChips(players);
  openLobby(players);
});

// ── 観戦画面のリアクション・チャット（対局中の画面には出さない）──────────
const SPEC_REACTIONS = ['👏', '🔥', '😲', '😆', '😭', '🎉', '💪', '❤️'];
let specWarnTimer = null;

function clearSpectatorChat() {
  const log = $('specChatLog');
  if (log) log.innerHTML = '';
  const warn = $('specChatWarn');
  if (warn) warn.textContent = '';
}
function showChatWarn(msg) {
  const warn = $('specChatWarn');
  if (!warn) return;
  warn.textContent = msg;
  if (specWarnTimer) clearTimeout(specWarnTimer);
  specWarnTimer = setTimeout(() => { warn.textContent = ''; }, 4000);
}
(function initSpectatorSocial() {
  const bar = $('specReactBar');
  if (bar) {
    SPEC_REACTIONS.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'spec-react-btn';
      b.textContent = e;
      b.addEventListener('click', () => socket.emit('spectator_reaction', { emoji: e }));
      bar.appendChild(b);
    });
  }
  const form = $('specChatForm');
  if (form) {
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const input = $('specChatInput');
      const text = input.value.trim();
      if (!text) return;
      socket.emit('spectator_chat', { text });
    });
  }
})();

socket.on('spectator_chat', ({ id, name, color, text }) => {
  const log = $('specChatLog');
  if (!log) return;
  const line = document.createElement('div');
  line.className = 'spec-chat-line' + (id === myId ? ' me' : '');
  const who = document.createElement('b');
  who.style.color = color || '#8fb4ff';
  who.textContent = name;
  const body = document.createElement('span');
  body.textContent = text;   // textContent で入れるのでHTMLは解釈されない
  line.append(who, body);
  log.appendChild(line);
  while (log.children.length > 80) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
  if (id === myId) { const input = $('specChatInput'); if (input) input.value = ''; }
});
socket.on('chat_rejected', ({ message }) => showChatWarn(message || 'このメッセージは送信できません'));
socket.on('spectator_reaction', ({ emoji, name, color }) => {
  const layer = $('reactFloat');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'react-float';
  el.style.left = (8 + Math.random() * 80) + '%';
  el.innerHTML = '<span></span><small></small>';
  el.querySelector('span').textContent = emoji;
  const small = el.querySelector('small');
  small.textContent = name;
  small.style.color = color || '';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 2700);
});

socket.on('connect_error', () => {
  $('readingText').textContent = 'サーバーに接続できません。ページを更新してください。';
});
