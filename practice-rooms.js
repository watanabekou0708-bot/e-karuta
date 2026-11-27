'use strict';
// 接続の振り分けと、一人ずつの練習。
//  ・接続した人は、まず大会用の部屋（全員で共有するロビー・大会モード）に入る
//  ・参加者が練習を始めると、その人だけの部屋を作り、試合の操作はその部屋に渡す
//  ・練習を終える（ロビーに戻る）か、大会が始まると、大会用の部屋に戻る
//  ・同じ接続元IP・同じ端末・同じ名前なら、ブラウザが違っても同じ人として扱う（後から開いた画面が引き継ぐ）
// 実機ボット(?bot=host)と内蔵の負荷テストの練習は、全員で同じ試合をする必要があるので大会用の部屋で行う。
const crypto = require('crypto');
const { createHub } = require('./room-hub.js');

const PRACTICE_KEEP_MS = +process.env.KARUTA_PRACTICE_KEEP_MS || 2 * 60 * 1000;   // 切断した練習を、同じ人が戻るまで残す時間
// 一人練習の部屋に渡す操作。ここに無い操作（参加登録・管理画面など）は、練習中でも大会用の部屋が受け取る
const PRACTICE_EVENTS = new Set([
  'start_next_round', 'read_next', 'decoy_finished', 'yomi_finished', 'announce_finished', 'announce_ready',
  'grab_card', 'flying', 'intro_started', 'cursor_ready', 'skip_memorize', 'debug_end_game', 'debug_cpu_points',
  'set_layout', 'sound_check_start', 'start_revival', 'start_next_revival_round', 'start_group_match', 'start_next_group_round',
]);

// 端末の特徴。参加ボタンを押した時点の値を使う（画面が隠れたまま読み込むと、接続時の画面サイズは 0 になることがある）。
// 画面サイズが取れていない値は、手がかりにしない
function deviceOf(real, payload) {
  const device = String((payload && payload.device) || (real.handshake.query && real.handshake.query.device) || '').slice(0, 80);
  return device.startsWith('0x0x') ? '' : device;
}

// 同じ人かどうかの鍵。端末の特徴か名前が無ければ作らない（別人をまとめないため）
function identityOf(ip, device, payload) {
  const name = payload && typeof payload === 'object' ? String(payload.name || '').trim() : '';
  if (!ip || !device || !name) return null;
  const parts = [ip, device, name, String(payload.grade || ''), String(payload.className || '')];
  return crypto.createHash('sha256').update(parts.join('\n')).digest('hex');
}

