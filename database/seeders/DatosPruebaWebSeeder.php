<?php

namespace Database\Seeders;

use App\Models\Pago;
use App\Models\Rol;
use App\Models\SolicitudCobertura;
use App\Models\Tarifa;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

/**
 * Datos de prueba del sistema web (solo en desarrollo): la cuenta del
 * Administrador del Sistema, que no existe en los datos del Proyecto 1. Usa la
 * misma contraseña de prueba que las demás cuentas de datos_prueba.sql.
 * Para el CU-09: dos tarifas y una solicitud ya pagada (pago de «prueba», sin
 * Stripe) para mostrar la atención del Jefe de Prensa sin configurar claves.
 */
class DatosPruebaWebSeeder extends Seeder
{
    public function run(): void
    {
        Usuario::firstOrCreate(['correo' => 'admin@canal11.test'], [
            'nombre' => 'Administrador',
            'apellido' => 'del Sistema',
            'ci' => '3100000',
            'password' => 'canal11',
            'rol_id' => Rol::where('nombre', Rol::ADMINISTRADOR)->value('id'),
        ]);

        $cobertura = Tarifa::firstOrCreate(['servicio' => 'Cobertura para el noticiero'], [
            'descripcion' => 'Un periodista y un camarógrafo cubren el evento; la nota sale en el Noticiero Central.',
            'monto' => 50, 'moneda' => 'USD',
        ]);
        Tarifa::firstOrCreate(['servicio' => 'Transmisión en vivo'], [
            'descripcion' => 'Unidad móvil y equipo de transmisión para emitir el evento en directo.',
            'monto' => 150, 'moneda' => 'USD',
        ]);

        if (SolicitudCobertura::where('titulo', 'Acto de graduación de la Facultad de Medicina')->exists()) {
            return;
        }
        $dia = now()->addDays(5)->format('Y-m-d');
        $solicitud = SolicitudCobertura::create([
            'tarifa_id' => $cobertura->id, 'solicitante' => 'Lucía Méndez', 'institucion' => 'Facultad de Medicina - UAGRM',
            'correo' => 'lucia.mendez@ejemplo.test', 'telefono' => '70011223',
            'titulo' => 'Acto de graduación de la Facultad de Medicina',
            'descripcion' => 'Graduación de 120 nuevos médicos en el Paraninfo Universitario, con la presencia del rector.',
            'tipo' => 'acto_institucional', 'lugar' => 'Paraninfo Universitario',
            'fecha_hora_inicio' => "$dia 10:00", 'fecha_hora_fin' => "$dia 12:00",
            'monto' => $cobertura->monto, 'moneda' => $cobertura->moneda, 'estado' => 'pagada',
        ]);
        Pago::create([
            'solicitud_id' => $solicitud->id, 'proveedor' => 'prueba', 'referencia' => 'prueba_'.$solicitud->refresh()->codigo,
            'monto' => $solicitud->monto, 'moneda' => $solicitud->moneda, 'estado' => 'pagado', 'fecha_pago' => now(),
        ]);
    }
}
