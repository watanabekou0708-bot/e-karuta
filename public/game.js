'use strict';

// ── Karuta data（J検（情報活用試験）3級レベル＋Excel関数）─────
// ids 1-15,46-60: 易しい / 16-30,61-75: 普通 / 31-45,76-90: 難しい
// サーバー側 server.js の KARUTA と内容を一致させること。
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
const KMAP = Object.fromEntries(KARUTA.map(k => [k.id, k]));

// 難易度を上げた際に挟まれるダミー読み（盤面のどの札にも対応しない）
const DECOY_IDS = ['decoy1', 'decoy2', 'decoy3', 'decoy4', 'decoy5', 'decoy6', 'decoy7', 'decoy8'];

// ── Text-to-speech（答え合わせ TTS 用）───────────────────
let ttsVoice   = null;
let ttsUnlocked = false;

// 使用する声は Haruka（Windows標準の日本語音声）1本に固定する。
// 「読み上げます」や「そこまで」など発話ごとに違う声が選ばれてしまう
// 不具合の原因は、(1) 優先順位に複数OS由来の声（nanami/keita/kyoko/ichiro）
// が並んでいて端末によって別の声が選ばれていたことと、(2) 発話のたびに
// pickVoice() を呼び直さず、ページ読み込み直後にキャッシュした古い
// ttsVoice（＝音声一覧がまだ揃っていない時点の null）を使い回していた
// ことの2つだった。ここでは対象を1声のみにし、発話の直前に毎回
// pickVoice() を呼び直すことで両方の原因を取り除く。
const TTS_VOICE_PRIORITY = ['haruka'];

function pickVoice() {
  if (!window.speechSynthesis) return null;
  const voices = speechSynthesis.getVoices();
  const jaVoices = voices.filter(v => v.lang === 'ja-JP' || v.lang.startsWith('ja'));
  let picked = null;
  for (const name of TTS_VOICE_PRIORITY) {
    picked = jaVoices.find(v => v.name.toLowerCase().includes(name));
    if (picked) break;
  }
  ttsVoice = picked || null;
  return ttsVoice;
}

(function initTts() {
  if (!window.speechSynthesis) return;
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
  pickVoice();
})();


function unlockTts() {
  if (!window.speechSynthesis || ttsUnlocked) return;
  const primer = new SpeechSynthesisUtterance('');
  primer.volume = 0;
  speechSynthesis.speak(primer);
  setTimeout(() => speechSynthesis.cancel(), 0);
  ttsUnlocked = true;
}

// 上の句・下の句をキューに積んで順番に読み上げ（答え合わせ用）
function speakChain(texts) {
  if (!window.speechSynthesis || !texts.length) return;
  speechSynthesis.cancel();
  setTimeout(() => {
    texts.forEach(text => {
      const utt  = newUtterance(text);
      utt.lang   = 'ja-JP';
      utt.rate   = 0.65;
      utt.pitch  = 1.05;
      pickVoice();
      if (ttsVoice) utt.voice = ttsVoice;
      speechSynthesis.speak(utt);
    });
  }, 50);
}

function stopSpeech() {
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// ── DJ 実況（札取得・順位の実況を各自のイヤホンへ）─────────────
// サーバーから届いたコメントをキューに積み、詠み上げ・正解発表の音声が
// 完全に終わったタイミング（finishAnnouncing/finishTimeUp）でのみ再生する。
// 次の詠み上げ等が始まる瞬間は stopDjSpeech() で即座に打ち切り、絶対に
// 重ならないようにする（多少実況が途中で切れるのは許容する）。
let djQueue       = [];
let djSpeaking    = false;
// DJ実況が話し終わるまで、正解発表（そこまで／上の句／下の句）の開始を
// 待たせるための保留関数。DJ実況を最後まで再生してから次に進むため、
// 途中で打ち切ることはしない。
let pendingAfterDj = null;

function enqueueDjComment(text) {
  if (!text) return;
  djQueue.push(text);
  tryPlayDjQueue();
}

// DJ実況が話し終わっていれば即実行、話している途中なら話し終わるまで待って実行する。
function runAfterDjClear(fn) {
  if (djSpeaking || djQueue.length) {
    pendingAfterDj = fn;
  } else {
    fn();
  }
}

let djGeneration = 0;   // stopDjSpeech() 以前の古い発話の完了通知を無効化する

function stopDjSpeech() {
  djGeneration++;
  djQueue = [];
  djSpeaking = false;
  pendingAfterDj = null;
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// ── 「音声が完全に終わってから」実行する保留キュー ─────────────────
// 正解発表（そこまで／上の句／下の句）やDJ実況の再生中に、次の札の詠み上げや
// 試合結果画面が割り込んで音声を打ち切ってしまわないよう、それらの処理を
// 音声が空くまで待たせる。端末ごとに音声の長さが違うため、ホストの完了通知を
// 待たずに各端末が「自分の音声が終わったか」で判断する。
// 万一 onend が発火せず永久に待ち続けないよう、maxMs 経過で強制実行する。
let idleWaiters = [];   // { fn, type }

function audioIdle() {
  return !isAnnouncing && !djSpeaking && !djQueue.length && !pendingAfterDj;
}

function whenAudioIdle(fn, type, maxMs) {
  if (audioIdle()) { fn(); return; }
  const w = { fn, type };
  idleWaiters.push(w);
  setTimeout(() => {
    const i = idleWaiters.indexOf(w);
    if (i !== -1) { idleWaiters.splice(i, 1); fn(); }
  }, maxMs);
}

function flushIdleWaiters() {
  if (!audioIdle() || !idleWaiters.length) return;
  const list = idleWaiters;
  idleWaiters = [];
  list.forEach(w => w.fn());
}

// 保留中の処理のうち、種類が type のものを破棄する（すでに取られた札の詠み上げ
// を後から始めてしまわないようにするため）。
function dropIdleWaiters(type) {
  idleWaiters = idleWaiters.filter(w => w.type !== type);
}

// TTS の onend が発火しない不具合への保険。単純なタイマーだと、実際の再生が
// 予想より長い場合に「読み上げ終了」と誤判定して次の詠み上げが割り込むため、
// 予想時間を過ぎても speechSynthesis がまだ話している間は待ち続ける。
function armSpeechEndFallback(finish, texts, gen) {
  const estMs = texts.reduce((sum, t) => sum + t.length * 250, 0) + 2000;
  const startedAt = Date.now();
  const check = () => {
    if (gen !== undefined && gen !== audioGeneration) return;   // 別の再生に切り替わった
    const busy = window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending);
    if (!busy || Date.now() - startedAt > estMs * 3) { finish(); return; }
    setTimeout(check, 500);
  };
  setTimeout(check, estMs);
}

function tryPlayDjQueue() {
  if (djSpeaking || !djQueue.length) {
    // キューが空になったタイミングで、DJ実況待ちの正解発表があればそれを、
    // なければ次の読み上げの自動開始待ちを実行する（音声が重ならないようにするため）。
    if (!djSpeaking && !djQueue.length) {
      if (pendingAfterDj) {
        const fn = pendingAfterDj;
        pendingAfterDj = null;
        fn();
      } else {
        flushIdleWaiters();
        maybeAutoReadNext();
      }
    }
    return;
  }
  // 正解発表（そこまで／上の句／下の句）の音声が流れている間は絶対に重ねない。
  // isAnnouncing が false に戻った瞬間（finishAnnouncing/finishTimeUp）に
  // 呼び直されるので、そこで実際に再生される。
  if (isAnnouncing) return;
  if (!window.speechSynthesis) { djQueue = []; return; }
  djSpeaking = true;
  const text = djQueue.shift();
  const utt  = newUtterance(text);
  utt.lang   = 'ja-JP';
  utt.rate   = 1.1;
  utt.pitch  = 1.15;
  pickVoice();
  if (ttsVoice) utt.voice = ttsVoice;
  let doneCalled = false;
  const myDjGen = djGeneration;
  const done = () => {
    if (doneCalled || myDjGen !== djGeneration) return;
    doneCalled = true;
    djSpeaking = false;
    tryPlayDjQueue();
  };
  utt.onend   = done;
  utt.onerror = done;
  speechSynthesis.speak(utt);
  // onend が発火しない既知の不具合に備えたフォールバック
  armSpeechEndFallback(done, [text]);
}

// ── Web Audio API（精密同期再生）────────────────────────────
let audioCtx      = null;
let audioBuffers  = {};   // 数値キー: 上の句MP3 / 'intro': 読み上げますMP3
let curSource     = null;
let curIntro      = null;

// 世代カウンタ（古い onended コールバックを無効化するため）
let audioGeneration = 0;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 30枚の新デッキ用に収録済みのMP3が無いため、音声素材が「一部は収録音声・
// 一部はTTS」で混在しないよう、事前録音音声の読み込みは一切行わず全読み上げを
// 音声合成（speechSynthesis）に統一する。将来 {id}.mp3 等を用意した場合に
// 備え、preloadAudio 自体は残す（中身を空にするだけ）。
async function preloadAudio() {
  console.log('[Audio] 収録音声は使用せず、読み上げは全て音声合成に統一します');
}

// intro → yomi を Web Audio API でハードウェアスケジューリング
// playAt = イントロ開始の絶対時刻（サーバー基準）
// 上の句の読み上げが完全に終わったタイミングで onDone() を呼ぶ
// （ホスト端末はこれをトリガーに yomi_finished をサーバーへ通知し、
//  そこから10秒の制限時間カウントを開始する）。
function scheduleReadCard(cardId, playAt, onDone) {
  audioGeneration++;
  const gen = audioGeneration;

  if (curSource) { try { curSource.stop(); } catch(e) {} curSource = null; }
  if (curIntro)  { try { curIntro.stop();  } catch(e) {} curIntro  = null; }

  const delay = Math.max(0.05, (playAt - hiResNow() - serverOffset) / 1000);
  const finishYomi = () => { if (gen === audioGeneration && onDone) onDone(); };

  // 収録音声は使わず「読み上げます」→ 本文を音声合成で連続して読む。
  setTimeout(() => {
    if (gen !== audioGeneration) return;
    stopSpeech();
    const intro = newUtterance('読み上げます');
    const body  = newUtterance(currentReadingYomiText || $('readingText').textContent);
    pickVoice();
    [intro, body].forEach(u => { u.lang = 'ja-JP'; u.rate = 0.6; u.pitch = 1.05; if (ttsVoice) u.voice = ttsVoice; });
    body.onend = finishYomi;
    speechSynthesis.speak(intro);
    speechSynthesis.speak(body);
  }, delay * 1000);
}

// ダミー読み（盤面に対応する札が無い読み上げ）を Web Audio で精密同期再生。
// デコイ yomi が終わったら onDone() を呼ぶ。
// 「これは盤面にない札でした」は time_up イベント受信時にまとめて流す。
function scheduleDecoyRead(decoyId, playAt, fallbackText, onDone) {
  audioGeneration++;
  const gen = audioGeneration;

  if (curSource) { try { curSource.stop(); } catch(e) {} curSource = null; }
  if (curIntro)  { try { curIntro.stop();  } catch(e) {} curIntro  = null; }

  const delay = Math.max(0.05, (playAt - hiResNow() - serverOffset) / 1000);
  const finishDecoy = () => { if (gen === audioGeneration) onDone(); };

  setTimeout(() => {
    if (gen !== audioGeneration) return;
    stopSpeech();
    const intro = newUtterance('読み上げます');
    const body  = newUtterance(fallbackText || $('readingText').textContent);
    pickVoice();
    [intro, body].forEach(u => { u.lang = 'ja-JP'; u.rate = 0.6; u.pitch = 1.05; if (ttsVoice) u.voice = ttsVoice; });
    body.onend = finishDecoy;
    speechSynthesis.speak(intro);
    speechSynthesis.speak(body);
  }, delay * 1000);
}

// 正解発表（上の句・下の句）を Web Audio で再生する。
// speechSynthesis を使わないことで、Web Audio ⇔ speechSynthesis 間の
// 音声デバイスのハンドオフが発生せず、ホスト機特有の遅延が起こらない。
// 対応する MP3 が無い場合は false を返し、呼び出し側で TTS にフォールバックする。
function scheduleAnnounceAudio(cardId, playAt, gen, onDone, prefixId) {
  const prefixBuf = prefixId ? audioBuffers[prefixId] : null;
  const topBuf    = audioBuffers[`${cardId}-top`];
  const bottomBuf = audioBuffers[`${cardId}-bottom`];
  if (!prefixBuf && !topBuf && !bottomBuf) return false;

  const ctx   = getAudioCtx();
  let delay = Math.max(0.05, ((playAt ?? hiResNow()) - hiResNow() - serverOffset) / 1000);

  if (prefixBuf) {
    const src = ctx.createBufferSource();
    src.buffer = prefixBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    curIntro = src;
    delay += prefixBuf.duration + 0.8; // 「そこまで」の後に間を置く
  }

  if (topBuf) {
    const src = ctx.createBufferSource();
    src.buffer = topBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    if (!prefixBuf) curIntro = src;
  }

  const bottomDelay = delay + (topBuf ? topBuf.duration : 0);
  if (bottomBuf) {
    const src = ctx.createBufferSource();
    src.buffer = bottomBuf;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + bottomDelay);
    src.onended = () => { if (gen === audioGeneration) onDone(); };
    curSource = src;
  } else {
    setTimeout(() => { if (gen === audioGeneration) onDone(); }, bottomDelay * 1000);
  }
  return true;
}

