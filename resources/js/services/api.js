import axios from 'axios';

// Subcarpeta donde está publicado el sistema ('' en local,
// '/inf513/grupo14sa/proyecto2' en tecnoweb). La pone Laravel en app.blade.php.
export const basePath = document.querySelector('meta[name="base-path"]')?.content ?? '';

const CLAVE_TOKEN = 'c11_token';

export const sesion = {
    token: () => leer(CLAVE_TOKEN),
    guardar: (token) => escribir(CLAVE_TOKEN, token),
    borrar: () => escribir(CLAVE_TOKEN, null),
};

// Cliente HTTP de la capa de presentación: es la única vía hacia la API.
const api = axios.create({
    baseURL: `${basePath}/api/v1`,
    headers: { Accept: 'application/json' },
});

// Cada petición lleva el token de la sesión (Laravel Sanctum).
api.interceptors.request.use((config) => {
    const token = sesion.token();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// 401 con sesión abierta: el token venció o la cuenta se desactivó.
api.interceptors.response.use(
    (respuesta) => respuesta,
    (error) => {
        if (error.response?.status === 401 && sesion.token() && !error.config?.url?.endsWith('/auth/login')) {
            sesion.borrar();
            window.dispatchEvent(new CustomEvent('sesion-expirada', { detail: mensajeDeError(error) }));
        }
        return Promise.reject(error);
    },
);

/** Mensaje en español para mostrar al usuario a partir de un error de Axios. */
export function mensajeDeError(error) {
    if (!error.response) return 'No se pudo conectar con el servidor. Revise su conexión.';
    return error.response.data?.message ?? 'Ocurrió un error inesperado.';
}

/** Errores de validación (422) por campo: { correo: 'El campo correo es obligatorio.' }. */
export function erroresDeValidacion(error) {
    const errores = error.response?.status === 422 ? error.response.data?.errors ?? {} : {};
    return Object.fromEntries(Object.entries(errores).map(([campo, mensajes]) => [campo, mensajes[0]]));
}

function leer(clave) {
    try {
        return localStorage.getItem(clave);
    } catch {
        return null;
    }
}

function escribir(clave, valor) {
    try {
        if (valor === null) localStorage.removeItem(clave);
        else localStorage.setItem(clave, valor);
    } catch {
        // Sin almacenamiento (modo privado): la sesión dura lo que la pestaña.
    }
}

export default api;
