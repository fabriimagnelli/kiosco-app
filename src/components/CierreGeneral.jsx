import React, { useState, useEffect } from "react";
import { DollarSign, Save, AlertTriangle, CheckCircle, Calculator, Banknote, Coins, RefreshCw } from "lucide-react";

function CierreGeneral() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Billetes y Monedas
  const [billetes, setBilletes] = useState({
    20000: 0,
    10000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    "Monedas/Otros": 0
  });

  const [totalFisico, setTotalFisico] = useState(0);
  const [diferencia, setDiferencia] = useState(0);
  const [procesando, setProcesando] = useState(false);

  // --- 1. CARGAR DATOS AL INICIAR ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await fetch("http://localhost:3001/resumen_dia_independiente");
      if (res.ok) {
        const data = await res.json();
        // Usamos la parte 'general' que tiene los totales calculados
        setDatos(data.general); 
      }
    } catch (error) {
      console.error("Error cargando cierre:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);
  // ----------------------------------

  // 2. Calcular total físico cuando cambian los billetes
  useEffect(() => {
    let total = 0;
    Object.keys(billetes).forEach(denom => {
      const valor = denom === "Monedas/Otros" ? 1 : parseInt(denom);
      const cantidad = parseFloat(billetes[denom]) || 0;
      total += valor * cantidad;
    });
    setTotalFisico(total);
  }, [billetes]);

  // 3. Calcular diferencia con el sistema
  useEffect(() => {
    if (datos) {
        setDiferencia(totalFisico - (datos.esperado || 0));
    }
  }, [totalFisico, datos]);

  const handleBilleteChange = (denom, valor) => {
    setBilletes({ ...billetes, [denom]: valor });
  };

  const guardarCierre = async () => {
    if (!window.confirm("¿Seguro que deseas cerrar la caja del día? Esto guardará el balance y reiniciará los contadores.")) return;

    setProcesando(true);
    const cierreData = {
      tipo: "GENERAL",
      total_ventas: datos.ventas,
      total_gastos: datos.gastos,
      total_sistema: datos.esperado,
      total_fisico: totalFisico,
      diferencia: diferencia
    };

    try {
      const res = await fetch("http://localhost:3001/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cierreData),
      });
      const data = await res.json();
      
      if (data.success) {
        alert("✅ Caja cerrada correctamente.");
        setBilletes({20000:0, 10000:0, 2000:0, 1000:0, 500:0, 200:0, 100:0, 50:0, "Monedas/Otros":0});
        cargarDatos(); // Recargar para ver todo en cero
      } else {
        alert("❌ Error al cerrar caja.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión.");
    }
    setProcesando(false);
  };

  if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse">Calculando balance del día...</div>;
  if (!datos) return <div className="p-10 text-center text-red-500">Error cargando datos. Revisa el servidor.</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full p-6 overflow-hidden bg-slate-100">
      
      {/* --- COLUMNA IZQUIERDA: DATOS DEL SISTEMA --- */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center justify-between pb-4 border-b">
            <span className="flex items-center gap-2"><Calculator className="text-blue-600"/> Resumen del Sistema</span>
            <button onClick={cargarDatos} className="text-sm bg-slate-100 p-2 rounded hover:bg-slate-200"><RefreshCw size={16}/></button>
        </h3>
        
        <div className="space-y-4 text-sm flex-1">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-medium">Caja Inicial (Apertura)</span>
                <span className="font-bold text-slate-700 text-lg">$ {datos.saldo_inicial?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="text-green-700 font-medium flex items-center gap-2"><DollarSign size={16}/> (+) Ventas Efectivo</span>
                <span className="font-bold text-green-700 text-lg">$ {datos.ventas?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-blue-700 font-medium flex items-center gap-2"><CheckCircle size={16}/> (+) Cobros Deuda</span>
                <span className="font-bold text-blue-700 text-lg">$ {datos.cobros?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="text-red-700 font-medium flex items-center gap-2"><AlertTriangle size={16}/> (-) Gastos Caja</span>
                <span className="font-bold text-red-700 text-lg">$ {datos.gastos?.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <span className="text-orange-700 font-medium flex items-center gap-2"><AlertTriangle size={16}/> (-) Pagos Prov.</span>
                <span className="font-bold text-orange-700 text-lg">$ {datos.pagos?.toLocaleString()}</span>
            </div>
        </div>

        {/* Total Esperado */}
        <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300">
            <p className="text-center text-slate-500 text-xs uppercase font-bold mb-1">Total Esperado en Caja</p>
            <div className="bg-slate-800 text-white p-4 rounded-xl text-center shadow-lg">
                <span className="text-3xl font-bold">$ {datos.esperado?.toLocaleString()}</span>
            </div>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: BILLETEO (ARQUEO) --- */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2 pb-4 border-b">
            <Banknote className="text-green-600"/> Arqueo de Billetes
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
            {Object.keys(billetes).map((denom) => (
                <div key={denom} className="flex items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="w-20 font-bold text-slate-600 text-right pr-2 text-sm flex items-center justify-end gap-1">
                        {denom === "Monedas/Otros" ? <Coins size={14}/> : "$"} {denom}
                    </div>
                    <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        value={billetes[denom] || ""}
                        onChange={(e) => handleBilleteChange(denom, e.target.value)}
                        onFocus={(e) => e.target.select()}
                    />
                </div>
            ))}
        </div>

        {/* RESULTADO DEL ARQUEO */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold">Total Contado:</span>
                <span className="text-xl font-bold text-slate-800">$ {totalFisico.toLocaleString()}</span>
            </div>
            
            <div className={`flex justify-between items-center p-3 rounded-lg border ${
                diferencia === 0 ? "bg-green-100 border-green-300 text-green-800" : 
                diferencia > 0 ? "bg-blue-100 border-blue-300 text-blue-800" : 
                "bg-red-100 border-red-300 text-red-800"
            }`}>
                <span className="font-bold text-sm">DIFERENCIA:</span>
                <span className="text-2xl font-black">
                    {diferencia > 0 ? "+" : ""}{diferencia.toLocaleString()}
                </span>
            </div>
            {diferencia !== 0 && (
                <p className="text-xs text-center font-bold opacity-75">
                    {diferencia > 0 ? "Te sobra dinero" : "Te falta dinero"}
                </p>
            )}
        </div>

        <button 
            onClick={guardarCierre}
            disabled={procesando}
            className={`w-full py-4 mt-4 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2 ${
                procesando ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
        >
            <Save size={20}/> {procesando ? "Cerrando..." : "CONFIRMAR CIERRE DE CAJA"}
        </button>
      </div>

    </div>
  );
}

export default CierreGeneral;