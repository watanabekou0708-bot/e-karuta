'use strict';
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const os         = require('os');

const PORT = process.env.PORT || 3000;
const app  = express();
const srv  = http.createServer(app);
const io   = new Server(srv);

// ── Karuta data（J検（情報活用試験）3級レベル＋Excel関数）─────
// ids 1-15,46-60: 易しい / 16-30,61-75: 普通 / 31-45,76-90: 難しい（ROUND_CARD_IDS と対応）
// 難易度は一般IT用語・Excel関数どちらも各帯で揃えている。
// 46番以降は「練習するたびに同じ15枚しか出ない」問題への対応で追加した分
// （各帯30枚から毎回ランダムに15枚を抽出するようにした）。
const KARUTA = [
  // 易しい（一般常識 J検3級:容易 + Excel基本編関数, id 1-30）
  { id: 1, yomi: "オンラインサービスで個人または組織を識別する名前", tori: "アカウント名" },
  { id: 2, yomi: "情報を世界中のコンピュータネットワークで共有するグローバルなコミュニケーションネットワーク", tori: "インターネット" },
  { id: 3, yomi: "情報をキーワードで検索し、関連するウェブページやファイルを一覧表示するプログラムやサービス", tori: "検索エンジン" },
  { id: 4, yomi: "悪意のあるプログラムで、コンピュータに感染して機能を破壊・乗っ取る", tori: "コンピュータウィルス" },
  { id: 5, yomi: "電子メールや文書に添付されるデータを指す", tori: "添付ファイル" },
  { id: 6, yomi: "アクセス制御のための秘密の文字列", tori: "パスワード" },
  { id: 7, yomi: "個人が日記や情報をウェブ上で発信するオンラインメディア", tori: "ブログ" },
  { id: 8, yomi: "ウェブ上でアクセス可能な文書やメディアのまとまりで、情報やサービスを提供するためのインターネット上の個別のページ", tori: "ホームページ" },
  { id: 9, yomi: "オンライン上でユーザーが交流するプラットフォーム（ソーシャル・ネットワーキング・サービス）", tori: "SNS" },
  { id: 10, yomi: "インターネット上に存在する情報やコンテンツを表示するためのオンラインの場所", tori: "Webサイト" },
  { id: 11, yomi: "Microsoftによるオペレーティングシステム", tori: "Windows" },
  { id: 12, yomi: "情報処理分野でのマナーやルールに関するマナー", tori: "ネチケット" },
  { id: 13, yomi: "電子メール送受信のための個人識別情報", tori: "メールアドレス" },
  { id: 14, yomi: "数値データのみを対象に個数を数える関数", tori: "COUNT関数" },
  { id: 15, yomi: "「もしも・・・なら」「真の場合」「偽の場合」を提示する関数", tori: "IF関数" },
  { id: 16, yomi: "指定した数値やセル範囲の中から最大値を選んで表示する関数", tori: "MAX関数" },
  { id: 17, yomi: "指定した数値やセル範囲の中から最小の値を選んで表示する関数", tori: "MIN関数" },
  { id: 18, yomi: "順位の平均を表示する関数", tori: "RANK.AVG関数" },
  { id: 19, yomi: "切り捨てする関数", tori: "ROUNDDOWN関数" },
  { id: 20, yomi: "切り上げする関数", tori: "ROUNDUP関数" },
  { id: 21, yomi: "四捨五入する関数", tori: "ROUND関数" },
  { id: 22, yomi: "合計を算出する関数", tori: "SUM関数" },
  { id: 23, yomi: "複数の条件をすべて満たす「かつ」という論理条件を示す関数", tori: "AND関数" },
  { id: 24, yomi: "今日の日付を表示する関数", tori: "TODAY関数" },
  { id: 25, yomi: "平均値を計算する関数", tori: "AVERAGE関数" },
  { id: 26, yomi: "セルに入力されたすべてのデータを対象に個数を計算する関数", tori: "COUNTA関数" },
  { id: 27, yomi: "数値が何番目にあるかを表示する関数", tori: "RANK.EQ関数" },
  { id: 28, yomi: "指定した数値を超えない最大の整数を表示する関数", tori: "INT関数" },
  { id: 29, yomi: "「または」という論理条件を示す関数", tori: "OR関数" },
  { id: 30, yomi: "年数や日数、月数の経過期間を計算する関数", tori: "DATEDIF関数" },
  // 普通（J検3級:標準 + Excel応用編関数, id 31-93）
  { id: 31, yomi: "ウェブページやアプリ内でコンテンツをスクロールするためのバー", tori: "スクロールバー" },
  { id: 32, yomi: "２回連続でマウスをクリックする操作", tori: "ダブルクリック" },
  { id: 33, yomi: "ユーザーがテキストを入力できるGUI要素", tori: "テキストボックス" },
  { id: 34, yomi: "文書内やWebページでクリックにより別の場所やリソースに移動させるリンク", tori: "ハイパーリンク" },
  { id: 35, yomi: "選択肢がリストとして表示され、クリックすると選択できるインターフェース要素", tori: "プルダウンメニュー" },
  { id: 36, yomi: "選択肢を一覧表示するGUI要素", tori: "リストボックス" },
  { id: 37, yomi: "記録可能なDVD形式で、一度のみ書き込み可能な光ディスク", tori: "DVD-R" },
  { id: 38, yomi: "インターネットを閲覧するソフトウェア。Webページを表示し、ユーザーが情報を検索・閲覧できる", tori: "ブラウザ" },
  { id: 39, yomi: "コンピューターシステムに対するセキュリティ対策ソフトウェアで、悪意のあるプログラムから保護するもの", tori: "ワクチンソフト" },
  { id: 40, yomi: "Webページを作成するための言語", tori: "HTML" },
  { id: 41, yomi: "情報保存のための携帯可能な記憶デバイス", tori: "USBメモリ" },
  { id: 42, yomi: "画像圧縮形式で、写真や図形のデジタル画像を小さくして保存するために利用されます", tori: "JPEG" },
  { id: 43, yomi: "コンピューターやデバイスへの入力装置で、文字や操作を指定するためにキーを押すことで情報を入力するデバイス", tori: "キーボード" },
  { id: 44, yomi: "ユーザがマウスやタッチデバイスで画面上の要素を選択または操作する行為", tori: "クリック" },
  { id: 45, yomi: "コンピュータでの効率的な操作のためのキーボードショートカット", tori: "ショートカットキー" },
  { id: 46, yomi: "選択項目を有効／無効にするUI要素", tori: "チェックボックス" },
  { id: 47, yomi: "コンピューターの操作で、マウスや指でオブジェクトを選択し、別の場所に移動することを指す", tori: "ドラッグ" },
  { id: 48, yomi: "情報処理でデータやファイルを整理・保存するための仮想的なコンテナ。関連するアイテムをまとめ、検索や管理を容易にする", tori: "フォルダ" },
  { id: 49, yomi: "文字のスタイルや形状を指定する情報。テキスト表示に使用され、視覚的な印象を与えるために様々な種類やスタイルが存在する", tori: "フォント" },
  { id: 50, yomi: "情報処理分野で入力デバイスとして使われ、カーソルを移動・クリックするための手持ちデバイス", tori: "マウス" },
  { id: 51, yomi: "選択肢から1つを選択するための円形のUI要素", tori: "ラジオボタン" },
  { id: 52, yomi: "高容量ディスクで、光学ディスク規格の一つ。データや映像を高品質で保存・再生する技術", tori: "Blue-ray Disc" },
  { id: 53, yomi: "コンピューター上でハードウェアやソフトウェアを制御し、管理する基本ソフトウェア（Operating System）", tori: "OS" },
  { id: 54, yomi: "ポータブルな文書フォーマット。文書や画像を独立した形式で表示するためのファイル形式", tori: "PDF" },
  { id: 55, yomi: "インデックスを使用して引数リストに指定した値を表示する関数", tori: "CHOOSE関数" },
  { id: 56, yomi: "指定した数値を日付型で表示する関数", tori: "DATE関数" },
  { id: 57, yomi: "データベース内の指定された列を検索し、条件を満たすレコードの中で数値が入力されているセルの個数を表示させる関数", tori: "DCOUNT関数" },
  { id: 58, yomi: "データベース内の指定された列を検索し、条件を満たすレコードの最小値を表示させる関数", tori: "DMIN関数" },
  { id: 59, yomi: "「表引きによるデータ参照」をする関数、検索する値が行方向（横）に並んでいる", tori: "HLOOKUP関数" },
  { id: 60, yomi: "空白セルかどうかを調べる関数", tori: "ISBLANK関数" },
  { id: 61, yomi: "文字列の文字数を表示する関数", tori: "LEN関数" },
  { id: 62, yomi: "文字列の任意の位置から指定された数の文字を取り出す関数", tori: "MID関数" },
  { id: 63, yomi: "現在の日付と時刻を表示する関数", tori: "NOW関数" },
  { id: 64, yomi: "文字列を指定された回数だけ繰り返して表示する関数", tori: "REPT関数" },
  { id: 65, yomi: "「表引きによるデータ参照」をする関数、検索する値が列方向（縦）に並んでいる", tori: "VLOOKUP関数" },
  { id: 66, yomi: "指定した検索文字列をほかの文字列の中で検索し、その検索文字列が最初に現れる位置を先頭文字からの位置で表示する関数", tori: "SEARCH関数" },
  { id: 67, yomi: "ふりがなを表示する関数", tori: "PHONETIC関数" },
  { id: 68, yomi: "数値を書式設定した文字列に変換する関数", tori: "TEXT関数" },
  { id: 69, yomi: "指定した日付の曜日を0～7までの数値で表示する関数", tori: "WEEKDAY関数" },
  { id: 70, yomi: "数値から符号の＋や－を除いた絶対値を表示する関数", tori: "ABS関数" },
  { id: 71, yomi: "範囲内のデータの中で、指定した順位番目に小さな値を表示する関数", tori: "SMALL関数" },
  { id: 72, yomi: "小数点以下を切り捨てる関数", tori: "TRUNC関数" },
  { id: 73, yomi: "データ範囲から行の位置と列の位置を指定し、その行と列の交差する位置の値を表示する", tori: "INDEX関数" },
  { id: 74, yomi: "複数の条件に一致するセルの平均を求める関数", tori: "AVERAGEIFS関数" },
  { id: 75, yomi: "複数の条件に一致するセルの個数を求める関数", tori: "COUNTIFS関数" },
  { id: 76, yomi: "指定した順位番目に大きな値を表示する関数", tori: "LARGE関数" },
  { id: 77, yomi: "複数の条件に一致するセルの値を合計する関数", tori: "SUMIFS関数" },
  { id: 78, yomi: "文字列の任意の位置から指定された数の文字をバイト数で取り出す関数", tori: "MIDB関数" },
  { id: 79, yomi: "論理値「FALSE」を返す関数", tori: "FALSE関数" },
  { id: 80, yomi: "データベース内の指定された列を検索し、条件を満たすレコードの平均値を表示させる関数", tori: "DAVERAGE関数" },
  { id: 81, yomi: "データベース内の指定された列を検索し、条件を満たすレコードの中の空白でないセルの個数を表示させる関数", tori: "DCOUNTA関数" },
  { id: 82, yomi: "データベース内の指定された列を検索し、条件を満たすレコードの最大値を表示させる関数", tori: "DMAX関数" },
  { id: 83, yomi: "データベース内の指定された列を検索し、条件を満たすレコードの合計を表示させる関数", tori: "DSUM関数" },
  { id: 84, yomi: "文字列の先頭から指定された数の文字を取り出す関数", tori: "LEFT関数" },
  { id: 85, yomi: "ある値が特定の値と等しくないことを判断して使う関数", tori: "NOT関数" },
  { id: 86, yomi: "文字列の末尾から指定された数の文字を取り出す関数", tori: "RIGHT関数" },
  { id: 87, yomi: "指定した条件に一致するセルの平均値を算出する関数", tori: "AVERAGEIF関数" },
  { id: 88, yomi: "指定した条件に一致するセルの個数を算出する関数", tori: "COUNTIF関数" },
  { id: 89, yomi: "数式がエラーとして評価される場合は指定の値を表示し、それ以外の場合は数式の結果を表示する関数", tori: "IFERROR関数" },
  { id: 90, yomi: "数値を除数で割ったときの余りを表示する関数", tori: "MOD関数" },
  { id: 91, yomi: "指定した条件に一致するセルの値を合計する関数", tori: "SUMIF関数" },
  { id: 92, yomi: "財務関数のひとつで、ローン計算をするときに使用する関数", tori: "PMT関数" },
  { id: 93, yomi: "論理値「TRUE」を返す関数", tori: "TRUE関数" },
  // 難しい（J検3級:中程度+高度, id 94-175）
  { id: 94, yomi: "ファイルやデータを圧縮された状態から元の形式に戻す処理", tori: "解凍" },
  { id: 95, yomi: "基数が10の数制で、0から9までの数字を用いて数を表す。10進法は日常的で直感的な計算が可能", tori: "10進数" },
  { id: 96, yomi: "データを順にアクセスする手法。例：テープドライブ。ランダムアクセスに比べ効率は低いが、シンプル", tori: "順アクセス方式" },
  { id: 97, yomi: "ダウンロードしながら再生できる", tori: "ストリーミング" },
  { id: 98, yomi: "ファイルやディレクトリの完全な場所を示す", tori: "絶対パス" },
  { id: 99, yomi: "ファイルやディレクトリの場所を現在の場所から相対的に示す方法", tori: "相対パス" },
  { id: 100, yomi: "複数のデバイスが相互に接続され、情報を共有する仕組み", tori: "ネットワーク" },
  { id: 101, yomi: "情報の最小単位。0または1の二進数で表され、コンピュータのデータ処理において基本的な情報単位", tori: "ビット" },
  { id: 102, yomi: "ネットワークを通して攻撃する", tori: "不正アクセス" },
  { id: 103, yomi: "文字を数字に変換する規則。例えば、ASCIIやUTF-8がある", tori: "文字コード" },
  { id: 104, yomi: "文字の正しい表示ができないエラー", tori: "文字化け" },
  { id: 105, yomi: "使いやすさを第一に考える", tori: "ユーザビリティ" },
  { id: 106, yomi: "現実世界にコンピュータ生成の情報を重ね合わせる技術", tori: "AR" },
  { id: 107, yomi: "オブジェクト指向プログラミング言語。様々なプラットフォームで動作し、堅牢性と移植性が特徴", tori: "Java" },
  { id: 108, yomi: "データベースで使用される問い合わせ言語", tori: "SQL" },
  { id: 109, yomi: "インターネット上のリソースの場所を示すアドレス", tori: "URL" },
  { id: 110, yomi: "コンピューター技術を使い、現実世界とは異なる環境を体験する技術（仮想現実）", tori: "VR" },
  { id: 111, yomi: "インターネット上の情報を検索・閲覧するためのシステム（World Wide Web）", tori: "WWW" },
  { id: 112, yomi: "ウェブページの動的な振る舞いを制御するプログラミング言語", tori: "JavaScript" },
  { id: 113, yomi: "情報処理でデータを表す単位。8ビットの集まりで、1文字を表したり、データを保存したりする", tori: "バイト" },
  { id: 114, yomi: "情報処理で使用される入力デバイスで、カーソルやポインターを制御するための装置", tori: "ポインティングディバイス" },
  { id: 115, yomi: "コンピュータを用いた設計や図面作成に使用されるソフトウェアや技術（Computer-Aided Design）", tori: "CAD" },
  { id: 116, yomi: "ファイルをネットワーク上で転送するための通信プロトコル（File Transfer Protocol）", tori: "FTP" },
  { id: 117, yomi: "ウェブ開発のためのサーバーサイド言語", tori: "PHP" },
  { id: 118, yomi: "テキストを編集するソフトウェア。基本的な操作が容易であり、コードや文章の作成・編集に利用される", tori: "テキストエディタ" },
  { id: 119, yomi: "0と1のみを使い数を表現する数制で、コンピューター内で情報を表す基本的な方式", tori: "2進数" },
  { id: 120, yomi: "関連付けられたテーブルにデータを格納し、SQLを使って管理するデータベースシステム", tori: "リレーショナルデータベース" },
  { id: 121, yomi: "データを小さくして、記憶や転送の効率を向上させる処理", tori: "圧縮" },
  { id: 122, yomi: "手順や計算を解決するための明確な手法や指示", tori: "アルゴリズム" },
  { id: 123, yomi: "ファイルの種類や形式を示すためのファイル名の末尾に追加される文字列", tori: "拡張子" },
  { id: 124, yomi: "特定の機種や環境に依存して正しく表示される文字で、他の環境では正しく表示されない文字のこと", tori: "機種依存文字" },
  { id: 125, yomi: "0から15までの数字を表す基数で、10進数の16進法。コンピュータなどで頻繁に使用され、0～9とA～Fで表現される", tori: "16進数" },
  { id: 126, yomi: "10進数の代わりに0から7の数字を使う数法。8の倍数で表現され、2進数への変換が利用される", tori: "8進数" },
  { id: 127, yomi: "情報処理で使われる視覚的な図で、プロセスやアルゴリズムを流れ図で表現し、理解や設計をサポートする", tori: "フローチャート" },
  { id: 128, yomi: "テキストベースのユーザーインターフェース（Character User Interface）", tori: "CUI" },
  { id: 129, yomi: "ウェブページなどを送受信するための通信規約（Hypertext Transfer Protocol）", tori: "HTTP" },
  { id: 130, yomi: "コンピューターと周辺機器を接続するための標準インターフェース", tori: "USB" },
  { id: 131, yomi: "データを保護するために情報を不可解な形に変換する技術", tori: "暗号化" },
  { id: 132, yomi: "プロセスやシステムの操作・監視を行う装置", tori: "制御装置" },
  { id: 133, yomi: "コンピューターの主要な部品であり、命令を実行し、データを処理する装置。CPUとも呼ばれる", tori: "中央処理装置" },
  { id: 134, yomi: "情報処理でデータをシステムに入力する機器や手段", tori: "入力装置" },
  { id: 135, yomi: "情報処理で実行中のプログラムの一部で、リソースやデータを操作し、タスクを完了するための実行単位", tori: "プロセス" },
  { id: 136, yomi: "データを永続的に保存するためのデバイスで、例えばハードディスクドライブやSSDなどが該当します", tori: "補助記憶装置" },
  { id: 137, yomi: "コンピューターの主要部分であり、命令を実行し、演算やデータ処理を行う（Central Processing Unit）", tori: "CPU" },
  { id: 138, yomi: "ファイルを送受信するためのサーバ", tori: "FTPサーバ" },
  { id: 139, yomi: "インターネット接続を提供する企業または組織（Internet Service Provider）", tori: "ISP" },
  { id: 140, yomi: "データをローカルエリアネットワークで伝送するためのケーブル", tori: "LANケーブル" },
  { id: 141, yomi: "オープンソースのオペレーティングシステムで、コンピュータの基本機能を提供するソフトウェア", tori: "Linux" },
  { id: 142, yomi: "電子メールを受信するためのプロトコル", tori: "POPサーバ" },
  { id: 143, yomi: "コンピューター内のデータや命令を一時的に保持するメモリ（Random Access Memory）", tori: "RAM" },
  { id: 144, yomi: "コンピュータと周辺機器を接続するための標準インターフェース（Small Computer System Interface）", tori: "SCSI" },
  { id: 145, yomi: "データストレージ用のコンピュータインターフェース規格", tori: "Serial ATA" },
  { id: 146, yomi: "インターネットでデータを送受信するための通信プロトコル", tori: "TCP／IP" },
  { id: 147, yomi: "ウェブページやファイルを提供するコンピュータ", tori: "Webサーバ" },
  { id: 148, yomi: "コンピュータ内で数値演算や論理演算を実行する機能を持つ、計算処理を行う主要な部分", tori: "演算装置" },
  { id: 149, yomi: "コンピュータのデータやプログラムを一時的に保存するためのメモリで、CPUがアクセスする高速なデータストレージ", tori: "主記憶装置" },
  { id: 150, yomi: "ネットワークでデータを集約・転送する装置。信号を受け取り、複数のデバイスに送信する", tori: "ハブ" },
  { id: 151, yomi: "データや命令を一時的に保存するコンピュータの要素で、処理速度向上に寄与する", tori: "メモリ" },
  { id: 152, yomi: "IPアドレスを自動割り当てするプロトコル。ネットワーク上のデバイスがIPアドレスを取得し通信する仕組み", tori: "DHCP" },
  { id: 153, yomi: "インターネットでドメイン名をIPアドレスに変換するシステム（Domain Name System）", tori: "DNS" },
  { id: 154, yomi: "ドメイン名をIPアドレスに変換するサーバ", tori: "DNSサーバ" },
  { id: 155, yomi: "ネットワーク上のデバイスを識別する番号", tori: "IPアドレス" },
  { id: 156, yomi: "情報を読み取り専用に保存するコンピューターの記憶装置（Read-Only Memory）", tori: "ROM" },
  { id: 157, yomi: "高速なデータ保存デバイス", tori: "SSD" },
  { id: 158, yomi: "広域ネットワークを指し、地理的に広い範囲でコンピューターやネットワークを接続する通信インフラを指します", tori: "WAN" },
  { id: 159, yomi: "どんな人でも使えることを意識する", tori: "アクセシビリティ" },
  { id: 160, yomi: "サーバーからサービスやデータを要求する端末やソフトウェアのこと", tori: "クライアント" },
  { id: 161, yomi: "コンピュータやソフトウェアがネットワーク上で情報を提供・管理するコンピューターシステム", tori: "サーバ" },
  { id: 162, yomi: "情報処理分野でデータを表示・印刷・記録するデバイス。例：プリンタやモニタ", tori: "出力装置" },
  { id: 163, yomi: "情報保護やデータの安全性を確保する対策", tori: "セキュリティ" },
  { id: 164, yomi: "データを永続的に保存するコンピューターの記憶装置", tori: "ハードディスク装置" },
  { id: 165, yomi: "情報処理での通信やデータ交換の規約を指し、異なるシステムやデバイスが連携するための手順や標準化された方法", tori: "プロトコル" },
  { id: 166, yomi: "情報処理装置の主回路基板で、各種部品を接続し、データの伝達を可能にする重要なコンポーネント", tori: "マザーボード" },
  { id: 167, yomi: "データを有線接続なしで無線で転送する技術。通常、Wi-Fiで使用", tori: "無線LAN" },
  { id: 168, yomi: "メールを送受信するためのサーバ。電子メールの転送や保存を担当し、通信の中継や保管を行う", tori: "メールサーバ" },
  { id: 169, yomi: "身代金を要求するウイルス", tori: "ランサムウェア" },
  { id: 170, yomi: "ネットワークでデータを送受信する装置。異なるネットワーク間を中継して通信を可能にする", tori: "ルータ" },
  { id: 171, yomi: "コンピューターの起動時に基本入出力システムを管理するプログラム", tori: "BIOS" },
  { id: 172, yomi: "インターネット・デバイスに割り当てる識別番号。IPv4を置き換える次世代プロトコルで、アドレス枯渇問題に対処する", tori: "IPv6" },
  { id: 173, yomi: "コンピューターに組み込まれるネットワーク接続用のデバイス（Network Interface Card）", tori: "NIC" },
  { id: 174, yomi: "データを複数のディスクに分散保存し、信頼性とパフォーマンスを向上させる技術（Redundant Array of Independent Disks）", tori: "RAID" },
  { id: 175, yomi: "メール送受信を管理するサーバ", tori: "SMTPサーバ" },
];

