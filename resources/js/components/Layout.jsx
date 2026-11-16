import { LogIn, LogOut, Menu as IconoMenu, SlidersHorizontal, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BuscadorGlobal from './BuscadorGlobal';
import ControlAccesibilidad from './ControlAccesibilidad';
import MenuDinamico from './MenuDinamico';
import PieDePagina from './PieDePagina';
import Cargando from './ui/Cargando';

/**
 * Panel principal (layout) del diagrama de navegación general: encabezado con
 * logotipo, buscador global, temas y accesibilidad; menú lateral dinámico (con
 * sesión); área de contenido; y pie de página con el contador de visitas.
 */
export default function Layout() {
    const { autenticado, usuario, cerrarSesion } = useAuth();
    const navegar = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [aparienciaAbierta, setAparienciaAbierta] = useState(false);

    const salir = async () => {
        await cerrarSesion();
        navegar('/'); // 204 cierre de sesión → Inicio (pública)
    };

    return (
        <div className="flex min-h-screen flex-col">
            <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 boton">
                Saltar al contenido
            </a>

            <header className="sticky top-0 z-20 border-b border-borde bg-superficie">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
                    {autenticado && (
                        <button
                            type="button"
                            className="boton-icono rounded-tema lg:hidden"
                            onClick={() => setMenuAbierto((a) => !a)}
                            aria-expanded={menuAbierto}
                            aria-controls="menu-lateral"
                            aria-label={menuAbierto ? 'Cerrar el menú' : 'Abrir el menú'}
                        >
                            {menuAbierto ? <X className="h-5 w-5" aria-hidden="true" /> : <IconoMenu className="h-5 w-5" aria-hidden="true" />}
                        </button>
                    )}

                    <Link to={autenticado ? '/inicio' : '/'} className="flex items-center gap-2 font-bold" aria-label="Canal 11, ir al inicio">
                        <span className="grid h-9 w-9 place-items-center rounded-tema bg-primario text-lg text-sobre-primario" aria-hidden="true">11</span>
                        <span className="hidden sm:inline">Canal 11 <span className="font-normal text-suave">TVU</span></span>
                    </Link>

                    <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
                        <BuscadorGlobal />
                    </div>

                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            className="boton-icono rounded-tema border border-borde md:hidden"
                            onClick={() => setAparienciaAbierta((a) => !a)}
                            aria-expanded={aparienciaAbierta}
                            aria-controls="controles-apariencia"
                            aria-label="Apariencia y accesibilidad"
                        >
                            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <div id="controles-apariencia" className={`${aparienciaAbierta ? 'flex' : 'hidden'} w-full md:flex md:w-auto`}>
                            <ControlAccesibilidad />
                        </div>
                        {autenticado ? (
                            <div className="flex items-center gap-2">
                                <span className="hidden text-right text-sm leading-tight md:block">
                                    <span className="block font-medium">{usuario.nombre_completo}</span>
                                    <span className="block text-suave">{usuario.rol.nombre}</span>
                                </span>
                                <button type="button" onClick={salir} className="boton-secundario" title="Cerrar sesión">
                                    <LogOut className="h-4 w-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">Salir</span>
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="boton">
                                <LogIn className="h-4 w-4" aria-hidden="true" />
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
                {autenticado && (
                    <aside
                        id="menu-lateral"
                        className={`${menuAbierto ? 'block' : 'hidden'} border-b border-borde bg-superficie p-3 lg:block lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r`}
                    >
                        <MenuDinamico alElegir={() => setMenuAbierto(false)} />
                    </aside>
                )}
                <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-6">
                    {/* Las pantallas se cargan bajo demanda: el encabezado y el menú quedan visibles. */}
                    <Suspense fallback={<Cargando />}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>

            <PieDePagina />
        </div>
    );
}
