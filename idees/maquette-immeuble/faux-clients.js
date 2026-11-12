// Faux clients : dix profils simulés, chacun parcourt tous les étages sur son écran.
//   node faux-clients.js [dossier-des-captures]
// Ce sont des gestes joués dans un vrai navigateur, pas de vraies personnes.
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'), os = require('os');
const dir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'faux-clients-')), tour = process.argv[3] || 't';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8') + '</body></html>';
fs.writeFileSync(dir + '/imm.html', html); const url = 'file://' + dir + '/imm.html';
const P = [
  { nom: 'Sylvie, bijoux, téléphone moyen', w: 390, h: 780, m: 1 },
  { nom: 'Théo, illustrateur, grand téléphone', w: 430, h: 932, m: 1 },
  { nom: 'Jeanne, confitures, petit téléphone, texte 130 %', w: 360, h: 640, m: 1, zoom: 130 },
  { nom: 'Lucas, vieux téléphone étroit', w: 320, h: 568, m: 1 },
  { nom: 'Karim, savons, téléphone en paysage', w: 780, h: 360, m: 1 },
  { nom: 'Monique, tablette en portrait', w: 768, h: 1024, m: 1 },
  { nom: 'Nadia, céramique, portable 13 pouces', w: 1366, h: 700 },
  { nom: 'Paul, grand écran', w: 1920, h: 1080 },
  { nom: 'Inès, animations réduites', w: 390, h: 780, m: 1, calme: 1 },
  { nom: 'Bernard, texte 150 % sur tablette paysage', w: 1024, h: 600, m: 1, zoom: 150 },
];
const verifier = () => {
  const n = document.querySelector('.niveau.ici'), cage = document.querySelector('.cage').getBoundingClientRect(), pb = [];
  const R = (e) => e.getBoundingClientRect();
  const dans = (r, c) => r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.left >= c.left - 1 && r.right <= c.right + 1;
  const croise = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const nom = n.querySelector('.nom').textContent;
  if (document.documentElement.scrollWidth > innerWidth + 1) pb.push('la page déborde en largeur');
  { const en = document.querySelector('.enseigne'); if (en.getBoundingClientRect().height > parseFloat(getComputedStyle(en).fontSize) * 2) pb.push('enseigne sur deux lignes'); }
  if (document.documentElement.scrollHeight > innerHeight + 1) pb.push('la page déborde en hauteur');
  const btn = n.querySelector('.btn'); if (!dans(R(btn), cage)) pb.push('bouton principal hors écran');
  const pan = document.querySelector('.panneau'); if (pan.scrollHeight > pan.clientHeight + 1 || pan.scrollWidth > pan.clientWidth + 1) pb.push('panneau d\'ascenseur trop grand');
  for (const b of pan.querySelectorAll('button')) { if (getComputedStyle(b).display === 'none') continue; const r = R(b); if (r.width < 43.5 || r.height < 43.5) { pb.push('bouton d\'ascenseur trop petit ' + Math.round(r.width) + 'x' + Math.round(r.height)); break; } if (r.bottom > innerHeight + 1 || r.right > innerWidth + 1) { pb.push('bouton d\'ascenseur hors écran'); break; } }
  const sc = R(n.querySelector('.scene')), pe = R(n.querySelector('.perso'));
  if (pe.height < 90) pb.push('personnage minuscule (' + Math.round(pe.height) + ' px)');
  if (pe.top < sc.top - 1) pb.push('personnage coupé en haut');
  for (const m of n.querySelectorAll('.meuble')) { const r = R(m); const part = croise(r, pe) / (pe.width * pe.height); if (part > .22) pb.push('meuble cache ' + Math.round(part * 100) + ' % du personnage'); if (r.top < sc.top - 1) pb.push('meuble coupé en haut'); if (r.height < 40) pb.push('meuble minuscule'); }
  const om = R(n.querySelector('.objet-mur')); if (croise(om, pe) / (om.width * om.height) > .3) pb.push('objet du mur derrière la tête'); if (om.bottom > sc.bottom || om.width < 24) pb.push('objet du mur mal placé');
  const fi = n.querySelector('.fiche'); { const pi = n.querySelector('.pied'), cs = getComputedStyle(fi); const utile = fi.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (R(pi).width < utile - 2) pb.push('le texte dépasse autour du bouton fixe'); } if (fi.scrollHeight - fi.clientHeight > 2 && getComputedStyle(fi).overflowY === 'visible') pb.push('texte coupé sans défilement');
  if (sc.height < 110) pb.push('scène écrasée (' + Math.round(sc.height) + ' px)');
  const t = n.querySelector('.texte'); if (R(t).width < 180) pb.push('colonne de texte trop étroite');
  for (const e of n.querySelectorAll('.fiche *')) if (e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12.5) { pb.push('texte trop petit : ' + e.textContent.trim().slice(0, 16)); break; }
  return { nom, pb };
};
(async () => {
  const b = await chromium.launch(); const bilan = []; let total = 0;
  for (const [i, c] of P.entries()) {
    const p = await b.newPage({ viewport: { width: c.w, height: c.h }, hasTouch: !!c.m, isMobile: !!c.m, reducedMotion: c.calme ? 'reduce' : 'no-preference' });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 90)));
    await p.goto(url); if (c.zoom) await p.addStyleTag({ content: `html{font-size:${c.zoom}%}` }); await p.waitForTimeout(900);
    const pbs = [];
    for (let k = 4; k >= 0; k--) {
      if (k < 4) { await p.evaluate((k) => document.querySelector(`.panneau [data-aller="${k}"]`).click(), k); await p.waitForTimeout(c.calme ? 250 : 1900); }
      const r = await p.evaluate(verifier); r.pb.forEach((x) => pbs.push(`${r.nom} : ${x}`));
      if (k === 3) await p.screenshot({ path: `${dir}/${tour}-${i}.png` });
    }
    // Impatient : trois appuis rapides sur ▼ depuis le 4e, doit descendre de trois étages.
    for (let j = 0; j < 3; j++) { await p.evaluate(() => document.querySelector('.fleche.bas').click()); await p.waitForTimeout(120); }
    await p.waitForTimeout(c.calme ? 400 : 3600);
    const apres = await p.evaluate(() => document.querySelector('.niveau.ici .nom').textContent);
    if (apres !== 'Kovac') pbs.push(`3 appuis rapides sur ▼ depuis le 4e : arrive chez ${apres} au lieu de Kovac`);
    { await p.evaluate(() => document.querySelector('.panneau [data-aller="4"]').click()); await p.waitForTimeout(c.calme ? 300 : 2600);
      const ind = await p.evaluate(() => { dispatchEvent(new WheelEvent('wheel', { deltaY: 200 })); const i = document.getElementById('indice'), r = i.getBoundingClientRect(); const f = document.querySelector('.fleche.haut');
        return { vu: !i.hidden, texte: i.textContent, coupe: i.scrollWidth > i.clientWidth + 1, hors: r.left < 0 || r.right > innerWidth, fleche: getComputedStyle(f).display !== 'none' }; });
      if (!ind.vu) pbs.push('aucune aide quand on bute au rez-de-chaussée'); if (ind.coupe || ind.hors) pbs.push("message d'aide coupé : " + ind.texte); if (/▲/.test(ind.texte) && !ind.fleche) pbs.push('le message cite une flèche absente'); }
    // Questions que se posent les faux clients en lisant : c'est gratuit ? c'est un vrai avocat ? comment on me prévient ? quel étage est ouvert ?
    if (i === 0 || i === 6) {
      const lire = async (k) => { await p.evaluate((k) => document.querySelector(`.panneau [data-aller="${k}"]`).click(), k); await p.waitForTimeout(c.calme ? 300 : 2600); return p.evaluate(() => document.querySelector('.niveau.ici .fiche').innerText); };
      const rdc = await lire(4); if (!/gratuit/i.test(rdc)) pbs.push('Sylvie : « C\u2019est gratuit ? » — rien ne le dit au rez-de-chaussée');
      if (!/applis?\b/i.test(rdc)) pbs.push('Marc : « Ce sont de vraies personnes ? » — rien ne dit que ce sont des applis');
      const jur = await lire(2); if (!/ne remplace pas/i.test(jur)) pbs.push('Marc : « C\u2019est une vraie avocate ? » — aucune mise en garde chez la juriste');
      const site = await lire(3); if (!/date/i.test(site)) pbs.push('Karim : « Bientôt, c\u2019est quand ? » — aucune indication');
      await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(300);
      const apresVote = await p.evaluate(() => document.querySelector('.niveau.ici .fiche').innerText); if (!/e-mail/i.test(apresVote)) pbs.push('Jeanne : « Me prévenir, mais comment ? » — rien ne l\u2019explique');
      await p.evaluate(() => { const n = document.querySelector('.niveau.ici'); n.querySelector('.inscription').hidden = true; n.querySelector('button[data-id]').hidden = false; });
      const pan = await p.evaluate(() => ({ ouvert: !!document.querySelector('.panneau button.ouvert'), titres: [...document.querySelectorAll('.panneau [data-aller]')].every((b) => b.title) }));
      if (!pan.ouvert) pbs.push('Nadia : « Quel étage est ouvert ? » — l\u2019ascenseur ne le montre pas'); if (!pan.titres) pbs.push('Nadia : « Qui est à quel étage ? » — les boutons n\u2019ont que des numéros');
    }
    // Théo : au départ, un bouton visible et assez grand pour monter, sans connaître le geste.
    { await p.evaluate(() => document.querySelector('.panneau [data-aller="4"]').click()); await p.waitForTimeout(c.calme ? 300 : 2600);
      const m = await p.evaluate(() => { const b = document.getElementById('monter'); if (!b) return null; const r = b.getBoundingClientRect(), sc = b.closest('.scene').getBoundingClientRect(), pe = b.closest('.scene').querySelector('.perso').getBoundingClientRect();
        return { h: r.height, dans: r.left >= sc.left && r.right <= sc.right && r.top >= sc.top, surTete: r.bottom > pe.top + 2 && r.top < pe.top + pe.height * .4 && r.right > pe.left + 2 && r.left < pe.right - 2 }; });
      if (!m) pbs.push('Théo : aucun bouton visible pour monter au départ'); else { if (m.h < 43.5) pbs.push('bouton Monter trop petit'); if (!m.dans) pbs.push('bouton Monter coupé'); if (m.surTete) pbs.push('bouton Monter posé sur le visage de Berthier'); }
      if (m) { await p.evaluate(() => document.getElementById('monter').click()); await p.waitForTimeout(c.calme ? 300 : 1900); const ou = await p.evaluate(() => document.querySelector('.niveau.ici .nom').textContent); if (ou !== 'Kovac') pbs.push('le bouton Monter n\u2019amène pas au 1er : ' + ou); } }
    // Jeanne : s'inscrire avec un e-mail, y compris en se trompant d'abord.
    { await p.evaluate(() => document.querySelector('.panneau [data-aller="3"]').click()); await p.waitForTimeout(c.calme ? 300 : 1900);
      await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(250);
      const f = await p.evaluate(() => { const f = document.querySelector('.niveau.ici .inscription'), cage = document.querySelector('.cage').getBoundingClientRect(), r = f.getBoundingClientRect(), i = f.querySelector('input').getBoundingClientRect(), v = f.querySelector('button').getBoundingClientRect();
        return { vu: !f.hidden, dans: r.top >= cage.top - 1 && r.bottom <= cage.bottom + 1, champ: i.width, hChamp: i.height, hBtn: v.height, focus: document.activeElement === f.querySelector('input') }; });
      if (!f.vu) pbs.push('Jeanne : aucun champ e-mail après « Préviens-moi »'); else { if (!f.dans) pbs.push('formulaire e-mail hors écran'); if (f.champ < 150) pbs.push('champ e-mail trop étroit (' + Math.round(f.champ) + ' px)'); if (f.hChamp < 43.5 || f.hBtn < 43.5) pbs.push('champ ou bouton Valider trop petit'); if (!f.focus) pbs.push('le champ e-mail n\u2019est pas prêt à écrire'); }
      await p.fill('.niveau.ici .inscription input', 'jeanne@'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
      const e1 = await p.evaluate(() => ({ err: document.querySelector('.niveau.ici .erreur').textContent, nom: document.querySelector('.niveau.ici .nom').textContent, note: document.querySelector('.niveau.ici').classList.contains('note') }));
      if (!e1.err) pbs.push('adresse incomplète acceptée sans message'); if (e1.note) pbs.push('inscrite malgré une adresse incomplète'); if (e1.nom !== 'Kovac') pbs.push('une flèche du clavier dans le champ change d\u2019étage');
      await p.fill('.niveau.ici .inscription input', 'jeanne@exemple.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
      const e2 = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), cage = document.querySelector('.cage').getBoundingClientRect(), b = n.querySelector('button[data-id]').getBoundingClientRect(); return { note: n.classList.contains('note'), txt: n.querySelector('.vote-ligne').textContent, btn: n.querySelector('button[data-id]').textContent, visible: b.bottom <= cage.bottom + 1 && b.height > 0 }; });
      if (!e2.note || !/jeanne@exemple\.fr/.test(e2.txt)) pbs.push('inscription non confirmée avec l\u2019adresse'); if (!e2.visible) pbs.push('bouton « C\u2019est noté » hors écran');
      await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(150);
      if (await p.evaluate(() => document.querySelector('.niveau.ici').classList.contains('note'))) pbs.push('impossible d\u2019annuler son inscription'); }
    // Menu : s'ouvre, tient dans l'écran, se ferme, ramène au bon étage.
    await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(350);
    const menu = await p.evaluate(() => { const f = document.querySelector('.menu-feuille'), r = f.getBoundingClientRect(); const l = [...document.querySelectorAll('#menu-liste button')].map((x) => x.getBoundingClientRect());
      return { large: r.right > innerWidth + 1 || r.left < -1, defile: f.scrollHeight > f.clientHeight + 1 && getComputedStyle(f).overflowY !== 'auto', lignes: l.length, petite: l.some((x) => x.height < 44), fermer: document.querySelector('.menu-feuille [data-fermer]').getBoundingClientRect().top >= 0 }; });
    if (menu.large) pbs.push('menu plus large que l\'écran'); if (menu.defile) pbs.push('menu coupé'); if (menu.petite) pbs.push('lignes du menu trop petites'); if (!menu.fermer) pbs.push('bouton Fermer hors écran'); if (menu.lignes !== 5) pbs.push('menu incomplet');
    if (i === 3 || i === 4) await p.screenshot({ path: `${dir}/${tour}-${i}-menu.png` });
    await p.evaluate(() => document.querySelector('#menu-liste button[data-aller="4"]').click()); await p.waitForTimeout(c.calme ? 300 : 2400);
    const fin = await p.evaluate(() => [document.querySelector('.niveau.ici .nom').textContent, document.getElementById('menu').hidden]);
    if (fin[0] !== 'Berthier' || !fin[1]) pbs.push('le menu ne ramène pas au rez-de-chaussée : ' + fin);
    errs.forEach((e) => pbs.push('erreur script : ' + e));
    const uniques = [...new Set(pbs)]; total += uniques.length; bilan.push(`${uniques.length ? '✗' : '✓'} ${c.nom} (${c.w}×${c.h})` + uniques.map((x) => '\n     - ' + x).join(''));
    await p.close();
  }
  console.log(bilan.join('\n')); console.log(`\nTOTAL : ${total} problème(s)`); await b.close();
})();
