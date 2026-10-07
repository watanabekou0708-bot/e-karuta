'use strict';
// サーバーPCが VOICEVOX で作って配る音声ファイル(WAV)を、各クライアントで先読みして Web Audio で再生する。
//  ・試合の準備中に、その試合で使う音声をまとめて取得してメモリ(AudioBuffer)に置いておく
//  ・再生は「サーバー時刻 at」を指定して予約するので、全PCがほぼ同時に鳴り始める（ネットワークの待ちは再生中に発生しない）
//  ・1つでも取得できていない部品があるときは play() が null を返し、呼び出し側がブラウザ音声(TTS)に切り替える
window.Voice = (() => {
  const D = window.VOICE_DEFS;
  const cache = new Map();      // url → AudioBuffer
  const inflight = new Map();   // url → Promise<boolean>
  let getCtx = null;
  let nowServer = () => Date.now();

  const urlOf = it => D.voiceUrl(it.voice, it.text);

  async function fetchDecode(url) {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    return await getCtx().decodeAudioData(ab);
  }

  function loadOne(it) {
    const url = urlOf(it);
    if (cache.has(url)) return Promise.resolve(true);
    if (inflight.has(url)) return inflight.get(url);
    const p = (async () => {
      try {
        const buf = await fetchDecode(url);
        if (buf) { cache.set(url, buf); return true; }
      } catch (e) { /* 取得できなければ false（呼び出し側がブラウザ音声で代用） */ }
      return false;
    })().finally(() => inflight.delete(url));
    inflight.set(url, p);
    return p;
  }

  // items=[{voice,text}] をまとめて取得する。サーバーにまだ無い分は、ensure=true なら生成を依頼して待つ。
  async function preload(items, { ensure = false, concurrency = 6, onEach } = {}) {
    const uniq = [];
    const seen = new Set();
    items.forEach(it => { const u = urlOf(it); if (!seen.has(u)) { seen.add(u); uniq.push(it); } });
    let ok = 0, failed = 0, idx = 0;
    const run = async list => {
      let i = 0;
      const missing = [];
      const worker = async () => {
        while (i < list.length) {
          const it = list[i++];
          const r = await loadOne(it);
          if (r) { ok++; if (onEach) onEach(it, true); } else missing.push(it);
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
      return missing;
    };
    let missing = await run(uniq);
    if (missing.length && ensure) {
      try {
        await fetch('/api/voice/ensure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: missing.slice(0, 24) }) });
      } catch (e) { /* サーバーに届かなければ、そのままブラウザ音声へ */ }
      missing = await run(missing);
    }
    failed = missing.length;
    missing.forEach(it => { if (onEach) onEach(it, false); });
    return { ok, failed };
  }

  const missing = [];   // 再生時に音声ファイルが無かった分（確認用）
  const has = it => cache.has(urlOf(it));
  const hasAll = items => items.every(has);

  // items を順番に、サーバー時刻 at から予約再生する。戻り値は stop() を持つハンドル（再生できなければ null）。
  //  opts.gapMs      … 各部品の間の無音(ms)。items[i].gapAfter があればそちらを優先
  //  opts.onItemStart(i) … i 番目の部品が鳴り始めたとき
  //  opts.onDone     … 最後の部品が鳴り終わったとき
  // items を順番に、サーバー時刻 at から予約再生する。音声ファイルが無い部品は無音（長さ0）として
  // 時間だけ進める（読み上げのタイミングを崩さないため）。ブラウザ音声には切り替えない。
  //  opts.gapMs      … 各部品の間の無音(ms)。items[i].gapAfter があればそちらを優先
  //  opts.onItemStart(i) … i 番目の部品が鳴り始めたとき
  //  opts.onDone     … 最後の部品が鳴り終わったとき
  function play(items, opts = {}) {
    if (!items.length) return null;
    const ctx = getCtx();
    const gapDefault = opts.gapMs ?? 150;
    const delay = opts.at ? Math.max(0.03, (opts.at - nowServer()) / 1000) : 0.03;
    let t = ctx.currentTime + delay;
    const sources = [], timers = [];
    let stopped = false;
    items.forEach((it, i) => {
      const buf = cache.get(urlOf(it));
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(t);
        sources.push(src);
      } else {
        missing.push(urlOf(it));
      }
      if (opts.onItemStart) timers.push(setTimeout(() => { if (!stopped) opts.onItemStart(i); }, Math.max(0, (t - ctx.currentTime) * 1000)));
      const dur = buf ? buf.duration : 0;
      if (i === items.length - 1) {
        timers.push(setTimeout(() => { if (!stopped) { stopped = true; if (opts.onDone) opts.onDone(); } },
          Math.max(0, (t + dur - ctx.currentTime) * 1000) + 30));
      }
      t += dur + (it.gapAfter ?? gapDefault) / 1000;
    });
    return {
      stop() { stopped = true; sources.forEach(s => { try { s.stop(); } catch (e) {} }); timers.forEach(clearTimeout); },
    };
  }

  return {
    init(o) { getCtx = o.getCtx; if (o.nowServer) nowServer = o.nowServer; },
    preload, has, hasAll, play, urlOf, cacheSize: () => cache.size, missing,
  };
})();
