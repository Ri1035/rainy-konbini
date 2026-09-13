/**
 * core.js — 基础工具：调色板、程序化贴图、三渲二材质、描边、构件工厂
 * 雨夜便利店街角微缩场景 / source of truth
 */
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ *
 * 确定性随机（保证每次生成的细节一致，方便迭代对比）
 * ------------------------------------------------------------------ */
let _seed = 20260913;
export function srand() {
  _seed = (_seed * 1664525 + 1013904223) % 4294967296;
  return _seed / 4294967296;
}
export const sr = (a, b) => a + srand() * (b - a);
export const sri = (a, b) => Math.floor(a + srand() * (b - a + 1));
export function spick(arr) { return arr[Math.floor(srand() * arr.length) % arr.length]; }

/* ------------------------------------------------------------------ *
 * 调色板 —— 夜晚：整体压暗、去饱和，靠灯光与霓虹提亮局部
 * ------------------------------------------------------------------ */
export const PAL = {
  // 地面
  asphalt: 0x3a3e48,
  asphaltLight: 0x343842,
  curb: 0x8f959d,
  sidewalk: 0xa8aeb6,
  sidewalkDark: 0x7c828a,
  paint: 0xd7dbe0,
  glassDark: 0x1b2230,

  // 建筑
  wall: 0xdad5cc,
  wallCool: 0xbfc4c9,
  wallDark: 0x6b7078,
  roof: 0x4a4f58,
  awning: 0x14543f,
  awningEdge: 0x1d7a5c,
  concrete: 0x8d9299,
  brick: 0x6e5a52,
  metal: 0x9aa1a8,
  metalDark: 0x4c525a,
  steel: 0xb9c0c7,
  wood: 0x7b5b3d,
  woodDark: 0x4d3826,
  rubber: 0x1d2026,
  plastic: 0xd8dce0,

  // 便利店品牌色（虚构 MART 24）
  brandGreen: 0x0f6b4f,
  brandMint: 0x2ec08a,
  brandOrange: 0xf2933a,
  brandRed: 0xd8453c,
  brandBlue: 0x2b7fd4,

  // 灯光
  warm: 0xffd9a3,
  warmBright: 0xfff0d2,
  cool: 0xcfe4ff,
  neonPink: 0xff6fa8,
  neonBlue: 0x59c8ff,
  neonGreen: 0x66ffa8,
  sky: 0x121a2c,
};

/* ------------------------------------------------------------------ *
 * 程序化贴图（canvas → CanvasTexture）
 * ------------------------------------------------------------------ */
export function canvasTex(w, h, draw, opt = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opt.repeat) t.repeat.set(opt.repeat[0], opt.repeat[1]);
  if (opt.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = opt.aniso || 8;
  t.needsUpdate = true;
  return t;
}

const css = (hex) => '#' + new THREE.Color(hex).getHexString();

/** 沥青：深灰底 + 细颗粒 + 补丁 */
export function texAsphalt() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = css(PAL.asphalt); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const x = srand() * w, y = srand() * h, r = sr(0.6, 2.0);
      const v = 0.5 + srand() * 0.6;
      ctx.fillStyle = `rgba(${Math.floor(60 * v)},${Math.floor(64 * v)},${Math.floor(74 * v)},0.5)`;
      ctx.fillRect(x, y, r, r);
    }
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      const x = srand() * w, y = srand() * h;
      ctx.fillStyle = `rgba(20,22,28,${sr(0.05, 0.16)})`;
      ctx.ellipse(x, y, sr(20, 90), sr(16, 70), srand() * TAU, 0, TAU);
      ctx.fill();
    }
  }, { repeat: [8, 8] });
}

/** 人行道方砖 */
export function texTile(bg = PAL.sidewalk, line = 0.72, n = 4) {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = css(bg); ctx.fillRect(0, 0, w, h);
    const s = w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = sr(-0.05, 0.05);
        const c = new THREE.Color(bg).offsetHSL(0, 0, v);
        ctx.fillStyle = css(c.getHex());
        ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
        // 颗粒
        for (let k = 0; k < 60; k++) {
          ctx.fillStyle = `rgba(255,255,255,${sr(0.01, 0.05)})`;
          ctx.fillRect(i * s + srand() * s, j * s + srand() * s, 2, 2);
        }
      }
    }
    ctx.strokeStyle = `rgba(30,32,38,${line})`;
    ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
    }
  }, { repeat: [1, 1] });
}

