/* combat.js — 戰鬥數學（純函式，Node 可直接測）
   企劃書 5.2：實際傷害 = 武器基礎傷害 × 攻方地形適性 ÷ 守方防禦係數 */
'use strict';

/** 機體對地形的適性：重裝機（def 高、速度慢）在暗礁／星雲吃虧 */
function terrainAdapt(unitDef, terrain) {
  if (!terrain || terrain.id === 'space') return 1.0;
  const heavy = unitDef.def >= 1.1;
  const base = terrain.adapt;
  return heavy ? base : (base + (1 - base) * 0.6);   // 輕型機受的懲罰只有 4 成
}

/** 單發傷害 */
function damage(baseDmg, atkAdapt, defFactor) {
  const d = baseDmg * atkAdapt / (defFactor || 1);
  return Math.max(1, Math.round(d));
}

/**
 * 戰略層用的威脅值（AI 挑目標用）。
 * 不是精準的強度模型——真正的平衡由 tests/balance.test.cjs 的模擬對戰驗證。
 * 但要把幾件事算對，不然 AI 會挑錯目標：
 *   近戰要貼身才打得到 → 打 0.35 折
 *   有限彈藥打得完 → 打 0.7 折
 *   蓄力砲的循環要含蓄力時間
 *   浮游砲是部署後持續射擊，不是「每 cd 打一發」
 *   散彈／蓄力砲一次多發，要乘發數
 */
function power(unitDef, hp) {
  let dps = 0;
  for (const w of unitDef.weapons) {
    if (!w) continue;
    const shots = w.count || 1;
    if (w.t === 'funnel') {
      dps += w.dmg * shots * Math.min(1, (w.life || 0) / Math.max(1, w.cd));
      continue;
    }
    let interval = Math.max(6, w.cd);
    let k = 1;
    if (w.t === 'melee') k = 0.35;
    else if (w.t === 'charge') interval += (w.chg || 0);
    else if (w.ammo >= 0) k = 0.7;
    dps += w.dmg * shots * 60 / interval * k;
  }
  return Math.round(dps * (hp / 100) * (unitDef.def || 1));
}

if (typeof module !== 'undefined') module.exports = { terrainAdapt, damage, power };
