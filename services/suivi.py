"""Tableur de suivi de l'activité de services : candidatures, missions, chiffres.

Usage : python services/suivi.py   (écrit services/suivi-activite.xlsx)
"""
import datetime as dt
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.worksheet.datavalidation import DataValidation

RACINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE / "produits"))
from generer import (EURO, FOND_SAISIE, FOND_TOTAL, GRAS, MOIS, PCT, TITRE,  # noqa: E402
                     cadre, entete, largeurs)

N = 300  # lignes de saisie par onglet
NOTE = Font(name="Calibri", italic=True, color="666666")


def liste(ws, plage, valeurs):
    dv = DataValidation(type="list", formula1='"' + ",".join(valeurs) + '"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(plage)


def classeur():
    annee = dt.date.today().year
    wb = Workbook()

    # --- Tableau de bord -------------------------------------------------
    wt = wb.active
    wt.title = "Tableau de bord"
    wt.sheet_view.showGridLines = False
    largeurs(wt, [34, 16, 4, 14, 16, 16])
    wt["A1"] = "Suivi de l'activité"
    wt["A1"].font = TITRE
    entete(wt, 3, ["Indicateur", "Valeur"])
    lignes = [
        ("Candidatures envoyées", '=COUNTA(Candidatures!B2:B301)', "0"),
        ("Réponses reçues", '=COUNTIF(Candidatures!F2:F301,"Réponse reçue")'
                            '+COUNTIF(Candidatures!F2:F301,"Gagnée")'
                            '+COUNTIF(Candidatures!F2:F301,"Perdue")', "0"),
        ("Taux de réponse", '=IF(B4=0,"",B5/B4)', PCT),
        ("Missions gagnées", '=COUNTA(Missions!B2:B301)', "0"),
        ("Missions livrées", '=COUNTIF(Missions!F2:F301,"Livrée")+COUNTIF(Missions!F2:F301,"Payée")', "0"),
        ("Avis obtenus", '=COUNTIF(Missions!H2:H301,"Oui")', "0"),
        ("Forfaits de suivi en cours", '=COUNTIF(Missions!I2:I301,">0")', "0"),
        ("Revenu mensuel des forfaits", '=SUM(Missions!I2:I301)', EURO),
        ("Total encaissé", '=SUMIF(Missions!F2:F301,"Payée",Missions!E2:E301)', EURO),
    ]
    for i, (nom, formule, fmt) in enumerate(lignes, start=4):
        wt[f"A{i}"], wt[f"B{i}"] = nom, formule
        wt[f"B{i}"].number_format = fmt
    cadre(wt, "A4:A12")
    cadre(wt, "B4:B12")
    for i, (_, _, fmt) in enumerate(lignes, start=4):
        wt[f"B{i}"].number_format = fmt
    cadre(wt, "A12:B12", EURO, FOND_TOTAL, GRAS)

    wt["E1"], wt["F1"] = "Année suivie :", annee
    wt["E1"].font = GRAS
    wt["F1"].fill = FOND_SAISIE
    entete(wt, 3, ["Mois", "Encaissé", "Missions payées"], col=4)
    for m in range(12):
        r = 4 + m
        debut, fin = f"DATE($F$1,{m+1},1)", f"DATE($F$1,{m+2},1)"
        wt[f"D{r}"] = MOIS[m]
        wt[f"E{r}"] = (f'=SUMIFS(Missions!$E$2:$E$301,Missions!$F$2:$F$301,"Payée",'
                       f'Missions!$G$2:$G$301,">="&{debut},Missions!$G$2:$G$301,"<"&{fin})')
        wt[f"F{r}"] = (f'=COUNTIFS(Missions!$F$2:$F$301,"Payée",'
                       f'Missions!$G$2:$G$301,">="&{debut},Missions!$G$2:$G$301,"<"&{fin})')
    cadre(wt, "D4:D15")
    cadre(wt, "E4:E15", EURO)
    cadre(wt, "F4:F15", "0")
    wt["A14"] = "Objectifs des 90 premiers jours"
    wt["A14"].font = GRAS
    for i, t in enumerate(["20 candidatures envoyées, au moins 3 réponses",
                           "5 missions de démarrage livrées (2 gratuites, 3 à 50-100 €)",
                           "3 avis sur le profil, puis prix à 250 €"], start=15):
        wt[f"A{i}"] = "• " + t
    wt["A19"] = "Le tableau par mois compte les paiements de l'année indiquée en haut à droite."
    wt["A19"].font = NOTE

    # --- Candidatures ----------------------------------------------------
    wc = wb.create_sheet("Candidatures")
    largeurs(wc, [13, 16, 44, 14, 14, 18, 40])
    entete(wc, 1, ["Date", "Plateforme", "Annonce (résumé)", "Prix proposé", "Délai (jours)",
                   "Statut", "Notes"])
    wc.freeze_panes = "A2"
    ex = [(dt.date.today(), "Upwork", "Exemple : devis automatique pour un artisan", 80, 2,
           "Réponse reçue", "Supprime cette ligne d'exemple")]
    for i, l in enumerate(ex, start=2):
        for j, v in enumerate(l, start=1):
            wc.cell(row=i, column=j, value=v)
    for r in range(2, N + 2):
        wc.cell(row=r, column=1).number_format = "DD/MM/YYYY"
        wc.cell(row=r, column=4).number_format = EURO
    liste(wc, f"B2:B{N+1}", ["Malt", "Upwork", "Fiverr", "Entourage", "Recommandation", "Autre"])
    liste(wc, f"F2:F{N+1}", ["Envoyée", "Réponse reçue", "Gagnée", "Perdue", "Sans suite"])

    # --- Missions --------------------------------------------------------
    wm = wb.create_sheet("Missions")
    largeurs(wm, [13, 24, 16, 38, 12, 14, 14, 10, 16, 36])
    entete(wm, 1, ["Début", "Client", "Origine", "Tâche automatisée", "Prix", "Statut",
                   "Payée le", "Avis", "Forfait mensuel", "Notes"])
    wm.freeze_panes = "A2"
    ex = [(dt.date.today(), "Exemple : Menuiserie Dupont", "Entourage",
           "Devis automatique", 0, "Livrée", None, "Oui", 0, "Supprime cette ligne d'exemple")]
    for i, l in enumerate(ex, start=2):
        for j, v in enumerate(l, start=1):
            wm.cell(row=i, column=j, value=v)
    for r in range(2, N + 2):
        wm.cell(row=r, column=1).number_format = "DD/MM/YYYY"
        wm.cell(row=r, column=7).number_format = "DD/MM/YYYY"
        wm.cell(row=r, column=5).number_format = EURO
        wm.cell(row=r, column=9).number_format = EURO
    liste(wm, f"C2:C{N+1}", ["Malt", "Upwork", "Fiverr", "Entourage", "Recommandation", "Autre"])
    liste(wm, f"F2:F{N+1}", ["En discussion", "En cours", "Livrée", "Payée", "Annulée"])
    liste(wm, f"H2:H{N+1}", ["Oui", "Demandé", "Non"])

    # --- Contacts --------------------------------------------------------
    wk = wb.create_sheet("Contacts")
    largeurs(wk, [24, 26, 40, 16, 13, 36])
    entete(wk, 1, ["Nom", "Activité", "Tâche pénible repérée", "Statut", "Relance le", "Notes"])
    wk.freeze_panes = "A2"
    for r in range(2, 102):
        wk.cell(row=r, column=5).number_format = "DD/MM/YYYY"
    liste(wk, "D2:D101", ["À contacter", "Contacté", "Intéressé", "Mission", "Pas intéressé"])
    return wb


if __name__ == "__main__":
    cible = RACINE / "services" / "suivi-activite.xlsx"
    classeur().save(cible)
    print("écrit", cible.relative_to(RACINE))