/** 店内浅色地砖 */
export function texFloorIndoor() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e6e3dc'; ctx.fillRect(0, 0, w, h);
    const s = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const c = new THREE.Color('#e6e3dc').offsetHSL(0, 0, sr(-0.02, 0.02));
      ctx.fillStyle = css(c.getHex());
      ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = `rgba(120,118,110,${sr(0.02, 0.07)})`;
        ctx.fillRect(i * s + srand() * s, j * s + srand() * s, sr(2, 8), 2);
      }
    }
    ctx.strokeStyle = 'rgba(150,146,138,0.75)'; ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
    }
  }, { repeat: [5, 5] });
}

/** 墙面：白色瓷砖 + 竖向分缝（便利店外墙） */
export function texFacade(base = PAL.wall) {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(255,255,255,${sr(0.01, 0.05)})`;
      ctx.fillRect(srand() * w, srand() * h, sr(1, 3), sr(1, 3));
    }
    ctx.strokeStyle = 'rgba(120,118,112,0.35)'; ctx.lineWidth = 2;
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * w / 8, 0); ctx.lineTo(i * w / 8, h); ctx.stroke(); }
    // 雨渍
    for (let i = 0; i < 24; i++) {
      const x = srand() * w;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(70,72,78,0.16)');
      g.addColorStop(1, 'rgba(70,72,78,0.02)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, sr(3, 12), h);
    }
  }, { repeat: [3, 3] });
}

/* -------- 商品贴图：用色块矩阵模拟密集的商品陈列 -------- */
const GOODS_PALETTE = {
  snack: ['#e8514b', '#f2a13a', '#3fa9d8', '#7bc86c', '#f0d64d', '#c86ad8', '#e07a3a', '#4d6fd8'],
  noodle: ['#e04a3c', '#f0b13c', '#d8443c', '#f5f0e2', '#c0392b', '#e67e22'],
  drink: ['#e94f4f', '#3a7fd5', '#f2c53d', '#5ec46a', '#e8e2d0', '#8e5ad8', '#f07a3a'],
  bento: ['#e8e0d2', '#d84a3a', '#3f7f4a', '#e8b93a', '#f2ede2', '#a8543a'],
  bread: ['#e6c07a', '#d8a45a', '#f0e0c0', '#c88a4a'],
  magazine: ['#e84a6a', '#3fa9d8', '#f2d03a', '#5ec46a', '#8e5ad8', '#f07a3a', '#e8e8e8', '#2b7fd4'],
  house: ['#d8d2c4', '#a8b0b8', '#e8e2d0', '#8f9aa4'],
};

export function texGoods(kind = 'snack', cols = 6, rows = 4, seedShift = 0) {
  return canvasTex(512, 512, (ctx, w, h) => {
    // 货架背板
    ctx.fillStyle = '#efece4'; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    const pal = GOODS_PALETTE[kind] || GOODS_PALETTE.snack;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * cw, y = j * ch;
        const c = pal[(i * 3 + j * 5 + seedShift) % pal.length];
        const pad = kind === 'magazine' ? 3 : 6;
        const bw = cw - pad * 2, bh = ch - pad * 2;
        ctx.save();
        if (kind === 'drink') {
          // 瓶/罐轮廓
          const isCan = (i + j) % 2 === 0;
          ctx.fillStyle = c;
          if (isCan) {
            ctx.beginPath(); ctx.roundRect(x + pad + bw * 0.12, y + pad, bw * 0.76, bh, 4); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillRect(x + pad + bw * 0.12, y + pad + bh * 0.18, bw * 0.76, bh * 0.16);
          } else {
            ctx.beginPath(); ctx.roundRect(x + pad + bw * 0.14, y + pad + bh * 0.1, bw * 0.72, bh * 0.9, 6); ctx.fill();
            ctx.fillStyle = c; ctx.fillRect(x + pad + bw * 0.32, y + pad + bh * 0.02, bw * 0.36, bh * 0.12);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillRect(x + pad + bw * 0.14, y + pad + bh * 0.34, bw * 0.72, bh * 0.2);
            ctx.fillRect(x + pad + bw * 0.2, y + pad + bh * 0.62, bw * 0.2, bh * 0.28);
          }
        } else if (kind === 'onigiri') {
          ctx.fillStyle = '#f5f2ea';
          ctx.beginPath();
          ctx.moveTo(x + cw / 2, y + pad + 4);
          ctx.lineTo(x + cw - pad, y + ch - pad - 2);
          ctx.lineTo(x + pad, y + ch - pad - 2);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = c;
          ctx.fillRect(x + cw * 0.34, y + ch * 0.55, cw * 0.32, ch * 0.28);
          ctx.strokeStyle = 'rgba(120,110,100,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        } else if (kind === 'bento') {
          ctx.fillStyle = '#f2efe7';
          ctx.beginPath(); ctx.roundRect(x + pad, y + pad + bh * 0.1, bw, bh * 0.85, 4); ctx.fill();
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.roundRect(x + pad + bw * 0.1, y + pad + bh * 0.24, bw * 0.5, bh * 0.34, 3); ctx.fill();
          ctx.fillStyle = '#e8b93a';
          ctx.beginPath(); ctx.roundRect(x + pad + bw * 0.63, y + pad + bh * 0.26, bw * 0.26, bh * 0.3, 3); ctx.fill();
          ctx.fillStyle = '#3f7f4a';
          ctx.beginPath(); ctx.roundRect(x + pad + bw * 0.12, y + pad + bh * 0.64, bw * 0.76, bh * 0.22, 3); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + pad + bw * 0.06, y + pad + bh * 0.14, bw * 0.2, bh * 0.7);
        } else if (kind === 'magazine') {
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.roundRect(x + pad, y + pad, bw, bh, 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(x + pad, y + pad, bw, bh * 0.22);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(x + pad + bw * 0.1, y + pad + bh * 0.4, bw * 0.6, bh * 0.08);
          ctx.fillRect(x + pad + bw * 0.1, y + pad + bh * 0.55, bw * 0.45, bh * 0.06);
          ctx.fillRect(x + pad + bw * 0.1, y + pad + bh * 0.67, bw * 0.52, bh * 0.06);
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(x + pad + bw * 0.58, y + pad + bh * 0.25, bw * 0.3, bh * 0.1);
        } else {
          // 袋装零食：圆角袋 + 高光 + 色带
          ctx.fillStyle = c;
          ctx.beginPath(); ctx.roundRect(x + pad, y + pad, bw, bh, 5); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillRect(x + pad + bw * 0.08, y + pad + bh * 0.16, bw * 0.84, bh * 0.3);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x + pad + bw * 0.12, y + pad + bh * 0.6, bw * 0.6, bh * 0.1);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + pad + bw * 0.06, y + pad + bh * 0.06, bw * 0.16, bh * 0.88);
        }
        ctx.restore();
      }
    }
    // 层板阴影
    ctx.fillStyle = 'rgba(40,40,46,0.35)';
    for (let j = 1; j < rows; j++) ctx.fillRect(0, j * ch - 4, w, 5);
    ctx.fillRect(0, h - 5, w, 5);
  }, { aniso: 8 });
}

/* -------- 招牌 / 文字类贴图 -------- */
function drawText(ctx, text, x, y, size, color, weight = 'bold', align = 'left', font = 'Arial, Helvetica, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** 主招牌（横） */
export function texMainSign() {
  return canvasTex(1024, 176, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f7fbf9');
    g.addColorStop(1, '#e2efe8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 品牌色带
    ctx.fillStyle = css(PAL.brandGreen); ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = css(PAL.brandOrange); ctx.fillRect(0, 16, w, 7);
    ctx.fillStyle = css(PAL.brandMint); ctx.fillRect(0, 23, w, 5);
    ctx.fillStyle = css(PAL.brandGreen); ctx.fillRect(0, h - 14, w, 14);
    // 左：24 徽标
    ctx.fillStyle = css(PAL.brandGreen);
    ctx.beginPath(); ctx.roundRect(46, 44, 116, 88, 14); ctx.fill();
    drawText(ctx, '24', 104, 90, 62, '#ffffff', 'bold', 'center');
    drawText(ctx, 'OPEN', 104, 122, 15, '#d9f5e8', 'bold', 'center');
    // 主名
    drawText(ctx, 'MART 24', 196, 84, 62, css(PAL.brandGreen), 'bold', 'left');
    drawText(ctx, 'CONVENIENCE  STORE', 202, 122, 19, '#6b7a72', 'bold', 'left');
    // 右侧小字
    drawText(ctx, 'OPEN 24 HOURS', 970, 74, 24, css(PAL.brandOrange), 'bold', 'right');
    drawText(ctx, 'FRESH  FOOD  ·  DRINKS', 970, 106, 17, '#7b8a82', 'bold', 'right');
    drawText(ctx, 'ATM  ·  COPY  ·  COFFEE', 970, 132, 15, '#9aa6a0', 'normal', 'right');
  }, { repeat: [1, 1] });
}

/** 门头灯箱（自动门上方） */
export function texDoorSign() {
  return canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4f7f5'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(PAL.brandGreen); ctx.fillRect(0, 0, 10, h); ctx.fillRect(w - 10, 0, 10, h);
    drawText(ctx, 'WELCOME', 256, 44, 40, css(PAL.brandGreen), 'bold', 'center');
    drawText(ctx, 'OPEN 24H', 256, 92, 30, css(PAL.brandOrange), 'bold', 'center');
  });
}

/** 竖向灯箱 */
export function texVertSign() {
  return canvasTex(160, 640, (ctx, w, h) => {
    ctx.fillStyle = '#f6faf7'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(PAL.brandGreen); ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = css(PAL.brandOrange); ctx.fillRect(0, 26, w, 10);
    drawText(ctx, 'MART', w / 2, 96, 46, css(PAL.brandGreen), 'bold', 'center');
    drawText(ctx, '24', w / 2, 176, 76, css(PAL.brandOrange), 'bold', 'center');
    ctx.strokeStyle = css(PAL.brandMint); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(22, 232); ctx.lineTo(w - 22, 232); ctx.stroke();
    drawText(ctx, 'CONVENIENCE', w / 2, 282, 19, '#6b7a72', 'bold', 'center');
    drawText(ctx, 'STORE', w / 2, 308, 19, '#6b7a72', 'bold', 'center');
    drawText(ctx, '24', w / 2, 400, 58, css(PAL.brandGreen), 'bold', 'center');
    drawText(ctx, 'HOURS', w / 2, 458, 22, '#6b7a72', 'bold', 'center');
    ctx.fillStyle = css(PAL.brandGreen); ctx.fillRect(0, h - 30, w, 30);
    drawText(ctx, 'ATM · COFFEE', w / 2, h - 16, 17, '#ffffff', 'bold', 'center');
  });
}

/** 店内墙面海报 */
export function texPoster(variant = 0) {
  return canvasTex(256, 384, (ctx, w, h) => {
    const themes = [
      { bg: '#f6f1e4', a: '#d8453c', b: '#f2933a', t1: 'NEW', t2: 'SWEETS', t3: 'LIMITED' },
      { bg: '#e8f2fa', a: '#2b7fd4', b: '#59c8ff', t1: 'COLD', t2: 'DRINKS', t3: '¥128~' },
      { bg: '#fdf3e2', a: '#c8761f', b: '#f2933a', t1: 'HOT', t2: 'COFFEE', t3: 'FRESH' },
      { bg: '#eef7ee', a: '#1f8a5c', b: '#66d68a', t1: 'BENTO', t2: 'HALF', t3: 'PRICE 19:00' },
      { bg: '#f4ecf8', a: '#7a4fbf', b: '#c08ae8', t1: 'FAIR', t2: 'CAMPAIGN', t3: 'POINT x2' },
      { bg: '#fbecec', a: '#c0392b', b: '#e8746a', t1: 'RAMEN', t2: 'NOODLE', t3: 'HOT & SPICY' },
    ];
    const t = themes[variant % themes.length];
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = t.a; ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 12, w, 12);
    ctx.fillStyle = t.b;
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.22, 0, TAU); ctx.fill();
    drawText(ctx, t.t1, w / 2, h * 0.34, 30, t.a, 'bold', 'center');
    drawText(ctx, t.t2, w / 2, h * 0.44, 24, t.a, 'bold', 'center');
    ctx.fillStyle = t.a; ctx.fillRect(20, h * 0.62, w - 40, 40);
    drawText(ctx, t.t3, w / 2, h * 0.62 + 20, 20, '#ffffff', 'bold', 'center');
    drawText(ctx, 'MART 24', w / 2, h * 0.85, 18, '#8a8a86', 'bold', 'center');
  });
}

/** 自动贩卖机正面 */
export function texVending() {
  return canvasTex(384, 640, (ctx, w, h) => {
    ctx.fillStyle = '#e9eef1'; ctx.fillRect(0, 0, w, h);
    // 顶部灯箱
    ctx.fillStyle = css(PAL.brandRed); ctx.fillRect(0, 0, w, 78);
    drawText(ctx, 'DRINK', w / 2, 30, 30, '#ffffff', 'bold', 'center');
    drawText(ctx, 'COLD & HOT', w / 2, 58, 18, '#ffe3d8', 'bold', 'center');
    // 商品展示窗
    ctx.fillStyle = '#1b222a'; ctx.fillRect(14, 92, w - 28, 288);
    const pal = GOODS_PALETTE.drink;
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 4; i++) {
        const x = 22 + i * 86, y = 100 + j * 92;
        ctx.fillStyle = pal[(i + j * 3) % pal.length];
        ctx.beginPath(); ctx.roundRect(x + 10, y + 12, 52, 70, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(x + 14, y + 30, 44, 18);
        ctx.fillStyle = '#f2f5f7';
        ctx.fillRect(x + 6, y + 84, 62, 6);
      }
    }
    // 编组按钮
    ctx.fillStyle = '#c9d2d8'; ctx.fillRect(14, 392, w - 28, 26);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#9aa6ae' : '#e6ebee';
      ctx.fillRect(24 + i * 42, 396, 32, 18);
    }
    // 取物口 + 价格牌
    ctx.fillStyle = '#8d949a'; ctx.fillRect(40, 470, w - 80, 60);
    drawText(ctx, '¥130', w / 2, 442, 30, css(PAL.brandRed), 'bold', 'center');
    ctx.fillStyle = '#dfe5e9'; ctx.fillRect(40, 552, w - 80, 44);
    drawText(ctx, 'PUSH', w / 2, 574, 22, '#79838a', 'bold', 'center');
    // 压克力门反光
    const g = ctx.createLinearGradient(0, 92, w, 380);
    g.addColorStop(0, 'rgba(255,255,255,0.20)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.03)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = g; ctx.fillRect(14, 92, w - 28, 288);
  });
}

/** 贩卖机侧/后（灰白） */
export function texVendingSide() {
  return canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d5dade'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(120,126,132,${sr(0.02, 0.08)})`;
      ctx.fillRect(srand() * w, srand() * h, 2, 2);
    }
    ctx.fillStyle = 'rgba(90,96,102,0.35)';
    ctx.fillRect(0, 0, w, 10);
    for (let i = 0; i < 12; i++) ctx.fillRect(0, 20 + i * 20, w, 1);
  });
}

