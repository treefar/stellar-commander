/* hex.js — 六角格地圖（odd-r 尖頂 pointy-top offset 座標）
   純數學，沒有瀏覽器相依，可在 Node 直接測試。 */
'use strict';

const HEX_W = 22;   // 每格水平間距（＝六角形寬）
const HEX_H = 24;   // 每格圖形高度
const HEX_VS = 18;  // 每列垂直間距 = HEX_H * 3/4，尖端才會互相咬合不留縫

/** odd-r：奇數列往右推半格 */
function hexNeighbors(col, row) {
  const odd = (row & 1) === 1;
  return odd
    ? [[col + 1, row], [col + 1, row - 1], [col, row - 1], [col - 1, row], [col, row + 1], [col + 1, row + 1]]
    : [[col + 1, row], [col, row - 1], [col - 1, row - 1], [col - 1, row], [col - 1, row + 1], [col, row + 1]];
}

/** offset → cube，用來算真正的六角距離 */
function offsetToCube(col, row) {
  const x = col - ((row - (row & 1)) / 2);
  const z = row;
  return [x, -x - z, z];
}

function hexDistance(c1, r1, c2, r2) {
  const a = offsetToCube(c1, r1), b = offsetToCube(c2, r2);
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function hexToPixel(col, row) {
  return { x: col * HEX_W + ((row & 1) ? HEX_W / 2 : 0), y: row * HEX_VS };
}

/* ---------- 地形 ---------- */
const TERRAIN = {
  space: { id: 'space', cost: 1, zh: '空域', def: 1.0, adapt: 1.0 },
  debris: { id: 'debris', cost: 2, zh: '暗礁空域', def: 0.85, adapt: 0.65 },  // 重裝機在此變弱
  nebula: { id: 'nebula', cost: 1, zh: '星雲', def: 1.15, adapt: 0.85 }
};

/* ---------- 地圖 ---------- */
// . 空域   # 暗礁   ~ 星雲   B/b 藍方工廠/都市   R/r 紅方工廠/都市   F/C 中立工廠/都市
const MAP_ROWS = [
  '..~.....R..#..',
  '.#....r.....R.',
  '....~......r..',
  '..C.....#..~..',
  '#....F....~...',
  '...~......C...',
  '...C......~...',
  '...~....F....#',
  '..~.....C.....',
  '..b......~....',
  '.B.....b....#.',
  '..#..B.....~..'
];

const MAP_W = 14, MAP_H = 12;

function buildMap() {
  const cells = [];
  for (let r = 0; r < MAP_H; r++) {
    const row = [];
    for (let c = 0; c < MAP_W; c++) {
      const ch = MAP_ROWS[r][c];
      const cell = { col: c, row: r, terrain: 'space', fac: null, owner: null };
      if (ch === '#') cell.terrain = 'debris';
      else if (ch === '~') cell.terrain = 'nebula';
      else if (ch === 'B') { cell.fac = 'factory'; cell.owner = 'blue'; }
      else if (ch === 'b') { cell.fac = 'city'; cell.owner = 'blue'; }
      else if (ch === 'R') { cell.fac = 'factory'; cell.owner = 'red'; }
      else if (ch === 'r') { cell.fac = 'city'; cell.owner = 'red'; }
      else if (ch === 'F') { cell.fac = 'factory'; cell.owner = null; }
      else if (ch === 'C') { cell.fac = 'city'; cell.owner = null; }
      row.push(cell);
    }
    cells.push(row);
  }
  return cells;
}

function inMap(c, r) { return c >= 0 && r >= 0 && c < MAP_W && r < MAP_H; }

/**
 * 可移動範圍（BFS，含 ZOC）。
 * ZOC = 敵方單位周邊的格子，進去以後就停住不能再走。
 * occ(c,r) 回傳該格單位 {side} 或 null。
 */
function reachable(cells, start, mp, side, occ) {
  const key = (c, r) => c + ',' + r;
  const best = new Map();
  best.set(key(start.col, start.row), mp);
  const out = new Map();
  out.set(key(start.col, start.row), { col: start.col, row: start.row, left: mp, from: null });
  const queue = [{ col: start.col, row: start.row, left: mp }];

  while (queue.length) {
    const cur = queue.shift();
    // 進到 ZOC 之後不能再往外走
    if (!(cur.col === start.col && cur.row === start.row) && inZOC(cur.col, cur.row, side, occ)) continue;
    for (const [nc, nr] of hexNeighbors(cur.col, cur.row)) {
      if (!inMap(nc, nr)) continue;
      const u = occ(nc, nr);
      if (u && u.side !== side) continue;              // 敵格不能進
      const cost = TERRAIN[cells[nr][nc].terrain].cost;
      const left = cur.left - cost;
      if (left < 0) continue;
      const k = key(nc, nr);
      if (best.has(k) && best.get(k) >= left) continue;
      best.set(k, left);
      out.set(k, { col: nc, row: nr, left, from: key(cur.col, cur.row) });
      queue.push({ col: nc, row: nr, left });
    }
  }
  // 有友軍佔著的格子不能停
  for (const [k, v] of Array.from(out)) {
    const u = occ(v.col, v.row);
    if (u && !(v.col === start.col && v.row === start.row)) out.delete(k);
  }
  return out;
}

function inZOC(col, row, side, occ) {
  for (const [nc, nr] of hexNeighbors(col, row)) {
    if (!inMap(nc, nr)) continue;
    const u = occ(nc, nr);
    if (u && u.side !== side) return true;
  }
  return false;
}

/** 從 reachable 結果回推移動路徑 */
function pathTo(reach, start, col, row) {
  const key = (c, r) => c + ',' + r;
  const path = [];
  let k = key(col, row);
  let guard = 0;
  while (k && guard++ < 500) {
    const n = reach.get(k);
    if (!n) break;
    path.unshift({ col: n.col, row: n.row });
    if (n.col === start.col && n.row === start.row) break;
    k = n.from;
  }
  return path;
}

if (typeof module !== 'undefined') {
  module.exports = {
    hexNeighbors, hexDistance, hexToPixel, offsetToCube,
    buildMap, inMap, reachable, pathTo, inZOC,
    TERRAIN, MAP_W, MAP_H, MAP_ROWS, HEX_W, HEX_H, HEX_VS
  };
}
