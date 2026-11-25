'use strict';
// プレイ後アンケート（案C）のサーバー側。
//  ・大会の最終試合後／練習の全試合後に「回答の受付」を始め、次のゲームが始まると終える
//  ・受付を始めた時点で参加していた人だけが対象（後から開いた人には出さない）
//  ・教卓PCの大会設定画面で「出す／出さない」を切り替えられる
//  ・回答は logs/survey-<起動日時>.csv に1人1行で追記する（名前は記録しない。Excelでそのまま開ける）
const fs = require('fs');
const path = require('path');

// 画面（public/survey.js）の選択肢と同じもの。ここに無い値は保存しない
const GOOD = ['札を取る操作', '読み上げの声', '実況（DJ）', '得点の表示', '見た目・デザイン', '敗者復活戦', '観戦モード', '用語の勉強になった'];
const BAD  = ['クリックしても取れない', 'マウスカーソルが変・動かない', '札の文字が読みにくい', '音が出ない・ずれる・途切れる',
  '画面が止まった・動きが重い', '次の画面や観戦に正しく移らない', '何をすればいいか分からない', '特になし'];
const COMMENT_MAX = 500;
const HEADER = ['回答日時', 'モード', '学年', 'コース', '本戦の試合数', '敗者復活戦の試合数', '最後の結果',
  '操作のしやすさ', '画面の見やすさ', '分かりやすさ', '良かったところ', '困ったところ', '自由記述'];

function createSurvey({ logDir, fileName }) {
  const file = path.join(logDir, fileName);
  let enabled = true;     // 教卓PCの切り替え（サーバーを起動し直すと「出す」に戻る）
  let session = null;     // 受付中の回 { id, mode, targets:Map<キー, 参加情報>, done:Set<キー> }
  let seq = 0;

  // CSVの1項目。表計算ソフトで数式として実行されないよう、先頭が = + - @ の文字には ' を付ける
  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function append(values) {
    const line = values.map(csvCell).join(',') + '\r\n';
    if (!fs.existsSync(file)) fs.writeFileSync(file, '﻿' + HEADER.map(csvCell).join(',') + '\r\n', 'utf8');
    fs.appendFileSync(file, line, 'utf8');
  }

  return {
    file,
    setEnabled(v) { enabled = !!v; },
    // targets: [[キー, { grade, course, main, revival, result }]]
    open(mode, targets) { session = { id: `${Date.now()}-${++seq}`, mode, targets: new Map(targets), done: new Set() }; },
    close() { session = null; },
    // その人の画面に送る状態
    stateFor(key) {
      const open = enabled && !!session && session.targets.has(key) && !session.done.has(key);
      return { open, sessionId: session ? session.id : null };
    },
    // 教卓PCに見せる状態
    summary() {
      return { enabled, accepting: !!session, answered: session ? session.done.size : 0, targets: session ? session.targets.size : 0 };
    },
    submit(key, data) {
      if (!this.stateFor(key).open) return { ok: false, reason: 'closed' };
      const d = data || {};
      if (d.sessionId !== session.id) return { ok: false, reason: 'closed' };
      const scores = [d.operation, d.visibility, d.clarity];
      if (!scores.every(n => Number.isInteger(n) && n >= 1 && n <= 5)) return { ok: false, reason: 'invalid' };
      const pick = (list, allowed) => allowed.filter(x => Array.isArray(list) && list.includes(x)).join(' / ');
      const info = session.targets.get(key);
      try {
        append([new Date().toLocaleString('ja-JP'), session.mode === 'event' ? '大会' : '練習',
          info.grade, info.course, info.main, info.revival, info.result, ...scores,
          pick(d.good, GOOD), pick(d.bad, BAD), String(d.comment || '').slice(0, COMMENT_MAX)]);
      } catch (e) { return { ok: false, reason: 'save_failed' }; }
      session.done.add(key);
      return { ok: true };
    },
  };
}

module.exports = { createSurvey, GOOD, BAD };
