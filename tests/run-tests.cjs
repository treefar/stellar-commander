/* run-tests.cjs — 純邏輯回歸測試（不需瀏覽器）
   用法：node tests/run-tests.cjs */
'use strict';
const path = require('path');
const H = require(path.join(__dirname, '..', 'js', 'hex.js'));
const C = require(path.join(__dirname, '..', 'js', 'combat.js'));
const U = require(path.join(__dirname, '..', 'js', 'units.js'));
const P = require(path.join(__dirname, '..', 'js', 'progression.js'));
const A = require(path.join(__dirname, '..', 'js', 'artpack.js'));
const fs = require('fs');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function eq(name, a, b) { ok(name, a === b, { got: a, want: b }); }

console.log('\n[1] 六角格座標');
{
  // odd-r：鄰居一定有 6 個，且彼此距離為 1
  for (const [c, r] of [[3, 4], [3, 5], [0, 0], [13, 11]]) {
    const ns = H.hexNeighbors(c, r);
    eq(`(${c},${r}) 鄰居數 = 6`, ns.length, 6);
    const allOne = ns.every(([nc, nr]) => H.hexDistance(c, r, nc, nr) === 1);
    ok(`(${c},${r}) 鄰居距離都是 1`, allOne, ns.map(([a, b]) => H.hexDistance(c, r, a, b)));
  }
  // 鄰接必須對稱：A 是 B 的鄰居 → B 也是 A 的鄰居
  let sym = true, bad = null;
  for (let r = 0; r < H.MAP_H; r++) for (let c = 0; c < H.MAP_W; c++) {
    for (const [nc, nr] of H.hexNeighbors(c, r)) {
      if (!H.inMap(nc, nr)) continue;
      if (!H.hexNeighbors(nc, nr).some(([bc, br]) => bc === c && br === r)) { sym = false; bad = [c, r, nc, nr]; }
    }
  }
  ok('鄰接關係對稱', sym, bad);
  eq('距離自己 = 0', H.hexDistance(5, 5, 5, 5), 0);
  ok('距離對稱', H.hexDistance(2, 3, 9, 8) === H.hexDistance(9, 8, 2, 3));
}

console.log('\n[2] 地圖資料');
{
  const cells = H.buildMap();
  eq('地圖列數', cells.length, H.MAP_H);
  ok('每列欄數正確', cells.every(r => r.length === H.MAP_W), cells.map(r => r.length));
  ok('MAP_ROWS 每列長度 = MAP_W', H.MAP_ROWS.every(r => r.length === H.MAP_W), H.MAP_ROWS.map(r => r.length));
  const cnt = (own, fac) => cells.flat().filter(c => c.owner === own && c.fac === fac).length;
  eq('藍方起始工廠 = 2', cnt('blue', 'factory'), 2);
  eq('紅方起始工廠 = 2', cnt('red', 'factory'), 2);
  eq('藍方起始都市 = 2', cnt('blue', 'city'), 2);
  eq('紅方起始都市 = 2', cnt('red', 'city'), 2);
  eq('中立工廠 = 2', cnt(null, 'factory'), 2);
  eq('中立都市 = 4', cnt(null, 'city'), 4);
  ok('雙方起始設施數相同（地圖公平）', cnt('blue', 'factory') + cnt('blue', 'city') === cnt('red', 'factory') + cnt('red', 'city'));
}

