'use strict';
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const os         = require('os');

const PORT = process.env.PORT || 3000;
const app  = express();
const srv  = http.createServer(app);
const io   = new Server(srv);

// ── Karuta data（情報活用試験3級レベル）──────────────────
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

// 難易度を上げた際に登場するダミーの読み（盤面のどの札にも対応しない）。
const DECOYS = [
  { id: 'decoy1', yomi: '文字や記号をコンピューターが識別するために割り当てられた番号の体系', tori: '文字コード' },
  { id: 'decoy2', yomi: '一定の規則に従ってデータを並べ替え、目的の情報を探しやすくする処理', tori: 'ソート' },
  { id: 'decoy3', yomi: 'ネットワークを通じて遠隔地のコンピューターを操作するための技術', tori: 'リモートアクセス' },
  { id: 'decoy4', yomi: '利用者が誰であるかをパスワードなどで確認する一連の手続き', tori: '認証' },
  { id: 'decoy5', yomi: 'ソフトウェアの不具合を修正するために配布される更新プログラム', tori: 'パッチ' },
  { id: 'decoy6', yomi: '複数の処理を同時に実行できるよう、CPU内に搭載された処理装置の数', tori: 'コア数' },
  { id: 'decoy7', yomi: 'インターネット上の文章や画像を保存し、後で読み返せるようにする機能', tori: 'ブックマーク' },
  { id: 'decoy8', yomi: '第三者に通信内容を読み取られないよう、データを別の形式に変換すること', tori: '暗号化' },
];

// 試合ごとに使用する札のID（試合の難易度順に分割）
const ROUND_CARD_IDS = {
  1: [1, 2, 3, 5, 10, 13, 16, 23, 26, 28],   // 易しい: CPU, メモリ, ストレージ, インターネット, Webブラウザ, パスワード, 個人情報, SNS, QRコード, AI
  2: [4, 6, 12, 14, 17, 21, 24, 27, 29, 30],  // 普通: OS, LAN, マルウェア, 二段階認証, 著作権, バックアップ, 表計算ソフト, IoT, プレゼンテーションソフト, 電子商取引
  3: [7, 8, 9, 11, 15, 18, 19, 20, 22, 25],   // 難しい: IPアドレス, DNS, HTTP, ファイアウォール, フィッシング詐欺, 二進数, ビット, バイト, クラウドコンピューティング, データベース
};

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
  };
  const { base, peak } = rates[gs.round] || rates[1];
  const chance = base + (peak - base) * progress;
  return gs.difficulty === 'hard' ? Math.min(chance * 1.35, 0.65) : chance;
}

// ── CPU（コンピュータープレイヤー）────────────────────────
// 75人を3ティアに分割：上位25（強）/ 中位25（中）/ 下位25（弱）
const CPU_NAMES = [
  ...Array.from({length: 25}, (_, i) => `強CPU${String(i+1).padStart(2,'0')}`),
  ...Array.from({length: 25}, (_, i) => `中CPU${String(i+1).padStart(2,'0')}`),
  ...Array.from({length: 25}, (_, i) => `弱CPU${String(i+1).padStart(2,'0')}`),
];
// 黄金角（137.5°）でHSLを分散させ75色を生成
const CPU_COLORS = Array.from({length: 75}, (_, i) => {
  const h = Math.round((i * 137.508) % 360);
  const s = 65 + (i % 4) * 5;
  const l = 45 + (i % 3) * 6;
  return `hsl(${h},${s}%,${l}%)`;
});
const CPU_IDS = Array.from({length: 75}, (_, i) => `cpu-${i + 1}`);

// ティア別インデックス
const CPU_TIER_TOP    = CPU_IDS.slice(0, 25);
const CPU_TIER_MIDDLE = CPU_IDS.slice(25, 50);
const CPU_TIER_BOTTOM = CPU_IDS.slice(50, 75);

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

const MEMO_SECONDS    = 2.5 * 60;   // 盤面整理タイム（暗記ではなく、取りやすい配置に並べ替える時間）
const READ_TIMEOUT_MS = 10 * 1000;   // 上の句 / ダミー読み完了後の制限時間
const GRAB_WINDOW_MS  = 180;   // 正解の最初の申告からこの時間だけ他の候補も受け付ける
const GRAB_BUCKET_MS  = 70;    // この時間差以内は「同時」とみなし、精度で決着する

// ── Game state ────────────────────────────────────────────
const gs = {
  phase:          'lobby',
  difficulty:     'normal',
  cpuDifficulty:  'normal',
  currentCard:    null,
  cardOrder:      [],
  remaining:      new Set(ROUND_CARD_IDS[1]),
  players:        {},
  memorizeEndsAt: 0,
  hostId:         null,
  cpuTimers:      [],
  currentDecoy:   null,   // ダミー読み中の札情報（time_up で正解発表に使用）
  grabCandidates: [],     // 受付時間中に届いた正解候補（速さ＋精度判定用）
  grabWindowTimer: null,

  // ── トーナメント管理 ────────────────────────────────────
  round:               1,
  maxRounds:           3,
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
    active:         false,
    stage:          null,   // 'main' | 'revival' | 'semis' | 'final5' | 'thirdplace' | 'championship' | 'done'
    mainPool:       new Set(),   // 本戦の系譜にまだ残っている人
    revivalCandidates: new Set(), // 敗者復活戦にまだ挑戦していない／再挑戦権が残っている人（累積）
    gamesPlayed:    {},          // id → 消化した試合数
    participantIds: new Set(),   // 現在進行中の試合の参加者
    finalists:      [],          // 決勝5人（final5 実施後に確定）
    top2:           [],          // 決勝戦の対象2人
    restThree:      [],          // 3位決定戦の対象3人
    lastResult:     null,        // 直近ステージの結果（ホストUI表示用）
  },
};
let memorizeTimer     = null;
let decoyTimer        = null;
let decoyTimeoutTimer = null;
let readTimeoutTimer  = null;

