---
project: 星域指揮官 Stellar Commander
updated: 2026-08-20
status: published
---

# 星域指揮官交接

## 現況

- 類型：原生 HTML／JavaScript Canvas 網頁遊戲；不是 Unity 專案，因此發布物就是瀏覽器版，不需另轉 Unity WebGL。
- 公開網址：<https://treefar.link/stellar-commander/>
- GitHub：<https://github.com/treefar/stellar-commander>
- 已發布功能 commit：`4768c15a8ec2aae858faa2dd8d70c4758d789fc4`

## 本輪完成

- 讀取 `progress.md` 後補齊最後一項正式美術缺口：原創工廠與都市／星港。
- 兩種設施皆為 32×32 cell、4 FPS、4 幀指示燈循環；網頁與 Unity UPM package 共用同一 atlas／manifest 契約。
- 戰略畫面優先使用正式 atlas，程序圖只保留載入失敗 fallback。
- ImageGen／SpriteGen Prompt、日期、來源、SHA-256、QA 接觸表與人工核准例外均已留存。

## 已驗證

- `node tests/run-tests.cjs`：73／73。
- `node tests/balance.test.cjs`：22／22。
- 本機與公開站 atlas smoke：8 台機體、1 張場景、2 種設施各 4 幀，失敗 0。
- 公開站桌機 1440px／手機 390px 響應式 smoke：22 張圖片成功、無水平溢出、Console error 0。
- 公開站完整流程 smoke：進入戰略、任務獎勵、存檔還原、戰鬥結束與擊墜、觸控啟動／移動全通過。
- Unity 6000.5.3f1 全新暫存專案 batchmode：`PASS units=8 states=4 facilities=2x4 scenery=256x224`。

## 已知邊界與下一步

- 工廠只動三盞燈，角色型通用 scorer 為 85；設施門檻 `motion_min=0.005` 與人工檢視通過，不應為追分改成建築本體漂移。
- 目前八台機體使用同輪廓的陣營色盤變體；下一輪若升級品質，可另做高機動、重裝、王牌三套 canonical。
- 若要更強太空景深，可把目前合成背景拆為遠星、星雲、岩塊三張獨立透明層。

## 精確續作入口

1. 先讀 `progress.md`、`assets/artpack/COVERAGE.md` 與本檔。
2. 修改正式美術時維持 ImageGen → SpriteGen → manifest → 網頁／Unity 雙端契約測試。
3. 發布前執行 73 項功能契約、22 項平衡與公開站三套 browser smoke。
