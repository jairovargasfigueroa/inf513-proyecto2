<?php

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;

/*
| Crea la cuenta del Administrador del Sistema en el servidor (en producción no
| se cargan los datos de prueba). Pide la contraseña sin mostrarla.
|   php artisan canal11:administrador correo@dominio.com
*/
Artisan::command('canal11:administrador {correo} {--nombre=Administrador} {--apellido=del Sistema} {--ci=0000000}', function (string $correo) {
    $rol = Rol::where('nombre', Rol::ADMINISTRADOR)->first();
    if (! $rol) {
        $this->error('Falta el rol Administrador: corra antes «php artisan db:seed --force».');

        return 1;
    }

    $correo = mb_strtolower(trim($correo));
    $clave = $this->secret('Contraseña (al menos 8 caracteres)');
    $datos = ['correo' => $correo, 'password' => $clave, 'password_confirmation' => $this->secret('Repita la contraseña')];

    $v = Validator::make($datos, ['correo' => ['required', 'email', 'max:150'], 'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed']]);
    if ($v->fails()) {
        foreach ($v->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }

    $usuario = Usuario::whereRaw('lower(correo) = ?', [$correo])->first();
    if ($usuario) {
        $usuario->update(['password' => $clave, 'rol_id' => $rol->id, 'estado' => 'activo']);
        $this->info("La cuenta $correo ahora es Administrador.");
    } else {
        Usuario::create([
            'nombre' => $this->option('nombre'), 'apellido' => $this->option('apellido'), 'ci' => $this->option('ci'),
            'correo' => $correo, 'password' => $clave, 'rol_id' => $rol->id,
        ]);
        $this->info("Cuenta de Administrador creada: $correo.");
    }

    return 0;
})->purpose('Crea o actualiza la cuenta del Administrador del Sistema');