function stopAllAudio() {
  audioGeneration++;   // 古い onended コールバックを無効化
  stopSpeech();
  if (curSource) { try { curSource.stop(); } catch(e) {} curSource = null; }
  if (curIntro)  { try { curIntro.stop();  } catch(e) {} curIntro  = null; }
  // AudioContext を明示的に suspend して音声デバイスを解放する。
  // running のまま放置すると（特にサーバーと同居しているホスト機で）
  // speechSynthesis がデバイスを掴むまでに余分な遅延が生じることがある。
  if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
}


// ── Clock sync（5回計測・中央値でNTP誤差を最小化）────────
// Date.now() は Windows では ~15ms 単位でしか更新されないため、毎回呼ぶと
// 測定ごとに最大15msのジッターが乗ってしまう。起動時に一度だけ Date.now() を
// 基準点に固定し、以降は高分解能の performance.now()（monotonic）からの
// 経過時間を加算してサブミリ秒精度の「現在時刻」を得る。
const clientAnchorDate = Date.now();
const clientAnchorPerf = performance.now();
function hiResNow() {
  return clientAnchorDate + (performance.now() - clientAnchorPerf);
}

function measureOffset() {
  return new Promise(resolve => {
    const t1 = hiResNow();
    socket.emit('time_sync', { t1 });
    socket.once('time_sync', ({ t1: s1, t2 }) => {
      const t3 = hiResNow();
      resolve(t2 - (s1 + t3) / 2);
    });
  });
}

async function syncClock() {
  const offsets = [];
  for (let i = 0; i < 5; i++) {
    offsets.push(await measureOffset());
    if (i < 4) await new Promise(r => setTimeout(r, 100));
  }
  offsets.sort((a, b) => a - b);
  serverOffset = offsets[2]; // 中央値を採用
  console.log(`[Sync] オフセット: ${serverOffset.toFixed(1)} ms（5回中央値）`);
}

// ゲーム中も時計のずれが蓄積しないよう、30秒おきに再同期する
setInterval(syncClock, 30000);

// ── 現在のフェーズ ────────────────────────────────────────
let currentPhase = 'waiting'; // 'waiting' | 'reading' | 'decoy' | 'announcing'

// ── 取得通知（画面表示）──────────────────────────────────────
let takenNotifTimer = null;

function showTakenNotif(name, color) {
  const notif = $('takenNotif');
  if (!notif) return;
  if (takenNotifTimer) { clearTimeout(takenNotifTimer); takenNotifTimer = null; }
  notif.style.borderColor = color;
  notif.querySelector('.tn-dot').style.background = color;
  notif.querySelector('.tn-name').textContent = name;
  notif.querySelector('.tn-label').textContent = ' が獲得！';
  notif.className = 'taken-notif';
  void notif.offsetWidth;
  takenNotifTimer = setTimeout(() => {
    notif.classList.add('tn-fade');
    setTimeout(() => notif.classList.add('hidden'), 500);
  }, 2800);
}

function showTimeUpNotif() {
  const notif = $('takenNotif');
  if (!notif) return;
  if (takenNotifTimer) { clearTimeout(takenNotifTimer); takenNotifTimer = null; }
  notif.style.borderColor = '#ffcf5c';
  notif.querySelector('.tn-dot').style.background = '#ffcf5c';
  notif.querySelector('.tn-name').textContent = '⏰ そこまで';
  notif.querySelector('.tn-label').textContent = '！';
  notif.className = 'taken-notif';
  void notif.offsetWidth;
  takenNotifTimer = setTimeout(() => {
    notif.classList.add('tn-fade');
    setTimeout(() => notif.classList.add('hidden'), 500);
  }, 2800);
}

// ── ハウス得点（ハウス編成済みの場合のみ）───────────────────
function computeHouseScores(players) {
  const scores = { A: 0, B: 0, C: 0, D: 0 };
  if (!currentHouses) return scores;
  Object.entries(currentHouses).forEach(([hid, ids]) => {
    ids.forEach(id => {
      const p = players[id];
      if (p) scores[hid] = (scores[hid] || 0) + (p.score || 0);
    });
  });
  return scores;
}

function renderHouseScoreboard(players) {
  if (!currentHouses) return;
  const scores = computeHouseScores(players);
  const html = Object.entries(scores)
    .map(([hid, s]) => `<div class="house-score-chip"><span>${HOUSE_LABELS[hid] || hid}</span><span class="hs-score">${s}</span></div>`)
    .join('');
  const wrap = $('houseScoreWrap');
  const list = $('houseScoreList');
  if (list) list.innerHTML = html;
  if (wrap) wrap.classList.remove('hidden');
  const specList = $('specHouseScores');
  if (specList) specList.innerHTML = html;
}

// 得点は「取った札の枚数」。同じ枚数なら同順位（1位,1位,3位…）にする。
// sortedEntries は [id, player] を枚数の多い順に並べた配列。各要素の順位の配列を返す。
function competitionRanks(sortedEntries) {
  const ranks = [];
  sortedEntries.forEach(([, p], i) => {
    ranks.push(i > 0 && p.score === sortedEntries[i - 1][1].score ? ranks[i - 1] : i + 1);
  });
  return ranks;
}

// ── TOP10 ランキング（自分の行を強調、2列グリッド表示）─────────
function renderTop3(players) {
  renderHouseScoreboard(players);
  const el = $('top3');
  if (!el) return;
  const medals = ['🥇', '🥈', '🥉'];
  const all = Object.entries(players)
    .filter(([id]) => !(id === liveHostId && isEventMode))
    .sort(([, a], [, b]) => b.score - a.score);
  const ranks  = competitionRanks(all);
  const sorted = all.slice(0, 10);
  el.innerHTML = sorted.map(([id, p], i) => {
    const rank      = ranks[i];
    const rankLabel = rank <= 3 ? medals[rank - 1] : `${rank}`;
    const cpuTag    = p.isBot ? '<span class="t3-cpu">CPU</span>' : '';
    const youTag    = id === myId ? '<span class="t3-you">YOU</span>' : '';
    return `<div class="t3-row${id === myId ? ' me' : ''}${rank <= 3 ? ' top3' : ''}">
      <span class="t3-rank">${rankLabel}</span>
      <span class="t3-name">${escHtml(p.name)}${cpuTag}${youTag}</span>
      <span class="t3-score">${p.score}<small>枚</small></span>
    </div>`;
  }).join('');
}

// ── App state ─────────────────────────────────────────────
const socket    = io();
let myId        = null;
let myIsHost    = false;
let isServerPc  = false;   // サーバーを立ち上げているPC自身のブラウザか（大会モードの操作はここだけ）
let liveHostId  = null;   // ホスト除外フィルタ用
let liveData    = null;
let nameEntered = false;  // doJoin 済みフラグ（init 遅延対策）
let livePlayers = {};
let timerInt    = null;
let seconds     = 0;
let serverOffset = 0;
let gameStarted = false;
let isArranging = false;   // 盤面整理タイム中か（対局画面の上で行う）

// ── トーナメント状態 ──────────────────────────────────────
let currentRound    = 1;
let maxRounds       = 3;
let survivorCount   = 3;
let myIsSpectator   = false;    // 敗退して観戦中か
let liveTotalCards  = 10;       // 今試合の総札数（進捗バー計算用）
let liveEliminatedIds = new Set();

// ── 敗者復活戦状態 ────────────────────────────────────────
let isRevivalMode            = false;
let myIsRevivalSpectator     = false;
let revivalCount             = 1;
let revivalSelectedIds       = new Set();
let revivalRound             = 1;
let revivalMaxRounds         = 3;
let revivalSurvivorCount     = 3;
let revivalEliminatedIds     = new Set();

// ── グループ戦状態 ────────────────────────────────────────
let isGroupMatch         = false;
let groupTier            = null;
let humanGroups          = null;
let myIsGroupSpectator   = false;
let groupParticipantIds  = new Set();
let groupRound           = 1;
let groupMaxRounds       = 3;
let groupSurvivorCount   = 3;
let groupEliminatedIds   = new Set();
let groupHumanCount      = 0;

// ── ポストトーナメント状態 ────────────────────────────────
let postTournament       = false;
let bottomGroupWinners   = null;
let middleGroupWinners   = null;

// ── 大会モード（1/8本番用）状態 ─────────────────────────────
let isEventMode          = false;
let eventStage           = null;
let eventStageLabel      = null;
let eventParticipantIds  = new Set();
let eventGamesPlayed     = {};
let myIsEventSpectator   = false;

// ── 試合開始前の人数内訳（暗記タイムで表示）────────────────
let matchHeadcount = { humanCount: 0, cpuCount: 0, totalCount: 0 };

// 上の句読み上げ中に表示しないが TTS フォールバック用に保持するテキスト
let currentReadingYomiText = '';

// ── Utilities ─────────────────────────────────────────────
const $    = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function startTimer() {
  if (timerInt) clearInterval(timerInt);
  seconds = 0;
  $('timer').textContent = '00:00';
  timerInt = setInterval(() => { seconds++; $('timer').textContent = fmtTime(seconds); }, 1000);
}

function stopTimer() { clearInterval(timerInt); timerInt = null; }

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ── Host UI ───────────────────────────────────────────────
let lobbyMode             = null;   // null | 'practice' | 'event'（ロビーでホストが選ぶモード）
// postTournament による「練習モードへ自動遷移」は、ロビーに入り直すたびに
// 一度だけ適用する。これが無いと、自動遷移後に「← モード選択に戻る」を押しても
// updateLobbyUI() が呼ばれるたびに practice へ引き戻されてしまい、
// 大会モードを選び直せなくなる（＝大会モードのボタンが出てこない不具合）。
let modeAutoApplied       = false;
let selectedDifficulty    = 'normal';
let selectedCpuDifficulty = 'normal';

function selectDifficulty(d) {
  selectedDifficulty = d;
  document.querySelectorAll('[data-diff]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === d);
  });
}

function selectCpuDifficulty(d) {
  selectedCpuDifficulty = d;
  document.querySelectorAll('[data-cpudiff]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cpudiff === d);
  });
}

function startGame() {
  const btn = $('lobbyStartBtn');
  if (btn) btn.disabled = true;
  socket.emit('start_game', {
    difficulty:    selectedDifficulty,
    cpuDifficulty: selectedCpuDifficulty,
  });
}

function startNextRound() {
  socket.emit('start_next_round');
}

// ── 大会モード（1/8本番用）ホスト操作 ───────────────────────
function startEvent() {
  const btn = $('lobbyEventStartBtn');
  if (btn) btn.disabled = true;
  socket.emit('start_event');
}

function advanceEvent(which) {
  ['evMainBtn', 'evRevivalBtn', 'evNextBtn'].forEach(id => { const b = $(id); if (b) b.disabled = true; });
  socket.emit('advance_event', which ? { which } : {});
}

function switchRrMode(mode) {
  const mainSec    = $('rrMainSection');
  const revivalSec = $('rrRevivalSection');
  const tabMain    = $('rrTabMain');
  const tabRevival = $('rrTabRevival');
  if (mode === 'main') {
    mainSec    && mainSec.classList.remove('hidden');
    revivalSec && revivalSec.classList.add('hidden');
    tabMain    && tabMain.classList.add('active');
    tabRevival && tabRevival.classList.remove('active');
  } else {
    mainSec    && mainSec.classList.add('hidden');
    revivalSec && revivalSec.classList.remove('hidden');
    tabMain    && tabMain.classList.remove('active');
    tabRevival && tabRevival.classList.add('active');
  }
}

function toggleRevivalUser(id) {
  if (revivalSelectedIds.has(id)) {
    revivalSelectedIds.delete(id);
  } else {
    revivalSelectedIds.add(id);
  }
  // チェックボックスの状態を更新
  const cb = document.querySelector(`#rrRevivalUsers [data-id="${id}"]`);
  if (cb) cb.checked = revivalSelectedIds.has(id);
}

