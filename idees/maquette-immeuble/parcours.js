// Faux clients, parcours d'usage : chaque scénario rejoue ce qu'une personne précise ferait.
//   node parcours.js            tous les scénarios (une dizaine de minutes)
//   node parcours.js --tour=H   un seul tour
//   node parcours.js --tour=L --graine=777   trente autres écrans au hasard
// Complète faux-clients.js (qui vérifie l'affichage sur dix écrans).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const os = require('os');
const dir = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '') || fs.mkdtempSync(path.join(os.tmpdir(), 'parcours-'));
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8') + '</body></html>';
fs.writeFileSync(dir + '/imm.html', html); const url = 'file://' + dir + '/imm.html';
let TOUR = 'A'; const S = []; const scenario = (nom, opts, f) => S.push([nom, opts, f, TOUR]);
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
    annonce: !!document.getElementById('annonce'), cageLive: document.getElementById('cage').hasAttribute('aria-live'),
    decorLu: [...document.querySelectorAll('.niveau.ici .meuble,.niveau.ici .objet-mur')].some((s) => s.getAttribute('aria-hidden') !== 'true') }));
  if (a.lang !== 'fr') pb.push('langue de la page non déclarée (lue avec le mauvais accent)');
  if (a.h1 !== 1) pb.push(a.h1 + ' titres principaux visibles au lieu d\'un');
  if (a.sansNom) pb.push(a.sansNom + ' bouton(s) sans nom'); if (a.decorLu) pb.push('le décor est lu à voix haute');
  if (a.cageLive) pb.push('toute la fiche est relue à chaque changement (zone « live » trop large)');
  await va(p, 3); const dit = await p.evaluate(() => document.getElementById('annonce')?.textContent || '');
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

// ───────── Tour B ─────────
TOUR = 'B';
scenario('Gilles, navigation privée : le stockage du navigateur est bloqué', tel, async (p, pb) => {
  await p.addInitScript(() => { const boom = () => { throw new Error('bloqué'); }; Storage.prototype.getItem = boom; Storage.prototype.setItem = boom; });
  await p.reload(); await p.waitForTimeout(1200); await va(p, 3);
  await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.fill('.niveau.ici .inscription input', 'gilles@exemple.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  if (!(await p.evaluate(() => document.querySelector('.niveau.ici').classList.contains('note')))) pb.push('sans stockage, l\'inscription ne marche plus');
  const f = await p.evaluate(() => document.querySelector('.niveau.ici .fiche').innerText); if (!/ne sert qu/i.test(f + (await p.evaluate(() => document.querySelector('.niveau.ici .inscription').innerText)))) pb.push('Gilles : « Mon e-mail sert à quoi d\'autre ? » — rien ne le dit');
});
scenario('Noémie, impatiente : valide deux fois, colle n\'importe quoi', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click());
  await p.fill('.niveau.ici .inscription input', '  Noemie.TRES-longue.adresse.de.messagerie.professionnelle+marches-de-noel@un-domaine-vraiment-interminable.exemple.fr  ');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), l = n.querySelector('.vote-ligne'), f = n.querySelector('.fiche'); return { note: n.classList.contains('note'), deborde: l.scrollWidth > l.clientWidth + 1 || f.scrollWidth > f.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, espaces: /à\s{2,}/.test(l.textContent) }; });
  if (!e.note) pb.push('adresse valide avec espaces autour refusée ou double validation qui annule'); if (e.deborde) pb.push('une adresse très longue fait déborder la page'); if (e.espaces) pb.push('les espaces collés avec l\'adresse sont réaffichés');
  await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click());
  await p.fill('.niveau.ici .inscription input', '<img src=x onerror=alert(1)>@a.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  if (await p.evaluate(() => !!document.querySelector('.niveau.ici .vote-ligne img'))) pb.push('du code collé dans le champ est interprété par la page');
});
scenario('Farid, touche à tout pendant que l\'ascenseur roule', ordi, async (p, pb) => {
  await p.evaluate(() => document.querySelector('.panneau [data-aller="0"]').click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('#menu-liste [data-aller="2"]').click()); await p.setViewportSize({ width: 900, height: 600 }); await p.waitForTimeout(4200);
  const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), cage = document.querySelector('.cage').getBoundingClientRect(); return { nom: n.querySelector('.nom').textContent, cale: Math.abs(n.getBoundingClientRect().top - cage.top) < 2, menu: document.getElementById('menu').hidden, inerte: document.querySelector('.cage').inert, cur: document.querySelector('.panneau [aria-current="true"]').title }; });
  if (e.nom !== 'Delmas') pb.push('destination perdue en route : arrive chez ' + e.nom); if (!e.cale) pb.push('étage à cheval après un trajet interrompu'); if (!e.menu || e.inerte) pb.push('page bloquée après le menu'); if (!/Delmas/.test(e.cur)) pb.push('l\'ascenseur n\'indique pas le bon étage');
});
scenario('Inès, molette dans le menu ouvert', ordi, async (p, pb) => {
  await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(250); await p.mouse.move(1200, 300); await p.mouse.wheel(0, -300); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); if ((await ici(p)) !== 'Berthier') pb.push('faire défiler le menu fait bouger l\'immeuble derrière');
  await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(250);
  if (!(await p.evaluate(() => /ici/i.test(document.querySelector('#menu-liste [aria-current="true"]').innerText)))) pb.push('le menu ne dit pas à quel étage on se trouve');
  await p.mouse.click(200, 400); await p.waitForTimeout(200); if (!(await p.evaluate(() => document.getElementById('menu').hidden))) pb.push('cliquer à côté du menu ne le ferme pas');
});
scenario('Bruno bis, adresse fantaisiste puis adresse modifiée à la main', ordi, async (p, pb) => {
  await p.goto(url + '#nimportequoi'); await p.waitForTimeout(1200); if ((await ici(p)) !== 'Berthier') pb.push('une adresse inconnue n\'ouvre pas le rez-de-chaussée');
  await p.evaluate(() => { location.hash = '#agenda'; }); await p.waitForTimeout(4000); if ((await ici(p)) !== 'Vasseur') pb.push('changer l\'adresse à la main ne change pas d\'étage');
});
scenario('Paul, très grand écran : le personnage n\'est pas perdu dans la pièce', { viewport: { width: 2560, height: 1440 } }, async (p, pb) => {
  const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), sc = n.querySelector('.scene').getBoundingClientRect(), pe = n.querySelector('.perso').getBoundingClientRect(), m = n.querySelector('.meuble').getBoundingClientRect(), t = n.querySelector('.texte').getBoundingClientRect(); return { part: pe.height / sc.height, meuble: m.height / sc.height, ligne: t.width / parseFloat(getComputedStyle(n.querySelector('.texte')).fontSize) }; });
  if (e.part < .33) pb.push('personnage trop petit dans la pièce (' + Math.round(e.part * 100) + ' % de la hauteur)'); if (e.meuble < .2) pb.push('meubles minuscules (' + Math.round(e.meuble * 100) + ' %)'); if (e.ligne > 40) pb.push('lignes de texte trop longues à lire');
});
scenario('Margaux, mode contraste élevé de Windows', ordi, async (p, pb) => {
  await p.emulateMedia({ forcedColors: 'active' }); await p.waitForTimeout(300); await va(p, 3);
  const e = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.panneau [aria-current="true"]')), a = getComputedStyle(document.querySelector('.panneau [data-aller="0"]')); const pe = document.querySelector('.niveau.ici .perso');
    return { distinct: c.outlineStyle !== a.outlineStyle || c.borderTopWidth !== a.borderTopWidth || c.borderTopStyle !== a.borderTopStyle, filtre: getComputedStyle(pe).filter }; });
  if (!e.distinct) pb.push('en contraste élevé, on ne voit plus à quel étage on est dans l\'ascenseur');
});
scenario('Hélène bis, touches Début et Fin', ordi, async (p, pb) => {
  await p.keyboard.press('Home'); await p.waitForTimeout(4500); if ((await ici(p)) !== 'Vasseur') pb.push('la touche Début ne monte pas au dernier étage');
  await p.keyboard.press('End'); await p.waitForTimeout(4500); if ((await ici(p)) !== 'Berthier') pb.push('la touche Fin ne redescend pas au rez-de-chaussée');
});

