# 第三方美术资源

## Game-icons.net

游戏中的物料、设施和科研图形由 [Game-icons.net](https://game-icons.net/) 的 SVG 图标重新配色并组合为单个 sprite。原始图标采用 [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/) 或其作者声明的 CC0 许可。

本项目对图标做了以下修改：移除原始黑色方形背景，以 `currentColor` 输出前景，并在客户端按物料类别添加颜色、底板和状态样式。

| 作者 | 使用的原始图标 |
| --- | --- |
| Caro Asercion | `test-tube-rack` |
| Delapouite | `brick-pile`, `coal-pile`, `coal-wagon`, `concrete-bag`, `cube`, `drill`, `electrical-socket`, `factory`, `factory-arm`, `fuel-tank`, `furnace`, `metal-plate`, `nuclear-plant`, `oil-pump`, `oil-rig`, `pipes`, `power-generator`, `radar-cross-section`, `railway`, `robot-antennas`, `robot-grab`, `rocket-thruster`, `speedometer`, `split-arrows`, `stone-pile`, `turbine`, `warehouse`, `wire-coil` |
| Faithtoken | `minerals`, `ore` |
| Lorc | `chemical-tank`, `circuitry`, `drop`, `gears`, `metal-bar`, `molecule`, `powder`, `processor`, `radar-sweep`, `radioactive`, `robot-golem`, `rocket`, `satellite`, `test-tubes` |
| Lucas | `belt` |
| Sbed | `battery-pack`, `nuclear`, `water-drop` |
| Skoll | `oil-drum`, `solar-power` |

原始文件与作者目录固定在提交 `82d948812bfe3f269ef8f731dcdb07b08160edc4`。可运行以下命令重新生成 sprite：

```bash
npm run assets:icons -w @yuo/farstar-foundry
```
