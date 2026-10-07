import React, { useState, useEffect } from "react";
import { DollarSign, Calendar, Tag, Plus, Trash2, Edit2, Filter, TrendingDown, X, Save } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useNotify } from "../context/NotificationContext";

function Gastos() {
  const { toast, confirmDialog } = useNotify();
  const [gastos, setGastos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal y Formulario
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);

  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("General");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [proveedorId, setProveedorId] = useState("");

  // Estados para Filtros
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  // Lista de Categorías Fijas
  const CATEGORIAS = [
    "General",
    "Proveedores",
    "Mercadería",
    "Servicios (Luz/Agua/Internet)",
    "Alquiler",
    "Sueldos",
    "Mantenimiento",
    "Impuestos",
    "Retiros Personales",
    "Otros"
  ];

  useEffect(() => {
    cargarGastos();
    cargarProveedores();
  }, []);

  const cargarGastos = () => {
    apiFetch("/api/gastos")
      .then((res) => res.json())
      .then((data) => {
        setGastos(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  };

  const cargarProveedores = () => {
    apiFetch("/api/proveedores")
      .then((res) => res.json())
      .then((data) => setProveedores(data || []))
      .catch((err) => console.error(err));
  };

  const abrirNuevoGasto = () => {
    setDescripcion("");
    setMonto("");
    setCategoria("General");
    setMetodoPago("Efectivo");
    setProveedorId("");
    setModoEdicion(false);
    setIdEdicion(null);
    setModalAbierto(true);
  };

  const abrirEditarGasto = (g) => {
    setDescripcion(g.descripcion || "");
    setMonto(String(g.monto || ""));
    setCategoria(g.categoria || "General");
    setMetodoPago(g.metodo_pago || "Efectivo");
    setProveedorId("");
    setModoEdicion(true);
    setIdEdicion(g.id);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setIdEdicion(null);
    setDescripcion("");
    setMonto("");
    setCategoria("General");
    setProveedorId("");
    setMetodoPago("Efectivo");
  };

  const guardarGasto = async (e) => {
    e.preventDefault();
    if (!descripcion || !monto) return toast("Completa todos los campos", "warn");
    if (!modoEdicion && categoria === "Proveedores" && !proveedorId) {
      return toast("Selecciona un proveedor", "warn");
    }

    try {
      if (modoEdicion) {
        const res = await apiFetch(`/api/gastos/${idEdicion}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descripcion,
            monto: parseFloat(monto),
            categoria,
            metodo_pago: metodoPago
          })
        });
        const data = await res.json();
        if (data.success) {
          cerrarModal();
          cargarGastos();
          toast("Gasto modificado correctamente", "ok");
        } else {
          toast("Error al modificar el gasto", "err");
        }
      } else {
        // Si es pago a proveedor, registrar en movimientos_proveedores
        if (categoria === "Proveedores" && proveedorId) {
          const res = await apiFetch("/api/movimientos_proveedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proveedor_id: parseInt(proveedorId),
              monto: -parseFloat(monto), // Negativo porque es un pago
              descripcion: descripcion,
              metodo_pago: metodoPago
            })
          });
          const data = await res.json();
          if (data.success) {
            cerrarModal();
            cargarGastos();
            toast("Pago registrado correctamente", "ok");
          } else {
            toast("Error al registrar el pago", "err");
          }
        } else {
          // Para otros gastos, registrar normalmente en gastos
          const nuevoGasto = {
            descripcion,
            monto: parseFloat(monto),
            categoria,
            metodo_pago: metodoPago,
          };

          const res = await apiFetch("/api/gastos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevoGasto),
          });
          const data = await res.json();
          if (data.success) {
            cerrarModal();
            cargarGastos();
            toast("Gasto registrado correctamente", "ok");
          } else {
            toast("Error al guardar", "err");
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast("Error al guardar", "err");
    }
  };

  const eliminarGasto = async (id) => {
    if (!(await confirmDialog("¿Eliminar este gasto?"))) return;
    try {
      await apiFetch(`/api/gastos/${id}`, { method: "DELETE" });
      cargarGastos();
      toast("Gasto eliminado", "ok");
    } catch (error) {
      console.error(error);
      toast("Error al eliminar", "err");
    }
  };

  // --- LÓGICA TOTAL DEL MES ---
  const calcularTotalMes = () => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    return gastos.reduce((total, gasto) => {
      const fechaGasto = new Date(gasto.fecha);
      if (fechaGasto.getMonth() === mesActual && fechaGasto.getFullYear() === anioActual) {
        return total + (parseFloat(gasto.monto) || 0);
      }
      return total;
    }, 0);
  };

  // --- LÓGICA DE FILTRADO ---
  const gastosFiltrados = gastos.filter((gasto) => {
    let coincideFecha = true;
    if (filtroFecha) {
      const fechaGasto = new Date(gasto.fecha).toISOString().split("T")[0];
      coincideFecha = fechaGasto === filtroFecha;
    }

    let coincideCategoria = true;
    if (filtroCategoria !== "Todas") {
      coincideCategoria = gasto.categoria === filtroCategoria;
    }

    return coincideFecha && coincideCategoria;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto">
      
      {/* HEADER Y TOTAL DEL MES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
            <TrendingDown className="text-red-600" size={32} /> Control de Gastos
          </h1>
          <p className="text-slate-500 mt-1">Registra las salidas de dinero y pagos de tu caja.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-red-50 px-5 py-3 rounded-xl border border-red-100 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-full text-red-600 shadow-sm">
              <Calendar size={20}/>
            </div>
            <div>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Total Gastos ({new Date().toLocaleString('es-AR', { month: 'long' })})</p>
              <p className="text-xl font-extrabold text-slate-800">$ {calcularTotalMes().toLocaleString()}</p>
            </div>
          </div>

          <button
            onClick={abrirNuevoGasto}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            <span>Nuevo Gasto</span>
          </button>
        </div>
      </div>

      {/* LISTADO DE GASTOS A PANTALLA COMPLETA */}
      <div className="space-y-4">
        
        {/* BARRA DE FILTROS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-slate-400"/>
            <span className="text-sm font-bold text-slate-700">Filtrar listado:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            <div className="relative flex-1 sm:flex-none">
              <input 
                type="date"
                className="w-full sm:w-44 p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-slate-600"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>

            <div className="relative flex-1 sm:flex-none">
              <select 
                className="w-full sm:w-48 p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-slate-600 bg-white"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="Todas">Todas las Categorías</option>
                {CATEGORIAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {(filtroFecha || filtroCategoria !== "Todas") && (
              <button 
                onClick={() => { setFiltroFecha(""); setFiltroCategoria("Todas"); }}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
              >
                Limpiar filtros
              </button>
            )}

            <span className="text-xs text-slate-400 ml-2 hidden md:inline">
              {gastosFiltrados.length} gasto{gastosFiltrados.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* TABLA DE RESULTADOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[62vh] custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="p-4 border-b border-slate-200 bg-slate-50">Fecha y Hora</th>
                  <th className="p-4 border-b border-slate-200 bg-slate-50">Descripción</th>
                  <th className="p-4 border-b border-slate-200 bg-slate-50">Categoría</th>
                  <th className="p-4 border-b border-slate-200 bg-slate-50">Método de Pago</th>
                  <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Monto</th>
                  <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {gastosFiltrados.length > 0 ? (
                  gastosFiltrados.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        <span className="font-medium text-slate-700">{new Date(g.fecha).toLocaleDateString()}</span>
                        <span className="block text-xs text-slate-400">{new Date(g.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hs</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{g.descripcion}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          <Tag size={12} className="text-slate-400" />
                          {g.categoria}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {g.metodo_pago}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-red-600 text-base whitespace-nowrap">
                        - $ {Number(g.monto || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => abrirEditarGasto(g)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar gasto"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => eliminarGasto(g.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400">
                      <TrendingDown size={36} className="mx-auto mb-2 opacity-30 text-slate-400" />
                      <p className="font-medium text-slate-500">No se encontraron gastos con los filtros seleccionados.</p>
                      <button
                        onClick={abrirNuevoGasto}
                        className="mt-3 text-red-600 hover:text-red-700 text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Plus size={14} /> Registrar un nuevo gasto ahora
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Mostrando {gastosFiltrados.length} de {gastos.length} gastos</span>
            <span className="font-bold text-slate-700">Total filtrado: $ {gastosFiltrados.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* ==================== MODAL REGISTRAR / EDITAR GASTO ==================== */}
      {modalAbierto && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-100">
            
            {/* CABECERA DEL MODAL */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${modoEdicion ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                  {modoEdicion ? <Edit2 size={22} /> : <TrendingDown size={22} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {modoEdicion ? "Editar Gasto" : "Nuevo Gasto"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {modoEdicion ? "Modifica los datos del gasto registrado" : "Registra una salida de dinero de tu caja"}
                  </p>
                </div>
              </div>
              <button 
                onClick={cerrarModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* CUERPO DEL MODAL (FORMULARIO) */}
            <form onSubmit={guardarGasto} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Descripción *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ej: Pago Proveedor Coca-Cola, Factura Luz..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm text-slate-800"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Monto ($) *</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-3 text-slate-400"/>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-black text-slate-800 text-base"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Categoría</label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                  <select
                    className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white text-sm text-slate-700 font-medium"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!modoEdicion && categoria === "Proveedores" && (
                <div className="animate-in fade-in duration-200 bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
                  <label className="block text-xs font-bold text-blue-900 mb-1.5">Seleccionar Proveedor *</label>
                  <select
                    className="w-full p-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-700 text-sm"
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                  >
                    <option value="">-- Selecciona un proveedor --</option>
                    {proveedores.map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-blue-600 mt-1">Este pago quedará reflejado en la cuenta corriente del proveedor.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Efectivo", "Transferencia", "Retiros"].map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoPago(metodo)}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition-all text-center ${
                        metodoPago === metodo
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIE DE ACCIONES */}
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 text-sm ${
                    modoEdicion ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {modoEdicion ? <Save size={16} /> : <Plus size={16} />}
                  {modoEdicion ? "Guardar Cambios" : "Registrar Gasto"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Gastos;