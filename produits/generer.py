#!/usr/bin/env python3
"""Génère les tableurs vendus (et le modèle gratuit) dans produits/dist/.

    python produits/generer.py

- produits/dist/gratuit/  -> copié sur le site, téléchargeable par tous
- produits/dist/payant/   -> à téléverser sur la plateforme de vente
"""
import datetime as dt
import json
import zipfile
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.formatting.rule import CellIsRule, DataBarRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

RACINE = Path(__file__).resolve().parent.parent
DIST = Path(__file__).resolve().parent / "dist"
CONFIG = json.loads((RACINE / "config.json").read_text(encoding="utf-8"))

VERT = "1F7A5C"
VERT_CLAIR = "E6F3EE"
GRIS = "F4F5F4"
EURO = '#,##0.00 "€"'
PCT = "0%"

TITRE = Font(name="Calibri", size=18, bold=True, color=VERT)
ENTETE = Font(name="Calibri", bold=True, color="FFFFFF")
GRAS = Font(name="Calibri", bold=True)
FOND_ENTETE = PatternFill("solid", fgColor=VERT)
FOND_TOTAL = PatternFill("solid", fgColor=VERT_CLAIR)
FOND_SAISIE = PatternFill("solid", fgColor="FFFBE6")
FOND_GRIS = PatternFill("solid", fgColor=GRIS)
TRAIT = Side(style="thin", color="D5DAD7")
CADRE = Border(left=TRAIT, right=TRAIT, top=TRAIT, bottom=TRAIT)
ROUGE = Font(color="B3261E", bold=True)

MOIS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
        "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]


def largeurs(ws, tailles):
    for i, t in enumerate(tailles, start=1):
        ws.column_dimensions[get_column_letter(i)].width = t


def entete(ws, ligne, libelles, col=1):
    for i, texte in enumerate(libelles):
        c = ws.cell(row=ligne, column=col + i, value=texte)
        c.font, c.fill, c.border = ENTETE, FOND_ENTETE, CADRE
        c.alignment = Alignment(horizontal="left" if i == 0 else "center", vertical="center")
    ws.row_dimensions[ligne].height = 22


def cadre(ws, plage, fmt=None, fond=None, police=None):
    for ligne in ws[plage]:
        for c in ligne:
            c.border = CADRE
            if fmt:
                c.number_format = fmt
            if fond:
                c.fill = fond
            if police:
                c.font = police


def mode_emploi(wb, titre, lignes):
    ws = wb.create_sheet("Mode d'emploi", 0)
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 100
    ws["B2"] = titre
    ws["B2"].font = TITRE
    r = 4
    for texte in lignes:
        c = ws.cell(row=r, column=2, value=texte)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        if texte.endswith(":") or texte[:2] in ("1.", "2.", "3.", "4.", "5."):
            c.font = GRAS
        r += 1
    r += 1
    ws.cell(row=r, column=2, value="Les cellules jaunes sont à remplir. Les autres se calculent toutes seules.").fill = FOND_SAISIE
    ws.cell(row=r + 2, column=2, value=f"{CONFIG['nom']} — {CONFIG['url']}").font = Font(color=VERT, italic=True)
    return ws