// ── Helpers ───────────────────────────────────────────────
function localIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .map(n => n.address);
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

function pickNext() {
  const avail = KARUTA.filter(k => gs.remaining.has(k.id));
  return avail.length ? avail[Math.floor(Math.random() * avail.length)] : null;
}

// ── CPU helpers ───────────────────────────────────────────
function clearCpuTimers() {
  gs.cpuTimers.forEach(t => clearTimeout(t));
  gs.cpuTimers = [];
}

function addCpuPlayers() {
  CPU_IDS.forEach((id, i) => {
    if (!gs.eliminatedPlayers.has(id)) {
      gs.players[id] = { name: CPU_NAMES[i], color: CPU_COLORS[i], score: 0, misses: 0, isBot: true };
    }
  });
}

function addGroupCpuPlayers() {
  const tierIds = gs.groupTier === 'top'    ? CPU_TIER_TOP
                : gs.groupTier === 'middle' ? CPU_TIER_MIDDLE
                : CPU_TIER_BOTTOM;
  tierIds.forEach(id => {
    const idx = CPU_IDS.indexOf(id);
    gs.players[id] = { name: CPU_NAMES[idx], color: CPU_COLORS[idx], score: 0, misses: 0, isBot: true };
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
    if (id === gs.hostId) return;
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
  (name, score) => `${name}さん、ナイスキャッチ！ 現在${score}ポイントです。`,
  (name, score) => `お見事、${name}さん！`,
  (name, score) => `${name}さんが1枚ゲットです！`,
];
function pickDjTakeLine(name, score) {
  const f = DJ_TAKE_TEMPLATES[Math.floor(Math.random() * DJ_TAKE_TEMPLATES.length)];
  return f(name, score);
}

// ホストを除いた参加者をスコア降順で並べる（表示用ランキングと同じ並び）
function rankedNonHost() {
  return Object.entries(gs.players)
    .filter(([id]) => id !== gs.hostId)
    .sort(([, a], [, b]) => b.score - a.score);
}

// 2位が1位に1枚分（100点）以内まで詰め寄った「その瞬間」だけ実況する。
// beforeGap（今回の得点加算前の1位・2位差）と比べて、しきい値を新たに
// 下回った時だけ発火するため、同じ状況が続いても連呼しない。
function checkNearFirstPlace(beforeGap) {
  const sorted = rankedNonHost();
  if (sorted.length < 2) return;
  const afterGap = sorted[0][1].score - sorted[1][1].score;
  if (afterGap <= 100 && (beforeGap === null || beforeGap > 100)) {
    io.emit('dj_comment', { text: `${sorted[1][1].name}さん、あと少しで1位です！` });
  }
}

// 正解取得の共通処理（人間・CPU 共用）
function processCorrectGrab(grabberId, card) {
  if (!gs.remaining.has(card.id)) return;
  if (readTimeoutTimer) { clearTimeout(readTimeoutTimer); readTimeoutTimer = null; }
  clearCpuTimers();

  const player = gs.players[grabberId];
  if (!player) return;

  const beforeSorted = rankedNonHost();
  const beforeGap = beforeSorted.length < 2 ? null : beforeSorted[0][1].score - beforeSorted[1][1].score;

  player.score += 100;
  gs.remaining.delete(card.id);

  const takenCard  = card;
  const takerName  = player.name;
  const takerColor = player.color;
  gs.currentCard   = pickNext();
  gs.phase         = 'announcing';

  io.emit('card_taken', {
    cardId:  card.id,
    by:      { id: grabberId, name: takerName, color: takerColor },
    players: gs.players,
  });
  io.emit('dj_comment', { text: pickDjTakeLine(takerName, player.score) });
  checkNearFirstPlace(beforeGap);

  const nextCard  = gs.currentCard;
  const remaining = [...gs.remaining];
  setTimeout(() => {
    io.emit('announce_taken', { name: takerName, color: takerColor, card: takenCard, playAt: hiResNow() + 250 });
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
  }, 700);
}

// yomi_finished 受信後に呼び出し、各 CPU の反応タイマーを仕掛ける
function scheduleCpuGrabs(card) {
  clearCpuTimers();
  const lobbyMod = gs.cpuDifficulty === 'hard' ? 0.55
                 : gs.cpuDifficulty === 'easy' ? 1.55 : 1.0;
  CPU_IDS.forEach((cpuId, cpuIdx) => {
    if (!gs.players[cpuId]) return;
    const tierKey = cpuIdx < 25 ? 'top' : cpuIdx < 50 ? 'middle' : 'bottom';
    const base = CPU_TIER_SETTINGS[tierKey];
    const minMs = base.minMs * lobbyMod;
    const maxMs = base.maxMs * lobbyMod;
    const missRate = gs.cpuDifficulty === 'hard'
      ? base.missRate * 0.4
      : gs.cpuDifficulty === 'easy'
      ? Math.min(base.missRate * 1.5, 0.8) : base.missRate;
    const delay = minMs + Math.random() * (maxMs - minMs);
    const t = setTimeout(() => {
      if (gs.phase !== 'reading' || !gs.currentCard || gs.currentCard.id !== card.id) return;
      if (!gs.remaining.has(card.id)) return;
      if (Math.random() < missRate) {
        gs.players[cpuId].misses++;
        gs.players[cpuId].score -= 20;
        io.emit('players_updated', gs.players);
      } else {
        processCorrectGrab(cpuId, card);
      }
    }, delay);
    gs.cpuTimers.push(t);
  });
}

// 本物の札（gs.currentCard）を読み上げる。
// 上の句の読み上げ完了通知（yomi_finished）を待ってから制限時間と CPU を起動する。
function startRealRead() {
  gs.phase = 'reading';
  const card = gs.currentCard;
  io.emit('read_card', {
    card,
    remaining: [...gs.remaining],
    playAt:    hiResNow() + 400,
  });
  if (readTimeoutTimer) clearTimeout(readTimeoutTimer);
  // yomi_finished が来ない場合の安全フォールバック（8s 後に計測開始）
  readTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'reading' || gs.currentCard !== card) return;
    armReadTimeout(card);
  }, 8000);
}

