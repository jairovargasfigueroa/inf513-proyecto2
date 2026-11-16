import { FilePlus2, MonitorPlay, PencilRuler } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_ESCALETA, texto } from '../../utils/etiquetas';
import { duracion, fechaLarga, hoy } from '../../utils/formato';
import { requerido } from '../../validation/reglas';

export const TONO_ESCALETA = { borrador: 'acento', cerrada: 'exito', emitida: 'neutro' };

/**
 * Escaletas «client page» (CU-06): listar(fecha) con GET /escaletas; onGenerar
 * abre FormularioGenerarEscaleta (201 → editor); abrir(id) lleva al Editor y
 * «Modo presentador» a la Vista del Presentador.
 */
export default function Escaletas() {
    const avisos = useAvisos();
    const [fecha, setFecha] = useState(hoy());
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState(null);
    const [generar, setGenerar] = useState(false);

    const listar = useCallback(() => {
        api.get('/escaletas', { params: { fecha } }).then(({ data }) => setDatos(data)).catch((e) => setError(mensajeDeError(e)));
    }, [fecha]);
    useEffect(listar, [listar]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;

    const columnas = [
        { titulo: 'Emisión', celda: (e) => <><span className="block font-medium">{fechaLarga(e.fecha)}</span><span className="block text-suave">{e.hora_inicio} · {duracion(e.duracion_total)}</span></> },
        { titulo: 'Programa', celda: (e) => <>{e.programa}<span className="block text-suave">{e.plantilla}</span></> },
        { titulo: 'Ítems', campo: 'items', alinear: 'derecha' },
        { titulo: 'Tiempos', celda: (e) => (e.alertas > 0 ? <Insignia tono="peligro">{e.alertas} bloque{e.alertas === 1 ? '' : 's'} con alerta</Insignia> : <Insignia tono="exito">En tiempo</Insignia>) },
        { titulo: 'Estado', celda: (e) => <Insignia tono={TONO_ESCALETA[e.estado]}>{texto(ESTADOS_ESCALETA, e.estado)}</Insignia> },
        {
            titulo: 'Acciones', oculto: true, alinear: 'derecha',
            celda: (e) => (
                <div className="flex justify-end gap-1">
                    <Link to={`/escaletas/${e.id}`} className="boton-secundario"><PencilRuler className="h-4 w-4" aria-hidden="true" /> Abrir</Link>
                    <Puede permiso="escaletas.lectura"><Link to={`/escaletas/${e.id}/presentador`} className="boton-icono rounded-tema" aria-label="Modo presentador" title="Modo presentador"><MonitorPlay className="h-4 w-4" aria-hidden="true" /></Link></Puede>
                </div>
            ),
        },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Escaletas" descripcion="Escaletas del noticiero de la semana anterior y la siguiente." casoUso="CU-06">
                <Puede permiso="escaletas.crear"><button type="button" className="boton" onClick={() => setGenerar(true)}><FilePlus2 className="h-4 w-4" aria-hidden="true" /> Generar escaleta</button></Puede>
            </EncabezadoPagina>
            <div className="tarjeta">
                <div className="mb-4 max-w-xs"><Campo etiqueta="Alrededor de la fecha" nombre="fecha" type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} /></div>
                {!datos ? <Cargando /> : <TablaDatos columnas={columnas} filas={datos.data} descripcion="Escaletas" vacio="No hay escaletas en esas fechas." />}
            </div>
            <FormularioGenerarEscaleta abierto={generar} alCerrar={() => setGenerar(false)} alGuardar={(data) => { avisos.respuesta(data); setGenerar(false); }} />
        </section>
    );
}

/** FormularioGenerarEscaleta «form»: POST /escaletas → 201 → Editor de Escaleta (R20, R21). */
function FormularioGenerarEscaleta({ abierto, alCerrar, alGuardar }) {
    const navegar = useNavigate();
    const [opciones, setOpciones] = useState({ horarios: [], plantillas: [] });
    const { datos, errores, mensaje, enviando, cambiar, asignar, reiniciar, enviar } = useFormulario(
        { fecha: hoy(), grilla_id: '', plantilla_id: '' },
        { fecha: ['fecha', [requerido]], grilla_id: ['horario de la grilla', [requerido]], plantilla_id: ['plantilla', [requerido]] },
    );

    useEffect(() => { if (abierto) reiniciar({ fecha: hoy(), grilla_id: '', plantilla_id: '' }); }, [abierto, reiniciar]);
    useEffect(() => {
        if (!abierto || !datos.fecha) return;
        api.get('/escaletas', { params: { fecha: datos.fecha } }).then(({ data }) => setOpciones({ horarios: data.horarios, plantillas: data.plantillas })).catch(() => {});
    }, [abierto, datos.fecha]);

    const horario = opciones.horarios.find((h) => String(h.id) === datos.grilla_id);
    const plantillas = opciones.plantillas.filter((p) => !horario || p.programa_id === horario.programa_id);

    const elegirHorario = (e) => {
        cambiar(e);
        const h = opciones.horarios.find((x) => String(x.id) === e.target.value);
        const unica = opciones.plantillas.filter((p) => h && p.programa_id === h.programa_id);
        asignar('plantilla_id', unica.length === 1 ? String(unica[0].id) : '');
    };

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post('/escaletas', { fecha: d.fecha, grilla_id: Number(d.grilla_id), plantilla_id: Number(d.plantilla_id) }));
        if (r) {
            alGuardar(r.data);
            navegar(`/escaletas/${r.data.data.id}`);
        }
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Generar escaleta" descripcion="Se crea en borrador con los cortes comerciales de la plantilla.">
            <form onSubmit={guardar} noValidate className="space-y-4">
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <Campo etiqueta="Fecha de emisión" nombre="fecha" type="date" value={datos.fecha} onChange={cambiar} error={errores.fecha} requerido />
                <Campo
                    como="select" etiqueta="Horario de la grilla" nombre="grilla_id" value={datos.grilla_id} onChange={elegirHorario} error={errores.grilla_id} requerido
                    vacio={opciones.horarios.length ? 'Elija el horario' : 'No hay programas en la grilla ese día'}
                    opciones={opciones.horarios.map((h) => ({ valor: String(h.id), texto: `${h.hora_inicio}–${h.hora_fin} · ${h.programa}${h.tiene_escaleta ? ' (ya tiene escaleta)' : ''}` }))}
                />
                <Campo como="select" etiqueta="Plantilla" nombre="plantilla_id" value={datos.plantilla_id} onChange={cambiar} error={errores.plantilla_id} requerido vacio="Elija la plantilla" opciones={plantillas.map((p) => ({ valor: String(p.id), texto: p.nombre }))} ayuda="Solo las plantillas listas del mismo programa." />
                <div className="flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Generando…' : 'Generar'}</button>
                </div>
            </form>
        </Modal>
    );
}