# --------------------------------------------------------------------------
# 1. Budget mensuel simple (gratuit)
# --------------------------------------------------------------------------
def budget_mensuel():
    wb = Workbook()
    ws = wb.active
    ws.title = "Budget"
    ws.sheet_view.showGridLines = False
    largeurs(ws, [34, 16, 16, 16])

    ws["A1"] = "Budget mensuel"
    ws["A1"].font = TITRE
    ws["A2"] = "Mois :"
    ws["A2"].font = GRAS
    ws["B2"] = "Janvier"
    ws["B2"].fill = FOND_SAISIE
    ws["B2"].border = CADRE

    revenus = [("Salaire net", 1800), ("Aides / allocations", 0),
               ("Revenus complémentaires", 0), ("Autres", 0)]
    depenses = [("Loyer / crédit immobilier", 650), ("Charges (eau, énergie)", 90),
                ("Assurances", 60), ("Courses", 300), ("Transport", 80),
                ("Téléphone / internet", 45), ("Abonnements", 25), ("Santé", 30),
                ("Loisirs / sorties", 120), ("Shopping", 60), ("Épargne", 180),
                ("Remboursements", 0), ("Imprévus", 60), ("Autres", 0)]

    entete(ws, 4, ["Revenus", "Prévu", "Réel", "Écart"])
    r = 5
    for nom, prevu in revenus:
        ws.cell(row=r, column=1, value=nom)
        ws.cell(row=r, column=2, value=prevu)
        ws.cell(row=r, column=4, value=f'=IF(C{r}="","",C{r}-B{r})')
        r += 1
    fin_rev = r - 1
    cadre(ws, f"A5:A{fin_rev}", fond=FOND_SAISIE)
    cadre(ws, f"B5:C{fin_rev}", EURO, FOND_SAISIE)
    cadre(ws, f"D5:D{fin_rev}", EURO)
    tot_rev = r
    ws.cell(row=r, column=1, value="Total des revenus")
    for col in "BC":
        ws[f"{col}{r}"] = f"=SUM({col}5:{col}{fin_rev})"
    ws[f"D{r}"] = f'=IF(COUNT(C5:C{fin_rev})=0,"",C{r}-B{r})'
    cadre(ws, f"A{r}:D{r}", EURO, FOND_TOTAL, GRAS)

    r += 2
    entete(ws, r, ["Dépenses", "Prévu", "Réel", "Écart"])
    r += 1
    deb_dep = r
    for nom, prevu in depenses:
        ws.cell(row=r, column=1, value=nom)
        ws.cell(row=r, column=2, value=prevu)
        ws.cell(row=r, column=4, value=f'=IF(C{r}="","",B{r}-C{r})')
        r += 1
    fin_dep = r - 1
    cadre(ws, f"A{deb_dep}:A{fin_dep}", fond=FOND_SAISIE)
    cadre(ws, f"B{deb_dep}:C{fin_dep}", EURO, FOND_SAISIE)
    cadre(ws, f"D{deb_dep}:D{fin_dep}", EURO)
    tot_dep = r
    ws.cell(row=r, column=1, value="Total des dépenses")
    for col in "BC":
        ws[f"{col}{r}"] = f"=SUM({col}{deb_dep}:{col}{fin_dep})"
    ws[f"D{r}"] = f'=IF(COUNT(C{deb_dep}:C{fin_dep})=0,"",B{r}-C{r})'
    cadre(ws, f"A{r}:D{r}", EURO, FOND_TOTAL, GRAS)

    r += 2
    ws.cell(row=r, column=1, value="Reste à la fin du mois")
    ws[f"B{r}"] = f"=B{tot_rev}-B{tot_dep}"
    ws[f"C{r}"] = f'=IF(COUNT(C5:C{fin_dep})=0,"",C{tot_rev}-C{tot_dep})'
    cadre(ws, f"A{r}:C{r}", EURO, FOND_TOTAL, Font(bold=True, size=13))
    ws.conditional_formatting.add(
        f"D5:D{tot_dep}", CellIsRule(operator="lessThan", formula=["0"], font=ROUGE))
    ws.conditional_formatting.add(
        f"B{r}:C{r}", CellIsRule(operator="lessThan", formula=["0"], font=ROUGE))

    ws.cell(row=r + 2, column=1,
            value="Écart négatif (en rouge) = moins de revenus ou plus de dépenses que prévu.").font = Font(italic=True, color="666666")

    mode_emploi(wb, "Budget mensuel simple", [
        "1. Dans l'onglet « Budget », remplace les montants d'exemple de la colonne « Prévu » par les tiens.",
        "2. Renomme les lignes si besoin : elles sont là pour t'aider, pas pour t'enfermer.",
        "3. À la fin du mois (ou au fil de l'eau), remplis la colonne « Réel ».",
        "4. Regarde la colonne « Écart » : c'est là que tu apprends quelque chose pour le mois suivant.",
        "",
        "Pour un nouveau mois : clic droit sur l'onglet « Budget » puis « Dupliquer ».",
        "",
        "Envie d'aller plus loin ? Le Budget annuel complet suit tes opérations sur 12 mois",
        "et calcule tout seul ton tableau de bord et ta répartition 50/30/20.",
    ])
    wb.active = 1
    return wb


