'use strict';
const gtts = require('node-gtts');
const path = require('path');
const fs   = require('fs');

const KARUTA = [
  { id:  1, yomi: 'コンピューターの頭脳と呼ばれ、計算と命令の処理を担う装置',             tori: 'CPU' },
  { id:  2, yomi: '電源を切ると消えてしまう、作業中のデータを一時的に保管する主記憶装置', tori: 'メモリ' },
  { id:  3, yomi: '電源を切っても消えない、写真や文書を永続的に記憶する補助記憶装置',     tori: 'ストレージ' },
  { id:  4, yomi: 'ハードウェアを管理し、アプリケーションが動く土台となるソフトウェア',   tori: 'OS' },
  { id:  5, yomi: '世界中のコンピューターをつないだ、巨大な情報通信ネットワーク',         tori: 'インターネット' },
  { id:  6, yomi: '会社や学校など限られた範囲で、コンピューターをつなぐネットワーク',     tori: 'LAN' },
  { id:  7, yomi: 'ネットワーク上の住所にあたる、コンピューターを識別するための番号',     tori: 'IPアドレス' },
  { id:  8, yomi: 'ドメイン名をIPアドレスに変換する、インターネットの電話帳のような仕組み', tori: 'DNS' },
  { id:  9, yomi: 'ウェブブラウザとサーバーがページをやり取りするための通信の規則',       tori: 'HTTP' },
  { id: 10, yomi: 'URLを入力してウェブページを閲覧するためのソフトウェア',               tori: 'Webブラウザ' },
  { id: 11, yomi: '外部からの不正アクセスを防ぐため、ネットワークの境界に設置する仕組み', tori: 'ファイアウォール' },
  { id: 12, yomi: 'コンピューターに害を与える目的で作られた、悪意のあるソフトウェアの総称', tori: 'マルウェア' },
  { id: 13, yomi: '推測されにくい文字列で、アカウントへの不正アクセスを防ぐ秘密の認証情報', tori: 'パスワード' },
  { id: 14, yomi: 'パスワードに加えてスマートフォンなどで本人確認する、二段階の認証方式', tori: '二段階認証' },
  { id: 15, yomi: '実在する企業を装った偽のメールやサイトで、個人情報を盗もうとする攻撃', tori: 'フィッシング詐欺' },
  { id: 16, yomi: '氏名・住所・電話番号など、特定の個人を識別できる情報のこと',           tori: '個人情報' },
  { id: 17, yomi: '他人が作った著作物を、許可なく複製・配布することを禁ずる権利',         tori: '著作権' },
  { id: 18, yomi: 'デジタルデータを0と1の二つの数字だけで表す方法',                       tori: '二進数' },
  { id: 19, yomi: 'デジタルデータの最小単位で、0か1かを表す一桁分の情報量',               tori: 'ビット' },
  { id: 20, yomi: '8ビットをまとめたデータの単位で、ファイルサイズを表す基本単位',         tori: 'バイト' },
  { id: 21, yomi: '大切なデータを失わないよう、別の場所にコピーを保存しておく作業',       tori: 'バックアップ' },
  { id: 22, yomi: 'インターネット経由でサーバーやソフトウェアをサービスとして利用する形態', tori: 'クラウドコンピューティング' },
  { id: 23, yomi: '友人や知人とつながり、メッセージや写真などを共有するインターネットサービス', tori: 'SNS' },
  { id: 24, yomi: '行と列の表に数式を入力し、データの計算や分析を行うソフトウェア',       tori: '表計算ソフト' },
  { id: 25, yomi: '大量のデータを整理して保存し、素早く検索・更新・抽出できる仕組み',     tori: 'データベース' },
  { id: 26, yomi: 'カメラで読み取る、白黒のドットで情報を表す二次元コード',               tori: 'QRコード' },
  { id: 27, yomi: '身の回りの家電や機器がインターネットにつながり、連携する仕組み',       tori: 'IoT' },
  { id: 28, yomi: '大量のデータをもとにコンピューターが自ら学習し、判断する技術',         tori: 'AI' },
  { id: 29, yomi: 'スライドを作成して画面に映し、視覚的に情報を伝えるためのソフトウェア', tori: 'プレゼンテーションソフト' },
  { id: 30, yomi: 'インターネットで商品の売買や代金の決済を行う、オンラインの商取引',     tori: '電子商取引' },
];

