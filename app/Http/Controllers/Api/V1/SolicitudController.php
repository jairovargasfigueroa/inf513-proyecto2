<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SolicitudRequest;
use App\Models\Cobertura;
use App\Models\Pago;
use App\Models\SolicitudCobertura;
use App\Models\Tarifa;
use App\Services\Pagos\PasarelaPagos;
use App\Services\Pagos\RegistroPagos;
use App\Services\ValidadorConflictos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * SolicitudController «server page» (CU-09). Parte pública (Visitante): solicitar,
 * pagar con Stripe, confirmar el pago y consultar la solicitud con su código.
 * Parte interna (Jefe de Prensa): listar, aceptar (crea la cobertura del CU-04
 * tal como la crea la Agenda) o rechazar (devuelve el pago).
 */
class SolicitudController extends Controller
{
    public function __construct(
        private PasarelaPagos $pasarela,
        private RegistroPagos $pagos,
        private ValidadorConflictos $conflictos,
    ) {}

    // ── Visitante ──────────────────────────────────────────────────────────

    /** POST /api/v1/solicitudes (público) → 201 con la dirección de pago de Stripe; 503 si los pagos no están configurados. */
    public function store(SolicitudRequest $request): JsonResponse
    {
        if (! $this->pasarela->configurada()) {
            return $this->sinPasarela();
        }

        $tarifa = Tarifa::findOrFail($request->validated('tarifa_id'));

        try {
            [$solicitud, $url] = DB::transaction(function () use ($request, $tarifa) {
                $solicitud = SolicitudCobertura::create([...$request->datos(), 'monto' => $tarifa->monto, 'moneda' => $tarifa->moneda]);

                return [$solicitud, $this->nuevoPago($solicitud->refresh())];
            });
        } catch (Throwable $e) {
            return $this->errorPasarela($e);
        }

        return response()->json([
            'message' => "Solicitud {$solicitud->codigo} registrada. Complete el pago.",
            'data' => ['codigo' => $solicitud->codigo, 'url_pago' => $url],
        ], 201);
    }

    /** POST /api/v1/solicitudes/pago (público): nueva página de pago para una solicitud que quedó sin pagar. */
    public function reintentarPago(Request $request): JsonResponse
    {
        $solicitud = $this->buscarPublica($request);
        if (! $solicitud) {
            return $this->noEncontrada();
        }
        if ($solicitud->estado !== 'pendiente_pago') {
            return response()->json(['message' => 'La solicitud ya fue pagada.'], 409);
        }
        if ($solicitud->fecha_hora_inicio->isPast()) {
            return response()->json(['message' => 'El evento ya pasó: registre una nueva solicitud.'], 409);
        }
        if (! $this->pasarela->configurada()) {
            return $this->sinPasarela();
        }

        try {
            $url = $this->nuevoPago($solicitud);
        } catch (Throwable $e) {
            return $this->errorPasarela($e);
        }

        return response()->json(['data' => ['codigo' => $solicitud->codigo, 'url_pago' => $url]]);
    }

    /** POST /api/v1/solicitudes/confirmar (público): Stripe vuelve con session_id; se consulta el pago y se registra. */
    public function confirmar(Request $request): JsonResponse
    {
        $request->validate(['session_id' => ['required', 'string', 'max:255']]);
        $pago = Pago::where('referencia', $request->input('session_id'))->first();
        if (! $pago) {
            return response()->json(['message' => 'No encontramos ese pago.'], 404);
        }

        if ($pago->estado === 'pendiente' && $pago->proveedor === 'stripe' && $this->pasarela->configurada()) {
            try {
                $estado = $this->pasarela->consultar($pago->referencia);
            } catch (Throwable $e) {
                return $this->errorPasarela($e);
            }
            if ($estado['pagado']) {
                $this->pagos->confirmar($pago, $estado['payment_intent']);
            } elseif ($estado['expirado']) {
                $this->pagos->expirar($pago);
            }
        }

        return response()->json(['data' => $this->datosPublicos($pago->solicitud()->first())]);
    }

    /** GET /api/v1/solicitudes/consulta?codigo&correo (público): estado de la solicitud. */
    public function consulta(Request $request): JsonResponse
    {
        $solicitud = $this->buscarPublica($request);

        return $solicitud ? response()->json(['data' => $this->datosPublicos($solicitud)]) : $this->noEncontrada();
    }

    // ── Jefe de Prensa / Director ───────────────────────────────────────────

    /** GET /api/v1/solicitudes?estado&desde&hasta (solicitudes.listar), con el resumen de ingresos. */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'estado' => ['nullable', 'in:'.implode(',', SolicitudCobertura::ESTADOS)],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        $periodo = SolicitudCobertura::query()
            ->when($f['desde'] ?? null, fn ($q, $d) => $q->where('creado_en', '>=', $d))
            ->when($f['hasta'] ?? null, fn ($q, $h) => $q->where('creado_en', '<', date('Y-m-d', strtotime("$h +1 day"))));

