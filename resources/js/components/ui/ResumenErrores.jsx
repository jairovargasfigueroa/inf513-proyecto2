import { AlertCircle } from 'lucide-react';

/**
 * Resumen de errores al inicio del formulario para los lectores de pantalla
 * (documento, sección 3.3.10). Recibe { campo: 'mensaje' } o un texto general.
 */
export default function ResumenErrores({ errores = {}, mensaje }) {
    const lista = Object.values(errores);
    if (!mensaje && lista.length === 0) return null;

    return (
        <div role="alert" className="mb-4 rounded-tema border border-peligro p-3 text-peligro">
            <p className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                {mensaje ?? 'Revise los datos del formulario.'}
            </p>
            {lista.length > 0 && (
                <ul className="mt-1 list-disc pl-8 text-sm">
                    {lista.map((texto) => <li key={texto}>{texto}</li>)}
                </ul>
            )}
        </div>
    );
}
