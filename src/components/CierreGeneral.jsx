import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Save, Banknote, Wallet, AlertTriangle, CheckCircle } from "lucide-react";

function CierreGeneral({ datos, onRecargar }) {
  const [billetes, setBilletes] = useState({ 20000: "", 10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: "" });
  const [totalFisico, setTotalFisico] = useState(0);

  // Calcular total físico al cambiar billetes
  useEffect(() => {
    let suma = 0;
    Object.keys(billetes).forEach((valor) => (suma += (parseInt(billetes[valor]) || 0) * parseInt(valor)));
    setTotalFisico(suma);
  }, [billetes]);

  const cambiarCantidad = (valor, cantidad) => setBilletes({ ...billetes, [valor]: cantidad });

  // --- LÓGICA ESTÁNDAR (IGUAL A CIGARRILLOS) ---
  // Fórmula: Lo que tengo (Físico) - Lo que debería tener (Esperado)
  const diferencia = totalFisico - datos.esperado;

  // Variables para la interfaz
  const esFaltante = diferencia < 0; // Negativo = Falta plata
  const esSobrante = diferencia > 0; // Positivo = Sobra plata
  const esPerfecto = diferencia === 0;

  const guardarCierre = () => {
    if (!confirm("¿Confirmar cierre de CAJA GENERAL?")) return;

    const body = {
      tipo: "GENERAL",
      total_ventas: datos.ventas,
      total_gastos: datos.gastos + datos.pagos,
      total_sistema: datos.esperado,
      total_fisico: totalFisico,
      diferencia: diferencia // Guardamos la diferencia estándar
    };

    fetch("http://localhost:3001/cierres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((res) => {
      if (res.ok) {
        alert("✅ Caja General cerrada correctamente.");
        setBilletes({ 20000: "", 10000: "", 2000: "", 1000: "", 500: "", 200: "", 100: "", 50: "", 20: "", 10: "" });
        onRecargar(); // Recargar datos del padre
        generarPDF(body);
      }
    });
  };

  const generarPDF = (data) => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString("es-AR");
    doc.setFillColor(30, 41, 59); // Azul Oscuro
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Cierre: CAJA GENERAL", 105, 20, null, null, "center");
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 105, 30, null, null, "center");

    const rows = [
      ["Saldo Inicial / Ventas", `$ ${data.total_ventas}`],
      ["Salidas (Gastos)", `- $ ${data.total_gastos}`],
      ["Esperado Sistema", `$ ${data.total_sistema}`],
      ["Conteo Físico", `$ ${data.total_fisico}`],
      ["DIFERENCIA", `$ ${data.diferencia}`],
    ];

    autoTable(doc, {
      startY: 50,
      head: [["Concepto", "Monto"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`Cierre_General_${fecha.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
      {/* IZQUIERDA: BILLETES */}
      <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex items-center gap-3 mb-6 border-b pb-4 text-blue-700">
          <div className="p-2 rounded-lg bg-blue-100"><Banknote /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Billetes Kiosco</h2>
            <p className="text-xs text-slate-500">Solo efectivo de caja general</p>
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
                  className="border p-2 rounded-lg w-24 text-center font-bold text-slate-700 outline-none focus:ring-blue-500 border-slate-300"
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
          <p className="text-4xl font-bold mt-1 text-blue-700">${totalFisico.toLocaleString()}</p>
        </div>
      </div>

      {/* DERECHA: RESULTADOS */}
      <div className="w-full md:w-1/2 flex flex-col gap-4">
        <div className="p-6 rounded-xl shadow-sm border-l-4 border-blue-600 bg-white flex-1 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-slate-700 text-lg">Detalle Kiosco</h3>
              <p className="text-xs text-slate-400">Movimientos del sistema</p>
            </div>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600"><Wallet size={20} /></div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between bg-blue-50 p-2 rounded text-blue-800 font-bold"><span>Saldo Inicial</span> <span>+ ${datos.saldo_inicial}</span></div>
            <div className="flex justify-between px-2"><span>Ventas</span> <span className="font-semibold text-green-600">+ ${datos.ventas}</span></div>
            <div className="flex justify-between px-2"><span>Cobros</span> <span className="font-semibold text-green-600">+ ${datos.cobros}</span></div>
            <div className="flex justify-between px-2 text-red-500"><span>Gastos/Pagos</span> <span className="font-semibold">- ${datos.gastos + datos.pagos}</span></div>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-baseline">
            <span className="text-xs font-bold text-slate-400 uppercase">Debes tener</span>
            <span className="text-4xl font-bold text-slate-800">$ {datos.esperado}</span>
          </div>
        </div>

        {/* TARJETA RESULTADO (LÓGICA ESTÁNDAR) */}
        <div className={`p-6 rounded-xl shadow-sm border border-slate-200 text-center transition-colors ${esPerfecto ? "bg-green-50" : esFaltante ? "bg-red-50" : "bg-blue-50"}`}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Resultado</p>
            <div className="flex justify-center items-center gap-2 mb-2">
                {/* Si esFaltante (diferencia < 0), mostramos el signo automáticamente por ser negativo.
                   Si esSobrante (diferencia > 0), agregamos el signo "+" manualmente.
                */}
                <span className={`text-4xl font-bold ${esPerfecto ? "text-green-600" : esFaltante ? "text-red-600" : "text-blue-600"}`}>
                    {esSobrante ? "+" : ""}${diferencia.toLocaleString()}
                </span>
            </div>
            <div className="flex justify-center gap-2 text-sm font-medium">
                {esPerfecto && <span className="text-green-700 flex items-center gap-1"><CheckCircle size={16}/> Perfecto</span>}
                {!esPerfecto && <span className={`${esFaltante ? "text-red-700" : "text-blue-700"} flex items-center gap-1`}>
                    <AlertTriangle size={16}/> {esFaltante ? "Faltante" : "Sobrante"}
                </span>}
            </div>
        </div>

        <button onClick={guardarCierre} className="w-full text-white py-4 rounded-xl font-bold shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 flex justify-center items-center gap-2">
            <Save size={20} /> CERRAR CAJA KIOSCO
        </button>
      </div>
    </div>
  );
}

export default CierreGeneral;