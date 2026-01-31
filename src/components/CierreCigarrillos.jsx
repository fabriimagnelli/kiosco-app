import React, { useState, useEffect } from "react";
import { Cigarette, Save, AlertTriangle, Calculator, DollarSign, ArrowRight } from "lucide-react";

function CierreCigarrillos() {
  const [resumen, setResumen] = useState(null);
  const [montoContado, setMontoContado] = useState("");
  const [montoRetiro, setMontoRetiro] = useState("");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/cierre/cigarrillos")
      .then((res) => res.json())
      .then((data) => setResumen(data))
      .catch((err) => console.error(err));
  }, []);

  const realizarCierre = async () => {
    const contado = parseFloat(montoContado) || 0;
    const retiro = parseFloat(montoRetiro) || 0;
    const queda = contado - retiro;

    if (queda < 0) {
        return alert("Error: No puedes retirar más dinero del que hay en la caja.");
    }
    
    if (!confirm(`¿Confirmar cierre de CIGARRILLOS?\n\n💵 Contado: $${contado}\n💰 Retiro: $${retiro}\n🛡️ Queda: $${queda}`)) return;

    try {
      const res = await fetch("http://localhost:3001/api/cierres_unificado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: 'cigarrillos',
          total_ventas: resumen.ventas,
          total_efectivo_real: contado,
          monto_retiro: retiro, 
          observacion: observacion
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert("✅ Cierre de Cigarrillos exitoso.");
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

  // DATOS DEL USUARIO
  const contado = parseFloat(montoContado) || 0;
  const retiro = parseFloat(montoRetiro) || 0;
  
  // CÁLCULOS
  const diferencia = contado - totalEsperado;
  const quedaEnCaja = contado - retiro;

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

      {/* DERECHA: CONTROL */}
      <div className="flex-1 bg-white p-5 rounded-xl shadow-lg border border-slate-200">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calculator size={20} className="text-orange-600"/> Arqueo Caja Cigarrillos
        </h2>
        
        {/* INPUT CONTADO */}
        <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Dinero en Caja (Lo que contaste)</label>
            <input 
                type="number" 
                className="w-full p-4 border-2 border-orange-200 rounded-xl text-3xl font-bold text-orange-600 focus:outline-none focus:border-orange-500"
                placeholder="$ 0.00"
                value={montoContado}
                onChange={(e) => setMontoContado(e.target.value)}
                autoFocus
            />
        </div>

        {/* SECCIÓN RETIRO */}
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-orange-800 mb-1 flex items-center gap-1">
                 <DollarSign size={14}/> ¿Cuánto retiras?
              </label>
              <input 
                type="number" 
                className="w-full p-3 border-2 border-orange-200 rounded-lg text-xl font-bold text-orange-700 focus:outline-none focus:border-orange-500"
                placeholder="0.00"
                value={montoRetiro}
                onChange={(e) => setMontoRetiro(e.target.value)}
              />
            </div>
            <div className="flex-1 w-full bg-white p-3 rounded-lg border border-orange-100 text-right">
              <span className="block text-xs font-bold text-slate-400 uppercase">Inicio Mañana (Queda)</span>
              <span className={`text-2xl font-black ${quedaEnCaja < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                $ {quedaEnCaja.toLocaleString()}
              </span>
            </div>
          </div>
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