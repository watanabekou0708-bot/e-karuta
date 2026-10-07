'use strict';
// 全部の音声を事前に VOICEVOX で生成して voice-cache に保存するスクリプト。
//   npm run voice:pregen              … 出題対象587札（上の句＝四国めたん／答え＝ずんだもん）＋ダミー203札＋固定セリフ・数字・順位の部品
//   npm run voice:pregen -- --limit 20 … 動作確認用に、先頭20札だけ
//   npm run voice:pregen -- --only warmup … 固定セリフ・数字・順位の部品だけ
// 生成済みのファイルは飛ばすので、途中で止めても、あとで続きから再開できる。
// 接続先は環境変数 VOICEVOX_URL（既定 http://192.168.0.19:50021）。VOICEVOX は1本ずつしか処理しないため、全部で約30分かかる。
const path = require('path');
const { VoiceEngine } = require('../voice-engine.js');
const VD = require('../public/voice-defs.js');
const KARUTA = require('../public/karuta-data.js');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const limit = +opt('limit', 0);
const only = opt('only', '');

const engine = new VoiceEngine({
  baseUrl: process.env.VOICEVOX_URL || 'http://192.168.0.19:50021',
  dir: path.join(__dirname, '..', 'voice-cache'),
  log: (type, d) => { if (type === 'voice_fail') console.warn('  失敗:', d.text, d.error); },
});

(async () => {
  let items = [];
  const leveled = KARUTA.filter(k => k.lv), unleveled = KARUTA.filter(k => !k.lv);
  const cards = (limit ? leveled.slice(0, limit) : leveled);
  const decoys = (limit ? unleveled.slice(0, Math.ceil(limit / 3)) : unleveled);
  if (only !== 'warmup') {
    cards.forEach(k => items.push(VD.seg(k.yomi, 'metan'), VD.seg(k.tori, 'zunda')));
    decoys.forEach(k => items.push(VD.seg(k.yomi, 'metan'), VD.seg(k.tori, 'zunda')));
  }
  if (only !== 'cards') items.push(...VD.warmupItems());
  const seen = new Set();
  items = items.filter(it => { const k = it.voice + '|' + it.text; if (seen.has(k)) return false; seen.add(k); return true; });
  const todo = items.filter(it => !engine.has(it.voice, it.text));
  console.log(`VOICEVOX: ${engine.baseUrl}`);
  console.log(`全${items.length}件のうち、生成済み${items.length - todo.length}件・これから${todo.length}件`);
  if (!todo.length) { console.log('すべて生成済みです。'); return; }

  const t0 = Date.now();
  let done = 0, fail = 0;
  const timer = setInterval(() => {
    const el = (Date.now() - t0) / 1000, per = done ? el / done : 0;
    process.stdout.write(`\r  ${done}/${todo.length} 件（失敗${fail}）  経過${Math.round(el)}秒  残り約${Math.round(per * (todo.length - done))}秒   `);
  }, 1000);
  await engine.ensure(todo, { prio: 'bg', onEach: (it, ok) => { done++; if (!ok) fail++; } });
  clearInterval(timer);
  console.log(`\n完了：成功${done - fail}件・失敗${fail}件（${Math.round((Date.now() - t0) / 1000)}秒）`);
  if (fail) console.log('失敗した分は、もう一度実行すると続きから生成します。');
})().catch(e => { console.error(e); process.exit(1); });