// 上の句の読み上げ完了後に呼ばれる。制限時間タイマーと CPU タイマーを起動する。
function armReadTimeout(card) {
  if (readTimeoutTimer) clearTimeout(readTimeoutTimer);
  scheduleCpuGrabs(card);
  readTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'reading' || gs.currentCard !== card) return;
    triggerTimeUp(card);
  }, READ_TIMEOUT_MS);
}

// 制限時間経過の処理。「そこまで」→ 正解発表 → 次の札待機へ。
function triggerTimeUp(card) {
  clearCpuTimers();
  gs.phase = 'announcing';
  io.emit('time_up', { card, playAt: hiResNow() + 250 });

  gs.currentCard  = pickNext();
  const nextCard  = gs.currentCard;
  const remaining = [...gs.remaining];

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
}

// ダミー読み完了後、READ_TIMEOUT_MS 待ってから「そこまで」を発し次の本物の札へ移る。
function armDecoyTimeout() {
  if (decoyTimeoutTimer) clearTimeout(decoyTimeoutTimer);
  decoyTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'decoy') return;
    gs.phase = 'announcing';
    const decoy = gs.currentDecoy;
    gs.currentDecoy = null;
    // そこまで → 上の句（デコイ yomi）→ これは盤面にない札でした の順で再生させる
    io.emit('time_up', { card: null, decoy, playAt: hiResNow() + 250 });

    const nextCard  = gs.currentCard;   // ダミー中も currentCard は次の本物の札を指す
    const remaining = [...gs.remaining];
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
    decoyTimeoutTimer = null;
  }, READ_TIMEOUT_MS);
}

// 盤面のどの札にも対応しないダミーの読みを再生する。
// ホスト端末から再生完了の通知（decoy_finished）を受け取ってから READ_TIMEOUT_MS 待つ。
function startDecoyRead() {
  gs.phase = 'decoy';
  const decoy = DECOYS[Math.floor(Math.random() * DECOYS.length)];
  io.emit('decoy_read', {
    id:     decoy.id,
    yomi:   decoy.yomi,
    playAt: hiResNow() + 400,
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
          .filter(([id, p]) => id !== gs.hostId && !p.isBot && p.joined)
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

  // ── 最終試合終了 ──────────────────────────────────────────
  if (gs.round >= gs.maxRounds) {
    gs.phase = 'round_finished';
    const finalParticipants = Object.entries(gs.players)
      .filter(([id, p]) => id !== gs.hostId && !gs.eliminatedPlayers.has(id) && (p.isBot || p.joined))
      .sort(([, a], [, b]) => b.score - a.score);

    // 最終試合も通過人数を適用（脱落者を復活戦の対象に）
    const nFinal       = Math.min(gs.survivorCount, finalParticipants.length);
    const survivorIds  = finalParticipants.slice(0, nFinal).map(([id]) => id);
    const lostFinal    = finalParticipants.slice(nFinal);
    const eliminatedIds = lostFinal.filter(([, p]) => !p.isBot).map(([id]) => id);
    eliminatedIds.forEach(id => {
      gs.eliminatedPlayers.add(id);
      if (gs.players[id]) gs.players[id].isEliminated = true;
    });
    lostFinal.filter(([, p]) => p.isBot).forEach(([id]) => { gs.eliminatedPlayers.add(id); });
    io.emit('players_updated', gs.players);

    // 累積スコアに最終試合分を加算
    Object.entries(gs.players)
      .filter(([, p]) => !p.isBot && p.joined)
      .forEach(([id, p]) => {
        gs.cumulativeScores[id] = (gs.cumulativeScores[id] || 0) + p.score;
      });

    // 人間プレイヤーをスコア順に3グループへ均等に振り分け（全員対象）
    const humanRanking = Object.entries(gs.players)
      .filter(([id, p]) => id !== gs.hostId && !p.isBot && p.joined)
      .sort(([idA], [idB]) => (gs.cumulativeScores[idB] || 0) - (gs.cumulativeScores[idA] || 0));
    const numH    = humanRanking.length;
    const base    = Math.floor(numH / 3);
    const extra   = numH - base * 3;
    const topCnt  = base + (extra > 0 ? 1 : 0);
    const midCnt  = base + (extra > 1 ? 1 : 0);
    gs.humanGroups = {
      top:    humanRanking.slice(0, topCnt).map(([id]) => id),
      middle: humanRanking.slice(topCnt, topCnt + midCnt).map(([id]) => id),
      bottom: humanRanking.slice(topCnt + midCnt).map(([id]) => id),
    };
    gs.postTournament     = true;
    gs.bottomGroupWinners = null;
    gs.middleGroupWinners = null;

    const playersSnap = snap();
    gs.lastRoundResult = {
      round: gs.round, survivorIds, eliminatedIds,
      survivorCount: gs.survivorCount, players: playersSnap, isFinal: true,
      humanGroups: gs.humanGroups, cumulativeScores: gs.cumulativeScores,
    };
    setTimeout(() => {
      io.emit('round_finished', {
        round: gs.round, players: playersSnap,
        survivorIds, eliminatedIds, survivorCount: gs.survivorCount, isFinal: true,
        humanGroups: gs.humanGroups, cumulativeScores: gs.cumulativeScores,
      });
    }, 3000);
    return;
  }

  // ── 通常試合終了 ──────────────────────────────────────────
  gs.phase = 'round_finished';
  const competitors = Object.entries(gs.players)
    .filter(([id, p]) => id !== gs.hostId && !gs.eliminatedPlayers.has(id) && (p.isBot || p.joined))
    .sort(([, a], [, b]) => b.score - a.score);
  const n = Math.min(gs.survivorCount, competitors.length);
  const survivorIds = competitors.slice(0, n).map(([id]) => id);
  const eliminated  = competitors.slice(n);
  const eliminatedIds = eliminated.filter(([, p]) => !p.isBot).map(([id]) => id);
  eliminatedIds.forEach(id => {
    gs.eliminatedPlayers.add(id);
    if (gs.players[id]) gs.players[id].isEliminated = true;
  });
  eliminated.filter(([, p]) => p.isBot).forEach(([id]) => { gs.eliminatedPlayers.add(id); });
  io.emit('players_updated', gs.players);
  const playersSnap = snap();
  gs.lastRoundResult = {
    round: gs.round, survivorIds, eliminatedIds,
    survivorCount: gs.survivorCount, players: playersSnap,
  };
  setTimeout(() => {
    io.emit('round_finished', {
      round: gs.round, players: playersSnap,
      survivorIds, eliminatedIds, survivorCount: gs.survivorCount,
    });
  }, 3000);
}

// ── 大会モード（1/8本番用）───────────────────────────────────
const EVENT_SEMIS_THRESHOLD = 12;  // mainPool がこの人数以下になったら「決勝5人選抜」に切り替える
const EVENT_FINALIST_COUNT  = 5;
const EVENT_MIN_GAMES       = 3;   // 全員がこれだけの試合数を消化できることを保証する

const EVENT_STAGE_LABELS = {
  main: '本戦', revival: '敗者復活戦', semis: '決勝進出決定戦',
  final5: '決勝ラウンド', thirdplace: '3位決定戦', championship: '決勝戦',
};

// 通過人数・敗退人数を約1/3ずつに分ける（最低1人は通過・最低0人は敗退）
function eventCutCounts(poolSize) {
  const pass = Math.max(1, Math.min(poolSize, Math.round(poolSize / 3)));
  return { pass, lose: poolSize - pass };
}

// 大会モードの1試合を開始する（暗記フェーズから）。cardTier は 1〜3（ROUND_CARD_IDS のキー）。
function startEventMatch(participantIds, cardTier) {
  gs.event.participantIds = new Set(participantIds);
  removeCpuPlayers();
  participantIds.forEach(id => {
    if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
  });

  const cardIds = ROUND_CARD_IDS[cardTier] || ROUND_CARD_IDS[1];
  const cards   = KARUTA.filter(k => cardIds.includes(k.id));
  gs.remaining      = new Set(cardIds);
  gs.cardOrder      = shuffle(cardIds);
  gs.currentCard    = null;
  gs.currentDecoy   = null;
  gs.phase          = 'memorizing';
  gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

  const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: gs.event.participantIds });
  io.emit('event_memorize_start', {
    cardOrder:      gs.cardOrder,
    cards,
    players:        gs.players,
    endsAt:         gs.memorizeEndsAt,
    stage:          gs.event.stage,
    stageLabel:     EVENT_STAGE_LABELS[gs.event.stage] || '大会モード',
    participantIds: [...gs.event.participantIds],
    gamesPlayed:    gs.event.gamesPlayed,
    humanCount, cpuCount, totalCount,
  });
  memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
}

