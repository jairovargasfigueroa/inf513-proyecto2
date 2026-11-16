import { useCallback, useState } from 'react';
import { erroresDeValidacion, mensajeDeError } from '../services/api';
import { validar } from '../validation/reglas';

/**
 * Estado de un formulario «form» del diagrama de navegación: sus datos,
 * validar() en el cliente con el esquema dado y enviar() a la API. Los
 * errores 422 del servidor se muestran en cada campo; los demás (403, 409…)
 * como mensaje general.
 */
export default function useFormulario(inicial, esquema) {
    const [datos, setDatos] = useState(inicial);
    const [errores, setErrores] = useState({});
    const [mensaje, setMensaje] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const cambiar = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setDatos((d) => ({ ...d, [name]: type === 'checkbox' ? checked : value }));
    }, []);

    const asignar = useCallback((campo, valor) => setDatos((d) => ({ ...d, [campo]: valor })), []);

    const reiniciar = useCallback((nuevos) => {
        setDatos(nuevos);
        setErrores({});
        setMensaje(null);
    }, []);

    /** Valida con el esquema (puede ser una función de los datos) y llama a `peticion`. */
    const enviar = useCallback(async (peticion) => {
        setMensaje(null);
        const reglas = typeof esquema === 'function' ? esquema(datos) : esquema;
        const encontrados = validar(datos, reglas ?? {});
        setErrores(encontrados);
        if (Object.keys(encontrados).length > 0) return null;

        setEnviando(true);
        try {
            return await peticion(datos);
        } catch (error) {
            setErrores(erroresDeValidacion(error));
            if (error.response?.status !== 422) setMensaje(mensajeDeError(error));
            return null;
        } finally {
            setEnviando(false);
        }
    }, [datos, esquema]);

    return { datos, errores, mensaje, enviando, cambiar, asignar, reiniciar, enviar };
}
