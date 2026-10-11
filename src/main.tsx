import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {chiediPersistenza} from './archivio';
import './index.css';

// L'archivio vive nel browser: chiede di non essere svuotato (spec "Persistenza").
void chiediPersistenza(navigator.storage);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
