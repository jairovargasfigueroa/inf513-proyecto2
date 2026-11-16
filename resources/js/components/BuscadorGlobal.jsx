import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * BuscadorGlobal «form» del encabezado (consigna, punto 9): sugiere resultados
 * mientras se escribe (espera 300 ms) y con Enter lleva a Resultados de Búsqueda.
 */
export default function BuscadorGlobal() {
    const id = useId();
    const navegar = useNavigate();
    const [q, setQ] = useState('');
    const [sugerencias, setSugerencias] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [activa, setActiva] = useState(-1);
    const contenedor = useRef(null);

    // sugerir(): consulta la API cuando el usuario deja de escribir.
    useEffect(() => {
        const texto = q.trim();
        if (texto.length < 2) {
            setSugerencias([]);
            return undefined;
        }
        const control = new AbortController();
        const espera = setTimeout(() => {
            api.get('/busqueda', { params: { q: texto, limite: 4 }, signal: control.signal })
                .then(({ data }) => {
                    setSugerencias(data.data.flatMap((g) => g.resultados.map((r) => ({ ...r, grupo: g.titulo }))));
                    setAbierto(true);
                    setActiva(-1);
                })
                .catch(() => {});
        }, 300);
        return () => {
            clearTimeout(espera);
            control.abort();
        };
    }, [q]);

    // Cierra la lista al hacer clic fuera.
    useEffect(() => {
        const fuera = (e) => !contenedor.current?.contains(e.target) && setAbierto(false);
        document.addEventListener('mousedown', fuera);
        return () => document.removeEventListener('mousedown', fuera);
    }, []);

    const ir = (ruta) => {
        setAbierto(false);
        setQ('');
        navegar(ruta);
    };

    // enviar(): Enter abre la sugerencia elegida o la página de resultados.
    const enviar = (e) => {
        e.preventDefault();
        if (activa >= 0 && sugerencias[activa]) return ir(sugerencias[activa].ruta);
        if (q.trim().length >= 2) ir(`/buscar?q=${encodeURIComponent(q.trim())}`);
    };

    const teclas = (e) => {
        if (!abierto || sugerencias.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiva((i) => (i + 1) % sugerencias.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiva((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
        } else if (e.key === 'Escape') {
            setAbierto(false);
        }
    };

    const idLista = `${id}-lista`;

    return (
        <form role="search" onSubmit={enviar} className="relative w-full max-w-md" ref={contenedor}>
            <label htmlFor={id} className="sr-only">Buscar coberturas, notas, recursos, personal y programas</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" aria-hidden="true" />
            <input
                id={id}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={teclas}
                onFocus={() => sugerencias.length > 0 && setAbierto(true)}
                placeholder="Buscar en el sistema…"
                autoComplete="off"
                maxLength={100}
                role="combobox"
                aria-expanded={abierto && sugerencias.length > 0}
                aria-controls={idLista}
                aria-autocomplete="list"
                aria-activedescendant={activa >= 0 ? `${idLista}-${activa}` : undefined}
                className="campo pl-9"
            />
            {abierto && q.trim().length >= 2 && (
                <ul
                    id={idLista}
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-tema border border-borde bg-superficie shadow-lg"
                >
                    {sugerencias.length === 0 && <li className="p-3 text-sm text-suave">Sin resultados para «{q.trim()}».</li>}
                    {sugerencias.map((s, i) => (
                        <li
                            key={`${s.grupo}-${s.id}`}
                            id={`${idLista}-${i}`}
                            role="option"
                            aria-selected={i === activa}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                ir(s.ruta);
                            }}
                            className={`cursor-pointer px-3 py-2 text-sm ${i === activa ? 'bg-primario text-sobre-primario' : 'hover:bg-fondo'}`}
                        >
                            <span className="block font-medium">{s.titulo}</span>
                            <span className={`block text-xs ${i === activa ? '' : 'text-suave'}`}>{s.grupo} · {s.detalle}</span>
                        </li>
                    ))}
                </ul>
            )}
        </form>
    );
}
