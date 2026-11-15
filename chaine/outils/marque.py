#!/usr/bin/env python3
"""Fabrique l'identité visuelle de la chaîne dans marque/ : photo de profil et bannière.

    python outils/marque.py
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
import video as v  # noqa: E402

M = v.RACINE / "marque"
M.mkdir(exist_ok=True)

# Photo de profil : les deux têtes côte à côte sur fond de nuit, 800 × 800 (lisible en tout petit)
p = Image.new("RGB", (100, 100), (16, 18, 40))
d = ImageDraw.Draw(p)
for y in range(0, 100, 5):
    d.rectangle([0, y, 100, y + 5], fill=(int(16 + 24 * y / 100), int(18 + 12 * y / 100), int(40 + 34 * y / 100)))
d.rectangle([0, 86, 100, 100], fill=(58, 60, 74))
for q, x in (("A", 6), ("B", 50)):
    s = v.perso(q).resize((48, 64), Image.NEAREST)
    if q == "B":
        s = s.transpose(Image.FLIP_LEFT_RIGHT)
    p.paste(s, (x, 26), s)
p.resize((800, 800), Image.NEAREST).save(M / "photo-de-profil.png")

# Bannière YouTube : 2560 × 1440, l'essentiel dans la zone centrale visible sur tous les écrans
b = v.decor().crop((0, 60, 270, 212)).resize((2560, 1440), Image.NEAREST)
d = ImageDraw.Draw(b)
d.rectangle([520, 470, 2040, 970], fill=(12, 16, 40)); d.rectangle([520, 470, 2040, 970], outline=(84, 130, 240), width=12)
f1, f2 = v.police(96), v.police(40)
d.text((1280, 600), "C'ÉTAIT COMMENT", font=f1, fill=v.Bc, anchor="ma")
d.text((1280, 720), "AVANT ?", font=f1, fill=v.J, anchor="ma")
d.text((1280, 870), "DES HISTOIRES VRAIES EN UNE MINUTE", font=f2, fill=(160, 180, 240), anchor="ma")
b.save(M / "banniere-youtube.png")
print("écrit marque/photo-de-profil.png et marque/banniere-youtube.png")
