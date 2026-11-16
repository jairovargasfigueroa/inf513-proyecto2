import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Cargando from './ui/Cargando';

/**
 * Protege una pantalla: sin sesión lleva al inicio de sesión y sin el permiso
 * muestra el aviso de acceso denegado (la API también responde 403). `permiso`
 * puede ser una lista: basta con tener uno.
 */
export default function RutaPrivada({ permiso, children }) {
    const { autenticado, cargando, puede } = useAuth();
    const ubicacion = useLocation();

    if (cargando) return <Cargando />;
    if (!autenticado) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
    const permitido = !permiso || (Array.isArray(permiso) ? permiso.some(puede) : puede(permiso));
    if (!permitido) {
        return (
            <section className="tarjeta" aria-labelledby="titulo-denegado">
                <h1 id="titulo-denegado" className="titulo-pagina">Acceso denegado</h1>
                <p className="mt-2 text-suave">Su rol no tiene permiso para ver esta pantalla.</p>
            </section>
        );
    }
    return children;
}
