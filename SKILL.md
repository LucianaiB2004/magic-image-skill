---
name: magic-image
description: Use when a user wants a 魔术图片、幻影坦克、Magic Image or Mirage Tank where one real transparent PNG shows different meaningful content on light and dark backgrounds.
---

# 魔术图片 Skill

## 核心原则

AI 负责创意与两张素材；本项目的本地确定性代码负责像素数学与真实 Alpha。最终交付必须是同一张 RGBA PNG，不得用两图切换、GIF、视频、Canvas、CSS background-image 或对比拼图冒充。

## 工作流

先判断请求是新创作还是已有素材。

| 情况 | 处理 |
|---|---|
| 新创作，仅指定隐藏主体 | 自行搭配有叙事关系的简洁前景，默认使用 `layers` |
| 新创作，已有比例/风格/构图 | 遵守用户设定，用 `layers` 分别准备 foreground 与 hidden |
| 已有正常前景与隐藏层 | 使用 `layers` |
| 已有明确白底与黑底目标图 | 使用 `pair`，说明彩色目标可能只能近似 |

若当前有图像生成能力，用下面的模板生成两张素材；若没有，不得杜撰 API 或假装生成，应使用用户已有输入，或请用户提供素材。图像模型只生成素材，不能声称自己直接生成了正确 Alpha。

合成后运行 `inspect`，检查 `validation.json`，并交付 `<name>.png`、预览和报告。`numericPass` 不代替人工视觉检查；始终查看白、灰、黑三种背景。

## 素材规则

- Foreground：纯白 `#FFFFFF` 背景，只画正常前景，为隐藏主体预留空间。
- Hidden：纯黑 `#000000` 背景，用白色、中性灰和灰度塑造隐藏主体，尽量不重复前景，其区域尽量保持黑色。
- 两图使用完全相同的画布、镜头、取景和坐标系。
- 纯白前景无法从纯白背景自动分离；使用真实 Alpha、`foreground-mask` 或 `pair`。

推荐叙事：小舟→巨鲸、旅行者→巨佛、山崖→巨龙、城市→巨型人物、望远镜→星空、花朵→隐藏人像。

## Foreground Prompt

```text
Create the visible foreground artwork for a magic image / mirage tank.

Canvas:
[ratio / dimensions]

Scene:
[foreground]

Composition:
[placement]

Reserve:
[region]

as pure white negative space for a hidden:
[subject]

Background:
uniform pure white #FFFFFF.

Do not draw:
hidden subject
hidden silhouette
hidden shadow
checkerboard
text
UI
comparison panels.

Output one flat image.
```

## Hidden Prompt

```text
Create the hidden layer for a magic image / mirage tank.

Match the exact same:
canvas
camera
framing
coordinate system.

Background:
uniform pure black #000000.

Hidden subject:
[subject]

Render using:
white
neutral gray
grayscale shading.

Do not redraw:
[foreground objects].

Keep their area black where practical.

No:
checkerboard
text
UI
comparison layout.

Output one flat image.
```

## 执行命令

```bash
node scripts/magic-image.mjs layers --foreground foreground.png --hidden hidden.png --out-dir output/scene --name scene-magic
node scripts/magic-image.mjs pair --surface surface.png --revealed revealed.png --out-dir output/pair --name magic
node scripts/magic-image.mjs inspect --image output/scene/scene-magic.png
```

不要覆盖已有输出。只有 `<name>.png` 是透明成品；所有 preview 和 comparison 都只是压平的检查材料。
