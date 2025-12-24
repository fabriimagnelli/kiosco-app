import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Save, Banknote, AlertTriangle, CheckCircle } from "lucide-react";

function CierreCigarrillos({ datos, onRecargar }) {
  const [billetes, setBilletes] = useState({ 20000: "", 10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: "" });
  const [totalFisico, setTotalFisico] = useState(0);

  useEffect(() => {
    let suma = 0;
    Object.keys(billetes).forEach((valor) => (suma += (parseInt(billetes[valor]) || 0) * parseInt(valor)));
    setTotalFisico(suma);
  }, [billetes]);

  const cambiarCantidad = (valor, cantidad) => setBilletes({ ...billetes, [valor]: cantidad });

  // --- LÓGICA CIGARRILLOS (ESTÁNDAR) ---
  // Físico - Esperado. 
  // Negativo = Faltante. Positivo = Sobrante.
  const diferencia = totalFisico - datos.esperado;

  const esFaltante = diferencia < 0;
  const esSobrante = diferencia > 0;
  const esPerfecto = diferencia === 0;

  const guardarCierre = () => {
    if (!confirm("¿Confirmar cierre de CIGARRILLOS?")) return;

    const body = {
      tipo: "CIGARRILLOS",
      total_ventas: datos.ventas,
      total_gastos: 0,
      total_sistema: datos.esperado,
      total_fisico: totalFisico,
      diferencia: diferencia
    };

    fetch("http://localhost:3001/cierres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((res) => {
      if (res.ok) {
        alert("✅ Caja Cigarrillos cerrada correctamente.");
        setBilletes({ 20000: "", 10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: "" });
        onRecargar();
        generarPDF(body);
      }
    });
  };

  const generarPDF = (data) => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString("es-AR");
    doc.setFillColor(202, 138, 4); // Amarillo
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Cierre: CIGARRILLOS", 105, 20, null, null, "center");
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 105, 30, null, null, "center");

    const rows = [
      ["Ventas Cigarrillos", `$ ${data.total_ventas}`],
      ["Esperado Sistema", `$ ${data.total_sistema}`],
      ["Conteo Físico", `$ ${data.total_fisico}`],
      ["DIFERENCIA", `$ ${data.diferencia}`],
    ];

    autoTable(doc, {
      startY: 50,
      head: [["Concepto", "Monto"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [202, 138, 4] },
    });
    doc.save(`Cierre_Cigarrillos_${fecha.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
      <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex items-center gap-3 mb-6 border-b pb-4 text-yellow-700">
          <div className="p-2 rounded-lg bg-yellow-100"><Banknote /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Billetes Cigarrillos</h2>
            <p className="text-xs text-slate-500">Solo efectivo de esta caja</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1">
          {[20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10].map((valor) => (
            <div key={valor} className="flex items-center justify-between">
              <span className="font-semibold text-slate-600 w-16 text-right">${valor}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">x</span>
                <input
                  type="number"
                  className="border p-2 rounded-lg w-24 text-center font-bold text-slate-700 outline-none focus:ring-yellow-500 border-yellow-200"
                  placeholder="0"
                  value={billetes[valor]}
                  onChange={(e) => cambiarCantidad(valor, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <p className="text-slate-500 text-xs font-bold uppercase">Total Contado</p>
          <p className="text-4xl font-bold mt-1 text-yellow-700">${totalFisico.toLocaleString()}</p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col gap-4">
        <div className="p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 bg-white flex-1 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-slate-700 text-lg">Detalle Cigarrillos</h3>
              <p className="text-xs text-slate-400">Venta exclusiva de cigarrillos</p>
            </div>
            <div className="p-2 rounded-full bg-yellow-50 text-yellow-600"><AlertTriangle size={20} /></div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between px-2 py-4 text-lg"><span>Ventas</span> <span className="font-bold text-green-600">+ ${datos.ventas}</span></div>
            <p className="text-xs text-slate-400 px-2">Recuerda: Los gastos se descuentan de la caja general.</p>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-baseline">
            <span className="text-xs font-bold text-slate-400 uppercase">Debes tener</span>
            <span className="text-4xl font-bold text-slate-800">$ {datos.esperado}</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-sm border border-slate-200 text-center transition-colors ${esPerfecto ? "bg-green-50" : esFaltante ? "bg-red-50" : "bg-blue-50"}`}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Resultado</p>
            <div className="flex justify-center items-center gap-2 mb-2">
                <span className={`text-4xl font-bold ${esPerfecto ? "text-green-600" : esFaltante ? "text-red-600" : "text-blue-600"}`}>
                    {diferencia > 0 ? "+" : ""}${diferencia.toLocaleString()}
                </span>
            </div>
            <div className="flex justify-center gap-2 text-sm font-medium">
                {esPerfecto && <span className="text-green-700 flex items-center gap-1"><CheckCircle size={16}/> Perfecto</span>}
                {!esPerfecto && <span className={`${esFaltante ? "text-red-700" : "text-blue-700"} flex items-center gap-1`}>
                    <AlertTriangle size={16}/> {esFaltante ? "Faltante" : "Sobrante"}
                </span>}
            </div>
        </div>

        <button onClick={guardarCierre} className="w-full text-white py-4 rounded-xl font-bold shadow-lg bg-yellow-600 hover:bg-yellow-700 shadow-yellow-600/30 flex justify-center items-center gap-2">
            <Save size={20} /> CERRAR CAJA CIGARRILLOS
        </button>
      </div>
    </div>
  );
}

export default CierreCigarrillos;