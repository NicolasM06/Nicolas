# Humour en Stock — designs pour l'impression à la demande

84 designs de texte en français, à déposer sur des plateformes d'impression à la
demande (Spreadshirt, Redbubble, TeePublic…). La plateforme imprime, expédie et
gère le client ; tu touches une commission par vente.

| Collection | Designs |
|---|---|
| Métiers (12 métiers × 4) | 48 |
| Gamer | 12 |
| Humour du quotidien | 12 |
| Noël | 12 |

## Générer

```
node impression/generer.js          # tout
node impression/generer.js noel     # une seule collection ou un seul métier
```

Tout sort dans `impression/sortie/` (non versionné) :

- `designs/` : PNG transparents 4500 × 5400. `-clair` = encre claire, pour vêtements
  foncés ; `-fonce` = encre foncée, pour vêtements clairs.
- `fiches.md` et `fiches.csv` : titre, description et mots-clés de chaque design.
- `pub/` : une image verticale par design pour Pinterest, Instagram, Facebook.
- `pub.md` : titre, texte et hashtags de chaque publication.

## Ajouter des designs

Tout se passe dans `donnees.json`. Trois formes de design :

```json
{"type": "empile", "haut": "Petite ligne", "gros": "La chute en gros", "bas": "Petite ligne"}
{"type": "liste", "lignes": ["Un.", "Deux.", "Trois.", "Chute."]}
{"type": "definition", "mot": "Mot", "genre": "n. m.", "texte": "Définition drôle."}
```

Ajoute-les dans une collection existante, ou crée une collection en copiant un bloc
de `collections`. `boutique` et `lien_boutique` servent aux visuels et textes de pub.

## Règles à respecter

- Aucune marque, aucun personnage, aucun nom de jeu, de film ou de célébrité, aucune
  citation d'un autre : les plateformes suppriment ces designs et ferment les comptes.
- Avant de déposer une phrase, cherche-la sur la plateforme : si elle y est déjà en
  dizaines d'exemplaires, passe à la suivante.
- Dépose à la main, quelques designs par jour. Les dépôts massifs et les robots sont
  interdits par les plateformes.
- Les gains sont à déclarer.

Polices : Anton, Bebas Neue et Archivo Black, sous licence SIL Open Font License
(textes dans `polices/`), qui autorise l'usage commercial.