# --------------------------------------------------------------------------
# 2. Budget annuel complet (payant)
# --------------------------------------------------------------------------
NB_CAT = 20          # emplacements de catégories
L_CAT = 6            # première ligne des catégories dans Paramètres
NB_OPS = 1500        # lignes de saisie prêtes dans Transactions


def budget_annuel():
    annee = dt.date.today().year
    wb = Workbook()

    # --- Paramètres
    wp = wb.active
    wp.title = "Paramètres"
    wp.sheet_view.showGridLines = False
    largeurs(wp, [30, 16, 18, 4, 44])
    wp["A1"] = "Paramètres"
    wp["A1"].font = TITRE
    wp["A3"] = "Année suivie"
    wp["A3"].font = GRAS
    wp["B3"] = annee
    cadre(wp, "B3:B3", fond=FOND_SAISIE)
    entete(wp, L_CAT - 1, ["Catégorie de dépense", "Type", "Budget mensuel"])
    categories = [
        ("Logement", "Besoin", 650), ("Charges et énergie", "Besoin", 90),
        ("Assurances", "Besoin", 60), ("Courses", "Besoin", 300),
        ("Transport", "Besoin", 80), ("Santé", "Besoin", 30),
        ("Téléphone / internet", "Besoin", 45), ("Abonnements", "Envie", 25),
        ("Loisirs / sorties", "Envie", 120), ("Shopping", "Envie", 60),
        ("Vacances", "Envie", 80), ("Épargne", "Épargne", 180),
    ]
    for i, (nom, typ, budget) in enumerate(categories):
        r = L_CAT + i
        wp.cell(row=r, column=1, value=nom)
        wp.cell(row=r, column=2, value=typ)
        wp.cell(row=r, column=3, value=budget)
    fin_cat = L_CAT + NB_CAT - 1
    cadre(wp, f"A{L_CAT}:B{fin_cat}", fond=FOND_SAISIE)
    cadre(wp, f"C{L_CAT}:C{fin_cat}", EURO, FOND_SAISIE)
    dv_type = DataValidation(type="list", formula1='"Besoin,Envie,Épargne"', allow_blank=True)
    wp.add_data_validation(dv_type)
    dv_type.add(f"B{L_CAT}:B{fin_cat}")
    notes = [
        "Besoin : ce que tu dois payer (loyer, courses, transport…).",
        "Envie : ce qui rend la vie agréable (sorties, shopping…).",
        "Épargne : ce que tu mets de côté ou rembourses en avance.",
        "",
        f"Tu peux renommer, supprimer ou ajouter des catégories ({NB_CAT} au maximum).",
        "Le journal et le tableau de bord se mettent à jour tout seuls.",
    ]
    for i, texte in enumerate(notes):
        wp.cell(row=L_CAT + i, column=5, value=texte).font = Font(italic=True, color="555555")

    # --- Transactions
    wt = wb.create_sheet("Transactions")
    largeurs(wt, [14, 38, 14, 26, 16])
    entete(wt, 1, ["Date", "Libellé", "Type", "Catégorie", "Montant"])
    wt.freeze_panes = "A2"
    exemples = [
        (dt.date(annee, 1, 2), "Salaire", "Revenu", "", 1800),
        (dt.date(annee, 1, 3), "Loyer", "Dépense", "Logement", 650),
        (dt.date(annee, 1, 5), "Supermarché", "Dépense", "Courses", 82.4),
        (dt.date(annee, 1, 9), "Abonnement transport", "Dépense", "Transport", 80),
        (dt.date(annee, 1, 14), "Cinéma", "Dépense", "Loisirs / sorties", 24),
        (dt.date(annee, 1, 28), "Virement livret", "Dépense", "Épargne", 180),
        (dt.date(annee, 2, 2), "Salaire", "Revenu", "", 1800),
        (dt.date(annee, 2, 3), "Loyer", "Dépense", "Logement", 650),
        (dt.date(annee, 2, 8), "Supermarché", "Dépense", "Courses", 96.1),
    ]
    for i, ligne in enumerate(exemples, start=2):
        for j, val in enumerate(ligne, start=1):
            wt.cell(row=i, column=j, value=val if val != "" else None)
    fin_ops = NB_OPS + 1
    for r in range(2, fin_ops + 1):
        wt.cell(row=r, column=1).number_format = "DD/MM/YYYY"
        wt.cell(row=r, column=5).number_format = EURO
    dv_op = DataValidation(type="list", formula1='"Dépense,Revenu"', allow_blank=True)
    dv_cat = DataValidation(type="list", allow_blank=True,
                            formula1=f"='Paramètres'!$A${L_CAT}:$A${fin_cat}")
    dv_cat.error = "Choisis une catégorie de la liste (onglet Paramètres)."
    wt.add_data_validation(dv_op)
    wt.add_data_validation(dv_cat)
    dv_op.add(f"C2:C{fin_ops}")
    dv_cat.add(f"D2:D{fin_ops}")
    wt.auto_filter.ref = f"A1:E{fin_ops}"

    # --- Tableau de bord
    wd = wb.create_sheet("Tableau de bord")
    wd.sheet_view.showGridLines = False
    largeurs(wd, [28] + [12] * 12 + [14, 15, 14])
    wd["A1"] = "=\"Tableau de bord \"&'Paramètres'!B3"
    wd["A1"].font = TITRE
    entete(wd, 3, ["Vue d'ensemble"] + MOIS + ["Total"])

    an = "'Paramètres'!$B$3"
    T = "Transactions"

    def periode(m):
        return (f'{T}!$A:$A,">="&DATE({an},{m},1),'
                f'{T}!$A:$A,"<"&DATE({an},{m + 1},1)')

    deb, fin = 10, 10 + NB_CAT - 1          # lignes des catégories
    wd["A4"], wd["A5"], wd["A6"] = "Revenus", "Dépenses", "Solde"
    for m in range(1, 13):
        col = get_column_letter(m + 1)
        wd[f"{col}4"] = f'=SUMIFS({T}!$E:$E,{T}!$C:$C,"Revenu",{periode(m)})'
        wd[f"{col}5"] = f"=SUM({col}{deb}:{col}{fin})"
        wd[f"{col}6"] = f"={col}4-{col}5"
    for r in (4, 5, 6):
        wd[f"N{r}"] = f"=SUM(B{r}:M{r})"
    cadre(wd, "A4:N5", EURO)
    cadre(wd, "A6:N6", EURO, FOND_TOTAL, GRAS)
    wd.conditional_formatting.add(
        "B6:N6", CellIsRule(operator="lessThan", formula=["0"], font=ROUGE))

    entete(wd, deb - 1, ["Dépenses par catégorie"] + MOIS + ["Total", "Budget annuel", "Écart"])
    for i in range(NB_CAT):
        r = deb + i
        src = f"'Paramètres'!$A${L_CAT + i}"
        wd[f"A{r}"] = f'=IF({src}="","",{src})'
        for m in range(1, 13):
            col = get_column_letter(m + 1)
            wd[f"{col}{r}"] = (f'=IF($A{r}="","",SUMIFS({T}!$E:$E,{T}!$D:$D,$A{r},'
                               f'{T}!$C:$C,"Dépense",{periode(m)}))')
        wd[f"N{r}"] = f'=IF($A{r}="","",SUM(B{r}:M{r}))'
        wd[f"O{r}"] = f"=IF($A{r}=\"\",\"\",'Paramètres'!$C${L_CAT + i}*12)"
        wd[f"P{r}"] = f'=IF($A{r}="","",O{r}-N{r})'
    cadre(wd, f"A{deb}:P{fin}", EURO)
    tot = fin + 1
    wd[f"A{tot}"] = "Total"
    for c in range(2, 17):
        col = get_column_letter(c)
        wd[f"{col}{tot}"] = f"=SUM({col}{deb}:{col}{fin})"
    cadre(wd, f"A{tot}:P{tot}", EURO, FOND_TOTAL, GRAS)
    wd.conditional_formatting.add(
        f"P{deb}:P{tot}", CellIsRule(operator="lessThan", formula=["0"], font=ROUGE))
    wd.freeze_panes = "B4"

    # Répartition 50/30/20
    r0 = tot + 3
    entete(wd, r0, ["Répartition 50/30/20", "Montant", "% revenus", "Cible"])
    types = f"'Paramètres'!$B${L_CAT}:$B${fin_cat}"
    for i, (lib, typ, cible) in enumerate([("Besoins", "Besoin", 0.5),
                                            ("Envies", "Envie", 0.3),
                                            ("Épargne", "Épargne", 0.2)]):
        r = r0 + 1 + i
        wd[f"A{r}"] = lib
        wd[f"B{r}"] = f'=SUMIF({types},"{typ}",$N${deb}:$N${fin})'
        wd[f"C{r}"] = f'=IF($N$4=0,"",B{r}/$N$4)'
        wd[f"D{r}"] = cible
        cadre(wd, f"A{r}:D{r}")
        wd[f"B{r}"].number_format = EURO
        wd[f"C{r}"].number_format = PCT
        wd[f"D{r}"].number_format = PCT
    wd.cell(row=r0 + 5, column=1,
            value="Les cibles 50/30/20 sont un repère, pas une obligation : adapte-les à ta situation.").font = Font(italic=True, color="666666")

    graphe = BarChart()
    graphe.type = "col"
    graphe.title = "Revenus et dépenses par mois"
    graphe.y_axis.numFmt = '#,##0 "€"'
    graphe.add_data(Reference(wd, min_col=1, max_col=13, min_row=4, max_row=5),
                    from_rows=True, titles_from_data=True)
    graphe.set_categories(Reference(wd, min_col=2, max_col=13, min_row=3))
    graphe.height, graphe.width = 8, 22
    wd.add_chart(graphe, f"F{r0}")

    mode_emploi(wb, "Budget annuel complet", [
        "1. Onglet « Paramètres » : indique l'année, ajuste les catégories et le budget mensuel de chacune.",
        "2. Onglet « Transactions » : supprime les lignes d'exemple, puis note chaque opération",
        "   (date, libellé, type, catégorie, montant). Le montant est toujours positif.",
        "3. Onglet « Tableau de bord » : tout est calculé — par mois, par catégorie, et en 50/30/20.",
        "",
        "Conseils :",
        "• 10 minutes par semaine suffisent : ouvre ton appli bancaire et recopie les opérations.",
        "• Un virement vers un livret se note en « Dépense », catégorie « Épargne ».",
        "• Pour les revenus, la catégorie peut rester vide.",
        "• Nouvelle année : enregistre une copie du fichier, change l'année et vide le journal.",
        "",
        "Google Sheets : Fichier > Importer > Importer le fichier. Tout fonctionne à l'identique.",
    ])
    wb.active = 3
    return wb


