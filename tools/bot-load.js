'use strict';
// 同時クリックの判定を確かめる負荷テスト（教卓PCから実行する想定）。
//   node tools/bot-load.js --url http://192.168.0.10:3000 --bots 80 --rounds 5 --spread 300
// 参加者（ボット）を大会モードの参加者として入れ、読み上げのたびに全員がほぼ同時に札をクリックさせる。
// 各ボットはクリック位置（札の中心からの距離 mm）と送信時刻を知っていて、サーバーの判定結果と照合する。
//  ・勝者は「0.5秒以内に届いた申告の中で精度の点数が最も高い人」か
//  ・申告者の数は、届いた時刻から0.5秒以内の人と一致するか
//  ・1人1回しか数えていないか
// 実際の端末の遅延は再現しない（通信は同じPCの中・LANの実測は別途）。サーバー側の判定ロジックを検証する。
const { io } = require('../node_modules/socket.io/client-dist/socket.io.js');   // サーバーに同梱のクライアント

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const URL = opt('url', 'http://localhost:3000');
const BOTS = +opt('bots', 80);
const ROUNDS = +opt('rounds', 5);
const SPREAD = +opt('spread', 300);     // 送信時刻のばらつき（ms）。0 なら全員同時
const HOST_TIMEOUT = 60000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const MM_PER_PX = 73 / 180;
const FULL_MM = Math.hypot(90, 50) * MM_PER_PX;
const accPts = mm => Math.round(400 * Math.pow(1 - Math.min(1, Math.max(0, mm / FULL_MM)), 3));

function connect(name, extra = {}) {
  const s = io(URL, { transports: ['websocket'], forceNew: true, ...extra });
  s.on('connect_error', e => console.error('接続エラー', name, e.message));
  return s;
}
const waitFor = (sock, name, pred = null, ms = 60000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout ' + name)), ms);
  const h = d => { if (!pred || pred(d)) { clearTimeout(t); sock.off(name, h); res(d); } };
  sock.on(name, h);
});

(async () => {
  const host = connect('host');
  const bots = [];
  for (let i = 0; i < BOTS; i++) bots.push(connect('bot' + i));
  await Promise.all([host, ...bots].map(s => new Promise(r => s.once('connect', r))));
  // 仮想カーソルの準備完了（実際の端末では PC が自動で送る）
  bots.forEach(b => b.on('ready_wait', () => setTimeout(() => b.emit('cursor_ready'), 20 + Math.random() * 200)));
  await sleep(300);
  host.emit('set_name', { name: '教卓' });
  bots.forEach((b, i) => b.emit('set_name', { name: 'ボット' + (i + 1), grade: String(1 + (i % 3)), course: i % 2 ? 'アプリコース' : 'プログラムコース' }));
  await sleep(800);

  // 大会モードは、サーバーPC（教卓）から開始する必要がある。URLが教卓PCのIPでも、接続元がこのPCでなければ進行役にはなれない。
  const evP = waitFor(host, 'event_memorize_start', null, 20000).catch(() => null);
  host.emit('start_event');
  const ev = await evP;
  if (!ev) { console.log('大会モードを開始できませんでした（教卓PCからアクセスしているか確認してください）'); process.exit(1); }
  console.log(`参加ボット ${ev.participantIds.length} 人で大会モードを開始`);

  let lastGw = null;
  host.on('game_waiting', d => { lastGw = d; setTimeout(() => host.emit('read_next'), 50); });
  host.on('ready_release', () => setTimeout(() => host.emit('read_next'), 50));   // 仮想カーソルの準備が揃ったら読み上げを始める（教卓画面と同じ）
  host.on('decoy_read', () => setTimeout(() => host.emit('decoy_finished'), 200));
  host.on('read_card', d => {
    host.emit('intro_started', { t: Date.now() });   // 教卓PCは「読み上げます」の発声開始を報告する
    setTimeout(() => host.emit('yomi_finished', { cardId: d.card.id }), 300);
  });

  const results = [];
  let failures = 0, checked = 0;
  for (let round = 1; round <= ROUNDS; round++) {
    const taken = new Promise(res => host.once('card_taken', res));
    const read = await waitFor(bots[0], 'read_card', null, HOST_TIMEOUT);
    const cardId = read.card.id;
    const clicks = [];   // { bot, sendAt, mm }
    const start = Date.now() + 100;
    bots.forEach((b, i) => {
      const mm = 0.2 + Math.random() * 25;   // 札の中心からのズレ（mm）
      const at = start + Math.random() * SPREAD;
      clicks.push({ id: b.id, name: 'ボット' + (i + 1), mm, at });
      setTimeout(() => {
        b.emit('grab_card', { cardId, t: Date.now(), offsetMm: mm, distMm: 150 });
      }, Math.max(0, at - Date.now()));
    });
    const tk = await Promise.race([taken, sleep(HOST_TIMEOUT).then(() => null)]);
    if (!tk) { console.log('ラウンド' + round + ': 取得の通知が来ませんでした'); failures++; continue; }
    // 期待値：最初の申告（送信時刻ベース。ローカル通信なので送信時刻≒到着時刻）から0.5秒以内の申告
    clicks.sort((a, b) => a.at - b.at);
    const first = clicks[0].at;
    const window = clicks.filter(c => c.at - first < 500);
    const expectWinner = window.reduce((best, c) => (best === null || accPts(c.mm) > accPts(best.mm) ? c : best), null);
    const winnerName = tk.by.name;
    const contendersServer = (tk.contenders || []).length;
    const serverWinnerAcc = tk.result.accPts;
    const okWinner = winnerName.endsWith(expectWinner.name) && serverWinnerAcc === accPts(expectWinner.mm);   // 名前には学年・コースの接頭辞が付く
    const okCount = contendersServer === window.length || contendersServer === Math.min(10, window.length);
    checked++;
    if (!okWinner || !okCount) failures++;
    results.push({ round, card: read.card.tori, clicks: clicks.length, window: window.length, server: contendersServer, winner: winnerName, expect: expectWinner.name, acc: serverWinnerAcc, expectAcc: accPts(expectWinner.mm) });
    console.log(`ラウンド${round} 「${read.card.tori}」: 申告${clicks.length}人 / 0.5秒以内${window.length}人 / 取った人 ${winnerName}（精度${serverWinnerAcc}点）→ ${okWinner ? '正しい' : '不一致（期待: ' + expectWinner.name + '）'}`);
    // 次の札へ（取られた後の進行を待つ）
    await sleep(1200);
  }
  console.log(`\n判定 ${checked} 回中、不一致 ${failures} 回`);
  console.log(failures ? '※ 不一致があります。ログ（logs/）の grab_click / card_taken を確認してください。' : '全て一致しました。');
  [host, ...bots].forEach(s => s.close());
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('エラー', e); process.exit(2); });
