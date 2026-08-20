"""桌機／手機公開頁 smoke test：版面、素材、連結與主要輸入。"""
from argparse import ArgumentParser
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

parser = ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:5833/")
parser.add_argument("--label", default="local")
args = parser.parse_args()

errors = []
failed_requests = []
image_responses = []


def observe(page):
    page.on(
        "console",
        lambda msg: errors.append(f"console:{msg.type}:{msg.text}")
        if msg.type == "error"
        else None,
    )
    page.on("pageerror", lambda err: errors.append(f"pageerror:{err}"))
    page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url}"))
    page.on(
        "response",
        lambda res: image_responses.append((res.status, res.url))
        if res.request.resource_type == "image"
        else None,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )

    desktop = browser.new_page(viewport={"width": 1440, "height": 1000})
    observe(desktop)
    desktop.goto(args.url, wait_until="networkidle")
    desktop.wait_for_function(
        "window.__artpack && window.__game && Object.keys(window.__artpack.packs).length === 8"
    )
    desktop_metrics = desktop.evaluate(
        """() => {
          const stage = document.querySelector('#stage').getBoundingClientRect();
          const game = document.querySelector('#game').getBoundingClientRect();
          return {
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            stage: {left: stage.left, right: stage.right, width: stage.width},
            game: {left: game.left, right: game.right, width: game.width},
            cards: document.querySelectorAll('.card').length,
            touch: getComputedStyle(document.querySelector('#touch-controls')).display,
            artFailures: __artpack.failures.slice(),
            artPacks: Object.keys(__artpack.packs).length,
            scenery: Object.keys(__artpack.scenery).length,
            facilities: Object.keys(__artpack.facilities).length,
            state: __game.state
          };
        }"""
    )
    desktop.screenshot(path=str(SHOTS / f"responsive-{args.label}-desktop.png"), full_page=True)
    desktop.keyboard.press("KeyZ")
    desktop.wait_for_timeout(150)
    desktop_state_after_key = desktop.evaluate("__game.state")

    hrefs = desktop.eval_on_selector_all(
        "a[href]", "els => els.map(el => new URL(el.href, location.href).href)"
    )
    link_statuses = {}
    for href in hrefs:
        response = desktop.request.get(urljoin(args.url, href), timeout=20_000)
        link_statuses[href] = response.status

    mobile = browser.new_page(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    observe(mobile)
    mobile.goto(args.url, wait_until="networkidle")
    mobile.wait_for_function("window.__game && window.__artpack")
    mobile_metrics = mobile.evaluate(
        """() => {
          const stage = document.querySelector('#stage').getBoundingClientRect();
          const game = document.querySelector('#game').getBoundingClientRect();
          const touch = document.querySelector('#touch-controls').getBoundingClientRect();
          return {
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            stage: {left: stage.left, right: stage.right, width: stage.width},
            game: {left: game.left, right: game.right, width: game.width},
            touch: {
              display: getComputedStyle(document.querySelector('#touch-controls')).display,
              left: touch.left, right: touch.right, width: touch.width
            },
            artFailures: __artpack.failures.slice(),
            artPacks: Object.keys(__artpack.packs).length,
            scenery: Object.keys(__artpack.scenery).length,
            facilities: Object.keys(__artpack.facilities).length,
            state: __game.state
          };
        }"""
    )
    mobile.screenshot(path=str(SHOTS / f"responsive-{args.label}-mobile.png"), full_page=True)
    mobile.locator('[data-input="a"]').tap()
    mobile.wait_for_timeout(150)
    mobile_state_after_touch = mobile.evaluate("__game.state")
    browser.close()

assert desktop_metrics["scrollWidth"] <= desktop_metrics["viewport"], desktop_metrics
assert desktop_metrics["stage"]["left"] >= 0, desktop_metrics
assert desktop_metrics["stage"]["right"] <= desktop_metrics["viewport"], desktop_metrics
assert desktop_metrics["stage"]["width"] == desktop_metrics["game"]["width"], desktop_metrics
assert desktop_metrics["stage"]["width"] in (256, 512, 768), desktop_metrics
assert desktop_metrics["cards"] == 3, desktop_metrics
assert desktop_metrics["touch"] == "none", desktop_metrics
assert desktop_metrics["artFailures"] == [], desktop_metrics
assert desktop_metrics["artPacks"] == 8 and desktop_metrics["scenery"] == 1, desktop_metrics
assert desktop_metrics["facilities"] == 2, desktop_metrics
assert desktop_state_after_key == "setup", desktop_state_after_key

assert mobile_metrics["scrollWidth"] <= mobile_metrics["viewport"], mobile_metrics
assert mobile_metrics["stage"]["left"] >= 0, mobile_metrics
assert mobile_metrics["stage"]["right"] <= mobile_metrics["viewport"], mobile_metrics
assert mobile_metrics["stage"]["width"] == mobile_metrics["game"]["width"], mobile_metrics
assert mobile_metrics["stage"]["width"] in (256, 512, 768), mobile_metrics
assert mobile_metrics["touch"]["display"] == "grid", mobile_metrics
assert mobile_metrics["touch"]["left"] >= 0, mobile_metrics
assert mobile_metrics["touch"]["right"] <= mobile_metrics["viewport"], mobile_metrics
assert mobile_metrics["artFailures"] == [], mobile_metrics
assert mobile_metrics["artPacks"] == 8 and mobile_metrics["scenery"] == 1, mobile_metrics
assert mobile_metrics["facilities"] == 2, mobile_metrics
assert mobile_state_after_touch == "setup", mobile_state_after_touch
assert all(status < 400 for status in link_statuses.values()), link_statuses
assert image_responses and all(status < 400 for status, _ in image_responses), image_responses
assert not failed_requests, failed_requests
assert not errors, errors

print(
    {
        "ok": True,
        "url": args.url,
        "desktop": desktop_metrics,
        "mobile": mobile_metrics,
        "links": link_statuses,
        "imageResponses": len(image_responses),
        "keyboardState": desktop_state_after_key,
        "touchState": mobile_state_after_touch,
        "screenshots": 2,
    }
)
