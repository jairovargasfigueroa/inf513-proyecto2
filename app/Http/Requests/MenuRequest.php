<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** FormularioMenu (CU-01): opción del menú dinámico. */
class MenuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('menu')?->id;

        return [
            'nombre' => ['required', 'string', 'max:60'],
            'ruta' => ['required', 'string', 'max:120', 'regex:/^\/[a-z0-9\-\/]*$/', Rule::unique('menu', 'ruta')->ignore($id)],
            'icono' => ['nullable', 'string', 'max:40', 'regex:/^[a-z\-]+$/'],
            'grupo' => ['required', 'string', 'max:40'],
            'orden' => ['required', 'integer', 'between:0,999'],
            'padre_id' => ['nullable', 'integer', 'exists:menu,id', Rule::notIn(array_filter([$id]))],
            'permiso_web_id' => ['nullable', 'integer', 'exists:permiso_web,id'],
            'activo' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'ruta.regex' => 'La ruta debe empezar con / y tener solo minúsculas, números, guiones y barras.',
            'icono.regex' => 'El ícono solo puede tener minúsculas y guiones.',
            'padre_id.not_in' => 'Una opción no puede ser su propia opción padre.',
        ];
    }
}
