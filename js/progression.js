/* progression.js — 15 分鐘戰局的長線目標、戰歷與維修規則（純函式，可由 Node 測試） */
'use strict';

const VETERAN_RANKS = [
  { id: 0, xp: 0, zh: '新兵', code: 'R0', dmg: 1.00 },
  { id: 1, xp: 3, zh: '老練', code: 'R1', dmg: 1.05 },
  { id: 2, xp: 7, zh: '精銳', code: 'R2', dmg: 1.10 },
  { id: 3, xp: 12, zh: '王牌', code: 'ACE', dmg: 1.15 }
];

const OPERATIONS = [
  { id: 'expand', zh: '先遣擴張', brief: '控制 5 座設施', key: 'facilities', target: 5, reward: 100 },
  { id: 'skirmish', zh: '前線交鋒', brief: '贏得 2 場戰鬥', key: 'battleWins', target: 2, reward: 140 },
  { id: 'veteran', zh: '精銳養成', brief: '培養 1 台精銳機', key: 'rankedUnits', target: 1, reward: 180 },
  { id: 'siege', zh: '終局壓制', brief: '紅軍工廠降至 1 座', key: 'enemyFactoriesLost', target: 1, reward: 220 }
];

function veteranRank(xp) {
  let rank = VETERAN_RANKS[0];
  for (const r of VETERAN_RANKS) if ((xp || 0) >= r.xp) rank = r;
  return rank;
}

function battleXp(kills, survived) {
  return Math.max(0, kills | 0) * 2 + (survived ? 1 : 0);
}

function repairAtFactory(hp, maxHp, enabled) {
  hp = Math.max(0, Math.min(maxHp, hp));
  if (!enabled || hp <= 0 || hp >= maxHp) return hp;
  return Math.min(maxHp, hp + Math.max(1, Math.ceil(maxHp * 0.2)));
}

function operationProgress(index, state) {
  const op = OPERATIONS[Math.max(0, Math.min(OPERATIONS.length - 1, index | 0))];
  const current = Math.max(0, Math.min(op.target, Number(state && state[op.key]) || 0));
  return { op, current, target: op.target, done: current >= op.target };
}

if (typeof module !== 'undefined') module.exports = {
  VETERAN_RANKS, OPERATIONS, veteranRank, battleXp, repairAtFactory, operationProgress
};
