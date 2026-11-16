import { Loader2 } from 'lucide-react';

export default function Cargando({ texto = 'Cargando…' }) {
    return (
        <p className="flex items-center gap-2 p-4 text-suave" role="status">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {texto}
        </p>
    );
}
