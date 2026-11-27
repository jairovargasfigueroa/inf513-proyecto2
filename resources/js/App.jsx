import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RutaPrivada from './components/RutaPrivada';
import Inicio from './pages/Inicio';
import Login from './pages/Login';

// Cada pantalla se descarga cuando se abre (RNF-31: carga inicial rápida).
const Bienvenida = lazy(() => import('./pages/Bienvenida'));
const NoEncontrada = lazy(() => import('./pages/NoEncontrada'));
const Pendiente = lazy(() => import('./pages/Pendiente'));
const ResultadosBusqueda = lazy(() => import('./pages/ResultadosBusqueda'));
const AdministrarMenu = lazy(() => import('./pages/cu01/AdministrarMenu'));
const GestionUsuarios = lazy(() => import('./pages/cu01/GestionUsuarios'));
const MatrizAccesos = lazy(() => import('./pages/cu01/MatrizAccesos'));
const MiPerfil = lazy(() => import('./pages/cu01/MiPerfil'));
const DisponibilidadPersonal = lazy(() => import('./pages/cu02/DisponibilidadPersonal'));
const GestionAusencias = lazy(() => import('./pages/cu02/GestionAusencias'));
const GestionPersonal = lazy(() => import('./pages/cu02/GestionPersonal'));
const GestionTurnos = lazy(() => import('./pages/cu02/GestionTurnos'));
const InventarioRecursos = lazy(() => import('./pages/cu03/InventarioRecursos'));
const PrestamosRecursos = lazy(() => import('./pages/cu03/PrestamosRecursos'));
const AgendaCoberturas = lazy(() => import('./pages/cu04/AgendaCoberturas'));
const DetalleCobertura = lazy(() => import('./pages/cu04/DetalleCobertura'));
const HojaAsignacion = lazy(() => import('./pages/cu04/HojaAsignacion'));
const DetalleNota = lazy(() => import('./pages/cu05/DetalleNota'));
const GestionNotas = lazy(() => import('./pages/cu05/GestionNotas'));
const HistorialGuion = lazy(() => import('./pages/cu05/HistorialGuion'));
const MaterialAudiovisual = lazy(() => import('./pages/cu05/MaterialAudiovisual'));
const EditorEscaleta = lazy(() => import('./pages/cu06/EditorEscaleta'));
const Escaletas = lazy(() => import('./pages/cu06/Escaletas'));
const PlantillasEmision = lazy(() => import('./pages/cu06/PlantillasEmision'));
const ProgramasGrilla = lazy(() => import('./pages/cu06/ProgramasGrilla'));
const VistaPresentador = lazy(() => import('./pages/cu06/VistaPresentador'));
const AnaliticaPeriodistica = lazy(() => import('./pages/cu07/AnaliticaPeriodistica'));
const PanelAnalitico = lazy(() => import('./pages/cu07/PanelAnalitico'));
const BitacoraAccesos = lazy(() => import('./pages/cu08/BitacoraAccesos'));
const BitacoraComandos = lazy(() => import('./pages/cu08/BitacoraComandos'));
const ReportesEstadisticas = lazy(() => import('./pages/cu08/ReportesEstadisticas'));
const VistaReporte = lazy(() => import('./pages/cu08/VistaReporte'));
const ConsultarSolicitud = lazy(() => import('./pages/cu09/ConsultarSolicitud'));
const DetalleSolicitud = lazy(() => import('./pages/cu09/DetalleSolicitud'));
const PagoRecibido = lazy(() => import('./pages/cu09/PagoRecibido'));
const SolicitarCobertura = lazy(() => import('./pages/cu09/SolicitarCobertura'));
const SolicitudesCobertura = lazy(() => import('./pages/cu09/SolicitudesCobertura'));
const TarifasServicios = lazy(() => import('./pages/cu09/TarifasServicios'));

/*
 * Pantallas del menú (documento, Anexo C): ruta, permiso que la habilita y CU.
 * `pantalla` es la «client page» del diagrama de navegación; sin ella se muestra
 * la pantalla provisional del caso de uso que aún no se implementa.
 */
