import React, { useState, useEffect } from "react";

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  
  const [nuevoNombre, setNuevoNombre] = useState("");
  
  const [proveedorActivo, setProveedorActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  
  const [montoMov, setMontoMov] = useState("");
  const [descMov, setDescMov] = useState("");

  // 1. CARGAR PROVEEDORES
  const cargarProveedores = () => {
    fetch("http://localhost:3001/proveedores")
      .then((res) => res.json())
      .then((data) => setProveedores(data));
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  // 2. CREAR PROVEEDOR
  const crearProveedor = (e) => {
    e.preventDefault();
    if (!nuevoNombre) return;
    
    fetch("http://localhost:3001/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, telefono: "" }),
    }).then(() => {
      setNuevoNombre("");
      cargarProveedores();
    });
  };

  // 3. VER CUENTA
  const verCuenta = (prov) => {
    setProveedorActivo(prov);
    fetch(`http://localhost:3001/movimientos_proveedores/${prov.id}`)
      .then((res) => res.json())
      .then((data) => setHistorial(data));
  };

  // 4. REGISTRAR MOVIMIENTO
  const registrarMovimiento = (esPago) => {
    if (!montoMov || !proveedorActivo) return;

    // Si es PAGO (Salida de caja real) -> RESTAMOS deuda (Negativo)
    // Si es COMPRA (Entrada de mercadería fiada) -> SUMAMOS deuda (Positivo)
    const montoFinal = esPago ? -Math.abs(parseFloat(montoMov)) : Math.abs(parseFloat(montoMov));
    const descripcion = descMov || (esPago ? "Pago a proveedor" : "Compra de mercadería");

    fetch("http://localhost:3001/movimientos_proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        proveedor_id: proveedorActivo.id, 
        monto: montoFinal, 
        descripcion 
      }),
    })
    .then((res) => {
        if(res.ok) return res.json();
        throw new Error("Error server");
    })
    .then(() => {
        alert("✅ Registrado correctamente");
        setMontoMov(""); setDescMov("");
        cargarProveedores(); 
        verCuenta(proveedorActivo); 
    })
    .catch(err => alert("❌ Error al registrar. Revisa el servidor."));
  };

  const filtrados = proveedores.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4 p-4">
      
      {/* IZQUIERDA: LISTA */}
      <div className="w-1/3 bg-white p-4 rounded-lg shadow-md flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-purple-800">🚛 Proveedores</h2>
        
        <form onSubmit={crearProveedor} className="flex gap-2 mb-4 border-b pb-4">
            <input className="border p-2 rounded flex-1" placeholder="Nuevo proveedor..." value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
            <button className="bg-purple-600 text-white px-3 rounded font-bold">+</button>
        </form>

        <input className="border p-2 rounded w-full mb-4 bg-gray-50" placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />

        <div className="overflow-y-auto flex-1 space-y-2">
            {filtrados.map(p => (
                <div key={p.id} onClick={() => verCuenta(p)} className={`p-3 rounded cursor-pointer border flex justify-between items-center ${proveedorActivo?.id === p.id ? "bg-purple-100 border-purple-500" : "hover:bg-gray-50"}`}>
                    <span className="font-bold text-gray-700">{p.nombre}</span>
                    <span className={`font-bold ${p.total_deuda > 0 ? "text-red-600" : "text-green-600"}`}>
                        ${p.total_deuda || 0}
                    </span>
                </div>
            ))}
        </div>
      </div>

      {/* DERECHA: CUENTA CORRIENTE */}
      <div className="w-2/3 bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200 flex flex-col">
        {proveedorActivo ? (
            <>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{proveedorActivo.nombre}</h2>
                        <p className="text-gray-500">Cuenta Corriente (Lo que debemos)</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Deuda Total</p>
                        <p className={`text-4xl font-bold ${ (proveedores.find(p => p.id === proveedorActivo.id)?.total_deuda || 0) > 0 ? "text-red-600" : "text-green-600" }`}>
                            ${proveedores.find(p => p.id === proveedorActivo.id)?.total_deuda || 0}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 mb-6 bg-white p-4 rounded shadow-sm">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500">MONTO ($)</label>
                        <input type="number" className="border p-2 rounded w-full text-lg" placeholder="0.00" value={montoMov} onChange={e => setMontoMov(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500">DETALLE</label>
                        <input type="text" className="border p-2 rounded w-full text-lg" placeholder="Ej: Factura #123" value={descMov} onChange={e => setDescMov(e.target.value)} />
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={() => registrarMovimiento(false)} className="bg-red-100 text-red-700 px-4 py-2 rounded font-bold hover:bg-red-200 border border-red-200">
                            📥 Nueva Deuda
                        </button>
                        <button onClick={() => registrarMovimiento(true)} className="bg-green-100 text-green-700 px-4 py-2 rounded font-bold hover:bg-green-200 border border-green-200">
                            💸 Pagar
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded shadow overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-200 text-gray-600 text-sm uppercase">
                            <tr><th className="p-3">Fecha</th><th className="p-3">Descripción</th><th className="p-3 text-right">Monto</th></tr>
                        </thead>
                        <tbody>
                            {historial.map(mov => (
                                <tr key={mov.id} className="border-b">
                                    <td className="p-3 text-sm text-gray-500">{new Date(mov.fecha).toLocaleDateString()}</td>
                                    <td className="p-3">{mov.descripcion}</td>
                                    <td className={`p-3 text-right font-bold ${mov.monto > 0 ? "text-red-500" : "text-green-600"}`}>
                                        {mov.monto > 0 ? `+ $${mov.monto} (Deuda)` : `- $${Math.abs(mov.monto)} (Pago)`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
                <p>Selecciona un proveedor</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default Proveedores;