import React, { useState, useEffect } from "react";
import { Truck, Search, Plus, FileText, CheckCircle, Send, History, Package, Trash2 } from "lucide-react";

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [provActivo, setProvActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [montoMov, setMontoMov] = useState("");
  const [descMov, setDescMov] = useState("");

  // CAMBIO: Rutas con /api
  const cargarProveedores = () => {
    fetch("http://localhost:3001/api/proveedores").then((res) => res.json()).then(setProveedores);
  };

  useEffect(() => { cargarProveedores(); }, []);

  const crearProveedor = (e) => {
    e.preventDefault();
    if (!nuevoNombre) return;
    // CAMBIO: Ruta con /api
    fetch("http://localhost:3001/api/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, telefono: nuevoTelefono }),
    }).then(() => { setNuevoNombre(""); setNuevoTelefono(""); cargarProveedores(); });
  };

  const eliminarProveedor = (id) => {
    if (!confirm("¿Eliminar proveedor?")) return;
    // CAMBIO: Ruta con /api
    fetch(`http://localhost:3001/api/proveedores/${id}`, { method: "DELETE" }).then(() => {
        alert("✅ Proveedor eliminado");
        if (provActivo?.id === id) setProvActivo(null);
        cargarProveedores();
    });
  };

  const verCuenta = (prov) => {
    setProvActivo(prov);
    // CAMBIO: Ruta con /api
    fetch(`http://localhost:3001/api/movimientos_proveedores/${prov.id}`).then((res) => res.json()).then(setHistorial);
  };

  const registrarMovimiento = (esPago) => {
    if (!montoMov || !provActivo) return alert("Ingresa un monto.");
    const montoFinal = esPago ? -Math.abs(parseFloat(montoMov)) : Math.abs(parseFloat(montoMov));
    const descripcion = descMov || (esPago ? "Pago a proveedor" : "Compra mercadería");

    // CAMBIO: Ruta con /api
    fetch("http://localhost:3001/api/movimientos_proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proveedor_id: provActivo.id, monto: montoFinal, descripcion }),
    })
    .then(() => { alert("✅ Registrado"); setMontoMov(""); setDescMov(""); cargarProveedores(); verCuenta(provActivo); });
  };

  const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const deudaActiva = proveedores.find(p => p.id === provActivo?.id)?.total_deuda || 0;

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 bg-slate-100 p-6">
      <div className="w-full md:w-1/3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex gap-2"><Truck/> Proveedores</h2>
        <form onSubmit={crearProveedor} className="flex flex-col gap-2 mb-4 bg-slate-50 p-3 rounded-xl border">
            <input className="bg-white border p-2 rounded-lg" placeholder="Nombre..." value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
            <div className="flex gap-2"><input className="bg-white border p-2 rounded-lg flex-1" placeholder="Tel..." value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)} /><button className="bg-purple-600 text-white p-2 rounded-lg"><Plus size={20}/></button></div>
        </form>
        <div className="relative mb-4"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {filtrados.map(p => (
                <div key={p.id} onClick={() => verCuenta(p)} className={`p-4 rounded-xl cursor-pointer border flex justify-between items-center ${provActivo?.id === p.id ? "bg-purple-50 border-purple-500" : "bg-white"}`}>
                    <div><p className="font-bold text-slate-700">{p.nombre}</p><p className="text-xs text-slate-400">{p.telefono}</p></div>
                    <div className="flex gap-2 items-center"><span className={`font-bold px-3 py-1 rounded-lg text-sm ${p.total_deuda > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>${p.total_deuda || 0}</span><button onClick={(e)=>{e.stopPropagation(); eliminarProveedor(p.id)}} className="text-red-500"><Trash2 size={16}/></button></div>
                </div>
            ))}
        </div>
      </div>
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
        {provActivo ? (
            <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center bg-purple-900 text-white">
                    <h2 className="text-3xl font-bold flex gap-2"><Package/> {provActivo.nombre}</h2>
                    <div className="text-right"><p className="text-sm">Mi Deuda</p><p className="text-4xl font-bold text-white">$ {deudaActiva.toLocaleString()}</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border flex gap-4 items-end">
                    <div className="flex-1"><label className="text-xs font-bold">Monto</label><input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={montoMov} onChange={e => setMontoMov(e.target.value)}/></div>
                    <div className="flex-[2]"><label className="text-xs font-bold">Detalle</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" value={descMov} onChange={e => setDescMov(e.target.value)}/></div>
                    <button onClick={() => registrarMovimiento(false)} className="flex-1 bg-slate-100 text-slate-700 p-3 rounded-xl font-bold flex gap-2 justify-center"><FileText/> FACTURA</button>
                    <button onClick={() => registrarMovimiento(true)} className="flex-1 bg-purple-600 text-white p-3 rounded-xl font-bold flex gap-2 justify-center"><CheckCircle/> PAGAR</button>
                </div>
                <div className="flex-1 bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col">
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-4">Fecha</th><th className="p-4">Movimiento</th><th className="p-4 text-right">Importe</th></tr></thead>
                            <tbody>{historial.map(mov => (<tr key={mov.id} className="border-b"><td className="p-4 text-slate-500">{new Date(mov.fecha).toLocaleDateString()}</td><td className="p-4">{mov.descripcion}</td><td className={`p-4 text-right font-bold ${mov.monto > 0 ? "text-red-500" : "text-green-600"}`}>$ {mov.monto}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </>
        ) : <div className="flex-1 bg-white rounded-2xl border-2 border-dashed flex items-center justify-center text-slate-400">Selecciona un proveedor</div>}
      </div>
    </div>
  );
}
export default Proveedores;