// 難易度を上げた際に登場するダミーの読み（盤面のどの札にも対応しない）。
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

// 難易度帯ごとの札ID（90枚を易しい／普通／難しいの3帯（各30枚）に分割）。
// 練習モードは buildPracticeCardIds() で各帯からランダムに15枚だけ抽選するため、
// 1帯30枚あることで「練習するたびに顔ぶれが変わる」ようになる。
const ROUND_CARD_IDS = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  2: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93],
  3: [94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175],
};

// 大会モードの本戦ラウンドで使う「易・普通・難しい」の抽出枚数（1試合10枚）。
// 回戦が進む（終盤に近づく）ほど難しい札の比重が増える。
// 準決勝・決勝5人・3位決定戦・決勝戦は最後の要素（最難）を使う。
const EVENT_ROUND_MIX = [
  [10, 0, 0],
  [7, 3, 0],
  [5, 4, 1],
  [3, 4, 3],
  [1, 4, 5],
  [0, 3, 7],
  [0, 1, 9],
];

// 大会モードの本戦ラウンド用に、易・普通・難しいから指定枚数ずつ抽出してシャッフルする。
function buildEventRoundCardIds(roundIndex) {
  const mix = EVENT_ROUND_MIX[Math.min(Math.max(roundIndex, 1), EVENT_ROUND_MIX.length) - 1];
  const pick = (tier, n) => shuffle(ROUND_CARD_IDS[tier]).slice(0, n);
  return shuffle([...pick(1, mix[0]), ...pick(2, mix[1]), ...pick(3, mix[2])]);
}

