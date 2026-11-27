'use strict';
// サーバーの土台：Webサーバー・ログ・音声・接続の振り分け・ダウンロード用のAPI。
// 試合の進行は game-room.js（部屋）、接続の振り分けと一人練習は practice-rooms.js。
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

const KARUTA = require('./public/karuta-data.js');
const createGameRoom = require('./game-room.js');
const { createPracticeRooms } = require('./practice-rooms.js');
const { createAccessLog, createIpResolver } = require('./access-log.js');
const NETWORK = require('./network-config.js');

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
// 所要時間の記録（logs/timing-<起動日時>.md。試合が終わるたびに書き直す）
const { TimingLog } = require('./timing-log.js');
const TIMING_FILE = `timing-${new Date().toISOString().replace(/[:.]/g, '-')}-p${PORT}.md`;
const timing = new TimingLog(path.join(LOG_DIR, TIMING_FILE));
// アンケート（専用ページ /survey.html から回答。保存先は logs/survey-<起動日時>.csv）
const { createSurvey } = require('./survey.js');
const survey = createSurvey({ logDir: LOG_DIR, fileName: `survey-${new Date().toISOString().replace(/[:.]/g, '-')}-p${PORT}.csv` });
// ログイベントのうち、所要時間の計測に使うものを拾う（記録の失敗でゲームを止めない）
function timingFromLog(type, data) {
  try {
    if (type === 'read_start') timing.cardStart({ kind: data.kind, cardId: data.cardId, tori: data.tori, level: data.level });
    else if (type === 'read_end') timing.cardReadEnd(data.readDurationMs);
    else if (type === 'announce_go') timing.announceStart(true);
    else if (type === 'time_up') timing.announceStart(false);
    else if (type === 'ready_wait') timing.readyStart(Array.isArray(data.need) ? data.need.length : null);
    else if (type === 'ready_release') timing.readyEnd(data.reason);
  } catch (e) { /* 無視 */ }
}
// 所要時間の記録は大会用の部屋だけが対象（一人練習の部屋は timing: false）
function logEvent(type, data = {}, options = {}) {
  if (options.timing !== false) timingFromLog(type, data);
  if (!logStream) return;
  logStream.write(JSON.stringify({ at: new Date().toISOString(), t: Math.round(hiResNow()), type, ...data }) + '\n');
}

const VD = require('./public/voice-defs.js');
const { VoiceEngine } = require('./voice-engine.js');

// ── 全部屋で共通の設定（大会設定画面で切り替える。サーバーを起動し直すと元に戻る）──
const settings = {
  // 参加者も練習を開始できる（既定は許可）。練習は一人ずつ別の部屋になる
  studentPracticeAllowed: true,
  // 大会モードの待機画面の前に「ヘッドフォン確認（3けたの番号）」をするか
  headphoneCheckEnabled: true,
  // 大会モードに入るのに3けたの入場番号が必要か。番号は game-room.js が自動で作る（空なら次に使うときに作る）
  entryCodeEnabled: true,
  entryCode: '',
};
// サーバー内蔵の負荷テストのボットだけが知っている合言葉（起動のたびに作り直す。教卓PCの権限は与えない）
const INTERNAL_TOKEN = require('crypto').randomBytes(24).toString('hex');
const isInternalBot = socket => !!(socket.handshake.query && socket.handshake.query.internal === INTERNAL_TOKEN);
const canStartPractice = socket => settings.studentPracticeAllowed || isHostEligible(socket) || isInternalBot(socket);

// VOICEVOX エンジン（CT107）。環境変数 VOICEVOX_URL で変更できる。音声の保存先は VOICE_CACHE_DIR（既定 ./voice-cache）。
const VOICE_CACHE_DIR = process.env.VOICE_CACHE_DIR || path.join(__dirname, 'voice-cache');
const voiceEngine = new VoiceEngine({
  baseUrl: process.env.VOICEVOX_URL || 'http://192.168.0.19:50021',
  dir: VOICE_CACHE_DIR,
  log: logEvent,
});

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

function localIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .map(n => n.address);
}

// ── 接続元IPと接続ログ ─────────────────────────────────────
const listSetting = (envName, fallback) => (process.env[envName] !== undefined ? process.env[envName].split(',') : fallback);
const resolveIp = createIpResolver({ trustedProxies: listSetting('KARUTA_TRUSTED_PROXIES', NETWORK.trustedProxies) });
const clientIpOf = socket => resolveIp(socket.handshake.address, socket.handshake.headers);
const ACCESS_FILE = `access-${new Date().toISOString().replace(/[:.]/g, '-')}-p${PORT}.csv`;
const accessLog = createAccessLog({
  logDir: LOG_DIR,
  fileName: ACCESS_FILE,
  campusIps: listSetting('KARUTA_CAMPUS_IPS', NETWORK.campusIps),
  intervalMs: +process.env.KARUTA_ACCESS_LOG_MS || 30 * 60 * 1000,   // 環境変数はテスト用
  isEventPlayer: id => rooms.isEventPlayer(id),
});
// サーバーを止めるとき（管理画面の停止・再起動、Ctrl+C）にも、途中までの30分を書き出す
process.on('exit', () => accessLog.flush());
['SIGINT', 'SIGTERM'].forEach(signal => process.on(signal, () => process.exit(0)));

