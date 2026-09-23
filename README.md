# dsh-effort-bar

一根**常驻在输入框里、紧挨模型选择左侧**的推理强度滑条。

只做滑条 —— 没有皮肤、人像、背景、特效，也不替换官方的任何控件。

```
┌──────────────────────────────────────────────────────────┐
│  [档位刻度尺 ○———]     模型 ▾     ●●●○    ⏎             │
└──────────────────────────────────────────────────────────┘
        ↑ 本插件（conversation.input.right）
```

![输入条里的推理强度滑条](./docs/slider.png)

*DSH Web 输入条实拍：滑条就停在模型选择的左侧，一根线加刻度，选中的档位是「实心小球外套圆环」。*

## 特点

| | |
| --- | --- |
| **档位自适应** | 档位数量与原始 id 直接读当前模型公布的 `reasoning.efforts`。模型给四档，滑条就只有四个刻度；模型不支持推理、或只公布一个档位时，整块不渲染、不占位。 |
| **拖动只预览** | 按住拖动时滑条上方浮出磨砂小气泡，显示当前停留的档位名，此时**不提交任何东西**。 |
| **松手才提交** | 指针松开 / 键盘操作结束 / 控件失焦时，才通过官方 `ModelDirectory` 提交该档位，与 `/model` 弹窗、composer 模型座位共享同一份状态。 |
| **防连点** | 提交中的请求会把滑条置为禁用态；档位没变时不重复提交。 |
| **零依赖 · 零构建 · 零联网** | 只有 `react` 一个外部 require，`lib/client.js` 就是最终产物；不注册工具、不读凭据、不发任何网络请求。 |

## 安装

> 需要 DeepSeek Harness 的 **Web** 界面（本插件是客户端插件），Node.js ≥ 22。

### 方式一：从 GitHub 安装（推荐）

```sh
dsh plugin --profile web add 'github:Wh523945/dsh-effort-bar'
dsh web
```

### 方式二：从本地目录安装

把仓库放到一个**不含空格**的路径下（含空格会让 pnpm 把参数拆开，报 `Failed to resolve the latest version of …`）：

```sh
dsh plugin --profile web add 'D:\dsh-plugins\dsh-effort-bar'
dsh web
```

### 方式三：link 安装（改源码即生效，适合开发者）

```sh
dsh plugin --profile web add 'file:D:\dsh-plugins\dsh-effort-bar'
dsh web
```

首次安装后需要重启 `dsh web`。之后**只改 `lib/client.js` 不需要重启** —— 客户端 bundle 会随插件补丁热重载，保存后刷新页面或直接看界面即可。

## 使用

- 滑条就长在模型选择左侧，不用打开任何菜单。
- **拖动**看气泡选档位，**松手**生效。
- 键盘：`←` / `→` 移动，`Esc` 取消本次调整，`Tab` 离开焦点即提交。
- 想彻底隐藏它时，切到一个不公布多档推理强度的模型即可（滑条会自动消失）。

## 卸载

```sh
dsh plugin --profile web remove dsh-effort-bar
dsh web
```

## 工作原理

- **宿主侧**（`lib/index.js`）是空实现，只为让插件能作为 cordis 插件被加载；滑条的一切都在浏览器端。
- **浏览器侧**（`lib/client.js`）声明 `inject = ['slots', 'sessions', 'modelDirectories']`，然后：

  ```js
  ctx.slots.inject('conversation.input.right', () =>
    ctx.slots.register({
      name: 'conversation.input.right',   // list 槽：与官方控件并列，不会顶掉任何东西
      id: 'dsh-effort-bar.bar',
      order: 20,
      inject: (sessionId) => { /* 交给组件 directory / load / select */ }
    }, EffortBar)
  )
  ```

- `conversation.input.right` 在输入条 trailing 组里天然排在模型座位**左边**；这是个 `list` 槽，可以安全并列。**注意不要注册进 `conversation.input.model`** —— 那是 `single` 槽，会把官方模型选择器顶掉。
- 档位表是懒加载的：组件挂载后调用一次 `directory.load()`，否则 `groups` 为空、拿不到 `model.reasoning.efforts`，组件只能渲染 `null`（表现就是"界面里什么都没有"）。
- 提交走 `directory.select({ provider, model, reasoningEffort })`。
- 滑条本体是原生 `<input type="range">`，轨道透明、thumb 画成「实心小球外套圆环」，刻度与气泡的横向位置都按 `calc(5.5px + (100% - 11px) * ratio)` 对齐（两端各让出半个 thumb，`ratio = i / (n - 1)`），保证刻度和小球严格重合。

## 兼容性与已知限制

- 仅支持 **Web** 平台（`dsh.client.platform = "web"`），不适用于 CLI / Desktop 的其他形态。
- 与「替换输入区模型/强度控件」的插件功能重叠，**建议只装一个**：`dsh-client-liang-intensity-skin`（滑动变祖）、`dsh-reasoning-slider`、`dsh-reasoning-effort` 等。
- 档位名称由模型自己公布，插件不做翻译。
- 深色主题下的线条颜色取自 `--dsw-alias-label-secondary`；若某个主题没有这个变量，会回退到内置的 `#c8ced8`。

## 开发

没有构建步骤 —— `lib/client.js` 是手写的 CommonJS bundle，头尾必须保持 DSH 的 `__ModuleLoader__` 约定：

```js
window.__ModuleLoader__.load({
  id: 'dsh-effort-bar',
  factory: (require) => { var module = { exports: {} }; var exports = module.exports;
    // …你的代码…
    return module.exports;
  }
});
```

`require` 只允许出现宿主已提供的模块名（本插件仅用 `react`）；`dsh.client.inject` 里写**不带 `/client` 后缀的包名**，而 `require` 时用**包名 + `/client`**。

改动后用 `node --check lib/client.js` 自检语法即可。

## 许可

[MIT](./LICENSE)

## 致谢

bundle 的注册形态与构建约定参考了 [dsh-liang-skin](https://github.com/kingOfSoySauce/dsh-liang-skin)（滑动变祖）—— 本插件只取其中「滑条」这一件事。
