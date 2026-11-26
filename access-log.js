'use strict';
// 接続ログ：学外から「実際に遊んでいる人」がアクセスしているかを、30分ごとに logs/access-<起動日時>.csv に書き足す。
//  ・1行＝その30分間の1人。同じIP・同じ端末・同じ名前なら、ブラウザが違っても1行にまとめる
//  ・教卓PC（?host）と内蔵の負荷テストのボットは数えない
//  ・状況：「遊んでいる」＝札のクリック・練習の開始・大会への参加があった ／「参加のみ」＝名前を入れただけ
//          「画面を開いただけ」＝名前を入れていない ／「ページ取得のみ」＝画面の通信が始まらない（自動巡回など）
const fs = require('fs');
const net = require('net');
const path = require('path');

const HEADER = ['期間開始', '期間終了', '接続元IP', '区分', '状況', '名前', '学年', 'クラス', '札のクリック数', '練習の開始数', '大会に参加', '接続回数', 'ページ取得数'];

// 'a.b.c.d' や 'a.b.c.0/24'（IPv6も可）の一覧を、照合できる形にする
function ipList(entries) {
  const list = new net.BlockList();
  let size = 0;
  entries.map(e => String(e).trim()).filter(Boolean).forEach(entry => {
    const [address, prefix] = entry.split('/');
    const family = net.isIP(address);
    if (!family) { console.warn('[access] IPアドレスとして読めない設定です:', entry); return; }
    const type = family === 4 ? 'ipv4' : 'ipv6';
    if (prefix === undefined) list.addAddress(address, type); else list.addSubnet(address, Number(prefix), type);
    size++;
  });
  return { size, has: ip => !!net.isIP(ip) && list.check(ip, net.isIP(ip) === 4 ? 'ipv4' : 'ipv6') };
}

const plainIp = ip => String(ip || '').replace(/^::ffff:/, '');

function createIpResolver({ trustedProxies }) {
  const trusted = ipList(trustedProxies);
  let warned = false;
  // 接続元のIP。viaUnknownProxy=true は、中継サーバー経由なのに信頼する設定が無く、本当の接続元が分からない状態
  return function resolve(peerAddress, headers = {}) {
    const peer = plainIp(peerAddress);
    const forwarded = headers['x-real-ip'] || String(headers['x-forwarded-for'] || '').split(',').pop().trim();
    if (!forwarded) return { ip: peer, viaUnknownProxy: false };
    if (trusted.has(peer)) return { ip: plainIp(forwarded), viaUnknownProxy: false };
    if (!warned) {
      warned = true;
      console.warn(`[access] 中継サーバー(${peer})経由の接続です。本当の接続元を記録するには、network-config.js の trustedProxies にこのIPを書いてください。`);
    }
    return { ip: peer, viaUnknownProxy: true };
  };
}

// CSVの1項目。表計算ソフトで式として実行されないようにする
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const localTime = ms => new Date(ms).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });

function createAccessLog({ logDir, fileName, campusIps, intervalMs = 30 * 60 * 1000, isEventPlayer = () => false }) {
  const campus = ipList(campusIps);
  const file = path.join(logDir, fileName);
  const sockets = new Map();   // 接続id → { key, ip, viaUnknownProxy, excluded }
  let people = new Map();      // この30分の記録：key → 1人分
  let periodStart = Date.now();

  const areaOf = (ip, viaUnknownProxy) => (viaUnknownProxy || !campus.size ? '不明' : campus.has(ip) ? '学内' : '学外');
  function person(key, ip, viaUnknownProxy) {
    if (!people.has(key)) {
      people.set(key, { ip, area: areaOf(ip, viaUnknownProxy), name: '', grade: '', className: '', socket: false, clicks: 0, practices: 0, event: false, connections: 0, pages: 0 });
    }
    return people.get(key);
  }
  // 接続中の人の、今の期間の記録
  function current(id) {
    const s = sockets.get(id);
    if (!s || s.excluded) return null;
    const p = person(s.key, s.ip, s.viaUnknownProxy);
    p.socket = true;
    if (s.profile) Object.assign(p, s.profile);
    return p;
  }

  function statusOf(p) {
    if (p.clicks || p.practices || p.event) return '遊んでいる';
    if (p.name) return '参加のみ';
    return p.socket ? '画面を開いただけ' : 'ページ取得のみ';
  }

  // この期間の記録を書き出して、次の期間を始める
  function flush(now = Date.now()) {
    sockets.forEach((s, id) => {
      const p = current(id);   // 接続し続けている人も、この期間の行に入れる
      if (p && isEventPlayer(id)) p.event = true;
    });
    // 通信を始めた人がいるIPの「ページ取得」は、その人の行に足して、取得だけの行は作らない
    people.forEach((p, key) => {
      if (p.socket) return;
      const owner = [...people.values()].find(other => other.socket && other.ip === p.ip);
      if (owner) { owner.pages += p.pages; people.delete(key); }
    });
    const rows = [...people.values()].map(p => [
      localTime(periodStart), localTime(now), p.ip, p.area, statusOf(p), p.name, p.grade, p.className,
      p.clicks, p.practices, p.event ? 'はい' : 'いいえ', p.connections, p.pages,
    ].map(csvCell).join(','));
    people = new Map();
    periodStart = now;
    if (!rows.length) return;
    try {
      fs.mkdirSync(logDir, { recursive: true });
      const head = fs.existsSync(file) ? '' : '﻿' + HEADER.join(',') + '\r\n';   // 先頭のBOMはExcel用
      fs.appendFileSync(file, head + rows.join('\r\n') + '\r\n');
    } catch (e) { console.warn('[access] 接続ログを書けません:', e.message); }
  }

  const timer = setInterval(() => flush(), intervalMs);
  timer.unref();

  return {
    file,
    flush,
    pageHit({ ip, viaUnknownProxy }) { person(`page|${ip}`, ip, viaUnknownProxy).pages++; },
    connected(id, { ip, viaUnknownProxy, device, excluded }) {
      sockets.set(id, { key: `anon|${ip}|${device || ''}`, ip, viaUnknownProxy, excluded, profile: null });
      const p = current(id);
      if (p) p.connections++;
    },
    // 名前を入れて参加した。同じ人の鍵(identity)があれば、その人の行にまとめる
    joined(id, { identity, name, grade, className }) {
      const s = sockets.get(id);
      if (!s || s.excluded) return;
      const anonymous = people.get(s.key);
      const oldKey = s.key;
      s.key = identity || `name|${s.ip}|${name}`;
      s.profile = { name, grade: grade || '', className: className || '' };
      const p = current(id);
      if (anonymous && oldKey !== s.key && !anonymous.name) {
        ['connections', 'pages', 'clicks', 'practices'].forEach(k => { p[k] += anonymous[k]; });
        people.delete(oldKey);
      }
    },
    clicked(id) { const p = current(id); if (p) p.clicks++; },
    practiceStarted(id) { const p = current(id); if (p) p.practices++; },
    disconnected(id) {
      const p = current(id);
      if (p && isEventPlayer(id)) p.event = true;
      sockets.delete(id);
    },
  };
}

module.exports = { createAccessLog, createIpResolver };
