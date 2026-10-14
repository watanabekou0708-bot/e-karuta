'use strict';
// 読み札（上の句）・答え（下の句）の読み上げ音声を、音声認識(Whisper)で文字起こしして
// 元の文章と突き合わせ、誤読の疑いがある札を一覧にするツール。
//
// 使い方：
//   node check_misreads.js                 … 読み札（上の句・めたん）を全件チェック
//   node check_misreads.js --from=257       … ID 257以降だけチェック
//   node check_misreads.js --from=257 --to=300
//   node check_misreads.js --field=tori     … 答え（下の句・青山龍星、答え合わせで実際に読む声）をチェック
//   node check_misreads.js --whisper=http://zeroai.local/whisper-api
//   node check_misreads.js --rescore=misread-reports/misread-report-xxx.json
//                                           … Whisperを呼び直さず、既存結果を採点し直すだけ
//
// 結果は misread-reports/ に、違いが大きい順に並べたHTML（人が読む用）と
// JSON（次回の比較・自動処理用）の両方で保存される。
//
// 仕組み：各札の読み札をVOICEVOXの音声（通常プレイと同じキャッシュ）で用意し、
// Whisper（音声認識）で文字起こしする。読み間違えていなければ元の文章とほぼ一致するはずなので、
// 差が大きいものほど「誤読の疑いが強い」札として上に並べる。句読点や数字の表記ゆれ
// （「。」の有無、「4つ」と「四つ」など）は誤読ではないのでできるだけ無視するよう正規化してから比べる。

const fs = require('fs');
const path = require('path');
const { VoiceEngine } = require('./voice-engine.js');
const VD = require('./public/voice-defs.js');
const D = require('./public/karuta-data.js');
const { speechText } = require('./public/tts.js');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
}));

const WHISPER_BASE = args.whisper || process.env.WHISPER_BASE || 'http://zeroai.local/whisper-api';
const VOICEVOX_URL = process.env.VOICEVOX_URL || 'http://192.168.0.19:50021';
const VOICE_CACHE_DIR = process.env.VOICE_CACHE_DIR || path.join(__dirname, 'voice-cache');
const REPORT_DIR = path.join(__dirname, 'misread-reports');
const WHISPER_RETRY = 2;
const WHISPER_TIMEOUT_MS = 30000;

const allIds = D.map(k => k.id).sort((a, b) => a - b);
const minId = allIds[0], maxId = allIds[allIds.length - 1];
const fromId = args.from ? +args.from : minId;
const toId = args.to ? +args.to : maxId;

// 読み札（上の句・めたん）か、答え（下の句・青山龍星。答え合わせで実際に読む声）か
const FIELD = args.field === 'tori' ? 'tori' : 'yomi';
const VOICE = FIELD === 'tori' ? 'aoyama' : 'metan';
const FIELD_LABEL = FIELD === 'tori' ? '答え（下の句）' : '読み札（上の句）';

const byId = Object.fromEntries(D.map(k => [k.id, k]));
const targets = D.filter(k => k.id >= fromId && k.id <= toId).sort((a, b) => a.id - b.id);

// ── 文章の正規化（表記ゆれを誤読と誤判定しないため）────────────────
const KANJI_NUM = { '〇': '0', '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9', '十': '10' };
// カタカナ→ひらがな（Whisperの文字起こしは単語によってカタカナ/ひらがなの選び方がゆれるため、
// 「音が合っているか」を見たいここでは区別しない）
function kataToHira(s) {
  return s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
function normalize(text) {
  return kataToHira(String(text))
    .replace(/[。、．，,.!！?？「」『』（）()\[\]［］・\s]/g, '')
    .replace(/[〇一二三四五六七八九]/g, c => KANJI_NUM[c] ?? c)
    .toLowerCase();
}

// ── 正規化後の文字列同士のレーベンシュタイン距離（挿入・削除・置換の最小回数）────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}
function rawDiffScore(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na.length && !nb.length) return 0;
  return levenshtein(na, nb) / Math.max(na.length, nb.length, 1);
}
// 0（完全一致）〜1（全く違う）の差分スコア。
// 「表示文のまま」と「tts.js補正後（英字→カタカナ等）」の両方と比べ、近い方を採用する。
// VOICEVOX自体が辞書に無い英単語もそれなりに読める（例：Apple→アップル）ため、どちらか
// 一方だけと比べると「辞書に無いだけで実際は正しく読めている」ものまで誤読扱いになってしまう。
function diffScore(expected, got) {
  const viaRaw = rawDiffScore(expected, got);
  const viaSpoken = rawDiffScore(speechText(expected), got);
  return Math.min(viaRaw, viaSpoken);
}

