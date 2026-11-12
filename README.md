# Budget Clair — boutique de modèles de budget

Un petit business de produits numériques, à 0 € de frais fixes : des tableurs de
budget en français (Excel / Google Sheets), vendus depuis un site statique.

## Ce qui est automatique, ce qui ne l'est pas

| Automatique | À faire toi-même |
|---|---|
| Génération des tableurs (`produits/generer.py`) | Créer le compte vendeur et y déposer les fichiers (une fois) |
| Construction et mise en ligne du site (GitHub Actions) | Écrire ou relire les articles (par lots, 1 à 2 h par mois) |
| Publication des articles à leur date, chaque matin | Publier sur les réseaux (brouillons fournis) |
| Paiement et envoi du fichier à l'acheteur (plateforme de vente) | Répondre aux e-mails des clients |

## Mise en route

1. **Activer le site** : sur GitHub, *Settings → Pages → Source : GitHub Actions*.
   Le workflow `Publier le site` se lance à chaque push sur `main` et chaque matin.
2. **Générer les produits** :
   ```
   pip install -r requirements.txt
   python produits/generer.py
   ```
   Les fichiers payants sont dans `produits/dist/payant/` (jamais mis en ligne par le site).
3. **Ouvrir une boutique** sur une plateforme sans abonnement qui encaisse, livre le
   fichier et gère la TVA à ta place (Gumroad, Lemon Squeezy, Payhip… compare leurs
   commissions actuelles). Crée les trois produits en copiant `vente/fiches-produits.md` :
   textes, prix, fichiers et images de couverture (`vente/visuels/`) y sont prêts.
4. **Coller les liens de paiement** dans `config.json` (`lien_achat`). Tant qu'un lien
   est vide, le bouton affiche « Bientôt disponible ».
5. **Compléter les mentions légales** dans `config.json`, et corriger `url` si le site
   n'est pas à l'adresse par défaut.

Avant d'encaisser : en France, vendre régulièrement demande un statut (la
micro-entreprise se crée gratuitement en ligne) et la déclaration du chiffre
d'affaires. Vérifie les règles en vigueur sur les sites officiels.

## Publication automatique sur Pinterest

Le site expose un flux RSS (`flux.xml`) avec une image verticale par article.
À faire une seule fois : créer un compte Pinterest professionnel (gratuit), revendiquer
le site, puis dans les paramètres chercher la publication automatique depuis un flux
RSS et y coller `https://…/flux.xml`. Chaque article mis en ligne devient alors une
épingle sans intervention. (Vérifie dans Pinterest que l'option existe toujours.)

Après avoir ajouté des articles : `node outils/epingles.js` crée les images manquantes
dans `images/epingles/` ; committe-les avec les articles.

## Routine (1 à 2 h par semaine)

- **Une fois par mois** : écrire 4 articles dans `contenu/articles/`, chacun avec une
  date future. Ils se publient seuls.
- **Chaque semaine** : `python build.py --social` crée `brouillons-sociaux.md` avec,
  pour chaque article en ligne, un post, une épingle Pinterest et un script de vidéo courte.
- **Chaque trimestre** : ajouter un modèle (copier une fonction dans
  `produits/generer.py`, ajouter le produit dans `config.json`).

### Format d'un article

```
---
titre: Mon titre
description: Une phrase pour Google et la liste du blog.
accroche: Une phrase pour les réseaux sociaux.
date: 2026-12-03
---

Texte en Markdown.
```

## Commandes

```
python produits/generer.py   # crée les tableurs
python build.py              # construit le site dans _site/ (état du jour)
python build.py --tout       # aperçu avec les articles programmés
node outils/visuels.js       # refait les images de couverture (vente/visuels/)
python -m http.server -d _site 8000   # voir le site sur http://localhost:8000
```

## À savoir

- Le nom « Budget Clair » est provisoire : vérifie qu'il est libre (marque, domaine)
  ou change-le dans `config.json`.
- Si ce dépôt est public, le code qui génère les modèles payants est visible. Pour
  l'éviter, déplace `produits/` dans un dépôt privé et ne garde ici que le modèle gratuit.
- Les revenus ne sont pas garantis : sans trafic, pas de ventes. Le levier principal
  est la régularité des articles et des publications.
