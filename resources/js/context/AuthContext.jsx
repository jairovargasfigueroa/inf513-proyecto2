import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { sesion } from '../services/api';
import { useTema } from './ThemeContext';

/*
 * Sesión del usuario (AuthController del diagrama de navegación general):
 * token, datos del usuario, permisos del rol y menú dinámico.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const { cargar: cargarPreferencias } = useTema();
    const [usuario, setUsuario] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [menu, setMenu] = useState([]);
    const [cargando, setCargando] = useState(Boolean(sesion.token()));
    const [aviso, setAviso] = useState(null);

    const limpiar = useCallback(() => {
        sesion.borrar();
        setUsuario(null);
        setPermisos([]);
        setMenu([]);
    }, []);

    const abrir = useCallback(async (datos) => {
        setUsuario(datos.usuario);
        setPermisos(datos.permisos);
        cargarPreferencias(datos.preferencias);
        const { data } = await api.get('/auth/menu');
        setMenu(data.data);
    }, [cargarPreferencias]);

    // Al recargar la página se recupera la sesión con el token guardado.
    useEffect(() => {
        if (!sesion.token()) return;
        api.get('/auth/me')
            .then(({ data }) => abrir(data))
            .catch(limpiar)
            .finally(() => setCargando(false));
    }, [abrir, limpiar]);

    // El interceptor de Axios avisa cuando el servidor responde 401.
    useEffect(() => {
        const alExpirar = (e) => {
            limpiar();
            setAviso(e.detail ?? 'Su sesión terminó. Inicie sesión de nuevo.');
        };
        window.addEventListener('sesion-expirada', alExpirar);
        return () => window.removeEventListener('sesion-expirada', alExpirar);
    }, [limpiar]);

    const iniciarSesion = useCallback(async (correo, password) => {
        const { data } = await api.post('/auth/login', { correo, password });
        sesion.guardar(data.token);
        setAviso(null);
        await abrir(data);
        return data.usuario;
    }, [abrir]);

    const cerrarSesion = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            limpiar();
        }
    }, [limpiar]);

    const valor = useMemo(() => ({
        usuario,
        permisos,
        menu,
        cargando,
        aviso,
        limpiarAviso: () => setAviso(null),
        autenticado: Boolean(usuario),
        puede: (permiso) => permisos.includes(permiso),
        iniciarSesion,
        cerrarSesion,
    }), [usuario, permisos, menu, cargando, aviso, iniciarSesion, cerrarSesion]);

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
