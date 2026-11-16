import { Palette, Pencil } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Campo, { Casilla } from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../context/AvisosContext';
import { FUENTE_MAX, FUENTE_MIN, FUENTE_PASO, MODOS, TEMAS, useTema } from '../../context/ThemeContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { formato, igualA, max, min, requerido, requeridoSi } from '../../validation/reglas';

const TELEFONO = /^[0-9+\- ]{6,20}$/;

/**
 * Mi Perfil «client page» (CU-01): cargar() con GET /perfil; «Editar mis
 * datos» abre FormularioPerfil y «Apariencia» abre FormularioPreferencias.
 */
export default function MiPerfil() {
    const [perfil, setPerfil] = useState(null);
    const [error, setError] = useState(null);
    const [abierto, setAbierto] = useState(null); // 'datos' | 'apariencia'

    const cargar = useCallback(() => {
        api.get('/perfil')
            .then(({ data }) => setPerfil(data.data))
            .catch((e) => setError(mensajeDeError(e)));
    }, []);

    useEffect(cargar, [cargar]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!perfil) return <Cargando />;

    const filas = [
        ['Nombre', perfil.nombre_completo],
        ['Correo', perfil.correo],
        ['Carnet de identidad', perfil.ci],
        ['Teléfono', perfil.telefono ?? '—'],
        ['Rol', perfil.rol.nombre],
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Mi Perfil" descripcion="Sus datos de acceso y la apariencia del sistema." casoUso="CU-01">
                <button type="button" className="boton-secundario" onClick={() => setAbierto('apariencia')}>
                    <Palette className="h-4 w-4" aria-hidden="true" /> Apariencia
                </button>
                <button type="button" className="boton" onClick={() => setAbierto('datos')}>
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Editar mis datos
                </button>
            </EncabezadoPagina>

            <dl className="tarjeta grid gap-x-6 gap-y-3 sm:grid-cols-[12rem_1fr]">
                {filas.map(([etiqueta, valor]) => (
                    <div key={etiqueta} className="contents">
                        <dt className="font-medium text-suave">{etiqueta}</dt>
                        <dd>{valor}</dd>
                    </div>
                ))}
            </dl>

            <FormularioPerfil
                abierto={abierto === 'datos'}
                perfil={perfil}
                alCerrar={() => setAbierto(null)}
                alGuardar={(nuevo) => {
                    setPerfil(nuevo);
                    setAbierto(null);
                }}
            />
            <FormularioPreferencias abierto={abierto === 'apariencia'} alCerrar={() => setAbierto(null)} />
        </section>
    );
}

