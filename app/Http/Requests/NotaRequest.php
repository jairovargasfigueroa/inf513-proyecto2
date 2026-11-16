<?php

namespace App\Http\Requests;

use App\Models\Nota;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** FormularioNota (CU-05): redactar (POST) o modificar (PUT) una nota. */
class NotaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['slug' => is_string($this->slug) ? mb_strtoupper(trim($this->slug)) : $this->slug]);
    }

    public function rules(): array
    {
        $id = $this->route('nota')?->id;

        return [
            // R13: el slug no se repite en la misma fecha.
            'slug' => ['required', 'string', 'max:40', 'regex:/^[A-Z0-9]+(-[A-Z0-9]+)*$/',
                Rule::unique('nota', 'slug')->where('fecha', $this->fecha)->ignore($id)],
            'titulo' => ['required', 'string', 'max:200'],
            'tipo_pieza' => ['required', Rule::in(Nota::TIPOS_PIEZA)],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'cobertura_id' => ['nullable', 'integer', 'exists:cobertura,id'],
            'guion' => [$id ? 'prohibited' : 'nullable', 'string', 'max:20000'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'El slug lleva mayúsculas, números y guiones, por ejemplo PARO-TRANSPORTE.',
            'slug.unique' => 'Ya existe una nota con ese slug para esa fecha.',
            'guion.prohibited' => 'El guion se cambia con «Reemplazar guion», que guarda una versión nueva.',
        ];
    }

    public function attributes(): array
    {
        return ['titulo' => 'título', 'tipo_pieza' => 'tipo de pieza', 'cobertura_id' => 'cobertura', 'guion' => 'guion'];
    }
}
