# dsh-settings-organizer

独立的 DSH 设置导航整理插件。它不属于插件安全网，不安装或修改其他插件，只整理设置侧栏的显示结构。

当前版本提供：

- 会话、工作区、界面扩展三组默认分类；
- 设置页面首次迁移时自动识别已存在的页面；
- 未识别页面保留，不删除、不隐藏；
- 分组折叠、侧栏滚动和安全模式；
- 设置入口固定为“导航管理”，默认位于 Agent 预设之后；
- `prefers-reduced-motion` 下关闭动画。

```bash
dsh plugin --profile web add github:baihejiangnan/dsh-settings-organizer
```

这是独立项目，与 `dsh-plugin-safety-net` 无关。

## License

MIT
