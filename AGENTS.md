# 專案慣例：星域指揮官

## 這是什麼
致敬 SD 鋼彈 GX（SFC, 1994）的網頁復古遊戲。回合制六角格戰略 ＋ 即時 2D 橫向戰鬥。
原作系統的查證結果與設計取捨在 `企劃書_SD鋼彈GX復刻.md`，動手前先讀它。

## 技術限制（不要打破）
- **無建置流程**：純 HTML＋原生 JS，`<script>` 直接載入。不要引入 npm 套件、bundler、框架。
- **正式美術集中管理**：正式 PNG／WebP 只可放在 `assets/artpack/runtime/`，由 `assets/artpack/runtime/artpack.json` 定義；網頁不得散落硬編 atlas 座標，Unity 只取用同一份 runtime 圖檔與 manifest。`js/` 仍禁止放二進位資產。
- **正式美術來源**：只能使用核准 ImageGen／Nano Banana／GPT Image 2 的生成內容或有明確授權的 Owned 素材；程序圖形只可保留為明確標示的 legacy fallback，不得再宣稱正式美術。
- **內部解析度固定 256×224**，只做整數倍放大。畫像素內容一律用整數座標。
- **不要用 `ctx.arc()` 或漸層直接畫背景物件**：會產生平滑邊緣，破壞像素風格。要畫圓形物體先產生低解析度像素圖再整數放大（參考 `Battle.makeRock` / `Battle.makeCloud`）。

## 中文與英數的分工
- 英數（HUD、選單標題、TIME、機體代號）用 `ptext()` 的 5×7 點陣字型，畫在像素畫布上。
- 中文用 `Core.text()`，畫在上層的覆蓋畫布（1:1 解析度）。**不要**把中文畫進 256×224 的像素畫布，8px 中文看不清楚。

## 改數值的紀律
- 機體數值只改 `js/units.js`，不要散落在 `battle.js`。
- **改完一定要跑 `node tests/balance.test.cjs`**。這個測試用固定亂數種子跑模擬對戰，會抓出「某台被改到一面倒」。
- 想確認新的平衡問題時，用瀏覽器 console 跑 `__duel(藍id, 紅id, 場次)` 直接看勝率，不要憑感覺調。
- 已知的陷阱都寫在企劃書 5.4 的「平衡調校紀錄」，改之前先看，不要重複踩。

## 戰鬥層的兩個關鍵常數
- `HP_SCALE = 5`（`js/battle.js`）：戰鬥層把 HP 放大再打，結束時除回去。動它會整體改變交戰長度。
- `FIELD_W = 560`：戰場寬度。加大會讓雙方要追很久才交火。

## 測試
```bash
node tests/run-tests.cjs && node tests/balance.test.cjs
```
兩個都要綠才算完成。純函式邏輯放 `hex.js` / `combat.js` 才測得到，不要把規則寫死在渲染程式碼裡。

美術改動另外必須通過：manifest／尺寸／alpha／atlas rect 機器稽核、接觸表與動畫 GIF 人眼檢查、瀏覽器無 chroma-key 漏色，以及 Unity Point／Clamp／Uncompressed／無 mipmap／PPU 設定檢查。

## 除錯用的瀏覽器鉤子
開 `tools/devserver.mjs` 後，console 可用 `__game` / `__strat` / `__battle`。
要截圖存檔可自行注入 POST `/__save`（伺服器會寫進 `shots/`）。
分頁在背景時 `requestAnimationFrame` 不會跑，要手動呼叫 `__game.step()`。