console.log('\n[3] 移動範圍與 ZOC');
{
  const cells = H.buildMap();
  const none = () => null;
  const start = { col: 6, row: 6 };
  const r1 = H.reachable(cells, start, 1, 'blue', none);
  ok('MP1 走得到的格子 ≤ 7（含原地）', r1.size <= 7, r1.size);
  ok('MP1 一定含原地', r1.has('6,6'));
  const r4 = H.reachable(cells, start, 4, 'blue', none);
  ok('MP4 比 MP1 走得遠', r4.size > r1.size, { r1: r1.size, r4: r4.size });
  ok('走不出地圖邊界', [...r4.values()].every(v => H.inMap(v.col, v.row)));

  // 暗礁空域花 2 點：地圖 (12,11)=~ 星雲、(2,11)=# 暗礁
  ok('暗礁格移動成本 = 2', H.TERRAIN.debris.cost === 2);

  // ZOC：敵人擋路後不能穿過去
  const enemyAt = (c, r) => (c === 7 && r === 6) ? { side: 'red' } : null;
  const rz = H.reachable(cells, start, 4, 'blue', enemyAt);
  ok('敵人所在格不可進入', !rz.has('7,6'));
  const free = H.reachable(cells, start, 4, 'blue', none);
  ok('ZOC 讓可走範圍變小', rz.size < free.size, { withZoc: rz.size, free: free.size });

  // 路徑回推
  const target = [...r4.values()].find(v => v.col !== start.col || v.row !== start.row);
  const path = H.pathTo(r4, start, target.col, target.row);
  ok('路徑從起點開始', path[0].col === start.col && path[0].row === start.row, path[0]);
  ok('路徑到達終點', path[path.length - 1].col === target.col && path[path.length - 1].row === target.row);
  ok('路徑每步都相鄰', path.every((p, i) => i === 0 || H.hexDistance(p.col, p.row, path[i - 1].col, path[i - 1].row) === 1));
}

console.log('\n[4] 戰鬥數學');
{
  const heavy = { def: 1.22, weapons: [] };
  const light = { def: 0.92, weapons: [] };
  eq('太空地形不打折', C.terrainAdapt(heavy, H.TERRAIN.space), 1.0);
  ok('重裝機在暗礁吃虧比輕型多',
    C.terrainAdapt(heavy, H.TERRAIN.debris) < C.terrainAdapt(light, H.TERRAIN.debris),
    { heavy: C.terrainAdapt(heavy, H.TERRAIN.debris), light: C.terrainAdapt(light, H.TERRAIN.debris) });
  eq('基礎傷害 20 / 防禦 1.0', C.damage(20, 1, 1), 20);
  ok('防禦越高傷害越低', C.damage(20, 1, 1.22) < C.damage(20, 1, 1));
  ok('傷害至少 1（不會變 0）', C.damage(1, 0.1, 2) >= 1);
}

console.log('\n[5] 機體資料表');
{
  const defs = U.UNIT_DEFS;
  eq('機體總數', defs.length, 8);
  eq('藍軍 4 台', defs.filter(d => d.side === 'blue').length, 4);
  eq('紅軍 4 台', defs.filter(d => d.side === 'red').length, 4);
  ok('id 不重複', new Set(defs.map(d => d.id)).size === defs.length);
  ok('每台都有 4 個武器欄位', defs.every(d => d.weapons.length === 4), defs.map(d => d.weapons.length));
  ok('每台都有近戰（武器2）', defs.every(d => d.weapons[1] && d.weapons[1].t === 'melee'));
  ok('武器都有傷害與冷卻', defs.every(d => d.weapons.filter(Boolean).every(w => w.dmg > 0 && w.cd > 0)));
  ok('TEC 越高越貴', defs.every(d => (d.tec === 1 && d.cost <= 160) || (d.tec === 2 && d.cost === 220) || (d.tec === 3 && d.cost === 400)),
    defs.map(d => [d.code, d.tec, d.cost]));
  ok('兩軍成本結構對稱', [1, 2, 3].every(t => {
    const b = defs.filter(d => d.side === 'blue' && d.tec === t).map(d => d.cost).sort();
    const r = defs.filter(d => d.side === 'red' && d.tec === t).map(d => d.cost).sort();
    return JSON.stringify(b) === JSON.stringify(r);
  }));
  ok('雙方總戰力差距 < 12%', (() => {
    const p = s => defs.filter(d => d.side === s).reduce((a, d) => a + C.power(d, d.hp), 0);
    const b = p('blue'), r = p('red');
    return Math.abs(b - r) / Math.max(b, r) < 0.12;
  })(), { blue: defs.filter(d => d.side === 'blue').reduce((a, d) => a + C.power(d, d.hp), 0), red: defs.filter(d => d.side === 'red').reduce((a, d) => a + C.power(d, d.hp), 0) });
}

