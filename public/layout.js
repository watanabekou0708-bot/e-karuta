'use strict';
// 盤面の札の配置（全員同じ配置を作るため、サーバーとブラウザの両方で使う共通モジュール）。
// 盤面は論理サイズ 1280×880。札は 180×100px。座標は盤面の論理px・札の中心。
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KLayout = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const BOARD_W = 1280;
  const BOARD_H = 880;
  const CARD_W = 180, CARD_H = 100;
  const HOME = { x: BOARD_W / 2, y: BOARD_H - 46, r: 38 };
  const DROP_MARGIN = -5;

  function cardPolygon(cx, cy, w, h, deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), hw = w / 2, hh = h / 2;
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [cx + x * c - y * sn, cy + x * sn + y * c]);
  }
  // 2つの凸多角形が重なっているか（分離軸判定）
  function polysOverlap(A, B) {
    for (const P of [A, B]) {
      for (let i = 0; i < P.length; i++) {
        const p1 = P[i], p2 = P[(i + 1) % P.length];
        const nx = p1[1] - p2[1], ny = p2[0] - p1[0];
        let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
        for (const q of A) { const d = q[0] * nx + q[1] * ny; if (d < minA) minA = d; if (d > maxA) maxA = d; }
        for (const q of B) { const d = q[0] * nx + q[1] * ny; if (d < minB) minB = d; if (d > maxB) maxB = d; }
        if (maxA < minB || maxB < minA) return false;
      }
    }
    return true;
  }
  const HOME_KEEPOUT = cardPolygon(HOME.x, HOME.y, HOME.r * 2 + 56, HOME.r * 2 + 56, 0);

  // 上半分（相手側）・下半分（自分側）に、重ならないよう札を置く。
  // 乱雑に置ききれないときは段（棚）に並べて、必ず重ならないようにする。
  // random は乱数関数（テストで固定したいときに差し替える）。
  function generateLayout(cardOrder, random = Math.random) {
    const out = {};
    const half = Math.ceil(cardOrder.length / 2);
    const EDGE = 14, MARGIN = 10;
    const zones = [
      { name: 'top',    ids: cardOrder.slice(0, half), y0: EDGE,            y1: BOARD_H / 2 - 8 },
      { name: 'bottom', ids: cardOrder.slice(half),    y0: BOARD_H / 2 + 8, y1: BOARD_H - EDGE },
    ];
    const rotFor = (z, spread) => z.name === 'top'
      ? 180 + (random() * 24 - 12) * spread
      : (random() * 360 - 180) * spread;
    const w = CARD_W, h = CARD_H;

    const scatter = (z, obstacles) => {
      const res = {};
      const polys = [...obstacles];
      for (const id of z.ids) {
        let spot = null;
        for (let attempt = 0; attempt < 900 && !spot; attempt++) {
          const spread = attempt < 350 ? 1 : attempt < 650 ? 0.4 : 0.08;
          const rot = rotFor(z, spread);
          const a = rot * Math.PI / 180;
          const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
          const bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
          const xMin = bw / 2 + EDGE, xMax = BOARD_W - bw / 2 - EDGE;
          const yMin = z.y0 + bh / 2, yMax = z.y1 - bh / 2;
          if (xMax <= xMin || yMax <= yMin) continue;
          const x = xMin + random() * (xMax - xMin);
          const y = yMin + random() * (yMax - yMin);
          const poly = cardPolygon(x, y, w + MARGIN * 2, h + MARGIN * 2, rot);
          if (polysOverlap(poly, HOME_KEEPOUT) || polys.some(p => polysOverlap(poly, p))) continue;
          spot = { x, y, rot, poly };
        }
        if (!spot) return null;
        res[id] = spot;
        polys.push(spot.poly);
      }
      return res;
    };

    const shelf = (z) => {
      const gap = MARGIN * 2 + 4;
      const res = {};
      const pitch = 99 + gap;
      const kx0 = HOME.x - HOME.r - 34, kx1 = HOME.x + HOME.r + 34, ky0 = HOME.y - HOME.r - 34;
      let row = 0, x = EDGE;
      z.ids.forEach(id => {
        for (let guard = 0; guard < 50; guard++) {
          const cy = z.y0 + pitch / 2 + row * pitch;
          const hitsKeepout = cy + h / 2 + MARGIN > ky0 && x + w + MARGIN > kx0 && x - MARGIN < kx1;
          if (hitsKeepout) { x = kx1 + MARGIN + gap / 2; continue; }
          if (x + w > BOARD_W - EDGE) { row++; x = EDGE; continue; }
          const rot = z.name === 'top' ? 180 : 0;
          res[id] = { x: x + w / 2, y: cy, rot, poly: cardPolygon(x + w / 2, cy, w, h, rot) };
          x += w + gap;
          break;
        }
      });
      return res;
    };

    const obstacles = [HOME_KEEPOUT];
    zones.forEach(z => {
      let placed = null;
      for (let tries = 0; tries < 10 && !placed; tries++) placed = scatter(z, obstacles);
      if (!placed) placed = shelf(z);
      Object.entries(placed).forEach(([id, p]) => {
        out[id] = { x: p.x, y: p.y, rot: Math.round(p.rot), zone: z.name };
        obstacles.push(p.poly);
      });
    });
    return out;
  }

  // 受け取った配置の検査（サーバーが教卓PCからの配置を受けるとき）。問題があれば null。
  function sanitizeLayout(layout, cardOrder) {
    if (!layout || typeof layout !== 'object') return null;
    const out = {};
    for (const id of cardOrder) {
      const p = layout[id];
      if (!p || typeof p !== 'object') return null;
      const x = Number(p.x), y = Number(p.y), rot = Number(p.rot);
      if (![x, y, rot].every(Number.isFinite)) return null;
      if (x < 0 || x > BOARD_W || y < 0 || y > BOARD_H) return null;
      const zone = p.zone === 'top' ? 'top' : 'bottom';
      out[id] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, rot: Math.round(rot) % 360, zone };
    }
    return out;
  }

  return { BOARD_W, BOARD_H, CARD_W, CARD_H, HOME, DROP_MARGIN, cardPolygon, polysOverlap, generateLayout, sanitizeLayout };
});
