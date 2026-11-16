import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import api from './services/api';

// Pantalla provisional de la Fase 0: comprueba que React llega a la API.
// En la Fase 1 se reemplaza por el Layout, el login y el menú dinámico.
function Inicio() {
    const [estado, setEstado] = useState('consultando…');

    useEffect(() => {
        api.get('/estado')
            .then(({ data }) => setEstado(`API: ${data.estado}`))
            .catch(() => setEstado('API: sin conexión'));
    }, []);

    return (
        <main className="mx-auto max-w-2xl p-8">
            <h1 className="text-2xl font-bold text-primario">Canal 11 - Sistema Web</h1>
            <p className="mt-2 text-suave">{estado}</p>
        </main>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="*" element={<Inicio />} />
        </Routes>
    );
}
