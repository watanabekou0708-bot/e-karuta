'use strict';

//audio file
let word = [];
let wordAudio = [];
let discription = [];
let discriptionAudio = [];
let yomiagemasu = new Audio('./audio/詠みあげます！.wav');
let sokomade = new Audio('./audio/そこまで！.wav');

let hereDocument = function() {/*
1TA-101-A_AVERAGE関数	1TA-101-Q_平均値を計算する関数
1TA-102-A_COUNTA関数	1TA-102-Q_セルに入力されたすべてのデータを対象に個数を計算する関数
1MA-103-A_COUNT関数	1MA-103-Q_数値データのみを対象に個数を数える関数
1MA-104-A_IF関数	1MA-104-Q_「もしも・・・なら」「真の場合」「偽の場合」を提示する関数
1MA-105-A_MAX関数	1MA-105-Q_指定した数値やセル範囲の中から最大値を選んで表示する関数
1MA-106-A_MIN関数	1MA-106-Q_指定した数値やセル範囲の中から最小の値を選んで表示する関数
1MA-107-A_RANK.AVG関数	1MA-107-Q_順位の平均を表示する関数
1TA-108-A_RANK.EQ関数	1TA-108-Q_数値が何番目にあるかを表示する関数
1MA-109-A_ROUNDDOWN関数	1MA-109-Q_切り捨てする関数
1MA-110-A_ROUNDUP関数	1MA-110-Q_切り上げする関数
1MA-111-A_ROUND関数	1MA-111-Q_四捨五入する関数
1MA-112-A_SUM関数	1MA-112-Q_合計を算出する関数
1MB-113-A_AND関数	1MB-113-Q_複数の条件をすべて満たす「かつ」という論理条件を示す関数
XXX-114-A_OR関数	XXX-114-Q_「または」という論理条件を示す関数
1MB-115-A_TODAY関数	1MB-115-Q_今日の日付を表示する関数
2TC-116-A_INT関数	2TC-116-Q_指定した数値を超えない最大の整数を表示する関数
XXX-117-A_DATEDIF関数	XXX-117-Q_年数や日数、月数の経過期間を計算する関数
1MB-201-A_CHOOSE関数	1MB-201-Q_インデックスを使用して引数リストに指定した値を表示する関数
1MB-202-A_DATE関数	1MB-202-Q_指定した数値を日付型で表示する関数
XXX-203-A_DAVERAGE関数	XXX-203-Q_データベース内の指定された列を検索し、条件を満たすレコードの平均値を表示させる関数
XXX-204-A_DCOUNTA関数	XXX-204-Q_データベース内の指定された列を検索し、条件を満たすレコードの中の空白でないセルの個数を表示させる関数
1MB-205-A_DCOUNT関数	1MB-205-Q_データベース内の指定された列を検索し、条件を満たすレコードの中で数値が入力されているセルの個数を表示させる関数
XXX-206-A_DMAX関数	XXX-206-Q_データベース内の指定された列を検索し、条件を満たすレコードの最大値を表示させる関数
1MB-207-A_DMIN関数	1MB-207-Q_データベース内の指定された列を検索し、条件を満たすレコードの最小値を表示させる関数
XXX-208-A_DSUM関数	XXX-208-Q_データベース内の指定された列を検索し、条件を満たすレコードの合計を表示させる関数
1MB-209-A_HLOOKUP関数	1MB-209-Q_「表引きによるデータ参照」をする関数、検索する値が行方向（横）に並んでいる
2TB-210-A_INDEX関数	2TB-210-Q_データ範囲から行の位置と列の位置を指定し、その行と列の交差する位置の値を表示する
1MB-211-A_ISBLANK関数	1MB-211-Q_空白セルかどうかを調べる関数
XXX-212-A_LEFT関数	XXX-212-Q_文字列の先頭から指定された数の文字を取り出す関数
1MB-213-A_LEN関数	1MB-213-Q_文字列の文字数を表示する関数
1MB-214-A_MID関数	1MB-214-Q_文字列の任意の位置から指定された数の文字を取り出す関数
XXX-215-A_NOT関数	XXX-215-Q_ある値が特定の値と等しくないことを判断して使う関数
1MB-216-A_NOW関数	1MB-216-Q_現在の日付と時刻を表示する関数
2MB-217-A_PHONETIC関数	2MB-217-Q_ふりがなを表示する関数
1MB-218-A_REPT関数	1MB-218-Q_文字列を指定された回数だけ繰り返して表示する関数
XXX-219-A_RIGHT関数	XXX-219-Q_文字列の末尾から指定された数の文字を取り出す関数
1TB-220-A_SEARCH関数	1TB-220-Q_指定した検索文字列をほかの文字列の中で検索し、その検索文字列が最初に現れる位置を先頭文字からの位置で表示する関数
2MB-221-A_TEXT関数	2MB-221-Q_数値を書式設定した文字列に変換する関数
1MB-222-A_VLOOKUP関数	1MB-222-Q_「表引きによるデータ参照」をする関数、検索する値が列方向（縦）に並んでいる
2MB-223-A_WEEKDAY関数	2MB-223-Q_指定した日付の曜日を0～7までの数値で表示する関数
2TC-224-A_AVERAGEIFS関数	2TC-224-Q_複数の条件に一致するセルの平均を求める関数
XXX-225-A_AVERAGEIF関数	XXX-225-Q_指定した条件に一致するセルの平均値を算出する関数
2MC-226-A_ABS関数	2MC-226-Q_数値から符号の＋や－を除いた絶対値を表示する関数
2TC-227-A_COUNTIFS関数	2TC-227-Q_複数の条件に一致するセルの個数を求める関数
XXX-228-A_COUNTIF関数	XXX-228-Q_指定した条件に一致するセルの個数を算出する関数
XXX-229-A_IFERROR関数	XXX-229-Q_数式がエラーとして評価される場合は指定の値を表示し、それ以外の場合は数式の結果を表示する関数
3MC-230-A_LARGE関数	3MC-230-Q_指定した順位番目に大きな値を表示する関数
XXX-231-A_MOD関数	XXX-231-Q_数値を除数で割ったときの余りを表示する関数
2MC-232-A_SMALL関数	2MC-232-Q_範囲内のデータの中で、指定した順位番目に小さな値を表示する関数
3MC-233-A_SUMIFS関数	3MC-233-Q_複数の条件に一致するセルの値を合計する関数
XXX-234-A_SUMIF関数	XXX-234-Q_指定した条件に一致するセルの値を合計する関数
2MC-235-A_TRUNC関数	2MC-235-Q_小数点以下を切り捨てる関数
3TD-236-A_FALSE関数	3TD-236-Q_論理値「FALSE]を返す関数
3MD-237-A_MIDB関数	3MD-237-Q_文字列の任意の位置から指定された数の文字をバイト数で取り出す関数
XXX-238-A_PMT関数	XXX-238-Q_財務関数のひとつで、ローン計算をするときに使用する関数
XXX-239-A_TRUE関数	XXX-239-Q_論理値「TRUE]を返す関数
1MA-301-A_アカウント名	1MA-301-Q_オンラインサービスで個人または組織を識別する名前
1MA-302-A_インターネット	1MA-302-Q_情報を世界中のコンピュータネットワークで共有するグローバルなコミュニケーションネットワーク
1MA-303-A_検索エンジン	1MA-303-Q_情報をキーワードで検索し、関連するウェブページやファイルを一覧表示するプログラムやサービス
1MA-304-A_コンピュータウィルス	1MA-304-Q_悪意のあるプログラムで、コンピュータに感染して機能を破壊・乗っ取る
1MA-305-A_添付ファイル	1MA-305-Q_電子メールや文書に添付されるデータを指す
1TA-306-A_ネチケット	1TA-306-Q_情報処理分野でのマナーやルールに関するマナー
1MA-307-A_パスワード	1MA-307-Q_アクセス制御のための秘密の文字列
1MA-308-A_ブログ	1MA-308-Q_個人が日記や情報をウェブ上で発信するオンラインメディア
1MA-309-A_ホームページ	1MA-309-Q_ウェブ上でアクセス可能な文書やメディアのまとまりで、情報やサービスを提供するためのインターネット上の個別のページ
1TA-310-A_メールアドレス	1TA-310-Q_電子メール送受信のための個人識別情報
1MA-311-A_SNS	1MA-311-Q_オンライン上でユーザーが交流するプラットフォーム（ソーシャル・ネットワーキング・サービス）
1MA-312-A_Webサイト	1MA-312-Q_インターネット上に存在する情報やコンテンツを表示するためのオンラインの場所
1MA-313-A_Windows	1MA-313-Q_Microsoftによるオペレーティングシステム
XXX-401-A_キーボード	XXX-401-Q_コンピューターやデバイスへの入力装置で、文字や操作を指定するためにキーを押すことで情報を入力するデバイス
XXX-402-A_クリック	XXX-402-Q_ユーザがマウスやタッチデバイスで画面上の要素を選択または操作する行為
XXX-403-A_ショートカットキー	XXX-403-Q_コンピュータでの効率的な操作のためのキーボードショートカット
1MB-404-A_スクロールバー	1MB-404-Q_ウェブページやアプリ内でコンテンツをスクロールするためのバー
1MB-405-A_ダブルクリック	1MB-405-Q_２回連続でマウスをクリックする操作
XXX-406-A_チェックボックス	XXX-406-Q_選択項目を有効／無効にするUI要素
1MB-407-A_テキストボックス	1MB-407-Q_ユーザーがテキストを入力できるGUI要素
XXX-408-A_ドラッグ	XXX-408-Q_コンピューターの操作で、マウスや指でオブジェクトを選択し、別の場所に移動することを指す
1MB-409-A_ハイパーリンク	1MB-409-Q_文書内やWebページでクリックにより別の場所やリソースに移動させるリンク
XXX-410-A_フォルダ	XXX-410-Q_情報処理でデータやファイルを整理・保存するための仮想的なコンテナ。関連するアイテムをまとめ、検索や管理を容易にする
XXX-411-A_フォント	XXX-411-Q_文字のスタイルや形状を指定する情報。テキスト表示に使用され、視覚的な印象を与えるために様々な種類やスタイルが存在する
1TB-412-A_ブラウザ	1TB-412-Q_インターネットを閲覧するソフトウェア。Webページを表示し、ユーザーが情報を検索・閲覧できる
1MB-413-A_プルダウンメニュー	1MB-413-Q_選択肢がリストとして表示され、クリックすると選択できるインターフェース要素
XXX-414-A_マウス	XXX-414-Q_情報処理分野で入力デバイスとして使われ、カーソルを移動・クリックするための手持ちデバイス
XXX-415-A_ラジオボタン	XXX-415-Q_選択肢から1つを選択するための円形のUI要素
1MB-416-A_リストボックス	1MB-416-Q_選択肢を一覧表示するGUI要素
1TB-417-A_ワクチンソフト	1TB-417-Q_コンピューターシステムに対するセキュリティ対策ソフトウェアで、悪意のあるプログラムから保護するもの
XXX-418-A_Blue-ray Disc	XXX-418-Q_高容量ディスクで、光学ディスク規格の一つ。データや映像を高品質で保存・再生する技術
1MB-419-A_DVD-R	1MB-419-Q_記録可能なDVD形式で、一度のみ書き込み可能な光ディスク
1TB-420-A_HTML	1TB-420-Q_Webページを作成するための言語
2MB-421-A_JPEG	2MB-421-Q_画像圧縮形式で、写真や図形のデジタル画像を小さくして保存するために利用されます
XXX-422-A_OS	XXX-422-Q_コンピューター上でハードウェアやソフトウェアを制御し、管理する基本ソフトウェア（Operating System）
XXX-423-A_PDF	XXX-423-Q_ポータブルな文書フォーマット。文書や画像を独立した形式で表示するためのファイル形式
1TB-424-A_USBメモリ	1TB-424-Q_情報保存のための携帯可能な記憶デバイス
XXX-501-A_圧縮	XXX-501-Q_データを小さくして、記憶や転送の効率を向上させる処理
XXX-502-A_アルゴリズム	XXX-502-Q_手順や計算を解決するための明確な手法や指示
2MC-503-A_解凍	2MC-503-Q_ファイルやデータを圧縮された状態から元の形式に戻す処理
XXX-504-A_拡張子	XXX-504-Q_ファイルの種類や形式を示すためのファイル名の末尾に追加される文字列
XXX-505-A_機種依存文字	XXX-505-Q_特定の機種や環境に依存して正しく表示される文字で、他の環境では正しく表示されない文字のこと
2MC-506-A_10進数	2MC-506-Q_基数が10の数制で、0から9までの数字を用いて数を表す。10進法は日常的で直感的な計算が可能
XXX-507-A_16進数	XXX-507-Q_0から15までの数字を表す基数で、10進数の16進法。コンピュータなどで頻繁に使用され、0～9とA～Fで表現される
2MC-508-A_順アクセス方式	2MC-508-Q_データを順にアクセスする手法。例：テープドライブ。ランダムアクセスに比べ効率は低いが、シンプル
2MC-509-A_ストリーミング	2MC-509-Q_ダウンロードしながら再生できる
2MC-510-A_絶対パス	2MC-510-Q_ファイルやディレクトリの完全な場所を示す
2MC-511-A_相対パス	2MC-511-Q_ファイルやディレクトリの場所を現在の場所から相対的に示す方法
3TC-512-A_テキストエディタ	3TC-512-Q_テキストを編集するソフトウェア。基本的な操作が容易であり、コードや文章の作成・編集に利用される
3TC-513-A_2進数	3TC-513-Q_0と1のみを使い数を表現する数制で、コンピューター内で情報を表す基本的な方式
2MC-514-A_ネットワーク	2MC-514-Q_複数のデバイスが相互に接続され、情報を共有する仕組み
3MC-515-A_バイト	3MC-515-Q_情報処理でデータを表す単位。8ビットの集まりで、1文字を表したり、データを保存したりする
XXX-516-A_8進数	XXX-516-Q_10進数の代わりに0から7の数字を使う数法。8の倍数で表現され、2進数への変換が利用される
2MC-517-A_ビット	2MC-517-Q_情報の最小単位。0または1の二進数で表され、コンピュータのデータ処理において基本的な情報単位
2MC-518-A_不正アクセス	2MC-518-Q_ネットワークを通して攻撃する
XXX-519-A_フローチャート	XXX-519-Q_情報処理で使われる視覚的な図で、プロセスやアルゴリズムを流れ図で表現し、理解や設計をサポートする
3MC-520-A_ポインティングディバイス	3MC-520-Q_情報処理で使用される入力デバイスで、カーソルやポインターを制御するための装置
2MC-521-A_文字コード	2MC-521-Q_文字を数字に変換する規則。例えば、ASCIIやUTF-8がある
2MC-522-A_文字化け	2MC-522-Q_文字の正しい表示ができないエラー
2MC-523-A_ユーザビリティ	2MC-523-Q_使いやすさを第一に考える
3TC-524-A_リレーショナルデータベース	3TC-524-Q_関連付けられたテーブルにデータを格納し、SQLを使って管理するデータベースシステム
2MC-525-A_AR	2MC-525-Q_現実世界にコンピュータ生成の情報を重ね合わせる技術
3MC-526-A_CAD	3MC-526-Q_コンピュータを用いた設計や図面作成に使用されるソフトウェアや技術（Computer-Aided Design）
XXX-527-A_CUI	XXX-527-Q_テキストベースのユーザーインターフェース（Character User Interface）
3MC-528-A_FTP	3MC-528-Q_ファイルをネットワーク上で転送するための通信プロトコル（File Transfer Protocol）
XXX-529-A_HTTP	XXX-529-Q_ウェブページなどを送受信するための通信規約（Hypertext Transfer Protocol）
2MC-530-A_Java	2MC-530-Q_オブジェクト指向プログラミング言語。様々なプラットフォームで動作し、堅牢性と移植性が特徴
2TC-531-A_JavaScript	2TC-531-Q_ウェブページの動的な振る舞いを制御するプログラミング言語
3MC-532-A_PHP	3MC-532-Q_ウェブ開発のためのサーバーサイド言語
2MC-533-A_SQL	2MC-533-Q_データベースで使用される問い合わせ言語
2MC-534-A_URL	2MC-534-Q_インターネット上のリソースの場所を示すアドレス
XXX-535-A_USB	XXX-535-Q_コンピューターと周辺機器を接続するための標準インターフェース
2MC-536-A_VR	2MC-536-Q_コンピューター技術を使い、現実世界とは異なる環境を体験する技術（仮想現実）
2MC-537-A_WWW	2MC-537-Q_インターネット上の情報を検索・閲覧するためのシステム（World Wide Web）
XXX-601-A_アクセシビリティ	XXX-601-Q_どんな人でも使えることを意識する
3MD-602-A_暗号化	3MD-602-Q_データを保護するために情報を不可解な形に変換する技術
3TD-603-A_演算装置	3TD-603-Q_コンピュータ内で数値演算や論理演算を実行する機能を持つ、計算処理を行う主要な部分
XXX-604-A_クライアント	XXX-604-Q_サーバーからサービスやデータを要求する端末やソフトウェアのこと
XXX-605-A_サーバ	XXX-605-Q_コンピュータやソフトウェアがネットワーク上で情報を提供・管理するコンピューターシステム
3TD-606-A_主記憶装置	3TD-606-Q_コンピュータのデータやプログラムを一時的に保存するためのメモリで、CPUがアクセスする高速なデータストレージ
XXX-607-A_出力装置	XXX-607-Q_情報処理分野でデータを表示・印刷・記録するデバイス。例：プリンタやモニタ
3MD-608-A_制御装置	3MD-608-Q_プロセスやシステムの操作・監視を行う装置
XXX-609-A_セキュリティ	XXX-609-Q_情報保護やデータの安全性を確保する対策
3MD-610-A_中央処理装置	3MD-610-Q_コンピューターの主要な部品であり、命令を実行し、データを処理する装置。CPUとも呼ばれる
3MD-611-A_入力装置	3MD-611-Q_情報処理でデータをシステムに入力する機器や手段
XXX-612-A_ハードディスク装置	XXX-612-Q_データを永続的に保存するコンピューターの記憶装置
3TD-613-A_ハブ	3TD-613-Q_ネットワークでデータを集約・転送する装置。信号を受け取り、複数のデバイスに送信する
3MD-614-A_プロセス	3MD-614-Q_情報処理で実行中のプログラムの一部で、リソースやデータを操作し、タスクを完了するための実行単位
XXX-615-A_プロトコル	XXX-615-Q_情報処理での通信やデータ交換の規約を指し、異なるシステムやデバイスが連携するための手順や標準化された方法
3MD-616-A_補助記憶装置	3MD-616-Q_データを永続的に保存するためのデバイスで、例えばハードディスクドライブやSSDなどが該当します
XXX-617-A_マザーボード	XXX-617-Q_情報処理装置の主回路基板で、各種部品を接続し、データの伝達を可能にする重要なコンポーネント
XXX-618-A_無線LAN	XXX-618-Q_データを有線接続なしで無線で転送する技術。通常、Wi-Fiで使用
XXX-619-A_メールサーバ	XXX-619-Q_メールを送受信するためのサーバ。電子メールの転送や保存を担当し、通信の中継や保管を行う
3TD-620-A_メモリ	3TD-620-Q_データや命令を一時的に保存するコンピュータの要素で、処理速度向上に寄与する
XXX-621-A_ランサムウェア	XXX-621-Q_身代金を要求するウイルス
XXX-622-A_ルータ	XXX-622-Q_ネットワークでデータを送受信する装置。異なるネットワーク間を中継して通信を可能にする
XXX-623-A_BIOS	XXX-623-Q_コンピューターの起動時に基本入出力システムを管理するプログラム
3MD-624-A_CPU	3MD-624-Q_コンピューターの主要部分であり、命令を実行し、演算やデータ処理を行う（Central Processing Unit）
3TD-625-A_DHCP	3TD-625-Q_IPアドレスを自動割り当てするプロトコル。ネットワーク上のデバイスがIPアドレスを取得し通信する仕組み
3TD-626-A_DNS	3TD-626-Q_インターネットでドメイン名をIPアドレスに変換するシステム（Domain Name System）
3TD-627-A_DNSサーバ	3TD-627-Q_ドメイン名をIPアドレスに変換するサーバ
3MD-628-A_FTPサーバ	3MD-628-Q_ファイルを送受信するためのサーバ
XXX-629-A_IPv6	XXX-629-Q_インターネット・デバイスに割り当てる識別番号。IPv4を置き換える次世代プロトコルで、アドレス枯渇問題に対処する
3TD-630-A_IPアドレス	3TD-630-Q_ネットワーク上のデバイスを識別する番号
3MD-631-A_ISP	3MD-631-Q_インターネット接続を提供する企業または組織（Internet Service Provider）
3MD-632-A_LANケーブル	3MD-632-Q_データをローカルエリアネットワークで伝送するためのケーブル
3MD-633-A_Linux	3MD-633-Q_オープンソースのオペレーティングシステムで、コンピュータの基本機能を提供するソフトウェア
XXX-634-A_NIC	XXX-634-Q_コンピューターに組み込まれるネットワーク接続用のデバイス（Network Interface Card）
3MD-635-A_POPサーバ	3MD-635-Q_電子メールを受信するためのプロトコル
XXX-636-A_RAID	XXX-636-Q_データを複数のディスクに分散保存し、信頼性とパフォーマンスを向上させる技術（Redundant Array of Independent Disks）
3MD-637-A_RAM	3MD-637-Q_ンピューター内のデータや命令を一時的に保持するメモリ（Random Access Memory）
3TD-638-A_ROM	3TD-638-Q_情報を読み取り専用に保存するコンピューターの記憶装置（Read-Only Memory）
3MD-639-A_SCSI	3MD-639-Q_コンピュータと周辺機器を接続するための標準インターフェース（Small Computer System Interface）
3MD-640-A_Serial ATA	3MD-640-Q_データストレージ用のコンピュータインターフェース規格
XXX-641-A_SMTPサーバ	XXX-641-Q_メール送受信を管理するサーバ
3TD-642-A_SSD	3TD-642-Q_高速なデータ保存デバイス
3MD-643-A_TCP／IP	3MD-643-Q_インターネットでデータを送受信するための通信プロトコル
3TD-644-A_WAN	3TD-644-Q_広域ネットワークを指し、地理的に広い範囲でコンピューターやネットワークを接続する通信インフラを指します
3MD-645-A_Webサーバ	3MD-645-Q_ウェブページやファイルを提供するコンピュータ
*/}.toString().split('\n').slice(1, -1);

