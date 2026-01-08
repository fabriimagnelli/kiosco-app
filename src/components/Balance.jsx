import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Balance() {
  // Fechas por defecto: Primer día del mes hasta hoy
  const hoy = new Date().toISOString().split('T')[0];
  const primerDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [desde, setDesde] = useState(primerDia);
  const [hasta, setHasta] = useState(hoy);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  const calcularBalance = () => {
    setCargando(true);
    setDatos(null); // Limpiar datos previos para evitar errores visuales

    // CORRECCIÓN: Agregado /api/ a la URL
    fetch(`http://localhost:3001/api/balance_rango?desde=${desde}&hasta=${hasta}`)
      .then(res => {
        if (!res.ok) throw new Error("Error en el servidor");
        return res.json();
      })
      .then(data => {
        setDatos(data);
      })
      .catch(err => {
        console.error(err);
        alert("Error al calcular el balance. Asegúrate de haber actualizado el archivo server/index.js");
      })
      .finally(() => setCargando(false));
  };

  const generarPDF = () => {
    if (!datos) return;
    const doc = new jsPDF();

    // Título
    doc.setFontSize(22);
    doc.text("Balance General de Movimientos", 105, 20, null, null, "center");
    
    doc.setFontSize(12);
    doc.text(`Período: ${new Date(desde+"T00:00:00").toLocaleDateString("es-AR")} al ${new Date(hasta+"T00:00:00").toLocaleDateString("es-AR")}`, 105, 30, null, null, "center");

    doc.line(20, 35, 190, 35);

    // TABLA DE INGRESOS
    doc.setFontSize(14);
    doc.setTextColor(0, 150, 0); // Verde
    doc.text("INGRESOS (Entradas)", 14, 45);
    
    autoTable(doc, {
        startY: 50,
        head: [['Concepto', 'Monto']],
        body: [
            ['Ventas Kiosco (Efectivo)', `$ ${datos.ingresos.kiosco_efvo?.toLocaleString() || 0}`],
            ['Ventas Cigarrillos (Efectivo)', `$ ${datos.ingresos.cigarros_efvo?.toLocaleString() || 0}`],
            ['Ventas Digitales (MercadoPago/Tarj)', `$ ${datos.ingresos.digital?.toLocaleString() || 0}`],
            ['Cobros a Deudores', `$ ${datos.ingresos.cobros_deuda?.toLocaleString() || 0}`],
            ['TOTAL INGRESOS', `$ ${datos.total_ingresos?.toLocaleString() || 0}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] }
    });

    // TABLA DE EGRESOS
    const finalY = doc.lastAutoTable.finalY + 15; 
    doc.setTextColor(200, 0, 0); // Rojo
    doc.text("EGRESOS (Salidas)", 14, finalY);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Concepto', 'Monto']],
        body: [
            ['Gastos Operativos', `$ ${datos.egresos.gastos_varios?.toLocaleString() || 0}`],
            ['Pagos a Proveedores', `$ ${datos.egresos.pagos_proveedores?.toLocaleString() || 0}`],
            ['TOTAL EGRESOS', `$ ${datos.total_egresos?.toLocaleString() || 0}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [231, 76, 60] }
    });

    // RESULTADO FINAL
    const finalY2 = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    
    const textoResultado = datos.balance_neto >= 0 ? "GANANCIA DEL PERÍODO:" : "PÉRDIDA DEL PERÍODO:";
    doc.text(`${textoResultado} $ ${datos.balance_neto?.toLocaleString()}`, 105, finalY2, null, null, "center");

    doc.save(`Balance_${desde}_al_${hasta}.pdf`);
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">📅 Balance por Período</h2>

      {/* FILTROS DE FECHA */}
      <div className="bg-white p-6 rounded-lg shadow-md flex gap-4 items-end mb-6">
        <div>
            <label className="block text-gray-600 text-sm font-bold mb-1">Desde:</label>
            <input type="date" className="border p-2 rounded" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
            <label className="block text-gray-600 text-sm font-bold mb-1">Hasta:</label>
            <input type="date" className="border p-2 rounded" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button 
            onClick={calcularBalance}
            disabled={cargando}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-bold shadow transition-transform active:scale-95 disabled:bg-gray-400"
        >
            {cargando ? "Calculando..." : "🔍 Calcular Balance"}
        </button>
      </div>

      {/* RESULTADOS */}
      
      {datos && (
        <div className="animate-fade-in">
            <div className="flex gap-6 mb-6">
                
                {/* TARJETA VERDE (INGRESOS) */}
                <div className="w-1/3 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
                    <h3 className="text-green-800 font-bold text-lg mb-3">Ingresos</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Ventas Kiosco</span> <span className="font-bold">$ {datos.ingresos.kiosco_efvo?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Ventas Cigarros</span> <span className="font-bold">$ {datos.ingresos.cigarros_efvo?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Digitales (MP)</span> <span className="font-bold">$ {datos.ingresos.digital?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Cobro Deudas</span> <span className="font-bold">$ {datos.ingresos.cobros_deuda?.toLocaleString()}</span></div>
                        <hr className="border-green-200"/>
                        <div className="flex justify-between text-lg font-bold text-green-700"><span>TOTAL</span> <span>$ {datos.total_ingresos?.toLocaleString()}</span></div>
                    </div>
                </div>

                {/* TARJETA ROJA (EGRESOS) */}
                <div className="w-1/3 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                    <h3 className="text-red-800 font-bold text-lg mb-3">Egresos</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Gastos Operativos</span> <span className="font-bold">$ {datos.egresos.gastos_varios?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Pagos Proveedores</span> <span className="font-bold">$ {datos.egresos.pagos_proveedores?.toLocaleString()}</span></div>
                        <hr className="border-red-200"/>
                        <div className="flex justify-between text-lg font-bold text-red-700"><span>TOTAL</span> <span>$ {datos.total_egresos?.toLocaleString()}</span></div>
                    </div>
                </div>

                {/* TARJETA AZUL (RESULTADO) */}
                <div className="w-1/3 bg-white border border-gray-200 p-4 rounded shadow-sm flex flex-col justify-center items-center text-center">
                    <h3 className="text-gray-500 font-bold uppercase text-sm mb-2">Resultado Neto</h3>
                    <p className={`text-4xl font-bold ${datos.balance_neto >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        $ {datos.balance_neto?.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{datos.balance_neto >= 0 ? "Ganancia" : "Pérdida"}</p>
                </div>
            </div>

            <button 
                onClick={generarPDF}
                className="w-full bg-gray-800 hover:bg-black text-white py-4 rounded-lg font-bold text-xl flex justify-center items-center gap-2 shadow-lg"
            >
                📄 Descargar Reporte PDF Detallado
            </button>
        </div>
      )}
    </div>
  );
}

export default Balance;