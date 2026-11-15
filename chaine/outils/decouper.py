#!/usr/bin/env python3
"""Découpe une vidéo longue en extraits verticaux (1080 × 1920) pour TikTok, Shorts, Reels et X.

    python outils/decouper.py ma-video.mp4 extraits.json [sous-titres.srt]

extraits.json : [{"debut": "01:20", "fin": "02:35", "titre": "Le bug qui cassait tout"}, ...]
sous-titres.srt (facultatif) : les sous-titres de la vidéo entière, par exemple ceux que
YouTube Studio génère et laisse télécharger. Ils sont recalés et incrustés dans chaque extrait.

Chaque extrait garde tout l'écran visible, au centre, sur un fond flou, avec le titre en haut.
Les fichiers sortent dans le dossier extraits/, sans logo : on publie le même fichier partout.
"""
import json
import re
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

POLICE = "Inter"


def secondes(t):
    t = str(t).replace(",", ".")
    parts = [float(x) for x in t.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0.0)
    return parts[0] * 3600 + parts[1] * 60 + parts[2]


def horodatage(s):
    s = max(0.0, s)
    h, r = divmod(s, 3600)
    m, r = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(r):02d},{int(round((r - int(r)) * 1000)):03d}"


def lire_srt(chemin):
    blocs = []
    for bloc in re.split(r"\n\s*\n", Path(chemin).read_text(encoding="utf-8-sig").strip()):
        lignes = [l for l in bloc.splitlines() if l.strip()]
        temps = next((l for l in lignes if "-->" in l), None)
        if not temps:
            continue
        a, b = [secondes(x.strip()) for x in temps.split("-->")]
        texte = " ".join(lignes[lignes.index(temps) + 1:])
        blocs.append((a, b, texte))
    return blocs


def srt_extrait(blocs, debut, fin, sortie):
    """Garde les sous-titres de l'extrait, recalés à zéro, coupés en lignes courtes pour un écran vertical."""
    n, lignes = 0, []
    for a, b, texte in blocs:
        if b <= debut or a >= fin:
            continue
        n += 1
        court = "\n".join(textwrap.wrap(texte, 26)[:3])
        lignes.append(f"{n}\n{horodatage(max(a, debut) - debut)} --> {horodatage(min(b, fin) - debut)}\n{court}\n")
    Path(sortie).write_text("\n".join(lignes), encoding="utf-8")
    return n


def echapper(chemin):
    return str(chemin).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    video, liste = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    blocs = lire_srt(sys.argv[3]) if len(sys.argv) > 3 else []
    dossier = Path("extraits")
    dossier.mkdir(exist_ok=True)
    for i, e in enumerate(liste, 1):
        debut, fin = secondes(e["debut"]), secondes(e["fin"])
        duree = fin - debut
        if duree <= 0:
            print(f"extrait {i} ignoré : la fin est avant le début")
            continue
        if duree < 61:
            print(f"attention, extrait {i} : {duree:.0f} s. TikTok ne rémunère que les vidéos de plus d'une minute.")
        if duree > 180:
            print(f"attention, extrait {i} : {duree:.0f} s. Les Shorts YouTube sont limités à 3 minutes.")
        nom = re.sub(r"[^a-z0-9]+", "-", e["titre"].lower().encode("ascii", "ignore").decode()).strip("-")[:40] or "extrait"
        sortie = dossier / f"{i:02d}-{nom}.mp4"
        with tempfile.TemporaryDirectory() as tmp:
            titre = Path(tmp) / "titre.txt"
            titre.write_text("\n".join(textwrap.wrap(e["titre"], 22)[:3]), encoding="utf-8")
            filtres = (
                "[0:v]split=2[a][b];"
                "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:4,eq=brightness=-0.25[fond];"
                "[b]scale=1080:-2[avant];"
                "[fond][avant]overlay=(W-w)/2:(H-h)/2[v1];"
                f"[v1]drawtext=font='{POLICE}':textfile='{echapper(titre)}':fontsize=76:fontcolor=white:line_spacing=14:"
                "x=(w-text_w)/2:y=230:box=1:boxcolor=black@0.55:boxborderw=28[v2]"
            )
            derniere = "v2"
            if blocs:
                sous = Path(tmp) / "sous.srt"
                if srt_extrait(blocs, debut, fin, sous):
                    filtres += (f";[v2]subtitles='{echapper(sous)}':force_style='FontName={POLICE},FontSize=15,Bold=1,"
                                "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,"
                                "Alignment=2,MarginV=28'[v3]")
                    derniere = "v3"
            commande = ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{debut}", "-t", f"{duree}", "-i", str(video),
                        "-filter_complex", filtres, "-map", f"[{derniere}]", "-map", "0:a?",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
                        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(sortie)]
            r = subprocess.run(commande, capture_output=True, text=True)
        if r.returncode:
            print(f"extrait {i} : échec\n{r.stderr.strip()[-400:]}")
        else:
            print(f"écrit {sortie} ({duree:.0f} s)")


if __name__ == "__main__":
    main()
