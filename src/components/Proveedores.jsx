import React, { useState, useEffect } from "react";
import { Truck, Search, Plus, FileText, CheckCircle, Send, History, Wallet, Package } from "lucide-react";

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  
  // Nuevo Proveedor
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  
  // Proveedor Activo y Datos
  const [provActivo, setProvActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  
  // Inputs de movimiento
  const [montoMov, setMontoMov] = useState("");
  const [descMov, setDescMov] = useState("");

  const cargarProveedores = () => {
    fetch("http://localhost:3001/proveedores")
      .then((res) => res.json())
      .then((data) => setProveedores(data));
  };

  useEffect(() => { cargarProveedores(); }, []);

  const crearProveedor = (e) => {
    e.preventDefault();
    if (!nuevoNombre) return;
    
    fetch("http://localhost:3001/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, telefono: nuevoTelefono }),
    }).then(() => {
      setNuevoNombre("");
      setNuevoTelefono("");
      cargarProveedores();
    });
  };

  const verCuenta = (prov) => {
    setProvActivo(prov);
    fetch(`http://localhost:3001/movimientos_proveedores/${prov.id}`)
      .then((res) => res.json())
      .then((data) => setHistorial(data));
  };

  const registrarMovimiento = (esPago) => {
    if (!montoMov || !provActivo) return alert("Ingresa un monto.");

    // Si es PAGO (Yo pago), resta deuda (negativo visualmente o manejo interno). 
    // En la lógica de Deuda Proveedor: 
    // Factura (Compra) = Aumenta Deuda (+)
    // Pago (Salida Caja) = Baja Deuda (-)
    
    // NOTA: En el backend, usamos la misma lógica de suma algebraica. 
    // Compra = Monto Positivo (Me endeudo)
    // Pago = Monto Negativo (Me desendeudo)
    
    const montoFinal = esPago ? -Math.abs(parseFloat(montoMov)) : Math.abs(parseFloat(montoMov));
    const descripcion = descMov || (esPago ? "Pago a proveedor" : "Compra mercadería");

    fetch("http://localhost:3001/movimientos_proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proveedor_id: provActivo.id, monto: montoFinal, descripcion }),
    })
    .then((res) => {
        if (res.ok) {
            alert("✅ Movimiento registrado");
            setMontoMov("");
            setDescMov("");
            cargarProveedores();
            verCuenta(provActivo);
        }
    });
  };

  // Enviar aviso de pago
  const enviarWhatsApp = () => {
    if (!provActivo) return;
    const mensaje = `Hola ${provActivo.nombre}, te aviso que ya registramos el pago/pedido. Saludos.`;
    const url = `https://wa.me/${provActivo.telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const deudaActiva = proveedores.find(p => p.id === provActivo?.id)?.total_deuda || 0;

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 bg-slate-100 p-6">
      
      {/* --- COLUMNA IZQUIERDA: LISTA --- */}
      <div className="w-full md:w-1/3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><Truck size={24}/></div>
            <h2 className="text-xl font-bold text-slate-800">Proveedores</h2>
        </div>
        
        {/* Crear Proveedor */}
        <form onSubmit={crearProveedor} className="flex flex-col gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <input 
                className="bg-white border border-slate-200 p-2 rounded-lg outline-none focus:border-purple-500 text-sm" 
                placeholder="Nombre Empresa / Preventista"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
            />
            <div className="flex gap-2">
                <input 
                    className="bg-white border border-slate-200 p-2 rounded-lg outline-none focus:border-purple-500 flex-1 text-sm" 
                    placeholder="Teléfono (Opcional)"
                    value={nuevoTelefono}
                    onChange={e => setNuevoTelefono(e.target.value)}
                />
                <button className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 shadow-sm">
                    <Plus size={20}/>
                </button>
            </div>
        </form>

        {/* Buscador */}
        <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-purple-500" 
                placeholder="Buscar proveedor..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
            />
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 custom-scrollbar space-y-2 pr-1">
            {filtrados.map(p => (
                <div 
                    key={p.id} 
                    onClick={() => verCuenta(p)}
                    className={`p-4 rounded-xl cursor-pointer border transition-all flex justify-between items-center group ${
                        provActivo?.id === p.id 
                        ? "bg-purple-50 border-purple-500 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-purple-300 hover:shadow-sm"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            provActivo?.id === p.id ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                            {p.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className={`font-bold leading-tight ${provActivo?.id === p.id ? "text-purple-900" : "text-slate-700"}`}>{p.nombre}</p>
                            {p.telefono && <p className="text-[10px] text-slate-400">{p.telefono}</p>}
                        </div>
                    </div>
                    {/* Deuda Proveedor: Si es > 0 significa que LE DEBO PLATA. Rojo es alerta de deuda mia. */}
                    <span className={`font-bold px-3 py-1 rounded-lg text-sm ${
                        p.total_deuda > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                        ${p.total_deuda || 0}
                    </span>
                </div>
            ))}
        </div>
      </div>

      {/* --- COLUMNA DERECHA: DETALLE --- */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
        {provActivo ? (
            <>
                {/* TARJETA RESUMEN */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center bg-gradient-to-r from-purple-900 to-indigo-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
                    <div>
                        <p className="text-purple-200 text-sm mb-1">Proveedor Seleccionado</p>
                        <h2 className="text-3xl font-bold flex items-center gap-2">
                            <Package className="text-purple-300" /> {provActivo.nombre}
                        </h2>
                    </div>
                    <div className="text-right z-10">
                        <p className="text-purple-200 text-sm mb-1">Mi Deuda Actual</p>
                        <p className="text-4xl font-bold tracking-tight text-white">
                            $ {deudaActiva.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* ACCIONES */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Monto ($)</label>
                        <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-purple-500" 
                            placeholder="0.00"
                            value={montoMov} onChange={e => setMontoMov(e.target.value)}
                        />
                    </div>
                    <div className="flex-[2] w-full">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Detalle (N° Factura / Obs)</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" 
                            placeholder="Ej: Factura 001-2300..."
                            value={descMov} onChange={e => setDescMov(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                        {/* BOTÓN FACTURA (SUMA DEUDA) */}
                        <button onClick={() => registrarMovimiento(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2" title="Ingresar Factura">
                            <FileText size={20}/> <span className="md:hidden lg:inline">FACTURA</span>
                        </button>
                        {/* BOTÓN PAGO (RESTA DEUDA) */}
                        <button onClick={() => registrarMovimiento(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border border-purple-600 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-200" title="Registrar Pago">
                            <CheckCircle size={20}/> <span className="md:hidden lg:inline">PAGAR</span>
                        </button>
                    </div>
                </div>

                {/* HISTORIAL */}
                <div className="flex justify-between items-center px-2">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={20}/> Cuenta Corriente</h3>
                    {provActivo.telefono && (
                        <button onClick={enviarWhatsApp} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                            <Send size={16}/> Enviar Aviso
                        </button>
                    )}
                </div>

                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Movimiento</th>
                                    <th className="p-4 text-right">Importe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {historial.length === 0 ? (
                                    <tr><td colSpan="3" className="p-8 text-center text-slate-400">Sin movimientos.</td></tr>
                                ) : (
                                    historial.map(mov => (
                                        <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                                                {new Date(mov.fecha).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-slate-700 font-medium">{mov.descripcion}</td>
                                            <td className={`p-4 text-right font-bold text-base ${mov.monto > 0 ? "text-red-500" : "text-green-600"}`}>
                                                {mov.monto > 0 ? (
                                                    <span className="flex items-center justify-end gap-1"><FileText size={14}/> + ${mov.monto}</span>
                                                ) : (
                                                    <span className="flex items-center justify-end gap-1"><CheckCircle size={14}/> - ${Math.abs(mov.monto)}</span>
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
            <div className="flex-1 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center">
                    <Truck size={40} className="text-purple-300"/>
                </div>
                <p className="font-medium">Selecciona un proveedor para gestionar la cuenta.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default Proveedores;