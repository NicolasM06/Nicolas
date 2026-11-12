// Génère une épingle Pinterest (1000x1500) par article dans images/epingles/.
//   node outils/epingles.js
// À relancer après avoir ajouté des articles, puis committer les images.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cfg = require('../config.json');

const dossier = path.join(__dirname, '..', 'contenu', 'articles');
const sortie = path.join(__dirname, '..', 'images', 'epingles');
fs.mkdirSync(sortie, { recursive: true });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const page = (titre, accroche) => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1000px;height:1500px;background:#1f7a5c;font-family:system-ui,sans-serif;padding:60px;display:flex}
.c{background:#fbfaf7;border-radius:36px;flex:1;padding:80px 70px;display:flex;flex-direction:column;color:#1c2421}
.m{color:#1f7a5c;font-weight:800;font-size:38px}
h1{font-size:92px;line-height:1.06;letter-spacing:-.02em;margin-top:auto;text-wrap:balance}
p{font-size:40px;line-height:1.4;color:#5b6661;margin:44px 0 auto}
.b{align-self:flex-start;background:#1f7a5c;color:#fff;font-weight:800;font-size:38px;padding:22px 40px;border-radius:18px}
</style><body><div class="c"><div class="m">${esc(cfg.nom)}</div><h1>${esc(titre)}</h1><p>${esc(accroche)}</p>
<div class="b">Modèle de budget gratuit →</div></div></body>`;

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1000, height: 1500 }, deviceScaleFactor: 1 });
  for (const f of fs.readdirSync(dossier).filter((x) => x.endsWith('.md'))) {
    const cible = path.join(sortie, f.replace('.md', '.png'));
    if (fs.existsSync(cible)) continue;
    const entete = fs.readFileSync(path.join(dossier, f), 'utf8').split('---')[1];
    const meta = Object.fromEntries(entete.trim().split('\n').map((l) => [l.split(':')[0].trim(), l.slice(l.indexOf(':') + 1).trim()]));
    await pg.setContent(page(meta.titre, meta.accroche || meta.description));
    await pg.screenshot({ path: cible });
    console.log('écrit images/epingles/' + path.basename(cible));
  }
  await b.close();
})();
