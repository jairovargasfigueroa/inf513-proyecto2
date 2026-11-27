<?php

namespace App\Http\Requests;

use App\Models\Tarifa;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** FormularioTarifa (CU-09). */
class TarifaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tarifa = $this->route('tarifa');

        return [
            'servicio' => ['required', 'string', 'max:100', Rule::unique('tarifa', 'servicio')->ignore($tarifa?->id)],
            'descripcion' => ['nullable', 'string', 'max:255'],
            'monto' => ['required', 'numeric', 'min:1', 'max:99999999'],
            'moneda' => ['required', Rule::in(Tarifa::MONEDAS)],
            'activa' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return ['monto.min' => 'El monto debe ser de al menos 1.', 'servicio.unique' => 'Ya existe una tarifa con ese servicio.'];
    }

    public function attributes(): array
    {
        return ['descripcion' => 'descripción'];
    }
}
