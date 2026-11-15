// Fabrique les miniatures YouTube (1280 × 720) dans miniatures/ à partir de videos.json.
//   node outils/miniatures.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const R = path.join(__dirname, '..'); const V = JSON.parse(fs.readFileSync(path.join(R, 'videos.json'), 'utf8'));
const tete = fs.readFileSync(path.join(R, 'marque', 'berthier-tete-fixe.svg')).toString('base64');
const TEINTES = ['#4f8cff', '#3ecf8e', '#ffc531', '#ff6b6b', '#c9a7ff'];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const page = (v) => { const c = TEINTES[(v.n - 1) % TEINTES.length]; return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1280px;height:720px;background:#08090a;color:#f7f8f8;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;overflow:hidden;position:relative}
.fond{position:absolute;inset:0;background:radial-gradient(70% 90% at 82% 70%,${c}33,transparent 70%),repeating-linear-gradient(90deg,transparent 0 78px,rgba(255,255,255,.03) 78px 80px)}
.t{position:relative;padding-left:72px;width:800px}
.l{font-weight:900;font-size:128px;line-height:.98;letter-spacing:-.04em;white-space:nowrap}
.l.b{color:${c}}
.s{margin-top:26px;font-weight:700;font-size:44px;color:#c9ccd3;letter-spacing:-.01em}
.n{position:absolute;top:44px;left:72px;font:700 26px ui-monospace,monospace;letter-spacing:.2em;color:#8d929b}
img{position:absolute;right:40px;bottom:-30px;width:470px;image-rendering:pixelated}
.sol{position:absolute;left:0;right:0;bottom:0;height:18px;background:${c}}
</style><body><div class="fond"></div><div class="n">LE LABO BERTHIER · ${String(v.n).padStart(2, '0')}</div>
<div class="t"><div class="l">${esc(v.miniature[0])}</div><div class="l b">${esc(v.miniature[1])}</div><div class="s">${esc(v.sous)}</div></div>
<img src="data:image/svg+xml;base64,${tete}"><div class="sol"></div>
<script>for(const l of document.querySelectorAll('.l')){let t=128;while(l.scrollWidth>740&&t>60){t-=4;l.style.fontSize=t+'px'}}document.body.dataset.pret=1</script></body>`; };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const v of V) { await p.setContent(page(v)); await p.waitForSelector('body[data-pret]'); const f = `miniatures/${String(v.n).padStart(2, '0')}-${v.slug}.png`; await p.screenshot({ path: path.join(R, f) }); console.log('écrit', f); }
  await b.close(); })();
