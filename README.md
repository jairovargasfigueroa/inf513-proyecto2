# Canal 11 - Sistema Web de Gestión de Operaciones y Noticias

INF513 Tecnología Web · Proyecto 2 · Grupo 14 SA · UAGRM FICCT · II-2026

Sistema web del Canal 11 - Televisión Universitaria UAGRM en **arquitectura de 3 capas**. Atiende el mismo negocio que el sistema vía correo del Proyecto 1, sobre la misma base de datos `db_grupo14sa`.

| Capa | Tecnología | Dónde está |
|---|---|---|
| 1. Presentación | React 18 (SPA) con Vite, React Router, Axios y Tailwind CSS | `resources/js/`, `resources/css/` |
| 2. Lógica de negocio | API RESTful en Laravel 12 (`/api/v1`) con Laravel Sanctum | `routes/api.php`, `app/` |
| 3. Persistencia | PostgreSQL (`db_grupo14sa`, compartida con el sistema vía correo) | `database/` |

React solo se comunica con la API (JSON por HTTP) y Laravel no genera pantallas: toda ruta que no es `/api/...` devuelve la página que carga la SPA.

## Base de datos

- Las **26 tablas del Proyecto 1** no se migran ni se modifican: se cargan con `database/sql/script_db_grupo14sa.sql` (y `datos_prueba.sql` en desarrollo).
- Las **8 tablas nuevas** del sistema web son migraciones de Laravel (`database/migrations/`): `preferencia_usuario`, `permiso_web`, `rol_permiso_web`, `menu`, `rol_menu`, `bitacora_acceso`, `contador_visita` y `personal_access_tokens`, más la función `fn_registrar_visita` y el trigger `tg_usuario_preferencia`.
- `migrate:fresh`, `migrate:refresh`, `migrate:reset` y `db:wipe` están **bloqueados**, porque borrarían también las tablas del sistema vía correo.

## Instalación en local

Requisitos: PHP 8.2 o superior con `pdo_pgsql`, Composer 2, Node.js 20 o superior y PostgreSQL.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

En `.env`, completar `DB_PORT` (el puerto de su PostgreSQL) y `DB_PASSWORD` (una contraseña local para el usuario `grupo14sa`). Luego crear la base y cargarla:

```bash
psql -h localhost -p 5433 -U postgres -v clave='<DB_PASSWORD>' -f database/sql/crear-bd-local.sql
psql -h localhost -p 5433 -U grupo14sa -d db_grupo14sa -f database/sql/script_db_grupo14sa.sql
psql -h localhost -p 5433 -U grupo14sa -d db_grupo14sa -f database/sql/datos_prueba.sql
php artisan migrate
```

Para trabajar, en dos terminales:

```bash
php artisan serve
npm run dev
```

y abrir <http://localhost:8000>.

## Despliegue

Se publica en <https://www.tecnoweb.org.bo/inf513/grupo14sa/proyecto2> con la base en `db.tecnoweb.org.bo`. Para la subcarpeta, en el `.env` del servidor se define `VITE_BASE_PATH=/inf513/grupo14sa/proyecto2` y `ASSET_URL` con la misma ruta, y se compila con `npm run build`.

## Flujo de trabajo con Git

- `main`: versiones entregables. `develop`: integración.
- Una rama por funcionalidad (`feat/...`, `fix/...`, `docs/...`, `chore/...`) que se integra a `develop` con un pull request.
- Mensajes de commit en español con el formato `tipo(alcance): descripción`, por ejemplo `feat(cu04): validar conflictos de horario`.
