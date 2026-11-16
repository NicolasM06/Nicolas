# « C'était comment avant ? » — la chaîne

Des histoires vraies d'une minute, racontées par deux personnages en pixels devant un
tableau, dans un musée : comment on faisait avant, les mythes démontés, les grands événements.

Le nom est provisoire : vérifie qu'il est libre sur chaque plateforme avant de créer les comptes.

## Fabriquer une vidéo

```
python outils/video.py histoires/napoleon.json     # sort sorties/napoleon.mp4
```

La vidéo est verticale (1080 × 1920), d'une minute environ, prête pour TikTok, YouTube
Shorts, Instagram Reels et X. Le même fichier se publie partout : il ne porte aucun logo.

### Écrire une histoire

Un fichier par histoire dans `histoires/`. Chaque réplique indique qui parle (`A`, la
curieuse, ou `B`, le conteur), le texte dit, et parfois ce que le panneau affiche :

```json
{"qui": "B", "texte": "Il mesurait environ un mètre soixante-huit.", "ecran": "1 m 68", "image": "regle"}
```

Les dessins disponibles sont listés dans `outils/video.py` (`DESSINS`). Pour en ajouter
un, il suffit d'une liste de rectangles sur une grille de 20 × 16.

### La voix

Deux voix françaises libres (Piper), une par personnage. À télécharger une fois, environ 140 Mo :

```
pip install piper-tts
sh outils/voix.sh
```

| Personnage | Voix | Licence des données |
|---|---|---|
| La curieuse | SIWIS | CC BY 4.0 |
| Le conteur | UPMC « Pierre » | CC BY-SA 4.0 |

Ces licences autorisent l'usage commercial à condition de créditer les auteurs. La ligne de
crédit à coller dans la description de chaque vidéo est dans `publication/textes.md`.
Une troisième voix (« Tom ») a été écartée : sa licence est incertaine pour un usage commercial.

#### Utiliser une autre voix

Pour la voix d'un autre outil (CapCut, ElevenLabs…) ou la tienne :

1. `python outils/repliques.py` écrit dans `publication/repliques/` la liste numérotée des
   répliques de chaque histoire, avec le personnage qui parle.
2. Fais dire chaque réplique dans l'outil choisi et exporte un fichier par réplique.
3. Pose-les dans `enregistrements/<nom de l'histoire>/` sous les noms `01.mp3`, `02.mp3`, etc.
4. Relance `python outils/video.py histoires/<nom>.json` : la bouche et les sous-titres se
   calent sur tes fichiers. Une réplique sans fichier garde la voix libre.

N'utilise que des voix auxquelles tu as droit : celles d'un catalogue, ou la tienne. Jamais une
voix copiée sur la vidéo de quelqu'un d'autre.

Sans ces fichiers, la vidéo sort avec la voix de secours du système, robotique : ne publie
rien avec elle. L'outil signale aussi toute vidéo de moins de 61 secondes, que TikTok ne rémunère pas.

## Les règles qui protègent la monétisation

1. **Que du vrai.** Chaque fait est vérifié, et les sources sont notées dans le fichier de
   l'histoire (`sources`). Un fait non confirmé sort du texte.
2. **Pas de production à la chaîne.** Les plateformes ne rémunèrent pas les vidéos
   répétitives fabriquées en masse. Trois à cinq bonnes histoires par semaine, pas trente.
3. **Rien qui appartienne à quelqu'un d'autre.** Personnages, dessins et textes sont
   originaux. Pas de héros de manga, de film ou de jeu, pas de musique protégée.
4. **Déclarer la voix de synthèse** là où la plateforme le demande au moment de publier.

## Ce qu'il faut atteindre pour être payé

À confirmer dans le centre d'aide de chaque plateforme, les seuils changent :

| Plateforme | Seuil |
|---|---|
| YouTube Shorts | 1 000 abonnés et 10 millions de vues en 90 jours |
| YouTube, vidéos longues | 1 000 abonnés et 4 000 heures de visionnage en 12 mois |
| TikTok | 18 ans, 10 000 abonnés, 100 000 vues en 30 jours, vidéos de plus d'une minute |
| X | programme sur candidature, critères à vérifier |
| Instagram | pas de rémunération directe ouverte à tous en France |

Les vidéos courtes rapportent peu par vue. Pour viser les 4 000 heures de YouTube, il
faudra aussi des vidéos longues : par exemple une compilation de dix histoires par mois.

## Pour démarrer

- [ ] Choisir le nom définitif et vérifier qu'il est libre.
- [ ] Créer les comptes YouTube, TikTok, Instagram et X avec la même adresse et le même nom.
- [ ] Installer une vraie voix, refaire les vidéos, les regarder en entier.
- [ ] Publier une vidéo par jour pendant deux semaines avec les histoires déjà prêtes.
- [ ] Regarder chaque semaine lesquelles sont vues jusqu'au bout, et écrire les suivantes
      sur ces sujets-là.

## Les histoires prêtes

| Fichier | Sujet |
|---|---|
| `reveils.json` | Comment on se réveillait avant les réveils |
| `napoleon.json` | Napoléon était-il vraiment petit ? |
| `vikings.json` | Les casques à cornes des Vikings |
| `krach-1929.json` | Le krach de 1929 |
| `telegraphe-chappe.json` | Le télégraphe de Chappe, avant le téléphone |
| `terre-plate.json` | La Terre plate au Moyen Âge, un mythe de 1828 |
| `glace-avant-les-frigos.json` | Le commerce de la glace avant les congélateurs |
| `carottes-et-vue.json` | Les carottes et la vue, une propagande de 1940 |
| `dix-pour-cent-du-cerveau.json` | Le mythe des 10 % du cerveau |
| `allumeurs-de-reverberes.json` | Les allumeurs de réverbères, avant l'électricité |

## Le reste du dossier

- `outils/decouper.py` : découpe une vidéo longue en extraits verticaux sous-titrés. Testé sur une vidéo d'essai.
- `outils/marque.py` : refait la photo de profil et la bannière (`marque/`).
- `publication/textes.md` : titres, descriptions et mots-clés de chaque vidéo, plateforme par plateforme (refait par `outils/textes.py`).
- `ebauche-berthier/` : un premier plan de chaîne centré sur l'appli Berthier, mis de côté.