hereDocument.forEach((elm) => {
    let str = elm.split('	');
    word.push(str[0]);
    wordAudio.push(new Audio('./audio/' + str[0] + '.wav'));
    discription.push(str[1]);
    discriptionAudio.push(new Audio('./audio/' + str[1] + '.wav'));
});
console.log('合計用語数:' + hereDocument.toString().match(/-[0-9]{3}-A_/g).length);
let cntWord = hereDocument.toString().match(/1[MT][A-D]-[0-9]{3}-A_/g).length;
console.log('第 1 回戦 全用語数:' + cntWord);
let cntMain = hereDocument.toString().match(/1M[A-D]-[0-9]{3}-A_/g).length;
console.log('第 1 回戦 場札 用語数:' + cntMain);
let cntTrick = hereDocument.toString().match(/1T[A-D]-[0-9]{3}-A_/g).length;
console.log('第 1 回戦 空札 用語数:' + cntTrick);
console.log('第 2 回戦 全用語数:' + hereDocument.toString().match(/2[MT][A-D]-[0-9]{3}-A_/g).length);
console.log('第 2 回戦 場札 用語数:' + hereDocument.toString().match(/2[M]{1}[A-D]-[0-9]{3}-[A]_/g).length);
console.log('第 2 回戦 空札 用語数:' + hereDocument.toString().match(/2[T]{1}[A-D]-[0-9]{3}-[A]_/g).length);
console.log('第 3 回戦 全用語数:' + hereDocument.toString().match(/3[MT][A-D]-[0-9]{3}-A_/g).length);
console.log('第 3 回戦 場札 用語数:' + hereDocument.toString().match(/3[M]{1}[A-D]-[0-9]{3}-[A]_/g).length);
console.log('第 3 回戦 空札 用語数:' + hereDocument.toString().match(/3[T]{1}[A-D]-[0-9]{3}-[A]_/g).length);
console.log('その他:' + hereDocument.toString().match(/XXX-[0-9]{3}-[A]_/g).length);

