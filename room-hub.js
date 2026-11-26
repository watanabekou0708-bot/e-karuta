'use strict';
// 部屋ごとの通信の窓口。1つの接続(Socket.IO)を、部屋ごとの「接続」に分けて扱う。
//  ・部屋の io.emit() は、いまその部屋にいる人にだけ届く
//  ・部屋の外にいる間（大会用の部屋の人が一人練習をしている間など）は、その部屋からの送信は届かない
//  ・受け取った操作は、振り分け役(practice-rooms.js)が dispatch() で部屋の処理に渡す

// いまどの部屋にいても届ける必要がある通知（時刻合わせの返事・全体の設定の変更など）
const ALWAYS_DELIVER = new Set(['time_sync', 'student_practice', 'headphone_check_setting', 'server_going_down', 'server_control_result', 'session_replaced']);

function createHub(realIo, name) {
  const members = new Map();   // id → 部屋ごとの接続
  let closed = false;
  const isHere = member => !closed && member.here;

  const io = {
    emit(event, ...args) { if (!closed) realIo.to(name).emit(event, ...args); },
    to(id) {
      return { emit(event, ...args) { const member = members.get(id); if (member && isHere(member)) member.real.emit(event, ...args); } };
    },
    // いま部屋にいる接続の一覧（id → 接続）
    sockets: { get sockets() { return new Map([...members].filter(([, member]) => isHere(member))); } },
    engine: realIo.engine,
  };

  // 接続(real)をこの部屋に加える。同じ接続がすでにあれば、それを返す
  function add(real) {
    const handlers = new Map();
    const member = {
      id: real.id,
      real,
      handshake: real.handshake,
      data: real.data,
      here: true,
      on(event, handler) { handlers.set(event, handler); },
      emit(event, ...args) { if (isHere(member) || ALWAYS_DELIVER.has(event)) real.emit(event, ...args); },
      broadcast: { emit(event, ...args) { if (!closed) real.to(name).emit(event, ...args); } },
      dispatch(event, args) {
        const handler = handlers.get(event);
        if (!handler) return;
        try {
          const result = handler(...args);
          if (result && result.catch) result.catch(e => console.error(`[room ${name}] ${event}:`, e));
        } catch (e) { console.error(`[room ${name}] ${event}:`, e); }
      },
      // この部屋にいる・いないを切り替える（いない間はこの部屋の通知が届かない）
      setHere(here) {
        member.here = here;
        if (here) real.join(name); else real.leave(name);
      },
    };
    members.set(real.id, member);
    real.join(name);
    return member;
  }

  function remove(id) {
    const member = members.get(id);
    if (!member) return;
    member.setHere(false);
    members.delete(id);
  }

  // 部屋を閉じる。以後、この部屋からは何も送られない
  function close() {
    [...members.keys()].forEach(remove);
    closed = true;
  }

  return { io, add, remove, close };
}

module.exports = { createHub };
