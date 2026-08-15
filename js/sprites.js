/* sprites.js — 程式生成 SD 機體像素圖
   規格：32x32 畫布、本體約 27px 高、2.7 頭身、每台 15 色內、外圍 1px 黑描邊。
   一律畫「面向右」，面向左時鏡像貼圖。 */
'use strict';

const PALETTES = {
  // 藍軍
  guard: { main: [150, 168, 196], mainL: [206, 220, 240], mainD: [88, 102, 130], sub: [70, 110, 190], subD: [40, 64, 122], metal: [126, 132, 148], metalD: [58, 62, 78], eye: [255, 96, 80], trim: [246, 208, 72], beam: [130, 226, 255] },
  swift: { main: [86, 178, 176], mainL: [150, 226, 220], mainD: [40, 100, 106], sub: [232, 236, 244], subD: [140, 150, 172], metal: [120, 128, 144], metalD: [50, 56, 72], eye: [255, 232, 96], trim: [246, 138, 64], beam: [140, 255, 210] },
  bulwark: { main: [72, 96, 168], mainL: [124, 152, 224], mainD: [36, 48, 104], sub: [216, 176, 104], subD: [140, 104, 56], metal: [120, 128, 144], metalD: [50, 56, 72], eye: [120, 240, 255], trim: [246, 208, 72], beam: [255, 196, 96] },
  paladin: { main: [238, 240, 248], mainL: [255, 255, 255], mainD: [160, 168, 190], sub: [56, 96, 208], subD: [28, 52, 132], metal: [180, 60, 56], metalD: [110, 28, 30], eye: [255, 232, 96], trim: [250, 208, 64], beam: [140, 236, 255] },
  // 紅軍
  grunt: { main: [104, 152, 88], mainL: [156, 202, 132], mainD: [56, 88, 48], sub: [78, 116, 66], subD: [40, 62, 36], metal: [116, 122, 130], metalD: [48, 54, 62], eye: [255, 96, 72], trim: [214, 178, 78], beam: [255, 150, 90] },
  lancer: { main: [116, 96, 180], mainL: [168, 150, 226], mainD: [62, 48, 108], sub: [72, 60, 116], subD: [38, 30, 66], metal: [116, 122, 130], metalD: [48, 54, 62], eye: [255, 120, 90], trim: [230, 190, 96], beam: [200, 150, 255] },
  warlord: { main: [72, 130, 120], mainL: [124, 186, 172], mainD: [36, 74, 70], sub: [188, 172, 120], subD: [110, 98, 64], metal: [116, 122, 130], metalD: [48, 54, 62], eye: [255, 110, 80], trim: [232, 196, 96], beam: [140, 255, 200] },
  reaper: { main: [206, 66, 62], mainL: [246, 128, 112], mainD: [128, 32, 36], sub: [244, 216, 140], subD: [166, 132, 70], metal: [120, 100, 108], metalD: [54, 42, 50], eye: [255, 236, 120], trim: [250, 214, 96], beam: [255, 140, 190] }
};

