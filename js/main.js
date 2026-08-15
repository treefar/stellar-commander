/* main.js — 狀態機：標題 → 設定 → 戰略地圖 → VS 開戰 → 即時戰鬥 → 結算 */
'use strict';

const Game = {
  state: 'title', t: 0, stars: [], vs: null, opt: { skill: 0.5, turnLimit: 30, seconds: 60 },
  setupSel: 0, titleSel: 0, hintEl: null,

  init() {
    Core.init();
    UnitDB.init();
    this.hintEl = document.getElementById('hint');
    for (let i = 0; i < 90; i++) {
      this.stars.push({ x: Math.random() * GW, y: Math.random() * GH, s: rnd(0.15, 0.7), c: pick(['#3a4468', '#6a76a4', '#aab4dc', '#ffffff']) });
    }
    this.menuClouds = [
      { x: 18, y: 18, s: 86, img: Battle.makeCloud(270, 43) },
      { x: 164, y: 74, s: 64, img: Battle.makeCloud(226, 32) },
      { x: 72, y: 138, s: 52, img: Battle.makeCloud(302, 26) }
    ];
    addEventListener('keydown', () => Sfx.resume(), { once: true });
    addEventListener('pointerdown', () => Sfx.resume(), { once: true });
    requestAnimationFrame(this.loop.bind(this));
  },

  hint(t) { if (this.hintEl && this.hintEl.textContent !== t) this.hintEl.textContent = t; },

  loop(ts) {
    requestAnimationFrame(this.loop.bind(this));
    if (!this._last) this._last = ts;
    let dt = ts - this._last;
    this._last = ts;
    if (dt > 100) dt = 100;
    this._acc = (this._acc || 0) + dt;
    let guard = 0;
    while (this._acc >= 16.667 && guard++ < 4) {
      this._acc -= 16.667;
      this.step();
    }
    this.render();
  },

  step() {
    Core.frame++;
    this.t++;
    Sfx.update();
    const s = this.state;
    if (s === 'title') this.stepTitle();
    else if (s === 'setup') this.stepSetup();
    else if (s === 'strategy') this.stepStrategy();
    else if (s === 'vs') this.stepVs();
    else if (s === 'battle') Battle.update();
    Input.endFrame();
  },

  render() {
    Core.clear('#05050c');
    const ctx = Core.ctx;
    const s = this.state;
    if (s === 'title') this.drawTitle(ctx);
    else if (s === 'setup') this.drawSetup(ctx);
    else if (s === 'strategy') Strat.draw(ctx);
    else if (s === 'vs') this.drawVs(ctx);
    else if (s === 'battle') Battle.draw(ctx);
  },

  drawStars(ctx, spd) {
    for (const st of this.stars) {
      const x = (st.x - this.t * st.s * (spd || 0.12)) % GW;
      ctx.fillStyle = st.c;
      ctx.fillRect((x < 0 ? x + GW : x) | 0, st.y | 0, st.s > 0.5 ? 2 : 1, st.s > 0.5 ? 2 : 1);
    }
  },

  drawMenuSpace(ctx, spd) {
    for (const c of this.menuClouds || []) {
      const drift = ((this.t * (spd || 0.04) + c.x) % (GW + c.s)) - c.s;
      ctx.drawImage(c.img, drift | 0, c.y, c.s, c.s);
    }
    this.drawStars(ctx, (spd || 0.04) * 2);
  },

  /* ================= 標題 ================= */
  stepTitle() {
    if (this.showHowto) {
      this.hint('按 Z 或 X 返回');
      if (Input.p('a') || Input.p('b') || Input.p('start')) { this.showHowto = false; Sfx.cancel(); }
      return;
    }
    this.hint('↑↓ 選擇　Z 確定');
    const items = Strat.hasSave() ? 3 : 2;
    if (this.titleSel >= items) this.titleSel = 0;
    if (Input.p('up')) { this.titleSel = (this.titleSel - 1 + items) % items; Sfx.cursor(); }
    if (Input.p('down')) { this.titleSel = (this.titleSel + 1) % items; Sfx.cursor(); }
    if (Input.p('a') || Input.p('start')) {
      Sfx.ok();
      if (this.titleSel === 0) { this.state = 'setup'; this.setupSel = 0; }
      else if (this.titleSel === 1) { this.showHowto = true; }
      else if (Strat.load()) { this.state = 'strategy'; Sfx.play('map'); }
    }
  },

  drawTitle(ctx) {
    this.drawMenuSpace(ctx, 0.035);

    const t1 = 'STELLAR';
    const t2 = 'COMMANDER';
    ptext(ctx, GW / 2 - ptextW(t1, 3) / 2, 26, t1, '#f5d020', 3, '#3a2000');
    ptext(ctx, GW / 2 - ptextW(t2, 2) / 2, 52, t2, '#8cc8ff', 2, '#001028');
    Core.text(GW / 2, 74, '星域指揮官', { size: 11, align: 'center', color: '#e8eefc', weight: 700 });

    // 機體展示
    const ids = ['GD01', 'SW02', 'BW03', 'PL00', 'RP00', 'WL03', 'LC02', 'GR01'];
    ids.forEach((id, i) => {
      const set = UnitDB.spr(id);
      const x = 12 + i * 30, y = 96 + Math.sin(this.t * 0.04 + i) * 3;
      ctx.drawImage(i < 4 ? set.idle.r : set.idle.l, x, y | 0);
    });

    const items = ['NEW GAME', 'HOW TO PLAY'];
    if (Strat.hasSave()) items.push('CONTINUE');
    items.forEach((it, i) => {
      const y = 146 + i * 16;
      const on = i === this.titleSel;
      if (on && this.t % 40 < 28) ptext(ctx, GW / 2 - ptextW(it, 1) / 2 - 12, y, '>', '#f5d020', 1);
      ptext(ctx, GW / 2 - ptextW(it, 1) / 2, y, it, on ? '#ffe680' : '#7c88a6', 1, on ? '#3a2000' : null);
    });
    Core.text(GW / 2, 202, '致敬 SD 鋼彈 GX（SFC, 1994）的戰略＋即時戰鬥', { size: 8, align: 'center', color: '#5a6480' });

    if (this.showHowto) this.drawHowto(ctx);
  },

  drawHowto(ctx) {
    ctx.fillStyle = 'rgba(4,6,16,.94)'; ctx.fillRect(10, 20, GW - 20, GH - 46);
    ctx.strokeStyle = '#3c4a78'; ctx.strokeRect(10.5, 20.5, GW - 21, GH - 47);
    Core.text(GW / 2, 26, '玩法', { size: 11, align: 'center', color: '#f5d020', weight: 700 });
    const lines = [
      '地圖是回合制：移動單位、佔領工廠與都市。',
      '工廠決定生產與 TEC 技術等級，都市決定收入。',
      'TEC 2 解鎖重裝機，TEC 3 解鎖王牌機。',
      '畫面上方的作戰目標會提供資金與中期方向。',
      '',
      '單位貼到敵人旁邊發動攻擊，畫面切成即時戰鬥。',
      '防守方那格與周圍 6 格的單位全部參戰，最多 7 台。',
      '戰鬥 60 秒，操作好就能以弱擊強；剩餘 HP 帶回地圖。',
      '存活與擊墜會累積 XP；工廠每回合修復駐守機體。',
      '',
      '勝利：佔領敵方全部工廠，或殲滅敵方全部單位。'
    ];
    lines.forEach((l, i) => Core.text(20, 43 + i * 12.5, l, { size: 8.5, color: l ? '#c9d4e8' : '#000' }));
    if (this.t % 60 < 40) Core.text(GW / 2, 188, '按 Z 返回', { size: 9.5, align: 'center', color: '#f5d020' });
  },

  /* ================= 設定 ================= */
  SETUP: [
    { k: 'skill', zh: '電腦強度', opts: [['輕鬆', 0.25], ['普通', 0.5], ['困難', 0.8]] },
    { k: 'turnLimit', zh: '戰局長度', opts: [['短局 10分', 20], ['標準 15分', 30], ['長局 25分', 50]] },
    { k: 'seconds', zh: '戰鬥秒數', opts: [['30', 30], ['60', 60], ['90', 90]] }
  ],
  setupIdx: [1, 1, 1],

  stepSetup() {
    this.hint('↑↓ 選項　←→ 調整　Z 開始　X 返回');
    if (Input.p('up')) { this.setupSel = (this.setupSel - 1 + 4) % 4; Sfx.cursor(); }
    if (Input.p('down')) { this.setupSel = (this.setupSel + 1) % 4; Sfx.cursor(); }
    if (this.setupSel < 3) {
      const row = this.SETUP[this.setupSel];
      if (Input.p('left')) { this.setupIdx[this.setupSel] = (this.setupIdx[this.setupSel] - 1 + row.opts.length) % row.opts.length; Sfx.cursor(); }
      if (Input.p('right')) { this.setupIdx[this.setupSel] = (this.setupIdx[this.setupSel] + 1) % row.opts.length; Sfx.cursor(); }
    }
    if (Input.p('b')) { this.state = 'title'; Sfx.cancel(); }
    if (Input.p('a') || Input.p('start')) {
      if (this.setupSel === 3 || Input.p('start')) {
        this.opt.skill = this.SETUP[0].opts[this.setupIdx[0]][1];
        this.opt.turnLimit = this.SETUP[1].opts[this.setupIdx[1]][1];
        this.opt.seconds = this.SETUP[2].opts[this.setupIdx[2]][1];
        Strat.init(this.opt);
        this.state = 'strategy';
        Sfx.ok();
      } else { this.setupSel = 3; Sfx.cursor(); }
    }
  },

  drawSetup(ctx) {
    this.drawMenuSpace(ctx, 0.025);
    const t = 'BRIEFING';
    ptext(ctx, GW / 2 - ptextW(t, 2) / 2, 24, t, '#f5d020', 2, '#3a2000');
    Core.text(GW / 2, 46, '作戰設定', { size: 10, align: 'center', color: '#c9d4e8' });
    this.SETUP.forEach((row, i) => {
      const y = 76 + i * 26;
      const on = i === this.setupSel;
      if (on) { ctx.fillStyle = '#141c38'; ctx.fillRect(38, y - 4, GW - 76, 20); }
      Core.text(48, y, row.zh, { size: 10, color: on ? '#ffe680' : '#c9d4e8' });
      const cur = row.opts[this.setupIdx[i]][0];
      Core.text(GW - 60, y, cur, { size: 10, align: 'right', color: on ? '#ffe680' : '#8cc8ff' });
      if (on) { ptext(ctx, GW - 56, y + 2, '>', '#f5d020', 1); ptext(ctx, GW - 118, y + 2, '<', '#f5d020', 1); }
    });
    const on = this.setupSel === 3;
    if (on) { ctx.fillStyle = '#1e2a52'; ctx.fillRect(88, 160, 80, 18); }
    ptext(ctx, GW / 2 - ptextW('START', 1) / 2, 165, 'START', on ? '#ffe680' : '#7c88a6', 1, on ? '#3a2000' : null);
    Core.text(GW / 2, 194, '藍軍要在回合用完前拿下紅軍所有工廠', { size: 8.5, align: 'center', color: '#5a6480' });
  },

  /* ================= 戰略層 ================= */
  stepStrategy() {
    if (Strat.victory) {
      this.hint('按 Z 回到標題');
      if (Input.p('a') || Input.p('start')) { this.state = 'title'; this.titleSel = 0; Sfx.play('map'); }
      Strat.update();
      return;
    }
    this.hint(Strat.mode === 'aiturn' ? '紅軍行動中…' : '↑↓←→ 游標　Z 選擇　X 取消　C 系統選單');
    Strat.update();
    if (Strat.pendingBattle) {
      this.vs = Strat.pendingBattle;
      Strat.pendingBattle = null;
      this.vs.sel = 1;          // 0=AUTO 1=MANU
      this.vs.t = 0;
      this.state = 'vs';
      Sfx.alert();
    }
  },

  /* ================= VS 開戰畫面 ================= */
  stepVs() {
    this.hint('↑↓ 選 AUTO／MANU　Z 或 Enter 開戰');
    const v = this.vs;
    v.t++;
    if (Input.p('up') || Input.p('down')) { v.sel = 1 - v.sel; Sfx.cursor(); }
    if (v.t > 12 && (Input.p('a') || Input.p('start'))) {
      Sfx.ok();
      const auto = v.sel === 0;
      const idx = Math.max(0, v.blue.indexOf(v.playerUnit));
      Battle.start({
        blue: v.blue, red: v.red, terrain: v.terrain,
        playerSide: 'blue', playerIdx: idx, auto,
        seconds: Strat.battleSeconds, skill: Strat.skill,
        onEnd: (res) => {
          Strat.applyBattle(res);
          Sfx.play('map');
          this.state = 'strategy';
        }
      });
      this.state = 'battle';
    }
  },

  drawVs(ctx) {
    const v = this.vs;
    this.drawMenuSpace(ctx, 0.06);

    const t = 'BATTLE';
    ptext(ctx, GW / 2 - ptextW(t, 3) / 2, 20, t, '#f5d020', 3, '#3a1c00');

    // 我方（左）
    const mine = v.blue.slice(0, 4);
    mine.forEach((u, i) => {
      const set = UnitDB.spr(u.id);
      const bob = Math.sin(v.t * 0.06 + i) * 2;
      const x = 26 + i * 14, y = 108 + i * 16 + bob;
      ctx.save();
      if (u === v.playerUnit) { ctx.shadowColor = '#5aa8ff'; ctx.shadowBlur = 6; }
      ctx.drawImage(set.idle.r, x | 0, y | 0);
      ctx.restore();
    });
    // 敵方（右，弧形排列，仿原作）
    v.red.slice(0, 6).forEach((u, i) => {
      const set = UnitDB.spr(u.id);
      const a = -0.7 + i * 0.34;
      const x = 168 + Math.cos(a) * 46 + (i % 2) * 6;
      const y = 118 + Math.sin(a) * 52;
      ctx.drawImage(set.idle.l, x | 0, (y + Math.sin(v.t * 0.05 + i) * 2) | 0);
    });

    // 中央 VS
    ptext(ctx, GW / 2 - ptextW('VS', 3) / 2 - 12, 112, 'VS', '#f5d020', 3, '#3a1c00');

    // AUTO / MANU
    const drawOpt = (label, x, y, on, col) => {
      const w = ptextW(label, 1) + 10;
      ctx.fillStyle = on ? '#1e2a52' : '#0a0e1e';
      ctx.fillRect(x, y, w, 13);
      ctx.strokeStyle = on ? col : '#3c4a78';
      ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, 12);
      ptext(ctx, x + 5, y + 3, label, on ? '#ffe680' : '#8a94b0', 1);
      return w;
    };
    const ay = 78, my = 156;
    drawOpt('AUTO', 96, ay, v.sel === 0, '#ff5a4a');
    drawOpt('MANU', 96, my, v.sel === 1, '#5aa8ff');
    // 指向箭頭
    ctx.fillStyle = v.sel === 0 ? '#ff5a4a' : '#3a4468';
    for (let i = 0; i < 8; i++) ctx.fillRect(134 + i, ay + 8 + i, 2, 2);
    ctx.fillStyle = v.sel === 1 ? '#5aa8ff' : '#3a4468';
    for (let i = 0; i < 8; i++) ctx.fillRect(134 + i, my - i, 2, 2);

    Core.text(56, ay + 1, '電腦代打', { size: 8.5, align: 'right', color: v.sel === 0 ? '#ffb0a0' : '#5a6480' });
    Core.text(56, my + 1, '自己上場', { size: 8.5, align: 'right', color: v.sel === 1 ? '#a0c8ff' : '#5a6480' });

    // 地形
    Core.text(GW / 2, 62, `戰場：${v.terrain.zh}`, { size: 8.5, align: 'center', color: '#8a94b0' });

    if (v.t % 50 < 34) {
      const s2 = 'PRESS START BUTTON';
      ptext(ctx, GW / 2 - ptextW(s2, 1) / 2, 196, s2, '#e8eefc', 1, '#000');
    }
    Core.text(GW / 2, 210, `我方 ${v.blue.length} 台　敵方 ${v.red.length} 台`, { size: 8, align: 'center', color: '#5a6480' });
  }
};

window.addEventListener('load', () => {
  Game.init();
  window.__game = Game;      // 測試鉤子
  window.__strat = Strat;
  window.__battle = Battle;
});
