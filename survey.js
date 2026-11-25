'use strict';
// アンケートのサーバー側。アンケートはゲームとは別の専用ページ（public/survey.html）から回答する。
//  ・回答は logs/survey-<起動日時>.csv に1件1行で追記する（Excelでそのまま開ける）
//  ・名前や接続元は記録しない。そのため同じ人が2回送ると2件になる
//  ・誰でも開けるページなので、短時間の大量送信とファイルの肥大化には上限を設ける
const fs = require('fs');
const path = require('path');

// 画面（public/survey-page.js）の選択肢と同じもの。ここに無い値は保存しない
const GOOD = ['札を取る操作', '読み上げの声', '実況（DJ）', '得点の表示', '見た目・デザイン', '敗者復活戦', '観戦モード', '用語の勉強になった'];
const BAD  = ['クリックしても取れない', 'マウスカーソルが変・動かない', '札の文字が読みにくい', '音が出ない・ずれる・途切れる',
  '画面が止まった・動きが重い', '次の画面や観戦に正しく移らない', '何をすればいいか分からない', '特になし'];
const COMMENT_MAX   = 500;
const PER_MINUTE    = 300;              // 学内の全員が一斉に送っても届く数（接続元は学内でまとめて1つになることがあるので全体で数える）
const FILE_MAX_BYTES = 5 * 1024 * 1024;
const HEADER = ['回答日時', '操作のしやすさ', '画面の見やすさ', '分かりやすさ', '良かったところ', '困ったところ', '自由記述'];

function createSurvey({ logDir, fileName }) {
  const file = path.join(logDir, fileName);
  let recent = [];   // 直近1分間の受付時刻

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
    submit(data) {
      const d = data || {};
      const scores = [d.operation, d.visibility, d.clarity];
      if (!scores.every(n => Number.isInteger(n) && n >= 1 && n <= 5)) return { ok: false, reason: 'invalid' };
      const now = Date.now();
      recent = recent.filter(t => now - t < 60000);
      if (recent.length >= PER_MINUTE) return { ok: false, reason: 'busy' };
      const pick = (list, allowed) => allowed.filter(x => Array.isArray(list) && list.includes(x)).join(' / ');
      try {
        if (fs.existsSync(file) && fs.statSync(file).size >= FILE_MAX_BYTES) return { ok: false, reason: 'full' };
        append([new Date().toLocaleString('ja-JP'), ...scores,
          pick(d.good, GOOD), pick(d.bad, BAD), String(d.comment || '').slice(0, COMMENT_MAX)]);
      } catch (e) { return { ok: false, reason: 'save_failed' }; }
      recent.push(now);
      return { ok: true };
    },
  };
}

module.exports = { createSurvey, GOOD, BAD };
