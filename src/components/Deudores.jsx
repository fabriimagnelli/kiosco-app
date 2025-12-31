import React, { useState, useEffect } from "react";
import { User, Search, Plus, ArrowUpRight, ArrowDownLeft, Send, History, DollarSign, Wallet } from "lucide-react";

function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  
  // Nuevo Cliente
  const [nuevoNombre, setNuevoNombre] = useState("");
  
  // Cliente Activo y Datos
  const [clienteActivo, setClienteActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  
  // Inputs de movimiento
  const [montoMov, setMontoMov] = useState("");
  const [descMov, setDescMov] = useState("");

  const cargarClientes = () => {
    fetch("http://localhost:3001/clientes")
      .then((res) => res.json())
      .then((data) => setClientes(data));
  };

  useEffect(() => { cargarClientes(); }, []);

  const crearCliente = (e) => {
    e.preventDefault();
    if (!nuevoNombre) return;
    
    fetch("http://localhost:3001/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, telefono: "" }),
    }).then(() => {
      setNuevoNombre("");
      cargarClientes();
    });
  };

  const verCuenta = (cliente) => {
    setClienteActivo(cliente);
    fetch(`http://localhost:3001/fiados/${cliente.id}`)
      .then((res) => res.json())
      .then((data) => setHistorial(data));
  };

  const registrarMovimiento = (esPago) => {
    if (!montoMov || !clienteActivo) return alert("Ingresa un monto.");

    const montoFinal = esPago ? -Math.abs(parseFloat(montoMov)) : Math.abs(parseFloat(montoMov));
    const descripcion = descMov || (esPago ? "Pago a cuenta" : "Compra fiado");

    fetch("http://localhost:3001/fiados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: clienteActivo.id, monto: montoFinal, descripcion }),
    })
    .then((res) => {
        if (res.ok) {
            alert("✅ Movimiento registrado");
            setMontoMov("");
            setDescMov("");
            cargarClientes(); // Actualizar saldo en lista
            verCuenta(clienteActivo); // Actualizar historial
        }
    });
  };

  // Función para enviar recordatorio por WhatsApp
  const enviarWhatsApp = () => {
    if (!clienteActivo) return;
    const saldo = clientes.find(c => c.id === clienteActivo.id)?.total_deuda || 0;
    const mensaje = `Hola ${clienteActivo.nombre}, te escribo del Kiosco. Tu saldo pendiente actual es de: $${saldo}. Saludos!`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const clientesFiltrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const saldoActivo = clientes.find(c => c.id === clienteActivo?.id)?.total_deuda || 0;

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 bg-slate-100 p-6">
      
      {/* --- COLUMNA IZQUIERDA: LISTA DE CLIENTES --- */}
      <div className="w-full md:w-1/3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Wallet size={24}/></div>
            <h2 className="text-xl font-bold text-slate-800">Cuentas Corrientes</h2>
        </div>
        
        {/* Crear Cliente */}
        <form onSubmit={crearCliente} className="flex gap-2 mb-4">
            <input 
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                placeholder="Nombre nuevo cliente..."
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
            />
            <button className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200">
                <Plus size={20}/>
            </button>
        </form>

        {/* Buscador */}
        <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500" 
                placeholder="Buscar vecino..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
            />
        </div>

        {/* Lista Scrollable */}
        <div className="overflow-y-auto flex-1 custom-scrollbar space-y-2 pr-1">
            {clientesFiltrados.map(c => (
                <div 
                    key={c.id} 
                    onClick={() => verCuenta(c)}
                    className={`p-4 rounded-xl cursor-pointer border transition-all flex justify-between items-center group ${
                        clienteActivo?.id === c.id 
                        ? "bg-blue-50 border-blue-500 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            clienteActivo?.id === c.id ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                            {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-bold ${clienteActivo?.id === c.id ? "text-blue-900" : "text-slate-700"}`}>
                            {c.nombre}
                        </span>
                    </div>
                    <span className={`font-bold px-3 py-1 rounded-lg text-sm ${
                        c.total_deuda > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                        ${c.total_deuda || 0}
                    </span>
                </div>
            ))}
        </div>
      </div>

      {/* --- COLUMNA DERECHA: DETALLE --- */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
        {clienteActivo ? (
            <>
                {/* TARJETA DE RESUMEN SUPERIOR */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 text-white relative overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

                    <div>
                        <p className="text-slate-300 text-sm mb-1">Cliente seleccionado</p>
                        <h2 className="text-3xl font-bold flex items-center gap-2">
                            <User className="text-blue-400" /> {clienteActivo.nombre}
                        </h2>
                    </div>
                    <div className="text-right z-10">
                        <p className="text-slate-300 text-sm mb-1">Saldo Actual Deuda</p>
                        <p className={`text-4xl font-bold tracking-tight ${saldoActivo > 0 ? "text-red-400" : "text-green-400"}`}>
                            $ {saldoActivo.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* AREA DE ACCIONES */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Monto ($)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                            <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="0.00"
                                value={montoMov} onChange={e => setMontoMov(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-[2] w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Descripción</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Ej: Cigarrillos, Gaseosa..."
                            value={descMov} onChange={e => setDescMov(e.target.value)}
                        />
                    </div>
                    
                    {/* BOTONES */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => registrarMovimiento(false)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2" title="Agregar Deuda">
                            <ArrowUpRight size={20}/> <span className="md:hidden lg:inline">FIAR</span>
                        </button>
                        <button onClick={() => registrarMovimiento(true)} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2" title="Registrar Pago">
                            <ArrowDownLeft size={20}/> <span className="md:hidden lg:inline">PAGAR</span>
                        </button>
                    </div>
                </div>

                {/* CABECERA HISTORIAL + WHATSAPP */}
                <div className="flex justify-between items-center px-2">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={20}/> Últimos Movimientos</h3>
                    <button 
                        onClick={enviarWhatsApp}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-transparent hover:border-green-200"
                    >
                        <Send size={16}/> Enviar Recordatorio
                    </button>
                </div>

                {/* TABLA HISTORIAL */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Descripción</th>
                                    <th className="p-4 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {historial.length === 0 ? (
                                    <tr><td colSpan="3" className="p-8 text-center text-slate-400">Sin movimientos registrados.</td></tr>
                                ) : (
                                    historial.map(mov => (
                                        <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                                                {new Date(mov.fecha).toLocaleDateString()} <span className="text-xs opacity-50 ml-1">{new Date(mov.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="p-4 text-slate-700 font-medium">{mov.descripcion}</td>
                                            <td className={`p-4 text-right font-bold text-base ${mov.monto > 0 ? "text-red-500" : "text-green-600"}`}>
                                                {mov.monto > 0 ? (
                                                    <span className="flex items-center justify-end gap-1"><ArrowUpRight size={14}/> $ {mov.monto}</span>
                                                ) : (
                                                    <span className="flex items-center justify-end gap-1"><ArrowDownLeft size={14}/> $ {Math.abs(mov.monto)}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        ) : (
            // ESTADO VACÍO (SIN SELECCIONAR)
            <div className="flex-1 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                    <User size={40} className="text-slate-300"/>
                </div>
                <p className="font-medium">Selecciona un cliente de la lista para ver su cuenta.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default Deudores;