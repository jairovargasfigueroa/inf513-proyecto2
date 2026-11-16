import { Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

/**
 * Pie de página (contador) del diagrama de navegación general (consigna,
 * punto 7): en cada cambio de ruta envía POST /api/v1/visitas y muestra el
 * total de visitas de la página.
 */
export default function PieDePagina() {
    const { pathname } = useLocation();
    const [visitas, setVisitas] = useState(null);
    const ultima = useRef(null);

    useEffect(() => {
        if (ultima.current === pathname) return; // evita contar dos veces la misma carga
        ultima.current = pathname;
        api.post('/visitas', { pagina: pathname })
            .then(({ data }) => setVisitas(data.total))
            .catch(() => setVisitas(null));
    }, [pathname]);

    return (
        <footer className="border-t border-borde bg-superficie px-4 py-3 text-sm text-suave">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
                <p>Canal 11 - Televisión Universitaria UAGRM · Sistema de Gestión de Operaciones y Noticias</p>
                <p className="flex items-center gap-1" aria-live="polite">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Visitas a esta página: <strong className="text-texto">{visitas ?? '—'}</strong>
                </p>
            </div>
        </footer>
    );
}
