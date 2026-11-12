// Génère les designs d'impression à la demande, leurs fiches et le kit de pub.
//
//   node impression/generer.js            tout générer
//   node impression/generer.js gamer      une seule collection (ou un seul métier)
//
// Sortie dans impression/sortie/ :
//   designs/   PNG transparents 4500x5400 (-clair = encre claire pour vêtement foncé,
//              -fonce = encre foncée pour vêtement clair)
//   pub/       épingles Pinterest 1000x1500
//   fiches.csv, fiches.md, pub.md
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ICI = __dirname;
const D = JSON.parse(fs.readFileSync(path.join(ICI, 'donnees.json'), 'utf8'));
const SORTIE = path.join(ICI, 'sortie');
const filtre = process.argv[2];

const police = (f) => fs.readFileSync(path.join(ICI, 'polices', f)).toString('base64');
const FONTS = `
@font-face{font-family:Anton;src:url(data:font/ttf;base64,${police('Anton-Regular.ttf')})}
@font-face{font-family:Bebas;src:url(data:font/ttf;base64,${police('BebasNeue-Regular.ttf')})}
@font-face{font-family:Archivo;src:url(data:font/ttf;base64,${police('ArchivoBlack-Regular.ttf')})}`;

const ENCRES = {
  clair: { encre: '#ffffff', accent: '#ffc531' },
  fonce: { encre: '#1a1a1a', accent: '#d9480f' },
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Coupe un texte long en deux lignes équilibrées.
function deuxLignes(t, seuil = 15) {
  if (t.length <= seuil || !t.includes(' ')) return [t];
  const mots = t.split(' ');
  let mieux = null;
  for (let i = 1; i < mots.length; i++) {
    const a = mots.slice(0, i).join(' ');
    const b = mots.slice(i).join(' ');
    const ecart = Math.abs(a.length - b.length);
    if (!mieux || ecart < mieux.ecart) mieux = { ecart, lignes: [a, b] };
  }
  return mieux.lignes;
}

// Chaque .fit est agrandi jusqu'à occuper data-l (part de la largeur), plafonné à data-max px.
function corps(m, d) {
  const fit = (txt, cls, l, max) =>
    `<div class="fit ${cls}" data-l="${l}" data-max="${max}">${esc(txt)}</div>`;
  if (d.type === 'empile') {
    return fit(d.haut, 'bebas', 0.72, 520)
      + '<div class="trait"></div>'
      + deuxLignes(d.gros).map((l) => fit(l, 'anton accent', 1, 1500)).join('')
      + '<div class="trait"></div>'
      + deuxLignes(d.bas, 26).map((l) => fit(l, 'bebas', 0.72, 520)).join('');
  }
  if (d.type === 'liste') {
    return d.lignes.map((l, i) =>
      fit(l, 'anton' + (i === d.lignes.length - 1 ? ' accent' : ''), 1, 1250)).join('');
  }
  return fit(d.mot || m.nom, 'archivo accent', 1, 900)
    + `<div class="genre">${esc(d.genre || m.genre)}</div>`
    + `<div class="def">${esc(d.texte)}</div>`;
}

function pageDesign(m, d, ton) {
  const c = { ...ENCRES[ton], ...(m.accent ? { accent: m.accent[ton] } : {}) };
  return `<!doctype html><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0}
html,body{width:4500px;height:5400px;background:transparent}
body{display:flex;align-items:center;justify-content:center;color:${c.encre}}
#z{width:4200px;display:flex;flex-direction:column;align-items:center;transform-origin:center}
.fit{white-space:nowrap;line-height:1.02;text-transform:uppercase;font-size:100px}
.anton{font-family:Anton;letter-spacing:.01em;line-height:1.16}
.bebas{font-family:Bebas;letter-spacing:.06em;line-height:1.15}
.archivo{font-family:Archivo;align-self:flex-start}
.accent{color:${c.accent}}
.trait{width:72%;height:28px;background:${c.encre};margin:90px 0;border-radius:14px}
.genre{align-self:flex-start;font:italic 280px 'Liberation Serif',serif;margin:50px 0 110px;opacity:.85}
.def{align-self:flex-start;font:430px/1.24 'Liberation Serif',serif;text-wrap:pretty}
</style><body><div id="z">${corps(m, d)}</div><script>
document.fonts.ready.then(() => {
  const z = document.getElementById('z');
  for (const el of z.querySelectorAll('.fit')) {
    el.style.display = 'inline-block';
    const cible = z.clientWidth * parseFloat(el.dataset.l);
    const taille = Math.min(parseFloat(el.dataset.max), 100 * cible / el.getBoundingClientRect().width);
    el.style.fontSize = taille + 'px';
  }
  const h = z.getBoundingClientRect().height;
  if (h > 5100) z.style.transform = 'scale(' + 5100 / h + ')';
  document.body.dataset.pret = '1';
});
</script></body>`;
}

const TEE = 'M300 60 L400 20 Q500 110 600 20 L700 60 L900 190 L800 370 L710 320 L710 840 L290 840 L290 320 L200 370 L100 190 Z';

function pagePub(m, image, ton) {
  const tissu = ton === 'clair' ? '#20242b' : '#f3efe6';
  return `<!doctype html><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0}
body{width:1000px;height:1500px;background:#efe7d8;font-family:Bebas;color:#1a1a1a;display:flex;flex-direction:column;align-items:center;padding:70px 60px}
h1{font-family:Anton;font-size:96px;line-height:1.02;text-transform:uppercase;text-align:center;font-weight:400}
h1 span{color:#d9480f}
.t{position:relative;width:900px;height:800px;margin:60px 0 50px}
.t svg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 24px 30px rgba(0,0,0,.22))}
.t img{position:absolute;left:50%;top:215px;width:330px;transform:translateX(-50%)}
p{font-size:54px;letter-spacing:.05em}
.b{margin-top:auto;font-size:44px;letter-spacing:.08em;opacity:.7}
</style><body>
<h1>${esc(m.pub[0])}<br><span>${esc(m.pub[1])}</span></h1>
<div class="t"><svg viewBox="0 0 1000 870"><path d="${TEE}" fill="${tissu}"/></svg><img src="data:image/png;base64,${image}"></div>
<p>T-shirts · mugs · stickers</p>
<div class="b">${esc(D.boutique)}</div></body>`;
}

// Métiers et collections ramenés à une même forme de groupe.
const GROUPES = [
  ...D.metiers.map((m) => {
    const cible = m.nom.toLowerCase();
    return {
      ...m,
      titre: `Humour ${cible}`,
      pub: ['Le cadeau pour', m.nom],
      description: `Un design original en français pour les ${cible}s qui aiment leur métier et savent en rire. `
        + 'Une idée cadeau pour un anniversaire, Noël, un départ ou une fin de chantier.',
      texte_pub: `Tu connais quelqu'un qui fait ce métier ? Ce design est fait pour ça.`,
      tags: [cible, `cadeau ${cible}`, `humour ${cible}`, `${cible} drôle`, ...D.familles[m.famille]],
    };
  }),
  ...D.collections,
];

function fiche(m, d, n) {
  const mot = d.mot || m.nom;
  const accroche = d.type === 'definition' ? `Définition : ${mot.toLowerCase()}`
    : d.type === 'liste' ? d.lignes.join(' ') : d.gros;
  const texte = d.type === 'definition' ? `« ${mot} (${d.genre || m.genre}) : ${d.texte} »`
    : d.type === 'liste' ? `« ${d.lignes.join(' ')} »` : `« ${d.haut}. ${d.gros}. ${d.bas}. »`;
  return {
    id: `${m.slug}-${String(n).padStart(2, '0')}`,
    accroche,
    titre: `${accroche} – ${m.titre}`.slice(0, 100),
    description: `${texte} ${m.description}`,
    tags: [...m.tags, ...D.mots_cles_communs].slice(0, 15),
    groupe: m,
  };
}

(async () => {
  for (const d of ['designs', 'pub']) fs.mkdirSync(path.join(SORTIE, d), { recursive: true });
  const nav = await chromium.launch();
  const grand = await nav.newPage({ viewport: { width: 4500, height: 5400 }, deviceScaleFactor: 1 });
  const petit = await nav.newPage({ viewport: { width: 1000, height: 1500 }, deviceScaleFactor: 1 });
  const fiches = [];

  for (const m of GROUPES) {
    if (filtre && m.slug !== filtre) continue;
    for (const [i, d] of m.designs.entries()) {
      const f = fiche(m, d, i + 1);
      fiches.push(f);
      const images = {};
      for (const ton of Object.keys(ENCRES)) {
        await grand.setContent(pageDesign(m, d, ton));
        await grand.waitForSelector('body[data-pret]');
        const png = await grand.screenshot({ omitBackground: true });
        fs.writeFileSync(path.join(SORTIE, 'designs', `${f.id}-${ton}.png`), png);
        images[ton] = png.toString('base64');
      }
      // Une épingle par design, en alternant vêtement foncé et clair.
      const ton = i % 2 ? 'fonce' : 'clair';
      await petit.setContent(pagePub(m, images[ton], ton));
      await petit.waitForLoadState('load');
      await petit.screenshot({ path: path.join(SORTIE, 'pub', `${f.id}.png`) });
      console.log('écrit', f.id);
    }
  }
  await nav.close();
  if (filtre) return;

  const csv = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  fs.writeFileSync(path.join(SORTIE, 'fiches.csv'),
    '﻿' + ['fichier;collection;titre;description;mots_cles',
      ...fiches.map((f) => [f.id, f.groupe.titre, f.titre, f.description, f.tags.join(', ')].map(csv).join(';'))].join('\n'));

  fs.writeFileSync(path.join(SORTIE, 'fiches.md'),
    '# Fiches à copier-coller\n\nPour chaque design : déposer le fichier `-clair` sur les vêtements foncés '
    + 'et `-fonce` sur les vêtements clairs.\n\n'
    + fiches.map((f) => `## ${f.id}\n\n**Titre** : ${f.titre}\n\n**Description** : ${f.description}\n\n**Mots-clés** : ${f.tags.join(', ')}\n`).join('\n'));

  const lien = D.lien_boutique || 'LIEN-DE-TA-BOUTIQUE';
  fs.writeFileSync(path.join(SORTIE, 'pub.md'),
    '# Publications prêtes à poster\n\nUne image par design dans `pub/`. Titre et texte à coller sur Pinterest, '
    + 'Instagram ou Facebook.\n\n'
    + fiches.map((f) => `## ${f.id}\n\n**Image** : pub/${f.id}.png\n\n**Titre** : ${f.accroche} – ${f.groupe.titre}\n\n`
      + `**Texte** : ${f.groupe.texte_pub} Disponible en t-shirt, mug et sticker. ${lien}\n\n`
      + `**Hashtags** : ${f.tags.slice(0, 6).map((t) => '#' + t.replace(/[^\p{L}\p{N}]/gu, '')).join(' ')}\n`).join('\n'));
  console.log(`${fiches.length} designs, ${fiches.length * 2} fichiers PNG, ${fiches.length} épingles.`);
})();
