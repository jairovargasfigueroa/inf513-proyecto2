import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { sesion } from '../services/api';

/*
 * Temas y accesibilidad (consigna, punto 5; documento, Tabla 62).
 * Guarda tema, modo, tamaño de letra y contraste; los aplica como atributos
 * data-tema, data-modo y data-contraste en <html>, que cambian las variables
 * CSS de Tailwind. Con sesión se guardan en preferencia_usuario; el Visitante
 * los guarda en el navegador.
 */

export const TEMAS = [
    { valor: 'ninos', nombre: 'Niños' },
    { valor: 'jovenes', nombre: 'Jóvenes' },
    { valor: 'adultos', nombre: 'Adultos' },
];

export const MODOS = [
    { valor: 'dia', nombre: 'Día' },
    { valor: 'noche', nombre: 'Noche' },
    { valor: 'auto', nombre: 'Automático (según la hora)' },
];

export const FUENTE_MIN = 80;
export const FUENTE_MAX = 150;
export const FUENTE_PASO = 10;

const POR_DEFECTO = { tema: 'adultos', modo: 'auto', tamano_fuente: 100, alto_contraste: false };
const CLAVE = 'c11_preferencias';

/** El modo automático usa la noche de 19:00 a 07:00. */
export function esDeNoche(fecha = new Date()) {
    const hora = fecha.getHours();
    return hora >= 19 || hora < 7;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [preferencias, setPreferencias] = useState(() => ({ ...POR_DEFECTO, ...leerGuardadas() }));
    const [noche, setNoche] = useState(esDeNoche());
    const pendiente = useRef(false);

    // El modo automático se revisa cada minuto.
    useEffect(() => {
        const intervalo = setInterval(() => setNoche(esDeNoche()), 60_000);
        return () => clearInterval(intervalo);
    }, []);

    const modoEfectivo = preferencias.modo === 'auto' ? (noche ? 'noche' : 'dia') : preferencias.modo;

    useEffect(() => {
        const html = document.documentElement;
        html.dataset.tema = preferencias.tema;
        html.dataset.modo = modoEfectivo;
        html.dataset.contraste = preferencias.alto_contraste ? 'alto' : 'normal';
        html.style.setProperty('--escala', String(preferencias.tamano_fuente / 100));
    }, [preferencias, modoEfectivo]);

    // Con sesión, cada cambio se guarda en el servidor en el momento (si se
    // esperara, recargar la página justo después lo perdería).
    useEffect(() => {
        if (!pendiente.current || !sesion.token()) return;
        pendiente.current = false;
        api.put('/perfil/preferencias', preferencias).catch(() => {});
    }, [preferencias]);

    /** Cambia una o varias preferencias del usuario. */
    const cambiar = useCallback((cambios) => {
        pendiente.current = true;
        setPreferencias((actual) => {
            const nuevas = { ...actual, ...cambios };
            guardarLocal(nuevas);
            return nuevas;
        });
    }, []);

    /** Al iniciar sesión se aplican las preferencias guardadas del usuario. */
    const cargar = useCallback((delServidor) => {
        if (!delServidor) return;
        const nuevas = { ...POR_DEFECTO, ...delServidor };
        guardarLocal(nuevas);
        setPreferencias(nuevas);
    }, []);

    const valor = useMemo(() => ({
        ...preferencias,
        modoEfectivo,
        cambiar,
        cargar,
        ajustarFuente: (paso) => cambiar({
            tamano_fuente: paso === 0
                ? 100
                : Math.min(FUENTE_MAX, Math.max(FUENTE_MIN, preferencias.tamano_fuente + paso * FUENTE_PASO)),
        }),
        alternarContraste: () => cambiar({ alto_contraste: !preferencias.alto_contraste }),
    }), [preferencias, modoEfectivo, cambiar, cargar]);

    return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export function useTema() {
    return useContext(ThemeContext);
}

function leerGuardadas() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE)) ?? {};
    } catch {
        return {};
    }
}

function guardarLocal(preferencias) {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(preferencias));
    } catch {
        // Sin almacenamiento: las preferencias duran lo que la pestaña.
    }
}
