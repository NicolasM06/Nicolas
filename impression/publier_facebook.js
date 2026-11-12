// Programme des publications sur une page Facebook via l'accès officiel de Meta.
//
//   node impression/publier_facebook.js --page ID_PAGE                 affiche le plan, n'envoie rien
//   node impression/publier_facebook.js --page ID_PAGE --envoyer       programme les publications
//
// Options : --nombre 15   --debut 2026-11-20   --tous-les 2 (jours)   --heure 18
//           --collections noel,nouvel-an,astro   (ordre de priorité)
//
// La clé d'accès de la page n'est jamais écrite ici : elle est fournie par
// l'environnement (variable FB_TOKEN, ou injectée par le proxy de la session).
const fs = require('fs');
const path = require('path');

const arg = (nom, defaut) => {
  const i = process.argv.indexOf('--' + nom);
  return i > -1 ? process.argv[i + 1] : defaut;
};
const SORTIE = path.join(__dirname, 'sortie');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'donnees.json'), 'utf8'));
const page = arg('page');
const nombre = parseInt(arg('nombre', '15'), 10);
const pas = parseInt(arg('tous-les', '2'), 10);
const heure = parseInt(arg('heure', '18'), 10);
const ordre = arg('collections', 'noel,nouvel-an,astro,famille,anniversaire,humour,gamer').split(',');
const envoyer = process.argv.includes('--envoyer');
const journal = path.join(__dirname, 'publications-faites.json');

if (!page) { console.error('Il manque --page ID_PAGE'); process.exit(1); }
if (!fs.existsSync(path.join(SORTIE, 'pub.json'))) {
  console.error("Lance d'abord : node impression/generer.js"); process.exit(1);
}

const deja = fs.existsSync(journal) ? JSON.parse(fs.readFileSync(journal, 'utf8')) : [];
const pubs = JSON.parse(fs.readFileSync(path.join(SORTIE, 'pub.json'), 'utf8'))
  .filter((p) => !deja.includes(p.id));

// Un design de chaque collection à tour de rôle, dans l'ordre de priorité.
const files = ordre.map((c) => pubs.filter((p) => p.collection === c));
const plan = [];
while (plan.length < nombre && files.some((f) => f.length)) {
  for (const f of files) if (f.length && plan.length < nombre) plan.push(f.shift());
}

const debut = arg('debut') ? new Date(arg('debut') + 'T00:00:00') : new Date(Date.now() + 864e5);
plan.forEach((p, i) => {
  const d = new Date(debut);
  d.setDate(d.getDate() + i * pas);
  d.setHours(heure, 0, 0, 0);
  p.date = d;
});

(async () => {
  for (const p of plan) {
    const quand = p.date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    if (!envoyer) { console.log(`${quand}  ${p.id}  ${p.texte.split('\n')[0]}`); continue; }
    const corps = new FormData();
    const lien = D.lien_boutique ? `\n\n${D.lien_boutique}` : '';
    corps.set('caption', `${p.texte}${lien}\n\n${p.hashtags}`);
    corps.set('published', 'false');
    corps.set('unpublished_content_type', 'SCHEDULED');
    corps.set('scheduled_publish_time', String(Math.floor(p.date.getTime() / 1000)));
    corps.set('source', new Blob([fs.readFileSync(path.join(SORTIE, 'pub', p.id + '.png'))], { type: 'image/png' }), p.id + '.png');
    const r = await fetch(`https://graph.facebook.com/${page}/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.FB_TOKEN || 'cle-fournie-par-le-proxy'}` },
      body: corps,
    });
    const rep = await r.json().catch(() => ({}));
    if (!r.ok || rep.error) {
      console.error(`Échec sur ${p.id} : ${rep.error ? rep.error.message : r.status}`);
      process.exit(1);
    }
    deja.push(p.id);
    fs.writeFileSync(journal, JSON.stringify(deja, null, 1));
    console.log(`programmé  ${quand}  ${p.id}`);
  }
  if (!envoyer) console.log(`\n${plan.length} publications prévues. Rien n'a été envoyé (ajoute --envoyer).`);
})();
