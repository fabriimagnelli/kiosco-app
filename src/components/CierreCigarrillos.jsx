import React, { useState, useEffect } from "react";
import { Cigarette, Save, AlertTriangle, Calculator, DollarSign, ArrowRight, Coins, Wallet, Edit2, Check, X, ShieldCheck, EyeOff } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useNotify } from "../context/NotificationContext";
import jsPDF from "jspdf";

function CierreCigarrillos() {
  const { toast, confirmDialog } = useNotify();
  const [resumen, setResumen] = useState(null);

  // Cierre Ciego: se oculta lo esperado por el sistema hasta validar el arqueo
  const [cierreValidado, setCierreValidado] = useState(false);
  
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

  const imprimirTicketZCigarrillos = ({ saldoInicial, ventas, esperado, contado, diferencia, retiro, fondo }) => {
    const doc = new jsPDF({ unit: "mm", format: [80, 200] });
    const ancho = 80;
    const margen = 4;
    let y = 8;

    const centrado = (texto, tam = 10, negrita = true) => {
      doc.setFontSize(tam);
      doc.setFont(undefined, negrita ? "bold" : "normal");
      doc.text(texto, ancho / 2, y, { align: "center" });
      y += tam * 0.5 + 2;
    };
    const fila = (label, valor, negrita = false) => {
      doc.setFontSize(9);
      doc.setFont(undefined, negrita ? "bold" : "normal");
      doc.text(label, margen, y);
      doc.text(valor, ancho - margen, y, { align: "right" });
      y += 5;
    };
    const linea = () => { doc.setLineDashPattern([1, 1], 0); doc.line(margen, y, ancho - margen, y); y += 5; };

    centrado("TICKET Z - CIGARRILLOS", 11);
    centrado(new Date().toLocaleString("es-AR"), 8, false);
    linea();

    fila("Saldo Inicial:", `$ ${saldoInicial.toLocaleString()}`);
    fila("Ventas:", `$ ${ventas.toLocaleString()}`);
    fila("Total Esperado:", `$ ${esperado.toLocaleString()}`);
    fila("Efectivo Contado:", `$ ${contado.toLocaleString()}`);
    linea();

    const esFaltante = diferencia < 0;
    fila(`Diferencia (${esFaltante ? "Faltante" : "Sobrante"}):`, `$ ${Math.abs(diferencia).toLocaleString()}`, true);
    linea();

    fila("Retiro de Dinero:", `$ ${retiro.toLocaleString()}`);
    fila("Inicio (Fondo) Mañana:", `$ ${fondo.toLocaleString()}`);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text("......................................", ancho / 2, y, { align: "center" }); y += 5;
    doc.text("Firma", ancho / 2, y, { align: "center" });

    doc.save(`ticket_z_cigarrillos_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // --- CIERRE ---
  const realizarCierre = async () => {
    if (!cierreValidado) {
      return toast("Primero validá el arqueo para revelar la diferencia.", "warn");
    }

    const contado = calcularTotalFisico();
    const retiro = parseFloat(montoRetiro) || 0;
    
    // Usamos el manual si existe, sino el cálculo automático
    const queda = inicioManual !== null ? inicioManual : (contado - retiro);

    if (queda < 0) {
        return toast("Error: El saldo para mañana no puede ser negativo.", "err");
    }
    
    if (!(await confirmDialog(`¿Confirmar cierre de cigarrillos?\n\nContado: $${contado}\nRetiro: $${retiro}\nQueda (Inicio Mañana): $${queda}`))) return;

    const intentarCierre = async (intento = 1) => {
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
            nuevo_inicio_manual: inicioManual
          }),
        });
        
        const data = await res.json();
        if (data.success) {
          imprimirTicketZCigarrillos({
            saldoInicial: resumen.saldo_inicial || 0,
            ventas: resumen.ventas || 0,
            esperado: (resumen.saldo_inicial || 0) + (resumen.ventas || 0),
            contado,
            diferencia: contado - ((resumen.saldo_inicial || 0) + (resumen.ventas || 0)),
            retiro,
            fondo: queda,
          });
          toast("Cierre de Cigarrillos exitoso.", "ok");
          setTimeout(() => window.location.reload(), 1200);
        } else if (data.error && data.error.includes("bloqueada temporalmente") && intento < 3) {
          console.warn(`[CIERRE] Reintentando cierre cigarrillos (intento ${intento + 1}/3)...`);
          await new Promise(r => setTimeout(r, 2000));
          return intentarCierre(intento + 1);
        } else {
          toast("Error: " + data.error, "err");
        }
      } catch (error) { console.error(error); toast("Error de conexión", "err"); }
    };

    await intentarCierre();
  };

  if (!resumen) return <div className="p-10 text-center text-orange-600 font-medium">Cargando cigarrillos...</div>;

  // DATOS DEL SISTEMA
  const saldoInicial = resumen.saldo_inicial || 0;
  const ventasSistema = resumen.ventas || 0;
  const totalEsperado = saldoInicial + ventasSistema;

  // CÁLCULOS VISUALES
  const contado = calcularTotalFisico();
  const retiro = parseFloat(montoRetiro) || 0;
  const diferenciaBase = contado - totalEsperado;
  const diferencia = contado === 0 ? -Math.abs(totalEsperado) : diferenciaBase;
  const estadoDiferencia = contado === 0 || diferencia < 0 ? "faltante" : diferencia > 0 ? "sobrante" : "cuadrada";
  const diferenciaClase = estadoDiferencia === "faltante"
    ? "bg-rose-50/80 text-rose-700 border-rose-200/70"
    : estadoDiferencia === "sobrante"
      ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/70"
      : "bg-slate-100/80 text-slate-600 border-slate-200/80";
  const diferenciaEstadoTexto = estadoDiferencia === "faltante"
    ? "Faltante"
    : estadoDiferencia === "sobrante"
      ? "Sobrante"
      : "Caja Cuadrada";
  const quedaEnCaja = inicioManual !== null ? inicioManual : (contado - retiro);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4 bg-[#f5f5f7] overflow-y-auto">
      
      {/* IZQUIERDA: RESUMEN VENTAS */}
      <div className="w-full lg:w-1/3 space-y-4">
        <div className="rounded-2xl border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur-xl">
          <h2 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Cigarette size={18} className="text-orange-600"/> Resumen Cigarrillos
          </h2>
          {cierreValidado ? (
          <div className="space-y-3 text-sm">
             <div className="flex justify-between items-center">
                <span className="text-slate-500">Saldo Inicial:</span>
                <span className="font-medium text-slate-700">$ {saldoInicial.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center text-green-600">
                <span className="flex items-center gap-1"><ArrowRight size={12}/> Ventas Hoy:</span>
                <span className="font-medium">+ $ {ventasSistema.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center rounded-lg border border-orange-100/80 bg-orange-50/70 p-2 text-orange-800">
                <span className="font-medium">Cantidad Packs</span>
                <span className="font-medium">{resumen.cantidad} u.</span>
             </div>
             <hr className="border-slate-200/80"/>
             <div className="flex justify-between items-center text-lg font-medium text-slate-800">
                <span>DEBE HABER:</span>
                <span>$ {totalEsperado.toLocaleString()}</span>
             </div>
          </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100/80 p-3 text-sm font-medium text-slate-400">
              <EyeOff size={16}/> Realice el arqueo de billetes y valide para ver los resultados
            </div>
          )}
        </div>

        {/* INFO DIFERENCIA */}
        {cierreValidado ? (
        <div className={`rounded-2xl border p-4 backdrop-blur-xl flex items-center gap-3 font-medium ${diferenciaClase}`}>
          <AlertTriangle size={24}/>
          <div>
            <p className="text-xs uppercase opacity-70">Diferencia de Caja</p>
            <p className="text-xl font-medium">{diferencia > 0 ? `+ $${diferencia.toLocaleString()}` : diferencia < 0 ? `- $${Math.abs(diferencia).toLocaleString()}` : "$0"}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{diferenciaEstadoTexto}</p>
          </div>
        </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-4 text-sm font-medium text-slate-400">
            <EyeOff size={16}/> Realice el arqueo de billetes y valide para ver los resultados
          </div>
        )}
      </div>

      {/* DERECHA: CONTROL Y ARQUEO */}
      <div className="flex-1 rounded-2xl border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur-xl">
        <h2 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
          <Calculator size={20} className="text-orange-600"/> Arqueo Caja Cigarrillos
        </h2>
        
        {/* 1. GRILLA BILLETES */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {[10000, 2000, 1000, 500, 200, 100, 50, 20, 10].map((val) => (
            <div key={val} className="rounded-xl border border-white/75 bg-white/70 p-2 text-center backdrop-blur-sm">
              <label className="block text-xs font-medium text-slate-500 mb-1">${val}</label>
              <input 
                type="number" 
                className="w-full rounded-md border-0 bg-slate-100/80 py-1 text-center font-medium text-slate-800 outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="0"
                value={billetes[val]}
                onChange={(e) => handleBilleteChange(val, e.target.value)}
              />
            </div>
          ))}
          <div className="col-span-3 rounded-xl border border-white/75 bg-white/70 p-2 text-center backdrop-blur-sm sm:col-span-1">
            <label className="block text-xs font-medium text-slate-500 mb-1 flex justify-center items-center gap-1"><Coins size={10}/> Monedas</label>
            <input 
              type="number" 
              className="w-full rounded-md border-0 bg-slate-100/80 py-1 text-center font-medium text-slate-800 outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="$ Total"
              value={monedas}
              onChange={(e) => setMonedas(e.target.value)}
            />
          </div>
        </div>

        {/* TOTAL CONTADO */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-orange-200/70 bg-gradient-to-r from-orange-50/90 via-white/80 to-amber-50/80 p-3 backdrop-blur-sm">
          <span className="text-sm font-medium uppercase tracking-wider text-slate-500">Total Físico Contado</span>
          <span className="text-2xl font-medium text-orange-700">$ {contado.toLocaleString()}</span>
        </div>

        {/* 2. SECCIÓN RETIRO Y EDICIÓN MANUAL */}
        <div className="mb-4 rounded-2xl border border-orange-100/80 bg-orange-50/65 p-4 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* RETIRO */}
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-orange-800 mb-1 flex items-center gap-1">
                 <DollarSign size={14}/> Retiro
              </label>
              <input 
                type="number" 
                className="w-full rounded-lg border-0 bg-white/80 p-3 text-xl font-medium text-orange-700 outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="0.00"
                value={montoRetiro}
                onChange={(e) => {
                    setMontoRetiro(e.target.value);
                    if(inicioManual !== null) setInicioManual(null); // Resetear manual si cambia retiro
                }}
              />
            </div>

            {/* INICIO MAÑANA (EDITABLE) */}
            <div className="relative group w-full flex-1 rounded-xl border border-white/80 bg-white/75 p-3 backdrop-blur-sm">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">QUEDA PARA MAÑANA (INICIO)</span>
              
              {editandoInicio ? (
                  <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="number" 
                        className="w-full rounded-md border-0 bg-slate-100/80 p-2 font-medium text-xl text-slate-800 outline-none focus:ring-2 focus:ring-orange-300"
                        value={valorTempInicio}
                        onChange={(e) => setValorTempInicio(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && guardarInicioManual()}
                      />
                      <button onClick={guardarInicioManual} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check size={18}/></button>
                      <button onClick={limpiarManual} className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200" title="Restaurar Automático"><X size={18}/></button>
                  </div>
              ) : (
                  <div className="flex justify-between items-center">
                      <span className={`text-2xl font-medium ${quedaEnCaja < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
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
             <p className="mt-2 rounded-lg bg-rose-100/90 p-2 text-center text-xs font-medium text-rose-700">
                CUIDADO: Estás retirando más de lo que contaste.
             </p>
          )}
        </div>

        <input 
            className="mb-4 w-full rounded-lg border-0 bg-white/80 p-3 text-sm text-slate-700 outline-none ring-1 ring-slate-200/80 focus:ring-2 focus:ring-slate-300" 
            placeholder="Observaciones..."
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
        />

        <div className="flex justify-end">
          {cierreValidado ? (
            <button 
              onClick={realizarCierre}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:scale-[0.99]"
            >
              <Save size={18}/> CERRAR TURNO CIGARRILLOS
            </button>
          ) : (
            <button
              onClick={() => setCierreValidado(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-[0.99]"
            >
              <ShieldCheck size={18}/> VALIDAR ARQUEO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CierreCigarrillos;