// 上の句読み上げ前の一言（同じ音声システムで再生）
const EXTRAS = [
  { id: 'intro', yomi: '読み上げます' },
  { id: 'decoy-notice', yomi: 'これは盤面にない札でした。' },
  { id: 'timeup', yomi: 'そこまで' },
];

// 難易度を上げた際に登場するダミーの読み（盤面のどの札にも対応しない）
const DECOYS = [
  { id: 'decoy1', yomi: '文字や記号をコンピューターが識別するために割り当てられた番号の体系', tori: '文字コード' },
  { id: 'decoy2', yomi: '一定の規則に従ってデータを並べ替え、目的の情報を探しやすくする処理', tori: 'ソート' },
  { id: 'decoy3', yomi: 'ネットワークを通じて遠隔地のコンピューターを操作するための技術', tori: 'リモートアクセス' },
  { id: 'decoy4', yomi: '利用者が誰であるかをパスワードなどで確認する一連の手続き', tori: '認証' },
  { id: 'decoy5', yomi: 'ソフトウェアの不具合を修正するために配布される更新プログラム', tori: 'パッチ' },
  { id: 'decoy6', yomi: '複数の処理を同時に実行できるよう、CPU内に搭載された処理装置の数', tori: 'コア数' },
  { id: 'decoy7', yomi: 'インターネット上の文章や画像を保存し、後で読み返せるようにする機能', tori: 'ブックマーク' },
  { id: 'decoy8', yomi: '第三者に通信内容を読み取られないよう、データを別の形式に変換すること', tori: '暗号化' },
];

// 正解発表用（札を取られた直後に再生する「上の句」「下の句」音声）。
// speechSynthesis ではなく事前生成 MP3 を Web Audio で再生することで、
// ホスト機特有の音声デバイスのハンドオフ遅延を完全に回避する。
const ANNOUNCE = KARUTA.flatMap(k => [
  { id: `${k.id}-top`,    yomi: k.yomi },
  { id: `${k.id}-bottom`, yomi: k.tori },
]);

const audioDir = path.join(__dirname, 'public', 'audio');
fs.mkdirSync(audioDir, { recursive: true });

async function main() {
  const tts = gtts('ja', true);
  const DECOY_ANNOUNCE = DECOYS.map(d => ({ id: `${d.id}-bottom`, yomi: d.tori }));
  const all = [...EXTRAS, ...KARUTA, ...ANNOUNCE, ...DECOYS, ...DECOY_ANNOUNCE];
  console.log(`音声ファイルを生成します（${all.length} 件）...\n`);
  let generated = 0;
  let skipped   = 0;

  for (const k of all) {
    const dest = path.join(audioDir, `${k.id}.mp3`);
    if (fs.existsSync(dest)) {
      console.log(`  スキップ: ${k.id}.mp3 (既存)`);
      skipped++;
      continue;
    }
    await new Promise((resolve, reject) => {
      tts.save(dest, k.yomi, err => {
        if (err) { reject(err); return; }
        console.log(`  生成: ${k.id}.mp3`);
        generated++;
        resolve();
      });
    });
    await new Promise(r => setTimeout(r, 700));
  }

  console.log(`\n完了！ 生成 ${generated} 件、スキップ ${skipped} 件`);
  console.log('node server.js でサーバーを起動してください。');
}

main().catch(err => {
  console.error('\nエラー:', err.message);
  console.error('インターネット接続を確認してから再実行してください。');
  process.exit(1);
});
