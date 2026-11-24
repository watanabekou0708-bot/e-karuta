'use strict';
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const os         = require('os');
const fs         = require('fs');

const PORT = process.env.PORT || 3000;
const app  = express();
const srv  = http.createServer(app);
const io   = new Server(srv);

// ── Karuta data（IT用語一覧.xlsm Sheet1 の全790語。public/karuta-data.js に一本化）
// lv: A〜D=出題レベル / 空=レベル未設定（出題せず、ダミー読みの素材にだけ使う）
const KARUTA = require('./public/karuta-data.js');
const KMAP   = Object.fromEntries(KARUTA.map(k => [k.id, k]));

// ── レベル（A〜D）とダミー読み ──────────────────────────────
// A=一般常識 / B=標準 / C=中程度 / D=高度（IT用語一覧.xlsm の区分）。
// レベルの付いていない札(lv='')は出題せず、「ダミー読み」の素材にだけ使う。
// 出題札と絶対に重ならないので、ダミー読みの答えが盤面に存在してしまうことがない。
const LEVELS    = ['A', 'B', 'C', 'D'];
const LEVEL_IDS = { A: [], B: [], C: [], D: [] };
const UNLEVELED = [];
KARUTA.forEach(k => { if (LEVEL_IDS[k.lv]) LEVEL_IDS[k.lv].push(k.id); else UNLEVELED.push(k); });
const levelIndexOfCard = id => { const k = KMAP[id]; return k ? LEVELS.indexOf(k.lv) : -1; };

// 最後の1枚になったとき、本物の札を読む前に必ず連発するダミー読みの最低回数（レベルが上がるほど増える）
const FINAL_DECOYS = { A: 3, B: 4, C: 5, D: 6 };

// 直近に使ったダミーは続けて選ばない（最後の1枚の連発で同じ読みが続かないように）
let recentDecoyIds = [];
function pickDecoy() {
  // 試合ごとに用意した候補（その試合の準備時に音声を作っておく）から選ぶ。無ければ未設定札全体から選ぶ。
  if (gs.decoyPool && gs.decoyPool.length) {
    const cand = gs.decoyPool.filter(d => !recentDecoyIds.includes(d.id));
    const d = (cand.length ? cand : gs.decoyPool)[Math.floor(Math.random() * (cand.length || gs.decoyPool.length))];
    recentDecoyIds.push(d.id);
    if (recentDecoyIds.length > Math.max(3, gs.decoyPool.length - 2)) recentDecoyIds.shift();
    return d;
  }
  const pool = UNLEVELED.filter(k => !recentDecoyIds.includes(k.id));
  const k = pool[Math.floor(Math.random() * pool.length)] || UNLEVELED[0];
  recentDecoyIds.push(k.id);
  if (recentDecoyIds.length > 12) recentDecoyIds.shift();
  return { id: 'decoy' + k.id, yomi: k.yomi, tori: k.tori };
}

// 試合に使う札IDの集まりから、その試合のレベル（一番高いレベルの添字 0〜3）を求める
function matchLevelIndex(cardIds) {
  return cardIds.reduce((m, id) => Math.max(m, levelIndexOfCard(id)), 0);
}

// Excel関数の札か（答えが「〇〇関数」）。
const isExcelFunctionCard = id => {
  const k = KMAP[id];
  return !!k && k.tori.endsWith('関数');
};

// ids から n 枚を抽選する。練習モードでは Excel関数とそれ以外の用語がほぼ半々
// （7:8か8:7）になるよう抽選する。足りない分はもう一方で補う。
function pickCards(ids, n, balanceExcel) {
  if (!balanceExcel) return shuffle(ids).slice(0, n);
  const ex = shuffle(ids.filter(isExcelFunctionCard));
  const ot = shuffle(ids.filter(id => !isExcelFunctionCard(id)));
  const half = Math.floor(n / 2);
  const wantEx = Math.random() < 0.5 ? half : n - half;
  let nEx = Math.min(wantEx, ex.length);
  const nOt = Math.min(n - nEx, ot.length);
  nEx = Math.min(n - nOt, ex.length);
  return [...ex.slice(0, nEx), ...ot.slice(0, nOt)];
}

// レベルが上がる試合では、ひとつ前のレベルの札をこの割合だけ混ぜる（一気に難しくなりすぎないように）
const CARRY_RATIO = 0.3;

// レベル levelIdx(0=A〜3=D) の試合用に total 枚を作る。levelIdx>0 なら前レベルの札を約3割混ぜる。
function buildLevelCardIds(levelIdx, total, balanceExcel) {
  const idx  = Math.min(Math.max(levelIdx, 0), LEVELS.length - 1);
  const nPrev = idx > 0 ? Math.round(total * CARRY_RATIO) : 0;
  const cur  = pickCards(LEVEL_IDS[LEVELS[idx]], total - nPrev, balanceExcel);
  const prev = nPrev ? pickCards(LEVEL_IDS[LEVELS[idx - 1]], nPrev, balanceExcel) : [];
  return shuffle([...cur, ...prev]);
}

// 大会モードの本戦ラウンドで使うレベル別の枚数 [A, B, C, D]（1試合10枚）。
// 回戦が進むほどレベルが上がり、上がる回戦は前のレベルを3割ほど残す。
// 準決勝・決勝5人・3位決定戦・決勝戦は最後の要素（最難）を使う。
const EVENT_ROUND_MIX = [
  [10, 0, 0, 0],
  [3, 7, 0, 0],
  [0, 3, 7, 0],
  [0, 0, 3, 7],
  [0, 0, 2, 8],
  [0, 0, 1, 9],
  [0, 0, 0, 10],
];

function buildEventRoundCardIds(roundIndex) {
  const mix = EVENT_ROUND_MIX[Math.min(Math.max(roundIndex, 1), EVENT_ROUND_MIX.length) - 1];
  return shuffle(LEVELS.flatMap((lv, i) => shuffle(LEVEL_IDS[lv]).slice(0, mix[i])));
}

// 敗者復活戦で使うレベル別の枚数 [A, B, C, D]（1試合5枚）。EVENT_ROUND_MIXと同じ形（本戦の
// 回戦が進むほど難しくなる配分）を5枚分に縮小したもの。本戦の現在の回戦数（mainRoundIndex）を
// そのまま指数として使う＝本戦の進み具合に合わせて敗者復活戦も難しくなっていく。
const REVIVAL_ROUND_MIX = [
  [5, 0, 0, 0],
  [2, 3, 0, 0],
  [0, 2, 3, 0],
  [0, 0, 2, 3],
  [0, 0, 1, 4],
  [0, 0, 1, 4],
  [0, 0, 0, 5],
];
function buildRevivalRoundCardIds(roundIndex) {
  const mix = REVIVAL_ROUND_MIX[Math.min(Math.max(roundIndex, 1), REVIVAL_ROUND_MIX.length) - 1];
  return shuffle(LEVELS.flatMap((lv, i) => shuffle(LEVEL_IDS[lv]).slice(0, mix[i])));
}

// 練習モード：第N試合はレベルN（A→B→C→D）。1試合15枚。
function buildPracticeCardIds() {
  return buildLevelCardIds(gs.round - 1, 15, true);
}

// グループ戦用の20枚（A4・B5・C6・D5）をレベルの低い順に並べる（敗者復活戦では使わなくなった）。
const LONG_MATCH_MIX = [4, 5, 6, 5];
function buildDifficultyOrderedCardIds() {
  return LEVELS.flatMap((lv, i) => shuffle(LEVEL_IDS[lv]).slice(0, LONG_MATCH_MIX[i]));
}


// ダミー読みの発生確率を試合進行に応じて動的に計算する
// 序盤は低く、中盤・終盤に向けて上昇。試合回が上がるほど全体の水準も上がる。
function getDecoyChance() {
  if (gs.difficulty === 'easy') return 0;
  const total   = gs.cardOrder.length || 10;
  const played  = total - gs.remaining.size;
  const progress = played / total;               // 0.0（序盤）→ 1.0（終盤）
  const rates = {
    1: { base: 0.03, peak: 0.20 },
    2: { base: 0.08, peak: 0.35 },
    3: { base: 0.15, peak: 0.50 },
    4: { base: 0.20, peak: 0.55 },
  };
  const { base, peak } = rates[gs.round] || rates[1];
  const chance = base + (peak - base) * progress;
  return gs.difficulty === 'hard' ? Math.min(chance * 1.35, 0.65) : chance;
}

// ── CPU（コンピュータープレイヤー）────────────────────────
// 90人を3ティアに分割：上位30（強）/ 中位30（中）/ 下位30（弱）。
// 練習モードの模擬トーナメント（1回戦80人規模）で人数が不足しないよう、
// 1ティアあたり25→30人に拡張している（addCpuPlayersForPractice参照）。
const CPU_PER_TIER = 30;
const CPU_NAMES = [
  ...Array.from({length: CPU_PER_TIER}, (_, i) => `強CPU${String(i+1).padStart(2,'0')}`),
  ...Array.from({length: CPU_PER_TIER}, (_, i) => `中CPU${String(i+1).padStart(2,'0')}`),
  ...Array.from({length: CPU_PER_TIER}, (_, i) => `弱CPU${String(i+1).padStart(2,'0')}`),
];
// 黄金角（137.5°）でHSLを分散させ色を生成
const CPU_COLORS = Array.from({length: CPU_PER_TIER * 3}, (_, i) => {
  const h = Math.round((i * 137.508) % 360);
  const s = 65 + (i % 4) * 5;
  const l = 45 + (i % 3) * 6;
  return `hsl(${h},${s}%,${l}%)`;
});
const CPU_IDS = Array.from({length: CPU_PER_TIER * 3}, (_, i) => `cpu-${i + 1}`);

// ティア別インデックス
const CPU_TIER_TOP    = CPU_IDS.slice(0, CPU_PER_TIER);
const CPU_TIER_MIDDLE = CPU_IDS.slice(CPU_PER_TIER, CPU_PER_TIER * 2);
const CPU_TIER_BOTTOM = CPU_IDS.slice(CPU_PER_TIER * 2, CPU_PER_TIER * 3);

// ティア別反応設定（ロビーの cpuDifficulty で倍率調整）
const CPU_TIER_SETTINGS = {
  top:    { minMs:  500, maxMs: 2800, missRate: 0.06 },
  middle: { minMs: 3000, maxMs: 7000, missRate: 0.25 },
  bottom: { minMs: 6500, maxMs: 9500, missRate: 0.50 },
};

const COLORS = ['#4a9eff','#00e5a0','#ff9944','#ff55cc','#cc88ff','#ffee44','#ff7777','#44ddff'];
let colorIdx = 0;

// Date.now() は Windows では ~15ms 単位でしか更新されないため、
// 起動時に一度だけ Date.now() を基準点として固定し、以降は高分解能の
// monotonic クロック（process.hrtime）からの経過時間を加算する。
const anchorDate = Date.now();
const anchorHr   = process.hrtime.bigint();
function hiResNow() {
  return anchorDate + Number(process.hrtime.bigint() - anchorHr) / 1e6;
}

// ── ログ ───────────────────────────────────────────────────
// 記録できるものはすべて logs/game-<起動日時>.jsonl に1行1イベントで書き出す
// （読み上げの開始・終了、誰がいつ・どこをクリックしたか、判定の内訳、得点、CPUの反応など）。
const LOG_DIR = path.join(__dirname, 'logs');
let logStream = null;
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  logStream = fs.createWriteStream(path.join(LOG_DIR, `game-${stamp}-p${PORT}.jsonl`), { flags: 'a' });
} catch (e) { console.warn('ログファイルを作成できません:', e.message); }
function logEvent(type, data = {}) {
  if (!logStream) return;
  logStream.write(JSON.stringify({ at: new Date().toISOString(), t: Math.round(hiResNow()), type, ...data }) + '\n');
}

const VD = require('./public/voice-defs.js');
const { VoiceEngine } = require('./voice-engine.js');
const { LoadTestRunner } = require('./loadtest.js');
const LAYOUT = require('./public/layout.js');
const CEREMONY = require('./ceremony-config.js');   // 表彰式の集合時刻・場所（ceremony-config.js を編集）

// ── 負荷テスト ────────────────────────────────────────────
// サーバー自身がボット（仮想参加者）を生成して負荷をかける（loadtest.js）。
// 専用のログファイル(logs/loadtest-<開始時刻>.jsonl)に、ボットの状況とサーバー自身の
// CPU・メモリ・応答速度を記録する。教卓PC（管理画面）がこのログを回収して分析する。
let loadtestLogStream = null;
function loadtestLog(type, data = {}) {
  if (!loadtestLogStream) return;
  loadtestLogStream.write(JSON.stringify({ at: new Date().toISOString(), t: Math.round(hiResNow()), type, ...data }) + '\n');
}
let loadtestMetricsTimer = null;
function startLoadTestMetrics() {
  let prevCpu  = process.cpuUsage();
  let prevTime = Date.now();
  loadtestMetricsTimer = setInterval(() => {
    const now  = Date.now();
    const diff = process.cpuUsage(prevCpu);
    const elapsedMs = now - prevTime;
    prevCpu  = process.cpuUsage();
    prevTime = now;
    const cpuPercent = elapsedMs > 0 ? Math.round((diff.user + diff.system) / 1000 / elapsedMs * 1000) / 10 : null;
    const mem = process.memoryUsage();
    const lagStart = Date.now();
    setImmediate(() => {
      const snapshot = {
        cpuPercent,
        rssMb:        Math.round(mem.rss / 1024 / 1024 * 10) / 10,
        heapUsedMb:   Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
        clientsCount: io.engine.clientsCount,
        eventLoopLagMs: Date.now() - lagStart,
        ...loadTestRunner.status(),
        lobbyBusy: gs.phase !== 'lobby',
      };
      loadtestLog('loadtest_metrics', snapshot);
      io.emit('load_test_status', snapshot);
    });
  }, 1000);
}
function stopLoadTestMetrics() {
  if (loadtestMetricsTimer) { clearInterval(loadtestMetricsTimer); loadtestMetricsTimer = null; }
}
const loadTestRunner = new LoadTestRunner({
  port: PORT,
  log: loadtestLog,
  onStop: () => {
    stopLoadTestMetrics();
    io.emit('load_test_status', { ...loadTestRunner.status(), lobbyBusy: gs.phase !== 'lobby' });
    if (loadtestLogStream) { loadtestLogStream.end(); loadtestLogStream = null; }
  },
});

// ── 実機ボットテスト（?bot=N/?bot=host）の通信・スペック診断 ──────────────
// 各ボット端末が数秒おきに自己申告してくる往復時間・接続方式・端末スペック・
// 音声取得時間を集約し、①専用ログ(logs/bottest-<開始時刻>.jsonl)に記録、
// ②全ボット端末へブロードキャスト（応答が悪い順）して、40台のどの画面からでも
// 今どのPCが詰まっているかをその場で確認できるようにする。
let botMetricsLogStream = null;
function botMetricsLog(type, data = {}) {
  if (!botMetricsLogStream) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      botMetricsLogStream = fs.createWriteStream(path.join(LOG_DIR, `bottest-${stamp}-p${PORT}.jsonl`), { flags: 'a' });
    } catch (e) { console.warn('ボットテストのログファイルを作成できません:', e.message); return; }
  }
  botMetricsLogStream.write(JSON.stringify({ at: new Date().toISOString(), t: Math.round(hiResNow()), type, ...data }) + '\n');
}
// 実機ボットのクリック方式。random=従来のランダム、sync=発声開始からdelayMs+0〜spreadMsで全員が同時にクリック
let botClick = { mode: 'random', delayMs: 1500, spreadMs: 50 };
const botMetrics = new Map();   // socket.id -> 最新の自己申告データ
let botMetricsDirty = false;
setInterval(() => {
  if (!botMetricsDirty || !botMetrics.size) return;
  botMetricsDirty = false;
  const list = [...botMetrics.values()].sort((a, b) => (b.rttMs ?? -1) - (a.rttMs ?? -1));   // 応答が悪い（遅い）順
  io.emit('bot_metrics_broadcast', list);
}, 3000);
// VOICEVOX エンジン（CT107）。環境変数 VOICEVOX_URL で変更できる。音声の保存先は VOICE_CACHE_DIR（既定 ./voice-cache）。
const VOICE_CACHE_DIR = process.env.VOICE_CACHE_DIR || path.join(__dirname, 'voice-cache');
const voiceEngine = new VoiceEngine({
  baseUrl: process.env.VOICEVOX_URL || 'http://192.168.0.19:50021',
  dir: VOICE_CACHE_DIR,
  log: logEvent,
});
const VOICE_WAIT_MAX_MS = +process.env.KARUTA_VOICE_WAIT_MS || 60 * 1000;   // 盤面整理が終わっても音声が揃わないとき、最大これだけ待ってから始める

const MEMO_SECONDS    = +process.env.KARUTA_MEMO_SECONDS || 60;   // 環境変数はテスト用   // 盤面整理タイム（暗記ではなく、取りやすい配置に並べ替える時間）
// 敗者復活戦（大会モードの敗者復活戦・旧敗者復活モード）の盤面整理は30秒。それ以外は MEMO_SECONDS。
const REVIVAL_MEMO_SECONDS = 30;
function memoSeconds() {
  return ((gs.event && gs.event.active && gs.event.stage === 'revival') || gs.isRevival) ? REVIVAL_MEMO_SECONDS : MEMO_SECONDS;
}
// 「読み上げ開始（上の句 / ダミーの読み始め）→そこまで」の合計時間を、文章の長さに関わらず
// 全ての札で統一する（進行予定が計算しやすくなるため）。読み上げ自体が長い札ほど、その分
// 読み終わった後の受付時間が短くなる（最長の札でも受付時間が0未満にならないよう
// MIN_POST_READ_WAIT_MS で下限を設ける）。
const TOTAL_READ_CYCLE_MS   = +process.env.KARUTA_TOTAL_READ_MS || 15 * 1000;
const MIN_POST_READ_WAIT_MS = 500;
// テスト用：指定すると「合計◯秒に統一」ではなく、読み上げ終了後に常にこの固定時間だけ待つ
// （文章の長さを気にせず進行を速くできる、これまでの挙動）。
const FIXED_POST_READ_WAIT_MS = process.env.KARUTA_READ_TIMEOUT_MS ? +process.env.KARUTA_READ_TIMEOUT_MS : null;
function postReadWaitMs(elapsedSinceReadStartMs) {
  if (FIXED_POST_READ_WAIT_MS !== null) return FIXED_POST_READ_WAIT_MS;
  return Math.max(MIN_POST_READ_WAIT_MS, TOTAL_READ_CYCLE_MS - elapsedSinceReadStartMs);
}
// 結果発表（そこまで→DJ→答え合わせ、または そこまで→答え合わせ）の音声がホスト端末で
// 終わったという報告(announce_finished)を待ってから次の札へ進む。報告が来ない場合の保険。
const ANNOUNCE_FALLBACK_MS = +process.env.KARUTA_ANNOUNCE_FALLBACK_MS || 20 * 1000;
// 読み上げの前に「マウスを定位置に戻します。フライングに注意してください。」を発声するので、
// 「読み上げます」が始まるまでの目安。実際の開始はホスト端末の報告(intro_started)で上書きする。
const INTRO_START_EST_MS = 4700;
const INTRO_GRACE_MS = 400;   // 端末ごとの「読み上げます」開始のずれ（通信・音声合成の立ち上がり）の許容
const GRAB_WINDOW_MS  = 500;   // 最初の正解申告からこの時間だけ他の候補も受け付け、点数の高い人が取る

// ── ポイント制 ─────────────────────────────────────────────
// 1枚あたり最大1000点 = 速度(400) + 精度(400) + マウスコントロール力(200)。
// これとは別に、精度が350点以上のときは精度ボーナス1000点が加わる（札1枚の上限の外）。
// 各項目は「少し変わると点が大きく動く」ように指数・べき乗カーブにしている。
//  速度  : 「読み上げます」の発声開始からの経過時間。1秒で約270点 / 3秒で約120点 / 6秒で約35点
//  精度  : 札の中心からクリック位置までの距離(mm)。0mmで400点 / 約3.8mmで300点 / 約10mmで約180点 / 札の角(約42mm)で0点
//  距離  : 定位置(円)から札の中心までの距離(mm)。遠い札を取るほど高得点(最大200点)
// 0.5秒の受付時間内に複数人がクリックしたときは、精度の点数が一番高い人が取る（同点なら速い人）。
// 速度・距離は誰が取るかには使わず、取った人の得点にだけ加算される。
// 長さはすべて mm。画面上の札(横180px)を実物の取り札(横 CARD_REAL_W_MM mm)に見立てた縮尺で px から換算する。
const SPEED_MAX_PTS = 400;
const SPEED_TAU_MS  = 2500;
const ACC_MAX_PTS   = 400;
const CTRL_MAX_PTS  = 200;
const ACC_BONUS_THRESHOLD = 350;   // 精度の点数がこれ以上なら精度ボーナス（DJの「いい精度」も同じ条件）
const ACC_BONUS_PTS = 1000;        // 精度ボーナス。札1枚の上限・1試合の上限(SCORE_CAP)とは別枠で加算する（ハンデはかかる）
const DJ_MOUSE_DIST_PTS = 100;     // 距離の点数がこれ以上＋精度ボーナス → DJ「ナイスマウスさばき」
const MISS_PENALTY  = 100;     // お手付き・フライング1回の減点（ハンデで増える）
const NEAR_POINTS   = 300;     // 「あと少しで1位」「惜しい」の判定に使う点差（約1枚分）
const DJ_COMBO_GAP_MS = 800;    // 1つのDJコメントの中で複数の実況をつなぐときの間（public/game.js の VOICE_PAUSE_MS と同じ）
const SCORE_CAP     = +process.env.KARUTA_SCORE_CAP || 20000;   // 1試合で積める点数の上限（環境変数はテスト用）

