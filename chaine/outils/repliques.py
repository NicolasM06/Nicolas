#!/usr/bin/env python3
"""Écrit, pour chaque histoire, la liste numérotée des répliques à faire dire par la voix de ton choix.

    python outils/repliques.py

Résultat dans publication/repliques/<histoire>.txt. Enregistre chaque réplique dans un fichier
portant son numéro (01.mp3, 02.mp3…) et pose-les dans enregistrements/<histoire>/.
"""
import json
import sys
from pathlib import Path

R = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
import video  # noqa: E402

(R / "publication" / "repliques").mkdir(parents=True, exist_ok=True)
NOMS = {"A": "la curieuse (voix jeune, vive)", "B": "le conteur (voix posée)"}
for f in sorted((R / "histoires").glob("*.json")):
    h = json.loads(f.read_text(encoding="utf-8"))
    scenes = h["scenes"] + ([] if h.get("sans_fin") else [video.FIN])
    lignes = [f"{h['publication']}", "", f"Fichiers à poser dans : enregistrements/{f.stem}/", ""]
    for i, s in enumerate(scenes, 1):
        lignes += [f"{i:02d}  [{NOMS[s['qui']]}]", f"    {s['texte']}", ""]
    (R / "publication" / "repliques" / f"{f.stem}.txt").write_text("\n".join(lignes), encoding="utf-8")
    print(f"écrit publication/repliques/{f.stem}.txt ({len(scenes)} répliques)")
