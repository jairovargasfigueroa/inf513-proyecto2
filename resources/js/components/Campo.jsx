import { useId } from 'react';

/**
 * Campo de formulario accesible: etiqueta visible (WCAG 3.3.2) y error en texto
 * debajo, enlazado con aria-describedby (WCAG 3.3.1).
 */
export default function Campo({ etiqueta, nombre, error, ayuda, className = '', ...props }) {
    const id = useId();
    const idError = `${id}-error`;
    const idAyuda = `${id}-ayuda`;
    const describe = [error && idError, ayuda && idAyuda].filter(Boolean).join(' ') || undefined;

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium">
                {etiqueta}
            </label>
            <input
                id={id}
                name={nombre}
                className={`campo ${error ? 'border-peligro' : ''}`}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={describe}
                {...props}
            />
            {ayuda && <p id={idAyuda} className="mt-1 text-sm text-suave">{ayuda}</p>}
            {error && <p id={idError} className="mt-1 text-sm font-medium text-peligro">{error}</p>}
        </div>
    );
}
