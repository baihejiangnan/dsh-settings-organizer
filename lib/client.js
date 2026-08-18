window.__ModuleLoader__.load({
  id: "dsh-settings-organizer",
  factory: function (require) {
    var module = { exports: {} },
      React = require("react"),
      KEY = "dsh-settings-organizer:v2";
    var DEFAULT = {
      version: 2,
      showEmpty: false,
      safeMode: false,
      assignments: {},
      pageOrder: {},
      originalPages: [],
      collapsed: {},
      nodes: [
        {
          id: "session",
          label: "会话",
          parentId: null,
          children: ["对话管理", "会话管理", "侧边临时会话", "状态文案"],
        },
        {
          id: "workspace",
          label: "工作区",
          parentId: null,
          children: ["记忆", "快照", "文件提及"],
        },
        {
          id: "security",
          label: "插件安全",
          parentId: null,
          children: ["插件管理", "插件检测", "备份管理"],
        },
        {
          id: "extensions",
          label: "界面扩展",
          parentId: null,
          children: ["通知", "扩展管理", "侧边卡片", "顶部按钮管理"],
        },
        {
          id: "automation",
          label: "Agent 与自动化",
          parentId: null,
          children: [],
        },
        { id: "developer", label: "开发工具", parentId: null, children: [] },
        { id: "external", label: "外部服务", parentId: null, children: [] },
        { id: "other", label: "其他扩展", parentId: null, children: [] },
      ],
    };
    function copy(x) {
      return JSON.parse(JSON.stringify(x));
    }
    function load() {
      try {
        var x = JSON.parse(localStorage.getItem(KEY) || "");
        if (!x || x.version !== 2 || !Array.isArray(x.nodes))
          return copy(DEFAULT);
        x.assignments = x.assignments || {};
        x.pageOrder = x.pageOrder || {};
        x.originalPages = x.originalPages || [];
        x.collapsed = x.collapsed || {};
        x.nodes.forEach(function (node) {
          node.parentId = null;
          if (!Array.isArray(node.children)) node.children = [];
          node.hidden = node.hidden === true;
        });
        return x;
      } catch (_) {
        return copy(DEFAULT);
      }
    }
    var state = load();
    function persist(x) {
      state = x;
      localStorage.setItem(KEY, JSON.stringify(x));
    }
    function save(x) {
      persist(x);
      organize(true);
    }
    var managed = new Map(),
      headings = new Map(),
      timer = 0;
    function labelOf(x) {
      return (x.textContent || "").replace(/\s+/g, " ").trim();
    }
    function defaultGroup(label) {
      for (var i = 0; i < state.nodes.length; i++)
        if ((state.nodes[i].children || []).indexOf(label) >= 0)
          return state.nodes[i].id;
      return "other";
    }
    function groupById(id) {
      return state.nodes.find(function (node) {
        return node.id === id;
      });
    }
    function groupDepth(node) {
      var depth = 1,
        current = node;
      while (current && current.parentId) {
        depth += 1;
        current = groupById(current.parentId);
        if (depth > 3) break;
      }
      return depth;
    }
    function groupPath(node) {
      var labels = [node.label],
        current = node;
      while (current.parentId) {
        current = groupById(current.parentId);
        if (!current) break;
        labels.unshift(current.label);
      }
      return labels.join(" / ");
    }
    function nav() {
      var target = Array.from(document.querySelectorAll("button,a")).find(
        function (x) {
          return labelOf(x) === "导航管理";
        },
      );
      if (!target) return null;
      var p = target.parentElement;
      while (p && p.querySelectorAll(":scope > button,:scope > a").length < 5)
        p = p.parentElement;
      return p;
    }
    function restore() {
      managed.forEach(function (original, row) {
        row.style.order = original.order;
        row.hidden = original.hidden;
        row.classList.remove("dsho-managed-row");
        row.removeAttribute("data-dsho-group");
      });
      managed.clear();
      headings.forEach(function (head) {
        if (head.isConnected) head.remove();
      });
      headings.clear();
    }
    function ancestorUnavailable(group) {
      var current = group;
      while (current && current.parentId) {
        current = groupById(current.parentId);
        if (current && (current.hidden || state.collapsed[current.id])) return true;
      }
      return false;
    }
    function syncVisibility() {
      headings.forEach(function (head, id) {
        var group = groupById(id);
        if (!group) return;
        var collapsed = state.collapsed[id] === true;
        head.hidden = group.hidden || ancestorUnavailable(group);
        head.setAttribute("aria-expanded", collapsed ? "false" : "true");
        head.textContent = (collapsed ? "▸ " : "▾ ") + group.label;
      });
      managed.forEach(function (_, row) {
        var group = groupById(row.getAttribute("data-dsho-group"));
        row.hidden =
          !group ||
          group.hidden ||
          state.collapsed[group.id] === true ||
          ancestorUnavailable(group);
      });
    }
    function organize(force) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!force && managed.size) {
          var currentNav = nav();
          var coreLabels = ["通用设置", "模型", "插件", "Agent 预设", "导航管理"];
          var hasUnmanaged = currentNav && Array.from(
            currentNav.querySelectorAll(":scope > button,:scope > a"),
          ).some(function (row) {
            return (
              !row.classList.contains("dsho-nav-head") &&
              !row.classList.contains("dsho-managed-row") &&
              coreLabels.indexOf(labelOf(row)) < 0
            );
          });
          var staleManaged = Array.from(managed.keys()).some(function (row) {
            return !row.isConnected;
          });
          var staleHeading = Array.from(headings.values()).some(function (head) {
            return !head.isConnected;
          });
          if (!hasUnmanaged && !staleManaged && !staleHeading) return;
        }
        restore();
        if (state.safeMode) return;
        var n = nav();
        if (!n) return;
        n.classList.add("dsho-organized");
        var core = ["通用设置", "模型", "插件", "Agent 预设", "导航管理"],
          b = {};
        state.nodes.forEach(function (g) {
          b[g.id] = [];
        });
        Array.from(n.querySelectorAll(":scope > button,:scope > a")).forEach(
          function (row) {
            var l = labelOf(row);
            if (core.indexOf(l) >= 0) return;
            var id = state.assignments[l] || defaultGroup(l);
            if (b[id]) b[id].push(row);
          },
        );
        function hasContent(group) {
          if (group.hidden) return false;
          return (
            (b[group.id] || []).length > 0 ||
            state.nodes.some(function (child) {
              return child.parentId === group.id && hasContent(child);
            })
          );
        }
        var order = 1000;
        state.nodes.forEach(function (g) {
          if (g.hidden) return;
          var list = b[g.id] || [];
          if (!state.showEmpty && !hasContent(g)) return;
          var h = document.createElement("button");
          h.className = "dsho-nav-head";
          h.style.paddingLeft = 16 + (groupDepth(g) - 1) * 16 + "px";
          h.style.order = String(order++);
          h.type = "button";
          h.onclick = function () {
            var next = copy(state);
            next.collapsed[g.id] = !next.collapsed[g.id];
            persist(next);
            syncVisibility();
          };
          headings.set(g.id, h);
          n.appendChild(h);
          list.forEach(function (row) {
            managed.set(row, { order: row.style.order, hidden: row.hidden });
            row.classList.add("dsho-managed-row");
            row.setAttribute("data-dsho-group", g.id);
            row.style.order = String(order++);
          });
        });
        syncVisibility();
      }, force ? 0 : 50);
    }
    function css() {
      if (document.getElementById("dsho-css")) return;
      var s = document.createElement("style");
      s.id = "dsho-css";
      s.textContent =
        ".dsho-card{max-width:760px;padding:20px}.dsho-tools{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.dsho-btn{border:1px solid var(--ds-border,#d9dde5);background:transparent;color:var(--ds-text,inherit);border-radius:7px;padding:7px 11px;cursor:pointer}.dsho-primary{background:#2563eb;color:#fff;border-color:#2563eb}.dsho-tree{border:1px solid var(--ds-border,#e3e7ee);border-radius:9px;overflow:hidden}.dsho-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--ds-border,#edf0f4)}.dsho-group{background:var(--ds-bg-secondary,#f7f8fa);font-weight:600}.dsho-child{padding-left:32px}.dsho-label{flex:1;min-width:0}.dsho-actions{display:flex;gap:2px}.dsho-actions button{border:0;background:transparent;padding:4px 6px;cursor:pointer;color:var(--ds-text-secondary,#697386)}.dsho-select{min-width:190px;max-width:46%;height:34px;padding:0 34px 0 10px;border:1px solid var(--ds-border,#d9dde5);border-radius:7px;background:var(--ds-bg,#fff);color:var(--ds-text,#1f2329);font:inherit;cursor:pointer;outline:none;transition:border-color .15s ease,box-shadow .15s ease}.dsho-select:hover{border-color:#9ca7b8}.dsho-select:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.13)}.dsho-hint{font-size:13px;color:var(--ds-text-secondary,#697386);line-height:1.5}@media(max-width:640px){.dsho-row{align-items:flex-start;flex-wrap:wrap}.dsho-select{width:100%;max-width:none}}@media(prefers-reduced-motion:no-preference){.dsho-row{transition:background .14s ease}.dsho-row:hover{background:rgba(37,99,235,.06)}}";
      s.textContent +=
        ".dsho-input{min-width:160px;height:34px;padding:0 10px;border:1px solid var(--ds-border,#d9dde5);border-radius:7px;background:var(--ds-bg,#fff);color:var(--ds-text,#1f2329);font:inherit;outline:none}.dsho-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.13)}.dsho-parent-select{max-width:260px}.dsho-btn:disabled{opacity:.5;cursor:not-allowed}@media(max-width:640px){.dsho-input{width:100%}}";
      document.head.appendChild(s);
    }
    function navCss() {
      var s = document.createElement("style");
      s.textContent =
        ".dsho-organized{display:flex;flex-direction:column;overflow-y:auto;scrollbar-gutter:stable}.dsho-nav-head{width:100%;box-sizing:border-box;border:0;background:transparent;text-align:left;padding:9px 16px;color:#697386;font-size:13px;font-weight:600;cursor:pointer}.dsho-managed-row{padding-left:28px!important;transition:padding-left .16s ease}.dsho-managed-row[aria-current=true]{padding-left:16px!important}.dsho-nav-head[hidden],.dsho-managed-row[hidden]{display:none!important}.dsho-nav-head:hover{background:rgba(37,99,235,.06)}";
      document.head.appendChild(s);
    }
    function move(id, d) {
      var a = copy(state);
      var i = a.nodes.findIndex(function (x) {
          return x.id === id;
        }),
        j = i + d;
      if (i >= 0 && j >= 0 && j < a.nodes.length) {
        var t = a.nodes[i];
        a.nodes[i] = a.nodes[j];
        a.nodes[j] = t;
        save(a);
        organize();
      }
    }
    function Editor() {
      var tick = React.useState(0),
        refresh = tick[1];
      function redraw() {
        refresh(function (x) {
          return x + 1;
        });
      }
      function add() {
        var l = prompt("新分组名称");
        if (!l) return;
        var a = copy(state);
        a.nodes.push({ id: "group-" + Date.now(), label: l, children: [] });
        save(a);
        redraw();
      }
      function rename(n) {
        var l = prompt("分组名称", n.label);
        if (l) {
          n.label = l;
          save(state);
          redraw();
        }
      }
      function reset() {
        if (confirm("恢复默认分类？")) {
          state = copy(DEFAULT);
          save(state);
          redraw();
        }
      }
      function restoreOriginal() {
        var x = copy(state);
        x.safeMode = true;
        save(x);
        redraw();
      }
      function exp() {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(
          new Blob([JSON.stringify(state, null, 2)], {
            type: "application/json",
          }),
        );
        a.download = "dsh-settings-navigation.json";
        a.click();
      }
      function imp() {
        var i = document.createElement("input");
        i.type = "file";
        i.accept = "application/json";
        i.onchange = function () {
          var f = i.files && i.files[0];
          if (!f) return;
          var r = new FileReader();
          r.onload = function () {
            try {
              var x = JSON.parse(r.result);
              if (!x.nodes) throw 0;
              x.version = 2;
              save(x);
              redraw();
            } catch (_) {
              alert("配置文件无效");
            }
          };
          r.readAsText(f);
        };
        i.click();
      }
      function row(n) {
        return React.createElement(
          React.Fragment,
          { key: n.id },
          React.createElement(
            "div",
            { className: "dsho-row dsho-group" },
            React.createElement("span", { className: "dsho-label" }, n.label),
            React.createElement(
              "span",
              { className: "dsho-actions" },
              React.createElement(
                "button",
                {
                  title: "上移",
                  onClick: function () {
                    move(n.id, -1);
                    redraw();
                  },
                },
                "↑",
              ),
              React.createElement(
                "button",
                {
                  title: "下移",
                  onClick: function () {
                    move(n.id, 1);
                    redraw();
                  },
                },
                "↓",
              ),
              React.createElement(
                "button",
                {
                  title: "重命名",
                  onClick: function () {
                    rename(n);
                  },
                },
                "改名",
              ),
            ),
          ),
          n.children.map(function (x) {
            return typeof x === "string"
              ? React.createElement(
                  "div",
                  { className: "dsho-row dsho-child", key: x },
                  React.createElement("span", { className: "dsho-label" }, x),
                )
              : null;
          }),
        );
      }
      return React.createElement(
        "div",
        { className: "dsho-card" },
        React.createElement("h3", null, "设置导航管理"),
        React.createElement(
          "p",
          { className: "dsho-hint" },
          "编辑一级分组。二级导航由 DSH 和插件提供的设置页面生成。",
        ),
        React.createElement(
          "div",
          { className: "dsho-tools" },
          React.createElement(
            "button",
            { className: "dsho-btn dsho-primary", onClick: add },
            "新建分组",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: reset },
            "恢复默认",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: restoreOriginal },
            "显示原始导航",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: exp },
            "导出",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: imp },
            "导入",
          ),
          React.createElement(
            "label",
            { className: "dsho-hint" },
            React.createElement("input", {
              type: "checkbox",
              checked: state.showEmpty,
              onChange: function (e) {
                state.showEmpty = e.target.checked;
                save(state);
                redraw();
              },
            }),
            " 显示空分组",
          ),
          React.createElement(
            "label",
            { className: "dsho-hint" },
            React.createElement("input", {
              type: "checkbox",
              checked: state.safeMode,
              onChange: function (e) {
                state.safeMode = e.target.checked;
                save(state);
                redraw();
              },
            }),
            " 安全模式",
          ),
        ),
        React.createElement(
          "div",
          { className: "dsho-tree" },
          state.nodes
            .filter(function (n) {
              return state.showEmpty || n.children.length;
            })
            .map(row),
        ),
      );
    }
    function Editor2() {
      var rev = React.useState(0),
        setRev = rev[1],
        nameState = React.useState(""),
        newName = nameState[0],
        setNewName = nameState[1];
      function redraw() {
        setRev(function (x) {
          return x + 1;
        });
      }
      function pages() {
        var n = nav(),
          core = ["通用设置", "模型", "插件", "Agent 预设", "导航管理"];
        var groupLabels = state.nodes.map(function (group) {
          return group.label;
        });
        var result = n
          ? Array.from(n.querySelectorAll(":scope > button,:scope > a"))
              .filter(function (row) {
                return !row.classList.contains("dsho-nav-head");
              })
              .map(labelOf)
              .filter(function (x, i, a) {
                return x && core.indexOf(x) < 0 && groupLabels.indexOf(x) < 0 && a.indexOf(x) === i;
              })
          : [];
        return result;
      }
      function assign(label, id) {
        var x = copy(state);
        x.assignments[label] = id;
        save(x);
        redraw();
      }
      function add() {
        var l = newName.trim();
        if (!l) return;
        var x = copy(state);
        x.nodes.push({
          id: "group-" + Date.now(),
          label: l,
          parentId: null,
          children: [],
        });
        save(x);
        setNewName("");
        redraw();
      }
      function reset() {
        if (confirm("恢复默认分类？")) {
          save(copy(DEFAULT));
          redraw();
        }
      }
      function renameGroup(group) {
        var label = prompt("分组名称", group.label);
        if (!label) return;
        var x = copy(state),
          target = x.nodes.find(function (n) {
            return n.id === group.id;
          });
        if (target) target.label = label;
        save(x);
        redraw();
      }
      function deleteGroup(group) {
        if (group.id === "other" || !confirm("删除分组“" + group.label + "”？"))
          return;
        var x = copy(state),
          removed = [group.id];
        x.nodes.forEach(function (n) {
          if (n.parentId === group.id) {
            n.parentId = null;
          }
        });
        x.nodes = x.nodes.filter(function (n) {
          return n.id !== group.id;
        });
        Object.keys(x.assignments).forEach(function (k) {
          if (removed.indexOf(x.assignments[k]) >= 0)
            x.assignments[k] = "other";
        });
        save(x);
        redraw();
      }
      function toggleGroup(group) {
        var x = copy(state),
          target = x.nodes.find(function (n) {
            return n.id === group.id;
          });
        if (target) target.hidden = !target.hidden;
        save(x);
        redraw();
      }
      function toggleCollapsed(group) {
        var x = copy(state);
        x.collapsed[group.id] = !x.collapsed[group.id];
        persist(x);
        syncVisibility();
        redraw();
      }
      function exportConfig() {
        var url = URL.createObjectURL(
          new Blob([JSON.stringify(state, null, 2)], {
            type: "application/json",
          }),
        );
        var a = document.createElement("a");
        a.href = url;
        a.download = "dsh-settings-navigation.json";
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 0);
      }
      function importConfig() {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = function () {
          var file = input.files && input.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function () {
            try {
              var x = JSON.parse(reader.result);
              if (!Array.isArray(x.nodes)) throw new Error();
              x.version = 2;
              x.assignments = x.assignments || {};
              x.nodes.forEach(function (node) {
                node.parentId = null;
              });
              save(x);
              redraw();
            } catch (_) {
              alert("配置文件无效");
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
      function restoreOriginal() {
        var x = copy(state);
        x.safeMode = true;
        save(x);
        redraw();
      }
      var found = pages();
      React.useEffect(
        function () {
          if (!found.length || state.originalPages.length) return;
          var snapshot = copy(state);
          snapshot.originalPages = found.slice();
          save(snapshot);
        },
        [found.join("\n")],
      );
      return React.createElement(
        "div",
        { className: "dsho-card" },
        React.createElement("h3", null, "设置导航管理"),
        React.createElement(
          "p",
          { className: "dsho-hint" },
          "新建项均为一级分组；二级导航来自 DSH 和插件提供的设置页面。",
        ),
        React.createElement(
          "div",
          { className: "dsho-tools" },
          React.createElement("input", {
            className: "dsho-input",
            value: newName,
            placeholder: "新分组名称",
            onChange: function (e) { setNewName(e.target.value); },
            onKeyDown: function (e) { if (e.key === "Enter") add(); },
          }),
          React.createElement(
            "button",
            {
              className: "dsho-btn dsho-primary",
              onClick: add,
              disabled: !newName.trim(),
            },
            "新建分组",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: reset },
            "恢复默认",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: restoreOriginal },
            "显示原始导航",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: exportConfig },
            "导出",
          ),
          React.createElement(
            "button",
            { className: "dsho-btn", onClick: importConfig },
            "导入",
          ),
          React.createElement(
            "label",
            { className: "dsho-hint" },
            React.createElement("input", {
              type: "checkbox",
              checked: state.showEmpty,
              onChange: function (e) {
                var x = copy(state);
                x.showEmpty = e.target.checked;
                save(x);
                redraw();
              },
            }),
            " 显示空分组",
          ),
          React.createElement(
            "label",
            { className: "dsho-hint" },
            React.createElement("input", {
              type: "checkbox",
              checked: state.safeMode,
              onChange: function (e) {
                var x = copy(state);
                x.safeMode = e.target.checked;
                save(x);
                redraw();
              },
            }),
            " 安全模式",
          ),
        ),
        React.createElement("h4", null, "导航层级"),
        React.createElement(
          "div",
          { className: "dsho-tree" },
          state.nodes.map(function (group) {
            return React.createElement(
              "div",
              {
                className: "dsho-row",
                key: group.id,
                style: { paddingLeft: 12 + (groupDepth(group) - 1) * 22 },
              },
                React.createElement(
                  "span",
                  { className: "dsho-label" },
                  groupPath(group) + (group.hidden ? "（已隐藏）" : ""),
              ),
              React.createElement(
                "span",
                { className: "dsho-actions" },
                React.createElement(
                  "button",
                  {
                    onClick: function () {
                      move(group.id, -1);
                      redraw();
                    },
                    title: "上移",
                  },
                  "↑",
                ),
                React.createElement(
                  "button",
                  {
                    onClick: function () {
                      move(group.id, 1);
                      redraw();
                    },
                    title: "下移",
                  },
                  "↓",
                ),
                React.createElement(
                  "button",
                  {
                    onClick: function () {
                      renameGroup(group);
                    },
                  },
                  "改名",
                ),
                React.createElement(
                  "button",
                  {
                    onClick: function () {
                      toggleCollapsed(group);
                    },
                    title: state.collapsed[group.id] ? "展开页面" : "折叠页面",
                  },
                  state.collapsed[group.id] ? "展开" : "折叠",
                ),
                React.createElement(
                  "button",
                  {
                    onClick: function () {
                      toggleGroup(group);
                    },
                    title: group.hidden ? "显示分组" : "隐藏分组",
                  },
                  group.hidden ? "显示" : "隐藏",
                ),
                group.id !== "other"
                  ? React.createElement(
                      "button",
                      {
                        onClick: function () {
                          deleteGroup(group);
                        },
                        title: "删除",
                      },
                      "×",
                    )
                  : null,
              ),
            );
          }),
        ),
        React.createElement("h4", null, "页面归属"),
        React.createElement(
          "div",
          { className: "dsho-tree" },
          found.length
            ? found.map(function (label) {
                return React.createElement(
                  "div",
                  { className: "dsho-row", key: label },
                  React.createElement(
                    "span",
                    { className: "dsho-label" },
                    label,
                  ),
                  React.createElement(
                    "select",
                    {
                      className: "dsho-select",
                      value: state.assignments[label] || defaultGroup(label),
                      onChange: function (e) {
                        assign(label, e.target.value);
                      },
                    },
                    state.nodes
                      .filter(function (g) {
                        return groupDepth(g) <= 3;
                      })
                      .map(function (g) {
                        return React.createElement(
                          "option",
                          { key: g.id, value: g.id },
                          groupPath(g),
                        );
                      }),
                  ),
                );
              })
            : React.createElement(
                "div",
                { className: "dsho-row dsho-hint" },
                "尚未发现可整理的设置页面。",
              ),
        ),
      );
    }
    function EditorBoundary(props) {
      return React.createElement(EditorErrorBoundary, null, props.children);
    }
    class EditorErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error: error };
      }
      render() {
        if (!this.state.error) return this.props.children;
        var message = String(this.state.error.message || this.state.error);
        return React.createElement(
          "div",
          { className: "dsho-card" },
          React.createElement("h3", null, "导航管理加载失败"),
          React.createElement("p", { className: "dsho-hint" }, message),
          React.createElement(
            "button",
            {
              className: "dsho-btn dsho-primary",
              onClick: function () {
                localStorage.removeItem(KEY);
                location.reload();
              },
            },
            "重置导航配置",
          ),
        );
      }
    }
    function SettingsEditor() {
      return React.createElement(
        EditorBoundary,
        null,
        React.createElement(Editor2),
      );
    }
    function apply(ctx) {
      css();
      navCss();
      var observer = new MutationObserver(function () {
        organize(false);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      organize();
      ctx.effect(function () {
        return function () {
          observer.disconnect();
          restore();
        };
      });
      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register(
          {
            name: "settings.section",
            id: "dsh-settings-organizer",
            order: 150,
            label: function () {
              return "导航管理";
            },
          },
          SettingsEditor,
        );
      });
    }
    module.exports.apply = apply;
    module.exports.inject = ["slots"];
    return module.exports;
  },
});
