import React, { useState, useEffect } from "react";
import { TrendingUp, FileText, RefreshCw, Trash2, PlusCircle, MinusCircle, X } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { apiFetch } from "../lib/api";

function Retiros() {
  const [historial, setHistorial] = useState([]);
  const [totalAcumulado, setTotalAcumulado] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [eliminando, setEliminando] = useState(null);

  // Modal de ajuste
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState("aumento"); // "aumento" | "disminucion"
  const [montoAjuste, setMontoAjuste] = useState("");
  const [notaAjuste, setNotaAjuste] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarRetiros = async () => {
    setCargando(true);
    try {
      const res = await apiFetch("/api/retiros");
      const data = await res.json();
      setHistorial(data.historial || []);
      setTotalAcumulado(data.total || 0);
    } catch (error) {
      console.error("Error cargando retiros:", error);
    } finally {
      setCargando(false);
    }
  };

  const eliminarRetiro = async (item) => {
    const confirmado = window.confirm(
      `¿Eliminar este retiro?\n\n"${item.descripcion}" — $ ${item.monto.toLocaleString()}\n\nEl monto volverá a estar disponible en caja como si nunca se hubiera retirado.`
    );
    if (!confirmado) return;
    setEliminando(item.id);
    try {
      const res = await apiFetch(`/api/retiros/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await cargarRetiros();
      } else {
        alert("Error al eliminar: " + (data.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error eliminando retiro:", error);
      alert("Error de conexión al eliminar el retiro.");
    } finally {
      setEliminando(null);
    }
  };

  const abrirModal = () => {
    setTipoAjuste("aumento");
    setMontoAjuste("");
    setNotaAjuste("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
  };

  const confirmarAjuste = async () => {
    const monto = parseFloat(montoAjuste);
    if (!montoAjuste || isNaN(monto) || monto <= 0) {
      alert("Ingresá un monto válido mayor a 0.");
      return;
    }
    if (!notaAjuste.trim()) {
      alert("La nota es obligatoria para registrar el ajuste.");
      return;
    }
    setGuardando(true);
    try {
      const montoFinal = tipoAjuste === "aumento" ? monto : -monto;
      const descripcion = `Ajuste Manual: ${notaAjuste.trim()}`;
      const res = await apiFetch("/api/retiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion, monto: montoFinal }),
      });
      const data = await res.json();
      if (data.success) {
        setModalAbierto(false);
        await cargarRetiros();
      } else {
        alert("Error al guardar: " + (data.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error guardando ajuste:", error);
      alert("Error de conexión al guardar el ajuste.");
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    cargarRetiros();
  }, []);

  const descargarPDF = (item) => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text("COMPROBANTE DE RETIRO", 14, 20);
    doc.setFontSize(10);
    doc.text(`ID Transacción: #${item.id}`, 14, 26);
    doc.text(`Fecha: ${new Date(item.fecha).toLocaleString()}`, 14, 32);

    doc.setLineWidth(0.5);
    doc.line(14, 36, 196, 36);

    doc.setFontSize(14);
    doc.text(`Monto Retirado: $ ${item.monto.toLocaleString()}`, 14, 46);
    doc.setFontSize(12);
    doc.text(`Concepto: ${item.descripcion}`, 14, 54);

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
            headStyles: { fillColor: [41, 128, 185] },
        });
    }

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text("Documento generado automáticamente por Sistema Kiosco.", 14, pageHeight - 10);

    doc.save(`retiro_${item.id}.pdf`);
  };

  const getBadge = (item) => {
    if (item.tipo === "CIERRE") return { label: "CIERRE", cls: "bg-blue-100 text-blue-700" };
    if (item.monto > 0) return { label: "INGRESO", cls: "bg-green-100 text-green-700" };
    return { label: "EGRESO", cls: "bg-orange-100 text-orange-700" };
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-4 md:p-6 gap-4 md:gap-6">

      {/* TARJETA BALANCE */}
      <div className="bg-slate-800 text-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingUp size={120}/></div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Fondo Acumulado (Retiros)</h2>
        <p className="text-3xl md:text-6xl font-extrabold mt-2 text-green-400 tracking-tight">$ {totalAcumulado.toLocaleString()}</p>
        <p className="mt-2 text-sm text-slate-400">Dinero total retirado de la caja y guardado.</p>
        <button
          onClick={abrirModal}
          className="mt-5 flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold px-5 py-2.5 rounded-xl border border-white/20"
        >
          <PlusCircle size={18} />
          Ajustar Fondo
        </button>
      </div>

      {/* TABLA HISTORIAL */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Movimientos de Retiros</h3>
          <button
            onClick={cargarRetiros}
            disabled={cargando}
            className="p-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw size={20} className={cargando ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left min-w-[600px]">
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
              {historial.map((item) => {
                const badge = getBadge(item);
                return (
                  <tr key={item.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-600">{new Date(item.fecha).toLocaleString()}</td>
                    <td className="p-4 font-medium text-slate-700">{item.descripcion}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold text-lg ${item.monto >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.monto >= 0 ? '+' : ''} $ {item.monto.toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(item.tipo === "CIERRE" || item.monto > 0) && (
                          <button onClick={() => descargarPDF(item)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Descargar Comprobante">
                            <FileText size={20}/>
                          </button>
                        )}
                        {item.tipo === "MANUAL" && (
                          <button
                            onClick={() => eliminarRetiro(item)}
                            disabled={eliminando === item.id}
                            className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40"
                            title="Eliminar retiro"
                          >
                            <Trash2 size={20} className={eliminando === item.id ? "animate-pulse" : ""}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AJUSTE DE FONDO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Ajuste Manual de Fondo</h2>
              <button onClick={cerrarModal} disabled={guardando} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4">
              {/* Tipo de ajuste */}
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-2 block">Tipo de ajuste</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTipoAjuste("aumento")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition-all ${
                      tipoAjuste === "aumento"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <PlusCircle size={18} />
                    Aumentar
                  </button>
                  <button
                    onClick={() => setTipoAjuste("disminucion")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition-all ${
                      tipoAjuste === "disminucion"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <MinusCircle size={18} />
                    Disminuir
                  </button>
                </div>
              </div>

              {/* Monto */}
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoAjuste}
                    onChange={(e) => setMontoAjuste(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Nota */}
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Nota <span className="text-red-400">*</span></label>
                <textarea
                  value={notaAjuste}
                  onChange={(e) => setNotaAjuste(e.target.value)}
                  placeholder="Explicá el motivo del ajuste (ej: cobré factura olvidada, entregué dinero a proveedor sin registrar...)"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none text-sm"
                />
              </div>

              {/* Preview */}
              {montoAjuste && parseFloat(montoAjuste) > 0 && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold ${
                  tipoAjuste === "aumento" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  <span>Fondo resultante:</span>
                  <span className="text-lg">
                    $ {(totalAcumulado + (tipoAjuste === "aumento" ? parseFloat(montoAjuste) : -parseFloat(montoAjuste))).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button
                onClick={cerrarModal}
                disabled={guardando}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAjuste}
                disabled={guardando}
                className={`flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
                  tipoAjuste === "aumento" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {guardando ? "Guardando..." : tipoAjuste === "aumento" ? "Confirmar Aumento" : "Confirmar Disminución"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Retiros;