// 盤面(論理サイズ)と定位置。クライアント(game.js)の BOARD_W/BOARD_H と一致させること。
const BOARD_W = 1280;
const BOARD_H = 880;
const HOME_X  = BOARD_W / 2;
const HOME_Y  = BOARD_H - 46;
const GAME_CONFIG = require('./public/game-config.js');
const CARD_W_PX = 180, CARD_H_PX = 100;
const MM_PER_PX = GAME_CONFIG.CARD_REAL_W_MM / CARD_W_PX;   // キャリブレーション：画面の札が実物の何mmにあたるか
const PX_PER_MM = 1 / MM_PER_PX;
const BOARD_FAR = Math.hypot(Math.max(HOME_X, BOARD_W - HOME_X), HOME_Y);   // 定位置から一番遠い角までの距離(px)
const FAR_MM    = BOARD_FAR / PX_PER_MM;                                     // 同(mm)
const ACC_FULL_MM = Math.hypot(CARD_W_PX / 2, CARD_H_PX / 2) * MM_PER_PX;                // 札(180×100px)の中心から角までの距離(mm)。これ以上ズレると精度0点

function speedPoints(ms)  { return Math.round(SPEED_MAX_PTS * Math.exp(-Math.max(0, ms) / SPEED_TAU_MS)); }
function accuracyPoints(offsetMm) { return Math.round(ACC_MAX_PTS * Math.pow(1 - Math.min(1, Math.max(0, offsetMm / ACC_FULL_MM)), 3)); }
function controlPoints(distMm) {
  const f = Math.min(1, Math.max(0, distMm / FAR_MM));
  return Math.round(CTRL_MAX_PTS * f * f);
}

// ── 学年・コース別ハンデ（学年・コースを入力した人にだけ。大会モードでも練習モードでも同じ）──────────────────────
// gain=獲得点にかける倍率 / penalty=お手付き減点にかける倍率。複数条件は掛け算で合成する。
// 1年は全員ハンデなし。2・3年のうち「プログラミング系コース」にも倍率がかかる。
// 画像・アプリ系のコースはハンデなし。
const PROGRAMMING_COURSES = ['ITスペシャリストコース', 'ITエンジニアコース'];
const HANDICAP_GRADE = { '2': { gain: 0.7, penalty: 1.5 }, '3': { gain: 0.5, penalty: 2 } };
const HANDICAP_PROGRAMMING = { gain: 0.7, penalty: 1.5 };
function handicapOf(p) {
  const h = { gain: 1, penalty: 1 };
  if (!p || p.isBot) return h;   // 学年・コースを入力していない人（練習用リンク）はハンデなし
  const g = HANDICAP_GRADE[String(p.grade)];
  if (g) { h.gain *= g.gain; h.penalty *= g.penalty; }
  if (g && PROGRAMMING_COURSES.includes(p.course)) { h.gain *= HANDICAP_PROGRAMMING.gain; h.penalty *= HANDICAP_PROGRAMMING.penalty; }
  h.gain = Math.round(h.gain * 1000) / 1000;
  h.penalty = Math.round(h.penalty * 1000) / 1000;
  return h;
}

// ── Game state ────────────────────────────────────────────
const gs = {
  phase:          'lobby',
  difficulty:     'normal',
  cpuDifficulty:  'normal',
  currentCard:    null,
  cardOrder:      [],
  remaining:      new Set(LEVEL_IDS.A),
  players:        {},
  memorizeEndsAt: 0,
  hostId:         null,
  cpuTimers:      [],
  currentDecoy:   null,   // ダミー読み中の札情報（time_up で正解発表に使用）
  grabCandidates: [],     // 受付時間中に届いた正解候補（速さ＋精度判定用）
  readStartAt:    0,      // 現在の読み上げの開始予定時刻（サーバー時計）。速度ポイントの基準
  yomiFinishedAt: 0,
  yomiFinishedForCurrent: false,   // 今の札の上の句が最後まで読み終わったか（読み上げ中に勝者が決まっても、これが true になるまで確定を待つ）
  pendingWinner:  null,    // 読み上げ中に決まった勝者（{ grabberId, card, scored, contenders }）。読み終わるまで未確定のまま保持する
  pendingMisses:  [],      // 本人への「✕お手付き」表示をまだ届けていない誤クリック（{ activeCardId, clickedCardId, socketId, penalty }）
  pendingDecoyMisses: [],  // ダミー読み中の誤クリック。今読んでいるダミーの「そこまで」まで表示を遅らせる（{ socketId, penalty }）
  matchLevel:     0,      // 今の試合のレベル（0=A〜3=D）
  finalDecoyLeft: null,   // 最後の1枚の前に連発するダミー読みの残り回数（null=未設定）
  openGrabWindowCardIds: new Set(),   // 現在受付窓(0.5秒)が開いている札のID。札ごとに別々に管理する
  lockedPlayers:  new Set(),   // お手付きをして「次の札が読まれるまで」取れないプレイヤー

  // ── 管理画面で調整する設定（進行中も変更可。イベントをまたいで保持する）───
  eventConfig: {
    mainCutRatio:     0.5,     // 本戦：毎回の通過比率（高いほど勝ち上がりやすく、試合数は減る）
    mainMaxRounds:    7,       // 本戦：第何試合で最終試合として終了するか（そのときの残り人数で最終試合を行う）
    revivalMaxRounds: 5,       // 敗者復活戦：第何試合で終了するか
    revivalCutRatio:  0.5,     // 敗者復活戦：中間ラウンドの通過比率
    testCpuFill:      false,   // テスト用：大会モード開始時、実参加者が少なくてもCPUで人数を補充する
                                // （既定でオフ。本番当日はオフのまま＝実参加者のみで開始する）
  },
  schedule:    [],   // 当日の進行予定（{ id, label, plannedAt }）。管理画面で記録・表示するだけ
  scheduleLog: {},   // 実際に開始した時刻（{ [id]: startedAt }）
  projectorIds: new Set(),   // 投影専用画面として接続しているソケットID（参加者数には含めない）

  // ── トーナメント管理 ────────────────────────────────────
  round:               1,
  maxRounds:           4,
  survivorCount:       3,
  eliminatedPlayers:   new Set(),
  lastRoundResult:     null,
  isRevival:           false,
  revivalCount:        1,
  revivalRound:        1,          // 敗者復活戦の現在ラウンド（1〜3）
  revivalMaxRounds:    3,
  revivalSurvivorCount: 3,         // 復活戦中間ラウンドの通過人数
  revivalEliminated:   new Set(),  // 復活戦で脱落したプレイヤー
  cumulativeScores:    {},          // 各ラウンドのスコアを累計
  // ── グループ戦管理 ──────────────────────────────────────
  isGroupMatch:        false,
  groupTier:           null,
  humanGroups:         null,        // 最終戦後に確定するグループ分け
  groupParticipantIds: new Set(),
  groupRound:          1,           // グループ戦内ラウンド（1〜3）
  groupMaxRounds:      3,
  groupSurvivorCount:  3,           // グループ戦中間ラウンドの通過人数
  groupEliminated:     new Set(),   // グループ戦内で脱落したプレイヤー
  groupMatchScores:    {},          // 各グループ戦の実効スコア（再振り分け用）
  postTournament:      false,       // 最終試合終了済み（敗者復活戦解放フラグ）
  bottomGroupWinners:  null,        // null=未完了 / []=完了（旧システムとの互換）
  middleGroupWinners:  null,

  // ── ハウス編成（大会モード）──────────────────────────────
  houses: null,   // { A: [id,...], B: [...], C: [...], D: [...] } または null（未編成）

  // ── 大会モード（1/8本番用・一発勝負のブラケット進行）────────
  event: {
    active:            false,
    stage:             null,   // 'main' | 'revival' | 'done'
    mainRoundIndex:    0,      // 本戦（main）を行った回数。難易度配分（EVENT_ROUND_MIX）・表示用の試合番号に使う
    revivalRoundIndex: 0,      // 敗者復活戦を行った回数。表示用の試合番号・終了判定に使う
    isFinalMainRound:  false,  // 今進行中（または直近）の本戦が、設定された最終試合かどうか
    passCount:         null,   // 今の試合で何人が通過するか（画面のボーダー表示用。最終試合はnull）
    mainPool:          new Set(),   // 本戦の系譜にまだ残っている人
    revivalCandidates: new Set(), // 敗者復活戦にまだ挑戦していない／再挑戦権が残っている人（累積）
    gamesPlayed:       {},          // id → 消化した試合数
    participantIds:    new Set(),   // 現在進行中の試合の参加者
    finalRanking:      [],        // 最終試合の結果（スコア降順のid配列。上位3名ハイライト表示に使う）
    lastResult:        null,        // 直近ステージの結果（ホストUI表示用）
  },
};
let memorizeTimer     = null;
let decoyTimer        = null;
let decoyTimeoutTimer = null;
let readTimeoutTimer  = null;
let announceAdvanceTimer   = null;   // ホストの announce_finished を待つ保険タイマー
let pendingAnnounceAdvance = null;   // announce_finished（または保険タイマー）で実行する処理

// このサーバーの動かし方：launcher.js（起動.bat）／systemd（Linuxのサービス）／単独（node server.js）
function serverRunMode() {
  if (process.env.KARUTA_SUPERVISED === '1') return 'launcher';
  if (process.env.INVOCATION_ID) return 'systemd';
  return 'standalone';
}

// ── 緊急停止（管理画面から）──────────────────────────────
// 押された時点で「停止要求」を立て、いま鳴っている読み上げ・DJなどの一連の音声が終わって
// 次の札を読み上げようとする（read_next）段階でゲームを一時中断する。
// 再開ボタンを押すと、まず「まもなく再開します」を表示し、30秒後に次の札から再開する。
const PAUSE_RESUME_DELAY_MS = 30 * 1000;
const pauseState = { requested: false, active: false, resumeAt: 0, timer: null };
function pauseSnapshot() {
  return { requested: pauseState.requested, active: pauseState.active, resumeAt: pauseState.resumeAt };
}
function broadcastPause() { io.emit('pause_state', pauseSnapshot()); }
function activatePause() {
  if (pauseState.active) return;
  pauseState.requested = false;
  pauseState.active = true;
  pauseState.resumeAt = 0;
  logEvent('pause_active', { phase: gs.phase });
  broadcastPause();
}
function resetPause() {
  if (pauseState.timer) { clearTimeout(pauseState.timer); pauseState.timer = null; }
  pauseState.requested = false; pauseState.active = false; pauseState.resumeAt = 0;
}

// 結果発表の音声（そこまで→DJ→答え合わせ等）がホスト端末で終わるのを待ってから fn を実行する。
// ホストから announce_finished が届くか、ANNOUNCE_FALLBACK_MS 経っても届かなければ保険で実行する。
function armAnnounceAdvance(fn) {
  if (announceAdvanceTimer) clearTimeout(announceAdvanceTimer);
  pendingAnnounceAdvance = fn;
  announceAdvanceTimer = setTimeout(() => {
    announceAdvanceTimer = null;
    const f = pendingAnnounceAdvance;
    pendingAnnounceAdvance = null;
    if (f) { logEvent('announce_advance_fallback', {}); f(); }
  }, ANNOUNCE_FALLBACK_MS);
}

// ── Helpers ───────────────────────────────────────────────
function localIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .map(n => n.address);
}

// ホストになれるのは、参加用アドレスの末尾に ?host を付けて接続してきたブラウザだけ
// （以前はサーバーPC自身からの接続（IPアドレス）で自動判定していたが、それだと
// サーバーPC自身で参加者としてのテストができなかったため、明示的な印に変更した）。
// 管理画面・投影画面もリンクをたどる際に ?host を引き継ぐ（game.js参照）。
// 教卓PC（ホスト）の判定は ?host=<値> の一致のみ。環境変数 KARUTA_HOST_KEY を設定すると、その値でないと
// ホスト扱いにならない（未設定のときは従来どおり ?host=1）。公開サーバーでは必ず設定すること
// （?host=1 は推測しやすく、知られると誰でもサーバー停止・大会操作・ログ取得ができてしまうため）。
const HOST_KEY = process.env.KARUTA_HOST_KEY || '1';
if (HOST_KEY === '1') console.warn('[security] KARUTA_HOST_KEY が未設定です。?host=1 で誰でも教卓PC（管理操作）になれます。公開時は KARUTA_HOST_KEY を設定してください。');
function hostKeyMatches(v) { return typeof v === 'string' && v.length > 0 && v === HOST_KEY; }
function isHostEligible(socket) {
  return !!(socket.handshake.query && hostKeyMatches(socket.handshake.query.host));
}
// 管理画面のダウンロードAPIなど、Socket.IOを介さない通常のHTTPリクエスト向けの同じ判定。
function isHostRequest(req) {
  return !!(req.query && hostKeyMatches(req.query.host));
}

// 名前の先頭に付ける「学年＋コース略称」。選んだ学年・コースを他の人にも見えるようにして、偽った入力を防ぐ。
// 例：2年ITスペシャリストコース → 「2SC」。表示は「2SC　太郎」（全角スペース）。
const COURSE_ABBR = {
  'アプリコース': 'AP', 'プログラムコース': 'PG',
  'ITスペシャリストコース': 'SC', '画像クリエイトコース': 'GC', 'ITエンジニアコース': 'EC',
  'ビジュアルデザインコース': 'VC', 'ビジネスITコース': 'BC',
};
const GRADE_COURSES = {
  '1': ['アプリコース', 'プログラムコース'],
  '2': ['ITスペシャリストコース', '画像クリエイトコース', 'ITエンジニアコース', 'ビジュアルデザインコース', 'ビジネスITコース'],
  '3': ['ITスペシャリストコース', '画像クリエイトコース'],
};
function gradeCourseTag(grade, course) {
  const g = String(grade || '');
  if (!GRADE_COURSES[g]) return '';
  const abbr = GRADE_COURSES[g].includes(course) ? COURSE_ABBR[course] : '';
  return g + (abbr || '');
}
// DJ の読み上げには学年・コースを付けない素の名前を使う
const djName = p => (p && (p.rawName || p.name)) || '';

// 参加登録（名前入力）済みの人間プレイヤーか
function isJoinedHuman(socketId) {
  const p = gs.players[socketId];
  return !!p && !p.isBot && !!p.joined;
}

// サーバーPC自身のブラウザで参加登録済みのソケットID（いなければ null）
// デバッグ操作（即終了・CPUポイント・盤面整理のスキップ）を使えるか。
// 練習モードは参加登録済みなら誰でも。大会モード中は、参加者が対局を止めてしまわないよう
// サーバーPCだけに限る。
function canUseDebug(socket) {
  if (gs.event.active) return isHostEligible(socket);
  return isJoinedHuman(socket.id) || isHostEligible(socket);
}

function findServerPcId() {
  for (const [id, sock] of io.sockets.sockets) {
    if (isJoinedHuman(id) && isHostEligible(sock)) return id;
  }
  return null;
}

