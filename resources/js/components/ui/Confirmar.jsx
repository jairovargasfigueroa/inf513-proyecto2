import { useState } from 'react';
import Modal from './Modal';

/**
 * Pide confirmación antes de una acción que no se puede deshacer con un clic
 * (desactivar, dar de baja, cancelar). `alConfirmar` puede ser asíncrona.
 */
export default function Confirmar({ abierto, alCerrar, titulo, mensaje, textoBoton = 'Confirmar', alConfirmar, peligroso = true }) {
    const [enviando, setEnviando] = useState(false);

    const confirmar = async () => {
        setEnviando(true);
        try {
            await alConfirmar();
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={titulo}>
            <p>{mensaje}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button type="button" className="boton-secundario" onClick={alCerrar}>Volver</button>
                <button
                    type="button"
                    className={peligroso ? 'boton-peligro' : 'boton'}
                    onClick={confirmar}
                    disabled={enviando}
                >
                    {enviando ? 'Procesando…' : textoBoton}
                </button>
            </div>
        </Modal>
    );
}
