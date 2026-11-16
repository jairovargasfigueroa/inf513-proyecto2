-- =====================================================================
-- Crea en el PostgreSQL local el mismo usuario y base que en tecnoweb
-- (solo para desarrollo; en el servidor la base ya viene creada).
--
-- Uso (pide la contraseña del usuario postgres):
--   psql -h localhost -p 5433 -U postgres -v clave='<DB_PASSWORD de tu .env>' -f database/sql/crear-bd-local.sql
-- =====================================================================
\if :{?clave}
\else
  \echo 'Falta la contraseña: agregue -v clave=''...'' (la misma que DB_PASSWORD en .env).'
  \quit
\endif

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'grupo14sa') AS existe_rol \gset
\if :existe_rol
  ALTER ROLE grupo14sa PASSWORD :'clave';
\else
  CREATE ROLE grupo14sa LOGIN PASSWORD :'clave';
\endif

SELECT 'CREATE DATABASE db_grupo14sa OWNER grupo14sa ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'db_grupo14sa')\gexec
