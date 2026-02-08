import React, { useState, useEffect } from "react";
import { Cigarette, Save, AlertTriangle, Calculator, DollarSign, ArrowRight, Coins, Wallet, Edit2, Check, X } from "lucide-react";
import { apiFetch } from "../lib/api";

function CierreCigarrillos() {
  const [resumen, setResumen] = useState(null);
  
  // Estado para Billetes (Igual que Cierre General)
  const [billetes, setBilletes] = useState({
    10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: ""
  });
  const [monedas, setMonedas] = useState("");

  const [montoRetiro, setMontoRetiro] = useState("");
  const [observacion, setObservacion] = useState("");

  // Estados para Edición Manual del Inicio
  const [inicioManual, setInicioManual] = useState(null);
  const [editandoInicio, setEditandoInicio] = useState(false);
  const [valorTempInicio, setValorTempInicio] = useState("");

  useEffect(() => {
    apiFetch("/api/cierre/cigarrillos")
      .then((res) => res.json())
      .then((data) => setResumen(data))
      .catch((err) => console.error(err));
  }, []);

  // --- LÓGICA DE CONTEO ---
  const calcularTotalFisico = () => {
    let total = 0;
    Object.keys(billetes).forEach(denominacion => {
      const cantidad = parseFloat(billetes[denominacion]) || 0;
      total += cantidad * parseFloat(denominacion);
    });
    total += parseFloat(monedas) || 0;
    return total;
  };

  const handleBilleteChange = (denominacion, valor) => {
    setBilletes({ ...billetes, [denominacion]: valor });
  };

  // --- LÓGICA DE EDICIÓN MANUAL ---
  const activarEdicionInicio = () => {
    const contado = calcularTotalFisico();
    const retiro = parseFloat(montoRetiro) || 0;
    const calculado = contado - retiro;
    setValorTempInicio(inicioManual !== null ? inicioManual : calculado);
    setEditandoInicio(true);
  };

  const guardarInicioManual = () => {
    const valor = parseFloat(valorTempInicio);
    if (!isNaN(valor)) {
        setInicioManual(valor);
    }
    setEditandoInicio(false);
  };

  const limpiarManual = () => {
      setInicioManual(null);
      setEditandoInicio(false);
  }

  // --- CIERRE ---
  const realizarCierre = async () => {
    const contado = calcularTotalFisico();
    const retiro = parseFloat(montoRetiro) || 0;
    
    // Usamos el manual si existe, sino el cálculo automático
    const queda = inicioManual !== null ? inicioManual : (contado - retiro);

    if (queda < 0) {
        return alert("Error: El saldo para mañana no puede ser negativo.");
    }
    
    if (!confirm(`¿Confirmar cierre de cigarrillos?\n\nContado: $${contado}\nRetiro: $${retiro}\nQueda (Inicio Mañana): $${queda}`)) return;

    try {
      const res = await apiFetch("/api/cierres_unificado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: 'cigarrillos',
          total_ventas: resumen.ventas,
          total_efectivo_real: contado,
          monto_retiro: retiro, 
          observacion: observacion,
          nuevo_inicio_manual: inicioManual // Enviamos el ajuste manual
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert("Cierre de Cigarrillos exitoso.");
        window.location.reload();
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) { console.error(error); alert("Error de conexión"); }
  };

  if (!resumen) return <div className="p-10 text-center text-orange-600 font-bold">Cargando cigarrillos...</div>;

  // DATOS DEL SISTEMA
  const saldoInicial = resumen.saldo_inicial || 0;
  const ventasSistema = resumen.ventas || 0;
  const totalEsperado = saldoInicial + ventasSistema;

  // CÁLCULOS VISUALES
  const contado = calcularTotalFisico();
  const retiro = parseFloat(montoRetiro) || 0;
  const diferencia = contado - totalEsperado;
  const quedaEnCaja = inicioManual !== null ? inicioManual : (contado - retiro);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 bg-slate-50 overflow-y-auto">
      
      {/* IZQUIERDA: RESUMEN VENTAS */}
      <div className="w-full lg:w-1/3 space-y-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Cigarette size={18} className="text-orange-600"/> Resumen Cigarrillos
          </h2>
          <div className="space-y-3 text-sm">
             <div className="flex justify-between items-center">
                <span className="text-slate-500">Saldo Inicial:</span>
                <span className="font-bold text-slate-700">$ {saldoInicial.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center text-green-600">
                <span className="flex items-center gap-1"><ArrowRight size={12}/> Ventas Hoy:</span>
                <span className="font-bold">+ $ {ventasSistema.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center p-2 bg-orange-50 rounded text-orange-800">
                <span className="font-medium">Cantidad Packs</span>
                <span className="font-bold">{resumen.cantidad} u.</span>
             </div>
             <hr className="border-slate-100"/>
             <div className="flex justify-between items-center text-lg font-bold text-slate-800">
                <span>DEBE HABER:</span>
                <span>$ {totalEsperado.toLocaleString()}</span>
             </div>
          </div>
        </div>

        {/* INFO DIFERENCIA */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 font-bold ${diferencia >= -10 && diferencia <= 10 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
          <AlertTriangle size={24}/>
          <div>
            <p className="text-xs uppercase opacity-70">Diferencia de Caja</p>
            <p className="text-xl">{diferencia >= 0 ? `+ $${diferencia.toLocaleString()}` : `- $${Math.abs(diferencia).toLocaleString()}`}</p>
          </div>
        </div>
      </div>

      {/* DERECHA: CONTROL Y ARQUEO */}
      <div className="flex-1 bg-white p-5 rounded-xl shadow-lg border border-slate-200">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calculator size={20} className="text-orange-600"/> Arqueo Caja Cigarrillos
        </h2>
        
        {/* 1. GRILLA BILLETES */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {[10000, 2000, 1000, 500, 200, 100, 50, 20, 10].map((val) => (
            <div key={val} className="bg-slate-50 p-2 rounded border border-slate-200 text-center">
              <label className="block text-xs font-bold text-slate-500 mb-1">${val}</label>
              <input 
                type="number" 
                className="w-full text-center font-bold text-slate-800 bg-white border rounded py-1 focus:ring-2 focus:ring-orange-400 outline-none"
                placeholder="0"
                value={billetes[val]}
                onChange={(e) => handleBilleteChange(val, e.target.value)}
              />
            </div>
          ))}
          <div className="bg-slate-50 p-2 rounded border border-slate-200 text-center col-span-3 sm:col-span-1">
            <label className="block text-xs font-bold text-slate-500 mb-1 flex justify-center items-center gap-1"><Coins size={10}/> Monedas</label>
            <input 
              type="number" 
              className="w-full text-center font-bold text-slate-800 bg-white border rounded py-1 focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="$ Total"
              value={monedas}
              onChange={(e) => setMonedas(e.target.value)}
            />
          </div>
        </div>

        {/* TOTAL CONTADO */}
        <div className="bg-slate-800 text-white p-3 rounded-lg flex justify-between items-center mb-6">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Total Físico Contado</span>
          <span className="text-2xl font-bold text-orange-400">$ {contado.toLocaleString()}</span>
        </div>

        {/* 2. SECCIÓN RETIRO Y EDICIÓN MANUAL */}
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* RETIRO */}
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-orange-800 mb-1 flex items-center gap-1">
                 <DollarSign size={14}/> Retiro
              </label>
              <input 
                type="number" 
                className="w-full p-3 border-2 border-orange-200 rounded-lg text-xl font-bold text-orange-700 focus:outline-none focus:border-orange-500"
                placeholder="0.00"
                value={montoRetiro}
                onChange={(e) => {
                    setMontoRetiro(e.target.value);
                    if(inicioManual !== null) setInicioManual(null); // Resetear manual si cambia retiro
                }}
              />
            </div>

            {/* INICIO MAÑANA (EDITABLE) */}
            <div className="flex-1 w-full bg-white p-3 rounded-lg border border-orange-100 relative group">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">QUEDA PARA MAÑANA (INICIO)</span>
              
              {editandoInicio ? (
                  <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="number" 
                        className="w-full p-1 border-b-2 border-orange-500 font-black text-xl text-slate-800 outline-none"
                        value={valorTempInicio}
                        onChange={(e) => setValorTempInicio(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && guardarInicioManual()}
                      />
                      <button onClick={guardarInicioManual} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check size={18}/></button>
                      <button onClick={limpiarManual} className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200" title="Restaurar Automático"><X size={18}/></button>
                  </div>
              ) : (
                  <div className="flex justify-between items-center">
                      <span className={`text-2xl font-black ${quedaEnCaja < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                        $ {quedaEnCaja.toLocaleString()}
                      </span>
                      <button 
                        onClick={activarEdicionInicio}
                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                        title="Modificar manualmente"
                      >
                        <Edit2 size={18}/>
                      </button>
                  </div>
              )}

              {inicioManual !== null && !editandoInicio && (
                  <span className="absolute top-2 right-10 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded border border-yellow-200">
                      Manual
                  </span>
              )}
            </div>
          </div>
          {quedaEnCaja < 0 && (
             <p className="text-red-600 text-xs font-bold mt-2 text-center bg-red-100 p-2 rounded">
                CUIDADO: Estás retirando más de lo que contaste.
             </p>
          )}
        </div>

        <input 
            className="w-full p-3 border rounded-lg text-sm mb-4" 
            placeholder="Observaciones..."
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
        />

        <button 
            onClick={realizarCierre}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
        >
            <Save size={20}/> CERRAR TURNO CIGARRILLOS
        </button>
      </div>
    </div>
  );
}

export default CierreCigarrillos;