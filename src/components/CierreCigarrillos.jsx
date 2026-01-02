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
      const res = await fetch("http://localhost:3001/ventas"); 
      if (!res.ok) throw new Error("Error conectando al servidor");

      const raw = await res.json();
      const todasLasVentas = Array.isArray(raw) ? raw : (raw.data || []);

      // 1. Detectar todas las categorías únicas del día
      const hoy = new Date();
      const ventasHoy = todasLasVentas.filter(v => {
        const d = new Date(v.fecha || v.created_at);
        return d.getDate() === hoy.getDate() && 
               d.getMonth() === hoy.getMonth() && 
               d.getFullYear() === hoy.getFullYear();
      });

      const categoriasUnicas = new Set();
      ventasHoy.forEach(v => {
          if (v.categoria) categoriasUnicas.add(v.categoria);
          if (v.productos && Array.isArray(v.productos)) {
              v.productos.forEach(p => p.categoria && categoriasUnicas.add(p.categoria));
          }
      });
      setCategoriasDetectadas(Array.from(categoriasUnicas));

      // 2. Si no hay categoría seleccionada, intentamos adivinar
      let catFinal = categoriaSeleccionada;
      if (!catFinal) {
          const sugerencia = Array.from(categoriasUnicas).find(c => 
              c.toLowerCase().includes("cigar") || c.toLowerCase().includes("tabaco")
          );
          if (sugerencia) {
              catFinal = sugerencia;
              setCategoriaSeleccionada(sugerencia);
          }
      }

      // 3. Filtrar usando la categoría elegida
      calcularTotal(ventasHoy, catFinal);

    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar las ventas. Revisa que el servidor (pantalla negra) esté abierto.");
    } finally {
      setCargando(false);
    }
  };

  const calcularTotal = (ventas, categoriaFiltro) => {
      if (!categoriaFiltro) {
          setDatos({ esperado: 0, ventas: 0, cantidad_tickets: 0 });
          return;
      }

      const ventasFiltradas = ventas.filter(v => {
          // Coincidencia exacta o parcial en categoría
          const catVenta = (v.categoria || "").toLowerCase();
          const filtro = categoriaFiltro.toLowerCase();
          
          if (catVenta.includes(filtro)) return true;

          // También buscar dentro de los productos del ticket
          if (v.productos && Array.isArray(v.productos)) {
              return v.productos.some(p => (p.categoria || "").toLowerCase().includes(filtro));
          }
          return false;
      });

      const total = ventasFiltradas.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
      
      setDatos({
          esperado: total,
          ventas: total,
          cantidad_tickets: ventasFiltradas.length
      });
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
        await fetch("http://localhost:3001/cierres", {
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
        
        {/* Selector de Categoría */}
        <div className="p-6 bg-slate-100 border-b border-slate-200">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Filter size={12}/> Filtrar Categoría
                </label>
                <button onClick={() => setMostrarConfig(!mostrarConfig)} className="text-slate-400 hover:text-blue-500">
                    <Settings size={14}/>
                </button>
            </div>
            
            <select 
                value={categoriaSeleccionada}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
            >
                <option value="">-- Selecciona Categoría --</option>
                {categoriasDetectadas.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
                Selecciona la categoría que usas para los cigarrillos.
            </p>
        </div>

        {/* Tarjeta de Total */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
            <div className="bg-orange-50 w-full p-8 rounded-3xl border border-orange-100 text-center relative overflow-hidden shadow-sm">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-4 shadow-sm">
                    <Cigarette size={32}/>
                </div>
                <p className="text-sm text-orange-600/70 font-bold uppercase tracking-widest mb-2">Ventas del Día</p>
                <p className="text-5xl font-black text-orange-600 tracking-tight">$ {datos.esperado.toLocaleString()}</p>
                
                <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-orange-100 text-xs font-bold text-orange-800">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    {datos.cantidad_tickets} Tickets de "{categoriaSeleccionada || '...'}"
                </div>
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
                                {active && <span className="text-[10px] font-bold text-blue-600">$ {subtotal.toLocaleString()}</span>}
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
                    <span className="text-xl font-black text-slate-800">$ {totalFisico.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between items-center px-3 py-2 rounded-lg border text-sm font-bold ${
                    diferencia === 0 ? "bg-green-100 text-green-700 border-green-200" : 
                    diferencia > 0 ? "bg-blue-100 text-blue-700 border-blue-200" : 
                    "bg-red-100 text-red-700 border-red-200"
                }`}>
                    <span>{diferencia === 0 ? "OK" : diferencia > 0 ? "SOBRA" : "FALTA"}</span>
                    <span className="text-lg">{diferencia > 0 ? "+" : ""}{diferencia.toLocaleString()}</span>
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