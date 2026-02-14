import React, { useState, useEffect, useCallback } from "react";
import { User, Plus, Search, Trash2, Edit2, Phone, MapPin, Save, X, Eye, Calendar, Star, Gift, AlertTriangle, TrendingUp, ShoppingBag, Clock, Bell, DollarSign, CreditCard, Award, ChevronDown, ChevronUp, History, Shield } from "lucide-react";
import { apiFetch } from "../lib/api";

function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Form
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [limiteCredito, setLimiteCredito] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);

  // Modal detalle
  const [verHistorial, setVerHistorial] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);
  const [historialFiados, setHistorialFiados] = useState([]);
  const [historialCompras, setHistorialCompras] = useState([]);
  const [historialPuntos, setHistorialPuntos] = useState([]);
  const [tabActiva, setTabActiva] = useState("fiados");

  // Pago
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [descripcionPago, setDescripcionPago] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Puntos
  const [puntosConfig, setPuntosConfig] = useState({ puntos_por_peso: 1, puntos_valor_canje: 100, puntos_activos: false });
  const [mostrarConfigPuntos, setMostrarConfigPuntos] = useState(false);
  const [puntosACanjear, setPuntosACanjear] = useState("");
  const [ajustePuntos, setAjustePuntos] = useState("");
  const [ajusteDesc, setAjusteDesc] = useState("");

  // Alertas deudas
  const [alertasDeuda, setAlertasDeuda] = useState([]);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);

  // Orden
  const [ordenarPor, setOrdenarPor] = useState("nombre");

  useEffect(() => {
    cargarClientes();
    cargarConfigPuntos();
    cargarAlertasDeuda(7);
  }, []);

  const cargarClientes = () => {
    apiFetch("/api/clientes")
      .then(r => r.json())
      .then(data => { setClientes(data); setLoading(false); })
      .catch(err => console.error(err));
  };

  const cargarConfigPuntos = () => {
    apiFetch("/api/configuracion/puntos").then(r => r.json()).then(setPuntosConfig).catch(() => {});
  };

  const cargarAlertasDeuda = (dias) => {
    apiFetch(`/api/clientes/alertas/deudas?dias=${dias}`).then(r => r.json()).then(setAlertasDeuda).catch(() => {});
  };

  const prepararEdicion = (c) => {
    setNombre(c.nombre);
    setTelefono(c.telefono || "");
    setDireccion(c.direccion || "");
    setEmail(c.email || "");
    setLimiteCredito(c.limite_credito > 0 ? String(c.limite_credito) : "");
    setIdEdicion(c.id);
    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setNombre(""); setTelefono(""); setDireccion(""); setEmail(""); setLimiteCredito("");
    setModoEdicion(false); setIdEdicion(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return alert("El nombre es obligatorio");
    const data = { nombre, telefono, direccion, email, limite_credito: parseFloat(limiteCredito) || 0 };
    try {
      const url = modoEdicion ? `/api/clientes/${idEdicion}` : "/api/clientes";
      const method = modoEdicion ? "PUT" : "POST";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.id || result.success) { cargarClientes(); cancelarEdicion(); }
      else alert("Error al guardar");
    } catch (err) { console.error(err); }
  };

  const eliminarCliente = async (id) => {
    if (!confirm("¿Eliminar este cliente y todo su historial?")) return;
    try {
      await apiFetch(`/api/clientes/${id}`, { method: "DELETE" });
      cargarClientes();
    } catch (err) { console.error(err); }
  };

  // --- Modal cliente ---
  const verDetalles = async (cliente) => {
    setClienteSel(cliente);
    setTabActiva("fiados");
    try {
      const [fiados, compras, puntos] = await Promise.all([
        apiFetch(`/api/fiados/${cliente.id}`).then(r => r.json()),
        apiFetch(`/api/clientes/${cliente.id}/compras`).then(r => r.json()),
        apiFetch(`/api/clientes/${cliente.id}/puntos`).then(r => r.json()),
      ]);
      setHistorialFiados(fiados);
      setHistorialCompras(compras);
      setHistorialPuntos(puntos);
      setVerHistorial(true);
    } catch (err) { console.error(err); }
  };

  const cerrarDetalles = () => {
    setVerHistorial(false); setClienteSel(null); setHistorialFiados([]); setHistorialCompras([]); setHistorialPuntos([]);
    setMontoPago(""); setMetodoPago("Efectivo"); setDescripcionPago("");
    setPuntosACanjear(""); setAjustePuntos(""); setAjusteDesc("");
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    if (!montoPago || parseFloat(montoPago) <= 0) return alert("Ingresa un monto válido mayor a 0");
    setProcesandoPago(true);
    try {
      const res = await apiFetch("/api/fiados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteSel.id, monto: -parseFloat(montoPago), descripcion: descripcionPago || "Pago de deuda", metodo_pago: metodoPago })
      });
      const data = await res.json();
      if (data.id || data.success) {
        alert("Pago registrado");
        const nuevosFiados = await apiFetch(`/api/fiados/${clienteSel.id}`).then(r => r.json());
        setHistorialFiados(nuevosFiados);
        cargarClientes();
        setMontoPago(""); setDescripcionPago("");
      }
    } catch (err) { console.error(err); alert("Error al registrar pago"); }
    finally { setProcesandoPago(false); }
  };

  // --- Puntos ---
  const canjearPuntos = async () => {
    const pts = parseInt(puntosACanjear);
    if (!pts || pts <= 0) return alert("Ingresá una cantidad válida de puntos");
    if (pts > (clienteSel?.puntos || 0)) return alert("Puntos insuficientes");
    try {
      const res = await apiFetch(`/api/clientes/${clienteSel.id}/canjear_puntos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntos: pts })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Canjeados ${pts} puntos = $${data.descuento.toFixed(2)} de descuento`);
        setPuntosACanjear("");
        cargarClientes();
        const histPts = await apiFetch(`/api/clientes/${clienteSel.id}/puntos`).then(r => r.json());
        setHistorialPuntos(histPts);
        setClienteSel(prev => ({ ...prev, puntos: data.puntos_restantes }));
      } else { alert(data.error || "Error al canjear"); }
    } catch (err) { console.error(err); }
  };

  const ajustarPuntos = async () => {
    const pts = parseInt(ajustePuntos);
    if (!pts) return alert("Ingresá una cantidad válida");
    try {
      await apiFetch(`/api/clientes/${clienteSel.id}/ajustar_puntos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntos: pts, descripcion: ajusteDesc || "Ajuste manual" })
      });
      setAjustePuntos(""); setAjusteDesc("");
      cargarClientes();
      const histPts = await apiFetch(`/api/clientes/${clienteSel.id}/puntos`).then(r => r.json());
      setHistorialPuntos(histPts);
      setClienteSel(prev => ({ ...prev, puntos: Math.max(0, (prev.puntos || 0) + pts) }));
    } catch (err) { console.error(err); }
  };

  const guardarConfigPuntos = async () => {
    try {
      await apiFetch("/api/configuracion/puntos", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(puntosConfig)
      });
      alert("Configuración de puntos guardada");
    } catch (err) { console.error(err); }
  };

  // Filtrado y ordenamiento
  const clientesFiltrados = clientes
    .filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.telefono || "").includes(busqueda))
    .sort((a, b) => {
      if (ordenarPor === "deuda") return (b.total_deuda || 0) - (a.total_deuda || 0);
      if (ordenarPor === "puntos") return (b.puntos || 0) - (a.puntos || 0);
      if (ordenarPor === "gastado") return (b.total_gastado || 0) - (a.total_gastado || 0);
      return a.nombre.localeCompare(b.nombre);
    });

  const deudaActualSel = historialFiados.reduce((acc, m) => acc + m.monto, 0);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
            <User className="text-blue-600" size={32} /> Clientes y Fidelización
          </h1>
          <p className="text-slate-500 mt-1">Gestiona clientes, créditos, puntos y deudas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Alerta deudas */}
          <button
            onClick={() => { cargarAlertasDeuda(diasAlerta); setMostrarAlertas(!mostrarAlertas); }}
            className={`relative px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all text-sm ${alertasDeuda.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            <Bell size={16} /> Deudas Vencidas
            {alertasDeuda.length > 0 && (
              <span className="bg-white text-red-600 text-xs font-black px-1.5 py-0.5 rounded-full">{alertasDeuda.length}</span>
            )}
          </button>
          {/* Config puntos */}
          <button
            onClick={() => setMostrarConfigPuntos(!mostrarConfigPuntos)}
            className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all text-sm ${puntosConfig.puntos_activos ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
          >
            <Star size={16} /> Puntos {puntosConfig.puntos_activos ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* PANEL ALERTAS DEUDAS */}
      {mostrarAlertas && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18} /> Deudas que superan</h3>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={diasAlerta} onChange={e => setDiasAlerta(e.target.value)}
                className="w-16 p-1.5 text-sm border border-red-300 rounded-lg text-center focus:ring-2 focus:ring-red-400 outline-none" />
              <span className="text-red-700 text-sm font-medium">días</span>
              <button onClick={() => cargarAlertasDeuda(diasAlerta)} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 font-bold">Buscar</button>
            </div>
          </div>
          {alertasDeuda.length === 0 ? (
            <p className="text-red-500 text-sm">No hay deudas que superen {diasAlerta} días. ¡Todo al día!</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alertasDeuda.map(a => (
                <div key={a.id} className="bg-white border border-red-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700">{a.nombre}</span>
                    {a.telefono && <span className="text-slate-400 text-xs ml-2"><Phone size={10} className="inline" /> {a.telefono}</span>}
                    <div className="text-xs text-red-500 mt-0.5">
                      <Clock size={10} className="inline" /> Primer fiado: {new Date(a.fiado_mas_antiguo).toLocaleDateString('es-AR')} ({a.dias_desde_primer_fiado} días)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-red-600 text-lg">$ {a.total_deuda?.toFixed(2)}</span>
                    {a.limite_credito > 0 && a.total_deuda > a.limite_credito && (
                      <div className="text-[10px] text-red-500 font-bold">EXCEDE LÍMITE (${a.limite_credito})</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PANEL CONFIG PUNTOS */}
      {mostrarConfigPuntos && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-top duration-200">
          <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3"><Star size={18} /> Configuración del Sistema de Puntos</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">Sistema Activo</label>
              <button
                onClick={() => setPuntosConfig(p => ({ ...p, puntos_activos: !p.puntos_activos }))}
                className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${puntosConfig.puntos_activos ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}
              >
                {puntosConfig.puntos_activos ? '✓ ACTIVADO' : 'DESACTIVADO'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">1 punto cada $</label>
              <input type="number" step="0.01" min="0.01" value={puntosConfig.puntos_por_peso}
                onChange={e => setPuntosConfig(p => ({ ...p, puntos_por_peso: e.target.value }))}
                className="w-full p-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm" />
              <p className="text-[10px] text-amber-600 mt-1">Ej: 100 = 1 punto por cada $100 gastados</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">Valor canje (puntos por $1)</label>
              <input type="number" step="1" min="1" value={puntosConfig.puntos_valor_canje}
                onChange={e => setPuntosConfig(p => ({ ...p, puntos_valor_canje: e.target.value }))}
                className="w-full p-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm" />
              <p className="text-[10px] text-amber-600 mt-1">Ej: 100 = cada 100 puntos = $1 de descuento</p>
            </div>
            <button onClick={guardarConfigPuntos} className="py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 text-sm">
              Guardar Config
            </button>
          </div>
        </div>
      )}

      {/* RESUMEN RÁPIDO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-400 font-bold uppercase">Total Clientes</p>
          <p className="text-2xl font-black text-slate-700">{clientes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
          <p className="text-xs text-red-400 font-bold uppercase">Deuda Total</p>
          <p className="text-2xl font-black text-red-600">$ {clientes.reduce((a, c) => a + Math.max(0, c.total_deuda || 0), 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm">
          <p className="text-xs text-green-400 font-bold uppercase">Total Vendido</p>
          <p className="text-2xl font-black text-green-600">$ {clientes.reduce((a, c) => a + (c.total_gastado || 0), 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-xs text-amber-400 font-bold uppercase">Puntos Totales</p>
          <p className="text-2xl font-black text-amber-600">{clientes.reduce((a, c) => a + (c.puntos || 0), 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========= FORMULARIO ========= */}
        <div className="lg:col-span-1">
          <div className={`p-6 rounded-xl shadow-sm border sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto transition-all ${modoEdicion ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? 'text-blue-700' : 'text-slate-700'}`}>
              {modoEdicion ? <Edit2 size={20} /> : <Plus size={20} className="text-blue-500" />}
              {modoEdicion ? 'Editando Cliente' : 'Nuevo Cliente'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo *</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input autoFocus={modoEdicion} className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nombre del cliente" value={nombre} onChange={e => setNombre(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="381..." value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Domicilio" value={direccion} onChange={e => setDireccion(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Límite de Crédito</label>
                <div className="relative">
                  <Shield size={14} className="absolute left-3 top-2.5 text-orange-400" />
                  <input type="number" step="0.01" min="0" className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none" placeholder="0 = sin límite" value={limiteCredito} onChange={e => setLimiteCredito(e.target.value)} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Máximo de fiado permitido. 0 o vacío = ilimitado.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className={`flex-1 py-3 font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 text-white ${modoEdicion ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                  {modoEdicion ? <Save size={18} /> : <Plus size={18} />}
                  {modoEdicion ? 'GUARDAR CAMBIOS' : 'AGREGAR CLIENTE'}
                </button>
                {modoEdicion && (
                  <button type="button" onClick={cancelarEdicion} className="px-4 py-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-bold"><X size={20} /></button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ========= LISTADO ========= */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* BUSCADOR + ORDENAR */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
              <Search className="text-slate-400" size={18} />
              <input className="bg-transparent outline-none w-full text-sm" placeholder="Buscar por nombre o teléfono..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              {busqueda && <button onClick={() => setBusqueda("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 font-medium focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="nombre">Ordenar: Nombre</option>
              <option value="deuda">Ordenar: Mayor Deuda</option>
              <option value="puntos">Ordenar: Más Puntos</option>
              <option value="gastado">Ordenar: Más Gastado</option>
            </select>
          </div>

          {/* TABLA */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[50vh] md:max-h-[600px]">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-4 border-b border-slate-200 bg-slate-50">Cliente</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Compras</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Deuda</th>
                    {puntosConfig.puntos_activos && <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Puntos</th>}
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={puntosConfig.puntos_activos ? 5 : 4} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                  ) : clientesFiltrados.length === 0 ? (
                    <tr><td colSpan={puntosConfig.puntos_activos ? 5 : 4} className="p-8 text-center text-slate-400">No se encontraron clientes.</td></tr>
                  ) : clientesFiltrados.map(c => (
                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.limite_credito > 0 && c.total_deuda > c.limite_credito ? 'bg-red-50' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                            {c.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-700 truncate">{c.nombre}</div>
                            <div className="text-xs text-slate-400 flex gap-2">
                              {c.telefono && <span><Phone size={10} className="inline" /> {c.telefono}</span>}
                              {c.direccion && <span><MapPin size={10} className="inline" /> {c.direccion}</span>}
                            </div>
                            {c.limite_credito > 0 && (
                              <div className="text-[10px] text-orange-500 font-medium mt-0.5">
                                <Shield size={10} className="inline" /> Límite: ${c.limite_credito.toFixed(0)}
                                {c.total_deuda > c.limite_credito && <span className="text-red-600 font-bold ml-1">EXCEDIDO</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-slate-700 font-bold">{c.total_compras || 0}</div>
                        <div className="text-[10px] text-green-500">${(c.total_gastado || 0).toFixed(0)}</div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-bold px-2 py-1 rounded text-sm ${c.total_deuda > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          $ {(c.total_deuda || 0).toFixed(2)}
                        </span>
                      </td>
                      {puntosConfig.puntos_activos && (
                        <td className="p-4 text-center">
                          <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                            <Star size={12} className="fill-amber-400 text-amber-400" /> {c.puntos || 0}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => verDetalles(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Ver Detalle"><Eye size={16} /></button>
                          <button onClick={() => prepararEdicion(c)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-full transition-colors" title="Editar"><Edit2 size={16} /></button>
                          <button onClick={() => eliminarCliente(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-4 py-2 border-t text-xs text-slate-500 flex justify-between">
              <span>{clientesFiltrados.length} de {clientes.length} clientes</span>
              <span className="text-red-500 font-medium">{clientes.filter(c => c.total_deuda > 0).length} con deuda</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODAL DETALLE CLIENTE ==================== */}
      {verHistorial && clienteSel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

            {/* CABECERA */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">{clienteSel.nombre.charAt(0).toUpperCase()}</div>
                    {clienteSel.nombre}
                  </h2>
                  <p className="text-slate-500 text-xs mt-1 flex gap-4 ml-12">
                    {clienteSel.telefono && <span><Phone size={10} className="inline" /> {clienteSel.telefono}</span>}
                    {clienteSel.direccion && <span><MapPin size={10} className="inline" /> {clienteSel.direccion}</span>}
                    {clienteSel.limite_credito > 0 && <span className="text-orange-500"><Shield size={10} className="inline" /> Límite: ${clienteSel.limite_credito}</span>}
                  </p>
                </div>
                <div className="flex gap-3 text-right">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Saldo</p>
                    <p className={`text-xl font-black ${deudaActualSel > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      $ {deudaActualSel.toFixed(2)}
                    </p>
                  </div>
                  {puntosConfig.puntos_activos && (
                    <div>
                      <p className="text-[10px] uppercase text-amber-400 font-bold">Puntos</p>
                      <p className="text-xl font-black text-amber-600 flex items-center gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" /> {clienteSel.puntos || 0}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* TABS */}
              <div className="flex gap-1 mt-4 ml-12">
                {[
                  { key: "fiados", label: "Fiados", icon: CreditCard },
                  { key: "compras", label: "Compras", icon: ShoppingBag },
                  ...(puntosConfig.puntos_activos ? [{ key: "puntos", label: "Puntos", icon: Star }] : [])
                ].map(tab => (
                  <button key={tab.key}
                    onClick={() => setTabActiva(tab.key)}
                    className={`px-4 py-2 rounded-t-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${tabActiva === tab.key ? 'bg-white text-blue-700 border border-b-white border-slate-200 -mb-[1px] z-10' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTENIDO TABS */}
            <div className="flex-1 overflow-y-auto">

              {/* TAB: FIADOS */}
              {tabActiva === "fiados" && (
                <div>
                  {historialFiados.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No hay movimientos de fiados.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3">Método</th>
                          <th className="p-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {historialFiados.map(mov => (
                          <tr key={mov.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500 text-xs">
                              {new Date(mov.fecha).toLocaleDateString('es-AR')}
                              <span className="block text-[10px] opacity-50">{new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="p-3 font-medium text-slate-700">{mov.descripcion}</td>
                            <td className="p-3 text-slate-500 text-xs">{mov.metodo_pago}</td>
                            <td className="p-3 text-right font-bold">
                              {mov.monto > 0 ? (
                                <span className="text-red-600">+ ${mov.monto.toFixed(2)}</span>
                              ) : (
                                <span className="text-green-600">- ${Math.abs(mov.monto).toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB: COMPRAS */}
              {tabActiva === "compras" && (
                <div>
                  {historialCompras.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No hay compras registradas para este cliente.</div>
                  ) : (
                    <div>
                      <div className="p-3 bg-green-50 border-b border-green-100 text-xs text-green-700 flex justify-between">
                        <span><ShoppingBag size={12} className="inline" /> {historialCompras.length} tickets de compra</span>
                        <span className="font-bold">Total gastado: $ {historialCompras.reduce((a, c) => a + (c.total || 0), 0).toFixed(2)}</span>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                          <tr>
                            <th className="p-3">Ticket</th>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Detalle</th>
                            <th className="p-3 text-center">Pago</th>
                            <th className="p-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {historialCompras.map(c => (
                            <tr key={c.ticket_id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-xs text-blue-600 font-bold">#{c.ticket_id}</td>
                              <td className="p-3 text-slate-500 text-xs">{new Date(c.fecha).toLocaleDateString('es-AR')}</td>
                              <td className="p-3 text-slate-700 text-xs max-w-[250px] truncate" title={c.detalle}>{c.detalle}</td>
                              <td className="p-3 text-center text-xs">{c.metodo_pago}</td>
                              <td className="p-3 text-right font-bold text-slate-700">$ {c.total?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: PUNTOS */}
              {tabActiva === "puntos" && puntosConfig.puntos_activos && (
                <div>
                  {/* Canjear / Ajustar */}
                  <div className="p-4 bg-amber-50 border-b border-amber-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Canjear */}
                      <div className="bg-white rounded-lg border border-amber-200 p-3">
                        <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><Gift size={14} /> Canjear Puntos</h4>
                        <div className="flex gap-2">
                          <input type="number" min="1" placeholder={`Max: ${clienteSel.puntos || 0}`} value={puntosACanjear} onChange={e => setPuntosACanjear(e.target.value)}
                            className="flex-1 p-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" />
                          <button onClick={canjearPuntos} disabled={!puntosACanjear || parseInt(puntosACanjear) <= 0}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 disabled:opacity-50">
                            Canjear
                          </button>
                        </div>
                        {puntosACanjear > 0 && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            = ${(parseInt(puntosACanjear) / (parseFloat(puntosConfig.puntos_valor_canje) || 100)).toFixed(2)} de descuento
                          </p>
                        )}
                      </div>
                      {/* Ajuste manual */}
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Award size={14} /> Ajuste Manual</h4>
                        <div className="flex gap-2">
                          <input type="number" placeholder="+/- puntos" value={ajustePuntos} onChange={e => setAjustePuntos(e.target.value)}
                            className="w-24 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-400 outline-none" />
                          <input type="text" placeholder="Motivo..." value={ajusteDesc} onChange={e => setAjusteDesc(e.target.value)}
                            className="flex-1 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-400 outline-none" />
                          <button onClick={ajustarPuntos} disabled={!ajustePuntos}
                            className="px-3 py-2 bg-slate-600 text-white rounded-lg font-bold text-xs hover:bg-slate-700 disabled:opacity-50">
                            Ajustar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Historial */}
                  {historialPuntos.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">Sin movimientos de puntos.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3 text-right">Puntos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {historialPuntos.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500 text-xs">{new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${h.tipo === 'compra' ? 'bg-green-100 text-green-700' : h.tipo === 'canje' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {h.tipo === 'compra' ? 'Compra' : h.tipo === 'canje' ? 'Canje' : 'Ajuste'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 text-xs">{h.descripcion}</td>
                            <td className="p-3 text-right font-bold">
                              <span className={h.puntos > 0 ? 'text-green-600' : 'text-red-600'}>
                                {h.puntos > 0 ? '+' : ''}{h.puntos}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* PIE: FORMULARIO DE PAGO */}
            <div className="p-5 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 rounded-b-2xl space-y-3">
              {deudaActualSel > 0 && (
                <form onSubmit={registrarPago} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Monto a Pagar</label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                        <input type="number" step="0.01" min="0" placeholder="0.00" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                          className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" disabled={procesandoPago} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Método</label>
                      <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" disabled={procesandoPago}>
                        <option value="Efectivo">Efectivo</option>
                        <option value="MercadoPago">Mercado Pago</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Descripción</label>
                      <input type="text" placeholder="Pago parcial..." value={descripcionPago} onChange={e => setDescripcionPago(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" disabled={procesandoPago} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <div className="text-sm text-slate-600">
                      {montoPago && (
                        <span className="font-bold text-green-600">
                          Pago: ${parseFloat(montoPago || 0).toFixed(2)} | Nuevo saldo: ${(deudaActualSel - parseFloat(montoPago || 0)).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button type="submit" disabled={procesandoPago || !montoPago}
                      className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm">
                      <DollarSign size={16} /> Registrar Pago
                    </button>
                  </div>
                </form>
              )}
              <div className="flex justify-end">
                <button onClick={cerrarDetalles} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors text-sm">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Deudores;
