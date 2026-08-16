# GD-01 base candidate 01

- 工具／模型：Codex built-in ImageGen（核准工具）
- 日期：2026-08-16
- 輸出：`base-candidate-01.png`
- SHA-256：`E792663E09352F48575D8005EDDBE00D192850F5C06C9A503EBF87F987DF2E10`
- 輸入參考：`../../../legacy-placeholder/GD01.png`，只供身份、比例與配色提示；不是正式美術。
- 狀態：待 Base Lock Gate；不得直接進 runtime。

## Prompt

```text
Use case: stylized-concept
Asset type: canonical base idle for a 32×32 game sprite animation pipeline
Input image: identity reference only; preserve its broad horizontal red visor, small yellow forehead sensor, blue-gray and white armor, navy torso, yellow chest vent, compact rifle, and sturdy mass-produced guardian role.
Primary request: Create one original SD space-mecha named GD-01 GUARD, full body, facing screen-right in a readable three-quarter side idle combat stance. Approximately 2.7-head-tall chibi mechanical proportions, broad shoulders, compact backpack, feet and rifle fully inside frame.
Style/medium: authentic hand-placed 16-bit pixel art designed on a true 32×32 logical grid, shown enlarged with perfectly uniform square pixel blocks; hard edges only, one logical-pixel near-black outline, maximum 15 subject colors, hard single light from upper-left. Keep mechanical joints and silhouette readable at actual 32×32 size.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background, one uniform color with no shadow, gradient, texture, floor, reflection, or lighting variation.
Composition: exactly one isolated mecha centered with generous padding; fixed foot baseline; no cropping.
Constraints: original design only, no existing franchise insignia or recognizable Gundam/Zaku parts; no text, labels, UI, frame border, grid lines, multiple poses, detached effects, muzzle flash, glow, anti-aliasing, soft shading, blur, watermark, cast shadow, or contact shadow. Do not use #ff00ff anywhere on the subject.
```

## Candidate 02

- 工具／模型：Codex built-in ImageGen（核准工具）
- 日期：2026-08-16
- 輸出：`base-candidate-02.png`
- SHA-256：`10638E3EE6B0D8F322F3B43A1D81D4B79BA9098B3D6A52BA7DBFAED6DA56B53B`
- 網格實測：`24.08 × 24.08` output pixels；run-length 交叉檢查 `22.24 × 22.82`，無警告。
- Base Lock Gate：`y`。全身未裁切、身份與比例正確、硬邊均勻像素格、單一右向 idle、背景可去背。
- 注意：此檔是 canonical base identity truth，不直接作 runtime；正式 runtime 仍須經 component-row pipeline。

### Prompt

```text
Use case: identity-preserve
Asset type: revised canonical base idle for a 32×32 sprite pipeline
Primary request: Preserve the exact same GD-01 GUARD identity, screen-right three-quarter idle pose, silhouette, armor layout, broad red visor, yellow forehead sensor, blue-gray/white/navy palette, chest vent, compact rifle, framing, and fixed foot baseline. Change only the pixel density and simplify micro-detail.
Pixel-density correction: redraw as genuinely coarse hand-placed pixel art on exactly a 32×32 logical canvas. The enlarged output must visibly contain only 32 uniform logical pixel columns and 32 logical pixel rows across the full square. Use large perfectly uniform square blocks, approximately twice the block size of the reference. The full mecha should occupy about 27–29 logical pixels in height and remain readable when reduced to an actual 32×32 image. Simplify panel lines and highlights as necessary; one logical-pixel near-black outline; maximum 15 subject colors; hard edges and no anti-aliasing.
Backdrop: perfectly uniform solid #ff00ff chroma-key background with no lighting variation, shadow, floor, gradient, texture, or reflection.
Constraints: exactly one full-body mecha, nothing cropped; no new parts, no changed proportions, no existing franchise identifiers, no text, labels, UI, grid lines, multiple poses, detached effects, glow, blur, watermark, cast shadow, or contact shadow. Do not use #ff00ff on the subject.
```

## Canonical 32px identity reference v1

- 輸出：`base-canonical-32-v1.png`
- 來源：candidate 02 → sprite-gen `idle` raw → chroma extraction → per-frame pixel-unfake → 15 色共享色盤 → `frame-0.png`。
- SHA-256：`E7DFFDE8E3EE6CC190859E66C452A5929AF56B694A35F2E5614A3495EC09D14F`
- 規格：32×32、alpha bbox 24×29、15 主體色＋透明、透明角落、硬 alpha。
- 用途：GD01-v2 identity reference；不是以程式繪製的新內容。
