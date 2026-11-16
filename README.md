# Canal 11 - Sistema Web de Gestión de Operaciones y Noticias

INF513 Tecnología Web · Proyecto 2 · Grupo 14 SA · UAGRM FICCT · II-2026

Sistema web del Canal 11 - Televisión Universitaria UAGRM en **arquitectura de 3 capas**. Atiende el
mismo negocio que el sistema vía correo del Proyecto 1, sobre la misma base de datos `db_grupo14sa`:
lo que se hace por correo se ve en la web y al revés.

| Capa | Tecnología | Dónde está |
|---|---|---|
| 1. Presentación | React 18 (SPA) con Vite, React Router, Axios, Tailwind CSS, Recharts y Headless UI | `resources/js/`, `resources/css/` |
| 2. Lógica de negocio | API RESTful en Laravel 12 (`/api/v1`) con Laravel Sanctum | `routes/api.php`, `app/` |
| 3. Persistencia | PostgreSQL (`db_grupo14sa`, compartida con el sistema vía correo) | `database/` |

React solo se comunica con la API (JSON por HTTP con un token Bearer) y Laravel no genera pantallas:
toda ruta que no es `/api/...` devuelve la página que carga la SPA.

## Casos de uso

Cada caso de uso implementa su **diagrama de navegación** de Enterprise Architect: cada «client page»
es una pantalla de React, cada «form» un formulario y cada «server page» un controlador de
`app/Http/Controllers/Api/V1`. Los cambios al modelo hechos durante la implementación están en
[`docs/ajustes-al-modelo.md`](docs/ajustes-al-modelo.md).

| CU | Pantallas |
|---|---|
| CU-01 Gestión de Usuarios | Gestión de Usuarios, Mi Perfil, Matriz de Accesos, Menú Dinámico |
| CU-02 Personal de Prensa, Turnos y Disponibilidad | Gestión de Personal, Ausencias, Disponibilidad del Personal, Gestión de Turnos |
| CU-03 Inventario, Asignación y Mantenimiento | Inventario de Recursos, Préstamos de Recursos |
| CU-04 Planificar Coberturas y Validar Conflictos | Agenda (día y semana), Detalle de Cobertura, Hoja de Asignación (QR, mapa, impresión) |
| CU-05 Notas (NRCS), Material y Aprobación | Gestión de Notas, Detalle de Nota, Historial del Guion (comparación), Material Audiovisual |
| CU-06 Plantillas y Escaleta del Noticiero | Programas y Grilla, Plantillas, Escaletas, Editor de Escaleta (arrastrar y soltar), Vista del Presentador |
| CU-07 Analítica Periodística | Panel Analítico (gráficos), Analítica Periodística |
| CU-08 Reportes y Estadísticas | Reportes (CSV e impresión), Bitácora de Comandos, Bitácora de Accesos |

## Requisitos de la consigna

| Punto | Implementación |
|---|---|
| 1-2. Navegación y roles | 7 roles de negocio + Administrador; menú lateral armado desde las tablas `menu` y `rol_menu` |
| 3. Laravel + React | API RESTful con Sanctum y SPA con Axios |
| 4. Matriz de accesos y bitácora | Middleware `permiso:<código>` (403) y `RegistrarBitacora`: inicios de sesión exitosos y fallidos, IP, recurso y recursos más accedidos |
| 5. Temas y accesibilidad | Niños, Jóvenes y Adultos con modo día, noche o automático; A−, A, A+, alto contraste, foco visible, etiquetas y errores enlazados |
| 6. Validación | En el cliente (`resources/js/validation`) y en el servidor (FormRequests), con mensajes en español (`lang/es`) |
| 7. Contador de visitas | En el pie de cada página (`contador_visita` y `fn_registrar_visita`) |
| 8. Estadísticas | Panel Analítico con indicadores y gráficos del negocio y de los accesos |
| 9. Búsqueda global | Buscador predictivo en el encabezado, con resultados según los permisos del rol |
| 10. Pagos | No se incluye (decisión del grupo) |

## Base de datos

- Las **26 tablas del Proyecto 1** no se migran ni se modifican: se cargan con
  `database/sql/script_db_grupo14sa.sql` (y `datos_prueba.sql` en desarrollo).
- Las **8 tablas nuevas** del sistema web son migraciones de Laravel: `preferencia_usuario`,
  `permiso_web`, `rol_permiso_web`, `menu`, `rol_menu`, `bitacora_acceso`, `contador_visita` y
  `personal_access_tokens`, más la función `fn_registrar_visita` y el trigger `tg_usuario_preferencia`.
- `migrate:fresh`, `migrate:refresh`, `migrate:reset` y `db:wipe` están **bloqueados**, porque
  borrarían también las tablas del sistema vía correo.
- La conexión usa la zona horaria `America/La_Paz` (`DB_TIMEZONE`).

## Instalación en local

Requisitos: PHP 8.2 o superior con `pdo_pgsql`, Composer 2, Node.js 20 o superior y PostgreSQL.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

En `.env`, completar `DB_PORT` (el puerto de su PostgreSQL) y `DB_PASSWORD` (una contraseña local
para el usuario `grupo14sa`). Luego crear la base y cargarla:

```bash
psql -h localhost -p 5433 -U postgres -v clave='<DB_PASSWORD>' -f database/sql/crear-bd-local.sql
psql -h localhost -p 5433 -U grupo14sa -d db_grupo14sa -f database/sql/script_db_grupo14sa.sql
psql -h localhost -p 5433 -U grupo14sa -d db_grupo14sa -f database/sql/datos_prueba.sql
php artisan migrate
php artisan db:seed
```

Para trabajar, en dos terminales: `php artisan serve` y `npm run dev`, y abrir <http://localhost:8000>.

Cuentas de prueba (solo en desarrollo; todas con la contraseña de prueba de `datos_prueba.sql`):
`admin@canal11.test` (Administrador), `director@canal11.test`, `jefe.prensa@canal11.test`,
`area.tecnica@canal11.test`, `carla.rojas@canal11.test` (Periodista), `jorge.mendoza@canal11.test`
(Camarógrafo), `patricia.saucedo@canal11.test` (Editora) y `mariana.terceros@canal11.test` (Presentadora).

## Pruebas

```bash
php artisan test
```

89 pruebas de características (PHPUnit) sobre la base local: éxito, 401, 403, 409, 422 y 429 de cada
caso de uso y su registro en la bitácora. Cada prueba corre en una transacción que se deshace.

## Despliegue

Ver [`docs/despliegue.md`](docs/despliegue.md): compilar con `ASSET_URL=/inf513/grupo14sa/proyecto2`,
publicar solo `public/`, migrar las 8 tablas, sembrar la seguridad y crear el Administrador con
`php artisan canal11:administrador <correo>`.

El comprimido de entrega se arma con `scripts/empaquetar.sh <documento.pdf> [documento.docx] [modelo.eap]`.

## Flujo de trabajo con Git

- `main`: versiones entregables. `develop`: integración.
- Una rama por funcionalidad (`feat/...`, `fix/...`, `docs/...`) que se integra a `develop` con un pull request.
- Mensajes de commit en español con el formato `tipo(alcance): descripción`.
