'use strict';
// 試合を盛り上げる仕掛け（ギミック）の抽選と、対象の決め方。進行は game-room.js、画面は public/gimmick.js。
//  rotate   … 札が順番にくるりと回る
//  underdog … 読み始めの時点で順位が下半分の人だけ、速度・精度・距離の点が2倍
// 「何回目の読みで起こすか」を試合の開始時に決める。回数はダミー読みも1回に数え、本物かダミーかに
// 関係なく起こす（仕掛けの有無でダミーが分からないようにするため）。1回の読みで起こす仕掛けは1つだけ。

// 1試合に起こす回数と、その確率
const COUNT_WEIGHTS = [[1, 0.50], [2, 0.35], [3, 0.15]];
// それぞれの仕掛けを起こせる最初の読み（1枚目は何も起こさない。下半分2倍は点差がついてから）
const FIRST_READ = { rotate: 2, underdog: 4 };
const MULTIPLIER = 2;

function pickCount(random) {
  let r = random();
  for (const [count, weight] of COUNT_WEIGHTS) {
    if (r < weight) return count;
    r -= weight;
  }
  return COUNT_WEIGHTS[COUNT_WEIGHTS.length - 1][0];
}

// readCount: この試合で読む本物の札の枚数（読みの回数は必ずこれ以上になるので、決めた仕掛けは必ず起きる）
// enabled: { rotate: boolean, underdog: boolean }
// 戻り値: { 何回目の読み: 種類 }
function planGimmicks(readCount, enabled, random = Math.random) {
  const types = Object.keys(FIRST_READ).filter(t => enabled[t]);
  if (!types.length) return {};
  const picked = Array.from({ length: pickCount(random) }, () => types[Math.floor(random() * types.length)]);
  // 起こせる読みが少ない種類（始まりが遅いもの）から、先に場所を決める
  picked.sort((a, b) => FIRST_READ[b] - FIRST_READ[a]);
  const plan = {};
  for (const type of picked) {
    const free = [];
    for (let n = FIRST_READ[type]; n <= readCount; n++) if (!plan[n]) free.push(n);
    if (free.length) plan[free[Math.floor(random() * free.length)]] = type;
  }
  return plan;
}

// 順位が下半分の人。entries: [[id, 点数]]。人数が奇数なら下の側を多くする（5人なら下の3人）。
// 下半分に入る点数と同じ点数の人は全員対象にする（全員が同点なら全員）。
function lowerHalfIds(entries) {
  if (!entries.length) return [];
  const sorted = entries.map(([, score]) => score).sort((a, b) => b - a);
  const border = sorted[sorted.length - Math.ceil(sorted.length / 2)];
  return entries.filter(([, score]) => score <= border).map(([id]) => id);
}

module.exports = { planGimmicks, lowerHalfIds, COUNT_WEIGHTS, FIRST_READ, MULTIPLIER };