const PANTALLAS = [
    { ruta: '/panel', titulo: 'Panel Analítico', permiso: 'dashboard.ver', cu: 'CU-07', pantalla: PanelAnalitico },
    { ruta: '/usuarios', titulo: 'Gestión de Usuarios', permiso: 'usuarios.listar', cu: 'CU-01', pantalla: GestionUsuarios },
    { ruta: '/perfil', titulo: 'Mi Perfil', permiso: null, cu: 'CU-01', pantalla: MiPerfil },
    { ruta: '/personal', titulo: 'Gestión de Personal', permiso: 'personal.listar', cu: 'CU-02', pantalla: GestionPersonal },
    { ruta: '/turnos', titulo: 'Gestión de Turnos', permiso: 'turnos.listar', cu: 'CU-02', pantalla: GestionTurnos },
    { ruta: '/recursos', titulo: 'Inventario de Recursos', permiso: 'recursos.listar', cu: 'CU-03', pantalla: InventarioRecursos },
    { ruta: '/prestamos', titulo: 'Préstamos de Recursos', permiso: 'prestamos.listar', cu: 'CU-03', pantalla: PrestamosRecursos },
    { ruta: '/coberturas', titulo: 'Agenda de Coberturas', permiso: 'coberturas.listar', cu: 'CU-04', pantalla: AgendaCoberturas },
    { ruta: '/notas', titulo: 'Gestión de Notas', permiso: 'notas.listar', cu: 'CU-05', pantalla: GestionNotas },
    { ruta: '/programas', titulo: 'Programas y Grilla', permiso: 'programas.listar', cu: 'CU-06', pantalla: ProgramasGrilla },
    { ruta: '/plantillas', titulo: 'Plantillas de Emisión', permiso: 'plantillas.listar', cu: 'CU-06', pantalla: PlantillasEmision },
    { ruta: '/escaletas', titulo: 'Escaletas', permiso: 'escaletas.listar', cu: 'CU-06', pantalla: Escaletas },
    { ruta: '/analitica', titulo: 'Analítica Periodística', permiso: 'analitica.ver', cu: 'CU-07', pantalla: AnaliticaPeriodistica },
    { ruta: '/reportes', titulo: 'Reportes y Estadísticas', permiso: ['reportes.ver', 'reportes.mantenimiento'], cu: 'CU-08', pantalla: ReportesEstadisticas },
    { ruta: '/seguridad/matriz', titulo: 'Matriz de Accesos', permiso: 'seguridad.matriz.ver', cu: 'CU-01', pantalla: MatrizAccesos },
    { ruta: '/seguridad/menu', titulo: 'Menú Dinámico', permiso: 'seguridad.menu', cu: 'CU-01', pantalla: AdministrarMenu },
    { ruta: '/seguridad/bitacora', titulo: 'Bitácora de Accesos', permiso: 'bitacora.ver', cu: 'CU-08', pantalla: BitacoraAccesos },
    { ruta: '/solicitudes', titulo: 'Solicitudes de Cobertura', permiso: 'solicitudes.listar', cu: 'CU-09', pantalla: SolicitudesCobertura },
    { ruta: '/tarifas', titulo: 'Tarifas de Servicios', permiso: 'tarifas.gestionar', cu: 'CU-09', pantalla: TarifasServicios },
];

/* Pantallas a las que se llega desde otra pantalla (no desde el menú). */
const SUBPANTALLAS = [
    { ruta: '/personal/ausencias', permiso: 'ausencias.listar', pantalla: GestionAusencias },
    { ruta: '/personal/disponibilidad', permiso: 'personal.disponibilidad', pantalla: DisponibilidadPersonal },
    { ruta: '/coberturas/:id', permiso: 'coberturas.listar', pantalla: DetalleCobertura },
    { ruta: '/coberturas/:id/hoja', permiso: 'coberturas.hoja', pantalla: HojaAsignacion },
    { ruta: '/notas/:id', permiso: 'notas.listar', pantalla: DetalleNota },
    { ruta: '/notas/:id/historial', permiso: 'notas.listar', pantalla: HistorialGuion },
    { ruta: '/notas/:id/material', permiso: 'material.listar', pantalla: MaterialAudiovisual },
    { ruta: '/escaletas/:id', permiso: 'escaletas.listar', pantalla: EditorEscaleta },
    { ruta: '/escaletas/:id/presentador', permiso: 'escaletas.lectura', pantalla: VistaPresentador },
    { ruta: '/reportes/ver', permiso: ['reportes.ver', 'reportes.mantenimiento'], pantalla: VistaReporte },
    { ruta: '/reportes/bitacora-comandos', permiso: 'bitacora.ver', pantalla: BitacoraComandos },
    { ruta: '/solicitudes/:id', permiso: 'solicitudes.listar', pantalla: DetalleSolicitud },
];

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                {/* Visitante */}
                <Route index element={<Inicio />} />
                <Route path="login" element={<Login />} />
                <Route path="buscar" element={<ResultadosBusqueda />} />
                <Route path="solicitar" element={<SolicitarCobertura />} />
                <Route path="solicitar/pago-recibido" element={<PagoRecibido />} />
                <Route path="solicitar/consulta" element={<ConsultarSolicitud />} />

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
