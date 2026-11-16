import { Pencil, UserPlus, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Confirmar from '../../components/ui/Confirmar';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Paginacion from '../../components/ui/Paginacion';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../context/AvisosContext';
import useListado from '../../hooks/useListado';
import api, { mensajeDeError } from '../../services/api';
import FormularioUsuario from './FormularioUsuario';

/**
 * Gestión de Usuarios «client page» (CU-01): listar(filtros) con
 * GET /usuarios, onNuevo / onEditar abren FormularioUsuario y onDesactivar
 * envía DELETE /usuarios/{id}.
 */
export default function GestionUsuarios() {
    const { usuario: yo, puede } = useAuth();
    const avisos = useAvisos();
    const { filas, meta, filtros, cargando, error, filtrar, setPagina, recargar } = useListado('/usuarios', { buscar: '', rol_id: '', estado: '' });
    const [roles, setRoles] = useState([]);
    const [formulario, setFormulario] = useState({ abierto: false, usuario: null });
    const [aDesactivar, setADesactivar] = useState(null);

    useEffect(() => {
        if (puede('roles.listar')) api.get('/roles').then(({ data }) => setRoles(data.data)).catch(() => {});
    }, [puede]);

    const desactivar = async () => {
        try {
            const { data } = await api.delete(`/usuarios/${aDesactivar.id}`);
            avisos.exito(data.message);
            recargar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setADesactivar(null);
        }
    };

    const columnas = [
        {
            titulo: 'Usuario',
            celda: (u) => (
                <>
                    <span className="block font-medium">{u.nombre_completo}</span>
                    <span className="block text-suave">{u.correo}</span>
                </>
            ),
        },
        { titulo: 'CI', campo: 'ci' },
        { titulo: 'Teléfono', celda: (u) => u.telefono ?? '—' },
        { titulo: 'Rol', celda: (u) => u.rol.nombre },
        { titulo: 'Estado', celda: (u) => <Insignia tono={u.estado === 'activo' ? 'exito' : 'neutro'}>{u.estado === 'activo' ? 'Activo' : 'Inactivo'}</Insignia> },
        {
            titulo: 'Acciones',
            oculto: true,
            alinear: 'derecha',
            celda: (u) => (
                <div className="flex justify-end gap-1">
                    <Puede permiso="usuarios.editar">
                        <button type="button" className="boton-icono rounded-tema" onClick={() => setFormulario({ abierto: true, usuario: u })} aria-label={`Editar a ${u.nombre_completo}`} title="Editar">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </Puede>
                    <Puede permiso="usuarios.desactivar">
                        {u.estado === 'activo' && u.id !== yo.id && (
                            <button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => setADesactivar(u)} aria-label={`Desactivar a ${u.nombre_completo}`} title="Desactivar">
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
            <EncabezadoPagina titulo="Gestión de Usuarios" descripcion="Cuentas de acceso al sistema y su rol." casoUso="CU-01">
                <Puede permiso="usuarios.crear">
                    <button type="button" className="boton" onClick={() => setFormulario({ abierto: true, usuario: null })}>
                        <UserPlus className="h-4 w-4" aria-hidden="true" /> Nuevo usuario
                    </button>
                </Puede>
            </EncabezadoPagina>

            <div className="tarjeta">
                <form className="mb-4 grid gap-3 sm:grid-cols-3" role="search" onSubmit={(e) => e.preventDefault()}>
                    <Campo etiqueta="Buscar" nombre="buscar" type="search" placeholder="Nombre, CI o correo" value={filtros.buscar} onChange={(e) => filtrar({ buscar: e.target.value })} />
                    <Campo
                        como="select"
                        etiqueta="Rol"
                        nombre="rol_id"
                        value={filtros.rol_id}
                        onChange={(e) => filtrar({ rol_id: e.target.value })}
                        vacio="Todos los roles"
                        opciones={roles.map((r) => ({ valor: String(r.id), texto: r.nombre }))}
                    />
                    <Campo
                        como="select"
                        etiqueta="Estado"
                        nombre="estado"
                        value={filtros.estado}
                        onChange={(e) => filtrar({ estado: e.target.value })}
                        vacio="Todos"
                        opciones={[{ valor: 'activo', texto: 'Activos' }, { valor: 'inactivo', texto: 'Inactivos' }]}
                    />
                </form>

                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={filas} cargando={cargando} descripcion="Usuarios del sistema" vacio="No hay usuarios con esos filtros." />
                <Paginacion meta={meta} alCambiar={setPagina} />
            </div>

            <FormularioUsuario
                abierto={formulario.abierto}
                usuario={formulario.usuario}
                alCerrar={() => setFormulario({ abierto: false, usuario: null })}
                alGuardar={() => {
                    setFormulario({ abierto: false, usuario: null });
                    recargar();
                }}
            />

            <Confirmar
                abierto={Boolean(aDesactivar)}
                alCerrar={() => setADesactivar(null)}
                titulo="Desactivar usuario"
                mensaje={aDesactivar && `${aDesactivar.nombre_completo} ya no podrá ingresar al sistema y se cerrarán sus sesiones abiertas. Puede reactivarlo después editándolo.`}
                textoBoton="Desactivar"
                alConfirmar={desactivar}
            />
        </section>
    );
}
