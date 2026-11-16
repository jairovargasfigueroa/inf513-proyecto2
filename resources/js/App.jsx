import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RutaPrivada from './components/RutaPrivada';
import Bienvenida from './pages/Bienvenida';
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import NoEncontrada from './pages/NoEncontrada';
import Pendiente from './pages/Pendiente';
import ResultadosBusqueda from './pages/ResultadosBusqueda';
import AdministrarMenu from './pages/cu01/AdministrarMenu';
import GestionUsuarios from './pages/cu01/GestionUsuarios';
import MatrizAccesos from './pages/cu01/MatrizAccesos';
import MiPerfil from './pages/cu01/MiPerfil';
import DisponibilidadPersonal from './pages/cu02/DisponibilidadPersonal';
import GestionAusencias from './pages/cu02/GestionAusencias';
import GestionPersonal from './pages/cu02/GestionPersonal';
import GestionTurnos from './pages/cu02/GestionTurnos';
import InventarioRecursos from './pages/cu03/InventarioRecursos';
import PrestamosRecursos from './pages/cu03/PrestamosRecursos';

/*
 * Pantallas del menú (documento, Anexo C): ruta, permiso que la habilita y CU.
 * `pantalla` es la «client page» del diagrama de navegación; sin ella se muestra
 * la pantalla provisional del caso de uso que aún no se implementa.
 */
const PANTALLAS = [
    { ruta: '/panel', titulo: 'Panel Analítico', permiso: 'dashboard.ver', cu: 'CU-07' },
    { ruta: '/usuarios', titulo: 'Gestión de Usuarios', permiso: 'usuarios.listar', cu: 'CU-01', pantalla: GestionUsuarios },
    { ruta: '/perfil', titulo: 'Mi Perfil', permiso: null, cu: 'CU-01', pantalla: MiPerfil },
    { ruta: '/personal', titulo: 'Gestión de Personal', permiso: 'personal.listar', cu: 'CU-02', pantalla: GestionPersonal },
    { ruta: '/turnos', titulo: 'Gestión de Turnos', permiso: 'turnos.listar', cu: 'CU-02', pantalla: GestionTurnos },
    { ruta: '/recursos', titulo: 'Inventario de Recursos', permiso: 'recursos.listar', cu: 'CU-03', pantalla: InventarioRecursos },
    { ruta: '/prestamos', titulo: 'Préstamos de Recursos', permiso: 'prestamos.listar', cu: 'CU-03', pantalla: PrestamosRecursos },
    { ruta: '/coberturas', titulo: 'Agenda de Coberturas', permiso: 'coberturas.listar', cu: 'CU-04' },
    { ruta: '/notas', titulo: 'Gestión de Notas', permiso: 'notas.listar', cu: 'CU-05' },
    { ruta: '/programas', titulo: 'Programas y Grilla', permiso: 'programas.listar', cu: 'CU-06' },
    { ruta: '/plantillas', titulo: 'Plantillas de Emisión', permiso: 'plantillas.listar', cu: 'CU-06' },
    { ruta: '/escaletas', titulo: 'Escaletas', permiso: 'escaletas.listar', cu: 'CU-06' },
    { ruta: '/analitica', titulo: 'Analítica Periodística', permiso: 'analitica.ver', cu: 'CU-07' },
    { ruta: '/reportes', titulo: 'Reportes y Estadísticas', permiso: 'reportes.ver', cu: 'CU-08' },
    { ruta: '/seguridad/matriz', titulo: 'Matriz de Accesos', permiso: 'seguridad.matriz.ver', cu: 'CU-01', pantalla: MatrizAccesos },
    { ruta: '/seguridad/menu', titulo: 'Menú Dinámico', permiso: 'seguridad.menu', cu: 'CU-01', pantalla: AdministrarMenu },
    { ruta: '/seguridad/bitacora', titulo: 'Bitácora de Accesos', permiso: 'bitacora.ver', cu: 'CU-08' },
];

/* Pantallas a las que se llega desde otra pantalla (no desde el menú). */
const SUBPANTALLAS = [
    { ruta: '/personal/ausencias', permiso: 'ausencias.listar', pantalla: GestionAusencias },
    { ruta: '/personal/disponibilidad', permiso: 'personal.disponibilidad', pantalla: DisponibilidadPersonal },
];

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                {/* Visitante */}
                <Route index element={<Inicio />} />
                <Route path="login" element={<Login />} />
                <Route path="buscar" element={<ResultadosBusqueda />} />

                {/* Con sesión */}
                <Route path="inicio" element={<RutaPrivada><Bienvenida /></RutaPrivada>} />
                {PANTALLAS.map((p) => (
                    <Route
                        key={p.ruta}
                        path={`${p.ruta.slice(1)}/*`}
                        element={(
                            <RutaPrivada permiso={p.permiso}>
                                {p.pantalla ? <p.pantalla /> : <Pendiente titulo={p.titulo} casoUso={p.cu} />}
                            </RutaPrivada>
                        )}
                    />
                ))}

                {SUBPANTALLAS.map((p) => (
                    <Route key={p.ruta} path={p.ruta.slice(1)} element={<RutaPrivada permiso={p.permiso}><p.pantalla /></RutaPrivada>} />
                ))}

                <Route path="*" element={<NoEncontrada />} />
            </Route>
        </Routes>
    );
}
