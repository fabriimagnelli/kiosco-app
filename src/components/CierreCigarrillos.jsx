import React, { useState, useEffect } from "react";
import { DollarSign, Save, Banknote, RefreshCw, Cigarette, AlertCircle, Edit2 } from "lucide-react";

function CierreCigarrillos() {
  const [datos, setDatos] = useState({ esperado: 0, ventas: 0, cantidad_tickets: 0 });
  const [cargando, setCargando] = useState(true);
  const [errorSistema, setErrorSistema] = useState(null); // Para mostrar errores en pantalla
  const [editandoSistema, setEditandoSistema] = useState(false); // Para corrección manual

  // --- Estado de Billetes ---
  const [billetes, setBilletes] = useState({
    20000: 0, 10000: 0, 2000: 0, 1000: 0, 
    500: 0, 200: 0, 100: 0, 50: 0, 
    "Monedas/Otros": 0
  });

  const [totalFisico, setTotalFisico] = useState(0);
  const [diferencia, setDiferencia] = useState(0);
  const [procesando, setProcesando] = useState(false);

  const ordenBilletes = ["20000", "10000", "2000", "1000", "500", "200", "100", "50", "Monedas/Otros"];

  // --- SAFE GUARDS: Funciones que no fallan si el dato es null ---
  const esMismaFecha = (fecha1, fecha2) => {
    try {
        if (!fecha1 || !fecha2) return false;
        // Intentamos convertir a Date. Si fecha1 es un string raro, podría fallar.
        const d1 = new Date(fecha1);
        const d2 = new Date(fecha2);
        if (isNaN(d1.getTime())) return false; // Fecha inválida
        
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    } catch (e) {
        return false;
    }
  };

  const esVentaCigarrillo = (venta) => {
    try {
        const palabrasClave = ["cigar", "tabaco", "atado", "box", "philip", "marlboro", "chester", "camel", "lucky"];
        
        // Convertimos a string seguro y minúsculas para comparar
        const cat = String(venta.categoria || "").toLowerCase();
        const desc = String(venta.descripcion || "").toLowerCase();

        // 1. Revisar Categoría y Descripción
        if (palabrasClave.some(p => cat.includes(p))) return true;
        if (palabrasClave.some(p => desc.includes(p))) return true;

        // 2. Revisar Productos (si existen)
        if (venta.productos && Array.isArray(venta.productos)) {
            return venta.productos.some(prod => {
                const pCat = String(prod.categoria || "").toLowerCase();
                const pNom = String(prod.nombre || "").toLowerCase();
                return palabrasClave.some(p => pCat.includes(p) || pNom.includes(p));
            });
        }
        return false;
    } catch (e) {
        console.warn("Error analizando venta:", venta, e);
        return false;
    }
  };

  // --- CARGAR DATOS ---
  const cargarDatos = async () => {
    setCargando(true);
    setErrorSistema(null);
    try {
      console.log("Iniciando fetch a /ventas...");
      const res = await fetch("http://localhost:3001/ventas"); 
      
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

      const dataRaw = await res.json();
      console.log("Datos recibidos (RAW):", dataRaw);

      // Soportamos si el backend devuelve un array directo o un objeto { data: [...] }
      const todasLasVentas = Array.isArray(dataRaw) ? dataRaw : (dataRaw.data || []);
      
      if (!Array.isArray(todasLasVentas)) {
          throw new Error("El formato de respuesta del servidor no es una lista de ventas.");
      }

      const hoy = new Date();
      
      // Filtramos fecha (con protección)
      const ventasHoy = todasLasVentas.filter(v => esMismaFecha(v.fecha || v.created_at || v.createdAt, hoy));
      
      // Filtramos cigarrillos (con protección)
      const ventasCigarrillos = ventasHoy.filter(v => esVentaCigarrillo(v));

      // Sumamos totales
      const totalCalculado = ventasCigarrillos.reduce((acc, curr) => {
          // Intentamos leer 'total', 'monto' o 'importe'
          const monto = parseFloat(curr.total || curr.monto || curr.importe || 0);
          return acc + monto;
      }, 0);

      setDatos({
          esperado: totalCalculado,
          ventas: totalCalculado,
          cantidad_tickets: ventasCigarrillos.length
      });

    } catch (error) {
      console.error("Error CRÍTICO cargando ventas:", error);
      setErrorSistema(error.message);
      setDatos({ esperado: 0, ventas: 0, cantidad_tickets: 0 });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // --- CÁLCULOS EN TIEMPO REAL ---
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
    // Calculamos diferencia usando datos.esperado (que puede ser editado manualmente)
    setDiferencia(totalFisico - (datos.esperado || 0));
  }, [totalFisico, datos.esperado]);

  const handleBilleteChange = (denom, valor) => {
    setBilletes({ ...billetes, [denom]: valor });
  };

  // Función para editar manualmente el valor esperado si el sistema falla
  const handleManualSystemChange = (nuevoValor) => {
      const val = parseFloat(nuevoValor) || 0;
      setDatos(prev => ({ ...prev, esperado: val }));
  };

  const guardarCierre = async () => {
    if (!window.confirm("¿Confirmar Cierre de CAJA CIGARRILLOS?")) return;

    setProcesando(true);
    const cierreData = {
      tipo: "CIGARRILLOS",
      total_sistema: datos.esperado,
      total_fisico: totalFisico,
      diferencia: diferencia,
      fecha: new Date().toISOString(),
      notas: errorSistema ? `Cierre forzado con error: ${errorSistema}` : "Cierre normal"
    };

    try {
      const res = await fetch("http://localhost:3001/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cierreData),
      });
      
      if (res.ok) {
        alert("✅ Caja de Cigarrillos cerrada correctamente.");
        setBilletes({20000:0, 10000:0, 2000:0, 1000:0, 500:0, 200:0, 100:0, 50:0, "Monedas/Otros":0});
        setDatos({ esperado: 0, ventas: 0, cantidad_tickets: 0 });
        cargarDatos(); 
      } else {
        alert("❌ Error al guardar en base de datos.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al guardar.");
    }
    setProcesando(false);
  };

  if (cargando) return (
    <div className="flex h-full items-center justify-center">
        <div className="animate-pulse flex flex-col items-center text-slate-400">
            <Cigarette className="mb-2 h-10 w-10 opacity-50"/>
            <p className="text-sm font-medium">Analizando ventas...</p>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50">
      
      {/* --- COLUMNA IZQUIERDA --- */}
      <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 flex flex-col relative z-10 shadow-xl lg:shadow-none">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Cigarette className="text-orange-600" size={20}/> Sistema
            </h3>
            <button onClick={cargarDatos} className="text-xs flex items-center gap-1 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200 font-medium">
                <RefreshCw size={12}/>
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            
            {/* Si hay error, lo mostramos aquí */}
            {errorSistema && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold text-red-600 uppercase mb-1 flex items-center gap-2">
                        <AlertCircle size={14}/> Error detectado
                    </p>
                    <p className="text-xs text-red-500">{errorSistema}</p>
                    <p className="text-[10px] text-red-400 mt-2">Ingresa el monto del sistema manualmente abajo.</p>
                </div>
            )}

            {/* TARJETA DE VENTAS (EDITABLE) */}
            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 text-center relative group">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-3 shadow-sm">
                    <DollarSign size={24}/>
                </div>
                
                <p className="text-xs text-orange-600/70 font-bold uppercase tracking-widest mb-1">
                    Ventas Cigarrillos
                </p>
                
                {/* Input Editable o Texto Fijo */}
                {editandoSistema ? (
                    <input 
                        type="number" 
                        autoFocus
                        className="w-full text-center text-3xl font-black text-orange-700 bg-white border border-orange-300 rounded-lg py-1 outline-none"
                        value={datos.esperado}
                        onChange={(e) => handleManualSystemChange(e.target.value)}
                        onBlur={() => setEditandoSistema(false)}
                    />
                ) : (
                    <div className="relative inline-block">
                        <p className="text-4xl font-black text-orange-700 tracking-tight cursor-pointer" 
                           onClick={() => setEditandoSistema(true)}
                           title="Clic para editar manualmente">
                            $ {datos.esperado.toLocaleString()}
                        </p>
                        <Edit2 size={12} className="absolute -right-4 top-2 text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>
                    </div>
                )}

                <div className="mt-4 inline-block bg-white/50 px-3 py-1 rounded-full text-xs font-bold text-orange-800 border border-orange-100">
                    {datos.cantidad_tickets} Tickets detectados
                </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-xs text-center">
                <p>Si el monto es $0 incorrectamente, puedes hacer clic en el número para corregirlo manualmente.</p>
            </div>
        </div>

        {/* FOOTER ESPERADO */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center uppercase font-bold tracking-wider mb-2">Total Sistema</p>
            <div className="bg-white border border-slate-200 text-slate-800 p-4 rounded-2xl text-center shadow-sm">
                <span className="text-3xl font-black tracking-tight">$ {datos.esperado.toLocaleString()}</span>
            </div>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: BILLETES --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
        <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="text-green-600" size={20}/> Arqueo de Efectivo
            </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ordenBilletes.map((denom) => {
                    const cantidad = billetes[denom];
                    const valorUnitario = denom === "Monedas/Otros" ? 1 : parseInt(denom);
                    const subtotal = (parseFloat(cantidad) || 0) * valorUnitario;
                    const isActive = cantidad > 0;

                    return (
                        <div key={denom} className={`relative p-4 rounded-xl border transition-all duration-200 ${isActive ? "bg-white border-blue-400 shadow-md ring-1 ring-blue-100" : "bg-white border-slate-200 hover:border-blue-300"}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[11px] font-bold uppercase ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                                    {denom === "Monedas/Otros" ? "MONEDAS" : `$ ${parseInt(denom).toLocaleString()}`}
                                </span>
                                {isActive && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">= $ {subtotal.toLocaleString()}</span>}
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-slate-300 text-sm font-light">x</span>
                                <input
                                    type="number"
                                    min="0"
                                    className={`w-full bg-transparent outline-none font-sans font-bold text-2xl p-0 ${isActive ? "text-slate-800" : "text-slate-300"}`}
                                    placeholder="0"
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

        {/* FOOTER TOTALES */}
        <div className="bg-white p-6 border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-500 font-bold uppercase">Total Contado</span>
                        <span className="text-2xl font-black text-slate-800">$ {totalFisico.toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between items-center px-3 py-2 rounded-lg border text-sm font-bold ${
                        diferencia === 0 ? "bg-green-50 border-green-200 text-green-700" : 
                        diferencia > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : 
                        "bg-red-50 border-red-200 text-red-700"
                    }`}>
                        <span>{diferencia === 0 ? "Balance Perfecto" : diferencia > 0 ? "Sobra Dinero" : "Falta Dinero"}</span>
                        <span className="text-lg">{diferencia > 0 ? "+" : ""}{diferencia.toLocaleString()}</span>
                    </div>
                </div>
                <button 
                    onClick={guardarCierre}
                    disabled={procesando}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white shadow-lg bg-orange-600 hover:bg-orange-700 active:scale-95 flex items-center gap-2"
                >
                    <Save size={20}/> Cerrar Caja
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

export default CierreCigarrillos;