/** 公告栏 */
export function texBoard() {
  return canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#c8a878'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(160,130,90,${sr(0.05, 0.2)})`;
      ctx.fillRect(srand() * w, srand() * h, sr(1, 4), sr(1, 3));
    }
    const cols = ['#f6f1e4', '#eaf2f8', '#f8ecec', '#eef7ee', '#fdf3e2'];
    for (let i = 0; i < 7; i++) {
      const x = sr(20, w - 150), y = sr(20, h - 130), bw = sr(90, 150), bh = sr(80, 120);
      ctx.save(); ctx.translate(x + bw / 2, y + bh / 2); ctx.rotate(sr(-0.07, 0.07));
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(-bw / 2 + 3, -bh / 2 + 3, bw, bh);
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.fillStyle = ['#d8453c', '#2b7fd4', '#1f8a5c', '#c8761f'][i % 4];
      ctx.fillRect(-bw / 2 + 8, -bh / 2 + 10, bw - 16, 14);
      ctx.fillStyle = 'rgba(90,90,86,0.65)';
      for (let k = 0; k < 5; k++) ctx.fillRect(-bw / 2 + 10, -bh / 2 + 36 + k * 13, (bw - 24) * sr(0.4, 1), 5);
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(bw / 2 - 10, -bh / 2 + 8, 5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  });
}

