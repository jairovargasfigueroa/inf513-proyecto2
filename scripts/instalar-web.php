<?php
// Instalador para servidores sin SSH (la base solo acepta conexiones locales). Protegido por INSTALAR_TOKEN.
// scripts/preparar-ftp.sh lo copia a dist-ftp/proyecto2/instalar.php y pone INSTALAR_TOKEN en el .env.
// Corre migrate --force y db:seed --force (y, si se pide, carga database/datos.sql); CI/CD lo llama en cada despliegue.

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../proyecto2-app/vendor/autoload.php';
$app = require_once __DIR__.'/../proyecto2-app/bootstrap/app.php';
$app->usePublicPath(__DIR__);
$app->make(Kernel::class)->bootstrap();

header('Content-Type: text/html; charset=utf-8');
$token = (string) env('INSTALAR_TOKEN', '');
if (strlen($token) < 32 || ! hash_equals($token, (string) ($_POST['token'] ?? ''))) {
    http_response_code(isset($_POST['token']) ? 403 : 200);
    exit('<form method="post"><h3>Instalar proyecto2</h3>'
        .'<p><input name="token" placeholder="INSTALAR_TOKEN" size="70" required></p>'
        .'<p>Administrador (opcional): <input name="correo" type="email" placeholder="correo">'
        .' <input name="clave" type="password" placeholder="contraseña (mín. 8)" minlength="8" maxlength="72"></p>'
        .'<p><label><input type="checkbox" name="cargar_datos" value="si"> REEMPLAZAR toda la base con '
        .'proyecto2-app/database/datos.sql (borra los datos actuales, también los del sistema por correo)</label></p>'
        .'<button>Migrar y cargar datos iniciales</button></form>');
}

$e = fn ($s) => htmlspecialchars($s, ENT_QUOTES);
echo '<pre>';
// Volcado de la base local (pg_dump --clean --inserts). En una transacción: si falla, la base queda como estaba.
$volcado = base_path('database/datos.sql');
if (($_POST['cargar_datos'] ?? '') === 'si') {
    if (! is_readable($volcado)) {
        exit('No está proyecto2-app/database/datos.sql.</pre>');
    }
    try {
        DB::transaction(fn () => DB::unprepared(file_get_contents($volcado)));
    } catch (Throwable $ex) {
        exit($e('No se cargaron los datos (la base quedó como estaba): '.$ex->getMessage()).'</pre>');
    }
    DB::purge(); // el volcado vacía search_path de la conexión
    echo "== datos.sql cargado\n\n";
}
foreach ([['migrate', ['--force' => true]], ['db:seed', ['--force' => true]]] as [$comando, $opciones]) {
    $codigo = Artisan::call($comando, $opciones);
    echo $e("== $comando (código $codigo)\n".Artisan::output()."\n");
    if ($codigo !== 0) {
        exit('Se detuvo por el error de arriba.</pre>');
    }
}

$correo = mb_strtolower(trim((string) ($_POST['correo'] ?? '')));
$clave = (string) ($_POST['clave'] ?? '');
if ($correo !== '') {
    $rol = Rol::where('nombre', Rol::ADMINISTRADOR)->firstOrFail();
    if (! filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($clave) < 8 || strlen($clave) > 72) {
        exit('Administrador no creado: correo inválido o contraseña fuera de 8 a 72 caracteres.</pre>');
    }
    // Misma lógica que «php artisan canal11:administrador» (routes/console.php).
    $usuario = Usuario::whereRaw('lower(correo) = ?', [$correo])->first();
    $usuario
        ? $usuario->update(['password' => $clave, 'rol_id' => $rol->id, 'estado' => 'activo'])
        : Usuario::create(['nombre' => 'Administrador', 'apellido' => 'del Sistema', 'ci' => '0000000',
            'correo' => $correo, 'password' => $clave, 'rol_id' => $rol->id]);
    echo $e("Administrador listo: $correo\n");
}
echo "\nListo.</pre>";
