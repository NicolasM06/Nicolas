// Faux clients, parcours d'usage : chaque scénario rejoue ce qu'une personne précise ferait.
//   node parcours.js
// Complète faux-clients.js (qui vérifie l'affichage sur dix écrans).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const dir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'parcours-'));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8') + '</body></html>';
fs.writeFileSync(dir + '/imm.html', html); const url = 'file://' + dir + '/imm.html';
const S = []; const scenario = (nom, opts, f) => S.push([nom, opts, f]);
const ici = (p) => p.evaluate(() => document.querySelector('.niveau.ici .nom').textContent);
const va = async (p, k) => { await p.evaluate((k) => document.querySelector(`.panneau [data-aller="${k}"]`).click(), k); await p.waitForTimeout(2700); };
const tel = { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }; const ordi = { viewport: { width: 1366, height: 700 } };
const glisser = async (p, dx, dy) => { await p.evaluate(([dx, dy]) => { const x = innerWidth / 2, y = innerHeight / 2, cible = document.querySelector('.niveau.ici .scene');
  const t = (type, xx, yy) => { const touch = new Touch({ identifier: 1, target: cible, clientX: xx, clientY: yy }); cible.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [touch], changedTouches: [touch], bubbles: true })); };
  t('touchstart', x, y); t('touchend', x + dx, y + dy); }, [dx, dy]); await p.waitForTimeout(1700); };

