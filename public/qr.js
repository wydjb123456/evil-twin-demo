/**
 * qr.js —— QR 码生成封装（教学演示用）
 * 底层使用内嵌的 MIT 开源库 qr-lib.js（qrcode-generator, Copyright (c) 2009 Kazuhiko Arase）
 * 用法：
 *   const rows = qr.encode('http://192.168.1.5:3002/wx.html?scene=wifi');
 *   qr.draw(canvas, rows, 6);   // 每模块 6px，自动加 4 模块白边
 */
(function (root) {
  'use strict';

  const qrcode = (typeof module !== 'undefined' && module.exports)
    ? require('./qr-lib.js')
    : root.qrcode;

  // 启用 UTF-8 编码（支持中文内容）
  if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  }

  // 生成矩阵（rows[r][c] = 0/1）
  function encode(text) {
    const q = qrcode(0, 'L'); // 类型 0 = 按内容自动选版本，纠错 L
    q.addData(String(text));
    q.make();
    const n = q.getModuleCount();
    const rows = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < n; c++) row.push(q.isDark(r, c) ? 1 : 0);
      rows.push(row);
    }
    return rows;
  }

  // 绘制到 canvas（白底 + 4 模块静区）
  function draw(canvas, rows, scale) {
    scale = scale || 6;
    const n = rows.length;
    const quiet = 4;
    canvas.width = (n + quiet * 2) * scale;
    canvas.height = canvas.width;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111111';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (rows[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { encode: encode, draw: draw };
  } else {
    root.qr = { encode: encode, draw: draw };
  }
})(typeof window !== 'undefined' ? window : globalThis);
