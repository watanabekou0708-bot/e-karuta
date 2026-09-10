'use strict';

// ── Karuta data ───────────────────────────────────────────
const KARUTA = [
  { id:  1, yomi: 'コンピューターの頭脳と呼ばれ、計算と命令の処理を担う装置',             tori: 'CPU' },
  { id:  2, yomi: '電源を切ると消えてしまう、作業中のデータを一時的に保管する主記憶装置', tori: 'メモリ' },
  { id:  3, yomi: '電源を切っても消えない、写真や文書を永続的に記憶する補助記憶装置',     tori: 'ストレージ' },
  { id:  4, yomi: 'ハードウェアを管理し、アプリケーションが動く土台となるソフトウェア',   tori: 'OS' },
  { id:  5, yomi: '世界中のコンピューターをつないだ、巨大な情報通信ネットワーク',         tori: 'インターネット' },
  { id:  6, yomi: '会社や学校など限られた範囲で、コンピューターをつなぐネットワーク',     tori: 'LAN' },
  { id:  7, yomi: 'ネットワーク上の住所にあたる、コンピューターを識別するための番号',     tori: 'IPアドレス' },
  { id:  8, yomi: 'ドメイン名をIPアドレスに変換する、インターネットの電話帳のような仕組み', tori: 'DNS' },
  { id:  9, yomi: 'ウェブブラウザとサーバーがページをやり取りするための通信の規則',       tori: 'HTTP' },
  { id: 10, yomi: 'URLを入力してウェブページを閲覧するためのソフトウェア',               tori: 'Webブラウザ' },
  { id: 11, yomi: '外部からの不正アクセスを防ぐため、ネットワークの境界に設置する仕組み', tori: 'ファイアウォール' },
  { id: 12, yomi: 'コンピューターに害を与える目的で作られた、悪意のあるソフトウェアの総称', tori: 'マルウェア' },
  { id: 13, yomi: '推測されにくい文字列で、アカウントへの不正アクセスを防ぐ秘密の認証情報', tori: 'パスワード' },
  { id: 14, yomi: 'パスワードに加えてスマートフォンなどで本人確認する、二段階の認証方式', tori: '二段階認証' },
  { id: 15, yomi: '実在する企業を装った偽のメールやサイトで、個人情報を盗もうとする攻撃', tori: 'フィッシング詐欺' },
  { id: 16, yomi: '氏名・住所・電話番号など、特定の個人を識別できる情報のこと',           tori: '個人情報' },
  { id: 17, yomi: '他人が作った著作物を、許可なく複製・配布することを禁ずる権利',         tori: '著作権' },
  { id: 18, yomi: 'デジタルデータを0と1の二つの数字だけで表す方法',                       tori: '二進数' },
  { id: 19, yomi: 'デジタルデータの最小単位で、0か1かを表す一桁分の情報量',               tori: 'ビット' },
  { id: 20, yomi: '8ビットをまとめたデータの単位で、ファイルサイズを表す基本単位',         tori: 'バイト' },
  { id: 21, yomi: '大切なデータを失わないよう、別の場所にコピーを保存しておく作業',       tori: 'バックアップ' },
  { id: 22, yomi: 'インターネット経由でサーバーやソフトウェアをサービスとして利用する形態', tori: 'クラウドコンピューティング' },
  { id: 23, yomi: '友人や知人とつながり、メッセージや写真などを共有するインターネットサービス', tori: 'SNS' },
  { id: 24, yomi: '行と列の表に数式を入力し、データの計算や分析を行うソフトウェア',       tori: '表計算ソフト' },
  { id: 25, yomi: '大量のデータを整理して保存し、素早く検索・更新・抽出できる仕組み',     tori: 'データベース' },
  { id: 26, yomi: 'カメラで読み取る、白黒のドットで情報を表す二次元コード',               tori: 'QRコード' },
  { id: 27, yomi: '身の回りの家電や機器がインターネットにつながり、連携する仕組み',       tori: 'IoT' },
  { id: 28, yomi: '大量のデータをもとにコンピューターが自ら学習し、判断する技術',         tori: 'AI' },
  { id: 29, yomi: 'スライドを作成して画面に映し、視覚的に情報を伝えるためのソフトウェア', tori: 'プレゼンテーションソフト' },
  { id: 30, yomi: 'インターネットで商品の売買や代金の決済を行う、オンラインの商取引',     tori: '電子商取引' },
];
const KMAP = Object.fromEntries(KARUTA.map(k => [k.id, k]));

// 難易度を上げた際に挟まれるダミー読み（盤面のどの札にも対応しない）
const DECOY_IDS = ['decoy1', 'decoy2', 'decoy3', 'decoy4', 'decoy5', 'decoy6', 'decoy7', 'decoy8'];

// ── Text-to-speech（答え合わせ TTS 用）───────────────────
let ttsVoice   = null;
let ttsUnlocked = false;

