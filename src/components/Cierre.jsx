import React, { useState, useEffect } from "react";
import { Archive, Cigarette, History, Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import CierreGeneral from "./CierreGeneral";
import CierreCigarrillos from "./CierreCigarrillos";
import { apiFetch } from "../lib/api";

function Cierre() {
  const [tabActiva, setTabActiva] = useState("general");
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (tabActiva === "historial") {
      apiFetch("/api/historial_cierres")
        .then(r => r.json())
        .then(data => setHistorial(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }
  }, [tabActiva]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* --- ENCABEZADO CON PESTAÑAS --- */}
      <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Cierre de Caja</h1>
        
        <div className="flex gap-8">
          <button
            onClick={() => setTabActiva("general")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              tabActiva === "general"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            <Archive size={18} />
            CAJA GENERAL
          </button>

          <button
            onClick={() => setTabActiva("cigarrillos")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              tabActiva === "cigarrillos"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            <Cigarette size={18} />
            CIGARRILLOS
          </button>

          <button
            onClick={() => setTabActiva("historial")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              tabActiva === "historial"
                ? "border-green-600 text-green-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            <History size={18} />
            HISTORIAL
          </button>
        </div>
      </div>

      {/* --- CONTENIDO DE LA PESTAÑA SELECCIONADA --- */}
      <div className="flex-1 overflow-hidden relative">
        {tabActiva === "general" ? (
          <CierreGeneral />
        ) : tabActiva === "cigarrillos" ? (
          <CierreCigarrillos />
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                <History size={24} className="text-green-600"/> Historial de Cierres
              </h2>
              {historial.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                  No hay cierres registrados aún.
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((c) => (
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${c.tipo === 'cigarrillos' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {c.tipo === 'cigarrillos' ? <Cigarette size={20}/> : <Archive size={20}/>}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{c.tipo === 'cigarrillos' ? 'Cierre Cigarrillos' : 'Cierre General'}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <Calendar size={14}/> {new Date(c.fecha).toLocaleString('es-AR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-slate-400 text-xs font-bold">Ventas</p>
                            <p className="font-bold text-green-600 flex items-center gap-1"><TrendingUp size={14}/> ${(c.total_ventas || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-400 text-xs font-bold">Gastos</p>
                            <p className="font-bold text-red-600 flex items-center gap-1"><TrendingDown size={14}/> ${(c.total_gastos || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-400 text-xs font-bold">Efectivo Real</p>
                            <p className="font-bold text-slate-800 flex items-center gap-1"><DollarSign size={14}/> ${(c.total_efectivo_real || 0).toLocaleString()}</p>
                          </div>
                          {c.monto_retiro > 0 && (
                            <div className="text-center">
                              <p className="text-slate-400 text-xs font-bold">Retiro</p>
                              <p className="font-bold text-purple-600">${(c.monto_retiro || 0).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {c.observacion && (
                        <p className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {c.observacion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cierre;