// ───────── Tour C ─────────
TOUR = 'C';
scenario('Lucas, petit téléphone : comprend-il ce que fait Berthier sans faire défiler ?', { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true }, async (p, pb) => {
  for (const k of [4, 2]) { if (k !== 4) await va(p, k);
    const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), t = n.querySelector('.texte').getBoundingClientRect(), pi = n.querySelector('.pied').getBoundingClientRect(), f = n.querySelector('.fiche');
      const lh = parseFloat(getComputedStyle(n.querySelector('.texte')).lineHeight); return { nom: n.querySelector('.nom').textContent, lignes: Math.max(0, Math.min(t.bottom, pi.top) - t.top) / lh, total: t.height / lh, coupe: f.scrollHeight > f.clientHeight + 2, indice: n.classList.contains('suite') || !!n.querySelector('.fondu:not([hidden])') }; });
    if (e.lignes < Math.min(2, e.total) - .1) pb.push(e.nom + ' : seulement ' + e.lignes.toFixed(1) + ' ligne(s) de description visibles sur ' + Math.round(e.total));
    if (e.coupe && !e.indice) pb.push(e.nom + ' : le texte continue plus bas mais rien ne l\'indique'); }
});
scenario('Jeanne bis : des mots qu\'elle ne connaît pas ?', tel, async (p, pb) => {
  const tout = await p.evaluate(() => [...document.querySelectorAll('.fiche, .menu-feuille')].map((e) => e.textContent).join(' ') + ' ' + ETAGES.map((e) => e.points.join(' ')).join(' '));
  const jargon = [...new Set((tout.match(/\b(bêta|beta|backend|export|API|HTML|CSV|URL|template)\b/gi) || []).map((m) => m.toLowerCase()))];
  if (jargon.length) pb.push('mots de jargon : ' + jargon.join(', '));
  if (/\b(vous|votre|vos)\b/i.test(tout)) pb.push('mélange de tutoiement et de vouvoiement');
});
scenario('Hélène ter : le focus suit-il l\'étage affiché ?', ordi, async (p, pb) => {
  await p.evaluate(() => document.querySelector('.niveau.ici .btn').focus()); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(2200);
  let f = await p.evaluate(() => { const a = document.activeElement, n = a.closest && a.closest('.niveau'); return { cache: !!n && !n.classList.contains('ici'), quoi: (a.textContent || '').trim().slice(0, 20) }; });
  if (f.cache) pb.push('après avoir changé d\'étage, le focus reste sur « ' + f.quoi + ' » de l\'étage quitté');
  await p.keyboard.press('End'); await p.waitForTimeout(2600); await p.click('#monter', { force: true }); await p.waitForTimeout(2300); await p.keyboard.press('Enter'); await p.waitForTimeout(2300);
  const ou = await ici(p); if (ou !== 'Kovac') pb.push('après « Monter », appuyer sur Entrée fait encore bouger l\'immeuble (arrive chez ' + ou + ')');
  const inertes = await p.evaluate(() => [...document.querySelectorAll('.niveau:not(.ici)')].every((n) => n.inert)); if (!inertes) pb.push('les étages cachés restent atteignables par les aides techniques');
});
scenario('Bernard bis, texte agrandi : la molette fait-elle défiler le texte ?', { viewport: { width: 1024, height: 520 } }, async (p, pb) => {
  await p.addStyleTag({ content: 'html{font-size:170%}' }); await p.waitForTimeout(400); await va(p, 2);
  const avant = await p.evaluate(() => { const f = document.querySelector('.niveau.ici .fiche'); return { reste: f.scrollHeight - f.clientHeight, r: f.getBoundingClientRect() }; });
  if (avant.reste < 20) return; // rien à faire défiler sur cet écran
  await p.mouse.move(avant.r.left + avant.r.width / 2, avant.r.top + avant.r.height / 2); await p.mouse.wheel(0, 160); await p.waitForTimeout(1800);
  const apres = await p.evaluate(() => ({ nom: document.querySelector('.niveau.ici .nom').textContent, defile: document.querySelector('.niveau.ici .fiche').scrollTop }));
  if (apres.nom !== 'Delmas') pb.push('la molette sur un texte long change d\'étage au lieu de le faire défiler (arrive chez ' + apres.nom + ')');
});
scenario('Colette, gênée par ce qui bouge sans arrêt', tel, async (p, pb) => {
  const inf = await p.evaluate(() => [...document.querySelectorAll('.monter, .panneau .fleche.appel')].filter((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e).animationIterationCount === 'infinite').length);
  if (inf) pb.push(inf + ' bouton(s) qui sautille(nt) sans jamais s\'arrêter');
});
scenario('Sylvie bis, gros doigts : les boutons sont-ils assez espacés ?', tel, async (p, pb) => {
  const e = await p.evaluate(() => { const r = [...document.querySelectorAll('.panneau button')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => b.getBoundingClientRect()).sort((u, v) => u.left - v.left); let min = 99; for (let i = 1; i < r.length; i++) min = Math.min(min, r[i].left - r[i - 1].right); return min; });
  if (e < 4) pb.push('boutons d\'ascenseur collés (' + Math.round(e) + ' px d\'écart)');
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(200);
  const g = await p.evaluate(() => { const i = document.querySelector('.niveau.ici .inscription input').getBoundingClientRect(), b = document.querySelector('.niveau.ici .inscription button').getBoundingClientRect(); return b.top >= i.bottom ? b.top - i.bottom : b.left - i.right; });
  if (g < 6) pb.push('champ e-mail et bouton Valider trop proches (' + Math.round(g) + ' px)');
});

// ───────── Tour D ─────────
TOUR = 'D';
const coherent = () => { const pb = [], cage = document.querySelector('.cage').getBoundingClientRect(), n = document.querySelectorAll('.niveau.ici');
  if (n.length !== 1) return ['plusieurs étages « actifs » à la fois (' + n.length + ')']; const i = +n[0].dataset.i, e = ETAGES[i];
  if (Math.abs(n[0].getBoundingClientRect().top - cage.top) > 2) pb.push('étage affiché à cheval');
  if (document.querySelector('.panneau [aria-current="true"]')?.dataset.aller !== String(i)) pb.push('l\'ascenseur n\'indique pas l\'étage affiché');
  if (location.hash !== '#' + e.id) pb.push('l\'adresse ne correspond pas à l\'étage');
  if (!document.getElementById('menu').hidden && !document.querySelector('.cage').inert) pb.push('menu ouvert mais page active derrière');
  if (document.getElementById('menu').hidden && document.querySelector('.cage').inert) pb.push('page restée bloquée');
  document.querySelectorAll('.niveau').forEach((v, k) => { const id = ETAGES[k].id, b = v.querySelector('button[data-id]'); if (!b) return; const note = v.classList.contains('note');
    if (note !== (b.getAttribute('aria-pressed') === 'true')) pb.push(ETAGES[k].nom + ' : bouton et état en désaccord');
    if (note !== !!document.querySelector(`.panneau [data-aller="${k}"].vote`)) pb.push(ETAGES[k].nom + ' : point de l\'ascenseur en désaccord');
    if (k !== i && !v.querySelector('.inscription').hidden) pb.push(ETAGES[k].nom + ' : formulaire ouvert sur un étage caché');
    if (!b.hidden && !v.querySelector('.inscription').hidden) pb.push(ETAGES[k].nom + ' : bouton et formulaire affichés ensemble');
    if (b.hidden && v.querySelector('.inscription').hidden) pb.push(ETAGES[k].nom + ' : ni bouton ni formulaire'); });
  return pb; };
