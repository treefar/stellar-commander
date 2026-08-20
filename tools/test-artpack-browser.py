"""Playwright smoke test：正式 atlas 載入、動畫換幀與實際畫面截圖。"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:5833/")
parser.add_argument("--label", default="artpack")
args = parser.parse_args()

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    page = browser.new_page(viewport={"width": 900, "height": 760}, device_scale_factor=1)
    page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda err: errors.append(f"pageerror:{err}"))
    page.goto(args.url, wait_until="networkidle")
    page.wait_for_function("window.__artpack && window.__game && Object.keys(window.__artpack.packs).length === 8 && Object.keys(window.__artpack.facilities).length === 2 && window.__artpack.scenery['space-v1']")

    status = page.evaluate("""() => ({
      loaded: Object.keys(__artpack.packs),
      scenery: Object.keys(__artpack.scenery),
      facilities: Object.keys(__artpack.facilities),
      failures: __artpack.failures.slice(),
      factoryFrames: new Set([0, 15, 30, 45].map(t =>
        __artpack.facility('factory', t).toDataURL()
      )).size,
      cityFrames: new Set([0, 15, 30, 45].map(t =>
        __artpack.facility('city', t).toDataURL()
      )).size,
      moveFrames: new Set([0, 6, 12, 18, 24, 30].map(t =>
        UnitDB.frame('GD01', 'move', 1, t).toDataURL()
      )).size,
      fireFrames: new Set([0, .26, .51, .76].map(p =>
        UnitDB.frame('GD01', 'fire', 1, 0, p).toDataURL()
      )).size,
      meleeFrames: new Set([0, .21, .41, .61, .81].map(p =>
        UnitDB.frame('GD01', 'melee', 1, 0, p).toDataURL()
      )).size
    })""")
    page.locator("#stage").screenshot(path=str(SHOTS / f"{args.label}-title.png"))

    page.evaluate("Strat.init({skill:.5, turnLimit:30, seconds:60}); Game.state='strategy'")
    page.wait_for_timeout(120)
    page.locator("#stage").screenshot(path=str(SHOTS / f"{args.label}-strategy.png"))

    page.evaluate("""() => {
      Battle.start({
        blue: [{id:'GD01', hp:60}], red: [{id:'GR01', hp:60}],
        terrain: TERRAIN.space, playerSide:'blue', playerIdx:0,
        auto:false, seconds:60, skill:.5, onEnd:()=>{}
      });
      Game.state = 'battle';
    }""")
    page.wait_for_timeout(200)
    page.keyboard.down("ArrowRight")
    page.wait_for_timeout(350)
    page.locator("#stage").screenshot(path=str(SHOTS / f"{args.label}-battle-move.png"))
    page.keyboard.up("ArrowRight")

    page.evaluate("Game.step=()=>{}; Battle.paused=false; Battle.player.fireT=4")
    page.wait_for_timeout(80)
    page.locator("#stage").screenshot(path=str(SHOTS / f"{args.label}-battle-fire.png"))
    page.evaluate("Battle.player.fireT=0; Battle.player.meleeT=7")
    page.wait_for_timeout(80)
    page.locator("#stage").screenshot(path=str(SHOTS / f"{args.label}-battle-melee.png"))
    browser.close()

assert set(status["loaded"]) == {"GD01", "SW02", "BW03", "PL00", "GR01", "LC02", "WL03", "RP00"}, status
assert status["scenery"] == ["space-v1"], status
assert set(status["facilities"]) == {"factory", "city"}, status
assert status["failures"] == [], status
assert status["factoryFrames"] == 4, status
assert status["cityFrames"] == 4, status
assert status["moveFrames"] == 6, status
assert status["fireFrames"] == 4, status
assert status["meleeFrames"] == 5, status
assert not errors, errors
print({"ok": True, "status": status, "screenshots": 5})
