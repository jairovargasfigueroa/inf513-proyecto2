import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Campo from '../components/ui/Campo';
import ResumenErrores from '../components/ui/ResumenErrores';
import { useAuth } from '../context/AuthContext';
import { erroresDeValidacion, mensajeDeError } from '../services/api';
import { correo, max, requerido, validar } from '../validation/reglas';

// Mismas reglas que LoginRequest en Laravel.
const ESQUEMA = {
    correo: ['correo', [requerido, correo, max(150)]],
    password: ['contraseña', [requerido, max(100)]],
};

/**
 * FormularioLogin «form»: POST /api/v1/auth/login. 200 + token → Panel
 * principal; 422 credenciales inválidas o 429 bloqueo → vuelve al formulario.
 */
export default function Login() {
    const { iniciarSesion, autenticado, aviso, limpiarAviso } = useAuth();
    const navegar = useNavigate();
    const { state } = useLocation();
    const [datos, setDatos] = useState({ correo: '', password: '' });
    const [errores, setErrores] = useState({});
    const [mensaje, setMensaje] = useState(null);
    const [enviando, setEnviando] = useState(false);

    if (autenticado && !enviando) return <Navigate to="/inicio" replace />;

    const cambiar = (e) => setDatos((d) => ({ ...d, [e.target.name]: e.target.value }));

    const enviar = async (e) => {
        e.preventDefault();
        limpiarAviso();
        setMensaje(null);

        const encontrados = validar(datos, ESQUEMA); // validar()
        setErrores(encontrados);
        if (Object.keys(encontrados).length > 0) return;

        setEnviando(true);
        try {
            await iniciarSesion(datos.correo.trim(), datos.password);
            navegar(state?.desde ?? '/inicio', { replace: true });
        } catch (error) {
            setErrores(erroresDeValidacion(error));
            setMensaje(error.response?.status === 422 ? null : mensajeDeError(error));
            setDatos((d) => ({ ...d, password: '' }));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <section className="mx-auto max-w-md tarjeta" aria-labelledby="titulo-login">
            <h1 id="titulo-login" className="titulo-pagina">Iniciar sesión</h1>
            <p className="mt-1 text-suave">Ingrese con su correo institucional y su contraseña.</p>

            <form onSubmit={enviar} noValidate className="mt-5 space-y-4">
                {aviso && <p className="rounded-tema border border-acento p-3 text-sm" role="status">{aviso}</p>}
                <ResumenErrores errores={errores} mensaje={mensaje} />

                <Campo
                    etiqueta="Correo"
                    nombre="correo"
                    type="email"
                    autoComplete="username"
                    value={datos.correo}
                    onChange={cambiar}
                    error={errores.correo}
                    required
                />
                <Campo
                    etiqueta="Contraseña"
                    nombre="password"
                    type="password"
                    autoComplete="current-password"
                    value={datos.password}
                    onChange={cambiar}
                    error={errores.password}
                    required
                />

                <button type="submit" className="boton w-full justify-center" disabled={enviando}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    {enviando ? 'Ingresando…' : 'Ingresar'}
                </button>
            </form>
        </section>
    );
}
