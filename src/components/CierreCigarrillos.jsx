import React, { useState, useEffect } from "react";
import { DollarSign, Save, Banknote, RefreshCw, Cigarette, Filter, Settings } from "lucide-react";

function CierreCigarrillos() {
  const [datos, setDatos] = useState({ esperado: 0, ventas: 0, cantidad_tickets: 0 });
  const [cargando, setCargando] = useState(true);
  const [categoriasDetectadas, setCategoriasDetectadas] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(localStorage.getItem("cat_cigarrillos") || "");
  const [mostrarConfig, setMostrarConfig] = useState(false);

  // --- Billetes (Igual al General) ---
  const [billetes, setBilletes] = useState({
    20000: 0, 10000: 0, 2000: 0, 1000: 0, 
    500: 0, 200: 0, 100: 0, 50: 0, 
    "Monedas/Otros": 0
  });

  const [totalFisico, setTotalFisico] = useState(0);
  const [diferencia, setDiferencia] = useState(0);
  const [procesando, setProcesando] = useState(false);
  
  const ordenBilletes = ["20000", "10000", "2000", "1000", "500", "200", "100", "50", "Monedas/Otros"];

  // --- 1. CARGA INTELIGENTE ---
  const cargarDatos = async () => {
    setCargando(true);
    try {
      // CORRECCIÓN AQUÍ: Se agregó /api/ antes de resumen_dia_independiente
      const res = await fetch("http://localhost:3001/api/resumen_dia_independiente"); 
      if (!res.ok) throw new Error("Error conectando al servidor");

      const data = await res.json();
      setDatos({
          esperado: data.cigarrillos.esperado || 0,
          ventas: data.cigarrillos.ventas || 0,
          cantidad_tickets: 0  // No tenemos este dato directamente, lo calculamos del total de ventas con categoria cigarrillo
      });

    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar las ventas. Revisa que el servidor esté abierto.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // Recalcular si el usuario cambia la categoría manualmente
  const handleCategoriaChange = (nuevaCat) => {
      setCategoriaSeleccionada(nuevaCat);
      localStorage.setItem("cat_cigarrillos", nuevaCat); // Guardar preferencia
      cargarDatos(); // Recargar para aplicar filtro
  };

  // --- CÁLCULOS DINERO ---
  useEffect(() => {
    let total = 0;
    Object.keys(billetes).forEach(denom => {
      const valor = denom === "Monedas/Otros" ? 1 : parseInt(denom);
      const cantidad = parseFloat(billetes[denom]) || 0;
      total += valor * cantidad;
    });
    setTotalFisico(total);
  }, [billetes]);

  useEffect(() => {
    setDiferencia(totalFisico - datos.esperado);
  }, [totalFisico, datos.esperado]);

  const handleBilleteChange = (denom, valor) => {
    setBilletes({ ...billetes, [denom]: valor });
  };

  const guardarCierre = async () => {
    if (!window.confirm("¿Cerrar Caja Cigarrillos?")) return;
    setProcesando(true);
    try {
        // CORRECCIÓN AQUÍ: Se agregó /api/ antes de cierres
        await fetch("http://localhost:3001/api/cierres", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tipo: "CIGARRILLOS",
                total_sistema: datos.esperado,
                total_fisico: totalFisico,
                diferencia: diferencia,
                fecha: new Date().toISOString()
            })
        });
        alert("✅ Caja Cerrada.");
        setBilletes({20000:0, 10000:0, 2000:0, 1000:0, 500:0, 200:0, 100:0, 50:0, "Monedas/Otros":0});
        cargarDatos();
    } catch (e) { alert("Error al guardar."); }
    setProcesando(false);
  };

  if (cargando) return <div className="p-10 text-center animate-pulse">Cargando ventas...</div>;

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-50 overflow-hidden">
      
      {/* IZQUIERDA: CONFIGURACIÓN Y TOTALES */}
      <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg">
        
        {/* Tarjeta de Total */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
            <div className="bg-orange-50 w-full p-8 rounded-3xl border border-orange-100 text-center relative overflow-hidden shadow-sm">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-4 shadow-sm">
                    <Cigarette size={32}/>
                </div>
                <p className="text-sm text-orange-600/70 font-bold uppercase tracking-widest mb-2">Ventas del Día</p>
                <p className="text-5xl font-black text-orange-600 tracking-tight">$ {Math.round(datos.esperado).toLocaleString()}</p>
            </div>
        </div>

      </div>

      {/* DERECHA: CONTEO DE BILLETES */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
        <div className="p-4 border-b bg-white font-bold text-slate-700 flex items-center gap-2 shadow-sm">
            <Banknote className="text-green-600"/> Arqueo de Caja
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ordenBilletes.map((denom) => {
                    const cantidad = billetes[denom];
                    const valor = denom === "Monedas/Otros" ? 1 : parseInt(denom);
                    const subtotal = (parseFloat(cantidad) || 0) * valor;
                    const active = cantidad > 0;
                    return (
                        <div key={denom} className={`p-3 rounded-xl border transition-all ${active ? "bg-white border-blue-400 ring-1 ring-blue-100" : "bg-white border-slate-200"}`}>
                            <div className="flex justify-between mb-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{denom}</span>
                                {active && <span className="text-[10px] font-bold text-blue-600">$ {Math.round(subtotal).toLocaleString()}</span>}
                            </div>
                            <input
                                type="number"
                                min="0"
                                className="w-full text-xl font-bold bg-transparent outline-none text-slate-800"
                                placeholder="0"
                                value={cantidad || ""}
                                onChange={(e) => handleBilleteChange(denom, e.target.value)}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                    );
                })}
            </div>
        </div>

        {/* FOOTER RESULTADOS */}
        <div className="p-6 bg-white border-t flex flex-col sm:flex-row items-center gap-4 shadow-lg z-20">
            <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">Total Contado</span>
                    <span className="text-xl font-black text-slate-800">$ {Math.round(totalFisico).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between items-center px-3 py-2 rounded-lg border text-sm font-bold ${
                    diferencia === 0 ? "bg-green-100 text-green-700 border-green-200" : 
                    diferencia > 0 ? "bg-blue-100 text-blue-700 border-blue-200" : 
                    "bg-red-100 text-red-700 border-red-200"
                }`}>
                    <span>{diferencia === 0 ? "OK" : diferencia > 0 ? "SOBRA" : "FALTA"}</span>
                    <span className="text-lg">{diferencia > 0 ? "+" : ""}{Math.round(diferencia).toLocaleString()}</span>
                </div>
            </div>
            <button 
                onClick={guardarCierre} 
                disabled={procesando}
                className="w-full sm:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <Save size={18}/> {procesando ? "..." : "Cerrar Caja"}
            </button>
        </div>
      </div>
    </div>
  );
}

export default CierreCigarrillos;