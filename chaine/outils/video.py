#!/usr/bin/env python3
"""Fabrique une vidéo verticale en pixels : deux personnages discutent dans un musée, devant un tableau qui illustre.

    python outils/video.py histoires/reveils.json

Une histoire est une liste de répliques. Chaque réplique a :
    "qui"    "A" (la curieuse, à gauche) ou "B" (le conteur, à droite),
    "texte"  ce qui est dit,
    "ecran"  les mots affichés en grand sur le panneau (facultatif : sinon le panneau ne change pas),
    "image"  le nom d'un dessin (voir DESSINS).

Tout est dessiné sur une petite grille de 270 × 480, agrandie quatre fois : c'est ce qui donne le grain « pixel ».

La voix : deux voix libres Piper, à télécharger une fois avec outils/voix.sh.
Sans elles, la voix de secours du système (espeak-ng) sert seulement à régler le rythme.
"""
import json
import random
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RACINE = Path(__file__).resolve().parent.parent
IPS, L, H, ZOOM = 25, 270, 480, 4
PAUSE = 0.34          # respiration entre deux répliques, en secondes
FIN = {"qui": "B", "texte": "Abonne-toi : une histoire vraie chaque jour.", "ecran": "Abonne-toi", "image": "livre"}
POLICE = str(RACINE.parent / "impression" / "polices" / "PressStart2P-Regular.ttf")


def police(taille):
    try:
        return ImageFont.truetype(POLICE, taille)
    except OSError:
        return ImageFont.load_default(taille)


# ── Les deux personnages, sur une grille de 24 × 32 ─────────────────────────
COMMUN = {"K": (22, 23, 26), "E": (22, 23, 26), "W": (242, 243, 245), "m": (150, 78, 70), "L": (110, 30, 36),
          "P": (42, 44, 50), "G": (22, 23, 26), "g": (230, 238, 252)}
LOOKS = {
    "A": {"S": (240, 200, 168), "s": (212, 164, 130), "H": (150, 84, 40), "h": (190, 118, 62), "T": (232, 112, 58), "t": (194, 86, 42),
          "A": (62, 207, 142), "a": (42, 157, 105), "B": (60, 64, 76), "b": (44, 46, 54)},
    "B": {"S": (236, 190, 152), "s": (203, 152, 116), "H": (92, 60, 40), "h": (128, 88, 60), "T": (38, 70, 110), "t": (27, 50, 82),
          "A": (255, 197, 49), "a": (201, 150, 26), "B": (120, 74, 40), "b": (88, 52, 28)},
}


