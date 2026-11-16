<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Pie de página: la ruta del frontend que se acaba de visitar. */
class RegistrarVisitaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pagina' => ['required', 'string', 'max:120', 'regex:/^\/[A-Za-z0-9\-_\/]*$/'],
        ];
    }

    /**
     * Las páginas de detalle cuentan como una sola: /coberturas/15 se guarda
     * como /coberturas/{id}.
     */
    public function paginaNormalizada(): string
    {
        $pagina = preg_replace('#/\d+(?=/|$)#', '/{id}', $this->input('pagina'));

        return $pagina === '/' ? '/' : rtrim($pagina, '/');
    }
}