/** 路牌（蓝底白字，抽象文字避免字体缺失） */
export function texRoadSign(kind = 0) {
  if (kind === 0) {
    return canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#1c4f9c'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#ffffff';
      // 抽象街名字形
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
        ctx.fillRect(34 + i * 48, 84 + r * 56, 34, 8);
        ctx.fillRect(34 + i * 48 + 12, 70 + r * 56, 8, 36);
      }
    });
  }
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1c4f9c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#ffffff';
    // 箭头（单行道）
    ctx.beginPath();
    ctx.moveTo(64, 128); ctx.lineTo(150, 128);
    ctx.lineTo(150, 96); ctx.lineTo(206, 128); ctx.lineTo(150, 160); ctx.lineTo(150, 128);
    ctx.fill();
    ctx.fillRect(48, 120, 24, 16);
  });
}

/** 停车位 P 牌 */
export function texParkSign() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1c4f9c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.strokeRect(12, 12, w - 24, h - 24);
    drawText(ctx, 'P', w / 2, h / 2 + 6, 150, '#ffffff', 'bold', 'center');
  });
}

/** 橱窗宣传条幅 */
export function texWindowBanner() {
  return canvasTex(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4f7f5'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(PAL.brandOrange); ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = css(PAL.brandMint); ctx.fillRect(0, h - 8, w, 8);
    drawText(ctx, 'HOT  COFFEE', 60, 64, 46, css(PAL.brandGreen), 'bold', 'left');
    drawText(ctx, '¥120', 60 + 330, 66, 50, css(PAL.brandRed), 'bold', 'left');
    drawText(ctx, 'BENTO  ¥398~', 620, 64, 40, css(PAL.brandOrange), 'bold', 'left');
  });
}

