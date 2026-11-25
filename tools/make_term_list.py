# -*- coding: utf-8 -*-
"""学生配布用の用語一覧（PPTX）を public/karuta-data.js から作る。

様式は YCCカルタ大会/IT用語一覧.pdf に合わせ、難易度（A〜D）ごとにまとめる。

  python tools/make_term_list.py   … 手順書/Webかるた_用語リスト.pptx を作る
  PDF は tools/pptx_to_pdf.ps1 で PowerPoint から書き出す。

必要: python-pptx（pip install python-pptx）、Node.js、Windows の游ゴシック。
載せるのは出題対象（lv が A〜D）の札だけ。lv が空の札（ダミー読み専用）は載せない。
"""
import json
import os
import subprocess

from PIL import ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Mm, Pt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '手順書', 'Webかるた_用語リスト.pptx')

# ── レイアウト（A4縦, 単位はmm / pt）──
PAGE_W, PAGE_H = 210, 297
MARGIN_X = 8
TOP, BOTTOM = 18, 286          # 表を置ける上端と下端（上はページ見出しの下）
FIRST_PAGE_TOP = 56            # 1ページ目は競技要領を入れるので表が下から始まる
SET_W = 4.3                    # 「競技セット」は A〜D の4列に分け、該当する位置に記号を置く
COLS = [SET_W] * 4 + [9, 44, 123.8]   # 競技セット×4, 番号, 用語, 意味
FONT = '游ゴシック'
FONT_FILE = r'C:\Windows\Fonts\YuGothR.ttc'
SIZE = 6.6
PAD_X, PAD_Y = 0.8, 0.15       # セル内の余白
LINE_MM = 1.75 * SIZE * 0.3528  # 游ゴシックの1行の高さ（行間込みの見積り）
ROW_MIN = 4.5
BAND_H, HEAD_H = 6.6, 5.0      # 区分の帯と見出し行の高さ

BLACK = RGBColor(0, 0, 0)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
NAVY = RGBColor(0x00, 0x00, 0x99)
HEAD_BG = RGBColor(0xBF, 0xBF, 0xBF)
FRAME = '595959'

# 難易度ごとの帯の見出し（IT用語一覧.xlsm の区分の説明）
LEVELS = {
    'A': '難易度A：一般常識として覚えておきたい用語（容易）',
    'B': '難易度B：情報技術を扱う立場として覚えておきたい用語（標準）',
    'C': '難易度C：情報技術を構築する立場として覚えておきたい用語（中程度）',
    'D': '難易度D：情報技術を運営・管理する立場として覚えておきたい用語（高度）',
}


def load_cards():
    """ゲーム本体と同じ札データを Node 経由で読み、出題対象だけ返す。"""
    js = "process.stdout.write(JSON.stringify(require('./public/karuta-data.js')))"
    data = json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT).decode('utf-8'))
    return [k for k in data if k['lv'] in LEVELS]


# ── 行の高さの見積り（折り返し行数を実フォントの文字幅で数える）──
_measure = None


def line_count(text, width_mm):
    global _measure
    _measure = _measure or ImageFont.truetype(FONT_FILE, int(SIZE * 20))
    limit = (width_mm - PAD_X * 2 - 1.0) / 0.3528 * 20
    lines, cur = 1, ''
    for ch in text:
        if cur and _measure.getlength(cur + ch) > limit:
            lines, cur = lines + 1, ch
        else:
            cur += ch
    return lines


def row_height(card):
    n = max(line_count(card['tori'], COLS[5]), line_count(card['yomi'], COLS[6]))
    return max(ROW_MIN, n * LINE_MM + PAD_Y * 2 + 0.3)


