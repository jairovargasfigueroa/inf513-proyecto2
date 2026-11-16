/** Título de la pantalla, su descripción y los botones de acción principales. */
export default function EncabezadoPagina({ titulo, descripcion, casoUso, children }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
                {casoUso && <p className="text-sm font-semibold text-acento">{casoUso}</p>}
                <h1 className="titulo-pagina">{titulo}</h1>
                {descripcion && <p className="mt-1 text-suave">{descripcion}</p>}
            </div>
            {children && <div className="flex flex-wrap gap-2">{children}</div>}
        </div>
    );
}
