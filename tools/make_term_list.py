# -*- coding: utf-8 -*-
"""学生配布用の用語リスト（PPTX）を public/karuta-data.js から作る。

  python tools/make_term_list.py            … 手順書/Webかるた_用語リスト.pptx を作る
  PDF は tools/pptx_to_pdf.ps1 で PowerPoint から書き出す。

必要: python-pptx（pip install python-pptx）、Node.js、Windows の游ゴシック/メイリオ。
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
MARGIN_X = 9
TOP, BOTTOM = 14, 287          # 表を置ける上端と下端
FIRST_PAGE_TOP = 43            # 1ページ目は説明を入れるので表が下から始まる
COLS = [('No.', 10), ('難易度', 12), ('用語', 52), ('意味（読み上げられる文）', 118)]
FONT = 'メイリオ'
FONT_FILE = r'C:\Windows\Fonts\meiryo.ttc'
SIZE_BODY, SIZE_TERM = 7.5, 8
PAD_X, PAD_Y = 1.2, 0.35       # セル内の余白
LINE_MM = 1.55 * SIZE_TERM * 0.3528   # メイリオの1行の高さ（行間込みの見積り）
BAND_H, HEAD_H = 6.4, 5.2      # 分野の帯と見出し行の高さ

INK = RGBColor(0x14, 0x1B, 0x2D)
NAVY = RGBColor(0x17, 0x2A, 0x5A)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
HEAD_BG = RGBColor(0xD9, 0xDE, 0xE8)
STRIPE = RGBColor(0xF3, 0xF5, 0xF9)
LEVEL_BG = {'A': RGBColor(0xDD, 0xF1, 0xE2), 'B': RGBColor(0xDC, 0xEA, 0xF8),
            'C': RGBColor(0xFD, 0xEF, 0xD3), 'D': RGBColor(0xF9, 0xDE, 0xDE)}


def load_cards():
    """ゲーム本体と同じ札データを Node 経由で読み、出題対象だけ返す。"""
    js = "process.stdout.write(JSON.stringify(require('./public/karuta-data.js')))"
    data = json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT).decode('utf-8'))
    return [k for k in data if k['lv'] in LEVEL_BG]


# ── 行の高さの見積り（折り返し行数を実フォントの文字幅で数える）──
_fonts = {}


def line_count(text, width_mm, size_pt):
    font = _fonts.setdefault(size_pt, ImageFont.truetype(FONT_FILE, int(size_pt * 20)))
    limit = (width_mm - PAD_X * 2 - 0.8) / 0.3528 * 20
    lines, cur = 1, ''
    for ch in text:
        if cur and font.getlength(cur + ch) > limit:
            lines, cur = lines + 1, ch
        else:
            cur += ch
    return lines


def row_height(card):
    n = max(line_count(card['tori'], COLS[2][1], SIZE_TERM),
            line_count(card['yomi'], COLS[3][1], SIZE_BODY))
    return n * LINE_MM + PAD_Y * 2 + 0.2


# ── ページ分け：分野ごとに帯＋見出し＋行を流し込む ──
def paginate(cards):
    pages, page, y, no = [], [], FIRST_PAGE_TOP, 0
    genres = list(dict.fromkeys(k['genre'] for k in cards))
    for genre in genres:
        rows = [k for k in cards if k['genre'] == genre]
        block, first = None, True
        for card in rows:
            no += 1
            h = row_height(card)
            need = h if block else BAND_H + HEAD_H + h
            if y + need > BOTTOM:
                pages.append(page)
                page, y, block = [], TOP, None
            if not block:
                title = f'{genre}（{len(rows)}語）' + ('' if first else '　つづき')
                block = {'title': title, 'y': y, 'rows': []}
                page.append(block)
                y += BAND_H + HEAD_H
                first = False
            block['rows'].append((no, card, h))
            y += h
        y += 2.5
    pages.append(page)
    return pages


# ── 描画部品 ──
def set_run(run, size, bold=False, color=INK):
    run.font.size, run.font.bold, run.font.name = Pt(size), bold, FONT
    run.font.color.rgb = color
    rpr = run._r.get_or_add_rPr()
    ea = rpr.find(qn('a:ea'))
    if ea is None:
        ea = rpr.makeelement(qn('a:ea'), {})
        rpr.find(qn('a:latin')).addnext(ea)
    ea.set('typeface', FONT)


def add_text(slide, x, y, w, h, text, size, bold=False, color=INK, align=PP_ALIGN.LEFT, fill=None):
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


def set_cell(cell, text, size, fill, bold=False, align=PP_ALIGN.LEFT):
    cell.fill.solid()
    cell.fill.fore_color.rgb = fill
    cell.margin_left = cell.margin_right = Mm(PAD_X)
    cell.margin_top = cell.margin_bottom = Mm(PAD_Y)
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = cell.text_frame.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    set_run(run, size, bold)


def add_table(slide, block):
    add_text(slide, MARGIN_X, block['y'], PAGE_W - MARGIN_X * 2, BAND_H - 0.6,
             block['title'], 10, True, WHITE, fill=NAVY)
    heights = [HEAD_H] + [h for _, _, h in block['rows']]
    shape = slide.shapes.add_table(len(heights), len(COLS), Mm(MARGIN_X), Mm(block['y'] + BAND_H),
                                   Mm(sum(w for _, w in COLS)), Mm(sum(heights)))
    table = shape.table
    # 既定の表スタイルを外し、塗りはセルごとに指定する。罫線は「表スタイル（グリッド）」を使う
    tbl_pr = shape._element.graphic.graphicData.tbl
    tbl_pr.find(qn('a:tblPr')).find(qn('a:tableStyleId')).text = '{5940675A-B579-460E-94D1-54222C63F5DA}'
    table.first_row, table.horz_banding = True, False
    for i, (label, w) in enumerate(COLS):
        table.columns[i].width = Mm(w)
        set_cell(table.cell(0, i), label, SIZE_BODY, HEAD_BG, True,
                 PP_ALIGN.CENTER if i < 2 else PP_ALIGN.LEFT)
    for r, h in enumerate(heights):
        table.rows[r].height = Mm(h)
    for r, (no, card, _) in enumerate(block['rows'], start=1):
        bg = STRIPE if r % 2 == 0 else WHITE
        set_cell(table.cell(r, 0), str(no), SIZE_BODY, bg, align=PP_ALIGN.CENTER)
        set_cell(table.cell(r, 1), card['lv'], SIZE_TERM, LEVEL_BG[card['lv']], True, PP_ALIGN.CENTER)
        set_cell(table.cell(r, 2), card['tori'], SIZE_TERM, bg, True)
        set_cell(table.cell(r, 3), card['yomi'], SIZE_BODY, bg)


def add_intro(slide, total):
    """1ページ目の上部：題名と見方の説明。"""
    w = PAGE_W - MARGIN_X * 2
    add_text(slide, MARGIN_X, 8, w, 10, f'YCC Webかるた大会　用語リスト（全{total}語）', 17, True, NAVY, PP_ALIGN.CENTER)
    add_text(slide, MARGIN_X, 20, w, 15,
             '・札になる用語は、すべてこのリストの中から出ます。「意味」の文が読み上げられるので、当てはまる「用語」の札を取ってください。\n'
             '・このほかに、盤面に札がない文（ダミー読み）が読まれることもあります。ダミー読みはリストに載っていません。お手つきに注意しましょう。\n'
             '・同じ分野の中は、おおむね「五十音順 → 数字・英字順」などの元の並びです。', 7.8)
    add_text(slide, MARGIN_X, 36, w, 5,
             '難易度　A：一般常識（やさしい）　B：標準　C：中程度　D：高度　　※ 試合が進むほど B・C・D の札が増えます。', 7.8, True)


def build():
    cards = load_cards()
    pages = paginate(cards)
    prs = Presentation()
    prs.slide_width, prs.slide_height = Mm(PAGE_W), Mm(PAGE_H)
    for n, page in enumerate(pages, start=1):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        if n == 1:
            add_intro(slide, len(cards))
        for block in page:
            add_table(slide, block)
        add_text(slide, MARGIN_X, 289, PAGE_W - MARGIN_X * 2, 5, f'{n} / {len(pages)}', 8, align=PP_ALIGN.CENTER)
    prs.save(OUT)
    print(f'{len(cards)} terms, {len(pages)} pages -> {OUT}')


if __name__ == '__main__':
    build()
