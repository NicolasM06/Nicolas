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
p = Image.new("RGB", (100, 100), (58, 24, 32))
d = ImageDraw.Draw(p)
for y in range(0, 86, 5):
    d.rectangle([0, y, 100, y + 5], fill=(int(34 + 30 * y / 86), int(14 + 12 * y / 86), int(20 + 16 * y / 86)))
d.rectangle([4, 4, 95, 80], outline=v.OR, width=3)
d.rectangle([0, 86, 100, 100], fill=(86, 56, 34))
for q, x in (("A", 6), ("B", 50)):
    s = v.perso(q).resize((48, 64), Image.NEAREST)
    if q == "B":
        s = s.transpose(Image.FLIP_LEFT_RIGHT)
    p.paste(s, (x, 26), s)
p.resize((800, 800), Image.NEAREST).save(M / "photo-de-profil.png")

# Bannière YouTube : 2560 × 1440, l'essentiel dans la zone centrale visible sur tous les écrans
b = Image.new("RGB", (2560, 1440), (46, 19, 26))
d = ImageDraw.Draw(b)
for x in range(0, 2560, 72):
    d.rectangle([x, 0, x + 3, 1440], fill=(58, 24, 32))
d.rectangle([500, 450, 2060, 990], fill=v.OR2); d.rectangle([512, 462, 2048, 978], fill=v.OR3); d.rectangle([528, 478, 2032, 962], fill=(18, 26, 30))
f1, f2 = v.police(96), v.police(40)
d.text((1280, 600), "C'ÉTAIT COMMENT", font=f1, fill=v.Bc, anchor="ma")
d.text((1280, 720), "AVANT ?", font=f1, fill=v.J, anchor="ma")
d.text((1280, 870), "DES HISTOIRES VRAIES EN UNE MINUTE", font=f2, fill=v.OR3, anchor="ma")
b.save(M / "banniere-youtube.png")
print("écrit marque/photo-de-profil.png et marque/banniere-youtube.png")
