# Factory facility QA

- 人工檢視：4 幀均為同一工廠輪廓、同一基準線；無跨格、裁切、額外物件或綠幕殘留。
- 動畫順序：燈滅 → 微亮 → 高亮 → 微亮，可無縫循環。
- `frames-manifest.json.ok=true`；`sprite-sheet-alpha.report.json.ok=true`。
- 設施專用 inspect `motion_min=0.005` 通過；實測 motion presence `0.0070`。
- 通用角色 scorer 為 85 分並標示 motion < 0.01。此列只允許三盞指示燈變化，刻意不讓建築本體移動，故保留人工核准例外，不宣稱通用 scorer 全綠。
- Contact sheet 與遊戲內戰略截圖人工檢視通過。
