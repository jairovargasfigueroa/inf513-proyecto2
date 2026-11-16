import { useId } from 'react';

/**
 * Campo de formulario accesible: etiqueta visible (WCAG 3.3.2) y error en texto
 * debajo, enlazado con aria-describedby (WCAG 3.3.1).
 *
 *   <Campo etiqueta="Correo" nombre="correo" type="email" ... />
 *   <Campo como="select" etiqueta="Rol" nombre="rol_id" opciones={[{ valor, texto }]} ... />
 *   <Campo como="textarea" etiqueta="Indicaciones" nombre="indicaciones" ... />
 */
export default function Campo({
    etiqueta, nombre, error, ayuda, como = 'input', opciones = [], vacio, className = '', requerido, ...props
}) {
    const id = useId();
    const idError = `${id}-error`;
    const idAyuda = `${id}-ayuda`;
    const describe = [error && idError, ayuda && idAyuda].filter(Boolean).join(' ') || undefined;
    const comunes = {
        id,
        name: nombre,
        className: `campo ${error ? 'border-peligro' : ''}`,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describe,
        'aria-required': requerido ? 'true' : undefined,
        ...props,
    };

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium">
                {etiqueta}
                {requerido && <span className="text-peligro" aria-hidden="true"> *</span>}
            </label>
            {como === 'select' && (
                <select {...comunes}>
                    {vacio !== undefined && <option value="">{vacio}</option>}
                    {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                </select>
            )}
            {como === 'textarea' && <textarea rows={4} {...comunes} />}
            {como === 'input' && <input {...comunes} />}
            {ayuda && <p id={idAyuda} className="mt-1 text-sm text-suave">{ayuda}</p>}
            {error && <p id={idError} className="mt-1 text-sm font-medium text-peligro">{error}</p>}
        </div>
    );
}

/** Casilla de verificación con su etiqueta a la derecha. */
export function Casilla({ etiqueta, nombre, checked, onChange, error, disabled, ayuda }) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className={`flex items-start gap-2 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
                <input
                    id={id}
                    name={nombre}
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="mt-1 h-4 w-4 accent-[rgb(var(--c-primario))]"
                    aria-invalid={error ? 'true' : undefined}
                />
                <span>
                    <span className="text-sm font-medium">{etiqueta}</span>
                    {ayuda && <span className="block text-sm text-suave">{ayuda}</span>}
                </span>
            </label>
            {error && <p className="mt-1 text-sm font-medium text-peligro">{error}</p>}
        </div>
    );
}
