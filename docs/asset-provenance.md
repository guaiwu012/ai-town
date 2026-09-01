# 美术资产来源与接入记录

最后更新：2026-09-01

## 参考仓库资产

本项目使用 [HanataniTakahiro/AIdataosha](https://github.com/HanataniTakahiro/AIdataosha) 中的项目资源作为当前演示版本的美术来源。接入时保留原始文件，不对来源素材冒充原创。

| 本地资产 | 参考仓库来源 | 用途 |
| --- | --- | --- |
| `public/assets/reference/battle-arena-map.png` | `docs/superpowers/specs/地图/pic/纯地图.png` | 战略总览底图 |
| `public/assets/battle/arena-live-map.png` | `docs/superpowers/specs/地图/pic/纯地图.png` | Pixi 直播战场视觉层 |
| `public/assets/reference/ui/events/*.svg` | `docs/superpowers/specs/美术/主面板/日志icon/` | 公屏和顶部播报事件分类图标 |
| `public/assets/reference/ui/vitals/*.png` | `docs/superpowers/specs/美术/主面板/电池/` | 角色生命状态 |
| `public/assets/reference/ui/controls/*.png` | `docs/superpowers/specs/美术/主面板/tag:button/`、`元素/ThresholdBar.png` | 热度组件视觉与按钮样式参考；按钮图含烘焙文字，不直接作为动态按钮背景 |

## 本项目原创资产

| 本地资产 | 生成依据 | 用途 |
| --- | --- | --- |
| `public/assets/battle/contestant-portraits.png` | 本项目角色设定 | HUD、角色档案、对话框和总览身份图 |
| `public/assets/battle/contestant-sprites-v1.png` | 以原创头像图集作为身份与服装参考，通过 Codex 内置图像生成制作，色键去背后保存为透明 PNG | Pixi 场内 12 名全身俯视角角色精灵 |
| `public/assets/battle/area-landmarks-v1.png` | 依据 13 区配置名称与机制，通过 Codex 内置图像生成制作，色键去背后保存为透明 PNG | Pixi 区域锚点的独立地标识别图标 |

场内精灵生成约束：严格保持头像图集从左到右、从上到下的 4×3 身份顺序；每格一个完整人物；统一俯视三分之四视角、尺寸和科幻废墟生存风格；禁止文字、边框、阴影和身份外元素。生成源使用纯绿色背景，仅透明去背后的 PNG 进入运行时。

## 已复核但未直接接入

| 参考仓库资源 | 当前处理 | 原因 |
| --- | --- | --- |
| `地图/pic/带UI.png`、`带UI带人物带事件.png` | 仅作构图参考 | UI、人物和事件已烘焙进整张图片，无法绑定实时状态 |
| `美术/主面板/全局日志弹窗.png`、`任务清单弹窗.png`、`面板.png` | 仅作版式参考 | 完整静态截图，不是可伸缩组件资产 |
| `美术/主面板/元素/MissionCard*.png`、`TaskCard*.png`、`Container*.png` | 待九宫格切片接入 | 可以替换任务和日志容器，但需要先定义安全拉伸区，避免文字与烘焙边框重合 |
| `美术/主面板/tag:button/Tag*`、`Tab*`、`StatesGrid*` | 待控件状态统一后接入 | 当前已有动态中文标签，直接套用固定尺寸图片会再次产生文字重叠 |
| 12 名角色场内精灵 | 参考仓库不存在 | 已由本项目生产原创俯视角全身图集；参考仓库只用于确认不存在可替换资源 |

2026-09-01 校验确认：参考仓库 `地图/pic/纯地图.png` 与本项目 `public/assets/battle/arena-live-map.png` 的 SHA-1 均为 `256fe3ecc030609d854e8fd01ebd710d44b67823`，因此仓库中没有一张尚未接入的“更高清实时地图”。

## 工程约束

- 地图和 UI 资源只承担视觉表现，区域、碰撞、导航、禁区和剧情仍由结构化配置驱动。
- 总览与直播共用 `AREA_ANCHORS`，替换底图时必须同步校准区域锚点并运行区域测试。
- 事件图标按事件类型映射，后端只保存事件 `kind`，不保存资产路径。
- 参考仓库当前未发现独立 LICENSE 文件。公开或商业发布前，应由项目所有者确认这些资源的授权范围；无法确认时需要换成具有明确授权的最终资产。