# ── ページ分け：難易度ごとに帯＋見出し＋行を流し込む（番号は難易度ごとに1から）──
def paginate(cards):
    pages, page, y = [], [], FIRST_PAGE_TOP
    for level, title in LEVELS.items():
        rows = [k for k in cards if k['lv'] == level]
        block, first = None, True
        for no, card in enumerate(rows, start=1):
            h = row_height(card)
            need = h if block else BAND_H + HEAD_H + h
            if y + need > BOTTOM:
                pages.append(page)
                page, y, block = [], TOP, None
            if not block:
                label = f'{title}　全{len(rows)}語' + ('' if first else '（つづき）')
                block = {'title': label, 'y': y, 'rows': []}
                page.append(block)
                y += BAND_H + HEAD_H
                first = False
            block['rows'].append((no, card, h))
            y += h
        y += 4
    pages.append(page)
    return pages


# ── 描画部品 ──
def set_run(run, size, bold=False, color=BLACK):
    run.font.size, run.font.bold, run.font.name = Pt(size), bold, FONT
    run.font.color.rgb = color
    rpr = run._r.get_or_add_rPr()
    ea = rpr.find(qn('a:ea'))
    if ea is None:
        ea = rpr.makeelement(qn('a:ea'), {})
        rpr.find(qn('a:latin')).addnext(ea)
    ea.set('typeface', FONT)


def add_text(slide, x, y, w, h, text, size, bold=False, color=BLACK, align=PP_ALIGN.LEFT, fill=None):
    box = slide.shapes.add_textbox(Mm(x), Mm(y), Mm(w), Mm(h))
    if fill is not None:
        box.fill.solid()
        box.fill.fore_color.rgb = fill
    tf = box.text_frame
    tf.word_wrap, tf.auto_size = True, None
    tf.margin_left = tf.margin_right = Mm(1.5)
    tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    for i, line in enumerate(text.split('\n')):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        run.text = line
        set_run(run, size, bold, color)


def set_borders(cell, sides):
    """罫線を指定する。sides は左・右・上・下の順の (太さpt, 線種)。線種は 'solid' か 'sysDot'。"""
    tc_pr = cell._tc.get_or_add_tcPr()
    for pos, (tag, (width, dash)) in enumerate(zip(('a:lnL', 'a:lnR', 'a:lnT', 'a:lnB'), sides)):
        ln = tc_pr.makeelement(qn(tag), {'w': str(int(width * 12700)), 'cmpd': 'sng'})
        fill = ln.makeelement(qn('a:solidFill'), {})
        fill.append(fill.makeelement(qn('a:srgbClr'), {'val': FRAME}))
        ln.append(fill)
        ln.append(ln.makeelement(qn('a:prstDash'), {'val': dash}))
        tc_pr.insert(pos, ln)   # 罫線は塗りより前に置く必要がある


def set_cell(cell, text, fill=WHITE, bold=False, align=PP_ALIGN.LEFT):
    cell.fill.solid()
    cell.fill.fore_color.rgb = fill
    cell.margin_left = cell.margin_right = Mm(PAD_X)
    cell.margin_top = cell.margin_bottom = Mm(PAD_Y)
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = cell.text_frame.paragraphs[0]
    p.alignment = align
    # 空欄は既定の18ptで行が高くなるので、段落と段落末の文字サイズも指定する
    p.font.size = Pt(SIZE)
    end = p._p.find(qn('a:endParaRPr'))
    if end is None:
        end = p._p.makeelement(qn('a:endParaRPr'), {})
        p._p.append(end)
    end.set('sz', str(int(SIZE * 100)))
    if text:
        run = p.add_run()
        run.text = text
        set_run(run, SIZE, bold)
        p._p.append(end)   # endParaRPr は段落の最後に置く