const Spr = (() => {
  const S = 32;

  function buf() { return { w: S, h: S, d: new Uint8ClampedArray(S * S * 4) }; }
  function px(b, x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= b.w || y >= b.h || !c) return;
    const i = (y * b.w + x) * 4;
    b.d[i] = c[0]; b.d[i + 1] = c[1]; b.d[i + 2] = c[2]; b.d[i + 3] = 255;
  }
  function rect(b, x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(b, x + i, y + j, c);
  }
  /** 有上亮下暗的立體方塊 */
  function box(b, x, y, w, h, c, cl, cd) {
    rect(b, x, y, w, h, c);
    if (cl) rect(b, x, y, w, 1, cl);
    if (cd && h > 2) rect(b, x, y + h - 1, w, 1, cd);
    if (cd && w > 2) rect(b, x + w - 1, y + 1, 1, h - 2, cd);
  }
  function alphaAt(b, x, y) {
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return 0;
    return b.d[(y * b.w + x) * 4 + 3];
  }
  /** 外圍加 1px 黑描邊 */
  function outline(b) {
    const add = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (alphaAt(b, x, y)) continue;
      if (alphaAt(b, x - 1, y) || alphaAt(b, x + 1, y) || alphaAt(b, x, y - 1) || alphaAt(b, x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) px(b, x, y, [8, 8, 16]);
  }
  function toCanvas(b) {
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.putImageData(new ImageData(b.d, S, S), 0, 0);
    return cv;
  }
  function mirror(cv) {
    const o = document.createElement('canvas');
    o.width = cv.width; o.height = cv.height;
    const c = o.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.translate(cv.width, 0); c.scale(-1, 1);
    c.drawImage(cv, 0, 0);
    return o;
  }
  /** 整張染成單色（中彈閃白用） */
  function tint(cv, col) {
    const o = document.createElement('canvas');
    o.width = cv.width; o.height = cv.height;
    const c = o.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = col;
    c.fillRect(0, 0, o.width, o.height);
    return o;
  }

  /* ---------- 各部位 ---------- */

  /* 版面（面向右）：
     頭 y1..11（含下巴）／軀幹 y12..20／腰胯 y20..22／腿 y22..30
     肩甲 x7..11（遠）與 x21..25（近）撐出寬肩剪影 */

  function drawBackpack(b, art, P) {
    const k = art.back;
    if (k === 'none') return;
    box(b, 6, 13, 4, 7, P.metal, null, P.metalD);          // 背包本體
    rect(b, 6, 15, 4, 1, P.metalD);
    if (k === 'thruster') {
      rect(b, 5, 20, 3, 4, P.metalD); rect(b, 8, 20, 3, 4, P.metalD);
      rect(b, 5, 23, 3, 1, P.trim); rect(b, 8, 23, 3, 1, P.trim);
    } else if (k === 'cannon') {
      rect(b, 7, 6, 2, 8, P.metalD); rect(b, 10, 6, 2, 8, P.metalD);  // 肩上雙管砲
      rect(b, 7, 5, 2, 1, P.metal); rect(b, 10, 5, 2, 1, P.metal);
      rect(b, 6, 20, 4, 3, P.metalD);
    } else if (k === 'funnel') {
      box(b, 3, 13, 3, 3, P.sub, P.mainL, P.subD);          // 浮游砲莢艙
      box(b, 3, 17, 3, 3, P.sub, P.mainL, P.subD);
      px(b, 3, 14, P.trim); px(b, 3, 18, P.trim);
      rect(b, 6, 20, 3, 3, P.metalD);
    } else if (k === 'wing') {
      rect(b, 3, 11, 5, 2, P.sub); rect(b, 3, 13, 4, 1, P.subD);   // 翼狀推進翼
      rect(b, 3, 16, 4, 2, P.sub); rect(b, 3, 18, 3, 1, P.subD);
      rect(b, 6, 20, 4, 4, P.metalD); rect(b, 6, 23, 4, 1, P.trim);
    }
  }

  function drawHead(b, art, P) {
    const k = art.head;
    const dark = [24, 24, 36];
    // 頭盔外形：上窄 → 中寬 → 下巴收窄
    rect(b, 13, 1, 7, 1, P.mainL);
    rect(b, 12, 2, 9, 2, P.main); rect(b, 12, 2, 9, 1, P.mainL);
    rect(b, 11, 4, 11, 5, P.main);
    rect(b, 12, 9, 9, 2, P.main);
    rect(b, 14, 11, 5, 1, P.mainD);
    rect(b, 11, 8, 11, 1, P.mainD);
    // 側面耳部進氣
    rect(b, 10, 5, 1, 3, P.sub); rect(b, 22, 5, 1, 3, P.sub);
    px(b, 22, 6, P.trim);

    if (k === 'mono') {
      rect(b, 11, 5, 11, 3, dark);                    // 單眼滑軌
      rect(b, 17, 5, 3, 3, P.eye); px(b, 20, 6, P.mainL);
      rect(b, 9, 3, 2, 7, P.metalD);                  // 側管線
      px(b, 9, 4, P.metal); px(b, 9, 6, P.metal); px(b, 9, 8, P.metal);
      rect(b, 12, 9, 9, 1, P.metal);
    } else if (k === 'visor') {
      rect(b, 12, 5, 9, 3, dark);
      rect(b, 13, 6, 7, 2, P.eye);                    // 一字面罩
      rect(b, 12, 9, 9, 1, P.metal);
      px(b, 16, 0, P.trim); px(b, 16, 1, P.trim);     // 單天線
      rect(b, 11, 4, 11, 1, P.sub);
    } else if (k === 'helm') {
      rect(b, 12, 5, 9, 3, dark);
      rect(b, 16, 6, 4, 2, P.eye);
      rect(b, 11, 4, 11, 1, P.sub);
      rect(b, 11, 0, 2, 5, P.metalD); px(b, 11, 0, P.trim);   // 長天線
      rect(b, 13, 9, 7, 1, P.metal);
    } else { // duo / ace
      rect(b, 12, 5, 9, 5, dark);                     // 臉
      rect(b, 13, 6, 2, 2, P.eye); rect(b, 18, 6, 2, 2, P.eye);
      rect(b, 14, 9, 5, 1, P.metal);                  // 口罩通風
      rect(b, 11, 4, 11, 1, P.sub);
      // V 字天線
      px(b, 11, 3, P.trim); px(b, 10, 2, P.trim); px(b, 9, 1, P.trim);
      px(b, 21, 3, P.trim); px(b, 22, 2, P.trim); px(b, 23, 1, P.trim);
      if (k === 'ace') {
        px(b, 8, 0, P.trim); px(b, 24, 0, P.trim);
        rect(b, 15, 2, 3, 2, P.metalD); px(b, 16, 3, P.eye);   // 額寶石
      } else {
        px(b, 16, 1, P.trim);
      }
    }
    rect(b, 15, 11, 3, 2, P.metalD);                  // 脖子
  }

  function drawBody(b, art, P) {
    const ex = art.bulk >= 2 ? 1 : 0;
    const x = 12 - ex, w = 9 + ex * 2;
    rect(b, x, 12, w, 2, P.sub); rect(b, x, 12, w, 1, P.mainL);   // 領口
    box(b, x, 14, w, 4, P.main, P.mainL, P.mainD);                // 胸
    rect(b, x + 1, 16, 3, 1, [22, 22, 32]);                       // 胸口散熱窄縫
    rect(b, x + w - 4, 16, 3, 1, [22, 22, 32]);
    px(b, x + 1, 15, P.trim); px(b, x + w - 2, 15, P.trim);
    rect(b, 16, 14, 1, 4, P.mainD);                               // 中線
    box(b, 14, 18, 5, 2, P.mainD, null, [20, 22, 32]);            // 腹
    rect(b, 13, 20, 7, 2, P.metalD);                              // 腰
    px(b, 16, 20, P.trim);
  }

  function drawShoulders(b, art, P) {
    const big = art.shoulder === 'big' || art.shoulder === 'spike';
    const w = big ? 5 : 4;
    const fx = 12 - w, nx = 21;
    const gap = [16, 16, 26];   // 肩與軀幹之間留 1px 暗縫，剪影才不會糊成一塊

    // 遠側肩甲（壓暗，製造前後層次）
    rect(b, fx + 1, 12, w - 1, 1, P.subD);
    box(b, fx, 13, w, 4, P.subD, null, [16, 18, 28]);
    // 遠側手臂：只露一條，避免變成獨立黑塊
    rect(b, 10, 17, 2, 7, [38, 42, 56]);
    rect(b, 10, 21, 2, 1, [26, 28, 40]);

    // 近側肩甲
    rect(b, nx, 12, w - 1, 1, P.mainL);
    box(b, nx, 13, w, 4, P.sub, P.mainL, P.subD);
    px(b, nx + 1, 14, P.trim);
    if (art.shoulder === 'spike') {
      px(b, nx + w, 12, P.metal); px(b, nx + w + 1, 11, P.metal);
      px(b, fx - 1, 12, P.metalD);
    }
    // 近側手臂：上臂 → 前臂 → 手（手要正好接到武器握把）
    rect(b, 22, 17, 3, 3, P.metal); rect(b, 22, 17, 3, 1, P.mainL);
    rect(b, 22, 20, 3, 4, P.metalD);
    rect(b, 22, 20, 3, 1, P.metal);

    rect(b, 11, 12, 1, 5, gap);
    rect(b, 20, 12, 1, 5, gap);
  }

  function drawLegs(b, art, P) {
    // 遠腿
    box(b, 13, 22, 3, 4, P.mainD, null, [18, 20, 30]);
    rect(b, 13, 26, 3, 3, [40, 44, 58]);
    rect(b, 11, 29, 5, 2, P.metalD);
    // 近腿
    box(b, 17, 22, 3, 4, P.main, P.mainL, P.mainD);
    px(b, 17, 25, P.trim);                       // 膝甲
    rect(b, 17, 26, 3, 3, P.metal);
    rect(b, 16, 29, 6, 2, P.metal);
    rect(b, 16, 30, 6, 1, P.metalD);
  }

  function drawWeapon(b, art, P, pose) {
    const dy = pose === 'fire' ? -2 : 0;
    const y = 21 + dy;          // 槍身高度（對齊前臂 y20..23）
    const k = art.weapon;
    if (pose === 'melee') {
      rect(b, 23, 19, 3, 3, P.metal);                    // 刀柄握在手上
      for (let i = 0; i < 13; i++) {                     // 光束刀身往右上斜出
        const bx = 25 + ((i * 3) >> 2), by = 18 - i;
        px(b, bx, by, P.beam); px(b, bx + 1, by, [255, 255, 255]);
        if (i < 3) px(b, bx, by + 1, P.beam);
      }
      return;
    }
    // 握把（連到手）
    rect(b, 23, y + 1, 2, 3, P.metalD);
    if (k === 'rifle') {
      rect(b, 22, y, 9, 2, P.metalD); rect(b, 22, y, 6, 1, P.metal);
      rect(b, 25, y - 1, 3, 1, P.metal);
    } else if (k === 'mg') {
      rect(b, 22, y, 8, 2, P.metalD); rect(b, 23, y - 1, 3, 1, P.metal);
      rect(b, 25, y + 2, 3, 2, P.metal);
    } else if (k === 'bazooka') {
      rect(b, 21, y - 1, 10, 3, P.metalD); rect(b, 21, y - 1, 10, 1, P.metal);
      px(b, 21, y + 1, P.trim);
    } else if (k === 'beam') {
      rect(b, 22, y, 9, 2, P.metal); rect(b, 22, y, 7, 1, P.mainL);
      px(b, 30, y, P.beam); px(b, 30, y + 1, P.beam);
      rect(b, 25, y - 1, 3, 1, P.metalD);
    } else if (k === 'cannon') {
      rect(b, 21, y - 1, 10, 3, P.metalD); rect(b, 21, y - 1, 10, 1, P.metal);
      rect(b, 30, y - 1, 1, 3, P.trim);
    }
    if (pose === 'fire') {
      const tip = 31;
      px(b, tip, y, [255, 244, 180]); px(b, tip, y + 1, [255, 200, 80]);
      px(b, tip - 1, y - 1, [255, 220, 120]);
    }
  }

  /** 產生一台機體的單一姿勢 */
  function mecha(art, palName, pose) {
    const P = PALETTES[palName] || PALETTES.guard;
    const b = buf();
    // 順序＝由後往前：背包 → 腿 → 軀幹 → 肩甲手臂（會壓在軀幹上）→ 武器 → 頭
    drawBackpack(b, art, P);
    drawLegs(b, art, P);
    drawBody(b, art, P);
    drawShoulders(b, art, P);
    drawWeapon(b, art, P, pose);
    drawHead(b, art, P);
    outline(b);
    return toCanvas(b);
  }

  /** 地圖用 16x16 迷你圖示 */
  function mini(art, palName) {
    const M = 16;
    const b = { w: M, h: M, d: new Uint8ClampedArray(M * M * 4) };
    const P = PALETTES[palName] || PALETTES.guard;
    const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(b, x + i, y + j, c); };
    // 頭
    R(5, 1, 6, 5, P.main); R(5, 1, 6, 1, P.mainL); R(6, 6, 4, 1, P.mainD);
    R(5, 3, 6, 2, [24, 24, 34]);
    if (art.head === 'mono') { R(8, 3, 2, 2, P.eye); }
    else { px(b, 6, 3, P.eye); px(b, 9, 3, P.eye); px(b, 4, 0, P.trim); px(b, 11, 0, P.trim); }
    // 肩＋軀幹
    R(2, 7, 3, 4, P.subD); R(11, 7, 3, 4, P.sub); px(b, 12, 7, P.mainL);
    R(5, 7, 6, 5, P.main); R(5, 7, 6, 1, P.mainL); R(5, 11, 6, 1, P.mainD);
    px(b, 6, 9, P.trim); px(b, 9, 9, P.trim);
    // 腿
    R(5, 12, 2, 3, P.mainD); R(9, 12, 2, 3, P.main);
    R(4, 14, 3, 1, P.metalD); R(9, 14, 3, 1, P.metal);
    // 武器
    R(13, 9, 3, 1, P.metalD);
    const add = [];
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
      const a = (xx, yy) => (xx < 0 || yy < 0 || xx >= M || yy >= M) ? 0 : b.d[(yy * M + xx) * 4 + 3];
      if (a(x, y)) continue;
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) px(b, x, y, [8, 8, 16]);
    const cv = document.createElement('canvas');
    cv.width = M; cv.height = M;
    cv.getContext('2d').putImageData(new ImageData(b.d, M, M), 0, 0);
    return cv;
  }

  /** 為一台機體建立完整貼圖組 */
  function build(unit) {
    const set = {};
    for (const pose of ['idle', 'fire', 'melee']) {
      const r = mecha(unit.art, unit.pal, pose);
      set[pose] = { r, l: mirror(r) };
    }
    const w = tint(set.idle.r, '#ffffff');
    set.flash = { r: w, l: mirror(w) };
    const m = mini(unit.art, unit.pal);
    set.mini = { r: m, l: mirror(m) };
    return set;
  }

  return { build, mecha, mini, mirror, tint, PALETTES };
})();