async function transcribe(file) {
  let lastErr;
  for (let attempt = 0; attempt <= WHISPER_RETRY; attempt++) {
    try {
      const buf = fs.readFileSync(file);
      const fd = new FormData();
      fd.append('file', new Blob([buf], { type: 'audio/wav' }), path.basename(file));
      fd.append('language', 'ja');
      const r = await fetch(`${WHISPER_BASE}/transcribe`, { method: 'POST', body: fd, signal: AbortSignal.timeout(WHISPER_TIMEOUT_MS) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      return d.text || '';
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  throw lastErr;
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function writeReport(results, meta) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `misread-report-${stamp}`;
  const sorted = [...results].sort((a, b) => (b.score ?? 2) - (a.score ?? 2));

  fs.writeFileSync(path.join(REPORT_DIR, base + '.json'), JSON.stringify({ meta, results: sorted }, null, 2));

  const rows = sorted.map(r => {
    if (r.error) {
      return `<tr class="err"><td>${r.id}</td><td colspan="3">確認できず（${escHtml(r.error)}）</td></tr>`;
    }
    const pct = Math.round(r.score * 100);
    const cls = r.score >= 0.15 ? 'bad' : r.score >= 0.05 ? 'warn' : 'ok';
    return `<tr class="${cls}">
      <td>${r.id}</td>
      <td class="score">${pct}%</td>
      <td>${escHtml(r.expected)}</td>
      <td>${escHtml(r.got)}</td>
    </tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>誤読チェック結果</title>
<style>
body{font-family:system-ui,"Yu Gothic UI",sans-serif;background:#0b1020;color:#dbe6ff;margin:0;padding:20px}
h1{font-size:1.3rem}
.sub{color:#8fa3cc;font-size:.85rem;margin-bottom:14px}
table{width:100%;border-collapse:collapse;font-size:.88rem}
th,td{border-bottom:1px solid #1f2a4d;padding:6px 8px;text-align:left;vertical-align:top}
th{position:sticky;top:0;background:#0b1020}
.score{white-space:nowrap;font-weight:700}
tr.bad{background:#3a1f2a}
tr.bad .score{color:#ff8a8a}
tr.warn{background:#2a2a1a}
tr.warn .score{color:#ffd166}
tr.ok .score{color:#6fcf97}
tr.err{background:#2a1a1a;color:#aaa}
</style></head>
<body>
<h1>誤読チェック結果（${escHtml(meta.fieldLabel || FIELD_LABEL)}）</h1>
<div class="sub">対象: ID ${meta.fromId}〜${meta.toId}（${meta.total}件） / 実行: ${meta.startedAt}<br>
「差分」が大きいものほど誤読の疑いが強い（句読点・数字の表記ゆれは無視するよう正規化済み）。
実際に音は <code>tts-check.html</code> で該当の文章を検索して確認してください。</div>
<table>
<thead><tr><th>ID</th><th>差分</th><th>元の文章</th><th>音声認識の結果</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body></html>`;
  fs.writeFileSync(path.join(REPORT_DIR, base + '.html'), html);
  return { jsonFile: path.join(REPORT_DIR, base + '.json'), htmlFile: path.join(REPORT_DIR, base + '.html') };
}

// 既存の結果(JSON)を、Whisperへ再度問い合わせずにスコアだけ付け直す
// （発音辞書(tts.js)を直した後の見直しや、採点ロジック自体の改善に使う）。
async function rescoreFromFile(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const results = data.results.map(r => r.error ? r : { ...r, score: diffScore(r.expected, r.got) });
  const { jsonFile, htmlFile } = writeReport(results, { ...data.meta, startedAt: data.meta.startedAt + '（再採点: ' + new Date().toISOString() + '）' });
  const errorCount = results.filter(r => r.error).length;
  const suspectCount = results.filter(r => !r.error && r.score >= 0.15).length;
  console.log(`再採点完了。疑わしい札(差分15%以上): ${suspectCount}件 / 確認できず: ${errorCount}件`);
  console.log('HTML:', htmlFile);
  console.log('JSON:', jsonFile);
}

async function main() {
  if (args.rescore) { await rescoreFromFile(args.rescore); return; }
  console.log(`対象: ${FIELD_LABEL} ID ${fromId}〜${toId}（${targets.length}件） / Whisper: ${WHISPER_BASE}`);
  const engine = new VoiceEngine({ baseUrl: VOICEVOX_URL, dir: VOICE_CACHE_DIR, log: () => {} });
  const results = [];
  let done = 0;
  for (const card of targets) {
    const text = card[FIELD];
    const r = { id: card.id, expected: text };
    try {
      const ok = await engine.request(VOICE, text, 'bg');
      if (!ok) throw new Error('音声の準備に失敗（VOICEVOXに接続できない可能性）');
      const file = engine.file(VOICE, text);
      const got = await transcribe(file);
      r.got = got;
      r.score = diffScore(text, got);
    } catch (e) {
      r.error = String(e && e.message || e);
    }
    results.push(r);
    done++;
    if (done % 10 === 0 || done === targets.length) {
      console.log(`${done}/${targets.length} 完了`);
    }
  }
  const meta = { fromId, toId, total: targets.length, startedAt: new Date().toISOString(), field: FIELD, fieldLabel: FIELD_LABEL };
  const { jsonFile, htmlFile } = writeReport(results, meta);
  const errorCount = results.filter(r => r.error).length;
  const suspectCount = results.filter(r => !r.error && r.score >= 0.15).length;
  console.log(`完了。疑わしい札(差分15%以上): ${suspectCount}件 / 確認できず: ${errorCount}件`);
  console.log('HTML:', htmlFile);
  console.log('JSON:', jsonFile);
}

main().catch(e => { console.error('ERROR', e); process.exit(1); });
