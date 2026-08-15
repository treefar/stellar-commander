# 星域指揮官 STELLAR COMMANDER

網頁版復古戰略遊戲，致敬 **SD 鋼彈 GX**（BANDAI，1994，Super Famicom）的「回合制搶地盤 ＋ 兩軍接觸就切成即時 2D 混戰」核心。

**線上試玩：<https://treefar.link/stellar-commander/>**

參考來源與完整拆解見 [企劃書_SD鋼彈GX復刻.md](企劃書_SD鋼彈GX復刻.md)。

---

## 怎麼玩

線上版直接開網址就能玩。本機開發用：

```bash
node tools/devserver.mjs
```

開 <http://localhost:5833>。純靜態，直接開 `index.html` 也能玩（存檔功能需要 http 協定）。

| 畫面 | 操作 |
|---|---|
| 戰略地圖 | `↑↓←→` 游標　`Z` 選擇　`X` 取消　`C` 系統選單 |
| 即時戰鬥 | `↑↓←→` 推進　`Z` 武器1　`X` 軍刀　`C` 武器3　`V` 武器4　`Enter` 暫停 |

**贏法**：佔領敵方全部工廠，或殲滅敵方全部單位。回合用完則比設施數量。

---

## 專案結構

```
index.html              入口，含中文操作說明
js/core.js              256×224 畫布、整數放大、5×7 點陣字型、輸入、中文覆蓋層
js/sprites.js           程式生成 SD 機體像素圖（無外部圖檔）
js/audio.js             Web Audio 合成音效與 BGM
js/units.js             機體資料表
js/hex.js               六角格數學（odd-r 尖頂）、地圖、ZOC、移動範圍
js/combat.js            傷害公式（純函式）
js/battle.js            即時 2D 戰鬥
js/strategy.js          回合制戰略層
js/main.js              狀態機：標題→設定→地圖→VS→戰鬥
tools/devserver.mjs     開發伺服器（附截圖存檔 API）
tests/                  回歸測試
shots/                  自動驗證產生的畫面（可刪）
參考資料/               原作影片逐格截圖（本機參考，未進版控）
```

## 測試

```bash
node tests/run-tests.cjs
```

```bash
node tests/balance.test.cjs
```

前者驗六角格數學、地圖公平性、ZOC、傷害公式、機體表結構（46 項）。
後者在 Node 用固定亂數種子跑模擬對戰，驗同階勝率與跨階壓制（22 項）。

改過 `js/units.js` 或 `js/battle.js` 之後兩個都要跑。

## 智慧財產

機體外形與名稱皆為原創設計，僅在 SD 比例、頭部感測器、推進背包等「機器人類型語彙」上致敬。沒有使用任何 BANDAI 的角色名稱或造型。
