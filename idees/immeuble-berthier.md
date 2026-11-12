# Idée : l'immeuble Berthier

Note du 12 novembre 2026. Idée à garder pour plus tard, **pas à construire maintenant**.

## L'idée de départ

Présenter l'appli comme un immeuble. Chaque étage a son personnage et son domaine.
L'utilisateur arrive dans un hall simple et ne monte que là où il a besoin.

Le but : garder beaucoup de fonctions sans que l'appli paraisse surchargée. C'est la
réponse au problème « Berthier (ex-Ariane) faisait trop de choses » qui a mené au
recentrage sur les créateurs de marchés.

## Version retenue : l'immeuble est le site, chaque personnage est une appli

Deuxième version de l'idée, préférée à la première parce qu'elle évite de tout
remettre dans un seul produit.

- **L'immeuble est le site de présentation**, pas un écran de l'appli. On y voit les
  étages et les personnages. C'est une page simple.
- **Chaque personnage est une appli séparée.** Berthier reste tel quel, centré sur
  les marchés. L'informaticien serait une autre appli (créateur de site), etc.
- Chaque appli reste petite, et on peut n'en utiliser qu'une.
- Le code des futures applis existe déjà, masqué dans Berthier : le moment venu, on
  le sort dans son propre fichier plutôt que de le réactiver dans Berthier.

À surveiller :

- Chaque appli est un produit entier à finir, maintenir et faire connaître. Une à la
  fois, et seulement quand la précédente a des utilisateurs.
- Le partage de données et de compte entre applis (ex. factures à partir des ventes)
  ramène de la complexité. Les garder indépendantes au début.

Première étape possible, peu coûteuse : transformer la page de présentation actuelle
en hall d'immeuble. Berthier ouvert, les autres étages en « Bientôt » avec un bouton
« Préviens-moi » pour mesurer l'intérêt.

Une maquette cliquable de ce hall est dans `idees/maquette-immeuble/index.html`
(noms des personnages provisoires, rien n'est branché).

## Les étages envisagés

| Étage | Personnage | Ce qu'il gère | État du code dans `ariane-app` |
|---|---|---|---|
| Rez-de-chaussée | Berthier, le comptable | Ventes, stock, marchés, dépenses, bilan | En ligne |
| 1er | L'informaticien | Créateur de site, paiements en ligne | Codé, masqué |
| 2e | Le juriste | Mentions légales, CGV, démarches de micro-entreprise | À faire |
| 3e | La commerciale | Clients, commandes, factures | Codé, masqué |
| 4e | La secrétaire | Calendrier des marchés, rappels | Codé, masqué |

Les pages masquées le sont par le bloc « Recentrage créateurs sur les marchés » à la
fin de `index.html` : une page se réactive en la retirant de la liste `REDIRECT`.

Les personnages seraient dans le même style pixel que Berthier
(`outils/mascotte/` dans `ariane-app`).

## Pourquoi ne pas le faire maintenant

- Ça rend tout plus complexe : un écran de plus, des personnages à dessiner, une
  navigation à repenser sur téléphone, du code en plus dans un fichier déjà très gros.
- Il n'y a pas encore de testeurs pour dire ce qui manque.
- Ouvrir tous les étages d'un coup ramènerait à l'appli surchargée d'avant.

## Si on le fait un jour

1. Un seul étage ouvert au départ (Berthier). Les autres visibles, marqués « Bientôt ».
2. Un bouton « Ça m'intéresse » sur les étages fermés, et on compte les clics.
3. On ouvre d'abord l'étage le plus demandé.
4. Le juriste ne donne pas de conseil juridique : information générale, modèles,
   listes de démarches, renvoi vers les sites officiels.

## En attendant

Version minuscule pour mesurer l'intérêt sans rien compliquer : une question dans le
formulaire testeur, « Qu'est-ce qui te manquerait ? Un site, des factures, un
calendrier, de l'aide sur les démarches ».

La priorité reste de trouver des testeurs sur les marchés de Noël.
