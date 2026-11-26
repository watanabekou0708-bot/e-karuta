# 構成

- Node.js（Express + Socket.io）。画面は public/ の静的ファイル。音声はサーバーが VOICEVOX で作って配る。
- server.js（土台） → practice-rooms.js（接続の振り分け） → game-room.js（試合の進行。大会用1部屋＋一人練習の部屋）。通信の窓口は room-hub.js。
- 部屋の状態はメモリ上だけにあり、サーバーを止めると失われる。
- 大会と全員共通の設定は大会用の部屋と server.js の settings が持つ。管理画面の緊急停止は大会用の部屋だけに効く。

# 検証
- `node --check` で構文を確認し、テスト用サーバーに模擬接続して進行を確認する。
