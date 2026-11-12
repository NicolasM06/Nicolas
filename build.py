#!/usr/bin/env python3
"""Construit le site statique dans _site/.

    python build.py            # site tel qu'il sera en ligne aujourd'hui
    python build.py --tout     # inclut aussi les articles programmés (aperçu)
    python build.py --social   # écrit aussi brouillons-sociaux.md

Un article dont la date est dans le futur n'est pas publié : le déploiement
quotidien (GitHub Actions) le mettra en ligne tout seul le jour venu.
"""
import datetime as dt
import html
import json
import shutil
import sys
from pathlib import Path

import markdown

RACINE = Path(__file__).resolve().parent
SORTIE = RACINE / "_site"
CFG = json.loads((RACINE / "config.json").read_text(encoding="utf-8"))
GRATUIT = next(p for p in CFG["produits"] if p["prix"] == 0)
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
        "août", "septembre", "octobre", "novembre", "décembre"]

e = html.escape


def date_fr(d):
    return f"{d.day}{'er' if d.day == 1 else ''} {MOIS[d.month - 1]} {d.year}"


def page(titre, description, corps, racine="", chemin=""):
    """racine = préfixe relatif vers la racine du site ('' ou '../')."""
    titre_complet = f"{titre} — {CFG['nom']}" if titre else f"{CFG['nom']} — {CFG['slogan']}"
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(titre_complet)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(CFG['url'].rstrip('/') + '/' + chemin)}">
<meta property="og:title" content="{e(titre_complet)}">
<meta property="og:description" content="{e(description)}">
<link rel="stylesheet" href="{racine}style.css">
</head>
<body>
<header class="haut">
  <a class="marque" href="{racine}index.html">{e(CFG['nom'])}</a>
  <nav>
    <a href="{racine}index.html#modeles">Modèles</a>
    <a href="{racine}blog/index.html">Blog</a>
    <a class="bouton petit" href="{racine}index.html#gratuit">Modèle gratuit</a>
  </nav>
</header>
<main>
{corps}
</main>
<footer class="bas">
  <p>© {dt.date.today().year} {e(CFG['nom'])} · <a href="{racine}mentions-legales.html">Mentions légales</a></p>
</footer>
</body>
</html>
"""


def prix(p):
    return "Gratuit" if p["prix"] == 0 else f"{p['prix']:g} €".replace(".", ",")


def carte_produit(p, racine=""):
    if p["prix"] == 0:
        action = (f'<a class="bouton" href="{racine}telechargements/{e(p["fichier"])}" download>'
                  "Télécharger gratuitement</a>")
    elif p.get("lien_achat"):
        action = f'<a class="bouton" href="{e(p["lien_achat"])}" rel="noopener">Acheter — {prix(p)}</a>'
    else:
        action = '<span class="bouton inactif">Bientôt disponible</span>'
    points = "".join(f"<li>{e(x)}</li>" for x in p["points"])
    classes = "carte vedette" if p.get("mis_en_avant") else "carte"
    return f"""<article class="{classes}" id="{e(p['id'])}">
  <h3>{e(p['nom'])}</h3>
  <p class="prix">{prix(p)}</p>
  <p class="accroche">{e(p['accroche'])}</p>
  <ul>{points}</ul>
  {action}
</article>"""


def encart_gratuit(racine):
    return f"""<aside class="encart">
  <h2>Commence avec le modèle gratuit</h2>
  <p>{e(GRATUIT['accroche'])} Sans inscription, compatible Excel et Google Sheets.</p>
  <a class="bouton" href="{racine}telechargements/{e(GRATUIT['fichier'])}" download>Télécharger le budget mensuel</a>
  <a class="lien" href="{racine}index.html#modeles">Voir tous les modèles →</a>
