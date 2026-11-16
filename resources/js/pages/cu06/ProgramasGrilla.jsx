import { CalendarPlus, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { DIAS_LARGOS, TIPOS_PROGRAMA, opciones, texto } from '../../utils/etiquetas';
import { fechaCorta, hoy } from '../../utils/formato';
import { formato, max, requerido } from '../../validation/reglas';

/**
 * Programas y Grilla «client page» (CU-06): listarProgramas() con GET /programas,
 * listarGrilla(semana) con GET /grilla?vista=semana; onNuevoPrograma y
 * onNuevoHorario abren sus formularios.
 */
export default function ProgramasGrilla() {
    const avisos = useAvisos();
    const [programas, setProgramas] = useState(null);
    const [grilla, setGrilla] = useState(null);
    const [error, setError] = useState(null);
    const [abierto, setAbierto] = useState(null); // 'programa' | 'horario'

    const listar = useCallback(() => {
        Promise.all([api.get('/programas'), api.get('/grilla', { params: { vista: 'semana' } })])
            .then(([p, g]) => { setProgramas(p.data.data); setGrilla(g.data.data); })
            .catch((e) => setError(mensajeDeError(e)));
    }, []);
    useEffect(listar, [listar]);

    const listo = (data) => { avisos.respuesta(data); setAbierto(null); listar(); };

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!programas) return <Cargando />;

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Programas y Grilla" descripcion="Programas del canal y su horario semanal." casoUso="CU-06">
                <Puede permiso="programas.crear"><button type="button" className="boton-secundario" onClick={() => setAbierto('programa')}><Plus className="h-4 w-4" aria-hidden="true" /> Nuevo programa</button></Puede>
                <Puede permiso="grilla.crear"><button type="button" className="boton" onClick={() => setAbierto('horario')}><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Nuevo horario</button></Puede>
            </EncabezadoPagina>

            <section className="tarjeta" aria-labelledby="titulo-grilla-semanal">
                <h2 id="titulo-grilla-semanal" className="mb-3 text-lg font-semibold">Grilla semanal</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {Object.entries(DIAS_LARGOS).map(([n, dia]) => {
                        const delDia = grilla.filter((g) => String(g.dia_semana) === n);
                        return (
                            <div key={n} className="rounded-tema border border-borde p-2">
                                <h3 className="mb-1 font-semibold">{dia}</h3>
                                {delDia.length === 0 ? <p className="text-sm text-suave">Sin programas.</p> : (
                                    <ul className="space-y-1 text-sm">
                                        {delDia.map((g) => (
                                            <li key={g.id} className="rounded-tema bg-fondo p-1.5">
                                                <span className="block font-semibold text-primario">{g.hora_inicio}–{g.hora_fin}</span>
                                                {g.programa}
                                                {g.vigente_hasta && <span className="block text-xs text-suave">hasta {fechaCorta(g.vigente_hasta)}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="tarjeta" aria-labelledby="titulo-programas">
                <h2 id="titulo-programas" className="mb-3 text-lg font-semibold">Programas</h2>
                <TablaDatos
                    filas={programas}
                    descripcion="Programas del canal"
                    columnas={[
                        { titulo: 'Programa', celda: (p) => <><span className="block font-medium">{p.nombre}</span>{p.descripcion && <span className="block text-suave">{p.descripcion}</span>}</> },
                        { titulo: 'Tipo', celda: (p) => texto(TIPOS_PROGRAMA, p.tipo) },
                        { titulo: 'Horarios', campo: 'horarios', alinear: 'derecha' },
                        { titulo: 'Plantillas', campo: 'plantillas', alinear: 'derecha' },
                        { titulo: 'Estado', celda: (p) => <Insignia tono={p.estado === 'activo' ? 'exito' : 'neutro'}>{p.estado === 'activo' ? 'Activo' : 'Inactivo'}</Insignia> },
                    ]}
                />
            </section>

            <FormularioPrograma abierto={abierto === 'programa'} alCerrar={() => setAbierto(null)} alGuardar={listo} />
            <FormularioHorario abierto={abierto === 'horario'} programas={programas.filter((p) => p.estado === 'activo')} alCerrar={() => setAbierto(null)} alGuardar={listo} />
        </section>
    );
}

/** FormularioPrograma «form»: POST /programas → 201. */
function FormularioPrograma({ abierto, alCerrar, alGuardar }) {
    const vacio = { nombre: '', tipo: 'noticiero', descripcion: '' };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(vacio, { nombre: ['nombre', [requerido, max(100)]], tipo: ['tipo', [requerido]], descripcion: ['descripción', [max(255)]] });
    useEffect(() => { if (abierto) reiniciar({ nombre: '', tipo: 'noticiero', descripcion: '' }); }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post('/programas', { ...d, descripcion: d.descripcion || null }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Nuevo programa">
            <form onSubmit={guardar} noValidate className="space-y-4">
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar} error={errores.nombre} requerido maxLength={100} />
                <Campo como="select" etiqueta="Tipo" nombre="tipo" value={datos.tipo} onChange={cambiar} error={errores.tipo} requerido opciones={opciones(TIPOS_PROGRAMA)} />
                <Campo como="textarea" etiqueta="Descripción" nombre="descripcion" value={datos.descripcion} onChange={cambiar} error={errores.descripcion} maxLength={255} />
                <div className="flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** FormularioHorario «form»: POST /grilla → 201 / 409 choque de grilla. */
function FormularioHorario({ abierto, programas, alCerrar, alGuardar }) {
    const vacio = { programa_id: '', dia_semana: '1', hora_inicio: '20:00', hora_fin: '21:00', vigente_desde: hoy(), vigente_hasta: '' };
    const esquema = (d) => ({
        programa_id: ['programa', [requerido]],
        dia_semana: ['día', [requerido]],
        hora_inicio: ['hora de inicio', [requerido]],
        hora_fin: ['hora de fin', [requerido, formato(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Escriba la hora de fin como HH:MM (hasta 24:00).'),
            (v) => (v && d.hora_inicio && v <= d.hora_inicio ? 'La hora de fin debe ser posterior a la de inicio: un horario no cruza la medianoche.' : null)]],
        vigente_desde: ['vigente desde', [requerido]],
        vigente_hasta: ['vigente hasta', [(v) => (v && v < d.vigente_desde ? 'La vigencia termina antes de empezar.' : null)]],
    });
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(vacio, esquema);
    useEffect(() => { if (abierto) reiniciar({ programa_id: '', dia_semana: '1', hora_inicio: '20:00', hora_fin: '21:00', vigente_desde: hoy(), vigente_hasta: '' }); }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post('/grilla', { ...d, programa_id: Number(d.programa_id), dia_semana: Number(d.dia_semana), vigente_hasta: d.vigente_hasta || null }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Nuevo horario en la grilla" descripcion="Un horario no cruza la medianoche y no puede chocar con otro del mismo día.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo como="select" etiqueta="Programa" nombre="programa_id" value={datos.programa_id} onChange={cambiar} error={errores.programa_id} requerido vacio="Elija el programa" opciones={programas.map((p) => ({ valor: String(p.id), texto: p.nombre }))} className="sm:col-span-2" />
                    <Campo como="select" etiqueta="Día" nombre="dia_semana" value={datos.dia_semana} onChange={cambiar} error={errores.dia_semana} requerido opciones={opciones(DIAS_LARGOS)} className="sm:col-span-2" />
                    <Campo etiqueta="Hora de inicio" nombre="hora_inicio" type="time" value={datos.hora_inicio} onChange={cambiar} error={errores.hora_inicio} requerido />
                    <Campo etiqueta="Hora de fin" nombre="hora_fin" value={datos.hora_fin} onChange={cambiar} error={errores.hora_fin} requerido placeholder="HH:MM" ayuda="Hasta 24:00." />
                    <Campo etiqueta="Vigente desde" nombre="vigente_desde" type="date" value={datos.vigente_desde} onChange={cambiar} error={errores.vigente_desde} requerido />
                    <Campo etiqueta="Vigente hasta" nombre="vigente_hasta" type="date" value={datos.vigente_hasta} onChange={cambiar} error={errores.vigente_hasta} ayuda="Vacío: sin fecha de fin." />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Agregar'}</button>
                </div>
            </form>
        </Modal>
    );
}
