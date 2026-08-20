"""遊戲畫面 1～5 倍、倍率保存與 Fullscreen API 回歸測試。"""
from argparse import ArgumentParser
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
STORAGE_KEY = "stellar_commander_display_scale_v1"

parser = ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:5833/")
parser.add_argument("--label", default="local")
args = parser.parse_args()

errors = []


def observe(page):
    page.on(
        "console",
        lambda msg: errors.append(f"console:{msg.type}:{msg.text}")
        if msg.type == "error"
        else None,
    )
    page.on("pageerror", lambda err: errors.append(f"pageerror:{err}"))


def wait_ready(page):
    page.wait_for_load_state("networkidle")
    page.wait_for_function("window.__core && window.__game")


def metrics(page):
    return page.evaluate(
        """() => {
          const game = document.querySelector('#game');
          const ui = document.querySelector('#ui');
          const stage = document.querySelector('#stage');
          const viewport = document.querySelector('.game-viewport');
          return {
            scale: __core.scale,
            preferred: __core.preferredScale,
            output: document.querySelector('#zoom-level').textContent,
            gameCssWidth: game.getBoundingClientRect().width,
            gameCssHeight: game.getBoundingClientRect().height,
            gameBacking: [game.width, game.height],
            uiBacking: [ui.width, ui.height],
            stageWidth: stage.getBoundingClientRect().width,
            imageRendering: getComputedStyle(game).imageRendering,
            pageWidth: document.documentElement.scrollWidth,
            windowWidth: innerWidth,
            viewportClientWidth: viewport.clientWidth,
            viewportScrollWidth: viewport.scrollWidth,
            minusDisabled: document.querySelector('#zoom-out').disabled,
            plusDisabled: document.querySelector('#zoom-in').disabled,
            saved: localStorage.getItem('stellar_commander_display_scale_v1'),
            fullscreen: document.fullscreenElement?.classList.contains('play-card') || false,
            fullscreenPressed: document.querySelector('#fullscreen-toggle').getAttribute('aria-pressed'),
            fullscreenLabel: document.querySelector('#fullscreen-toggle').textContent
          };
        }"""
    )


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )
    desktop = browser.new_page(viewport={"width": 1440, "height": 1000})
    observe(desktop)
    desktop.goto(args.url)
    wait_ready(desktop)
    desktop.evaluate("key => localStorage.removeItem(key)", STORAGE_KEY)
    desktop.reload()
    wait_ready(desktop)

    # 從目前自動倍率一路按到 1，再逐格驗證 1～5 倍。
    while metrics(desktop)["scale"] > 1:
        desktop.locator("#zoom-out").click()
    scale_metrics = []
    for target in range(1, 6):
        current = metrics(desktop)
        scale_metrics.append(current)
        assert current["scale"] == target, current
        assert current["preferred"] == target, current
        assert current["output"] == f"{target}×", current
        assert current["gameCssWidth"] == 256 * target, current
        assert current["gameCssHeight"] == 224 * target, current
        assert current["stageWidth"] == 256 * target, current
        assert current["gameBacking"] == [256, 224], current
        assert current["uiBacking"] == [256 * target, 224 * target], current
        assert current["imageRendering"] in ("pixelated", "crisp-edges"), current
        assert current["pageWidth"] <= current["windowWidth"], current
        assert current["saved"] == str(target), current
        if target < 5:
            desktop.locator("#zoom-in").click()

    assert scale_metrics[0]["minusDisabled"], scale_metrics[0]
    assert scale_metrics[-1]["plusDisabled"], scale_metrics[-1]
    assert scale_metrics[-1]["viewportScrollWidth"] > scale_metrics[-1]["viewportClientWidth"], scale_metrics[-1]

    # 保存 4 倍後重載，必須仍是 4 倍。
    desktop.locator("#zoom-out").click()
    assert metrics(desktop)["scale"] == 4
    desktop.reload()
    wait_ready(desktop)
    persisted = metrics(desktop)
    assert persisted["scale"] == 4 and persisted["saved"] == "4", persisted

    # Fullscreen API 實際進出，按鈕必須留在全螢幕範圍內並同步狀態。
    desktop.locator("#fullscreen-toggle").click()
    desktop.wait_for_function("document.fullscreenElement?.classList.contains('play-card')")
    fullscreen = metrics(desktop)
    assert fullscreen["fullscreen"], fullscreen
    assert fullscreen["fullscreenPressed"] == "true", fullscreen
    assert fullscreen["fullscreenLabel"] == "退出全螢幕", fullscreen
    assert fullscreen["scale"] == 4, fullscreen
    desktop.screenshot(path=str(SHOTS / f"display-{args.label}-fullscreen.png"))
    desktop.locator("#fullscreen-toggle").click()
    desktop.wait_for_function("!document.fullscreenElement")
    desktop.wait_for_function("document.querySelector('#fullscreen-toggle').getAttribute('aria-pressed') === 'false'")
    exited = metrics(desktop)
    assert exited["fullscreenPressed"] == "false", exited
    assert exited["fullscreenLabel"] == "全螢幕", exited

    # 手機手動放到 2 倍時只在遊戲容器內捲動，不得撐寬整頁，且需保存。
    mobile = browser.new_page(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    observe(mobile)
    mobile.goto(args.url)
    wait_ready(mobile)
    mobile.evaluate("key => localStorage.removeItem(key)", STORAGE_KEY)
    mobile.reload()
    wait_ready(mobile)
    assert metrics(mobile)["scale"] == 1, metrics(mobile)
    mobile.locator("#zoom-in").tap()
    mobile_two = metrics(mobile)
    assert mobile_two["scale"] == 2, mobile_two
    assert mobile_two["pageWidth"] <= mobile_two["windowWidth"], mobile_two
    assert mobile_two["viewportScrollWidth"] > mobile_two["viewportClientWidth"], mobile_two
    mobile.reload()
    wait_ready(mobile)
    assert metrics(mobile)["scale"] == 2, metrics(mobile)
    mobile.screenshot(path=str(SHOTS / f"display-{args.label}-mobile-2x.png"), full_page=True)
    browser.close()

assert not errors, errors
print(
    {
        "ok": True,
        "desktopScales": [m["scale"] for m in scale_metrics],
        "persisted": persisted["scale"],
        "fullscreen": fullscreen["fullscreen"],
        "mobilePersisted": 2,
        "errors": errors,
        "screenshots": 2,
    }
)