function createPracticeRooms({ io, createGameRoom, roomEnv, canStartPractice, isHostEligible, isInternalBot, accessLog, clientIpOf }) {
  const mainHub = createHub(io, 'main');
  const sessions = new Map();   // 接続id → { real, main, practice: { room, hub, member } | null, identity }
  const parked = new Map();     // 切断中の練習：identity → { room, hub, playerId, timer }
  let roomSerial = 0;

  const main = createGameRoom({ ...roomEnv, io: mainHub.io, isMain: true, recallPracticePlayers: recallAll });

  function closeRoom({ room, hub }) {
    room.destroy();
    hub.close();
  }

  // 参加者の一人練習を始める
  function startPractice(session, options) {
    const { real } = session;
    const player = main.gs.players[real.id];
    if (!player || !player.joined || main.gs.event.active || main.gs.phase !== 'lobby') return;
    if (!canStartPractice(real)) { roomEnv.logEvent('practice_denied', { id: real.id }); real.emit('practice_denied'); return; }

    const name = `practice-${++roomSerial}`;
    const hub = createHub(io, name);
    const room = createGameRoom({ ...roomEnv, io: hub.io, isMain: false, recallPracticePlayers: null,
      logEvent: (type, data = {}) => roomEnv.logEvent(type, { ...data, room: name }, { timing: false }),
      timing: roomEnv.silentTiming });
    player.eventReady = false;
    session.main.setHere(false);
    const member = hub.add(real);
    room.connect(member, { player: { ...player, score: 0, bonus: 0, cards: 0, misses: 0 } });
    session.practice = { room, hub, member };
    member.dispatch('start_game', [options]);
    if (room.gs.phase === 'lobby') { endPractice(session); return; }
    accessLog.practiceStarted(real.id);
  }

  // 一人練習を終えて、大会用の部屋のロビーに戻る
  function endPractice(session) {
    if (!session.practice) return;
    closeRoom(session.practice);
    session.practice = null;
    session.main.setHere(true);
    const { real } = session;
    real.emit('host_changed', { hostId: main.gs.hostId });
    real.emit('back_to_lobby', { players: main.gs.players, postTournament: false, humanGroups: null, bottomGroupWinners: null, middleGroupWinners: null });
    main.gs.projectorIds.delete(real.id);
  }

  // 大会を始めるとき：練習中の人を全員ロビーに呼び戻し、切断中の練習は片付ける
  function recallAll() {
    sessions.forEach(endPractice);
    parked.forEach(entry => { clearTimeout(entry.timer); closeRoom(entry); });
    parked.clear();
  }

  // 切断した人の練習を、同じ人が戻るまで少しの間残す
  function park(session) {
    const { practice, identity, real } = session;
    session.practice = null;
    practice.hub.remove(real.id);
    if (!identity) { closeRoom(practice); return; }
    const old = parked.get(identity);
    if (old) { clearTimeout(old.timer); closeRoom(old); }
    const entry = { room: practice.room, hub: practice.hub, playerId: real.id };
    entry.timer = setTimeout(() => { parked.delete(identity); closeRoom(entry); }, PRACTICE_KEEP_MS);
    parked.set(identity, entry);
  }

  // 残してある練習に、戻ってきた人を入れる
  function resumePractice(session) {
    const entry = session.identity && parked.get(session.identity);
    if (!entry || main.gs.event.active) return;
    parked.delete(session.identity);
    clearTimeout(entry.timer);
    const { real } = session;
    entry.room.movePlayer(entry.playerId, real.id);
    session.main.setHere(false);
    const member = entry.hub.add(real);
    entry.room.connect(member, { player: entry.room.gs.players[real.id] });
    session.practice = { room: entry.room, hub: entry.hub, member };
    entry.room.sendInitTo(member, 'resume_practice');
    entry.room.logEvent('practice_resumed', { id: real.id });
  }

  // 参加登録：同じ人の別の画面があれば閉じてから、いつもの参加登録を行う
  function handleSetName(session, args) {
    const { real } = session;
    const identity = isHostEligible(real) || isInternalBot(real) ? null
      : identityOf(clientIpOf(real).ip, deviceOf(real, args[0]), args[0]);
    if (identity) {
      sessions.forEach(other => {
        if (other === session || other.identity !== identity) return;
        roomEnv.logEvent('session_replaced', { from: other.real.id, to: real.id });
        other.real.emit('session_replaced');
        other.real.disconnect(true);   // この中で切断の処理（練習の保管など）まで終わる
      });
    }
    session.identity = identity;
    if (session.practice) return;   // 練習中の再送（再接続のとき）は、部屋の参加者のままにする
    session.main.dispatch('set_name', args);
    const player = main.gs.players[real.id];
    if (player && player.joined) {
      accessLog.joined(real.id, { identity, name: player.rawName || player.name, grade: player.grade, className: player.className });
      resumePractice(session);
    }
  }

  function dispatch(session, event, args) {
    const { real, practice } = session;
    if (event === 'set_name') { handleSetName(session, args); return; }
    if (event === 'grab_card') accessLog.clicked(real.id);
    if (event === 'start_game') {
      const options = args[0] || {};
      // 全員で同じ試合をする練習（実機ボットの開始・内蔵の負荷テスト）は、大会用の部屋で行う
      if (isInternalBot(real) || (options.noCpu && isHostEligible(real))) session.main.dispatch(event, args);
      else if (!practice) startPractice(session, options);
      return;
    }
    if (practice) {
      if (event === 'go_to_lobby') { endPractice(session); return; }
      if (PRACTICE_EVENTS.has(event)) { practice.member.dispatch(event, args); return; }
    }
    session.main.dispatch(event, args);
  }

  io.on('connection', real => {
    const session = { real, main: mainHub.add(real), practice: null, identity: null };
    sessions.set(real.id, session);
    accessLog.connected(real.id, { ...clientIpOf(real), device: real.handshake.query && real.handshake.query.device, excluded: isHostEligible(real) || isInternalBot(real) });
    main.connect(session.main);
    real.onAny((event, ...args) => dispatch(session, event, args));
    real.on('disconnect', () => {
      sessions.delete(real.id);
      if (session.practice) park(session);
      session.main.setHere(false);
      accessLog.disconnected(real.id);
      session.main.dispatch('disconnect', []);
      mainHub.remove(real.id);
    });
  });

  // 大会に参加しているか（接続ログの「遊んでいるか」の判定に使う）
  const isEventPlayer = id => main.gs.event.active && (main.gs.event.participantIds.has(id) || !!main.gs.event.history[id]);

  return { main, isEventPlayer, practiceCount: () => [...sessions.values()].filter(s => s.practice).length };
}

module.exports = { createPracticeRooms, identityOf };
