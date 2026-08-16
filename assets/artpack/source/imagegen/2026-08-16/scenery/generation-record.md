# 太空景深母圖生成紀錄

- 生成工具：OpenAI ImageGen（Codex `image_gen`）
- 日期：2026-08-16
- 正式用途：標題與即時戰鬥的太空景深背景
- 原始檔 SHA-256：`BFDE32ABC8CBBC5BBBC4306AB45D89F9D996EC6E288DE52C9C4A3D40BB6AEEED`
- Runtime 檔 SHA-256：`602F9B9BB8E7BFF54462A1B3FCE07FD20E89B60791FD8B6D2D7435863E465E51`

## 原始 Prompt

```text
Create an ORIGINAL 16-bit console pixel-art deep-space battlefield background for a retro strategy/action game. Logical target composition 256x224, landscape, no borders. Deep black-navy space, a broad muted violet and indigo nebula cloud crossing the middle distance, sparse crisp square stars in three brightness levels, one small distant blue-gray planet near the upper-left third, a few tiny far asteroid silhouettes near the lower-right. Strong readable depth layers but keep the central gameplay area uncluttered and dark enough for sprites. True low-resolution pixel clusters, hard nearest-neighbor edges, restrained 20-color palette, no gradients, no anti-aliasing, no bloom, no smooth circles, no painterly texture. No characters, no mecha, no ships, no UI, no text, no logos. Full-bleed background only.
```

## 後製紀錄

只做核准範圍內的技術後製：ImageMagick Point 取樣縮放與置中裁成 256×224、24 色無抖色索引 PNG。沒有新增或重繪影像內容。Runtime 以原圖／水平鏡像相接做整數像素平移，形成可循環的景深漂移。
