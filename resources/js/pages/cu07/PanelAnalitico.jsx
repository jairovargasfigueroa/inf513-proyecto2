import { Activity, Camera, ClipboardCheck, Eye, FileText, ShieldAlert, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormularioPeriodo, { haceDias } from '../../components/FormularioPeriodo';
import Puede from '../../components/Puede';
import { Barras, Indicador, Lineas, Marco } from '../../components/graficos/Graficos';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_NOTA, TIPOS_COBERTURA, texto } from '../../utils/etiquetas';
import { fechaCorta } from '../../utils/formato';

const diaCorto = (d) => fechaCorta(d).slice(0, 5);

/**
 * Panel Analítico (Dashboard) «client page» (CU-07; consigna, punto 8):
 * cargarIndicadores(periodo) con GET /dashboard?desde&hasta y verGraficos()
 * del negocio (coberturas, notas, recursos) y del flujo de accesos al sitio.
 */
export default function PanelAnalitico() {
    const [periodo, setPeriodo] = useState({ desde: haceDias(29), hasta: haceDias(0) });
    const [panel, setPanel] = useState(null);
    const [error, setError] = useState(null);

    const cargar = useCallback(async (p) => {
        setError(null);
        try {
            const { data } = await api.get('/dashboard', { params: p });
            setPanel(data);
            setPeriodo(p);
        } catch (e) {
            if (e.response?.status === 422) throw e; // el formulario muestra el error en su campo
            setError(mensajeDeError(e));
        }
    }, []);

    useEffect(() => { cargar(periodo).catch(() => {}); }, []);

    const i = panel?.indicadores;

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Panel Analítico" descripcion="Actividad del canal y flujo de accesos al sitio." casoUso="CU-07">
                <Puede permiso="analitica.ver"><Link to="/analitica" className="boton-secundario"><TrendingUp className="h-4 w-4" aria-hidden="true" /> Ver detalle por periodista</Link></Puede>
            </EncabezadoPagina>

            <FormularioPeriodo inicial={periodo} alEnviar={cargar} />
            {error && <p className="text-peligro" role="alert">{error}</p>}
            {!panel && !error && <Cargando />}

            {panel && (
                <>
                    <h2 className="sr-only">Indicadores del período</h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Indicador icono={ClipboardCheck} titulo="Coberturas" valor={i.coberturas} detalle={`${i.cumplimiento ?? '—'} % de cumplimiento · ${i.coberturas_pendientes} sin retorno`} />
                        <Indicador icono={FileText} titulo="Notas" valor={i.notas} detalle={`${i.notas_aprobadas} aprobadas o emitidas · ${i.notas_en_revision} en revisión`} />
                        <Indicador icono={Camera} titulo="Recursos operativos" valor={i.recursos_operativos} detalle={`${i.recursos_mantenimiento} en mantenimiento · ${i.recursos_entregados} entregados`} />
                        <Indicador icono={Activity} titulo="Peticiones a la API" valor={i.peticiones} detalle={`${i.usuarios_activos} usuarios · ${i.logins} inicios de sesión`} />
                        <Indicador icono={ShieldAlert} titulo="Intentos fallidos" valor={i.logins_fallidos} detalle={`${i.accesos_denegados} accesos denegados (403/401)`} />
                        <Indicador icono={Eye} titulo="Visitas acumuladas" valor={i.visitas} detalle="Todas las páginas del sitio" />
                    </div>

                    <h2 className="pt-2 text-lg font-semibold">Actividad del canal</h2>
                    <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
                        <Marco
                            titulo="Coberturas por tipo"
                            descripcion="Según su resultado en el período"
                            filas={panel.coberturas_por_tipo}
                            columnas={[
                                { clave: 'tipo', titulo: 'Tipo', formato: (v) => texto(TIPOS_COBERTURA, v) },
                                { clave: 'cumplidas', titulo: 'Cumplidas' }, { clave: 'canceladas', titulo: 'Canceladas o reprogramadas' }, { clave: 'pendientes', titulo: 'Sin retorno' },
                            ]}
                        >
                            <Barras datos={panel.coberturas_por_tipo} categoria="tipo" horizontal formatoCategoria={(v) => texto(TIPOS_COBERTURA, v)}
                                series={[{ clave: 'cumplidas', nombre: 'Cumplidas' }, { clave: 'canceladas', nombre: 'Canceladas o reprogramadas' }, { clave: 'pendientes', nombre: 'Sin retorno' }]} />
                        </Marco>
                        <Marco
                            titulo="Notas por estado"
                            descripcion="Notas con fecha de emisión en el período"
                            filas={panel.notas_por_estado}
                            columnas={[{ clave: 'estado', titulo: 'Estado', formato: (v) => texto(ESTADOS_NOTA, v) }, { clave: 'cantidad', titulo: 'Notas' }]}
                        >
                            <Barras datos={panel.notas_por_estado} categoria="estado" formatoCategoria={(v) => texto(ESTADOS_NOTA, v)} series={[{ clave: 'cantidad', nombre: 'Notas' }]} />
                        </Marco>
                    </div>

                    <h2 className="pt-2 text-lg font-semibold">Flujo de accesos al sitio</h2>
                    <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
                        <Marco
                            titulo="Inicios de sesión por día"
                            descripcion="Exitosos y fallidos (bitácora de accesos)"
                            filas={panel.logins_por_dia}
                            columnas={[{ clave: 'dia', titulo: 'Día', formato: fechaCorta }, { clave: 'exitosos', titulo: 'Exitosos' }, { clave: 'fallidos', titulo: 'Fallidos' }]}
                        >
                            <Barras datos={panel.logins_por_dia} categoria="dia" formatoCategoria={diaCorto} series={[{ clave: 'exitosos', nombre: 'Exitosos' }, { clave: 'fallidos', nombre: 'Fallidos' }]} />
                        </Marco>
                        <Marco
                            titulo="Peticiones a la API por día"
                            filas={panel.logins_por_dia}
                            columnas={[{ clave: 'dia', titulo: 'Día', formato: fechaCorta }, { clave: 'peticiones', titulo: 'Peticiones' }]}
                        >
                            <Lineas datos={panel.logins_por_dia} categoria="dia" formatoCategoria={diaCorto} series={[{ clave: 'peticiones', nombre: 'Peticiones' }]} />
                        </Marco>
                        <Marco
                            titulo="Páginas más visitadas"
                            descripcion="Visitas acumuladas (contador del pie de página)"
                            filas={panel.paginas_top}
                            columnas={[{ clave: 'pagina', titulo: 'Página' }, { clave: 'cantidad', titulo: 'Visitas' }]}
                        >
                            <Barras datos={panel.paginas_top} categoria="pagina" horizontal series={[{ clave: 'cantidad', nombre: 'Visitas' }]} />
                        </Marco>
                    </div>
                </>
            )}
        </section>
    );
}
