# 戰略設施正式美術生成紀錄

- 日期：2026-08-20
- 內容生成：OpenAI ImageGen（Codex built-in `image_gen`）
- 動畫列生成：SpriteGen `component-row`，provider `codex`（工具未回傳具名模型 ID）
- 用途：戰略地圖工廠／都市，各 4 幀指示燈循環
- 智財限制：原創宇宙設施；禁止既有鋼彈、BANDAI、吉翁／聯邦標誌與輪廓

## Canonical base prompts

### 工廠

```text
Use case: stylized-concept
Asset type: canonical base sprite for a 16-bit retro space strategy game
Primary request: Create one ORIGINAL compact orbital factory facility sprite, designed to remain readable at a final logical size around 20×18 pixels.
Scene/backdrop: perfectly flat solid #00FF00 chroma-key background, one uniform color only
Subject: one low, wide orbital factory module viewed from a slight top-front angle; dark navy hull, cool gray armor plates, one short exhaust stack, three small neutral amber indicator lamps, compact geometric silhouette
Style/medium: authentic hand-placed 16-bit console pixel art, visibly uniform large square pixel blocks, hard nearest-neighbor edges, restrained 12-color palette, 1-pixel dark outline at logical resolution
Composition/framing: single isolated object centered, generous padding, full object visible, no ground plane
Lighting/mood: hard top-left light, no glow or bloom
Constraints: original design only; background exactly flat #00FF00; no shadow; no reflection; no gradients; no antialiasing; no soft edges; no text; no logos; no UI; no guide boxes; no extra objects; no frame numbers
Avoid: Gundam, Bandai, Zeon, federation emblems, copyrighted silhouettes, spacecraft, robots, characters, scenery
```

### 都市／星港

```text
Use case: stylized-concept
Asset type: canonical base sprite for a 16-bit retro space strategy game
Primary request: Create one ORIGINAL compact orbital city / starport facility sprite, designed to remain readable at a final logical size around 20×18 pixels.
Scene/backdrop: perfectly flat solid #00FF00 chroma-key background, one uniform color only
Subject: one compact orbital city hub viewed from a slight top-front angle; dark navy base, cool gray segmented dome, two short side modules, three small neutral amber window lights, distinct silhouette from a factory
Style/medium: authentic hand-placed 16-bit console pixel art, visibly uniform large square pixel blocks, hard nearest-neighbor edges, restrained 12-color palette, 1-pixel dark outline at logical resolution
Composition/framing: single isolated object centered, generous padding, full object visible, no ground plane
Lighting/mood: hard top-left light, no glow or bloom
Constraints: original design only; background exactly flat #00FF00; no shadow; no reflection; no gradients; no antialiasing; no soft edges; no text; no logos; no UI; no guide boxes; no extra objects; no frame numbers
Avoid: Gundam, Bandai, Zeon, federation emblems, copyrighted silhouettes, spacecraft, robots, characters, scenery
```

動畫列的完整 SSoT prompts 位於：

- `assets/artpack/source/sprite-gen/2026-08-20/factory-v2/prompts/idle.txt`
- `assets/artpack/source/sprite-gen/2026-08-20/city-v2/prompts/idle.txt`

## 後製與管線

1. ImageGen base 僅作 raw，不直接進 runtime。
2. SpriteGen 單幀預處理 run 轉成 24×24 canonical base。
3. 以 canonical base＋layout guide 各生成一列 4 幀綠幕 raw。
4. SpriteGen deterministic extraction：去背、component 分幀、pixel-unfake、共享色盤、32×32 cell atlas、manifest。
5. 沒有以 Python、Canvas、SVG 或 Unity 程式重畫內容。

## SHA-256

- 工廠 ImageGen base：`F216E8DA6EFCF6EB11FD0083E5183B10DFE399BC611E566A1003B6FA456D4966`
- 都市 ImageGen base：`9170241A88A248E3F9E3C0DE4957AEE1D2A61BB296F551E7811170153AECEB1C`
- 工廠 runtime atlas：`D393A1C374EC2A022C505B1BC582E12B32AA04914D93E584EFF9397A59598BBF`
- 都市 runtime atlas：`18E6426767248DEF90D16F53483B6FAA54EAFCFA92A63AE5B2C9AD35335ADB49`
