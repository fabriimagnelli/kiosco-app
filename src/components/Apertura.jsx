import React, { useState } from "react";
import { LockOpen, DollarSign, Save } from "lucide-react";

function Apertura() {
  const [monto, setMonto] = useState("");
  const [observacion, setObservacion] = useState("");

  const abrirCaja = (e) => {
    e.preventDefault();
    if (!monto) return alert("Ingresa un monto válido");

    fetch("http://localhost:3001/apertura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto, observacion }),
    }).then(() => {
      alert("✅ Caja abierta con éxito. ¡Buen día!");
      setMonto("");
      setObservacion("");
      window.location.href = "/ventas"; // Nos lleva directo a vender
    });
  };

  return (
    <div className="flex justify-center items-center h-full bg-slate-100 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
        
        <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-3 shadow-sm">
                <LockOpen size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Apertura de Caja</h2>
            <p className="text-slate-500 text-sm text-center">Ingresa el dinero inicial (cambio) para comenzar el turno.</p>
        </div>

        <form onSubmit={abrirCaja} className="space-y-5">
            <div>
                <label className="block text-slate-700 font-semibold mb-2 flex items-center gap-2">
                    <DollarSign size={18} className="text-green-600"/> Monto Inicial
                </label>
                <input 
                    type="number" 
                    placeholder="Ej: 5000" 
                    className="w-full border border-slate-300 p-4 rounded-xl text-2xl font-bold text-center text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block text-slate-600 text-sm font-semibold mb-2">Observación (Opcional)</label>
                <input 
                    type="text" 
                    placeholder="Ej: Billetes chicos, Turno Mañana..." 
                    className="w-full border border-slate-300 p-3 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                />
            </div>

            <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex justify-center items-center gap-2"
            >
                <Save size={20} />
                CONFIRMAR APERTURA
            </button>
        </form>

      </div>
    </div>
  );
}

export default Apertura;