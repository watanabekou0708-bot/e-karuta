// 所要時間の記録（timing-log.js）
// 試合ごとの所要時間・準備の内訳（盤面整理・音声待ち・準備待ち・テスト音声）と、
// 1枚ごとの「読み上げ開始 → 結果発表（DJ）の音声終了」までの時間を計測し、
// logs/timing-<起動日時>.md に Markdown で書き出す。試合が終わるたびにファイル全体を書き直す。
// server.js から呼び出す。サーバーの進行には一切影響しない（失敗しても握りつぶす）。
const fs = require('fs');
const path = require('path');

const fmtSec = ms => (ms == null || !isFinite(ms)) ? '—' : (ms / 1000).toFixed(1);
const fmtMinSec = ms => {
  if (ms == null || !isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`;
};
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const clock = t => t ? new Date(t).toLocaleTimeString('ja-JP', { hour12: false }) : '—';

class TimingLog {
  // filePath: 書き出す .md のパス / now: 現在時刻(ms)を返す関数（テスト用に差し替え可）
  constructor(filePath, now = Date.now) {
    this.filePath = filePath;
    this.now = now;
    this.startedAt = now();
    this.matches = [];   // 完了・中断した試合
    this.cur = null;     // 進行中の試合
    this.lastMatchEnd = null;
  }

  // 盤面整理の開始 = 試合の準備の開始
  matchBegin({ label, mode, participants }) {
    if (this.cur) this.matchEnd({ aborted: true });   // 前の試合が終了通知なしで残っていたら中断として記録
    const t = this.now();
    this.cur = {
      label, mode, participants: participants || 0,
      begin: t, gapBeforeMs: this.lastMatchEnd ? t - this.lastMatchEnd : null,
      memoEnd: null, playReady: null, readyStart: null, readyEnd: null, readyReason: null, readyNeed: null,
      soundStart: null, cards: [], card: null, end: null, aborted: false,
    };
  }

  // 盤面整理の時間が終わった（音声待ちに入る）
  memoEnd() { if (this.cur && !this.cur.memoEnd) this.cur.memoEnd = this.now(); }
  // 音声が揃った（または待ち切れず）試合開始状態になった
  playReady() { if (this.cur && !this.cur.playReady) this.cur.playReady = this.now(); }
  readyStart(need) { if (this.cur) { this.cur.readyStart = this.now(); this.cur.readyNeed = need; } }
  readyEnd(reason) { if (this.cur && this.cur.readyStart && !this.cur.readyEnd) { this.cur.readyEnd = this.now(); this.cur.readyReason = reason; } }
  soundStart() { if (this.cur && !this.cur.soundStart) this.cur.soundStart = this.now(); }

  // 札の読み上げ開始（本物の札・ダミー読み）
  cardStart({ kind, cardId, tori, level }) {
    if (!this.cur) return;
    if (this.cur.card) this.cardEnd('次の読み上げ開始');   // 終了通知が来なかった札は、次の開始で閉じる
    this.cur.card = { kind, cardId, tori, level, start: this.now(), readMs: null, announceStart: null, end: null, taken: false, endedBy: null };
  }
  cardReadEnd(readMs) { if (this.cur && this.cur.card) this.cur.card.readMs = readMs; }
  // 結果発表（そこまで → DJ → 答え合わせ）の開始
  announceStart(taken) {
    if (!this.cur || !this.cur.card || this.cur.card.announceStart) return;
    this.cur.card.announceStart = this.now();
    this.cur.card.taken = !!taken;
  }
  // 結果発表の音声が終わった（= 1枚分の終了）
  cardEnd(by) {
    if (!this.cur || !this.cur.card) return;
    const c = this.cur.card;
    c.end = this.now(); c.endedBy = by || null;
    this.cur.cards.push(c);
    this.cur.card = null;
    this.write();   // 試合の途中で止まっても、ここまでの記録が残るように1枚ごとにも書き出す
  }

  matchEnd({ aborted } = {}) {
    if (!this.cur) return;
    if (this.cur.card) this.cardEnd(aborted ? '中断' : '試合終了');
    this.cur.end = this.now();
    this.cur.aborted = !!aborted;
    this.matches.push(this.cur);
    this.lastMatchEnd = this.cur.end;
    this.cur = null;
    this.write();
  }

  write() {
    try { fs.writeFileSync(this.filePath, this.render(), 'utf8'); } catch (e) { /* 記録の失敗でゲームを止めない */ }
  }

  // 1試合の集計
  summarize(m) {
    const firstCard = m.cards.length ? m.cards[0].start : null;
    const cycles = m.cards.filter(c => c.end).map(c => c.end - c.start);
    const real = m.cards.filter(c => c.kind === 'real' && c.end).map(c => c.end - c.start);
    return {
      total: m.end - m.begin,
      prep: firstCard ? firstCard - m.begin : null,
      memo: m.memoEnd ? m.memoEnd - m.begin : null,
      voice: (m.memoEnd && m.playReady) ? Math.max(0, m.playReady - m.memoEnd) : null,
      ready: (m.readyStart && m.readyEnd) ? m.readyEnd - m.readyStart : null,
      sound: (m.soundStart && firstCard) ? firstCard - m.soundStart : null,
      play: firstCard ? m.end - firstCard : null,
      cycleAvg: avg(cycles), realAvg: avg(real),
      cycleMax: cycles.length ? Math.max(...cycles) : null,
    };
  }

  render() {
    const L = [];
    // 進行中の試合も、ここまでの分を「（進行中）」として載せる
    const done = this.cur ? [...this.matches, { ...this.cur, end: this.now(), inProgress: true }] : this.matches;
    L.push('# 大会 所要時間の記録');
    L.push('');
    L.push(`- 記録開始: ${new Date(this.startedAt).toLocaleString('ja-JP', { hour12: false })}`);
    L.push(`- 最終更新: ${new Date(this.now()).toLocaleString('ja-JP', { hour12: false })}`);
    L.push(`- 記録した試合数: ${done.length}${this.cur ? '（うち進行中 1）' : ''}`);
    L.push('- 見積り（手順書の前提）: 1枚あたり25秒、1試合の準備 本戦105秒・敗者復活75秒、先生の操作30秒');
    L.push('');

    if (!done.length) { L.push('まだ終了した試合がありません。'); return L.join('\n') + '\n'; }

    // ── 試合ごとの一覧 ──
    L.push('## 試合ごとの所要時間');
    L.push('');
    L.push('| # | 試合 | 開始 | 人数 | 枚数 | 試合全体 | 準備(開始前) | 読み上げ〜終了 | 1枚あたり平均(秒) | 直前の試合との間隔 |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    done.forEach((m, i) => {
      const s = this.summarize(m);
      L.push(`| ${i + 1} | ${m.label}${m.aborted ? '（中断）' : m.inProgress ? '（進行中）' : ''} | ${clock(m.begin)} | ${m.participants} | ${m.cards.length} | ${fmtMinSec(s.total)} | ${fmtMinSec(s.prep)} | ${fmtMinSec(s.play)} | ${fmtSec(s.cycleAvg)} | ${fmtMinSec(m.gapBeforeMs)} |`);
    });
    L.push('');
    L.push('- 試合全体 = 盤面整理の開始 → 試合終了。準備 = 盤面整理の開始 → 最初の読み上げ開始。');
    L.push('- 直前の試合との間隔 = 前の試合の終了 → この試合の盤面整理の開始（結果表示・「ホームに戻る」・先生の操作の時間）。');
    L.push('');

    // ── 準備の内訳 ──
    L.push('## 準備時間の内訳（秒）');
    L.push('');
    L.push('| # | 試合 | 盤面整理 | 音声待ち | 準備待ち（全員のクリック） | 準備待ちの終わり方 | テスト音声〜最初の読み上げ |');
    L.push('|---|---|---|---|---|---|---|');
    done.forEach((m, i) => {
      const s = this.summarize(m);
      L.push(`| ${i + 1} | ${m.label} | ${fmtSec(s.memo)} | ${fmtSec(s.voice)} | ${fmtSec(s.ready)} | ${m.readyReason || '—'} | ${fmtSec(s.sound)} |`);
    });
    L.push('');

    // ── 全体の平均（見積りとの比較）──
    const group = (pred) => done.filter(pred);
    const avgOf = (ms, f) => avg(ms.map(f).filter(v => v != null));
    const allCards = done.flatMap(m => m.cards.filter(c => c.end));
    const realCards = allCards.filter(c => c.kind === 'real');
    const decoyCards = allCards.filter(c => c.kind === 'decoy');
    const mains = group(m => /^本戦/.test(m.label));
    const revs = group(m => /^敗者復活/.test(m.label));
    L.push('## 平均（見積りとの比較）');
    L.push('');
    L.push('| 項目 | 実測 | 見積り |');
    L.push('|---|---|---|');
    L.push(`| 1枚あたり（本物の札）：読み上げ開始 → DJ終了 | ${fmtSec(avg(realCards.map(c => c.end - c.start)))}秒（${realCards.length}枚） | 25秒 |`);
    L.push(`| 1枚あたり（ダミー読み）：読み上げ開始 → 終了 | ${fmtSec(avg(decoyCards.map(c => c.end - c.start)))}秒（${decoyCards.length}回） | — |`);
    L.push(`| 結果発表（そこまで → DJ → 答え合わせ）の長さ | ${fmtSec(avg(allCards.filter(c => c.announceStart).map(c => c.end - c.announceStart)))}秒 | 約10秒 |`);
    L.push(`| 本戦の準備（盤面整理の開始 → 最初の読み上げ） | ${fmtSec(avgOf(mains, m => this.summarize(m).prep))}秒（${mains.length}試合） | 105秒 |`);
    L.push(`| 敗者復活戦の準備 | ${fmtSec(avgOf(revs, m => this.summarize(m).prep))}秒（${revs.length}試合） | 75秒 |`);
    L.push(`| 試合と試合の間隔 | ${fmtSec(avgOf(done, m => m.gapBeforeMs))}秒 | 30秒（先生の操作） |`);
    L.push('');

    // ── 札ごとの詳細 ──
    L.push('## 1枚ごとの詳細');
    L.push('');
    L.push('「読み上げ開始 → 結果発表の音声終了」を札ごとに記録しています（秒）。');
    done.forEach((m, i) => {
      L.push('');
      L.push(`### ${i + 1}. ${m.label}（${clock(m.begin)} 開始）`);
      L.push('');
      L.push('| 枚目 | 種別 | 札 | レベル | 上の句の読み上げ | 結果発表の長さ | 読み上げ開始 → DJ終了 | 取られたか | 終了の契機 |');
      L.push('|---|---|---|---|---|---|---|---|---|');
      m.cards.forEach((c, k) => {
        L.push(`| ${k + 1} | ${c.kind === 'decoy' ? 'ダミー' : '本物'} | ${c.tori || '—'} | ${c.level || '—'} | ${fmtSec(c.readMs)} | ${fmtSec(c.announceStart ? c.end - c.announceStart : null)} | ${fmtSec(c.end - c.start)} | ${c.kind === 'decoy' ? '—' : (c.taken ? '取られた' : '誰も取れず')} | ${c.endedBy || '—'} |`);
      });
    });
    return L.join('\n') + '\n';
  }
}

module.exports = { TimingLog };