// ホスト（＝読み上げの進行役）を切り替えて全員に知らせる。
// 練習ゲームは開始した人、大会モードはサーバーPCが進行役になる。
function setHost(id) {
  if (gs.hostId === id) return;
  gs.hostId = id;
  io.emit('host_changed', { hostId: id });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── ハウス編成（学年×コースを横断して4ハウスへ均等配分）─────
const HOUSE_IDS = ['A', 'B', 'C', 'D'];

// count 人分のハウス割り当て順を、offset だけ開始ハウスをずらした
// スネーク（往復）順で生成する。例：offset=0 → A,B,C,D,D,C,B,A,A,B,...
// グループ（学年×コース）ごとに offset を1つずつ回すことで、
// 端数の余りが特定ハウスに偏らないようにする。
function buildHouseSnakeOrder(count, offset) {
  const base = HOUSE_IDS.map((_, i) => HOUSE_IDS[(i + offset) % HOUSE_IDS.length]);
  const order = [];
  let forward = true;
  while (order.length < count) {
    order.push(...(forward ? base : [...base].reverse()));
    forward = !forward;
  }
  return order.slice(0, count);
}

// 出席中（joined済み）の人間プレイヤーを学年×コースでグルーピングし、
// グループ内をシャッフルした上でスネークドラフトにより4ハウスへ配分する。
// 当日の出欠に応じて何度でも再実行可能（そのたびに再シャッフルされる）。
function assignHouses() {
  const humanEntries = Object.entries(gs.players)
    .filter(([id, p]) => id !== gs.hostId && !p.isBot && p.joined);

  const groups = new Map();   // key: "学年-コース" → [ [id, player], ... ]
  humanEntries.forEach(entry => {
    const p   = entry[1];
    const key = `${p.grade || '?'}-${p.course || '?'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  const houses = { A: [], B: [], C: [], D: [] };
  let groupIdx = 0;
  for (const members of groups.values()) {
    const shuffled = shuffle(members);
    const order = buildHouseSnakeOrder(shuffled.length, groupIdx % HOUSE_IDS.length);
    shuffled.forEach(([id, p], i) => {
      const houseId = order[i];
      p.house = houseId;
      houses[houseId].push(id);
    });
    groupIdx++;
  }
  return houses;
}

// gs.cardOrder（易→普通→難の順に並んでいる）に沿って、まだ残っている
// 最初の札を返す。ランダムに選ぶと終盤ほど難しくなる並びが崩れてしまうため、
// 必ずこの順で読み上げる。
function pickNext() {
  const nextId = gs.cardOrder.find(id => gs.remaining.has(id));
  if (nextId === undefined) return null;
  return KARUTA.find(k => k.id === nextId) || null;
}

// ── CPU helpers ───────────────────────────────────────────
function clearCpuTimers() {
  gs.cpuTimers.forEach(t => clearTimeout(t));
  gs.cpuTimers = [];
}

// CPU の強さ（弱い/ふつう/強い）設定に応じて、参加させる CPU の層そのものを
// 絞り込む（弱い→弱CPUのみ25体、ふつう→中CPUのみ25体、強い→強CPUのみ25体）。
function addCpuPlayers() {
  const tierIds = gs.cpuDifficulty === 'easy' ? CPU_TIER_BOTTOM
                : gs.cpuDifficulty === 'hard' ? CPU_TIER_TOP
                : CPU_TIER_MIDDLE;
  tierIds.forEach(id => {
    if (!gs.eliminatedPlayers.has(id)) {
      const i = CPU_IDS.indexOf(id);
      gs.players[id] = { name: CPU_NAMES[i], color: CPU_COLORS[i], score: 0, bonus: 0, cards: 0, misses: 0, isBot: true };
    }
  });
}

// 練習モードの模擬トーナメント（本番のイメージをつかむための1試合目）で、
// 人間の人数に応じて合計 targetTotal 人になるまで CPU を追加する。
// ロビーで選んだ難易度（cpuDifficulty）のティアを優先的に使い、
// 人数が足りない場合は他のティアからも補充する（最大 CPU_PER_TIER*3 人）。
function addCpuPlayersForPractice(targetTotal) {
  const preferredTier = gs.cpuDifficulty === 'easy' ? CPU_TIER_BOTTOM
                       : gs.cpuDifficulty === 'hard' ? CPU_TIER_TOP
                       : CPU_TIER_MIDDLE;
  const otherTiers = [CPU_TIER_TOP, CPU_TIER_MIDDLE, CPU_TIER_BOTTOM].filter(t => t !== preferredTier);
  const orderedIds = [...preferredTier, ...otherTiers.flat()];
  const humanCount = Object.values(gs.players).filter(p => !p.isBot && p.joined).length;
  const need = Math.max(0, targetTotal - humanCount);
  orderedIds.slice(0, need).forEach(id => {
    const i = CPU_IDS.indexOf(id);
    gs.players[id] = { name: CPU_NAMES[i], color: CPU_COLORS[i], score: 0, bonus: 0, cards: 0, misses: 0, isBot: true };
  });
}

function addGroupCpuPlayers() {
  const tierIds = gs.groupTier === 'top'    ? CPU_TIER_TOP
                : gs.groupTier === 'middle' ? CPU_TIER_MIDDLE
                : CPU_TIER_BOTTOM;
  tierIds.forEach(id => {
    const idx = CPU_IDS.indexOf(id);
    gs.players[id] = { name: CPU_NAMES[idx], color: CPU_COLORS[idx], score: 0, bonus: 0, cards: 0, misses: 0, isBot: true };
  });
}

function removeCpuPlayers() {
  CPU_IDS.forEach(id => delete gs.players[id]);
}

// 試合開始時点（暗記フェーズ開始時）の人間/CPU の人数を集計する
// participantIds を渡した場合はそのIDに絞り込む（グループ戦・復活戦用）
function computeHeadcount({ excludeEliminated = false, participantIds = null } = {}) {
  let humanCount = 0, cpuCount = 0;
  Object.entries(gs.players).forEach(([id, p]) => {
    // 大会モードのホストは進行役のため集計から除く。練習モードのホストは
    // 通常プレイヤーとして参加できるため集計に含める。
    if (id === gs.hostId && gs.event.active) return;
    if (participantIds && !participantIds.has(id)) return;
    if (excludeEliminated && gs.eliminatedPlayers.has(id)) return;
    if (p.isBot) cpuCount++;
    else if (p.joined) humanCount++;
  });
  return { humanCount, cpuCount, totalCount: humanCount + cpuCount };
}

// DJ 実況：札取得のたびにランダムでコメントを選ぶ（毎回同じ文言だと単調なため）
const DJ_TAKE_TEMPLATES = [
  (name, score) => `${name}さんが札をとりました！`,
  (name, score) => `${name}さん、ナイスキャッチ！ 現在${spokenPoints(score)}です。`,
  (name, score) => `お見事、${name}さん！`,
  (name, score) => `${name}さんが1枚ゲットです！`,
];
// 読み上げ用の点数表記（"12,340" → "1万2340点"）。数字の羅列より聞き取りやすい。
function spokenPoints(n) {
  const v = Math.round(n);
  if (v < 0) return `マイナス${spokenPoints(-v)}`;
  if (v >= 10000) {
    const man = Math.floor(v / 10000), rest = v % 10000;
    return rest ? `${man}万${rest}点` : `${man}万点`;
  }
  return `${v}点`;
}
function pickDjTakeLine(name, score) {
  const f = DJ_TAKE_TEMPLATES[Math.floor(Math.random() * DJ_TAKE_TEMPLATES.length)];
  return f(name, score);
}

// 進行役（大会モードのホスト）を除いた参加者をスコア降順で並べる（表示用ランキングと同じ並び）。
// 練習モードのホストは通常プレイヤーとして参加するためランキングに含める。
function rankedNonHost() {
  return Object.entries(gs.players)
    .filter(([id]) => !(id === gs.hostId && gs.event.active))
    .sort(([, a], [, b]) => b.score - a.score);
}

// 1回の申告(candidate)を採点する。
//  cand: { id, t(クリック時刻・サーバー時計), offsetMm(札の中心からの距離mm), distMm(定位置から札の中心までmm) }
function scoreCandidate(cand) {
  const speedMs   = Math.max(0, cand.t - gs.readStartAt);
  const speedPts  = speedPoints(speedMs);
  const accPts    = accuracyPoints(cand.offsetMm);
  const ctrlPts   = controlPoints(cand.distMm);
  const p = gs.players[cand.id];
  return {
    id: cand.id, name: p ? p.name : '?', color: p ? p.color : '#888', isBot: !!(p && p.isBot),
    speedMs: Math.round(speedMs), speedPts,
    offsetMm: Math.round(cand.offsetMm * 10) / 10, accPts,
    distMm: Math.round(cand.distMm * 10) / 10, ctrlPts,
    key:  accPts,                       // 誰が取るかの決定に使う値（精度の点数。同点なら速い人）
    base: speedPts + accPts + ctrlPts,  // ハンデ適用前の獲得点
  };
}

// 正解取得の共通処理（人間・CPU 共用）。scored は scoreCandidate() の結果（勝者）、
// contenders は札をクリックした全員の採点結果（0.5秒の受付時間内の人＋読み上げ中に遅れて
// クリックした人もすべて含む。勝敗を決めるのは scored/受付時間内のみで、contenders は表示用）。
//
// 呼ばれるタイミングは2通り：①すでに読み上げが終わっている（10秒の猶予中）→ resolveGrabWindow から
// 直接、②読み上げの途中で決まった → finishReadPhase から、読み上げが最後まで終わったときに。
// どちらの場合も、ここに来た時点でかるたの読み上げ（警告・読み上げます・上の句）はもう終わっている
// ので、音声を安全に「そこまで」から始められる。
async function processCorrectGrab(grabberId, card, scored, contenders) {
  if (!gs.remaining.has(card.id)) return;
  if (readTimeoutTimer) { clearTimeout(readTimeoutTimer); readTimeoutTimer = null; }
  clearCpuTimers();

  const player = gs.players[grabberId];
  if (!player) return;

  const beforeSorted = rankedNonHost();
  const beforeGap = beforeSorted.length < 2 ? null : beforeSorted[0][1].score - beforeSorted[1][1].score;

  const hc = handicapOf(player);
  const wanted  = Math.round(scored.base * hc.gain);
  // 1試合の上限(2万点)は通常の得点にだけかかる。精度ボーナスは別枠でその上に加算する。
  const bonusPrev  = player.bonus || 0;
  const baseBefore = player.score - bonusPrev;
  const baseAfter  = Math.min(SCORE_CAP, baseBefore + wanted);
  const awarded    = baseAfter - baseBefore;
  const capped     = awarded < wanted;
  const bonusBase  = scored.accPts >= ACC_BONUS_THRESHOLD ? ACC_BONUS_PTS : 0;
  const bonus      = Math.round(bonusBase * hc.gain);   // 精度ボーナスにもハンデ（得点倍率）をかける。1試合の上限(2万点)の外であることは変わらない
  // 得点は「そこまで！」と発する今、このタイミングでまとめて加算する（読み上げ中に取得が決まっていても、ここまでは0点のまま）。
  player.bonus = bonusPrev + bonus;
  player.score = baseAfter + player.bonus;
  player.cards = (player.cards || 0) + 1;
  gs.remaining.delete(card.id);

  const takerName  = player.name;
  const takerColor = player.color;
  gs.currentCard   = pickNext();
  gs.phase         = 'announcing';

  const result = { ...scored, awarded, wanted, capped, bonus, bonusBase, handicap: hc.gain, total: player.score };
  // 表示用に精度の高い順へ並べ替える（勝敗の決定はすでに済んでいるので、ここでは見た目の順序だけ）
  const sortedContenders = [...contenders].sort((a, b) => (b.key - a.key) || (a.speedMs - b.speedMs));
  logEvent('card_taken', {
    cardId: card.id, tori: card.tori, level: card.lv, winner: grabberId, name: takerName, isBot: !!player.isBot,
    ...result, handicapPenalty: hc.penalty,
    contenders: sortedContenders.map(c => ({ id: c.id, name: c.name, isBot: c.isBot, speedMs: c.speedMs, speedPts: c.speedPts, offsetMm: c.offsetMm, accPts: c.accPts, distMm: c.distMm, ctrlPts: c.ctrlPts, key: c.key })),
    sinceReadStartMs: Math.round(hiResNow() - gs.readStartAt),
  });

  // 精度が高いときは専用のDJ。距離も遠い札を取ったときは、さらに特別なセリフ（ずんだもん）。
  // 「そこまで」→ DJ → 答え合わせ（上の句・下の句、青山龍星）の順で流すため、DJ の音声は
  // 配信前にここで生成まで済ませておく（キャッシュ済みならほぼ即座。間に合わなければ諦めて省略）。
  const dj = djName(player);
  let djText, djSegsRaw;
  if (bonusBase && scored.ctrlPts >= DJ_MOUSE_DIST_PTS) { djText = `素晴らしい！${dj}さん。ナイスマウスさばき`; djSegsRaw = VD.djMouseSegments(dj); }
  else if (bonusBase) { djText = `流石です！${dj}さん。いい精度。`; djSegsRaw = VD.djBonusSegments(dj); }
  else {
    const i = Math.floor(Math.random() * DJ_TAKE_TEMPLATES.length);
    djText = DJ_TAKE_TEMPLATES[i](dj, player.score);
    djSegsRaw = VD.DJ_TAKE[i](dj, player.score);
  }

  // 2位が1位に約1枚分(NEAR_POINTS)以内まで詰め寄った「その瞬間」の実況は、答え合わせより前
  // （この札のDJコメントと同じ「そこまで→DJ→答え合わせ」の流れの中）で読む。
  // beforeGap（今回の得点加算前の1位・2位差）と比べて、しきい値を新たに下回った時だけ発火する。
  const nearSorted = rankedNonHost();
  if (nearSorted.length >= 2) {
    const afterGap = nearSorted[0][1].score - nearSorted[1][1].score;
    if (afterGap <= NEAR_POINTS && (beforeGap === null || beforeGap > NEAR_POINTS)) {
      const nearName = djName(nearSorted[1][1]);
      const nearSegs = VD.djNearSegments(nearName);
      djText = `${djText} ${nearName}さん、あと少しで1位です！`;
      djSegsRaw = [...djSegsRaw.slice(0, -1), { ...djSegsRaw[djSegsRaw.length - 1], gapAfter: DJ_COMBO_GAP_MS }, ...nearSegs];
    }
  }

  const djResult = await Promise.race([
    voiceEngine.ensure(djSegsRaw, { prio: 'dj' }),
    new Promise(res => setTimeout(() => res({ failed: djSegsRaw.length }), 6000)),
  ]);
  const djSegs = djResult.failed ? null : djSegsRaw;

  io.emit('card_taken', {
    cardId:  card.id,
    by:      { id: grabberId, name: takerName, color: takerColor },
    players: gs.players,
    result,
    contenders: sortedContenders.map(c => ({ id: c.id, name: c.name, color: c.color, speedMs: c.speedMs, offsetMm: c.offsetMm, distMm: c.distMm, key: c.key, base: c.base, win: c.id === grabberId })),
    djText, djSegs,
    seq: announceSeq + 1,
  });
  // 「そこまで→DJ→答え合わせ」を全員が完全に同時に鳴らすため、全員の音声の先読みが終わる
  // （announce_ready）のを待ってから、共通の開始時刻 playAt を配る（間に合わない端末がいても最大 ANNOUNCE_READY_WAIT_MS で打ち切る）。
  const announceResult = await waitAnnounceReady(++announceSeq, ANNOUNCE_READY_WAIT_MS);
  logEvent('announce_go', { seq: announceSeq, result: announceResult });
  io.emit('announce_go', { seq: announceSeq, playAt: hiResNow() + 300 });

  const nextCard  = gs.currentCard;
  const remaining = [...gs.remaining];
  // そこまで→DJ→答え合わせの音声がホスト端末で終わるのを待ってから次の札へ進む
  armAnnounceAdvance(() => {
    if (nextCard) {
      gs.phase = 'waiting';
      io.emit('game_waiting', {
        remaining, players: gs.players, hostId: gs.hostId, difficulty: gs.difficulty,
        round: gs.round, totalCards: gs.cardOrder.length || 10,
        isRevival: gs.isRevival,
      });
    } else {
      endRound();
    }
  });
}

// 札を取ったあとの音声（そこまで→DJ→答え合わせ）を全員同時に始めるための待ち合わせ。
const ANNOUNCE_READY_WAIT_MS = 3000;
let announceSeq = 0;
let announceWait = null;
function waitAnnounceReady(seq, timeoutMs) {
  return new Promise(resolve => {
    const need = new Set(Object.keys(gs.players).filter(id => isJoinedHuman(id) && io.sockets.sockets.get(id)));
    if (!need.size) { resolve('none'); return; }
    const w = { seq, need };
    w.timer = setTimeout(() => { announceWait = null; resolve('timeout:' + need.size); }, timeoutMs);
    w.check = () => { if (!w.need.size) { clearTimeout(w.timer); announceWait = null; resolve('all'); } };
    announceWait = w;
  });
}

// お手付き（誤った札のクリック・ダミー読み中のクリック・CPUの空振り）の共通処理
function applyMiss(playerId, cardId, kind, extra = {}) {
  const player = gs.players[playerId];
  if (!player) return 0;
  const hc = handicapOf(player);
  const penalty = Math.round(MISS_PENALTY * hc.penalty);
  player.misses++;
  player.score -= penalty;
  logEvent('miss', { player: playerId, name: player.name, isBot: !!player.isBot, kind, cardId, penalty, total: player.score,
    sinceReadStartMs: Math.round(hiResNow() - gs.readStartAt), ...extra });
  return penalty;
}

// CPU の「クリックの上手さ」(札の中心からのズレ 0〜1)。ティアが強いほど中心を正確に狙える。
// 札の中心からのズレ(mm)の範囲。強いCPUほど中心を正確に狙え、ロビーの「CPUの強さ」でもさらに変わる。
const CPU_OFFSET_RANGE_MM = { top: [0.8, 6], middle: [2.5, 13], bottom: [6, 22] };

// yomi_finished 受信後に呼び出し、各 CPU の反応タイマーを仕掛ける
function scheduleCpuGrabs(card) {
  clearCpuTimers();
  const lobbyMod = gs.cpuDifficulty === 'hard' ? 0.55
                 : gs.cpuDifficulty === 'easy' ? 1.55 : 1.0;
  CPU_IDS.forEach((cpuId, cpuIdx) => {
    if (!gs.players[cpuId]) return;
    // 大会モードでは「今の試合の参加者」以外のCPU（本戦待機中・まだ敗者復活戦の対象外など）は
    // 札を取らせない。ここで絞らないと、無関係なCPUが札を取ってしまい、本来の参加者の得点に
    // 反映されない（＝参加者を絞ったランキング表示には出てこない）ように見えてしまう。
    if (!canParticipate(cpuId)) return;
    const tierKey = cpuIdx < CPU_PER_TIER ? 'top' : cpuIdx < CPU_PER_TIER * 2 ? 'middle' : 'bottom';
    const base = CPU_TIER_SETTINGS[tierKey];
    const minMs = base.minMs * lobbyMod;
    const maxMs = base.maxMs * lobbyMod;
    const missRate = gs.cpuDifficulty === 'hard'
      ? base.missRate * 0.4
      : gs.cpuDifficulty === 'easy'
      ? Math.min(base.missRate * 1.5, 0.8) : base.missRate;
    const delay = minMs + Math.random() * (maxMs - minMs);
    const accMod = gs.cpuDifficulty === 'hard' ? 0.6 : gs.cpuDifficulty === 'easy' ? 1.6 : 1.0;
    const [oMin, oMax] = CPU_OFFSET_RANGE_MM[tierKey];
    const offsetMm = (oMin + Math.random() * (oMax - oMin)) * accMod;
    const distMm   = FAR_MM * (0.2 + Math.random() * 0.7);   // 札の位置は端末ごとに違うので、定位置からの距離は仮想的に決める
    const willMiss = Math.random() < missRate;
    logEvent('cpu_plan', { cpu: cpuId, name: gs.players[cpuId].name, tier: tierKey, cardId: card.id, delayMs: Math.round(delay), willMiss, offsetMm: +offsetMm.toFixed(1), distMm: +distMm.toFixed(1) });
    const t = setTimeout(() => {
      if (gs.phase !== 'reading' || !gs.currentCard || gs.currentCard.id !== card.id) return;
      if (!gs.remaining.has(card.id)) return;
      if (willMiss) {
        applyMiss(cpuId, card.id, 'cpu_miss');
        io.emit('players_updated', gs.players);
      } else {
        addGrabCandidate({ id: cpuId, cardId: card.id, t: hiResNow(), offsetMm, distMm }, 'cpu');
      }
    }, delay);
    gs.cpuTimers.push(t);
  });
}

// 正解の申告を受け付け、最初の申告から GRAB_WINDOW_MS 後に勝者を決める。
// 受付窓は札ごとに別々に開く（読み上げ終了後もCPUが遅れて申告を続けるため、前の札の
// 受付窓が次の札が始まった後まで残っていることがある。共有の1つのタイマーで管理すると、
// 次の札の正当な申告が前の札の受付窓に紛れ込んで消えてしまうため、札のIDごとに管理する）。
function addGrabCandidate(cand, source) {
  cand.arrive = hiResNow();
  gs.grabCandidates.push(cand);
  logEvent('grab_click', { source, player: cand.id, name: gs.players[cand.id] && gs.players[cand.id].name, cardId: cand.cardId,
    clientT: Math.round(cand.t), offsetMm: +cand.offsetMm.toFixed(1), distMm: +cand.distMm.toFixed(1),
    sinceReadStartMs: Math.round(cand.t - gs.readStartAt), arriveDelayMs: Math.round(cand.arrive - cand.t) });
  const cardId = cand.cardId;
  if (!gs.openGrabWindowCardIds.has(cardId)) {
    gs.openGrabWindowCardIds.add(cardId);
    setTimeout(() => resolveGrabWindow(cardId), GRAB_WINDOW_MS);
  }
}

// 本物の札（gs.currentCard）を読み上げる。
// 上の句の読み上げ完了通知（yomi_finished）を待ってから制限時間と CPU を起動する。
function startRealRead() {
  gs.lockedPlayers.clear();   // 次の札が読まれ始めたので、お手付きのロックを解除
  gs.phase = 'reading';
  const card = gs.currentCard;
  const playAt = hiResNow() + 400;
  gs.readStartAt = playAt + INTRO_START_EST_MS;   // ホストの「読み上げます」開始報告(intro_started)で正確な値に置き換わる
  gs.yomiFinishedAt = 0;
  gs.yomiFinishedForCurrent = false;
  gs.pendingWinner = null;
  logEvent('read_start', { kind: 'real', cardId: card.id, tori: card.tori, level: card.lv, yomiChars: card.yomi.length,
    remaining: gs.remaining.size, playAt: Math.round(playAt) });
  io.emit('read_card', {
    card,
    remaining: [...gs.remaining],
    playAt,
  });
  if (readTimeoutTimer) clearTimeout(readTimeoutTimer);
  // yomi_finished が来ない場合の安全フォールバック（8s 後に計測開始）
  readTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'reading' || gs.currentCard !== card) return;
    finishReadPhase(card);
  }, 24000);   // 警告の発声(約4.5秒)＋「読み上げます」＋上の句(長いものは約17秒)の分も見込む
}

// 上の句の読み上げが最後まで終わったときに呼ばれる（ホストの yomi_finished 報告、またはその保険タイマー）。
// 誰かが早く正解していても、ここではまだ発表しない。「読み上げ開始→そこまで」が常に
// TOTAL_READ_CYCLE_MS になるよう、読み終わりまでの時間に応じた残り時間が経ってから
// revealResult() で初めて確定・発表する（取れた・取れなかったで発表のタイミングが
// 変わらないようにするため）。この猶予中は CPU の反応も引き続き起こる。
function finishReadPhase(card) {
  gs.yomiFinishedAt = hiResNow();
  gs.yomiFinishedForCurrent = true;
  logEvent('read_end', { kind: 'real', cardId: card.id, readDurationMs: Math.round(gs.yomiFinishedAt - gs.readStartAt) });
  armReadTimeout(card);
}

// 上の句の読み上げ完了後に呼ばれる。CPU タイマーを起動し、「読み上げ開始→そこまで」が
// TOTAL_READ_CYCLE_MS になるよう残り時間を計算して revealResult() を呼ぶタイマーを仕掛ける
// （すでに勝者が決まっていても、この待ち時間は変わらない）。
function armReadTimeout(card) {
  if (readTimeoutTimer) clearTimeout(readTimeoutTimer);
  scheduleCpuGrabs(card);
  const wait = postReadWaitMs(hiResNow() - gs.readStartAt);
  readTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'reading' || gs.currentCard !== card) return;
    // ちょうどこの瞬間に申告の受付窓(0.5秒)がまだ閉じていない場合、勝者が決まる前に
    // 「誰も取れなかった」と判定してしまわないよう、受付窓が閉じるまで少し待つ。
    if (gs.openGrabWindowCardIds.has(card.id)) {
      readTimeoutTimer = setTimeout(() => revealResult(card), GRAB_WINDOW_MS + 50);
      return;
    }
    revealResult(card);
  }, wait);
}

// この札の読み上げ中・猶予中に届いた誤クリックを、本人にまとめて知らせる（減点自体はクリック時に
// 即座に済んでいる。「✕お手付き」の表示と、ランキング上の点数変化を、今読まれていた札の
// 「そこまで！」に合わせる）。
function flushPendingMisses(cardId) {
  const due = gs.pendingMisses.filter(m => m.activeCardId === cardId);
  if (!due.length) return;
  gs.pendingMisses = gs.pendingMisses.filter(m => m.activeCardId !== cardId);
  due.forEach(m => io.to(m.socketId).emit('wrong_grab', { cardId: m.clickedCardId, penalty: m.penalty }));
  io.emit('players_updated', gs.players);
}

// 「読み上げ開始→そこまで」が TOTAL_READ_CYCLE_MS 経過したときに呼ばれる。その間に正解の申告があれば
// （読み上げ中・読み上げ後のどちらで決まっていても）ここで初めて確定・加点して発表し、
// なければ「誰も取れなかった」発表（triggerTimeUp）を行う。
function revealResult(card) {
  flushPendingMisses(card.id);
  if (gs.pendingWinner && gs.pendingWinner.card.id === card.id) {
    const pw = gs.pendingWinner;
    gs.pendingWinner = null;
    logEvent('reveal', { cardId: card.id, winner: pw.grabberId, name: gs.players[pw.grabberId] && gs.players[pw.grabberId].name,
      sinceReadEndMs: Math.round(hiResNow() - gs.yomiFinishedAt) });
    processCorrectGrab(pw.grabberId, pw.card, pw.scored, pw.contenders);
  } else {
    triggerTimeUp(card);
  }
}

// 制限時間経過の処理。「そこまで」→ 正解発表 → 次の札待機へ。
// 誰も取れなかった札は remaining から外す（外さないと pickNext() が同じ札を
// 何度も選び続け、次の札に進めなくなる／同じ札が繰り返し読まれるバグになる）。
function triggerTimeUp(card) {
  clearCpuTimers();
  logEvent('time_up', { kind: 'real', cardId: card.id, tori: card.tori, sinceReadStartMs: Math.round(hiResNow() - gs.readStartAt), clicksDuringWindow: gs.grabCandidates.length });
  gs.phase = 'announcing';
  gs.remaining.delete(card.id);
  io.emit('time_up', { card, playAt: hiResNow() + 250 });

  gs.currentCard  = pickNext();
  const nextCard  = gs.currentCard;
  const remaining = [...gs.remaining];

  // そこまで・答え合わせの音声がホスト端末で終わるのを待ってから次の札へ進む
  armAnnounceAdvance(() => {
    if (nextCard) {
      gs.phase = 'waiting';
      io.emit('game_waiting', {
        remaining, players: gs.players, hostId: gs.hostId, difficulty: gs.difficulty,
        round: gs.round, totalCards: gs.cardOrder.length || 10,
        isRevival: gs.isRevival,
      });
    } else {
      endRound();
    }
  });
}

// ダミー読み完了後、「読み上げ開始→そこまで」が TOTAL_READ_CYCLE_MS になるよう残り時間を
// 待ってから「そこまで」を発し次の本物の札へ移る。
function armDecoyTimeout() {
  if (decoyTimeoutTimer) clearTimeout(decoyTimeoutTimer);
  const wait = postReadWaitMs(hiResNow() - gs.readStartAt);
  decoyTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'decoy') return;
    gs.phase = 'announcing';
    logEvent('time_up', { kind: 'decoy', sinceReadStartMs: Math.round(hiResNow() - gs.readStartAt) });
    const decoy = gs.currentDecoy;
    gs.currentDecoy = null;
    // そこまで → 上の句（デコイ yomi）→ これは盤面にない札でした の順で再生させる
    io.emit('time_up', { card: null, decoy, playAt: hiResNow() + 250 });

    if (gs.pendingDecoyMisses.length) {
      const due = gs.pendingDecoyMisses;
      gs.pendingDecoyMisses = [];
      due.forEach(m => io.to(m.socketId).emit('wrong_grab', { cardId: m.clickedCardId, penalty: m.penalty }));
      io.emit('players_updated', gs.players);
    }

    const nextCard  = gs.currentCard;   // ダミー中も currentCard は次の本物の札を指す
    const remaining = [...gs.remaining];
    armAnnounceAdvance(() => {
      if (nextCard) {
        gs.phase = 'waiting';
        io.emit('game_waiting', {
          remaining, players: gs.players, hostId: gs.hostId, difficulty: gs.difficulty,
          round: gs.round, totalCards: gs.cardOrder.length || 10,
          isRevival: gs.isRevival,
        });
      } else {
        endRound();
      }
    });
    decoyTimeoutTimer = null;
  }, wait);
}

// 盤面のどの札にも対応しないダミーの読みを再生する。
// ホスト端末から再生完了の通知（decoy_finished）を受け取ってから、本物の札と同じ
// TOTAL_READ_CYCLE_MS のルールに従って残り時間だけ待つ。
function startDecoyRead() {
  gs.lockedPlayers.clear();   // 次の読み上げが始まったので、お手付きのロックを解除
  gs.phase = 'decoy';
  const decoy = pickDecoy();
  const playAt = hiResNow() + 400;
  gs.readStartAt = playAt + INTRO_START_EST_MS;
  logEvent('read_start', { kind: 'decoy', decoyId: decoy.id, tori: decoy.tori, remaining: gs.remaining.size,
    finalDecoyLeft: gs.finalDecoyLeft, playAt: Math.round(playAt) });
  io.emit('decoy_read', {
    id:     decoy.id,
    yomi:   decoy.yomi,
    playAt,
  });
  gs.currentDecoy = decoy;   // time_up 発火時に上の句として再読み上げる
  if (decoyTimer) clearTimeout(decoyTimer);
  // decoy_finished が来ない場合のフォールバック（音声再生時間 + 10s の余裕）
  decoyTimer = setTimeout(() => {
    if (gs.phase !== 'decoy') return;
    armDecoyTimeout();
  }, 22000);
}

// 試合終了処理
function endRound() {
  logEvent('match_end', { round: gs.round, mode: gs.event.active ? 'event:' + gs.event.stage : 'practice',
    scores: Object.entries(gs.players).filter(([, p]) => p.isBot || p.joined)
      .sort(([, a], [, b]) => b.score - a.score)
      .map(([id, p]) => ({ id, name: p.name, isBot: !!p.isBot, score: p.score, cards: p.cards || 0, misses: p.misses || 0 })) });
  // ── 大会モード（1/8本番用）終了処理 ─────────────────────────
  if (gs.event.active) { endEventRound(); return; }

  // 結果送信時に players スナップショットを取る（CPUが後で削除されても結果画面に表示される）
  const snap = () => Object.assign({}, gs.players);

  // ── グループ戦終了 ─────────────────────────────────────────
  if (gs.isGroupMatch) {
    gs.phase = 'round_finished';

    // アクティブな参加者（脱落済みを除く）をスコア順に並べる
    const activeSorted = Object.entries(gs.players)
      .filter(([id, p]) => gs.groupParticipantIds.has(id) && !gs.groupEliminated.has(id) && (p.isBot || p.joined))
      .sort(([, a], [, b]) => b.score - a.score);

    if (gs.groupRound < gs.groupMaxRounds) {
      // ── 中間ラウンド：上位N人を次ラウンドへ進出、脱落者のスコアを記録 ──
      const n = Math.min(gs.groupSurvivorCount, activeSorted.length);
      const advancerIds   = activeSorted.slice(0, n).map(([id]) => id);
      const eliminatedNow = activeSorted.slice(n).map(([id]) => id);
      eliminatedNow.forEach(id => {
        gs.groupEliminated.add(id);
        // 実効スコア = ラウンド番号×10000 + スコア（ラウンド到達数が主キー）
        if (gs.players[id] && !gs.players[id].isBot) {
          gs.groupMatchScores[id] = gs.groupRound * 10000 + (gs.players[id].score || 0);
        }
      });
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: advancerIds, eliminatedIds: eliminatedNow,
        survivorCount: gs.groupSurvivorCount, players: playersSnap,
        isGroupMatch: true, isGroupMatchIntermediate: true,
        groupTier: gs.groupTier, groupRound: gs.groupRound, groupMaxRounds: gs.groupMaxRounds,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: advancerIds, eliminatedIds: eliminatedNow,
          survivorCount: gs.groupSurvivorCount,
          isGroupMatch: true, isGroupMatchIntermediate: true,
          groupTier: gs.groupTier, groupRound: gs.groupRound, groupMaxRounds: gs.groupMaxRounds,
        });
      }, 3000);
    } else {
      // ── 最終ラウンド：全員のスコアを記録し完了マーカーを設定 ──
      const finishedTier = gs.groupTier;
      gs.isGroupMatch = false;

      // 最終ラウンド参加者のスコアを記録（最大ラウンド到達 = 最高実効スコア）
      activeSorted.forEach(([id, p]) => {
        if (!p.isBot) gs.groupMatchScores[id] = gs.groupMaxRounds * 10000 + p.score;
      });

      // 完了マーカー兼昇格者リスト（null=未完了 / [ids]=完了 ）
      const winnerIds = activeSorted.filter(([, p]) => !p.isBot).map(([id]) => id);
      if (finishedTier === 'bottom') gs.bottomGroupWinners = winnerIds;
      if (finishedTier === 'middle') gs.middleGroupWinners = winnerIds;
      gs.groupEliminated = new Set();

      // 上位グループ戦終了後に全員を再振り分け
      if (finishedTier === 'top') {
        const allHumans = Object.entries(gs.players)
          .filter(([id, p]) => !(id === gs.hostId && gs.event.active) && !p.isBot && p.joined)
          .sort(([idA], [idB]) => (gs.groupMatchScores[idB] || 0) - (gs.groupMatchScores[idA] || 0));
        const numH2  = allHumans.length;
        const base2  = Math.floor(numH2 / 3);
        const extra2 = numH2 - base2 * 3;
        const topCnt2 = base2 + (extra2 > 0 ? 1 : 0);
        const midCnt2 = base2 + (extra2 > 1 ? 1 : 0);
        gs.humanGroups = {
          top:    allHumans.slice(0, topCnt2).map(([id]) => id),
          middle: allHumans.slice(topCnt2, topCnt2 + midCnt2).map(([id]) => id),
          bottom: allHumans.slice(topCnt2 + midCnt2).map(([id]) => id),
        };
        gs.bottomGroupWinners = null;  // 次サイクルのために解放
        gs.middleGroupWinners = null;
        gs.groupMatchScores   = {};
      }

      const grouped = activeSorted.map(([id]) => id);
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: grouped, eliminatedIds: [],
        players: playersSnap, isGroupMatch: true, groupTier: finishedTier,
        humanGroups: gs.humanGroups,
        bottomGroupWinners: gs.bottomGroupWinners,
        middleGroupWinners: gs.middleGroupWinners,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: grouped, eliminatedIds: [],
          isGroupMatch: true, groupTier: finishedTier,
          humanGroups: gs.humanGroups,
          bottomGroupWinners: gs.bottomGroupWinners,
          middleGroupWinners: gs.middleGroupWinners,
        });
      }, 3000);
    }
    return;
  }

  // ── 敗者復活戦終了 ────────────────────────────────────────
  if (gs.isRevival) {
    gs.phase = 'round_finished';
    // このラウンドに参加していたアクティブな復活戦プレイヤー
    const activeRevivors = Object.entries(gs.players)
      .filter(([id, p]) => gs.eliminatedPlayers.has(id) && !gs.revivalEliminated.has(id) && !p.isBot && p.joined)
      .sort(([, a], [, b]) => b.score - a.score);

    if (gs.revivalRound < gs.revivalMaxRounds) {
      // ── 中間ラウンド：上位N人を次ラウンドへ進出 ──
      const n = Math.min(gs.revivalSurvivorCount, activeRevivors.length);
      const advancerIds  = activeRevivors.slice(0, n).map(([id]) => id);
      const eliminatedNow = activeRevivors.slice(n).map(([id]) => id);
      eliminatedNow.forEach(id => gs.revivalEliminated.add(id));
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: advancerIds, eliminatedIds: eliminatedNow,
        survivorCount: gs.revivalSurvivorCount, players: playersSnap,
        isRevival: true, isRevivalIntermediate: true,
        revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: advancerIds, eliminatedIds: eliminatedNow,
          survivorCount: gs.revivalSurvivorCount,
          isRevival: true, isRevivalIntermediate: true,
          revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
        });
      }, 3000);
    } else {
      // ── 最終ラウンド：上位revivalCount人を本戦復帰 ──
      gs.isRevival = false;
      const n = Math.min(gs.revivalCount, activeRevivors.length);
      const revivedIds = activeRevivors.slice(0, n).map(([id]) => id);
      const failedIds  = [
        ...activeRevivors.slice(n).map(([id]) => id),
        ...[...gs.revivalEliminated].filter(id => gs.players[id] && !gs.players[id].isBot),
      ];
      revivedIds.forEach(id => {
        gs.eliminatedPlayers.delete(id);
        if (gs.players[id]) gs.players[id].isEliminated = false;
      });
      gs.revivalEliminated = new Set();
      io.emit('players_updated', gs.players);
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: revivedIds, eliminatedIds: failedIds,
        survivorCount: gs.revivalCount, players: playersSnap,
        isRevival: true, revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: revivedIds, eliminatedIds: failedIds,
          survivorCount: gs.revivalCount,
          isRevival: true, revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
        });
      }, 3000);
    }
    return;
  }

  // ── 練習モード：敗退なし ──────────────────────────────────
  // 点数に関わらず全員を「進出」扱いにし、次の試合でも引き続き札を取れる。
  // 結果画面はその試合で実際に取った点数の順にランキング表示する。
  gs.phase = 'round_finished';
  const isFinalRound = gs.round >= gs.maxRounds;
  const competitors = Object.entries(gs.players)
    .filter(([id, p]) => !(id === gs.hostId && gs.event.active) && (p.isBot || p.joined))
    .sort(([, a], [, b]) => b.score - a.score);
  const survivorIds   = competitors.map(([id]) => id);
  const eliminatedIds = [];

  if (isFinalRound) {
    // 最終試合：ランキングを表示して終了（敗者復活戦・グループ戦には進まない）
    gs.postTournament     = false;
    gs.humanGroups        = null;
    gs.bottomGroupWinners = null;
    gs.middleGroupWinners = null;
  }

  const playersSnap = snap();
  gs.lastRoundResult = {
    round: gs.round, survivorIds, eliminatedIds,
    survivorCount: gs.survivorCount, players: playersSnap,
    ...(isFinalRound ? { isFinal: true } : {}),
  };
  setTimeout(() => {
    io.emit('round_finished', {
      round: gs.round, players: playersSnap,
      survivorIds, eliminatedIds, survivorCount: gs.survivorCount,
      ...(isFinalRound ? { isFinal: true } : {}),
    });
  }, 3000);
}

// ── 大会モード（1/8本番用）───────────────────────────────────
const EVENT_MIN_GAMES       = 2;   // 全員がこれだけの試合数を消化できることを保証する

const EVENT_STAGE_LABELS = { main: '本戦', revival: '敗者復活戦' };

// 通過人数・敗退人数を比率で分ける（既定は約1/3ずつ。最低1人は通過・最低0人は敗退）
function eventCutCounts(poolSize, ratio = 1 / 3) {
  const pass = Math.max(1, Math.min(poolSize, Math.round(poolSize * ratio)));
  return { pass, lose: poolSize - pass };
}

// 練習モードの模擬トーナメント（本番の雰囲気をつかむためのモード）。
// 1回戦は80人規模で開始し、1回戦→40人・2回戦→20人・3回戦（最終）→上位3人
// という「本番はこう進む」がわかる縮小コピーの進行にする。
const PRACTICE_MOCK_TOTAL_TARGET    = 80;
const PRACTICE_MOCK_SURVIVOR_SCHEDULE = [40, 20, 10, 3];

// gs.event.stage を設定する。'main'/'revival' に入るたびにそれぞれの回戦カウンタを+1する
// （本戦は EVENT_ROUND_MIX の難易度選択・表示用の試合番号の両方に使う。敗者復活戦は
// 表示用の試合番号と、設定された最大回数に達したかどうかの判定に使う）。
function setEventStage(stage) {
  gs.event.stage = stage;
  if (stage === 'main')    gs.event.mainRoundIndex++;
  if (stage === 'revival') gs.event.revivalRoundIndex++;
}

// 大会モードの1試合を開始する（暗記フェーズから）。
// 本戦（main）は回戦カウンタに応じた易/普通/難しいの配分で10枚抽出、敗者復活戦は
// 本戦と同じ考え方で5枚（本戦の回戦数に連動して難しくなる）を使う。
function startEventMatch(participantIds) {
  gs.event.participantIds = new Set(participantIds);
  participantIds.forEach(id => {
    if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].bonus = 0; gs.players[id].cards = 0; gs.players[id].misses = 0; }
  });
  // CPUポイント（デバッグ機能）で入れた点数が、参加していない試合のランキング表示に
  // そのまま残って紛らわしくならないよう、CPUは参加の有無を問わず試合のたびに必ずリセットする。
  CPU_IDS.forEach(id => {
    if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].bonus = 0; gs.players[id].cards = 0; gs.players[id].misses = 0; }
  });

  // 設定された回数に達した本戦は「最終試合」：このあとは通過・敗退で絞らず、
  // その時点の残り人数でそのまま順位を決める（endEventRound 側で判定に使う）。
  gs.event.isFinalMainRound = gs.event.stage === 'main' && gs.event.mainRoundIndex >= gs.eventConfig.mainMaxRounds;
  // 今の試合で何人が通過するか（最終試合は絞り込みがないので対象外）。画面にボーダーを
  // 出すために使う。試合開始時点の設定値で固定し、試合中に設定が変わっても反映しない。
  gs.event.passCount = gs.event.isFinalMainRound ? null
    : gs.event.stage === 'revival' ? eventCutCounts(participantIds.length, gs.eventConfig.revivalCutRatio).pass
    : eventCutCounts(participantIds.length, gs.eventConfig.mainCutRatio).pass;

  const cardIds = gs.event.stage === 'revival'
    ? buildRevivalRoundCardIds(gs.event.mainRoundIndex)
    : buildEventRoundCardIds(gs.event.mainRoundIndex);
  const cards   = KARUTA.filter(k => cardIds.includes(k.id));
  gs.remaining      = new Set(cardIds);
  gs.cardOrder      = cardIds;
  gs.currentCard    = null;
  gs.currentDecoy   = null;
  gs.phase          = 'memorizing';
  gs.memorizeEndsAt = Date.now() + memoSeconds() * 1000;
  gs.layout = LAYOUT.generateLayout(gs.cardOrder);

  const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: gs.event.participantIds });
  io.emit('event_memorize_start', {
    layout:         gs.layout,
    cardOrder:      gs.cardOrder,
    cards,
    players:        gs.players,
    endsAt:         gs.memorizeEndsAt,
    stage:          gs.event.stage,
    stageLabel:     EVENT_STAGE_LABELS[gs.event.stage] || '大会モード',
    roundNumber:    gs.event.stage === 'revival' ? gs.event.revivalRoundIndex : gs.event.mainRoundIndex,
    isFinalMainRound: gs.event.isFinalMainRound,
    passCount:      gs.event.passCount,
    participantIds: [...gs.event.participantIds],
    gamesPlayed:    gs.event.gamesPlayed,
    humanCount, cpuCount, totalCount,
  });
  armMemorize();
}

// 現在のステージの参加者を games played にカウントし、次に打てる手（本戦／敗者復活戦の
// どちらが可能か、あるいは大会が終了したか）を画面に出せるデータをまとめる。
function eventStageReadySnapshot() {
  const mainReady    = gs.event.mainPool.size > 0 && gs.event.stage !== 'done';
  const revivalClosed = gs.event.revivalRoundIndex >= gs.eventConfig.revivalMaxRounds;
  const revivalReady  = gs.event.revivalCandidates.size > 0 && !revivalClosed && gs.event.stage !== 'done';
  return {
    stage:            gs.event.stage,
    mainPoolSize:     gs.event.mainPool.size,
    revivalPoolSize:  gs.event.revivalCandidates.size,
    mainReady,
    revivalReady,
    revivalClosed,
    gamesPlayed:      gs.event.gamesPlayed,
    players:          gs.players,
    // 各自が「次に自分は何をすればいいか」を画面に出せるよう、プール内訳と次の試合番号も渡す
    mainPoolIds:          [...gs.event.mainPool],
    revivalCandidateIds:  [...gs.event.revivalCandidates],
    nextMainRoundNumber:    gs.event.mainRoundIndex + 1,
    nextRevivalRoundNumber: gs.event.revivalRoundIndex + 1,
  };
}
function notifyEventStageReady() {
  io.emit('event_stage_ready', eventStageReadySnapshot());
}

// 大会モードの1試合終了処理。ステージごとに通過／敗退／敗者復活行きを振り分ける。
function endEventRound() {
  gs.phase = 'round_finished';
  const stage = gs.event.stage;

  const active = [...gs.event.participantIds]
    .filter(id => gs.players[id] && (gs.players[id].isBot || gs.players[id].joined))
    .map(id => [id, gs.players[id]])
    .sort(([, a], [, b]) => b.score - a.score);

  // 参加者全員の消化試合数を加算
  active.forEach(([id]) => {
    gs.event.gamesPlayed[id] = (gs.event.gamesPlayed[id] || 0) + 1;
  });

  const playersSnap = Object.assign({}, gs.players);
  const ids = active.map(([id]) => id);

  // ── 本戦：設定された回数に達した「最終試合」── 絞り込みはせず、そのままの順位で確定 ──
  if (stage === 'main' && gs.event.isFinalMainRound) {
    gs.event.finalRanking = ids;
    gs.event.mainPool     = new Set();
    gs.event.stage         = 'done';
    gs.event.lastResult    = { stage: 'main', isFinal: true, finalRanking: ids, players: playersSnap, ceremony: CEREMONY, roundNumber: gs.event.mainRoundIndex };
    setTimeout(() => {
      io.emit('event_round_finished', {
        stage: 'main', isFinal: true, finalRanking: ids, players: playersSnap, ceremony: CEREMONY, roundNumber: gs.event.mainRoundIndex,
      });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  if (stage === 'revival') {
    const pass = gs.event.passCount != null ? Math.min(gs.event.passCount, ids.length) : eventCutCounts(ids.length, gs.eventConfig.revivalCutRatio).pass;
    const revived   = ids.slice(0, pass);
    const stillOut  = ids.slice(pass);
    revived.forEach(id => gs.event.mainPool.add(id));
    // 敗者復活戦が設定回数に達していなければ、まだ既定試合数未満の人を次の敗者復活戦に再挑戦させる
    const revivalClosed = gs.event.revivalRoundIndex >= gs.eventConfig.revivalMaxRounds;
    if (!revivalClosed) {
      stillOut.forEach(id => {
        if ((gs.event.gamesPlayed[id] || 0) < EVENT_MIN_GAMES) gs.event.revivalCandidates.add(id);
      });
    }
    gs.event.lastResult = { stage, revived, stillOut, players: playersSnap, roundNumber: gs.event.revivalRoundIndex };
    setTimeout(() => {
      io.emit('event_round_finished', { stage, revived, stillOut, players: playersSnap, roundNumber: gs.event.revivalRoundIndex });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  // stage === 'main'（最終試合ではない通常の本戦）
  const pass = gs.event.passCount != null ? Math.min(gs.event.passCount, ids.length) : eventCutCounts(ids.length, gs.eventConfig.mainCutRatio).pass;
  const passers = ids.slice(0, pass);
  const losers   = ids.slice(pass);
  gs.event.mainPool  = new Set(passers);
  losers.forEach(id => gs.event.revivalCandidates.add(id));
  gs.event.lastResult = { stage: 'main', passers, losers, players: playersSnap, roundNumber: gs.event.mainRoundIndex };
  setTimeout(() => {
    io.emit('event_round_finished', { stage: 'main', passers, losers, players: playersSnap, roundNumber: gs.event.mainRoundIndex });
    notifyEventStageReady();
  }, 3000);
}

// ── 試合の音声の準備 ───────────────────────────────────────────
// 盤面整理(暗記)が始まったら、その試合で使う音声（札の上の句・答え・ダミー読み候補・固定セリフ・DJの名前）を
// VOICEVOX で生成し、できたらクライアントに配信を知らせる。キャッシュ済みの分はすぐ使える。
let voiceToken = 0;
function voiceSummary() {
  const v = gs.voice;
  return v ? { ready: v.ready, done: v.done, total: v.total, failed: v.failed, items: v.items } : null;
}
function prepareMatchVoice() {
  const token = ++voiceToken;
  // ダミー読みの候補を先に決めて、音声も作っておく
  const pool = [...UNLEVELED].sort(() => Math.random() - 0.5).slice(0, 12);
  gs.decoyPool = pool.map(k => ({ id: 'decoy' + k.id, yomi: k.yomi, tori: k.tori }));
  const items = [];
  // 上の句は2通りの声で要る：最初の読み上げ(めたん)と、そこまでの後の答え合わせの再読み上げ(青山龍星)。
  // 下の句(答え)は答え合わせでしか読まないので青山龍星だけでよい。
  gs.cardOrder.forEach(id => {
    const k = KMAP[id];
    if (k) items.push(VD.seg(k.yomi, 'metan'), ...VD.answerSegments(k.yomi, k.tori));
  });
  gs.decoyPool.forEach(d => items.push(VD.seg(d.yomi, 'metan'), ...VD.answerSegments(d.yomi, d.tori)));
  VD.warmupItems().filter(it => Object.values(VD.FIXED).includes(it.text)).forEach(it => items.push(it));
  Object.values(gs.players).filter(p => !p.isBot && p.joined).forEach(p => items.push(VD.nameSeg(djName(p))));
  const seen = new Set();
  const uniq = items.filter(it => { const k = it.voice + '|' + it.text; if (seen.has(k)) return false; seen.add(k); return true; });
  gs.voice = { token, ready: false, done: 0, failed: 0, total: uniq.length, items: uniq };
  io.emit('voice_manifest', { items: uniq, total: uniq.length });
  const t0 = Date.now();
  let last = 0;
  voiceEngine.ensure(uniq, { prio: 'match', onEach: (it, ok) => {
    if (token !== voiceToken || !gs.voice) return;
    gs.voice.done++; if (!ok) gs.voice.failed++;
    if (Date.now() - last > 400) { last = Date.now(); io.emit('voice_progress', { done: gs.voice.done, total: gs.voice.total }); }
  } }).then(r => {
    if (token !== voiceToken || !gs.voice) return;
    logEvent('voice_ready', { total: uniq.length, failed: r.failed, ms: Date.now() - t0, stats: voiceEngine.stats });
    gs.voice.done = gs.voice.total;
    if (r.failed) {
      // 生成は終わったが揃わなかった分がある（待っても増えないので、そのまま始める）。
      // voice_ready は失敗時も送る。送らないと、クライアント側の「盤面整理をスキップ」
      // ボタンが voiceState.ready の成立を待ち続け、押しても反応しなくなってしまう。
      gs.voice.finalFailed = true;
      io.emit('voice_ready', { done: gs.voice.total, total: gs.voice.total, failed: r.failed });
    } else {
      gs.voice.ready = true;
      io.emit('voice_ready', { done: gs.voice.total, total: gs.voice.total, failed: 0 });
    }
    // 音声の準備ができても盤面整理タイムは自動終了しない（実際に手元の札を並べ替える
    // 時間を確保するため）。終了するのは、①MEMO_SECONDS経過（armMemorizeのタイマー）、
    // ②誰かが明示的にskip_memorizeを送る（即終了ボタン・ボットの自動スキップ）、の2通りのみ。
  });
}
// 盤面整理を開始する。MEMO_SECONDS経過するかskip_memorizeで明示的にスキップされると
// 試合を始める（音声がまだ揃っていなければ、最大 VOICE_WAIT_MAX_MS 待ってから、
// それでも揃わない分は無音のまま始める）。
function armMemorize() {
  prepareMatchVoice();
  if (memorizeTimer) clearTimeout(memorizeTimer);
  memorizeTimer = setTimeout(startPlayingWhenVoiceReady, memoSeconds() * 1000);
}
function startPlayingWhenVoiceReady() {
  if (memorizeTimer) clearTimeout(memorizeTimer);   // スキップ経由で呼ばれたとき、残っている盤面整理のタイマーを止める
  memorizeTimer = null;
  if (gs.phase !== 'memorizing') return;
  if (!gs.voice || gs.voice.ready || gs.voice.finalFailed) { doStartPlaying(); return; }
  const t0 = Date.now();
  io.emit('voice_wait', { done: gs.voice.done, total: gs.voice.total, maxMs: VOICE_WAIT_MAX_MS });
  const tick = () => {
    if (gs.phase !== 'memorizing') return;
    if (!gs.voice || gs.voice.ready || gs.voice.finalFailed || Date.now() - t0 > VOICE_WAIT_MAX_MS) {
      logEvent('voice_wait_end', { ready: !!(gs.voice && gs.voice.ready), waitedMs: Date.now() - t0 });
      doStartPlaying(); return;
    }
    memorizeTimer = setTimeout(tick, 500);
  };
  memorizeTimer = setTimeout(tick, 500);
}

// 暗記フェーズ終了後に waiting フェーズへ移行
function doStartPlaying() {
  if (memorizeTimer) { clearTimeout(memorizeTimer); memorizeTimer = null; }
  // CPU は各試合の開始時（暗記フェーズ開始時）に追加済み
  gs.phase       = 'waiting';
  gs.currentCard = pickNext();
  gs.matchLevel     = matchLevelIndex(gs.cardOrder);
  gs.finalDecoyLeft = null;
  gs.grabCandidates = [];
  logEvent('match_start', { round: gs.round, mode: gs.event.active ? 'event:' + gs.event.stage : (gs.isRevival ? 'revival' : gs.isGroupMatch ? 'group' : 'practice'),
    level: LEVELS[gs.matchLevel], cards: gs.cardOrder.map(id => ({ id, tori: KMAP[id] && KMAP[id].tori, lv: KMAP[id] && KMAP[id].lv })),
    players: Object.entries(gs.players).filter(([, p]) => p.isBot || p.joined).map(([id, p]) => ({ id, name: p.name, isBot: !!p.isBot, grade: p.grade || null, course: p.course || null })) });
  io.emit('game_waiting', {
    cardOrder:           gs.cardOrder,
    remaining:           [...gs.remaining],
    players:             gs.players,
    hostId:              gs.hostId,
    difficulty:          gs.difficulty,
    round:               gs.round,
    totalCards:          gs.cardOrder.length || 10,
    isRevival:           gs.isRevival,
    isGroupMatch:        gs.isGroupMatch,
    groupTier:           gs.groupTier,
    groupParticipantIds: [...gs.groupParticipantIds],
    groupRound:          gs.groupRound,
    groupMaxRounds:      gs.groupMaxRounds,
    isEvent:             gs.event.active,
    eventStage:          gs.event.stage,
    eventStageLabel:     EVENT_STAGE_LABELS[gs.event.stage] || null,
    eventRoundNumber:    gs.event.stage === 'revival' ? gs.event.revivalRoundIndex : gs.event.mainRoundIndex,
    eventIsFinalMainRound: gs.event.isFinalMainRound,
    eventPassCount:      gs.event.passCount,
    eventParticipantIds: [...gs.event.participantIds],
  });
  beginReadyBarrier();
}

// ── 試合開始時の待ち合わせ ─────────────────────────────────────
// 暗記(盤面整理)が終わっても、すぐには読み上げない。札を取る側の人間が全員、仮想マウスカーソル
// （Pointer Lock。使えない端末は通常カーソル）に移ったことを確認してから最初の読み上げを始める。
// 誰かが操作しなくても止まらないよう、READY_TIMEOUT_MS で打ち切って開始する。
const READY_TIMEOUT_MS = +process.env.KARUTA_READY_TIMEOUT_MS || 30 * 1000;   // 環境変数はテスト用
gs.ready = { active: false, need: new Set(), done: new Set(), timer: null, deadline: 0 };

function handicapSummary() {
  const mine = {};
  for (const [id, p] of Object.entries(gs.players)) if (!p.isBot && p.joined) mine[id] = handicapOf(p);
  return {
    event: gs.event.active,
    any: Object.values(mine).some(h => h.gain !== 1 || h.penalty !== 1),   // 今の参加者に1人でもハンデのある人がいるか
    rules: { grade: HANDICAP_GRADE, programmingCourses: PROGRAMMING_COURSES, programming: HANDICAP_PROGRAMMING },
    mine,
  };
}
function readyProgress() {
  return { total: gs.ready.need.size, ready: gs.ready.done.size, deadline: gs.ready.deadline, active: gs.ready.active };
}
function beginReadyBarrier() {
  if (gs.ready.timer) clearTimeout(gs.ready.timer);
  const need = Object.keys(gs.players).filter(id => !gs.players[id].isBot && gs.players[id].joined && canParticipate(id));
  gs.ready = { active: true, need: new Set(need), done: new Set(), timer: null, deadline: Date.now() + READY_TIMEOUT_MS };
  logEvent('ready_wait', { need: need.map(id => ({ id, name: gs.players[id].name })) });
  if (!need.length) { releaseReadyBarrier('no_players'); return; }
  gs.ready.timer = setTimeout(() => releaseReadyBarrier('timeout'), READY_TIMEOUT_MS);
  io.emit('ready_wait', { ...readyProgress(), handicap: handicapSummary() });
}
function releaseReadyBarrier(reason) {
  if (!gs.ready.active) return;
  if (gs.ready.timer) { clearTimeout(gs.ready.timer); gs.ready.timer = null; }
  gs.ready.active = false;
  const notReady = [...gs.ready.need].filter(id => !gs.ready.done.has(id)).map(id => gs.players[id] && gs.players[id].name);
  logEvent('ready_release', { reason, notReady });
  io.emit('ready_release', { reason });
}
function markReady(id) {
  if (!gs.ready.active || !gs.ready.need.has(id) || gs.ready.done.has(id)) return;
  gs.ready.done.add(id);
  logEvent('ready', { id, name: gs.players[id] && gs.players[id].name, doneCount: gs.ready.done.size, total: gs.ready.need.size });
  if (gs.ready.done.size >= gs.ready.need.size) releaseReadyBarrier('all_ready');
  else io.emit('ready_progress', readyProgress());
}

// 全タイマーをまとめてクリアするユーティリティ
function clearAllTimers() {
  clearCpuTimers();
  if (memorizeTimer)     { clearTimeout(memorizeTimer);     memorizeTimer     = null; }
  if (decoyTimer)        { clearTimeout(decoyTimer);        decoyTimer        = null; }
  if (decoyTimeoutTimer) { clearTimeout(decoyTimeoutTimer); decoyTimeoutTimer = null; }
  if (readTimeoutTimer)  { clearTimeout(readTimeoutTimer);  readTimeoutTimer  = null; }
  if (announceAdvanceTimer) { clearTimeout(announceAdvanceTimer); announceAdvanceTimer = null; }
  pendingAnnounceAdvance = null;
  gs.openGrabWindowCardIds.clear();
  if (gs.ready.timer) { clearTimeout(gs.ready.timer); gs.ready.timer = null; }
  gs.ready.active = false;
  gs.grabCandidates = [];
  gs.pendingWinner = null;
  gs.pendingMisses = [];
  gs.pendingDecoyMisses = [];
}

// 受付時間内に集まった正解候補から勝者を決める。この0.5秒の受付時間・決め方自体は変わらない：
// 精度の点数が一番高い人が札を取る（同点なら速い方）。距離(マウスコントロール力)は誰が取るかには
// 使わず、取った人の得点にだけ加算される。
//
// 変わったのは「決まった後」。かるたは誰かが取っても最後まで読み上げるため、読み上げの途中で
// 決まった場合はまだ確定させない（お手付きは即座に成立するが、取得はここでは成立しない）。
// 読み上げ後の猶予中に決まった場合も同様にまだ確定させない。どちらの場合も
// revealResult()（「読み上げ開始→そこまで」が常に TOTAL_READ_CYCLE_MS 経過した時点）で
// 初めて確定・加点・発表する。
function resolveGrabWindow(cardId) {
  gs.openGrabWindowCardIds.delete(cardId);
  const candidates = gs.grabCandidates.filter(c => c.cardId === cardId);
  // この札の分だけ取り除く。読み上げ中に決まった勝者に対してCPUが読み上げ終了後も遅れて
  // 申告を続けるため、前の札の受付窓がこの札が始まった後まで残っていることがある。
  // 丸ごと空にすると、次の札の正当な申告まで一緒に消えてしまうため、cardId で絞って消す。
  gs.grabCandidates = gs.grabCandidates.filter(c => c.cardId !== cardId);
  if (!candidates.length) return;
  if (!gs.currentCard || gs.currentCard.id !== cardId || !gs.remaining.has(cardId)) return;
  if (gs.pendingWinner && gs.pendingWinner.card.id === cardId) return;   // すでに決定済み（通常は起きない）

  const scored = candidates.map(scoreCandidate);
  scored.sort((x, y) => (y.key - x.key) || (x.speedMs - y.speedMs));
  const winner = scored[0];
  if (!gs.players[winner.id]) return;

  gs.pendingWinner = { grabberId: winner.id, card: gs.currentCard, scored: winner, contenders: scored };
  logEvent('pending_take', { cardId, winner: winner.id, name: winner.name, contenders: scored.length,
    duringReading: !gs.yomiFinishedForCurrent, sinceReadStartMs: Math.round(hiResNow() - gs.readStartAt) });
}

// ── 観戦チャット用ヘルパー ───────────────────────────────────
// 観戦者 = 大会モードの対局中で、今の試合の参加者でも進行役でもない参加登録済みの人間。
function isSpectatorSocket(id) {
  const p = gs.players[id];
  if (!p || p.isBot || !p.joined || !gs.event.active) return false;
  if (id === gs.hostId) return false;
  return !gs.event.participantIds.has(id);
}
function emitToSpectators(eventName, payload) {
  for (const [id, sock] of io.sockets.sockets) {
    if (isSpectatorSocket(id)) sock.emit(eventName, payload);
  }
}

// 誹謗中傷・不適切表現の簡易フィルタ。全角/半角・大小文字・カタカナ/ひらがな・記号や空白の
// 挟み込み（"し ね"、"死-ね" など）を吸収してから照合する。完全ではないが、展示で出やすい語を弾く。
const NG_WORDS = [
  '死ね', 'しね', '死んで', '消えろ', 'きえろ', '殺す', 'ころす', '殺せ', 'ぶっ殺', 'ぶっころ', '自殺', '氏ね', 'タヒ',
  'きもい', 'キモい', 'きめぇ', 'きしょい', 'うざい', 'うぜぇ', 'うぜえ', 'ださい', 'だせぇ',
  'ばか', '馬鹿', 'バカ', 'あほ', '阿呆', 'アホ', 'くず', 'クズ', 'ごみ', 'ゴミ', 'かす', 'カス', 'ぼけ', 'ボケ', 'まぬけ', '間抜け',
  'ぶす', 'ブス', 'でぶ', 'デブ', 'はげ', 'ハゲ', 'ちび', 'チビ', 'ぶた', 'ブタ', 'ババア', 'ばばあ', 'ジジイ', 'じじい',
  '無能', '役立たず', '使えない', '才能ない', '下手くそ', 'へたくそ', 'ヘタクソ', '雑魚', 'ざこ', 'ザコ', '低能', '池沼', 'ガイジ', 'きちがい', '気違い', '障害者', 'しょうがいしゃ',
  'ちんこ', 'ちんぽ', 'まんこ', 'おまんこ', 'せっくす', 'セックス', 'えっち', 'エッチ', 'えろ', 'エロ', 'おっぱい', 'ぱいぱい', 'うんこ', 'うんち', 'ちくび', 'レイプ', 'れいぷ',
];
// 英語の暴言は単語単位で判定（skill / diet などを誤って弾かないため）
const NG_LATIN = /\b(fuck|shit|bitch|asshole|dick|pussy|sex|kill|die|stupid|idiot)(s|ing|ed)?\b/i;
// 日本語の部分一致で誤検出しやすい普通の言い回し（正規化後のひらがな）。判定の前に取り除く。
const NG_ALLOW = ['ですしね', 'ますしね', 'ばかんす', 'しねま', 'しねっと'];
function normalizeForNg(text) {
  let t = String(text).normalize('NFKC').toLowerCase();
  t = t.replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));   // カタカナ→ひらがな
  t = t.replace(/\u30fc/g, '');                                                           // 長音「ー」は無視
  return t.replace(/[^\p{L}\p{N}]/gu, '');                                                 // 空白・記号・絵文字の挟み込みを除去
}
const NG_NORMALIZED = NG_WORDS.map(normalizeForNg).filter(Boolean);
function isInappropriate(text) {
  if (NG_LATIN.test(String(text).normalize('NFKC'))) return true;
  let t = normalizeForNg(text);
  NG_ALLOW.forEach(a => { t = t.split(a).join(''); });
  return NG_NORMALIZED.some(w => t.includes(w));
}

// この接続が今の試合で札を取れる参加者か（進行役・観戦者・敗退者は不可）
function canParticipate(id) {
  if (!gs.players[id]) return false;
  // ホストは進行役なので大会モード（本番）では取得不可。練習モードでは
  // サーバーPC自身のブラウザ＝ホストも通常プレイヤーとして参加できる。
  if (id === gs.hostId && gs.event.active) return false;
  if (gs.event.active) return gs.event.participantIds.has(id);               // 大会モード: 現在のステージの参加者のみ
  if (gs.isGroupMatch) return gs.groupParticipantIds.has(id) && !gs.groupEliminated.has(id);
  if (gs.isRevival)    return gs.eliminatedPlayers.has(id) && !gs.revivalEliminated.has(id);
  return !gs.eliminatedPlayers.has(id);                                       // 本戦: 敗退者は取れない
}

// 接続時・再接続（大会モードの復帰）時に送る、画面を正しく組み立てるための状態一式。
function sendInitTo(socket) {
  socket.emit('init', {
    voice:             voiceSummary(),
    layout:            gs.phase === 'memorizing' ? gs.layout : null,
    myId:              socket.id,
    phase:             gs.phase,
    difficulty:        gs.difficulty,
    cpuDifficulty:     gs.cpuDifficulty,
    currentCard:       gs.currentCard,
    cardOrder:         gs.cardOrder,
    remaining:         [...gs.remaining],
    players:           gs.players,
    cards:             [],   // 札データはブラウザ側の karuta-data.js を使う
    endsAt:            gs.memorizeEndsAt,
    hostId:            gs.hostId,
    isServerPc:        isHostEligible(socket),   // サーバーPC自身のブラウザか（大会モードの操作可否）
    round:             gs.round,
    maxRounds:         gs.maxRounds,
    survivorCount:       gs.survivorCount,
    revivalCount:        gs.revivalCount,
    isRevival:           gs.isRevival,
    revivalRound:        gs.revivalRound,
    revivalMaxRounds:    gs.revivalMaxRounds,
    revivalSurvivorCount: gs.revivalSurvivorCount,
    revivalEliminated:   [...gs.revivalEliminated],
    groupRound:          gs.groupRound,
    groupMaxRounds:      gs.groupMaxRounds,
    groupSurvivorCount:  gs.groupSurvivorCount,
    groupEliminated:     [...gs.groupEliminated],
    isGroupMatch:        gs.isGroupMatch,
    groupTier:           gs.groupTier,
    humanGroups:         gs.humanGroups,
    groupParticipantIds: [...gs.groupParticipantIds],
    cumulativeScores:    gs.cumulativeScores,
    eliminatedPlayers:   [...gs.eliminatedPlayers],
    lastRoundResult:     gs.lastRoundResult,
    totalCards:          gs.cardOrder.length || 10,
    postTournament:      gs.postTournament,
    bottomGroupWinners:  gs.bottomGroupWinners,
    middleGroupWinners:  gs.middleGroupWinners,
    houses:              gs.houses,
    isEvent:             gs.event.active,
    eventStage:          gs.event.stage,
    eventStageLabel:     EVENT_STAGE_LABELS[gs.event.stage] || null,
    eventRoundNumber:    gs.event.stage === 'revival' ? gs.event.revivalRoundIndex : gs.event.mainRoundIndex,
    eventIsFinalMainRound: gs.event.isFinalMainRound,
    eventPassCount:      gs.event.passCount,
    eventParticipantIds: [...gs.event.participantIds],
    eventGamesPlayed:    gs.event.gamesPlayed,
    pause:               pauseSnapshot(),
  });
  // 大会モードのラウンド間（ホームで次のアクションを待っている状態）に接続・再接続した人にも、
  // ホームの表示に必要な最新情報を届ける（直近の結果そのものは lastResult 経由）。
  if (gs.event.active && gs.phase === 'round_finished') {
    socket.emit('event_stage_ready', eventStageReadySnapshot());
    if (gs.event.lastResult) socket.emit('event_round_finished', gs.event.lastResult);
  }
}

// 大会モード進行中に切断された参加者が、同じ名前（学年・コースのタグ込み）で再接続してきたら、
// 元の参加者として自動的に復帰させる（得点・参加者としての立場を引き継ぐ）。ログイン継続の
// 仕組みがないため、名前の完全一致だけを手がかりにする簡易な対応（新規参加者には影響しない）。
// 切断していた参加者（oldId）の情報を newId に引き継ぐ（得点・大会内の立場も含む）。
function transferEventIdentity(oldId, newId) {
  const old = gs.players[oldId];
  delete gs.players[oldId];
  gs.players[newId] = { ...old, joined: true };
  const swap = set => { if (set.has(oldId)) { set.delete(oldId); set.add(newId); } };
  swap(gs.event.participantIds);
  swap(gs.event.mainPool);
  swap(gs.event.revivalCandidates);
  if (gs.ready.active) swap(gs.ready.need);
}
// 大会に関わりがある（今の試合の参加者・本戦待機中・敗者復活戦待機中）、今は未接続の
// 参加者の中から、predicate に一致する人を探す。
function findDisconnectedEventPlayer(predicate, excludeId) {
  if (!gs.event.active) return null;
  return Object.keys(gs.players).find(id =>
    id !== excludeId && !gs.players[id].isBot && gs.players[id].joined === false &&
    predicate(gs.players[id]) &&
    (gs.event.participantIds.has(id) || gs.event.mainPool.has(id) || gs.event.revivalCandidates.has(id))
  ) || null;
}
// 同じ名前（学年・コースのタグ込み）で再接続してきた場合の簡易な復帰（ブラウザにトークンが
// 保存されていない場合のフォールバック。set_name から呼ばれる）。
function reclaimDisconnectedEventPlayer(newId, composedName) {
  const oldId = findDisconnectedEventPlayer(p => p.name === composedName, newId);
  if (!oldId) return false;
  transferEventIdentity(oldId, newId);
  logEvent('event_reclaim', { oldId, newId, name: composedName });
  return true;
}
// ブラウザに保存されたトークンが一致する場合の自動復帰（rejoin_token から呼ばれる）。
// 名前の入力すら不要で、ページを開き直すだけで元の参加者に戻れる。
function reclaimDisconnectedEventPlayerByToken(newId, token) {
  const oldId = findDisconnectedEventPlayer(p => p.sessionToken && p.sessionToken === token, newId);
  if (!oldId) return false;
  transferEventIdentity(oldId, newId);
  logEvent('event_reclaim_token', { oldId, newId, name: gs.players[newId].name });
  return true;
}

// ── Socket.io ─────────────────────────────────────────────
io.on('connection', socket => {
  socket.emit('pause_state', pauseSnapshot());
  const color = COLORS[colorIdx++ % COLORS.length];
  gs.players[socket.id] = { name: `プレイヤー${Object.keys(gs.players).filter(id => !gs.players[id].isBot).length + 1}`, color, score: 0, bonus: 0, cards: 0, misses: 0, joined: false };

  sendInitTo(socket);

  socket.broadcast.emit('player_joined', { id: socket.id, player: gs.players[socket.id], players: gs.players });


  // ── 観戦画面のリアクション／チャット ─────────────────────────
  // 観戦者（大会モードで今の試合に出ていない人）だけが送れて、観戦者だけに届く。
  // 対局中の画面には出さない。
  const REACTIONS = ['👏', '🔥', '😲', '😆', '😭', '🎉', '💪', '❤️'];
  let lastChatAt = 0;
  socket.on('spectator_reaction', ({ emoji } = {}) => {
    if (!isSpectatorSocket(socket.id) || !REACTIONS.includes(emoji)) return;
    const p = gs.players[socket.id];
    emitToSpectators('spectator_reaction', { emoji, name: p.name, color: p.color });
    logEvent('reaction', { id: socket.id, name: p.name, emoji });
  });
  socket.on('spectator_chat', ({ text } = {}) => {
    if (!isSpectatorSocket(socket.id)) return;
    const raw = String(text == null ? '' : text).replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
    if (!raw) return;
    const now = Date.now();
    if (now - lastChatAt < 1500) { socket.emit('chat_rejected', { reason: 'rate', message: '送信が早すぎます。少し待ってください' }); return; }
    lastChatAt = now;
    const p = gs.players[socket.id];
    if (isInappropriate(raw)) {
      socket.emit('chat_rejected', { reason: 'ng', message: 'このメッセージは不適切な内容が含まれています' });
      logEvent('chat_blocked', { id: socket.id, name: p.name, text: raw });
      return;
    }
    emitToSpectators('spectator_chat', { name: p.name, color: p.color, text: raw, id: socket.id });
    logEvent('chat', { id: socket.id, name: p.name, text: raw });
  });

  // ── Clock sync ───────────────────────────────────────────
  socket.on('time_sync', ({ t1 }) => {
    socket.emit('time_sync', { t1, t2: hiResNow() });
  });

  // ── Set name ─────────────────────────────────────────────
  // payload は { name, grade, course }（ハウス編成に使用）。
  // 文字列のみで届いた場合（旧形式）もフォールバックする。
  socket.on('set_name', payload => {
    const isObj = payload && typeof payload === 'object';
    const rawName = isObj ? payload.name : payload;
    const n = String(rawName).trim().slice(0, 15);
    if (n && gs.players[socket.id]) {
      const me = gs.players[socket.id];
      if (isObj) {
        if (payload.grade)  me.grade  = String(payload.grade);
        if (payload.course) me.course = String(payload.course);
      }
      const tag = gradeCourseTag(me.grade, me.course);
      const composedName = tag ? tag + '　' + n : n;   // 画面にはこの名前（学年・コース付き）を出す
      const token = isObj && typeof payload.token === 'string' ? payload.token.slice(0, 100) : null;
      // 大会モード中、間違えてページを閉じた・ブラウザバックした等で切断していた参加者が
      // 同じ名前で再接続してきたら、観戦者としてではなく元の参加者として復帰させる
      // （保存されたトークンでの自動復帰は rejoin_token が先に試みるため、ここは
      // トークンがない・一致しない場合のフォールバック）。
      const reclaimed = reclaimDisconnectedEventPlayer(socket.id, composedName);
      if (!reclaimed) {
        me.joined  = true;
        me.rawName = n;
        me.tag     = tag;
        me.name    = composedName;
      }
      // 次回はトークンだけで自動復帰できるよう、今のブラウザのトークンを紐付けておく
      if (token) gs.players[socket.id].sessionToken = token;
      voiceEngine.request('zunda', VD.nameSeg(n).text, 'dj');   // DJ が呼ぶ「○○さん」の音声を先に作っておく
      logEvent('join', { id: socket.id, name: gs.players[socket.id].name, grade: gs.players[socket.id].grade || null, course: gs.players[socket.id].course || null, reclaimed });
      const becameHost = !gs.hostId && isHostEligible(socket);
      if (becameHost) gs.hostId = socket.id;
      io.emit('players_updated', gs.players);
      if (becameHost) io.emit('host_changed', { hostId: gs.hostId });
      // 復帰できた場合、大会モードの参加者状態が変わっているので、この接続にだけ最新状態を
      // 送り直す（観戦者扱いのままにならないようにする）。
      if (reclaimed) sendInitTo(socket);
    }
  });

  // ── ブラウザに保存されたトークンでの自動復帰（名前入力の前に試す）──────
  // ページを開き直しただけで、同じブラウザなら名前を入力し直さずに元の参加者へ戻れる。
  // 一致しなければ ack({success:false}) を返し、クライアントは通常の名前入力画面に進む。
  socket.on('rejoin_token', (payload, ack) => {
    const token = payload && typeof payload.token === 'string' ? payload.token.slice(0, 100) : null;
    if (typeof ack !== 'function') return;
    if (!token) { ack({ success: false }); return; }
    const reclaimed = reclaimDisconnectedEventPlayerByToken(socket.id, token);
    if (!reclaimed) { ack({ success: false }); return; }
    voiceEngine.request('zunda', VD.nameSeg(gs.players[socket.id].rawName || '').text, 'dj');
    logEvent('join', { id: socket.id, name: gs.players[socket.id].name, reclaimed: true, viaToken: true });
    io.emit('players_updated', gs.players);
    sendInitTo(socket);
    ack({ success: true });
  });

  // ── ハウス編成（サーバーPCのみ・大会モード）─────────────────
  // 学年×コースの各グループを出席者だけでシャッフルし、4ハウスへ
  // スネークドラフト（グループごとに開始ハウスを1つずつローテーション）で
  // 均等配分する。出欠が変わった場合は何度でも再実行できる。
  socket.on('assign_houses', () => {
    if (!isHostEligible(socket) || !isJoinedHuman(socket.id) || gs.phase !== 'lobby') return;
    setHost(socket.id);   // ハウス編成は進行役（サーバーPC）を除いた参加者で行う
    gs.houses = assignHouses();
    io.emit('houses_assigned', { houses: gs.houses, players: gs.players });
  });

  // ── Start game（参加登録済みの誰でも。先に押した人の設定が全員に適用される）──
  socket.on('start_game', (opts) => {
    if (gs.phase !== 'lobby' || !isJoinedHuman(socket.id)) return;
    // 開始した人が読み上げの進行役（次の札の読み上げ通知を出す端末）になる
    setHost(socket.id);
    const cpuDiff = opts && opts.cpuDifficulty;
    gs.difficulty     = 'normal';   // 難易度ボタンは廃止。札のレベルは試合ごとに A→B→C→D と上がる
    gs.cpuDifficulty  = ['easy', 'normal', 'hard'].includes(cpuDiff) ? cpuDiff : 'normal';

    // トーナメント状態をフルリセット
    gs.round               = 1;
    gs.eliminatedPlayers   = new Set();
    gs.lastRoundResult     = null;
    gs.isGroupMatch        = false;
    gs.groupTier           = null;
    gs.humanGroups         = null;
    gs.groupParticipantIds = new Set();
    gs.cumulativeScores    = {};
    gs.postTournament      = false;
    gs.bottomGroupWinners  = null;
    gs.middleGroupWinners  = null;
    gs.groupMatchScores    = {};
    Object.values(gs.players).forEach(p => {
      p.score = 0; p.bonus = 0; p.cards = 0; p.misses = 0; p.isEliminated = false;
    });

    // 実機ボットテスト（?bot=host の「ゲームスタート」）はCPUを混ぜず、実機だけで負荷をかける
    if (!(opts && opts.noCpu)) addCpuPlayersForPractice(PRACTICE_MOCK_TOTAL_TARGET);
    const { humanCount, cpuCount, totalCount } = computeHeadcount();
    gs.survivorCount = Math.min(PRACTICE_MOCK_SURVIVOR_SCHEDULE[0], totalCount);

    const roundCardIds = buildPracticeCardIds();
    const roundCards   = KARUTA.filter(k => roundCardIds.includes(k.id));
    gs.phase          = 'memorizing';
    gs.remaining      = new Set(roundCardIds);
    gs.cardOrder      = roundCardIds;
    gs.memorizeEndsAt = Date.now() + memoSeconds() * 1000;
  gs.layout = LAYOUT.generateLayout(gs.cardOrder);

    io.emit('memorize_start', {
      layout:        gs.layout,
      cardOrder:     gs.cardOrder,
      cards:         roundCards,
      players:       gs.players,
      endsAt:        gs.memorizeEndsAt,
      difficulty:    gs.difficulty,
      round:         gs.round,
      maxRounds:     gs.maxRounds,
      survivorCount: gs.survivorCount,
      humanCount, cpuCount, totalCount,
    });
    armMemorize();
  });

  // 札を取ったあとの音声の先読みが終わった端末からの報告（全員分が揃うと announce_go を配る）
  socket.on('announce_ready', ({ seq } = {}) => {
    if (!announceWait || announceWait.seq !== seq) return;
    announceWait.need.delete(socket.id);
    announceWait.check();
  });
  // 試合開始時のテスト音声（今からテスト音声を流します → テスト音 → 終了です。ゲームを始めます）。
  // 進行役（ホスト）が最初の読み上げの前に1回だけ要求し、全員に同じ開始時刻を配る。
  socket.on('sound_check_start', (opt) => {
    if (!gs.event.active && !(opt && opt.bot === true)) return;   // テスト音声は大会モードとボットモード(?bot)のみ（通常の練習モードでは流さない）
    if (socket.id !== gs.hostId || gs.phase !== 'waiting' || gs.ready.active) { socket.emit('sound_check_denied'); return; }   // 準備待ち中など：後(ready_release)でやり直してもらう
    io.emit('sound_check', { playAt: hiResNow() + 1500 });
  });

  // ── 実機ボットのクリック方式（ランダム／同時）。?bot=host の画面から切り替える ──
  socket.emit('bot_click', botClick);
  socket.on('set_bot_click', cfg => {
    if (!cfg || typeof cfg !== 'object' || !isJoinedHuman(socket.id)) return;
    const n = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
    botClick = {
      mode:     cfg.mode === 'sync' ? 'sync' : 'random',
      delayMs:  n(cfg.delayMs, 0, 9000, botClick.delayMs),
      spreadMs: n(cfg.spreadMs, 0, 2000, botClick.spreadMs),
    };
    io.emit('bot_click', botClick);
  });

  // ── 実機ボットテストの通信・スペック自己申告（?bot=N/?bot=host のみ送信）────
  socket.on('bot_metrics', data => {
    if (!data || typeof data !== 'object') return;
    const p = gs.players[socket.id];
    const entry = {
      id: socket.id,
      name: (p && p.name) || null,
      rttMs:        typeof data.rttMs === 'number' ? Math.round(data.rttMs) : null,
      transport:    typeof data.transport === 'string' ? data.transport.slice(0, 20) : null,
      reconnects:   Number.isFinite(data.reconnects) ? data.reconnects : 0,
      hwConcurrency: Number.isFinite(data.hwConcurrency) ? data.hwConcurrency : null,
      deviceMemory:  Number.isFinite(data.deviceMemory) ? data.deviceMemory : null,
      ua:           typeof data.ua === 'string' ? data.ua.slice(0, 60) : null,
      audioAvgMs:   typeof data.audioAvgMs === 'number' ? Math.round(data.audioAvgMs) : null,
      updatedAt:    Date.now(),
    };
    botMetrics.set(socket.id, entry);
    botMetricsDirty = true;
    botMetricsLog('bot_metrics', entry);
  });

  // ── Skip memorization（ホストのみ・デバッグ用）───────────
  socket.on('skip_memorize', () => {
    if (gs.phase !== 'memorizing' || !canUseDebug(socket)) return;
    // 練習モードも大会モードと同じく、音声の準備を待たずにスキップできる（足りない音声は再生時に各端末が取得する）
    startPlayingWhenVoiceReady();   // サーバー側の音声生成が済んでいなければ、その完了まで待ってから始める（無音のまま始めない）
  });

  // ── Read next card（ホストのみ）──────────────────────────
  socket.on('read_next', () => {
    if (gs.phase !== 'waiting' || socket.id !== gs.hostId || !gs.currentCard) return;
    if (gs.ready.active) return;   // 全員の仮想カーソルの準備待ち（ready_release で再開される）
    // 緊急停止：次の札を読み上げようとするこの段階（直前の音声が全部終わった後）で中断する
    if (pauseState.active) return;
    if (pauseState.requested) { activatePause(); return; }
    // 最後の1枚になったら、本物の札を読む前に最低でもレベルに応じた回数（A=3〜D=6）ダミー読みを連発する
    if (gs.remaining.size === 1) {
      if (gs.finalDecoyLeft === null) gs.finalDecoyLeft = FINAL_DECOYS[LEVELS[gs.matchLevel]] || 3;
      if (gs.finalDecoyLeft > 0) {
        gs.finalDecoyLeft--;
        startDecoyRead();
        return;
      }
    }
    const chance = getDecoyChance();
    if (chance > 0 && Math.random() < chance) {
      startDecoyRead();
    } else {
      startRealRead();
    }
  });

  // ── Decoy finished（ホスト端末からのダミー読み再生完了通知）─
  // ダミーの読み（yomi）を再生し終えたタイミングで受信する（「これは盤面にない札でした」は
  // この後の「そこまで」からの発表シーケンスで読まれる、ここにはまだ含まれない）。
  // ここから、本物の札と同じ TOTAL_READ_CYCLE_MS のルールで残り時間だけ待ってから
  // 「そこまで」を発し次の札へ。
  socket.on('decoy_finished', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'decoy') return;
    if (decoyTimer) { clearTimeout(decoyTimer); decoyTimer = null; }
    logEvent('read_end', { kind: 'decoy', readDurationMs: Math.round(hiResNow() - gs.readStartAt) });
    armDecoyTimeout();
  });

  // ── Yomi finished（ホスト端末からの上の句読み上げ完了通知）─
  // これを受け取った時点から制限時間と CPU タイマーを起動する。
  socket.on('yomi_finished', ({ cardId }) => {
    if (socket.id !== gs.hostId || gs.phase !== 'reading') return;
    if (!gs.currentCard || gs.currentCard.id !== cardId) return;
    finishReadPhase(gs.currentCard);
  });

  // ── Announce finished（ホスト端末からの結果発表の音声終了通知）─
  // そこまで→DJ→答え合わせ（または そこまで→答え合わせ）の音声がホスト端末で全て鳴り終わった
  // ときに届く。これを待ってから次の札へ進む（届かない場合は ANNOUNCE_FALLBACK_MS の保険で進む）。
  // durations があれば、各音声の間の空き時間（記録用）をログに残す。
  socket.on('announce_finished', (payload) => {
    if (socket.id !== gs.hostId) return;
    if (payload && typeof payload === 'object' && payload.durations) {
      logEvent('announce_durations', payload.durations);
    }
    if (!pendingAnnounceAdvance) return;
    if (announceAdvanceTimer) { clearTimeout(announceAdvanceTimer); announceAdvanceTimer = null; }
    const f = pendingAnnounceAdvance;
    pendingAnnounceAdvance = null;
    f();
  });

  // ── Grab card ────────────────────────────────────────────
  // payload は { cardId, t, offsetMm, distMm }
  //  t: サーバー時計に補正済みのクリック時刻
  //  offsetMm: 札の中心からクリック位置までの距離(mm) / distMm: 定位置(円)の中心から札の中心までの距離(mm)
  socket.on('grab_card', payload => {
    const isObj     = payload && typeof payload === 'object';
    const cardId    = isObj ? payload.cardId : payload;
    const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, v)) : d;
    const offset    = isObj ? num(payload.offsetMm, 0, 200, ACC_FULL_MM) : ACC_FULL_MM;
    const dist      = isObj ? num(payload.distMm, 0, 600, FAR_MM * 0.5) : FAR_MM * 0.5;
    // クリック時刻は端末の時計を信用しすぎない（受信時刻より未来にならず、2秒より前にもならない）
    const arriveNow = hiResNow();
    const clientT   = (isObj && typeof payload.t === 'number' && isFinite(payload.t))
      ? Math.max(arriveNow - 2000, Math.min(arriveNow, payload.t)) : null;

    if (!canParticipate(socket.id)) return;

    // 「読み上げます」の発声が始まるまでは、札を取れない（クリックしても何も起きず、お手付きにもならない）。
    // 開始時刻はホスト端末の報告(intro_started)。端末ごとの発声開始のずれ分(INTRO_GRACE_MS)だけ余裕を見る。
    if ((gs.phase === 'reading' || gs.phase === 'decoy') && arriveNow < gs.readStartAt - INTRO_GRACE_MS) {
      logEvent('grab_ignored', { player: socket.id, name: gs.players[socket.id].name, reason: 'before_intro', cardId, phase: gs.phase,
        earlyByMs: Math.round(gs.readStartAt - arriveNow) });
      socket.emit('grab_too_early');
      return;
    }

    // お手付きをした人は、次の札が読み上げられるまで取れない
    // （手当たり次第にクリックして札を取られるのを防ぐため）。
    if (gs.lockedPlayers.has(socket.id)) {
      logEvent('grab_ignored', { player: socket.id, name: gs.players[socket.id].name, reason: 'locked', cardId, phase: gs.phase });
      if (gs.phase === 'reading' || gs.phase === 'decoy') socket.emit('grab_locked');
      return;
    }

    if (gs.phase === 'decoy') {
      // 減点はすぐに行うが、本人への「✕お手付き」表示とランキング上の点数変化は、今読んでいる
      // ダミーの「そこまで」と同時になるまで遅らせる（armDecoyTimeout 側でまとめて配信する）。
      const penalty = applyMiss(socket.id, cardId, 'decoy');
      gs.lockedPlayers.add(socket.id);
      gs.pendingDecoyMisses.push({ socketId: socket.id, clickedCardId: cardId, penalty });
      return;
    }

    if (gs.phase !== 'reading' || !gs.currentCard) {
      logEvent('grab_ignored', { player: socket.id, name: gs.players[socket.id].name, reason: 'not_reading', cardId, phase: gs.phase });
      return;
    }
    const player = gs.players[socket.id];

    // すでにこの札の勝者が決まっている（読み上げがまだ続いている間）→ 新しい受付は始めず、
    // 「クリックした人」の一覧に加えるだけ（勝敗にはもう関係しない。お手付きにもしない）。
    if (gs.pendingWinner && gs.pendingWinner.card.id === cardId) {
      if (gs.pendingWinner.contenders.some(c => c.id === socket.id)) return;   // 二重記録の防止
      const t = clientT !== null ? clientT : arriveNow;
      gs.pendingWinner.contenders.push(scoreCandidate({ id: socket.id, cardId, t, offsetMm: offset, distMm: dist }));
      logEvent('late_click', { player: socket.id, name: player.name, cardId, sinceReadStartMs: Math.round(t - gs.readStartAt) });
      return;
    }

    if (cardId === gs.currentCard.id && gs.remaining.has(cardId)) {
      // 即座に正解者を確定させず、短い受付時間の間だけ他の候補も集める。
      // 集まった候補は、まず時刻でグルーピングし、最速グループ内では
      // 札の中心により近かった人（precision）を優先して勝者を決める。
      const t = clientT !== null ? clientT : arriveNow;
      // 同じ人が受付時間内に連打しても、最初の1回だけを採点する
      if (gs.grabCandidates.some(c => c.id === socket.id)) return;
      addGrabCandidate({ id: socket.id, cardId, t, offsetMm: offset, distMm: dist }, 'human');
    } else if (gs.remaining.has(cardId)) {
      // 減点はすぐに行うが、本人への「✕お手付き」表示とランキング上の点数変化は、今読まれている
      // 札の「そこまで！」と同時になるまで遅らせる（結果が分かるタイミングを他の人と揃えるため。
      // players_updated は flushPendingMisses 側でまとめて配信する）。
      const penalty = applyMiss(socket.id, cardId, 'wrong_card', { expected: gs.currentCard.id });
      gs.lockedPlayers.add(socket.id);
      gs.pendingMisses.push({ activeCardId: gs.currentCard.id, clickedCardId: cardId, socketId: socket.id, penalty });
    }
  });

  // ── フライング ─────────────────────────────────────────────
  // 「読み上げます」の発声で全員のカーソルが定位置に戻され、上の句の1文字目が読まれる前に
  // 定位置の円から出てしまったらフライング。お手付きと同じ扱い（減点＋次の札まで取れない）。
  // 盤面整理中、進行役（教卓PC）が札を並べ替えた配置を全員に配る
  socket.on('set_layout', payload => {
    if (socket.id !== gs.hostId || gs.phase !== 'memorizing' || !gs.cardOrder.length) return;
    const clean = LAYOUT.sanitizeLayout(payload && payload.layout, gs.cardOrder);
    if (!clean) return;
    gs.layout = clean;
    io.emit('layout', { layout: clean, by: socket.id });
  });

  // ホスト端末が「読み上げます」の発声を始めた時刻（速度ポイントの基準）
  socket.on('intro_started', ({ t } = {}) => {
    if (socket.id !== gs.hostId || (gs.phase !== 'reading' && gs.phase !== 'decoy')) return;
    if (typeof t !== 'number' || !isFinite(t)) return;
    const now = hiResNow();
    gs.readStartAt = Math.max(now - 15000, Math.min(now, t));
    logEvent('intro_start', { readStartAt: Math.round(gs.readStartAt) });
  });

  // 仮想カーソルに移った（Pointer Lock 成立、または使えず通常カーソルで遊ぶ）ことの通知
  socket.on('cursor_ready', () => markReady(socket.id));

  socket.on('flying', () => {
    if (!canParticipate(socket.id)) return;
    if (gs.phase !== 'reading' && gs.phase !== 'decoy') return;
    if (gs.lockedPlayers.has(socket.id)) return;
    const penalty = applyMiss(socket.id, gs.currentCard ? gs.currentCard.id : null, 'flying');
    gs.lockedPlayers.add(socket.id);
    socket.emit('flying_penalty', { penalty });
    io.emit('players_updated', gs.players);
  });

  // ── Debug: 即ゲーム終了（ホストのみ）─────────────────────
  socket.on('debug_end_game', () => {
    if (!canUseDebug(socket)) return;
    if (!['waiting', 'reading', 'decoy', 'announcing'].includes(gs.phase)) return;
    clearAllTimers();
    endRound();
  });

  // ── Debug: CPUにランダムポイントを付与（ホストのみ）───────
  socket.on('debug_cpu_points', () => {
    if (!canUseDebug(socket)) return;
    CPU_IDS.forEach(id => {
      if (gs.players[id]) {
        gs.players[id].score = 100 + Math.floor(Math.random() * 2901);   // 100〜3000点
        gs.players[id].cards = Math.floor(Math.random() * 7);
      }
    });
    io.emit('players_updated', gs.players);
  });

  // ── 次の試合を開始（参加登録済みの誰でも）─────────────────────────
  socket.on('start_next_round', () => {
    if (!isJoinedHuman(socket.id) || gs.event.active || gs.phase !== 'round_finished') return;
    setHost(socket.id);   // 次の試合を始めた人が進行役になる

    // スコアリセット前に累積スコアへ加算
    Object.entries(gs.players)
      .filter(([, p]) => !p.isBot && p.joined)
      .forEach(([id, p]) => {
        gs.cumulativeScores[id] = (gs.cumulativeScores[id] || 0) + p.score;
      });

    gs.round++;
    gs.isRevival       = false;
    gs.lastRoundResult = null;

    removeCpuPlayers();

    const roundCardIds = buildPracticeCardIds();
    const roundCards   = KARUTA.filter(k => roundCardIds.includes(k.id));
    gs.remaining      = new Set(roundCardIds);
    gs.cardOrder      = roundCardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;

    Object.values(gs.players).forEach(p => { p.score = 0; p.bonus = 0; p.cards = 0; p.misses = 0; });

    // 敗退なし：1回戦と同じ人数規模（80人）で毎試合行う
    addCpuPlayersForPractice(PRACTICE_MOCK_TOTAL_TARGET);
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ excludeEliminated: true });
    // （通過人数は練習モードでは使わない。以前の絞り込み設定の名残り）
    gs.survivorCount = (gs.round >= gs.maxRounds)
      ? 3
      : Math.min(PRACTICE_MOCK_SURVIVOR_SCHEDULE[gs.round - 1] ?? eventCutCounts(totalCount).pass, totalCount);

    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + memoSeconds() * 1000;
  gs.layout = LAYOUT.generateLayout(gs.cardOrder);

    io.emit('memorize_start', {
      layout:        gs.layout,
      cardOrder:     gs.cardOrder,
      cards:         roundCards,
      players:       gs.players,
      endsAt:        gs.memorizeEndsAt,
      difficulty:    gs.difficulty,
      round:         gs.round,
      maxRounds:     gs.maxRounds,
      survivorCount: gs.survivorCount,
      isRevival:     false,
      humanCount, cpuCount, totalCount,
    });
    armMemorize();
  });

  // ── 敗者復活戦を開始（ホストのみ）———任意ユーザー選択対応
  socket.on('start_revival', ({ selectedIds } = {}) => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished') return;

    const allEliminated = Object.entries(gs.players)
      .filter(([id, p]) => gs.eliminatedPlayers.has(id) && !p.isBot && p.joined)
      .map(([id]) => id);
    if (allEliminated.length === 0) return;

    const participants = (selectedIds && selectedIds.length > 0)
      ? allEliminated.filter(id => selectedIds.includes(id))
      : allEliminated;
    if (participants.length === 0) return;

    // 復活戦トーナメント初期化
    // 通過人数は自動算出（中間ラウンドの通過比率・ラウンド数は管理画面の設定に従う。
    // 最終ラウンドの本戦復帰は約1/3のまま）。
    gs.isRevival            = true;
    gs.revivalRound         = 1;
    gs.revivalMaxRounds     = gs.eventConfig.revivalMaxRounds;
    gs.revivalSurvivorCount = Math.max(1, Math.ceil(participants.length * gs.eventConfig.revivalCutRatio));
    gs.revivalCount         = eventCutCounts(participants.length).pass;
    gs.revivalEliminated    = new Set();
    gs.lastRoundResult      = null;

    removeCpuPlayers();
    participants.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].bonus = 0; gs.players[id].cards = 0; gs.players[id].misses = 0; }
    });
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: new Set(participants) });

    const revivalCardIds = buildDifficultyOrderedCardIds();
    const revivalCards   = KARUTA.filter(k => revivalCardIds.includes(k.id));
    gs.remaining      = new Set(revivalCardIds);
    gs.cardOrder      = revivalCardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;

    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + memoSeconds() * 1000;
  gs.layout = LAYOUT.generateLayout(gs.cardOrder);

    io.emit('memorize_start', {
      layout:        gs.layout,
      cardOrder:           gs.cardOrder,
      cards:               revivalCards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      survivorCount:       gs.revivalSurvivorCount,
      isRevival:           true,
      revivalCount:        gs.revivalCount,
      revivalRound:        gs.revivalRound,
      revivalMaxRounds:    gs.revivalMaxRounds,
      revivalSurvivorCount: gs.revivalSurvivorCount,
      humanCount, cpuCount, totalCount,
    });
    armMemorize();
  });

  // ── 次の復活戦ラウンドを開始（ホストのみ）─────────────────
  socket.on('start_next_revival_round', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished' || !gs.isRevival) return;

    gs.revivalRound++;
    gs.lastRoundResult = null;

    removeCpuPlayers();

    // アクティブな復活戦参加者のスコアをリセット
    const activeRevivalIds = Object.entries(gs.players)
      .filter(([id, p]) => gs.eliminatedPlayers.has(id) && !gs.revivalEliminated.has(id) && !p.isBot && p.joined)
      .map(([id]) => id);
    activeRevivalIds.forEach(id => { gs.players[id].score = 0; gs.players[id].bonus = 0; gs.players[id].cards = 0; gs.players[id].misses = 0; });
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: new Set(activeRevivalIds) });
    // 通過人数は自動算出（このラウンドが最終ラウンドなら本戦復帰人数として使う）
    gs.revivalSurvivorCount = Math.max(1, Math.ceil(activeRevivalIds.length * gs.eventConfig.revivalCutRatio));
    gs.revivalCount         = eventCutCounts(activeRevivalIds.length).pass;

    const cardIds = buildDifficultyOrderedCardIds();
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = cardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + memoSeconds() * 1000;
  gs.layout = LAYOUT.generateLayout(gs.cardOrder);

    io.emit('memorize_start', {
      layout:        gs.layout,
      cardOrder:           gs.cardOrder,
      cards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      survivorCount:       gs.revivalSurvivorCount,
      isRevival:           true,
      revivalCount:        gs.revivalCount,
      revivalRound:        gs.revivalRound,
      revivalMaxRounds:    gs.revivalMaxRounds,
      revivalSurvivorCount: gs.revivalSurvivorCount,
      humanCount, cpuCount, totalCount,
    });
    armMemorize();
  });

  // ── グループ戦を開始（ホストのみ、最終試合後またはロビーから）──────────────
  socket.on('start_group_match', ({ tier }) => {
    if (socket.id !== gs.hostId) return;
    if (gs.phase !== 'round_finished' && gs.phase !== 'lobby') return;
    if (!['top', 'middle', 'bottom'].includes(tier)) return;
    if (!gs.humanGroups) return;
    // 中位グループ戦は下位グループ戦完了後のみ
    if (tier === 'middle' && gs.bottomGroupWinners === null) return;
    // 上位グループ戦は下位・中位両方完了後のみ
    if (tier === 'top' && (gs.bottomGroupWinners === null || gs.middleGroupWinners === null)) return;

    gs.isGroupMatch        = true;
    gs.groupTier           = tier;
    gs.groupRound          = 1;
    gs.groupMaxRounds      = 3;
    gs.groupEliminated     = new Set();
    gs.lastRoundResult     = null;

    removeCpuPlayers();

    // グループ内人間プレイヤーのスコアリセット
    let humanIds = gs.humanGroups[tier] || [];

    // 上位グループには昇格した人間プレイヤーを追加
    if (tier === 'top') {
      const promoted = new Set(humanIds);
      if (gs.bottomGroupWinners) gs.bottomGroupWinners.forEach(id => promoted.add(id));
      if (gs.middleGroupWinners) gs.middleGroupWinners.forEach(id => promoted.add(id));
      humanIds = [...promoted];
    }
    humanIds.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].bonus = 0; gs.players[id].cards = 0; gs.players[id].misses = 0; }
    });

    // ティアCPU IDを設定して追加
    const tierCpuIds = tier === 'top'    ? CPU_TIER_TOP
                     : tier === 'middle' ? CPU_TIER_MIDDLE : CPU_TIER_BOTTOM;
    gs.groupParticipantIds = new Set([...humanIds, ...tierCpuIds]);
    addGroupCpuPlayers();
    const { cpuCount: groupCpuCount } = computeHeadcount({ participantIds: gs.groupParticipantIds });
    gs.groupSurvivorCount = eventCutCounts(gs.groupParticipantIds.size).pass;

    const cardIds = buildDifficultyOrderedCardIds();
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = cardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + memoSeconds() * 1000;
  gs.layout = LAYOUT.generateLayout(gs.cardOrder);

    const tierLabel = tier === 'top' ? '上位' : tier === 'middle' ? '中位' : '下位';
    const humanCount = humanIds.length;
    io.emit('memorize_start', {
      layout:        gs.layout,
      cardOrder:           gs.cardOrder,
      cards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      isGroupMatch:        true,
      groupTier:           tier,
      groupTierLabel:      tierLabel,
      groupHumanCount:     humanCount,
      humanGroups:         gs.humanGroups,
      groupParticipantIds: [...gs.groupParticipantIds],
      groupRound:          gs.groupRound,
      groupMaxRounds:      gs.groupMaxRounds,
      groupSurvivorCount:  gs.groupSurvivorCount,
      humanCount,
      cpuCount:            groupCpuCount,
      totalCount:          humanCount + groupCpuCount,
    });
    armMemorize();
  });

  // ── グループ戦次ラウンド開始（ホストのみ）───────────────────
  socket.on('start_next_group_round', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished' || !gs.isGroupMatch) return;

    gs.groupRound++;
    gs.lastRoundResult = null;

    removeCpuPlayers();

    // アクティブな人間参加者のスコアをリセット
    const tierCpuIds = gs.groupTier === 'top' ? CPU_TIER_TOP
                     : gs.groupTier === 'middle' ? CPU_TIER_MIDDLE : CPU_TIER_BOTTOM;
    const activeHumanIds = [...gs.groupParticipantIds]
      .filter(id => gs.players[id] && !gs.players[id].isBot && !gs.groupEliminated.has(id));
    activeHumanIds.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].bonus = 0; gs.players[id].cards = 0; gs.players[id].misses = 0; }
    });
    gs.groupParticipantIds = new Set([...activeHumanIds, ...tierCpuIds]);
    addGroupCpuPlayers();
    const { cpuCount: groupCpuCount } = computeHeadcount({ participantIds: gs.groupParticipantIds });
    gs.groupSurvivorCount = eventCutCounts(gs.groupParticipantIds.size).pass;

    const cardIds = buildDifficultyOrderedCardIds();
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = cardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + memoSeconds() * 1000;
  gs.layout = LAYOUT.generateLayout(gs.cardOrder);

    const tierLabel   = gs.groupTier === 'top' ? '上位' : gs.groupTier === 'middle' ? '中位' : '下位';
    io.emit('memorize_start', {
      layout:        gs.layout,
      cardOrder:           gs.cardOrder,
      cards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      isGroupMatch:        true,
      groupTier:           gs.groupTier,
      groupTierLabel:      tierLabel,
      groupHumanCount:     activeHumanIds.length,
      humanGroups:         gs.humanGroups,
      groupParticipantIds: [...gs.groupParticipantIds],
      groupRound:          gs.groupRound,
      groupMaxRounds:      gs.groupMaxRounds,
      groupSurvivorCount:  gs.groupSurvivorCount,
      humanCount:          activeHumanIds.length,
      cpuCount:            groupCpuCount,
      totalCount:          activeHumanIds.length + groupCpuCount,
    });
    armMemorize();
  });



  // ── 管理画面：接続時に、教卓PCかどうか・現在の設定値をまとめて返す ──
  socket.on('join_admin', () => {
    socket.emit('admin_init', {
      isHost:      isHostEligible(socket),
      supervised:  process.env.KARUTA_SUPERVISED === '1',
      runMode:     serverRunMode(),
      pause:       pauseSnapshot(),
      phase:       gs.phase,
      eventActive: gs.event.active,
      eventConfig: gs.eventConfig,
      schedule:    gs.schedule,
      scheduleLog: gs.scheduleLog,
    });
  });

  // ── 管理画面：サーバーの停止・再起動（教卓PCのみ）──
  // launcher.js（起動.bat）から起動している場合だけ、停止後に画面から起動し直せる／再起動できる。
  // 進行中の試合・大会の状態はメモリ上にあるため、停止・再起動で失われる。
  socket.on('server_control', (action) => {
    if (!isHostEligible(socket)) return;
    if (action !== 'stop' && action !== 'restart') return;
    const mode = serverRunMode();
    logEvent('server_control', { action, mode });
    io.emit('server_going_down', { action, mode });
    setTimeout(() => {
      if (action === 'stop') process.exit(0);
      // 再起動：launcher・systemd は終了コード75で再起動してもらう。単独起動（node server.js）は
      // 自分で新しいプロセスを起動し直す（新プロセスは、ポートが空くまで待つ）。
      if (mode === 'standalone') {
        try {
          require('child_process').spawn(process.execPath, [path.join(__dirname, 'server.js')], {
            cwd: __dirname, detached: true, stdio: 'ignore', env: { ...process.env, KARUTA_RESPAWN: '1' },
          }).unref();
        } catch (e) { logEvent('server_respawn_fail', { error: String(e && e.message) }); }
        process.exit(0);
      }
      process.exit(75);
    }, 400);
  });

  // ── 管理画面：緊急停止・再開（教卓PCのみ）──
  socket.on('admin_pause', () => {
    if (!isHostEligible(socket)) { logEvent('admin_pause_denied', { id: socket.id }); socket.emit('server_control_result', { ok: false, msg: '教卓PC（アドレスに ?host を付けて開いたブラウザ）からのみ操作できます。' }); return; }
    if (pauseState.active || pauseState.requested) return;
    if (pauseState.timer) { clearTimeout(pauseState.timer); pauseState.timer = null; }
    logEvent('pause_request', { phase: gs.phase });
    // 音声が鳴っていない場面（ロビー・試合結果）はすぐ止める。進行中の試合は、音声が終わって
    // 次の札を読もうとした時点（read_next）で止まる。
    if (gs.phase === 'lobby' || gs.phase === 'round_finished') { pauseState.requested = true; activatePause(); return; }
    pauseState.requested = true;
    broadcastPause();
  });
  socket.on('admin_resume', () => {
    if (!isHostEligible(socket)) { logEvent('admin_resume_denied', { id: socket.id }); socket.emit('server_control_result', { ok: false, msg: '教卓PC（アドレスに ?host を付けて開いたブラウザ）からのみ操作できます。' }); return; }
    if (pauseState.requested && !pauseState.active) { pauseState.requested = false; broadcastPause(); return; }   // まだ止まる前なら取り消すだけ
    if (!pauseState.active || pauseState.resumeAt) return;
    pauseState.resumeAt = Date.now() + PAUSE_RESUME_DELAY_MS;
    logEvent('pause_resume_countdown', { resumeAt: pauseState.resumeAt });
    broadcastPause();
    pauseState.timer = setTimeout(() => {
      pauseState.timer = null;
      pauseState.active = false; pauseState.requested = false; pauseState.resumeAt = 0;
      logEvent('pause_resumed', { phase: gs.phase });
      broadcastPause();
      // 止めたとき読み上げ前で待っていた場合は、次の札の読み上げ待ちを出し直して再開させる
      if (gs.phase === 'waiting' && gs.currentCard) {
        io.emit('game_waiting', {
          remaining: [...gs.remaining], players: gs.players, hostId: gs.hostId, difficulty: gs.difficulty,
          round: gs.round, totalCards: gs.cardOrder.length || 10, isRevival: gs.isRevival,
        });
      }
    }, PAUSE_RESUME_DELAY_MS);
  });

  // ── 管理画面：大会モードの通過比率・復活戦ラウンド数の設定（教卓PCのみ・ロビー中のみ）──
  socket.on('set_event_config', (cfg) => {
    // 大会モード進行中でも当日の状況に応じて変更できるようにする（変更は次に
    // 始まる試合・敗者復活戦から反映される。今進行中の試合には影響しない）。
    if (!isHostEligible(socket)) return;
    if (!cfg || typeof cfg !== 'object') return;
    const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, v)) : d;
    gs.eventConfig = {
      mainCutRatio:     num(cfg.mainCutRatio, 0.1, 0.9, gs.eventConfig.mainCutRatio),
      mainMaxRounds:    Math.round(num(cfg.mainMaxRounds, 1, 20, gs.eventConfig.mainMaxRounds)),
      revivalMaxRounds: Math.round(num(cfg.revivalMaxRounds, 1, 10, gs.eventConfig.revivalMaxRounds)),
      revivalCutRatio:  num(cfg.revivalCutRatio, 0.1, 0.9, gs.eventConfig.revivalCutRatio),
      testCpuFill:      typeof cfg.testCpuFill === 'boolean' ? cfg.testCpuFill : gs.eventConfig.testCpuFill,
    };
    io.emit('event_config', gs.eventConfig);
  });

  // ── 管理画面：当日の進行スケジュール（予定・実際の開始記録）。教卓PCのみ ──
  socket.on('set_schedule', (schedule) => {
    if (!isHostEligible(socket)) return;
    if (!Array.isArray(schedule)) return;
    gs.schedule = schedule.slice(0, 60).map(row => ({
      id:        String(row && row.id || '').slice(0, 40) || Math.random().toString(36).slice(2),
      label:     String(row && row.label || '').slice(0, 60),
      plannedAt: String(row && row.plannedAt || '').slice(0, 10),
    }));
    io.emit('schedule_updated', { schedule: gs.schedule, scheduleLog: gs.scheduleLog });
  });
  socket.on('mark_schedule_started', ({ id } = {}) => {
    if (!isHostEligible(socket) || !id) return;
    if (!gs.schedule.some(row => row.id === id)) return;
    gs.scheduleLog[id] = Date.now();
    io.emit('schedule_updated', { schedule: gs.schedule, scheduleLog: gs.scheduleLog });
  });

  // ── 投影専用画面として接続（参加者登録は行わない。見るだけ）──
  socket.on('join_projector', () => {
    gs.projectorIds.add(socket.id);
    socket.emit('projector_init', {
      phase: gs.phase, currentCard: gs.currentCard, players: gs.players,
      round: gs.round, isEvent: gs.event.active, eventStage: gs.event.stage,
      eventRoundNumber: gs.event.stage === 'revival' ? gs.event.revivalRoundIndex : gs.event.mainRoundIndex,
      eventIsFinalMainRound: gs.event.isFinalMainRound,
      lastResult: gs.event.lastResult,
      schedule: gs.schedule, scheduleLog: gs.scheduleLog,
    });
  });

  // ── 負荷テスト（ホストのみ）──────────────────────────────
  // サーバー自身がボットを生成して負荷をかける。ロビーが空いているときだけ開始でき、
  // 実際の対局中に割り込んで参加者を混乱させないようにする。
  socket.on('join_load_test_monitor', () => {
    socket.emit('load_test_status', {
      ...loadTestRunner.status(),
      isHost: isHostEligible(socket),
      lobbyBusy: gs.phase !== 'lobby',
    });
  });
  socket.on('start_load_test', (opts) => {
    if (!isHostEligible(socket) || gs.phase !== 'lobby' || loadTestRunner.running) return;
    const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.round(Math.max(lo, Math.min(hi, v))) : d;
    const botCount   = num(opts && opts.botCount, 1, 300, 100);
    const durationMs = num(opts && opts.durationMinutes, 1, 60, 5) * 60 * 1000;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      loadtestLogStream = fs.createWriteStream(path.join(LOG_DIR, `loadtest-${stamp}-p${PORT}.jsonl`), { flags: 'a' });
    } catch (e) { console.warn('負荷テストのログファイルを作成できません:', e.message); }
    startLoadTestMetrics();
    loadTestRunner.start({ botCount, durationMs });
    io.emit('load_test_status', { ...loadTestRunner.status(), lobbyBusy: gs.phase !== 'lobby' });
  });
  socket.on('stop_load_test', () => {
    if (!isHostEligible(socket)) return;
    loadTestRunner.stop('manual');
  });
  // 負荷テストのボットからの往復確認。即座にackを返すだけ（応答速度の計測用）。
  socket.on('loadtest_ping', (_data, ack) => { if (typeof ack === 'function') ack(); });

  // ── 大会モードを開始（ホストのみ）─────────────────────────
  // その時点で参加登録済み（joined）の人間プレイヤー全員を対象に第1試合を開始する。
  socket.on('start_event', () => {
    // 断られた理由は必ず画面に返す（黙って無視すると、押したボタンが無効のまま残って「始まらない」ように見える）
    if (!isHostEligible(socket)) { socket.emit('event_start_denied', { reason: 'not_host' }); return; }
    if (!isJoinedHuman(socket.id)) { socket.emit('event_start_denied', { reason: 'not_joined' }); return; }
    if (gs.phase !== 'lobby') { socket.emit('event_start_denied', { reason: 'not_lobby' }); return; }
    setHost(socket.id);   // 大会モードの進行役はサーバーPC。参加者はそれ以外のロビーにいる全員
    removeCpuPlayers();   // 前の練習モード等から残ったCPUがいれば一旦クリアする
    let participantIds = Object.entries(gs.players)
      .filter(([id, p]) => id !== gs.hostId && !p.isBot && p.joined)
      .map(([id]) => id);
    if (gs.eventConfig.testCpuFill) {
      // テスト用：管理画面の「CPUで人数を補充する」がオンのときだけ、実参加者が
      // 0人でも少人数でも、CPUを足して本番の流れを体験できるようにする
      // （CPUの挙動は練習モードと共通）。既定はオフ＝本番は実参加者のみで開始する。
      gs.cpuDifficulty = 'normal';
      addCpuPlayersForPractice(PRACTICE_MOCK_TOTAL_TARGET);
      participantIds = Object.entries(gs.players)
        .filter(([id, p]) => id !== gs.hostId && (p.isBot || p.joined))
        .map(([id]) => id);
    }
    if (participantIds.length === 0) { socket.emit('event_start_denied', { reason: 'no_participants' }); return; }

    gs.event.active            = true;
    gs.event.mainPool          = new Set(participantIds);
    gs.event.revivalCandidates = new Set();
    gs.event.gamesPlayed       = {};
    gs.event.finalRanking      = [];
    gs.event.lastResult        = null;
    gs.event.mainRoundIndex    = 0;
    gs.event.revivalRoundIndex = 0;
    gs.event.isFinalMainRound  = false;
    setEventStage('main');

    startEventMatch(participantIds);
  });

  // ── 大会モードの次の試合へ進む（ホストのみ）───────────────
  // which: 'main'（本戦プールの続き）または 'revival'（敗者復活戦）。
  socket.on('advance_event', ({ which } = {}) => {
    if (socket.id !== gs.hostId || !gs.event.active || gs.phase !== 'round_finished') return;
    if (gs.event.stage === 'done') return;

    if (which === 'revival') {
      if (gs.event.revivalCandidates.size === 0) return;
      if (gs.event.revivalRoundIndex >= gs.eventConfig.revivalMaxRounds) return;   // 設定回数に達していたら不可
      const pool = [...gs.event.revivalCandidates];
      gs.event.revivalCandidates = new Set();
      setEventStage('revival');
      startEventMatch(pool);
      return;
    }

    if (gs.event.mainPool.size === 0) return;
    const pool = [...gs.event.mainPool];
    setEventStage('main');
    startEventMatch(pool);
  });

  // ── Back to lobby ────────────────────────────────────────
  socket.on('go_to_lobby', () => {
    if (['reading', 'decoy', 'announcing'].includes(gs.phase)) return;
    // 対局の途中（試合結果・ロビー以外）で中断できるのは進行役かサーバーPCだけ
    if (!['round_finished', 'lobby'].includes(gs.phase) && socket.id !== gs.hostId && !isHostEligible(socket)) return;
    clearAllTimers();
    removeCpuPlayers();

    gs.event.active            = false;
    gs.event.stage              = null;
    gs.event.mainPool           = new Set();
    gs.event.revivalCandidates  = new Set();
    gs.event.gamesPlayed        = {};
    gs.event.participantIds     = new Set();
    gs.event.mainRoundIndex     = 0;
    gs.event.revivalRoundIndex  = 0;
    gs.event.isFinalMainRound   = false;
    gs.event.passCount          = null;
    gs.event.finalRanking       = [];
    gs.event.lastResult         = null;

    gs.round               = 1;
    gs.survivorCount       = 3;
    gs.revivalCount        = 1;
    gs.isRevival           = false;
    gs.revivalRound        = 1;
    gs.revivalMaxRounds    = 3;
    gs.revivalSurvivorCount = 3;
    gs.revivalEliminated   = new Set();
    gs.isGroupMatch        = false;
    gs.groupTier           = null;
    gs.groupParticipantIds = new Set();
    gs.groupRound          = 1;
    gs.groupMaxRounds      = 3;
    gs.groupSurvivorCount  = 3;
    gs.groupEliminated     = new Set();
    gs.eliminatedPlayers   = new Set();
    gs.lastRoundResult     = null;
    Object.values(gs.players).forEach(p => { p.isEliminated = false; });

    gs.phase = 'lobby'; gs.currentCard = null;
    gs.remaining = new Set(LEVEL_IDS.A); gs.memorizeEndsAt = 0;
    setHost(findServerPcId());   // ロビーに戻ったら進行役は（いれば）サーバーPCに戻す
    io.emit('back_to_lobby', {
      players:             gs.players,
      postTournament:      gs.postTournament,
      humanGroups:         gs.humanGroups,
      bottomGroupWinners:  gs.bottomGroupWinners,
      middleGroupWinners:  gs.middleGroupWinners,
    });
  });

  // ── Disconnect ───────────────────────────────────────────
  socket.on('disconnect', () => {
    gs.projectorIds.delete(socket.id);
    if (botMetrics.delete(socket.id)) botMetricsDirty = true;
    logEvent('leave', { id: socket.id, name: gs.players[socket.id] && gs.players[socket.id].name });
    if (gs.ready.active) {
      gs.ready.need.delete(socket.id);
      if (gs.ready.done.size >= gs.ready.need.size) setTimeout(() => releaseReadyBarrier('all_ready'), 0);
    }
    const wasHost = socket.id === gs.hostId;
    // 大会モード進行中、今の大会に関わりがある人（今の試合の参加者・本戦待機中・敗者復活戦待機中）
    // は完全には削除せず、未接続のまま残す（得点を保持する）。同じ名前で再接続してきたとき、
    // reclaimDisconnectedEventPlayer で元の参加者として復帰できるようにするため。
    const hasEventStake = gs.event.active && gs.players[socket.id] && !gs.players[socket.id].isBot && (
      gs.event.participantIds.has(socket.id) || gs.event.mainPool.has(socket.id) || gs.event.revivalCandidates.has(socket.id)
    );
    if (hasEventStake) {
      gs.players[socket.id].joined = false;
    } else {
      delete gs.players[socket.id];
    }
    io.emit('player_left', { id: socket.id, players: gs.players });

    if (wasHost) {
      // 進行役が抜けたら、?host接続がいればそこへ引き継ぐ。
      // 大会モード中は、?host以外には絶対に進行役を渡さない（他の参加者が誤ってホスト扱いに
      // ならないように）。練習モードのみ、?host接続がいなければ対局中は他の参加者へ引き継ぐ
      // （ロビーで誰もいなければホスト不在にする）。
      gs.hostId = null;
      let next = findServerPcId();
      if (!next && !gs.event.active && gs.phase !== 'lobby') {
        next = Object.keys(gs.players).find(id => isJoinedHuman(id)) || null;
      }
      gs.hostId = next;
      io.emit('host_changed', { hostId: next });
    }

    gs.eliminatedPlayers.delete(socket.id);
    gs.revivalEliminated.delete(socket.id);
    gs.groupEliminated.delete(socket.id);

    const humanIds = Object.keys(gs.players)
      .filter(id => !gs.players[id].isBot && gs.players[id].joined);
    // 大会モード進行中は、全員が一時的に切断しただけ（通信の瞬断など）で大会状態が
    // 消えてしまわないよう、自動リセットしない（再接続すれば復帰できる）。
    if (!humanIds.length && !gs.event.active) {
      clearAllTimers();
      removeCpuPlayers();
      gs.phase = 'lobby'; gs.currentCard = null;
      gs.remaining = new Set(LEVEL_IDS.A); gs.memorizeEndsAt = 0; gs.hostId = null;
      gs.round = 1; gs.eliminatedPlayers = new Set(); gs.lastRoundResult = null;
      gs.isGroupMatch = false; gs.groupTier = null; gs.humanGroups = null;
      gs.groupParticipantIds = new Set(); gs.cumulativeScores = {};
      gs.postTournament = false; gs.bottomGroupWinners = null; gs.middleGroupWinners = null;
      gs.groupMatchScores = {};
    }
  });
});

// 読み上げ確認ページ（/tts-check.html）用：全札のデータと難易度帯を返す
app.get('/api/karuta', (req, res) => res.json({ karuta: KARUTA, levels: LEVEL_IDS }));

app.use(express.json({ limit: '60kb' }));
// 音声ファイル（VOICEVOX で作って voice-cache に保存したもの）。同じ名前のファイルは中身が変わらないので長期キャッシュさせる。
app.use('/voice', express.static(VOICE_CACHE_DIR, { maxAge: '365d', immutable: true }));
// クライアントが必要な音声が未生成のとき（結果発表のDJなど）に、生成を依頼して待つ。
app.post('/api/voice/ensure', async (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items.slice(0, 24) : [];
  const valid = items.filter(it => it && VD.VOICES[it.voice] && typeof it.text === 'string' && it.text.length > 0 && it.text.length <= 160);
  const r = await Promise.race([
    voiceEngine.ensure(valid, { prio: 'dj' }),
    new Promise(resolve => setTimeout(() => resolve({ ok: 0, failed: valid.length, timeout: true }), 10000)),
  ]);
  res.json(r);
});
app.get('/api/voice/status', (req, res) => res.json({ baseUrl: voiceEngine.baseUrl, queue: voiceEngine.queue.length, stats: voiceEngine.stats, down: Date.now() < voiceEngine.downUntil }));

// ── 負荷テストのログ回収（教卓PCのみ）─────────────────────
// 一覧は logs/ の loadtest-*.jsonl のみを対象にする（他のファイルへは一切アクセスできない）。
app.get('/api/loadtest/logs', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  let files = [];
  try {
    files = fs.readdirSync(LOG_DIR)
      .filter(f => /^loadtest-.*\.jsonl$/.test(f))
      .map(f => ({ name: f, ...fs.statSync(path.join(LOG_DIR, f)) }))
      .map(f => ({ name: f.name, sizeBytes: f.size, mtime: f.mtime }))
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch (e) { /* logsフォルダが無ければ空一覧を返す */ }
  res.json({ files });
});
app.get('/api/loadtest/logs/:file', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  // ファイル名はこの形式のみ許可（パス区切りを含められないようにし、他ファイルの読み出しを防ぐ）
  if (!/^loadtest-[\w.-]+\.jsonl$/.test(req.params.file)) return res.status(400).json({ error: 'invalid filename' });
  const file = path.join(LOG_DIR, req.params.file);
  res.download(file, err => { if (err && !res.headersSent) res.status(404).json({ error: 'not found' }); });
});

// 実機ボットテスト（?bot=N/?bot=host）の通信・スペック診断ログ（教卓PCのみ）
app.get('/api/bottest/logs', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  let files = [];
  try {
    files = fs.readdirSync(LOG_DIR)
      .filter(f => /^bottest-.*\.jsonl$/.test(f))
      .map(f => ({ name: f, ...fs.statSync(path.join(LOG_DIR, f)) }))
      .map(f => ({ name: f.name, sizeBytes: f.size, mtime: f.mtime }))
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch (e) { /* logsフォルダが無ければ空一覧を返す */ }
  res.json({ files });
});
app.get('/api/bottest/logs/:file', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  if (!/^bottest-[\w.-]+\.jsonl$/.test(req.params.file)) return res.status(400).json({ error: 'invalid filename' });
  const file = path.join(LOG_DIR, req.params.file);
  res.download(file, err => { if (err && !res.headersSent) res.status(404).json({ error: 'not found' }); });
});

app.use(express.static(path.join(__dirname, 'public')));

// 起動後、裏で部品（固定セリフ・数字・順位）を作っておく。キャッシュ済みなら一瞬で終わる。失敗した分は1分後にもう一度試す。
setTimeout(async () => {
  const items = VD.warmupItems();
  const r = await voiceEngine.ensure(items, { prio: 'bg' });
  logEvent('voice_warmup', { total: items.length, ...r });
  if (r.failed) setTimeout(() => voiceEngine.ensure(items, { prio: 'bg' }).then(r2 => logEvent('voice_warmup_retry', r2)), 60000);
}, 1500);

// 管理画面の「再起動」で自分自身が起動し直されたときは、古いプロセスがポートを手放すまで待つ
if (process.env.KARUTA_RESPAWN === '1') {
  let tries = 0;
  srv.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && ++tries < 60) setTimeout(() => srv.listen(PORT, '0.0.0.0'), 500);
    else throw e;
  });
}
srv.listen(PORT, '0.0.0.0', () => {
  const ips = localIPs();
  console.log('\n====================================');
  console.log('  💻 Webかるた サーバー起動中');
  console.log('====================================');
  console.log(`  このPC : http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  LAN    : http://${ip}:${PORT}`));
  console.log('====================================');
  console.log('  Ctrl+C で停止\n');
});