function toggleAllRevivalUsers() {
  const items = document.querySelectorAll('#rrRevivalUsers [data-id]');
  const allChecked = [...items].every(cb => cb.checked);
  items.forEach(cb => {
    const id = cb.dataset.id;
    if (allChecked) {
      revivalSelectedIds.delete(id);
      cb.checked = false;
    } else {
      revivalSelectedIds.add(id);
      cb.checked = true;
    }
  });
}

function renderRevivalUserList(players) {
  const ul = $('rrRevivalUsers');
  if (!ul) return;
  ul.innerHTML = '';
  revivalSelectedIds.clear();
  const elimHumans = Object.entries(players)
    .filter(([id, p]) => liveEliminatedIds.has(id) && !p.isBot && p.joined && !(id === liveHostId && isEventMode))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'ja'));

  elimHumans.forEach(([id, p]) => {
    revivalSelectedIds.add(id); // デフォルト全選択
    const item = document.createElement('label');
    item.className = 'rr-user-item';
    item.innerHTML = `
      <input type="checkbox" data-id="${id}" checked onchange="toggleRevivalUser('${id}')">
      <span class="rr-user-dot" style="background:${p.color}"></span>
      <span>${escHtml(p.name)}</span>`;
    ul.appendChild(item);
  });
  if (elimHumans.length === 0) {
    ul.innerHTML = '<div style="padding:.4rem;color:var(--dim);font-size:.85rem">敗退者がいません</div>';
  }
}

// ── House assignment（ハウス編成・大会モード）───────────────
const HOUSE_LABELS = { A: '🔴 Aハウス', B: '🔵 Bハウス', C: '🟢 Cハウス', D: '🟡 Dハウス' };
let myHouse        = null;
let currentHouses  = null;

function assignHouses() {
  socket.emit('assign_houses');
}

function renderHouseList(houses, players) {
  const wrap = $('lobbyHouseList');
  if (!wrap || !houses) return;
  wrap.innerHTML = Object.entries(houses).map(([hid, ids]) => {
    const rows = ids.map(id => {
      const p = players[id];
      if (!p) return '';
      return `<div class="house-member">${escHtml(p.name)} <small>（${escHtml(p.grade || '')}年 ${escHtml(p.course || '')}）</small></div>`;
    }).join('');
    return `<div class="house-block"><div class="house-block-title">${HOUSE_LABELS[hid] || hid}（${ids.length}人）</div>${rows}</div>`;
  }).join('');
}

// ── ロビーのモード選択（練習モード／大会モード）─────────────
function chooseLobbyMode(mode) {
  lobbyMode = mode;
  updateLobbyUI();
}

function backToLobbyModeSelect() {
  lobbyMode = null;
  modeAutoApplied = true;   // 明示的に戻った後は自動選択を再適用しない
  updateLobbyUI();
}

function updateLobbyUI() {
  const startBtn      = $('lobbyStartBtn');
  const waiting        = $('lobbyWaiting');
  const modeSelect      = $('lobbyModeSelect');
  const practiceSection = $('lobbyPracticeSection');
  const eventSection    = $('lobbyEventSection');
  const eventBtn = $('lobbyEventStartBtn');
  if (eventBtn) eventBtn.disabled = false;

  // 最終試合後（postTournament）に戻ってきた場合は練習モードへ自動遷移
  // （ロビーに入り直すたびに一度だけ。手動で戻った後は再適用しない）
  if (postTournament && !lobbyMode && !modeAutoApplied) {
    lobbyMode = 'practice';
    modeAutoApplied = true;
  }
  // 大会モードはサーバーPCだけが選べる。それ以外のユーザーは最初から練習モードの設定画面。
  const canEvent = isServerPc;
  if (!canEvent && !lobbyMode) lobbyMode = 'practice';
  if (!canEvent && lobbyMode === 'event') lobbyMode = 'practice';
  const evBtn = $('btnModeEvent');
  if (evBtn) evBtn.style.display = canEvent ? '' : 'none';
  document.querySelectorAll('#lobbyPracticeSection .btn-back').forEach(b => { b.style.display = canEvent ? '' : 'none'; });

  // 練習ゲームは参加登録済みの誰でも難易度を選んで開始できる（先に押した人の設定が全員に適用される）
  if (modeSelect)      modeSelect.style.display      = !lobbyMode ? '' : 'none';
  if (practiceSection) practiceSection.style.display = lobbyMode === 'practice' ? '' : 'none';
  if (eventSection)    eventSection.style.display    = (canEvent && lobbyMode === 'event') ? '' : 'none';

  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = 'ゲームスタート（全3試合）';
  }
  if (waiting) waiting.style.display = 'none';
}

function updateHostNotice() {
  const notice = $('hostNotice');
  if (!notice) return;
  notice.classList.toggle('hidden', !(myIsHost && isEventMode && gameStarted) || isArranging);
  const amSpectating = (myIsSpectator || myIsRevivalSpectator || myIsGroupSpectator || myIsEventSpectator) && !myIsHost && gameStarted;
  const grid = $('grid');
  if (grid) {
    grid.classList.toggle('host-locked', myIsHost && isEventMode && gameStarted && !isArranging);
    grid.classList.toggle('hidden', amSpectating);
  }
  const specPanel = $('specPanel');
  if (specPanel) specPanel.classList.toggle('hidden', !amSpectating || isArranging);
  const debugBtn    = $('debugEndBtn');
  const debugCpuBtn = $('debugCpuBtn');
  // 練習モードは誰でも使える。大会モード中はサーバーPCだけ。
  const canDebug = isServerPc || !isEventMode;
  if (debugBtn)    debugBtn.style.display    = (canDebug && gameStarted) ? '' : 'none';
  if (debugCpuBtn) debugCpuBtn.style.display = (canDebug && gameStarted && !isArranging) ? '' : 'none';
  // ラウンドバッジ・観戦バッジ・盤面整理バッジ
  const rb = $('roundBadge');
  const sb = $('spectatorBadge');
  const ab = $('arrangeBadge');
  const groupTierName = groupTier === 'top' ? '上位' : groupTier === 'middle' ? '中位' : '下位';
  const roundLabel = isEventMode
    ? (eventStageLabel || '大会モード')
    : isGroupMatch
    ? `${groupTierName}グループ戦 R${groupRound}／${groupMaxRounds}${groupHumanCount > 0 ? ` (${groupHumanCount}人)` : ''}（通過${groupSurvivorCount}人）`
    : isRevivalMode
    ? `敗者復活戦 R${revivalRound}／${revivalMaxRounds}（通過${revivalRound >= revivalMaxRounds ? revivalCount : revivalSurvivorCount}人）`
    : `第${currentRound}試合`;
  if (rb) {
    rb.textContent = roundLabel;
    rb.classList.toggle('hidden', !gameStarted || isArranging);
  }
  if (ab) ab.classList.toggle('hidden', !isArranging);
  if (sb) sb.classList.toggle('hidden', !amSpectating);
  const rl = $('roundLabel');
  if (rl) rl.textContent = roundLabel;

  // 盤面整理タイム中はカード以外の情報を出さない（即終了デバッグボタンのみ残す）
  const chips       = $('chips');
  const progWrap     = $('progWrap');
  const readingWrap  = document.querySelector('.reading-wrap');
  const sideL = $('sideLeft');
  const sideR = $('sideRight');
  if (chips)       chips.classList.toggle('hidden', isArranging);
  if (readingWrap) readingWrap.classList.toggle('hidden', isArranging);
  if (sideL) sideL.classList.toggle('hidden', isArranging);
  if (sideR) sideR.classList.toggle('hidden', isArranging);
  // 残り枚数（進捗バー含む）はホストにのみ見せる
  if (progWrap) progWrap.classList.toggle('hidden', isArranging || !(myIsHost && isEventMode));
  const leftCountWrap = $('leftCountWrap');
  if (leftCountWrap) leftCountWrap.classList.toggle('hidden', !(myIsHost && isEventMode));
}

// デバッグ用：CPUに0〜600のランダムポイントを与える（ホストのみ）
function debugGiveCpuPoints() {
  if (!(isServerPc || !isEventMode) || !gameStarted) return;
  socket.emit('debug_cpu_points');
}

// canReadNext: サーバーが「読み上げ可能（waiting フェーズ）」と通知済みか
// isAnnouncing: 正解の上の句・下の句を TTS で読み上げている最中か
// → 両方揃った瞬間、ホスト端末が自動で次の札の読み上げをサーバーへ要求する
// （手動の「読み上げ」ボタンは、万一の取りこぼし時の保険として残す）。
let canReadNext    = false;
let isAnnouncing   = false;
let autoReadPending = false;

function updateReadBtnAvailability() {
  const btn = $('readBtn');
  if (btn) {
    // 練習モードは自動で次の札へ進むため、手動の読み上げボタンは表示しない
    const visible = myIsHost && canReadNext && isEventMode;
    btn.classList.toggle('hidden', !visible);
    btn.disabled = isAnnouncing;
    btn.title = isAnnouncing ? '正解の読み上げ中はお待ちください' : '次の上の句を読み上げる';
  }
  maybeAutoReadNext();
}

// 読み上げ可能になり、正解発表の音声も、DJ実況もすべて終わっていれば、
// ホストの操作を待たずに自動で次の札を読み上げる。「読み上げます」と
// DJ実況の声が重ならないよう、DJがまだキューに残っている／再生中の間は
// 自動読み上げを待たせる（DJ再生完了時に tryPlayDjQueue() から呼び直される）。
// read_next は waiting フェーズでのみ有効なため、二重に届いてもサーバー側で
// 無視される（安全策として autoReadPending でも連打を防ぐ）。
function maybeAutoReadNext() {
  if (!myIsHost || !canReadNext || isAnnouncing || autoReadPending) return;
  if (djSpeaking || djQueue.length) return;
  autoReadPending = true;
  socket.emit('read_next');
}

function showReadBtn() {
  canReadNext = true;
  autoReadPending = false;
  currentPhase = 'waiting';
  if (myId !== null) myIsHost = (liveHostId === myId);
  updateReadBtnAvailability();
}

function hideReadBtn() {
  canReadNext = false;
  autoReadPending = false;
  updateReadBtnAvailability();
}

function readNext() {
  if (!myIsHost || isAnnouncing) return;
  if (djSpeaking || djQueue.length) return;   // DJ実況が終わるまで次の読み上げを待つ
  socket.emit('read_next');
}

// ── 学年・コース（ハウス編成用）───────────────────────────
// 医療ビジネス科はかるた大会の対象外のため選択肢に含めない
const COURSE_OPTIONS = {
  '1': ['ITエキスパート科', 'IT・ビジネス科'],
  '2': ['ITスペシャリストコース', '画像クリエイトコース', 'ITエンジニアコース', 'ビジュアルデザインコース', 'ビジネスITコース'],
  '3': ['ITスペシャリストコース', '画像クリエイトコース'],
};

function updateCourseOptions() {
  const gradeSel  = $('gradeSelect');
  const courseSel = $('courseSelect');
  if (!gradeSel || !courseSel) return;
  const opts = COURSE_OPTIONS[gradeSel.value] || [];
  courseSel.innerHTML = opts.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
}
updateCourseOptions();

// ── Name entry ────────────────────────────────────────────
// 展示用リンク（アドレスの最後に ?practice を付けたもの）では、名前だけ入力する。
// 学年・コースは大会モードのハウス編成にだけ使うため、練習用リンクでは聞かない。
const PRACTICE_LINK = new URLSearchParams(location.search).has('practice');
(function applyPracticeLink() {
  if (!PRACTICE_LINK) return;
  const row = document.querySelector('.grade-course-row');
  if (row) row.style.display = 'none';
})();

function doJoin() {
  const name = $('nameInput').value.trim();
  if (!name) { $('nameInput').focus(); return; }
  const gradeSel  = $('gradeSelect');
  const courseSel = $('courseSelect');
  const grade  = (!PRACTICE_LINK && gradeSel)  ? gradeSel.value  : null;
  const course = (!PRACTICE_LINK && courseSel) ? courseSel.value : null;
  unlockTts();
  getAudioCtx();
  socket.emit('set_name', { name, grade, course });
  hide('oName');
  nameEntered = true;
  if (liveData) applyInit(liveData);
}

document.getElementById('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doJoin();
});

