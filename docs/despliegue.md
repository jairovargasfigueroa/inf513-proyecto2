# Despliegue en el servidor tecnoweb

El sistema se publica en <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2> con la base
`db_grupo14sa`, la misma que usa el sistema vía correo (Proyecto 1). Se despliega **por FTP**, sin
SSH: la app se arma en la PC (o en GitHub Actions) y se sube ya lista.

Datos del servidor (noviembre de 2026):

| Qué | Valor |
|---|---|
| FTP | `139.99.68.169`, puerto 21, usuario `grupo14sa` (el DNS de tecnoweb falla a ratos: usar la IP) |
| Base | PostgreSQL `db_grupo14sa`, usuario `grupo14sa`. **Solo acepta conexiones desde el propio servidor** (desde fuera: `Connection refused`), por eso el `.env` usa `DB_HOST=localhost` |
| PHP | 8.2 o superior con `pdo_pgsql` |

> El firewall del servidor (sshguard) bloquea la IP tras varios intentos fallidos de contraseña o
> consultas seguidas. Probar la contraseña **una vez** y esperar antes de repetir.

## Estructura en el servidor

```
<carpeta FTP del grupo>/            → https://www.tecnoweb.org.bo/inf513/grupo14sa/
├── proyecto2/                      lo público: index.php, .htaccess, build/  → …/proyecto2
└── proyecto2-app/                  la aplicación (vendor, .env, storage); .htaccess «Require all denied»
```

## Primera vez (a mano)

### 1. Armar la app en la PC

```bash
scripts/preparar-ftp.sh develop        # o main, o la rama que se va a presentar (solo lo commiteado)
```

Deja en `dist-ftp/` las dos carpetas, con `vendor` sin dependencias de desarrollo, React compilado
para la subcarpeta, `index.php` apuntando a `../proyecto2-app/` y un `.env` de producción con
`APP_KEY` e `INSTALAR_TOKEN` generados. Necesita PHP, Composer y Node en la PC.

### 2. Completar el `.env`

En `dist-ftp/proyecto2-app/.env` escribir `DB_PASSWORD=`. Guardar una copia de este `.env` fuera
del repo: el script lo regenera cada vez.

### 3. Subir con FileZilla

1. Arrastrar `dist-ftp/proyecto2-app` y `dist-ftp/proyecto2` a la carpeta del grupo, una al lado
   de la otra.
2. Permisos `777` (recursivo) a `proyecto2-app/storage` y `proyecto2-app/bootstrap/cache`.

### 4. Crear las tablas y los datos iniciales

Como la base solo acepta conexiones locales, `migrate` y `db:seed` corren dentro del servidor con
el instalador de un solo uso:

1. Abrir <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2/instalar.php>.
2. Pegar `INSTALAR_TOKEN` (del `.env`), el correo y la contraseña del Administrador, y enviar.
3. Debe mostrar `migrate (código 0)`, `db:seed (código 0)` y «Administrador listo».
4. **Borrar `proyecto2/instalar.php` del servidor.**

Las 26 tablas del Proyecto 1 ya están en `db_grupo14sa` (las cargó el sistema vía correo) y no se
tocan. `migrate` agrega las 8 tablas web; `db:seed` carga el rol Administrador, los permisos, la
matriz de accesos y el menú. Con `APP_ENV=production` no crea cuentas de prueba, y repetirlo no
duplica nada.

`migrate:fresh`, `migrate:refresh`, `migrate:reset` y `db:wipe` están bloqueados: borrarían también
las tablas del sistema vía correo. `scripts/reiniciar_demo.sh` **borra toda la base**: es solo
para la base local.

### 5. Comprobar

1. <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2/api/v1/estado> → `{"estado":"ok"}`.
2. <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2> → la app; iniciar sesión con el Administrador.
3. <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2-app/.env> → **403**. Si muestra el
   archivo, borrarlo del servidor y cambiar la contraseña de la base.

Si algo responde 500, bajar `proyecto2-app/storage/logs/laravel.log` por FTP.

## Después: CI/CD con GitHub Actions

`.github/workflows/ci-cd.yml` tiene dos trabajos:

- **pruebas** (cada push y pull request): levanta PostgreSQL, carga `database/sql/` (la base del
  correo), corre las migraciones y el seeder y luego `php artisan test`.
- **desplegar** (solo con push a `main`, si las pruebas pasan): corre `scripts/preparar-ftp.sh`,
  quita el `.env` y el instalador, y sube por FTP solo los archivos que cambiaron. Nunca pisa el
  `.env` del servidor.

Secretos del repo (*Settings → Secrets and variables → Actions*):

| Secreto | Valor |
|---|---|
| `FTP_SERVER` | `139.99.68.169` |
| `FTP_USERNAME` | `grupo14sa` |
| `FTP_PASSWORD` | la contraseña del FTP |
| `FTP_DIR` | la carpeta del grupo en el FTP, terminada en `/` (la que contiene `proyecto2/`) |

Flujo: rama → pull request a `develop` → pull request de `develop` a `main` → se despliega solo.
Si la versión trae **migraciones nuevas**, subir otra vez `instalar.php` (sale en `dist-ftp/` al
correr el script), abrirlo y borrarlo.