scenario('Le singe à la souris : 120 actions au hasard, puis on vérifie que tout est cohérent', ordi, async (p, pb) => {
  let g = 7; const alea = (n) => { g = (g * 1103515245 + 12345) % 2147483648; return g % n; };
  for (let k = 0; k < 120; k++) { const a = alea(11);
    try { if (a < 3) await p.evaluate((i) => document.querySelector(`.panneau [data-aller="${i}"]`).click(), alea(5));
      else if (a === 3) await p.keyboard.press(['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'Escape', 'Tab', 'Enter'][alea(8)]);
      else if (a === 4) await p.evaluate(() => { const b = document.querySelector('.niveau.ici button[data-id]'); if (b && !b.hidden) b.click(); });
      else if (a === 5) await p.evaluate((ok) => { const f = document.querySelector('.niveau.ici .inscription'); if (f && !f.hidden) { f.querySelector('input').value = ok ? 'a@b.fr' : 'zut'; f.requestSubmit(); } }, alea(2));
      else if (a === 6) await p.evaluate(() => document.getElementById('menu-btn').click());
      else if (a === 7) await p.evaluate((i) => { const m = document.getElementById('menu'); if (!m.hidden) (i < 5 ? m.querySelector(`[data-aller="${i}"]`) : m.querySelector('[data-fermer]')).click(); }, alea(7));
      else if (a === 8) await p.mouse.wheel(0, alea(2) ? 140 : -140);
      else if (a === 9) await p.evaluate(() => document.querySelector('.niveau.ici .perso').click());
      else await p.evaluate(() => document.querySelector('.fleche.' + (Math.random() < .5 ? 'haut' : 'bas'))?.click());
    } catch (e) { pb.push('action ' + k + ' : ' + e.message.split('\n')[0].slice(0, 70)); }
    await p.waitForTimeout([30, 120, 400][alea(3)]); }
  await p.keyboard.press('Escape'); await p.evaluate(() => { const m = document.getElementById('menu'); if (!m.hidden) m.querySelector('[data-fermer]').click(); }); await p.waitForTimeout(4500);
  (await p.evaluate(coherent)).forEach((x) => pb.push(x));
});
scenario('Le singe au doigt : 80 glissements et tapes au hasard', tel, async (p, pb) => {
  let g = 99; const alea = (n) => { g = (g * 1103515245 + 12345) % 2147483648; return g % n; };
  for (let k = 0; k < 80; k++) { const a = alea(6);
    if (a < 3) await p.evaluate(([dx, dy]) => { const c = document.querySelector('.niveau.ici ' + (Math.random() < .5 ? '.scene' : '.fiche')), x = innerWidth / 2, y = innerHeight / 2;
      const t = (type, xx, yy) => { const touch = new Touch({ identifier: 1, target: c, clientX: xx, clientY: yy }); c.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [touch], changedTouches: [touch], bubbles: true })); }; t('touchstart', x, y); t('touchend', x + dx, y + dy); }, [alea(200) - 100, alea(500) - 250]);
    else if (a === 3) await p.evaluate(() => { const b = document.querySelector('.niveau.ici .pied button:not([hidden])'); if (b) b.click(); });
    else if (a === 4) await p.evaluate((i) => document.querySelector(`.panneau [data-aller="${i}"]`).click(), alea(5));
    else await p.evaluate(() => { const m = document.getElementById('menu'); if (m.hidden) document.getElementById('menu-btn').click(); else m.querySelector('[data-fermer]').click(); });
    await p.waitForTimeout([40, 150, 500][alea(3)]); }
  await p.evaluate(() => { const m = document.getElementById('menu'); if (!m.hidden) m.querySelector('[data-fermer]').click(); }); await p.waitForTimeout(4500);
  (await p.evaluate(coherent)).forEach((x) => pb.push(x));
});
const tient = () => { const n = document.querySelector('.niveau.ici'), cage = document.querySelector('.cage').getBoundingClientRect(), pi = n.querySelector('.pied').getBoundingClientRect(), t = n.querySelector('.texte'), tr = t.getBoundingClientRect(), pan = document.querySelector('.panneau'), pb = [];
  const lh = parseFloat(getComputedStyle(t).lineHeight), f = n.querySelector('.fiche');
  if (document.documentElement.scrollWidth > innerWidth + 1) pb.push('la page déborde en largeur'); if (pan.scrollWidth > pan.clientWidth + 1 || pan.scrollHeight > pan.clientHeight + 1) pb.push('l\'ascenseur déborde');
  if (cage.height < 120) pb.push('il ne reste que ' + Math.round(cage.height) + ' px pour le contenu');
  const colle = getComputedStyle(n.querySelector('.pied')).position === 'sticky';
  if (colle && cage.height < 230) pb.push('un bouton collé recouvre le texte sur un écran aussi bas');
  if (!colle) {   // mode compact choisi par la page : tout doit défiler normalement, sans rien de collé par-dessus
    const nr = n.querySelector('.nom').getBoundingClientRect(), fr = f.getBoundingClientRect(); if (nr.top < fr.top - 1 || nr.bottom > fr.bottom + 1) pb.push('le nom du personnage n\'est pas visible à l\'arrivée');
    if (f.scrollHeight > f.clientHeight + 2 && getComputedStyle(f).overflowY !== 'auto') pb.push('le contenu est coupé sans pouvoir défiler');
    for (const e of [n.querySelector('.titre'), n.querySelector('.etat')]) { const r = e.getBoundingClientRect(); const dessus = document.elementFromPoint(r.left + 6, r.top + r.height / 2); if (dessus && !e.contains(dessus) && !dessus.contains(e)) pb.push('quelque chose recouvre « ' + e.textContent.trim().slice(0, 14) + ' »'); }
  } else {
    if (pi.bottom > cage.bottom + 1 || pi.top < cage.top - 1) pb.push('bouton principal hors écran');
    const lisible = f.clientHeight - pi.height; if (lisible < lh * 2) pb.push('moins de deux lignes lisibles au-dessus du bouton (' + Math.round(lisible) + ' px)');
  }
  for (const b of pan.querySelectorAll('button')) { if (getComputedStyle(b).display === 'none') continue; const r = b.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) { pb.push('bouton d\'ascenseur trop petit'); break; } }
  return pb; };
for (const [nom, w, h] of [['Fanny, téléphone pliable fermé (280 px de large)', 280, 653], ['Robert, zoom à 400 % sur ordinateur (équivaut à 320 × 256)', 320, 256], ['Sonia, fenêtre d\'ordinateur toute plate', 1366, 400], ['Denis, demi-écran étroit sur ordinateur', 480, 900]])
  scenario(nom, { viewport: { width: w, height: h } }, async (p, pb) => { (await p.evaluate(tient)).forEach((x) => pb.push('rez-de-chaussée : ' + x)); await va(p, 2); (await p.evaluate(tient)).forEach((x) => pb.push('juriste : ' + x)); });
