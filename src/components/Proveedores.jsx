import React, { useState, useEffect, useMemo } from "react";
import {
  Truck, Plus, Search, Trash2, Edit2, Phone, MapPin, Calendar, Tag, Save, X,
  Eye, ClipboardList, DollarSign, ArrowUpRight, ArrowDownRight, Package,
  Clock, CheckCircle, AlertTriangle, RefreshCw, Bell, ShoppingCart, CreditCard
} from "lucide-react";
import { apiFetch } from "../lib/api";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const ESTADOS_ORDEN = {
  pendiente: { label: "Pendiente", color: "amber", icon: Clock },
  parcial: { label: "Parcial", color: "blue", icon: Package },
  recibido: { label: "Recibido", color: "emerald", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "red", icon: X },
};

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-AR") : "-";

// ─── TABS ─────────────────────────────────────────────
const TABS = [
  { id: "proveedores", label: "Proveedores", icon: Truck },
  { id: "ordenes", label: "Órdenes de Compra", icon: ClipboardList },
  { id: "calendario", label: "Calendario Visitas", icon: Calendar },
  { id: "deudas", label: "Deudas", icon: DollarSign },
];

function Proveedores() {
  const [tab, setTab] = useState("proveedores");

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      <div className="px-6 pt-5 pb-0">
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2 mb-4 tracking-tight">
          <Truck className="text-indigo-600" size={28} /> Proveedores y Compras
        </h2>
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        {tab === "proveedores" && <TabProveedores />}
        {tab === "ordenes" && <TabOrdenes />}
        {tab === "calendario" && <TabCalendario />}
        {tab === "deudas" && <TabDeudas />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 1: PROVEEDORES (ABM + historial movimientos)
// ═══════════════════════════════════════════════════════
function TabProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [diaVisita, setDiaVisita] = useState("");
  const [rubro, setRubro] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const [provSeleccionado, setProvSeleccionado] = useState(null);
  const [historialSeleccionado, setHistorialSeleccionado] = useState([]);
  const [mostrarFormDeuda, setMostrarFormDeuda] = useState(false);
  const [montoDeuda, setMontoDeuda] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("compra");
  const [descripcionDeuda, setDescripcionDeuda] = useState("");
  const [metodoDudaPago, setMetodoDudaPago] = useState("Efectivo");
  const [procesandoDeuda, setProcesandoDeuda] = useState(false);

  useEffect(() => { cargarProveedores(); }, []);

  const cargarProveedores = () => {
    apiFetch("/api/proveedores_con_saldo")
      .then((res) => res.json())
      .then(setProveedores)
      .catch(() => {
        apiFetch("/api/proveedores").then(r => r.json()).then(setProveedores);
      });
  };

  const prepararEdicion = (prov) => {
    setNombre(prov.nombre); setTelefono(prov.telefono || ""); setDireccion(prov.direccion || "");
    setDiaVisita(prov.dia_visita || ""); setRubro(prov.rubro || ""); setIdEdicion(prov.id); setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setNombre(""); setTelefono(""); setDireccion(""); setDiaVisita(""); setRubro("");
    setModoEdicion(false); setIdEdicion(null);
  };

  const verDetalles = (prov) => {
    setProvSeleccionado(prov);
    apiFetch(`/api/movimientos_proveedores/${prov.id}`)
      .then(res => res.json())
      .then(data => { setHistorialSeleccionado(data); setVerHistorial(true); })
      .catch(console.error);
  };

  const cerrarDetalles = () => {
    setVerHistorial(false); setProvSeleccionado(null); setHistorialSeleccionado([]);
    setMostrarFormDeuda(false); setMontoDeuda(""); setTipoMovimiento("compra"); setDescripcionDeuda("");
  };

  const registrarDeuda = async (e) => {
    e.preventDefault();
    if (!montoDeuda || parseFloat(montoDeuda) <= 0) return alert("Ingresa un monto válido");
    setProcesandoDeuda(true);
    try {
      const monto = tipoMovimiento === "pago" ? -parseFloat(montoDeuda) : parseFloat(montoDeuda);
      const desc = tipoMovimiento === "pago" ? ("Pago al " + (descripcionDeuda || "proveedor")) : (descripcionDeuda || "Compra");
      const res = await apiFetch("/api/movimientos_proveedores", {
        method: "POST", body: JSON.stringify({ proveedor_id: provSeleccionado.id, monto, descripcion: desc, metodo_pago: metodoDudaPago })
      });
      const data = await res.json();
      if (data.success || data.id) {
        apiFetch(`/api/movimientos_proveedores/${provSeleccionado.id}`).then(r => r.json()).then(setHistorialSeleccionado);
        setMontoDeuda(""); setTipoMovimiento("compra"); setDescripcionDeuda(""); setMostrarFormDeuda(false);
        cargarProveedores();
      } else { alert("Error: " + (data.error || "No se pudo registrar")); }
    } catch (error) { alert("Error: " + error.message); }
    finally { setProcesandoDeuda(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return alert("El nombre es obligatorio");
    const provData = { nombre, telefono, direccion, dia_visita: diaVisita, rubro };
    try {
      const url = modoEdicion ? `/api/proveedores/${idEdicion}` : "/api/proveedores";
      const res = await apiFetch(url, { method: modoEdicion ? "PUT" : "POST", body: JSON.stringify(provData) });
      const data = await res.json();
      if (data.success) { cargarProveedores(); cancelarEdicion(); }
      else alert("Error: " + (data.error || ""));
    } catch (error) { alert("Error: " + error.message); }
  };

  const eliminarProveedor = async (id) => {
    if (!confirm("¿Eliminar este proveedor y todo su historial?")) return;
    await apiFetch(`/api/proveedores/${id}`, { method: "DELETE" });
    cargarProveedores();
  };

  const calcularSaldo = (movimientos) => movimientos?.reduce((acc, mov) => acc + mov.monto, 0) || 0;

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.rubro || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULARIO */}
        <div className="lg:col-span-1">
          <div className={`p-6 rounded-xl shadow-sm border sticky top-0 transition-all ${modoEdicion ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200"}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? "text-indigo-700" : "text-slate-700"}`}>
              {modoEdicion ? <Edit2 size={20} /> : <Plus size={20} className="text-indigo-500" />}
              {modoEdicion ? "Editando Proveedor" : "Nuevo Proveedor"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Empresa / Nombre *</label>
                <div className="relative">
                  <Truck size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" placeholder="Nombre del proveedor" className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Rubro</label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" placeholder="Ej: Bebidas, Golosinas..." className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={rubro} onChange={(e) => setRubro(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Día de Visita</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                  <select className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={diaVisita} onChange={(e) => setDiaVisita(e.target.value)}>
                    <option value="">Sin día fijo</option>
                    {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" placeholder="Teléfono de contacto" className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" placeholder="Dirección (opcional)" className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`flex-1 py-3 font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 text-white ${modoEdicion ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-800 hover:bg-slate-900"}`}>
                  {modoEdicion ? <Save size={18} /> : <Plus size={18} />}
                  {modoEdicion ? "GUARDAR CAMBIOS" : "AGREGAR PROVEEDOR"}
                </button>
                {modoEdicion && (
                  <button type="button" onClick={cancelarEdicion} className="px-4 py-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-bold">
                    <X size={20} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* LISTADO */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <input type="text" placeholder="Buscar proveedor o rubro..." className="flex-1 outline-none text-slate-600"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <span className="text-xs text-slate-400">{proveedoresFiltrados.length} proveedores</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[50vh] md:max-h-[600px]">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-4 border-b border-slate-200 bg-slate-50">Proveedor</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50">Rubro / Visita</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50">Contacto</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Saldo</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {proveedoresFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-700 text-base">{p.nombre}</p>
                        {p.direccion && <p className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={10} /> {p.direccion}</p>}
                      </td>
                      <td className="p-4">
                        {p.rubro && <span className="block text-xs font-bold text-indigo-600 mb-1">{p.rubro}</span>}
                        {p.dia_visita ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs border border-green-100">
                            <Calendar size={10} /> {p.dia_visita}
                          </span>
                        ) : <span className="text-slate-400 text-xs italic">Sin día</span>}
                      </td>
                      <td className="p-4 text-slate-500">
                        {p.telefono ? <div className="flex items-center gap-1"><Phone size={12} /> {p.telefono}</div> : <span className="text-slate-300 italic">-</span>}
                      </td>
                      <td className="p-4 text-right">
                        {p.saldo != null ? (
                          <span className={`font-bold ${p.saldo > 0 ? "text-red-600" : p.saldo < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                            {p.saldo > 0 ? `Debo ${fmtMoney(p.saldo)}` : p.saldo < 0 ? `A favor ${fmtMoney(Math.abs(p.saldo))}` : "-"}
                          </span>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => verDetalles(p)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Ver Historial"><Eye size={18} /></button>
                          <button onClick={() => prepararEdicion(p)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Editar"><Edit2 size={18} /></button>
                          <button onClick={() => eliminarProveedor(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL HISTORIAL */}
      {verHistorial && provSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-indigo-600" /> {provSeleccionado.nombre}</h2>
                <p className="text-slate-500 text-sm mt-1 flex gap-4">
                  <span><Phone size={12} className="inline" /> {provSeleccionado.telefono || "Sin tel."}</span>
                  {provSeleccionado.rubro && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{provSeleccionado.rubro}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-slate-400 font-bold">Saldo Pendiente</p>
                <p className={`text-2xl font-black ${calcularSaldo(historialSeleccionado) > 0 ? "text-red-600" : calcularSaldo(historialSeleccionado) < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {fmtMoney(Math.abs(calcularSaldo(historialSeleccionado)))}
                </p>
                <p className="text-xs text-slate-400">{calcularSaldo(historialSeleccionado) > 0 ? "Le debo" : calcularSaldo(historialSeleccionado) < 0 ? "A mi favor" : "Sin saldo"}</p>
              </div>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              {historialSeleccionado.length === 0 ? (
                <div className="p-10 text-center text-slate-400">No hay movimientos registrados.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                    <tr><th className="p-4">Fecha</th><th className="p-4">Descripción</th><th className="p-4">Método</th><th className="p-4 text-right">Monto</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {historialSeleccionado.map((mov) => (
                      <tr key={mov.id}>
                        <td className="p-4 text-slate-500">{fmtDate(mov.fecha)}<span className="block text-xs opacity-50">{new Date(mov.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td>
                        <td className="p-4 font-medium text-slate-700">{mov.descripcion}</td>
                        <td className="p-4 text-slate-500">{mov.metodo_pago}</td>
                        <td className="p-4 text-right font-bold">
                          {mov.monto > 0
                            ? <span className="text-red-600">(Compra) +{fmtMoney(mov.monto)}</span>
                            : <span className="text-emerald-600">(Pago) -{fmtMoney(Math.abs(mov.monto))}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center gap-2">
              <button onClick={() => setMostrarFormDeuda(!mostrarFormDeuda)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                <Plus size={18} /> Registrar Movimiento
              </button>
              <button onClick={cerrarDetalles} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900">Cerrar</button>
            </div>
            {mostrarFormDeuda && (
              <div className="p-6 border-t border-slate-100 bg-indigo-50">
                <form onSubmit={registrarDeuda} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                    <select className="w-full p-2 rounded border border-indigo-200 outline-none bg-white" value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} disabled={procesandoDeuda}>
                      <option value="compra">Compra (Aumenta deuda)</option>
                      <option value="pago">Pago (Reduce deuda)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Monto *</label>
                      <input type="number" step="0.01" placeholder="Monto" className="w-full p-2 rounded border border-indigo-200 outline-none" value={montoDeuda} onChange={(e) => setMontoDeuda(e.target.value)} disabled={procesandoDeuda} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Método de Pago</label>
                      <select className="w-full p-2 rounded border border-indigo-200 outline-none bg-white" value={metodoDudaPago} onChange={(e) => setMetodoDudaPago(e.target.value)} disabled={procesandoDeuda}>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Retiros">Retiros</option>
                        <option value="Cuenta Corriente">Cuenta Corriente</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                    <input type="text" placeholder={tipoMovimiento === "pago" ? "Ej: Pago parcial..." : "Ej: Bebidas varias..."} className="w-full p-2 rounded border border-indigo-200 outline-none" value={descripcionDeuda} onChange={(e) => setDescripcionDeuda(e.target.value)} disabled={procesandoDeuda} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={procesandoDeuda} className={`flex-1 py-2 font-bold rounded text-white ${tipoMovimiento === "pago" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                      {procesandoDeuda ? "Guardando..." : tipoMovimiento === "pago" ? "Guardar Pago" : "Guardar Compra"}
                    </button>
                    <button type="button" onClick={() => setMostrarFormDeuda(false)} disabled={procesandoDeuda} className="px-4 py-2 bg-slate-300 text-slate-700 font-bold rounded hover:bg-slate-400">Cancelar</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 2: ÓRDENES DE COMPRA (#33)
// ═══════════════════════════════════════════════════════
function TabOrdenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [mostrarFormOrden, setMostrarFormOrden] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [mostrarRecibir, setMostrarRecibir] = useState(false);

  // Form nueva orden
  const [proveedorId, setProveedorId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [items, setItems] = useState([{ nombre: "", cantidad: 1, costo_unitario: 0, producto_id: null, tipo_producto: "producto" }]);

  const cargar = async () => {
    setLoading(true);
    try {
      const [resO, resP, resProd, resCig] = await Promise.all([
        apiFetch(`/api/ordenes_compra${filtroEstado ? `?estado=${filtroEstado}` : ""}`).then(r => r.json()),
        apiFetch("/api/proveedores").then(r => r.json()),
        apiFetch("/api/productos").then(r => r.json()),
        apiFetch("/api/cigarrillos").then(r => r.json()),
      ]);
      setOrdenes(resO); setProveedores(resP); setProductos(resProd); setCigarrillos(resCig);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroEstado]);

  const todosProductos = useMemo(() => [
    ...productos.map(p => ({ ...p, tipo: "producto" })),
    ...cigarrillos.map(c => ({ ...c, tipo: "cigarrillo" })),
  ], [productos, cigarrillos]);

  const addItem = () => setItems([...items, { nombre: "", cantidad: 1, costo_unitario: 0, producto_id: null, tipo_producto: "producto" }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i][field] = value;
    if (field === "producto_id" && value) {
      const prod = todosProductos.find(p => `${p.tipo}-${p.id}` === value);
      if (prod) {
        copy[i].nombre = prod.nombre;
        copy[i].costo_unitario = prod.costo || 0;
        copy[i].producto_id = prod.id;
        copy[i].tipo_producto = prod.tipo;
      }
    }
    setItems(copy);
  };

  const crearOrden = async (e) => {
    e.preventDefault();
    if (!proveedorId) return alert("Seleccioná un proveedor");
    const itemsValidos = items.filter(i => i.nombre && i.cantidad > 0);
    if (!itemsValidos.length) return alert("Agregá al menos un item");
    try {
      const res = await apiFetch("/api/ordenes_compra", {
        method: "POST", body: JSON.stringify({ proveedor_id: parseInt(proveedorId), observacion, fecha_entrega: fechaEntrega, items: itemsValidos }),
      });
      const data = await res.json();
      if (data.success) {
        setMostrarFormOrden(false); setProveedorId(""); setObservacion(""); setFechaEntrega("");
        setItems([{ nombre: "", cantidad: 1, costo_unitario: 0, producto_id: null, tipo_producto: "producto" }]);
        cargar();
      } else alert("Error: " + (data.error || ""));
    } catch (e) { alert("Error: " + e.message); }
  };

  const verDetalle = async (id) => {
    try {
      const res = await apiFetch(`/api/ordenes_compra/${id}`);
      setOrdenDetalle(await res.json());
    } catch (e) { console.error(e); }
  };

  const cambiarEstado = async (id, estado) => {
    await apiFetch(`/api/ordenes_compra/${id}`, { method: "PUT", body: JSON.stringify({ estado }) });
    cargar(); if (ordenDetalle?.id === id) verDetalle(id);
  };

  const eliminarOrden = async (id) => {
    if (!confirm("¿Eliminar esta orden de compra?")) return;
    await apiFetch(`/api/ordenes_compra/${id}`, { method: "DELETE" });
    cargar(); if (ordenDetalle?.id === id) setOrdenDetalle(null);
  };

  const recibirOrden = async () => {
    if (!ordenDetalle) return;
    try {
      const itemsRecibidos = ordenDetalle.items.map(i => ({
        ...i, cantidad_recibida: i._cantRecibida != null ? i._cantRecibida : i.cantidad,
      }));
      const res = await apiFetch(`/api/ordenes_compra/${ordenDetalle.id}/recibir`, {
        method: "POST", body: JSON.stringify({ items_recibidos: itemsRecibidos, observacion: "Recepción registrada" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Orden recibida. Stock actualizado. Total: ${fmtMoney(data.totalRecibido)}`);
        setMostrarRecibir(false); cargar(); verDetalle(ordenDetalle.id);
      } else alert("Error: " + (data.error || ""));
    } catch (e) { alert("Error: " + e.message); }
  };

  if (loading) return <div className="text-center py-10 text-slate-400">Cargando órdenes...</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Órdenes de Compra</h3>
        <div className="flex gap-2">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="parcial">Parciales</option>
            <option value="recibido">Recibidos</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <button onClick={() => setMostrarFormOrden(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
            <Plus size={16} /> Nueva Orden
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="grid gap-3">
        {ordenes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-100">
            <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay órdenes de compra</p>
          </div>
        ) : ordenes.map((o) => {
          const est = ESTADOS_ORDEN[o.estado] || ESTADOS_ORDEN.pendiente;
          const EstIcon = est.icon;
          return (
            <div key={o.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => verDetalle(o.id)}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg bg-${est.color}-50`}>
                  <EstIcon size={20} className={`text-${est.color}-600`} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Orden #{o.id} — {o.proveedor_nombre}</p>
                  <p className="text-xs text-slate-500">{fmtDate(o.fecha_creacion)} {o.fecha_entrega ? `· Entrega: ${fmtDate(o.fecha_entrega)}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-bold px-3 py-1 rounded-full bg-${est.color}-50 text-${est.color}-700 border border-${est.color}-200`}>
                  {est.label}
                </span>
                <span className="text-lg font-bold text-slate-700">{fmtMoney(o.total)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nueva orden */}
      {mostrarFormOrden && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="text-indigo-600" /> Nueva Orden de Compra</h3>
              <button onClick={() => setMostrarFormOrden(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={crearOrden} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Proveedor *</label>
                  <select className="w-full p-2 border rounded-lg outline-none" value={proveedorId} onChange={e => setProveedorId(e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fecha estimada entrega</label>
                  <input type="date" className="w-full p-2 border rounded-lg outline-none" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Observación</label>
                <input type="text" className="w-full p-2 border rounded-lg outline-none" placeholder="Notas opcionales..." value={observacion} onChange={e => setObservacion(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500">Items del Pedido</label>
                  <button type="button" onClick={addItem} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"><Plus size={14} /> Agregar item</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg">
                      <select className="flex-1 p-2 border rounded text-sm outline-none bg-white"
                        value={item.producto_id ? `${item.tipo_producto}-${item.producto_id}` : ""}
                        onChange={e => updateItem(i, "producto_id", e.target.value)}>
                        <option value="">Seleccionar producto</option>
                        <optgroup label="Productos">
                          {productos.map(p => <option key={`p-${p.id}`} value={`producto-${p.id}`}>{p.nombre} (Stock: {p.stock})</option>)}
                        </optgroup>
                        <optgroup label="Cigarrillos">
                          {cigarrillos.map(c => <option key={`c-${c.id}`} value={`cigarrillo-${c.id}`}>{c.nombre} (Stock: {c.stock})</option>)}
                        </optgroup>
                      </select>
                      <input type="number" min="1" className="w-20 p-2 border rounded text-sm text-center" placeholder="Cant." value={item.cantidad}
                        onChange={e => updateItem(i, "cantidad", parseInt(e.target.value) || 1)} />
                      <input type="number" step="0.01" min="0" className="w-28 p-2 border rounded text-sm" placeholder="Costo unit." value={item.costo_unitario}
                        onChange={e => updateItem(i, "costo_unitario", parseFloat(e.target.value) || 0)} />
                      <span className="text-sm font-bold text-slate-600 w-24 text-right">{fmtMoney(item.cantidad * item.costo_unitario)}</span>
                      {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>}
                    </div>
                  ))}
                </div>
                <div className="text-right mt-2 text-lg font-bold text-slate-800">
                  Total: {fmtMoney(items.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0))}
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                <ClipboardList size={18} /> Crear Orden de Compra
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle orden */}
      {ordenDetalle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Orden #{ordenDetalle.id}</h3>
                <p className="text-sm text-slate-500">{ordenDetalle.proveedor_nombre} · {fmtDate(ordenDetalle.fecha_creacion)}</p>
              </div>
              <div className="flex items-center gap-2">
                {(() => { const e = ESTADOS_ORDEN[ordenDetalle.estado] || ESTADOS_ORDEN.pendiente; return <span className={`text-sm font-bold px-3 py-1 rounded-full bg-${e.color}-50 text-${e.color}-700`}>{e.label}</span>; })()}
                <button onClick={() => { setOrdenDetalle(null); setMostrarRecibir(false); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {ordenDetalle.observacion && <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{ordenDetalle.observacion}</p>}
              {ordenDetalle.fecha_entrega && <p className="text-sm text-slate-500">Entrega estimada: <span className="font-bold">{fmtDate(ordenDetalle.fecha_entrega)}</span></p>}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="pb-2 text-left font-medium">Producto</th>
                    <th className="pb-2 text-right font-medium">Cant.</th>
                    <th className="pb-2 text-right font-medium">Recibido</th>
                    <th className="pb-2 text-right font-medium">Costo U.</th>
                    <th className="pb-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordenDetalle.items || []).map((item, i) => (
                    <tr key={item.id || i} className="border-b border-slate-50">
                      <td className="py-2 font-medium text-slate-800">{item.nombre}</td>
                      <td className="py-2 text-right">{item.cantidad}</td>
                      <td className="py-2 text-right">
                        {mostrarRecibir ? (
                          <input type="number" min="0" max={item.cantidad} className="w-16 p-1 border rounded text-center text-sm"
                            value={item._cantRecibida != null ? item._cantRecibida : item.cantidad}
                            onChange={e => {
                              const copy = { ...ordenDetalle, items: ordenDetalle.items.map((it, idx) => idx === i ? { ...it, _cantRecibida: parseInt(e.target.value) || 0 } : it) };
                              setOrdenDetalle(copy);
                            }} />
                        ) : (
                          <span className={item.cantidad_recibida >= item.cantidad ? "text-emerald-600 font-bold" : "text-slate-500"}>{item.cantidad_recibida || 0}</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-slate-500">{fmtMoney(item.costo_unitario)}</td>
                      <td className="py-2 text-right font-bold">{fmtMoney(item.cantidad * item.costo_unitario)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan="4" className="py-3 text-right font-bold text-slate-600">TOTAL</td>
                    <td className="py-3 text-right text-lg font-bold text-slate-800">{fmtMoney(ordenDetalle.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                {(ordenDetalle.estado === "pendiente" || ordenDetalle.estado === "parcial") && (
                  <>
                    {!mostrarRecibir ? (
                      <button onClick={() => setMostrarRecibir(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                        <CheckCircle size={16} /> Recibir Mercadería
                      </button>
                    ) : (
                      <button onClick={recibirOrden} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2 text-sm">
                        <CheckCircle size={16} /> Confirmar Recepción
                      </button>
                    )}
                    <button onClick={() => cambiarEstado(ordenDetalle.id, "cancelado")} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg text-sm hover:bg-red-200">Cancelar Orden</button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => eliminarOrden(ordenDetalle.id)} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium">Eliminar</button>
                <button onClick={() => { setOrdenDetalle(null); setMostrarRecibir(false); }} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-sm">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 3: CALENDARIO DE VISITAS (#35)
// ═══════════════════════════════════════════════════════
function TabCalendario() {
  const [calendario, setCalendario] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/proveedores/visitas/semana")
      .then(r => r.json())
      .then(setCalendario)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const diaActual = DIAS_SEMANA[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  if (loading) return <div className="text-center py-10 text-slate-400">Cargando calendario...</div>;

  const totalConVisita = Object.values(calendario).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Calendario Semanal de Visitas</h3>
        <span className="text-sm text-slate-500">{totalConVisita} proveedores con día asignado</span>
      </div>

      {/* Alerta del día */}
      {calendario[diaActual] && calendario[diaActual].length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="bg-amber-100 p-3 rounded-xl"><Bell size={24} className="text-amber-600" /></div>
          <div>
            <h4 className="font-bold text-amber-800 text-lg">Visitas de Hoy ({diaActual})</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {calendario[diaActual].map(p => (
                <span key={p.id} className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm">
                  <Truck size={14} className="text-amber-600" />
                  <span className="font-bold text-slate-700">{p.nombre}</span>
                  {p.telefono && <span className="text-slate-400">· {p.telefono}</span>}
                  {p.rubro && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{p.rubro}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid semanal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DIAS_SEMANA.map(dia => {
          const provs = calendario[dia] || [];
          const esHoy = dia === diaActual;
          return (
            <div key={dia} className={`rounded-2xl border shadow-sm p-4 transition-all ${esHoy ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-300" : "bg-white border-slate-100"}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-bold ${esHoy ? "text-indigo-700" : "text-slate-700"}`}>
                  {dia} {esHoy && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full ml-1">HOY</span>}
                </h4>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${provs.length > 0 ? (esHoy ? "bg-indigo-200 text-indigo-800" : "bg-slate-200 text-slate-600") : "bg-slate-100 text-slate-400"}`}>
                  {provs.length}
                </span>
              </div>
              {provs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Sin visitas</p>
              ) : (
                <div className="space-y-2">
                  {provs.map(p => (
                    <div key={p.id} className={`rounded-lg p-2.5 text-sm ${esHoy ? "bg-white border border-indigo-100" : "bg-slate-50"}`}>
                      <p className="font-bold text-slate-700">{p.nombre}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        {p.telefono && <span className="flex items-center gap-1"><Phone size={10} /> {p.telefono}</span>}
                        {p.rubro && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{p.rubro}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 4: DEUDA CON PROVEEDORES (#36)
// ═══════════════════════════════════════════════════════
function TabDeudas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    apiFetch("/api/proveedores/deudas/resumen")
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  if (loading) return <div className="text-center py-10 text-slate-400">Cargando deudas...</div>;
  if (!data) return <div className="text-center py-10 text-red-400">Error al cargar</div>;

  const conDeuda = data.proveedores.filter(p => p.saldo > 0);
  const aFavor = data.proveedores.filter(p => p.saldo < 0);
  const sinSaldo = data.proveedores.filter(p => p.saldo === 0 && p.total_movimientos > 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Deuda con Proveedores</h3>
        <button onClick={cargar} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-white"><RefreshCw size={18} /></button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-1"><ArrowUpRight size={18} className="text-red-600" /><p className="text-sm text-red-700 font-medium">Total Deuda</p></div>
          <p className="text-3xl font-bold text-red-700">{fmtMoney(data.totalDeuda)}</p>
          <p className="text-xs text-red-500 mt-1">{conDeuda.length} proveedores</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5">
          <div className="flex items-center gap-2 mb-1"><ArrowDownRight size={18} className="text-emerald-600" /><p className="text-sm text-emerald-700 font-medium">Total a Favor</p></div>
          <p className="text-3xl font-bold text-emerald-700">{fmtMoney(data.totalFavor)}</p>
          <p className="text-xs text-emerald-500 mt-1">{aFavor.length} proveedores</p>
        </div>
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1"><DollarSign size={18} className="text-slate-600" /><p className="text-sm text-slate-600 font-medium">Saldo Neto</p></div>
          <p className={`text-3xl font-bold ${data.totalDeuda - data.totalFavor > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {fmtMoney(data.totalDeuda - data.totalFavor)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{data.totalDeuda - data.totalFavor > 0 ? "Debo en total" : "A mi favor"}</p>
        </div>
      </div>

      {/* Con deuda */}
      {conDeuda.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Proveedores con Deuda ({conDeuda.length})</h4>
          <div className="space-y-2">
            {conDeuda.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg"><Truck size={16} className="text-red-600" /></div>
                  <div>
                    <p className="font-bold text-slate-800">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.rubro && `${p.rubro} · `}{p.total_movimientos} movimientos{p.ultimo_movimiento && ` · Último: ${fmtDate(p.ultimo_movimiento)}`}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-red-600">{fmtMoney(p.saldo)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A favor */}
      {aFavor.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h4 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2"><CheckCircle size={16} /> Saldo a Favor ({aFavor.length})</h4>
          <div className="space-y-2">
            {aFavor.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg"><Truck size={16} className="text-emerald-600" /></div>
                  <div>
                    <p className="font-bold text-slate-800">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.total_movimientos} mov. · Último: {fmtDate(p.ultimo_movimiento)}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-emerald-600">{fmtMoney(Math.abs(p.saldo))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Al día */}
      {sinSaldo.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h4 className="text-sm font-semibold text-slate-500 mb-3">Al Día ({sinSaldo.length})</h4>
          <div className="flex flex-wrap gap-2">
            {sinSaldo.map(p => (
              <span key={p.id} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-sm font-medium">{p.nombre}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Proveedores;
