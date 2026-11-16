import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';

/**
 * Ventana modal accesible (Headless UI): atrapa el foco, se cierra con Esc y
 * devuelve el foco al botón que la abrió. Los formularios «form» de los
 * diagramas de navegación que se abren desde una pantalla usan esta ventana.
 */
export default function Modal({ abierto, alCerrar, titulo, descripcion, children, ancho = 'max-w-lg' }) {
    return (
        <Dialog open={abierto} onClose={alCerrar} className="relative z-50">
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
                    <DialogPanel className={`tarjeta w-full ${ancho} bg-superficie shadow-xl`}>
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <DialogTitle className="text-xl font-bold">{titulo}</DialogTitle>
                                {descripcion && <p className="mt-1 text-sm text-suave">{descripcion}</p>}
                            </div>
                            <button type="button" onClick={alCerrar} className="boton-icono rounded-tema" aria-label="Cerrar">
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        {children}
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}
