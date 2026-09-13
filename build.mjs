/**
 * build.mjs — 构建两种产物
 *  1) index.html       单文件自包含版本（双击即可打开，本地分享用）
 *  2) dist/            拆分版本（部署用：HTML + /assets/app.js，便于浏览器分别缓存）
 * 用法： node build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const SLOT = '<script>/*__BUNDLE__*/</script>';

const result = await build({
  entryPoints: [join(here, 'src/main.js')],
  bundle: true,
  write: false,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
  minify: true,
  legalComments: 'none',
  logLevel: 'info',
});
const js = result.outputFiles[0].text;
const tpl = readFileSync(join(here, 'index.template.html'), 'utf8');
if (!tpl.includes(SLOT)) throw new Error('模板里找不到注入槽：' + SLOT);

/* ---- 1) 单文件版（本地双击） ---- */
const single = tpl.replace(SLOT, () => '<script>' + js.replace(/<\/script/gi, '<\\/script') + '</script>');
assertHtml(single, 'index.html');
writeFileSync(join(here, 'index.html'), single, 'utf8');

/* ---- 2) 拆分版（部署） ---- */
const dist = join(here, 'dist');
mkdirSync(join(dist, 'assets'), { recursive: true });
const split = tpl.replace(SLOT, '<script src="/assets/app.js" defer></script>');
assertHtml(split, 'dist/index.html');
writeFileSync(join(dist, 'index.html'), split, 'utf8');
writeFileSync(join(dist, 'assets/app.js'), js, 'utf8');
writeFileSync(
  join(dist, '_headers'),
  ['/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '', '/index.html', '  Cache-Control: public, max-age=0, must-revalidate', ''].join('\n'),
  'utf8',
);
writeFileSync(join(dist, '.nojekyll'), '', 'utf8');

/** 产物自检：必须含成对的 <script> 标签，否则页面会静默不执行 */
function assertHtml(s, name) {
  const open = (s.match(/<script\b/g) || []).length;
  const close = (s.match(/<\/script>/g) || []).length;
  if (open === 0 || open !== close) {
    throw new Error(`[${name}] script 标签不配对（open=${open} close=${close}），构建中止`);
  }
}

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('index.html      ' + kb(Buffer.byteLength(readFileSync(join(here, 'index.html')), 'utf8')) + '  (单文件)');
console.log('dist/           index.html + assets/app.js ' + kb(Buffer.byteLength(js)) + '  (拆分)');
