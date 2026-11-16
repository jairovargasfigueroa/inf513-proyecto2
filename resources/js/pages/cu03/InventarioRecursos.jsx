import { AlertTriangle, ArchiveX, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Confirmar from '../../components/ui/Confirmar';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import useListado from '../../hooks/useListado';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_RECURSO, opciones, texto } from '../../utils/etiquetas';
import { formato, max, min, requerido } from '../../validation/reglas';

const TONO = { operativo: 'exito', mantenimiento: 'acento', baja: 'neutro' };

/**
 * Inventario de Recursos «client page» (CU-03): listar(filtros) con GET /recursos;
 * onNuevo / onEditar abren FormularioRecurso; onReportarIncidencia abre
 * FormularioIncidencia; onDarDeAlta y onDarDeBaja envían POST …/alta y DELETE.
 */
export default function InventarioRecursos() {
    const avisos = useAvisos();
    const [parametros] = useSearchParams();
    const { filas, meta, filtros, cargando, error, filtrar, setPagina, recargar } = useListado('/recursos', {
        buscar: parametros.get('buscar') ?? '', tipo_recurso_id: '', estado: '',
    });
    const [tipos, setTipos] = useState([]);
    const [formulario, setFormulario] = useState({ abierto: false, recurso: null });
    const [incidencia, setIncidencia] = useState(null);
    const [confirmar, setConfirmar] = useState(null); // { recurso, accion: 'alta' | 'baja' }

    useEffect(() => {
        api.get('/tipos-recurso').then(({ data }) => setTipos(data.data)).catch(() => {});
    }, []);

    const ejecutar = async () => {
        const { recurso, accion } = confirmar;
        try {
            const { data } = accion === 'baja' ? await api.delete(`/recursos/${recurso.id}`) : await api.post(`/recursos/${recurso.id}/alta`);
            avisos.respuesta(data);
            recargar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setConfirmar(null);
        }
    };

    const columnas = [
        { titulo: 'Código', celda: (r) => <span className="font-mono font-semibold">{r.codigo}</span> },
        { titulo: 'Equipo', celda: (r) => <><span className="block font-medium">{r.marca} {r.modelo}</span><span className="block text-suave">{r.tipo}{r.placa ? ` · Placa ${r.placa}` : ''}</span></> },
        { titulo: 'Características', celda: (r) => r.caracteristicas ?? '—' },
        {
            titulo: 'Estado',
            celda: (r) => (
                <span className="flex flex-wrap gap-1">
                    <Insignia tono={TONO[r.estado]}>{texto(ESTADOS_RECURSO, r.estado)}</Insignia>
                    {r.prestado && <Insignia tono="peligro">Entregado</Insignia>}
                </span>
            ),
        },
        {
            titulo: 'Acciones', oculto: true, alinear: 'derecha',
            celda: (r) => (
                <div className="flex justify-end gap-1">
                    {r.estado !== 'baja' && (
                        <Puede permiso="recursos.editar">
                            <button type="button" className="boton-icono rounded-tema" onClick={() => setFormulario({ abierto: true, recurso: r })} aria-label={`Editar ${r.codigo}`} title="Editar"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        </Puede>
                    )}
                    {r.estado === 'operativo' && (
                        <Puede permiso="recursos.incidencia">
                            <button type="button" className="boton-icono rounded-tema text-acento" onClick={() => setIncidencia(r)} aria-label={`Reportar incidencia de ${r.codigo}`} title="Reportar incidencia"><AlertTriangle className="h-4 w-4" aria-hidden="true" /></button>
                        </Puede>
                    )}
                    {r.estado === 'mantenimiento' && (
                        <Puede permiso="recursos.alta">
                            <button type="button" className="boton-icono rounded-tema text-exito" onClick={() => setConfirmar({ recurso: r, accion: 'alta' })} aria-label={`Dar de alta ${r.codigo}`} title="Dar de alta"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></button>
                        </Puede>
                    )}
                    {r.estado !== 'baja' && (
                        <Puede permiso="recursos.baja">
                            <button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => setConfirmar({ recurso: r, accion: 'baja' })} aria-label={`Dar de baja ${r.codigo}`} title="Dar de baja"><ArchiveX className="h-4 w-4" aria-hidden="true" /></button>
                        </Puede>
                    )}
                </div>
            ),
        },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Inventario de Recursos" descripcion="Equipos técnicos y unidades móviles." casoUso="CU-03">
                <Puede permiso="recursos.crear">
                    <button type="button" className="boton" onClick={() => setFormulario({ abierto: true, recurso: null })}><Plus className="h-4 w-4" aria-hidden="true" /> Nuevo recurso</button>
                </Puede>
            </EncabezadoPagina>

            <div className="tarjeta">
                <form className="mb-4 grid gap-3 sm:grid-cols-3" role="search" onSubmit={(e) => e.preventDefault()}>
                    <Campo etiqueta="Buscar" nombre="buscar" type="search" placeholder="Código, marca, modelo o placa" value={filtros.buscar} onChange={(e) => filtrar({ buscar: e.target.value })} />
                    <Campo como="select" etiqueta="Tipo" nombre="tipo_recurso_id" value={filtros.tipo_recurso_id} onChange={(e) => filtrar({ tipo_recurso_id: e.target.value })} vacio="Todos los tipos" opciones={tipos.map((t) => ({ valor: String(t.id), texto: t.nombre }))} />
                    <Campo como="select" etiqueta="Estado" nombre="estado" value={filtros.estado} onChange={(e) => filtrar({ estado: e.target.value })} vacio="En uso (sin las bajas)" opciones={opciones(ESTADOS_RECURSO)} />
                </form>
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={filas} cargando={cargando} descripcion="Inventario de recursos" vacio="No hay recursos con esos filtros." />
                <Paginacion meta={meta} alCambiar={setPagina} />
            </div>

            <FormularioRecurso abierto={formulario.abierto} recurso={formulario.recurso} tipos={tipos} alCerrar={() => setFormulario({ abierto: false, recurso: null })} alGuardar={(data) => { avisos.respuesta(data); setFormulario({ abierto: false, recurso: null }); recargar(); }} />
            <FormularioIncidencia recurso={incidencia} alCerrar={() => setIncidencia(null)} alGuardar={(data) => { avisos.respuesta(data); setIncidencia(null); recargar(); }} />
            <Confirmar
                abierto={Boolean(confirmar)}
                alCerrar={() => setConfirmar(null)}
                titulo={confirmar?.accion === 'baja' ? 'Dar de baja el recurso' : 'Dar de alta el recurso'}
                mensaje={confirmar && (confirmar.accion === 'baja'
                    ? `${confirmar.recurso.codigo} quedará fuera del inventario en forma definitiva. Queda registrado en su historial de mantenimiento.`
                    : `${confirmar.recurso.codigo} volverá a estar operativo y se podrá entregar y reservar.`)}
                textoBoton={confirmar?.accion === 'baja' ? 'Dar de baja' : 'Dar de alta'}
                peligroso={confirmar?.accion === 'baja'}
                alConfirmar={ejecutar}
            />
        </section>
    );
}

