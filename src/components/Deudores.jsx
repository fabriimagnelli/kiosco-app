import React, { useState, useEffect } from "react";
import { User, Search, Plus, ArrowUpRight, ArrowDownLeft, Send, History, DollarSign, Wallet, Trash2 } from "lucide-react";

function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [clienteActivo, setClienteActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [montoMov, setMontoMov] = useState("");
  const [descMov, setDescMov] = useState("");

  // CAMBIO: Rutas con /api
  const cargarClientes = () => {
    fetch("http://localhost:3001/api/clientes").then((res) => res.json()).then((data) => setClientes(data));
  };

  useEffect(() => { cargarClientes(); }, []);

  const crearCliente = (e) => {
    e.preventDefault();
    if (!nuevoNombre) return;
    // CAMBIO: Ruta con /api
    fetch("http://localhost:3001/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, telefono: "" }),
    }).then(() => {
      setNuevoNombre("");
      cargarClientes();
    });
  };

  const eliminarCliente = (clienteId) => {
    if (!confirm("¿Eliminar cliente?")) return;
    // CAMBIO: Ruta con /api
    fetch(`http://localhost:3001/api/clientes/${clienteId}`, { method: "DELETE" }).then(() => {
        alert("✅ Cliente eliminado");
        if (clienteActivo?.id === clienteId) setClienteActivo(null);
        cargarClientes();
    });
  };

  const verCuenta = (cliente) => {
    setClienteActivo(cliente);
    // CAMBIO: Ruta con /api
    fetch(`http://localhost:3001/api/fiados/${cliente.id}`).then((res) => res.json()).then((data) => setHistorial(data));
  };

  const registrarMovimiento = (esPago) => {
    if (!montoMov || !clienteActivo) return alert("Ingresa un monto.");
    const montoFinal = esPago ? -Math.abs(parseFloat(montoMov)) : Math.abs(parseFloat(montoMov));
    const descripcion = descMov || (esPago ? "Pago a cuenta" : "Compra fiado");

    // CAMBIO: Ruta con /api
    fetch("http://localhost:3001/api/fiados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: clienteActivo.id, monto: montoFinal, descripcion }),
    })
    .then(() => {
        alert("✅ Movimiento registrado");
        setMontoMov(""); setDescMov(""); cargarClientes(); verCuenta(clienteActivo);
    });
  };

  const enviarWhatsApp = () => {
    if (!clienteActivo) return;
    const saldo = clientes.find(c => c.id === clienteActivo.id)?.total_deuda || 0;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${clienteActivo.nombre}, tu saldo es: $${saldo}`)}`, "_blank");
  };

  const clientesFiltrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const saldoActivo = clientes.find(c => c.id === clienteActivo?.id)?.total_deuda || 0;

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 bg-slate-100 p-6">
      <div className="w-full md:w-1/3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Wallet/> Clientes</h2>
        <form onSubmit={crearCliente} className="flex gap-2 mb-4">
            <input className="bg-slate-50 border p-3 rounded-xl flex-1" placeholder="Nuevo cliente..." value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
            <button className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={20}/></button>
        </form>
        <div className="relative mb-4"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {clientesFiltrados.map(c => (
                <div key={c.id} onClick={() => verCuenta(c)} className={`p-4 rounded-xl cursor-pointer border flex justify-between items-center ${clienteActivo?.id === c.id ? "bg-blue-50 border-blue-500" : "bg-white"}`}>
                    <span className="font-bold text-slate-700">{c.nombre}</span>
                    <div className="flex gap-2 items-center"><span className={`font-bold px-3 py-1 rounded-lg text-sm ${c.total_deuda > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>${c.total_deuda || 0}</span><button onClick={(e) => {e.stopPropagation(); eliminarCliente(c.id)}} className="text-red-400"><Trash2 size={16}/></button></div>
                </div>
            ))}
        </div>
      </div>
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
        {clienteActivo ? (
            <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center bg-slate-800 text-white">
                    <h2 className="text-3xl font-bold flex items-center gap-2"><User/> {clienteActivo.nombre}</h2>
                    <div className="text-right"><p className="text-sm">Saldo Deuda</p><p className={`text-4xl font-bold ${saldoActivo > 0 ? "text-red-400" : "text-green-400"}`}>$ {saldoActivo.toLocaleString()}</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border flex gap-4 items-end">
                    <div className="flex-1"><label className="text-xs font-bold">Monto</label><input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-lg" value={montoMov} onChange={e => setMontoMov(e.target.value)}/></div>
                    <div className="flex-[2]"><label className="text-xs font-bold">Descripción</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" value={descMov} onChange={e => setDescMov(e.target.value)}/></div>
                    <button onClick={() => registrarMovimiento(false)} className="bg-red-100 text-red-700 p-3 rounded-xl font-bold flex gap-2"><ArrowUpRight/> FIAR</button>
                    <button onClick={() => registrarMovimiento(true)} className="bg-green-100 text-green-700 p-3 rounded-xl font-bold flex gap-2"><ArrowDownLeft/> PAGAR</button>
                </div>
                <div className="flex-1 bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col">
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-4">Fecha</th><th className="p-4">Detalle</th><th className="p-4 text-right">Monto</th></tr></thead>
                            <tbody>{historial.map(mov => (<tr key={mov.id} className="border-b"><td className="p-4 text-slate-500">{new Date(mov.fecha).toLocaleDateString()}</td><td className="p-4">{mov.descripcion}</td><td className={`p-4 text-right font-bold ${mov.monto > 0 ? "text-red-500" : "text-green-600"}`}>$ {mov.monto}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </>
        ) : <div className="flex-1 bg-white rounded-2xl border-2 border-dashed flex items-center justify-center text-slate-400">Selecciona un cliente</div>}
      </div>
    </div>
  );
}
export default Deudores;