# Annonces Etsy — à copier-coller

Les descriptions des trois premiers produits restent celles de `fiches-produits.md`. Ce fichier ajoute ce qu'Etsy demande
en plus : un titre écrit pour la recherche et 13 mots-clés par annonce.

Limites prises en compte, à vérifier dans le formulaire d'Etsy : titre de 140 caractères au
maximum, 13 mots-clés de 20 caractères au maximum chacun.

## Réglages communs à toutes les annonces

- **Type** : article numérique, téléchargement immédiat.
- **Catégorie** : Papeterie et fournitures → Modèles → Modèles de planification (ou la plus
  proche proposée).
- **Qui l'a créé** : moi. **Quand** : fabriqué sur commande ou année en cours.
- **Quantité** : 999. **Renouvellement** : automatique.
- **Photos** : l'image de couverture en premier, puis les aperçus de chaque onglet, déjà
  prêts dans `vente/visuels/etsy/` (4 pour le budget annuel, 3 pour l'épargne ; mets les
  7 sur le pack). Pour les refaire : `python outils/apercus.py`.
- **Année** : les fichiers générés à partir d'octobre sont réglés sur l'année suivante
  (2027). L'acheteur peut la changer dans l'onglet Paramètres. Chaque automne, régénère les
  fichiers et remplace « 2027 » dans le titre et les mots-clés.
- **Fichier** : si Etsy refuse le `.xlsx`, dépose-le dans un `.zip`.
- **À ajouter en fin de description** : « Fichier numérique : aucun objet ne sera envoyé.
  En raison de la nature du produit, pas de retour ni de remboursement une fois le fichier
  téléchargé. Une question ? Écris-moi par la messagerie Etsy. »
- **Message après achat** : celui de `fiches-produits.md`, en remplaçant « Réponds à cet
  e-mail » par « Écris-moi par la messagerie Etsy ».

## 1. Budget annuel complet — 9 €

**Titre**

```
Tableur budget 2027 Excel et Google Sheets en français, budget annuel, suivi des dépenses, tableau de bord, méthode 50/30/20
```

**Mots-clés**

```
budget excel
budget google sheets
tableur budget
suivi dépenses
budget mensuel
budget annuel
gestion budget
budget familial
modèle budget
finances perso
méthode 50 30 20
budget 2027
planificateur budget
```

**Fichier** : `produits/dist/payant/budget-annuel-complet.xlsx`
**Image** : `vente/visuels/budget-annuel-complet.png`

## 2. Objectifs d'épargne — 7 €

**Titre**

```
Tableur objectifs d'épargne Excel et Google Sheets en français, suivi épargne, barre de progression, fonds d'urgence
```

**Mots-clés**

```
suivi épargne
objectif épargne
tableur épargne
épargne excel
épargne sheets
fonds d'urgence
défi épargne
plan épargne
épargne vacances
apport immobilier
finances perso
modèle épargne
tracker épargne
```

**Fichier** : `produits/dist/payant/objectifs-epargne.xlsx`
**Image** : `vente/visuels/objectifs-epargne.png`

## 3. Pack complet — 13 €

**Titre**

```
Pack budget et épargne Excel et Google Sheets en français : tableur budget annuel et suivi des objectifs d'épargne
```

**Mots-clés**

```
pack budget
budget excel
budget google sheets
tableur budget
suivi épargne
suivi dépenses
gestion budget
budget annuel
objectif épargne
finances perso
kit budget
modèle budget
planificateur budget
```

**Fichier** : `produits/dist/payant/pack-complet.zip`
**Image** : `vente/visuels/pack-complet.png`

## 4. Remboursement de dettes — 7 €

Nouveau produit, vendu seulement sur Etsy pour l'instant (pas encore sur le site ni dans le pack).

**Titre**

```
Tableur remboursement de dettes Excel et Google Sheets en français, suivi des crédits, progression et durée restante
```

**Mots-clés**

```
remboursement dettes
suivi dettes
suivi crédit
tableur dettes
dettes excel
dettes google sheets
plan remboursement
sortir des dettes
crédit conso
prêt étudiant
finances perso
gestion budget
tracker dettes
```

**Description**

```
Crédit auto, prêt étudiant, découvert : vois enfin ce qu'il te reste à rembourser, et dans combien de temps ce sera fini.

Remboursement de dettes est un tableur en français pour suivre tous tes crédits au même endroit, sans application ni abonnement.

Ce que tu obtiens :

- Jusqu'à 8 dettes ou crédits suivis en même temps.
- Le total qu'il te reste à rembourser, mis à jour à chaque paiement.
- Une barre de progression pour chaque dette.
- Le nombre de mois restants, estimé à partir de ta mensualité et du taux.
- Un journal des remboursements avec liste déroulante.
- Un mode d'emploi pas à pas, dans le fichier.

Compatible Excel, Google Sheets et LibreOffice. Aucune macro. Le fichier reste chez toi : rien n'est connecté à ta banque.

La durée affichée est une estimation : seul l'échéancier de ta banque fait foi. Ce tableur est un outil de suivi, pas un conseil financier.

Paiement unique, téléchargement immédiat.
```

**Fichier** : `produits/dist/payant/remboursement-dettes.xlsx`
**Images** : `vente/visuels/etsy/remboursement-dettes-2.png` en premier (l'onglet Dettes), puis les deux autres.

## Profil de la boutique

- **Nom de boutique** : BudgetClair (Etsy n'accepte pas les espaces ; vérifie qu'il est libre).
- **Titre de boutique** : Tableurs de budget en français pour Excel et Google Sheets
- **Annonce de boutique** : Des tableurs simples pour reprendre la main sur ton argent. Fichiers
  prêts à remplir, sans macro, sans abonnement, téléchargement immédiat.

## Après la mise en ligne

1. Colle le lien de chaque annonce dans `config.json` (`lien_achat`).
2. Note dans `plan/journal.md` la date de mise en ligne.
3. Au bout de 30 jours, relève les vues et les visites de chaque annonce dans les statistiques
   Etsy et donne-les-moi : je réécris les titres et les mots-clés des annonces qui ne sont
   pas vues.