// ── 部屋（大会用の1部屋と、一人ずつの練習の部屋）──────────────
// 所要時間の記録は大会用の部屋だけ。一人練習の部屋には何もしない代わりを渡す
const silentTiming = new Proxy({}, { get: () => () => {} });
const rooms = createPracticeRooms({
  io,
  createGameRoom,
  roomEnv: {
    settings, hiResNow, logEvent, timing, silentTiming, voiceEngine, PORT, LOG_DIR,
    INTERNAL_TOKEN, isHostEligible, canStartPractice,
    broadcastAll: (event, data) => io.emit(event, data),
  },
  canStartPractice, isHostEligible, isInternalBot, accessLog, clientIpOf,
});

// 画面の取得を記録する（通信を始めない自動巡回などを見分けるため）
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html')) && !isHostRequest(req)) {
    accessLog.pageHit(resolveIp(req.socket.remoteAddress, req.headers));
  }
  next();
});

// 接続ログ（logs/access-*.csv）の一覧とダウンロード（教卓PCのみ）
app.get('/api/access/logs', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  let files = [];
  try {
    files = fs.readdirSync(LOG_DIR)
      .filter(f => /^access-.*\.csv$/.test(f))
      .map(f => ({ name: f, ...fs.statSync(path.join(LOG_DIR, f)) }))
      .map(f => ({ name: f.name, sizeBytes: f.size, mtime: f.mtime, current: f.name === ACCESS_FILE }))
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch (e) { /* logsフォルダが無ければ空一覧 */ }
  res.json({ files });
});
app.get('/api/access/logs/:file', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  if (!/^access-[\w.-]+\.csv$/.test(req.params.file)) return res.status(400).json({ error: 'invalid filename' });
  res.download(path.join(LOG_DIR, req.params.file), err => { if (err && !res.headersSent) res.status(404).json({ error: 'not found' }); });
});

// 読み上げ確認ページ（/tts-check.html）用：全札のデータと難易度帯を返す
app.get('/api/karuta', (req, res) => res.json({ karuta: KARUTA, levels: rooms.main.LEVEL_IDS }));

app.use(express.json({ limit: '60kb' }));
// アンケートの回答を受け取る（専用ページ /survey.html から。内容はCSVにだけ残す）
app.post('/api/survey', (req, res) => {
  const result = survey.submit(req.body);
  logEvent('survey_submit', { ok: result.ok, reason: result.reason });
  res.status(result.ok ? 200 : result.reason === 'invalid' ? 400 : 503).json(result);
});
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

// 所要時間の記録（logs/timing-*.md）の一覧とダウンロード（教卓PCのみ）
app.get('/api/timing/logs', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  let files = [];
  try {
    files = fs.readdirSync(LOG_DIR)
      .filter(f => /^timing-.*\.md$/.test(f))
      .map(f => ({ name: f, ...fs.statSync(path.join(LOG_DIR, f)) }))
      .map(f => ({ name: f.name, sizeBytes: f.size, mtime: f.mtime, current: f.name === TIMING_FILE }))
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch (e) { /* logsフォルダが無ければ空一覧 */ }
  res.json({ files });
});
app.get('/api/timing/logs/:file', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  if (!/^timing-[\w.-]+\.md$/.test(req.params.file)) return res.status(400).json({ error: 'invalid filename' });
  res.download(path.join(LOG_DIR, req.params.file), err => { if (err && !res.headersSent) res.status(404).json({ error: 'not found' }); });
});

// アンケート結果（logs/survey-*.csv）の一覧とダウンロード（教卓PCのみ）
app.get('/api/survey/logs', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  let files = [];
  try {
    files = fs.readdirSync(LOG_DIR)
      .filter(f => /^survey-.*\.csv$/.test(f))
      .map(f => ({ name: f, ...fs.statSync(path.join(LOG_DIR, f)) }))
      .map(f => ({ name: f.name, sizeBytes: f.size, mtime: f.mtime, current: f.name === path.basename(survey.file) }))
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch (e) { /* logsフォルダが無ければ空一覧 */ }
  res.json({ files });
});
app.get('/api/survey/logs/:file', (req, res) => {
  if (!isHostRequest(req)) return res.status(403).json({ error: 'forbidden' });
  if (!/^survey-[\w.-]+\.csv$/.test(req.params.file)) return res.status(400).json({ error: 'invalid filename' });
  res.download(path.join(LOG_DIR, req.params.file), err => { if (err && !res.headersSent) res.status(404).json({ error: 'not found' }); });
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
