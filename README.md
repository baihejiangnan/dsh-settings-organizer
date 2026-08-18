# dsh-settings-organizer

独立的 DSH 设置导航整理插件。它不属于插件安全网，不安装或修改其他插件，只整理设置侧栏的显示结构。

当前版本提供：

- 会话、工作区、界面扩展三组默认分类；
- 设置页面首次迁移时自动识别已存在的页面；
- 未识别页面保留，不删除、不隐藏；
- 分组折叠、侧栏滚动和安全模式；
- 设置入口固定为“导航管理”，默认位于 Agent 预设之后；
- `prefers-reduced-motion` 下关闭动画。
- 页面归属编辑：把已发现的设置页面移动到任意默认分组；
- 导航配置导入/导出和恢复默认布局。

```bash
dsh plugin --profile web add github:baihejiangnan/dsh-settings-organizer
```

这是独立项目，与 `dsh-plugin-safety-net` 无关。

首次安装时会读取已经存在的设置页面并按默认规则归类。无法识别的页面不会被删除；用户可以在“页面归属”中重新选择分组。空分组默认不显示，但可以开启“显示空分组”。

真实 DSH Desktop 的窗口适配、截图和交互验收应在目标 profile 中完成。

## License

MIT
