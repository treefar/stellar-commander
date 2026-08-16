# Stellar Commander Art Pack

這是《星域指揮官》網頁版與 Unity 共用的正式像素美術 UPM package。

## 安裝

在 Unity 6 的 `Window > Package Manager` 選擇 `Install package from disk...`，指定本資料夾的 `package.json`。

## 使用

1. 在物件上加入 `SpriteRenderer` 與 `StellarSpriteAnimator`。
2. `Unit Id` 可填 `GD01`、`SW02`、`BW03`、`PL00`、`GR01`、`LC02`、`WL03`、`RP00`。
3. 以 `Play("move")`、`Play("fire")`、`Play("melee")` 切換狀態；左右面向用 `SetFacingLeft(bool)`。
4. 太空背景物件加入 `StellarParallaxBackground`，元件會建立三張相接、交替鏡像的 SpriteRenderer，以整數美術像素漂移。

Runtime 會依 JSON rect 呼叫 `Sprite.Create`，不依賴 Sprite Editor 或 Animator Controller。所有貼圖由 Editor 匯入器強制使用 Point、無壓縮、無 Mipmap、NPOT 不縮放。