// ── Apply init state ──────────────────────────────────────
function applyInit(d) {
  myIsHost = (d.hostId === myId);

  // トーナメント状態を同期
  if (d.round)              currentRound  = d.round;
  if (d.maxRounds)          maxRounds     = d.maxRounds;
  if (d.survivorCount)      survivorCount = d.survivorCount;
  if (d.revivalCount)       revivalCount  = d.revivalCount;
  if (d.totalCards)         liveTotalCards = d.totalCards;
  if (d.isRevival !== undefined) isRevivalMode = d.isRevival;
  if (d.isGroupMatch !== undefined) isGroupMatch = d.isGroupMatch;
  if (d.groupTier)          groupTier    = d.groupTier;
  if (d.humanGroups)        humanGroups  = d.humanGroups;
  if (d.groupParticipantIds) groupParticipantIds = new Set(d.groupParticipantIds);
  if (d.postTournament !== undefined) postTournament = d.postTournament;
  if (d.bottomGroupWinners !== undefined) bottomGroupWinners = d.bottomGroupWinners;
  if (d.middleGroupWinners !== undefined) middleGroupWinners = d.middleGroupWinners;
  if (d.eliminatedPlayers) {
    liveEliminatedIds = new Set(d.eliminatedPlayers);
    // 練習モードでは敗退しても観戦モードにはしない（大会モードのみ観戦扱い）
    myIsSpectator = liveEliminatedIds.has(myId) && d.isEvent;
  }
  if (d.revivalRound !== undefined)        revivalRound         = d.revivalRound;
  if (d.revivalMaxRounds !== undefined)    revivalMaxRounds     = d.revivalMaxRounds;
  if (d.revivalSurvivorCount !== undefined) revivalSurvivorCount = d.revivalSurvivorCount;
  if (d.revivalEliminated)                 revivalEliminatedIds = new Set(d.revivalEliminated);
  if (d.groupRound !== undefined)          groupRound           = d.groupRound;
  if (d.groupMaxRounds !== undefined)      groupMaxRounds       = d.groupMaxRounds;
  if (d.groupSurvivorCount !== undefined)  groupSurvivorCount   = d.groupSurvivorCount;
  if (d.groupEliminated)                   groupEliminatedIds   = new Set(d.groupEliminated);
  if (d.houses !== undefined)              currentHouses        = d.houses;
  if (d.isEvent !== undefined)             isEventMode          = d.isEvent;
  if (d.eventStage !== undefined)          eventStage           = d.eventStage;
  if (d.eventStageLabel !== undefined)     eventStageLabel      = d.eventStageLabel;
  if (d.eventParticipantIds)               eventParticipantIds  = new Set(d.eventParticipantIds);
  if (d.eventGamesPlayed)                  eventGamesPlayed     = d.eventGamesPlayed;

  // 復活戦中なら本戦勝者は観戦扱い（復活戦で脱落済みも観戦）。練習モードでは観戦にしない。
  myIsRevivalSpectator = d.isRevival && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost && d.isEvent;
  // グループ戦中ならグループ外または脱落済みは観戦。練習モードでは観戦にしない。
  myIsGroupSpectator   = d.isGroupMatch && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId)) && d.isEvent;
  // 大会モード中は現在のステージの参加者以外は観戦
  myIsEventSpectator   = isEventMode && !myIsHost && !eventParticipantIds.has(myId);

  updateChips(d.players);

  if (d.phase === 'lobby') {
    openLobby(d.players);
  } else if (d.phase === 'memorizing') {
    openArrangeScreen(d.cardOrder, d.cards, d.endsAt, d.players, d.round);
  } else if (['waiting', 'reading', 'decoy', 'announcing'].includes(d.phase)) {
    gameStarted = true;
    isArranging = false;
    stopArrangeCountdown();
    hide('oLobby'); hide('oGameOver'); hide('oRoundResult');
    renderGrid(d.cardOrder, new Set(d.remaining), 'play');
    renderTop3(d.players);
    $('leftCount').textContent = d.remaining.length;
    $('progFill').style.width = ((liveTotalCards - d.remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
    isAnnouncing = false;
    if (d.phase === 'waiting') {
      $('readingText').textContent = '— 準備中 —';
      showReadBtn();
    } else {
      currentPhase = (d.phase === 'reading' || d.phase === 'decoy') ? d.phase : 'announcing';
      if (d.phase === 'reading' || d.phase === 'decoy') {
        $('readingText').textContent = '📢 読み上げ中...';
      } else {
        $('readingText').textContent = d.currentCard ? d.currentCard.yomi : '—';
      }
      hideReadBtn();
    }
    startTimer();
    updateHostNotice();
  } else if (d.phase === 'round_finished' && d.lastRoundResult) {
    const r = d.lastRoundResult;
    if (r.humanGroups) humanGroups = r.humanGroups;
    showRoundResult(r.round, r.players, r.survivorIds, r.eliminatedIds, r.survivorCount, r.isFinal, r.isRevival, r.isGroupMatch, r.groupTier, r.isRevivalIntermediate, r.revivalRound, r.revivalMaxRounds, r.isGroupMatchIntermediate, r.groupRound, r.groupMaxRounds);
  } else if (d.phase === 'finished') {
    showGameOver(d.players);
  }
}

// ── Lobby ─────────────────────────────────────────────────
function openLobby(players) {
  // 式典が進行中の場合は途中でキャンセルする
  if (_ceremonyTimer) { clearTimeout(_ceremonyTimer); _ceremonyTimer = null; }
  _ceremonyCallback = null;

  stopAllAudio();
  gameStarted          = false;
  isAnnouncing         = false;
  canReadNext          = false;
  currentPhase         = 'waiting';
  currentRound         = 1;
  myIsSpectator        = false;
  myIsRevivalSpectator = false;
  isRevivalMode        = false;
  revivalSelectedIds   = new Set();
  revivalRound         = 1;
  revivalMaxRounds     = 3;
  revivalSurvivorCount = 3;
  revivalEliminatedIds = new Set();
  isGroupMatch         = false;
  groupTier            = null;
  // humanGroups / postTournament / bottomGroupWinners / middleGroupWinners は
  // back_to_lobby / applyInit で設定されるため openLobby ではリセットしない
  myIsGroupSpectator   = false;
  groupParticipantIds  = new Set();
  groupRound           = 1;
  groupMaxRounds       = 3;
  groupSurvivorCount   = 3;
  groupEliminatedIds   = new Set();
  groupHumanCount      = 0;
  liveEliminatedIds    = new Set();
  liveTotalCards       = 10;
  isEventMode          = false;
  eventStage           = null;
  eventParticipantIds  = new Set();
  myIsEventSpectator   = false;
  lobbyMode            = null;
  modeAutoApplied      = false;
  $('lobbyUrl').textContent = window.location.href;
  renderLobbyList(players);
  hide('oName'); hide('oGameOver'); hide('oRoundResult'); hide('oCeremony'); hide('oEventResult');
  show('oLobby');
  updateLobbyUI();
  updateHostNotice();
}

function renderLobbyList(players) {
  const ul = $('lobbyList');
  ul.innerHTML = '';
  Object.entries(players)
    .filter(([, p]) => !p.isBot && p.joined)   // ロビーには CPU と未参加者を表示しない
    .forEach(([id, p]) => {
      const row = document.createElement('div');
      row.className = 'lobby-row';
      const isHost = id === liveHostId;
      row.innerHTML = `
        <span class="lobby-dot" style="background:${p.color}"></span>
        <span class="lobby-name">${escHtml(p.name)}</span>
        ${id === myId ? '<span class="lobby-you">あなた</span>' : ''}
        ${isHost      ? '<span class="lobby-host">👑 ホスト</span>' : ''}`;
      ul.appendChild(row);
    });
}

function requestLobby() { socket.emit('go_to_lobby'); }

function leaveLobby() {
  if (!confirm('退室しますか？')) return;
  socket.disconnect();
  location.reload();
}

// ── 盤面整理タイム（対局画面そのものの上で行う）─────────────
// 別画面には遷移せず、対局と同じ #grid の上でカードを散らして表示する。
// 上半分（相手側・固定）は自分から見て逆さま、下半分（自分側）だけ
// ドラッグで自由に動かせる、実際の競技かるたのレイアウトを再現する。
// 決めた位置・向き（cardLayout）が、そのまま本番の対局画面に引き継がれる。
let arrangeInterval = null;
let cardLayout = {};   // id → { xPct, yPct, rot, zone: 'top'|'bottom' }（試合ごとにリセット）

// 上半分・下半分それぞれの帯の中で、間隔・位置・向きがバラバラになるよう配置する。
// 枚数が多いと1行に並べただけでは重なってしまうため、列×行のグリッドに
// ざっくり割り付けたうえでジッターを加えて「きれいに整列しすぎない」見た目にする。
function generateCardLayout(cardOrder) {
  cardLayout = {};
  const half   = Math.ceil(cardOrder.length / 2);
  const topIds = cardOrder.slice(0, half);
  const botIds = cardOrder.slice(half);
  const place = (ids, zone, yMin, yMax) => {
    const n = ids.length || 1;
    const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt(n * 2))));
    const rows = Math.ceil(n / cols);
    const colW = 100 / cols;
    const rowH = (yMax - yMin) / rows;
    ids.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = (Math.random() - 0.5) * colW * 0.3;
      const jitterY = (Math.random() - 0.5) * rowH * 0.3;
      const xPct = Math.min(97, Math.max(3, colW * col + colW / 2 + jitterX));
      const yPct = Math.min(yMax - 1, Math.max(yMin + 1, yMin + rowH * row + rowH / 2 + jitterY));
      // 上半分（相手側）は自分から見て逆さま、下半分は本物のかるたのように全方向バラバラ
      const rot = zone === 'top'
        ? 180 + Math.round(Math.random() * 24 - 12)
        : Math.round(Math.random() * 360);
      cardLayout[id] = { xPct, yPct, rot, zone };
    });
  };
  place(topIds, 'top', 4, 47);
  place(botIds, 'bottom', 53, 96);
}

// 現在の cardOrder に対応する配置が無ければ新規生成する（未整理での参加・ホストなど）
function ensureCardLayout(cardOrder) {
  const ok = cardOrder.length > 0 && cardOrder.every(id => cardLayout[id]);
  if (!ok) generateCardLayout(cardOrder);
}

function openArrangeScreen(cardOrder, cards, endsAt, players, round) {
  setGrabLocked(false);
  if (round) currentRound = round;
  gameStarted  = true;
  isArranging  = true;
  hide('oLobby'); hide('oName'); hide('oGameOver'); hide('oRoundResult'); hide('oEventResult');
  updateChips(players);
  const ids = cardOrder && cardOrder.length ? cardOrder : cards.map(k => k.id);
  generateCardLayout(ids);
  renderGrid(ids, null, 'arrange');
  startArrangeCountdown(endsAt);
  updateHostNotice();
}

function startArrangeCountdown(endsAt) {
  if (arrangeInterval) clearInterval(arrangeInterval);
  const tick = () => {
    const secs = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const el = $('arrangeTimer');
    if (el) el.textContent = fmtTime(secs);
  };
  tick();
  arrangeInterval = setInterval(tick, 500);
}

function stopArrangeCountdown() {
  if (arrangeInterval) { clearInterval(arrangeInterval); arrangeInterval = null; }
}

function skipMemorize() { socket.emit('skip_memorize'); }

// ヘッダーの「即終了（デバッグ）」は、盤面整理タイム中はスキップ、
// 対局中は即試合終了として働く単一のデバッグボタン。
function debugSmartSkip() {
  if (!(isServerPc || !isEventMode)) return;
  if (isArranging) { skipMemorize(); return; }
  if (!gameStarted) return;
  socket.emit('debug_end_game');
}