/** 关东煮 / 热食柜台牌子 */
export function texOdenSign() {
  return canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fdf6ec'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 8, w, 8);
    drawText(ctx, 'HOT FOOD', 26, 44, 34, '#c0392b', 'bold', 'left');
    drawText(ctx, 'ODEN · STEAMED', 26, 88, 26, '#8a6a4a', 'bold', 'left');
    ctx.fillStyle = '#e8b93a';
    ctx.beginPath(); ctx.arc(w - 70, h / 2, 34, 0, TAU); ctx.fill();
    drawText(ctx, '¥90', w - 70, h / 2 + 2, 30, '#7a4a1a', 'bold', 'center');
  });
}

/** 杂志架上的杂志（一张纹理贴多个封面） */
export function texMagRack() { return texGoods('magazine', 5, 3, 2); }

/** 饮料柜内部（整面瓶装饮料） */
export function texCoolerInside() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#eef4f7'; ctx.fillRect(0, 0, w, h);
    const pal = GOODS_PALETTE.drink;
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 10; i++) {
        const x = 6 + i * 50, y = 8 + j * 100;
        const c = pal[(i * 2 + j) % pal.length];
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.roundRect(x + 8, y + 10, 34, 76, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.fillRect(x + 10, y + 30, 30, 20);
        ctx.fillRect(x + 12, y + 60, 26, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x + 10, y + 12, 6, 72);
        // 层板
        ctx.fillStyle = '#dfe6ea'; ctx.fillRect(x, y + 92, 50, 6);
      }
    }
    ctx.fillStyle = 'rgba(30,40,50,0.16)'; ctx.fillRect(0, 0, w, h);
  }, { aniso: 8 });
}

