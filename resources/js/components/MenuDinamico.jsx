import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icono from './Icono';

/**
 * Menú lateral dinámico (consigna, punto 2): las opciones vienen de
 * GET /api/v1/auth/menu, agrupadas y ordenadas según el rol activo.
 */
export default function MenuDinamico({ alElegir }) {
    const { menu } = useAuth();

    return (
        <nav aria-label="Menú principal" className="space-y-4">
            {menu.map((grupo) => (
                <div key={grupo.grupo}>
                    <h2 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-suave">{grupo.grupo}</h2>
                    <ul className="space-y-0.5">
                        {grupo.opciones.map((opcion) => (
                            <li key={opcion.ruta}>
                                <NavLink
                                    to={opcion.ruta}
                                    onClick={alElegir}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-tema px-3 py-2 text-sm ${
                                            isActive ? 'bg-primario font-semibold text-sobre-primario' : 'hover:bg-fondo'
                                        }`}
                                >
                                    <Icono nombre={opcion.icono} />
                                    {opcion.nombre}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
