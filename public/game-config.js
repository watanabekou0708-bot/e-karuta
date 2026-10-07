// サーバー(server.js)とブラウザ(game.js)で共有する設定。
// CARD_REAL_W_MM: 画面の札(横180px)を、実物の取り札の何mmとして換算するか（キャリブレーション）。
//   競技かるたの取り札は 縦約53mm × 横約73mm。距離・精度のmmは「画面の札=実物73mm」の縮尺で出す。
(function (root, data) {
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.GAME_CONFIG = data;
})(typeof self !== 'undefined' ? self : this, {
  CARD_REAL_W_MM: 73,
});
