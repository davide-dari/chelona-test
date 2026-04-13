import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🆘 Emergency Landing: If React fails to render, show error in DOM
window.onerror = (msg, url, line, col, error) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="padding:24px; color:red; font-family:sans-serif;">
      <h3>Errore Fatale al Lancio</h3>
      <pre style="white-space:pre-wrap; font-size:12px;">${msg}\n${error?.stack || ''}</pre>
      <button onclick="location.reload()" style="margin-top:16px; padding:8px 16px;">Ricarica</button>
    </div>`;
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
