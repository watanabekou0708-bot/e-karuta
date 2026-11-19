'use strict';
// アクセシビリティ（キーボード操作・スクリーンリーダー対応）。
// ゲームの進行ロジックには触れず、画面の属性・フォーカス・ショートカットだけを扱う。
//  ・各オーバーレイ(画面)に role="dialog" と名前を付ける
//  ・状況表示（読み上げ中・獲得通知・判定内訳）をスクリーンリーダーに通知する
//  ・画面が切り替わったら、その画面の主な操作ボタンにフォーカスを移す（Tab で探さなくても Enter で進められる）
//  ・フォーカスがどこにも無いとき、Enter で今の画面の主な操作を実行／Esc で表彰式スキップ
// 札を取る操作（仮想カーソルによるクリック）は、マウス操作の技能を競う競技の中身なので対象外。
(function () {
  const $ = id => document.getElementById(id);
  const visible = el => !!el && el.offsetParent !== null && !el.disabled && !el.closest('.hidden');

  // ── 1) 画面の役割と名前 ──
  const overlays = [...document.querySelectorAll('.overlay')];
  overlays.forEach(o => {
    o.setAttribute('role', o.id === 'oPause' ? 'alertdialog' : 'dialog');
    o.setAttribute('aria-modal', 'true');
    const title = o.querySelector('.ov-title');
    if (title) {
      if (!title.id) title.id = o.id + 'Title';
      o.setAttribute('aria-labelledby', title.id);
    }
  });

  // ── 2) 状況の読み上げ通知 ──
  [['readingText', 'status'], ['takenNotif', 'status'], ['scorePanel', 'status'], ['lockBanner', 'alert']].forEach(([id, role]) => {
    const el = $(id);
    if (!el) return;
    el.setAttribute('role', role);
    el.setAttribute('aria-live', role === 'alert' ? 'assertive' : 'polite');
    if (id === 'scorePanel') el.setAttribute('aria-atomic', 'false');
  });
  const readBtn = $('readBtn');
  if (readBtn) readBtn.setAttribute('aria-keyshortcuts', 'Enter');

  // ── 3) 画面が出たら主な操作にフォーカスを移す ──
  const PRIMARY = ['input:not([type=hidden])', '.btn-green', '.btn-mode', '.btn-blue', '.btn', 'button'];
  function primaryCandidates(root) {
    for (const sel of PRIMARY) {
      const list = [...root.querySelectorAll(sel)].filter(visible);
      if (list.length) return list;
    }
    return [];
  }
  function focusPrimary(root) {
    const c = primaryCandidates(root);
    if (c.length) c[0].focus({ preventScroll: true });
  }
  overlays.forEach(o => {
    let wasHidden = o.classList.contains('hidden');
    new MutationObserver(() => {
      const hidden = o.classList.contains('hidden');
      if (wasHidden && !hidden) requestAnimationFrame(() => focusPrimary(o));
      wasHidden = hidden;
    }).observe(o, { attributes: true, attributeFilter: ['class'] });
  });

  // ── 4) ショートカット ──
  const typing = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    // Esc：表彰式のスキップ
    if (e.key === 'Escape') {
      const cer = $('oCeremony');
      const skip = cer && cer.querySelector('.ceremony-skip-btn');
      if (visible(skip)) { e.preventDefault(); skip.click(); }
      return;
    }
    if (e.key !== 'Enter' || typing(document.activeElement)) return;
    // フォーカスがボタン等にあるときは、ブラウザ標準の動作（Enter/Space で押す）に任せる
    if (document.activeElement && document.activeElement !== document.body) return;
    const open = overlays.find(visible);
    if (open) {
      // 緑の主ボタンがちょうど1つなら、それを押す。選択肢が複数なら最初のものにフォーカスだけ移す
      const greens = [...open.querySelectorAll('.btn-green')].filter(visible);
      if (greens.length === 1) { e.preventDefault(); greens[0].click(); }
      else { focusPrimary(open); }
      return;
    }
    // 対局中：進行役の「次の上の句を読み上げる」ボタン（大会モード）
    if (visible(readBtn)) { e.preventDefault(); readBtn.click(); }
  });
})();
