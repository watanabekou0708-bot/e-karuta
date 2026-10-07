'use strict';
// サーバーPCが VOICEVOX エンジンで音声(WAV)を生成し、ディスクにキャッシュする。
// クライアントPCは VOICEVOX に直接アクセスせず、サーバーPCから /voice/... でファイルをもらうだけ。
//  ・同じ（声, 文章）は1回しか生成しない（キャッシュ＋同時依頼のまとめ）
//  ・VOICEVOX は同時に複数依頼しても速くならない（実測：5本同時で合計13秒）ので、1本ずつ処理する
//  ・優先度つきの順番待ち：試合で必要な音声(match) → DJの部品(dj) → ウォームアップ(bg)
const fs = require('fs');
const path = require('path');
const VD = require('./public/voice-defs.js');
const { speechText } = require('./public/tts.js');

const PRIORITY = { match: 0, dj: 1, bg: 2 };

class VoiceEngine {
  constructor({ baseUrl, dir, log }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.dir = dir;
    this.log = log || (() => {});
    this.queue = [];            // { prio, voice, text, resolve }
    this.pending = new Map();   // key → Promise（同じ音声の重複依頼をまとめる）
    this.running = false;
    this.downUntil = 0;         // VOICEVOX につながらないとき、この時刻まで即座に失敗にする
    this.stats = { generated: 0, cached: 0, failed: 0, lastMs: 0 };
    fs.mkdirSync(this.dir, { recursive: true });
  }

  file(voice, text) { return path.join(this.dir, VD.voiceDir(voice), VD.voiceKey(voice, text) + '.wav'); }
  has(voice, text) { try { return fs.statSync(this.file(voice, text)).size > 44; } catch (e) { return false; } }

  // 1つ生成（キャッシュにあればそれを使う）。成功なら true、失敗なら false を返す（例外は投げない）。
  request(voice, text, prio = 'bg') {
    if (!VD.VOICES[voice] || !text) return Promise.resolve(false);
    if (this.has(voice, text)) { this.stats.cached++; return Promise.resolve(true); }
    const key = voice + '|' + text;
    const prioN = PRIORITY[prio] ?? 2;
    if (this.pending.has(key)) {
      // 先に低い優先度で依頼済みでも、急ぎで要るなら順番を繰り上げる
      const q = this.queue.find(x => x.key === key);
      if (q && prioN < q.prio) { q.prio = prioN; this._sort(); }
      return this.pending.get(key);
    }
    const p = new Promise(resolve => {
      this.queue.push({ key, prio: prioN, voice, text, resolve });
      this._sort();
      this._pump();
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, p);
    return p;
  }

  // 複数をまとめて生成。onEach(item, ok) が1つ終わるたびに呼ばれる。
  async ensure(items, { prio = 'match', onEach } = {}) {
    let ok = 0, failed = 0;
    await Promise.all(items.map(async it => {
      const r = await this.request(it.voice, it.text, prio);
      if (r) ok++; else failed++;
      if (onEach) { try { onEach(it, r); } catch (e) {} }
    }));
    return { ok, failed };
  }

  _sort() { this.queue.sort((a, b) => a.prio - b.prio); }

  async _pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const job = this.queue.shift();
        let ok = false;
        try { ok = await this._generate(job.voice, job.text); } catch (e) { ok = false; this.log('voice_error', { text: job.text.slice(0, 40), error: String(e.message || e) }); }
        job.resolve(ok);
      }
    } finally { this.running = false; }
  }

  async _generate(voice, text) {
    if (Date.now() < this.downUntil) { this.stats.failed++; return false; }
    const v = VD.VOICES[voice];
    const t0 = Date.now();
    try {
      const q = await fetch(`${this.baseUrl}/audio_query?text=${encodeURIComponent(speechText(text))}&speaker=${v.speaker}`,
        { method: 'POST', signal: AbortSignal.timeout(15000) });
      if (!q.ok) throw new Error('audio_query ' + q.status);
      const query = await q.json();
      query.speedScale = v.speedScale; query.pitchScale = v.pitchScale;
      query.volumeScale = v.volumeScale; query.intonationScale = v.intonationScale;
      const s = await fetch(`${this.baseUrl}/synthesis?speaker=${v.speaker}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query), signal: AbortSignal.timeout(60000),
      });
      if (!s.ok) throw new Error('synthesis ' + s.status);
      const buf = Buffer.from(await s.arrayBuffer());
      if (buf.length < 100) throw new Error('empty audio');
      const file = this.file(voice, text);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = file + '.tmp' + process.pid;
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, file);   // 書きかけのファイルを配らないよう、完成してから置き換える
      this.stats.generated++; this.stats.lastMs = Date.now() - t0;
      this.downUntil = 0;
      return true;
    } catch (e) {
      this.stats.failed++;
      // 接続できない（エンジン停止・ネットワーク断）ときは、しばらく試さずに即失敗にして、試合を止めない
      if (/fetch failed|ECONN|ENOTFOUND|EHOSTUNREACH|Timeout|timed out|aborted/i.test(String(e && (e.message + ' ' + (e.cause && e.cause.code || ''))))) {
        this.downUntil = Date.now() + 15000;
      }
      this.log('voice_fail', { voice, text: text.slice(0, 40), error: String(e.message || e) });
      return false;
    }
  }
}

module.exports = { VoiceEngine };
