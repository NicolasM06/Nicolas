#!/usr/bin/env python3
"""Refait publication/textes.md à partir des histoires : un bloc de textes par vidéo et par plateforme.

    python outils/textes.py
"""
import json
from pathlib import Path

R = Path(__file__).resolve().parent.parent
out = """# Textes de publication

Un bloc par vidéo. Le fichier vidéo est le même sur toutes les plateformes.
Coche la case « contenu généré ou modifié par IA » là où la plateforme la propose : la voix est une voix de synthèse.

**Crédit à ajouter à la fin de chaque description** (demandé par les licences des voix) :
Voix de synthèse Piper : SIWIS (CC BY 4.0) et UPMC Pierre (CC BY-SA 4.0).
"""
histoires = sorted((R / "histoires").glob("*.json"))
for f in histoires:
    h = json.loads(f.read_text(encoding="utf-8"))
    d = " ".join("#" + t for t in ["histoire", "lesaviezvous"] + h["mots"] + ["cetaitcommentavant"])
    sources = "\n".join("- " + s for s in h["sources"])
    out += f"""
## {h['publication']}

**Fichier** : `sorties/{f.stem}.mp4`

**YouTube Shorts** — titre : {h['publication']} #shorts
Description : {h['accroche']} {d}

**TikTok** — {h['accroche']} {d}

**Instagram Reels** — {h['accroche']} Abonne-toi pour une histoire vraie chaque jour. {d}

**X** — {h['accroche']}

**Sources à garder sous la main si quelqu'un conteste** :
{sources}
"""
out += f"""
## Rythme conseillé

- Une vidéo par jour avec les {len(histoires)} histoires prêtes, puis trois à cinq par semaine.
- Publier vers 18 h en semaine et vers 11 h le week-end, puis ajuster selon les statistiques.
- Répondre aux commentaires de la première heure : c'est ce qui aide le plus une petite chaîne.

## Texte de présentation de la chaîne

Des histoires vraies en une minute. Comment on faisait avant, les mythes qu'on répète, les événements qu'on connaît mal. Chaque fait est vérifié.
"""
(R / "publication" / "textes.md").write_text(out, encoding="utf-8")
print(f"écrit publication/textes.md ({len(histoires)} vidéos)")
