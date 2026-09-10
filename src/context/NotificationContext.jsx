import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

const NotificationContext = createContext(null);

export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotify debe usarse dentro de <NotificationProvider>");
  return ctx;
};

let idCounter = 0;

const ICONOS = { ok: CheckCircle, err: XCircle, warn: AlertTriangle, info: Info };
const COLORES = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  err: "border-rose-200 bg-rose-50 text-rose-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolveRef = useRef(null);

  const toast = useCallback((texto, tipo = "ok") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, texto, tipo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const confirmDialog = useCallback((mensaje, opciones = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ mensaje, titulo: opciones.titulo || "Confirmar acción" });
    });
  }, []);

  const cerrarConfirm = (resultado) => {
    setConfirmState(null);
    if (resolveRef.current) {
      resolveRef.current(resultado);
      resolveRef.current = null;
    }
  };

  return (
    <NotificationContext.Provider value={{ toast, confirmDialog }}>
      {children}

      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONOS[t.tipo] || Info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur ${COLORES[t.tipo] || COLORES.info}`}
            >
              <Icon size={16} />
              {t.texto}
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => cerrarConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold text-slate-800">{confirmState.titulo}</h3>
            <p className="mb-5 whitespace-pre-line text-sm text-slate-600">{confirmState.mensaje}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => cerrarConfirm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => cerrarConfirm(true)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
