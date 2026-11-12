// Génère les images de couverture des produits dans vente/visuels/ (1280x720).
//   node outils/visuels.js
const { chromium } = require('playwright');
const path = require('path');
const cfg = require('../config.json');

const lignes = {
  'budget-mensuel-simple': [['Loyer', '650 €', '650 €', '0 €'], ['Courses', '300 €', '284 €', '+16 €'], ['Transport', '80 €', '80 €', '0 €'], ['Loisirs', '120 €', '141 €', '−21 €']],
  'budget-annuel-complet': [['Revenus', '1 800 €', '1 800 €', '1 950 €'], ['Dépenses', '1 016 €', '1 240 €', '1 180 €'], ['Solde', '+784 €', '+560 €', '+770 €'], ['Épargne', '10 %', '14 %', '18 %']],
  'objectifs-epargne': [['Fonds d’urgence', '3 000 €', '62 %', '95 €/mois'], ['Vacances d’été', '1 200 €', '40 %', '120 €/mois'], ['Ordinateur', '900 €', '75 %', '45 €/mois'], ['Apport', '8 000 €', '12 %', '290 €/mois']],
  'pack-complet': [['Budget annuel complet', '12 mois', '50/30/20', '✓'], ['Objectifs d’épargne', '8 objectifs', 'Progression', '✓'], ['Mode d’emploi', 'Inclus', 'En français', '✓'], ['Excel · Google Sheets', 'Compatible', 'Sans macro', '✓']],
};

const page = (p) => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1280px;height:720px;background:#fbfaf7;font-family:system-ui,sans-serif;color:#1c2421;display:flex;align-items:center;gap:56px;padding:0 72px}
.t{flex:1}.m{color:#1f7a5c;font-weight:800;font-size:26px;margin-bottom:28px}
h1{font-size:68px;line-height:1.05;letter-spacing:-.02em;margin-bottom:22px}
p{font-size:28px;color:#5b6661;line-height:1.35}
.px{display:inline-block;margin-top:34px;background:#1f7a5c;color:#fff;font-weight:800;font-size:30px;padding:12px 26px;border-radius:12px}
.f{width:520px;background:#fff;border:1px solid #e2e5e1;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(31,122,92,.16)}
.b{background:#1f7a5c;height:44px}
table{width:100%;border-collapse:collapse;font-size:21px}
td{padding:17px 16px;border-bottom:1px solid #e2e5e1;text-align:right;white-space:nowrap}
td:first-child{text-align:left;font-weight:700}
tr:nth-child(even){background:#e6f3ee}tr:last-child td{border-bottom:0}
</style><body><div class="t"><div class="m">${cfg.nom}</div><h1>${p.nom}</h1><p>${p.accroche}</p>
<div class="px">${p.prix ? p.prix + ' €' : 'Gratuit'} · Excel et Google Sheets</div></div>
<div class="f"><div class="b"></div><table>${lignes[p.id].map(l => '<tr>' + l.map(c => `<td>${c}</td>`).join('') + '</tr>').join('')}</table></div></body>`;

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  for (const p of cfg.produits) {
    await pg.setContent(page(p));
    await pg.screenshot({ path: path.join(__dirname, '..', 'vente', 'visuels', p.id + '.png') });
    console.log('écrit vente/visuels/' + p.id + '.png');
  }
  await b.close();
})();
