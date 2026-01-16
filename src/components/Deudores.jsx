import React, { useState, useEffect } from "react";
import { User, DollarSign, Plus, Eye, X, Smartphone, CreditCard, Trash2, Edit2, Save } from "lucide-react";

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", telefono: "" });
  
  // Estado para editar
  const [editandoCliente, setEditandoCliente] = useState(null); 

  // Estados para Modal de Detalle/Pagos
  const [clienteSelec, setClienteSelec] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [montoPago, setMontoPago] = useState("");
  const [descPago, setDescPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = () => {
    fetch("http://localhost:3001/api/clientes")
      .then(res => res.json())
      .then(setClientes);
  };

  const crearCliente = (e) => {
    e.preventDefault();
    if(!nuevoCliente.nombre) return;
    fetch("http://localhost:3001/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoCliente)
    }).then(() => {
        setNuevoCliente({ nombre: "", telefono: "" });
        cargarClientes();
    });
  };

  const iniciarEdicion = (cliente) => {
    setEditandoCliente({ ...cliente });
  };

  const guardarEdicion = () => {
    if (!editandoCliente.nombre) return;
    fetch(`http://localhost:3001/api/clientes/${editandoCliente.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editandoCliente.nombre, telefono: editandoCliente.telefono })
    }).then(() => {
        setEditandoCliente(null);
        cargarClientes();
    });
  };

  const verDetalle = (cliente) => {
    setClienteSelec(cliente);
    cargarHistorial(cliente.id);
  };

  const cargarHistorial = (id) => {
    fetch(`http://localhost:3001/api/fiados/${id}`)
        .then(res => res.json())
        .then(setHistorial);
  };

  const registrarPago = (e) => {
    e.preventDefault();
    if(!montoPago) return;

    fetch("http://localhost:3001/api/fiados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            cliente_id: clienteSelec.id, 
            monto: -Math.abs(parseFloat(montoPago)), 
            descripcion: descPago || "Pago a cuenta",
            metodo_pago: metodoPago
        })
    }).then(() => {
        setMontoPago("");
        setDescPago("");
        setMetodoPago("Efectivo");
        cargarHistorial(clienteSelec.id);
        cargarClientes();
    });
  };

  const eliminarTransaccion = (id) => {
    if(!confirm("¿Estás seguro de eliminar este movimiento? Esto afectará el saldo del cliente.")) return;
    fetch(`http://localhost:3001/api/fiados/${id}`, { method: "DELETE" })
      .then(() => {
          cargarHistorial(clienteSelec.id);
          cargarClientes();
      });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6">
      
      {/* FORMULARIO CREAR CLIENTE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <User size={20} className="text-blue-600"/> Nuevo Cliente
        </h2>
        <form onSubmit={crearCliente} className="flex gap-4">
            <input 
                className="flex-1 p-3 border rounded-xl" 
                placeholder="Nombre del Cliente" 
                value={nuevoCliente.nombre}
                onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
            />
            <input 
                className="w-48 p-3 border rounded-xl" 
                placeholder="Teléfono" 
                value={nuevoCliente.telefono}
                onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
            />
            <button className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 font-bold">
                <Plus size={24}/>
            </button>
        </form>
      </div>

      {/* LISTA DE CLIENTES */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b font-bold text-slate-500 text-xs uppercase grid grid-cols-12 gap-4">
            <div className="col-span-4">Nombre</div>
            <div className="col-span-3">Teléfono</div>
            <div className="col-span-3 text-right">Saldo Deudor</div>
            <div className="col-span-2 text-center">Acciones</div>
        </div>
        <div className="flex-1 overflow-y-auto">
            {clientes.map(c => (
                <div key={c.id} className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-slate-50 items-center">
                    
                    {/* NOMBRE Y TELÉFONO (EDITABLE) */}
                    {editandoCliente && editandoCliente.id === c.id ? (
                        <>
                            <div className="col-span-4">
                                <input 
                                    className="w-full p-1 border rounded"
                                    value={editandoCliente.nombre}
                                    onChange={e => setEditandoCliente({...editandoCliente, nombre: e.target.value})}
                                />
                            </div>
                            <div className="col-span-3">
                                <input 
                                    className="w-full p-1 border rounded"
                                    value={editandoCliente.telefono}
                                    onChange={e => setEditandoCliente({...editandoCliente, telefono: e.target.value})}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="col-span-4 font-bold text-slate-700">{c.nombre}</div>
                            <div className="col-span-3 text-slate-500 text-sm flex items-center gap-1">
                                <Smartphone size={14}/> {c.telefono || "-"}
                            </div>
                        </>
                    )}

                    <div className={`col-span-3 text-right font-bold text-lg ${c.total_deuda > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        $ {c.total_deuda ? c.total_deuda.toLocaleString() : "0"}
                    </div>
                    
                    <div className="col-span-2 text-center flex justify-center gap-2">
                        {editandoCliente && editandoCliente.id === c.id ? (
                            <>
                                <button onClick={guardarEdicion} className="bg-green-100 text-green-600 p-2 rounded-lg hover:bg-green-200">
                                    <Save size={18}/>
                                </button>
                                <button onClick={() => setEditandoCliente(null)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200">
                                    <X size={18}/>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => iniciarEdicion(c)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-orange-100 hover:text-orange-600 transition-colors" title="Editar">
                                    <Edit2 size={18}/>
                                </button>
                                <button onClick={() => verDetalle(c)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Ver Historial">
                                    <Eye size={18}/>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* MODAL DETALLE Y PAGOS */}
      {clienteSelec && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                
                <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{clienteSelec.nombre}</h2>
                        <p className="text-sm text-slate-500">Historial de movimientos</p>
                    </div>
                    <button onClick={() => setClienteSelec(null)} className="text-slate-400 hover:text-red-500">
                        <X size={24}/>
                    </button>
                </div>

                {/* FORMULARIO DE PAGO */}
                <div className="p-6 bg-blue-50 border-b border-blue-100">
                    <h3 className="text-sm font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                        <DollarSign size={16}/> Registrar Pago
                    </h3>
                    <form onSubmit={registrarPago} className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <input 
                                type="number" 
                                className="w-full p-3 border border-blue-200 rounded-lg"
                                placeholder="Monto ($)"
                                value={montoPago}
                                onChange={e => setMontoPago(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <input 
                                type="text" 
                                className="w-full p-3 border border-blue-200 rounded-lg"
                                placeholder="Descripción (Opcional)"
                                value={descPago}
                                onChange={e => setDescPago(e.target.value)}
                            />
                        </div>
                        
                        <div className="w-full md:w-40 relative">
                            <CreditCard size={16} className="absolute left-3 top-3.5 text-blue-400"/>
                            <select 
                                className="w-full pl-9 pr-3 py-3 border border-blue-200 rounded-lg bg-white text-blue-900 font-bold text-sm outline-none cursor-pointer"
                                value={metodoPago}
                                onChange={e => setMetodoPago(e.target.value)}
                            >
                                <option value="Efectivo">Efectivo</option>
                                <option value="Transferencia">Transferencia</option>
                            </select>
                        </div>

                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors">
                            PAGAR
                        </button>
                    </form>
                </div>

                {/* LISTA HISTORIAL CON BOTÓN ELIMINAR */}
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0">
                            <tr>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4 text-center">Método</th>
                                <th className="p-4 text-right">Monto</th>
                                <th className="p-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historial.map(h => (
                                <tr key={h.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-4 text-xs text-slate-500">
                                        {new Date(h.fecha).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-700">{h.descripcion}</td>
                                    <td className="p-4 text-center">
                                        {h.monto < 0 && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                                h.metodo_pago === 'Transferencia' 
                                                ? 'bg-purple-50 text-purple-600 border-purple-100'
                                                : 'bg-green-50 text-green-600 border-green-100'
                                            }`}>
                                                {h.metodo_pago || 'Efectivo'}
                                            </span>
                                        )}
                                    </td>
                                    <td className={`p-4 text-right font-bold ${h.monto > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        $ {Math.abs(h.monto).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => eliminarTransaccion(h.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                            title="Eliminar movimiento"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
      )}

    </div>
  );
}

export default Clientes;