// 現在のステージの参加者を games played にカウントし、次に打てる手（本戦／敗者復活戦の
// どちらが可能か、あるいは大会が終了したか）をホストへ通知する。
function notifyEventStageReady() {
  const mainReady    = gs.event.mainPool.size > 0
    && !['final5', 'thirdplace', 'championship', 'done'].includes(gs.event.stage);
  const revivalReady = gs.event.revivalCandidates.size > 0;
  io.emit('event_stage_ready', {
    stage:            gs.event.stage,
    mainPoolSize:     gs.event.mainPool.size,
    revivalPoolSize:  gs.event.revivalCandidates.size,
    mainReady,
    revivalReady,
    finalists:        gs.event.finalists,
    top2:             gs.event.top2,
    restThree:        gs.event.restThree,
    gamesPlayed:      gs.event.gamesPlayed,
    players:          gs.players,
  });
}

// 大会モードの1試合終了処理。ステージごとに通過／敗退／敗者復活行きを振り分ける。
function endEventRound() {
  gs.phase = 'round_finished';
  const stage = gs.event.stage;

  const active = [...gs.event.participantIds]
    .filter(id => gs.players[id] && gs.players[id].joined)
    .map(id => [id, gs.players[id]])
    .sort(([, a], [, b]) => b.score - a.score);

  // 参加者全員の消化試合数を加算
  active.forEach(([id]) => {
    gs.event.gamesPlayed[id] = (gs.event.gamesPlayed[id] || 0) + 1;
  });

  const playersSnap = Object.assign({}, gs.players);

  if (stage === 'final5') {
    const sorted = active.map(([id]) => id);
    gs.event.top2       = sorted.slice(0, 2);
    gs.event.restThree  = sorted.slice(2, 5);
    gs.event.stage       = 'thirdplace';
    gs.event.lastResult  = { stage, finalRanking: sorted, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage, finalRanking: sorted, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  if (stage === 'thirdplace' || stage === 'championship') {
    const sorted = active.map(([id]) => id);
    gs.event.stage      = stage === 'thirdplace' ? 'championship' : 'done';
    gs.event.lastResult = { stage, ranking: sorted, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage, ranking: sorted, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  // ── main / semis / revival 共通の通過・敗退振り分け ─────────
  const ids = active.map(([id]) => id);

  if (stage === 'revival') {
    const { pass } = eventCutCounts(ids.length);
    const revived   = ids.slice(0, pass);
    const stillOut  = ids.slice(pass);
    revived.forEach(id => gs.event.mainPool.add(id));
    // 敗者復活戦にも負けた人：まだ3試合未満なら次の敗者復活戦に必ず再挑戦させる
    stillOut.forEach(id => {
      if ((gs.event.gamesPlayed[id] || 0) < EVENT_MIN_GAMES) gs.event.revivalCandidates.add(id);
    });
    gs.event.lastResult = { stage, revived, stillOut, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage, revived, stillOut, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  // stage === 'main' または 'semis'（どちらで実施するかは開始時に advance_event 側で決定済み）
  if (stage === 'semis') {
    const n = Math.min(EVENT_FINALIST_COUNT, ids.length);
    const finalists = ids.slice(0, n);
    const losers    = ids.slice(n);
    gs.event.mainPool = new Set(finalists);
    losers.forEach(id => {
      if ((gs.event.gamesPlayed[id] || 0) < EVENT_MIN_GAMES) gs.event.revivalCandidates.add(id);
    });
    gs.event.finalists  = finalists;
    gs.event.stage       = 'final5';
    gs.event.lastResult  = { stage: 'semis', finalists, losers, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage: 'semis', finalists, losers, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  const { pass } = eventCutCounts(ids.length);
  const passers = ids.slice(0, pass);
  const losers   = ids.slice(pass);
  gs.event.mainPool  = new Set(passers);
  losers.forEach(id => gs.event.revivalCandidates.add(id));
  gs.event.stage      = 'main';
  gs.event.lastResult = { stage: 'main', passers, losers, players: playersSnap };
  setTimeout(() => {
    io.emit('event_round_finished', { stage: 'main', passers, losers, players: playersSnap });
    notifyEventStageReady();
  }, 3000);
}

// 暗記フェーズ終了後に waiting フェーズへ移行
function doStartPlaying() {
  if (memorizeTimer) { clearTimeout(memorizeTimer); memorizeTimer = null; }
  // CPU は各試合の開始時（暗記フェーズ開始時）に追加済み
  gs.phase       = 'waiting';
  gs.currentCard = pickNext();
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
    eventParticipantIds: [...gs.event.participantIds],
  });
}

// 全タイマーをまとめてクリアするユーティリティ
function clearAllTimers() {
  clearCpuTimers();
  if (memorizeTimer)     { clearTimeout(memorizeTimer);     memorizeTimer     = null; }
  if (decoyTimer)        { clearTimeout(decoyTimer);        decoyTimer        = null; }
  if (decoyTimeoutTimer) { clearTimeout(decoyTimeoutTimer); decoyTimeoutTimer = null; }
  if (readTimeoutTimer)  { clearTimeout(readTimeoutTimer);  readTimeoutTimer  = null; }
  if (gs.grabWindowTimer) { clearTimeout(gs.grabWindowTimer); gs.grabWindowTimer = null; }
  gs.grabCandidates = [];
}

// 受付時間内に集まった正解候補から勝者を決める。
// まず時刻を GRAB_BUCKET_MS 単位でグルーピングし、最速グループの中で
// 最も札の中心に近かった人（precision が最小）を勝者とする。
function resolveGrabWindow(cardId) {
  gs.grabWindowTimer = null;
  const candidates = gs.grabCandidates.filter(c => c.cardId === cardId);
  gs.grabCandidates = [];
  if (!candidates.length) return;
  if (!gs.currentCard || gs.currentCard.id !== cardId || !gs.remaining.has(cardId)) return;

  const minT = Math.min(...candidates.map(c => c.t));
  const fastest = candidates.filter(c => c.t - minT < GRAB_BUCKET_MS);
  fastest.sort((a, b) => a.precision - b.precision);
  const winner = fastest[0];
  const player = gs.players[winner.id];
  if (!player) return;
  processCorrectGrab(winner.id, gs.currentCard);
}

// ── Socket.io ─────────────────────────────────────────────
io.on('connection', socket => {
  const color = COLORS[colorIdx++ % COLORS.length];
  gs.players[socket.id] = { name: `プレイヤー${Object.keys(gs.players).filter(id => !gs.players[id].isBot).length + 1}`, color, score: 0, misses: 0, joined: false };

  socket.emit('init', {
    myId:              socket.id,
    phase:             gs.phase,
    difficulty:        gs.difficulty,
    cpuDifficulty:     gs.cpuDifficulty,
    currentCard:       gs.currentCard,
    cardOrder:         gs.cardOrder,
    remaining:         [...gs.remaining],
    players:           gs.players,
    cards:             KARUTA,
    endsAt:            gs.memorizeEndsAt,
    hostId:            gs.hostId,
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
    eventParticipantIds: [...gs.event.participantIds],
    eventGamesPlayed:    gs.event.gamesPlayed,
  });

  socket.broadcast.emit('player_joined', { id: socket.id, player: gs.players[socket.id], players: gs.players });

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
      gs.players[socket.id].name   = n;
      gs.players[socket.id].joined = true;
      if (isObj) {
        if (payload.grade)  gs.players[socket.id].grade  = String(payload.grade);
        if (payload.course) gs.players[socket.id].course = String(payload.course);
      }
      const becameHost = !gs.hostId;
      if (becameHost) gs.hostId = socket.id;
      io.emit('players_updated', gs.players);
      if (becameHost) io.emit('host_changed', { hostId: gs.hostId });
    }
  });

  // ── ハウス編成（ホストのみ・大会モード）─────────────────
  // 学年×コースの各グループを出席者だけでシャッフルし、4ハウスへ
  // スネークドラフト（グループごとに開始ハウスを1つずつローテーション）で
  // 均等配分する。出欠が変わった場合は何度でも再実行できる。
  socket.on('assign_houses', () => {
    if (socket.id !== gs.hostId) return;
    gs.houses = assignHouses();
    io.emit('houses_assigned', { houses: gs.houses, players: gs.players });
  });

  // ── Start game（ホストのみ）──────────────────────────────
  socket.on('start_game', (opts) => {
    if (gs.phase !== 'lobby' || socket.id !== gs.hostId) return;
    const diff    = opts && opts.difficulty;
    const cpuDiff = opts && opts.cpuDifficulty;
    gs.difficulty     = ['easy', 'normal', 'hard'].includes(diff)    ? diff    : 'normal';
    gs.cpuDifficulty  = ['easy', 'normal', 'hard'].includes(cpuDiff) ? cpuDiff : 'normal';
    if (opts && opts.survivorCount) {
      const n = parseInt(opts.survivorCount, 10);
      if (!isNaN(n) && n >= 1) gs.survivorCount = n;
    }

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
      p.score = 0; p.misses = 0; p.isEliminated = false;
    });

    addCpuPlayers();
    const { humanCount, cpuCount, totalCount } = computeHeadcount();

    const roundCardIds = ROUND_CARD_IDS[1];
    const roundCards   = KARUTA.filter(k => roundCardIds.includes(k.id));
    gs.phase          = 'memorizing';
    gs.remaining      = new Set(roundCardIds);
    gs.cardOrder      = shuffle(roundCardIds);
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
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
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── Skip memorization（ホストのみ・デバッグ用）───────────
  socket.on('skip_memorize', () => {
    if (gs.phase !== 'memorizing' || socket.id !== gs.hostId) return;
    doStartPlaying();
  });

  // ── Read next card（ホストのみ）──────────────────────────
  socket.on('read_next', () => {
    if (gs.phase !== 'waiting' || socket.id !== gs.hostId || !gs.currentCard) return;
    const chance = getDecoyChance();
    if (chance > 0 && Math.random() < chance) {
      startDecoyRead();
    } else {
      startRealRead();
    }
  });

  // ── Decoy finished（ホスト端末からのダミー読み再生完了通知）─
  // 「これは盤面にない札でした」まで再生し終えたタイミングで受信する。
  // ここから READ_TIMEOUT_MS 待ってから「そこまで」を発し次の札へ。
  socket.on('decoy_finished', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'decoy') return;
    if (decoyTimer) { clearTimeout(decoyTimer); decoyTimer = null; }
    armDecoyTimeout();
  });

  // ── Yomi finished（ホスト端末からの上の句読み上げ完了通知）─
  // これを受け取った時点から制限時間と CPU タイマーを起動する。
  socket.on('yomi_finished', ({ cardId }) => {
    if (socket.id !== gs.hostId || gs.phase !== 'reading') return;
    if (!gs.currentCard || gs.currentCard.id !== cardId) return;
    armReadTimeout(gs.currentCard);
  });

  // ── Grab card ────────────────────────────────────────────
  // payload は { cardId, t, precision }（t: サーバー時計に補正済みのクリック時刻、
  // precision: 札の中心からのズレ 0〜1）。旧クライアント互換のため、
  // 数値（cardId のみ）で届いた場合もフォールバックする。
  socket.on('grab_card', payload => {
    const isObj     = payload && typeof payload === 'object';
    const cardId    = isObj ? payload.cardId : payload;
    const clientT   = (isObj && typeof payload.t === 'number') ? payload.t : null;
    const precision = (isObj && typeof payload.precision === 'number')
      ? Math.max(0, Math.min(1, payload.precision)) : 1;

    if (!gs.players[socket.id]) return;
    if (socket.id === gs.hostId) return;

    if (gs.event.active) {
      // 大会モード: 現在のステージの参加者のみ取れる
      if (!gs.event.participantIds.has(socket.id)) return;
    } else if (gs.isGroupMatch) {
      // グループ戦: そのグループの参加者のみ（中間ラウンドで脱落済みは除く）
      if (!gs.groupParticipantIds.has(socket.id)) return;
      if (gs.groupEliminated.has(socket.id)) return;
    } else if (gs.isRevival) {
      // 復活戦: 敗退者のみ取れる（復活戦で脱落済みは除く）
      if (!gs.eliminatedPlayers.has(socket.id)) return;
      if (gs.revivalEliminated.has(socket.id)) return;
    } else {
      // 本戦: 敗退者は取れない
      if (gs.eliminatedPlayers.has(socket.id)) return;
    }

    if (gs.phase === 'decoy') {
      const player = gs.players[socket.id];
      player.misses++;
      player.score -= 20;
      socket.emit('wrong_grab', { cardId });
      io.emit('players_updated', gs.players);
      return;
    }

    if (gs.phase !== 'reading' || !gs.currentCard) return;
    const player = gs.players[socket.id];

    if (cardId === gs.currentCard.id && gs.remaining.has(cardId)) {
      // 即座に正解者を確定させず、短い受付時間の間だけ他の候補も集める。
      // 集まった候補は、まず時刻でグルーピングし、最速グループ内では
      // 札の中心により近かった人（precision）を優先して勝者を決める。
      const t = clientT !== null ? clientT : hiResNow();
      gs.grabCandidates.push({ id: socket.id, cardId, t, precision });
      if (!gs.grabWindowTimer) {
        gs.grabWindowTimer = setTimeout(() => resolveGrabWindow(cardId), GRAB_WINDOW_MS);
      }
    } else if (gs.remaining.has(cardId)) {
      player.misses++;
      player.score -= 20;
      socket.emit('wrong_grab', { cardId });
      io.emit('players_updated', gs.players);
    }
  });

  // ── Debug: 即ゲーム終了（ホストのみ）─────────────────────
  socket.on('debug_end_game', () => {
    if (socket.id !== gs.hostId) return;
    if (!['waiting', 'reading', 'decoy', 'announcing'].includes(gs.phase)) return;
    clearAllTimers();
    endRound();
  });

  // ── Debug: CPUにランダムポイントを付与（ホストのみ）───────
  socket.on('debug_cpu_points', () => {
    if (socket.id !== gs.hostId) return;
    CPU_IDS.forEach(id => {
      if (gs.players[id]) {
        gs.players[id].score = Math.floor(Math.random() * 600);
      }
    });
    io.emit('players_updated', gs.players);
  });

  // ── 通過人数設定（ホストのみ）────────────────────────────
  socket.on('set_survivor_count', ({ count }) => {
    if (socket.id !== gs.hostId) return;
    const n = parseInt(count, 10);
    if (!isNaN(n) && n >= 1) gs.survivorCount = n;
    io.emit('survivor_count_updated', { survivorCount: gs.survivorCount });
  });

  // ── 次の試合を開始（ホストのみ）─────────────────────────
  socket.on('start_next_round', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished') return;

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

    const roundCardIds = ROUND_CARD_IDS[gs.round];
    const roundCards   = KARUTA.filter(k => roundCardIds.includes(k.id));
    gs.remaining      = new Set(roundCardIds);
    gs.cardOrder      = shuffle(roundCardIds);
    gs.currentCard    = null;
    gs.currentDecoy   = null;

    Object.values(gs.players).forEach(p => { p.score = 0; p.misses = 0; });

    addCpuPlayers();
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ excludeEliminated: true });

    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
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
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── 敗者復活戦を開始（ホストのみ）———任意ユーザー選択対応
  socket.on('start_revival', ({ selectedIds, revivalSurvivorCount: clientSurv } = {}) => {
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
    gs.isRevival            = true;
    gs.revivalRound         = 1;
    gs.revivalMaxRounds     = 3;
    gs.revivalSurvivorCount = (clientSurv && !isNaN(parseInt(clientSurv, 10)))
      ? Math.max(1, parseInt(clientSurv, 10))
      : Math.max(1, Math.ceil(participants.length * 0.6));
    gs.revivalEliminated    = new Set();
    gs.lastRoundResult      = null;

    removeCpuPlayers();
    participants.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
    });
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: new Set(participants) });

    const revivalCardIds = ROUND_CARD_IDS[1];
    const revivalCards   = KARUTA.filter(k => revivalCardIds.includes(k.id));
    gs.remaining      = new Set(revivalCardIds);
    gs.cardOrder      = shuffle(revivalCardIds);
    gs.currentCard    = null;
    gs.currentDecoy   = null;

    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
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
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── 次の復活戦ラウンドを開始（ホストのみ）─────────────────
  socket.on('start_next_revival_round', ({ revivalSurvivorCount } = {}) => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished' || !gs.isRevival) return;

    gs.revivalRound++;
    if (revivalSurvivorCount && !isNaN(parseInt(revivalSurvivorCount, 10))) {
      gs.revivalSurvivorCount = Math.max(1, parseInt(revivalSurvivorCount, 10));
    }
    gs.lastRoundResult = null;

    removeCpuPlayers();

    // アクティブな復活戦参加者のスコアをリセット
    const activeRevivalIds = Object.entries(gs.players)
      .filter(([id, p]) => gs.eliminatedPlayers.has(id) && !gs.revivalEliminated.has(id) && !p.isBot && p.joined)
      .map(([id]) => id);
    activeRevivalIds.forEach(id => { gs.players[id].score = 0; gs.players[id].misses = 0; });
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: new Set(activeRevivalIds) });

    const cardIds = ROUND_CARD_IDS[Math.min(gs.revivalRound, 3)];
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = shuffle(cardIds);
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
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
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── 復活戦通過人数を更新（ホストのみ）─────────────────────
  socket.on('set_revival_survivor_count', ({ revivalSurvivorCount: n }) => {
    if (socket.id !== gs.hostId || !gs.isRevival) return;
    const v = parseInt(n, 10);
    if (!isNaN(v) && v >= 1) {
      gs.revivalSurvivorCount = v;
      io.emit('revival_survivor_count_updated', { revivalSurvivorCount: gs.revivalSurvivorCount });
    }
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
    gs.groupSurvivorCount  = 3;
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
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
    });

    // ティアCPU IDを設定して追加
    const tierCpuIds = tier === 'top'    ? CPU_TIER_TOP
                     : tier === 'middle' ? CPU_TIER_MIDDLE : CPU_TIER_BOTTOM;
    gs.groupParticipantIds = new Set([...humanIds, ...tierCpuIds]);
    addGroupCpuPlayers();
    const { cpuCount: groupCpuCount } = computeHeadcount({ participantIds: gs.groupParticipantIds });

    const cardIds = ROUND_CARD_IDS[1];
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = shuffle(cardIds);
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    const tierLabel = tier === 'top' ? '上位' : tier === 'middle' ? '中位' : '下位';
    const humanCount = humanIds.length;
    io.emit('memorize_start', {
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
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── グループ戦次ラウンド開始（ホストのみ）───────────────────
  socket.on('start_next_group_round', ({ groupSurvivorCount: clientSurv } = {}) => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished' || !gs.isGroupMatch) return;

    gs.groupRound++;
    if (clientSurv && !isNaN(parseInt(clientSurv, 10))) {
      gs.groupSurvivorCount = Math.max(1, parseInt(clientSurv, 10));
    }
    gs.lastRoundResult = null;

    removeCpuPlayers();

    // アクティブな人間参加者のスコアをリセット
    const tierCpuIds = gs.groupTier === 'top' ? CPU_TIER_TOP
                     : gs.groupTier === 'middle' ? CPU_TIER_MIDDLE : CPU_TIER_BOTTOM;
    const activeHumanIds = [...gs.groupParticipantIds]
      .filter(id => gs.players[id] && !gs.players[id].isBot && !gs.groupEliminated.has(id));
    activeHumanIds.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
    });
    gs.groupParticipantIds = new Set([...activeHumanIds, ...tierCpuIds]);
    addGroupCpuPlayers();
    const { cpuCount: groupCpuCount } = computeHeadcount({ participantIds: gs.groupParticipantIds });

    const cardIds = ROUND_CARD_IDS[Math.min(gs.groupRound, 3)];
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = shuffle(cardIds);
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    const tierLabel   = gs.groupTier === 'top' ? '上位' : gs.groupTier === 'middle' ? '中位' : '下位';
    io.emit('memorize_start', {
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
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── グループ戦通過人数設定（ホストのみ）──────────────────────
  socket.on('set_group_survivor_count', ({ groupSurvivorCount: n }) => {
    if (socket.id !== gs.hostId || !gs.isGroupMatch) return;
    const v = parseInt(n, 10);
    if (!isNaN(v) && v >= 1) {
      gs.groupSurvivorCount = v;
      io.emit('group_survivor_count_updated', { groupSurvivorCount: gs.groupSurvivorCount });
    }
  });

  // ── 復活人数設定（ホストのみ）────────────────────────────
  socket.on('set_revival_count', ({ count }) => {
    if (socket.id !== gs.hostId) return;
    const n = parseInt(count, 10);
    if (!isNaN(n) && n >= 1) gs.revivalCount = n;
    io.emit('revival_count_updated', { revivalCount: gs.revivalCount });
  });

  // ── 大会モードを開始（ホストのみ）─────────────────────────
  // その時点で参加登録済み（joined）の人間プレイヤー全員を対象に第1試合を開始する。
  socket.on('start_event', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'lobby') return;
    const participantIds = Object.entries(gs.players)
      .filter(([id, p]) => id !== gs.hostId && !p.isBot && p.joined)
      .map(([id]) => id);
    if (participantIds.length === 0) return;

    gs.event.active            = true;
    gs.event.mainPool          = new Set(participantIds);
    gs.event.revivalCandidates = new Set();
    gs.event.gamesPlayed       = {};
    gs.event.finalists         = [];
    gs.event.top2              = [];
    gs.event.restThree         = [];
    gs.event.lastResult        = null;
    gs.event.stage = participantIds.length <= EVENT_SEMIS_THRESHOLD ? 'semis' : 'main';

    removeCpuPlayers();
    startEventMatch(participantIds, gs.event.stage === 'semis' ? 3 : 1);
  });

  // ── 大会モードの次の試合へ進む（ホストのみ）───────────────
  // which: 'main'（本戦/準決勝プールの続き）または 'revival'（敗者復活戦）。
  // 決勝5人・3位決定戦・決勝戦は自動的にどちらか一方しか選べないため which を無視する。
  socket.on('advance_event', ({ which } = {}) => {
    if (socket.id !== gs.hostId || !gs.event.active || gs.phase !== 'round_finished') return;

    const stage = gs.event.stage;
    if (stage === 'final5')       { startEventMatch(gs.event.finalists,  3); return; }
    if (stage === 'thirdplace')   { startEventMatch(gs.event.restThree,  3); return; }
    if (stage === 'championship') { startEventMatch(gs.event.top2,       3); return; }
    if (stage === 'done') return;

    if (which === 'revival') {
      if (gs.event.revivalCandidates.size === 0) return;
      const pool = [...gs.event.revivalCandidates];
      gs.event.revivalCandidates = new Set();
      gs.event.stage = 'revival';
      startEventMatch(pool, 2);
      return;
    }

    if (gs.event.mainPool.size === 0) return;
    const pool = [...gs.event.mainPool];
    gs.event.stage = pool.length <= EVENT_SEMIS_THRESHOLD ? 'semis' : 'main';
    startEventMatch(pool, gs.event.stage === 'semis' ? 3 : 1);
  });

  // ── Back to lobby ────────────────────────────────────────
  socket.on('go_to_lobby', () => {
    if (['reading', 'decoy', 'announcing'].includes(gs.phase)) return;
    clearAllTimers();
    removeCpuPlayers();

    gs.event.active            = false;
    gs.event.stage              = null;
    gs.event.mainPool           = new Set();
    gs.event.revivalCandidates  = new Set();
    gs.event.gamesPlayed        = {};
    gs.event.participantIds     = new Set();
    gs.event.finalists          = [];
    gs.event.top2               = [];
    gs.event.restThree          = [];
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
    gs.remaining = new Set(ROUND_CARD_IDS[1]); gs.memorizeEndsAt = 0;
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
    const wasHost = socket.id === gs.hostId;
    delete gs.players[socket.id];
    io.emit('player_left', { id: socket.id, players: gs.players });

    if (wasHost) {
      const humanIds = Object.keys(gs.players)
        .filter(id => !gs.players[id].isBot && gs.players[id].joined);
      gs.hostId = humanIds.length ? humanIds[0] : null;
      if (gs.hostId) io.emit('host_changed', { hostId: gs.hostId });
    }

    gs.eliminatedPlayers.delete(socket.id);
    gs.revivalEliminated.delete(socket.id);
    gs.groupEliminated.delete(socket.id);

    const humanIds = Object.keys(gs.players)
      .filter(id => !gs.players[id].isBot && gs.players[id].joined);
    if (!humanIds.length) {
      clearAllTimers();
      removeCpuPlayers();
      gs.phase = 'lobby'; gs.currentCard = null;
      gs.remaining = new Set(ROUND_CARD_IDS[1]); gs.memorizeEndsAt = 0; gs.hostId = null;
      gs.round = 1; gs.eliminatedPlayers = new Set(); gs.lastRoundResult = null;
      gs.isGroupMatch = false; gs.groupTier = null; gs.humanGroups = null;
      gs.groupParticipantIds = new Set(); gs.cumulativeScores = {};
      gs.postTournament = false; gs.bottomGroupWinners = null; gs.middleGroupWinners = null;
      gs.groupMatchScores = {};
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

srv.listen(PORT, '0.0.0.0', () => {
  const ips = localIPs();
  console.log('\n====================================');
  console.log('  💻 IT かるた サーバー起動中');
  console.log('====================================');
  console.log(`  このPC : http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  LAN    : http://${ip}:${PORT}`));
  console.log('====================================');
  console.log('  Ctrl+C で停止\n');
});