/** 冰柜（冰淇淋）内部 */
export function texFreezerInside() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f2f7fb'; ctx.fillRect(0, 0, w, h);
    const pal = ['#e8f2fa', '#f6e8f2', '#fdf3e2', '#eef7ee', '#e8eaf6'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) {
      const x = 8 + i * 48, y = 10 + j * 60;
      ctx.fillStyle = pal[(i + j) % pal.length];
      ctx.beginPath(); ctx.roundRect(x, y, 40, 46, 6); ctx.fill();
      ctx.fillStyle = ['#d8453c', '#2b7fd4', '#f2933a', '#1f8a5c'][(i * 3 + j) % 4];
      ctx.fillRect(x + 6, y + 10, 28, 14);
      ctx.fillStyle = 'rgba(120,130,140,0.35)';
      ctx.fillRect(x + 6, y + 30, 28, 4);
      ctx.fillStyle = '#dfe6ea'; ctx.fillRect(x - 4, y + 50, 48, 5);
    }
  });
}

/** 地贴导视箭头 */
export function texFloorArrow() {
  return canvasTex(128, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#3fa9d8';
    ctx.beginPath(); ctx.moveTo(w / 2, 20); ctx.lineTo(w - 16, 110); ctx.lineTo(w / 2 + 22, 110);
    ctx.lineTo(w / 2 + 22, 236); ctx.lineTo(w / 2 - 22, 236); ctx.lineTo(w / 2 - 22, 110);
    ctx.lineTo(16, 110); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', w / 2, 200);
  });
}

/** 小心地滑警示牌 */
export function texCaution() {
  return canvasTex(128, 160, (ctx, w, h) => {
    ctx.fillStyle = '#f2c53d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 8, w, 8);
    ctx.beginPath();
    ctx.moveTo(w / 2, 26); ctx.lineTo(w - 18, h - 34); ctx.lineTo(18, h - 34); ctx.closePath();
    ctx.fillStyle = '#e8514b'; ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - 5, 62, 10, 42);
    ctx.fillRect(w / 2 - 5, 112, 10, 10);
  });
}

/** 店内 POP 价签条 */
export function texPriceStrip() {
  return canvasTex(512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = i * 128;
      ctx.fillStyle = '#f2f2ee'; ctx.fillRect(x + 4, 4, 120, h - 8);
      ctx.fillStyle = '#d8453c';
      ctx.font = 'bold 34px Arial'; ctx.textAlign = 'left';
      ctx.fillText('¥' + [128, 240, 398, 158][i], x + 16, 44);
      ctx.fillStyle = '#8a8a86';
      ctx.font = 'bold 15px Arial';
      ctx.fillText(['DRINK', 'SNACK', 'BENTO', 'HOT'][i], x + 16, 16);
    }
  }, { repeat: [3, 1] });
}

/** 香烟柜背板 */
export function texCigCabinet() {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f7f4ee'; ctx.fillRect(0, 0, w, h);
    const pal = ['#e8514b', '#2b7fd4', '#f2c53d', '#1f8a5c', '#8e5ad8', '#f07a3a', '#d8d2c4'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) {
      const x = 6 + i * 56, y = 8 + j * 62;
      ctx.fillStyle = pal[(i + j * 2) % pal.length];
      ctx.fillRect(x, y, 48, 44);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x, y + 6, 48, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 6, y + 26, 30, 6);
      ctx.fillStyle = '#e8e4dc'; ctx.fillRect(x - 3, y + 50, 52, 5);
    }
  });
}

