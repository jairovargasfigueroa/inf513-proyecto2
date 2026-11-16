import { CalendarOff, Pencil, Search, UserPlus, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { CARGOS, CONDICIONES, op, texto } from '../../utils/etiquetas';
import { fechaCorta } from '../../utils/formato';
import { max, requerido, requeridoSi } from '../../validation/reglas';

/**
 * Gestión de Personal «client page» (CU-02): listar(filtros) con GET /personal;
 * onNuevo / onEditar abren FormularioPersonal; onDesactivar envía DELETE;
 * verAusencias lleva a Gestión de Ausencias y «Disponibilidad» a Disponibilidad del Personal.
 */
export default function GestionPersonal() {
    const avisos = useAvisos();
    const [parametros] = useSearchParams(); // la búsqueda global llega con ?buscar=
    const { filas, meta, filtros, cargando, error, filtrar, setPagina, recargar } = useListado('/personal', { buscar: parametros.get('buscar') ?? '', cargo: '', estado: 'activo' });
    const [formulario, setFormulario] = useState({ abierto: false, ficha: null });
    const [aDesactivar, setADesactivar] = useState(null);

    const desactivar = async () => {
        try {
            const { data } = await api.delete(`/personal/${aDesactivar.id}`);
            avisos.respuesta(data);
            recargar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setADesactivar(null);
        }
    };

    const columnas = [
        { titulo: 'Persona', celda: (p) => <><span className="block font-medium">{p.nombre_completo}</span><span className="block text-suave">{p.telefono ?? p.correo}</span></> },
        { titulo: 'Cargo', celda: (p) => texto(CARGOS, p.cargo) },
        { titulo: 'Condición', celda: (p) => <>{texto(CONDICIONES, p.condicion_laboral)}{p.unidad_academica && <span className="block text-suave">{p.unidad_academica}</span>}</> },
        { titulo: 'Turno', campo: 'turno' },
        { titulo: 'Ingreso', celda: (p) => fechaCorta(p.fecha_ingreso) },
        { titulo: 'Estado', celda: (p) => <Insignia tono={p.estado === 'activo' ? 'exito' : 'neutro'}>{p.estado === 'activo' ? 'Activo' : 'Inactivo'}</Insignia> },
        {
            titulo: 'Acciones', oculto: true, alinear: 'derecha',
            celda: (p) => (
                <div className="flex justify-end gap-1">
                    <Puede permiso="ausencias.listar">
                        <Link to={`/personal/ausencias?personal_id=${p.id}`} className="boton-icono rounded-tema" aria-label={`Ver ausencias de ${p.nombre_completo}`} title="Ver ausencias">
                            <CalendarOff className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </Puede>
                    <Puede permiso="personal.editar">
                        <button type="button" className="boton-icono rounded-tema" onClick={() => setFormulario({ abierto: true, ficha: p })} aria-label={`Editar la ficha de ${p.nombre_completo}`} title="Editar">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </Puede>
                    <Puede permiso="personal.desactivar">
                        {p.estado === 'activo' && (
                            <button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => setADesactivar(p)} aria-label={`Desactivar la ficha de ${p.nombre_completo}`} title="Desactivar">
                                <UserX className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </Puede>
                </div>
            ),
        },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Gestión de Personal" descripcion="Fichas laborales del personal de prensa." casoUso="CU-02">
                <Puede permiso="personal.disponibilidad">
                    <Link to="/personal/disponibilidad" className="boton-secundario"><Search className="h-4 w-4" aria-hidden="true" /> Disponibilidad</Link>
                </Puede>
                <Puede permiso="ausencias.listar">
                    <Link to="/personal/ausencias" className="boton-secundario"><CalendarOff className="h-4 w-4" aria-hidden="true" /> Ausencias</Link>
                </Puede>
                <Puede permiso="personal.crear">
                    <button type="button" className="boton" onClick={() => setFormulario({ abierto: true, ficha: null })}>
                        <UserPlus className="h-4 w-4" aria-hidden="true" /> Nueva ficha
                    </button>
                </Puede>
            </EncabezadoPagina>

            <div className="tarjeta">
                <form className="mb-4 grid gap-3 sm:grid-cols-3" role="search" onSubmit={(e) => e.preventDefault()}>
                    <Campo etiqueta="Buscar" nombre="buscar" type="search" placeholder="Nombre" value={filtros.buscar} onChange={(e) => filtrar({ buscar: e.target.value })} />
                    <Campo como="select" etiqueta="Cargo" nombre="cargo" value={filtros.cargo} onChange={(e) => filtrar({ cargo: e.target.value })} vacio="Todos los cargos" opciones={op.CARGOS} />
                    <Campo como="select" etiqueta="Estado" nombre="estado" value={filtros.estado} onChange={(e) => filtrar({ estado: e.target.value })} vacio="Todos" opciones={[{ valor: 'activo', texto: 'Activos' }, { valor: 'inactivo', texto: 'Inactivos' }]} />
                </form>
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={filas} cargando={cargando} descripcion="Personal de prensa" vacio="No hay personal con esos filtros." />
                <Paginacion meta={meta} alCambiar={setPagina} />
            </div>

            <FormularioPersonal
                abierto={formulario.abierto}
                ficha={formulario.ficha}
                alCerrar={() => setFormulario({ abierto: false, ficha: null })}
                alGuardar={() => { setFormulario({ abierto: false, ficha: null }); recargar(); }}
            />
            <Confirmar
                abierto={Boolean(aDesactivar)}
                alCerrar={() => setADesactivar(null)}
                titulo="Desactivar ficha"
                mensaje={aDesactivar && `${aDesactivar.nombre_completo} ya no podrá asignarse a coberturas. Si tiene coberturas pendientes, se le avisará para reasignarlas.`}
                textoBoton="Desactivar"
                alConfirmar={desactivar}
            />
        </section>
    );
}

const VACIO = { usuario_id: '', cargo: '', condicion_laboral: '', unidad_academica: '', turno_id: '', fecha_ingreso: '', estado: 'activo' };

/** FormularioPersonal «form»: pide los turnos (GET /turnos) y envía POST | PUT /personal. */
function FormularioPersonal({ abierto, ficha, alCerrar, alGuardar }) {
    const avisos = useAvisos();
    const editando = Boolean(ficha);
    const [turnos, setTurnos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);

    // Mismas reglas que PersonalRequest en Laravel.
    const esquema = (d) => ({
        ...(editando ? {} : { usuario_id: ['usuario', [requerido]] }),
        cargo: ['cargo', [requerido]],
        condicion_laboral: ['condición laboral', [requerido]],
        unidad_academica: ['unidad académica', [
            requeridoSi(d.condicion_laboral === 'practicante', 'La unidad académica es obligatoria para los practicantes.'),
            max(150),
        ]],
        turno_id: ['turno', [requerido]],
    });
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, esquema);

    useEffect(() => {
        if (!abierto) return;
        reiniciar(ficha
            ? { ...VACIO, ...ficha, turno_id: String(ficha.turno_id), unidad_academica: ficha.unidad_academica ?? '', fecha_ingreso: ficha.fecha_ingreso ?? '' }
            : VACIO);
        api.get('/turnos').then(({ data }) => setTurnos(data.data)).catch(() => {});
        if (!ficha) {
            api.get('/usuarios', { params: { sin_ficha: 1, estado: 'activo' } }).then(({ data }) => setUsuarios(data.data)).catch(() => {});
        }
    }, [abierto, ficha, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = {
                cargo: d.cargo, condicion_laboral: d.condicion_laboral, turno_id: Number(d.turno_id),
                unidad_academica: d.condicion_laboral === 'practicante' ? d.unidad_academica : null,
                fecha_ingreso: d.fecha_ingreso || null,
            };
            return editando
                ? api.put(`/personal/${ficha.id}`, { ...cuerpo, estado: d.estado })
                : api.post('/personal', { ...cuerpo, usuario_id: Number(d.usuario_id) });
        });
        if (r) {
            avisos.respuesta(r.data);
            alGuardar();
        }
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={editando ? `Ficha de ${ficha.nombre_completo}` : 'Nueva ficha de personal'} descripcion="Los campos con * son obligatorios." ancho="max-w-2xl">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    {!editando && (
                        <Campo
                            como="select" etiqueta="Usuario" nombre="usuario_id" value={datos.usuario_id} onChange={cambiar} error={errores.usuario_id} requerido className="sm:col-span-2"
                            vacio={usuarios.length ? 'Elija un usuario sin ficha' : 'No hay usuarios sin ficha'}
                            opciones={usuarios.map((u) => ({ valor: String(u.id), texto: `${u.nombre_completo} (${u.rol.nombre})` }))}
                            ayuda="Primero se registra el usuario en Gestión de Usuarios."
                        />
                    )}
                    <Campo como="select" etiqueta="Cargo" nombre="cargo" value={datos.cargo} onChange={cambiar} error={errores.cargo} requerido vacio="Elija un cargo" opciones={op.CARGOS} />
                    <Campo como="select" etiqueta="Turno" nombre="turno_id" value={datos.turno_id} onChange={cambiar} error={errores.turno_id} requerido vacio="Elija un turno" opciones={turnos.map((t) => ({ valor: String(t.id), texto: `${t.nombre} (${t.hora_inicio}–${t.hora_fin})` }))} />
                    <Campo como="select" etiqueta="Condición laboral" nombre="condicion_laboral" value={datos.condicion_laboral} onChange={cambiar} error={errores.condicion_laboral} requerido vacio="Elija una condición" opciones={op.CONDICIONES} />
                    <Campo etiqueta="Fecha de ingreso" nombre="fecha_ingreso" type="date" value={datos.fecha_ingreso} onChange={cambiar} error={errores.fecha_ingreso} />
                    {datos.condicion_laboral === 'practicante' && (
                        <Campo etiqueta="Unidad académica" nombre="unidad_academica" value={datos.unidad_academica} onChange={cambiar} error={errores.unidad_academica} requerido maxLength={150} className="sm:col-span-2" ayuda="Carrera o facultad de origen del practicante." />
                    )}
                    {editando && (
                        <Campo como="select" etiqueta="Estado" nombre="estado" value={datos.estado} onChange={cambiar} error={errores.estado} opciones={[{ valor: 'activo', texto: 'Activo' }, { valor: 'inactivo', texto: 'Inactivo' }]} />
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}