/** FormularioPerfil «form»: PUT /perfil → 200 vuelve a Mi Perfil. */
function FormularioPerfil({ abierto, perfil, alCerrar, alGuardar }) {
    const avisos = useAvisos();
    const { refrescar } = useAuth();
    const vacio = { nombre: '', apellido: '', telefono: '', password: '', password_actual: '', password_confirmacion: '' };

    // Mismas reglas que PerfilRequest en Laravel.
    const esquema = (d) => ({
        nombre: ['nombre', [requerido, max(100)]],
        apellido: ['apellido', [requerido, max(100)]],
        telefono: ['teléfono', [formato(TELEFONO, 'El teléfono solo puede tener números, espacios, + y guiones (entre 6 y 20).')]],
        password: ['contraseña nueva', [min(6), max(72)]],
        password_actual: ['contraseña actual', [requeridoSi(Boolean(d.password), 'Escriba su contraseña actual para cambiarla.')]],
        password_confirmacion: ['confirmación', [
            requeridoSi(Boolean(d.password), 'Repita la contraseña nueva.'),
            igualA(d.password, 'La confirmación no coincide con la contraseña nueva.'),
        ]],
    });

    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(vacio, esquema);

    useEffect(() => {
        if (abierto) reiniciar({ ...vacio, nombre: perfil.nombre, apellido: perfil.apellido, telefono: perfil.telefono ?? '' });
    }, [abierto, perfil, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const respuesta = await enviar((d) => {
            const cuerpo = { nombre: d.nombre, apellido: d.apellido, telefono: d.telefono || null };
            if (d.password) Object.assign(cuerpo, { password: d.password, password_actual: d.password_actual, password_confirmacion: d.password_confirmacion });
            return api.put('/perfil', cuerpo);
        });
        if (respuesta) {
            avisos.exito(respuesta.data.message);
            await refrescar(); // el nombre del encabezado cambia
            alGuardar(respuesta.data.data);
        }
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Editar mis datos" descripcion="Para cambiar la contraseña escriba la actual y repita la nueva.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar} error={errores.nombre} requerido maxLength={100} />
                    <Campo etiqueta="Apellido" nombre="apellido" value={datos.apellido} onChange={cambiar} error={errores.apellido} requerido maxLength={100} />
                    <Campo etiqueta="Teléfono" nombre="telefono" type="tel" value={datos.telefono} onChange={cambiar} error={errores.telefono} maxLength={20} className="sm:col-span-2" />
                </div>
                <fieldset className="mt-5 grid gap-4 border-t border-borde pt-4 sm:grid-cols-2">
                    <legend className="px-1 text-sm font-semibold">Cambiar contraseña (opcional)</legend>
                    <Campo etiqueta="Contraseña actual" nombre="password_actual" type="password" value={datos.password_actual} onChange={cambiar} error={errores.password_actual} autoComplete="current-password" className="sm:col-span-2" />
                    <Campo etiqueta="Contraseña nueva" nombre="password" type="password" value={datos.password} onChange={cambiar} error={errores.password} ayuda="Al menos 6 caracteres." autoComplete="new-password" />
                    <Campo etiqueta="Repita la contraseña nueva" nombre="password_confirmacion" type="password" value={datos.password_confirmacion} onChange={cambiar} error={errores.password_confirmacion} autoComplete="new-password" />
                </fieldset>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}

/**
 * FormularioPreferencias «form»: PUT /perfil/preferencias → 200. Los cambios se
 * ven en vivo mientras se eligen; «Cancelar» vuelve a los anteriores.
 */
function FormularioPreferencias({ abierto, alCerrar }) {
    const avisos = useAvisos();
    const tema = useTema();
    const [antes, setAntes] = useState(null);

    useEffect(() => {
        if (abierto) setAntes({ tema: tema.tema, modo: tema.modo, tamano_fuente: tema.tamano_fuente, alto_contraste: tema.alto_contraste });
    }, [abierto]);

    const cancelar = () => {
        if (antes) tema.cambiar(antes);
        alCerrar();
    };

    const guardar = (e) => {
        e.preventDefault();
        avisos.exito('Preferencias guardadas.'); // ThemeContext ya las envió con PUT /perfil/preferencias
        alCerrar();
    };

    return (
        <Modal abierto={abierto} alCerrar={cancelar} titulo="Apariencia y accesibilidad" descripcion="Los cambios se ven mientras los elige.">
            <form onSubmit={guardar} className="space-y-4">
                <Campo como="select" etiqueta="Tema" nombre="tema" value={tema.tema} onChange={(e) => tema.cambiar({ tema: e.target.value })} opciones={TEMAS.map((t) => ({ valor: t.valor, texto: t.nombre }))} />
                <Campo como="select" etiqueta="Modo día o noche" nombre="modo" value={tema.modo} onChange={(e) => tema.cambiar({ modo: e.target.value })} opciones={MODOS.map((m) => ({ valor: m.valor, texto: m.nombre }))} />
                <Campo
                    etiqueta={`Tamaño de letra: ${tema.tamano_fuente} %`}
                    nombre="tamano_fuente"
                    type="range"
                    min={FUENTE_MIN}
                    max={FUENTE_MAX}
                    step={FUENTE_PASO}
                    value={tema.tamano_fuente}
                    onChange={(e) => tema.cambiar({ tamano_fuente: Number(e.target.value) })}
                    className="[&_input]:px-0"
                />
                <Casilla etiqueta="Alto contraste" ayuda="Texto negro sobre blanco (o blanco sobre negro de noche)." nombre="alto_contraste" checked={tema.alto_contraste} onChange={(e) => tema.cambiar({ alto_contraste: e.target.checked })} />
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="boton-secundario" onClick={cancelar}>Cancelar</button>
                    <button type="submit" className="boton">Listo</button>
                </div>
            </form>
        </Modal>
    );
}