/** 后场门 / 关系者以外 */
export function texBackDoor() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cdd3d8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b9c1c7'; ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#8d959c';
    ctx.fillRect(20, 40, w - 40, 6);
    ctx.fillRect(20, h / 2, w - 40, 6);
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(30, h / 2 + 20, w - 60, 44);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(46, h / 2 + 32, w - 92, 8);
    ctx.fillRect(46, h / 2 + 48, w - 132, 8);
    ctx.fillStyle = '#4c525a';
    ctx.fillRect(w - 34, h / 2 + 10, 14, 26);
  });
}

/** 排水沟盖板 */
export function texGrate() {
  return canvasTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#3a3f47'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#14171c';
    for (let i = 0; i < 6; i++) ctx.fillRect(8 + i * 20, 8, 11, h - 16);
    ctx.strokeStyle = '#565c64'; ctx.lineWidth = 3; ctx.strokeRect(1, 1, w - 2, h - 2);
  });
}

/** 圆形柔光贴图（灯光光晕、地面反光条） */
export function texGlow(softness = 0.5) {
  return canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(softness * 0.5, 'rgba(255,255,255,0.45)');
    g.addColorStop(softness, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
}

/** 垂直条纹（玻璃反光） */
export function texGlassStreak() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const bands = [[0.05, 0.1, 0.5], [0.32, 0.06, 0.34], [0.55, 0.13, 0.28], [0.78, 0.05, 0.4]];
    for (const [x0, bw, a] of bands) {
      const g = ctx.createLinearGradient(x0 * w, 0, (x0 + bw) * w, h);
      g.addColorStop(0, `rgba(255,255,255,0)`);
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.fillStyle = g;
      ctx.save(); ctx.rotate(-0.18); ctx.fillRect(x0 * w - 40, -60, bw * w, h * 1.6); ctx.restore();
    }
  }, { srgb: false });
}

/* ------------------------------------------------------------------ *
 * 材质
 * ------------------------------------------------------------------ */
let gradientMap = null;
export function getGradientMap() {
  if (!gradientMap) {
    const steps = new Uint8Array([46, 118, 196, 255]);
    gradientMap = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

/** 三渲二：卡通材质 */
export function toon(color, opt = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    ...opt,
  });
}

/** 自发光面（灯箱、灯管）：不受光照，直接输出高亮色，交给 Bloom */
export function glow(color, intensity = 1.6) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: true, fog: true });
}

/** 带贴图的商品材质：贴图同时作为自发光，让店内显得明亮温暖 */
export function litMap(tex, emissiveIntensity = 0.2, opt = {}) {
  return new THREE.MeshToonMaterial({
    map: tex,
    gradientMap: getGradientMap(),
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex,
    emissiveIntensity,
    ...opt,
  });
}

