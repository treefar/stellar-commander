/* balance.test.cjs — 戰鬥平衡回歸測試（在 Node 跑模擬戰，不需瀏覽器）
   把 js/ 的模組載進 vm 沙箱，讓兩台機體全自動對打，統計勝率與交戰長度。
   用法：node tests/balance.test.cjs [每組場次，預設 15]
   注意：戰鬥有隨機成分，門檻刻意放寬，只抓「明顯壞掉」的失衡。 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const RUNS = parseInt(process.argv[2] || '15', 10);

// 固定亂數種子，讓同一份程式碼每次跑出同樣結果（方便比對回歸）
let seed = 20260815;
function seededRandom() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

const sandbox = {
  console,
  Math: Object.create(Math),
  ImageData: function () { },
  requestAnimationFrame: () => 0,
  addEventListener: () => { }
};
sandbox.Math.random = seededRandom;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['core.js', 'audio.js', 'combat.js', 'hex.js', 'units.js', 'battle.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), sandbox, { filename: f });
}
vm.runInContext('UnitDB.init();', sandbox);

// 這些檔案用 const 宣告，不會掛在 sandbox 物件上，要在 context 裡取值
const UnitDB = vm.runInContext('UnitDB', sandbox);
const Battle = vm.runInContext('Battle', sandbox);
const TERRAIN = vm.runInContext('TERRAIN', sandbox);
const UNIT_DEFS = vm.runInContext('UNIT_DEFS', sandbox);

function duel(blueId, redId, runs) {
  const mk = id => ({ id, hp: UnitDB.get(id).hp, ref: {} });
  let bw = 0, rw = 0, tie = 0, frames = 0;
  for (let n = 0; n < runs; n++) {
    let done = null;
    Battle.start({
      blue: [mk(blueId)], red: [mk(redId)], terrain: TERRAIN.space,
      playerSide: 'blue', playerIdx: 0, auto: true, seconds: 60, skill: 0.5,
      onEnd: r => { done = r; }
    });
    let f = 0;
    while (f < 3700 && !done) { Battle.update(); f++; }
    frames += f;
    if (!done || done.result === 'draw' || done.result === 'time') tie++;
    else if (done.result === 'blue') bw++; else rw++;
  }
  return { bw, rw, tie, sec: +(frames / runs / 60).toFixed(1) };
}

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const PAIRS = [
  ['GD01', 'GR01', '第 1 階 100 元'],
  ['SW02', 'LC02', '第 1 階 160 元'],
  ['BW03', 'WL03', '第 2 階 220 元'],
  ['PL00', 'RP00', '第 3 階 400 元']
];

// 門檻放到 15%~85%：單場勝負隨機性大，15 場的樣本本來就會晃，
// 這裡只要抓得到「0:15 那種明顯壞掉」即可，不追求統計精度。
console.log(`\n[平衡] 同階對戰勝率（每組 ${RUNS} 場，可接受 15%~85%）`);
for (const [b, r, label] of PAIRS) {
  const d = duel(b, r, RUNS);
  const decided = d.bw + d.rw;
  const rate = decided ? d.bw / decided : 0.5;
  console.log(`        ${label}  ${b} ${d.bw} : ${d.rw} ${r}  平${d.tie}  平均 ${d.sec}s`);
  ok(`${label} 沒有一面倒`, decided === 0 || (rate >= 0.15 && rate <= 0.85), { 藍勝率: +rate.toFixed(2) });
  ok(`${label} 交戰長度在 4~40 秒`, d.sec >= 4 && d.sec <= 40, { 秒: d.sec });
}

console.log('\n[平衡] 跨階：貴的要贏便宜的');
const CROSS = [
  ['BW03', 'GR01'], ['BW03', 'LC02'], ['PL00', 'WL03'], ['PL00', 'LC02']
];
for (const [b, r] of CROSS) {
  const cb = UnitDB.get(b).cost, cr = UnitDB.get(r).cost;
  const d = duel(b, r, Math.max(7, RUNS - 6));
  const decided = d.bw + d.rw;
  console.log(`        ${b}(${cb}) ${d.bw} : ${d.rw} ${r}(${cr})`);
  ok(`${b}(${cb}) 應勝過 ${r}(${cr})`, decided === 0 || d.bw / decided >= 0.6, { 勝率: +(d.bw / decided).toFixed(2) });
}
const CROSS_R = [['GD01', 'WL03'], ['SW02', 'RP00']];
for (const [b, r] of CROSS_R) {
  const d = duel(b, r, Math.max(7, RUNS - 6));
  const decided = d.bw + d.rw;
  console.log(`        ${b}(${UnitDB.get(b).cost}) ${d.bw} : ${d.rw} ${r}(${UnitDB.get(r).cost})`);
  ok(`${r} 應勝過較便宜的 ${b}`, decided === 0 || d.rw / decided >= 0.6, { 紅勝率: +(d.rw / decided).toFixed(2) });
}

console.log('\n[平衡] 每台都要有無限彈藥的保底武器（打光後不能變空手）');
for (const d of UNIT_DEFS) {
  const inf = d.weapons.filter(Boolean).filter(w => w.ammo < 0 && w.t !== 'melee');
  ok(`${d.code} ${d.name} 有無限遠程武器`, inf.length > 0, d.weapons.filter(Boolean).map(w => `${w.zh}:${w.ammo}`));
}

console.log(`\n結果：${pass} 通過 / ${fail} 失敗\n`);
process.exit(fail ? 1 : 0);
