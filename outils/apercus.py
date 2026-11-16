"""Images d'aperçu des tableurs payants pour les annonces (une par onglet).

Usage : python produits/generer.py puis python outils/apercus.py
Demande LibreOffice (soffice), pdftoppm et Pillow.
"""
import openpyxl, subprocess, glob, os, tempfile
from openpyxl.worksheet.properties import PageSetupProperties
from PIL import Image, ImageChops
src, out = "produits/dist/payant", "vente/visuels/etsy"

# Profil LibreOffice temporaire réglé en français, pour afficher « 1 800,00 € ».
PROFIL = tempfile.mkdtemp()
os.makedirs(PROFIL + "/user")
open(PROFIL + "/user/registrymodifications.xcu", "w").write('''<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry">
<item oor:path="/org.openoffice.Setup/L10N"><prop oor:name="ooSetupSystemLocale" oor:op="fuse"><value>fr-FR</value></prop></item>
</oor:items>''')
os.makedirs(out, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*.xlsx'))):
    nom = os.path.basename(f)[:-5]
    wb = openpyxl.load_workbook(f)
    for ws in wb:
        ws.page_setup.orientation = 'landscape'
        ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 1
        if ws.max_row > 60:
            ws.print_area = f"A1:{openpyxl.utils.get_column_letter(ws.max_column)}32"
    tmp = os.path.join(out, nom + '-tmp.xlsx'); wb.save(tmp)
    subprocess.run(['soffice', '-env:UserInstallation=file://' + PROFIL, '--headless', '--convert-to', 'pdf', '--outdir', out, tmp], capture_output=True)
    pdf = tmp[:-5] + '.pdf'
    subprocess.run(['pdftoppm', '-r', '200', '-png', pdf, os.path.join(out, nom)])
    os.remove(tmp); os.remove(pdf)
for p in sorted(glob.glob(os.path.join(out, '*.png'))):
    im = Image.open(p).convert('RGB')
    box = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).getbbox()
    if not box: os.remove(p); continue
    im = im.crop(box); m = 80
    fond = Image.new('RGB', (im.width + 2*m, im.height + 2*m), 'white'); fond.paste(im, (m, m)); fond.save(p)
    print(p, fond.size)
