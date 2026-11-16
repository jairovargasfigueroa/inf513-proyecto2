import { useCallback, useEffect, useState } from 'react';
import FormularioPeriodo, { haceDias } from '../../components/FormularioPeriodo';
import { Barras, Marco } from '../../components/graficos/Graficos';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import TablaDatos from '../../components/ui/TablaDatos';
import api, { mensajeDeError } from '../../services/api';
import { TIPOS_COBERTURA, texto } from '../../utils/etiquetas';

const horas = (min) => (min == null ? '—' : `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`);
const pct = (v) => (v == null ? '—' : `${v} %`);

/**
 * Analítica Periodística «client page» (CU-07): consultarProduccion() y
 * consultarCumplimiento() con GET /analitica/produccion y /analitica/coberturas (RF-16).
 */
export default function AnaliticaPeriodistica() {
    const [periodo, setPeriodo] = useState({ desde: haceDias(29), hasta: haceDias(0) });
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState(null);

    const consultar = useCallback(async (p) => {
        setError(null);
        try {
            const [prod, cob] = await Promise.all([
                api.get('/analitica/produccion', { params: p }),
                api.get('/analitica/coberturas', { params: p }),
            ]);
            setDatos({ produccion: prod.data.data, coberturas: cob.data.data });
            setPeriodo(p);
        } catch (e) {
            if (e.response?.status === 422) throw e;
            setError(mensajeDeError(e));
        }
    }, []);

    useEffect(() => { consultar(periodo).catch(() => {}); }, []);

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Analítica Periodística" descripcion="Producción de cada periodista y cumplimiento de las coberturas." casoUso="CU-07" />
            <FormularioPeriodo inicial={periodo} alEnviar={consultar} />
            {error && <p className="text-peligro" role="alert">{error}</p>}
            {!datos && !error && <Cargando />}

            {datos && (
                <>
                    <section className="tarjeta" aria-labelledby="titulo-produccion">
                        <h2 id="titulo-produccion" className="mb-1 text-lg font-semibold">Producción por periodista</h2>
                        <p className="mb-3 text-sm text-suave">«A la primera»: aprobadas sin ninguna observación. El tiempo de aprobación va del primer envío a revisión a la aprobación.</p>
                        <TablaDatos
                            clave="autor"
                            filas={datos.produccion}
                            vacio="No hay datos para el período indicado."
                            descripcion="Producción por periodista"
                            columnas={[
                                { titulo: 'Periodista', campo: 'autor' },
                                { titulo: 'Notas', campo: 'notas', alinear: 'derecha' },
                                { titulo: 'Aprobadas o emitidas', campo: 'aprobadas', alinear: 'derecha' },
                                { titulo: 'Aprobadas a la primera', celda: (f) => pct(f.a_la_primera), alinear: 'derecha' },
                                { titulo: 'Tiempo medio de aprobación (h:mm)', celda: (f) => horas(f.minutos_aprobacion), alinear: 'derecha' },
                            ]}
                        />
                    </section>

                    <Marco
                        titulo="Notas por periodista"
                        filas={datos.produccion}
                        columnas={[{ clave: 'autor', titulo: 'Periodista' }, { clave: 'aprobadas', titulo: 'Aprobadas o emitidas' }, { clave: 'notas', titulo: 'Notas' }]}
                        alto={Math.max(160, datos.produccion.length * 44)}
                    >
                        <Barras datos={datos.produccion.map((f) => ({ ...f, otras: f.notas - f.aprobadas }))} categoria="autor" horizontal
                            series={[{ clave: 'aprobadas', nombre: 'Aprobadas o emitidas' }, { clave: 'otras', nombre: 'En proceso' }]} />
                    </Marco>

                    <section className="tarjeta" aria-labelledby="titulo-cumplimiento">
                        <h2 id="titulo-cumplimiento" className="mb-1 text-lg font-semibold">Cumplimiento de coberturas por tipo</h2>
                        <p className="mb-3 text-sm text-suave">Cumplimiento: cumplidas sobre las que ya tienen retorno (las pendientes no cuentan).</p>
                        <TablaDatos
                            clave="tipo"
                            filas={datos.coberturas}
                            vacio="No hay datos para el período indicado."
                            descripcion="Cumplimiento de coberturas por tipo"
                            columnas={[
                                { titulo: 'Tipo', celda: (f) => texto(TIPOS_COBERTURA, f.tipo) },
                                { titulo: 'Coberturas', campo: 'coberturas', alinear: 'derecha' },
                                { titulo: 'Cumplidas', campo: 'cumplidas', alinear: 'derecha' },
                                { titulo: 'Canceladas', campo: 'canceladas', alinear: 'derecha' },
                                { titulo: 'Reprogramadas', campo: 'reprogramadas', alinear: 'derecha' },
                                { titulo: 'Sin retorno', campo: 'sin_retorno', alinear: 'derecha' },
                                { titulo: 'Cumplimiento', celda: (f) => <strong>{pct(f.cumplimiento)}</strong>, alinear: 'derecha' },
                            ]}
                        />
                    </section>
                </>
            )}
        </section>
    );
}
