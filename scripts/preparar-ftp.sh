#!/usr/bin/env bash
# Arma en dist-ftp/ las dos carpetas que se suben por FTP (sin SSH en el servidor):
#   proyecto2-app/  la aplicación completa (vendor incluido), cerrada al navegador con .htaccess
#   proyecto2/      lo público (index.php, .htaccess, build/), que abre la URL .../grupo14sa/proyecto2
# Las dos van lado a lado en la carpeta web del grupo.
#
#   scripts/preparar-ftp.sh [rama_o_commit]      (por defecto HEAD; solo lo commiteado)
set -euo pipefail

REF="${1:-HEAD}"
BASE_PATH="/inf513/grupo14sa/proyecto2"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$RAIZ/dist-ftp"
APP="$DIST/proyecto2-app"
WEB="$DIST/proyecto2"

rm -rf "$DIST" && mkdir -p "$APP" "$WEB"
git -C "$RAIZ" archive --format=tar "$REF" | tar -x -C "$APP"

cd "$APP"
composer install --no-dev --optimize-autoloader --no-interaction --quiet
npm ci --silent && ASSET_URL="$BASE_PATH" npm run build
rm -rf node_modules tests .github

# Lo público sale de proyecto2-app y apunta de vuelta a ella.
cp -R public/. "$WEB/"
rm -rf public/build
perl -pi -e "s#__DIR__\\.'/\\.\\./#__DIR__.'/../proyecto2-app/#g" "$WEB/index.php"
# La carpeta pública ya no es proyecto2-app/public (Vite busca ahí build/manifest.json).
perl -pi -e 's#^\$app->handleRequest#\$app->usePublicPath(__DIR__);\n\$app->handleRequest#' "$WEB/index.php"
perl -pi -e "s#RewriteEngine On#RewriteEngine On\n    RewriteBase $BASE_PATH/#" "$WEB/.htaccess"

# Nadie debe poder leer .env, vendor ni storage desde el navegador.
printf 'Require all denied\n' > "$APP/.htaccess"

# Plantilla del .env del servidor: falta DB_PASSWORD (y APP_KEY si no se generó).
CLAVE="base64:$(openssl rand -base64 32)"
perl -p -e 's#^APP_ENV=.*#APP_ENV=production#; s#^APP_DEBUG=.*#APP_DEBUG=false#; s#^LOG_LEVEL=.*#LOG_LEVEL=error#;' \
    -e 's#^DB_HOST=.*#DB_HOST=localhost#; s#^DB_PORT=.*#DB_PORT=5432#;' \
    -e "s#^APP_KEY=.*#APP_KEY=$CLAVE#; s#^APP_URL=.*#APP_URL=https://www.tecnoweb.org.bo$BASE_PATH#; s#^ASSET_URL=.*#ASSET_URL=$BASE_PATH#; s#^VITE_BASE_PATH=.*#VITE_BASE_PATH=$BASE_PATH#;" \
    .env.example > .env

# Instalador de un solo uso (migrate y seed dentro del servidor, que es el único que llega a la base).
TOKEN="$(openssl rand -hex 24)"
printf '\nINSTALAR_TOKEN=%s\n' "$TOKEN" >> .env
cp "$RAIZ/scripts/instalar-web.php" "$WEB/instalar.php"

echo
echo "Listo en $DIST. Falta escribir DB_PASSWORD en $APP/.env y subir las dos carpetas por FTP."
echo "Clave del instalar.php: $TOKEN"