// 練習モードのホストが選んだ難易度（easy/normal/hard）に対応する帯（1/2/3）から、
// 毎回ランダムに15枚だけ抽選する（帯は各30枚あるため、同じ難易度で遊んでも
// 毎回顔ぶれが変わる）。この帯以外の札は出題されない。
// Excel関数の札か（答えが「〇〇関数」）。
const isExcelFunctionCard = id => {
  const k = KARUTA.find(x => x.id === id);
  return !!k && k.tori.endsWith('関数');
};

// 練習モードの15枚は、Excel関数とそれ以外の用語の比率ができるだけ同じ（7:8か8:7）に
// なるように抽選する。難しい帯にはExcel関数が無いため、難しいを選んだ場合のExcel関数は
// 普通帯から抽選して混ぜる。帯にExcel関数が足りない場合は、ある分だけ入れて残りを他の用語で埋める。
function buildPracticeCardIds() {
  const TOTAL = 15;
  const tier = gs.difficulty === 'easy' ? 1 : gs.difficulty === 'hard' ? 3 : 2;
  const excelSource = gs.difficulty === 'hard' ? ROUND_CARD_IDS[2] : ROUND_CARD_IDS[tier];
  const excelPool = shuffle(excelSource.filter(isExcelFunctionCard));
  const otherPool = shuffle(ROUND_CARD_IDS[tier].filter(id => !isExcelFunctionCard(id)));

  const half = Math.floor(TOTAL / 2);
  const wantExcel = Math.random() < 0.5 ? half : TOTAL - half;   // 7か8をランダムに
  let nExcel = Math.min(wantExcel, excelPool.length);
  const nOther = Math.min(TOTAL - nExcel, otherPool.length);
  nExcel = Math.min(TOTAL - nOther, excelPool.length);   // 他の用語が足りない分をExcel関数で補う
  return shuffle([...excelPool.slice(0, nExcel), ...otherPool.slice(0, nOther)]);
}

// 1試合で読み上げる45枚（易15・普通15・難15）の並び順を作る。各帯30枚の
// プールからランダムに15枚ずつ抽選し、易→普通→難の帯順に並べることで、
// 試合が進む（終盤に近づく）ほど難易度の高い用語が出るようにする
// （練習モードの復活戦・グループ戦で使用）。帯からの抽選なので、毎回顔ぶれが変わる。
function buildDifficultyOrderedCardIds() {
  return [
    ...shuffle(ROUND_CARD_IDS[1]).slice(0, 15),
    ...shuffle(ROUND_CARD_IDS[2]).slice(0, 15),
    ...shuffle(ROUND_CARD_IDS[3]).slice(0, 15),
  ];
}

// ダミー読みの発生確率を試合進行に応じて動的に計算する
// 序盤は低く、中盤・終盤に向けて上昇。試合回が上がるほど全体の水準も上がる。
function getDecoyChance() {
  if (gs.difficulty === 'easy') return 0;
  const total   = gs.cardOrder.length || 10;
  const played  = total - gs.remaining.size;
  const progress = played / total;               // 0.0（序盤）→ 1.0（終盤）
  const rates = {
    1: { base: 0.03, peak: 0.20 },
    2: { base: 0.08, peak: 0.35 },
    3: { base: 0.15, peak: 0.50 },
  };
  const { base, peak } = rates[gs.round] || rates[1];
  const chance = base + (peak - base) * progress;
  return gs.difficulty === 'hard' ? Math.min(chance * 1.35, 0.65) : chance;
}

// ── CPU（コンピュータープレイヤー）────────────────────────
// 90人を3ティアに分割：上位30（強）/ 中位30（中）/ 下位30（弱）。
// 練習モードの模擬トーナメント（1回戦80人規模）で人数が不足しないよう、
// 1ティアあたり25→30人に拡張している（addCpuPlayersForPractice参照）。
const CPU_PER_TIER = 30;
const CPU_NAMES = [
  ...Array.from({length: CPU_PER_TIER}, (_, i) => `強CPU${String(i+1).padStart(2,'0')}`),
  ...Array.from({length: CPU_PER_TIER}, (_, i) => `中CPU${String(i+1).padStart(2,'0')}`),
  ...Array.from({length: CPU_PER_TIER}, (_, i) => `弱CPU${String(i+1).padStart(2,'0')}`),
];
// 黄金角（137.5°）でHSLを分散させ色を生成
const CPU_COLORS = Array.from({length: CPU_PER_TIER * 3}, (_, i) => {
  const h = Math.round((i * 137.508) % 360);
  const s = 65 + (i % 4) * 5;
  const l = 45 + (i % 3) * 6;
  return `hsl(${h},${s}%,${l}%)`;
});
const CPU_IDS = Array.from({length: CPU_PER_TIER * 3}, (_, i) => `cpu-${i + 1}`);

// ティア別インデックス
const CPU_TIER_TOP    = CPU_IDS.slice(0, CPU_PER_TIER);
const CPU_TIER_MIDDLE = CPU_IDS.slice(CPU_PER_TIER, CPU_PER_TIER * 2);
const CPU_TIER_BOTTOM = CPU_IDS.slice(CPU_PER_TIER * 2, CPU_PER_TIER * 3);

// ティア別反応設定（ロビーの cpuDifficulty で倍率調整）
const CPU_TIER_SETTINGS = {
  top:    { minMs:  500, maxMs: 2800, missRate: 0.06 },
  middle: { minMs: 3000, maxMs: 7000, missRate: 0.25 },
  bottom: { minMs: 6500, maxMs: 9500, missRate: 0.50 },
};

const COLORS = ['#4a9eff','#00e5a0','#ff9944','#ff55cc','#cc88ff','#ffee44','#ff7777','#44ddff'];
let colorIdx = 0;

// Date.now() は Windows では ~15ms 単位でしか更新されないため、
// 起動時に一度だけ Date.now() を基準点として固定し、以降は高分解能の
// monotonic クロック（process.hrtime）からの経過時間を加算する。
const anchorDate = Date.now();
const anchorHr   = process.hrtime.bigint();
function hiResNow() {
  return anchorDate + Number(process.hrtime.bigint() - anchorHr) / 1e6;
}

const MEMO_SECONDS    = 2.5 * 60;   // 盤面整理タイム（暗記ではなく、取りやすい配置に並べ替える時間）
const READ_TIMEOUT_MS = 10 * 1000;   // 上の句 / ダミー読み完了後の制限時間
const GRAB_WINDOW_MS  = 180;   // 正解の最初の申告からこの時間だけ他の候補も受け付ける
const GRAB_BUCKET_MS  = 70;    // この時間差以内は「同時」とみなし、精度で決着する

// ── Game state ────────────────────────────────────────────
const gs = {
  phase:          'lobby',
  difficulty:     'normal',
  cpuDifficulty:  'normal',
  currentCard:    null,
  cardOrder:      [],
  remaining:      new Set(ROUND_CARD_IDS[1]),
  players:        {},
  memorizeEndsAt: 0,
  hostId:         null,
  cpuTimers:      [],
  currentDecoy:   null,   // ダミー読み中の札情報（time_up で正解発表に使用）
  grabCandidates: [],     // 受付時間中に届いた正解候補（速さ＋精度判定用）
  grabWindowTimer: null,
  lockedPlayers:  new Set(),   // お手付きをして「次の札が読まれるまで」取れないプレイヤー

  // ── トーナメント管理 ────────────────────────────────────
  round:               1,
  maxRounds:           3,
  survivorCount:       3,
  eliminatedPlayers:   new Set(),
  lastRoundResult:     null,
  isRevival:           false,
  revivalCount:        1,
  revivalRound:        1,          // 敗者復活戦の現在ラウンド（1〜3）
  revivalMaxRounds:    3,
  revivalSurvivorCount: 3,         // 復活戦中間ラウンドの通過人数
  revivalEliminated:   new Set(),  // 復活戦で脱落したプレイヤー
  cumulativeScores:    {},          // 各ラウンドのスコアを累計
  // ── グループ戦管理 ──────────────────────────────────────
  isGroupMatch:        false,
  groupTier:           null,
  humanGroups:         null,        // 最終戦後に確定するグループ分け
  groupParticipantIds: new Set(),
  groupRound:          1,           // グループ戦内ラウンド（1〜3）
  groupMaxRounds:      3,
  groupSurvivorCount:  3,           // グループ戦中間ラウンドの通過人数
  groupEliminated:     new Set(),   // グループ戦内で脱落したプレイヤー
  groupMatchScores:    {},          // 各グループ戦の実効スコア（再振り分け用）
  postTournament:      false,       // 最終試合終了済み（敗者復活戦解放フラグ）
  bottomGroupWinners:  null,        // null=未完了 / []=完了（旧システムとの互換）
  middleGroupWinners:  null,

  // ── ハウス編成（大会モード）──────────────────────────────
  houses: null,   // { A: [id,...], B: [...], C: [...], D: [...] } または null（未編成）

  // ── 大会モード（1/8本番用・一発勝負のブラケット進行）────────
  event: {
    active:         false,
    stage:          null,   // 'main' | 'revival' | 'semis' | 'final5' | 'thirdplace' | 'championship' | 'done'
    mainRoundIndex: 0,      // 本戦（main）を行った回数。難易度配分（EVENT_ROUND_MIX）の選択に使う
    mainPool:       new Set(),   // 本戦の系譜にまだ残っている人
    revivalCandidates: new Set(), // 敗者復活戦にまだ挑戦していない／再挑戦権が残っている人（累積）
    gamesPlayed:    {},          // id → 消化した試合数
    participantIds: new Set(),   // 現在進行中の試合の参加者
    finalists:      [],          // 決勝5人（final5 実施後に確定）
    top2:           [],          // 決勝戦の対象2人
    restThree:      [],          // 3位決定戦の対象3人
    lastResult:     null,        // 直近ステージの結果（ホストUI表示用）
  },
};
let memorizeTimer     = null;
let decoyTimer        = null;
let decoyTimeoutTimer = null;
let readTimeoutTimer  = null;

// ── Helpers ───────────────────────────────────────────────
function localIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .map(n => n.address);
}

// ホストになれるのは、このサーバーを起動しているPC自身から接続してきた
// ブラウザだけ（127.0.0.1/::1 経由、またはこのPCのLAN IP宛のアクセス）。
// 他PCの接続元アドレスはこのPC自身のIPとは一致しないため、ホストにはなれない。
function isHostEligible(socket) {
  // nginx などのリバースプロキシ経由だと、接続元がすべて 127.0.0.1（プロキシ自身）に見えて
  // 全員が「サーバーPC」扱いになってしまう。X-Forwarded-For があれば、本当の接続元で判定する。
  const fwd  = socket.handshake.headers && socket.handshake.headers['x-forwarded-for'];
  const real = fwd ? String(fwd).split(',')[0].trim() : (socket.handshake.address || '');
  const addr = String(real).replace(/^::ffff:/, '');
  if (addr === '127.0.0.1' || addr === '::1') return true;
  return localIPs().includes(addr);
}

// 参加登録（名前入力）済みの人間プレイヤーか
function isJoinedHuman(socketId) {
  const p = gs.players[socketId];
  return !!p && !p.isBot && !!p.joined;
}

// サーバーPC自身のブラウザで参加登録済みのソケットID（いなければ null）
// デバッグ操作（即終了・CPUポイント・盤面整理のスキップ）を使えるか。
// 練習モードは参加登録済みなら誰でも。大会モード中は、参加者が対局を止めてしまわないよう
// サーバーPCだけに限る。
function canUseDebug(socket) {
  if (gs.event.active) return isHostEligible(socket);
  return isJoinedHuman(socket.id) || isHostEligible(socket);
}

function findServerPcId() {
  for (const [id, sock] of io.sockets.sockets) {
    if (isJoinedHuman(id) && isHostEligible(sock)) return id;
  }
  return null;
}