console.log('\n[6] 長線成長與 15 分鐘節奏');
{
  eq('存活一戰獲得 1 XP', P.battleXp(0, true), 1);
  eq('擊墜 2 台並存活獲得 5 XP', P.battleXp(2, true), 5);
  eq('3 XP 升為老練', P.veteranRank(3).code, 'R1');
  eq('7 XP 升為精銳', P.veteranRank(7).code, 'R2');
  eq('12 XP 升為 ACE', P.veteranRank(12).code, 'ACE');
  eq('工廠每回合維修 20%', P.repairAtFactory(40, 60, true), 52);
  eq('維修不超過最大 HP', P.repairAtFactory(58, 60, true), 60);
  eq('非己方工廠不維修', P.repairAtFactory(40, 60, false), 40);
  ok('四段作戰目標涵蓋開局、交戰、養成、終局', P.OPERATIONS.length === 4);
  ok('起始 4 設施尚未完成先遣擴張', !P.operationProgress(0, { facilities: 4 }).done);
  ok('控制第 5 座設施完成先遣擴張', P.operationProgress(0, { facilities: 5 }).done);
  ok('兩場勝利才完成前線交鋒', !P.operationProgress(1, { battleWins: 1 }).done && P.operationProgress(1, { battleWins: 2 }).done);
}

console.log('\n[7] 正式美術動畫時間軸');
{
  const loop = { frames: 4, fps: 4, loop: true };
  eq('4 FPS 起始幀', A.artFrameIndex(loop, 0), 0);
  eq('4 FPS 每 15 tick 換幀', A.artFrameIndex(loop, 15), 1);
  eq('循環會回到第 1 幀', A.artFrameIndex(loop, 60), 0);
  const attack = { frames: 5, fps: 12, loop: false };
  eq('動作進度 0% 是第 1 幀', A.artFrameIndex(attack, 0, 0), 0);
  eq('動作進度 60% 是第 4 幀', A.artFrameIndex(attack, 0, 0.6), 3);
  eq('非循環動作停在末幀', A.artFrameIndex(attack, 999), 4);
}

console.log('\n[8] 網頁正式設施 atlas 契約');
{
  const root = path.join(__dirname, '..', 'assets', 'artpack', 'runtime');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'artpack.json'), 'utf8'));
  const pngSize = p => {
    const b = fs.readFileSync(p);
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };
  eq('正式設施數 = 2', index.facilities.length, 2);
  ok('工廠／都市各有 4 幀 manifest', index.facilities.every(f => {
    const dir = path.join(root, f.path);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    return manifest.animation.rows.idle.frames === 4 &&
      manifest.frame_layout.rows.idle.length === 4 &&
      JSON.stringify(pngSize(path.join(dir, manifest.game_input))) === '[128,32]';
  }));
}

console.log('\n[9] Unity 共用美術包契約');
{
  const pkgRoot = path.join(__dirname, '..', 'unity-package', 'com.treefar.stellar-commander-artpack');
  const manifestPath = path.join(pkgRoot, 'Runtime', 'Resources', 'StellarCommanderArt', 'unity-artpack.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pngSize = p => {
    const b = fs.readFileSync(p);
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };
  eq('Unity package 識別字', JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).name, 'com.treefar.stellar-commander-artpack');
  eq('Unity 機體數 = 8', manifest.units.length, 8);
  ok('Unity 每台都有 4 個狀態與 4/6/4/5 幀', manifest.units.every(u => JSON.stringify(u.states.map(s => s.frames)) === '[4,6,4,5]'));
  const resourceRoot = path.join(pkgRoot, 'Runtime', 'Resources');
  ok('Unity 八張 atlas 都是 192x128', manifest.units.every(u => {
    const file = path.join(resourceRoot, u.texture + '.png');
    return fs.existsSync(file) && JSON.stringify(pngSize(file)) === '[192,128]';
  }));
  eq('Unity 正式設施數 = 2', manifest.facilities.length, 2);
  ok('Unity 工廠／都市 atlas 都是 128x32', manifest.facilities.every(f => {
    const file = path.join(resourceRoot, f.texture + '.png');
    return fs.existsSync(file) && JSON.stringify(pngSize(file)) === '[128,32]' && f.states[0].frames === 4;
  }));
  const bg = manifest.scenery[0];
  const bgFile = path.join(resourceRoot, bg.texture + '.png');
  ok('Unity 正式背景是 256x224', fs.existsSync(bgFile) && JSON.stringify(pngSize(bgFile)) === '[256,224]');
}

console.log(`\n結果：${pass} 通過 / ${fail} 失敗\n`);
process.exit(fail ? 1 : 0);
