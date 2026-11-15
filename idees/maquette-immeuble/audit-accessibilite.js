// Audit indépendant : règles d'accessibilité d'axe-core (jeu de règles public de Deque), sur de vrais profils d'appareils.
//   npm install axe-core   (une fois, dans ce dossier)
//   node audit-accessibilite.js
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const axe = fs.readFileSync(path.join(__dirname, 'node_modules/axe-core/axe.min.js'), 'utf8');
const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8') + '</body></html>';
const tmp = path.join(require('os').tmpdir(), 'immeuble-audit.html'); fs.writeFileSync(tmp, html); const url = 'file://' + tmp;
const profils = ['iPhone SE', 'iPhone 13', 'iPhone 14 Pro Max', 'Pixel 7', 'Galaxy S9+', 'iPad Mini', 'iPad Pro 11 landscape', 'Desktop Chrome'];
(async () => {
  const b = await chromium.launch(); const vus = new Map(); let etats = 0;
  for (const nom of profils) { const ctx = await b.newContext({ ...devices[nom], locale: 'fr-FR' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 80)));
    await p.goto(url); await p.waitForTimeout(1000); await p.addScriptTag({ content: axe });
    const passer = async (etat) => { etats++; const r = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, aide: v.help, n: v.nodes.length, ex: v.nodes[0].target.join(' ').slice(0, 70) })); });
      for (const v of r) { const k = v.id; if (!vus.has(k)) vus.set(k, { ...v, ou: new Set() }); vus.get(k).ou.add(nom + ' / ' + etat); } };
    await passer('rez-de-chaussée');
    for (const [k, e] of [[3, 'informaticien'], [2, 'juriste'], [1, 'commercial'], [0, 'organisatrice']]) { await p.evaluate((k) => document.querySelector(`.panneau [data-aller="${k}"]`).click(), k); await p.waitForTimeout(2300); await passer(e);
      if (k === 3) { await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(250); await passer('formulaire ouvert'); await p.fill('.niveau.ici .inscription input', 'x'); await p.keyboard.press('Enter'); await p.waitForTimeout(200); await passer('formulaire en erreur');
        await p.fill('.niveau.ici .inscription input', 'a@b.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await passer('inscrit'); } }
    await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(300); await passer('menu ouvert'); await p.keyboard.press('Escape');
    await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: -300 }))); await p.waitForTimeout(400); await passer('message d\'aide affiché');
    const base = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), c = document.querySelector('.cage').getBoundingClientRect(), pi = n.querySelector('.pied').getBoundingClientRect(); return { large: document.documentElement.scrollWidth > innerWidth + 1, btn: getComputedStyle(n.querySelector('.pied')).position !== 'sticky' || (pi.bottom <= c.bottom + 1 && pi.top >= c.top - 1), cale: Math.abs(n.getBoundingClientRect().top - c.top) < 2 }; });
    console.log(`${nom.padEnd(24)} ${devices[nom].viewport.width}×${devices[nom].viewport.height} @${devices[nom].deviceScaleFactor}x  ` + (base.large ? 'DÉBORDE ' : '') + (!base.btn ? 'BOUTON-HORS-ÉCRAN ' : '') + (!base.cale ? 'ÉTAGE-DÉCALÉ ' : '') + (errs.length ? 'ERREURS:' + errs.join('|') : '') + (!base.large && base.btn && base.cale && !errs.length ? 'mise en page correcte' : ''));
    await ctx.close(); }
  console.log(`\n${etats} états audités. Règles d'accessibilité enfreintes : ${vus.size}`);
  for (const v of vus.values()) console.log(`- [${v.impact}] ${v.id} : ${v.aide} (${v.n} élément(s), ex. ${v.ex}) — vu dans ${v.ou.size} état(s), dont ${[...v.ou][0]}`);
  await b.close();
})();
