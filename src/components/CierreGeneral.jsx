import React, { useState, useEffect } from "react";
import { DollarSign, Save, AlertTriangle, CheckCircle, Calculator, Banknote, RefreshCw } from "lucide-react";

function CierreGeneral() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Billetes y Monedas (Estado inicial)
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

  // Orden para mostrar en la grilla (de mayor a menor)
  const ordenBilletes = ["20000", "10000", "2000", "1000", "500", "200", "100", "50", "Monedas/Otros"];

  // --- 1. CARGAR DATOS AL INICIAR ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await fetch("http://localhost:3001/resumen_dia_independiente");
      if (res.ok) {
        const data = await res.json();
        setDatos(data.general); 
      }
    } catch (error) {
      console.error("Error cargando cierre:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // --- 2. CALCULAR TOTAL FÍSICO ---
  useEffect(() => {
    let total = 0;
    Object.keys(billetes).forEach(denom => {
      const valor = denom === "Monedas/Otros" ? 1 : parseInt(denom);
      const cantidad = parseFloat(billetes[denom]) || 0;
      total += valor * cantidad;
    });
    setTotalFisico(total);
  }, [billetes]);

  // --- 3. CALCULAR DIFERENCIA ---
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
        cargarDatos(); 
      } else {
        alert("❌ Error al cerrar caja.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión.");
    }
    setProcesando(false);
  };

  if (cargando) return (
    <div className="flex h-full items-center justify-center">
        <div className="animate-pulse flex flex-col items-center text-slate-400">
            <Calculator className="mb-2 h-10 w-10 opacity-50"/>
            <p className="text-sm font-medium">Calculando balance del día...</p>
        </div>
    </div>
  );

  if (!datos) return <div className="p-10 text-center text-red-500">Error cargando datos. Revisa el servidor.</div>;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50">
      
      {/* --- COLUMNA IZQUIERDA: RESUMEN DEL SISTEMA --- */}
      <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 flex flex-col relative z-10 shadow-xl lg:shadow-none">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="text-blue-600" size={20}/> Sistema
            </h3>
            <button onClick={cargarDatos} className="text-xs flex items-center gap-1 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200 font-medium">
                <RefreshCw size={12}/> Actualizar
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            
            {/* Tarjeta Caja Inicial */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Caja Inicial</p>
                <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm font-medium">Fondo de Apertura</span>
                    <span className="text-lg font-bold text-slate-700">$ {datos.saldo_inicial?.toLocaleString()}</span>
                </div>
            </div>

            {/* Lista de Movimientos */}
            <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <DollarSign size={16}/>
                        </div>
                        <span className="text-sm font-medium text-slate-600">Ventas Efectivo</span>
                    </div>
                    <span className="font-bold text-green-600 text-base">+ $ {datos.ventas?.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <CheckCircle size={16}/>
                        </div>
                        <span className="text-sm font-medium text-slate-600">Cobros Deuda</span>
                    </div>
                    <span className="font-bold text-blue-600 text-base">+ $ {datos.cobros?.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <AlertTriangle size={16}/>
                        </div>
                        <span className="text-sm font-medium text-slate-600">Gastos Caja</span>
                    </div>
                    <span className="font-bold text-red-500 text-base">- $ {datos.gastos?.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <AlertTriangle size={16}/>
                        </div>
                        <span className="text-sm font-medium text-slate-600">Pagos Proveedores</span>
                    </div>
                    <span className="font-bold text-orange-500 text-base">- $ {datos.pagos?.toLocaleString()}</span>
                </div>
            </div>
        </div>

        {/* Total Esperado Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center uppercase font-bold tracking-wider mb-2">Debería haber en caja</p>
            <div className="bg-white border border-slate-200 text-slate-800 p-4 rounded-2xl text-center shadow-sm">
                <span className="text-3xl font-black tracking-tight">$ {datos.esperado?.toLocaleString()}</span>
            </div>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: ARQUEO DE BILLETES --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
        <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="text-green-600" size={20}/> Arqueo de Caja
            </h3>
        </div>

        {/* Grilla de Billetes Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ordenBilletes.map((denom) => {
                    const cantidad = billetes[denom];
                    const valorUnitario = denom === "Monedas/Otros" ? 1 : parseInt(denom);
                    const subtotal = (parseFloat(cantidad) || 0) * valorUnitario;
                    const isActive = cantidad > 0;

                    return (
                        <div 
                            key={denom} 
                            className={`relative p-4 rounded-xl border transition-all duration-200 group
                                ${isActive 
                                    ? "bg-white border-blue-400 shadow-md shadow-blue-100 ring-1 ring-blue-100" 
                                    : "bg-white border-slate-200 hover:border-blue-300 shadow-sm"
                                }`}
                        >
                            {/* Header de la Tarjeta */}
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                                    {denom === "Monedas/Otros" ? "MONEDAS" : `$ ${parseInt(denom).toLocaleString()}`}
                                </span>
                                {isActive && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        = $ {subtotal.toLocaleString()}
                                    </span>
                                )}
                            </div>

                            {/* Input Gigante */}
                            <div className="flex items-baseline gap-1">
                                <span className="text-slate-300 text-sm font-light">x</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className={`w-full bg-transparent outline-none font-sans font-bold text-2xl p-0 
                                        ${isActive ? "text-slate-800" : "text-slate-300 placeholder:text-slate-200"}`}
                                    value={cantidad || ""}
                                    onChange={(e) => handleBilleteChange(denom, e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Footer de Totales y Acción */}
        <div className="bg-white p-6 border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
                
                {/* Total Contado */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-500 font-bold uppercase">Total Contado</span>
                        <span className="text-2xl font-black text-slate-800">$ {totalFisico.toLocaleString()}</span>
                    </div>
                    
                    {/* Barra de Diferencia */}
                    <div className={`flex justify-between items-center px-3 py-2 rounded-lg border text-sm font-bold transition-colors ${
                        diferencia === 0 
                            ? "bg-green-50 border-green-200 text-green-700" 
                            : diferencia > 0 
                                ? "bg-blue-50 border-blue-200 text-blue-700" 
                                : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                        <span>{diferencia === 0 ? "Balance Perfecto" : diferencia > 0 ? "Sobra Dinero" : "Falta Dinero"}</span>
                        <span className="text-lg">
                            {diferencia > 0 ? "+" : ""}{diferencia.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Botón de Acción */}
                <button 
                    onClick={guardarCierre}
                    disabled={procesando}
                    className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2 active:scale-95 ${
                        procesando ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-600/30"
                    }`}
                >
                    <Save size={20}/> 
                    <span className="whitespace-nowrap">{procesando ? "Cerrando..." : "Cerrar Caja"}</span>
                </button>
            </div>
        </div>
      </div>

    </div>
  );
}

export default CierreGeneral;