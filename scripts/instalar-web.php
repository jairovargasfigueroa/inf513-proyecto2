<?php
// Instalador de un solo uso para servidores sin SSH (la base solo acepta conexiones locales).
// scripts/preparar-ftp.sh lo copia a dist-ftp/proyecto2/instalar.php y pone INSTALAR_TOKEN en el .env.
// Corre migrate --force y db:seed --force, y crea el Administrador. BORRARLO del servidor al terminar.

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

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
        .'<button>Migrar y cargar datos iniciales</button></form>');
}

$e = fn ($s) => htmlspecialchars($s, ENT_QUOTES);
echo '<pre>';
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
echo "\nListo. BORRE instalar.php del servidor ahora.</pre>";