scenario('L\'amie de Bruno, arrive par un lien direct sans rien connaître', tel, async (p, pb) => {
  await p.goto(url + '#legal'); await p.reload(); await p.waitForTimeout(1300);
  const t = await p.evaluate(() => document.querySelector('.niveau.ici .fiche').innerText + ' ' + (document.getElementById('indice').hidden ? '' : document.getElementById('indice').textContent));
  if (!/appli/i.test(t)) pb.push('arrivée directe chez la juriste : rien n\'explique que chaque étage est une appli');
  if (!/Berthier|rez-de-chaussée/i.test(t)) pb.push('arrivée directe : rien n\'indique qu\'une appli est déjà ouverte en bas');
});
scenario('Noémie bis, pressée : du rez-de-chaussée au 4e en combien de temps ?', ordi, async (p, pb) => {
  const t = await p.evaluate(() => new Promise((res) => { const t0 = performance.now(); document.querySelector('.panneau [data-aller="0"]').click();
    const voir = () => { const n = document.querySelector('.niveau.ici'), c = document.querySelector('.cage').getBoundingClientRect(); if (Math.abs(n.getBoundingClientRect().top - c.top) < 1 && getComputedStyle(n.querySelector('.fiche')).opacity > .95) res(performance.now() - t0); else requestAnimationFrame(voir); }; requestAnimationFrame(voir); }));
  if (t > 1700) pb.push('quatre étages d\'un coup : ' + (t / 1000).toFixed(1) + ' s avant de pouvoir lire');
});
scenario('Maëlle, daltonienne : l\'état se lit-il sans la couleur ?', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.fill('.niveau.ici .inscription input', 'm@ex.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const e = await p.evaluate(() => { const o = document.querySelector('.panneau button.ouvert'), v = document.querySelector('.panneau button.vote'); const po = getComputedStyle(o, '::before'), pv = getComputedStyle(v, '::after');
    return { memeCoin: po.top === pv.top && po.right === pv.right && po.bottom === pv.bottom, etat: document.querySelector('.niveau.ici .etat').textContent, btn: document.querySelector('.niveau.ici button[data-id]').textContent }; });
  if (e.memeCoin) pb.push('« ouvert » et « noté » ne diffèrent que par la couleur dans l\'ascenseur'); if (!/prévenu/i.test(e.etat) || !/noté/i.test(e.btn)) pb.push('l\'inscription ne se lit que par la couleur');
});

// ───────── Tour E ─────────
TOUR = 'E';
scenario('Jeanne ter, lit lentement : les messages restent-ils assez longtemps ?', tel, async (p, pb) => {
  await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: 200 }))); await p.waitForTimeout(4200);
  if (await p.evaluate(() => document.getElementById('indice').hidden)) pb.push('le message d\'aide disparaît en moins de 4 secondes');
});
scenario('Mathilde bis, valide sans rien écrire', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const m = await p.evaluate(() => document.querySelector('.niveau.ici .erreur').textContent); if (!m) pb.push('champ vide validé sans message'); else if (/incomplète/i.test(m)) pb.push('champ vide : le message parle d\'adresse « incomplète » au lieu de demander de l\'écrire');
});
scenario('Hélène quater, clavier : où est le focus après s\'être inscrite ?', ordi, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  await p.keyboard.type('helene@exemple.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const f = await p.evaluate(() => ({ sur: document.activeElement === document.querySelector('.niveau.ici button[data-id]'), quoi: document.activeElement.tagName, dit: document.getElementById('annonce').textContent }));
  if (!f.sur) pb.push('après l\'inscription, le focus est perdu (sur ' + f.quoi + ')'); if (!/prévenu|inscri/i.test(f.dit)) pb.push('l\'inscription n\'est pas annoncée au lecteur d\'écran');
  await p.waitForTimeout(600); await p.keyboard.press('Enter'); await p.waitForTimeout(200); const g = await p.evaluate(() => ({ note: document.querySelector('.niveau.ici').classList.contains('note'), dit: document.getElementById('annonce').textContent }));
  if (g.note) pb.push('Entrée sur « C\'est noté » n\'annule pas'); else if (!/annul/i.test(g.dit)) pb.push('l\'annulation n\'est pas annoncée');
  if ((await p.evaluate(() => document.querySelector('.menu-feuille').getAttribute('aria-modal'))) !== 'true') pb.push('le menu ne se déclare pas comme fenêtre modale');
});
scenario('Lucas bis, a fait défiler un texte puis revient sur l\'étage', { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true }, async (p, pb) => {
  const a = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), f = n.querySelector('.fiche'); const avant = n.classList.contains('suite'); f.scrollTop = 9999; return { avant, max: f.scrollTop }; });
  await p.waitForTimeout(300); if (a.max > 4) { if (!a.avant) pb.push('texte coupé sans indice'); if (await p.evaluate(() => document.querySelector('.niveau.ici').classList.contains('suite'))) pb.push('l\'indice « la suite plus bas » reste affiché une fois en bas'); }
  await va(p, 3); await va(p, 4); const s = await p.evaluate(() => document.querySelector('.niveau.ici .fiche').scrollTop); if (s > 2) pb.push('en revenant sur un étage, le texte est resté défilé au milieu');
});
scenario('Bruno ter, bouton Retour du navigateur', ordi, async (p, pb) => {
  await p.goto('about:blank'); await p.goto(url); await p.waitForTimeout(1100); await va(p, 3); await va(p, 1); await p.goBack(); await p.waitForTimeout(800);
  const u = p.url(); if (u.startsWith('file:')) { const n = await ici(p).catch(() => '?'); if (n !== 'Marchand') pb.push('Retour laisse sur la page mais à un étage inattendu (' + n + ')'); }
});
scenario('Nadia bis, à la souris : les éléments cliquables réagissent-ils au survol ?', ordi, async (p, pb) => {
  for (const sel of ['.panneau [data-aller="1"]', '#menu-btn', '.niveau.ici .btn', '#monter']) { const avant = await p.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return c.backgroundColor + c.borderColor + c.color; }, sel);
    await p.hover(sel, { force: true }); await p.waitForTimeout(350); const apres = await p.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return c.backgroundColor + c.borderColor + c.color + '|' + c.cursor; }, sel);
    if (apres.split('|')[0] === avant) pb.push('aucune réaction au survol : ' + sel); if (!apres.endsWith('pointer')) pb.push('pas de curseur « main » sur ' + sel); }
});

// ───────── Tour F ─────────
TOUR = 'F';
scenario('Paul bis, JavaScript bloqué par son navigateur', { viewport: { width: 390, height: 780 }, javaScriptEnabled: false }, async (p, pb) => {
  const t = await p.evaluate(() => document.body.innerText).catch(() => ''); const txt = t || await p.locator('body').innerText();
  if (!/Berthier/.test(txt) || !/JavaScript|navigateur/i.test(txt)) pb.push('sans JavaScript, la page est vide et ne dit pas pourquoi');
});
scenario('Rachid bis, deux onglets ouverts', tel, async (p, pb) => {
  const q = await p.context().newPage(); await q.goto(url); await q.waitForTimeout(1000);
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.fill('.niveau.ici .inscription input', 'r@ex.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  const vu = await q.evaluate(() => !!document.querySelector('.panneau button.vote')); if (!vu) pb.push('l\'inscription faite dans un onglet n\'apparaît pas dans l\'autre');
  if ((await q.evaluate(() => document.querySelector('.niveau.ici .nom').textContent)) !== 'Berthier') pb.push('l\'autre onglet a changé d\'étage tout seul'); await q.close();
});
scenario('Odile bis, réglage « augmenter le contraste »', ordi, async (p, pb) => {
  const lum = () => p.evaluate(() => { const c = getComputedStyle(document.querySelector('.niveau.ici .mention')).color.match(/[\d.]+/g).map(Number); return c[0] + c[1] + c[2]; });
  const avant = await lum(); await p.emulateMedia({ contrast: 'more' }); await p.waitForTimeout(200); const apres = await lum();
  if (apres <= avant) pb.push('le réglage « augmenter le contraste » ne change rien aux textes gris');
});
scenario('Marc bis, méfiant : qui est derrière, comment les joindre ?', tel, async (p, pb) => {
  await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(250);
  const t = await p.evaluate(() => document.querySelector('.menu-feuille').innerText); if (!/contact|mentions légales/i.test(t)) pb.push('aucune trace de contact ni de mentions légales, même annoncée');
});
for (const graine of [2024, 31337]) scenario('Un autre singe (tirage ' + graine + ') : 250 actions au hasard', graine % 2 ? tel : ordi, async (p, pb) => {
  let g = graine; const alea = (n) => { g = (g * 1103515245 + 12345) % 2147483648; return g % n; };
  for (let k = 0; k < 250; k++) { const a = alea(10);
    try { if (a < 3) await p.evaluate((i) => document.querySelector(`.panneau [data-aller="${i}"]`).click(), alea(5));
      else if (a === 3) await p.keyboard.press(['ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape', 'Enter', 'Tab', 'Space'][alea(8)]);
      else if (a === 4) await p.evaluate(() => { const b = document.querySelector('.niveau.ici .pied button:not([hidden])'); if (b) b.click(); });
      else if (a === 5) await p.evaluate((v) => { const f = document.querySelector('.niveau.ici .inscription'); if (f && !f.hidden) { f.querySelector('input').value = v; f.requestSubmit(); } }, ['a@b.fr', '', 'x', ' y@z.org '][alea(4)]);
      else if (a === 6) await p.evaluate(() => { const m = document.getElementById('menu'); if (m.hidden) document.getElementById('menu-btn').click(); else m.querySelectorAll('button')[Math.floor(Math.random() * 6)].click(); });
      else if (a === 7) await p.evaluate((d) => dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true })), alea(2) ? 150 : -150);
      else if (a === 8) await p.evaluate(() => document.querySelector('.niveau.ici .perso').click());
      else await p.evaluate((h) => { location.hash = h; }, ['#site', '#legal', '#berthier', '#agenda', '#commerce', '#rien'][alea(6)]);
    } catch (e) { pb.push('action ' + k + ' : ' + e.message.split('\n')[0].slice(0, 70)); }
    await p.waitForTimeout([20, 90, 350][alea(3)]); }
  await p.evaluate(() => { const m = document.getElementById('menu'); if (!m.hidden) m.querySelector('[data-fermer]').click(); }); await p.waitForTimeout(5000);
  (await p.evaluate(coherent)).forEach((x) => pb.push(x));
});

