#!/usr/bin/env python3
"""Fabrique une fiche par vidéo dans videos/ à partir de videos.json.

    python outils/fiches.py

Chaque fiche contient le titre, l'accroche, le plan, la description YouTube
et les textes des extraits pour TikTok, Shorts, Reels et X.
"""
import json
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
VIDEOS = json.loads((RACINE / "videos.json").read_text(encoding="utf-8"))
CHAINE = "Le Labo Berthier"


def dieses(mots):
    return " ".join("#" + "".join(c for c in m.title() if c.isalnum()) for m in mots[:4])


for v in VIDEOS:
    plan = "\n".join(f"{i}. {p}" for i, p in enumerate(v["plan"], 1))
    chapitres = "\n".join(f"00:00 {p}" for p in v["plan"])
    extraits = ""
    for i, e in enumerate(v["extraits"], 1):
        extraits += f"""
### Extrait {i} : {e}

- **Durée visée** : 60 à 90 secondes (TikTok ne rémunère que les vidéos de plus d'une minute).
- **Texte à l'écran, première seconde** : {e}
- **Légende TikTok / Reels / Shorts** : {e}. La vidéo complète est sur la chaîne. {dieses(v['mots'])}
- **Texte pour X** : {e}. J'explique tout dans la vidéo : [lien YouTube]
"""
    fiche = f"""# Vidéo {v['n']} — {v['titre']}

## Ce que la vidéo promet

{v['promesse']}

## Accroche (les 20 premières secondes, à dire telles quelles)

> {v['accroche']}

## Plan

{plan}

**Durée visée** : 8 à 12 minutes. **Fin** : une question précise posée aux spectateurs, et l'annonce de la vidéo suivante.

## À l'enregistrement

- Écran en 1920 × 1080, police agrandie, notifications coupées.
- Une idée par séquence : tu peux enregistrer chaque point du plan séparément.
- Montre d'abord le résultat, explique ensuite.
- Si quelque chose rate en direct, garde-le : c'est ce qui rend la vidéo crédible.

## Pour YouTube

**Titre** : {v['titre']}

**Miniature** : `miniatures/{v['n']:02d}-{v['slug']}.png`

**Description**

{v['promesse']}

Dans cette vidéo :
{chapitres}

(Remplace les 00:00 par les vrais minutages : YouTube en fait des chapitres.)

{CHAINE} : je construis des applis avec l'IA et je montre ce qui marche comme ce qui rate.

**Mots-clés** : {", ".join(v['mots'])}

## Les extraits courts
{extraits}
## Avant de publier

- [ ] Le titre tient sa promesse dans les deux premières minutes.
- [ ] Aucune information personnelle visible à l'écran (e-mail, adresse, onglets ouverts).
- [ ] Les minutages de la description sont remplis.
- [ ] Les extraits sont exportés depuis le fichier d'origine, sans logo d'une autre plateforme.
"""
    (RACINE / "videos" / f"{v['n']:02d}-{v['slug']}.md").write_text(fiche, encoding="utf-8")
    print("écrit", f"videos/{v['n']:02d}-{v['slug']}.md")
