# 参考配表覆盖入口

旧版逐表矩阵已被可机器验证的逐列矩阵替代：

- [`reference-column-traceability.md`](./reference-column-traceability.md)：442 个非空列的 Excel 行列—配置—执行—测试—UI 对照。
- [`reference-implementation-audit.md`](./reference-implementation-audit.md)：本轮修正与验收结论。
- [`asset-provenance.md`](./asset-provenance.md)：运行时素材与设计参考素材的来源、用途及授权提醒。

权威数据快照位于 `data/referenceTables.generated.json`，解析入口是 `data/referenceRuntime.ts`；修改参考配表后必须重新生成追踪文件并通过 `data/referenceTraceability.test.ts`。