def perso(qui, bouche=0, yeux=True):
    """bouche : 0 fermée, 1 entrouverte, 2 ouverte."""
    Lg, Hg = 24, 32
    g = [["."] * Lg for _ in range(Hg)]

    def r(x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                g[y][x] = c

    r(6, 2, 17, 11, "S"); r(5, 6, 5, 7, "S"); r(18, 6, 18, 7, "S"); r(7, 11, 16, 11, "s"); r(10, 12, 13, 12, "s")
    if qui == "A":      # la curieuse : queue de cheval, sweat orange, sac à dos
        r(6, 0, 17, 2, "H"); r(5, 2, 6, 6, "H"); r(17, 2, 18, 5, "H"); r(7, 3, 9, 3, "H"); r(9, 0, 13, 0, "h")
        r(19, 3, 21, 5, "H"); r(20, 6, 21, 10, "H"); g[11][21] = "H"
        r(8, 5, 9, 5, "H"); r(14, 5, 15, 5, "H")
    else:               # le conteur : casquette, lunettes rondes, moustache, écharpe, livre
        r(5, 0, 18, 2, "T"); r(4, 3, 14, 3, "t"); r(6, 0, 17, 0, "t"); r(6, 4, 6, 6, "H"); r(17, 3, 17, 6, "H")
        r(7, 6, 10, 6, "G"); r(13, 6, 16, 6, "G"); r(11, 6, 12, 6, "G"); r(7, 7, 10, 7, "g"); r(13, 7, 16, 7, "g")
    if yeux:
        g[7][9] = "E"; g[7][14] = "E"
    else:
        r(8, 7, 9, 7, "s"); r(14, 7, 15, 7, "s")
    g[8][11] = "s"; g[8][12] = "s"
    if qui == "B":
        r(8, 9, 15, 9, "H"); g[9][11] = "S"; g[9][12] = "S"
    if bouche == 0:
        r(10, 10, 13, 10, "m")
    elif bouche == 1:
        r(10, 10, 13, 10, "L")
    else:
        r(10, 10, 13, 11, "L"); r(11, 11, 12, 11, "m")
    r(5, 13, 18, 24, "T"); r(5, 14, 5, 24, "t"); r(18, 14, 18, 24, "t"); r(3, 14, 4, 22, "T"); r(19, 14, 20, 22, "T")
    r(3, 23, 4, 23, "S"); r(19, 23, 20, 23, "S")
    if qui == "A":
        r(8, 13, 15, 13, "t"); g[14][10] = "W"; g[15][10] = "W"; g[14][13] = "W"; g[15][13] = "W"; r(8, 20, 15, 22, "t")
        r(6, 13, 7, 19, "B"); r(16, 13, 17, 19, "B")
    else:
        r(8, 13, 15, 14, "A"); r(9, 15, 10, 19, "A"); r(9, 20, 10, 20, "a"); r(8, 13, 15, 13, "a")
        r(12, 17, 20, 24, "B"); r(12, 17, 12, 24, "b"); r(14, 19, 18, 19, "A"); r(14, 21, 17, 21, "A")
    r(6, 25, 17, 28, "P"); r(11, 27, 12, 28, "."); r(6, 29, 10, 29, "P"); r(13, 29, 17, 29, "P")
    r(5, 30, 10, 30, "K"); r(13, 30, 18, 30, "K")
    plein = [[c != "." for c in ligne] for ligne in g]
    for y in range(Hg):
        for x in range(Lg):
            if g[y][x] == "." and any(0 <= y + dy < Hg and 0 <= x + dx < Lg and plein[y + dy][x + dx]
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                g[y][x] = "K"
    pal = {**COMMUN, **LOOKS[qui]}
    img = Image.new("RGBA", (Lg, Hg), (0, 0, 0, 0))
    for y in range(Hg):
        for x in range(Lg):
            if g[y][x] != ".":
                img.putpixel((x, y), pal[g[y][x]] + (255,))
    return img


# ── Les dessins du panneau : des rectangles sur une grille de 20 × 16 ───────
J, R, V, Bl, Br, Gr, Nt, Bc = (255, 197, 49), (217, 72, 72), (62, 207, 142), (79, 140, 255), (120, 74, 40), (120, 126, 136), (22, 26, 40), (242, 243, 245)
DESSINS = {
    "question": [(7, 1, 6, 2, J), (12, 3, 2, 4, J), (9, 7, 4, 2, J), (9, 9, 2, 2, J), (9, 13, 2, 2, J), (5, 3, 2, 2, J)],
    "usine": [(1, 8, 18, 7, Gr), (2, 3, 3, 5, Gr), (7, 5, 3, 3, Gr), (3, 10, 2, 2, J), (7, 10, 2, 2, J), (11, 10, 2, 2, J), (15, 10, 2, 2, J),
              (2, 1, 2, 1, Bc), (4, 0, 2, 1, Bc), (7, 3, 2, 1, Bc)],
    "fenetre": [(5, 1, 12, 14, Br), (6, 2, 10, 12, Nt), (10, 2, 2, 12, Br), (6, 7, 10, 2, Br), (13, 3, 2, 2, J), (7, 4, 1, 1, Bc), (8, 10, 1, 1, Bc), (0, 12, 6, 1, J), (1, 11, 1, 1, J)],
    "pois": [(1, 9, 9, 2, Br), (10, 9, 1, 2, J), (12, 8, 1, 1, V), (14, 6, 1, 1, V), (16, 4, 1, 1, V), (18, 2, 2, 12, Bl), (17, 5, 1, 1, Bc)],
    "pieces": [(3, 9, 7, 5, J), (4, 8, 5, 1, J), (5, 10, 3, 3, (201, 150, 26)), (10, 6, 7, 5, J), (11, 5, 5, 1, J), (12, 7, 3, 3, (201, 150, 26))],
    "coq": [(8, 5, 6, 6, Bc), (12, 2, 4, 5, Bc), (13, 0, 3, 2, R), (16, 4, 2, 1, J), (14, 3, 1, 1, Nt), (15, 6, 1, 2, R), (4, 3, 4, 6, R), (9, 11, 1, 3, J), (12, 11, 1, 3, J), (8, 14, 3, 1, J), (11, 14, 3, 1, J)],
    "reveil": [(5, 4, 10, 10, R), (6, 5, 8, 8, Bc), (10, 6, 1, 4, Nt), (10, 9, 3, 1, Nt), (4, 2, 4, 2, Gr), (12, 2, 4, 2, Gr), (9, 1, 2, 1, Gr), (5, 14, 2, 1, Gr), (13, 14, 2, 1, Gr)],
    "calendrier": [(3, 2, 14, 12, Bc), (3, 2, 14, 3, R), (5, 7, 2, 2, Gr), (9, 7, 2, 2, Gr), (13, 7, 2, 2, Gr), (5, 10, 2, 2, Gr), (9, 10, 2, 2, Bl), (13, 10, 2, 2, Gr), (6, 1, 1, 2, Gr), (13, 1, 1, 2, Gr)],
    "lit": [(1, 9, 18, 3, Bl), (1, 6, 2, 8, Br), (17, 8, 2, 6, Br), (3, 7, 4, 2, Bc), (12, 2, 1, 1, Bc), (14, 1, 2, 1, Bc), (15, 3, 3, 1, Bc), (16, 2, 1, 1, Bc)],
    "chapeau": [(3, 8, 14, 4, Nt), (5, 5, 10, 3, Nt), (7, 3, 6, 2, Nt), (1, 10, 2, 2, Nt), (17, 10, 2, 2, Nt), (9, 6, 2, 2, J), (4, 12, 12, 1, J)],
    "regle": [(2, 6, 16, 4, J), (3, 6, 1, 2, Nt), (5, 6, 1, 1, Nt), (7, 6, 1, 2, Nt), (9, 6, 1, 1, Nt), (11, 6, 1, 2, Nt), (13, 6, 1, 1, Nt), (15, 6, 1, 2, Nt), (2, 12, 16, 1, Bc), (2, 11, 1, 3, Bc), (17, 11, 1, 3, Bc)],
    "crayon": [(3, 12, 2, 2, Nt), (5, 10, 2, 2, Br), (7, 8, 2, 2, J), (9, 6, 2, 2, J), (11, 4, 2, 2, J), (13, 2, 3, 3, R), (2, 14, 6, 1, Gr), (10, 13, 7, 1, Gr), (12, 11, 5, 1, Gr)],
    "soldat": [(8, 0, 4, 4, Nt), (8, 4, 4, 3, (236, 190, 152)), (7, 7, 6, 6, Bl), (9, 7, 2, 6, Bc), (7, 13, 2, 3, Bc), (11, 13, 2, 3, Bc), (5, 8, 2, 4, Bl), (13, 8, 2, 4, Bl), (15, 2, 1, 12, Gr)],
    "casque": [(5, 4, 10, 7, Gr), (6, 3, 8, 1, Gr), (4, 10, 12, 2, (90, 96, 106)), (9, 9, 2, 5, (90, 96, 106)), (6, 12, 3, 2, Nt), (11, 12, 3, 2, Nt)],
    "cornes": [(5, 5, 10, 7, Gr), (6, 4, 8, 1, Gr), (4, 11, 12, 2, (90, 96, 106)), (2, 4, 3, 3, Bc), (1, 1, 2, 3, Bc), (15, 4, 3, 3, Bc), (17, 1, 2, 3, Bc), (9, 10, 2, 4, (90, 96, 106))],
    "opera": [(2, 2, 16, 12, R), (4, 4, 12, 10, Nt), (2, 2, 4, 12, (150, 40, 40)), (14, 2, 4, 12, (150, 40, 40)), (9, 7, 2, 4, J), (8, 11, 4, 3, J), (10, 5, 1, 2, (236, 190, 152)), (1, 14, 18, 1, Br)],
    "pelle": [(9, 1, 2, 9, Br), (7, 10, 6, 4, Gr), (8, 14, 4, 1, Gr), (8, 0, 4, 1, Br), (2, 13, 4, 2, Br), (14, 12, 4, 3, Br)],
    "baisse": [(2, 1, 1, 13, Bc), (2, 13, 16, 1, Bc), (4, 3, 3, 1, V), (7, 4, 2, 1, V), (9, 5, 1, 3, R), (10, 8, 2, 1, R), (12, 9, 1, 3, R), (13, 11, 3, 1, R), (16, 11, 1, 2, R)],
    "hausse": [(2, 1, 1, 13, Bc), (2, 13, 16, 1, Bc), (4, 11, 3, 1, V), (7, 9, 2, 2, V), (9, 7, 2, 2, V), (11, 5, 2, 2, V), (13, 3, 3, 2, V), (15, 2, 2, 1, V)],
    "banque": [(2, 5, 16, 2, Bc), (4, 2, 12, 3, Bc), (8, 0, 4, 2, Bc), (3, 7, 2, 6, Gr), (7, 7, 2, 6, Gr), (11, 7, 2, 6, Gr), (15, 7, 2, 6, Gr), (1, 13, 18, 2, Bc)],
    "billets": [(2, 4, 13, 7, V), (3, 5, 11, 5, (42, 157, 105)), (7, 6, 3, 3, Bc), (5, 7, 13, 7, V), (6, 8, 11, 5, (42, 157, 105)), (10, 9, 3, 3, Bc)],
    "tour": [(8, 7, 4, 9, Gr), (6, 14, 8, 2, Gr), (9, 2, 2, 5, Br), (4, 2, 12, 1, Br), (4, 0, 1, 3, Br), (15, 2, 1, 4, Br), (9, 10, 2, 2, J)],
    "cheval": [(4, 6, 10, 5, Br), (13, 2, 3, 6, Br), (15, 1, 3, 3, Br), (17, 2, 1, 1, Nt), (5, 11, 2, 4, Br), (11, 11, 2, 4, Br), (2, 5, 2, 5, Nt), (13, 1, 1, 2, Nt), (8, 4, 3, 2, R)],
    "lunette": [(2, 10, 5, 3, J), (7, 9, 5, 4, Br), (12, 8, 5, 5, J), (17, 9, 1, 3, Bl), (1, 11, 1, 1, Nt), (4, 4, 1, 1, Bc), (9, 2, 1, 1, Bc), (15, 3, 1, 1, Bc)],
    "globe": [(6, 2, 8, 10, Bl), (5, 4, 10, 6, Bl), (7, 3, 3, 3, V), (10, 6, 4, 3, V), (6, 8, 2, 2, V), (9, 12, 2, 2, Br), (6, 14, 8, 1, Br)],
    "livre": [(2, 4, 8, 9, Bc), (10, 4, 8, 9, Bc), (9, 4, 2, 10, Br), (3, 6, 5, 1, Gr), (3, 8, 5, 1, Gr), (3, 10, 4, 1, Gr), (12, 6, 5, 1, Gr), (12, 8, 5, 1, Gr), (12, 10, 3, 1, Gr), (1, 13, 18, 1, Br)],
    "bateau": [(3, 10, 14, 3, Br), (5, 13, 10, 1, Br), (9, 1, 1, 9, Br), (10, 2, 6, 6, Bc), (4, 4, 5, 5, Bc), (0, 14, 20, 2, Bl), (2, 13, 1, 1, Bl), (17, 13, 1, 1, Bl)],
    "glace": [(4, 5, 8, 8, (170, 220, 250)), (5, 6, 3, 2, Bc), (10, 8, 7, 6, (140, 200, 245)), (11, 9, 2, 2, Bc), (2, 13, 16, 1, Gr), (8, 3, 4, 2, (170, 220, 250))],
    "carotte": [(12, 2, 2, 3, V), (14, 1, 2, 3, V), (10, 1, 2, 3, V), (11, 5, 5, 2, (240, 130, 40)), (10, 7, 5, 2, (240, 130, 40)), (8, 9, 5, 2, (240, 130, 40)), (6, 11, 4, 2, (240, 130, 40)), (4, 13, 3, 2, (240, 130, 40))],
    "avion": [(3, 7, 14, 2, Gr), (8, 3, 3, 10, Gr), (15, 5, 2, 6, Gr), (1, 7, 2, 2, Bc), (9, 5, 1, 1, J), (2, 2, 1, 1, Bc), (16, 13, 1, 1, Bc), (5, 14, 1, 1, Bc)],
    "radar": [(9, 9, 2, 6, Gr), (6, 14, 8, 1, Gr), (4, 3, 12, 2, Bc), (5, 5, 10, 2, Bc), (7, 7, 6, 2, Bc), (16, 1, 1, 1, V), (18, 3, 1, 1, V), (17, 6, 1, 1, V)],
    "oeil": [(4, 6, 12, 5, Bc), (6, 5, 8, 1, Bc), (6, 11, 8, 1, Bc), (8, 6, 4, 5, Bl), (9, 7, 2, 3, Nt), (2, 8, 2, 1, Bc), (16, 8, 2, 1, Bc)],
    "cerveau": [(5, 3, 10, 9, (240, 150, 170)), (4, 5, 12, 5, (240, 150, 170)), (9, 3, 1, 9, (200, 100, 130)), (6, 6, 2, 1, (200, 100, 130)), (12, 6, 2, 1, (200, 100, 130)), (6, 9, 3, 1, (200, 100, 130)), (11, 9, 3, 1, (200, 100, 130)), (9, 12, 2, 3, (200, 100, 130))],
    "lanterne": [(9, 0, 2, 2, Gr), (6, 2, 8, 1, Gr), (7, 3, 6, 6, J), (6, 3, 1, 6, Gr), (13, 3, 1, 6, Gr), (9, 5, 2, 3, R), (6, 9, 8, 1, Gr), (9, 10, 2, 6, Gr)],
    "echelle": [(5, 1, 1, 14, Br), (11, 1, 1, 14, Br), (5, 3, 7, 1, Br), (5, 6, 7, 1, Br), (5, 9, 7, 1, Br), (5, 12, 7, 1, Br), (14, 2, 3, 4, J), (15, 6, 1, 9, Gr)],
    "eclair": [(10, 1, 4, 5, J), (8, 5, 5, 3, J), (9, 8, 4, 3, J), (7, 11, 4, 3, J), (6, 14, 2, 1, J)],
    "bombe": [(4, 9, 12, 3, Gr), (2, 10, 2, 1, Gr), (16, 10, 2, 1, Gr), (7, 7, 6, 2, Gr), (9, 12, 2, 3, R), (8, 14, 4, 1, J), (3, 3, 2, 1, Bc), (14, 2, 3, 1, Bc), (6, 1, 1, 1, Bc)],
}


def dessin(nom, facteur):
    img = Image.new("RGBA", (20, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for x, y, l, h, c in DESSINS.get(nom, DESSINS["question"]):
        d.rectangle([x, y, x + l - 1, y + h - 1], fill=c + (255,))
    return img.resize((20 * facteur, 16 * facteur), Image.NEAREST)


# ── Le décor : une rue de nuit et un grand panneau ─────────────────────────
PX0, PY0, PX1, PY1 = 22, 70, 247, 330          # le panneau


OR, OR2, OR3 = (201, 162, 39), (150, 116, 22), (236, 206, 110)


def decor():
    """Une salle de musée : mur sombre, parquet, appliques, et un grand tableau au cadre doré."""
    img = Image.new("RGB", (L, H), (58, 24, 32))
    d = ImageDraw.Draw(img)
    for y in range(0, 372, 6):                                     # mur, plus sombre vers le haut
        t = y / 372
        d.rectangle([0, y, L, y + 6], fill=(int(34 + 30 * t), int(14 + 12 * t), int(20 + 16 * t)))
    for x in range(0, L, 18):                                      # tenture à rayures discrètes
        d.rectangle([x, 0, x, 372], fill=(48, 20, 27))
    d.rectangle([0, 0, L, 9], fill=(30, 20, 14)); d.rectangle([0, 9, L, 11], fill=OR2)          # corniche
    d.rectangle([0, 344, L, 372], fill=(46, 30, 22)); d.rectangle([0, 344, L, 346], fill=OR2)   # plinthe en bois
    for x in range(8, L, 44):
        d.rectangle([x, 351, x + 30, 366], outline=(70, 46, 32))
    d.rectangle([0, 372, L, H], fill=(86, 56, 34))                                               # parquet
    for y in range(372, H, 12):
        d.rectangle([0, y, L, y], fill=(64, 40, 24))
        for x in range((y // 12 % 2) * 22, L, 44):
            d.rectangle([x, y, x, y + 12], fill=(64, 40, 24))
    d.rectangle([0, 372, L, 374], fill=(110, 74, 46))
    for ax in (8, L - 13):                                         # deux appliques et leur halo
        for r in range(26, 4, -4):
            d.ellipse([ax + 2 - r, 40 - r, ax + 2 + r, 40 + r], fill=(int(70 + (26 - r) * 3), int(34 + (26 - r) * 2), int(34 + (26 - r))))
        d.rectangle([ax, 36, ax + 4, 46], fill=OR3); d.rectangle([ax + 1, 46, ax + 3, 54], fill=OR2)
    # le tableau : cadre doré mouluré, toile sombre
    d.rectangle([PX0, PY0, PX1, PY1], fill=OR2)
    d.rectangle([PX0 + 2, PY0 + 2, PX1 - 2, PY1 - 2], fill=OR)
    d.rectangle([PX0 + 5, PY0 + 5, PX1 - 5, PY1 - 5], fill=OR3)
    d.rectangle([PX0 + 7, PY0 + 7, PX1 - 7, PY1 - 7], fill=OR2)
    for cx, cy in ((PX0, PY0), (PX1 - 8, PY0), (PX0, PY1 - 8), (PX1 - 8, PY1 - 8)):
        d.rectangle([cx, cy, cx + 8, cy + 8], fill=OR3); d.rectangle([cx + 3, cy + 3, cx + 5, cy + 5], fill=OR2)
    d.rectangle([PX0 + 9, PY0 + 9, PX1 - 9, PY1 - 9], fill=(18, 26, 30))
    d.rectangle([(PX0 + PX1) // 2 - 1, 11, (PX0 + PX1) // 2, PY0], fill=(90, 70, 40))             # fil d'accrochage
    return img


def couper(texte, largeur):
    lignes, cur = [], ""
    for mot in texte.split():
        if cur and len(cur) + 1 + len(mot) > largeur:
            lignes.append(cur); cur = mot
        else:
            cur = (cur + " " + mot).strip()
    return lignes + ([cur] if cur else [])


def panneau(base, titre, mots, image):
    img = base.copy()
    d = ImageDraw.Draw(img)
    cx = (PX0 + PX1) // 2
    d.rectangle([cx - 86, PY1 + 5, cx + 86, PY1 + 19], fill=OR3); d.rectangle([cx - 86, PY1 + 5, cx + 86, PY1 + 19], outline=OR2)
    d.text((cx, PY1 + 8), titre.upper()[:20], font=police(8), fill=(40, 26, 12), anchor="ma")
    ic = dessin(image, 7)
    img.paste(ic, (cx - ic.width // 2, PY0 + 28), ic)
    lignes = couper(mots.upper(), 12)[:3]
    taille = 16 if all(len(l) <= 12 for l in lignes) else 8
    y = PY0 + 156
    for k, l in enumerate(lignes):
        d.text((cx, y), l, font=police(taille), fill=J if k == len(lignes) - 1 else Bc, anchor="ma")
        y += taille + 8
    return img


# ── La voix ────────────────────────────────────────────────────────────────
# Une voix par personnage. Les deux sont libres et utilisables dans des vidéos monétisées,
# à condition de créditer leurs auteurs (voir README) :
#   A, la curieuse : SIWIS (CC BY 4.0) ; B, le conteur : UPMC « Pierre » (CC BY-SA 4.0).
VOIX = {"A": ("fr_FR-siwis-medium.onnx", None), "B": ("fr_FR-upmc-medium.onnx", "1")}


def dire(qui, texte, sortie):
    fichier, locuteur = VOIX[qui]
    modele = RACINE / "voix" / fichier
    if modele.exists() and shutil.which("piper"):
        commande = ["piper", "--model", str(modele), "--output_file", str(sortie), "--length_scale", "1.10", "--sentence_silence", "0.22"]
        if locuteur:
            commande += ["--speaker", locuteur]
        subprocess.run(commande, input=texte.encode(), check=True, capture_output=True)
        return "Piper (SIWIS et UPMC Pierre)"
    voix, hauteur = ("fr+f3", "62") if qui == "A" else ("fr+m3", "34")
    subprocess.run(["espeak-ng", "-v", voix, "-s", "148", "-p", hauteur, "-w", str(sortie), texte], check=True, capture_output=True)
    return "voix de secours du système (espeak-ng)"


def lire_wav(chemin):
    with wave.open(str(chemin)) as w:
        canaux, cadence, largeur, brut = w.getnchannels(), w.getframerate(), w.getsampwidth(), w.readframes(w.getnframes())
    son = np.frombuffer(brut, dtype=np.int16 if largeur == 2 else np.uint8).astype(np.float32)
    return (son.reshape(-1, canaux).mean(axis=1) if canaux > 1 else son), cadence


def reechantillonner(son, de, vers):
    if de == vers:
        return son
    n = int(len(son) * vers / de)
    return np.interp(np.linspace(0, len(son) - 1, n), np.arange(len(son)), son).astype(np.float32)


def groupes(texte):
    """Découpe une réplique en petits groupes de mots (deux lignes de 11 caractères au plus), comme des sous-titres rapides."""
    lignes = couper(texte, 11)
    return [lignes[i:i + 2] for i in range(0, len(lignes), 2)]


def contour(d, xy, texte, f, couleur):
    x, y = xy
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1), (0, 2), (2, 2)):
        d.text((x + dx, y + dy), texte, font=f, fill=(8, 9, 14))
    d.text((x, y), texte, font=f, fill=couleur)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    histoire = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    repliques = histoire["scenes"] + ([] if histoire.get("sans_fin") else [FIN])
    sortie = RACINE / "sorties" / (Path(sys.argv[1]).stem + ".mp4")
    sortie.parent.mkdir(exist_ok=True)
    CAD = 22050
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        pistes, moteur = [], ""
        for i, s in enumerate(repliques):                          # 1. la voix, réplique par réplique
            f = tmp / f"{i:03d}.wav"
            moteur = dire(s["qui"], s["texte"], f)
            son, cad = lire_wav(f)
            son = reechantillonner(son, cad, CAD)
            pistes.append(np.concatenate([son, np.zeros(int(CAD * PAUSE), dtype=np.float32)]))
        audio = np.concatenate(pistes)
        with wave.open(str(tmp / "voix.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(CAD)
            w.writeframes(np.clip(audio, -32768, 32767).astype(np.int16).tobytes())
        par_image = CAD // IPS
        nb = len(audio) // par_image
        volume = np.array([np.abs(audio[k * par_image:(k + 1) * par_image]).mean() for k in range(nb)])
        seuil = max(volume.max() * 0.10, 1)
        debuts = np.cumsum([0] + [len(p) for p in pistes]) / par_image
        base = decor()                                             # 2. les panneaux successifs
        fonds, courant = [], panneau(base, histoire["titre"], histoire["titre"], "question")
        for s in repliques:
            if s.get("ecran"):
                courant = panneau(base, histoire.get("rubrique", histoire["titre"]), s["ecran"], s.get("image", "question"))
            fonds.append(courant)
        sprites = {(q, b, y): perso(q, b, y).resize((48, 64), Image.NEAREST) for q in "AB" for b in (0, 1, 2) for y in (True, False)}
        sprites.update({("B", b, y, "m"): sprites[("B", b, y)].transpose(Image.FLIP_LEFT_RIGHT) for b in (0, 1, 2) for y in (True, False)})
        tetes = {q: perso(q).crop((3, 0, 21, 13)).resize((36, 26), Image.NEAREST) for q in "AB"}
        decoupes = [groupes(s["texte"]) for s in repliques]
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{L * ZOOM}x{H * ZOOM}", "-r", str(IPS),
                               "-i", "-", "-i", str(tmp / "voix.wav"), "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
                               "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(sortie)],
                              stdin=subprocess.PIPE)
        f16, i = police(16), 0
        for k in range(nb):                                        # 3. les images
            while i + 1 < len(repliques) and k >= debuts[i + 1]:
                i += 1
            s, v = repliques[i], volume[k]
            bouche = 0 if v < seuil else (2 if v > seuil * 3 and (k // 2) % 2 == 0 else 1)
            img = fonds[i].copy()
            for q, x in (("A", 26), ("B", 196)):
                parle = q == s["qui"]
                b = bouche if parle else 0
                yeux = ((k + (0 if q == "A" else 37)) % (IPS * 4)) > 3
                sp = sprites[("B", b, yeux, "m")] if q == "B" else sprites[("A", b, yeux)]
                img.paste(sp, (x, 340 - (2 if parle and b == 2 else 0)), sp)
            # sous-titre : le groupe de mots en cours, avec la tête de celui qui parle
            g = decoupes[i]
            poids = np.cumsum([sum(len(l) for l in gr) + 2 for gr in g])
            avance = (k - debuts[i]) / max(1, debuts[i + 1] - debuts[i] - IPS * PAUSE)
            n = int(np.searchsorted(poids, min(0.999, max(0, avance)) * poids[-1]))
            d = ImageDraw.Draw(img)
            lignes = g[min(n, len(g) - 1)]
            couleur = (255, 150, 90) if s["qui"] == "A" else (120, 170, 255)
            y0 = 416 if len(lignes) > 1 else 426
            for j, l in enumerate(lignes):
                f = f16 if len(l) <= 16 else police(8)
                contour(d, (max(2, (L - int(d.textlength(l, font=f))) // 2), y0 + j * 20), l, f, Bc)
            larg = max(int(d.textlength(l, font=f16)) for l in lignes)
            d.rectangle([(L - larg) // 2, y0 + len(lignes) * 20 + 1, (L + larg) // 2, y0 + len(lignes) * 20 + 3], fill=couleur)
            fx = 50 if s["qui"] == "A" else 220                    # petite flèche vers celui qui parle
            d.polygon([(fx - 4, 408), (fx + 4, 408), (fx, 403)], fill=couleur)
            d.rectangle([0, H - 3, int(L * (k + 1) / nb), H], fill=J)
            ff.stdin.write(img.resize((L * ZOOM, H * ZOOM), Image.NEAREST).tobytes())
        ff.stdin.close()
        ff.wait()
    alerte = "" if nb / IPS >= 61 else "  ATTENTION : moins de 61 s, non rémunérée sur TikTok"
    print(f"écrit {sortie.relative_to(RACINE)} : {nb / IPS:.0f} s, {len(repliques)} répliques, voix : {moteur}{alerte}")


if __name__ == "__main__":
    main()
