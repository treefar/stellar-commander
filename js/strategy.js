/* strategy.js — 回合制六角格戰略層（企劃書 5.1）
   流程：回合開始 → 收入 → 玩家行動 → 結束回合 → 電腦行動 → 檢查勝負 */
'use strict';

const BAR_H = 16;            // 上方狀態列
const PANEL_Y = 178;         // 下方資訊面板起點
const VIEW_H = PANEL_Y - BAR_H;
const INCOME_CITY = 30, INCOME_FACTORY = 10;
const TEC_STEPS = [0, 14, 38];   // 累積點數門檻 → TEC 1/2/3

const Strat = {
  cells: null, units: [], cursor: { col: 1, row: 10 }, cam: { x: 0, y: 0 },
  money: { blue: 300, red: 300 }, tec: { blue: 1, red: 1 }, tecPts: { blue: 0, red: 0 },
  turn: 1, side: 'blue', turnLimit: 30, mode: 'map',
  sel: null, reach: null, menu: null, msg: '', msgT: 0,
  anim: null, ai: null, tiles: null, blink: 0, pendingBattle: null,
  victory: null, skill: 0.5, battleSeconds: 60, uid: 1,
  stats: null, operationIndex: 0, operationFlash: 0,

  init(opt) {
    opt = opt || {};
    this.cells = buildMap();
    this.units = [];
    this.money = { blue: 300, red: 300 };
    this.tec = { blue: 1, red: 1 };
    this.tecPts = { blue: 0, red: 0 };
    this.turn = 1; this.side = 'blue'; this.mode = 'map';
    this.sel = null; this.reach = null; this.menu = null; this.anim = null; this.ai = null;
    this.victory = null; this.uid = 1;
    this.stats = {
      blue: { battleWins: 0, kills: 0 },
      red: { battleWins: 0, kills: 0 }
    };
    this.operationIndex = 0; this.operationFlash = 0;
    this.turnLimit = opt.turnLimit || 30;
    this.skill = opt.skill === undefined ? 0.5 : opt.skill;
    this.battleSeconds = opt.seconds || 60;
    if (!this.tiles) this.buildTiles();
    // 起始部隊：各方兩台量產機
    this.spawn('GD01', 'blue', 1, 10); this.spawn('SW02', 'blue', 5, 11);
    this.spawn('GR01', 'red', 8, 0); this.spawn('LC02', 'red', 12, 1);
    this.cursor = { col: 1, row: 10 };
    this.centerOn(1, 10);
    this.startTurn('blue', true);
    Sfx.play('map');
  },

  spawn(defId, side, col, row) {
    const d = UnitDB.get(defId);
    const u = {
      uid: this.uid++, id: defId, side, col, row,
      hp: d.hp, mp: d.mp, acted: false, capturing: false, justBuilt: false,
      xp: 0, kills: 0
    };
    this.units.push(u);
    return u;
  },

  occ(c, r) { return this.units.find(u => u.col === c && u.row === r) || null; },
  cell(c, r) { return inMap(c, r) ? this.cells[r][c] : null; },
  count(side, fac) {
    let n = 0;
    for (const row of this.cells) for (const c of row) if (c.owner === side && (!fac || c.fac === fac)) n++;
    return n;
  },

  /* ---------- 回合 ---------- */
  startTurn(side, first) {
    this.side = side;
    let notice = '';
    if (!first) {
      const cities = this.count(side, 'city'), facs = this.count(side, 'factory');
      this.money[side] += cities * INCOME_CITY + facs * INCOME_FACTORY;
      this.tecPts[side] += facs * 2;
      let lv = 1;
      for (let i = 0; i < TEC_STEPS.length; i++) if (this.tecPts[side] >= TEC_STEPS[i]) lv = i + 1;
      if (lv > this.tec[side]) { this.tec[side] = lv; if (side === 'blue') this.say(`TEC 提升到 ${lv} 級，解鎖新機體`); }
    }
    let repaired = 0;
    for (const u of this.units) if (u.side === side) {
      const c = this.cell(u.col, u.row);
      const d = UnitDB.get(u.id);
      const hp0 = u.hp;
      u.hp = repairAtFactory(u.hp, d.hp, !!(c && c.fac === 'factory' && c.owner === side));
      repaired += u.hp - hp0;
      u.acted = false; u.mp = UnitDB.get(u.id).mp; u.justBuilt = false;
    }
    if (side === 'blue') {
      notice = this.checkOperation();
      this.mode = 'map';
      this.say(notice || `第 ${this.turn} 回合 — 藍軍行動${repaired ? `　工廠維修 +${repaired}` : ''}`);
    }
    else { this.mode = 'aiturn'; this.ai = { i: 0, wait: 20, phase: 'produce' }; }
  },

  operationState() {
    return {
      facilities: this.count('blue'),
      battleWins: this.stats.blue.battleWins,
      rankedUnits: this.units.filter(u => u.side === 'blue' && veteranRank(u.xp).id >= 2).length,
      enemyFactoriesLost: Math.max(0, 2 - this.count('red', 'factory'))
    };
  },

  checkOperation() {
    if (this.operationIndex >= OPERATIONS.length) return '';
    const p = operationProgress(this.operationIndex, this.operationState());
    if (!p.done) return '';
    this.money.blue += p.op.reward;
    this.operationIndex++;
    this.operationFlash = 240;
    Sfx.ok();
    return `作戰完成：${p.op.zh}　獎勵 ${p.op.reward}G`;
  },

  endTurn() {
    // 佔領結算
    for (const u of this.units) {
      if (u.side !== this.side || !u.capturing) continue;
      const c = this.cell(u.col, u.row);
      if (c && c.fac) {
        c.owner = u.side;
        if (u.side === 'blue') this.say(`佔領了${c.fac === 'factory' ? '工廠' : '都市'}`);
        Sfx.ok();
      }
      u.capturing = false;
    }
    this.sel = null; this.reach = null; this.menu = null;
    if (this.checkVictory()) return;
    if (this.side === 'blue') this.startTurn('red');
    else { this.turn++; if (this.turn > this.turnLimit) { this.finishByPoints(); return; } this.startTurn('blue'); }
  },

  checkVictory() {
    const bu = this.units.some(u => u.side === 'blue'), ru = this.units.some(u => u.side === 'red');
    const bf = this.count('blue', 'factory'), rf = this.count('red', 'factory');
    if (!ru || rf === 0) { this.victory = 'blue'; return true; }
    if (!bu || bf === 0) { this.victory = 'red'; return true; }
    return false;
  },
  finishByPoints() {
    const b = this.count('blue'), r = this.count('red');
    this.victory = b > r ? 'blue' : b < r ? 'red' : 'draw';
  },

  say(t) { this.msg = t; this.msgT = 200; },

  /* ---------- 攝影機 ---------- */
  centerOn(col, row) {
    const p = hexToPixel(col, row);
    const mapW = MAP_W * HEX_W + HEX_W / 2, mapH = (MAP_H - 1) * HEX_VS + HEX_H;
    this.cam.x = clamp(p.x + HEX_W / 2 - GW / 2, 0, Math.max(0, mapW - GW));
    this.cam.y = clamp(p.y + HEX_H / 2 - VIEW_H / 2, 0, Math.max(0, mapH - VIEW_H));
  },
  followCursor() {
    const p = hexToPixel(this.cursor.col, this.cursor.row);
    const mapW = MAP_W * HEX_W + HEX_W / 2, mapH = (MAP_H - 1) * HEX_VS + HEX_H;
    const mx = clamp(this.cam.x, 0, Math.max(0, mapW - GW));
    let cx = mx;
    if (p.x - 34 < cx) cx = p.x - 34;
    if (p.x + HEX_W + 34 > cx + GW) cx = p.x + HEX_W + 34 - GW;
    let cy = this.cam.y;
    if (p.y - 22 < cy) cy = p.y - 22;
    if (p.y + HEX_H + 22 > cy + VIEW_H) cy = p.y + HEX_H + 22 - VIEW_H;
    this.cam.x = clamp(cx, 0, Math.max(0, mapW - GW));
    this.cam.y = clamp(cy, 0, Math.max(0, mapH - VIEW_H));
  },

  /* ---------- 更新 ---------- */
  update() {
    this.blink++;
    if (this.operationFlash > 0) this.operationFlash--;
    if (this.msgT > 0) this.msgT--;
    if (this.anim) { this.updateAnim(); return; }
    if (this.victory) return;
    if (this.mode === 'aiturn') { this.updateAI(); return; }
    if (this.mode === 'map') this.updateMap();
    else if (this.mode === 'move') this.updateMove();
    else if (this.mode === 'action' || this.mode === 'produce' || this.mode === 'sys') this.updateMenu();
    else if (this.mode === 'target') this.updateTarget();
  },

  moveCursor() {
    let m = false;
    const { col, row } = this.cursor;
    if (Input.p('up') && row > 0) { this.cursor.row--; m = true; }
    else if (Input.p('down') && row < MAP_H - 1) { this.cursor.row++; m = true; }
    else if (Input.p('left') && col > 0) { this.cursor.col--; m = true; }
    else if (Input.p('right') && col < MAP_W - 1) { this.cursor.col++; m = true; }
    if (m) { Sfx.cursor(); this.followCursor(); }
    return m;
  },

  updateMap() {
    this.moveCursor();
    if (Input.p('c')) {
      this.mode = 'sys';
      this.menu = { items: [{ k: 'end', zh: '結束回合' }, { k: 'save', zh: '存檔' }, { k: 'load', zh: '讀檔' }, { k: 'sfx', zh: '音效開關' }, { k: 'back', zh: '返回' }], i: 0 };
      Sfx.ok(); return;
    }
    if (Input.p('a')) {
      const u = this.occ(this.cursor.col, this.cursor.row);
      const c = this.cell(this.cursor.col, this.cursor.row);
      if (u && u.side === 'blue' && !u.acted) {
        this.sel = u;
        this.reach = reachable(this.cells, u, u.mp, u.side, (c2, r2) => this.occ(c2, r2));
        this.mode = 'move';
        Sfx.ok();
      } else if (!u && c && c.fac === 'factory' && c.owner === 'blue') {
        this.openProduce(c);
      } else Sfx.cancel();
    }
  },

  updateMove() {
    this.moveCursor();
    if (Input.p('b')) { this.sel = null; this.reach = null; this.mode = 'map'; Sfx.cancel(); return; }
    if (Input.p('a')) {
      const k = this.cursor.col + ',' + this.cursor.row;
      if (this.cursor.col === this.sel.col && this.cursor.row === this.sel.row) {
        this.openAction(this.sel); return;
      }
      if (this.reach.has(k)) {
        const path = pathTo(this.reach, this.sel, this.cursor.col, this.cursor.row);
        this.anim = { u: this.sel, path, i: 0, t: 0 };
        Sfx.cursor();
      } else Sfx.cancel();
    }
  },

  updateAnim() {
    const a = this.anim;
    a.t++;
    if (a.t >= 7) {
      a.t = 0; a.i++;
      if (a.i >= a.path.length) {
        const last = a.path[a.path.length - 1];
        a.u.col = last.col; a.u.row = last.row;
        this.anim = null;
        if (a.u.side === 'blue') { this.cursor = { col: last.col, row: last.row }; this.followCursor(); this.openAction(a.u); }
        else if (this.aiAfterMove) { const f = this.aiAfterMove; this.aiAfterMove = null; f(); }
        return;
      }
      const step = a.path[a.i];
      a.u.col = step.col; a.u.row = step.row;
      if (a.u.side === 'red') { this.cursor = { col: step.col, row: step.row }; this.followCursor(); }
    }
  },

  openAction(u) {
    const items = [];
    const foes = this.adjEnemies(u);
    if (foes.length) items.push({ k: 'atk', zh: '攻擊' });
    const c = this.cell(u.col, u.row);
    if (c && c.fac && c.owner !== u.side) items.push({ k: 'cap', zh: '佔領' });
    items.push({ k: 'wait', zh: '待機' });
    items.push({ k: 'cancel', zh: '取消' });
    this.menu = { items, i: 0, u };
    this.mode = 'action';
  },

  adjEnemies(u) {
    const out = [];
    for (const [c, r] of hexNeighbors(u.col, u.row)) {
      if (!inMap(c, r)) continue;
      const o = this.occ(c, r);
      if (o && o.side !== u.side) out.push(o);
    }
    return out;
  },

  openProduce(c) {
    const list = UnitDB.list('blue', this.tec.blue);
    this.menu = {
      items: list.map(d => ({ k: d.id, zh: `${d.code} ${d.name}`, cost: d.cost, def: d })).concat([{ k: 'cancel', zh: '取消' }]),
      i: 0, cell: c
    };
    this.mode = 'produce';
    Sfx.ok();
  },

  updateMenu() {
    const m = this.menu;
    if (Input.p('up')) { m.i = (m.i - 1 + m.items.length) % m.items.length; Sfx.cursor(); }
    if (Input.p('down')) { m.i = (m.i + 1) % m.items.length; Sfx.cursor(); }
    if (Input.p('b')) { this.closeMenu(); Sfx.cancel(); return; }
    if (!Input.p('a')) return;
    const it = m.items[m.i];

    if (this.mode === 'sys') {
      if (it.k === 'end') { this.closeMenu(); this.endTurn(); }
      else if (it.k === 'save') { this.save(); this.say('已存檔'); this.closeMenu(); }
      else if (it.k === 'load') { if (this.load()) this.say('已讀檔'); else this.say('沒有存檔'); this.closeMenu(); }
      else if (it.k === 'sfx') { this.say(Sfx.toggle() ? '音效：開' : '音效：關'); }
      else this.closeMenu();
      Sfx.ok(); return;
    }
    if (this.mode === 'produce') {
      if (it.k === 'cancel') { this.closeMenu(); Sfx.cancel(); return; }
      if (this.money.blue < it.cost) { this.say('資金不足'); Sfx.cancel(); return; }
      this.money.blue -= it.cost;
      const u = this.spawn(it.k, 'blue', m.cell.col, m.cell.row);
      u.acted = true; u.justBuilt = true;
      this.say(`生產 ${it.def.code} ${it.def.name}`);
      this.closeMenu(); Sfx.ok(); return;
    }
    // action
    const u = m.u;
    if (it.k === 'atk') {
      const foes = this.adjEnemies(u);
      this.menu = null;
      if (foes.length === 1) { this.beginBattle(u, foes[0]); }
      else { this.mode = 'target'; this.targets = foes; this.ti = 0; this.attacker = u; this.cursor = { col: foes[0].col, row: foes[0].row }; }
      Sfx.ok(); return;
    }
    if (it.k === 'cap') { u.capturing = true; u.acted = true; this.say('佔領中（回合結束生效）'); this.closeMenu(); Sfx.ok(); return; }
    if (it.k === 'wait') { u.acted = true; this.closeMenu(); Sfx.ok(); return; }
    this.closeMenu(); Sfx.cancel();
  },

  closeMenu() { this.menu = null; this.sel = null; this.reach = null; this.mode = 'map'; },

  updateTarget() {
    if (Input.p('left') || Input.p('up')) { this.ti = (this.ti - 1 + this.targets.length) % this.targets.length; Sfx.cursor(); }
    if (Input.p('right') || Input.p('down')) { this.ti = (this.ti + 1) % this.targets.length; Sfx.cursor(); }
    const t = this.targets[this.ti];
    this.cursor = { col: t.col, row: t.row };
    if (Input.p('b')) { this.mode = 'action'; this.openAction(this.attacker); Sfx.cancel(); return; }
    if (Input.p('a')) { this.beginBattle(this.attacker, t); Sfx.ok(); }
  },

  /** 組戰鬥名單：防守方所在格 + 其 6 鄰格的所有單位（最多 7 台） */
  beginBattle(attacker, defender) {
    const hexes = [[defender.col, defender.row]].concat(hexNeighbors(defender.col, defender.row));
    const parts = [];
    for (const [c, r] of hexes) {
      if (!inMap(c, r)) continue;
      const u = this.occ(c, r);
      if (u) parts.push(u);
    }
    if (!parts.includes(attacker)) parts.push(attacker);
    const blue = parts.filter(u => u.side === 'blue');
    const red = parts.filter(u => u.side === 'red');
    const cell = this.cell(defender.col, defender.row);
    attacker.acted = true;
    this.sel = null; this.reach = null; this.menu = null; this.mode = 'map';
    this.pendingBattle = {
      blue, red, terrain: TERRAIN[cell.terrain],
      playerSide: 'blue',
      playerUnit: attacker.side === 'blue' ? attacker : (blue.includes(defender) ? defender : blue[0]),
      attackerSide: attacker.side
    };
  },

  /** 戰鬥結束回寫 */
  applyBattle(res) {
    const oldRanks = new Map();
    for (const r of res.units) oldRanks.set(r.ref.uid, veteranRank(r.ref.xp).id);
    for (const r of res.units) {
      const u = r.ref;
      u.kills = (u.kills || 0) + (r.kills || 0);
      this.stats[u.side].kills += r.kills || 0;
      if (r.dead) {
        const i = this.units.indexOf(u);
        if (i >= 0) this.units.splice(i, 1);
      } else {
        u.hp = r.hp;
        u.xp = (u.xp || 0) + battleXp(r.kills || 0, true);
        const rank = veteranRank(u.xp);
        if (rank.id > (oldRanks.get(u.uid) || 0) && u.side === 'blue') this.say(`${UnitDB.get(u.id).name} 晉升為${rank.zh}`);
      }
    }
    if (res.result === 'blue' || res.result === 'red') this.stats[res.result].battleWins++;
    if (this.checkVictory()) return;
    if (this.side === 'red' && this.mode !== 'aiturn') this.mode = 'aiturn';
  },

  /* ---------- 電腦回合 ---------- */
  updateAI() {
    const ai = this.ai;
    if (ai.wait-- > 0) return;
    ai.wait = 10;

    if (ai.phase === 'produce') {
      let built = false;
      for (const row of this.cells) for (const c of row) {
        if (built) break;
        if (c.owner !== 'red' || c.fac !== 'factory' || this.occ(c.col, c.row)) continue;
        const list = UnitDB.list('red', this.tec.red).filter(d => d.cost <= this.money.red);
        if (!list.length) continue;
        // 有錢就買強的，錢少就衝數量
        const rich = this.money.red > 500;
        const pickDef = rich ? list[list.length - 1] : (Math.random() < 0.55 ? list[0] : list[list.length - 1]);
        this.money.red -= pickDef.cost;
        const u = this.spawn(pickDef.id, 'red', c.col, c.row);
        u.acted = true;
        built = true;
      }
      if (!built) { ai.phase = 'move'; ai.i = 0; }
      return;
    }

    // 每次都重新找「還沒行動的第一台」，避免單位在戰鬥中陣亡後索引錯位
    const u = this.units.find(x => x.side === 'red' && !x.acted);
    if (!u) { this.endTurn(); return; }
    this.aiActUnit(u);
  },

  aiActUnit(u) {
    // 1) 已經貼著敵人就打
    const foes = this.adjEnemies(u);
    if (foes.length) {
      foes.sort((a, b) => this.threat(a) - this.threat(b));
      u.acted = true;
      this.beginBattle(u, foes[0]);
      this.mode = 'aiturn';
      return;
    }
    // 2) 找目標：最近的可佔領設施，或最近的敵人
    const goal = this.aiGoal(u);
    const reach = reachable(this.cells, u, u.mp, u.side, (c, r) => this.occ(c, r));
    let best = null, bs = 1e9;
    for (const v of reach.values()) {
      const d = hexDistance(v.col, v.row, goal.col, goal.row);
      const s = d * 10 - v.left;
      if (s < bs) { bs = s; best = v; }
    }
    if (!best || (best.col === u.col && best.row === u.row)) {
      const c = this.cell(u.col, u.row);
      if (c && c.fac && c.owner !== 'red') u.capturing = true;
      u.acted = true;
      return;
    }
    const path = pathTo(reach, u, best.col, best.row);
    this.anim = { u, path, i: 0, t: 0 };
    this.aiAfterMove = () => {
      const f2 = this.adjEnemies(u);
      const c = this.cell(u.col, u.row);
      if (f2.length) {
        f2.sort((a, b) => this.threat(a) - this.threat(b));
        u.acted = true;
        this.beginBattle(u, f2[0]);
        this.mode = 'aiturn';
      } else {
        if (c && c.fac && c.owner !== 'red') u.capturing = true;
        u.acted = true;
      }
    };
  },

  threat(u) { return power(UnitDB.get(u.id), u.hp); },

  aiGoal(u) {
    let best = null, bd = 1e9;
    for (const row of this.cells) for (const c of row) {
      if (!c.fac || c.owner === 'red') continue;
      const d = hexDistance(u.col, u.row, c.col, c.row);
      const w = c.fac === 'factory' ? 0 : 2;
      if (d + w < bd) { bd = d + w; best = c; }
    }
    for (const o of this.units) {
      if (o.side === 'red') continue;
      const d = hexDistance(u.col, u.row, o.col, o.row) + 1;
      if (d < bd) { bd = d; best = o; }
    }
    return best || { col: u.col, row: u.row };
  },

  /* ---------- 存讀檔 ---------- */
  save() {
    const data = {
      v: 2, turn: this.turn, money: this.money, tec: this.tec, tecPts: this.tecPts,
      turnLimit: this.turnLimit, skill: this.skill, seconds: this.battleSeconds,
      stats: this.stats, operationIndex: this.operationIndex,
      owners: this.cells.map(r => r.map(c => c.owner)),
      units: this.units.map(u => ({ id: u.id, side: u.side, col: u.col, row: u.row, hp: u.hp, xp: u.xp || 0, kills: u.kills || 0 }))
    };
    try { localStorage.setItem('stellar_commander_v1', JSON.stringify(data)); return true; }
    catch (e) { return false; }
  },
  hasSave() { try { return !!localStorage.getItem('stellar_commander_v1'); } catch (e) { return false; } },
  load() {
    let d;
    try { d = JSON.parse(localStorage.getItem('stellar_commander_v1')); } catch (e) { return false; }
    if (!d) return false;
    this.init({ turnLimit: d.turnLimit, skill: d.skill, seconds: d.seconds });
    this.turn = d.turn; this.money = d.money; this.tec = d.tec; this.tecPts = d.tecPts;
    this.stats = d.stats || { blue: { battleWins: 0, kills: 0 }, red: { battleWins: 0, kills: 0 } };
    this.operationIndex = d.operationIndex || 0;
    for (let r = 0; r < MAP_H; r++) for (let c = 0; c < MAP_W; c++) this.cells[r][c].owner = d.owners[r][c];
    this.units = [];
    for (const u of d.units) {
      const n = this.spawn(u.id, u.side, u.col, u.row);
      n.hp = u.hp; n.xp = u.xp || 0; n.kills = u.kills || 0;
    }
    this.side = 'blue'; this.mode = 'map';
    for (const u of this.units) if (u.side === 'blue') { u.acted = false; u.mp = UnitDB.get(u.id).mp; }
    return true;
  },

  /* ---------- 地形圖磚 ---------- */
  /** 尖頂六角形的逐列半寬：上下各 6 列做 1,3,5,7,9,11 的斜邊，中間 12 列滿寬 */
  hexRows() {
    const out = [];
    for (let y = 0; y < HEX_H; y++) {
      let w;
      if (y < 6) w = y * 2 + 1;
      else if (y < 18) w = 11;
      else w = (23 - y) * 2 + 1;
      out.push(w);
    }
    return out;
  },
  buildTiles() {
    const rows = this.hexRows();
    const mk = (fill, edge, deco) => {
      const cv = document.createElement('canvas');
      cv.width = HEX_W; cv.height = HEX_H;
      const c = cv.getContext('2d');
      for (let y = 0; y < HEX_H; y++) {
        const w = rows[y], x = 11 - w;
        c.fillStyle = fill; c.fillRect(x, y, w * 2, 1);
        // 只在六角形本身的斜邊／直邊畫格線，不要畫整條橫線（否則會變成方格）
        c.fillStyle = edge;
        c.fillRect(x, y, 1, 1); c.fillRect(x + w * 2 - 1, y, 1, 1);
        if (y === 0 || y === HEX_H - 1) c.fillRect(x, y, w * 2, 1);
      }
      if (deco) deco(c, rows);
      return cv;
    };
    this.tiles = {
      space: mk('#141a34', '#2e3866', (c) => {
        for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#46527e' : '#6a76a4'; c.fillRect(4 + ((i * 7) % 14), 5 + ((i * 5) % 13), 1, 1); }
      }),
      debris: mk('#2c2640', '#4c4266', (c) => {
        for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#544a70' : '#6e6288'; c.fillRect(4 + ((i * 5) % 13), 6 + ((i * 7) % 11), 2, 2); }
      }),
      nebula: mk('#2a1e46', '#523a72', (c) => {
        for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#432f68' : '#5c3f86'; c.fillRect(3 + ((i * 6) % 15), 5 + ((i * 4) % 13), 3, 2); }
      })
    };
  },

  /* ---------- 繪製 ---------- */
  draw(ctx) {
    if (!ArtPack.drawBackground(ctx, Core.frame, 0.025)) {
      ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, GW, GH);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(0, BAR_H, GW, VIEW_H); ctx.clip();
    ctx.translate(-this.cam.x, BAR_H - this.cam.y);
    this.drawMap(ctx);
    ctx.restore();
    this.drawBar(ctx);
    this.drawOperation(ctx);
    this.drawPanel(ctx);
    if (this.menu) this.drawMenu(ctx);
    if (this.victory) this.drawVictory(ctx);
  },

  drawMap(ctx) {
    const sel = this.sel;
    for (let r = 0; r < MAP_H; r++) for (let c = 0; c < MAP_W; c++) {
      const cell = this.cells[r][c];
      const p = hexToPixel(c, r);
      if (p.x - this.cam.x > GW + 24 || p.x - this.cam.x < -24) continue;
      if (p.y - this.cam.y > VIEW_H + 24 || p.y - this.cam.y < -24) continue;
      ctx.drawImage(this.tiles[cell.terrain], p.x, p.y);
      if (cell.fac) this.drawFac(ctx, p.x, p.y, cell);
      // 可移動 / 可攻擊標示
      if (this.mode === 'move' && this.reach) {
        const k = c + ',' + r;
        if (this.reach.has(k)) { ctx.fillStyle = 'rgba(90,170,255,.28)'; this.fillHex(ctx, p.x, p.y); }
      }
      if (sel) {
        const o = this.occ(c, r);
        if (o && o.side !== sel.side && hexDistance(c, r, sel.col, sel.row) === 1) {
          ctx.fillStyle = 'rgba(255,80,60,.30)'; this.fillHex(ctx, p.x, p.y);
        }
      }
    }
    // 單位
    for (const u of this.units) {
      let p = hexToPixel(u.col, u.row);
      if (this.anim && this.anim.u === u) {
        const a = this.anim;
        const cur = a.path[Math.min(a.i, a.path.length - 1)];
        const nxt = a.path[Math.min(a.i + 1, a.path.length - 1)];
        const p1 = hexToPixel(cur.col, cur.row), p2 = hexToPixel(nxt.col, nxt.row);
        p = { x: lerp(p1.x, p2.x, a.t / 7), y: lerp(p1.y, p2.y, a.t / 7) };
      }
      const moving = !!(this.anim && this.anim.u === u);
      const animTick = moving ? this.anim.i * 7 + this.anim.t : this.blink;
      ctx.save();
      if (u.acted && u.side === this.side) ctx.globalAlpha = 0.55;
      ctx.drawImage(UnitDB.miniFrame(u.id, moving ? 'move' : 'idle', u.side === 'blue' ? 1 : -1, animTick), p.x + 3, p.y + 1);
      ctx.restore();
      const rank = veteranRank(u.xp);
      if (rank.id > 0) {
        ctx.fillStyle = rank.id >= 3 ? '#f5d020' : '#d8e8ff';
        for (let k = 0; k < rank.id; k++) ctx.fillRect(p.x + 4 + k * 4, p.y, 3, 1);
      }
      // HP 條
      const d = UnitDB.get(u.id), hp = clamp(u.hp / d.hp, 0, 1);
      if (hp < 1) {
        ctx.fillStyle = '#000'; ctx.fillRect(p.x + 4, p.y + 17, 14, 3);
        ctx.fillStyle = hp > 0.35 ? (u.side === 'blue' ? '#5aa8ff' : '#ff6a5a') : '#ffcc30';
        ctx.fillRect(p.x + 4, p.y + 17, Math.round(14 * hp), 3);
      }
      if (u.capturing) { ctx.fillStyle = '#f5d020'; ctx.fillRect(p.x + 17, p.y + 1, 4, 5); }
    }
    // 游標
    if (!this.anim && this.blink % 40 < 26) {
      const p = hexToPixel(this.cursor.col, this.cursor.row);
      ctx.strokeStyle = this.mode === 'target' ? '#ff4a3a' : '#f5d020';
      ctx.lineWidth = 1;
      this.strokeHex(ctx, p.x, p.y);
    }
    if (this.mode === 'move' && this.sel && this.reach) {
      const k = this.cursor.col + ',' + this.cursor.row;
      if (this.reach.has(k)) {
        const path = pathTo(this.reach, this.sel, this.cursor.col, this.cursor.row);
        ctx.fillStyle = '#a6dcff';
        path.slice(1).forEach((step, i) => {
          if ((i + this.blink / 8) % 2 >= 1) return;
          const p = hexToPixel(step.col, step.row);
          ctx.fillRect(p.x + 10, p.y + 11, 3, 2);
        });
      }
    }
  },

  hexPath(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 0.5);
    ctx.lineTo(x + 21.5, y + 6);
    ctx.lineTo(x + 21.5, y + 18);
    ctx.lineTo(x + 11, y + 23.5);
    ctx.lineTo(x + 0.5, y + 18);
    ctx.lineTo(x + 0.5, y + 6);
    ctx.closePath();
  },
  fillHex(ctx, x, y) { this.hexPath(ctx, x, y); ctx.fill(); },
  strokeHex(ctx, x, y) { this.hexPath(ctx, x, y); ctx.stroke(); },

  drawFac(ctx, x, y, cell) {
    const own = cell.owner;
    const col = own === 'blue' ? '#3a78d8' : own === 'red' ? '#d84a3a' : '#8e8ea4';
    const lit = own === 'blue' ? '#8cc4ff' : own === 'red' ? '#ff9a7a' : '#c8c8dc';
    // 整格上色：即使有單位站著也看得出歸屬
    ctx.fillStyle = own === 'blue' ? 'rgba(58,120,216,.28)' : own === 'red' ? 'rgba(216,74,58,.28)' : 'rgba(150,150,180,.18)';
    this.fillHex(ctx, x, y);
    // 正式設施 atlas 由 manifest 驅動；載入失敗才保留舊程序圖作 survival fallback。
    const art = ArtPack.facility(cell.fac, this.blink + cell.col * 5 + cell.row * 7);
    if (art) {
      ctx.drawImage(art, x - 5, y - 5);
    } else if (cell.fac === 'factory') {
      ctx.fillStyle = '#0c1020'; ctx.fillRect(x + 5, y + 14, 12, 8);
      ctx.fillStyle = col; ctx.fillRect(x + 5, y + 14, 12, 3);
      ctx.fillStyle = lit; ctx.fillRect(x + 6, y + 18, 2, 2); ctx.fillRect(x + 9, y + 18, 2, 2); ctx.fillRect(x + 12, y + 18, 2, 2);
      ctx.fillStyle = col; ctx.fillRect(x + 15, y + 11, 2, 3);
      ctx.fillStyle = lit; ctx.fillRect(x + 15, y + 11, 2, 1);
    } else {
      ctx.fillStyle = '#0c1020'; ctx.fillRect(x + 5, y + 17, 12, 5);
      ctx.fillStyle = col; ctx.fillRect(x + 7, y + 13, 8, 4);
      ctx.fillStyle = lit; ctx.fillRect(x + 8, y + 13, 6, 1);
      ctx.fillStyle = lit; ctx.fillRect(x + 6, y + 19, 2, 2); ctx.fillRect(x + 11, y + 19, 2, 2);
    }
    if (!art && own) {
      const pulse = (this.blink + cell.col * 5 + cell.row * 7) % 48;
      if (pulse < 12) {
        ctx.fillStyle = lit;
        ctx.fillRect(x + 10, y + 10 - (pulse >> 2), 2, 2);
      }
    }
  },

  drawOperation(ctx) {
    ctx.fillStyle = this.operationFlash > 0 && this.blink % 12 < 8 ? 'rgba(40,62,104,.94)' : 'rgba(4,7,18,.88)';
    ctx.fillRect(0, BAR_H, GW, 12);
    ctx.fillStyle = '#334064'; ctx.fillRect(0, BAR_H + 11, GW, 1);
    ptext(ctx, 4, BAR_H + 3, 'OP', this.operationFlash > 0 ? '#ffe680' : '#7ce0b0', 1);
    if (this.operationIndex >= OPERATIONS.length) {
      Core.text(25, BAR_H + 1, '全作戰完成：攻下紅軍工廠結束戰局', { size: 8, color: '#ffe680' });
      return;
    }
    const p = operationProgress(this.operationIndex, this.operationState());
    Core.text(25, BAR_H + 1, `${p.op.zh}：${p.op.brief}`, { size: 8, color: '#c9d4e8' });
    const bw = 34, rate = p.current / p.target;
    ctx.fillStyle = '#172039'; ctx.fillRect(215, BAR_H + 4, bw, 4);
    ctx.fillStyle = '#5ad0a0'; ctx.fillRect(215, BAR_H + 4, Math.round(bw * rate), 4);
    ptext(ctx, 196, BAR_H + 2, `${p.current}/${p.target}`, '#ffe680', 1);
  },

  drawBar(ctx) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, 0, GW, BAR_H);
    ctx.fillStyle = '#2a3050'; ctx.fillRect(0, BAR_H - 1, GW, 1);
    ptext(ctx, 4, 4, 'TURN', '#7c88a6', 1);
    ptext(ctx, 34, 4, `${this.turn}/${this.turnLimit}`, '#e8eefc', 1);
    const sc = this.side === 'blue' ? '#5aa8ff' : '#ff6a5a';
    ptext(ctx, 78, 4, this.side === 'blue' ? 'BLUE' : 'RED', sc, 1);
    ptext(ctx, 116, 4, 'G', '#7c88a6', 1);
    ptext(ctx, 124, 4, String(this.money.blue), '#f5d020', 1);
    ptext(ctx, 172, 4, 'TEC', '#7c88a6', 1);
    ptext(ctx, 194, 4, String(this.tec.blue), '#7ce0b0', 1);
    ptext(ctx, 210, 4, 'B' + this.count('blue') + '/R' + this.count('red'), '#c9d4e8', 1);
  },

  drawPanel(ctx) {
    ctx.fillStyle = '#0a0c18'; ctx.fillRect(0, PANEL_Y, GW, GH - PANEL_Y);
    ctx.fillStyle = '#2a3050'; ctx.fillRect(0, PANEL_Y, GW, 1);

    const cell = this.cell(this.cursor.col, this.cursor.row);
    const u = this.occ(this.cursor.col, this.cursor.row);
    if (cell) {
      const t = TERRAIN[cell.terrain];
      Core.text(5, PANEL_Y + 5, t.zh, { size: 9, color: '#c9d4e8' });
      Core.text(5, PANEL_Y + 17, cell.fac ? (cell.fac === 'factory' ? '工廠' : '都市') : '—', {
        size: 9, color: cell.owner === 'blue' ? '#7ab0ff' : cell.owner === 'red' ? '#ff8a6a' : '#8a8aa0'
      });
      Core.text(5, PANEL_Y + 29, cell.owner ? (cell.owner === 'blue' ? '藍軍' : '紅軍') : (cell.fac ? '中立' : ''), { size: 8, color: '#7c88a6' });
    }
    if (u) {
      const d = UnitDB.get(u.id);
      ctx.drawImage(UnitDB.frame(u.id, 'idle', 1, this.blink), 56, PANEL_Y + 6, 32, 32);
      ptext(ctx, 92, PANEL_Y + 6, d.code, u.side === 'blue' ? '#8cc8ff' : '#ff9a8a', 1);
      Core.text(92, PANEL_Y + 16, `${d.name}　${d.role}`, { size: 8.5, color: '#c9d4e8' });
      ptext(ctx, 92, PANEL_Y + 28, 'HP', '#7c88a6', 1);
      const hp = clamp(u.hp / d.hp, 0, 1);
      ctx.fillStyle = '#16203c'; ctx.fillRect(108, PANEL_Y + 28, 46, 6);
      ctx.fillStyle = hp > 0.35 ? '#5ad0ff' : '#ff5a4a'; ctx.fillRect(108, PANEL_Y + 28, Math.round(46 * hp), 6);
      ptext(ctx, 158, PANEL_Y + 28, `${u.hp}/${d.hp}`, '#c9d4e8', 1);
      ptext(ctx, 200, PANEL_Y + 6, 'MP' + d.mp, '#7ce0b0', 1);
      ptext(ctx, 200, PANEL_Y + 16, 'DEF' + Math.round(d.def * 100), '#c9d4e8', 1);
      const rank = veteranRank(u.xp);
      Core.text(200, PANEL_Y + 28, `${rank.zh} ${u.xp || 0}XP`, { size: 7.5, color: rank.id >= 2 ? '#ffe680' : '#8ea0c8' });
    } else if (this.msgT > 0) {
      Core.text(60, PANEL_Y + 16, this.msg, { size: 9.5, color: '#f5d020' });
    } else {
      Core.text(60, PANEL_Y + 10, 'Z 選擇　X 取消　C 系統選單', { size: 8.5, color: '#7c88a6' });
      Core.text(60, PANEL_Y + 24, '站上工廠可生產，站上設施可佔領', { size: 8.5, color: '#7c88a6' });
    }
  },

  drawMenu(ctx) {
    const m = this.menu;
    const isProd = this.mode === 'produce';
    const w = isProd ? 120 : 74;
    const h = m.items.length * 13 + 8;
    const x = GW - w - 8, y = BAR_H + 6;
    ctx.fillStyle = 'rgba(6,10,24,.94)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3c4a78'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    m.items.forEach((it, i) => {
      const iy = y + 5 + i * 13;
      if (i === m.i) { ctx.fillStyle = '#1e2a52'; ctx.fillRect(x + 2, iy - 1, w - 4, 12); ctx.fillStyle = '#f5d020'; ctx.fillRect(x + 4, iy + 3, 3, 3); }
      const dis = isProd && it.cost && it.cost > this.money.blue;
      Core.text(x + 11, iy, it.zh, { size: 9, color: dis ? '#6a6a80' : (i === m.i ? '#ffe680' : '#c9d4e8') });
      if (isProd && it.cost) ptext(ctx, x + w - 6 - ptextW(String(it.cost), 1), iy + 2, String(it.cost), dis ? '#6a6a80' : '#f5d020', 1);
    });
    if (isProd) {
      const it = m.items[m.i];
      if (it.def) {
        const d = it.def;
        ctx.fillStyle = 'rgba(6,10,24,.94)'; ctx.fillRect(x - 92, y, 88, 54);
        ctx.strokeStyle = '#3c4a78'; ctx.strokeRect(x - 91.5, y + .5, 87, 53);
        ctx.drawImage(UnitDB.frame(d.id, 'idle', 1, this.blink), x - 88, y + 10);
        ptext(ctx, x - 52, y + 5, 'HP' + d.hp, '#5ad0ff', 1);
        ptext(ctx, x - 52, y + 15, 'MP' + d.mp, '#7ce0b0', 1);
        ptext(ctx, x - 52, y + 25, 'DEF' + Math.round(d.def * 100), '#c9d4e8', 1);
        ptext(ctx, x - 52, y + 35, 'TEC' + d.tec, '#f5d020', 1);
        Core.text(x - 88, y + 44, d.weapons.filter(Boolean).map(w2 => w2.zh).join('／'), { size: 7.5, color: '#9aa8c8' });
      }
    }
  },

  drawVictory(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, GW, GH);
    const win = this.victory === 'blue';
    const t = this.victory === 'draw' ? 'DRAW' : (win ? 'VICTORY' : 'DEFEAT');
    ptext(ctx, GW / 2 - ptextW(t, 3) / 2, 86, t, win ? '#f5d020' : (this.victory === 'draw' ? '#c0c0d0' : '#ff5a4a'), 3, '#000');
    Core.text(GW / 2, 118, win ? '你的軍團控制了整個星域' : this.victory === 'draw' ? '雙方勢力相當' : '藍軍防線崩潰了', { size: 10, align: 'center', color: '#c9d4e8' });
    Core.text(GW / 2, 138, `第 ${this.turn} 回合結束　設施 藍 ${this.count('blue')} / 紅 ${this.count('red')}`, { size: 9, align: 'center', color: '#7c88a6' });
    if (this.blink % 60 < 40) Core.text(GW / 2, 164, '按 Z 回到標題', { size: 9.5, align: 'center', color: '#f5d020' });
  }
};
