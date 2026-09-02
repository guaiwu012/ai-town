# 开场视频生成提示词

建议生成 16:9、1920×1080、8–10 秒、24fps 的无文字片头。最后 1.5 秒保持稳定画面，方便标题和进入按钮叠加。

## Higgsfield Prompt

```text
Top-down cinematic view of a dark sci-fi academy ruin island at night, thirteen clearly distinct survival zones connected by roads, a premium televised AI survival experiment, twelve distant contestants moving through fog and emergency lights, brief readable muzzle flashes, one supply drop descending into the central arena, surveillance cameras and broadcast spotlights, camera begins at a high strategic map view and slowly dives toward the central fighting zone, restrained teal monitor light, warm amber warning lamps, sparse crimson danger signals, hand-painted tactical game key art, stable geography, clean center-left negative space for Chinese title overlay, final shot holds steady for 1.5 seconds, no logos, no readable text, no existing game characters, no gore, cinematic 16:9, 24fps, 8 to 10 seconds
```

## Negative Prompt

```text
cyberpunk neon overload, purple gradient, photoreal close-up faces, UI text, subtitles, watermark, logo, camera jitter, rapid cuts, distorted bodies, excessive smoke, gore, changing island geography, empty static scene
```

导出后放到 `public/assets/battle/intro-cinematic.mp4`，并在构建环境设置：

```bash
VITE_INTRO_VIDEO_URL=/ai-town/assets/battle/intro-cinematic.mp4
```

未设置变量时，前端自动使用现有战场地图作为开场背景。
