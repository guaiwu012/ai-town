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
| `public/assets/reference/ui/controls/*.png` | `docs/superpowers/specs/美术/主面板/tag:button/`、`元素/ThresholdBar.png` | 按钮状态与热度组件视觉 |

## 工程约束

- 地图和 UI 资源只承担视觉表现，区域、碰撞、导航、禁区和剧情仍由结构化配置驱动。
- 总览与直播共用 `AREA_ANCHORS`，替换底图时必须同步校准区域锚点并运行区域测试。
- 事件图标按事件类型映射，后端只保存事件 `kind`，不保存资产路径。
- 参考仓库当前未发现独立 LICENSE 文件。公开或商业发布前，应由项目所有者确认这些资源的授权范围；无法确认时需要换成具有明确授权的最终资产。