// ───────── Tour G ─────────
TOUR = 'G';
scenario('Regard direct : le rappel d\'inscription est-il près du bouton, les flèches dans le bon ordre ?', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.fill('.niveau.ici .inscription input', 'a@b.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), b = n.querySelector('.pied').getBoundingClientRect(), l = n.querySelector('.vote-ligne').getBoundingClientRect(); const h = document.querySelector('.fleche.haut').getBoundingClientRect(), d = document.querySelector('.fleche.bas').getBoundingClientRect();
    return { ecart: l.top - b.bottom, ordre: h.left < d.left || h.top < d.top }; });
  if (e.ecart > 24) pb.push('le rappel d\'inscription est à ' + Math.round(e.ecart) + ' px sous le bouton, après d\'autres textes'); if (!e.ordre) pb.push('flèches de l\'ascenseur dans l\'ordre « descendre, monter »');
});
scenario('Jeanne, zoome avec deux doigts pour mieux lire', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => { const c = document.querySelector('.niveau.ici .scene'); const mk = (id, x, y) => new Touch({ identifier: id, target: c, clientX: x, clientY: y });
    c.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(1, 150, 300), mk(2, 240, 420)], changedTouches: [mk(1, 150, 300), mk(2, 240, 420)], bubbles: true }));
    c.dispatchEvent(new TouchEvent('touchend', { touches: [mk(2, 280, 520)], changedTouches: [mk(1, 110, 180)], bubbles: true }));
    c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(2, 280, 520)], bubbles: true })); });
  await p.waitForTimeout(1800); const ou = await ici(p); if (ou !== 'Kovac') pb.push('un pincement à deux doigts change d\'étage (arrive chez ' + ou + ')');
});
scenario('Théo bis, tire depuis la barre du haut ou depuis l\'ascenseur', tel, async (p, pb) => {
  await va(p, 3);
  for (const sel of ['.barre', '.panneau']) { await p.evaluate((sel) => { const c = document.querySelector(sel), r = c.getBoundingClientRect(), x = r.left + 60, y = r.top + r.height / 2; const mk = (yy) => new Touch({ identifier: 1, target: c, clientX: x, clientY: yy });
      c.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(y)], changedTouches: [mk(y)], bubbles: true })); c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(y + (sel === '.barre' ? 260 : -260))], bubbles: true })); }, sel);
    await p.waitForTimeout(1800); const ou = await ici(p); if (ou !== 'Kovac') { pb.push('un glissement parti de ' + (sel === '.barre' ? 'la barre du haut' : 'l\'ascenseur') + ' change d\'étage'); await va(p, 3); } }
});
scenario('Gaël, dyslexique : il augmente l\'espacement des lettres et des lignes', tel, async (p, pb) => {
  await p.addStyleTag({ content: '*{line-height:1.6!important;letter-spacing:.12em!important;word-spacing:.16em!important}' }); await p.waitForTimeout(400);
  for (const k of [4, 2]) { if (k !== 4) await va(p, k);
    const e = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), cage = document.querySelector('.cage').getBoundingClientRect(), out = []; if (document.documentElement.scrollWidth > innerWidth + 1) out.push('la page déborde');
      for (const b of document.querySelectorAll('.niveau.ici .btn, .panneau button, .menu-btn, .niveau.ici .monter, .enseigne, .niveau.ici .etat')) { if (getComputedStyle(b).display === 'none') continue; if (b.scrollWidth > b.clientWidth + 2) out.push('texte coupé dans « ' + b.textContent.trim().slice(0, 14) + ' »'); const r = b.getBoundingClientRect(); if (r.right > innerWidth + 1) out.push('« ' + b.textContent.trim().slice(0, 14) + ' » sort de l\'écran'); }
      const pi = n.querySelector('.pied').getBoundingClientRect(); if (pi.bottom > cage.bottom + 1) out.push('bouton hors écran'); const pan = document.querySelector('.panneau'); if (pan.scrollWidth > pan.clientWidth + 1) out.push('l\'ascenseur déborde'); return out; });
    e.forEach((m) => pb.push(m)); }
});
scenario('Anna, fait traduire la page : les libellés deviennent plus longs', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => { document.querySelector('.niveau.ici button[data-id]').textContent = 'Benachrichtigen Sie mich bitte sofort'; document.querySelector('.niveau.ici .nom').textContent = 'Kovacinovitchenko'; document.querySelector('.niveau.ici .etat').textContent = 'Erste Etage · Demnächst verfügbar für alle'; document.getElementById('menu-btn').textContent = 'Hauptmenü'; });
  await p.waitForTimeout(300); const e = await p.evaluate(() => { const out = []; if (document.documentElement.scrollWidth > innerWidth + 1) out.push('la page déborde'); for (const s of ['.niveau.ici button[data-id]', '.niveau.ici .nom', '.niveau.ici .etat', '#menu-btn']) { const el = document.querySelector(s), r = el.getBoundingClientRect(); if (r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2) out.push('libellé long coupé : ' + s); } return out; });
  e.forEach((m) => pb.push(m));
});
scenario('Karim ter, tape son e-mail : le clavier prend la moitié de l\'écran', tel, async (p, pb) => {
  await va(p, 2); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(250); await p.setViewportSize({ width: 390, height: 340 }); await p.waitForTimeout(600);
  const e = await p.evaluate(() => { const i = document.querySelector('.niveau.ici .inscription input').getBoundingClientRect(), v = document.querySelector('.niveau.ici .inscription button').getBoundingClientRect(), c = document.querySelector('.cage').getBoundingClientRect(); return { champ: i.top >= c.top - 1 && i.bottom <= c.bottom + 1, valider: v.top >= c.top - 1 && v.bottom <= c.bottom + 1, focus: document.activeElement.tagName }; });
  if (!e.champ) pb.push('clavier ouvert : le champ e-mail n\'est plus visible'); if (!e.valider) pb.push('clavier ouvert : le bouton Valider n\'est plus visible'); if (e.focus !== 'INPUT') pb.push('clavier ouvert : le champ a perdu le focus');
  await p.keyboard.type('karim@exemple.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.setViewportSize({ width: 390, height: 780 }); await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), c = document.querySelector('.cage').getBoundingClientRect(), b = n.querySelector('.pied').getBoundingClientRect(); return { note: n.classList.contains('note'), btn: b.bottom <= c.bottom + 1 && b.top >= c.top - 1, cale: Math.abs(n.getBoundingClientRect().top - c.top) < 2 }; });
  if (!f.note) pb.push('inscription perdue quand le clavier se referme'); if (!f.btn || !f.cale) pb.push('mise en page décalée après la fermeture du clavier');
});
scenario('Monique bis, tablette tactile : un tap = une seule action', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }, async (p, pb) => {
  await p.tap('.panneau [data-aller="3"]'); await p.waitForTimeout(2600); if ((await ici(p)) !== 'Kovac') pb.push('un tap sur « 1 » n\'amène pas au 1er');
  await p.tap('.niveau.ici button[data-id]'); await p.waitForTimeout(400); if (await p.evaluate(() => document.querySelector('.niveau.ici .inscription').hidden)) pb.push('un tap sur « Préviens-moi » ouvre puis referme le formulaire');
});

