#!/usr/bin/env bash
# Arma el comprimido de entrega de la consigna: AÑO-SEM_INF513-P2_grupoXXsa.tar.gz
# con el código fuente de Laravel y React y la documentación técnica.
#
# Uso:  scripts/empaquetar.sh "ruta/al/Documento.pdf" ["ruta/al/Documento.docx"] ["ruta/al/modelo.eap"]
set -euo pipefail

NOMBRE="2026-2_INF513-P2_grupo14sa"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
TEMP="$(mktemp -d)"
DESTINO="$TEMP/$NOMBRE"

mkdir -p "$DESTINO/codigo" "$DESTINO/documentacion"

# Código fuente versionado (sin dependencias, sin .env y sin archivos compilados).
git -C "$RAIZ" archive --format=tar HEAD | tar -x -C "$DESTINO/codigo"

# Documentación técnica: los archivos que se pasen como argumentos.
for archivo in "$@"; do
    cp "$archivo" "$DESTINO/documentacion/"
done
cp "$RAIZ/docs/"*.md "$DESTINO/documentacion/"

tar -czf "$RAIZ/$NOMBRE.tar.gz" -C "$TEMP" "$NOMBRE"
rm -rf "$TEMP"
echo "Listo: $RAIZ/$NOMBRE.tar.gz"
