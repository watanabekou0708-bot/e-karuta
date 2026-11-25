## 配布資料・ツールの説明
- `手順書/Webかるた_用語リスト.pptx` / `.pdf`：学生に配る用語リスト（IT用語一覧.pdf の175語。競技要領およびルールは載せない）。
- `tools/make_term_list.py`：`ycc-terms.js` の札を `public/karuta-data.js` から読んで用語リストの PPTX を作る（`pip install python-pptx` が必要）。
- `ycc-terms.js`：IT用語一覧.pdf の175語の札ID。大会モードの出題を一時的にこの範囲に限定している（`server.js` の `EVENT_TERMS_LIMITED`）。
- `tools/pptx_to_pdf.ps1`：PowerPoint で PPTX を PDF に書き出す。
- `mockups/`：実装前の画面案（`survey-mockup.html` はプレイ後アンケートの案）。
- `survey.js` / `public/survey.html`・`survey.css`・`survey-page.js`：アンケート（サーバー側のCSV保存 / 専用ページ）。
- `手順書/Webかるた_アンケート.url`：共有ドライブに置くアンケートのショートカット。
- `public/waiting.js`：大会モード開始前の待機画面。
