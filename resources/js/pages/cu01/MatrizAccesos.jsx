import { Save, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../context/AvisosContext';
import api, { mensajeDeError } from '../../services/api';

const NOMBRES_CU = {
    'CU-01': 'Gestión de Usuarios',
    'CU-02': 'Personal de Prensa y Turnos',
    'CU-03': 'Inventario y Unidades Móviles',
    'CU-04': 'Planificación de Coberturas',
    'CU-05': 'Notas y Material Audiovisual',
    'CU-06': 'Escaleta del Noticiero',
    'CU-07': 'Analítica Periodística',
    'CU-08': 'Reportes y Estadísticas',
};

/**
 * Matriz de Accesos «client page» (CU-01): cargar() con GET /permisos/matriz,
 * marcar(rol, permiso) y guardar(rolId) con PUT /roles/{id}/permisos. Quien
 * solo tiene seguridad.matriz.ver la consulta sin poder cambiarla.
 */
export default function MatrizAccesos() {
    const { puede, usuario, refrescar } = useAuth();
    const avisos = useAvisos();
    const editable = puede('seguridad.matriz.editar');
    const [matriz, setMatriz] = useState(null);
    const [error, setError] = useState(null);
    const [rolId, setRolId] = useState('');
    const [marcados, setMarcados] = useState(new Set());
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const { data } = await api.get('/permisos/matriz');
            setMatriz(data);
            setRolId((actual) => actual || String(data.roles[0]?.id ?? ''));
        } catch (e) {
            setError(mensajeDeError(e));
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const originales = useMemo(() => new Set(matriz?.asignaciones?.[rolId] ?? []), [matriz, rolId]);
    useEffect(() => setMarcados(new Set(originales)), [originales]);

    const cambios = useMemo(() => {
        let n = 0;
        marcados.forEach((id) => !originales.has(id) && n++);
        originales.forEach((id) => !marcados.has(id) && n++);
        return n;
    }, [marcados, originales]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!matriz) return <Cargando />;

    const rol = matriz.roles.find((r) => String(r.id) === rolId);

    // marcar(rol, permiso)
    const marcar = (id) => setMarcados((actual) => {
        const nuevo = new Set(actual);
        if (nuevo.has(id)) nuevo.delete(id);
        else nuevo.add(id);
        return nuevo;
    });

    const marcarCasoUso = (permisos, todos) => setMarcados((actual) => {
        const nuevo = new Set(actual);
        permisos.forEach((p) => (todos ? nuevo.add(p.id) : nuevo.delete(p.id)));
        return nuevo;
    });

    // guardar(rolId)
    const guardar = async () => {
        setGuardando(true);
        try {
            const { data } = await api.put(`/roles/${rolId}/permisos`, { permisos: [...marcados] });
            avisos.exito(data.message);
            await cargar();
            if (String(usuario.rol.id) === rolId) await refrescar(); // cambió el propio menú
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <section>
            <EncabezadoPagina
                titulo="Matriz de Accesos"
                descripcion={editable ? 'Elija un rol, marque sus permisos y guarde.' : 'Permisos de cada rol (solo consulta).'}
                casoUso="CU-01"
            >
                {editable && (
                    <>
                        <button type="button" className="boton-secundario" onClick={() => setMarcados(new Set(originales))} disabled={cambios === 0}>
                            <Undo2 className="h-4 w-4" aria-hidden="true" /> Descartar
                        </button>
                        <button type="button" className="boton" onClick={guardar} disabled={cambios === 0 || guardando}>
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {guardando ? 'Guardando…' : `Guardar${cambios ? ` (${cambios})` : ''}`}
                        </button>
                    </>
                )}
            </EncabezadoPagina>

            <div className="tarjeta mb-4 flex flex-wrap items-end gap-4">
                <Campo
                    como="select"
                    etiqueta="Rol"
                    nombre="rol"
                    value={rolId}
                    onChange={(e) => setRolId(e.target.value)}
                    opciones={matriz.roles.map((r) => ({ valor: String(r.id), texto: r.nombre }))}
                    className="min-w-[16rem]"
                    disabled={cambios > 0}
                    ayuda={cambios > 0 ? 'Guarde o descarte los cambios para elegir otro rol.' : undefined}
                />
                <p className="pb-2 text-suave">
                    {rol?.nombre} tiene <strong className="text-texto">{marcados.size}</strong> de{' '}
                    {matriz.casos_uso.reduce((n, cu) => n + cu.permisos.length, 0)} permisos.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {matriz.casos_uso.map((cu) => {
                    const todos = cu.permisos.every((p) => marcados.has(p.id));
                    return (
                        <fieldset key={cu.caso_uso} className="tarjeta">
                            <legend className="sr-only">{cu.caso_uso} {NOMBRES_CU[cu.caso_uso]}</legend>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h2 className="font-semibold">
                                    <span className="text-acento">{cu.caso_uso}</span> {NOMBRES_CU[cu.caso_uso]}
                                </h2>
                                {editable && (
                                    <button type="button" className="text-sm text-primario underline" onClick={() => marcarCasoUso(cu.permisos, !todos)}>
                                        {todos ? 'Quitar todos' : 'Marcar todos'}
                                    </button>
                                )}
                            </div>
                            <ul className="space-y-1">
                                {cu.permisos.map((p) => (
                                    <li key={p.id}>
                                        <label className={`flex items-start gap-2 rounded-tema px-2 py-1 ${editable ? 'cursor-pointer hover:bg-fondo' : ''}`}>
                                            <input
                                                type="checkbox"
                                                className="mt-1 h-4 w-4 accent-[rgb(var(--c-primario))]"
                                                checked={marcados.has(p.id)}
                                                onChange={() => marcar(p.id)}
                                                disabled={!editable}
                                            />
                                            <span>
                                                <span className="block text-sm">{p.descripcion}</span>
                                                <code className="text-xs text-suave">{p.codigo}</code>
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </fieldset>
                    );
                })}
            </div>
        </section>
    );
}
