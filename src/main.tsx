// src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';

const root = createRoot(document.getElementById('root')!);
root.render(
    <HelmetProvider>
        <App />
    </HelmetProvider>
);