// ───────── Tour H ─────────
TOUR = 'H';
scenario('Paul ter, à la souris : le message d\'aide lui parle-t-il de « glisser » ?', ordi, async (p, pb) => {
  await p.mouse.move(500, 400); await p.mouse.wheel(0, 200); await p.waitForTimeout(500);
  const t = await p.evaluate(() => document.getElementById('indice').hidden ? '' : document.getElementById('indice').textContent);
  if (!t) pb.push('aucune aide à la souris quand on bute en bas'); else if (/glisse/i.test(t)) pb.push('à la souris, l\'aide dit de « glisser » (« ' + t + ' »)');
});
scenario('Sylvie ter : le bouton prévient-il qu\'il ouvre un autre onglet ?', tel, async (p, pb) => {
  const e = await p.evaluate(() => { const a = document.querySelector('.niveau.ici a.btn'); return { cible: a.target, txt: a.textContent + ' ' + (a.getAttribute('aria-label') || '') + ' ' + (a.title || ''), rel: a.rel }; });
  if (e.cible === '_blank' && !/onglet|↗/i.test(e.txt)) pb.push('« Ouvrir Berthier » ouvre un nouvel onglet sans prévenir'); if (e.cible === '_blank' && !/noopener/.test(e.rel)) pb.push('lien externe sans protection');
});
scenario('Camille bis, pavé tactile : balayage horizontal et zoom par pincement', ordi, async (p, pb) => {
  await va(p, 3); await p.mouse.move(500, 400);
  await p.evaluate(async () => { for (let i = 0; i < 25; i++) { dispatchEvent(new WheelEvent('wheel', { deltaX: 40, deltaY: 7, bubbles: true })); await new Promise((r) => setTimeout(r, 16)); } }); await p.waitForTimeout(1800);
  let ou = await ici(p); if (ou !== 'Kovac') { pb.push('un balayage horizontal au pavé tactile change d\'étage (arrive chez ' + ou + ')'); await va(p, 3); }
  await p.waitForTimeout(400); await p.evaluate(async () => { for (let i = 0; i < 12; i++) { dispatchEvent(new WheelEvent('wheel', { deltaY: -30, ctrlKey: true, bubbles: true })); await new Promise((r) => setTimeout(r, 16)); } }); await p.waitForTimeout(1800);
  ou = await ici(p); if (ou !== 'Kovac') pb.push('zoomer (Ctrl + molette ou pincement) change d\'étage (arrive chez ' + ou + ')');
});
scenario('Hélène quinquies : les raccourcis du navigateur ne déplacent pas l\'immeuble', ordi, async (p, pb) => {
  await va(p, 3); for (const k of ['Control+ArrowUp', 'Alt+ArrowDown', 'Meta+ArrowUp']) { await p.keyboard.press(k); await p.waitForTimeout(1500); const ou = await ici(p); if (ou !== 'Kovac') { pb.push('le raccourci ' + k + ' change d\'étage'); await va(p, 3); } }
});
scenario('Karim quater : le clavier du téléphone est-il adapté à un e-mail ?', tel, async (p, pb) => {
  const e = await p.evaluate(() => { const i = document.querySelector('.inscription input'); return { type: i.type, mode: i.inputMode, auto: i.autocomplete, hint: i.enterKeyHint, cap: i.getAttribute('autocapitalize'), corr: i.getAttribute('autocorrect') || i.getAttribute('spellcheck') }; });
  if (e.type !== 'email' || e.mode !== 'email') pb.push('le clavier affiché n\'est pas celui des e-mails'); if (e.auto !== 'email') pb.push('le téléphone ne propose pas l\'adresse enregistrée');
  if (!e.hint) pb.push('la touche Entrée du clavier n\'a pas de libellé adapté'); if (e.cap !== 'off' && e.cap !== 'none') pb.push('le téléphone met une majuscule au début de l\'adresse'); if (e.corr !== 'off' && e.corr !== 'false') pb.push('le correcteur peut modifier l\'adresse tapée');
});

// ───────── Tour I ─────────
TOUR = 'I';
scenario('Paul quater : le message d\'aide cache-t-il le bouton dont il parle ?', ordi, async (p, pb) => {
  await p.mouse.move(500, 400); await p.mouse.wheel(0, 200); await p.waitForTimeout(500);
  const e = await p.evaluate(() => { const i = document.getElementById('indice').getBoundingClientRect(), R = (s) => document.querySelector(s).getBoundingClientRect(); const croise = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
    return { monter: croise(i, R('#monter')), tete: croise(i, { ...R('.niveau.ici .perso').toJSON(), bottom: R('.niveau.ici .perso').top + R('.niveau.ici .perso').height * .45 }), nom: croise(i, R('.niveau.ici .nom')) }; });
  if (e.monter) pb.push('le message d\'aide recouvre le bouton « Monter »'); if (e.tete) pb.push('le message d\'aide passe sur le visage du personnage'); if (e.nom) pb.push('le message d\'aide recouvre le nom');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); if (!(await p.evaluate(() => document.getElementById('indice').hidden))) pb.push('Échap ne fait pas disparaître le message d\'aide');
});
for (const [nom, opts] of [['Sylvie quater, téléphone', tel], ['Lucas ter, petit téléphone', { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true }]])
  scenario(nom + ' : le message d\'aide gêne-t-il ?', opts, async (p, pb) => {
    await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: 200 }))); await p.waitForTimeout(500);
    const e = await p.evaluate(() => { const i = document.getElementById('indice').getBoundingClientRect(), R = (s) => document.querySelector(s).getBoundingClientRect(); const croise = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
      return { monter: croise(i, R('#monter')), pied: croise(i, R('.niveau.ici .pied')), hors: i.left < 0 || i.right > innerWidth, nom: croise(i, R('.niveau.ici .nom')) }; });
    if (e.monter) pb.push('le message d\'aide recouvre le bouton « Monter »'); if (e.pied) pb.push('le message d\'aide recouvre le bouton principal'); if (e.hors) pb.push('le message d\'aide sort de l\'écran'); if (e.nom) pb.push('le message d\'aide recouvre le nom');
  });
