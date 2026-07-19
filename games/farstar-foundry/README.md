# 远星工造

远星工造是接入 Yuo 游戏大厅的多人协作文字放置游戏。房主可以创建 2/4/6 人房间并设置密码，成员共享库存、设施、科研、电网和最终火箭工程。

当前内容覆盖从手动采矿到轨道火箭发射的完整非战斗工业链：

- 76 种库存资源，包括矿物、流体、冶炼材料、石油化工、电子元件、三级物流、铁路、机器人、三级模块、五类科学包和航天组件。
- 94 类专用设施和产线，包括采掘、熔炼、炼油、裂解、核燃料闭环、装配、物流、电力、科研和火箭工程。
- 37 项渐进科技。科研直接消耗对应阶段的科学包，不使用抽象研究点。
- 六类协作岗位。首名岗位成员提供 12% 对应部门增益，重复岗位每人增加 5%，单部门最高 27%。
- 共享生产优先级、`1/5/10` 批量建造、可调运行数量、电网负载、仓储和全厂物流/产能/能效增益。

未解锁资源、设施和科技不会发送额外目录数据，也不会在界面渲染；内容一旦解锁，即使库存或设施数量归零也会永久显示。手动采集是服务端计时作业，刷新或重连不会跳过进度。

玩法参考自动化工厂游戏的生产链和 `FG Factory` 的文字放置节奏，所有界面、数值、多人规则和服务端实现均为独立设计。物料与设施图形来自开放许可的 Game-icons.net，不使用 Factorio 美术资源；详细署名见 [THIRD_PARTY_ASSETS.md](./THIRD_PARTY_ASSETS.md)。

## 本地开发

先在仓库根目录构建共享包，再分别启动平台、游戏服务端和客户端：

```bash
npm run build:packages
npm run dev:platform
npm run dev -w @yuo/farstar-foundry
```

游戏客户端默认位于 `http://127.0.0.1:5177`，服务端位于 `http://127.0.0.1:3104`。必须从平台大厅取得启动凭据后进入。

重新生成 Game-icons 单文件 sprite：

```bash
npm run assets:icons -w @yuo/farstar-foundry
```

## 验证

```bash
npm run typecheck -w @yuo/farstar-foundry
npm run test -w @yuo/farstar-foundry
npm run benchmark -w @yuo/farstar-foundry
npm run build -w @yuo/farstar-foundry
```

生产存档路径由 `DATA_PATH` 指定。房间密码只保存带随机盐的 scrypt 哈希，客户端协议不包含密码哈希或平台身份字段。版本 1 的旧工厂存档会在读取时迁移到完整工业目录。
