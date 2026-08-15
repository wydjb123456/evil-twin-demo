/**
 * evil-twin-demo —— Evil Twin 钓鱼反诈教学演示
 *
 * 场景：攻击者架设同名假热点，受害者误连后在"认证页"输入 WiFi 密码，
 * 密码被攻击者捕获。本演示用本地网页模拟双方视角：
 *   1. public/index.html     —— 受害者视角（钓鱼认证页）
 *   2. public/attacker.html  —— 攻击者视角（暗黑终端控制台，实时看到捕获）
 *
 * 安全约束（本演示的底线）：
 *   - 捕获的"密码"只保存在内存数组里，不落盘、不传输、重启即清空
 *   - 页面带显著反诈警示，仅限课堂/教学演示
 *   - 不对真实网络、真实他人使用
 *
 * 真实 Evil Twin 需要的硬件链路（本机不具备）：
 *   树莓派/第二网卡 + hostapd(伪造热点) + dnsmasq(DHCP/DNS劫持) + 钓鱼页
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3002;
const captures = []; // 内存捕获表：{ t, src, label, pass, ua, ip }
let fakeSsid = 'FREE-WiFi_5G';
let publicUrl = ''; // 公网隧道地址，由 start-tunnel 脚本自动上报（Cloudflare 免费隧道地址会变）

// 局域网 IP（手机扫码需要，二维码指向 http://<lan-ip>:3002/...）
function lanIP() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '127.0.0.1';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
};

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // 受害者提交"密码"（模拟被钓鱼：src=et 假热点 / wx 微信扫码）
  if (url === '/api/capture' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { pass, src, label } = JSON.parse(body);
        captures.unshift({
          t: Date.now(),
          src: src === 'wx' ? 'wx' : 'et',
          label: typeof label === 'string' && label.trim() ? label.trim().slice(0, 40) : fakeSsid,
          pass: String(pass || '').slice(0, 64),
          ua: (req.headers['user-agent'] || '').slice(0, 120),
          ip: req.socket.remoteAddress,
        });
        if (captures.length > 50) captures.pop();
      } catch {}
      send(res, 200, JSON.stringify({ ok: true }), 'application/json');
    });
    return;
  }

  // 攻击者控制台拉取捕获列表
  if (url === '/api/captures') {
    send(res, 200, JSON.stringify({ ssid: fakeSsid, ip: lanIP(), publicUrl, count: captures.length, items: captures }), 'application/json');
    return;
  }

  // 隧道脚本自动上报公网地址（仅本机调用）
  if (url === '/api/public' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { url: u } = JSON.parse(body);
        if (typeof u === 'string' && /^https:\/\/[\w-]+\.trycloudflare\.com$/.test(u)) publicUrl = u;
      } catch {}
      send(res, 200, JSON.stringify({ ok: true, url: publicUrl }), 'application/json');
    });
    return;
  }

  // 演示后清空
  if (url === '/api/clear' && req.method === 'POST') {
    captures.length = 0;
    send(res, 200, JSON.stringify({ ok: true }), 'application/json');
    return;
  }

  // 攻击者改名假热点
  if (url === '/api/ssid' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { ssid } = JSON.parse(body);
        if (typeof ssid === 'string' && ssid.trim() && ssid.length <= 32) fakeSsid = ssid.trim();
      } catch {}
      send(res, 200, JSON.stringify({ ssid: fakeSsid }), 'application/json');
    });
    return;
  }

  // 静态文件
  const filePath = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    send(res, 200, fs.readFileSync(filePath), MIME[path.extname(filePath)] || 'application/octet-stream');
    return;
  }

  send(res, 404, 'Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[evil-twin-demo] 钓鱼演示服务已启动`);
  console.log(`[evil-twin-demo] 受害者页面: http://localhost:${PORT}/`);
  console.log(`[evil-twin-demo] 攻击者控制台: http://localhost:${PORT}/attacker.html`);
  console.log(`[evil-twin-demo] ⚠ 反诈教学演示，捕获数据仅存内存，勿用于非法用途`);
});