</aside>"""


def lire_articles(tout=False):
    articles = []
    for f in sorted((RACINE / "contenu" / "articles").glob("*.md")):
        brut = f.read_text(encoding="utf-8")
        _, entete, corps = brut.split("---", 2)
        meta = {}
        for ligne in entete.strip().splitlines():
            cle, _, valeur = ligne.partition(":")
            meta[cle.strip()] = valeur.strip()
        meta["date"] = dt.date.fromisoformat(meta["date"])
        meta["slug"] = f.stem
        meta["html"] = markdown.markdown(corps, extensions=["extra"])
        if tout or meta["date"] <= dt.date.today():
            articles.append(meta)
    return sorted(articles, key=lambda a: a["date"], reverse=True)


def accueil(articles):
    payants = [p for p in CFG["produits"] if p["prix"] > 0]
    cartes = "\n".join(carte_produit(p) for p in payants)
    derniers = "".join(
        f'<li><a href="blog/{a["slug"]}.html">{e(a["titre"])}</a>'
        f'<span>{e(a["description"])}</span></li>' for a in articles[:3])
    newsletter = ""
    if CFG.get("lien_newsletter"):
        newsletter = (f'<p class="centre"><a class="lien" href="{e(CFG["lien_newsletter"])}">'
                      "Recevoir les nouveaux modèles par e-mail →</a></p>")
    corps = f"""<section class="hero">
  <h1>{e(CFG['slogan'])}</h1>
  <p>Des modèles de budget en français, prêts à remplir, pour Excel et Google Sheets.
  Pas d'application à installer, pas d'abonnement, pas de compte bancaire à connecter.</p>
  <a class="bouton" href="#gratuit">Essayer le modèle gratuit</a>
  <a class="lien" href="#modeles">Voir les modèles complets →</a>
</section>

<section id="gratuit" class="gratuit">
  {carte_produit(GRATUIT)}
  <div>
    <h2>Un budget en 10 minutes</h2>
    <ol>
      <li>Télécharge le fichier et ouvre-le dans Excel ou Google Sheets.</li>
      <li>Remplace les montants d'exemple par les tiens.</li>
      <li>En fin de mois, note le réel : les écarts s'affichent tout seuls.</li>
    </ol>
  </div>
</section>

<section id="modeles">
  <h2>Les modèles complets</h2>
  <p class="sous-titre">Paiement unique. Le fichier est à toi, pour toujours.</p>
  <div class="grille">
{cartes}
  </div>
  {newsletter}
</section>

<section class="faq">
  <h2>Questions fréquentes</h2>
  <details><summary>Ça marche avec Google Sheets ?</summary>
  <p>Oui. Dans Google Sheets : Fichier → Importer → Importer le fichier. Les formules, listes déroulantes et graphiques sont conservés. Ça fonctionne aussi avec Excel et LibreOffice.</p></details>
  <details><summary>Faut-il s'y connaître en tableur ?</summary>
  <p>Non. Tu remplis les cellules jaunes, tout le reste est calculé. Chaque fichier contient un mode d'emploi.</p></details>
  <details><summary>Mes données bancaires sont-elles partagées ?</summary>
  <p>Non. Le fichier reste sur ton ordinateur ou ton Drive. Rien n'est connecté à ta banque et rien ne nous est envoyé.</p></details>
  <details><summary>Comment je reçois mon fichier ?</summary>
  <p>Juste après le paiement, tu reçois un lien de téléchargement par e-mail.</p></details>
</section>

<section>
  <h2>Derniers articles</h2>
  <ul class="articles">{derniers}</ul>
  <p><a class="lien" href="blog/index.html">Tous les articles →</a></p>
</section>"""
    return page("", CFG["description"], corps, chemin="")


def blog_index(articles):
    items = "".join(
        f'<li><a href="{a["slug"]}.html">{e(a["titre"])}</a>'
        f'<span>{date_fr(a["date"])} — {e(a["description"])}</span></li>' for a in articles)
    corps = f"""<section>
  <h1>Blog</h1>
  <p class="sous-titre">Des conseils concrets pour gérer son budget, sans jargon.</p>
  <ul class="articles">{items}</ul>
</section>"""
    return page("Blog", "Conseils pratiques pour gérer son budget et épargner.", corps,
                racine="../", chemin="blog/index.html")


def page_article(a):
    corps = f"""<article class="article">
  <p class="date">{date_fr(a['date'])}</p>
  <h1>{e(a['titre'])}</h1>
  {a['html']}
