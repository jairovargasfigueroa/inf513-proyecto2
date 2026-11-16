<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

/**
 * FormularioPeriodo (CU-07) y FiltroReporte (CU-08): un período de hasta un
 * año. Sin fechas, los últimos 30 días. 422 si el período no es válido.
 */
class PeriodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ];
    }

    public function messages(): array
    {
        return ['hasta.after_or_equal' => 'Período inválido: la fecha final es anterior a la inicial.'];
    }

    public function after(): array
    {
        return [function ($validator) {
            if ($this->desde() && $this->hasta() && $this->desde()->diffInDays($this->hasta()) > 366) {
                $validator->errors()->add('hasta', 'Pida un período de hasta un año.');
            }
        }];
    }

    public function desde(): Carbon
    {
        return $this->filled('desde') ? Carbon::parse($this->input('desde')) : $this->hasta()->copy()->subDays(29);
    }

    public function hasta(): Carbon
    {
        return $this->filled('hasta') ? Carbon::parse($this->input('hasta')) : today();
    }

    /** [desde, hasta] como texto AAAA-MM-DD para las consultas. */
    public function rango(): array
    {
        return [$this->desde()->toDateString(), $this->hasta()->toDateString()];
    }
}