// ホスト（＝読み上げの進行役）を切り替えて全員に知らせる。
// 練習ゲームは開始した人、大会モードはサーバーPCが進行役になる。
function setHost(id) {
  if (gs.hostId === id) return;
  gs.hostId = id;
  io.emit('host_changed', { hostId: id });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── ハウス編成（学年×コースを横断して4ハウスへ均等配分）─────
const HOUSE_IDS = ['A', 'B', 'C', 'D'];

// count 人分のハウス割り当て順を、offset だけ開始ハウスをずらした
// スネーク（往復）順で生成する。例：offset=0 → A,B,C,D,D,C,B,A,A,B,...
// グループ（学年×コース）ごとに offset を1つずつ回すことで、
// 端数の余りが特定ハウスに偏らないようにする。
function buildHouseSnakeOrder(count, offset) {
  const base = HOUSE_IDS.map((_, i) => HOUSE_IDS[(i + offset) % HOUSE_IDS.length]);
  const order = [];
  let forward = true;
  while (order.length < count) {
    order.push(...(forward ? base : [...base].reverse()));
    forward = !forward;
  }
  return order.slice(0, count);
}

// 出席中（joined済み）の人間プレイヤーを学年×コースでグルーピングし、
// グループ内をシャッフルした上でスネークドラフトにより4ハウスへ配分する。
// 当日の出欠に応じて何度でも再実行可能（そのたびに再シャッフルされる）。
function assignHouses() {
  const humanEntries = Object.entries(gs.players)
    .filter(([id, p]) => id !== gs.hostId && !p.isBot && p.joined);

  const groups = new Map();   // key: "学年-コース" → [ [id, player], ... ]
  humanEntries.forEach(entry => {
    const p   = entry[1];
    const key = `${p.grade || '?'}-${p.course || '?'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  const houses = { A: [], B: [], C: [], D: [] };
  let groupIdx = 0;
  for (const members of groups.values()) {
    const shuffled = shuffle(members);
    const order = buildHouseSnakeOrder(shuffled.length, groupIdx % HOUSE_IDS.length);
    shuffled.forEach(([id, p], i) => {
      const houseId = order[i];
      p.house = houseId;
      houses[houseId].push(id);
    });
    groupIdx++;
  }
  return houses;
}

// gs.cardOrder（易→普通→難の順に並んでいる）に沿って、まだ残っている
// 最初の札を返す。ランダムに選ぶと終盤ほど難しくなる並びが崩れてしまうため、
// 必ずこの順で読み上げる。
function pickNext() {
  const nextId = gs.cardOrder.find(id => gs.remaining.has(id));
  if (nextId === undefined) return null;
  return KARUTA.find(k => k.id === nextId) || null;
}

// ── CPU helpers ───────────────────────────────────────────
function clearCpuTimers() {
  gs.cpuTimers.forEach(t => clearTimeout(t));
  gs.cpuTimers = [];
}

// CPU の強さ（弱い/ふつう/強い）設定に応じて、参加させる CPU の層そのものを
// 絞り込む（弱い→弱CPUのみ25体、ふつう→中CPUのみ25体、強い→強CPUのみ25体）。
function addCpuPlayers() {
  const tierIds = gs.cpuDifficulty === 'easy' ? CPU_TIER_BOTTOM
                : gs.cpuDifficulty === 'hard' ? CPU_TIER_TOP
                : CPU_TIER_MIDDLE;
  tierIds.forEach(id => {
    if (!gs.eliminatedPlayers.has(id)) {
      const i = CPU_IDS.indexOf(id);
      gs.players[id] = { name: CPU_NAMES[i], color: CPU_COLORS[i], score: 0, misses: 0, isBot: true };
    }
  });
}

// 練習モードの模擬トーナメント（本番のイメージをつかむための1試合目）で、
// 人間の人数に応じて合計 targetTotal 人になるまで CPU を追加する。
// ロビーで選んだ難易度（cpuDifficulty）のティアを優先的に使い、
// 人数が足りない場合は他のティアからも補充する（最大 CPU_PER_TIER*3 人）。
function addCpuPlayersForPractice(targetTotal) {
  const preferredTier = gs.cpuDifficulty === 'easy' ? CPU_TIER_BOTTOM
                       : gs.cpuDifficulty === 'hard' ? CPU_TIER_TOP
                       : CPU_TIER_MIDDLE;
  const otherTiers = [CPU_TIER_TOP, CPU_TIER_MIDDLE, CPU_TIER_BOTTOM].filter(t => t !== preferredTier);
  const orderedIds = [...preferredTier, ...otherTiers.flat()];
  const humanCount = Object.values(gs.players).filter(p => !p.isBot && p.joined).length;
  const need = Math.max(0, targetTotal - humanCount);
  orderedIds.slice(0, need).forEach(id => {
    const i = CPU_IDS.indexOf(id);
    gs.players[id] = { name: CPU_NAMES[i], color: CPU_COLORS[i], score: 0, misses: 0, isBot: true };
  });
}

function addGroupCpuPlayers() {
  const tierIds = gs.groupTier === 'top'    ? CPU_TIER_TOP
                : gs.groupTier === 'middle' ? CPU_TIER_MIDDLE
                : CPU_TIER_BOTTOM;
  tierIds.forEach(id => {
    const idx = CPU_IDS.indexOf(id);
    gs.players[id] = { name: CPU_NAMES[idx], color: CPU_COLORS[idx], score: 0, misses: 0, isBot: true };
  });
}

function removeCpuPlayers() {
  CPU_IDS.forEach(id => delete gs.players[id]);
}

// 試合開始時点（暗記フェーズ開始時）の人間/CPU の人数を集計する
// participantIds を渡した場合はそのIDに絞り込む（グループ戦・復活戦用）
function computeHeadcount({ excludeEliminated = false, participantIds = null } = {}) {
  let humanCount = 0, cpuCount = 0;
  Object.entries(gs.players).forEach(([id, p]) => {
    // 大会モードのホストは進行役のため集計から除く。練習モードのホストは
    // 通常プレイヤーとして参加できるため集計に含める。
    if (id === gs.hostId && gs.event.active) return;
    if (participantIds && !participantIds.has(id)) return;
    if (excludeEliminated && gs.eliminatedPlayers.has(id)) return;
    if (p.isBot) cpuCount++;
    else if (p.joined) humanCount++;
  });
  return { humanCount, cpuCount, totalCount: humanCount + cpuCount };
}

// DJ 実況：札取得のたびにランダムでコメントを選ぶ（毎回同じ文言だと単調なため）
const DJ_TAKE_TEMPLATES = [
  (name, score) => `${name}さんが札をとりました！`,
  (name, score) => `${name}さん、ナイスキャッチ！ 現在${score}枚です。`,
  (name, score) => `お見事、${name}さん！`,
  (name, score) => `${name}さんが1枚ゲットです！`,
];
function pickDjTakeLine(name, score) {
  const f = DJ_TAKE_TEMPLATES[Math.floor(Math.random() * DJ_TAKE_TEMPLATES.length)];
  return f(name, score);
}

// 進行役（大会モードのホスト）を除いた参加者をスコア降順で並べる（表示用ランキングと同じ並び）。
// 練習モードのホストは通常プレイヤーとして参加するためランキングに含める。
function rankedNonHost() {
  return Object.entries(gs.players)
    .filter(([id]) => !(id === gs.hostId && gs.event.active))
    .sort(([, a], [, b]) => b.score - a.score);
}

// 2位が1位に1枚差以内まで詰め寄った「その瞬間」だけ実況する。
// beforeGap（今回の得点加算前の1位・2位差）と比べて、しきい値を新たに
// 下回った時だけ発火するため、同じ状況が続いても連呼しない。
function checkNearFirstPlace(beforeGap) {
  const sorted = rankedNonHost();
  if (sorted.length < 2) return;
  const afterGap = sorted[0][1].score - sorted[1][1].score;
  if (afterGap <= 1 && (beforeGap === null || beforeGap > 1)) {
    io.emit('dj_comment', { text: `${sorted[1][1].name}さん、あと少しで1位です！` });
  }
}

// 正解取得の共通処理（人間・CPU 共用）
function processCorrectGrab(grabberId, card) {
  if (!gs.remaining.has(card.id)) return;
  if (readTimeoutTimer) { clearTimeout(readTimeoutTimer); readTimeoutTimer = null; }
  clearCpuTimers();

  const player = gs.players[grabberId];
  if (!player) return;

  const beforeSorted = rankedNonHost();
  const beforeGap = beforeSorted.length < 2 ? null : beforeSorted[0][1].score - beforeSorted[1][1].score;

  player.score += 1;   // 得点は取った札の枚数（1枚＝1）
  gs.remaining.delete(card.id);

  const takenCard  = card;
  const takerName  = player.name;
  const takerColor = player.color;
  gs.currentCard   = pickNext();
  gs.phase         = 'announcing';

  io.emit('card_taken', {
    cardId:  card.id,
    by:      { id: grabberId, name: takerName, color: takerColor },
    players: gs.players,
  });
  io.emit('dj_comment', { text: pickDjTakeLine(takerName, player.score) });
  checkNearFirstPlace(beforeGap);

  const nextCard  = gs.currentCard;
  const remaining = [...gs.remaining];
  setTimeout(() => {
    io.emit('announce_taken', { name: takerName, color: takerColor, card: takenCard, playAt: hiResNow() + 250 });
    if (nextCard) {
      gs.phase = 'waiting';
      io.emit('game_waiting', {
        remaining, players: gs.players, hostId: gs.hostId, difficulty: gs.difficulty,
        round: gs.round, totalCards: gs.cardOrder.length || 10,
        isRevival: gs.isRevival,
      });
    } else {
      endRound();
    }
  }, 700);
}

// yomi_finished 受信後に呼び出し、各 CPU の反応タイマーを仕掛ける
function scheduleCpuGrabs(card) {
  clearCpuTimers();
  const lobbyMod = gs.cpuDifficulty === 'hard' ? 0.55
                 : gs.cpuDifficulty === 'easy' ? 1.55 : 1.0;
  CPU_IDS.forEach((cpuId, cpuIdx) => {
    if (!gs.players[cpuId]) return;
    const tierKey = cpuIdx < CPU_PER_TIER ? 'top' : cpuIdx < CPU_PER_TIER * 2 ? 'middle' : 'bottom';
    const base = CPU_TIER_SETTINGS[tierKey];
    const minMs = base.minMs * lobbyMod;
    const maxMs = base.maxMs * lobbyMod;
    const missRate = gs.cpuDifficulty === 'hard'
      ? base.missRate * 0.4
      : gs.cpuDifficulty === 'easy'
      ? Math.min(base.missRate * 1.5, 0.8) : base.missRate;
    const delay = minMs + Math.random() * (maxMs - minMs);
    const t = setTimeout(() => {
      if (gs.phase !== 'reading' || !gs.currentCard || gs.currentCard.id !== card.id) return;
      if (!gs.remaining.has(card.id)) return;
      if (Math.random() < missRate) {
        gs.players[cpuId].misses++;
        gs.players[cpuId].score -= 1;
        io.emit('players_updated', gs.players);
      } else {
        processCorrectGrab(cpuId, card);
      }
    }, delay);
    gs.cpuTimers.push(t);
  });
}

// 本物の札（gs.currentCard）を読み上げる。
// 上の句の読み上げ完了通知（yomi_finished）を待ってから制限時間と CPU を起動する。
function startRealRead() {
  gs.lockedPlayers.clear();   // 次の札が読まれ始めたので、お手付きのロックを解除
  gs.phase = 'reading';
  const card = gs.currentCard;
  io.emit('read_card', {
    card,
    remaining: [...gs.remaining],
    playAt:    hiResNow() + 400,
  });
  if (readTimeoutTimer) clearTimeout(readTimeoutTimer);
  // yomi_finished が来ない場合の安全フォールバック（8s 後に計測開始）
  readTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'reading' || gs.currentCard !== card) return;
    armReadTimeout(card);
  }, 8000);
}

// 上の句の読み上げ完了後に呼ばれる。制限時間タイマーと CPU タイマーを起動する。
function armReadTimeout(card) {
  if (readTimeoutTimer) clearTimeout(readTimeoutTimer);
  scheduleCpuGrabs(card);
  readTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'reading' || gs.currentCard !== card) return;
    triggerTimeUp(card);
  }, READ_TIMEOUT_MS);
}

// 制限時間経過の処理。「そこまで」→ 正解発表 → 次の札待機へ。
// 誰も取れなかった札は remaining から外す（外さないと pickNext() が同じ札を
// 何度も選び続け、次の札に進めなくなる／同じ札が繰り返し読まれるバグになる）。
function triggerTimeUp(card) {
  clearCpuTimers();
  gs.phase = 'announcing';
  gs.remaining.delete(card.id);
  io.emit('time_up', { card, playAt: hiResNow() + 250 });

  gs.currentCard  = pickNext();
  const nextCard  = gs.currentCard;
  const remaining = [...gs.remaining];

  if (nextCard) {
    gs.phase = 'waiting';
    io.emit('game_waiting', {
      remaining, players: gs.players, hostId: gs.hostId, difficulty: gs.difficulty,
      round: gs.round, totalCards: gs.cardOrder.length || 10,
      isRevival: gs.isRevival,
    });
  } else {
    endRound();
  }
}

// ダミー読み完了後、READ_TIMEOUT_MS 待ってから「そこまで」を発し次の本物の札へ移る。
function armDecoyTimeout() {
  if (decoyTimeoutTimer) clearTimeout(decoyTimeoutTimer);
  decoyTimeoutTimer = setTimeout(() => {
    if (gs.phase !== 'decoy') return;
    gs.phase = 'announcing';
    const decoy = gs.currentDecoy;
    gs.currentDecoy = null;
    // そこまで → 上の句（デコイ yomi）→ これは盤面にない札でした の順で再生させる
    io.emit('time_up', { card: null, decoy, playAt: hiResNow() + 250 });

    const nextCard  = gs.currentCard;   // ダミー中も currentCard は次の本物の札を指す
    const remaining = [...gs.remaining];
    if (nextCard) {
      gs.phase = 'waiting';
      io.emit('game_waiting', {
        remaining, players: gs.players, hostId: gs.hostId, difficulty: gs.difficulty,
        round: gs.round, totalCards: gs.cardOrder.length || 10,
        isRevival: gs.isRevival,
      });
    } else {
      endRound();
    }
    decoyTimeoutTimer = null;
  }, READ_TIMEOUT_MS);
}

// 盤面のどの札にも対応しないダミーの読みを再生する。
// ホスト端末から再生完了の通知（decoy_finished）を受け取ってから READ_TIMEOUT_MS 待つ。
function startDecoyRead() {
  gs.lockedPlayers.clear();   // 次の読み上げが始まったので、お手付きのロックを解除
  gs.phase = 'decoy';
  const decoy = DECOYS[Math.floor(Math.random() * DECOYS.length)];
  io.emit('decoy_read', {
    id:     decoy.id,
    yomi:   decoy.yomi,
    playAt: hiResNow() + 400,
  });
  gs.currentDecoy = decoy;   // time_up 発火時に上の句として再読み上げる
  if (decoyTimer) clearTimeout(decoyTimer);
  // decoy_finished が来ない場合のフォールバック（音声再生時間 + 10s の余裕）
  decoyTimer = setTimeout(() => {
    if (gs.phase !== 'decoy') return;
    armDecoyTimeout();
  }, 22000);
}

// 試合終了処理
function endRound() {
  // ── 大会モード（1/8本番用）終了処理 ─────────────────────────
  if (gs.event.active) { endEventRound(); return; }

  // 結果送信時に players スナップショットを取る（CPUが後で削除されても結果画面に表示される）
  const snap = () => Object.assign({}, gs.players);

  // ── グループ戦終了 ─────────────────────────────────────────
  if (gs.isGroupMatch) {
    gs.phase = 'round_finished';

    // アクティブな参加者（脱落済みを除く）をスコア順に並べる
    const activeSorted = Object.entries(gs.players)
      .filter(([id, p]) => gs.groupParticipantIds.has(id) && !gs.groupEliminated.has(id) && (p.isBot || p.joined))
      .sort(([, a], [, b]) => b.score - a.score);

    if (gs.groupRound < gs.groupMaxRounds) {
      // ── 中間ラウンド：上位N人を次ラウンドへ進出、脱落者のスコアを記録 ──
      const n = Math.min(gs.groupSurvivorCount, activeSorted.length);
      const advancerIds   = activeSorted.slice(0, n).map(([id]) => id);
      const eliminatedNow = activeSorted.slice(n).map(([id]) => id);
      eliminatedNow.forEach(id => {
        gs.groupEliminated.add(id);
        // 実効スコア = ラウンド番号×10000 + スコア（ラウンド到達数が主キー）
        if (gs.players[id] && !gs.players[id].isBot) {
          gs.groupMatchScores[id] = gs.groupRound * 10000 + (gs.players[id].score || 0);
        }
      });
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: advancerIds, eliminatedIds: eliminatedNow,
        survivorCount: gs.groupSurvivorCount, players: playersSnap,
        isGroupMatch: true, isGroupMatchIntermediate: true,
        groupTier: gs.groupTier, groupRound: gs.groupRound, groupMaxRounds: gs.groupMaxRounds,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: advancerIds, eliminatedIds: eliminatedNow,
          survivorCount: gs.groupSurvivorCount,
          isGroupMatch: true, isGroupMatchIntermediate: true,
          groupTier: gs.groupTier, groupRound: gs.groupRound, groupMaxRounds: gs.groupMaxRounds,
        });
      }, 3000);
    } else {
      // ── 最終ラウンド：全員のスコアを記録し完了マーカーを設定 ──
      const finishedTier = gs.groupTier;
      gs.isGroupMatch = false;

      // 最終ラウンド参加者のスコアを記録（最大ラウンド到達 = 最高実効スコア）
      activeSorted.forEach(([id, p]) => {
        if (!p.isBot) gs.groupMatchScores[id] = gs.groupMaxRounds * 10000 + p.score;
      });

      // 完了マーカー兼昇格者リスト（null=未完了 / [ids]=完了 ）
      const winnerIds = activeSorted.filter(([, p]) => !p.isBot).map(([id]) => id);
      if (finishedTier === 'bottom') gs.bottomGroupWinners = winnerIds;
      if (finishedTier === 'middle') gs.middleGroupWinners = winnerIds;
      gs.groupEliminated = new Set();

      // 上位グループ戦終了後に全員を再振り分け
      if (finishedTier === 'top') {
        const allHumans = Object.entries(gs.players)
          .filter(([id, p]) => !(id === gs.hostId && gs.event.active) && !p.isBot && p.joined)
          .sort(([idA], [idB]) => (gs.groupMatchScores[idB] || 0) - (gs.groupMatchScores[idA] || 0));
        const numH2  = allHumans.length;
        const base2  = Math.floor(numH2 / 3);
        const extra2 = numH2 - base2 * 3;
        const topCnt2 = base2 + (extra2 > 0 ? 1 : 0);
        const midCnt2 = base2 + (extra2 > 1 ? 1 : 0);
        gs.humanGroups = {
          top:    allHumans.slice(0, topCnt2).map(([id]) => id),
          middle: allHumans.slice(topCnt2, topCnt2 + midCnt2).map(([id]) => id),
          bottom: allHumans.slice(topCnt2 + midCnt2).map(([id]) => id),
        };
        gs.bottomGroupWinners = null;  // 次サイクルのために解放
        gs.middleGroupWinners = null;
        gs.groupMatchScores   = {};
      }

      const grouped = activeSorted.map(([id]) => id);
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: grouped, eliminatedIds: [],
        players: playersSnap, isGroupMatch: true, groupTier: finishedTier,
        humanGroups: gs.humanGroups,
        bottomGroupWinners: gs.bottomGroupWinners,
        middleGroupWinners: gs.middleGroupWinners,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: grouped, eliminatedIds: [],
          isGroupMatch: true, groupTier: finishedTier,
          humanGroups: gs.humanGroups,
          bottomGroupWinners: gs.bottomGroupWinners,
          middleGroupWinners: gs.middleGroupWinners,
        });
      }, 3000);
    }
    return;
  }

  // ── 敗者復活戦終了 ────────────────────────────────────────
  if (gs.isRevival) {
    gs.phase = 'round_finished';
    // このラウンドに参加していたアクティブな復活戦プレイヤー
    const activeRevivors = Object.entries(gs.players)
      .filter(([id, p]) => gs.eliminatedPlayers.has(id) && !gs.revivalEliminated.has(id) && !p.isBot && p.joined)
      .sort(([, a], [, b]) => b.score - a.score);

    if (gs.revivalRound < gs.revivalMaxRounds) {
      // ── 中間ラウンド：上位N人を次ラウンドへ進出 ──
      const n = Math.min(gs.revivalSurvivorCount, activeRevivors.length);
      const advancerIds  = activeRevivors.slice(0, n).map(([id]) => id);
      const eliminatedNow = activeRevivors.slice(n).map(([id]) => id);
      eliminatedNow.forEach(id => gs.revivalEliminated.add(id));
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: advancerIds, eliminatedIds: eliminatedNow,
        survivorCount: gs.revivalSurvivorCount, players: playersSnap,
        isRevival: true, isRevivalIntermediate: true,
        revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: advancerIds, eliminatedIds: eliminatedNow,
          survivorCount: gs.revivalSurvivorCount,
          isRevival: true, isRevivalIntermediate: true,
          revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
        });
      }, 3000);
    } else {
      // ── 最終ラウンド：上位revivalCount人を本戦復帰 ──
      gs.isRevival = false;
      const n = Math.min(gs.revivalCount, activeRevivors.length);
      const revivedIds = activeRevivors.slice(0, n).map(([id]) => id);
      const failedIds  = [
        ...activeRevivors.slice(n).map(([id]) => id),
        ...[...gs.revivalEliminated].filter(id => gs.players[id] && !gs.players[id].isBot),
      ];
      revivedIds.forEach(id => {
        gs.eliminatedPlayers.delete(id);
        if (gs.players[id]) gs.players[id].isEliminated = false;
      });
      gs.revivalEliminated = new Set();
      io.emit('players_updated', gs.players);
      const playersSnap = snap();
      gs.lastRoundResult = {
        round: gs.round, survivorIds: revivedIds, eliminatedIds: failedIds,
        survivorCount: gs.revivalCount, players: playersSnap,
        isRevival: true, revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
      };
      setTimeout(() => {
        io.emit('round_finished', {
          round: gs.round, players: playersSnap,
          survivorIds: revivedIds, eliminatedIds: failedIds,
          survivorCount: gs.revivalCount,
          isRevival: true, revivalRound: gs.revivalRound, revivalMaxRounds: gs.revivalMaxRounds,
        });
      }, 3000);
    }
    return;
  }

  // ── 練習モード：敗退なし ──────────────────────────────────
  // 点数に関わらず全員を「進出」扱いにし、次の試合でも引き続き札を取れる。
  // 結果画面はその試合で実際に取った点数の順にランキング表示する。
  gs.phase = 'round_finished';
  const isFinalRound = gs.round >= gs.maxRounds;
  const competitors = Object.entries(gs.players)
    .filter(([id, p]) => !(id === gs.hostId && gs.event.active) && (p.isBot || p.joined))
    .sort(([, a], [, b]) => b.score - a.score);
  const survivorIds   = competitors.map(([id]) => id);
  const eliminatedIds = [];

  if (isFinalRound) {
    // 最終試合：ランキングを表示して終了（敗者復活戦・グループ戦には進まない）
    gs.postTournament     = false;
    gs.humanGroups        = null;
    gs.bottomGroupWinners = null;
    gs.middleGroupWinners = null;
  }

  const playersSnap = snap();
  gs.lastRoundResult = {
    round: gs.round, survivorIds, eliminatedIds,
    survivorCount: gs.survivorCount, players: playersSnap,
    ...(isFinalRound ? { isFinal: true } : {}),
  };
  setTimeout(() => {
    io.emit('round_finished', {
      round: gs.round, players: playersSnap,
      survivorIds, eliminatedIds, survivorCount: gs.survivorCount,
      ...(isFinalRound ? { isFinal: true } : {}),
    });
  }, 3000);
}

// ── 大会モード（1/8本番用）───────────────────────────────────
const EVENT_SEMIS_THRESHOLD = 12;  // mainPool がこの人数以下になったら「決勝5人選抜」に切り替える
const EVENT_FINALIST_COUNT  = 5;
const EVENT_MIN_GAMES       = 3;   // 全員がこれだけの試合数を消化できることを保証する

const EVENT_STAGE_LABELS = {
  main: '本戦', revival: '敗者復活戦', semis: '決勝進出決定戦',
  final5: '決勝ラウンド', thirdplace: '3位決定戦', championship: '決勝戦',
};

// 通過人数・敗退人数を約1/3ずつに分ける（最低1人は通過・最低0人は敗退）
function eventCutCounts(poolSize) {
  const pass = Math.max(1, Math.min(poolSize, Math.round(poolSize / 3)));
  return { pass, lose: poolSize - pass };
}

// 練習モードの模擬トーナメント（本番の雰囲気をつかむためのモード）。
// 1回戦は80人規模で開始し、1回戦→40人・2回戦→20人・3回戦（最終）→上位3人
// という「本番はこう進む」がわかる縮小コピーの進行にする。
const PRACTICE_MOCK_TOTAL_TARGET    = 80;
const PRACTICE_MOCK_SURVIVOR_SCHEDULE = [40, 20, 3];

// gs.event.stage を設定する。'main' に入るたびに回戦カウンタを+1し、
// EVENT_ROUND_MIX（易→難の配分）を回すのに使う。
function setEventStage(stage) {
  gs.event.stage = stage;
  if (stage === 'main') gs.event.mainRoundIndex++;
}

// 大会モードの1試合を開始する（暗記フェーズから）。
// 本戦（main）は回戦カウンタに応じた易/普通/難しいの配分で10枚抽出、
// 準決勝以降は最も難しい配分、敗者復活戦は45枚すべて易→難の順で使う。
function startEventMatch(participantIds) {
  gs.event.participantIds = new Set(participantIds);
  removeCpuPlayers();
  participantIds.forEach(id => {
    if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
  });

  const cardIds = gs.event.stage === 'revival'
    ? buildDifficultyOrderedCardIds()
    : gs.event.stage === 'main'
    ? buildEventRoundCardIds(gs.event.mainRoundIndex)
    : buildEventRoundCardIds(EVENT_ROUND_MIX.length); // 準決勝・決勝5人・3位決定戦・決勝戦は最難
  const cards   = KARUTA.filter(k => cardIds.includes(k.id));
  gs.remaining      = new Set(cardIds);
  gs.cardOrder      = cardIds;
  gs.currentCard    = null;
  gs.currentDecoy   = null;
  gs.phase          = 'memorizing';
  gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

  const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: gs.event.participantIds });
  io.emit('event_memorize_start', {
    cardOrder:      gs.cardOrder,
    cards,
    players:        gs.players,
    endsAt:         gs.memorizeEndsAt,
    stage:          gs.event.stage,
    stageLabel:     EVENT_STAGE_LABELS[gs.event.stage] || '大会モード',
    participantIds: [...gs.event.participantIds],
    gamesPlayed:    gs.event.gamesPlayed,
    humanCount, cpuCount, totalCount,
  });
  memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
}

// 現在のステージの参加者を games played にカウントし、次に打てる手（本戦／敗者復活戦の
// どちらが可能か、あるいは大会が終了したか）をホストへ通知する。
function notifyEventStageReady() {
  const mainReady    = gs.event.mainPool.size > 0
    && !['final5', 'thirdplace', 'championship', 'done'].includes(gs.event.stage);
  const revivalReady = gs.event.revivalCandidates.size > 0;
  io.emit('event_stage_ready', {
    stage:            gs.event.stage,
    mainPoolSize:     gs.event.mainPool.size,
    revivalPoolSize:  gs.event.revivalCandidates.size,
    mainReady,
    revivalReady,
    finalists:        gs.event.finalists,
    top2:             gs.event.top2,
    restThree:        gs.event.restThree,
    gamesPlayed:      gs.event.gamesPlayed,
    players:          gs.players,
  });
}

// 大会モードの1試合終了処理。ステージごとに通過／敗退／敗者復活行きを振り分ける。
function endEventRound() {
  gs.phase = 'round_finished';
  const stage = gs.event.stage;

  const active = [...gs.event.participantIds]
    .filter(id => gs.players[id] && gs.players[id].joined)
    .map(id => [id, gs.players[id]])
    .sort(([, a], [, b]) => b.score - a.score);

  // 参加者全員の消化試合数を加算
  active.forEach(([id]) => {
    gs.event.gamesPlayed[id] = (gs.event.gamesPlayed[id] || 0) + 1;
  });

  const playersSnap = Object.assign({}, gs.players);

  if (stage === 'final5') {
    const sorted = active.map(([id]) => id);
    gs.event.top2       = sorted.slice(0, 2);
    gs.event.restThree  = sorted.slice(2, 5);
    gs.event.stage       = 'thirdplace';
    gs.event.lastResult  = { stage, finalRanking: sorted, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage, finalRanking: sorted, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  if (stage === 'thirdplace' || stage === 'championship') {
    const sorted = active.map(([id]) => id);
    gs.event.stage      = stage === 'thirdplace' ? 'championship' : 'done';
    gs.event.lastResult = { stage, ranking: sorted, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage, ranking: sorted, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  // ── main / semis / revival 共通の通過・敗退振り分け ─────────
  const ids = active.map(([id]) => id);

  if (stage === 'revival') {
    const { pass } = eventCutCounts(ids.length);
    const revived   = ids.slice(0, pass);
    const stillOut  = ids.slice(pass);
    revived.forEach(id => gs.event.mainPool.add(id));
    // 敗者復活戦にも負けた人：まだ3試合未満なら次の敗者復活戦に必ず再挑戦させる
    stillOut.forEach(id => {
      if ((gs.event.gamesPlayed[id] || 0) < EVENT_MIN_GAMES) gs.event.revivalCandidates.add(id);
    });
    gs.event.lastResult = { stage, revived, stillOut, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage, revived, stillOut, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  // stage === 'main' または 'semis'（どちらで実施するかは開始時に advance_event 側で決定済み）
  if (stage === 'semis') {
    const n = Math.min(EVENT_FINALIST_COUNT, ids.length);
    const finalists = ids.slice(0, n);
    const losers    = ids.slice(n);
    gs.event.mainPool = new Set(finalists);
    losers.forEach(id => {
      if ((gs.event.gamesPlayed[id] || 0) < EVENT_MIN_GAMES) gs.event.revivalCandidates.add(id);
    });
    gs.event.finalists  = finalists;
    gs.event.stage       = 'final5';
    gs.event.lastResult  = { stage: 'semis', finalists, losers, players: playersSnap };
    setTimeout(() => {
      io.emit('event_round_finished', { stage: 'semis', finalists, losers, players: playersSnap });
      notifyEventStageReady();
    }, 3000);
    return;
  }

  const { pass } = eventCutCounts(ids.length);
  const passers = ids.slice(0, pass);
  const losers   = ids.slice(pass);
  gs.event.mainPool  = new Set(passers);
  losers.forEach(id => gs.event.revivalCandidates.add(id));
  gs.event.stage      = 'main';
  gs.event.lastResult = { stage: 'main', passers, losers, players: playersSnap };
  setTimeout(() => {
    io.emit('event_round_finished', { stage: 'main', passers, losers, players: playersSnap });
    notifyEventStageReady();
  }, 3000);
}

// 暗記フェーズ終了後に waiting フェーズへ移行
function doStartPlaying() {
  if (memorizeTimer) { clearTimeout(memorizeTimer); memorizeTimer = null; }
  // CPU は各試合の開始時（暗記フェーズ開始時）に追加済み
  gs.phase       = 'waiting';
  gs.currentCard = pickNext();
  io.emit('game_waiting', {
    cardOrder:           gs.cardOrder,
    remaining:           [...gs.remaining],
    players:             gs.players,
    hostId:              gs.hostId,
    difficulty:          gs.difficulty,
    round:               gs.round,
    totalCards:          gs.cardOrder.length || 10,
    isRevival:           gs.isRevival,
    isGroupMatch:        gs.isGroupMatch,
    groupTier:           gs.groupTier,
    groupParticipantIds: [...gs.groupParticipantIds],
    groupRound:          gs.groupRound,
    groupMaxRounds:      gs.groupMaxRounds,
    isEvent:             gs.event.active,
    eventStage:          gs.event.stage,
    eventStageLabel:     EVENT_STAGE_LABELS[gs.event.stage] || null,
    eventParticipantIds: [...gs.event.participantIds],
  });
}

// 全タイマーをまとめてクリアするユーティリティ
function clearAllTimers() {
  clearCpuTimers();
  if (memorizeTimer)     { clearTimeout(memorizeTimer);     memorizeTimer     = null; }
  if (decoyTimer)        { clearTimeout(decoyTimer);        decoyTimer        = null; }
  if (decoyTimeoutTimer) { clearTimeout(decoyTimeoutTimer); decoyTimeoutTimer = null; }
  if (readTimeoutTimer)  { clearTimeout(readTimeoutTimer);  readTimeoutTimer  = null; }
  if (gs.grabWindowTimer) { clearTimeout(gs.grabWindowTimer); gs.grabWindowTimer = null; }
  gs.grabCandidates = [];
}

// 受付時間内に集まった正解候補から勝者を決める。
// まず時刻を GRAB_BUCKET_MS 単位でグルーピングし、最速グループの中で
// 最も札の中心に近かった人（precision が最小）を勝者とする。
function resolveGrabWindow(cardId) {
  gs.grabWindowTimer = null;
  const candidates = gs.grabCandidates.filter(c => c.cardId === cardId);
  gs.grabCandidates = [];
  if (!candidates.length) return;
  if (!gs.currentCard || gs.currentCard.id !== cardId || !gs.remaining.has(cardId)) return;

  const minT = Math.min(...candidates.map(c => c.t));
  const fastest = candidates.filter(c => c.t - minT < GRAB_BUCKET_MS);
  fastest.sort((a, b) => a.precision - b.precision);
  const winner = fastest[0];
  const player = gs.players[winner.id];
  if (!player) return;
  processCorrectGrab(winner.id, gs.currentCard);
}

// ── Socket.io ─────────────────────────────────────────────
io.on('connection', socket => {
  const color = COLORS[colorIdx++ % COLORS.length];
  gs.players[socket.id] = { name: `プレイヤー${Object.keys(gs.players).filter(id => !gs.players[id].isBot).length + 1}`, color, score: 0, misses: 0, joined: false };

  socket.emit('init', {
    myId:              socket.id,
    phase:             gs.phase,
    difficulty:        gs.difficulty,
    cpuDifficulty:     gs.cpuDifficulty,
    currentCard:       gs.currentCard,
    cardOrder:         gs.cardOrder,
    remaining:         [...gs.remaining],
    players:           gs.players,
    cards:             KARUTA,
    endsAt:            gs.memorizeEndsAt,
    hostId:            gs.hostId,
    isServerPc:        isHostEligible(socket),   // サーバーPC自身のブラウザか（大会モードの操作可否）
    round:             gs.round,
    maxRounds:         gs.maxRounds,
    survivorCount:       gs.survivorCount,
    revivalCount:        gs.revivalCount,
    isRevival:           gs.isRevival,
    revivalRound:        gs.revivalRound,
    revivalMaxRounds:    gs.revivalMaxRounds,
    revivalSurvivorCount: gs.revivalSurvivorCount,
    revivalEliminated:   [...gs.revivalEliminated],
    groupRound:          gs.groupRound,
    groupMaxRounds:      gs.groupMaxRounds,
    groupSurvivorCount:  gs.groupSurvivorCount,
    groupEliminated:     [...gs.groupEliminated],
    isGroupMatch:        gs.isGroupMatch,
    groupTier:           gs.groupTier,
    humanGroups:         gs.humanGroups,
    groupParticipantIds: [...gs.groupParticipantIds],
    cumulativeScores:    gs.cumulativeScores,
    eliminatedPlayers:   [...gs.eliminatedPlayers],
    lastRoundResult:     gs.lastRoundResult,
    totalCards:          gs.cardOrder.length || 10,
    postTournament:      gs.postTournament,
    bottomGroupWinners:  gs.bottomGroupWinners,
    middleGroupWinners:  gs.middleGroupWinners,
    houses:              gs.houses,
    isEvent:             gs.event.active,
    eventStage:          gs.event.stage,
    eventStageLabel:     EVENT_STAGE_LABELS[gs.event.stage] || null,
    eventParticipantIds: [...gs.event.participantIds],
    eventGamesPlayed:    gs.event.gamesPlayed,
  });

  socket.broadcast.emit('player_joined', { id: socket.id, player: gs.players[socket.id], players: gs.players });

  // ── Clock sync ───────────────────────────────────────────
  socket.on('time_sync', ({ t1 }) => {
    socket.emit('time_sync', { t1, t2: hiResNow() });
  });

  // ── Set name ─────────────────────────────────────────────
  // payload は { name, grade, course }（ハウス編成に使用）。
  // 文字列のみで届いた場合（旧形式）もフォールバックする。
  socket.on('set_name', payload => {
    const isObj = payload && typeof payload === 'object';
    const rawName = isObj ? payload.name : payload;
    const n = String(rawName).trim().slice(0, 15);
    if (n && gs.players[socket.id]) {
      gs.players[socket.id].name   = n;
      gs.players[socket.id].joined = true;
      if (isObj) {
        if (payload.grade)  gs.players[socket.id].grade  = String(payload.grade);
        if (payload.course) gs.players[socket.id].course = String(payload.course);
      }
      const becameHost = !gs.hostId && isHostEligible(socket);
      if (becameHost) gs.hostId = socket.id;
      io.emit('players_updated', gs.players);
      if (becameHost) io.emit('host_changed', { hostId: gs.hostId });
    }
  });

  // ── ハウス編成（サーバーPCのみ・大会モード）─────────────────
  // 学年×コースの各グループを出席者だけでシャッフルし、4ハウスへ
  // スネークドラフト（グループごとに開始ハウスを1つずつローテーション）で
  // 均等配分する。出欠が変わった場合は何度でも再実行できる。
  socket.on('assign_houses', () => {
    if (!isHostEligible(socket) || !isJoinedHuman(socket.id) || gs.phase !== 'lobby') return;
    setHost(socket.id);   // ハウス編成は進行役（サーバーPC）を除いた参加者で行う
    gs.houses = assignHouses();
    io.emit('houses_assigned', { houses: gs.houses, players: gs.players });
  });

  // ── Start game（参加登録済みの誰でも。先に押した人の設定が全員に適用される）──
  socket.on('start_game', (opts) => {
    if (gs.phase !== 'lobby' || !isJoinedHuman(socket.id)) return;
    // 開始した人が読み上げの進行役（次の札の読み上げ通知を出す端末）になる
    setHost(socket.id);
    const diff    = opts && opts.difficulty;
    const cpuDiff = opts && opts.cpuDifficulty;
    gs.difficulty     = ['easy', 'normal', 'hard'].includes(diff)    ? diff    : 'normal';
    gs.cpuDifficulty  = ['easy', 'normal', 'hard'].includes(cpuDiff) ? cpuDiff : 'normal';

    // トーナメント状態をフルリセット
    gs.round               = 1;
    gs.eliminatedPlayers   = new Set();
    gs.lastRoundResult     = null;
    gs.isGroupMatch        = false;
    gs.groupTier           = null;
    gs.humanGroups         = null;
    gs.groupParticipantIds = new Set();
    gs.cumulativeScores    = {};
    gs.postTournament      = false;
    gs.bottomGroupWinners  = null;
    gs.middleGroupWinners  = null;
    gs.groupMatchScores    = {};
    Object.values(gs.players).forEach(p => {
      p.score = 0; p.misses = 0; p.isEliminated = false;
    });

    addCpuPlayersForPractice(PRACTICE_MOCK_TOTAL_TARGET);
    const { humanCount, cpuCount, totalCount } = computeHeadcount();
    gs.survivorCount = Math.min(PRACTICE_MOCK_SURVIVOR_SCHEDULE[0], totalCount);

    const roundCardIds = buildPracticeCardIds();
    const roundCards   = KARUTA.filter(k => roundCardIds.includes(k.id));
    gs.phase          = 'memorizing';
    gs.remaining      = new Set(roundCardIds);
    gs.cardOrder      = roundCardIds;
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
      cardOrder:     gs.cardOrder,
      cards:         roundCards,
      players:       gs.players,
      endsAt:        gs.memorizeEndsAt,
      difficulty:    gs.difficulty,
      round:         gs.round,
      maxRounds:     gs.maxRounds,
      survivorCount: gs.survivorCount,
      humanCount, cpuCount, totalCount,
    });
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── Skip memorization（ホストのみ・デバッグ用）───────────
  socket.on('skip_memorize', () => {
    if (gs.phase !== 'memorizing' || !canUseDebug(socket)) return;
    doStartPlaying();
  });

  // ── Read next card（ホストのみ）──────────────────────────
  socket.on('read_next', () => {
    if (gs.phase !== 'waiting' || socket.id !== gs.hostId || !gs.currentCard) return;
    const chance = getDecoyChance();
    if (chance > 0 && Math.random() < chance) {
      startDecoyRead();
    } else {
      startRealRead();
    }
  });

  // ── Decoy finished（ホスト端末からのダミー読み再生完了通知）─
  // 「これは盤面にない札でした」まで再生し終えたタイミングで受信する。
  // ここから READ_TIMEOUT_MS 待ってから「そこまで」を発し次の札へ。
  socket.on('decoy_finished', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'decoy') return;
    if (decoyTimer) { clearTimeout(decoyTimer); decoyTimer = null; }
    armDecoyTimeout();
  });

  // ── Yomi finished（ホスト端末からの上の句読み上げ完了通知）─
  // これを受け取った時点から制限時間と CPU タイマーを起動する。
  socket.on('yomi_finished', ({ cardId }) => {
    if (socket.id !== gs.hostId || gs.phase !== 'reading') return;
    if (!gs.currentCard || gs.currentCard.id !== cardId) return;
    armReadTimeout(gs.currentCard);
  });

  // ── Grab card ────────────────────────────────────────────
  // payload は { cardId, t, precision }（t: サーバー時計に補正済みのクリック時刻、
  // precision: 札の中心からのズレ 0〜1）。旧クライアント互換のため、
  // 数値（cardId のみ）で届いた場合もフォールバックする。
  socket.on('grab_card', payload => {
    const isObj     = payload && typeof payload === 'object';
    const cardId    = isObj ? payload.cardId : payload;
    const clientT   = (isObj && typeof payload.t === 'number') ? payload.t : null;
    const precision = (isObj && typeof payload.precision === 'number')
      ? Math.max(0, Math.min(1, payload.precision)) : 1;

    if (!gs.players[socket.id]) return;
    // ホストは進行役なので大会モード（本番）では取得不可。練習モードでは
    // サーバーPC自身のブラウザ＝ホストも通常プレイヤーとして参加できる。
    if (socket.id === gs.hostId && gs.event.active) return;

    if (gs.event.active) {
      // 大会モード: 現在のステージの参加者のみ取れる
      if (!gs.event.participantIds.has(socket.id)) return;
    } else if (gs.isGroupMatch) {
      // グループ戦: そのグループの参加者のみ（中間ラウンドで脱落済みは除く）
      if (!gs.groupParticipantIds.has(socket.id)) return;
      if (gs.groupEliminated.has(socket.id)) return;
    } else if (gs.isRevival) {
      // 復活戦: 敗退者のみ取れる（復活戦で脱落済みは除く）
      if (!gs.eliminatedPlayers.has(socket.id)) return;
      if (gs.revivalEliminated.has(socket.id)) return;
    } else {
      // 本戦: 敗退者は取れない
      if (gs.eliminatedPlayers.has(socket.id)) return;
    }

    // お手付きをした人は、次の札が読み上げられるまで取れない
    // （手当たり次第にクリックして札を取られるのを防ぐため）。
    if (gs.lockedPlayers.has(socket.id)) {
      if (gs.phase === 'reading' || gs.phase === 'decoy') socket.emit('grab_locked');
      return;
    }

    if (gs.phase === 'decoy') {
      const player = gs.players[socket.id];
      player.misses++;
      player.score -= 1;
      gs.lockedPlayers.add(socket.id);
      socket.emit('wrong_grab', { cardId });
      io.emit('players_updated', gs.players);
      return;
    }

    if (gs.phase !== 'reading' || !gs.currentCard) return;
    const player = gs.players[socket.id];

    if (cardId === gs.currentCard.id && gs.remaining.has(cardId)) {
      // 即座に正解者を確定させず、短い受付時間の間だけ他の候補も集める。
      // 集まった候補は、まず時刻でグルーピングし、最速グループ内では
      // 札の中心により近かった人（precision）を優先して勝者を決める。
      const t = clientT !== null ? clientT : hiResNow();
      gs.grabCandidates.push({ id: socket.id, cardId, t, precision });
      if (!gs.grabWindowTimer) {
        gs.grabWindowTimer = setTimeout(() => resolveGrabWindow(cardId), GRAB_WINDOW_MS);
      }
    } else if (gs.remaining.has(cardId)) {
      player.misses++;
      player.score -= 1;
      gs.lockedPlayers.add(socket.id);
      socket.emit('wrong_grab', { cardId });
      io.emit('players_updated', gs.players);
    }
  });

  // ── Debug: 即ゲーム終了（ホストのみ）─────────────────────
  socket.on('debug_end_game', () => {
    if (!canUseDebug(socket)) return;
    if (!['waiting', 'reading', 'decoy', 'announcing'].includes(gs.phase)) return;
    clearAllTimers();
    endRound();
  });

  // ── Debug: CPUにランダムポイントを付与（ホストのみ）───────
  socket.on('debug_cpu_points', () => {
    if (!canUseDebug(socket)) return;
    CPU_IDS.forEach(id => {
      if (gs.players[id]) {
        gs.players[id].score = Math.floor(Math.random() * 7);   // 0〜6枚
      }
    });
    io.emit('players_updated', gs.players);
  });

  // ── 次の試合を開始（参加登録済みの誰でも）─────────────────────────
  socket.on('start_next_round', () => {
    if (!isJoinedHuman(socket.id) || gs.event.active || gs.phase !== 'round_finished') return;
    setHost(socket.id);   // 次の試合を始めた人が進行役になる

    // スコアリセット前に累積スコアへ加算
    Object.entries(gs.players)
      .filter(([, p]) => !p.isBot && p.joined)
      .forEach(([id, p]) => {
        gs.cumulativeScores[id] = (gs.cumulativeScores[id] || 0) + p.score;
      });

    gs.round++;
    gs.isRevival       = false;
    gs.lastRoundResult = null;

    removeCpuPlayers();

    const roundCardIds = buildPracticeCardIds();
    const roundCards   = KARUTA.filter(k => roundCardIds.includes(k.id));
    gs.remaining      = new Set(roundCardIds);
    gs.cardOrder      = roundCardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;

    Object.values(gs.players).forEach(p => { p.score = 0; p.misses = 0; });

    // 敗退なし：1回戦と同じ人数規模（80人）で毎試合行う
    addCpuPlayersForPractice(PRACTICE_MOCK_TOTAL_TARGET);
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ excludeEliminated: true });
    // （通過人数は練習モードでは使わない。以前の絞り込み設定の名残り）
    gs.survivorCount = (gs.round >= gs.maxRounds)
      ? 3
      : Math.min(PRACTICE_MOCK_SURVIVOR_SCHEDULE[gs.round - 1] ?? eventCutCounts(totalCount).pass, totalCount);

    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
      cardOrder:     gs.cardOrder,
      cards:         roundCards,
      players:       gs.players,
      endsAt:        gs.memorizeEndsAt,
      difficulty:    gs.difficulty,
      round:         gs.round,
      maxRounds:     gs.maxRounds,
      survivorCount: gs.survivorCount,
      isRevival:     false,
      humanCount, cpuCount, totalCount,
    });
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── 敗者復活戦を開始（ホストのみ）———任意ユーザー選択対応
  socket.on('start_revival', ({ selectedIds } = {}) => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished') return;

    const allEliminated = Object.entries(gs.players)
      .filter(([id, p]) => gs.eliminatedPlayers.has(id) && !p.isBot && p.joined)
      .map(([id]) => id);
    if (allEliminated.length === 0) return;

    const participants = (selectedIds && selectedIds.length > 0)
      ? allEliminated.filter(id => selectedIds.includes(id))
      : allEliminated;
    if (participants.length === 0) return;

    // 復活戦トーナメント初期化
    // 通過人数は自動算出（中間ラウンドは6割・最終ラウンドの本戦復帰は約1/3）。
    gs.isRevival            = true;
    gs.revivalRound         = 1;
    gs.revivalMaxRounds     = 3;
    gs.revivalSurvivorCount = Math.max(1, Math.ceil(participants.length * 0.6));
    gs.revivalCount         = eventCutCounts(participants.length).pass;
    gs.revivalEliminated    = new Set();
    gs.lastRoundResult      = null;

    removeCpuPlayers();
    participants.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
    });
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: new Set(participants) });

    const revivalCardIds = buildDifficultyOrderedCardIds();
    const revivalCards   = KARUTA.filter(k => revivalCardIds.includes(k.id));
    gs.remaining      = new Set(revivalCardIds);
    gs.cardOrder      = revivalCardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;

    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
      cardOrder:           gs.cardOrder,
      cards:               revivalCards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      survivorCount:       gs.revivalSurvivorCount,
      isRevival:           true,
      revivalCount:        gs.revivalCount,
      revivalRound:        gs.revivalRound,
      revivalMaxRounds:    gs.revivalMaxRounds,
      revivalSurvivorCount: gs.revivalSurvivorCount,
      humanCount, cpuCount, totalCount,
    });
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── 次の復活戦ラウンドを開始（ホストのみ）─────────────────
  socket.on('start_next_revival_round', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished' || !gs.isRevival) return;

    gs.revivalRound++;
    gs.lastRoundResult = null;

    removeCpuPlayers();

    // アクティブな復活戦参加者のスコアをリセット
    const activeRevivalIds = Object.entries(gs.players)
      .filter(([id, p]) => gs.eliminatedPlayers.has(id) && !gs.revivalEliminated.has(id) && !p.isBot && p.joined)
      .map(([id]) => id);
    activeRevivalIds.forEach(id => { gs.players[id].score = 0; gs.players[id].misses = 0; });
    const { humanCount, cpuCount, totalCount } = computeHeadcount({ participantIds: new Set(activeRevivalIds) });
    // 通過人数は自動算出（このラウンドが最終ラウンドなら本戦復帰人数として使う）
    gs.revivalSurvivorCount = Math.max(1, Math.ceil(activeRevivalIds.length * 0.6));
    gs.revivalCount         = eventCutCounts(activeRevivalIds.length).pass;

    const cardIds = buildDifficultyOrderedCardIds();
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = cardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    io.emit('memorize_start', {
      cardOrder:           gs.cardOrder,
      cards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      survivorCount:       gs.revivalSurvivorCount,
      isRevival:           true,
      revivalCount:        gs.revivalCount,
      revivalRound:        gs.revivalRound,
      revivalMaxRounds:    gs.revivalMaxRounds,
      revivalSurvivorCount: gs.revivalSurvivorCount,
      humanCount, cpuCount, totalCount,
    });
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── グループ戦を開始（ホストのみ、最終試合後またはロビーから）──────────────
  socket.on('start_group_match', ({ tier }) => {
    if (socket.id !== gs.hostId) return;
    if (gs.phase !== 'round_finished' && gs.phase !== 'lobby') return;
    if (!['top', 'middle', 'bottom'].includes(tier)) return;
    if (!gs.humanGroups) return;
    // 中位グループ戦は下位グループ戦完了後のみ
    if (tier === 'middle' && gs.bottomGroupWinners === null) return;
    // 上位グループ戦は下位・中位両方完了後のみ
    if (tier === 'top' && (gs.bottomGroupWinners === null || gs.middleGroupWinners === null)) return;

    gs.isGroupMatch        = true;
    gs.groupTier           = tier;
    gs.groupRound          = 1;
    gs.groupMaxRounds      = 3;
    gs.groupEliminated     = new Set();
    gs.lastRoundResult     = null;

    removeCpuPlayers();

    // グループ内人間プレイヤーのスコアリセット
    let humanIds = gs.humanGroups[tier] || [];

    // 上位グループには昇格した人間プレイヤーを追加
    if (tier === 'top') {
      const promoted = new Set(humanIds);
      if (gs.bottomGroupWinners) gs.bottomGroupWinners.forEach(id => promoted.add(id));
      if (gs.middleGroupWinners) gs.middleGroupWinners.forEach(id => promoted.add(id));
      humanIds = [...promoted];
    }
    humanIds.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
    });

    // ティアCPU IDを設定して追加
    const tierCpuIds = tier === 'top'    ? CPU_TIER_TOP
                     : tier === 'middle' ? CPU_TIER_MIDDLE : CPU_TIER_BOTTOM;
    gs.groupParticipantIds = new Set([...humanIds, ...tierCpuIds]);
    addGroupCpuPlayers();
    const { cpuCount: groupCpuCount } = computeHeadcount({ participantIds: gs.groupParticipantIds });
    gs.groupSurvivorCount = eventCutCounts(gs.groupParticipantIds.size).pass;

    const cardIds = buildDifficultyOrderedCardIds();
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = cardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    const tierLabel = tier === 'top' ? '上位' : tier === 'middle' ? '中位' : '下位';
    const humanCount = humanIds.length;
    io.emit('memorize_start', {
      cardOrder:           gs.cardOrder,
      cards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      isGroupMatch:        true,
      groupTier:           tier,
      groupTierLabel:      tierLabel,
      groupHumanCount:     humanCount,
      humanGroups:         gs.humanGroups,
      groupParticipantIds: [...gs.groupParticipantIds],
      groupRound:          gs.groupRound,
      groupMaxRounds:      gs.groupMaxRounds,
      groupSurvivorCount:  gs.groupSurvivorCount,
      humanCount,
      cpuCount:            groupCpuCount,
      totalCount:          humanCount + groupCpuCount,
    });
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });

  // ── グループ戦次ラウンド開始（ホストのみ）───────────────────
  socket.on('start_next_group_round', () => {
    if (socket.id !== gs.hostId || gs.phase !== 'round_finished' || !gs.isGroupMatch) return;

    gs.groupRound++;
    gs.lastRoundResult = null;

    removeCpuPlayers();

    // アクティブな人間参加者のスコアをリセット
    const tierCpuIds = gs.groupTier === 'top' ? CPU_TIER_TOP
                     : gs.groupTier === 'middle' ? CPU_TIER_MIDDLE : CPU_TIER_BOTTOM;
    const activeHumanIds = [...gs.groupParticipantIds]
      .filter(id => gs.players[id] && !gs.players[id].isBot && !gs.groupEliminated.has(id));
    activeHumanIds.forEach(id => {
      if (gs.players[id]) { gs.players[id].score = 0; gs.players[id].misses = 0; }
    });
    gs.groupParticipantIds = new Set([...activeHumanIds, ...tierCpuIds]);
    addGroupCpuPlayers();
    const { cpuCount: groupCpuCount } = computeHeadcount({ participantIds: gs.groupParticipantIds });
    gs.groupSurvivorCount = eventCutCounts(gs.groupParticipantIds.size).pass;

    const cardIds = buildDifficultyOrderedCardIds();
    const cards   = KARUTA.filter(k => cardIds.includes(k.id));
    gs.remaining      = new Set(cardIds);
    gs.cardOrder      = cardIds;
    gs.currentCard    = null;
    gs.currentDecoy   = null;
    gs.phase          = 'memorizing';
    gs.memorizeEndsAt = Date.now() + MEMO_SECONDS * 1000;

    const tierLabel   = gs.groupTier === 'top' ? '上位' : gs.groupTier === 'middle' ? '中位' : '下位';
    io.emit('memorize_start', {
      cardOrder:           gs.cardOrder,
      cards,
      players:             gs.players,
      endsAt:              gs.memorizeEndsAt,
      difficulty:          gs.difficulty,
      round:               gs.round,
      maxRounds:           gs.maxRounds,
      isGroupMatch:        true,
      groupTier:           gs.groupTier,
      groupTierLabel:      tierLabel,
      groupHumanCount:     activeHumanIds.length,
      humanGroups:         gs.humanGroups,
      groupParticipantIds: [...gs.groupParticipantIds],
      groupRound:          gs.groupRound,
      groupMaxRounds:      gs.groupMaxRounds,
      groupSurvivorCount:  gs.groupSurvivorCount,
      humanCount:          activeHumanIds.length,
      cpuCount:            groupCpuCount,
      totalCount:          activeHumanIds.length + groupCpuCount,
    });
    memorizeTimer = setTimeout(doStartPlaying, MEMO_SECONDS * 1000);
  });



  // ── 大会モードを開始（ホストのみ）─────────────────────────
  // その時点で参加登録済み（joined）の人間プレイヤー全員を対象に第1試合を開始する。
  socket.on('start_event', () => {
    if (!isHostEligible(socket) || !isJoinedHuman(socket.id) || gs.phase !== 'lobby') return;
    setHost(socket.id);   // 大会モードの進行役はサーバーPC。参加者はそれ以外のロビーにいる全員
    const participantIds = Object.entries(gs.players)
      .filter(([id, p]) => id !== gs.hostId && !p.isBot && p.joined)
      .map(([id]) => id);
    if (participantIds.length === 0) return;

    gs.event.active            = true;
    gs.event.mainPool          = new Set(participantIds);
    gs.event.revivalCandidates = new Set();
    gs.event.gamesPlayed       = {};
    gs.event.finalists         = [];
    gs.event.top2              = [];
    gs.event.restThree         = [];
    gs.event.lastResult        = null;
    gs.event.mainRoundIndex    = 0;
    setEventStage(participantIds.length <= EVENT_SEMIS_THRESHOLD ? 'semis' : 'main');

    removeCpuPlayers();
    startEventMatch(participantIds);
  });

  // ── 大会モードの次の試合へ進む（ホストのみ）───────────────
  // which: 'main'（本戦/準決勝プールの続き）または 'revival'（敗者復活戦）。
  // 決勝5人・3位決定戦・決勝戦は自動的にどちらか一方しか選べないため which を無視する。
  socket.on('advance_event', ({ which } = {}) => {
    if (socket.id !== gs.hostId || !gs.event.active || gs.phase !== 'round_finished') return;

    const stage = gs.event.stage;
    if (stage === 'final5')       { startEventMatch(gs.event.finalists); return; }
    if (stage === 'thirdplace')   { startEventMatch(gs.event.restThree); return; }
    if (stage === 'championship') { startEventMatch(gs.event.top2);      return; }
    if (stage === 'done') return;

    if (which === 'revival') {
      if (gs.event.revivalCandidates.size === 0) return;
      const pool = [...gs.event.revivalCandidates];
      gs.event.revivalCandidates = new Set();
      setEventStage('revival');
      startEventMatch(pool);
      return;
    }

    if (gs.event.mainPool.size === 0) return;
    const pool = [...gs.event.mainPool];
    setEventStage(pool.length <= EVENT_SEMIS_THRESHOLD ? 'semis' : 'main');
    startEventMatch(pool);
  });

  // ── Back to lobby ────────────────────────────────────────
  socket.on('go_to_lobby', () => {
    if (['reading', 'decoy', 'announcing'].includes(gs.phase)) return;
    // 対局の途中（試合結果・ロビー以外）で中断できるのは進行役かサーバーPCだけ
    if (!['round_finished', 'lobby'].includes(gs.phase) && socket.id !== gs.hostId && !isHostEligible(socket)) return;
    clearAllTimers();
    removeCpuPlayers();

    gs.event.active            = false;
    gs.event.stage              = null;
    gs.event.mainPool           = new Set();
    gs.event.revivalCandidates  = new Set();
    gs.event.gamesPlayed        = {};
    gs.event.participantIds     = new Set();
    gs.event.finalists          = [];
    gs.event.top2               = [];
    gs.event.restThree          = [];
    gs.event.lastResult         = null;

    gs.round               = 1;
    gs.survivorCount       = 3;
    gs.revivalCount        = 1;
    gs.isRevival           = false;
    gs.revivalRound        = 1;
    gs.revivalMaxRounds    = 3;
    gs.revivalSurvivorCount = 3;
    gs.revivalEliminated   = new Set();
    gs.isGroupMatch        = false;
    gs.groupTier           = null;
    gs.groupParticipantIds = new Set();
    gs.groupRound          = 1;
    gs.groupMaxRounds      = 3;
    gs.groupSurvivorCount  = 3;
    gs.groupEliminated     = new Set();
    gs.eliminatedPlayers   = new Set();
    gs.lastRoundResult     = null;
    Object.values(gs.players).forEach(p => { p.isEliminated = false; });

    gs.phase = 'lobby'; gs.currentCard = null;
    gs.remaining = new Set(ROUND_CARD_IDS[1]); gs.memorizeEndsAt = 0;
    setHost(findServerPcId());   // ロビーに戻ったら進行役は（いれば）サーバーPCに戻す
    io.emit('back_to_lobby', {
      players:             gs.players,
      postTournament:      gs.postTournament,
      humanGroups:         gs.humanGroups,
      bottomGroupWinners:  gs.bottomGroupWinners,
      middleGroupWinners:  gs.middleGroupWinners,
    });
  });

  // ── Disconnect ───────────────────────────────────────────
  socket.on('disconnect', () => {
    const wasHost = socket.id === gs.hostId;
    delete gs.players[socket.id];
    io.emit('player_left', { id: socket.id, players: gs.players });

    if (wasHost) {
      // 進行役が抜けたら、サーバーPCがいればそこへ、対局中ならほかの参加者へ引き継ぐ。
      // ロビーで誰もいなければホスト不在にする（サーバーPCが入れば再びホストになる）。
      gs.hostId = null;
      let next = findServerPcId();
      if (!next && gs.phase !== 'lobby') {
        next = Object.keys(gs.players).find(id => isJoinedHuman(id)) || null;
      }
      gs.hostId = next;
      io.emit('host_changed', { hostId: next });
    }

    gs.eliminatedPlayers.delete(socket.id);
    gs.revivalEliminated.delete(socket.id);
    gs.groupEliminated.delete(socket.id);

    const humanIds = Object.keys(gs.players)
      .filter(id => !gs.players[id].isBot && gs.players[id].joined);
    if (!humanIds.length) {
      clearAllTimers();
      removeCpuPlayers();
      gs.phase = 'lobby'; gs.currentCard = null;
      gs.remaining = new Set(ROUND_CARD_IDS[1]); gs.memorizeEndsAt = 0; gs.hostId = null;
      gs.round = 1; gs.eliminatedPlayers = new Set(); gs.lastRoundResult = null;
      gs.isGroupMatch = false; gs.groupTier = null; gs.humanGroups = null;
      gs.groupParticipantIds = new Set(); gs.cumulativeScores = {};
      gs.postTournament = false; gs.bottomGroupWinners = null; gs.middleGroupWinners = null;
      gs.groupMatchScores = {};
    }
  });
});

// 読み上げ確認ページ（/tts-check.html）用：全札のデータと難易度帯を返す
app.get('/api/karuta', (req, res) => res.json({ karuta: KARUTA, tiers: ROUND_CARD_IDS }));

app.use(express.static(path.join(__dirname, 'public')));

srv.listen(PORT, '0.0.0.0', () => {
  const ips = localIPs();
  console.log('\n====================================');
  console.log('  💻 IT かるた サーバー起動中');
  console.log('====================================');
  console.log(`  このPC : http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  LAN    : http://${ip}:${PORT}`));
  console.log('====================================');
  console.log('  Ctrl+C で停止\n');
});
