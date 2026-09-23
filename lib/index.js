/**
 * dsh-effort-bar / host entry
 *
 * 本插件的全部功能都在浏览器端（lib/client.js）：读取当前模型公布的
 * reasoning.efforts，渲染一根常驻滑条并提交档位。宿主侧不需要任何服务，
 * 因此这里只保留一个空的 apply，让插件能作为 cordis 插件被加载。
 */

const name = 'dsh-effort-bar';

function apply() {}

export { apply, name };
