#!/bin/sh
# Télécharge les deux voix françaises libres utilisées par la chaîne (environ 140 Mo en tout).
#   sh outils/voix.sh
set -e
cd "$(dirname "$0")/../voix"
B=https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR
for v in siwis/medium/fr_FR-siwis-medium upmc/medium/fr_FR-upmc-medium; do
  n=$(basename "$v")
  [ -s "$n.onnx" ] || curl -L -o "$n.onnx" "$B/$v.onnx"
  [ -s "$n.onnx.json" ] || curl -L -o "$n.onnx.json" "$B/$v.onnx.json"
done
echo "Voix prêtes."