</article>
{encart_gratuit('../')}"""
    return page(a["titre"], a["description"], corps, racine="../",
                chemin=f"blog/{a['slug']}.html")


def mentions():
    m = CFG["mentions_legales"]
    corps = f"""<article class="article">
  <h1>Mentions légales</h1>
  <h2>Éditeur du site</h2>
  <p>{e(m['editeur'])}<br>{e(m['statut'])}<br>{e(m['adresse'])}<br>Contact : {e(m['contact'])}</p>
  <h2>Hébergement</h2>
  <p>GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
  <h2>Données personnelles</h2>
  <p>Ce site ne dépose aucun cookie et ne collecte aucune donnée personnelle.
  Les paiements sont traités par une plateforme de vente tierce, qui applique sa propre politique de confidentialité.</p>
  <h2>Avertissement</h2>
  <p>Les modèles et articles proposés sont des outils d'organisation personnelle.
  Ils ne constituent pas un conseil financier personnalisé.</p>
</article>"""
    return page("Mentions légales", "Mentions légales du site.", corps,
                chemin="mentions-legales.html")


def brouillons_sociaux(articles):
    blocs = ["# Brouillons de publications\n",
             "Copie-colle, ajuste le ton, publie. Un article = trois publications.\n"]
    base = CFG["url"].rstrip("/")
    for a in articles:
        lien = f"{base}/blog/{a['slug']}.html"
        accroche = a.get("accroche", a["description"])
        blocs.append(f"""
## {a['titre']} ({a['date'].isoformat()})

**1. Accroche + lien** (X, Threads, LinkedIn)

{accroche}

{lien}

**2. Épingle Pinterest**

Titre : {a['titre']}
Description : {a['description']} Modèle de budget gratuit à télécharger.
Lien : {lien}

**3. Vidéo courte** (TikTok, Reels, Shorts — 20 à 30 s)

Accroche à l'écran : « {accroche} »
Montre : le tableur ouvert, tu remplis deux lignes, l'écart se calcule.
Fin : « Modèle gratuit, lien en bio. »
""")
    (RACINE / "brouillons-sociaux.md").write_text("\n".join(blocs), encoding="utf-8")


def main():
    tout = "--tout" in sys.argv
    articles = lire_articles(tout)

    if SORTIE.exists():
        shutil.rmtree(SORTIE)
    (SORTIE / "blog").mkdir(parents=True)
    (SORTIE / "telechargements").mkdir()

    shutil.copy(RACINE / "style.css", SORTIE / "style.css")
    source = RACINE / "produits" / "dist" / "gratuit" / GRATUIT["fichier"]
    if not source.exists():
        sys.exit("Modèle gratuit introuvable : lance d'abord  python produits/generer.py")
    shutil.copy(source, SORTIE / "telechargements" / GRATUIT["fichier"])

    (SORTIE / "index.html").write_text(accueil(articles), encoding="utf-8")
    (SORTIE / "mentions-legales.html").write_text(mentions(), encoding="utf-8")
    (SORTIE / "blog" / "index.html").write_text(blog_index(articles), encoding="utf-8")
    for a in articles:
        (SORTIE / "blog" / f"{a['slug']}.html").write_text(page_article(a), encoding="utf-8")

    base = CFG["url"].rstrip("/")
    urls = ["", "blog/index.html"] + [f"blog/{a['slug']}.html" for a in articles]
    plan = "".join(f"<url><loc>{e(base + '/' + u)}</loc></url>" for u in urls)
    (SORTIE / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{plan}</urlset>',
        encoding="utf-8")
    (SORTIE / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n")
    (SORTIE / ".nojekyll").write_text("")

    if "--social" in sys.argv:
        brouillons_sociaux(articles)

    futurs = sum(a["date"] > dt.date.today() for a in lire_articles(True))
    etat = "inclus dans cet aperçu" if tout else "en attente de leur date"
    print(f"Site construit : {len(articles)} article(s), dont {futurs if tout else 0} programmé(s). "
          f"{futurs} article(s) programmé(s) {etat}.")


if __name__ == "__main__":
    main()