const VACIO = { codigo: '', tipo_recurso_id: '', marca: '', modelo: '', placa: '', caracteristicas: '' };

/** FormularioRecurso «form»: pide GET /tipos-recurso y envía POST | PUT /recursos. */
function FormularioRecurso({ abierto, recurso, tipos, alCerrar, alGuardar }) {
    const editando = Boolean(recurso);
    const esMovil = (d) => tipos.find((t) => String(t.id) === d.tipo_recurso_id)?.es_unidad_movil;
    const esquema = {
        codigo: ['código', [requerido, max(20), formato(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'El código solo puede tener letras, números, guiones y guiones bajos (por ejemplo CAM-05).')]],
        tipo_recurso_id: ['tipo', [requerido]],
        marca: ['marca', [requerido, max(50)]],
        modelo: ['modelo', [requerido, max(80)]],
        placa: ['placa', [max(15)]],
        caracteristicas: ['características', [max(255)]],
    };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, esquema);

    useEffect(() => {
        if (abierto) reiniciar(recurso ? { ...VACIO, ...recurso, tipo_recurso_id: String(recurso.tipo_recurso_id), placa: recurso.placa ?? '', caracteristicas: recurso.caracteristicas ?? '' } : VACIO);
    }, [abierto, recurso, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = { ...d, tipo_recurso_id: Number(d.tipo_recurso_id), placa: esMovil(d) ? d.placa || null : null, caracteristicas: d.caracteristicas || null };
            return editando ? api.put(`/recursos/${recurso.id}`, cuerpo) : api.post('/recursos', cuerpo);
        });
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={editando ? `Editar ${recurso.codigo}` : 'Nuevo recurso'} descripcion="Los campos con * son obligatorios." ancho="max-w-2xl">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Código" nombre="codigo" value={datos.codigo} onChange={cambiar} error={errores.codigo} requerido maxLength={20} ayuda="Se guarda en mayúsculas, por ejemplo CAM-05." />
                    <Campo como="select" etiqueta="Tipo" nombre="tipo_recurso_id" value={datos.tipo_recurso_id} onChange={cambiar} error={errores.tipo_recurso_id} requerido vacio="Elija el tipo" opciones={tipos.map((t) => ({ valor: String(t.id), texto: t.nombre }))} />
                    <Campo etiqueta="Marca" nombre="marca" value={datos.marca} onChange={cambiar} error={errores.marca} requerido maxLength={50} />
                    <Campo etiqueta="Modelo" nombre="modelo" value={datos.modelo} onChange={cambiar} error={errores.modelo} requerido maxLength={80} />
                    {esMovil(datos) && <Campo etiqueta="Placa" nombre="placa" value={datos.placa} onChange={cambiar} error={errores.placa} maxLength={15} ayuda="Solo las unidades móviles llevan placa." />}
                    <Campo como="textarea" etiqueta="Características" nombre="caracteristicas" value={datos.caracteristicas} onChange={cambiar} error={errores.caracteristicas} maxLength={255} className="sm:col-span-2" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** FormularioIncidencia «form»: POST /recursos/{id}/incidencias → el recurso pasa a mantenimiento. */
function FormularioIncidencia({ recurso, alCerrar, alGuardar }) {
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ descripcion: '' }, { descripcion: ['descripción', [requerido, min(5), max(255)]] });

    useEffect(() => {
        if (recurso) reiniciar({ descripcion: '' });
    }, [recurso, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/recursos/${recurso.id}/incidencias`, d));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={Boolean(recurso)} alCerrar={alCerrar} titulo={`Reportar incidencia de ${recurso?.codigo ?? ''}`} descripcion="El recurso pasa a mantenimiento hasta que se dé de alta.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <Campo como="textarea" etiqueta="¿Qué falla?" nombre="descripcion" value={datos.descripcion} onChange={cambiar} error={errores.descripcion} requerido maxLength={255} />
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Reportar'}</button>
                </div>
            </form>
        </Modal>
    );
}
