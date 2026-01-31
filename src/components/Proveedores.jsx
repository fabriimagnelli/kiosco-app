import React, { useState, useEffect } from "react";
import { Users, Plus, Search, DollarSign, MapPin, Phone, Mail, Building, Trash2, X, ChevronRight, Receipt, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";

function Proveedores() {
  // Estado General
  const [tab, setTab] = useState("proveedores"); // 'proveedores' o 'cc'
  const [proveedores, setProveedores] = useState([]);
  const [movimientos, setMovimientos] = useState([]); // Lista de tickets individuales
  const [loading, setLoading] = useState(true);

  // Estado de Selección (Para el Panel Derecho)
  const [seleccionado, setSeleccionado] = useState(null); // Puede ser un Proveedor (tab 1) o un Movimiento (tab 2)

  // Filtros
  const [filtroProv, setFiltroProv] = useState(""); // ID proveedor para filtrar la lista de movimientos

  // Estado Formularios
  const [showModalProv, setShowModalProv] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "", tributario: "", email: "", telefono: "",
    calle: "", numero: "", piso: "", ciudad: "", activo: true, comentario: ""
  });

  const [showModalTrans, setShowModalTrans] = useState(false);
const [transData, setTransData] = useState({
  proveedor_id: "", monto: "", descripcion: "", tipo: "Deuda", metodo_pago: "Efectivo"
});

  useEffect(() => {
    cargarDatos();
  }, [tab]); // Recargar al cambiar de pestaña para asegurar datos frescos

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Siempre cargamos proveedores para los selectores y la lista de directorio
      const resProv = await fetch("http://localhost:3001/api/proveedores");
      const dataProv = await resProv.json();
      setProveedores(dataProv);

      // Si estamos en Cuenta Corriente, cargamos TODOS los movimientos
      if (tab === "cc") {
        const resMov = await fetch("http://localhost:3001/api/movimientos_todos");
        const dataMov = await resMov.json();
        setMovimientos(dataMov);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- ACCIONES PROVEEDORES ---
  const guardarProveedor = (e) => {
    e.preventDefault();
    if (!formData.nombre) return alert("Nombre requerido");
    fetch("http://localhost:3001/api/proveedores", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData)
    }).then(() => { 
        setShowModalProv(false); 
        cargarDatos(); 
        setFormData({ nombre: "", tributario: "", email: "", telefono: "", calle: "", numero: "", piso: "", ciudad: "", activo: true, comentario: "" }); 
    });
  };

  const eliminarProveedor = (id, e) => {
    e.stopPropagation();
    if(!confirm("¿Eliminar proveedor?")) return;
    fetch(`http://localhost:3001/api/proveedores/${id}`, { method: "DELETE" }).then(() => {
        if(seleccionado?.id === id) setSeleccionado(null);
        cargarDatos();
    });
  };

  // --- ACCIONES TRANSACCIONES ---
  const guardarTransaccion = (e) => {
    e.preventDefault();
    if (!transData.proveedor_id || !transData.monto) return alert("Completa los campos");
    
    // Deuda = Positivo (Suma a lo que debemos) | Pago = Negativo (Resta a lo que debemos)
    const montoFinal = transData.tipo === "Pago" ? -Math.abs(parseFloat(transData.monto)) : Math.abs(parseFloat(transData.monto));
    
    fetch("http://localhost:3001/api/movimientos_proveedores", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
          proveedor_id: transData.proveedor_id, 
          monto: montoFinal, 
          descripcion: transData.descripcion || "Movimiento Manual",
          metodo_pago: transData.metodo_pago // Enviamos el método seleccionado
      })
    }).then(() => {
      setShowModalTrans(false);
      cargarDatos(); // Recarga la lista de movimientos
      setTransData({ proveedor_id: "", monto: "", descripcion: "", tipo: "Deuda", metodo_pago: "Efectivo" });
    });
  };

  const eliminarMovimiento = (id) => {
    if(!confirm("¿Eliminar este registro permanentemente?")) return;
    fetch(`http://localhost:3001/api/movimientos_proveedores/${id}`, { method: "DELETE" })
        .then(() => {
            setSeleccionado(null);
            cargarDatos();
        });
  };

  // --- CÁLCULOS PARA LA PESTAÑA CC ---
  // 1. Filtrar la lista de movimientos según el selector
  const movimientosFiltrados = filtroProv 
    ? movimientos.filter(m => m.proveedor_id == filtroProv) 
    : movimientos;

  // 2. Calcular totales sobre la lista visible
  const totalDeudaVisible = movimientosFiltrados.reduce((acc, m) => acc + (m.monto || 0), 0);
  const totalRegistros = movimientosFiltrados.length;

  return (
    <div className="flex flex-col h-full bg-slate-100 p-4 gap-4 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="text-blue-600" /> Gestión de Proveedores
        </h1>
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => {setTab("proveedores"); setSeleccionado(null)}} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${tab === "proveedores" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>Directorio</button>
            <button onClick={() => {setTab("cc"); setSeleccionado(null)}} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${tab === "cc" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>Cuenta Corriente</button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* IZQUIERDA: LISTA */}
        <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${seleccionado ? 'w-2/3' : 'w-full'}`}>
            
            {/* Toolbar Superior */}
            <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                {tab === "cc" ? (
                     <div className="flex items-center gap-4 w-full">
                        {/* Totales Resumen */}
                        <div className="flex gap-4 mr-auto">
                            <div className="bg-white border px-3 py-1 rounded-lg shadow-sm">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Deuda Total</p>
                                <p className={`text-sm font-bold ${totalDeudaVisible > 0 ? "text-red-500" : "text-green-500"}`}>$ {totalDeudaVisible.toLocaleString()}</p>
                            </div>
                            <div className="bg-white border px-3 py-1 rounded-lg shadow-sm">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Registros</p>
                                <p className="text-sm font-bold text-slate-700">{totalRegistros}</p>
                            </div>
                        </div>

                        {/* Filtro Proveedor */}
                        <div className="flex items-center gap-2 bg-white border rounded-lg px-2">
                            <Search size={14} className="text-slate-400"/>
                            <select 
                                className="bg-transparent text-sm font-bold text-slate-600 outline-none py-1.5 w-40 cursor-pointer"
                                value={filtroProv}
                                onChange={(e) => setFiltroProv(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                     </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-500 bg-white border rounded-lg px-3 py-1.5 w-full md:w-auto">
                        <Search size={16}/>
                        <input className="outline-none text-sm w-40" placeholder="Buscar proveedor..." />
                    </div>
                )}

                <div className="flex gap-2 shrink-0">
                    {tab === "cc" ? (
                        <button onClick={() => setShowModalTrans(true)} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-700 shadow-md">
                            <DollarSign size={16}/> Nueva Op.
                        </button>
                    ) : (
                        <button onClick={() => setShowModalProv(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md">
                            <Plus size={16}/> Nuevo Prov.
                        </button>
                    )}
                </div>
            </div>

            {/* TABLA */}
            <div className="overflow-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-white text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 border-b shadow-sm">
                        <tr>
                            {tab === "proveedores" ? (
                                <>
                                    <th className="p-4">Empresa / Nombre</th>
                                    <th className="p-4 hidden md:table-cell">Contacto</th>
                                    <th className="p-4 hidden lg:table-cell">Ciudad</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4 hidden md:table-cell">Detalle</th>
                                    <th className="p-4 text-right">Monto</th>
                                </>
                            )}
                            <th className="p-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* RENDERIZADO CONDICIONAL DE FILAS */}
                        {tab === "proveedores" ? (
                            proveedores.map(p => (
                                <tr key={p.id} onClick={() => setSeleccionado(p)} className={`cursor-pointer transition hover:bg-slate-50 ${seleccionado?.id === p.id ? "bg-blue-50" : ""}`}>
                                    <td className="p-4 font-bold text-slate-700">{p.nombre}</td>
                                    <td className="p-4 text-sm text-slate-600 hidden md:table-cell">{p.telefono || "-"}</td>
                                    <td className="p-4 text-sm text-slate-500 hidden lg:table-cell">{p.ciudad || "-"}</td>
                                    <td className="p-4"><ChevronRight size={16} className="text-slate-300"/></td>
                                </tr>
                            ))
                        ) : (
                            // LISTA DE MOVIMIENTOS INDIVIDUALES
                            movimientosFiltrados.map(m => (
                                <tr key={m.id} onClick={() => setSeleccionado(m)} className={`cursor-pointer transition hover:bg-slate-50 group ${seleccionado?.id === m.id ? "bg-blue-50" : ""}`}>
                                    <td className="p-4 text-xs font-bold text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-300 group-hover:text-blue-400"/>
                                            {new Date(m.fecha).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700 text-sm">{m.proveedor_nombre}</td>
                                    <td className="p-4 text-sm text-slate-500 hidden md:table-cell truncate max-w-[150px]">{m.descripcion}</td>
                                    <td className="p-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${m.monto > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                                            {m.monto > 0 ? "+" : "-"} $ {Math.abs(m.monto).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-4"><ChevronRight size={16} className="text-slate-300"/></td>
                                </tr>
                            ))
                        )}
                        {tab === "cc" && movimientosFiltrados.length === 0 && (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">No hay movimientos registrados para este filtro.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* DERECHA: PANEL DE DETALLE / TICKET */}
        {seleccionado && (
            <div className="w-1/3 min-w-[300px] flex flex-col animate-slide-in-right">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden relative">
                    
                    {/* Botón Cerrar */}
                    <button onClick={() => setSeleccionado(null)} className="absolute top-3 right-3 p-1 bg-black/10 hover:bg-black/20 rounded-full text-white z-10 transition"><X size={16}/></button>

                    {/* ENCABEZADO TICKET */}
                    <div className="bg-slate-800 p-6 text-white text-center relative overflow-hidden">
                         <div className="relative z-10">
                            <div className="flex justify-center mb-2 text-slate-400"><Receipt size={32}/></div>
                            {tab === "proveedores" ? (
                                <>
                                    <h2 className="text-xl font-bold">{seleccionado.nombre}</h2>
                                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Ficha de Proveedor</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-bold font-mono tracking-tighter">
                                        $ {Math.abs(seleccionado.monto).toLocaleString()}
                                    </h2>
                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-2 ${seleccionado.monto > 0 ? "bg-red-500/20 text-red-200" : "bg-green-500/20 text-green-200"}`}>
                                        {seleccionado.monto > 0 ? <><ArrowUpRight size={10}/> Deuda Generada</> : <><ArrowDownLeft size={10}/> Pago Registrado</>}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Método: {seleccionado.metodo_pago || 'Efectivo'}</p>
                                </>
                            )}
                         </div>
                    </div>

                    {/* CUERPO DEL TICKET */}
                    <div className="flex-1 bg-slate-50 p-6 overflow-auto">
                        
                        {/* DETALLE PROVEEDOR */}
                        {tab === "proveedores" && (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Contacto</label>
                                    <div className="flex items-center gap-2 text-slate-700 text-sm mb-2"><Phone size={14}/> {seleccionado.telefono || "Sin teléfono"}</div>
                                    <div className="flex items-center gap-2 text-slate-700 text-sm"><Mail size={14}/> {seleccionado.email || "Sin email"}</div>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Ubicación</label>
                                    <div className="flex items-start gap-2 text-slate-700 text-sm">
                                        <MapPin size={14} className="mt-0.5 shrink-0"/> 
                                        <span>{seleccionado.calle} {seleccionado.numero}, {seleccionado.ciudad}</span>
                                    </div>
                                </div>
                                <div className="text-center pt-4">
                                    <button onClick={(e) => eliminarProveedor(seleccionado.id, e)} className="text-red-500 text-xs font-bold hover:underline flex items-center justify-center gap-1 w-full">
                                        <Trash2 size={12}/> Eliminar Proveedor
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* DETALLE MOVIMIENTO */}
                        {tab === "cc" && (
                            <div className="space-y-6">
                                {/* Datos del Movimiento */}
                                <div className="space-y-3">
                                    <div className="flex justify-between border-b border-dashed border-slate-300 pb-2">
                                        <span className="text-xs font-bold text-slate-500">Fecha</span>
                                        <span className="text-sm font-bold text-slate-700">{new Date(seleccionado.fecha).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-dashed border-slate-300 pb-2">
                                        <span className="text-xs font-bold text-slate-500">Proveedor</span>
                                        <span className="text-sm font-bold text-slate-700">{seleccionado.proveedor_nombre}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-500 block mb-1">Concepto / Descripción</span>
                                        <div className="bg-white p-3 rounded border text-sm text-slate-600 italic">
                                            "{seleccionado.descripcion}"
                                        </div>
                                    </div>
                                </div>

                                {/* Botones Acción */}
                                <div className="pt-6 border-t border-slate-200">
                                    <button 
                                        onClick={() => eliminarMovimiento(seleccionado.id)} 
                                        className="w-full bg-white border border-red-100 text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition"
                                    >
                                        <Trash2 size={16}/> Eliminar este Registro
                                    </button>
                                    <p className="text-[10px] text-center text-slate-400 mt-2 px-4">
                                        Eliminar este registro recalculará la deuda total del proveedor.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* --- MODALES (Iguales que antes) --- */}
      {showModalProv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
                <div className="bg-slate-800 p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2"><Users size={20}/> Nuevo Proveedor</h3>
                    <button onClick={() => setShowModalProv(false)} className="text-slate-400 hover:text-white"><X/></button>
                </div>
                <form onSubmit={guardarProveedor} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="border p-2 rounded bg-slate-50 col-span-2" placeholder="Nombre Empresa *" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                    <input className="border p-2 rounded bg-slate-50" placeholder="CUIT / Tributario" value={formData.tributario} onChange={e => setFormData({...formData, tributario: e.target.value})} />
                    <input className="border p-2 rounded bg-slate-50" placeholder="Teléfono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                    <input className="border p-2 rounded bg-slate-50" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input className="border p-2 rounded bg-slate-50" placeholder="Ciudad" value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} />
                    <input className="border p-2 rounded bg-slate-50 col-span-2" placeholder="Dirección (Calle, altura, piso)" value={formData.calle} onChange={e => setFormData({...formData, calle: e.target.value})} />
                    <textarea className="border p-2 rounded bg-slate-50 col-span-2 h-20" placeholder="Comentarios..." value={formData.comentario} onChange={e => setFormData({...formData, comentario: e.target.value})}></textarea>
                    <div className="col-span-2 flex justify-end gap-2 mt-2">
                        <button type="button" onClick={() => setShowModalProv(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showModalTrans && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="bg-slate-800 p-4 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2"><DollarSign size={20}/> Nueva Transacción</h3>
                    <button onClick={() => setShowModalTrans(false)} className="text-slate-400 hover:text-white"><X/></button>
                </div>
                <form onSubmit={guardarTransaccion} className="p-6 flex flex-col gap-4">
                    <select className="border p-3 rounded bg-slate-50 font-bold outline-none" value={transData.proveedor_id} onChange={e => setTransData({...transData, proveedor_id: e.target.value})} required>
                        <option value="">Seleccionar Proveedor...</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setTransData({...transData, tipo: 'Deuda'})} className={`flex-1 p-2 rounded font-bold border ${transData.tipo === 'Deuda' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white text-slate-400'}`}>Generar Deuda</button>
                        <button type="button" onClick={() => setTransData({...transData, tipo: 'Pago'})} className={`flex-1 p-2 rounded font-bold border ${transData.tipo === 'Pago' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white text-slate-400'}`}>Registrar Pago</button>
                    </div>
                    
                    {/* SELECTOR DE MÉTODO DE PAGO */}
                    {transData.tipo === 'Pago' && (
                        <div className="mt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Se paga con:</label>
                            <div className="flex gap-2 mt-1">
                                <button type="button" onClick={() => setTransData({...transData, metodo_pago: 'Efectivo'})} className={`flex-1 p-2 rounded text-xs font-bold border ${transData.metodo_pago === 'Efectivo' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-slate-50'}`}>💵 Efectivo (Caja)</button>
                                <button type="button" onClick={() => setTransData({...transData, metodo_pago: 'Digital'})} className={`flex-1 p-2 rounded text-xs font-bold border ${transData.metodo_pago === 'Digital' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50'}`}>💳 Transferencia</button>
                                <button type="button" onClick={() => setTransData({...transData, metodo_pago: 'Fondo Retiros'})} className={`flex-1 p-2 rounded text-xs font-bold border ${transData.metodo_pago === 'Fondo Retiros' ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-slate-50'}`}>💰 Fondo Retiros</button>
                            </div>
                        </div>
                    )}

                    <input type="number" step="0.01" className="border p-3 rounded bg-slate-50 text-xl font-bold" placeholder="$ 0.00" value={transData.monto} onChange={e => setTransData({...transData, monto: e.target.value})} required />
                    <input className="border p-3 rounded bg-slate-50" placeholder="Descripción (Ej: Factura A-0001)" value={transData.descripcion} onChange={e => setTransData({...transData, descripcion: e.target.value})} />
                    <button type="submit" className="bg-slate-800 text-white py-3 rounded font-bold hover:bg-slate-700 shadow-lg">Confirmar Movimiento</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

export default Proveedores;