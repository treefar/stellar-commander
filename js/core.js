/* core.js — 畫布、整數放大、像素字型、輸入、中文覆蓋層
   內部解析度固定 256x224（SFC 原生），整數倍放大避免像素糊掉。 */
'use strict';

const GW = 256, GH = 224;

const Core = {
  cv: null, ctx: null,      // 像素畫面
  ucv: null, uctx: null,    // 中文覆蓋層（不做像素化，字才清楚）
  scale: 3,
  frame: 0,

  init() {
    this.cv = document.getElementById('game');
    this.ctx = this.cv.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.ucv = document.getElementById('ui');
    this.uctx = this.ucv.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    Input.init();
  },

  resize() {
    const maxW = Math.min(window.innerWidth - 40, 1100);
    const maxH = window.innerHeight - 300;
    let s = Math.floor(Math.min(maxW / GW, Math.max(maxH, 300) / GH));
    // 手機窄於 512px 時用原生 1 倍；仍是整數縮放，不會破壞像素邊緣。
    s = Math.max(1, Math.min(5, s));
    this.scale = s;
    this.cv.style.width = (GW * s) + 'px';
    this.cv.style.height = (GH * s) + 'px';
    this.ucv.width = GW * s;
    this.ucv.height = GH * s;
    this.ucv.style.width = (GW * s) + 'px';
    this.ucv.style.height = (GH * s) + 'px';
  },

  clear(col) {
    this.ctx.fillStyle = col || '#000';
    this.ctx.fillRect(0, 0, GW, GH);
    this.uctx.clearRect(0, 0, this.ucv.width, this.ucv.height);
  },

  // 中文文字（畫在覆蓋層，座標用遊戲內部像素）
  text(gx, gy, str, o) {
    o = o || {};
    const s = this.scale, c = this.uctx;
    const size = (o.size || 9) * s;
    c.font = `${o.weight || 500} ${size}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    c.textAlign = o.align || 'left';
    c.textBaseline = o.baseline || 'top';
    if (o.shadow !== false) {
      c.fillStyle = o.shadowColor || 'rgba(0,0,0,.9)';
      c.fillText(str, gx * s + s, gy * s + s);
    }
    c.fillStyle = o.color || '#e8eefc';
    c.fillText(str, gx * s, gy * s);
  },

  measure(str, size) {
    const c = this.uctx, s = this.scale;
    c.font = `500 ${(size || 9) * s}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    return c.measureText(str).width / s;
  }
};

/* ---------- 5x7 像素字型（英數，遊戲內 HUD 用，與原作同味） ---------- */
const FONT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  'D': ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  'W': ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  'x': ['00000', '10001', '01010', '00100', '01010', '10001', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};

/** 畫像素英數字。sc = 放大倍率，ol = 描邊色 */
function ptext(ctx, x, y, str, col, sc, ol) {
  sc = sc || 1;
  str = String(str).toUpperCase();
  let cx = x;
  for (const ch of str) {
    const g = FONT[ch] || FONT[ch.toLowerCase()] || FONT[' '];
    if (ol) {
      ctx.fillStyle = ol;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
        if (g[r][c] === '1') {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
            ctx.fillRect(cx + c * sc + dx, y + r * sc + dy, sc, sc);
        }
      }
    }
    ctx.fillStyle = col;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++)
      if (g[r][c] === '1') ctx.fillRect(cx + c * sc, y + r * sc, sc, sc);
    cx += 6 * sc;
  }
  return cx;
}
function ptextW(str, sc) { return String(str).length * 6 * (sc || 1); }

/* ---------- 輸入 ---------- */
const Input = {
  down: {}, hit: {},
  MAP: {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'a', KeyX: 'b', KeyC: 'c', KeyV: 'd',
    Enter: 'start', Space: 'start', Escape: 'b', ShiftLeft: 'l', ShiftRight: 'l'
  },
  init() {
    addEventListener('keydown', e => {
      const k = this.MAP[e.code];
      if (!k) return;
      e.preventDefault();
      if (!this.down[k]) this.hit[k] = true;
      this.down[k] = true;
    });
    addEventListener('keyup', e => {
      const k = this.MAP[e.code];
      if (!k) return;
      e.preventDefault();
      this.down[k] = false;
    });
    addEventListener('blur', () => { this.down = {}; });
    document.querySelectorAll('[data-input]').forEach(btn => {
      const k = btn.dataset.input;
      const press = e => {
        e.preventDefault();
        if (!this.down[k]) this.hit[k] = true;
        this.down[k] = true;
        btn.classList.add('on');
        if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
      };
      const release = e => {
        e.preventDefault();
        this.down[k] = false;
        btn.classList.remove('on');
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    });
  },
  endFrame() { this.hit = {}; },
  d(k) { return !!this.down[k]; },
  p(k) { return !!this.hit[k]; }
};

/* ---------- 小工具 ---------- */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/** HSL(0~360, 0~1, 0~1) → [r,g,b]，給程式生成的像素背景用 */
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [Math.round(f(p, q, h + 1 / 3) * 255), Math.round(f(p, q, h) * 255), Math.round(f(p, q, h - 1 / 3) * 255)];
}
