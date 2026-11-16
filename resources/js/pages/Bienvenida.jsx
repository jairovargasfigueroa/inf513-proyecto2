import { Link } from 'react-router-dom';
import Icono from '../components/Icono';
import { useAuth } from '../context/AuthContext';

/**
 * Contenido inicial del Panel principal (layout) después de iniciar sesión:
 * saludo y accesos directos a las opciones del menú del rol.
 */
export default function Bienvenida() {
    const { usuario, menu } = useAuth();
    const opciones = menu.flatMap((g) => g.opciones.map((o) => ({ ...o, grupo: g.grupo })));

    return (
        <div className="space-y-6">
            <section>
                <h1 className="titulo-pagina">Hola, {usuario.nombre}</h1>
                <p className="mt-1 text-suave">Ingresó como {usuario.rol.nombre}. Estas son las opciones de su rol:</p>
            </section>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {opciones.map((o) => (
                    <li key={o.ruta}>
                        <Link to={o.ruta} className="tarjeta flex items-center gap-3 hover:border-primario">
                            <span className="grid h-10 w-10 place-items-center rounded-tema bg-primario text-sobre-primario">
                                <Icono nombre={o.icono} />
                            </span>
                            <span>
                                <span className="block font-semibold">{o.nombre}</span>
                                <span className="block text-sm text-suave">{o.grupo}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