/** 玻璃 */
export function glassMat(tint = 0xbfe6ff, opacity = 0.14) {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    transparent: true,
    opacity,
    roughness: 0.06,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** 湿滑地面（带雨滴涟漪注入） */
export const wetUniforms = { uTime: { value: 0 }, uRipple: { value: 1.0 } };
export function wetMat(color, opt = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opt.roughness ?? 0.16,
    metalness: opt.metalness ?? 0.55,
    envMapIntensity: opt.envMapIntensity ?? 1.0,
    transparent: opt.opacity != null,
    opacity: opt.opacity ?? 1,
    ...(opt.map ? { map: opt.map } : {}),
    depthWrite: opt.depthWrite !== false,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wetUniforms.uTime;
    shader.uniforms.uRipple = wetUniforms.uRipple;
    shader.vertexShader = 'varying vec3 vWpos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n vWpos = (modelMatrix * vec4(transformed,1.0)).xyz;'
    );
    shader.fragmentShader = `
      uniform float uTime;
      uniform float uRipple;
      varying vec3 vWpos;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    ` + shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       {
         vec2 uv = vWpos.xz;
         vec2 cell = floor(uv * 1.15);
         float h = h21(cell);
         vec2 cc = (cell + 0.5) / 1.15;
         float d = length(uv - cc);
         float ph = fract(uTime * 0.55 + h);
         float rf = ph * 0.46;
         float ring = sin((d - rf) * 62.0) * exp(-abs(d - rf) * 44.0) * exp(-ph * 3.4) * step(d, rf + 0.02);
         vec2 dir = normalize(uv - cc + vec2(0.0001));
         normal = normalize(normal + vec3(dir.x, 0.0, dir.y) * ring * 1.35 * uRipple * clamp(1.0 - d * 1.2, 0.0, 1.0));
       }`
    );
  };
  m.userData.isWet = true;
  return m;
}

/* ------------------------------------------------------------------ *
 * 描边（反向外壳）+ 构件工厂
 * ------------------------------------------------------------------ */
const OUTLINE_VERT = `
  uniform float uWidth;
  void main(){
    vec3 n = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float d = max(-mv.z, 0.001);
    mv.xyz += n * uWidth * (0.55 + d * 0.02);
    gl_Position = projectionMatrix * mv;
  }
`;
const OUTLINE_FRAG = `
  uniform vec3 uColor;
  void main(){ gl_FragColor = vec4(uColor, 1.0); }
`;
const outlineCache = new Map();
export function outlineMatFor(w, color = 0x120f16) {
  const k = w.toFixed(4) + '_' + color;
  if (!outlineCache.has(k)) {
    outlineCache.set(k, new THREE.ShaderMaterial({
      uniforms: { uWidth: { value: w }, uColor: { value: new THREE.Color(color) } },
      vertexShader: OUTLINE_VERT,
      fragmentShader: OUTLINE_FRAG,
      side: THREE.BackSide,
    }));
  }
  return outlineCache.get(k);
}

export const noRaycast = (o) => { o.raycast = () => {}; return o; };

/**
 * 生成构件：mesh + 描边外壳（同几何、同变换）
 * opt: { ol: 描边宽度(0=不描边), shadow: 是否投影, fog }
 */
export function part(geo, mat, opt = {}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = opt.shadow !== false;
  m.receiveShadow = opt.shadow !== false;
  g.add(m);
  g.userData.mesh = m;
  if (opt.ol) {
    const o = new THREE.Mesh(geo, outlineMatFor(opt.ol, opt.olColor));
    o.renderOrder = -1;
    o.castShadow = false; o.receiveShadow = false;
    g.add(o);
  }
  return g;
}

/* 常用几何体缓存 */
const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
export const boxGeo = (w, h, d) => geo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cylGeo = (rt, rb, h, s = 12) => geo(`c${rt}_${rb}_${h}_${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const sphGeo = (r, ws = 14, hs = 10) => geo(`s${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const planeGeo = (w, h) => geo(`p${w}_${h}`, () => new THREE.PlaneGeometry(w, h));

/** 快速放盒子 */
export function box(parent, w, h, d, mat, x, y, z, opt = {}) {
  const g = part(boxGeo(w, h, d), mat, opt);
  g.position.set(x, y, z);
  if (opt.ry) g.rotation.y = opt.ry;
  if (opt.rx) g.rotation.x = opt.rx;
  if (opt.rz) g.rotation.z = opt.rz;
  if (parent) parent.add(g);
  return g;
}

/** 快速放圆柱 */
export function cyl(parent, rt, rb, h, mat, x, y, z, opt = {}) {
  const g = part(cylGeo(rt, rb, h, opt.seg || 12), mat, opt);
  g.position.set(x, y, z);
  if (opt.rx) g.rotation.x = opt.rx;
  if (opt.rz) g.rotation.z = opt.rz;
  if (opt.ry) g.rotation.y = opt.ry;
  if (parent) parent.add(g);
  return g;
}

/** 平面贴片（海报、地贴、光晕） */
export function decal(parent, w, h, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(planeGeo(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = false; m.receiveShadow = false;
  if (parent) parent.add(m);
  return m;
}

/** 发光面片（灯箱、灯管正面） */
export function lightPanel(parent, w, h, color, x, y, z, opt = {}) {
  const m = decal(parent, w, h, glow(color, opt.intensity ?? 1.5), x, y, z, opt.rx || 0, opt.ry || 0, opt.rz || 0);
  return m;
}

/** 地面光晕 / 湿地面反光条（加色混合，动画微摆） */
const glowTex = /* lazy */ { v: null };
export function getGlowTex() { if (!glowTex.v) glowTex.v = texGlow(0.55); return glowTex.v; }
export const reflectionStreaks = [];
export function lightStreak(parent, w, h, color, x, y, z, ry = 0, opacity = 0.5) {
  const m = new THREE.Mesh(planeGeo(w, h), new THREE.MeshBasicMaterial({
    map: getGlowTex(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true,
  }));
  m.position.set(x, y, z);
  m.rotation.set(-Math.PI / 2, 0, ry);
  m.renderOrder = 3;
  if (parent) parent.add(m);
  reflectionStreaks.push({ m, base: opacity, seed: srand() * 10 });
  return m;
}

/** 灯珠光晕：始终面向相机（billboard），紧凑柔和，避免大片投影到远处表面 */
export const billboards = [];
export function halo(parent, size, color, x, y, z, opacity = 0.55) {
  const geo = planeGeo(size, size);
  const mat = new THREE.MeshBasicMaterial({
    map: getGlowTex(), color: new THREE.Color(color), transparent: true,
    opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = true;
  m.renderOrder = 5;
  m.userData.alwaysFace = true;
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  billboards.push(m);
  return m;
}

/* ------------------------------------------------------------------ *
 * 杂项
 * ------------------------------------------------------------------ */
export function disposeAll(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose?.();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose?.();
    }
  });
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
