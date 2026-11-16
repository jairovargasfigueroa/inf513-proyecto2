import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Cargando from './Cargando';

/**
 * Protege una pantalla: sin sesión lleva al inicio de sesión y sin el permiso
 * muestra el aviso de acceso denegado (la API también responde 403).
 */
export default function RutaPrivada({ permiso, children }) {
    const { autenticado, cargando, puede } = useAuth();
    const ubicacion = useLocation();

    if (cargando) return <Cargando />;
    if (!autenticado) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
    if (permiso && !puede(permiso)) {
        return (
            <section className="tarjeta" aria-labelledby="titulo-denegado">
                <h1 id="titulo-denegado" className="titulo-pagina">Acceso denegado</h1>
                <p className="mt-2 text-suave">Su rol no tiene permiso para ver esta pantalla.</p>
            </section>
        );
    }
    return children;
}
