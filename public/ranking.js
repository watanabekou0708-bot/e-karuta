'use strict';
// 順位の並び順（サーバーとブラウザの両方で使う共通モジュール）。
// 点数が多い順。同じ点数どうしは、各参加者の tie（ランダムな値）の小さい順に並べる。
// tie はサーバーが試合中に一定時間おきに引き直すので、同点の人の順位はときどき入れ替わる。
// 順位は 1位・2位・3位…と1人ずつ付け、試合終了の時点の並びで通過・敗退を決める。
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KRank = api;
})(typeof self !== 'undefined' ? self : this, function () {
  // [id, player] の組を並べるための比較関数
  const compareEntries = ([, a], [, b]) => (b.score - a.score) || ((a.tie || 0) - (b.tie || 0));
  // 並べ済みの一覧に、上から順に 1, 2, 3… の順位を付ける
  const listRanks = sortedEntries => sortedEntries.map((_, i) => i + 1);
  return { compareEntries, listRanks };
});
