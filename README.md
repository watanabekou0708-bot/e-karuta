## 配布資料・ツールの説明
- `手順書/Webかるた_用語リスト.pptx` / `.pdf`：学生に配る用語リスト（IT用語一覧.pdf の175語。競技要領およびルールは載せない）。
- `tools/make_term_list.py`：`ycc-terms.js` の札を `public/karuta-data.js` から読んで用語リストの PPTX を作る（`pip install python-pptx` が必要）。
- `ycc-terms.js`：IT用語一覧.pdf の175語の札ID。大会モードと練習モードの出題を一時的にこの範囲に限定している（`server.js` の `YCC_TERMS_LIMITED`）。
- `public/ranking.js`：順位の並び順（同点はランダムな順）。サーバーとブラウザで共通。
- `public/comments.js`：観戦コメントの順番待ち・表示・読み上げ中の停止・オン/オフ。
- `public/headphone.js`：大会モードの待機画面の前のヘッドフォン確認（3けたの番号）。
- `public/status.html`（`status.js` / `status.css`）：勝敗一覧（列ごとの並び替え・絞り込み）。
- `tools/pptx_to_pdf.ps1`：PowerPoint で PPTX を PDF に書き出す。
- `mockups/`：実装前の画面案（`survey-mockup.html` はプレイ後アンケートの案）。
- `survey.js` / `public/survey.html`・`survey.css`・`survey-page.js`：アンケート（サーバー側のCSV保存 / 専用ページ）。
- `手順書/Webかるた_アンケート.url`：共有ドライブに置くアンケートのショートカット。
- `public/entry-code.js`：大会モードの入場番号（3けた）の入力画面。番号の表示とON/OFFは大会設定画面。
- `gimmick-plan.js`：仕掛け（回転・下半分2倍）の回数と対象の決め方。
- `public/gimmick.js`：仕掛けの画面表示（金枠と札の回転）。
- `ゲーム性アイデア案.md`：大会を盛り上げる仕掛けの検討メモ（第1段階の回転と下半分2倍は実装済み）。
- `public/waiting.js`：大会モード開始前の待機画面。

## サーバーの構成
- `server.js`：Webサーバー・ログ・音声・ダウンロード用のAPI。
- `game-room.js`：1つの試合（部屋）の状態と進行。大会用に1つ、練習は一人に1つ作る。
- `room-hub.js`：部屋ごとの通信の窓口。
- `practice-rooms.js`：接続の振り分け、一人ずつの練習、同じ人の引き継ぎ。
- `access-log.js`：30分ごとの接続ログ（`logs/access-*.csv`）。
- `network-config.js`：学内のIPと、信頼する中継サーバーのIP（書き換えたら再起動）。

## 接続ログの設定
1. nginx の転送の設定に `proxy_set_header X-Real-IP $remote_addr;` を入れる。
2. `network-config.js` の `trustedProxies` に、ゲームのサーバーから見た nginx のIPを書く（分からなければ、設定前に起動したサーバーの画面に出る警告で確認できる）。
3. `campusIps` に学校の外向きのIPや校内の範囲を書き、サーバーを再起動する。
