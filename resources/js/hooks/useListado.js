import { useCallback, useEffect, useRef, useState } from 'react';
import api, { mensajeDeError } from '../services/api';

/**
 * Listado de una pantalla «client page» (operación listar(filtros)): pide la
 * ruta con los filtros y la página, y se vuelve a pedir cuando cambian. Los
 * filtros de texto esperan 300 ms para no consultar en cada tecla.
 */
export default function useListado(ruta, filtrosIniciales = {}) {
    const [filtros, setFiltros] = useState(filtrosIniciales);
    const [pagina, setPagina] = useState(1);
    const [filas, setFilas] = useState(null);
    const [meta, setMeta] = useState(null);
    const [extra, setExtra] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const version = useRef(0);

    const cargar = useCallback(async () => {
        const actual = ++version.current;
        setCargando(true);
        setError(null);
        try {
            const params = Object.fromEntries(Object.entries({ ...filtros, page: pagina }).filter(([, v]) => v !== '' && v !== null));
            const { data } = await api.get(ruta, { params });
            if (actual !== version.current) return; // llegó una respuesta más nueva
            const { data: lista, meta: m, links, ...resto } = data;
            setFilas(lista);
            setMeta(m ?? null);
            setExtra(resto);
        } catch (e) {
            if (actual === version.current) setError(mensajeDeError(e));
        } finally {
            if (actual === version.current) setCargando(false);
        }
    }, [ruta, filtros, pagina]);

    useEffect(() => {
        const espera = setTimeout(cargar, 300);
        return () => clearTimeout(espera);
    }, [cargar]);

    const filtrar = useCallback((cambios) => {
        setFiltros((f) => ({ ...f, ...cambios }));
        setPagina(1);
    }, []);

    return { filas, meta, extra, filtros, cargando, error, filtrar, setPagina, recargar: cargar };
}