let elm_main = document.querySelector('main');
let elms;
let now;
let start;
let goal;
let intervalId;

document.querySelector('#btn').addEventListener('click', function() {

    now = new Date();
    goal = new Date();
    goal.setMinutes(now.getMinutes() + 1);

    countDown();
    intervalId = setInterval(countDown, 1000);

    // 場札の表示
    for (let i = 0; i < word.length; i++) {
        if (RegExp('1M[A-D]-[0-9]{3}-A_', 'g').test(word[i])) {
            let div = document.createElement('div');
            div.classList.add("cell");
            div.textContent = word[i].split(/_/)[1];
            elm_main.appendChild(div);
        }
    }
    elms = document.querySelectorAll('.cell')
    
    // 場札の回転
    for (let i = 0; i < cntMain; i++) {
        let d = Math.floor(Math.random() * 360);
        elms[i].style.transform = 'rotateZ(' + d + 'deg)';
    }
    
    // 全配列の入れ替え
    for (let i = 0; i < word.length * 10; i++) {
        let r1 = Math.floor(Math.random() * cntMain);
        let r2 = Math.floor(Math.random() * cntMain);
        elm_main.appendChild(elms[r1]);
        let discriptionAudio_tmp = discriptionAudio[r1];
        let wordAudio_tmp = wordAudio[r1];
        let word_tmp = word[r1];
        discriptionAudio[r1] = discriptionAudio[r2];
        wordAudio[r1] = wordAudio[r2];
        word[r1] = word[r2];
        discriptionAudio[r2] = discriptionAudio_tmp;
        wordAudio[r2] = wordAudio_tmp;
        word[r2] = word_tmp;
    }
    
    setTimeout(function() {
        
        clearInterval(intervalId);
        now = new Date();
        start = new Date();
        
        countUp();
        intervalId = setInterval(countUp, 10);
        
        readAll(1, 0);
        
    }, 1000 * 5); // 開発時は 5 秒でテストするが、運用時には調整が必要
    
}, false);