(function initTts() {
  if (!window.speechSynthesis) return;
  const pickVoice = () => {
    const voices = speechSynthesis.getVoices();
    ttsVoice = voices.find(v => v.lang === 'ja-JP' && /nanami|haruka|kyoko|ichiro/i.test(v.name))
            || voices.find(v => v.lang === 'ja-JP')
            || voices.find(v => v.lang.startsWith('ja'))
            || null;
  };
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
function speakChain(texts) {
  if (!window.speechSynthesis || !texts.length) return;
  speechSynthesis.cancel();
  setTimeout(() => {
    texts.forEach(text => {
      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang   = 'ja-JP';
      utt.rate   = 0.65;
      utt.pitch  = 1.05;
      if (ttsVoice) utt.voice = ttsVoice;
      speechSynthesis.speak(utt);
    });
  }, 50);
}

function stopSpeech() {
  if (window.speechSynthesis) speechSynthesis.cancel();
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

async function preloadAudio() {
  const ctx = getAudioCtx();
  try {
    const res = await fetch('/audio/intro.mp3');
    if (res.ok) {
      audioBuffers['intro'] = await ctx.decodeAudioData(await res.arrayBuffer());
      console.log(`[Audio] intro.mp3 ロード (${audioBuffers['intro'].duration.toFixed(2)}s)`);
    }
  } catch(e) { console.warn('[Audio] intro.mp3 なし'); }

  try {
    const res = await fetch('/audio/decoy-notice.mp3');
    if (res.ok) {
      audioBuffers['decoy-notice'] = await ctx.decodeAudioData(await res.arrayBuffer());
      console.log(`[Audio] decoy-notice.mp3 ロード (${audioBuffers['decoy-notice'].duration.toFixed(2)}s)`);
    }
  } catch(e) { console.warn('[Audio] decoy-notice.mp3 なし'); }

  try {
    const res = await fetch('/audio/timeup.mp3');
    if (res.ok) {
      audioBuffers['timeup'] = await ctx.decodeAudioData(await res.arrayBuffer());
      console.log(`[Audio] timeup.mp3 ロード (${audioBuffers['timeup'].duration.toFixed(2)}s)`);
    }
  } catch(e) { console.warn('[Audio] timeup.mp3 なし'); }

  const results = await Promise.allSettled(KARUTA.map(async k => {
    const res = await fetch(`/audio/${k.id}.mp3`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    audioBuffers[k.id] = await ctx.decodeAudioData(await res.arrayBuffer());
  }));
  console.log(`[Audio] 上の句 ${results.filter(r => r.status === 'fulfilled').length}/30 ロード完了`);

  // 正解発表用「上の句／下の句」音声。speechSynthesis を使わず Web Audio で
  // 再生することで、ホスト機特有の音声デバイス切り替え遅延を回避する。
  const announceResults = await Promise.allSettled(KARUTA.flatMap(k => [
    (async () => {
      const res = await fetch(`/audio/${k.id}-top.mp3`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      audioBuffers[`${k.id}-top`] = await ctx.decodeAudioData(await res.arrayBuffer());
    })(),
    (async () => {
      const res = await fetch(`/audio/${k.id}-bottom.mp3`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      audioBuffers[`${k.id}-bottom`] = await ctx.decodeAudioData(await res.arrayBuffer());
    })(),
  ]));
  console.log(`[Audio] 正解発表 ${announceResults.filter(r => r.status === 'fulfilled').length}/60 ロード完了`);

  const decoyResults = await Promise.allSettled(DECOY_IDS.flatMap(id => [
    (async () => {
      const res = await fetch(`/audio/${id}.mp3`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      audioBuffers[id] = await ctx.decodeAudioData(await res.arrayBuffer());
    })(),
    (async () => {
      const res = await fetch(`/audio/${id}-bottom.mp3`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      audioBuffers[`${id}-bottom`] = await ctx.decodeAudioData(await res.arrayBuffer());
    })(),
  ]));
  console.log(`[Audio] ダミー読み ${decoyResults.filter(r => r.status === 'fulfilled').length}/${DECOY_IDS.length * 2} ロード完了`);
}

// intro → yomi を Web Audio API でハードウェアスケジューリング
// playAt = イントロ開始の絶対時刻（サーバー基準）
// 上の句の読み上げが完全に終わったタイミングで onDone() を呼ぶ
// （ホスト端末はこれをトリガーに yomi_finished をサーバーへ通知し、
//  そこから10秒の制限時間カウントを開始する）。
function scheduleReadCard(cardId, playAt, onDone) {
  audioGeneration++;
  const gen = audioGeneration;

  if (curSource) { try { curSource.stop(); } catch(e) {} curSource = null; }
  if (curIntro)  { try { curIntro.stop();  } catch(e) {} curIntro  = null; }

  const ctx      = getAudioCtx();
  const delay    = Math.max(0.05, (playAt - hiResNow() - serverOffset) / 1000);
  const introBuf = audioBuffers['intro'];
  const yomiBuf  = audioBuffers[cardId];

  const finishYomi = () => { if (gen === audioGeneration && onDone) onDone(); };

  // イントロ（読み上げます）
  if (introBuf) {
    const src = ctx.createBufferSource();
    src.buffer = introBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    curIntro = src;
  }

  // 上の句: イントロ終了直後に連続再生
  const yomiDelay = delay + (introBuf ? introBuf.duration : 0);
  if (yomiBuf) {
    const src = ctx.createBufferSource();
    src.buffer = yomiBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + yomiDelay);
    src.onended = finishYomi;
    curSource = src;
  } else {
    // フォールバック: TTS
    setTimeout(() => {
      if (gen !== audioGeneration) return;
      stopSpeech();
      const utt = new SpeechSynthesisUtterance(currentReadingYomiText || $('readingText').textContent);
      utt.lang = 'ja-JP'; utt.rate = 0.6; utt.pitch = 1.05;
      if (ttsVoice) utt.voice = ttsVoice;
      utt.onend = finishYomi;
      speechSynthesis.speak(utt);
    }, yomiDelay * 1000);
  }
}

// ダミー読み（盤面に対応する札が無い読み上げ）を Web Audio で精密同期再生。
// デコイ yomi が終わったら onDone() を呼ぶ。
// 「これは盤面にない札でした」は time_up イベント受信時にまとめて流す。
function scheduleDecoyRead(decoyId, playAt, fallbackText, onDone) {
  audioGeneration++;
  const gen = audioGeneration;

  if (curSource) { try { curSource.stop(); } catch(e) {} curSource = null; }
  if (curIntro)  { try { curIntro.stop();  } catch(e) {} curIntro  = null; }

  const ctx      = getAudioCtx();
  const delay    = Math.max(0.05, (playAt - hiResNow() - serverOffset) / 1000);
  const introBuf = audioBuffers['intro'];
  const decoyBuf = audioBuffers[decoyId];

  if (introBuf) {
    const src = ctx.createBufferSource();
    src.buffer = introBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    curIntro = src;
  }

  const decoyDelay = delay + (introBuf ? introBuf.duration : 0);
  const finishDecoy = () => { if (gen === audioGeneration) onDone(); };

  if (decoyBuf) {
    const src = ctx.createBufferSource();
    src.buffer = decoyBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + decoyDelay);
    src.onended = finishDecoy;
    curSource = src;
  } else {
    setTimeout(() => {
      if (gen !== audioGeneration) return;
      stopSpeech();
      const utt = new SpeechSynthesisUtterance(fallbackText || $('readingText').textContent);
      utt.lang = 'ja-JP'; utt.rate = 0.6; utt.pitch = 1.05;
      if (ttsVoice) utt.voice = ttsVoice;
      utt.onend = finishDecoy;
      speechSynthesis.speak(utt);
    }, decoyDelay * 1000);
  }
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
  // AudioContext を明示的に suspend して音声デバイスを解放する。
  // running のまま放置すると（特にサーバーと同居しているホスト機で）
  // speechSynthesis がデバイスを掴むまでに余分な遅延が生じることがある。
  if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
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
    .map(([hid, s]) => `<div class="house-score-chip"><span>${HOUSE_LABELS[hid] || hid}</span><span class="hs-score">${s}</span></div>`)
    .join('');
  const wrap = $('houseScoreWrap');
  const list = $('houseScoreList');
  if (list) list.innerHTML = html;
  if (wrap) wrap.classList.remove('hidden');
  const specList = $('specHouseScores');
  if (specList) specList.innerHTML = html;
}

// ── TOP10 ランキング（自分の行を強調、2列グリッド表示）─────────
function renderTop3(players) {
  renderHouseScoreboard(players);
  const el = $('top3');
  if (!el) return;
  const medals = ['🥇', '🥈', '🥉'];
  const sorted = Object.entries(players)
    .filter(([id]) => id !== liveHostId)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 10);
  el.innerHTML = sorted.map(([id, p], i) => {
    const rankLabel = i < 3 ? medals[i] : `${i + 1}`;
    const cpuTag    = p.isBot ? '<span class="t3-cpu">CPU</span>' : '';
    const youTag    = id === myId ? '<span class="t3-you">YOU</span>' : '';
    return `<div class="t3-row${id === myId ? ' me' : ''}${i < 3 ? ' top3' : ''}">
      <span class="t3-rank">${rankLabel}</span>
      <span class="t3-name">${escHtml(p.name)}${cpuTag}${youTag}</span>
      <span class="t3-score">${p.score}<small>pt</small></span>
    </div>`;
  }).join('');
}

// ── App state ─────────────────────────────────────────────
const socket    = io();
let myId        = null;
let myIsHost    = false;
let liveHostId  = null;   // ホスト除外フィルタ用
let liveData    = null;
let nameEntered = false;  // doJoin 済みフラグ（init 遅延対策）
let livePlayers = {};
let timerInt    = null;
let seconds     = 0;
let serverOffset = 0;
let gameStarted = false;

// ── トーナメント状態 ──────────────────────────────────────
let currentRound    = 1;
let maxRounds       = 3;
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
let selectedDifficulty    = 'normal';
let selectedCpuDifficulty = 'normal';

function selectDifficulty(d) {
  selectedDifficulty = d;
  document.querySelectorAll('[data-diff]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === d);
  });
}

function selectCpuDifficulty(d) {
  selectedCpuDifficulty = d;
  document.querySelectorAll('[data-cpudiff]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cpudiff === d);
  });
}

function setSurvivorCount(val) {
  const newVal = Math.max(1, parseInt(val, 10) || 1);
  survivorCount = newVal;
  // ロビー・ラウンド結果の両方の入力欄を同期
  const lobbyEl = $('survivorInput');
  const rrEl    = $('rrSurvInput');
  if (lobbyEl && document.activeElement !== lobbyEl) lobbyEl.value = newVal;
  if (rrEl    && document.activeElement !== rrEl)    rrEl.value    = newVal;
  socket.emit('set_survivor_count', { count: newVal });
}

function adjustSurvivorCount(delta) {
  setSurvivorCount(survivorCount + delta);
}

function startGame() {
  const btn = $('lobbyStartBtn');
  if (btn) btn.disabled = true;
  if (postTournament) {
    const tier = !bottomGroupWinners ? 'bottom' : !middleGroupWinners ? 'middle' : 'top';
    socket.emit('start_group_match', { tier });
  } else {
    socket.emit('start_game', {
      difficulty:    selectedDifficulty,
      cpuDifficulty: selectedCpuDifficulty,
      survivorCount,
    });
  }
}

function startNextRound() {
  socket.emit('start_next_round');
}

function startRevival() {
  const inp = $('rrRevivalSurvInput');
  if (inp) revivalSurvivorCount = Math.max(1, parseInt(inp.value, 10) || revivalSurvivorCount);
  socket.emit('start_revival', { selectedIds: [...revivalSelectedIds], revivalSurvivorCount });
}

function startNextRevivalRound() {
  const inp = $('rrRevivalInterSurvInput');
  if (inp) revivalSurvivorCount = Math.max(1, parseInt(inp.value, 10) || revivalSurvivorCount);
  socket.emit('start_next_revival_round', { revivalSurvivorCount });
}

function startNextGroupRound() {
  const inp = $('rrGroupInterSurvInput');
  if (inp) groupSurvivorCount = Math.max(1, parseInt(inp.value, 10) || groupSurvivorCount);
  socket.emit('start_next_group_round', { groupSurvivorCount });
}

function setGroupSurvivorCount(v) {
  const n = parseInt(v, 10);
  if (!isNaN(n) && n >= 1) {
    groupSurvivorCount = n;
    const inp = $('rrGroupInterSurvInput');
    if (inp && document.activeElement !== inp) inp.value = n;
    socket.emit('set_group_survivor_count', { groupSurvivorCount: n });
  }
}

function adjustGroupSurvivorCount(delta) {
  const inp = $('rrGroupInterSurvInput');
  const current = inp ? parseInt(inp.value, 10) || groupSurvivorCount : groupSurvivorCount;
  setGroupSurvivorCount(Math.max(1, current + delta));
}

function setRevivalSurvivorCount(v) {
  const n = parseInt(v, 10);
  if (!isNaN(n) && n >= 1) {
    revivalSurvivorCount = n;
    const i1 = $('rrRevivalSurvInput');      if (i1 && document.activeElement !== i1) i1.value = n;
    const i2 = $('rrRevivalInterSurvInput'); if (i2 && document.activeElement !== i2) i2.value = n;
    socket.emit('set_revival_survivor_count', { revivalSurvivorCount: n });
  }
}

function adjustRevivalSurvivorCount(delta) {
  const inp = $('rrRevivalInterSurvInput') || $('rrRevivalSurvInput');
  const current = inp ? parseInt(inp.value, 10) || revivalSurvivorCount : revivalSurvivorCount;
  const next = Math.max(1, current + delta);
  setRevivalSurvivorCount(next);
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

function startGroupMatch(tier) {
  // 全ボタンを無効化して重複開始を防ぐ（サーバーレスポンスまでの暫定フィードバック）
  ['lobbyGroupBtnTop', 'lobbyGroupBtnMiddle', 'lobbyGroupBtnBottom'].forEach(id => {
    const b = $(id); if (b) b.disabled = true;
  });
  const btnId = { top: 'lobbyGroupBtnTop', middle: 'lobbyGroupBtnMiddle', bottom: 'lobbyGroupBtnBottom' }[tier];
  const btn = $(btnId);
  if (btn) btn.style.filter = 'brightness(1.5)';
  socket.emit('start_group_match', { tier });
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
    .filter(([id, p]) => liveEliminatedIds.has(id) && !p.isBot && p.joined && id !== liveHostId)
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

function setRevivalCount(val) {
  const newVal = Math.max(1, parseInt(val, 10) || 1);
  revivalCount = newVal;
  const el = $('rrRevivalInput');
  if (el && document.activeElement !== el) el.value = newVal;
  socket.emit('set_revival_count', { count: newVal });
}

function adjustRevivalCount(delta) {
  setRevivalCount(revivalCount + delta);
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

function updateLobbyUI() {
  const startBtn   = $('lobbyStartBtn');
  const waiting    = $('lobbyWaiting');
  const diffPick   = $('lobbyDiffPicker');
  const cpuPick    = $('lobbyCpuPicker');
  const survPick   = $('lobbySurvivorPicker');
  const housePick  = $('lobbyHouseSection');
  if (housePick) housePick.style.display = myIsHost ? '' : 'none';
  const eventBtn = $('lobbyEventStartBtn');
  if (eventBtn) eventBtn.disabled = false;
  if (startBtn) {
    startBtn.style.display = myIsHost ? '' : 'none';
    startBtn.disabled = false;
    if (myIsHost) {
      if (postTournament) {
        const tier = !bottomGroupWinners ? '下位' : !middleGroupWinners ? '中位' : '上位';
        startBtn.textContent = `${tier}グループ戦を開始`;
      } else {
        startBtn.textContent = 'ゲームスタート（全3試合）';
      }
    }
  }
  if (waiting)   waiting.style.display   = myIsHost ? 'none' : '';
  if (diffPick)  diffPick.style.display  = myIsHost ? '' : 'none';
  if (cpuPick)   cpuPick.style.display   = myIsHost ? '' : 'none';
  if (survPick)  survPick.style.display  = myIsHost ? '' : 'none';
  const survInput = $('survivorInput');
  if (survInput) survInput.value = survivorCount;
}

function updateLobbyRevivalUI() {
  const sec = $('lobbyRevivalSection');
  if (!sec) return;
  sec.style.display = myIsHost ? '' : 'none';
  if (!myIsHost) return;

  // グループ戦ボタンはゲームスタートボタンに統合したため非表示
  const groupBtns = $('lobbyGroupBtns');
  if (groupBtns) groupBtns.style.display = 'none';

  if (postTournament) {
    sec.classList.remove('locked');
  } else {
    sec.classList.add('locked');
  }

  const mainDesc  = $('lobbyRevivalDesc');
  const promoList = $('lobbyPromotedList');

  if (postTournament && humanGroups) {
    const bottomDone  = bottomGroupWinners !== null;
    const middleDone  = middleGroupWinners !== null;
    const bottomCount = (humanGroups.bottom || []).length;
    const middleCount = (humanGroups.middle || []).length;
    const topCount    = (humanGroups.top    || []).length;

    if (mainDesc) {
      const lines = [
        `🥉 下位グループ：${bottomCount}人` + (bottomDone ? ' ✓' : ''),
        `🥈 中位グループ：${middleCount}人` + (middleDone ? ' ✓' : ''),
        `🥇 上位グループ：${topCount}人`,
      ];
      mainDesc.innerHTML = lines.join('　') + '<br><small>「ゲームスタート」ボタンで順番に開始</small>';
    }

    if (promoList) {
      const allPromoted = [
        ...(bottomGroupWinners || []).map(id => ({ id, from: '下位グループ' })),
        ...(middleGroupWinners || []).map(id => ({ id, from: '中位グループ' })),
      ];
      if (allPromoted.length > 0) {
        promoList.style.display = '';
        promoList.innerHTML = `<div class="lobby-promoted-list-title">⬆ 上位グループへの昇格者</div>`
          + allPromoted.map(({ id, from }) => {
            const p = livePlayers[id] || _ceremonyPlayers[id] || { name: id, color: '#888' };
            return `<div class="lobby-promoted-item">
              <span class="lobby-promoted-dot" style="background:${p.color}"></span>
              <span>${escHtml(p.name)}</span>
              <span style="color:var(--dim);font-size:.72rem;margin-left:.2rem">${from}</span>
            </div>`;
          }).join('');
      } else {
        promoList.style.display = 'none';
        promoList.innerHTML = '';
      }
    }
  } else {
    if (mainDesc)  mainDesc.textContent  = '最終試合終了後に解放されます';
    if (promoList) { promoList.style.display = 'none'; promoList.innerHTML = ''; }
  }
}

function updateHostNotice() {
  const notice = $('hostNotice');
  if (!notice) return;
  notice.classList.toggle('hidden', !(myIsHost && gameStarted));
  const amSpectating = (myIsSpectator || myIsRevivalSpectator || myIsGroupSpectator || myIsEventSpectator) && !myIsHost && gameStarted;
  const grid = $('grid');
  if (grid) {
    grid.classList.toggle('host-locked', myIsHost && gameStarted);
    grid.classList.toggle('hidden', amSpectating);
  }
  const specPanel = $('specPanel');
  if (specPanel) specPanel.classList.toggle('hidden', !amSpectating);
  const debugBtn    = $('debugEndBtn');
  const debugCpuBtn = $('debugCpuBtn');
  if (debugBtn)    debugBtn.style.display    = (myIsHost && gameStarted) ? '' : 'none';
  if (debugCpuBtn) debugCpuBtn.style.display = (myIsHost && gameStarted) ? '' : 'none';
  // ラウンドバッジ・観戦バッジ
  const rb = $('roundBadge');
  const sb = $('spectatorBadge');
  const groupTierName = groupTier === 'top' ? '上位' : groupTier === 'middle' ? '中位' : '下位';
  const roundLabel = isEventMode
    ? (eventStageLabel || '大会モード')
    : isGroupMatch
    ? `${groupTierName}グループ戦 R${groupRound}／${groupMaxRounds}${groupHumanCount > 0 ? ` (${groupHumanCount}人)` : ''}`
    : isRevivalMode ? `敗者復活戦 R${revivalRound}／${revivalMaxRounds}` : `第${currentRound}試合`;
  if (rb) {
    rb.textContent = roundLabel;
    rb.classList.toggle('hidden', !gameStarted);
  }
  if (sb) sb.classList.toggle('hidden', !amSpectating);
  const rl = $('roundLabel');
  if (rl) rl.textContent = roundLabel;
}

// デバッグ用：現在のスコアでゲームを即終了する（ホストのみ）
function debugEndGame() {
  if (!myIsHost || !gameStarted) return;
  socket.emit('debug_end_game');
}

// デバッグ用：CPUに0〜600のランダムポイントを与える（ホストのみ）
function debugGiveCpuPoints() {
  if (!myIsHost || !gameStarted) return;
  socket.emit('debug_cpu_points');
}

// canReadNext: サーバーが「読み上げ可能（waiting フェーズ）」と通知済みか
// isAnnouncing: 正解の上の句・下の句を TTS で読み上げている最中か
// → 両方揃わないと次の札を読み上げられない（ボタンは disabled で禁止UI表示）
let canReadNext  = false;
let isAnnouncing = false;

function updateReadBtnAvailability() {
  const btn = $('readBtn');
  if (!btn) return;
  const visible = myIsHost && canReadNext;
  btn.classList.toggle('hidden', !visible);
  btn.disabled = isAnnouncing;
  btn.title = isAnnouncing ? '正解の読み上げ中はお待ちください' : '次の上の句を読み上げる';
}

function showReadBtn() {
  canReadNext = true;
  currentPhase = 'waiting';
  if (myId !== null) myIsHost = (liveHostId === myId);
  updateReadBtnAvailability();
}

function hideReadBtn() {
  canReadNext = false;
  updateReadBtnAvailability();
}

function readNext() {
  if (!myIsHost || isAnnouncing) return;
  socket.emit('read_next');
}

// ── 学年・コース（ハウス編成用）───────────────────────────
// 医療ビジネス科はかるた大会の対象外のため選択肢に含めない
const COURSE_OPTIONS = {
  '1': ['ITエキスパート科', 'IT・ビジネス科'],
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
function doJoin() {
  const name = $('nameInput').value.trim();
  if (!name) { $('nameInput').focus(); return; }
  const gradeSel  = $('gradeSelect');
  const courseSel = $('courseSelect');
  const grade  = gradeSel  ? gradeSel.value  : null;
  const course = courseSel ? courseSel.value : null;
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
    myIsSpectator = liveEliminatedIds.has(myId);
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

  // 復活戦中なら本戦勝者は観戦扱い（復活戦で脱落済みも観戦）
  myIsRevivalSpectator = d.isRevival && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost;
  // グループ戦中ならグループ外または脱落済みは観戦
  myIsGroupSpectator   = d.isGroupMatch && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId));
  // 大会モード中は現在のステージの参加者以外は観戦
  myIsEventSpectator   = isEventMode && !myIsHost && !eventParticipantIds.has(myId);

  updateChips(d.players);

  if (d.phase === 'lobby') {
    openLobby(d.players);
  } else if (d.phase === 'memorizing') {
    openMemorize(d.cards, d.endsAt, d.players, d.round, d.isRevival);
  } else if (['waiting', 'reading', 'decoy', 'announcing'].includes(d.phase)) {
    gameStarted = true;
    hide('oLobby'); hide('oGameOver'); hide('oMemorize'); hide('oRoundResult');
    renderGrid(d.cardOrder, new Set(d.remaining));
    renderTop3(d.players);
    $('leftCount').textContent = d.remaining.length;
    $('progFill').style.width = ((liveTotalCards - d.remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
    isAnnouncing = false;
    if (d.phase === 'waiting') {
      $('readingText').textContent = '— 準備中 —';
      showReadBtn();
    } else {
      currentPhase = (d.phase === 'reading' || d.phase === 'decoy') ? d.phase : 'announcing';
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
  $('lobbyUrl').textContent = window.location.href;
  renderLobbyList(players);
  hide('oName'); hide('oGameOver'); hide('oMemorize'); hide('oRoundResult'); hide('oCeremony'); hide('oEventResult');
  show('oLobby');
  updateLobbyUI();
  updateLobbyRevivalUI();
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

// ── Memorization phase ────────────────────────────────────
let memoInterval = null;

function openMemorize(cards, endsAt, players, round, mode) {
  if (round) currentRound = round;
  hide('oLobby'); hide('oName'); hide('oGameOver'); hide('oRoundResult'); hide('oEventResult');
  updateChips(players);
  renderMemoList(cards, round);
  renderMemoHeadcount();
  startMemoCountdown(endsAt);
  const skipBtn = $('memoSkipBtn');
  if (skipBtn) skipBtn.style.display = myIsHost ? '' : 'none';
  show('oMemorize');
  const title = document.querySelector('#oMemorize .ov-title');
  if (title) {
    const tierLabel = groupTier === 'top' ? '上位' : groupTier === 'middle' ? '中位' : '下位';
    title.textContent = mode === 'group'   ? `🏆 ${tierLabel}グループ戦 — 暗記タイム`
                      : mode === 'revival' ? '🔄 敗者復活戦 — 暗記タイム'
                      : mode === 'event'   ? `🏁 ${eventStageLabel || '大会モード'} — 暗記タイム`
                      : `🃏 第${currentRound}試合 — 暗記タイム`;
  }
}

function renderMemoHeadcount() {
  const el = $('memoHeadcount');
  if (!el) return;
  const { humanCount, cpuCount, totalCount } = matchHeadcount;
  el.textContent = `👥 参加者: 人間 ${humanCount}人 + CPU ${cpuCount}人 = 合計 ${totalCount}人`;
}

function renderMemoList(cards) {
  const list = $('memoList');
  list.innerHTML = '';
  [...cards].sort((a, b) => a.id - b.id).forEach((k, i) => {
    const row = document.createElement('div');
    row.className = 'memo-row';
    row.innerHTML = `
      <div class="memo-num">${i + 1}</div>
      <div class="memo-body">
        <div class="memo-yomi">📢 ${escHtml(k.yomi)}</div>
        <div class="memo-tori">🃏 ${escHtml(k.tori)}</div>
      </div>`;
    list.appendChild(row);
  });
}

// ── Round Result Overlay ─────────────────────────────────
function showRoundResult(round, players, survivorIds, eliminatedIds, sc, isFinal, isRevival, isGroupMatchResult, currentGroupTier, isRevivalIntermediate, rRound, rMax, isGroupMatchIntermediate, gRound, gMax) {
  stopTimer(); stopAllAudio(); hideReadBtn();
  gameStarted = false;

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
      .filter(([id, p]) => id !== liveHostId && participantIds.has(id) && (p.isBot || p.joined))
      .sort(([, a], [, b]) => b.score - a.score);

    sorted.forEach(([id, p], i) => {
      const isSurv = survivorIds.includes(id);
      const isElim = eliminatedIds.includes(id);
      const rank = i + 1;
      const row = document.createElement('div');
      const rankCls = rank === 1 ? ' rank-1' : rank === 2 ? ' rank-2' : rank === 3 ? ' rank-3' : '';
      row.className = 'rr-row'
        + rankCls
        + (isSurv && !isGroupMatchResult ? ' survivor' : '')
        + (isElim ? ' eliminated' : '')
        + (id === myId ? ' me' : '');
      const rankLabel = rankEmoji[i] || `${rank}位`;
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
      } else if (!isFinal) {
        if (isSurv)      badgeHtml = '<span class="rr-badge adv">→ 進出</span>';
        else if (isElim) badgeHtml = '<span class="rr-badge elim">敗退</span>';
      }
      row.innerHTML = `
        <span class="rr-rank">${rankLabel}</span>
        <span class="rr-name">${escHtml(p.name)}${cpuBadge}${youBadge}</span>
        <span class="rr-score">${p.score}点</span>
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
    } else if (survivorIds.includes(myId)) {
      myStatus.textContent = '✅ あなたは次の試合に進出しました！';
      myStatus.className = 'rr-my-status adv';
    } else if (eliminatedIds.includes(myId)) {
      myIsSpectator = true;
      liveEliminatedIds.add(myId);
      myStatus.textContent = '👀 あなたは観戦モードに移行します';
      myStatus.className = 'rr-my-status elim';
    } else {
      myStatus.textContent = myIsSpectator ? '👀 観戦中' : '';
      myStatus.className = 'rr-my-status';
    }
  }

  // ── コントロール表示制御 ──────────────────────────────────
  const modeTabs      = $('rrModeTabs');
  const mainSec       = $('rrMainSection');
  const revivalSec    = $('rrRevivalSection');
  const survivorPicker= $('rrSurvivorPicker');
  const guestWait     = $('rrGuestWait');
  const lobbyBtn      = $('rrLobbyBtn');
  const nextLabel     = $('rrNextRoundLabel');
  const nextNum       = $('rrNextRoundNum');
  const rrSurvInp     = $('rrSurvInput');
  const rrRevInp      = $('rrRevivalInput');

  const revivalInterSec  = $('rrRevivalInterSection');
  const rrRevRoundLbl    = $('rrRevivalRoundLabel');
  const rrRevSurvInp     = $('rrRevivalInterSurvInput');
  const groupInterSec    = $('rrGroupInterSection');
  const rrGroupRoundLbl  = $('rrGroupRoundLabel');
  const rrGroupSurvInp   = $('rrGroupInterSurvInput');

  // 全セクションを初期化（hidden）
  [modeTabs, mainSec, revivalSec, revivalInterSec, groupInterSec].forEach(el => el && el.classList.add('hidden'));
  if (lobbyBtn) lobbyBtn.classList.add('hidden');
  if (guestWait) guestWait.classList.add('hidden');

  const tierLblForCtrl = currentGroupTier === 'top' ? '上位' : currentGroupTier === 'middle' ? '中位' : '下位';
  if (isGroupMatchIntermediate) {
    // グループ戦中間ラウンド後
    const nextR = (gRound || groupRound) + 1;
    if (rrGroupRoundLbl) rrGroupRoundLbl.textContent = `${tierLblForCtrl}グループ 第${gRound || groupRound}ラウンド終了 → 第${nextR}ラウンドへ`;
    if (rrGroupSurvInp)  rrGroupSurvInp.value = groupSurvivorCount;
    if (myIsHost) {
      if (groupInterSec) groupInterSec.classList.remove('hidden');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else if (isRevivalIntermediate) {
    // 復活戦中間ラウンド後
    if (rrRevRoundLbl) rrRevRoundLbl.textContent = `復活戦 第${rRound || revivalRound}ラウンド終了 → 第${(rRound || revivalRound) + 1}ラウンドへ`;
    if (rrRevSurvInp)  rrRevSurvInp.value = revivalSurvivorCount;
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
        .filter(([id, p]) => id !== liveHostId && survivorIds.includes(id) && !p.isBot && p.joined)
        .sort(([, a], [, b]) => b.score - a.score);
      startCeremony(sorted, players, () => {
        hide('oCeremony');
        show('oRoundResult');  // ランキング画面を表示してから手動でロビーへ
      });
      return;
    }
  } else if (isRevival) {
    // 復活戦後：次試合モードのみ（ホスト）
    if (myIsHost) {
      if (mainSec) mainSec.classList.remove('hidden');
      if (nextLabel) nextLabel.textContent = round + 1;
      if (nextNum)   nextNum.textContent   = round + 1;
      if (rrSurvInp) rrSurvInp.value       = survivorCount;
      if (survivorPicker) survivorPicker.classList.remove('hidden');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else {
    // 通常試合後：モードタブ（ホスト）
    if (myIsHost) {
      const hasElim = Object.entries(players)
        .some(([id, p]) => liveEliminatedIds.has(id) && !p.isBot && p.joined && id !== liveHostId);

      if (hasElim && modeTabs) modeTabs.classList.remove('hidden');
      if (mainSec) mainSec.classList.remove('hidden');
      if (nextLabel) nextLabel.textContent = round + 1;
      if (nextNum)   nextNum.textContent   = round + 1;
      if (rrSurvInp) rrSurvInp.value       = survivorCount;
      if (survivorPicker) survivorPicker.classList.remove('hidden');

      if (hasElim) renderRevivalUserList(players);
      if (rrRevInp) rrRevInp.value = revivalCount;

      const tabMain = $('rrTabMain');
      const tabRevival = $('rrTabRevival');
      if (tabMain) tabMain.classList.add('active');
      if (tabRevival) tabRevival.classList.remove('active');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  }

  hide('oLobby'); hide('oMemorize'); hide('oGameOver');
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

  hide('oLobby'); hide('oMemorize'); hide('oGameOver'); hide('oRoundResult');
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
  if (score)  score.textContent = `${p.score} 点`;

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

function startMemoCountdown(endsAt) {
  if (memoInterval) clearInterval(memoInterval);
  const tick = () => {
    const secs = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    $('memoTimer').textContent = fmtTime(secs);
  };
  tick();
  memoInterval = setInterval(tick, 500);
}

function skipMemorize() { socket.emit('skip_memorize'); }

function closeMemo() {
  if (memoInterval) { clearInterval(memoInterval); memoInterval = null; }
  hide('oMemorize');
}

// ── Card grid ─────────────────────────────────────────────
function renderGrid(cardOrder, remainingSet) {
  const grid = $('grid');
  grid.innerHTML = '';
  const order = cardOrder.length ? cardOrder : KARUTA.map(k => k.id);
  order.forEach(id => {
    const k  = KMAP[id];
    if (!k) return;
    const el = document.createElement('div');
    el.className   = 'card' + (remainingSet.has(id) ? '' : ' removed');
    el.id          = `card-${id}`;
    el.dataset.id  = id;
    el.textContent = k.tori;
    el.addEventListener('click', ev => onCardClick(id, el, ev));
    grid.appendChild(el);
  });
}

// クリック位置とカード中心とのズレを 0（中心）〜1（端）に正規化して返す。
// サーバー側で「速さがほぼ同時のときだけ精度で決着する」判定に使う。
function computeGrabPrecision(el, ev) {
  if (!ev || typeof ev.clientX !== 'number') return 1;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return 1;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (ev.clientX - cx) / (rect.width / 2);
  const dy = (ev.clientY - cy) / (rect.height / 2);
  return Math.min(1, Math.sqrt(dx * dx + dy * dy));
}

function onCardClick(id, el, ev) {
  if (myIsHost || myIsSpectator || myIsRevivalSpectator || myIsGroupSpectator) {
    if (el.classList.contains('removed')) return;
    el.classList.remove('host-forbidden');
    void el.offsetWidth;
    el.classList.add('host-forbidden');
    setTimeout(() => el.classList.remove('host-forbidden'), 450);
    return;
  }
  if (el.classList.contains('removed') ||
      el.classList.contains('correct-mine') ||
      el.classList.contains('correct-other') ||
      el.classList.contains('wrong')) return;
  const precision = computeGrabPrecision(el, ev);
  socket.emit('grab_card', { cardId: id, t: hiResNow() + serverOffset, precision });
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
      <span class="chip-score">${me.score}</span>`;
    wrap.appendChild(c);
  }
  if (gameStarted) renderTop3(players);
}

// 自分の現在の順位（ホストを除いた全参加者中の順位）を返す
function myRankLabel(players) {
  const sorted = Object.entries(players)
    .filter(([id]) => id !== liveHostId)
    .sort(([, a], [, b]) => b.score - a.score);
  const idx = sorted.findIndex(([id]) => id === myId);
  if (idx === -1) return '';
  return `${idx + 1}位 / ${sorted.length}人中`;
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
  const title = document.querySelector('#oGameOver .ov-title');
  if (title) title.textContent = '🏆 全試合終了！';
  const medals = ['🥇', '🥈', '🥉'];
  const wrap = $('rankings');
  wrap.innerHTML = '';
  const sorted = Object.entries(players)
    .filter(([id]) => id !== liveHostId)
    .sort(([, a], [, b]) => b.score - a.score);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  top3.forEach(([id, p], i) => {
    const row = document.createElement('div');
    row.className = 'rank-row';
    row.innerHTML = `
      <span class="rank-medal">${medals[i]}</span>
      <span class="rank-name">${escHtml(p.name)}${id === myId ? ' <small>(あなた)</small>' : ''}</span>
      <span class="rank-score">${p.score}点</span>
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
        <span class="rank-others-score">${p.score}点</span>`;
      othersWrap.appendChild(item);
    });
    wrap.appendChild(othersWrap);
  }
  hide('oLobby'); hide('oMemorize'); hide('oRoundResult');
  show('oGameOver');
}

// ── Socket events ─────────────────────────────────────────
socket.on('init', data => {
  myId       = data.myId;
  liveHostId = data.hostId;
  liveData   = { ...data };
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

socket.on('memorize_start', ({ cards, players, endsAt, round, maxRounds: mr, survivorCount: sc, isRevival: ir, revivalCount: rc, revivalRound: rRound, revivalMaxRounds: rMax, revivalSurvivorCount: rSurv, isGroupMatch: ig, groupTier: gt, groupParticipantIds: gpi, humanGroups: hg, groupRound: gRound, groupMaxRounds: gMax, groupSurvivorCount: gSurv, groupHumanCount: ghc, humanCount: hc, cpuCount: cc, totalCount: tc }) => {
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
    const sv = $('survivorInput'); if (sv) sv.value = sc;
    const rv = $('rrSurvInput');   if (rv) rv.value = sc;
  }
  myIsRevivalSpectator = ir && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost;
  myIsGroupSpectator   = ig && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId));
  // グループ戦開始が確定した時点でボタンの一時フィルターをリセット
  ['lobbyGroupBtnTop', 'lobbyGroupBtnMiddle', 'lobbyGroupBtnBottom'].forEach(id => {
    const b = $(id); if (b) b.style.filter = '';
  });
  updateChips(players);
  openMemorize(cards, endsAt, players, round, ir || ig ? (ig ? 'group' : 'revival') : false);
});

// ── 大会モード：試合開始（暗記フェーズ）───────────────────
socket.on('event_memorize_start', ({ cards, players, endsAt, stage, stageLabel, participantIds, gamesPlayed, humanCount: hc, cpuCount: cc, totalCount: tc }) => {
  matchHeadcount      = { humanCount: hc || 0, cpuCount: cc || 0, totalCount: tc || 0 };
  isEventMode         = true;
  eventStage          = stage;
  eventStageLabel     = stageLabel;
  eventParticipantIds = new Set(participantIds);
  eventGamesPlayed    = gamesPlayed || {};
  myIsEventSpectator  = !myIsHost && !eventParticipantIds.has(myId);
  updateChips(players);
  openMemorize(cards, endsAt, players, currentRound, 'event');
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
  myIsRevivalSpectator = ir && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost;
  myIsGroupSpectator   = ig && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId));
  updateChips(players);
  $('leftCount').textContent = remaining.length;
  $('progFill').style.width = ((liveTotalCards - remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
  $('readingText').textContent = '— 準備中 —';
  showReadBtn();

  if (!gameStarted) {
    gameStarted = true;
    closeMemo();
    hide('oLobby'); hide('oGameOver'); hide('oRoundResult'); hide('oEventResult');
    if (cardOrder) renderGrid(cardOrder, new Set(remaining));
    startTimer();
    renderTop3(players);
  }
  updateHostNotice();
});

// イントロ（読み上げます）→ 上の句 MP3 を Web Audio で精密同期再生
// playAt = イントロ開始時刻（全 PC でハードウェアレベルで同期）
socket.on('read_card', ({ card, remaining, playAt }) => {
  currentPhase = 'reading';
  hideReadBtn();
  $('leftCount').textContent = remaining.length;
  $('progFill').style.width = ((liveTotalCards - remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
  currentReadingYomiText = card ? card.yomi : '';
  $('readingText').textContent = card ? '📢 読み上げ中...' : '—';
  if (card) {
    scheduleReadCard(card.id, playAt, () => {
      if (myIsHost) socket.emit('yomi_finished', { cardId: card.id });
    });
  }
});

// ダミー読み（盤面に対応する札が無い読み上げ）。取ろうとすると全員お手付き扱い。
// 再生（「これは盤面にない札でした」の案内まで含む）が完全に終わるまで待ち、
// ホスト端末がその完了を decoy_finished でサーバーに通知する。
socket.on('decoy_read', ({ id, yomi, playAt }) => {
  currentPhase = 'decoy';
  hideReadBtn();
  $('readingText').textContent = '📢 読み上げ中...';
  scheduleDecoyRead(id, playAt, yomi, () => {
    if (myIsHost) socket.emit('decoy_finished');
  });
});

// 取得者名を画面表示、上の句・下の句を TTS で答え合わせ
// stopAllAudio() が cancel() を呼んだあと、音声デバイスが完全に解放されるまで
// 200ms 待ってから TTS を開始（ホストでの二重 cancel による遅延を防ぐ）
// 読み上げ中は isAnnouncing=true にして次の札の読み上げボタンを禁止する。
// onend が確実に発火しない既知の Chrome の不具合に備え、文字数から推定した
// 時間でのフォールバックタイマーも併用する。
// 正解発表。事前生成 MP3 を Web Audio で再生するのが基本パス（ホスト機での
// 音声デバイスのハンドオフ遅延を回避できる）。MP3 が無い場合のみ speechSynthesis
// にフォールバックする。
socket.on('announce_taken', ({ name, color, card, playAt }) => {
  stopAllAudio();   // ここで世代カウンタをインクリメントする
  const gen = audioGeneration;
  currentPhase = 'announcing';
  showTakenNotif(name, color || '#4a9eff');

  isAnnouncing = true;
  updateReadBtnAvailability();

  let finished = false;
  const finishAnnouncing = () => {
    if (finished) return;
    finished = true;
    isAnnouncing = false;
    updateReadBtnAvailability();
  };

  if (!card) { finishAnnouncing(); return; }

  const usedWebAudio = scheduleAnnounceAudio(card.id, playAt, gen, finishAnnouncing, 'timeup');
  if (usedWebAudio) return;

  // フォールバック: 該当 MP3 が無い場合のみ TTS で読み上げる
  if (!window.speechSynthesis) { finishAnnouncing(); return; }
  const texts = ['そこまで', card.yomi, card.tori];
  const ttsStartBuf = 200;
  const estMs = texts.reduce((sum, t) => sum + t.length * 180, 0) + 1500;
  setTimeout(finishAnnouncing, estMs + ttsStartBuf); // フォールバック（onend不発時の保険）

  setTimeout(() => {
    texts.forEach((text, i) => {
      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang   = 'ja-JP';
      utt.rate   = 0.65;
      utt.pitch  = 1.05;
      if (ttsVoice) utt.voice = ttsVoice;
      if (i === texts.length - 1) utt.onend = finishAnnouncing;
      speechSynthesis.speak(utt);
    });
  }, ttsStartBuf);
});

// 制限時間（10秒）超過。「そこまで」と案内した後、上の句・下の句で正解を発表する
socket.on('time_up', ({ card, decoy, playAt }) => {
  stopAllAudio();   // ここで世代カウンタをインクリメントする
  const gen = audioGeneration;
  currentPhase = 'announcing';
  showTimeUpNotif();

  isAnnouncing = true;
  updateReadBtnAvailability();

  let finished = false;
  const finishTimeUp = () => {
    if (finished) return;
    finished = true;
    isAnnouncing = false;
    updateReadBtnAvailability();
  };

  if (!card) {
    // デコイ後: そこまで →（間）→ 上の句 → 下の句 → これは盤面にない札でした
    const ctx        = getAudioCtx();
    const timeupBuf  = audioBuffers['timeup'];
    const decoyBuf   = decoy ? audioBuffers[decoy.id] : null;
    const decoyBotBuf = decoy ? audioBuffers[`${decoy.id}-bottom`] : null;
    const noticeBuf  = audioBuffers['decoy-notice'];

    const seq = [];
    if (timeupBuf)   seq.push({ buf: timeupBuf,   pause: 0.8 });
    if (decoyBuf)    seq.push({ buf: decoyBuf,     pause: 0.3 });
    if (decoyBotBuf) seq.push({ buf: decoyBotBuf,  pause: 0.3 });
    if (noticeBuf)   seq.push({ buf: noticeBuf,    pause: 0   });

    if (seq.length > 0) {
      let t = Math.max(0.05, (playAt - hiResNow() - serverOffset) / 1000);
      let lastSrc = null;
      seq.forEach(({ buf, pause }, i) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(ctx.currentTime + t);
        t += buf.duration + pause;
        if (i === 0 && seq.length > 1) curIntro = src;
        else curSource = src;
        lastSrc = src;
      });
      lastSrc.onended = () => { if (gen === audioGeneration) finishTimeUp(); };
      return;
    }

    // Web Audio バッファが全滅した場合は TTS フォールバック
    if (window.speechSynthesis) {
      const texts = ['そこまで'];
      if (decoy) texts.push(decoy.yomi);
      if (decoy && decoy.tori) texts.push(decoy.tori);
      texts.push('これは盤面にない札でした');
      const ttsStartBuf = 200;
      const estMs = texts.reduce((s, tx) => s + tx.length * 180, 0) + 1500;
      setTimeout(finishTimeUp, estMs + ttsStartBuf);
      setTimeout(() => {
        texts.forEach((text, i) => {
          const utt = new SpeechSynthesisUtterance(text);
          utt.lang = 'ja-JP'; utt.rate = 0.65; utt.pitch = 1.05;
          if (ttsVoice) utt.voice = ttsVoice;
          if (i === texts.length - 1) utt.onend = finishTimeUp;
          speechSynthesis.speak(utt);
        });
      }, ttsStartBuf);
      return;
    }
    finishTimeUp();
    return;
  }

  const usedWebAudio = scheduleAnnounceAudio(card.id, playAt, gen, finishTimeUp, 'timeup');
  if (usedWebAudio) return;

  if (!window.speechSynthesis) { finishTimeUp(); return; }
  const texts = ['そこまで', card.yomi, card.tori];
  const ttsStartBuf = 200;
  const estMs = texts.reduce((sum, t) => sum + t.length * 180, 0) + 1500;
  setTimeout(finishTimeUp, estMs + ttsStartBuf);

  setTimeout(() => {
    texts.forEach((text, i) => {
      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang   = 'ja-JP';
      utt.rate   = 0.65;
      utt.pitch  = 1.05;
      if (ttsVoice) utt.voice = ttsVoice;
      if (i === texts.length - 1) utt.onend = finishTimeUp;
      speechSynthesis.speak(utt);
    });
  }, ttsStartBuf);
});

socket.on('card_taken', ({ cardId, by, players }) => {
  const el = $(`card-${cardId}`);
  if (!el) return;
  updateChips(players);
  hideReadBtn();
  if (by.id === myId) {
    showFloat(el, '+100', '#00e5a0');
    el.classList.add('correct-mine');
  } else {
    el.style.borderColor = by.color;
    el.style.color       = by.color;
    el.style.background  = `linear-gradient(160deg,${by.color}28,${by.color}0a)`;
    el.textContent       = `${by.name} が取得！`;
    el.classList.add('correct-other');
  }
  setTimeout(() => {
    el.style.cssText = '';
    el.classList.remove('correct-mine', 'correct-other');
    el.classList.add('removed');
  }, 680);
});

socket.on('wrong_grab', ({ cardId }) => {
  const el = $(`card-${cardId}`);
  if (!el) return;
  showFloat(el, '-20', '#ff5555');
  el.classList.add('wrong');
  setTimeout(() => el.classList.remove('wrong'), 450);
});

socket.on('game_over', ({ players }) => { showGameOver(players); });

// ── 大会モード：試合終了（結果表示）─────────────────────────
socket.on('event_round_finished', (data) => {
  stopTimer(); stopAllAudio(); hideReadBtn();
  gameStarted = false;
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
        <span class="rr-score">${p ? p.score : ''}点</span>
        ${r.badgeCls ? `<span class="rr-badge ${r.badgeCls}">${escHtml(r.badgeText)}</span>` : ''}
      </div>`;
    }).join('');
  }
  if (myStatus) myStatus.textContent = myMsg;

  hide('oLobby'); hide('oRoundResult'); hide('oGameOver'); hide('oMemorize');
  show('oEventResult');
});

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

socket.on('round_finished', ({ round, players, survivorIds, eliminatedIds, survivorCount: sc, isFinal, isRevival, isRevivalIntermediate, revivalRound: rRound, revivalMaxRounds: rMax, eliminatedRevivalIds, isGroupMatch: ig, isGroupMatchIntermediate, groupTier: gt, groupRound: gRound, groupMaxRounds: gMax, humanGroups: hg, cumulativeScores: cs, bottomGroupWinners: bw, middleGroupWinners: mw }) => {
  if (!isGroupMatchIntermediate) eliminatedIds.forEach(id => liveEliminatedIds.add(id));
  if (eliminatedIds.includes(myId) && !isGroupMatchIntermediate) myIsSpectator = true;
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
  if (isFinal) postTournament = true;
  if (bw !== undefined) bottomGroupWinners = bw;
  if (mw !== undefined) middleGroupWinners = mw;
  showRoundResult(round, players, survivorIds, eliminatedIds, sc, isFinal, isRevival, ig, gt, isRevivalIntermediate, rRound, rMax, isGroupMatchIntermediate, gRound, gMax);
});

socket.on('survivor_count_updated', ({ survivorCount: sc }) => {
  survivorCount = sc;
  const sv = $('survivorInput');  if (sv && document.activeElement !== sv) sv.value = sc;
  const rr = $('rrSurvInput');   if (rr && document.activeElement !== rr) rr.value = sc;
});

socket.on('revival_survivor_count_updated', ({ revivalSurvivorCount: n }) => {
  revivalSurvivorCount = n;
  const i1 = $('rrRevivalSurvInput');      if (i1 && document.activeElement !== i1) i1.value = n;
  const i2 = $('rrRevivalInterSurvInput'); if (i2 && document.activeElement !== i2) i2.value = n;
});

socket.on('group_survivor_count_updated', ({ groupSurvivorCount: n }) => {
  groupSurvivorCount = n;
  const inp = $('rrGroupInterSurvInput');
  if (inp && document.activeElement !== inp) inp.value = n;
});

socket.on('back_to_lobby', ({ players, postTournament: pt, humanGroups: hg, bottomGroupWinners: bw, middleGroupWinners: mw }) => {
  gameStarted          = false;
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

socket.on('revival_count_updated', ({ revivalCount: rc }) => {
  revivalCount = rc;
  const el = $('rrRevivalInput');
  if (el && document.activeElement !== el) el.value = rc;
});

socket.on('connect_error', () => {
  $('readingText').textContent = 'サーバーに接続できません。ページを更新してください。';
});
