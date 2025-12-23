import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Save, Banknote, Wallet, AlertTriangle, CheckCircle, Cigarette, Store } from "lucide-react";

function Cierre() {
  const [activeTab, setActiveTab] = useState("general"); // 'general' o 'cigarrillos'
  
  // Billetes (Uno por cada caja para no mezclar)
  const [billetes, setBilletes] = useState({ 20000: "", 10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: "" });
  const [totalFisico, setTotalFisico] = useState(0);

  const [datos, setDatos] = useState({
    general: { saldo_inicial: 0, ventas: 0, cobros: 0, gastos: 0, pagos: 0, esperado: 0 },
    cigarrillos: { ventas: 0, esperado: 0 },
    digital: 0
  });

  // Cargar datos
  const actualizarDatos = () => {
    fetch("http://localhost:3001/resumen_dia_independiente")
      .then(r => r.json())
      .then(setDatos);
  };

  useEffect(() => {
    actualizarDatos();
    const i = setInterval(actualizarDatos, 5000);
    return () => clearInterval(i);
  }, []);

  // Calcular físico cada vez que cambian los billetes
  useEffect(() => {
    let suma = 0;
    Object.keys(billetes).forEach(valor => suma += (parseInt(billetes[valor]) || 0) * parseInt(valor));
    setTotalFisico(suma);
  }, [billetes]);

  const cambiarPestana = (tab) => {
    setActiveTab(tab);
    setBilletes({ 20000: "", 10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: "" });
  };

  const cambiarCantidad = (valor, cantidad) => setBilletes({ ...billetes, [valor]: cantidad });

  // --- LÓGICA INTELIGENTE DE CÁLCULO ---
  const esGeneral = activeTab === "general";
  const infoActual = esGeneral ? datos.general : datos.cigarrillos;
  const saldoEsperado = infoActual.esperado;

  // 1. Cálculo Real (Contable) para saber si falta o sobra de verdad
  // Si da negativo: Falta plata. Si da positivo: Sobra plata.
  const diferenciaReal = totalFisico - saldoEsperado;

  // 2. Cálculo Visual (Lo que tú quieres ver en pantalla)
  // - General: Invertimos (Esperado - Físico) para ver cuánto falta como número positivo (Cuenta Regresiva).
  // - Cigarrillos: Mantenemos el estándar (Físico - Esperado) donde negativo es faltante.
  const diferenciaVisual = esGeneral ? (saldoEsperado - totalFisico) : diferenciaReal;

  // Helpers para colores y textos (Basados en la realidad, no en lo visual)
  const esFaltante = diferenciaReal < 0; 
  const esSobrante = diferenciaReal > 0;
  const esPerfecto = diferenciaReal === 0;

  const guardarCierre = () => {
    const nombreCaja = esGeneral ? "CAJA GENERAL (Kiosco)" : "CAJA CIGARRILLOS";
    if (!confirm(`¿Confirmar cierre de ${nombreCaja}?`)) return;

    const body = {
        tipo: esGeneral ? "GENERAL" : "CIGARRILLOS",
        total_ventas: infoActual.ventas, 
        total_gastos: esGeneral ? (infoActual.gastos + infoActual.pagos) : 0,
        total_sistema: saldoEsperado,
        total_fisico: totalFisico,
        diferencia: diferenciaReal // Guardamos el dato contable real para no romper reportes
    };

    fetch("http://localhost:3001/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    }).then(res => {
        if(res.ok) {
            alert(`✅ ${nombreCaja} cerrada correctamente.`);
            setBilletes({ 20000: "", 10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: "" });
            actualizarDatos();
            generarPDF(body, nombreCaja);
        }
    });
  };

  const generarPDF = (data, nombreCaja) => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString("es-AR");

    doc.setFillColor(esGeneral ? 30 : 202, esGeneral ? 41 : 138, esGeneral ? 59 : 4); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(`Cierre: ${nombreCaja}`, 105, 20, null, null, "center");
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 105, 30, null, null, "center");

    const rows = [
        ['Saldo Inicial / Ventas', `$ ${data.total_ventas}`],
        ['Salidas (Gastos)', `- $ ${data.total_gastos}`],
        ['Esperado Sistema', `$ ${data.total_sistema}`],
        ['Conteo Físico', `$ ${data.total_fisico}`],
        ['DIFERENCIA', `$ ${data.diferencia}`]
    ];

    autoTable(doc, {
        startY: 50,
        head: [['Concepto', 'Monto']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: esGeneral ? [30, 41, 59] : [202, 138, 4] }
    });
    doc.save(`Cierre_${nombreCaja}_${fecha.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6 overflow-hidden">
      
      {/* PESTAÑAS SUPERIORES */}
      <div className="flex gap-4">
        <button 
            onClick={() => cambiarPestana("general")}
            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border ${
                activeTab === "general" 
                ? "bg-blue-600 text-white border-blue-600 ring-2 ring-offset-2 ring-blue-600" 
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
        >
            <Store size={24} /> CAJA KIOSCO (General)
        </button>

        <button 
            onClick={() => cambiarPestana("cigarrillos")}
            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border ${
                activeTab === "cigarrillos" 
                ? "bg-yellow-600 text-white border-yellow-600 ring-2 ring-offset-2 ring-yellow-600" 
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
        >
            <Cigarette size={24} /> CAJA CIGARRILLOS
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-full gap-6 overflow-hidden">
        
        {/* IZQUIERDA: ARQUEO (BILLETES) */}
        <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar flex flex-col">
            <div className={`flex items-center gap-3 mb-6 border-b pb-4 ${esGeneral ? "text-blue-700" : "text-yellow-700"}`}>
                <div className={`p-2 rounded-lg ${esGeneral ? "bg-blue-100" : "bg-yellow-100"}`}><Banknote /></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Billetes {esGeneral ? "Kiosco" : "Cigarrillos"}</h2>
                    <p className="text-xs text-slate-500">Cuenta solo el dinero de esta caja</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1">
                {[20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10].map(valor => (
                    <div key={valor} className="flex items-center justify-between group">
                        <span className="font-semibold text-slate-600 w-16 text-right">${valor}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">x</span>
                            <input 
                                type="number" 
                                className={`border p-2 rounded-lg w-24 text-center font-bold text-slate-700 outline-none transition-all ${esGeneral ? "focus:ring-blue-500 border-slate-300" : "focus:ring-yellow-500 border-yellow-200"}`}
                                placeholder="0"
                                value={billetes[valor]}
                                onChange={(e) => cambiarCantidad(valor, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Contado</p>
                <p className={`text-4xl font-bold mt-1 ${esGeneral ? "text-blue-700" : "text-yellow-700"}`}>${totalFisico.toLocaleString()}</p>
            </div>
        </div>

        {/* DERECHA: INFORMACIÓN DEL SISTEMA */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
            
            {/* TARJETA DE RESUMEN */}
            <div className={`p-6 rounded-xl shadow-sm border-l-4 relative overflow-hidden flex-1 ${esGeneral ? "bg-white border-blue-600" : "bg-white border-yellow-500"}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-slate-700 text-lg">
                            {esGeneral ? "Detalle Kiosco" : "Detalle Cigarrillos"}
                        </h3>
                        <p className="text-xs text-slate-400">Según movimientos registrados</p>
                    </div>
                    <div className={`p-2 rounded-full ${esGeneral ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-600"}`}>
                        {esGeneral ? <Wallet size={20}/> : <AlertTriangle size={20}/>}
                    </div>
                </div>
                
                <div className="space-y-3 text-sm text-slate-600">
                    {esGeneral && (
                        <>
                            <div className="flex justify-between bg-blue-50 p-2 rounded text-blue-800 font-bold"><span>Saldo Inicial</span> <span>+ ${infoActual.saldo_inicial}</span></div>
                            <div className="flex justify-between px-2"><span>Ventas Productos</span> <span className="font-semibold text-green-600">+ ${infoActual.ventas}</span></div>
                            <div className="flex justify-between px-2"><span>Cobros Deudores</span> <span className="font-semibold text-green-600">+ ${infoActual.cobros}</span></div>
                            <div className="flex justify-between px-2 text-red-500"><span>Gastos / Prov.</span> <span className="font-semibold">- ${infoActual.gastos + infoActual.pagos}</span></div>
                        </>
                    )}
                    {!esGeneral && (
                        <>
                            <div className="flex justify-between px-2 py-4 text-lg"><span>Ventas Cigarrillos</span> <span className="font-bold text-green-600">+ ${infoActual.ventas}</span></div>
                            <p className="text-xs text-slate-400 px-2">Recuerda: Los gastos y pagos a proveedores se descuentan de la Caja General.</p>
                        </>
                    )}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-400 uppercase">Debes tener en esta caja</span>
                    <span className="text-4xl font-bold text-slate-800">$ {saldoEsperado}</span>
                </div>
            </div>

            {/* TARJETA DE RESULTADO - LÓGICA HÍBRIDA */}
            <div className={`p-6 rounded-xl shadow-sm border border-slate-200 text-center transition-colors ${esPerfecto ? "bg-green-50" : esFaltante ? "bg-red-50" : "bg-blue-50"}`}>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Resultado</p>
                <div className="flex justify-center items-center gap-2 mb-2">
                    {/* Mostramos diferenciaVisual (ajustada a tu gusto por pestaña) */}
                    <span className={`text-4xl font-bold ${esPerfecto ? "text-green-600" : esFaltante ? "text-red-600" : "text-blue-600"}`}>
                        {diferenciaVisual > 0 ? (esGeneral ? "" : "+") : (esGeneral ? "-" : "")}${Math.abs(diferenciaVisual).toLocaleString()}
                    </span>
                </div>
                <div className="flex justify-center gap-2 text-sm font-medium">
                    {esPerfecto && <span className="text-green-700 flex items-center gap-1"><CheckCircle size={16}/> Perfecto</span>}
                    {/* Usamos esFaltante/esSobrante (lógica real) para el texto y color */}
                    {!esPerfecto && <span className={`${esFaltante ? "text-red-700" : "text-blue-700"} flex items-center gap-1`}>
                        <AlertTriangle size={16}/> {esFaltante ? "Faltante" : "Sobrante"}
                    </span>}
                </div>
            </div>

            <button 
                onClick={guardarCierre}
                className={`w-full text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 ${esGeneral ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30" : "bg-yellow-600 hover:bg-yellow-700 shadow-yellow-600/30"}`}
            >
                <Save size={20} />
                <span>CERRAR CAJA {esGeneral ? "KIOSCO" : "CIGARRILLOS"}</span>
            </button>
        </div>

      </div>
    </div>
  );
}

export default Cierre;