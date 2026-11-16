import { Pencil, Plus, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Icono from '../../components/Icono';
import Campo, { Casilla } from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { entre, entero, formato, max, requerido } from '../../validation/reglas';

const ICONOS = ['panel', 'analitica', 'reportes', 'agenda', 'notas', 'programas', 'plantillas', 'escaletas', 'personal', 'turnos', 'recursos', 'prestamos', 'usuarios', 'matriz', 'menu', 'bitacora', 'perfil'];

/**
 * Menú Dinámico «client page» (CU-01): listar() con GET /menus; onNuevo /
 * onEditar abren FormularioMenu; asignarARol(rolId) envía PUT /roles/{id}/menus.
 */
export default function AdministrarMenu() {
    const { usuario, refrescar } = useAuth();
    const avisos = useAvisos();
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState(null);
    const [formulario, setFormulario] = useState({ abierto: false, menu: null });
    const [rolId, setRolId] = useState('');
    const [marcados, setMarcados] = useState(new Set());
    const [guardando, setGuardando] = useState(false);

    const listar = useCallback(async () => {
        try {
            const { data } = await api.get('/menus');
            setDatos(data);
            setRolId((actual) => actual || String(data.roles[0]?.id ?? ''));
        } catch (e) {
            setError(mensajeDeError(e));
        }
    }, []);

    useEffect(() => {
        listar();
    }, [listar]);

    const originales = useMemo(() => new Set(datos?.asignaciones?.[rolId] ?? []), [datos, rolId]);
    useEffect(() => setMarcados(new Set(originales)), [originales]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!datos) return <Cargando />;

    const hayCambios = marcados.size !== originales.size || [...marcados].some((id) => !originales.has(id));
    const alternar = (id) => setMarcados((a) => {
        const n = new Set(a);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
    });

    // asignarARol(rolId)
    const asignarARol = async () => {
        setGuardando(true);
        try {
            const { data } = await api.put(`/roles/${rolId}/menus`, { menus: [...marcados] });
            avisos.exito(data.message);
            await listar();
            if (String(usuario.rol.id) === rolId) await refrescar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setGuardando(false);
        }
    };

    const columnas = [
        { titulo: 'Orden', campo: 'orden' },
        { titulo: 'Grupo', campo: 'grupo' },
        {
            titulo: 'Opción',
            celda: (m) => (
                <span className="flex items-center gap-2">
                    <Icono nombre={m.icono} className="h-4 w-4 text-suave" />
                    <span>
                        <span className="block font-medium">{m.nombre}</span>
                        <code className="text-xs text-suave">{m.ruta}</code>
                    </span>
                </span>
            ),
        },
        { titulo: 'Permiso que la habilita', celda: (m) => (m.permiso ? <code className="text-xs">{m.permiso.codigo}</code> : <span className="text-suave">Todos</span>) },
        { titulo: 'Estado', celda: (m) => <Insignia tono={m.activo ? 'exito' : 'neutro'}>{m.activo ? 'Activa' : 'Inactiva'}</Insignia> },
        {
            titulo: 'Acciones',
            oculto: true,
            alinear: 'derecha',
            celda: (m) => (
                <button type="button" className="boton-icono rounded-tema" onClick={() => setFormulario({ abierto: true, menu: m })} aria-label={`Editar la opción ${m.nombre}`} title="Editar">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
            ),
        },
    ];

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Menú Dinámico" descripcion="Opciones del menú lateral y qué roles las ven." casoUso="CU-01">
                <button type="button" className="boton" onClick={() => setFormulario({ abierto: true, menu: null })}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Nueva opción
                </button>
            </EncabezadoPagina>

            <div className="tarjeta">
                <h2 className="mb-3 text-lg font-semibold">Opciones del menú</h2>
                <TablaDatos columnas={columnas} filas={datos.data} descripcion="Opciones del menú dinámico" />
            </div>

            <div className="tarjeta">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">Asignar opciones a un rol</h2>
                        <p className="text-sm text-suave">El rol ve una opción si la tiene asignada y además tiene su permiso en la Matriz de Accesos.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <Campo
                            como="select"
                            etiqueta="Rol"
                            nombre="rol"
                            value={rolId}
                            onChange={(e) => setRolId(e.target.value)}
                            opciones={datos.roles.map((r) => ({ valor: String(r.id), texto: r.nombre }))}
                            disabled={hayCambios}
                        />
                        <button type="button" className="boton" onClick={asignarARol} disabled={!hayCambios || guardando}>
                            <Save className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {datos.data.map((m) => (
                        <li key={m.id}>
                            <Casilla etiqueta={m.nombre} ayuda={m.grupo} nombre={`menu-${m.id}`} checked={marcados.has(m.id)} onChange={() => alternar(m.id)} />
                        </li>
                    ))}
                </ul>
            </div>

            <FormularioMenu
                abierto={formulario.abierto}
                menu={formulario.menu}
                datos={datos}
                alCerrar={() => setFormulario({ abierto: false, menu: null })}
                alGuardar={async () => {
                    setFormulario({ abierto: false, menu: null });
                    await listar();
                    await refrescar();
                }}
            />
        </section>
    );
}

