import React, { useState } from "react";
import { LockOpen, DollarSign, Save } from "lucide-react";
import { useNavigate } from "react-router-dom"; // <--- 1. Importamos useNavigate

function Apertura() {
  const [monto, setMonto] = useState("");
  const [observacion, setObservacion] = useState("");
  const navigate = useNavigate(); // <--- 2. Activamos la navegación interna

  const abrirCaja = (e) => {
    e.preventDefault();
    if (!monto) return alert("Ingresa un monto válido");

    // <--- 3. CORREGIDO: Agregamos "/api" a la URL para coincidir con el servidor
    fetch("http://localhost:3001/api/apertura", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto, observacion }),
    })
    .then((res) => {
        if (!res.ok) throw new Error("Error al abrir caja");
        return res.json();
    })
    .then(() => {
      alert("✅ Caja abierta con éxito. ¡Buen día!");
      setMonto("");
      setObservacion("");
      
      // <--- 4. CORREGIDO: Usamos navigate para ir a ventas sin recargar (evita el error Cannot GET)
      navigate("/ventas"); 
    })
    .catch((err) => {
        console.error(err);
        alert("Hubo un error al conectar con el servidor. Revisa que la terminal no tenga errores.");
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