scenario('Karim quinquies, s\'inscrit à deux étages : doit-il retaper son e-mail ?', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.fill('.niveau.ici .inscription input', 'karim@exemple.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await va(p, 1); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(250);
  const v = await p.evaluate(() => document.querySelector('.niveau.ici .inscription input').value); if (v !== 'karim@exemple.fr') pb.push('au deuxième étage, il doit retaper son e-mail');
  const garde = await p.evaluate(() => { try { return JSON.stringify(localStorage).includes('karim@'); } catch (e) { return false; } }); if (garde) pb.push('l\'e-mail est enregistré dans le navigateur alors que la page dit ne rien conserver');
});
scenario('Agathe bis, tape sur Berthier lui-même', tel, async (p, pb) => {
  await p.tap('.niveau.ici .perso'); await p.waitForTimeout(250);
  const e = await p.evaluate(() => { const b = document.querySelector('.niveau.ici a.btn'); return b.classList.contains('regarde') || document.activeElement === b; }); if (!e) pb.push('taper sur Berthier le fait sautiller mais ne montre pas quoi faire ensuite');
});
scenario('Hélène sexies : flèches du clavier dans le menu', ordi, async (p, pb) => {
  await p.evaluate(() => document.getElementById('menu-btn').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const avant = await p.evaluate(() => document.activeElement.dataset.aller); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(150); const apres = await p.evaluate(() => document.activeElement.dataset.aller);
  if (avant === apres) pb.push('dans le menu, la flèche Haut ne passe pas à la ligne du dessus'); if ((await ici(p)) !== 'Berthier') pb.push('dans le menu, les flèches déplacent l\'immeuble derrière');
  await p.keyboard.press('Enter'); await p.waitForTimeout(2600); if ((await ici(p)) !== 'Kovac') pb.push('Entrée sur une ligne du menu n\'y emmène pas');
});

// ───────── Tour J ─────────
TOUR = 'J';
const gene = () => { const i = document.getElementById('indice'); if (i.hidden) return ['message d\'aide absent']; const r = i.getBoundingClientRect(), cage = document.querySelector('.cage').getBoundingClientRect(), n = document.querySelector('.niveau.ici'), out = [];
  const croise = (s) => { const e = n.querySelector(s); if (!e || getComputedStyle(e).display === 'none' || !e.getClientRects().length) return false; const b = e.getBoundingClientRect(); return Math.min(r.right, b.right) > Math.max(r.left, b.left) + 1 && Math.min(r.bottom, b.bottom) > Math.max(r.top, b.top) + 1; };
  if (r.left < 0 || r.right > innerWidth || r.top < cage.top - 1 || r.bottom > cage.bottom + 1) out.push('message d\'aide en partie hors de l\'écran');
  if (croise('.monter')) out.push('message sur le bouton « Monter »'); if (croise('.nom')) out.push('message sur le nom'); if (croise('.pied')) out.push('message sur le bouton principal'); if (croise('.etat')) out.push('message sur l\'état de l\'étage');
  if (i.scrollWidth > i.clientWidth + 1) out.push('message coupé'); return out; };
for (const [nom, w, h, m] of [['téléphone', 390, 780, 1], ['petit téléphone', 320, 568, 1], ['téléphone en paysage', 780, 360, 1], ['tablette', 768, 1024, 1], ['portable', 1366, 700, 0], ['fenêtre plate', 1100, 430, 0], ['texte à 150 %', 390, 780, 1]])
  scenario('Le message d\'aide sur ' + nom + ' : gêne-t-il quelque chose ?', { viewport: { width: w, height: h }, hasTouch: !!m, isMobile: !!m }, async (p, pb) => {
    if (nom.includes('150')) await p.addStyleTag({ content: 'html{font-size:150%}' });
    await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: 200 }))); await p.waitForTimeout(500); (await p.evaluate(gene)).forEach((x) => pb.push('en butant en bas : ' + x));
    await p.goto(url + '#commerce'); await p.reload(); if (nom.includes('150')) await p.addStyleTag({ content: 'html{font-size:150%}' }); await p.waitForTimeout(1300); (await p.evaluate(gene)).forEach((x) => pb.push('à l\'arrivée par lien direct : ' + x));
  });
scenario('Théo ter : le message se ferme d\'un tap, et « Monter » reste utilisable dessous', tel, async (p, pb) => {
  await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: 200 }))); await p.waitForTimeout(400);
  await p.tap('#monter'); await p.waitForTimeout(2300); if ((await ici(p)) !== 'Kovac') pb.push('avec le message affiché, « Monter » ne répond plus');
  await va(p, 4); await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: 200 }))); await p.waitForTimeout(400); await p.tap('#indice'); await p.waitForTimeout(200);
  if (!(await p.evaluate(() => document.getElementById('indice').hidden))) pb.push('un tap sur le message ne le ferme pas');
});
scenario('Karim sexies : au deuxième étage, il veut donner une autre adresse', tel, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.keyboard.type('karim@exemple.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await va(p, 2); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.waitForTimeout(250); await p.keyboard.type('pro@savons.fr'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const l = await p.evaluate(() => document.querySelector('.niveau.ici .vote-ligne').textContent); if (!/à pro@savons\.fr /.test(l)) pb.push('la nouvelle adresse s\'ajoute à l\'ancienne au lieu de la remplacer (« ' + l.slice(0, 60) + ' »)');
  await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('.niveau.ici button[data-id]').click()); const v = await p.evaluate(() => document.querySelector('.niveau.ici .inscription input').value); if (v !== 'pro@savons.fr') pb.push('après avoir refermé le formulaire, la dernière adresse n\'est plus proposée');
});

// ───────── Tour K ─────────
TOUR = 'K';
for (const [nom, w, h, m] of [['téléphone', 390, 780, 1], ['téléphone en paysage', 780, 360, 1], ['portable', 1366, 700, 0]])
  scenario('Tout en haut de l\'immeuble sur ' + nom + ' : le message « dernier étage »', { viewport: { width: w, height: h }, hasTouch: !!m, isMobile: !!m }, async (p, pb) => {
    await va(p, 0); await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: -200 }))); await p.waitForTimeout(500);
    (await p.evaluate(gene)).forEach((x) => pb.push(x)); const t = await p.evaluate(() => document.getElementById('indice').textContent); if (!/dernier/i.test(t)) pb.push('en haut, le message ne dit pas que c\'est le dernier étage (« ' + t + ' »)');
  });
