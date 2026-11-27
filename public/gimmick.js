'use strict';
// 仕掛け（ギミック）の画面表示。何を起こすかはサーバーが決めて read_card / decoy_read で届く。
//  underdog（下半分2倍）… 盤面を金枠にして、読み上げ欄に「あなたは2倍」か「下半分の人が2倍」を出す。
//  rotate（回転）       … 「読み上げます」から、札が順番にくるりと回る。
// どちらも「そこまで」で終わる。呼び出しは game.js。
window.KGimmick = (() => {
  const STEP_MS = 450;     // 次の札が回り始めるまでの間隔
  const TURN_MS = 1000;    // 1枚が1回転する時間
  const MIN_CYCLE_MS = 4500;   // 一巡する時間の下限（残りの札が少ないときも、回り続けにならないようにする）
  const MIN_SCALE = 0.5;
  const SWEEP_MARGIN = 6;  // 重なりを調べるときに加える余白(px)
  // 同時に回ることがある前後の札の枚数
  const NEIGHBORS_IN_TIME = Math.ceil(TURN_MS / STEP_MS) - 1;

  let current = null;   // 今の読みの仕掛け
  let spins = [];       // 回す札 [{ el, lay, scale, offset }]
  let frame = 0;

  const el = id => document.getElementById(id);

  // ── 下半分2倍の表示 ──
  function showGold(isTarget) {
    el('boardWrap').classList.add('gimmick-gold');
    const badge = el('gimmickBadge');
    badge.textContent = isTarget ? '✨ あなたは2倍！' : '✨ 下半分の人が2倍';
    badge.classList.toggle('target', isTarget);
    badge.classList.remove('hidden');
  }
  function hideGold() {
    el('boardWrap').classList.remove('gimmick-gold');
    el('gimmickBadge').classList.add('hidden');
  }

  // ── 回転 ──
  // 回しても隣の札に重ならない大きさを調べる。配置は端末ごとに違うので、回る札と順番は全員同じにして、
  // 重なりそうな端末では飛ばさずに小さくして回す（札の中心は動かないので、精度の点数は変わらない）
  function safeScale(id, ids, layout) {
    const { CARD_W: w, CARD_H: h, cardPolygon, polysOverlap } = window.KLayout;
    const me = layout[id];
    const others = ids.filter(o => o !== id).map(o => cardPolygon(layout[o].x, layout[o].y, w, h, layout[o].rot));
    for (let scale = 1; scale > MIN_SCALE; scale -= 0.05) {
      let hit = false;
      for (let deg = 0; deg < 180 && !hit; deg += 3) {
        // 調べる角度の間で角がかすらないように、少し大きめの形で調べる
        const turned = cardPolygon(me.x, me.y, w * scale + SWEEP_MARGIN, h * scale + SWEEP_MARGIN, deg);
        hit = others.some(poly => polysOverlap(turned, poly));
      }
      if (!hit) return scale;
    }
    return MIN_SCALE;
  }

  // 同じころに回る2枚は、回る範囲どうしも重ならないように、大きいほうから小さくする
  function separateConcurrent(list) {
    const radius = s => Math.hypot(window.KLayout.CARD_W, window.KLayout.CARD_H) / 2 * s.scale;
    list.forEach((a, i) => {
      for (let k = 1; k <= NEIGHBORS_IN_TIME; k++) {
        const b = list[(i + k) % list.length];
        if (b === a) continue;
        const distance = Math.hypot(a.lay.x - b.lay.x, a.lay.y - b.lay.y);
        while (radius(a) + radius(b) > distance) {
          const bigger = a.scale >= b.scale ? a : b;
          if (bigger.scale <= MIN_SCALE) break;
          bigger.scale = Math.max(MIN_SCALE, bigger.scale - 0.05);
        }
      }
    });
  }

  function startRotation(order, layout) {
    const onBoard = order.filter(id => {
      const card = el(`card-${id}`);
      return card && !card.classList.contains('removed') && layout[id];
    });
    const count = onBoard.length;
    if (!count) return;
    const cycle = Math.max(MIN_CYCLE_MS, count * STEP_MS);
    spins = onBoard.map((id, i) => ({ el: el(`card-${id}`), lay: layout[id], scale: safeScale(id, onBoard, layout), offset: i * STEP_MS }));
    separateConcurrent(spins);
    const startedAt = performance.now();
    const draw = now => {
      const passed = now - startedAt;
      spins.forEach(s => {
        const t = passed - s.offset;
        const p = t < 0 ? 0 : (t % cycle) / TURN_MS;
        const turning = p > 0 && p < 1;
        const eased = p * p * (3 - 2 * p);
        s.el.classList.toggle('gimmick-spin', turning);
        // 小さくして回す札は、回り始め（まだほとんど向きが変わらないうち）に縮め、回り終わりに戻す
        const scale = turning ? 1 - (1 - s.scale) * Math.min(1, Math.sin(Math.PI * p) * 12) : 1;
        s.el.style.transform = `rotate(${s.lay.rot + (turning ? eased * 360 : 0)}deg) scale(${scale})`;
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  }
  function stopRotation() {
    cancelAnimationFrame(frame);
    spins.forEach(s => {
      s.el.classList.remove('gimmick-spin');
      s.el.style.transform = `rotate(${s.lay.rot}deg)`;
    });
    spins = [];
  }

  // 「そこまで」や画面の切り替えで、仕掛けを片付ける
  function end() {
    current = null;
    stopRotation();
    hideGold();
  }

  return {
    // 読み上げの案内が始まるとき（gimmick が無い読みでは null）
    prepare(gimmick, myId) {
      end();
      current = gimmick || null;
      if (current && current.type === 'underdog') showGold(current.targetIds.includes(myId));
    },
    // 「読み上げます」の発声が始まった（ここから札を取れる）
    intro(layout) {
      if (current && current.type === 'rotate' && !spins.length) startRotation(current.order, layout);
    },
    // 自分が今の読みで2倍の対象か
    isTarget: myId => !!(current && current.type === 'underdog' && current.targetIds.includes(myId)),
    end,
  };
})();
