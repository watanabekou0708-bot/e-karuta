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
  // 声の設定。
  //  metan ＝四国めたん(ノーマル)：かるたの読み上げ（警告・読み上げます・上の句）と「そこまで」
  //  aoyama＝青山龍星(ノーマル)：答え合わせの読み上げ（上の句の再読み上げ・下の句）
  //  zunda ＝ずんだもん(ノーマル)：DJの実況（札を取ったときのコメント・試合結果）
  const VOICES = {
    metan:  { speaker: 2,  speedScale: 0.9, pitchScale: 0.03, volumeScale: 1.0, intonationScale: 1.0 },
    aoyama: { speaker: 13, speedScale: 0.9, pitchScale: 0.1,  volumeScale: 1.0, intonationScale: 1.0 },
    zunda:  { speaker: 3,  speedScale: 1.0, pitchScale: 0.05, volumeScale: 1.0, intonationScale: 1.0 },
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
  const djSeg = text => seg(text, 'zunda');   // DJ の実況・試合結果はすべてずんだもん

  // ── 固定のセリフ ──
  const FIXED = {
    warn:   'マウスを定位置に戻します。フライングに注意してください。',
    intro:  '読み上げます',
    timeup: 'そこまで',
    notice: 'これは盤面にない札でした',
  };

  // ── 点数の読み上げを部品に分ける（1万2345点 → [1万][2千][3百][45点]）。DJ専用なのでずんだもん固定。──
  //  部品は 万(1〜9)・千(1〜9)・百(1〜9)・下2桁＋点(0〜99) だけなので、事前に全部作っておける。
  function pointsSegments(n) {
    n = Math.round(n);
    if (n < 0) return [djSeg('マイナス'), ...pointsSegments(-n)];
    const man = Math.floor(n / 10000), sen = Math.floor(n / 1000) % 10, hyaku = Math.floor(n / 100) % 10, rest = n % 100;
    const out = [];
    if (man) out.push(djSeg(`${man}万`));
    // 百・千は「1」のときは「いちひゃく」「いっせん」ではなく「ひゃく」「せん」と読む
    // （万は「一万」と読むのでそのまま。例：1137 → 千百37点）
    if (sen) out.push(djSeg(sen === 1 ? '千' : `${sen}千`));
    if (hyaku) out.push(djSeg(hyaku === 1 ? '百' : `${hyaku}百`));
    if (rest || !out.length) out.push(djSeg(`${rest}点`)); else out.push(djSeg('点'));
    return out;
  }
  const rankSegment = r => djSeg(`${r}位`);
  const roundEndSegments = n => [djSeg(`${n}回戦終了です。お疲れ様でした。`)];

  // ── 試合結果画面のDJ（各自の端末で組み立てる）──
  function resultCongratsSegments(score, rank) {
    return [djSeg('おめでとうございます。あなたは'), ...pointsSegments(score), djSeg('で'), rankSegment(rank), djSeg('です。')];
  }
  function resultCloseSegments(diff, rank) {
    return [djSeg('惜しい。あと'), ...pointsSegments(diff), djSeg('で'), rankSegment(rank), djSeg('でした。')];
  }
  // 2位・3位の人へ：1位との点差を伝える（常に読む。しきい値なし）
  function resultNearWinSegments(name, diff) {
    return [djSeg('惜しい。'), nameSeg(name), djSeg('あと'), ...pointsSegments(diff), djSeg('で優勝でした。')];
  }

  // ── 大会モードの結果画面のDJ（各自の端末で、各自の結果に応じて組み立てる）──
  const matchNumSegment = n => djSeg(`第${n}試合`);
  const eventPassedSegments = (name, roundNumber) =>
    [nameSeg(name), djSeg('本戦'), matchNumSegment(roundNumber), djSeg('を突破しました！')];
  const eventEliminatedSegments = name =>
    [djSeg('残念！'), nameSeg(name), djSeg('。敗退です。でも、まだ敗者復活のチャンスがあります。')];
  // 本戦：通過まであと一歩だった人（ボーダーから順位5以内）
  const eventMainCloseSegments = (name, diff) =>
    [djSeg('惜しい！'), nameSeg(name), djSeg('、あと'), ...pointsSegments(diff), djSeg('で勝ち残りでした。')];
  const eventRevivedSegments = name => [nameSeg(name), djSeg('復活しました！本戦に戻ります。')];
  const eventStillOutSegments = name =>
    [djSeg('残念！'), nameSeg(name), djSeg('。ここで敗退です。お疲れ様でした。')];
  // 敗者復活戦：復帰まであと一歩だった人（ボーダーから順位5以内）
  const eventRevivalCloseSegments = (name, diff) =>
    [djSeg('惜しい！'), nameSeg(name), djSeg('、あと'), ...pointsSegments(diff), djSeg('で本戦に復帰できました。')];
  const eventChampionSegments   = name => [nameSeg(name), djSeg('優勝です！おめでとうございます！')];
  const eventRunnerUpSegments   = name => [nameSeg(name), djSeg('準優勝です！')];
  const eventThirdPlaceSegments = name => [nameSeg(name), djSeg('3位入賞です！')];
  // 最終試合：3位まであと一歩だった人（3位から順位5以内）
  const eventFinalCloseSegments = (name, diff) =>
    [djSeg('惜しい！'), nameSeg(name), djSeg('、あと'), ...pointsSegments(diff), djSeg('で3位でした。')];
  const eventRankedSegments = (name, score, rank) =>
    [djSeg('最終試合終了です。'), nameSeg(name), djSeg('、'), ...pointsSegments(score), djSeg('で'), rankSegment(rank), djSeg('でした。')];
  // 最終試合後、全員の個人結果のあとに流す締めの案内（固定文）
  const eventCeremonyClosingSegments = () =>
    [djSeg('これで全ての競技が終了しました。この後表彰式を行います。ロビーに戻り日時と場所を確認して移動してください。')];
  // 観戦者（今の試合の対象外の人）向けの、ラウンド終了の案内
  const eventSpectatorRoundEndSegments = (stageLabel, roundNumber) =>
    [djSeg(stageLabel), matchNumSegment(roundNumber), djSeg('終了です。')];

  // ── 札を取ったときのDJ（サーバーで組み立てる）。名前の部品は「名前＋さん」1つだけ。すべてずんだもん ──
  const nameSeg = name => djSeg(`${name}さん`);
  const DJ_TAKE = [
    name => [nameSeg(name), djSeg('が札をとりました！')],
    (name, score) => [nameSeg(name), djSeg('ナイスキャッチ！'), djSeg('現在'), ...pointsSegments(score), djSeg('です。')],
    name => [djSeg('お見事、'), nameSeg(name)],
    name => [nameSeg(name), djSeg('が1枚ゲットです！')],
  ];
  const djBonusSegments = name => [djSeg('流石です！'), nameSeg(name), djSeg('いい精度。')];
  const djMouseSegments = name => [djSeg('素晴らしい！'), nameSeg(name), djSeg('ナイスマウスさばき')];
  const djNearSegments = name => [nameSeg(name), djSeg('あと少しで1位です！')];

  // ── 答え合わせの読み上げ（上の句の再読み上げ＋下の句）。青山龍星。「そこまで」は含まない ──
  // 上の句を読み終えてから1.5秒おいて下の句を読み上げる。
  function answerSegments(yomi, tori) {
    return [{ ...seg(yomi, 'aoyama'), gapAfter: 1500 }, seg(tori, 'aoyama')];
  }

  // ── 事前に作っておく部品（サーバー起動時のウォームアップ・事前生成スクリプトで使う）──
  function warmupItems() {
    const items = [];
    Object.values(FIXED).forEach(t => items.push(seg(t)));   // 警告・読み上げます・そこまで・これは盤面にない札でした（めたん）
    [
      'が札をとりました！', 'ナイスキャッチ！', '現在', 'です。', 'お見事、', 'が1枚ゲットです！', '流石です！', 'いい精度。', '素晴らしい！',
      'ナイスマウスさばき', 'あと少しで1位です！', 'おめでとうございます。あなたは', 'で', 'です。', '惜しい。あと', 'でした。', 'マイナス', '点',
      '惜しい。', 'あと', 'で優勝でした。',
      // 大会モードの結果画面のDJ用
      '残念！', '。敗退です。でも、まだ敗者復活のチャンスがあります。', '本戦', 'を突破しました！',
      '惜しい！', '、あと', 'で勝ち残りでした。', '復活しました！本戦に戻ります。', '。ここで敗退です。お疲れ様でした。',
      'で本戦に復帰できました。', '優勝です！おめでとうございます！', '準優勝です！', '3位入賞です！', '、', 'で3位でした。',
      '最終試合終了です。', 'これで全ての競技が終了しました。この後表彰式を行います。ロビーに戻り日時と場所を確認して移動してください。',
      '敗者復活戦', '終了です。',
    ].forEach(t => items.push(djSeg(t)));
    for (let i = 1; i <= 9; i++) { items.push(djSeg(`${i}万`)); items.push(djSeg(i === 1 ? '千' : `${i}千`)); items.push(djSeg(i === 1 ? '百' : `${i}百`)); }
    for (let i = 0; i <= 99; i++) items.push(djSeg(`${i}点`));
    for (let r = 1; r <= 99; r++) items.push(rankSegment(r));
    for (let n = 1; n <= 20; n++) items.push(matchNumSegment(n));
    // CPU の名前（強CPU01〜弱CPU30）もDJが呼ぶので、「名前＋さん」を事前に作る
    ['強', '中', '弱'].forEach(t => { for (let i = 1; i <= 30; i++) items.push(nameSeg(`${t}CPU${String(i).padStart(2, '0')}`)); });
    for (let n = 1; n <= 9; n++) items.push(...roundEndSegments(n));
    const seen = new Set();
    return items.filter(it => { const k = it.voice + '|' + it.text; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  return {
    VOICES, CACHE_VERSION, FIXED, hash, voiceDir, voiceKey, voiceUrl, seg, djSeg,
    pointsSegments, rankSegment, roundEndSegments, resultCongratsSegments, resultCloseSegments, resultNearWinSegments,
    nameSeg, DJ_TAKE, djBonusSegments, djMouseSegments, djNearSegments, answerSegments, warmupItems,
    matchNumSegment,
    eventPassedSegments, eventEliminatedSegments, eventMainCloseSegments, eventRevivedSegments, eventStillOutSegments,
    eventRevivalCloseSegments, eventChampionSegments, eventRunnerUpSegments, eventThirdPlaceSegments,
    eventFinalCloseSegments, eventRankedSegments, eventCeremonyClosingSegments, eventSpectatorRoundEndSegments,
  };
});
