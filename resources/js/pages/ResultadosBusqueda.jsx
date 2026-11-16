import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Cargando from '../components/ui/Cargando';
import api, { mensajeDeError } from '../services/api';

/**
 * Resultados de Búsqueda «client page»: respuesta 200 de BusquedaController,
 * agrupada por tipo (mostrar) con enlace a cada resultado (abrir).
 */
export default function ResultadosBusqueda() {
    const [parametros] = useSearchParams();
    const q = parametros.get('q')?.trim() ?? '';
    const [grupos, setGrupos] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setGrupos(null);
        setError(null);
        if (q.length < 2) {
            setError('Escriba al menos 2 caracteres para buscar.');
            return;
        }
        api.get('/busqueda', { params: { q, limite: 20 } })
            .then(({ data }) => setGrupos(data.data))
            .catch((e) => setError(mensajeDeError(e)));
    }, [q]);

    const total = grupos?.reduce((n, g) => n + g.resultados.length, 0) ?? 0;

    return (
        <section aria-labelledby="titulo-resultados" className="space-y-4">
            <div>
                <h1 id="titulo-resultados" className="titulo-pagina">Resultados de búsqueda</h1>
                {q && <p className="mt-1 text-suave">Para «{q}»{grupos && ` · ${total} resultado${total === 1 ? '' : 's'}`}</p>}
            </div>

            {error && <p className="text-peligro" role="alert">{error}</p>}
            {!grupos && !error && <Cargando texto="Buscando…" />}
            {grupos?.length === 0 && (
                <p className="tarjeta text-suave">No se encontró nada. Pruebe con otra palabra.</p>
            )}

            {grupos?.map((g) => (
                <section key={g.tipo} className="tarjeta" aria-labelledby={`grupo-${g.tipo}`}>
                    <h2 id={`grupo-${g.tipo}`} className="text-lg font-semibold">{g.titulo}</h2>
                    <ul className="mt-2 divide-y divide-borde">
                        {g.resultados.map((r) => (
                            <li key={r.id}>
                                <Link to={r.ruta} className="flex items-center justify-between gap-3 py-2 hover:text-primario">
                                    <span>
                                        <span className="block font-medium">{r.titulo}</span>
                                        <span className="block text-sm text-suave">{r.detalle}</span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </section>
    );
}
