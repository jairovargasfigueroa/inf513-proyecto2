import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Paginación de un listado de Laravel (meta: current_page, last_page, total). */
export default function Paginacion({ meta, alCambiar }) {
    if (!meta || meta.last_page <= 1) {
        return meta ? <p className="mt-3 text-sm text-suave">{meta.total} registro{meta.total === 1 ? '' : 's'}</p> : null;
    }

    return (
        <nav className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm" aria-label="Paginación">
            <p className="text-suave">
                Página {meta.current_page} de {meta.last_page} · {meta.total} registros
            </p>
            <div className="flex gap-2">
                <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => alCambiar(meta.current_page - 1)}
                    disabled={meta.current_page <= 1}
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
                </button>
                <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => alCambiar(meta.current_page + 1)}
                    disabled={meta.current_page >= meta.last_page}
                >
                    Siguiente <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
}
