'use strict';
// VOICEVOX 音声の共通定義（サーバー server.js / voice-engine.js とブラウザ voice.js / game.js の両方が読む）。
//  ・声の種類と設定（練習モード・大会モードとも同じ）
//  ・「文章 → 音声ファイル」を結ぶキー（同じ文章は同じファイル名になる）
//  ・DJ の実況や結果発表など、毎回変わる文章を「キャッシュしやすい部品」に分ける関数
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VOICE_DEFS = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // 声の設定。metan＝四国めたん(ノーマル)、zunda＝ずんだもん(ノーマル)。
  //  ・正解の「下の句」（答えの用語）を読むときだけ zunda
  //  ・それ以外（読み上げます・上の句・そこまで・DJなど）はすべて metan
  const VOICES = {
    metan: { speaker: 2, speedScale: 0.9, pitchScale: 0.03, volumeScale: 1.0, intonationScale: 1.0 },
    zunda: { speaker: 3, speedScale: 1.0, pitchScale: 0.0,  volumeScale: 1.0, intonationScale: 1.0 },
  };
  // 読みの辞書や話者設定を大きく変えたときに上げる（古いキャッシュを使わないようにする）
  const CACHE_VERSION = 'v1';

  // 文字列のハッシュ（cyrb53）。http（非HTTPS）のLAN接続では crypto.subtle が使えないので自前で計算する。
  function hash(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  }
  function voiceDir(voice) {
    const v = VOICES[voice];
    return `${voice}_${CACHE_VERSION}_${hash(JSON.stringify(v)).slice(0, 6)}`;
  }
  function voiceKey(voice, text) {
    return hash(voice + '\u0000' + text) + hash(text, 7).slice(0, 4);   // 衝突しにくいよう別シードを足す
  }
  const voiceUrl = (voice, text) => `/voice/${voiceDir(voice)}/${voiceKey(voice, text)}.wav`;

  const seg = (text, voice = 'metan') => ({ voice, text });

  // ── 固定のセリフ ──
  const FIXED = {
    warn:   'マウスを定位置に戻します。フライングに注意してください。',
    intro:  '読み上げます',
    timeup: 'そこまで',
    notice: 'これは盤面にない札でした',
  };

  // ── 点数の読み上げを部品に分ける（1万2345点 → [1万][2千][3百][45点]）──
  //  部品は 万(1〜9)・千(1〜9)・百(1〜9)・下2桁＋点(0〜99) だけなので、事前に全部作っておける。
  function pointsSegments(n) {
    n = Math.round(n);
    if (n < 0) return [seg('マイナス'), ...pointsSegments(-n)];
    const man = Math.floor(n / 10000), sen = Math.floor(n / 1000) % 10, hyaku = Math.floor(n / 100) % 10, rest = n % 100;
    const out = [];
    if (man) out.push(seg(`${man}万`));
    if (sen) out.push(seg(`${sen}千`));
    if (hyaku) out.push(seg(`${hyaku}百`));
    if (rest || !out.length) out.push(seg(`${rest}点`)); else out.push(seg('点'));
    return out;
  }
  const rankSegment = r => seg(`${r}位`);
  const roundEndSegments = n => [seg(`${n}回戦終了です。お疲れ様でした。`)];

  // ── 試合結果画面のDJ（各自の端末で組み立てる）──
  function resultCongratsSegments(score, rank) {
    return [seg('おめでとうございます。あなたは'), ...pointsSegments(score), seg('で'), rankSegment(rank), seg('です。')];
  }
  function resultCloseSegments(diff, rank) {
    return [seg('惜しい。あと'), ...pointsSegments(diff), seg('で'), rankSegment(rank), seg('でした。')];
  }

  // ── 札を取ったときのDJ（サーバーで組み立てる）。名前の部品は「名前＋さん」1つだけ ──
  const nameSeg = name => seg(`${name}さん`);
  const DJ_TAKE = [
    name => [nameSeg(name), seg('が札をとりました！')],
    (name, score) => [nameSeg(name), seg('ナイスキャッチ！'), seg('現在'), ...pointsSegments(score), seg('です。')],
    name => [seg('お見事、'), nameSeg(name)],
    name => [nameSeg(name), seg('が1枚ゲットです！')],
  ];
  const djBonusSegments = name => [seg('流石です！'), nameSeg(name), seg('いい精度。')];
  const djMouseSegments = name => [seg('素晴らしい！'), nameSeg(name), seg('ナイスマウスさばき')];
  const djNearSegments = name => [nameSeg(name), seg('あと少しで1位です！')];

  // ── 事前に作っておく部品（サーバー起動時のウォームアップ・事前生成スクリプトで使う）──
  function warmupItems() {
    const items = [];
    Object.values(FIXED).forEach(t => items.push(seg(t)));
    ['が札をとりました！', 'ナイスキャッチ！', '現在', 'です。', 'お見事、', 'が1枚ゲットです！', '流石です！', 'いい精度。', '素晴らしい！',
      'ナイスマウスさばき', 'あと少しで1位です！', 'おめでとうございます。あなたは', 'で', 'です。', '惜しい。あと', 'でした。', 'マイナス', '点']
      .forEach(t => items.push(seg(t)));
    for (let i = 1; i <= 9; i++) { items.push(seg(`${i}万`)); items.push(seg(`${i}千`)); items.push(seg(`${i}百`)); }
    for (let i = 0; i <= 99; i++) items.push(seg(`${i}点`));
    for (let r = 1; r <= 99; r++) items.push(rankSegment(r));
    // CPU の名前（強CPU01〜弱CPU30）もDJが呼ぶので、「名前＋さん」を事前に作る
    ['強', '中', '弱'].forEach(t => { for (let i = 1; i <= 30; i++) items.push(nameSeg(`${t}CPU${String(i).padStart(2, '0')}`)); });
    // CPU の名前（強CPU01〜弱CPU30）もDJが呼ぶので、「名前＋さん」を事前に作る
    ['強', '中', '弱'].forEach(t => { for (let i = 1; i <= 30; i++) items.push(nameSeg(`${t}CPU${String(i).padStart(2, '0')}`)); });
    for (let n = 1; n <= 9; n++) items.push(...roundEndSegments(n));
    const seen = new Set();
    return items.filter(it => { const k = it.voice + '|' + it.text; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  return {
    VOICES, CACHE_VERSION, FIXED, hash, voiceDir, voiceKey, voiceUrl, seg,
    pointsSegments, rankSegment, roundEndSegments, resultCongratsSegments, resultCloseSegments,
    nameSeg, DJ_TAKE, djBonusSegments, djMouseSegments, djNearSegments, warmupItems,
  };
});
