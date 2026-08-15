/* units.js — 機體資料表
   數值來源：企劃書第 5.4 節（起始值，靠實測調整）
   武器 t：beam=光束/實彈直射、melee=近戰、rapid=速射、shell=大口徑慢彈、
          charge=蓄力散彈、funnel=浮游砲、spread=散彈
   ammo = -1 代表無限。cd 單位為 frame（60fps）。 */
'use strict';

const UNIT_DEFS = [
  /* ===== 藍軍 BLUE ===== */
  {
    id: 'GD01', code: 'GD-01', name: '守衛', en: 'GUARD', side: 'blue', tec: 1, cost: 100,
    hp: 60, mp: 4, spd: 1.55, acc: 0.17, def: 1.0, role: '量產機',
    weapons: [
      { t: 'beam', n: 'BEAM RIFLE', zh: '光束步槍', dmg: 15, ammo: 20, cd: 22, bs: 4.2 },
      { t: 'melee', n: 'BEAM SABER', zh: '光束軍刀', dmg: 25, ammo: -1, cd: 34, reach: 17 },
      { t: 'rapid', n: 'VULCAN', zh: '火神砲', dmg: 5, ammo: -1, cd: 7, bs: 5.2 },
      null
    ],
    art: { head: 'visor', shoulder: 'std', back: 'thruster', weapon: 'rifle', bulk: 0 }, pal: 'guard'
  },
  {
    id: 'SW02', code: 'SW-02', name: '迅擊', en: 'SWIFT', side: 'blue', tec: 1, cost: 160,
    hp: 58, mp: 6, spd: 2.15, acc: 0.26, def: 0.92, role: '高機動機',
    weapons: [
      { t: 'beam', n: 'BEAM RIFLE', zh: '光束步槍', dmg: 15, ammo: 20, cd: 20, bs: 4.6 },
      { t: 'melee', n: 'BEAM SABER', zh: '光束軍刀', dmg: 25, ammo: -1, cd: 30, reach: 17 },
      { t: 'missile', n: 'MISSILE', zh: '追蹤飛彈', dmg: 20, ammo: 6, cd: 42, bs: 2.4 },
      // 無限彈藥的保底武器。實測沒有它的話，彈藥打光後最後 3~5 秒等於空手挨打
      { t: 'rapid', n: 'VULCAN', zh: '火神砲', dmg: 5, ammo: -1, cd: 7, bs: 5.2 }
    ],
    art: { head: 'duo', shoulder: 'std', back: 'wing', weapon: 'beam', bulk: 0 }, pal: 'swift'
  },
  {
    id: 'BW03', code: 'BW-03', name: '重砲', en: 'BULWARK', side: 'blue', tec: 2, cost: 220,
    hp: 90, mp: 3, spd: 1.25, acc: 0.15, def: 1.22, role: '重裝機',
    weapons: [
      { t: 'beam', n: 'BEAM RIFLE', zh: '光束步槍', dmg: 20, ammo: 20, cd: 26, bs: 4.0 },
      { t: 'melee', n: 'BEAM SABER', zh: '光束軍刀', dmg: 20, ammo: -1, cd: 38, reach: 16 },
      { t: 'shell', n: 'CANNON', zh: '加農砲', dmg: 35, ammo: 8, cd: 58, bs: 2.9, rad: 16 },
      { t: 'rapid', n: 'VULCAN', zh: '火神砲', dmg: 5, ammo: -1, cd: 7, bs: 5.2 }
    ],
    art: { head: 'helm', shoulder: 'big', back: 'cannon', weapon: 'cannon', bulk: 2 }, pal: 'bulwark'
  },
  {
    id: 'PL00', code: 'PL-00', name: '聖騎', en: 'PALADIN', side: 'blue', tec: 3, cost: 400,
    hp: 100, mp: 5, spd: 2.0, acc: 0.24, def: 1.12, role: '王牌機',
    weapons: [
      { t: 'beam', n: 'BEAM RIFLE', zh: '光束步槍', dmg: 25, ammo: 24, cd: 20, bs: 4.8 },
      { t: 'melee', n: 'BEAM SABER', zh: '光束軍刀', dmg: 40, ammo: -1, cd: 30, reach: 18 },
      { t: 'rapid', n: 'VULCAN', zh: '火神砲', dmg: 5, ammo: -1, cd: 6, bs: 5.4 },
      { t: 'charge', n: 'HYPER CANNON', zh: '蓄力散彈', dmg: 36, ammo: -1, cd: 90, bs: 3.6, chg: 45, hpCost: 6, count: 3 }
    ],
    art: { head: 'ace', shoulder: 'big', back: 'wing', weapon: 'beam', bulk: 1 }, pal: 'paladin'
  },

  /* ===== 紅軍 RED ===== */
  {
    id: 'GR01', code: 'GR-01', name: '突擊', en: 'GRUNT', side: 'red', tec: 1, cost: 100,
    hp: 60, mp: 4, spd: 1.55, acc: 0.17, def: 1.0, role: '量產機',
    weapons: [
      { t: 'rapid', n: 'MACHINE GUN', zh: '機槍', dmg: 8, ammo: 40, cd: 9, bs: 4.8 },
      { t: 'melee', n: 'HEAT AXE', zh: '熱能斧', dmg: 25, ammo: -1, cd: 34, reach: 17 },
      { t: 'rapid', n: 'VULCAN', zh: '火神砲', dmg: 5, ammo: -1, cd: 7, bs: 5.2 },
      null
    ],
    art: { head: 'mono', shoulder: 'spike', back: 'thruster', weapon: 'mg', bulk: 0 }, pal: 'grunt'
  },
  {
    id: 'LC02', code: 'LC-02', name: '疾風', en: 'LANCER', side: 'red', tec: 1, cost: 160,
    hp: 62, mp: 6, spd: 2.1, acc: 0.25, def: 0.98, role: '高機動機',
    weapons: [
      { t: 'shell', n: 'BAZOOKA', zh: '巴祖卡', dmg: 30, ammo: 8, cd: 50, bs: 3.1, rad: 14 },
      { t: 'melee', n: 'HEAT SABER', zh: '熱能軍刀', dmg: 25, ammo: -1, cd: 30, reach: 17 },
      { t: 'spread', n: 'SCATTER', zh: '散彈', dmg: 8, ammo: -1, cd: 44, bs: 3.8, count: 5 },
      null
    ],
    art: { head: 'mono', shoulder: 'big', back: 'thruster', weapon: 'bazooka', bulk: 1 }, pal: 'lancer'
  },
  {
    id: 'WL03', code: 'WL-03', name: '強襲', en: 'WARLORD', side: 'red', tec: 2, cost: 220,
    hp: 90, mp: 4, spd: 1.55, acc: 0.17, def: 1.14, role: '重裝機',
    weapons: [
      { t: 'beam', n: 'BEAM RIFLE', zh: '光束步槍', dmg: 23, ammo: 22, cd: 22, bs: 4.3 },
      { t: 'melee', n: 'BEAM NAGINATA', zh: '光束薙刀', dmg: 30, ammo: -1, cd: 32, reach: 19 },
      { t: 'rapid', n: 'VULCAN', zh: '火神砲', dmg: 5, ammo: -1, cd: 7, bs: 5.2 },
      null
    ],
    art: { head: 'mono', shoulder: 'big', back: 'thruster', weapon: 'beam', bulk: 1 }, pal: 'warlord'
  },
  {
    id: 'RP00', code: 'RP-00', name: '死神', en: 'REAPER', side: 'red', tec: 3, cost: 400,
    hp: 95, mp: 5, spd: 2.0, acc: 0.24, def: 1.1, role: '王牌機',
    weapons: [
      { t: 'beam', n: 'BEAM RIFLE', zh: '光束步槍', dmg: 25, ammo: 24, cd: 20, bs: 4.8 },
      { t: 'melee', n: 'BEAM SABER', zh: '光束軍刀', dmg: 35, ammo: -1, cd: 30, reach: 18 },
      { t: 'rapid', n: 'VULCAN', zh: '火神砲', dmg: 5, ammo: -1, cd: 6, bs: 5.4 },
      { t: 'funnel', n: 'FUNNEL', zh: '浮游砲', dmg: 11, ammo: -1, cd: 300, count: 3, life: 240, bs: 4.0 }
    ],
    art: { head: 'ace', shoulder: 'spike', back: 'funnel', weapon: 'beam', bulk: 1 }, pal: 'reaper'
  }
];

const UnitDB = {
  byId: {},
  sprites: {},
  init() {
    for (const u of UNIT_DEFS) this.byId[u.id] = u;
    if (typeof document !== 'undefined') {
      for (const u of UNIT_DEFS) this.sprites[u.id] = Spr.build(u);
    }
  },
  list(side, tec) {
    return UNIT_DEFS.filter(u => u.side === side && u.tec <= tec);
  },
  get(id) { return this.byId[id]; },
  spr(id) { return this.sprites[id]; }
};

if (typeof module !== 'undefined') module.exports = { UNIT_DEFS };
