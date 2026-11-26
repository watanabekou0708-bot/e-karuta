'use strict';
// 接続ログ（学外からのアクセスか）の判定に使うネットワークの設定。書き換えたらサーバーを再起動する。
// IPアドレスは '203.0.113.5' のような1つの値か、'192.168.0.0/24' のような範囲で書く。
module.exports = {
  // 学内からの接続と判定するIPアドレス。学校の外向きのIPアドレスや、校内の範囲を書く。
  // 空のままだと、区分はすべて「不明」と記録される。環境変数 KARUTA_CAMPUS_IPS（カンマ区切り）が優先。
  campusIps: [],
  // 手前に置いている中継サーバー(nginx)のIPアドレス。ここから来た接続だけ、nginx が付ける
  // X-Real-IP / X-Forwarded-For の接続元IPを使う（ほかから来た値は書き換えられるので使わない）。
  // nginx 側にも proxy_set_header X-Real-IP $remote_addr; の設定が必要。
  // 環境変数 KARUTA_TRUSTED_PROXIES（カンマ区切り）が優先。
  trustedProxies: [],
};
