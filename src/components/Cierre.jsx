import React, { useState, useEffect } from "react";
import { Store, Cigarette } from "lucide-react";
import CierreGeneral from "./CierreGeneral";
import CierreCigarrillos from "./CierreCigarrillos";

function Cierre() {
  const [activeTab, setActiveTab] = useState("general");
  const [datos, setDatos] = useState({
    general: { saldo_inicial: 0, ventas: 0, cobros: 0, gastos: 0, pagos: 0, esperado: 0 },
    cigarrillos: { ventas: 0, esperado: 0 },
    digital: 0
  });

  // Función para obtener datos actualizados del servidor
  const actualizarDatos = () => {
    fetch("http://localhost:3001/resumen_dia_independiente")
      .then((r) => r.json())
      .then(setDatos)
      .catch((err) => console.error("Error cargando datos:", err));
  };

  useEffect(() => {
    actualizarDatos();
    const intervalo = setInterval(actualizarDatos, 5000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6 overflow-hidden">
      {/* PESTAÑAS SUPERIORES */}
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border ${
            activeTab === "general"
              ? "bg-blue-600 text-white border-blue-600 ring-2 ring-offset-2 ring-blue-600"
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Store size={24} /> CAJA KIOSCO (General)
        </button>

        <button
          onClick={() => setActiveTab("cigarrillos")}
          className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border ${
            activeTab === "cigarrillos"
              ? "bg-yellow-600 text-white border-yellow-600 ring-2 ring-offset-2 ring-yellow-600"
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Cigarette size={24} /> CAJA CIGARRILLOS
        </button>
      </div>

      {/* RENDERIZADO CONDICIONAL DE LOS COMPONENTES */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "general" ? (
          <CierreGeneral datos={datos.general} onRecargar={actualizarDatos} />
        ) : (
          <CierreCigarrillos datos={datos.cigarrillos} onRecargar={actualizarDatos} />
        )}
      </div>
    </div>
  );
}

export default Cierre;