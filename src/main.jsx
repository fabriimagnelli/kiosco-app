import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ──── FIX: Electron pierde el foco del webContents tras alert/confirm nativos ────
{
  const _alert   = window.alert.bind(window);
  const _confirm = window.confirm.bind(window);

  window.alert = (...args) => {
    _alert(...args);
    setTimeout(() => {
      window.electronAPI?.refocusWindow();
      const active = document.querySelector('input:not([disabled]), textarea:not([disabled])');
      if (active) { active.blur(); active.focus(); }
    }, 100);
  };

  window.confirm = (...args) => {
    const result = _confirm(...args);
    setTimeout(() => {
      window.electronAPI?.refocusWindow();
      const active = document.querySelector('input:not([disabled]), textarea:not([disabled])');
      if (active) { active.blur(); active.focus(); }
    }, 100);
    return result;
  };
}
// ──────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
