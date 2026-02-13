import React, { useState, useEffect } from "react";
import { Building2, Search, Calendar, DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Save, History, ChevronDown, ChevronUp, Download } from "lucide-react";
import { apiFetch } from "../lib/api";

function Conciliacion() {
  // Fechas por defecto: última semana
  const hoy = new Date().toISOString().split('T')[0];
  const haceUnaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [desde, setDesde] = useState(haceUnaSemana);
  const [hasta, setHasta] = useState(hoy);
  const [datos, setDatos] = useState(null);
  const [montoBanco, setMontoBanco] = useState("");
  const [observacion, setObservacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [expandidoHist, setExpandidoHist] = useState(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const res = await apiFetch("/api/conciliacion/historial");
      const data = await res.json();
      setHistorial(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const buscarVentas = async () => {
    setCargando(true);
    setDatos(null);
    try {
      const res = await apiFetch(`/api/conciliacion/ventas_digitales?desde=${desde}&hasta=${hasta}`);
      if (!res.ok) throw new Error("Error del servidor");
      const data = await res.json();
      setDatos(data);
    } catch (err) {
      console.error(err);
      alert("Error al consultar ventas digitales.");
    } finally {
      setCargando(false);
    }
  };

  const guardarConciliacion = async () => {
    if (!datos) return;
    const totalBanco = parseFloat(montoBanco) || 0;
    const diferencia = totalBanco - datos.total_sistema;

    if (!confirm(`¿Guardar conciliación?\nSistema: $${datos.total_sistema.toLocaleString()}\nBanco: $${totalBanco.toLocaleString()}\nDiferencia: $${diferencia.toLocaleString()}`)) return;

    setGuardando(true);
    try {
      const res = await apiFetch("/api/conciliacion", {
        method: "POST",
        body: JSON.stringify({
          fecha_desde: desde,
          fecha_hasta: hasta,
          total_sistema: datos.total_sistema,
          total_banco: totalBanco,
          diferencia: diferencia,
          observacion: observacion,
          items: datos.por_dia
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Conciliación guardada correctamente");
        setMontoBanco("");
        setObservacion("");
        cargarHistorial();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const diferencia = datos ? (parseFloat(montoBanco) || 0) - datos.total_sistema : 0;

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
            <Building2 className="text-indigo-600" size={28} />
            Conciliación Bancaria
          </h1>
          <p className="text-slate-500 text-sm mt-1">Compará las ventas digitales del sistema con tu extracto bancario.</p>
        </div>

        {/* FILTROS */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
            </div>
            <button
              onClick={buscarVentas}
              disabled={cargando}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              <Search size={16}/> {cargando ? "Consultando..." : "Consultar"}
            </button>
          </div>
        </div>

        {/* RESULTADOS */}
        {datos && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Cards resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Sistema (Digital)</p>
                <p className="text-2xl font-bold text-indigo-600">${datos.total_sistema.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">{datos.ventas.length} transacciones</p>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Banco / Extracto</p>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ingresá el monto del banco"
                  className="w-full text-2xl font-bold text-slate-800 border-b-2 border-indigo-300 focus:border-indigo-600 outline-none p-1"
                  value={montoBanco}
                  onChange={e => setMontoBanco(e.target.value)}
                />
              </div>
              
              <div className={`p-5 rounded-xl border shadow-sm ${
                !montoBanco ? 'bg-slate-50 border-slate-200' :
                Math.abs(diferencia) < 1 ? 'bg-green-50 border-green-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Diferencia</p>
                <p className={`text-2xl font-bold ${
                  !montoBanco ? 'text-slate-400' :
                  Math.abs(diferencia) < 1 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {!montoBanco ? '-' : `$${diferencia.toLocaleString()}`}
                </p>
                {montoBanco && Math.abs(diferencia) < 1 && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={12}/> Concilia correctamente</p>
                )}
                {montoBanco && Math.abs(diferencia) >= 1 && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1"><AlertTriangle size={12}/> Hay diferencia</p>
                )}
              </div>
            </div>

            {/* Desglose por día */}
            {datos.por_dia?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="p-4 font-bold text-slate-700 flex items-center gap-2 border-b border-slate-100">
                  <Calendar size={18} className="text-indigo-600"/> Desglose por Día
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500">
                      <th className="text-left p-3">Fecha</th>
                      <th className="text-center p-3">Transacciones</th>
                      <th className="text-right p-3">Total Digital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.por_dia.map((d, i) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-700">
                          {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-AR')}
                        </td>
                        <td className="p-3 text-center text-slate-500">{d.cantidad}</td>
                        <td className="p-3 text-right font-bold text-indigo-600">${d.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold">
                      <td className="p-3">TOTAL</td>
                      <td className="p-3 text-center">{datos.ventas.length}</td>
                      <td className="p-3 text-right">${datos.total_sistema.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Observación y Guardar */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <input
                type="text"
                placeholder="Observación (opcional): Ej: Faltante por comisión MP, etc."
                className="w-full p-3 border border-slate-200 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-indigo-400 outline-none"
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
              />
              <button
                onClick={guardarConciliacion}
                disabled={guardando || !montoBanco}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <Save size={18}/> {guardando ? "Guardando..." : "Guardar Conciliación"}
              </button>
            </div>
          </div>
        )}

        {/* HISTORIAL DE CONCILIACIONES */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setVerHistorial(!verHistorial)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <span className="font-bold text-slate-700 flex items-center gap-2">
              <History size={18} className="text-indigo-600" /> Historial de Conciliaciones
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{historial.length} registros</span>
              {verHistorial ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
            </div>
          </button>

          {verHistorial && (
            <div className="border-t border-slate-100 max-h-96 overflow-y-auto">
              {historial.length === 0 ? (
                <p className="text-center text-slate-400 p-8">No hay conciliaciones guardadas aún.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historial.map((c) => (
                    <div key={c.id} className="p-4 hover:bg-slate-50">
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandidoHist(expandidoHist === c.id ? null : c.id)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {new Date(c.fecha_desde + 'T00:00:00').toLocaleDateString('es-AR')} — {new Date(c.fecha_hasta + 'T00:00:00').toLocaleDateString('es-AR')}
                            </p>
                            <p className="text-xs text-slate-400">{new Date(c.fecha).toLocaleString('es-AR')}</p>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 font-bold">Sistema</p>
                              <p className="font-bold text-indigo-600">${(c.total_sistema || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 font-bold">Banco</p>
                              <p className="font-bold text-slate-700">${(c.total_banco || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 font-bold">Diferencia</p>
                              <p className={`font-bold ${Math.abs(c.diferencia || 0) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                                ${(c.diferencia || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        {c.observacion && (
                          <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded">{c.observacion}</p>
                        )}
                      </button>

                      {expandidoHist === c.id && c.items?.length > 0 && (
                        <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs">
                          <p className="font-bold text-slate-500 mb-2">Desglose por día:</p>
                          {c.items.map((d, i) => (
                            <div key={i} className="flex justify-between py-1">
                              <span>{new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                              <span className="font-bold">${d.total?.toLocaleString()} ({d.cantidad} txns)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Conciliacion;
