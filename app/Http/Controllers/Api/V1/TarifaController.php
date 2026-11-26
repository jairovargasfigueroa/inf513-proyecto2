<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\TarifaRequest;
use App\Models\Tarifa;
use Illuminate\Http\JsonResponse;

/** TarifaController «server page» (CU-09): tarifas de los servicios que el canal cobra. */
class TarifaController extends Controller
{
    /** GET /api/v1/servicios (público): tarifas activas para el formulario de solicitud. */
    public function servicios(): JsonResponse
    {
        return response()->json(['data' => Tarifa::where('activa', true)->orderBy('monto')->get()->map(fn (Tarifa $t) => $this->datos($t))]);
    }

    /** GET /api/v1/tarifas (tarifas.gestionar). */
    public function index(): JsonResponse
    {
        return response()->json(['data' => Tarifa::orderByDesc('activa')->orderBy('servicio')->get()->map(fn (Tarifa $t) => $this->datos($t))]);
    }

    /** POST /api/v1/tarifas (tarifas.gestionar) → 201. */
    public function store(TarifaRequest $request): JsonResponse
    {
        $tarifa = Tarifa::create($request->validated());

        return response()->json(['message' => 'Tarifa registrada.', 'data' => $this->datos($tarifa->refresh())], 201);
    }

    /** PUT /api/v1/tarifas/{id} (tarifas.gestionar): cambia el precio o la desactiva; los pagos hechos no cambian. */
    public function update(TarifaRequest $request, Tarifa $tarifa): JsonResponse
    {
        $tarifa->update($request->validated());

        return response()->json(['message' => 'Tarifa actualizada.', 'data' => $this->datos($tarifa)]);
    }

    private function datos(Tarifa $t): array
    {
        return [
            'id' => $t->id, 'servicio' => $t->servicio, 'descripcion' => $t->descripcion,
            'monto' => (float) $t->monto, 'moneda' => $t->moneda, 'activa' => (bool) $t->activa,
        ];
    }
}
