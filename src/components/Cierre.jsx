import React, { useState } from "react";
import { Archive, Cigarette } from "lucide-react";
import CierreGeneral from "./CierreGeneral";
import CierreCigarrillos from "./CierreCigarrillos";

function Cierre() {
  const [tabActiva, setTabActiva] = useState("general");

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* --- ENCABEZADO CON PESTAÑAS --- */}
      <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Cierre de Caja</h1>
        
        <div className="flex gap-8">
          {/* Pestaña General */}
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

          {/* Pestaña Cigarrillos */}
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
        </div>
      </div>

      {/* --- CONTENIDO DE LA PESTAÑA SELECCIONADA --- */}
      <div className="flex-1 overflow-hidden relative">
        {tabActiva === "general" ? (
          <CierreGeneral />
        ) : (
          <CierreCigarrillos />
        )}
      </div>
    </div>
  );
}

export default Cierre;