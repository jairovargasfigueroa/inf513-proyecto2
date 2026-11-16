/** Etiqueta corta de estado (activo, inactivo, aprobada…). Lleva texto, no solo color. */
const TONOS = {
    exito: 'border-exito text-exito',
    peligro: 'border-peligro text-peligro',
    neutro: 'border-borde text-suave',
    acento: 'border-acento text-acento',
};

export default function Insignia({ tono = 'neutro', children }) {
    return (
        <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${TONOS[tono]}`}>
            {children}
        </span>
    );
}
