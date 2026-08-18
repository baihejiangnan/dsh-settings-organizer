window.__ModuleLoader__.load({
  id: "dsh-settings-organizer",
  factory: function (require) {
    var module = { exports: {} }, React = require("react");
    var STORAGE = "dsh-settings-organizer:v1";
    var DEFAULTS = {
      groups: [
        { id: "session", label: "会话", items: ["对话管理", "会话管理", "侧边临时会话", "状态文案"] },
        { id: "workspace", label: "工作区", items: ["记忆", "快照", "文件提及"] },
        { id: "extensions", label: "界面扩展", items: ["通知", "扩展管理", "侧边卡片", "顶部按钮管理"] }
      ], collapsed: {}, safeMode: false
    };
    var nativeLabels = ["通用设置", "模型", "插件", "Agent 预设", "导航管理"];
    var state = readState();
    var styleId = "dsh-settings-organizer-style";
    function readState() { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORAGE) || "{}")); } catch (_) { return DEFAULTS; } }
    function saveState(next) { state = next; localStorage.setItem(STORAGE, JSON.stringify(next)); organize(); }
    function textOf(el) { return (el.textContent || "").replace(/\s+/g, " ").trim(); }
    function navRoot() { return document.querySelector('[data-slot="settings.section"]')?.parentElement || document.querySelector('[role="navigation"]'); }
    function findRows(root) { return root ? Array.from(root.querySelectorAll("button,[role=button],a")).filter(function (x) { return textOf(x).length > 0; }) : []; }
    function groupFor(label) { for (var i=0;i<state.groups.length;i++) if (state.groups[i].items.indexOf(label)>=0) return state.groups[i]; return null; }
    function organize() {
      if (state.safeMode) return;
      var root = navRoot(); if (!root) return;
      root.classList.add("dsho-organized");
      var rows = findRows(root), groups = {};
      state.groups.forEach(function (g) { groups[g.id] = makeGroup(root, g); });
      rows.forEach(function (row) {
        if (row.closest(".dsho-group") || row.dataset.dshoMoved) return;
        var label = textOf(row), group = groupFor(label); if (!group || nativeLabels.indexOf(label)>=0) return;
        var item = row.closest("li") || row.parentElement; if (!item || item === root) return;
        item.dataset.dshoMoved = "1"; groups[group.id].items.appendChild(item);
      });
    }
    function makeGroup(root, group) {
      var old = root.querySelector('[data-dsho-group="'+group.id+'"]'); if (old) return old;
      var wrap = document.createElement("div"); wrap.className="dsho-group"; wrap.dataset.dshoGroup=group.id;
      var head=document.createElement("button"); head.type="button"; head.className="dsho-group-head"; head.textContent=group.label+"  ";
      var items=document.createElement("div"); items.className="dsho-group-items"; wrap.append(head,items); root.appendChild(wrap);
      head.onclick=function(){var collapsed=!!state.collapsed[group.id]; saveState(Object.assign({},state,{collapsed:Object.assign({},state.collapsed,{[group.id]:!collapsed})}));};
      if (state.collapsed[group.id]) items.hidden=true; return wrap;
    }
    function injectStyle() { if (document.getElementById(styleId)) return; var s=document.createElement("style"); s.id=styleId; s.textContent=".dsho-group{margin:4px 0}.dsho-group-head{width:100%;border:0;background:transparent;text-align:left;padding:9px 16px;color:var(--ds-text-secondary,#697386);font-size:13px;font-weight:600;cursor:pointer}.dsho-group-items{overflow:hidden}.dsho-group-items>*{animation:dsho-in .16s ease-out}@keyframes dsho-in{from{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:none}}.dsho-organized{overflow-y:auto;scrollbar-gutter:stable;max-height:100%}@media(prefers-reduced-motion:reduce){.dsho-group-items>*{animation:none}}"; document.head.appendChild(s); }
    function apply(ctx) { injectStyle(); var observer=new MutationObserver(function(){organize();}); observer.observe(document.body,{childList:true,subtree:true}); organize(); ctx.effect(function(){return function(){observer.disconnect();var s=document.getElementById(styleId);if(s)s.remove();};}); ctx.slots.inject("settings.section",function(){return ctx.slots.register({name:"settings.section",id:"dsh-settings-organizer",order:150,label:function(){return "导航管理";}},function(){var st=React.useState(state),set=st[1]; function toggleSafe(){var n=Object.assign({},state,{safeMode:!state.safeMode}); saveState(n);set(n);} return React.createElement("div",{style:{maxWidth:680,padding:20}},React.createElement("h3",null,"设置导航管理"),React.createElement("p",null,"已知页面会自动归类，未知页面保留原位置。导航管理始终保留。"),React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:state.safeMode,onChange:toggleSafe})," 安全模式（暂时显示原始导航）"));});}); }
    module.exports.apply=apply; module.exports.inject=["slots"]; return module.exports;
  }
});