const min = document.querySelector('#min');
const sec = document.querySelector('#sec');
const mili = document.querySelector('#mili');

function countDown() {
    
    now = new Date();
    const diff = goal.getTime() - now.getTime();
    
    const calcMin = Math.floor(diff / 1000 / 60) % 60;
    const calcSec = Math.floor(diff / 1000) % 60;
    
    min.innerHTML = ( '00' + calcMin ).slice( -2 );
    sec.innerHTML = ( '00' + calcSec ).slice( -2 );
    
}

function countUp() {
    
    now = new Date();
    const diff = now.getTime() - start.getTime();
    
    const calcMin = Math.floor(diff / 1000 / 60) % 60;
    const calcSec = Math.floor(diff / 1000) % 60;
    const calcMili = diff - (Math.floor(diff / 1000) * 1000);
    
    min.innerHTML = ( '00' + calcMin ).slice( -2 );
    sec.innerHTML = ( '00' + calcSec ).slice( -2 );
    mili.innerHTML = ( '000' + calcMili ).slice( -3 );
    
}

function readAll(num, cnt) {
    
    document.querySelector('#btn').textContent = cnt + '(' + num + ')'; // テスト用
    yomiagemasu.play();
    
    if (RegExp('1[MT][A-D]-[0-9]{3}-A_', 'g').test(word[num])) {
        setTimeout(() => {
            
            discriptionAudio[num].play();
            
            setTimeout(() => {
                
                sokomade.play();
                
                setTimeout(() => {
                    
                    if (RegExp('1[^T][A-D]-[0-9]{3}-A_', 'g').test(word[num])) {
                        cnt++;
                    }
                    wordAudio[num].play();
                    document.querySelector('#btn').textContent = cnt + '(' + num + ')'; // テスト用
                    console.log(word[num]);
                    setTimeout(() => {
                        
                        if (num < word.length - 1) {
                            num++;
                            readAll(num, cnt);
                        } else {
                            clearInterval(intervalId);
                        }
                        
                    }, 9500);
                    // 用語
                    
                }, 5500);
                // そこまで！
                
            }, 15000);
            // 意味
            
        }, 3000);
    } else {
        num++;
    }
    // 詠みあげます！

}