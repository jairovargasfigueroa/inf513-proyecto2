# Despliegue en el servidor tecnoweb

El sistema se publica en <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2> con la base
`db_grupo14sa` en `db.tecnoweb.org.bo`, la misma que usa el sistema vía correo (Proyecto 1).

## 1. Lo que hace falta

| Qué | Para qué |
|---|---|
| Usuario y contraseña de SSH del grupo | Subir el proyecto |
| Usuario y contraseña de la base `db_grupo14sa` | El `.env` del servidor |
| PHP 8.2 o superior con `pdo_pgsql`, `mbstring`, `openssl`, `fileinfo` | Laravel 12 |
| Composer en el servidor (o subir la carpeta `vendor`) | Dependencias de PHP |

Comprobar en el servidor: `php -v`, `php -m | grep -i pgsql` y `composer --version`.

## 2. Compilar el frontend en la PC

React se compila en la PC y se sube ya compilado (el servidor no necesita Node). La ruta de la
subcarpeta se fija al compilar:

```bash
MSYS_NO_PATHCONV=1 ASSET_URL=/inf513/grupo14sa/proyecto2 npm run build
```

`MSYS_NO_PATHCONV=1` solo hace falta en Git Bash de Windows (evita que convierta la ruta). En
PowerShell: `$env:ASSET_URL="/inf513/grupo14sa/proyecto2"; npm run build`.

## 3. Subir el proyecto

La aplicación queda **fuera** de la carpeta pública y solo `public/` se publica, así el `.env`
nunca es accesible desde el navegador:

```bash
# en la PC (sin vendor ni node_modules; public/build sí va)
tar --exclude=vendor --exclude=node_modules --exclude=.git --exclude=.env -czf proyecto2.tar.gz .
scp proyecto2.tar.gz grupo14sa@www.tecnoweb.org.bo:~
```

```bash
# en el servidor
mkdir -p ~/proyecto2-app && tar -xzf ~/proyecto2.tar.gz -C ~/proyecto2-app
cd ~/proyecto2-app && composer install --no-dev --optimize-autoloader
ln -s ~/proyecto2-app/public ~/public_html/proyecto2   # la carpeta pública del grupo
chmod -R u+rwX storage bootstrap/cache
```

Si el servidor no permite enlaces simbólicos, copiar el contenido de `public/` a
`~/public_html/proyecto2` y en ese `index.php` cambiar las dos rutas `__DIR__.'/../…'` por
`'/home/grupo14sa/proyecto2-app/…'`.

Si Apache responde 404 en las rutas internas, agregar en `public/.htaccess`, debajo de
`RewriteEngine On`:

```apache
RewriteBase /inf513/grupo14sa/proyecto2/
```

## 4. Configurar el `.env` del servidor

```bash
cp .env.example .env && chmod 600 .env && nano .env
php artisan key:generate
```

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2
ASSET_URL=/inf513/grupo14sa/proyecto2
VITE_BASE_PATH=/inf513/grupo14sa/proyecto2

DB_HOST=db.tecnoweb.org.bo   # o localhost, si es el mismo servidor que usa el sistema vía correo
DB_PORT=5432
DB_DATABASE=db_grupo14sa
DB_USERNAME=grupo14sa
DB_PASSWORD=…                # la que dio el docente
```

## 5. Base de datos

Las 26 tablas del Proyecto 1 ya están en `db_grupo14sa` (las cargó el sistema vía correo): **no
se vuelven a cargar**. Solo se agregan las 8 tablas del sistema web y sus datos iniciales:

```bash
php artisan migrate --force
php artisan db:seed --force          # rol Administrador, 65 permisos, matriz y menú
php artisan canal11:administrador correo.del.admin@gmail.com   # pide la contraseña
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

En producción **no** se crean cuentas de prueba. Si la base del servidor tiene los usuarios de
`datos_prueba.sql`, todos comparten la contraseña de prueba: cámbiela a cada uno (Gestión de
Usuarios) antes de la defensa, o al menos a los que se vayan a usar.

`migrate:fresh`, `migrate:refresh`, `migrate:reset` y `db:wipe` están bloqueados: borrarían
también las tablas del sistema vía correo.

## 6. Comprobar

1. Abrir <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2>: debe verse la grilla del día.
2. `https://…/proyecto2/api/v1/estado` debe responder `{"estado":"ok"}`.
3. Iniciar sesión con el Administrador y revisar el menú, la bitácora y el contador del pie.

## 7. Actualizar después

```bash
# PC: compilar (paso 2) y subir el nuevo comprimido
cd ~/proyecto2-app && tar -xzf ~/proyecto2.tar.gz
composer install --no-dev --optimize-autoloader
php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache
```
