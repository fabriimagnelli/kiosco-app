import React, { useState, useEffect } from "react";
import { Calculator, Save, AlertTriangle, Wallet, Coins, ArrowRight, ArrowDown, Edit2, Check, X } from "lucide-react";

function CierreGeneral() {
  const [resumen, setResumen] = useState(null);
  
  // Arqueo de Billetes
  const [billetes, setBilletes] = useState({
    10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: ""
  });
  const [monedas, setMonedas] = useState("");
  
  // Lógica de Retiro
  const [montoRetiro, setMontoRetiro] = useState(""); 
  const [observacion, setObservacion] = useState("");

  // NUEVO: Estados para la edición manual del inicio
  const [inicioManual, setInicioManual] = useState(null);
  const [editandoInicio, setEditandoInicio] = useState(false);
  const [valorTempInicio, setValorTempInicio] = useState("");

  useEffect(() => {
    fetch("http://localhost:3001/api/cierre/general")
      .then((res) => res.json())
      .then((data) => setResumen(data))
      .catch((err) => console.error("Error fetching cierre general:", err));
  }, []);

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

  // Funciones para manejar la edición manual del inicio
  const activarEdicionInicio = () => {
    // Si ya hay un manual, usamos ese, sino el calculado
    const calculado = calcularTotalFisico() - (parseFloat(montoRetiro) || 0);
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

  const cancelarEdicionInicio = () => {
    setEditandoInicio(false);
    // Si estaba vacío o inválido, podrías resetearlo a null si quisieras "deshacer" el manual
    // Pero aquí solo cancelamos la edición actual.
  };
  
  const limpiarManual = () => {
      setInicioManual(null); // Vuelve al cálculo automático
      setEditandoInicio(false);
  }

  const realizarCierre = async () => {
    const totalFisico = calcularTotalFisico();
    const retiro = parseFloat(montoRetiro) || 0;
    
    // Usamos el manual si existe, sino el calculado
    const baseManana = inicioManual !== null ? inicioManual : (totalFisico - retiro);

    if (baseManana < 0) {
      return alert("⛔ Error Crítico: El saldo para mañana no puede ser negativo.");
    }

    if (!confirm(`
      ¿CONFIRMAR CIERRE?
      -------------------------
      💵 Total Contado: $${totalFisico}
      💰 Se retira: $${retiro}
      🛡️ INICIO MAÑANA: $${baseManana} ${inicioManual !== null ? '(Modificado Manualmente)' : ''}
    `)) return;

    try {
      const res = await fetch("http://localhost:3001/api/cierres_unificado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: 'general',
          total_ventas: resumen.ventas,
          total_gastos: resumen.gastos + (resumen.proveedores || 0),
          total_efectivo_real: totalFisico,
          monto_retiro: retiro,
          observacion: observacion,
          nuevo_inicio_manual: inicioManual // Enviamos el manual si existe
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert("✅ Cierre exitoso.");
        window.location.reload();
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) { console.error(error); alert("Error de conexión"); }
  };

  if (!resumen) return <div className="p-10 text-center">Cargando cierre general...</div>;

  const totalFisico = calcularTotalFisico();
  const esperado = resumen.esperado || 0;
  const diferencia = totalFisico - esperado;
  
  // Cálculo visual: Si hay manual usa ese, si no calcula
  const quedaEnCaja = inicioManual !== null ? inicioManual : (totalFisico - (parseFloat(montoRetiro) || 0));

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 bg-slate-50 overflow-y-auto">
      
      {/* IZQUIERDA: RESUMEN SISTEMA */}
      <div className="w-full lg:w-1/3 space-y-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Calculator size={18} className="text-blue-600"/> Resumen Sistema (Kiosco)
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Inicial (Apertura):</span> <span className="font-bold">$ {resumen.saldo_inicial?.toLocaleString()}</span></div>
            <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1"><ArrowRight size={12}/> Ventas Efvo:</span> 
                <span className="font-bold">+ $ {resumen.ventas?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1"><ArrowRight size={12}/> Cobros Efvo:</span> 
                <span className="font-bold">+ $ {resumen.cobros?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-500">
                <span>Gastos:</span> <span className="font-bold">- $ {resumen.gastos?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-500">
                <span>Proveedores:</span> <span className="font-bold">- $ {resumen.proveedores?.toLocaleString()}</span>
            </div>
            <hr className="my-2"/>
            <div className="flex justify-between text-lg font-bold text-slate-800">
              <span>DEBERÍA HABER:</span> <span>$ {esperado.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* INFO DIGITAL */}
        <div className="bg-slate-800 text-white p-5 rounded-xl shadow-md border border-slate-700">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Digital Hoy</h3>
                <Wallet className="text-purple-400" size={20}/>
            </div>
            <p className="text-3xl font-bold text-purple-400">$ {resumen.digital?.toLocaleString()}</p>
        </div>

        {/* Info Diferencia */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 font-bold ${diferencia >= 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
          <AlertTriangle size={24}/>
          <div>
            <p className="text-xs uppercase opacity-70">Diferencia de Caja</p>
            <p className="text-xl">{diferencia >= 0 ? `+ $${diferencia.toLocaleString()}` : `- $${Math.abs(diferencia).toLocaleString()}`}</p>
          </div>
        </div>
      </div>

      {/* DERECHA: CONTEO DE BILLETES Y RETIRO */}
      <div className="flex-1 bg-white p-5 rounded-xl shadow-lg border border-slate-200">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Wallet size={20} className="text-green-600"/> Arqueo de Caja
        </h2>

        {/* 1. GRILLA BILLETES */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {[10000, 2000, 1000, 500, 200, 100, 50, 20, 10].map((val) => (
            <div key={val} className="bg-slate-50 p-2 rounded border border-slate-200 text-center">
              <label className="block text-xs font-bold text-slate-500 mb-1">${val}</label>
              <input 
                type="number" 
                className="w-full text-center font-bold text-slate-800 bg-white border rounded py-1 focus:ring-2 focus:ring-blue-400 outline-none"
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
              className="w-full text-center font-bold text-slate-800 bg-white border rounded py-1 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="$ Total"
              value={monedas}
              onChange={(e) => setMonedas(e.target.value)}
            />
          </div>
        </div>

        {/* TOTAL CONTADO */}
        <div className="bg-slate-800 text-white p-3 rounded-lg flex justify-between items-center mb-6">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Total Físico Contado</span>
          <span className="text-2xl font-bold text-green-400">$ {totalFisico.toLocaleString()}</span>
        </div>

        {/* 2. SECCIÓN RETIRO Y APERTURA (MODIFICADA) */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><ArrowDown size={18}/> Retiro y Próxima Apertura</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-blue-800 mb-1">Retiro</label>
              <input 
                type="number" 
                className="w-full p-3 border-2 border-blue-200 rounded-lg text-xl font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                placeholder="0.00"
                value={montoRetiro}
                onChange={(e) => {
                    setMontoRetiro(e.target.value);
                    if(inicioManual !== null) setInicioManual(null); // Resetear manual si cambia retiro para evitar confusión
                }}
              />
            </div>
            
            {/* CAJA EDITABLE "QUEDA PARA MAÑANA" */}
            <div className="flex-1 w-full bg-white p-3 rounded-lg border border-blue-100 relative group">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Queda para mañana (Inicio)</span>
              
              {editandoInicio ? (
                  <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="number" 
                        className="w-full p-1 border-b-2 border-blue-500 font-black text-xl text-slate-800 outline-none"
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
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
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
                ⚠️ CUIDADO: Estás retirando más de lo que contaste.
             </p>
          )}
        </div>

        {/* Observación y Botón */}
        <div className="mt-4">
          <input 
            className="w-full p-3 border rounded-lg text-sm mb-4" 
            placeholder="Observaciones (Opcional)..."
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
          />
          <button 
            onClick={realizarCierre}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
          >
            <Save size={20}/> CERRAR TURNO Y GUARDAR
          </button>
        </div>

      </div>
    </div>
  );
}

export default CierreGeneral;