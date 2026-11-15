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

// ───────── Tour B ─────────
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
  if (innerHeight < 300) {   // écran minuscule : tout doit défiler normalement, sans rien de collé par-dessus
    const nr = n.querySelector('.nom').getBoundingClientRect(), fr = f.getBoundingClientRect(); if (nr.top < fr.top - 1 || nr.bottom > fr.bottom + 1) pb.push('le nom du personnage n\'est pas visible à l\'arrivée');
    if (getComputedStyle(n.querySelector('.pied')).position === 'sticky') pb.push('un bouton collé recouvre le texte sur un écran aussi bas');
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
