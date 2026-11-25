'use strict';
// サーバー自身に大量の仮想参加者（ボット）をループバック接続させ、本番同様に
// ロビー参加→読み上げ→クリック→採点のサイクルを回して負荷をかける。
// ブラウザではなくNode側（サーバー自身）でボットを動かすことで、
// 「負荷テストを見ているブラウザ」がボトルネックになったり、タブを閉じたら
// テストが止まってしまったりしないようにしている。
const { io } = require('./node_modules/socket.io/client-dist/socket.io.js');

const PING_INTERVAL_MS = 2000;
const PING_TIMEOUT_MS  = 3000;

class LoadTestRunner {
  constructor({ port, log, onStop, internalToken }) {
    this.port = port;
    this.internalToken = internalToken;   // 練習の開始を許可してもらうための合言葉（server.js）
    this.log  = log || (() => {});
    this.onStop = onStop || (() => {});
    this.bots = [];
    this.running   = false;
    this.startedAt = 0;
    this.stats = { connected: 0, errors: 0, disconnected: 0, pingSamples: [] };
    this.pingTimer = null;
    this.stopTimer = null;
  }

  start({ botCount = 100, durationMs = 5 * 60 * 1000 } = {}) {
    if (this.running) return false;
    this.running   = true;
    this.startedAt = Date.now();
    this.stats = { connected: 0, errors: 0, disconnected: 0, pingSamples: [] };
    this.bots = [];
    for (let i = 0; i < botCount; i++) this._spawnBot(i, i === 0);
    this.pingTimer = setInterval(() => this._pingAll(), PING_INTERVAL_MS);
    this.stopTimer = setTimeout(() => this.stop('duration_elapsed'), durationMs);
    this.log('loadtest_start', { botCount, durationMs });
    return true;
  }

  _spawnBot(idx, isHost) {
    const url = `http://127.0.0.1:${this.port}`;
    // forceNew必須：省略すると同じURLへの複数io()呼び出しが1本の接続に多重化されてしまい、
    // 「別々の端末が同時接続している」という負荷テストの前提が崩れる。
    const socket = io(url, { transports: ['websocket'], reconnection: false, forceNew: true, query: { internal: this.internalToken } });
    const name = `負荷LT${String(idx + 1).padStart(3, '0')}`;
    const bot = { idx, isHost, socket, name };
    this.bots.push(bot);

    socket.on('connect', () => {
      this.stats.connected++;
      socket.emit('set_name', { name });
      if (isHost) setTimeout(() => socket.emit('start_game', {}), 500);
    });
    socket.on('connect_error', e => {
      this.stats.errors++;
      this.log('loadtest_bot_error', { idx, error: String((e && e.message) || e) });
    });
    socket.on('disconnect', () => {
      this.stats.connected = Math.max(0, this.stats.connected - 1);
      this.stats.disconnected++;
    });

    // 仮想マウスカーソルの準備完了を即報告（本番の「準備できた」操作に相当）
    socket.on('ready_wait', () => setTimeout(() => socket.emit('cursor_ready'), 50 + Math.random() * 200));

    // 進行役ボットだけが試合を進める（読み上げ・次の札・結果発表後の次の試合）
    socket.on('memorize_start', () => {
      if (!isHost) return;
      const trySkip = () => socket.emit('skip_memorize');
      socket.once('voice_ready', trySkip);
      setTimeout(trySkip, 15000);   // 音声が揃わなくても一定時間で先に進む保険
    });
    socket.on('game_waiting', () => {
      if (!isHost) return;
      setTimeout(() => socket.emit('read_next'), 300 + Math.random() * 700);
    });

    const onRead = (d, isDecoy) => {
      socket.emit('intro_started', { t: Date.now() });
      if (isHost) {
        const simulatedYomiMs = 1000 + Math.random() * 7000;
        setTimeout(() => {
          if (isDecoy) socket.emit('decoy_finished');
          else socket.emit('yomi_finished', { cardId: d.card.id });
        }, simulatedYomiMs);
      }
      // 本番同様、何人かはこの札（ダミーなら何にクリックしても誤答）を取ろうとする
      if (Math.random() < 0.5) {
        const cardId = isDecoy ? d.id : d.card.id;
        setTimeout(() => {
          if (!socket.connected) return;
          socket.emit('grab_card', { cardId, t: Date.now(), offsetMm: Math.random() * 20, distMm: 10 + Math.random() * 280 });
        }, 200 + Math.random() * 2800);
      }
    };
    socket.on('read_card',  d => onRead(d, false));
    socket.on('decoy_read', d => onRead(d, true));

    const onAnnounce = () => {
      if (!isHost) return;
      setTimeout(() => socket.emit('announce_finished', {}), 50 + Math.random() * 200);
    };
    socket.on('card_taken', onAnnounce);
    socket.on('time_up', onAnnounce);

    // 試合が終わったら、延々と次の試合を続けてテスト時間いっぱい負荷をかけ続ける
    socket.on('round_finished', () => {
      if (!isHost) return;
      setTimeout(() => socket.emit('start_next_round'), 500 + Math.random() * 1000);
    });
  }

  // 全ボットから軽い往復確認(ack)を送り、サーバーが混雑時にどれだけ応答が遅れるかを測る。
  _pingAll() {
    const samples = [];
    let sent = 0;
    this.bots.forEach(b => {
      if (!b.socket.connected) return;
      sent++;
      const sentAt = Date.now();
      b.socket.timeout(PING_TIMEOUT_MS).emit('loadtest_ping', {}, err => {
        if (!err) samples.push(Date.now() - sentAt);
      });
    });
    setTimeout(() => {
      this.stats.pingSamples = samples;
      this.log('loadtest_ping_batch', {
        sent,
        respondedCount: samples.length,
        avgMs: samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : null,
        maxMs: samples.length ? Math.max(...samples) : null,
      });
    }, PING_TIMEOUT_MS + 300);
  }

  status() {
    const samples = this.stats.pingSamples || [];
    return {
      running:      this.running,
      startedAt:    this.startedAt,
      elapsedMs:    this.running ? Date.now() - this.startedAt : 0,
      botCount:     this.bots.length,
      connected:    this.stats.connected,
      errors:       this.stats.errors,
      disconnected: this.stats.disconnected,
      avgPingMs:    samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : null,
      maxPingMs:    samples.length ? Math.max(...samples) : null,
    };
  }

  stop(reason = 'manual') {
    if (!this.running) return false;
    this.running = false;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.bots.forEach(b => {
      // removeAllListeners() で 'disconnect' ハンドラも外れるため、接続数は
      // ここで直接0にする（非同期のdisconnectイベントを待つと一瞬ズレが出るため）。
      try { b.socket.removeAllListeners(); b.socket.close(); } catch (e) { /* 切断時の例外は無視 */ }
    });
    this.stats.connected = 0;
    this.log('loadtest_stop', { reason, finalStats: this.stats });
    this.bots = [];
    this.onStop(reason);
    return true;
  }
}

module.exports = { LoadTestRunner };
