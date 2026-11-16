// Webかるた 起動管理プログラム（親プロセス）。
//   node launcher.js   （または 起動.bat をダブルクリック）
// server.js を子プロセスとして動かし、管理画面の「停止」「再起動」ボタンに応える。
//  ・終了コード 75 = 再起動 → すぐ起動し直す
//  ・終了コード 0  = 停止   → 同じポートに「起動」ボタンだけの画面を出して待つ（教卓PCからのみ操作可）
//  ・それ以外（異常終了）  → 3秒後に自動で起動し直す
// ここを閉じる（Ctrl+C）と、すべて終了する。
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3000;
let child = null;
let ctl = null;
let quitting = false;

function startServer() {
  closeControl();
  child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, KARUTA_SUPERVISED: '1' },
  });
  child.on('exit', (code) => {
    child = null;
    if (quitting) return;
    if (code === 75) { console.log('[launcher] 再起動します…'); setTimeout(startServer, 500); }
    else if (code === 0) { console.log('[launcher] サーバーを停止しました。起動ボタン待ち（http://localhost:' + PORT + '/）'); openControl(); }
    else { console.log('[launcher] サーバーが異常終了しました（コード ' + code + '）。3秒後に再起動します'); setTimeout(startServer, 3000); }
  });
}

function isLocal(req) {
  const a = req.socket.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

function openControl() {
  closeControl();
  ctl = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/start') {
      if (!isLocal(req)) { res.writeHead(403); return res.end('forbidden'); }
      res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok');
      setTimeout(startServer, 200);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Webかるた サーバー停止中</title>
<body style="font-family:sans-serif;text-align:center;padding:3rem">
<h1>⏹ サーバーは停止中です</h1>
${isLocal(req)
  ? '<p><button id="b" style="font-size:1.4rem;padding:.8rem 2rem">▶ サーバーを起動する</button></p>'
  : '<p>教卓PC（サーバーを動かしているパソコン）から操作してください。</p>'}
<script>
const b=document.getElementById('b');
if(b)b.onclick=async()=>{b.disabled=true;b.textContent='起動中…';await fetch('/start',{method:'POST'});
  const t=setInterval(async()=>{try{const r=await fetch('/socket.io/?EIO=4&transport=polling');if(r.ok){clearInterval(t);location.href='/admin.html?host=1';}}catch(e){}},1000);};
</script></body>`);
  });
  ctl.on('error', (e) => console.log('[launcher] 待機画面を開けませんでした: ' + e.message));
  ctl.listen(PORT, '0.0.0.0');
}
function closeControl() { if (ctl) { ctl.close(); ctl = null; } }

function quit() { quitting = true; closeControl(); if (child) child.kill(); setTimeout(() => process.exit(0), 300); }
process.on('SIGINT', quit);
process.on('SIGTERM', quit);

startServer();