// 下半分のカードをマウスドラッグで自由に動かせるようにする。
// 離した瞬間、正面向き（0度）に整える。
function attachFreeDrag(el, id) {
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const gridEl = $('grid');
    const rect = gridEl.getBoundingClientRect();
    el.classList.add('dragging');
    let moved = false;
    const onMove = mv => {
      moved = true;
      let xPct = ((mv.clientX - rect.left) / rect.width) * 100;
      let yPct = ((mv.clientY - rect.top) / rect.height) * 100;
      xPct = Math.min(96, Math.max(4, xPct));
      yPct = Math.min(97, Math.max(53, yPct));   // 下半分の帯にクランプ
      cardLayout[id].xPct = xPct;
      cardLayout[id].yPct = yPct;
      el.style.left = `calc(${xPct}% - 58px)`;
      el.style.top  = `calc(${yPct}% - 33px)`;
    };
    const onUp = () => {
      if (moved) { cardLayout[id].rot = 0; el.style.transform = 'rotate(0deg)'; }
      el.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Round Result Overlay ─────────────────────────────────
function showRoundResult(round, players, survivorIds, eliminatedIds, sc, isFinal, isRevival, isGroupMatchResult, currentGroupTier, isRevivalIntermediate, rRound, rMax, isGroupMatchIntermediate, gRound, gMax) {
  stopTimer(); stopAllAudio(); hideReadBtn();
  gameStarted = false;

  if (sc !== undefined && !isRevival) survivorCount = sc;

  // ドット（試合進行インジケーター）
  const dots = $('rrDots');
  if (dots) {
    dots.innerHTML = '';
    if (isGroupMatchIntermediate) {
      // グループ戦ラウンド進行ドット
      const totalG = gMax || groupMaxRounds;
      for (let i = 1; i <= totalG; i++) {
        const d = document.createElement('div');
        d.className = 'rr-dot' + (i < (gRound || groupRound) ? ' done' : i === (gRound || groupRound) ? ' active' : '');
        dots.appendChild(d);
      }
    } else if (isRevivalIntermediate) {
      // 復活戦ラウンド進行ドット
      const totalR = rMax || revivalMaxRounds;
      for (let i = 1; i <= totalR; i++) {
        const d = document.createElement('div');
        d.className = 'rr-dot' + (i < (rRound || revivalRound) ? ' done' : i === (rRound || revivalRound) ? ' active' : '');
        dots.appendChild(d);
      }
    } else if (!isRevival) {
      for (let i = 1; i <= maxRounds; i++) {
        const d = document.createElement('div');
        d.className = 'rr-dot' + (isFinal || i < round ? ' done' : i === round ? ' active' : '');
        dots.appendChild(d);
      }
    }
  }

  const title = $('rrTitle');
  if (title) {
    const tierLbl = currentGroupTier === 'top' ? '上位' : currentGroupTier === 'middle' ? '中位' : '下位';
    if (isGroupMatchIntermediate)    title.textContent = `${tierLbl}グループ 第${gRound || groupRound}ラウンド 終了！`;
    else if (isGroupMatchResult)     title.textContent = `${tierLbl}グループ戦 終了！`;
    else if (isRevivalIntermediate)  title.textContent = `復活戦 第${rRound}ラウンド 終了！`;
    else if (isRevival)              title.textContent = '敗者復活戦 終了！';
    else if (isFinal)                title.textContent = '最終試合終了！';
    else                             title.textContent = `第${round}試合 終了！`;
  }

  // 順位表：全参加者（survivorIds ∪ eliminatedIds）
  const promotedSet = new Set([
    ...(bottomGroupWinners || []),
    ...(middleGroupWinners || []),
  ]);
  const table = $('rrTable');
  if (table) {
    table.innerHTML = '';
    const rankEmoji = ['🥇', '🥈', '🥉'];
    const participantIds = new Set([...survivorIds, ...eliminatedIds]);
    const sorted = Object.entries(players)
      .filter(([id, p]) => !(id === liveHostId && isEventMode) && participantIds.has(id) && (p.isBot || p.joined))
      .sort(([, a], [, b]) => b.score - a.score);

    const rrRanks = competitionRanks(sorted);
    sorted.forEach(([id, p], i) => {
      const isSurv = survivorIds.includes(id);
      const isElim = eliminatedIds.includes(id);
      const rank = rrRanks[i];   // 同じ枚数は同順位
      const row = document.createElement('div');
      const rankCls = rank === 1 ? ' rank-1' : rank === 2 ? ' rank-2' : rank === 3 ? ' rank-3' : '';
      row.className = 'rr-row'
        + rankCls
        + (isSurv && !isGroupMatchResult && p.isBot ? ' survivor' : '')   // 人間は進出の強調表示をしない
        + (isElim ? ' eliminated' : '')
        + (id === myId ? ' me' : '');
      const rankLabel = rankEmoji[rank - 1] || `${rank}位`;
      const cpuBadge  = p.isBot ? ' <small class="rr-cpu">CPU</small>' : '';
      const youBadge  = id === myId ? ' <small>(あなた)</small>' : '';
      let badgeHtml = '';
      if (isGroupMatchIntermediate) {
        badgeHtml = isSurv
          ? '<span class="rr-badge adv">→ 次ラウンドへ</span>'
          : '<span class="rr-badge elim">脱落</span>';
      } else if (isRevivalIntermediate) {
        badgeHtml = isSurv
          ? '<span class="rr-badge adv">→ 次ラウンドへ</span>'
          : '<span class="rr-badge elim">脱落</span>';
      } else if (isRevival) {
        badgeHtml = isSurv
          ? '<span class="rr-badge adv">本戦復帰！</span>'
          : '<span class="rr-badge elim">惜しくも...</span>';
      } else if (!isFinal) {
        // 練習モード：CPUのみ「進出」を表示。人間プレイヤーは順位と点数だけで、
        // 進出・敗退の表示はしない。
        if (p.isBot && isSurv) badgeHtml = '<span class="rr-badge adv">→ 進出</span>';
      }
      row.innerHTML = `
        <span class="rr-rank">${rankLabel}</span>
        <span class="rr-name">${escHtml(p.name)}${cpuBadge}${youBadge}</span>
        <span class="rr-score">${p.score}枚</span>
        ${badgeHtml}`;
      table.appendChild(row);
    });
  }

  // 自分のステータス表示
  const myStatus = $('rrMyStatus');
  if (myStatus) {
    if (isFinal) {
      myStatus.textContent = 'お疲れ様でした！';
      myStatus.className = 'rr-my-status';
    } else if (isGroupMatchIntermediate) {
      if (survivorIds.includes(myId)) {
        myStatus.textContent = `✅ 次のラウンドへ進出！（第${(gRound || groupRound) + 1}ラウンド）`;
        myStatus.className = 'rr-my-status adv';
      } else if (eliminatedIds.includes(myId)) {
        myStatus.textContent = '😢 グループ戦から脱落しました';
        myStatus.className = 'rr-my-status elim';
      } else {
        myStatus.textContent = '👀 観戦中';
        myStatus.className = 'rr-my-status';
      }
    } else if (isRevivalIntermediate) {
      if (survivorIds.includes(myId)) {
        myStatus.textContent = `✅ 次のラウンドへ進出！（第${(rRound || revivalRound) + 1}ラウンド）`;
        myStatus.className = 'rr-my-status adv';
      } else if (eliminatedIds.includes(myId)) {
        myStatus.textContent = '😢 復活戦から脱落しました';
        myStatus.className = 'rr-my-status elim';
      } else {
        myStatus.textContent = '👀 観戦中';
        myStatus.className = 'rr-my-status';
      }
    } else if (isRevival) {
      if (survivorIds.includes(myId)) {
        myStatus.textContent = '✅ 本戦に復帰しました！';
        myStatus.className = 'rr-my-status adv';
      } else if (eliminatedIds.includes(myId)) {
        myStatus.textContent = '😢 惜しくも本戦復帰はなりませんでした';
        myStatus.className = 'rr-my-status elim';
      } else if (myIsRevivalSpectator) {
        myStatus.textContent = '👀 本戦勝者として観戦しました';
        myStatus.className = 'rr-my-status';
      } else {
        myStatus.textContent = '';
        myStatus.className = 'rr-my-status';
      }
    } else if (survivorIds.includes(myId) || eliminatedIds.includes(myId)) {
      // 練習モード：進出・敗退の表示はしない（順位と点数は上の表に出ている）
      myStatus.textContent = '';
      myStatus.className = 'rr-my-status';
    } else {
      myStatus.textContent = myIsSpectator ? '👀 観戦中' : '';
      myStatus.className = 'rr-my-status';
    }
  }

  // ── コントロール表示制御 ──────────────────────────────────
  const modeTabs      = $('rrModeTabs');
  const mainSec       = $('rrMainSection');
  const revivalSec    = $('rrRevivalSection');
  const guestWait     = $('rrGuestWait');
  const lobbyBtn      = $('rrLobbyBtn');
  const nextLabel     = $('rrNextRoundLabel');

  const revivalInterSec  = $('rrRevivalInterSection');
  const rrRevRoundLbl    = $('rrRevivalRoundLabel');
  const groupInterSec    = $('rrGroupInterSection');
  const rrGroupRoundLbl  = $('rrGroupRoundLabel');

  // 全セクションを初期化（hidden）
  [modeTabs, mainSec, revivalSec, revivalInterSec, groupInterSec].forEach(el => el && el.classList.add('hidden'));
  if (lobbyBtn) lobbyBtn.classList.add('hidden');
  if (guestWait) guestWait.classList.add('hidden');

  const tierLblForCtrl = currentGroupTier === 'top' ? '上位' : currentGroupTier === 'middle' ? '中位' : '下位';
  if (isGroupMatchIntermediate) {
    // グループ戦中間ラウンド後（通過人数は自動決定・次ラウンド開始後に表示）
    const nextR = (gRound || groupRound) + 1;
    if (rrGroupRoundLbl) rrGroupRoundLbl.textContent = `${tierLblForCtrl}グループ 第${gRound || groupRound}ラウンド終了 → 第${nextR}ラウンドへ`;
    if (myIsHost) {
      if (groupInterSec) groupInterSec.classList.remove('hidden');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else if (isRevivalIntermediate) {
    // 復活戦中間ラウンド後（通過人数は自動決定・次ラウンド開始後に表示）
    if (rrRevRoundLbl) rrRevRoundLbl.textContent = `復活戦 第${rRound || revivalRound}ラウンド終了 → 第${(rRound || revivalRound) + 1}ラウンドへ`;
    if (myIsHost) {
      if (revivalInterSec) revivalInterSec.classList.remove('hidden');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else if (isFinal || isGroupMatchResult) {
    // 最終試合後 / グループ戦後：全員にロビーボタンのみ
    if (lobbyBtn) lobbyBtn.classList.remove('hidden');

    // 上位グループ戦終了時は式典を先行表示し、完了後にランキング画面を表示
    if (isGroupMatchResult && currentGroupTier === 'top') {
      const sorted = Object.entries(players)
        .filter(([id, p]) => !(id === liveHostId && isEventMode) && survivorIds.includes(id) && !p.isBot && p.joined)
        .sort(([, a], [, b]) => b.score - a.score);
      startCeremony(sorted, players, () => {
        hide('oCeremony');
        show('oRoundResult');  // ランキング画面を表示してから手動でロビーへ
      });
      return;
    }
  } else if (isRevival) {
    // 復活戦後：次試合モードのみ（ホスト）。通過人数は自動決定・次試合開始後に表示。
    if (myIsHost) {
      if (mainSec) mainSec.classList.remove('hidden');
      if (nextLabel) nextLabel.textContent = round + 1;
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  } else {
    // 通常試合後：練習モードは参加者の誰でも次の試合を開始できる（大会モードは別画面）。
    if (myIsHost || !isEventMode) {
      const hasElim = Object.entries(players)
        .some(([id, p]) => liveEliminatedIds.has(id) && !p.isBot && p.joined && !(id === liveHostId && isEventMode));

      if (hasElim && modeTabs) modeTabs.classList.remove('hidden');
      if (mainSec) mainSec.classList.remove('hidden');
      if (nextLabel) nextLabel.textContent = round + 1;

      if (hasElim) renderRevivalUserList(players);

      const tabMain = $('rrTabMain');
      const tabRevival = $('rrTabRevival');
      if (tabMain) tabMain.classList.add('active');
      if (tabRevival) tabRevival.classList.remove('active');
    } else {
      if (guestWait) guestWait.classList.remove('hidden');
    }
  }

  hide('oLobby'); hide('oGameOver');
  show('oRoundResult');
}

// ── 式典（上位グループ戦結果発表）────────────────────────
let _ceremonyQueue    = [];
let _ceremonyIndex    = 0;
let _ceremonyTimer    = null;
let _ceremonyPlayers  = {};
let _ceremonyCallback = null;

function startCeremony(sortedHumans, players, onComplete) {
  _ceremonyPlayers  = players;
  _ceremonyCallback = onComplete;
  // sortedHumans は [id, player] の配列（1位〜N位順）
  // 発表は 3位→2位→1位 の順なので reverse
  _ceremonyQueue = sortedHumans.slice(0, 3).reverse();
  _ceremonyIndex = 0;

  hide('oLobby'); hide('oGameOver'); hide('oRoundResult');
  show('oCeremony');
  _showCeremonyStep();
}

function _showCeremonyStep() {
  if (_ceremonyIndex >= _ceremonyQueue.length) {
    _endCeremony();
    return;
  }
  const [id, p] = _ceremonyQueue[_ceremonyIndex];
  // displayRank: queue[0]は3位(total=3)、queue[1]は2位、queue[2]は1位
  const totalShown = _ceremonyQueue.length;
  const displayRank = totalShown - _ceremonyIndex;

  const rankLabel = { 1: '🥇 優勝！', 2: '🥈 第2位', 3: '🥉 第3位' }[displayRank] || `第${displayRank}位`;
  const rankCls   = { 1: 'rank-1', 2: 'rank-2', 3: 'rank-3' }[displayRank] || '';

  const step    = $('ceremonyStep');
  const place   = $('ceremonyPlace');
  const avatar  = $('ceremonyAvatar');
  const name    = $('ceremonyName');
  const score   = $('ceremonyScore');
  const promo   = $('ceremonyPromoted');
  const wrap    = $('ceremonyWrap');

  if (step)   step.textContent  = `${totalShown - _ceremonyIndex} / ${totalShown}`;
  if (place)  place.textContent = rankLabel;
  if (avatar) { avatar.style.background = p.color; avatar.textContent = p.name.charAt(0); }
  if (name)   { name.textContent = p.name; name.style.color = p.color; }
  if (score)  score.textContent = `${p.score} 枚`;

  const promoted = new Set([...(bottomGroupWinners || []), ...(middleGroupWinners || [])]);
  if (promo) promo.textContent = promoted.has(id) ? '⬆ 昇格参戦プレイヤー' : '';

  if (wrap) {
    wrap.className = 'ceremony-wrap ' + rankCls;
    void wrap.offsetWidth;
    wrap.classList.add('reveal');
  }

  _ceremonyIndex++;
  const delay = displayRank === 1 ? 4000 : 2800;
  _ceremonyTimer = setTimeout(_showCeremonyStep, delay);
}

function _endCeremony() {
  if (_ceremonyTimer) { clearTimeout(_ceremonyTimer); _ceremonyTimer = null; }
  if (_ceremonyCallback) { _ceremonyCallback(); _ceremonyCallback = null; }
}

function skipCeremony() { _endCeremony(); }

// ── Card grid（盤面整理タイム／対局中で共用）───────────────
// mode: 'arrange'（下半分だけドラッグ可） | 'play'（クリックで札を取る）
// cardLayout に保存された位置・向きをそのまま使うので、整理した配置が
// 対局画面にそのまま引き継がれる。
function renderGrid(cardOrder, remainingSet, mode) {
  const grid = $('grid');
  grid.innerHTML = '';
  const order = cardOrder && cardOrder.length ? cardOrder : KARUTA.map(k => k.id);
  ensureCardLayout(order);
  order.forEach(id => {
    const k = KMAP[id];
    if (!k) return;
    const layout = cardLayout[id] || { xPct: 50, yPct: 50, rot: 0, zone: 'bottom' };
    const el = document.createElement('div');
    const removed = remainingSet && !remainingSet.has(id);
    el.className   = 'card' + (removed ? ' removed' : '');
    el.id          = `card-${id}`;
    el.dataset.id  = id;
    el.textContent = k.tori;
    el.style.left      = `calc(${layout.xPct}% - 58px)`;
    el.style.top       = `calc(${layout.yPct}% - 33px)`;
    el.style.transform = `rotate(${layout.rot}deg)`;
    if (mode === 'arrange') {
      el.classList.add(layout.zone === 'top' ? 'zone-top' : 'draggable');
      if (layout.zone === 'bottom') attachFreeDrag(el, id);
    } else {
      el.addEventListener('click', ev => onCardClick(id, el, ev));
    }
    grid.appendChild(el);
  });
}

// クリック位置とカード中心とのズレを 0（中心）〜1（端）に正規化して返す。
// サーバー側で「速さがほぼ同時のときだけ精度で決着する」判定に使う。
function computeGrabPrecision(el, ev) {
  if (!ev || typeof ev.clientX !== 'number') return 1;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return 1;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (ev.clientX - cx) / (rect.width / 2);
  const dy = (ev.clientY - cy) / (rect.height / 2);
  return Math.min(1, Math.sqrt(dx * dx + dy * dy));
}

// お手付きをすると、次の札が読み上げられるまで取れない（手当たり次第のクリック対策）。
// 実際の判定はサーバー側で行う。ここでは表示と無駄な送信を止めるための状態。
let myGrabLocked = false;

function setGrabLocked(locked) {
  myGrabLocked = locked;
  const grid = $('grid');
  if (grid) grid.classList.toggle('grab-locked', locked);
  let banner = $('lockBanner');
  if (locked && !banner) {
    banner = document.createElement('div');
    banner.id = 'lockBanner';
    banner.className = 'lock-banner';
    document.body.appendChild(banner);
  }
  if (banner) {
    banner.textContent = '✋ お手付き！次の札が読み上げられるまで取れません';
    banner.classList.toggle('hidden', !locked);
  }
}

function onCardClick(id, el, ev) {
  if ((myIsHost && isEventMode) || myIsSpectator || myIsRevivalSpectator || myIsGroupSpectator) {
    if (el.classList.contains('removed')) return;
    el.classList.remove('host-forbidden');
    void el.offsetWidth;
    el.classList.add('host-forbidden');
    setTimeout(() => el.classList.remove('host-forbidden'), 450);
    return;
  }
  if (myGrabLocked) return;
  if (el.classList.contains('removed') ||
      el.classList.contains('correct-mine') ||
      el.classList.contains('correct-other') ||
      el.classList.contains('wrong')) return;
  const precision = computeGrabPrecision(el, ev);
  socket.emit('grab_card', { cardId: id, t: hiResNow() + serverOffset, precision });
}

// ── Player chips ──────────────────────────────────────────
// 自分自身のチップのみ表示する（他プレイヤーの一覧は表示しない）
function updateChips(players) {
  livePlayers = players;
  const wrap = $('chips');
  wrap.innerHTML = '';
  const me = players[myId];
  if (me) {
    const c = document.createElement('div');
    c.className = 'chip me';
    c.id = `chip-${myId}`;
    const rankHtml = gameStarted ? `<span class="chip-rank">${myRankLabel(players)}</span>` : '';
    c.innerHTML = `
      <span class="chip-dot" style="background:${me.color}"></span>
      <span class="chip-name">${escHtml(me.name)}</span>
      ${rankHtml}
      <span class="chip-score">${me.score}枚</span>`;
    wrap.appendChild(c);
  }
  if (gameStarted) renderTop3(players);
}

// 自分の現在の順位（ホストを除いた全参加者中の順位）を返す
function myRankLabel(players) {
  const sorted = Object.entries(players)
    .filter(([id]) => !(id === liveHostId && isEventMode))
    .sort(([, a], [, b]) => b.score - a.score);
  const idx = sorted.findIndex(([id]) => id === myId);
  if (idx === -1) return '';
  return `${competitionRanks(sorted)[idx]}位 / ${sorted.length}人中`;
}

// ── Float score label ─────────────────────────────────────
function showFloat(el, text, color) {
  const r = el.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'float-score';
  d.style.cssText = `left:${r.left + r.width / 2 - 16}px;top:${r.top + window.scrollY - 6}px;color:${color}`;
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 950);
}

// ── Game over（第3試合＝全試合終了後）──────────────────────
function showGameOver(players) {
  stopTimer();
  stopAllAudio();
  hideReadBtn();
  gameStarted = false;
  const title = document.querySelector('#oGameOver .ov-title');
  if (title) title.textContent = '🏆 全試合終了！';
  const medals = ['🥇', '🥈', '🥉'];
  const wrap = $('rankings');
  wrap.innerHTML = '';
  const sorted = Object.entries(players)
    .filter(([id]) => !(id === liveHostId && isEventMode))
    .sort(([, a], [, b]) => b.score - a.score);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  top3.forEach(([id, p], i) => {
    const row = document.createElement('div');
    row.className = 'rank-row';
    row.innerHTML = `
      <span class="rank-medal">${medals[i]}</span>
      <span class="rank-name">${escHtml(p.name)}${id === myId ? ' <small>(あなた)</small>' : ''}</span>
      <span class="rank-score">${p.score}枚</span>
      <span class="rank-miss">ミス${p.misses}</span>`;
    wrap.appendChild(row);
  });

  if (rest.length) {
    const othersWrap = document.createElement('div');
    othersWrap.className = 'rank-others';
    rest.forEach(([id, p], i) => {
      const item = document.createElement('div');
      item.className = 'rank-others-item';
      item.innerHTML = `
        <span class="rank-others-pos">${i + 4}位</span>
        <span class="rank-others-name">${escHtml(p.name)}${id === myId ? '<small>(あなた)</small>' : ''}</span>
        <span class="rank-others-score">${p.score}枚</span>`;
      othersWrap.appendChild(item);
    });
    wrap.appendChild(othersWrap);
  }
  hide('oLobby'); hide('oRoundResult');
  show('oGameOver');
}

// ── Socket events ─────────────────────────────────────────
socket.on('init', data => {
  myId       = data.myId;
  isServerPc = !!data.isServerPc;
  liveHostId = data.hostId;
  liveData   = { ...data };
  syncClock();
  preloadAudio();
  // doJoin 済みの場合（init 遅延で applyInit が後回しになったケース）
  if (nameEntered) applyInit(liveData);
});

socket.on('player_joined', ({ players }) => {
  if (liveData) liveData.players = players;
  updateChips(players);
  if (!$('oLobby').classList.contains('hidden')) renderLobbyList(players);
});

socket.on('player_left', ({ players }) => {
  if (liveData) liveData.players = players;
  updateChips(players);
  if (!$('oLobby').classList.contains('hidden')) renderLobbyList(players);
});

socket.on('players_updated', players => {
  if (liveData) liveData.players = players;
  updateChips(players);
  if (!$('oLobby').classList.contains('hidden')) renderLobbyList(players);
});

socket.on('houses_assigned', ({ houses, players }) => {
  currentHouses = houses;
  if (liveData) liveData.players = players;
  livePlayers = players;
  myHouse = players[myId] ? players[myId].house : null;
  renderHouseList(houses, players);
});

socket.on('host_changed', ({ hostId }) => {
  if (liveData) liveData.hostId = hostId;
  liveHostId = hostId;
  myIsHost   = (hostId === myId);
  updateLobbyUI();
  if (gameStarted) { updateReadBtnAvailability(); }
  updateHostNotice();
});

socket.on('memorize_start', ({ cardOrder, cards, players, endsAt, round, maxRounds: mr, survivorCount: sc, isRevival: ir, revivalCount: rc, revivalRound: rRound, revivalMaxRounds: rMax, revivalSurvivorCount: rSurv, isGroupMatch: ig, groupTier: gt, groupParticipantIds: gpi, humanGroups: hg, groupRound: gRound, groupMaxRounds: gMax, groupSurvivorCount: gSurv, groupHumanCount: ghc, humanCount: hc, cpuCount: cc, totalCount: tc }) => {
  matchHeadcount = { humanCount: hc || 0, cpuCount: cc || 0, totalCount: tc || 0 };
  if (round)            currentRound  = round;
  if (mr)               maxRounds     = mr;
  if (ir !== undefined) isRevivalMode = ir;
  if (ig !== undefined) isGroupMatch  = ig;
  if (gt)               groupTier     = gt;
  if (hg)               humanGroups   = hg;
  // 新ゲーム開始時（第1試合、通常モード）にポストトーナメント状態をリセット
  if (round === 1 && !ir && !ig) {
    postTournament     = false;
    bottomGroupWinners = null;
    middleGroupWinners = null;
  }
  if (gpi)              groupParticipantIds = new Set(gpi);
  if (rc !== undefined) revivalCount  = rc;
  if (ghc !== undefined) groupHumanCount = ghc;
  if (ig) {
    if (gRound !== undefined)  groupRound         = gRound;
    if (gMax   !== undefined)  groupMaxRounds     = gMax;
    if (gSurv  !== undefined)  groupSurvivorCount = gSurv;
    if (gRound === 1) groupEliminatedIds = new Set();
  }
  if (ir) {
    if (rRound !== undefined)  revivalRound         = rRound;
    if (rMax   !== undefined)  revivalMaxRounds     = rMax;
    if (rSurv  !== undefined)  revivalSurvivorCount = rSurv;
    // 第1ラウンド開始時は脱落済みセットをリセット
    if (rRound === 1) revivalEliminatedIds = new Set();
  }
  if (!ir && !ig && sc !== undefined) {
    survivorCount = sc;
  }
  myIsRevivalSpectator = ir && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost && isEventMode;
  myIsGroupSpectator   = ig && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId)) && isEventMode;
  // グループ戦開始が確定した時点でボタンの一時フィルターをリセット
  ['lobbyGroupBtnTop', 'lobbyGroupBtnMiddle', 'lobbyGroupBtnBottom'].forEach(id => {
    const b = $(id); if (b) b.style.filter = '';
  });
  updateChips(players);
  openArrangeScreen(cardOrder, cards, endsAt, players, round);
});

// ── 大会モード：試合開始（暗記フェーズ）───────────────────
socket.on('event_memorize_start', ({ cardOrder, cards, players, endsAt, stage, stageLabel, participantIds, gamesPlayed, humanCount: hc, cpuCount: cc, totalCount: tc }) => {
  matchHeadcount      = { humanCount: hc || 0, cpuCount: cc || 0, totalCount: tc || 0 };
  isEventMode         = true;
  eventStage          = stage;
  eventStageLabel     = stageLabel;
  eventParticipantIds = new Set(participantIds);
  eventGamesPlayed    = gamesPlayed || {};
  myIsEventSpectator  = !myIsHost && !eventParticipantIds.has(myId);
  updateChips(players);
  openArrangeScreen(cardOrder, cards, endsAt, players, currentRound);
});

socket.on('game_waiting', ({ cardOrder, remaining, players, hostId, round, totalCards, isRevival: ir, isGroupMatch: ig, groupTier: gt, groupParticipantIds: gpi, groupRound: gRound, groupMaxRounds: gMax, isEvent: iev, eventStage: es, eventStageLabel: esl, eventParticipantIds: epi }) => {
  liveHostId = hostId;
  myIsHost   = (hostId === myId);
  if (round)            { currentRound   = round; }
  if (totalCards)       { liveTotalCards  = totalCards; }
  if (ir !== undefined) { isRevivalMode   = ir; }
  if (ig !== undefined) { isGroupMatch    = ig; }
  if (gt)               { groupTier       = gt; }
  if (gpi)              { groupParticipantIds = new Set(gpi); }
  if (gRound !== undefined) { groupRound    = gRound; }
  if (iev !== undefined) { isEventMode = iev; }
  if (esl !== undefined) { eventStageLabel = esl; }
  if (epi) { eventParticipantIds = new Set(epi); }
  if (isEventMode) { myIsEventSpectator = !myIsHost && !eventParticipantIds.has(myId); }
  if (gMax   !== undefined) { groupMaxRounds = gMax; }
  myIsRevivalSpectator = ir && (!liveEliminatedIds.has(myId) || revivalEliminatedIds.has(myId)) && !myIsHost && isEventMode;
  myIsGroupSpectator   = ig && !myIsHost && (!groupParticipantIds.has(myId) || groupEliminatedIds.has(myId)) && isEventMode;
  updateChips(players);
  $('leftCount').textContent = remaining.length;
  $('progFill').style.width = ((liveTotalCards - remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
  $('readingText').textContent = '— 準備中 —';
  showReadBtn();

  if (isArranging || !gameStarted) {
    gameStarted = true;
    isArranging = false;
    stopArrangeCountdown();
    hide('oLobby'); hide('oGameOver'); hide('oRoundResult'); hide('oEventResult');
    if (cardOrder) renderGrid(cardOrder, new Set(remaining), 'play');
    startTimer();
    renderTop3(players);
  }
  updateHostNotice();
});

// イントロ（読み上げます）→ 上の句 MP3 を Web Audio で精密同期再生
// playAt = イントロ開始時刻（全 PC でハードウェアレベルで同期）
socket.on('read_card', ({ card, remaining, playAt }) => {
  setGrabLocked(false);   // 次の札が読み上げられ始めたので、お手付きのロックを解除
  currentPhase = 'reading';
  hideReadBtn();
  $('leftCount').textContent = remaining.length;
  $('progFill').style.width = ((liveTotalCards - remaining.length) / liveTotalCards * 100).toFixed(1) + '%';
  currentReadingYomiText = card ? card.yomi : '';
  $('readingText').textContent = card ? '📢 読み上げ中...' : '—';
  // 自分の端末で正解発表やDJ実況がまだ再生中なら、それが終わるまで詠み上げを
  // 始めない（端末ごとに音声の長さが違うため、ホストの進行に合わせて途中で
  // 打ち切ってしまわないようにする）。
  whenAudioIdle(() => {
    isAnnouncing = false;
    stopDjSpeech();
    if (card) {
      scheduleReadCard(card.id, playAt, () => {
        if (myIsHost) socket.emit('yomi_finished', { cardId: card.id });
      });
    }
  }, 'read', 25000);
});

// ダミー読み（盤面に対応する札が無い読み上げ）。取ろうとすると全員お手付き扱い。
// 再生（「これは盤面にない札でした」の案内まで含む）が完全に終わるまで待ち、
// ホスト端末がその完了を decoy_finished でサーバーに通知する。
socket.on('decoy_read', ({ id, yomi, playAt }) => {
  setGrabLocked(false);
  currentPhase = 'decoy';
  hideReadBtn();
  $('readingText').textContent = '📢 読み上げ中...';
  whenAudioIdle(() => {
    isAnnouncing = false;
    stopDjSpeech();
    scheduleDecoyRead(id, playAt, yomi, () => {
      if (myIsHost) socket.emit('decoy_finished');
    });
  }, 'read', 25000);
});

// 取得者名を画面表示、上の句・下の句を TTS で答え合わせ
// stopAllAudio() が cancel() を呼んだあと、音声デバイスが完全に解放されるまで
// 200ms 待ってから TTS を開始（ホストでの二重 cancel による遅延を防ぐ）
// 読み上げ中は isAnnouncing=true にして次の札の読み上げボタンを禁止する。
// onend が確実に発火しない既知の Chrome の不具合に備え、文字数から推定した
// 時間でのフォールバックタイマーも併用する。
// 正解発表。事前生成 MP3 を Web Audio で再生するのが基本パス（ホスト機での
// 音声デバイスのハンドオフ遅延を回避できる）。MP3 が無い場合のみ speechSynthesis
// にフォールバックする。
// DJ実況が再生中の場合は、それを最後まで聞かせてから正解発表を始める
// （途中で打ち切らない。DJ実況が無ければ即座に開始する）。
socket.on('announce_taken', payload => runAfterDjClear(() => startAnnounceTaken(payload)));

function startAnnounceTaken({ name, color, card, playAt }) {
  stopAllAudio();   // ここで世代カウンタをインクリメントする
  const gen = audioGeneration;
  currentPhase = 'announcing';
  isAnnouncing = true;
  updateReadBtnAvailability();

  let finished = false;
  const finishAnnouncing = () => {
    if (finished) return;
    finished = true;
    isAnnouncing = false;
    updateReadBtnAvailability();
    tryPlayDjQueue();
  };

  if (!card) { finishAnnouncing(); return; }

  const usedWebAudio = scheduleAnnounceAudio(card.id, playAt, gen, finishAnnouncing, 'timeup');
  if (usedWebAudio) return;

  // フォールバック: 該当 MP3 が無い場合のみ TTS で読み上げる
  if (!window.speechSynthesis) { finishAnnouncing(); return; }
  const texts = ['そこまで', card.yomi, card.tori];
  const ttsStartBuf = 200;
  armSpeechEndFallback(finishAnnouncing, texts, gen); // フォールバック（onend不発時の保険）

  setTimeout(() => {
    texts.forEach((text, i) => {
      const utt  = newUtterance(text);
      utt.lang   = 'ja-JP';
      utt.rate   = 0.65;
      utt.pitch  = 1.05;
      pickVoice();
      if (ttsVoice) utt.voice = ttsVoice;
      if (i === texts.length - 1) utt.onend = finishAnnouncing;
      speechSynthesis.speak(utt);
    });
  }, ttsStartBuf);
}

// 制限時間（10秒）超過。「そこまで」と案内した後、上の句・下の句で正解を発表する
socket.on('time_up', ({ card, decoy, playAt }) => {
  dropIdleWaiters('read');   // まだ始められていない詠み上げは取り消す
  stopAllAudio();   // ここで世代カウンタをインクリメントする
  // time_up は必ず read_card/decoy_read の後に起きるため、DJ キューは
  // そちらの stopDjSpeech() で既にクリア済み。
  const gen = audioGeneration;
  currentPhase = 'announcing';
  showTimeUpNotif();

  isAnnouncing = true;
  updateReadBtnAvailability();

  let finished = false;
  const finishTimeUp = () => {
    if (finished) return;
    finished = true;
    isAnnouncing = false;
    updateReadBtnAvailability();
    tryPlayDjQueue();
  };

  if (!card) {
    // デコイ後: そこまで →（間）→ 上の句 → 下の句 → これは盤面にない札でした
    const ctx        = getAudioCtx();
    const timeupBuf  = audioBuffers['timeup'];
    const decoyBuf   = decoy ? audioBuffers[decoy.id] : null;
    const decoyBotBuf = decoy ? audioBuffers[`${decoy.id}-bottom`] : null;
    const noticeBuf  = audioBuffers['decoy-notice'];

    const seq = [];
    if (timeupBuf)   seq.push({ buf: timeupBuf,   pause: 0.8 });
    if (decoyBuf)    seq.push({ buf: decoyBuf,     pause: 0.3 });
    if (decoyBotBuf) seq.push({ buf: decoyBotBuf,  pause: 0.3 });
    if (noticeBuf)   seq.push({ buf: noticeBuf,    pause: 0   });

    if (seq.length > 0) {
      let t = Math.max(0.05, (playAt - hiResNow() - serverOffset) / 1000);
      let lastSrc = null;
      seq.forEach(({ buf, pause }, i) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(ctx.currentTime + t);
        t += buf.duration + pause;
        if (i === 0 && seq.length > 1) curIntro = src;
        else curSource = src;
        lastSrc = src;
      });
      lastSrc.onended = () => { if (gen === audioGeneration) finishTimeUp(); };
      return;
    }

    // Web Audio バッファが全滅した場合は TTS フォールバック
    if (window.speechSynthesis) {
      const texts = ['そこまで'];
      if (decoy) texts.push(decoy.yomi);
      if (decoy && decoy.tori) texts.push(decoy.tori);
      texts.push('これは盤面にない札でした');
      const ttsStartBuf = 200;
      armSpeechEndFallback(finishTimeUp, texts, gen);
      setTimeout(() => {
        texts.forEach((text, i) => {
          const utt = newUtterance(text);
          utt.lang = 'ja-JP'; utt.rate = 0.65; utt.pitch = 1.05;
          pickVoice();
          if (ttsVoice) utt.voice = ttsVoice;
          if (i === texts.length - 1) utt.onend = finishTimeUp;
          speechSynthesis.speak(utt);
        });
      }, ttsStartBuf);
      return;
    }
    finishTimeUp();
    return;
  }

  const usedWebAudio = scheduleAnnounceAudio(card.id, playAt, gen, finishTimeUp, 'timeup');
  if (usedWebAudio) return;

  if (!window.speechSynthesis) { finishTimeUp(); return; }
  const texts = ['そこまで', card.yomi, card.tori];
  const ttsStartBuf = 200;
  armSpeechEndFallback(finishTimeUp, texts, gen);

  setTimeout(() => {
    texts.forEach((text, i) => {
      const utt  = newUtterance(text);
      utt.lang   = 'ja-JP';
      utt.rate   = 0.65;
      utt.pitch  = 1.05;
      pickVoice();
      if (ttsVoice) utt.voice = ttsVoice;
      if (i === texts.length - 1) utt.onend = finishTimeUp;
      speechSynthesis.speak(utt);
    });
  }, ttsStartBuf);
});

// DJ 実況コメント。詠み上げ・正解発表の音声とは重ならないよう
// tryPlayDjQueue() 側で待機させる（キューに積むだけならいつ届いても良い）。
socket.on('dj_comment', ({ text }) => enqueueDjComment(text));

socket.on('card_taken', ({ cardId, by, players }) => {
  // 誰かが札を取った瞬間に詠み上げ（読み上げます／上の句）を中断する。
  // このあと announce_taken で「そこまで」→正解の読み上げ→DJの順に流れる。
  dropIdleWaiters('read');   // まだ始められていない詠み上げは取り消す
  stopAllAudio();
  // 「○○が獲得！」は札を取った瞬間に表示する（音声の順番待ちに合わせて遅らせない）
  showTakenNotif(by.name, by.color || '#4a9eff');
  const el = $(`card-${cardId}`);
  if (!el) return;
  updateChips(players);
  hideReadBtn();
  // DJ実況を最後まで聞かせてから正解発表（そこまで／上の句／下の句）に進むため、
  // ここではまだ isAnnouncing にしない（announce_taken 到着時に runAfterDjClear
  // 経由で開始される。DJ実況が無ければ即座に、あれば話し終わってから開始する）。
  if (by.id === myId) {
    showFloat(el, '+1', '#00e5a0');
    el.classList.add('correct-mine');
  } else {
    el.style.borderColor = by.color;
    el.style.color       = by.color;
    el.style.background  = `linear-gradient(160deg,${by.color}28,${by.color}0a)`;
    el.textContent       = `${by.name} が取得！`;
    el.classList.add('correct-other');
  }
  setTimeout(() => {
    el.style.cssText = '';
    el.classList.remove('correct-mine', 'correct-other');
    el.classList.add('removed');
  }, 680);
});

socket.on('wrong_grab', ({ cardId }) => {
  setGrabLocked(true);
  const el = $(`card-${cardId}`);
  if (!el) return;
  showFloat(el, '-1', '#ff5555');
  el.classList.add('wrong');
  setTimeout(() => el.classList.remove('wrong'), 450);
});

// ロック中に取ろうとした（画面の表示が遅れていた等）場合の保険
socket.on('grab_locked', () => setGrabLocked(true));

socket.on('game_over', ({ players }) => { showGameOver(players); });

// ── 大会モード：試合終了（結果表示）─────────────────────────
// 最後の札の正解発表・DJ実況が終わってから結果画面を出す（音声が終わる前に
// 結果画面へ切り替わって打ち切られないようにする）。
socket.on('event_round_finished', data => whenAudioIdle(() => onEventRoundFinished(data), 'result', 40000));

function onEventRoundFinished(data) {
  stopTimer(); stopAllAudio(); hideReadBtn();
  gameStarted = false;
  const { stage, players } = data;
  const title    = $('evTitle');
  const table    = $('evTable');
  const myStatus = $('evMyStatus');
  let rows = [];
  let myMsg = '';

  const row = (id, badgeText, badgeCls, extraCls) =>
    ({ id, badgeText, badgeCls, extraCls: extraCls || '' });

  if (stage === 'main') {
    if (title) title.textContent = '本戦 終了！';
    rows = [
      ...data.passers.map(id => row(id, '通過', 'adv', 'survivor')),
      ...data.losers.map(id => row(id, '敗者復活戦へ', 'spec', 'eliminated')),
    ];
    myMsg = data.passers.includes(myId) ? '✅ 本戦を突破しました！'
          : data.losers.includes(myId)  ? '😢 敗退…敗者復活戦のチャンスがあります' : '';
  } else if (stage === 'revival') {
    if (title) title.textContent = '敗者復活戦 終了！';
    rows = [
      ...data.revived.map(id => row(id, '復活！本戦へ', 'adv', 'survivor')),
      ...data.stillOut.map(id => row(id, '敗退', 'elim', 'eliminated')),
    ];
    myMsg = data.revived.includes(myId) ? '🎉 復活しました！本戦に戻ります' : '';
  } else if (stage === 'semis') {
    if (title) title.textContent = '決勝進出決定戦 終了！';
    rows = [
      ...data.finalists.map(id => row(id, '決勝進出！', 'adv', 'survivor')),
      ...data.losers.map(id => row(id, '敗退', 'elim', 'eliminated')),
    ];
    myMsg = data.finalists.includes(myId) ? '🏆 決勝進出です！' : '';
  } else if (stage === 'final5') {
    if (title) title.textContent = '決勝ラウンド 終了！';
    rows = data.finalRanking.map((id, i) =>
      row(id, i < 2 ? `${i + 1}位・決勝戦へ` : `${i + 1}位・3位決定戦へ`, i < 2 ? 'adv' : 'spec'));
    myMsg = '';
  } else if (stage === 'thirdplace') {
    if (title) title.textContent = '3位決定戦 終了！';
    rows = data.ranking.map((id, i) => row(id, `${i + 3}位`, i === 0 ? 'adv' : ''));
    myMsg = data.ranking[0] === myId ? '🥉 3位です！' : '';
  } else if (stage === 'championship') {
    if (title) title.textContent = '🏆 決勝戦 終了！';
    rows = data.ranking.map((id, i) => row(id, i === 0 ? '🥇 優勝！' : '🥈 準優勝', i === 0 ? 'adv' : ''));
    myMsg = data.ranking[0] === myId ? '🥇 優勝おめでとうございます！' : data.ranking[1] === myId ? '🥈 準優勝です！' : '';
  }

  if (table) {
    table.innerHTML = rows.map(r => {
      const p = players[r.id];
      return `<div class="rr-row ${r.extraCls}${r.id === myId ? ' me' : ''}">
        <span class="rr-name">${p ? escHtml(p.name) : r.id}${r.id === myId ? ' <small>(あなた)</small>' : ''}</span>
        <span class="rr-score">${p ? p.score : ''}枚</span>
        ${r.badgeCls ? `<span class="rr-badge ${r.badgeCls}">${escHtml(r.badgeText)}</span>` : ''}
      </div>`;
    }).join('');
  }
  if (myStatus) myStatus.textContent = myMsg;

  hide('oLobby'); hide('oRoundResult'); hide('oGameOver');
  show('oEventResult');
}

socket.on('event_stage_ready', ({ stage, mainReady, revivalReady, mainPoolSize, revivalPoolSize }) => {
  eventStage = stage;
  const hostControls = $('evHostControls');
  const guestWait    = $('evGuestWait');
  const lobbyBtn     = $('evLobbyBtn');
  const mainBtn      = $('evMainBtn');
  const revivalBtn   = $('evRevivalBtn');
  const nextBtn      = $('evNextBtn');

  if (stage === 'done') {
    if (hostControls) hostControls.classList.add('hidden');
    if (guestWait)    guestWait.classList.add('hidden');
    if (lobbyBtn)     lobbyBtn.classList.remove('hidden');
    isEventMode = false;
    return;
  }

  const singleAction = ['final5', 'thirdplace', 'championship'].includes(stage);
  if (myIsHost) {
    if (hostControls) hostControls.classList.remove('hidden');
    if (guestWait)    guestWait.classList.add('hidden');
    if (mainBtn) {
      mainBtn.classList.toggle('hidden', singleAction);
      mainBtn.disabled = !mainReady;
      mainBtn.textContent = `本戦を行う（対象:${mainPoolSize}人）`;
    }
    if (revivalBtn) {
      revivalBtn.classList.toggle('hidden', singleAction);
      revivalBtn.disabled = !revivalReady;
      revivalBtn.textContent = `敗者復活戦を行う（対象:${revivalPoolSize}人）`;
    }
    if (nextBtn) { nextBtn.classList.toggle('hidden', !singleAction); nextBtn.disabled = false; }
  } else {
    if (hostControls) hostControls.classList.add('hidden');
    if (guestWait)    guestWait.classList.remove('hidden');
  }
});

// 最後の札の正解発表・DJ実況が終わってから結果画面を出す。
socket.on('round_finished', data => whenAudioIdle(() => onRoundFinished(data), 'result', 40000));

function onRoundFinished({ round, players, survivorIds, eliminatedIds, survivorCount: sc, isFinal, isRevival, isRevivalIntermediate, revivalRound: rRound, revivalMaxRounds: rMax, eliminatedRevivalIds, isGroupMatch: ig, isGroupMatchIntermediate, groupTier: gt, groupRound: gRound, groupMaxRounds: gMax, humanGroups: hg, cumulativeScores: cs, bottomGroupWinners: bw, middleGroupWinners: mw }) {
  if (!isGroupMatchIntermediate) eliminatedIds.forEach(id => liveEliminatedIds.add(id));
  // 練習モード（このイベントは常に練習モード）では敗退しても観戦モードには移行させない
  if (isGroupMatchIntermediate) {
    // グループ戦中間ラウンド: 脱落者を記録
    eliminatedIds.forEach(id => groupEliminatedIds.add(id));
    if (gRound !== undefined) groupRound     = gRound;
    if (gMax   !== undefined) groupMaxRounds = gMax;
  } else if (isRevivalIntermediate) {
    // 復活戦中間ラウンド: 脱落者を記録、まだ復活戦は続く
    eliminatedIds.forEach(id => revivalEliminatedIds.add(id));
    if (rRound !== undefined) revivalRound      = rRound;
    if (rMax   !== undefined) revivalMaxRounds  = rMax;
  } else if (isRevival) {
    // 復活戦最終ラウンド
    survivorIds.forEach(id => liveEliminatedIds.delete(id));
    isRevivalMode        = false;
    myIsRevivalSpectator = false;
    revivalEliminatedIds = new Set();
  }
  if (ig && !isGroupMatchIntermediate) {
    isGroupMatch        = false;
    myIsGroupSpectator  = false;
    groupParticipantIds = new Set();
    groupEliminatedIds  = new Set();
  }
  if (hg) humanGroups = hg;
  if (gt) groupTier   = gt;
  if (bw !== undefined) bottomGroupWinners = bw;
  if (mw !== undefined) middleGroupWinners = mw;
  showRoundResult(round, players, survivorIds, eliminatedIds, sc, isFinal, isRevival, ig, gt, isRevivalIntermediate, rRound, rMax, isGroupMatchIntermediate, gRound, gMax);

  // 練習モードの結果画面ではDJが各自の順位を読み上げる
  if (!isEventMode && !ig && !isRevival && !isRevivalIntermediate && !isGroupMatchIntermediate) {
    speakRoundResultDj(round, players, new Set([...survivorIds, ...eliminatedIds]));
  }
}

// 「惜しい」を流す条件：自分が4〜10位で、3位との点差がこの点数以内
const DJ_CLOSE_MAX_RANK  = 10;
const DJ_CLOSE_MAX_DIFF  = 3;   // 3枚差以内（得点が枚数になる前の300点に相当）

// 試合結果画面のDJ音声（各端末で、その端末のユーザー自身の順位に合わせて読み上げる）。
// 順位は結果画面のランキングと同じく、CPUを含む全参加者の中での順位。
function speakRoundResultDj(round, players, participantIds) {
  const sorted = Object.entries(players)
    .filter(([id, p]) => participantIds.has(id) && (p.isBot || p.joined))
    .sort(([, a], [, b]) => b.score - a.score);

  // 優先度：3位以内「おめでとうございます」→ 10位以内「惜しい」→「○回戦終了です」。
  // 上の条件を満たしたら、それ以降のメッセージは読み上げない（1つだけ流す）。
  let line = `${round}回戦終了です。お疲れ様でした。`;

  // 同じ枚数は同順位（1位,1位,3位…）。結果画面の順位表示と同じ数え方にする。
  const ranks = competitionRanks(sorted);
  const myIdx = sorted.findIndex(([id]) => id === myId);
  if (myIdx !== -1) {
    const rank  = ranks[myIdx];
    const score = sorted[myIdx][1].score;
    if (rank <= 3) {
      line = `おめでとうございます。あなたは${score}枚で${rank}位です。`;
    } else if (rank <= DJ_CLOSE_MAX_RANK) {
      // 入賞圏内（3位以内）で一番下の人との差
      let podiumIdx = -1;
      ranks.forEach((r, i) => { if (r <= 3) podiumIdx = i; });
      if (podiumIdx !== -1) {
        const diff = sorted[podiumIdx][1].score - score;
        if (diff > 0 && diff <= DJ_CLOSE_MAX_DIFF) {
          line = `惜しい。あと${diff}枚で${ranks[podiumIdx]}位でした。`;
        }
      }
    }
  }
  // showRoundResult() 内の cancel() 直後に話し始めると取りこぼすことがあるため少し待つ
  setTimeout(() => enqueueDjComment(line), 300);
}

socket.on('back_to_lobby', ({ players, postTournament: pt, humanGroups: hg, bottomGroupWinners: bw, middleGroupWinners: mw }) => {
  gameStarted          = false;
  myIsSpectator        = false;
  myIsRevivalSpectator = false;
  myIsGroupSpectator   = false;
  isRevivalMode        = false;
  isGroupMatch         = false;
  groupTier            = null;
  groupParticipantIds  = new Set();
  liveEliminatedIds    = new Set();
  currentRound         = 1;
  liveTotalCards       = 10;
  // ポストトーナメント状態を同期（start_game まで保持）
  if (pt !== undefined) postTournament = pt;
  if (hg !== undefined) humanGroups    = hg;
  if (bw !== undefined) bottomGroupWinners = bw;
  if (mw !== undefined) middleGroupWinners = mw;
  updateChips(players);
  openLobby(players);
});

socket.on('connect_error', () => {
  $('readingText').textContent = 'サーバーに接続できません。ページを更新してください。';
});
