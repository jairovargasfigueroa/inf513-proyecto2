<?php

namespace App\Services;

use App\Exceptions\ReglaNegocioException;
use App\Models\Rol;
use App\Models\Usuario;

/**
 * Reglas de negocio de la Gestión de Usuarios (CU-01). Las del Director vienen
 * del sistema vía correo; las del Administrador protegen el acceso a la web.
 */
class ReglasUsuarios
{
    /** Roles de los que siempre debe quedar al menos un usuario activo. */
    private const ROLES_INDISPENSABLES = ['Director', Rol::ADMINISTRADOR];

    /** Solo un Administrador administra cuentas de Administrador. */
    public function verificarQuienAdministra(Usuario $actor, ?Usuario $objetivo, ?int $rolNuevoId): void
    {
        $adminId = Rol::where('nombre', Rol::ADMINISTRADOR)->value('id');
        $tocaAdministrador = $objetivo?->rol_id === $adminId || $rolNuevoId === $adminId;

        if ($tocaAdministrador && $actor->rol_id !== $adminId) {
            throw new ReglaNegocioException('Solo un Administrador puede gestionar cuentas con el rol Administrador.');
        }
    }

    /** Al modificar: nadie se desactiva ni se quita el rol a sí mismo, y no queda sin Director ni Administrador. */
    public function verificarCambio(Usuario $actor, Usuario $usuario, int $rolNuevoId, string $estadoNuevo): void
    {
        $desactiva = $estadoNuevo === 'inactivo' && $usuario->estado === 'activo';
        $cambiaRol = $rolNuevoId !== $usuario->rol_id;

        if ($actor->id === $usuario->id && ($desactiva || $cambiaRol)) {
            throw new ReglaNegocioException('No puede desactivarse ni cambiarse el rol a sí mismo; pídaselo a otro usuario con permiso.');
        }

        if ($desactiva || $cambiaRol) {
            $this->verificarQueQuedeOtro($usuario);
        }
    }

    /** Al desactivar (DELETE /usuarios/{id}). */
    public function verificarDesactivacion(Usuario $actor, Usuario $usuario): void
    {
        if ($actor->id === $usuario->id) {
            throw new ReglaNegocioException('No puede desactivarse a sí mismo; pídaselo a otro usuario con permiso.');
        }
        if ($usuario->estado === 'inactivo') {
            throw new ReglaNegocioException('El usuario ya está inactivo.');
        }

        $this->verificarQueQuedeOtro($usuario);
    }

    private function verificarQueQuedeOtro(Usuario $usuario): void
    {
        $rol = $usuario->rol->nombre;
        if (! in_array($rol, self::ROLES_INDISPENSABLES, true) || $usuario->estado !== 'activo') {
            return;
        }

        $quedaOtro = Usuario::where('rol_id', $usuario->rol_id)
            ->where('estado', 'activo')
            ->where('id', '<>', $usuario->id)
            ->exists();

        if (! $quedaOtro) {
            throw new ReglaNegocioException("Debe quedar al menos un usuario activo con el rol $rol.");
        }
    }
}
