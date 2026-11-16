<?php

namespace App\Http\Requests;

use App\Models\TipoRecurso;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** FormularioRecurso (CU-03): equipo técnico o unidad móvil. */
class RecursoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'codigo' => is_string($this->codigo) ? mb_strtoupper(trim($this->codigo)) : $this->codigo,
            'placa' => $this->filled('placa') ? mb_strtoupper(trim($this->placa)) : null,
            'caracteristicas' => $this->filled('caracteristicas') ? trim($this->caracteristicas) : null,
        ]);
    }

    public function rules(): array
    {
        $id = $this->route('recurso')?->id;
        $esMovil = (bool) TipoRecurso::find($this->tipo_recurso_id)?->es_unidad_movil;

        return [
            'codigo' => ['required', 'string', 'max:20', 'regex:/^[A-Z0-9][A-Z0-9_-]*$/', Rule::unique('recurso', 'codigo')->ignore($id)],
            'tipo_recurso_id' => ['required', 'integer', 'exists:tipo_recurso,id'],
            'marca' => ['required', 'string', 'max:50'],
            'modelo' => ['required', 'string', 'max:80'],
            // R12: solo las unidades móviles llevan placa, y no se repite.
            'placa' => $esMovil
                ? ['nullable', 'string', 'max:15', 'regex:/^[A-Z0-9\- ]+$/', Rule::unique('recurso', 'placa')->ignore($id)]
                : ['prohibited'],
            'caracteristicas' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.regex' => 'El código solo puede tener mayúsculas, números, guiones y guiones bajos (por ejemplo CAM-05).',
            'placa.prohibited' => 'Solo las unidades móviles llevan placa.',
            'placa.regex' => 'La placa solo puede tener letras, números y guiones.',
        ];
    }

    public function attributes(): array
    {
        return ['codigo' => 'código', 'tipo_recurso_id' => 'tipo', 'caracteristicas' => 'características'];
    }
}
