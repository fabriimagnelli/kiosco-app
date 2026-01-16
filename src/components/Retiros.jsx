import React, { useState, useEffect } from "react";
import { TrendingUp, FileText } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

function Retiros() {
  const [historial, setHistorial] = useState([]);
  const [totalAcumulado, setTotalAcumulado] = useState(0);

  useEffect(() => {
    fetch("http://localhost:3001/api/retiros")
      .then(res => res.json())
      .then(data => {
        setHistorial(data.historial);
        setTotalAcumulado(data.total);
      });
  }, []);

  const descargarPDF = (item) => {
    const doc = new jsPDF();
    
    // TÍTULO
    doc.setFontSize(22);
    doc.text("COMPROBANTE DE RETIRO", 14, 20);
    doc.setFontSize(10);
    doc.text(`ID Transacción: #${item.id}`, 14, 26);
    doc.text(`Fecha: ${new Date(item.fecha).toLocaleString()}`, 14, 32);

    // LÍNEA SEPARADORA
    doc.setLineWidth(0.5);
    doc.line(14, 36, 196, 36);

    // DATOS PRINCIPALES
    doc.setFontSize(14);
    doc.text(`Monto Retirado: $ ${item.monto.toLocaleString()}`, 14, 46);
    doc.setFontSize(12);
    doc.text(`Concepto: ${item.descripcion}`, 14, 54);

    // DETALLE COMPLETO DEL CIERRE (SI EXISTE)
    if (item.tipo === "CIERRE" && item.cierre_id) {
        doc.line(14, 60, 196, 60);
        doc.setFontSize(14);
        doc.text("DETALLES DEL CIERRE DE CAJA", 14, 70);
        
        const detalles = [
            ["Ventas Totales", `$ ${item.total_ventas?.toLocaleString()}`],
            ["Total Gastos", `$ ${item.total_gastos?.toLocaleString()}`],
            ["Dinero Físico (Contado)", `$ ${item.total_fisico?.toLocaleString()}`],
            ["Diferencia de Caja", `$ ${item.diferencia?.toLocaleString()}`]
        ];

        doc.autoTable({
            startY: 75,
            head: [['Concepto', 'Monto']],
            body: detalles,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }, // Azul
        });
    }

    // PIE DE PÁGINA
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text("Documento generado automáticamente por Sistema Kiosco.", 14, pageHeight - 10);
    
    doc.save(`retiro_${item.id}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6">
      
      {/* TARJETA BALANCE */}
      <div className="bg-slate-800 text-white p-8 rounded-2xl shadow-xl flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingUp size={120}/></div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Fondo Acumulado (Retiros)</h2>
        <p className="text-6xl font-bold mt-2 text-green-400">$ {totalAcumulado.toLocaleString()}</p>
        <p className="mt-2 text-sm text-slate-400">Dinero total retirado de la caja y guardado.</p>
      </div>

      {/* TABLA HISTORIAL */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-700">Movimientos de Retiros</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase sticky top-0">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-right">Monto</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm text-slate-600">{new Date(item.fecha).toLocaleString()}</td>
                  <td className="p-4 font-medium text-slate-700">{item.descripcion}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.monto >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className={`p-4 text-right font-bold text-lg ${item.monto >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {item.monto >= 0 ? '+' : ''} $ {item.monto.toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    {(item.tipo === "CIERRE" || item.monto > 0) && (
                      <button onClick={() => descargarPDF(item)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Descargar Comprobante">
                        <FileText size={20}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Retiros;