const VACIO = { nombre: '', ruta: '/', icono: '', grupo: '', orden: '100', padre_id: '', permiso_web_id: '', activo: true };

// Mismas reglas que MenuRequest en Laravel.
const ESQUEMA = {
    nombre: ['nombre', [requerido, max(60)]],
    ruta: ['ruta', [requerido, max(120), formato(/^\/[a-z0-9\-/]*$/, 'La ruta debe empezar con / y tener solo minúsculas, números, guiones y barras.')]],
    grupo: ['grupo', [requerido, max(40)]],
    orden: ['orden', [requerido, entero, entre(0, 999)]],
};

/** FormularioMenu «form»: POST /menus | PUT /menus/{id} → 201 / 200 vuelve al Menú Dinámico. */
function FormularioMenu({ abierto, menu, datos, alCerrar, alGuardar }) {
    const avisos = useAvisos();
    const editando = Boolean(menu);
    const { datos: f, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, ESQUEMA);
    const grupos = [...new Set(datos.data.map((m) => m.grupo).filter(Boolean))];

    useEffect(() => {
        if (!abierto) return;
        reiniciar(menu
            ? {
                nombre: menu.nombre, ruta: menu.ruta ?? '/', icono: menu.icono ?? '', grupo: menu.grupo ?? '', orden: String(menu.orden),
                padre_id: menu.padre_id ? String(menu.padre_id) : '', permiso_web_id: menu.permiso_web_id ? String(menu.permiso_web_id) : '', activo: menu.activo,
            }
            : VACIO);
    }, [abierto, menu, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const respuesta = await enviar((d) => {
            const cuerpo = {
                ...d,
                icono: d.icono || null,
                orden: Number(d.orden),
                padre_id: d.padre_id ? Number(d.padre_id) : null,
                permiso_web_id: d.permiso_web_id ? Number(d.permiso_web_id) : null,
            };
            return editando ? api.put(`/menus/${menu.id}`, cuerpo) : api.post('/menus', cuerpo);
        });
        if (respuesta) {
            avisos.exito(respuesta.data.message);
            alGuardar();
        }
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={editando ? 'Editar opción del menú' : 'Nueva opción del menú'} ancho="max-w-2xl">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Nombre" nombre="nombre" value={f.nombre} onChange={cambiar} error={errores.nombre} requerido maxLength={60} />
                    <Campo etiqueta="Ruta del frontend" nombre="ruta" value={f.ruta} onChange={cambiar} error={errores.ruta} requerido maxLength={120} ayuda="Por ejemplo /coberturas" />
                    <Campo etiqueta="Grupo" nombre="grupo" value={f.grupo} onChange={cambiar} error={errores.grupo} requerido maxLength={40} list="grupos-menu" />
                    <datalist id="grupos-menu">{grupos.map((g) => <option key={g} value={g} />)}</datalist>
                    <Campo etiqueta="Orden" nombre="orden" type="number" min={0} max={999} value={f.orden} onChange={cambiar} error={errores.orden} requerido />
                    <Campo como="select" etiqueta="Ícono" nombre="icono" value={f.icono} onChange={cambiar} error={errores.icono} vacio="Sin ícono" opciones={ICONOS.map((i) => ({ valor: i, texto: i }))} />
                    <Campo
                        como="select"
                        etiqueta="Permiso que la habilita"
                        nombre="permiso_web_id"
                        value={f.permiso_web_id}
                        onChange={cambiar}
                        error={errores.permiso_web_id}
                        vacio="Ninguno (la ven todos los roles asignados)"
                        opciones={datos.permisos.map((p) => ({ valor: String(p.id), texto: `${p.codigo} — ${p.descripcion}` }))}
                    />
                    <Campo
                        como="select"
                        etiqueta="Opción padre"
                        nombre="padre_id"
                        value={f.padre_id}
                        onChange={cambiar}
                        error={errores.padre_id}
                        vacio="Ninguna"
                        opciones={datos.data.filter((m) => m.id !== menu?.id).map((m) => ({ valor: String(m.id), texto: m.nombre }))}
                    />
                    <div className="flex items-end pb-2">
                        <Casilla etiqueta="Opción activa" nombre="activo" checked={f.activo} onChange={cambiar} error={errores.activo} />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}
