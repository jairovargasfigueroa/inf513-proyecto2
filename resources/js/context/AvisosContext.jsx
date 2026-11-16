import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/*
 * Avisos breves en la esquina de la pantalla (éxito o error de una acción).
 * Se anuncian a los lectores de pantalla con una región aria-live.
 */

const AvisosContext = createContext(null);
let siguienteId = 1;

export function AvisosProvider({ children }) {
    const [avisos, setAvisos] = useState([]);

    const quitar = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

    const mostrar = useCallback((texto, tipo = 'exito') => {
        const id = siguienteId++;
        setAvisos((lista) => [...lista, { id, texto, tipo }]);
        setTimeout(() => quitar(id), tipo === 'exito' ? 5000 : 9000);
    }, [quitar]);

    const valor = useMemo(() => ({
        exito: (texto) => mostrar(texto, 'exito'),
        error: (texto) => mostrar(texto, 'error'),
        advertencia: (texto) => mostrar(texto, 'advertencia'),
        /** Muestra el mensaje de la API y sus avisos (p. ej. coberturas que hay que reasignar). */
        respuesta: (data) => {
            mostrar(data.message, 'exito');
            (data.avisos ?? []).forEach((a) => mostrar(a, 'advertencia'));
        },
    }), [mostrar]);

    return (
        <AvisosContext.Provider value={valor}>
            {children}
            <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite" role="status">
                {avisos.map((a) => (
                    <div
                        key={a.id}
                        className={`flex items-start gap-2 rounded-tema border bg-superficie p-3 shadow-lg ${
                            { error: 'border-peligro text-peligro', advertencia: 'border-acento text-acento' }[a.tipo] ?? 'border-exito text-exito'
                        }`}
                    >
                        {a.tipo !== 'exito'
                            ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                            : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
                        <p className="flex-1 text-sm font-medium text-texto">{a.texto}</p>
                        <button type="button" onClick={() => quitar(a.id)} className="text-suave" aria-label="Cerrar aviso">
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
        </AvisosContext.Provider>
    );
}

export function useAvisos() {
    return useContext(AvisosContext);
}
