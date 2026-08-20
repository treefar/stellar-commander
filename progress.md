# 星域指揮官美術強化進度

更新日期：2026-08-20

## 目標

建立一套來源可追溯、可重跑、可在原生網頁與 Unity 共用的正式 2D 像素美術包；8 台機體具備可讀的移動動畫，戰略與即時戰鬥場景具備動態風景，不再把程序 placeholder 當正式美術。

## 完成 Gate

- [x] 8 台機體各有正式 canonical idle，32×32 遊戲格內比例一致；目前採 1 套 ImageGen 母版＋7 套 baked 色盤變體。
- [x] 8 台機體各有 idle／move／fire／melee atlas row；共用已驗收的 4／6／4／5 幀幾何。
- [x] 戰略地圖具備正式太空景深漂移與工廠／都市 4 幀指示燈動畫；設施已取代程序 placeholder，舊圖只保留載入失敗 fallback。
- [x] 即時戰鬥具備 ImageGen 正式遠星、星雲與岩塊合成景深，並以整數像素水平漂移。
- [x] runtime PNG、manifest、Prompt、日期、模型、來源與 SHA-256 齊全。
- [x] 網頁只依 manifest 取 frame rect，保留明確 legacy fallback。
- [x] Unity UPM package 可直接匯入，設定 Point／Clamp／Uncompressed／無 mipmap，並依 manifest 播放動畫。
- [x] 接觸表、動畫 GIF、機器稽核、瀏覽器 smoke test 與 Unity 6.5 編譯／runtime 匯入檢查通過。

## 已完成與證據

- 雲端 GameAssetVault 已實查：沒有可同時適用網頁與 Unity 2D、且符合本作 32px 機甲風格的現成套圖，因此正式素材改走 ImageGen。
- GD01 正式 atlas 為 192×128、19 幀、15 色主色盤；`move` 97、`fire` 97、`melee` 94。`idle` 因刻意低動幅機器分數 76，保留人工核准與例外紀錄，沒有偽造通過。
- SW02／BW03／PL00／GR01／LC02／WL03／RP00 使用 sprite-gen exact palette bake；每張替換 2,460 個像素，幾何與 alpha 完全沿用母版。
- 正式背景由 ImageGen 生成，後製只做 Point 縮放、置中裁切與 24 色無抖色量化；runtime 為 256×224。
- 網頁標題、戰略地圖、VS 與即時戰鬥已接正式 atlas；戰略移動與戰鬥推進用 6 幀 move row，射擊 4 幀、近戰 5 幀。
- `node tests/run-tests.cjs`：69/69；`node tests/balance.test.cjs`：22/22；Playwright：8 張 atlas＋1 張場景載入成功、零 Console error、5 張實機截圖。
- Unity 6000.5.3f1 batchmode：Runtime／Editor assembly 編譯成功；8 台×4 狀態與背景逐筆 `Resources.Load`／`JsonUtility`／`Sprite.Create` smoke test 通過。

## 2026-08-20 戰略設施補強

- 新增原創軌道工廠與都市／星港，兩者各 4 幀、32×32 cell、128×32 atlas，燈號為熄滅／微亮／高亮／微亮循環。
- 網頁與 Unity 共用同一份 SpriteGen atlas 契約；網頁依 manifest frame rect 載入，Unity UPM package 新增 `GetFacilityFrame()`。
- Node 邏輯／美術契約測試 73／73、平衡測試 22／22。
- Chrome atlas smoke、響應式桌機／手機、完整戰局／存檔／觸控 smoke 全綠，Console error 0。
- Unity 6000.5.3f1 全新暫存專案 batchmode 退出碼 0：`PASS units=8 states=4 facilities=2x4 scenery=256x224`。
- 工廠的角色型通用 motion scorer 為 85 分；因動畫刻意只動三盞燈，motion ratio 0.0070 低於角色預設 0.01。設施專用 `motion_min=0.005` 與人工 GIF／接觸表均通過，例外已寫入 `factory-v2/qa-notes.md`。

## 2026-08-20 公開發布

- 本作原生為 HTML／JavaScript Canvas 網頁遊戲，不需要 Unity WebGL 轉檔；已將可直接由瀏覽器執行的版本發布至 `https://treefar.link/stellar-commander/`。
- GitHub Pages 已由 `main` 建置 commit `4768c15a8ec2aae858faa2dd8d70c4758d789fc4`，狀態 `built`。
- 公開站 atlas、響應式與完整流程 smoke 全數通過：22 張圖片 HTTP 200、8 台機體、1 張場景、2 種設施各 4 幀，桌機／390px 手機無水平溢出，Console error 0。

## 2026-08-20 顯示控制補強

- 新增 `−／＋` 手動 1～5 倍整數縮放；遊戲原始畫布固定 256×224，只調整 CSS 整數倍與中文 UI backing resolution，維持像素銳利。
- 倍率保存於瀏覽器 `localStorage`，重載後沿用；超出視窗時只在遊戲框內捲動，不撐寬整頁。
- 新增 Fullscreen API 按鈕，可實際進出全螢幕並同步按鈕文字／`aria-pressed`；已修正退出時狀態晚一幀更新的競態。
- 功能 commit `8b60ae9f7a9ff0b96110eb32fe916585188f4c79` 已由 GitHub Pages 建置為 `built`。
- 公開站 Playwright 實測 1～5 倍、4 倍重載保存、實際進出全螢幕、手機 2 倍保存與內框捲動全通過；完整戰略／存檔／戰鬥／觸控 smoke 仍全綠，Console error 0。

## 後續品質升級

1. 目前八台為四種配色陣營、同一量產機輪廓；下一版可生成高機動、重裝、王牌三套獨立 canonical，替換同職能色盤變體。
2. 正式太空景深目前是單張合成母圖漂移；若要更強景深，可拆成遠星／星雲／岩塊三張獨立透明層。

## 禁止事項

- 不得用 Canvas、SVG、Python／Pillow 或 Unity `Texture2D` 繪製內容冒充正式美術。
- 不得直接把 AI raw 當 runtime 圖檔；必須經 sprite-gen 抽幀、去背、atlas 組裝與 QA。
- 不得把 atlas 座標散落硬編在網頁或 Unity 程式碼。
