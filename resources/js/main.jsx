import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AvisosProvider } from './context/AvisosContext';
import { ThemeProvider } from './context/ThemeContext';
import { basePath } from './services/api';

createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <BrowserRouter basename={basePath || '/'}>
            <ThemeProvider>
                <AvisosProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </AvisosProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>,
);
