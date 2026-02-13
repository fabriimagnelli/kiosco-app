import React, { useState, useEffect } from "react";
import { Archive, Cigarette, History, Calendar, DollarSign, TrendingUp, TrendingDown, ChevronLeft, ShoppingCart, Receipt, ArrowDown, Camera, X, Search, ChevronDown, ChevronUp } from "lucide-react";
import CierreGeneral from "./CierreGeneral";
import CierreCigarrillos from "./CierreCigarrillos";
import { apiFetch, API_BASE } from "../lib/api";

function Cierre() {
  const [tabActiva, setTabActiva] = useState("general");
  const [historial, setHistorial] = useState([]);
  const [cierreDetalle, setCierreDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    if (tabActiva === "historial") {
      apiFetch("/api/historial_cierres")
        .then(r => r.json())
        .then(data => setHistorial(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }
  }, [tabActiva]);

  const verDetalle = async (id) => {
    if (expandido === id) { setExpandido(null); setCierreDetalle(null); return; }
    setCargandoDetalle(true);
    setExpandido(id);
    try {
      const res = await apiFetch(`/api/historial_cierres/${id}`);
      const data = await res.json();
      setCierreDetalle(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const historialFiltrado = historial.filter(c => {
    const pasaTipo = filtroTipo === "todos" || 
      (filtroTipo === "general" && c.tipo !== "cigarrillos") || 
      (filtroTipo === "cigarrillos" && c.tipo === "cigarrillos");
    const pasaBusqueda = !busqueda || 
      (c.observacion && c.observacion.toLowerCase().includes(busqueda.toLowerCase())) ||
      new Date(c.fecha).toLocaleString("es-AR").includes(busqueda);
    return pasaTipo && pasaBusqueda;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* --- ENCABEZADO CON PESTAÑAS --- */}
      <div className="bg-white border-b border-slate-200 px-6 pt-6 pb-0 shadow-sm z-10">
        <h1 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tight">Cierre de Caja</h1>
        
        <div className="flex gap-8">
          <button
            onClick={() => setTabActiva("general")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              tabActiva === "general"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            <Archive size={18} />
            CAJA GENERAL
          </button>

          <button
            onClick={() => setTabActiva("cigarrillos")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              tabActiva === "cigarrillos"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            <Cigarette size={18} />
            CIGARRILLOS
          </button>

          <button
            onClick={() => setTabActiva("historial")}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              tabActiva === "historial"
                ? "border-green-600 text-green-600"
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            }`}
          >
            <History size={18} />
            HISTORIAL
          </button>
        </div>
      </div>

      {/* --- CONTENIDO DE LA PESTAÑA SELECCIONADA --- */}
      <div className="flex-1 overflow-hidden relative">
        {tabActiva === "general" ? (
          <CierreGeneral />
        ) : tabActiva === "cigarrillos" ? (
          <CierreCigarrillos />
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                  <History size={24} className="text-green-600"/> Historial de Cierres
                </h2>
                
                {/* Filtros */}
                <div className="flex gap-3 flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none"
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                    />
                  </div>
                  <select
                    value={filtroTipo}
                    onChange={e => setFiltroTipo(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                  >
                    <option value="todos">Todos</option>
                    <option value="general">General</option>
                    <option value="cigarrillos">Cigarrillos</option>
                  </select>
                </div>
              </div>

              {historialFiltrado.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                  No hay cierres registrados que coincidan con los filtros.
                </div>
              ) : (
                <div className="space-y-3">
                  {historialFiltrado.map((c) => (
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      {/* Cabecera del cierre (click para expandir) */}
                      <button
                        onClick={() => verDetalle(c.id)}
                        className="w-full p-5 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${c.tipo === 'cigarrillos' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                              {c.tipo === 'cigarrillos' ? <Cigarette size={20}/> : <Archive size={20}/>}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700">{c.tipo === 'cigarrillos' ? 'Cierre Cigarrillos' : 'Cierre General'}</p>
                              <p className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar size={14}/> {new Date(c.fecha).toLocaleString('es-AR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-6 text-sm items-center">
                            <div className="text-center">
                              <p className="text-slate-400 text-xs font-bold">Ventas</p>
                              <p className="font-bold text-green-600 flex items-center gap-1"><TrendingUp size={14}/> ${(c.total_ventas || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-slate-400 text-xs font-bold">Gastos</p>
                              <p className="font-bold text-red-600 flex items-center gap-1"><TrendingDown size={14}/> ${(c.total_gastos || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-slate-400 text-xs font-bold">Efectivo Real</p>
                              <p className="font-bold text-slate-800 flex items-center gap-1"><DollarSign size={14}/> ${(c.total_efectivo_real || 0).toLocaleString()}</p>
                            </div>
                            {c.monto_retiro > 0 && (
                              <div className="text-center">
                                <p className="text-slate-400 text-xs font-bold">Retiro</p>
                                <p className="font-bold text-purple-600">${(c.monto_retiro || 0).toLocaleString()}</p>
                              </div>
                            )}
                            {expandido === c.id ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                          </div>
                        </div>
                        {c.observacion && (
                          <p className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {c.observacion}
                          </p>
                        )}
                      </button>

                      {/* Detalle expandido */}
                      {expandido === c.id && (
                        <div className="border-t border-slate-100 p-5 bg-slate-50 animate-in slide-in-from-top-1 duration-200">
                          {cargandoDetalle ? (
                            <div className="flex justify-center py-8">
                              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            </div>
                          ) : cierreDetalle && cierreDetalle.id === c.id ? (
                            <div className="space-y-4">
                              {/* Resumen de cifras */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white p-3 rounded-lg border">
                                  <p className="text-xs text-slate-400 font-bold">Ventas Efectivo</p>
                                  <p className="text-lg font-bold text-green-600">${(cierreDetalle.detalle?.ventas_efectivo || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border">
                                  <p className="text-xs text-slate-400 font-bold">Ventas Digital</p>
                                  <p className="text-lg font-bold text-purple-600">${(cierreDetalle.detalle?.ventas_digital || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border">
                                  <p className="text-xs text-slate-400 font-bold">Tickets</p>
                                  <p className="text-lg font-bold text-slate-700">{cierreDetalle.detalle?.cantidad_tickets || 0}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border">
                                  <p className="text-xs text-slate-400 font-bold">Total Retiros</p>
                                  <p className="text-lg font-bold text-orange-600">${(cierreDetalle.detalle?.total_retiros || 0).toLocaleString()}</p>
                                </div>
                              </div>

                              {/* Productos más vendidos en este cierre */}
                              {cierreDetalle.detalle?.ventas_por_producto?.length > 0 && (
                                <div className="bg-white rounded-lg border p-4">
                                  <h4 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1"><ShoppingCart size={14}/> Productos Vendidos</h4>
                                  <div className="max-h-48 overflow-y-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-xs text-slate-400 border-b">
                                          <th className="text-left py-1">Producto</th>
                                          <th className="text-center py-1">Cant.</th>
                                          <th className="text-right py-1">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cierreDetalle.detalle.ventas_por_producto.map((p, i) => (
                                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="py-1.5 text-slate-700">{p.nombre}</td>
                                            <td className="py-1.5 text-center text-slate-500">{p.cantidad}</td>
                                            <td className="py-1.5 text-right font-bold text-slate-700">${p.total.toLocaleString()}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Gastos de este cierre */}
                              {cierreDetalle.detalle?.gastos?.length > 0 && (
                                <div className="bg-white rounded-lg border p-4">
                                  <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1"><ArrowDown size={14}/> Gastos</h4>
                                  <div className="space-y-1">
                                    {cierreDetalle.detalle.gastos.map((g, i) => (
                                      <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-50">
                                        <span className="text-slate-600">{g.descripcion || 'Sin descripción'}</span>
                                        <span className="font-bold text-red-600">-${g.monto.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Foto del arqueo */}
                              {c.foto_arqueo && (
                                <div className="bg-white rounded-lg border p-4">
                                  <h4 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-1"><Camera size={14}/> Foto del Arqueo</h4>
                                  <img 
                                    src={`${API_BASE}/uploads/${c.foto_arqueo}`} 
                                    alt="Arqueo" 
                                    className="max-w-sm rounded-lg border shadow-md cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(`${API_BASE}/uploads/${c.foto_arqueo}`, '_blank')}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-center text-slate-400 py-4">Error al cargar detalle</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cierre;