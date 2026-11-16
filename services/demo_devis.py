"""Exemple à montrer aux clients : un tableur de devis qui se remplit tout seul.

Usage : python services/demo_devis.py   (écrit services/demos/devis-automatique.xlsx)
"""
import datetime as dt
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from openpyxl.worksheet.datavalidation import DataValidation

RACINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE / "produits"))
from generer import (EURO, FOND_SAISIE, FOND_TOTAL, GRAS, TITRE,  # noqa: E402
                     cadre, entete, largeurs)

NB_LIGNES = 10


def classeur():
    wb = Workbook()

    # --- Devis -----------------------------------------------------------
    wd = wb.active
    wd.title = "Devis"
    wd.sheet_view.showGridLines = False
    largeurs(wd, [38, 12, 16, 18, 16])
    wd["A1"] = "Menuiserie Exemple"
    wd["A1"].font = TITRE
    wd["A2"] = "12 rue des Ateliers, 69000 Lyon · contact@exemple.fr"
    wd["D1"], wd["E1"] = "Devis n°", "D-2027-001"
    wd["D2"], wd["E2"] = "Date", dt.date(2027, 1, 12)
    wd["E2"].number_format = "DD/MM/YYYY"
    wd["D3"] = "Valable jusqu'au"
    wd["E3"] = "=E2+30"
    wd["E3"].number_format = "DD/MM/YYYY"
    for c in ("D1", "D2", "D3"):
        wd[c].font = GRAS

    wd["A5"] = "Client"
    wd["A5"].font = GRAS
    wd["A6"] = "Boulangerie Martin"
    wd["A6"].fill = FOND_SAISIE
    wd["A7"] = '=IFERROR(INDEX(Clients!$B$2:$B$51,MATCH($A$6,Clients!$A$2:$A$51,0)),"")'
    wd["A8"] = '=IFERROR(INDEX(Clients!$C$2:$C$51,MATCH($A$6,Clients!$A$2:$A$51,0)),"")'
    dv_client = DataValidation(type="list", formula1="=Clients!$A$2:$A$51", allow_blank=True)
    wd.add_data_validation(dv_client)
    dv_client.add("A6")

    entete(wd, 10, ["Désignation", "Quantité", "Prix unitaire HT", "TVA", "Total HT"])
    deb, fin = 11, 10 + NB_LIGNES
    exemples = [("Étagère sur mesure en chêne", 2), ("Pose et fixation (heure)", 3),
                ("Déplacement", 1)]
    dv_prod = DataValidation(type="list", formula1="=Produits!$A$2:$A$101", allow_blank=True)
    wd.add_data_validation(dv_prod)
    dv_prod.add(f"A{deb}:A{fin}")
    for i in range(NB_LIGNES):
        r = deb + i
        if i < len(exemples):
            wd[f"A{r}"], wd[f"B{r}"] = exemples[i]
        cherche = f'MATCH($A{r},Produits!$A$2:$A$101,0)'
        wd[f"C{r}"] = f'=IF($A{r}="","",IFERROR(INDEX(Produits!$B$2:$B$101,{cherche}),""))'
        wd[f"D{r}"] = f'=IF($A{r}="","",IFERROR(INDEX(Produits!$C$2:$C$101,{cherche}),""))'
        wd[f"E{r}"] = f'=IF(OR($A{r}="",B{r}="",C{r}=""),"",B{r}*C{r})'
    cadre(wd, f"A{deb}:B{fin}", fond=FOND_SAISIE)
    cadre(wd, f"C{deb}:C{fin}", EURO)
    cadre(wd, f"D{deb}:D{fin}", "0%")
    cadre(wd, f"E{deb}:E{fin}", EURO)

    t = fin + 2
    wd[f"D{t}"], wd[f"E{t}"] = "Total HT", f"=SUM(E{deb}:E{fin})"
    wd[f"D{t+1}"] = "TVA"
    # Somme ligne par ligne, plus sûre d'un tableur à l'autre que la formule matricielle.
    wd[f"E{t+1}"] = "=" + "+".join(
        f'IF(ISNUMBER(E{r}),E{r}*D{r},0)' for r in range(deb, fin + 1))
    wd[f"D{t+2}"], wd[f"E{t+2}"] = "Total TTC", f"=E{t}+E{t+1}"
    cadre(wd, f"D{t}:D{t+2}", police=GRAS)
    cadre(wd, f"E{t}:E{t+1}", EURO)
    cadre(wd, f"E{t+2}:E{t+2}", EURO, FOND_TOTAL, GRAS)
    wd[f"D{t+2}"].fill = FOND_TOTAL
    wd[f"A{t+4}"] = ("Choisissez le client et les prestations dans les listes : adresse, prix, "
                     "TVA et totaux se remplissent seuls.")
    wd[f"A{t+4}"].font = Font(name="Calibri", italic=True, color="666666")

    # --- Clients ---------------------------------------------------------
    wc = wb.create_sheet("Clients")
    largeurs(wc, [30, 34, 24, 30])
    entete(wc, 1, ["Nom", "Adresse", "Code postal et ville", "E-mail"])
    for i, ligne in enumerate([
            ("Boulangerie Martin", "4 place du Marché", "69004 Lyon", "contact@martin.exemple"),
            ("Cabinet Durand", "18 avenue Foch", "69006 Lyon", "accueil@durand.exemple"),
            ("Mme Lefèvre", "7 chemin des Vignes", "69370 Saint-Didier", "lefevre@exemple.fr"),
            ("Restaurant Le Quai", "2 quai de Saône", "69009 Lyon", "lequai@exemple.fr")], start=2):
        for j, v in enumerate(ligne, start=1):
            wc.cell(row=i, column=j, value=v)
    wc.freeze_panes = "A2"

    # --- Produits --------------------------------------------------------
    wp = wb.create_sheet("Produits")
    largeurs(wp, [40, 18, 10])
    entete(wp, 1, ["Désignation", "Prix unitaire HT", "TVA"])
    for i, ligne in enumerate([
            ("Étagère sur mesure en chêne", 240, 0.2), ("Plan de travail massif (mètre)", 310, 0.2),
            ("Porte intérieure sur mesure", 420, 0.2), ("Pose et fixation (heure)", 48, 0.1),
            ("Déplacement", 35, 0.2)], start=2):
        for j, v in enumerate(ligne, start=1):
            wp.cell(row=i, column=j, value=v)
    for r in range(2, 102):
        wp.cell(row=r, column=2).number_format = EURO
        wp.cell(row=r, column=3).number_format = "0%"
    wp.freeze_panes = "A2"

    for ws in wb:
        for ligne in ws.iter_rows():
            for c in ligne:
                if c.value is not None and c.alignment.wrap_text is None:
                    c.alignment = Alignment(vertical="center")
    return wb


if __name__ == "__main__":
    cible = RACINE / "services" / "demos" / "devis-automatique.xlsx"
    cible.parent.mkdir(parents=True, exist_ok=True)
    classeur().save(cible)
    print("écrit", cible.relative_to(RACINE))