scenario('Yanis bis, lecteur d\'écran : entend-il le message d\'aide ?', ordi, async (p, pb) => {
  const r = await p.evaluate(() => { const i = document.getElementById('indice'); return i.getAttribute('role') || i.getAttribute('aria-live'); }); if (!r) pb.push('le message d\'aide n\'est pas annoncé aux lecteurs d\'écran');
});
scenario('Monique ter, tablette en paysage : un parcours complet au doigt', { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true }, async (p, pb) => {
  await p.tap('#monter'); await p.waitForTimeout(2300); if ((await ici(p)) !== 'Kovac') pb.push('« Monter » ne répond pas au doigt');
  await p.tap('.niveau.ici .perso'); await p.waitForTimeout(300); await p.keyboard.type('monique@exemple.fr'); await p.tap('.niveau.ici .inscription button'); await p.waitForTimeout(400);
  if (!(await p.evaluate(() => document.querySelector('.niveau.ici').classList.contains('note')))) pb.push('inscription au doigt impossible');
  await p.tap('#menu-btn'); await p.waitForTimeout(300); await p.tap('#menu-liste [data-aller="0"]'); await p.waitForTimeout(3000); if ((await ici(p)) !== 'Vasseur') pb.push('le menu au doigt n\'emmène pas au 4e');
  await glisser(p, 0, -220); if ((await ici(p)) !== 'Marchand') pb.push('glisser vers le haut ne redescend pas d\'un étage');
  (await p.evaluate(coherent)).forEach((x) => pb.push(x));
});
scenario('Relecture : fautes de frappe et ponctuation française', ordi, async (p, pb) => {
  await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(200);
  const t = await p.evaluate(() => [...document.querySelectorAll('.fiche, .menu-feuille, .barre')].map((e) => e.textContent).join('\n') + '\n' + RAPPEL + '\n' + new DOMParser().parseFromString(document.querySelector('noscript').textContent, 'text/html').body.textContent);
  const soucis = []; if (/\s{2,}[,.;:!?]/.test(t.replace(/\n/g, ''))) soucis.push('espaces doubles avant ponctuation'); if (/[a-zé]\?|[a-zé]!|[a-zé];/.test(t)) soucis.push('ponctuation double sans espace avant'); if (/\bca\b|\bCa\b|etage|a l'ouverture|deja|prevenu\b/.test(t)) soucis.push('accents manquants');
  if (/''|"[^"]*"/.test(t)) soucis.push('guillemets droits au lieu de « »'); if (/\.\.\./.test(t)) soucis.push('trois points au lieu de …'); soucis.forEach((s) => pb.push(s));
});

// ───────── Tour L ─────────
TOUR = 'L';
// Trente écrans tirés au hasard (taille et grossissement du texte) : un faux client par écran.
{ let g = +((process.argv.find((v) => v.startsWith('--graine=')) || '').slice(9)) || 4242; const alea = (n) => { g = (g * 1103515245 + 12345) % 2147483648; return g % n; };
  for (let k = 0; k < 30; k++) { const w = 280 + alea(1721), h = 256 + alea(1045), z = [100, 100, 100, 125, 150, 200][alea(6)], doigt = w < 1100 && alea(2) === 0;
    scenario(`Écran au hasard n° ${k + 1} : ${w} × ${h}, texte à ${z} %${doigt ? ', tactile' : ''}`, { viewport: { width: w, height: h }, hasTouch: doigt, isMobile: doigt }, async (p, pb) => {
      if (z !== 100) { await p.addStyleTag({ content: `html{font-size:${z}%}` }); await p.waitForTimeout(300); }
      for (const [k2, nom] of [[4, 'rez-de-chaussée'], [2, 'juriste']]) { if (k2 !== 4) await va(p, k2);
        (await p.evaluate(tient)).forEach((x) => pb.push(nom + ' : ' + x));
        const d = await p.evaluate(() => { const n = document.querySelector('.niveau.ici'), out = [], sc = n.querySelector('.scene'); if (getComputedStyle(sc).display !== 'none') { const s = sc.getBoundingClientRect(), pe = n.querySelector('.perso').getBoundingClientRect();
            if (pe.top < s.top - 1 || pe.left < s.left - 1 || pe.right > s.right + 1) out.push('personnage coupé'); if (pe.height < 80) out.push('personnage minuscule (' + Math.round(pe.height) + ' px)');
            for (const m of n.querySelectorAll('.meuble')) { const r = m.getBoundingClientRect(); const part = Math.max(0, Math.min(r.right, pe.right) - Math.max(r.left, pe.left)) * Math.max(0, Math.min(r.bottom, pe.bottom) - Math.max(r.top, pe.top)) / (pe.width * pe.height); if (part > .22) out.push('meuble devant le personnage'); }
            const mo = n.querySelector('.monter'); if (mo) { const r = mo.getBoundingClientRect(); if (r.left < s.left - 1 || r.right > s.right + 1) out.push('bouton « Monter » coupé'); if (Math.min(r.right, pe.right) > Math.max(r.left, pe.left) + 2 && r.bottom > pe.top + 2 && r.top < pe.top + pe.height * .4) out.push('bouton « Monter » sur le visage'); } }
          for (const e of n.querySelectorAll('.nom, .etat, .btn')) if (e.getClientRects().length && e.scrollWidth > e.clientWidth + 2) out.push('texte coupé : ' + e.textContent.trim().slice(0, 14));
          const en = document.querySelector('.enseigne'); if (en.getBoundingClientRect().height > parseFloat(getComputedStyle(en).fontSize) * 2) out.push('enseigne sur deux lignes'); return out; });
        d.forEach((x) => pb.push(nom + ' : ' + x)); }
      await p.evaluate(() => document.getElementById('menu-btn').click()); await p.waitForTimeout(250);
      const m = await p.evaluate(() => { const f = document.querySelector('.menu-feuille'), r = f.getBoundingClientRect(), fe = f.querySelector('[data-fermer]').getBoundingClientRect(); return (r.right > innerWidth + 1 || r.left < -1 ? 'menu plus large que l\'écran;' : '') + (fe.top < -1 || fe.bottom > innerHeight + 1 ? 'bouton Fermer hors écran;' : '') + (f.scrollWidth > f.clientWidth + 1 ? 'menu qui déborde en largeur;' : ''); });
      m.split(';').filter(Boolean).forEach((x) => pb.push(x)); await p.keyboard.press('Escape');
      await p.evaluate(() => dispatchEvent(new WheelEvent('wheel', { deltaY: -400 }))); await p.waitForTimeout(2300); (await p.evaluate(coherent)).forEach((x) => pb.push(x));
    }); } }

// ───────── Tour M ─────────
TOUR = 'M';
scenario('Hélène, appuie sur Tab pendant que l\'ascenseur roule', ordi, async (p, pb) => {
  for (const [k, n] of [[0, 3], [4, 2], [1, 5], [3, 1]]) { await p.evaluate((k) => document.querySelector(`.panneau [data-aller="${k}"]`).click(), k); await p.waitForTimeout(120);
    for (let i = 0; i < n; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(60); } await p.waitForTimeout(2600);
    const e = await p.evaluate(() => { const c = document.querySelector('.cage'), n = document.querySelector('.niveau.ici'); return { ecart: Math.round(n.getBoundingClientRect().top - c.getBoundingClientRect().top), defile: c.scrollTop, nom: n.querySelector('.nom').textContent }; });
    if (Math.abs(e.ecart) > 2) { pb.push('après Tab en plein trajet, l\'étage de ' + e.nom + ' reste décalé de ' + e.ecart + ' px (cage défilée de ' + e.defile + ' px)'); break; } }
});
scenario('Mathilde, ouvre le formulaire puis change d\'étage aussitôt', ordi, async (p, pb) => {
  await va(p, 3); await p.evaluate(() => { document.querySelector('.panneau [data-aller="1"]').click(); }); await p.waitForTimeout(80);
  await p.evaluate(() => { const b = document.querySelector('.niveau.ici button[data-id]'); if (b) b.click(); }); await p.waitForTimeout(3000);
  const e = await p.evaluate(() => { const c = document.querySelector('.cage'), n = document.querySelector('.niveau.ici'); return { ecart: Math.round(n.getBoundingClientRect().top - c.getBoundingClientRect().top), defile: c.scrollTop }; });
  if (Math.abs(e.ecart) > 2) pb.push('formulaire ouvert en plein trajet : étage décalé de ' + e.ecart + ' px');
});

(async () => {
  const b = await chromium.launch(); let total = 0; const seul = process.argv[3]; const tour = (process.argv.find((v) => v.startsWith('--tour=')) || '').slice(7);
  for (const [nom, opts, f, tr] of S) {
    if (tour && tr !== tour) continue;
    if (seul && !seul.startsWith('--') && !nom.includes(seul)) continue;
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); const pb = []; p.on('pageerror', (e) => pb.push('erreur script : ' + e.message.slice(0, 80))); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/i.test(m.text())) pb.push('erreur console : ' + m.text().slice(0, 80)); });
    await p.goto(url); await p.waitForTimeout(1100);
    try { await f(p, pb); } catch (e) { pb.push('scénario interrompu : ' + e.message.split('\n')[0].slice(0, 110)); }
    total += pb.length; console.log((pb.length ? '✗ ' : '✓ ') + nom + pb.map((x) => '\n     - ' + x).join('')); await ctx.close();
  }
  console.log(`\nTOTAL : ${total} problème(s)`); await b.close();
})();
