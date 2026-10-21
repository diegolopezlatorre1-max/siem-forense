#!/usr/bin/env bash
# Genera docs/export/SIEM_Forense.docx a partir del Markdown de docs/.
# Requiere pandoc (Windows: winget install JohnMacFarlane.Pandoc · Ubuntu: sudo apt install pandoc).
# Sin pandoc local, usa la imagen de Docker pandoc/core.
set -euo pipefail

raiz="$(cd "$(dirname "$0")/.." && pwd)"
cd "$raiz/docs"

archivos=(README.md 0*.md 1*.md adr/0*.md)
salida="export/SIEM_Forense.docx"
mkdir -p export

if command -v pandoc >/dev/null 2>&1; then
  pandoc "${archivos[@]}" -o "$salida" --toc --resource-path=. \
    --metadata title="SIEM Forense Centralizado"
else
  docker run --rm -v "$PWD:/data" -u "$(id -u):$(id -g)" pandoc/core:3.5 \
    "${archivos[@]}" -o "$salida" --toc --resource-path=. \
    --metadata title="SIEM Forense Centralizado"
fi

echo "Generado docs/$salida"
