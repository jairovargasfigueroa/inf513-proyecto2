import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RutaPrivada from './components/RutaPrivada';
import Bienvenida from './pages/Bienvenida';
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import NoEncontrada from './pages/NoEncontrada';
import Pendiente from './pages/Pendiente';
import ResultadosBusqueda from './pages/ResultadosBusqueda';

/*
 * Pantallas del menú (documento, Anexo C): ruta, permiso que la habilita y CU.
 * Cada caso de uso reemplaza su «Pendiente» por la pantalla real.
 */
const PANTALLAS = [
    { ruta: '/panel', titulo: 'Panel Analítico', permiso: 'dashboard.ver', cu: 'CU-07' },
    { ruta: '/usuarios', titulo: 'Gestión de Usuarios', permiso: 'usuarios.listar', cu: 'CU-01' },
    { ruta: '/perfil', titulo: 'Mi Perfil', permiso: null, cu: 'CU-01' },
    { ruta: '/personal', titulo: 'Gestión de Personal', permiso: 'personal.listar', cu: 'CU-02' },
    { ruta: '/turnos', titulo: 'Gestión de Turnos', permiso: 'turnos.listar', cu: 'CU-02' },
    { ruta: '/recursos', titulo: 'Inventario de Recursos', permiso: 'recursos.listar', cu: 'CU-03' },
    { ruta: '/prestamos', titulo: 'Préstamos de Recursos', permiso: 'prestamos.listar', cu: 'CU-03' },
    { ruta: '/coberturas', titulo: 'Agenda de Coberturas', permiso: 'coberturas.listar', cu: 'CU-04' },
    { ruta: '/notas', titulo: 'Gestión de Notas', permiso: 'notas.listar', cu: 'CU-05' },
    { ruta: '/programas', titulo: 'Programas y Grilla', permiso: 'programas.listar', cu: 'CU-06' },
    { ruta: '/plantillas', titulo: 'Plantillas de Emisión', permiso: 'plantillas.listar', cu: 'CU-06' },
    { ruta: '/escaletas', titulo: 'Escaletas', permiso: 'escaletas.listar', cu: 'CU-06' },
    { ruta: '/analitica', titulo: 'Analítica Periodística', permiso: 'analitica.ver', cu: 'CU-07' },
    { ruta: '/reportes', titulo: 'Reportes y Estadísticas', permiso: 'reportes.ver', cu: 'CU-08' },
    { ruta: '/seguridad/matriz', titulo: 'Matriz de Accesos', permiso: 'seguridad.matriz.ver', cu: 'CU-01' },
    { ruta: '/seguridad/menu', titulo: 'Menú Dinámico', permiso: 'seguridad.menu', cu: 'CU-01' },
    { ruta: '/seguridad/bitacora', titulo: 'Bitácora de Accesos', permiso: 'bitacora.ver', cu: 'CU-08' },
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
                        element={<RutaPrivada permiso={p.permiso}><Pendiente titulo={p.titulo} casoUso={p.cu} /></RutaPrivada>}
                    />
                ))}

                <Route path="*" element={<NoEncontrada />} />
            </Route>
        </Routes>
    );
}
