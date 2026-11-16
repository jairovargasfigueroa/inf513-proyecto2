import { useAuth } from '../context/AuthContext';

/**
 * Muestra su contenido solo si el rol tiene el permiso (documento, Tabla 62):
 *   <Puede permiso="coberturas.crear"><button>Nueva cobertura</button></Puede>
 * Es solo para la interfaz; la API vuelve a verificar el permiso.
 */
export default function Puede({ permiso, children, sino = null }) {
    const { puede } = useAuth();
    return puede(permiso) ? children : sino;
}