        $solicitudes = (clone $periodo)->with('tarifa')
            ->when($f['estado'] ?? null, fn ($q, $e) => $q->where('estado', $e))
            ->orderByRaw("CASE estado WHEN 'pagada' THEN 0 WHEN 'pendiente_pago' THEN 1 ELSE 2 END")
            ->orderBy('fecha_hora_inicio')
            ->get();

        $porEstado = (clone $periodo)->selectRaw('estado, COUNT(*) AS n')->groupBy('estado')->pluck('n', 'estado');
        $ingresos = (clone $periodo)->whereIn('estado', ['pagada', 'aceptada'])
            ->selectRaw('moneda, SUM(monto) AS total')->groupBy('moneda')->get()
            ->map(fn ($r) => ['moneda' => $r->moneda, 'total' => (float) $r->total]);

        return response()->json([
            'data' => $solicitudes->map(fn (SolicitudCobertura $s) => $this->resumen($s)),
            'resumen' => [
                'por_atender' => (int) ($porEstado['pagada'] ?? 0),
                'pendientes_pago' => (int) ($porEstado['pendiente_pago'] ?? 0),
                'aceptadas' => (int) ($porEstado['aceptada'] ?? 0),
                'rechazadas' => (int) ($porEstado['rechazada'] ?? 0),
                'ingresos' => $ingresos,
            ],
        ]);
    }

    /** GET /api/v1/solicitudes/{id} (solicitudes.listar): detalle, pago y personal disponible al inicio del evento. */
    public function show(SolicitudCobertura $solicitud): JsonResponse
    {
        $solicitud->load('tarifa', 'pagoCobrado', 'cobertura', 'atendidaPor');
        $disponibles = $solicitud->estado === 'pagada'
            ? collect($this->conflictos->disponibles($solicitud->fecha_hora_inicio->format('Y-m-d H:i')))
                ->groupBy('cargo')->map->count()
            : null;

        return response()->json(['data' => [
            ...$this->resumen($solicitud),
            'descripcion' => $solicitud->descripcion,
            'telefono' => $solicitud->telefono,
            'motivo_rechazo' => $solicitud->motivo_rechazo,
            'atendida_por' => $solicitud->atendidaPor?->nombre_completo,
            'fecha_atencion' => $solicitud->fecha_atencion?->format('Y-m-d H:i'),
            'cobertura' => $solicitud->cobertura ? ['id' => $solicitud->cobertura->id, 'estado' => $solicitud->cobertura->estado] : null,
            'pago' => $solicitud->pagoCobrado ? [
                'proveedor' => $solicitud->pagoCobrado->proveedor,
                'referencia' => $solicitud->pagoCobrado->referencia,
                'estado' => $solicitud->pagoCobrado->estado,
                'fecha_pago' => $solicitud->pagoCobrado->fecha_pago?->format('Y-m-d H:i'),
                'fecha_reembolso' => $solicitud->pagoCobrado->fecha_reembolso?->format('Y-m-d H:i'),
            ] : null,
            'disponibles' => $disponibles,
        ]]);
    }

    /** POST /api/v1/solicitudes/{id}/aceptar (solicitudes.gestionar): crea la cobertura planificada con los datos del evento. */
    public function aceptar(Request $request, SolicitudCobertura $solicitud): JsonResponse
    {
        $d = $request->validate([
            'prioridad' => ['required', 'in:alta,media,baja'],
            'indicaciones' => ['nullable', 'string', 'max:2000'],
        ]);
        if ($solicitud->estado !== 'pagada') {
            return response()->json(['message' => 'Solo se acepta una solicitud pagada y sin atender.'], 409);
        }
        if ($solicitud->fecha_hora_inicio->isPast()) {
            return response()->json(['message' => 'El evento ya empezó: rechace la solicitud para devolver el pago.'], 409);
        }

        $cobertura = DB::transaction(function () use ($request, $solicitud, $d) {
            $contacto = trim("{$solicitud->solicitante}".($solicitud->institucion ? " ({$solicitud->institucion})" : '')
                .($solicitud->telefono ? " · {$solicitud->telefono}" : ''));
            $cobertura = Cobertura::create([
                'titulo' => $solicitud->titulo,
                'tema' => $solicitud->descripcion ? mb_substr($solicitud->descripcion, 0, 255) : null,
                'tipo' => $solicitud->tipo,
                'fecha_hora_inicio' => $solicitud->fecha_hora_inicio,
                'fecha_hora_fin' => $solicitud->fecha_hora_fin,
                'lugar' => $solicitud->lugar,
                'prioridad' => $d['prioridad'],
                'fuente' => mb_substr("Solicitud {$solicitud->codigo}: {$contacto}", 0, 200),
                'indicaciones' => $d['indicaciones'] ?? null,
                'creado_por' => $request->user()->id,
            ]);
            $solicitud->update([
                'estado' => 'aceptada', 'cobertura_id' => $cobertura->id,
                'atendida_por' => $request->user()->id, 'fecha_atencion' => now(),
            ]);

            return $cobertura;
        });

        return response()->json([
            'message' => "Solicitud aceptada: se creó la cobertura «{$cobertura->titulo}». Asígnele el personal y los recursos.",
            'data' => ['cobertura_id' => $cobertura->id],
        ]);
    }

    /** POST /api/v1/solicitudes/{id}/rechazar (solicitudes.gestionar): devuelve el pago y guarda el motivo. */
    public function rechazar(Request $request, SolicitudCobertura $solicitud): JsonResponse
    {
        $d = $request->validate(['motivo' => ['required', 'string', 'max:500']]);
        if ($solicitud->estado !== 'pagada') {
            return response()->json(['message' => 'Solo se rechaza una solicitud pagada y sin atender.'], 409);
        }

        $pago = $solicitud->pagoCobrado()->first();
        if ($pago && $pago->proveedor === 'stripe') {
            if (! $pago->payment_intent || ! $this->pasarela->configurada()) {
                return response()->json(['message' => 'No se puede devolver el pago desde aquí: hágalo en el panel de Stripe.'], 409);
            }
            try {
                $this->pasarela->reembolsar($pago->payment_intent);
            } catch (Throwable $e) {
                return $this->errorPasarela($e);
            }
        }

        DB::transaction(function () use ($request, $solicitud, $pago, $d) {
            $pago?->update(['estado' => 'reembolsado', 'fecha_reembolso' => now()]);
            $solicitud->update([
                'estado' => 'rechazada', 'motivo_rechazo' => $d['motivo'],
                'atendida_por' => $request->user()->id, 'fecha_atencion' => now(),
            ]);
        });

        return response()->json(['message' => 'Solicitud rechazada y pago devuelto.']);
    }

    // ── Apoyo ──────────────────────────────────────────────────────────────

    /** Crea la sesión de Stripe Checkout y su pago pendiente; devuelve la dirección de pago. */
    private function nuevoPago(SolicitudCobertura $solicitud): string
    {
        $solicitud->loadMissing('tarifa');
        $checkout = $this->pasarela->crearCheckout(
            $solicitud,
            url('/solicitar/pago-recibido').'?session_id={CHECKOUT_SESSION_ID}',
            url('/solicitar/consulta').'?codigo='.$solicitud->codigo.'&cancelado=1',
        );
        Pago::create([
            'solicitud_id' => $solicitud->id, 'proveedor' => 'stripe', 'referencia' => $checkout['referencia'],
            'monto' => $solicitud->monto, 'moneda' => $solicitud->moneda,
        ]);

        return $checkout['url'];
    }

    /** Busca por código y correo (los dos tienen que coincidir); null si no existe. */
    private function buscarPublica(Request $request): ?SolicitudCobertura
    {
        $d = $request->validate([
            'codigo' => ['required', 'string', 'max:12'],
            'correo' => ['required', 'email', 'max:150'],
        ]);

        return SolicitudCobertura::with('tarifa')
            ->where('codigo', mb_strtoupper(trim($d['codigo'])))
            ->where('correo', mb_strtolower(trim($d['correo'])))
            ->first();
    }

    private function noEncontrada(): JsonResponse
    {
        return response()->json(['message' => 'No encontramos una solicitud con ese código y correo.'], 404);
    }

    /** Lo que ve el Visitante: sin datos internos del canal. */
    private function datosPublicos(SolicitudCobertura $s): array
    {
        $s->loadMissing('tarifa');

        return [
            'codigo' => $s->codigo,
            'estado' => $s->estado,
            'servicio' => $s->tarifa->servicio,
            'monto' => (float) $s->monto,
            'moneda' => $s->moneda,
            'titulo' => $s->titulo,
            'lugar' => $s->lugar,
            'fecha_hora_inicio' => $s->fecha_hora_inicio->format('Y-m-d H:i'),
            'fecha_hora_fin' => $s->fecha_hora_fin->format('Y-m-d H:i'),
            'motivo_rechazo' => $s->estado === 'rechazada' ? $s->motivo_rechazo : null,
        ];
    }

    private function resumen(SolicitudCobertura $s): array
    {
        return [
            'id' => $s->id,
            'codigo' => $s->codigo,
            'estado' => $s->estado,
            'servicio' => $s->tarifa->servicio,
            'monto' => (float) $s->monto,
            'moneda' => $s->moneda,
            'solicitante' => $s->solicitante,
            'institucion' => $s->institucion,
            'correo' => $s->correo,
            'titulo' => $s->titulo,
            'tipo' => $s->tipo,
            'lugar' => $s->lugar,
            'fecha_hora_inicio' => $s->fecha_hora_inicio->format('Y-m-d H:i'),
            'fecha_hora_fin' => $s->fecha_hora_fin->format('Y-m-d H:i'),
            'cobertura_id' => $s->cobertura_id,
            'creado_en' => $s->creado_en?->format('Y-m-d H:i'),
        ];
    }

    private function sinPasarela(): JsonResponse
    {
        return response()->json(['message' => 'Los pagos en línea no están disponibles por ahora. Intente más tarde.'], 503);
    }

    private function errorPasarela(Throwable $e): JsonResponse
    {
        Log::warning('CU-09 Stripe: '.$e->getMessage());

        return response()->json(['message' => 'No pudimos comunicarnos con la pasarela de pagos. Intente de nuevo.'], 502);
    }
}