# --------------------------------------------------------------------------
# 3. Objectifs d'épargne (payant)
# --------------------------------------------------------------------------
def objectifs_epargne():
    annee = dt.date.today().year
    wb = Workbook()
    wo = wb.active
    wo.title = "Objectifs"
    wo.sheet_view.showGridLines = False
    largeurs(wo, [30, 16, 15, 16, 16, 16, 22])
    wo["A1"] = "Mes objectifs d'épargne"
    wo["A1"].font = TITRE
    wo["A2"] = "Total épargné :"
    wo["A2"].font = GRAS
    wo["B2"] = "=SUM(D5:D12)"
    wo["B2"].number_format = EURO
    wo["B2"].font = GRAS
    entete(wo, 4, ["Objectif", "Montant visé", "Date visée", "Déjà épargné",
                   "Reste", "Progression", "À verser par mois"])
    exemples = [("Fonds d'urgence", 3000, dt.date(annee + 1, 12, 31)),
                ("Vacances d'été", 1200, dt.date(annee + 1, 7, 1)),
                ("Nouvel ordinateur", 900, dt.date(annee + 1, 3, 1))]
    for i in range(8):
        r = 5 + i
        if i < len(exemples):
            wo[f"A{r}"], wo[f"B{r}"], wo[f"C{r}"] = exemples[i]
        wo[f"D{r}"] = f'=IF(A{r}="","",SUMIF(Versements!$B:$B,A{r},Versements!$C:$C))'
        wo[f"E{r}"] = f'=IF(A{r}="","",MAX(0,B{r}-D{r}))'
        wo[f"F{r}"] = f'=IF(OR(A{r}="",B{r}=0),"",MIN(1,D{r}/B{r}))'
        wo[f"G{r}"] = (f'=IF(OR(A{r}="",C{r}=""),"",E{r}/MAX(1,'
                       f'(YEAR(C{r})-YEAR(TODAY()))*12+MONTH(C{r})-MONTH(TODAY())))')
    cadre(wo, "A5:A12", fond=FOND_SAISIE)
    cadre(wo, "B5:B12", EURO, FOND_SAISIE)
    cadre(wo, "C5:C12", "DD/MM/YYYY", FOND_SAISIE)
    cadre(wo, "D5:E12", EURO)
    cadre(wo, "F5:F12", PCT)
    cadre(wo, "G5:G12", EURO)
    wo.conditional_formatting.add("F5:F12", DataBarRule(
        start_type="num", start_value=0, end_type="num", end_value=1, color=VERT))

    wv = wb.create_sheet("Versements")
    largeurs(wv, [14, 30, 16, 40])
    entete(wv, 1, ["Date", "Objectif", "Montant", "Note"])
    wv.freeze_panes = "A2"
    for i, ligne in enumerate([(dt.date(annee, 1, 5), "Fonds d'urgence", 150),
                               (dt.date(annee, 1, 5), "Vacances d'été", 100),
                               (dt.date(annee, 2, 5), "Fonds d'urgence", 150),
                               (dt.date(annee, 2, 5), "Nouvel ordinateur", 75)], start=2):
        for j, val in enumerate(ligne, start=1):
            wv.cell(row=i, column=j, value=val)
    for r in range(2, 502):
        wv.cell(row=r, column=1).number_format = "DD/MM/YYYY"
        wv.cell(row=r, column=3).number_format = EURO
    dv = DataValidation(type="list", formula1="=Objectifs!$A$5:$A$12", allow_blank=True)
    wv.add_data_validation(dv)
    dv.add("B2:B501")

    mode_emploi(wb, "Objectifs d'épargne", [
        "1. Onglet « Objectifs » : remplace les exemples par tes objectifs (nom, montant visé, date visée).",
        "2. Onglet « Versements » : supprime les exemples, puis note chaque somme mise de côté",
        "   en choisissant l'objectif dans la liste déroulante.",
        "3. Reviens sur « Objectifs » : progression, reste et mensualité à verser sont calculés.",
        "",
        "Conseils :",
        "• Commence par un fonds d'urgence, même petit, avant les autres objectifs.",
        "• Un retrait se note comme un versement négatif.",
        "• « À verser par mois » se recalcule chaque mois selon la date du jour.",
    ])
    wb.active = 1
    return wb


def main():
    sorties = {
        "gratuit/budget-mensuel-simple.xlsx": budget_mensuel(),
        "payant/budget-annuel-complet.xlsx": budget_annuel(),
        "payant/objectifs-epargne.xlsx": objectifs_epargne(),
    }
    for chemin, wb in sorties.items():
        cible = DIST / chemin
        cible.parent.mkdir(parents=True, exist_ok=True)
        wb.save(cible)
        print("écrit", cible.relative_to(RACINE))
    pack = DIST / "payant" / "pack-complet.zip"
    with zipfile.ZipFile(pack, "w", zipfile.ZIP_DEFLATED) as z:
        for nom in ("budget-annuel-complet.xlsx", "objectifs-epargne.xlsx"):
            z.write(DIST / "payant" / nom, nom)
    print("écrit", pack.relative_to(RACINE))


if __name__ == "__main__":
    main()
