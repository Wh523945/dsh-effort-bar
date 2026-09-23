// dsh-effort-bar —— 极简推理强度滑条（浏览器端 bundle）
// 结构照抄 dsh-liang-skin 的构建产物约定：
//   window.__ModuleLoader__.load({ id: <包名>, factory: (require) => { var module = { exports: {} }; ...
// 只 require "react"（平台种子模块）；服务通过模块级 inject 声明后从 ctx 上直接取。
window.__ModuleLoader__.load({
  id: 'dsh-effort-bar',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var React = require('react');
    var h = React.createElement;

    var PACKAGE_ID = 'dsh-effort-bar';
    var SLOT = 'conversation.input.right';

    // 与 CSS 里的 thumb 尺寸保持一致：刻度与气泡都按 "轨道两端各让出半个 thumb" 来定位
    var THUMB = 11;
    var HALF = THUMB / 2;

    try {
      if (typeof console !== 'undefined' && console.info) console.info('[dsh-effort-bar] bundle loaded');
    } catch (error) {
      /* ignore */
    }

    var CSS = [
      '.dsh-eb{position:relative;display:inline-flex;align-items:center;height:28px;padding:0 4px;box-sizing:border-box}',
      '.dsh-eb__rail{position:relative;width:176px;height:14px;display:flex;align-items:center}',
      // 只有一根线（亮度压回原来的量级：次级文字色混合到 52%）
      '.dsh-eb__line{position:absolute;left:0;right:0;top:50%;height:1px;transform:translateY(-.5px);background:color-mix(in srgb,var(--dsw-alias-label-secondary,#c8ced8) 52%,transparent)}',
      '.dsh-eb__ticks{position:absolute;left:0;right:0;top:50%;height:11px;transform:translateY(-50%);pointer-events:none}',
      // 刻度尺：每个档位一根竖线，比主线再淡一档
      '.dsh-eb__tick{position:absolute;top:0;width:1px;height:11px;transform:translateX(-.5px);background:color-mix(in srgb,var(--dsw-alias-label-secondary,#c8ced8) 32%,transparent)}',
      '.dsh-eb__range{position:absolute;left:0;right:0;top:50%;width:100%;height:14px;margin:0;transform:translateY(-50%);background:transparent;-webkit-appearance:none;appearance:none;cursor:pointer}',
      '.dsh-eb__range:focus{outline:none}',
      '.dsh-eb__range:disabled{cursor:default;opacity:.5}',
      '.dsh-eb__range::-webkit-slider-runnable-track{background:transparent;height:14px;border:none}',
      // 选中的档位：实心小球 + 外面套一个圆环
      '.dsh-eb__range::-webkit-slider-thumb{-webkit-appearance:none;box-sizing:border-box;width:11px;height:11px;border-radius:50%;border:1px solid var(--dsw-alias-brand-primary,#4d6bfe);background:radial-gradient(circle at 50% 50%,var(--dsw-alias-brand-primary,#4d6bfe) 0 2.2px,transparent 2.2px)}',
      '.dsh-eb__range::-moz-range-track{background:transparent;height:14px;border:none}',
      '.dsh-eb__range::-moz-range-thumb{box-sizing:border-box;width:11px;height:11px;border-radius:50%;border:1px solid var(--dsw-alias-brand-primary,#4d6bfe);background:radial-gradient(circle at 50% 50%,var(--dsw-alias-brand-primary,#4d6bfe) 0 2.2px,transparent 2.2px)}',
      '.dsh-eb__bubble{position:absolute;bottom:calc(100% + 2px);left:clamp(16px,calc(' + HALF + 'px + (100% - ' + THUMB + 'px) * var(--dsh-eb-ratio,.5)),calc(100% - 16px));transform:translateX(-50%);padding:3px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-3,#3a3d45) 55%,transparent);color:var(--dsw-alias-label-primary,#fff);font:var(--dsw-font-xs-13,400 12px/1.5 sans-serif);letter-spacing:.01em;white-space:nowrap;border:1px solid color-mix(in srgb,#fff 14%,transparent);box-shadow:0 6px 20px rgba(0,0,0,.3);-webkit-backdrop-filter:blur(12px) saturate(1.6);backdrop-filter:blur(12px) saturate(1.6);z-index:20;pointer-events:none}',
    ].join('\n');

    function ensureStyle() {
      var key = PACKAGE_ID + '/effort-bar.css';
      if (typeof document === 'undefined') return;
      if (document.querySelector('style[data-plugin-css=' + JSON.stringify(key) + ']') !== null) return;
      var style = document.createElement('style');
      style.dataset.plugin = PACKAGE_ID;
      style.dataset.pluginCss = key;
      style.textContent = CSS;
      document.head.append(style);
    }

    function modelReasoning(state) {
      if (!state || !state.current) return null;
      var current = state.current;
      var groups = state.groups || [];
      var group = null;
      for (var i = 0; i < groups.length; i += 1) {
        if (groups[i].id === current.provider) { group = groups[i]; break; }
      }
      if (group === null) return null;
      var models = group.models || [];
      var model = null;
      for (var j = 0; j < models.length; j += 1) {
        if (models[j].id === current.model) { model = models[j]; break; }
      }
      if (model === null || model.reasoning === undefined || model.reasoning === null) return null;
      var efforts = model.reasoning.efforts || [];
      if (efforts.length === 0) return null;
      return { selection: current, efforts: efforts, defaultEffort: model.reasoning.defaultEffort };
    }

    // 档位 i 在轨道上的位置：两端各让出半个 thumb，和原生 range 的 thumb 中心完全对齐
    function ratioAt(index, count) {
      if (count <= 1) return 0;
      return index / (count - 1);
    }

    function EffortBar(props) {
      var directory = props.directory;
      var load = props.load;
      var select = props.select;

      var subscribe = React.useCallback(function (listener) {
        return directory.subscribe(listener);
      }, [directory]);
      var getSnapshot = React.useCallback(function () {
        return directory.getSnapshot();
      }, [directory]);
      var state = React.useSyncExternalStore(subscribe, getSnapshot);

      var reasoning = React.useMemo(function () { return modelReasoning(state); }, [state]);
      var efforts = reasoning === null ? EMPTY : reasoning.efforts;

      var committedIndex = React.useMemo(function () {
        if (reasoning === null) return -1;
        var id = reasoning.selection.reasoningEffort === undefined
          ? reasoning.defaultEffort
          : reasoning.selection.reasoningEffort;
        if (id === undefined) return -1;
        for (var i = 0; i < efforts.length; i += 1) {
          if (efforts[i].id === id) return i;
        }
        return -1;
      }, [reasoning, efforts]);

      var valueState = React.useState(0);
      var value = valueState[0];
      var setValue = valueState[1];
      var interactState = React.useState(false);
      var interacting = interactState[0];
      var setInteracting = interactState[1];
      var pendingState = React.useState(false);
      var pending = pendingState[0];
      var setPending = pendingState[1];
      var dragging = React.useRef(false);

      // 目录是懒加载的，不主动 load 的话 groups 一直是空的 —— 什么都不显示
      React.useEffect(function () {
        if (typeof load === 'function') load();
      }, [load]);

      // 外部档位变化时同步位置（拖动中/提交中不打断）
      React.useEffect(function () {
        if (dragging.current || pending) return;
        if (committedIndex >= 0) setValue(committedIndex);
      }, [committedIndex, pending]);

      if (reasoning === null || efforts.length < 2) return null;

      var max = efforts.length - 1;
      var index = value;
      if (index < 0) index = 0;
      if (index > max) index = max;
      var current = efforts[index];
      var ratio = ratioAt(index, efforts.length);

      var commit = function (raw) {
        dragging.current = false;
        var next = Number(raw);
        if (!isFinite(next)) next = 0;
        next = Math.max(0, Math.min(max, Math.round(next)));
        setValue(next);
        var target = efforts[next];
        if (target === undefined) return;
        if (next === committedIndex || pending) return;
        setPending(true);
        Promise.resolve(select({
          provider: reasoning.selection.provider,
          model: reasoning.selection.model,
          reasoningEffort: target.id,
        })).catch(function () { return false; }).then(function () { setPending(false); });
      };

      var ticks = [];
      for (var t = 0; t < efforts.length; t += 1) {
        ticks.push(h('i', {
          key: 'tick' + t,
          className: 'dsh-eb__tick',
          style: { left: 'calc(' + HALF + 'px + (100% - ' + THUMB + 'px) * ' + ratioAt(t, efforts.length) + ')' },
        }));
      }

      var railChildren = [h('div', { className: 'dsh-eb__line', key: 'line' })];
      if (interacting) {
        railChildren.push(h('output', {
          key: 'bubble',
          className: 'dsh-eb__bubble',
          style: { '--dsh-eb-ratio': ratio },
        }, current.name));
      }
      railChildren.push(h('div', { className: 'dsh-eb__ticks', key: 'ticks' }, ticks));
      railChildren.push(h('input', {
        key: 'range',
        className: 'dsh-eb__range',
        type: 'range',
        min: 0,
        max: max,
        step: 1,
        value: index,
        disabled: pending || state.status === 'selecting',
        'aria-label': '推理强度',
        'aria-valuetext': current.name,
        onPointerDown: function () { dragging.current = true; setInteracting(true); },
        onInput: function (event) {
          dragging.current = true;
          setValue(Number(event.currentTarget.value));
        },
        onPointerUp: function (event) { setInteracting(false); commit(event.currentTarget.value); },
        onPointerCancel: function () {
          setInteracting(false);
          dragging.current = false;
          setValue(committedIndex < 0 ? 0 : committedIndex);
        },
        onKeyUp: function (event) {
          setInteracting(false);
          if (event.key !== 'Escape') commit(event.currentTarget.value);
        },
        onBlur: function (event) {
          setInteracting(false);
          if (dragging.current) commit(event.currentTarget.value);
        },
        onKeyDown: function () { setInteracting(true); },
      }));

      return h('div', {
        className: 'dsh-eb',
        'data-plugin': PACKAGE_ID,
        title: current.name,
      }, [h('div', { className: 'dsh-eb__rail', key: 'rail' }, railChildren)]);
    }

    // 服务注入走模块级声明（与 dsh-liang-skin 一致），服务就绪后 apply 才会被调用
    var inject = ['slots', 'sessions', 'modelDirectories'];

    function apply(ctx) {
      try {
        if (typeof console !== 'undefined' && console.info) console.info('[dsh-effort-bar] apply');
      } catch (error) {
        /* ignore */
      }
      try {
        if (typeof document !== 'undefined') document.documentElement.dataset.dshEffortBar = 'apply';
      } catch (error) {
        /* ignore */
      }
      try {
        ensureStyle();
      } catch (error) {
        if (typeof console !== 'undefined' && console.warn) console.warn('[dsh-effort-bar] style failed', error);
      }
      try {
        ctx.slots.inject(SLOT, function () {
          return ctx.slots.register({
            name: SLOT,
            id: 'dsh-effort-bar.bar',
            order: 20,
            label: '推理强度',
            inject: function (sessionId) {
              var available = ctx.sessions.subagentAddress(sessionId) === undefined;
              var directory = ctx.modelDirectories.directoryFor(sessionId);
              return {
                directory: directory.store,
                load: function () {
                  if (!available) return;
                  void directory.load().catch(function () { return undefined; });
                },
                select: function (selection) {
                  if (!available) return Promise.resolve(false);
                  return directory.select(selection).then(function () { return true; }, function () { return false; });
                },
              };
            },
          }, EffortBar);
        });
        if (typeof console !== 'undefined' && console.info) {
          console.info('[dsh-effort-bar] registered on ' + SLOT);
        }
        if (typeof document !== 'undefined') document.documentElement.dataset.dshEffortBar = 'registered';
      } catch (error) {
        if (typeof console !== 'undefined' && console.error) console.error('[dsh-effort-bar] register failed', error);
      }
    }

    module.exports = { name: PACKAGE_ID, inject: inject, apply: apply };
    return module.exports;
  },
});