def add_table(slide, block):
    add_text(slide, MARGIN_X, block['y'], sum(COLS), BAND_H - 0.5,
             '　　' + block['title'], 7.5, True, WHITE, fill=NAVY)
    heights = [HEAD_H] + [h for _, _, h in block['rows']]
    shape = slide.shapes.add_table(len(heights), len(COLS), Mm(MARGIN_X), Mm(block['y'] + BAND_H),
                                   Mm(sum(COLS)), Mm(sum(heights)))
    table = shape.table
    # 表スタイルは「スタイルなし」にして、塗りと罫線をセルごとに指定する
    tbl_pr = shape._element.graphic.graphicData.tbl
    tbl_pr.find(qn('a:tblPr')).find(qn('a:tableStyleId')).text = '{2D5ABB26-0587-4C30-8999-92F81FD0307C}'
    table.first_row, table.horz_banding = False, False
    for i, w in enumerate(COLS):
        table.columns[i].width = Mm(w)
    for r, h in enumerate(heights):
        table.rows[r].height = Mm(h)

    thin, thick, dot = (0.5, 'solid'), (1.5, 'solid'), (0.5, 'sysDot')
    last_row, last_col = len(heights) - 1, len(COLS) - 1
    for r in range(len(heights)):
        for c in range(len(COLS)):
            left = thick if c in (0, 4, 5) else (dot if c < 4 else thin)
            right = thick if c in (3, 4, last_col) else (dot if c < 3 else thin)
            top = thick if r <= 1 else thin
            bottom = thick if r in (0, last_row) else thin
            set_borders(table.cell(r, c), (left, right, top, bottom))

    for c, label in zip((0, 4, 5, 6), ('競技セット', '番号', '用語', '意味')):
        set_cell(table.cell(0, c), label, HEAD_BG, True, PP_ALIGN.CENTER)
    for c in range(1, 4):
        set_cell(table.cell(0, c), '', HEAD_BG)
    table.cell(0, 0).merge(table.cell(0, 3))
    for r, (no, card, _) in enumerate(block['rows'], start=1):
        for c, level in enumerate(LEVELS):
            set_cell(table.cell(r, c), level if card['lv'] == level else '', align=PP_ALIGN.CENTER)
        set_cell(table.cell(r, 4), str(no), align=PP_ALIGN.RIGHT)
        set_cell(table.cell(r, 5), card['tori'])
        set_cell(table.cell(r, 6), card['yomi'])


def add_rules(slide, counts, total):
    """1ページ目の上部：競技要領およびルール（Web版）。"""
    w = sum(COLS)
    add_text(slide, MARGIN_X, 17, w, 5, '競技要領およびルール', 8, True)
    lines = [
        f'札になる用語は、この一覧の全{total}語（' + '、'.join(f'{k}：{v}語' for k, v in counts.items()) + '）の中から選ばれます。',
        '試合が進むほど、競技セットは A から B・C・D の札へと替わっていきます。',
        '用語一覧の「意味」の部分が読み上げられますので、該当する「用語」の札を「そこまで」の前にマウスでクリックしてください。',
        '「読み上げます」の後、読み始めるまではマウスを定位置の円から出さないでください（フライングになります）。',
        '盤面に置かれていない札の文（空札）も読まれます。空札はこの一覧に載っていません。',
        '違う札を取るとお手つきとなり減点されます。',
        '早く、札の中心に近い位置を取るほど高得点です。定位置から遠い札ほど点が加算されます。',
    ]
    add_text(slide, MARGIN_X + 3, 22, w - 3, 31, '\n'.join(lines), 6.8)


def build():
    cards = load_cards()
    pages = paginate(cards)
    prs = Presentation()
    prs.slide_width, prs.slide_height = Mm(PAGE_W), Mm(PAGE_H)
    for n, page in enumerate(pages, start=1):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        add_text(slide, MARGIN_X, 8, sum(COLS), 7, 'YCCカルタ大会　用語一覧', 11, True, align=PP_ALIGN.CENTER)
        if n == 1:
            add_rules(slide, {lv: sum(1 for k in cards if k['lv'] == lv) for lv in LEVELS}, len(cards))
        for block in page:
            add_table(slide, block)
        add_text(slide, MARGIN_X, 289, sum(COLS), 5, f'{n} / {len(pages)}', 7, align=PP_ALIGN.CENTER)
    prs.save(OUT)
    print(f'{len(cards)} terms, {len(pages)} pages -> {OUT}')


if __name__ == '__main__':
    build()
