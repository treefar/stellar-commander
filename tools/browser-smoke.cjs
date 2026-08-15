/* browser-smoke.cjs — 需先啟動 tools/devserver.mjs；供開發環境做瀏覽器 smoke test。 */
'use strict';

const { chromium } = require('playwright');
const BASE_URL = (process.env.BASE_URL || 'http://localhost:5833').replace(/\/$/, '');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  const tap = async key => { await page.keyboard.press(key); await page.waitForTimeout(70); };
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'shots/01_標題.png' });
  await tap('KeyZ');
  await page.screenshot({ path: 'shots/02_作戰設定.png' });
  await tap('ArrowDown'); await tap('ArrowDown'); await tap('ArrowDown');
  await tap('KeyZ');
  await page.waitForTimeout(250);

  const initial = await page.evaluate(() => ({
    state: __game.state,
    turn: __strat.turn,
    operation: operationProgress(__strat.operationIndex, __strat.operationState()),
    units: __strat.units.map(u => ({ id: u.id, xp: u.xp, kills: u.kills }))
  }));
  await page.screenshot({ path: 'shots/09_作戰目標與戰歷.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: 'shots/stellar-commander-card.jpg', type: 'jpeg', quality: 90 });
  await page.setViewportSize({ width: 900, height: 900 });

  const objective = await page.evaluate(() => {
    const neutral = __strat.cells.flat().find(c => c.fac && !c.owner);
    neutral.owner = 'blue';
    const before = __strat.money.blue;
    const notice = __strat.checkOperation();
    return { operationIndex: __strat.operationIndex, reward: __strat.money.blue - before, notice };
  });

  const persistence = await page.evaluate(() => {
    const u = __strat.units.find(x => x.side === 'blue');
    u.xp = 7; u.kills = 3;
    __strat.stats.blue.battleWins = 2;
    __strat.operationIndex = 2;
    __strat.save();
    u.xp = 0; __strat.stats.blue.battleWins = 0; __strat.operationIndex = 0;
    __strat.load();
    const restored = __strat.units.find(x => x.side === 'blue');
    return { xp: restored.xp, kills: restored.kills, wins: __strat.stats.blue.battleWins, operationIndex: __strat.operationIndex };
  });

  await page.evaluate(() => {
    const blue = __strat.units.find(u => u.side === 'blue');
    const red = __strat.units.find(u => u.side === 'red');
    __game.state = 'battle';
    Battle.start({ blue: [blue], red: [red], playerSide: 'blue', playerIdx: 0, auto: true,
      terrain: TERRAIN.space, seconds: 60, skill: 0.5,
      onEnd: r => { window.__smokeBattle = r; __strat.applyBattle(r); } });
    for (let i = 0; i < 180; i++) { Core.frame++; Battle.update(); }
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'shots/10_戰鬥回饋強化.png' });

  const battle = await page.evaluate(() => {
    for (let i = 0; i < 3800 && !window.__smokeBattle; i++) { Core.frame++; Battle.update(); }
    return {
      result: window.__smokeBattle && window.__smokeBattle.result,
      units: window.__smokeBattle && window.__smokeBattle.units.map(u => ({ side: u.side, dead: u.dead, hp: u.hp, kills: u.kills }))
    };
  });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  mobile.on('pageerror', e => errors.push(e.message));
  const touch = async key => {
    await mobile.locator(`[data-input="${key}"]`).click();
    await mobile.waitForTimeout(90);
  };
  await mobile.goto(BASE_URL, { waitUntil: 'networkidle' });
  const touchVisible = await mobile.locator('#touch-controls').isVisible();
  await touch('a');
  await touch('down'); await touch('down'); await touch('down');
  await touch('a');
  const mobileStarted = await mobile.evaluate(() => ({ state: __game.state, cursor: { ...__strat.cursor } }));
  await touch('right');
  const mobileMoved = await mobile.evaluate(() => ({ state: __game.state, cursor: { ...__strat.cursor } }));
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await mobile.screenshot({ path: 'shots/11_手機觸控.png' });
  await mobile.close();

  const checks = {
    enteredStrategy: initial.state === 'strategy',
    operationVisible: initial.operation.op.id === 'expand' && initial.operation.current === 4,
    progressionInitialized: initial.units.every(u => u.xp === 0 && u.kills === 0),
    objectiveRewarded: objective.operationIndex === 1 && objective.reward === 100 && objective.notice.includes('先遣擴張'),
    saveRestoredProgression: persistence.xp === 7 && persistence.kills === 3 && persistence.wins === 2 && persistence.operationIndex === 2,
    battleCompleted: !!battle.result,
    battleReturnedKills: battle.units && battle.units.every(u => Number.isInteger(u.kills)),
    touchControlsVisible: touchVisible,
    touchStartedGame: mobileStarted.state === 'strategy',
    touchMovedCursor: mobileMoved.state === 'strategy' && mobileMoved.cursor.col === mobileStarted.cursor.col + 1,
    mobileNoHorizontalOverflow: !mobileOverflow,
    noBrowserErrors: errors.length === 0
  };
  console.log(JSON.stringify({ checks, initial, objective, persistence, battle, mobileStarted, mobileMoved, errors }, null, 2));
  await browser.close();
  if (Object.values(checks).some(v => !v)) process.exitCode = 1;
})().catch(err => { console.error(err); process.exitCode = 1; });
