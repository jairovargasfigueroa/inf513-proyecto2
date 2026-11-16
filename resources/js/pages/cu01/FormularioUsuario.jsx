import { useEffect, useState } from 'react';
import Campo from '../../components/ui/Campo';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api from '../../services/api';
import { correo, formato, max, min, requerido } from '../../validation/reglas';

const VACIO = { nombre: '', apellido: '', ci: '', correo: '', telefono: '', password: '', rol_id: '', estado: 'activo' };
const TELEFONO = /^[0-9+\- ]{6,20}$/;
const CI = /^[0-9A-Za-z-]+$/;

// Mismas reglas que UsuarioRequest en Laravel.
const esquema = (editando) => ({
    nombre: ['nombre', [requerido, max(100)]],
    apellido: ['apellido', [requerido, max(100)]],
    ci: ['carnet de identidad', [requerido, max(20), formato(CI, 'El carnet de identidad solo puede tener números, letras y guiones.')]],
    correo: ['correo', [requerido, correo, max(150)]],
    telefono: ['teléfono', [formato(TELEFONO, 'El teléfono solo puede tener números, espacios, + y guiones (entre 6 y 20).')]],
    password: ['contraseña', editando ? [min(6), max(72)] : [requerido, min(6), max(72)]],
    rol_id: ['rol', [requerido]],
});

/**
 * FormularioUsuario «form» (CU-01): pide los roles con GET /roles y envía
 * POST /usuarios (nuevo) o PUT /usuarios/{id} (editar). 201 / 200 → vuelve a
 * Gestión de Usuarios.
 */
export default function FormularioUsuario({ abierto, usuario, alCerrar, alGuardar }) {
    const avisos = useAvisos();
    const editando = Boolean(usuario);
    const [roles, setRoles] = useState([]);
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, () => esquema(editando));

    useEffect(() => {
        if (!abierto) return;
        reiniciar(usuario
            ? { ...VACIO, ...usuario, telefono: usuario.telefono ?? '', rol_id: String(usuario.rol.id), password: '' }
            : VACIO);
        api.get('/roles').then(({ data }) => setRoles(data.data)).catch(() => setRoles([]));
    }, [abierto, usuario, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const respuesta = await enviar((d) => {
            const cuerpo = { ...d, rol_id: Number(d.rol_id), telefono: d.telefono || null };
            if (!editando) delete cuerpo.estado;
            if (editando && !cuerpo.password) delete cuerpo.password;
            return editando ? api.put(`/usuarios/${usuario.id}`, cuerpo) : api.post('/usuarios', cuerpo);
        });
        if (respuesta) {
            avisos.exito(respuesta.data.message);
            alGuardar();
        }
    };

    return (
        <Modal
            abierto={abierto}
            alCerrar={alCerrar}
            titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}
            descripcion="Los campos con * son obligatorios."
            ancho="max-w-2xl"
        >
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar} error={errores.nombre} requerido maxLength={100} autoComplete="given-name" />
                    <Campo etiqueta="Apellido" nombre="apellido" value={datos.apellido} onChange={cambiar} error={errores.apellido} requerido maxLength={100} autoComplete="family-name" />
                    <Campo etiqueta="Carnet de identidad" nombre="ci" value={datos.ci} onChange={cambiar} error={errores.ci} requerido maxLength={20} />
                    <Campo etiqueta="Teléfono" nombre="telefono" type="tel" value={datos.telefono} onChange={cambiar} error={errores.telefono} maxLength={20} autoComplete="tel" />
                    <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo} onChange={cambiar} error={errores.correo} requerido maxLength={150} autoComplete="email" className="sm:col-span-2" />
                    <Campo
                        como="select"
                        etiqueta="Rol"
                        nombre="rol_id"
                        value={datos.rol_id}
                        onChange={cambiar}
                        error={errores.rol_id}
                        requerido
                        vacio="Elija un rol"
                        opciones={roles.map((r) => ({ valor: String(r.id), texto: r.nombre }))}
                    />
                    <Campo
                        etiqueta={editando ? 'Contraseña nueva' : 'Contraseña'}
                        nombre="password"
                        type="password"
                        value={datos.password}
                        onChange={cambiar}
                        error={errores.password}
                        requerido={!editando}
                        ayuda={editando ? 'Déjela vacía para no cambiarla.' : 'Al menos 6 caracteres.'}
                        autoComplete="new-password"
                    />
                    {editando && (
                        <Campo
                            como="select"
                            etiqueta="Estado"
                            nombre="estado"
                            value={datos.estado}
                            onChange={cambiar}
                            error={errores.estado}
                            opciones={[{ valor: 'activo', texto: 'Activo' }, { valor: 'inactivo', texto: 'Inactivo' }]}
                        />
                    )}
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}
