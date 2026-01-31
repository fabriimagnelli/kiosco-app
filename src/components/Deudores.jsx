import React, { useState, useEffect } from "react";
import { User, Phone, MapPin, DollarSign, Search, Plus, Trash2, ChevronRight, X, Calendar, ArrowDownLeft, ArrowUpRight } from "lucide-react";

function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  
  // ESTADO PARA LA BÚSQUEDA
  const [busqueda, setBusqueda] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showModalPago, setShowModalPago] = useState(false);
  
  // Formulario Cliente
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", telefono: "", direccion: "", email: "" });
  
  // Formulario Pago
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = () => {
    fetch("http://localhost:3001/api/clientes")
      .then((res) => res.json())
      .then((data) => setClientes(data));
  };

  const seleccionarCliente = (cliente) => {
    setSeleccionado(cliente);
    fetch(`http://localhost:3001/api/fiados/${cliente.id}`)
        .then(res => res.json())
        .then(setHistorial);
  };

  // --- LÓGICA DE FILTRADO ---
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleCrearCliente = (e) => {
    e.preventDefault();
    fetch("http://localhost:3001/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoCliente),
    }).then(() => {
      setShowModal(false);
      setNuevoCliente({ nombre: "", telefono: "", direccion: "", email: "" });
      cargarClientes();
    });
  };

  const handleEliminarCliente = (id, e) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este cliente y todo su historial?")) {
        fetch(`http://localhost:3001/api/clientes/${id}`, { method: "DELETE" })
            .then(() => {
                setSeleccionado(null);
                cargarClientes();
            });
    }
  };

  const handleRegistrarPago = (e) => {
    e.preventDefault();
    if (!montoPago || parseFloat(montoPago) <= 0) return alert("Ingrese un monto válido");

    fetch("http://localhost:3001/api/fiados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            cliente_id: seleccionado.id,
            monto: -Math.abs(parseFloat(montoPago)), // Monto negativo para restar deuda
            descripcion: "Pago de deuda",
            metodo_pago: metodoPago
        })
    }).then(() => {
        setShowModalPago(false);
        setMontoPago("");
        setMetodoPago("Efectivo");
        seleccionarCliente(seleccionado); // Recargar historial
        cargarClientes(); // Actualizar total deuda en lista
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-4 gap-4 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-blue-600" /> Clientes & Deudores
        </h1>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all active:scale-95"
        >
            <Plus size={18}/> Nuevo Cliente
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* LISTA DE CLIENTES (IZQUIERDA) */}
        <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${seleccionado ? 'w-1/2' : 'w-full'}`}>
            
            {/* BARRA DE BÚSQUEDA */}
            <div className="p-4 border-b bg-slate-50">
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                    <Search size={18} className="text-slate-400"/>
                    <input 
                        className="w-full outline-none text-slate-700 font-medium bg-transparent"
                        placeholder="Buscar cliente por nombre..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        autoFocus
                    />
                    {busqueda && (
                        <button onClick={() => setBusqueda("")} className="text-slate-400 hover:text-slate-600">
                            <X size={16}/>
                        </button>
                    )}
                </div>
            </div>

            {/* LISTA FILTRADA */}
            <div className="overflow-y-auto flex-1">
                {clientesFiltrados.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 italic">
                        No se encontraron clientes.
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-white text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 border-b">
                            <tr>
                                <th className="p-4">Cliente</th>
                                <th className="p-4 text-right">Estado Deuda</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clientesFiltrados.map((c) => (
                                <tr 
                                    key={c.id} 
                                    onClick={() => seleccionarCliente(c)}
                                    className={`cursor-pointer transition hover:bg-slate-50 group ${seleccionado?.id === c.id ? "bg-blue-50" : ""}`}
                                >
                                    <td className="p-4">
                                        <p className="font-bold text-slate-700">{c.nombre}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                            {c.telefono && <span className="flex items-center gap-1"><Phone size={10}/> {c.telefono}</span>}
                                            {c.direccion && <span className="flex items-center gap-1"><MapPin size={10}/> {c.direccion}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {c.total_deuda > 0 ? (
                                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black">
                                                $ {c.total_deuda.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">
                                                Al día
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleEliminarCliente(c.id, e)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition">
                                                <Trash2 size={16}/>
                                            </button>
                                            <ChevronRight size={20} className="text-slate-300"/>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* DETALLE DEL CLIENTE (DERECHA) */}
        {seleccionado && (
            <div className="w-1/2 min-w-[350px] flex flex-col animate-slide-in-right">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden relative">
                    
                    {/* Header Detalle */}
                    <div className="bg-slate-900 p-6 text-white relative">
                        <button onClick={() => setSeleccionado(null)} className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={16}/></button>
                        
                        <h2 className="text-2xl font-bold">{seleccionado.nombre}</h2>
                        <div className="flex gap-4 mt-2 text-sm text-slate-300">
                            {seleccionado.telefono && <span className="flex items-center gap-1"><Phone size={14}/> {seleccionado.telefono}</span>}
                            {seleccionado.direccion && <span className="flex items-center gap-1"><MapPin size={14}/> {seleccionado.direccion}</span>}
                        </div>

                        {/* RESUMEN DEUDA */}
                        <div className="mt-6 flex items-center justify-between bg-white/10 p-4 rounded-xl border border-white/10">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Deuda Actual</p>
                                <p className={`text-3xl font-black ${seleccionado.total_deuda > 0 ? "text-red-400" : "text-green-400"}`}>
                                    $ {seleccionado.total_deuda?.toLocaleString() || "0"}
                                </p>
                            </div>
                            {seleccionado.total_deuda > 0 && (
                                <button 
                                    onClick={() => setShowModalPago(true)}
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-600 shadow-lg flex items-center gap-2 transition active:scale-95"
                                >
                                    <DollarSign size={16}/> Registrar Pago
                                </button>
                            )}
                        </div>
                    </div>

                    {/* HISTORIAL */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-1">Historial de Movimientos</h3>
                        <div className="space-y-3">
                            {historial.map((mov) => (
                                <div key={mov.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1">
                                            <Calendar size={12}/> {new Date(mov.fecha).toLocaleString()}
                                        </p>
                                        <p className="font-medium text-slate-700 text-sm">{mov.descripcion}</p>
                                        {mov.monto < 0 && <p className="text-[10px] text-slate-400 mt-1">Pago en: {mov.metodo_pago}</p>}
                                    </div>
                                    <div className={`text-right font-bold ${mov.monto > 0 ? "text-red-500" : "text-green-500"}`}>
                                        <div className="flex items-center justify-end gap-1">
                                            {mov.monto > 0 ? <ArrowUpRight size={14}/> : <ArrowDownLeft size={14}/>}
                                            <span className="text-lg">$ {Math.abs(mov.monto).toLocaleString()}</span>
                                        </div>
                                        <p className="text-[10px] uppercase font-bold opacity-50">{mov.monto > 0 ? "Fiado" : "Pago"}</p>
                                    </div>
                                </div>
                            ))}
                            {historial.length === 0 && (
                                <p className="text-center text-slate-400 text-sm py-10">Sin movimientos registrados.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden">
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2"><User size={20}/> Nuevo Cliente</h3>
                    <button onClick={() => setShowModal(false)}><X/></button>
                </div>
                <form onSubmit={handleCrearCliente} className="p-6 flex flex-col gap-4">
                    <input className="border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Nombre Completo *" required value={nuevoCliente.nombre} onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} autoFocus />
                    <input className="border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} />
                    <input className="border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Dirección" value={nuevoCliente.direccion} onChange={e => setNuevoCliente({...nuevoCliente, direccion: e.target.value})} />
                    <input className="border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Email (Opcional)" value={nuevoCliente.email} onChange={e => setNuevoCliente({...nuevoCliente, email: e.target.value})} />
                    <button type="submit" className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg mt-2">Guardar Cliente</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL PAGO */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in overflow-hidden">
                <div className="bg-green-600 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2"><DollarSign size={20}/> Registrar Pago</h3>
                    <button onClick={() => setShowModalPago(false)}><X/></button>
                </div>
                <form onSubmit={handleRegistrarPago} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Monto a pagar</label>
                        <input 
                            type="number" 
                            className="border p-3 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-green-100 w-full text-2xl font-bold text-green-600" 
                            placeholder="$ 0.00" 
                            required 
                            value={montoPago} 
                            onChange={e => setMontoPago(e.target.value)} 
                            autoFocus 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Método de Pago</label>
                        <select 
                            className="w-full p-3 border rounded-xl bg-white font-medium"
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                        >
                            <option value="Efectivo">💵 Efectivo</option>
                            <option value="Transferencia">💳 Transferencia</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg mt-2">Confirmar Pago</button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

export default Deudores;