scenario('Hélène, clavier seulement : tout atteindre avec Tab, voir où elle est', ordi, async (p, pb) => {
  const vus = []; let sansRepere = 0;
  for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab');
    const e = await p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const cs = getComputedStyle(a); const n = a.closest('.niveau');
      return { nom: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 24), repere: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, cache: !!n && !n.classList.contains('ici') }; });
    if (!e) continue; vus.push(e.nom); if (!e.repere) sansRepere++; if (e.cache) pb.push('Tab entre dans un étage qu\'on ne voit pas : ' + e.nom); }
  if (sansRepere) pb.push(sansRepere + ' élément(s) sans repère visible au clavier');
  for (const attendu of ['Menu', 'Monter', 'Ouvrir Berthier']) if (!vus.some((v) => v.includes(attendu))) pb.push('inaccessible au clavier : ' + attendu);
  await p.evaluate(() => document.getElementById('menu-btn').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  let fuite = false; for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => !!document.activeElement.closest('.menu')))) fuite = true; }
  if (fuite) pb.push('menu ouvert : Tab part dans la page derrière');
  await p.keyboard.press('Escape'); if (!(await p.evaluate(() => document.activeElement.id === 'menu-btn'))) pb.push('après Échap, le focus ne revient pas sur « Menu »');
});
scenario('Yanis, non-voyant, lecteur d\'écran : la page se décrit-elle ?', ordi, async (p, pb) => {
  const a = await p.evaluate(() => ({ lang: document.documentElement.lang, h1: [...document.querySelectorAll('h1')].filter((h) => !h.closest('[aria-hidden="true"]')).length,
    sansNom: [...document.querySelectorAll('button,a,input')].filter((e) => !e.closest('[aria-hidden="true"]') && !e.closest('[hidden]') && !(e.textContent.trim() || e.getAttribute('aria-label') || (e.id && document.querySelector(`label[for="${e.id}"]`)))).length,
    annonce: !!document.querySelector('[role="status"],.sr-annonce'), cageLive: document.getElementById('cage').hasAttribute('aria-live'),
    decorLu: [...document.querySelectorAll('.niveau.ici .meuble,.niveau.ici .objet-mur')].some((s) => s.getAttribute('aria-hidden') !== 'true') }));
  if (a.lang !== 'fr') pb.push('langue de la page non déclarée (lue avec le mauvais accent)');
  if (a.h1 !== 1) pb.push(a.h1 + ' titres principaux visibles au lieu d\'un');
  if (a.sansNom) pb.push(a.sansNom + ' bouton(s) sans nom'); if (a.decorLu) pb.push('le décor est lu à voix haute');
  if (a.cageLive) pb.push('toute la fiche est relue à chaque changement (zone « live » trop large)');
  await va(p, 3); const dit = await p.evaluate(() => document.querySelector('[role="status"]')?.textContent || '');
  if (!/Kovac/.test(dit) || !/1er/.test(dit)) pb.push('le changement d\'étage n\'est pas annoncé (« ' + dit.slice(0, 40) + ' »)');
});
scenario('Camille, pavé tactile de portable : un geste = un étage', ordi, async (p, pb) => {
  await p.mouse.move(500, 400);
  await p.evaluate(async () => { for (let i = 0; i < 45; i++) { dispatchEvent(new WheelEvent('wheel', { deltaY: -Math.max(4, 60 - i * 1.3), bubbles: true })); await new Promise((r) => setTimeout(r, 40)); } });
  await p.waitForTimeout(2600); const ou = await ici(p); if (ou !== 'Kovac') pb.push('un seul geste de pavé tactile (avec son élan) fait monter jusqu\'à ' + ou);
});
scenario('Rachid, revient le lendemain : son inscription est-elle encore là ?', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.fill('.niveau.ici .inscription input', 'rachid@exemple.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(1200); await va(p, 3);
  const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'); return { note: n.classList.contains('note'), btn: n.querySelector('button[data-id]').textContent, etat: n.querySelector('.etat').textContent, ligne: n.querySelector('.vote-ligne').textContent, point: !!document.querySelector('.panneau button.vote') }; });
  if (!e.note || !/noté/.test(e.btn) || !e.point) pb.push('inscription oubliée au retour'); if (!/prévenu/i.test(e.etat)) pb.push('au retour, l\'étage affiche encore « Bientôt »');
  if (!e.ligne) pb.push('au retour, rien ne rappelle qu\'il est inscrit ni comment annuler');
});
scenario('Léa, tourne son téléphone en cours de route', tel, async (p, pb) => {
  await va(p, 2); await p.setViewportSize({ width: 780, height: 390 }); await p.waitForTimeout(700);
  const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), cage = document.querySelector('.cage').getBoundingClientRect(), r = n.getBoundingClientRect(), b = n.querySelector('.btn').getBoundingClientRect();
    return { nom: n.querySelector('.nom').textContent, cale: Math.abs(r.top - cage.top) < 2, btn: b.bottom <= cage.bottom + 1 && b.top >= cage.top, large: document.documentElement.scrollWidth > innerWidth + 1 }; });
  if (e.nom !== 'Delmas') pb.push('après rotation on n\'est plus au même étage'); if (!e.cale) pb.push('après rotation l\'étage est décalé, à cheval sur deux'); if (!e.btn) pb.push('après rotation le bouton est hors écran'); if (e.large) pb.push('après rotation la page déborde');
});
scenario('Mathilde, commence à s\'inscrire puis change d\'avis', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(200);
  await p.fill('.niveau.ici .inscription input', 'math'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const a = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'); return { form: !n.querySelector('.inscription').hidden, btn: !n.querySelector('button[data-id]').hidden }; });
  if (a.form || !a.btn) pb.push('Échap ne ferme pas le formulaire');
  await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(200); await va(p, 2); await va(p, 3);
  const b = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'); return { form: !n.querySelector('.inscription').hidden, val: n.querySelector('.inscription input').value, err: n.querySelector('.erreur').textContent }; });
  if (b.form) pb.push('formulaire resté ouvert après être partie et revenue'); if (b.val) pb.push('ancienne saisie encore dans le champ');
});
scenario('Odile, vue fatiguée : les textes gris sont-ils lisibles ?', ordi, async (p, pb) => {
  const mesurer = () => p.evaluate(() => { const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    const fond = (e) => { for (; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] > .9)) return c; } return 'rgb(8,9,10)'; };
    const out = []; for (const e of document.querySelectorAll('.niveau.ici .fiche *, .niveau.ici .monter, .barre *, .panneau button')) { if (e.children.length || !e.textContent.trim() || e.closest('[hidden]')) continue; const cs = getComputedStyle(e); if (cs.opacity === '0') continue;
      const a = lum(cs.color), b = lum(fond(e)); const r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05); if (r < 4.5) out.push(e.textContent.trim().slice(0, 18) + ' (' + r.toFixed(1) + ')'); } return out; });
  let faibles = await mesurer();                                   // rez-de-chaussée : bouton plein, bouton Monter
  await va(p, 3); faibles = faibles.concat(await mesurer());
  await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(200); await p.fill('.niveau.ici .inscription input', 'x'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  faibles = faibles.concat(await mesurer());                       // formulaire ouvert, message d'erreur
  faibles = [...new Set(faibles)];
  if (faibles.length) pb.push('contraste insuffisant (< 4,5) : ' + faibles.slice(0, 5).join(', ') + (faibles.length > 5 ? '…' : ''));
});
scenario('Tom, glisse en travers pour « passer à la suite »', tel, async (p, pb) => {
  await va(p, 3); await glisser(p, 220, 70); const ou = await ici(p); if (ou !== 'Kovac') pb.push('un glissement surtout horizontal change d\'étage (arrive chez ' + ou + ')');
});
scenario('Agathe, tape sur le personnage', tel, async (p, pb) => {
  await va(p, 3); await p.tap('.niveau.ici .perso'); await p.waitForTimeout(400);
  const r = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'); return !n.querySelector('.inscription').hidden || n.querySelector('.perso').classList.contains('salut') || document.activeElement.closest?.('.niveau.ici .pied'); });
  if (!r) pb.push('taper sur le personnage ne fait rien du tout');
});
scenario('Bruno, reçoit un lien vers un étage précis', ordi, async (p, pb) => {
  await p.goto(url + '#site'); await p.waitForTimeout(1500); if ((await ici(p)) !== 'Kovac') pb.push('un lien direct vers un étage ouvre le rez-de-chaussée');
  await va(p, 2); const h = await p.evaluate(() => location.hash); if (h !== '#legal') pb.push('l\'adresse ne suit pas l\'étage affiché (' + (h || 'vide') + ')');
  await p.goBack().catch(() => {}); await p.waitForTimeout(1500);
});
scenario('Simone, texte à 200 % sur petit téléphone', { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true }, async (p, pb) => {
  await p.addStyleTag({ content: 'html{font-size:200%}' }); await p.waitForTimeout(500);
  for (const k of [4, 2]) { if (k !== 4) await va(p, k);
    const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), cage = document.querySelector('.cage').getBoundingClientRect(), b = n.querySelector('.pied').getBoundingClientRect(), f = n.querySelector('.fiche'), sc = n.querySelector('.scene').getBoundingClientRect(), pan = document.querySelector('.panneau');
      return { nom: n.querySelector('.nom').textContent, btn: b.bottom <= cage.bottom + 1 && b.top >= cage.top - 1, lisible: f.clientHeight - b.height, large: document.documentElement.scrollWidth > innerWidth + 1, scene: sc.height, pan: pan.scrollWidth > pan.clientWidth + 1 }; });
    if (!e.btn) pb.push(e.nom + ' : bouton hors écran à 200 %'); if (e.lisible < 90) pb.push(e.nom + ' : il reste ' + Math.round(e.lisible) + ' px pour lire le texte à 200 %'); if (e.large) pb.push(e.nom + ' : la page déborde à 200 %'); if (e.pan) pb.push(e.nom + ' : l\'ascenseur déborde à 200 %'); }
});

(async () => {
  const b = await chromium.launch(); let total = 0; const seul = process.argv[3];
  for (const [nom, opts, f] of S.map(([n, o, f]) => [n, o, f])) {
    if (seul && !nom.includes(seul)) continue;
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const pb = []; p.on('pageerror', (e) => pb.push('erreur script : ' + e.message.slice(0, 80)));
    await p.goto(url); await p.waitForTimeout(1100);
    try { await f(p, pb); } catch (e) { pb.push('scénario interrompu : ' + e.message.split('\n')[0].slice(0, 110)); }
    total += pb.length; console.log((pb.length ? '✗ ' : '✓ ') + nom + pb.map((x) => '\n     - ' + x).join('')); await ctx.close();
  }
  console.log(`\nTOTAL : ${total} problème(s)`); await b.close();
})();
