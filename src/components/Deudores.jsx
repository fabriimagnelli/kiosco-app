import React, { useState, useEffect } from "react";

function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  
  // ESTADOS PARA NUEVO CLIENTE
  const [nuevoNombre, setNuevoNombre] = useState("");
  
  // ESTADOS PARA CLIENTE SELECCIONADO
  const [clienteActivo, setClienteActivo] = useState(null); // El vecino que estás mirando
  const [historial, setHistorial] = useState([]);
  
  // ESTADOS PARA AGREGAR MOVIMIENTO (Fiar o Pagar)
  const [montoMov, setMontoMov] = useState("");
  const [descMov, setDescMov] = useState("");

  // 1. CARGAR CLIENTES
  const cargarClientes = () => {
    fetch("http://localhost:3001/clientes")
      .then((res) => res.json())
      .then((data) => setClientes(data));
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // 2. CREAR CLIENTE
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

  // 3. SELECCIONAR UN CLIENTE (VER SU CUENTA)
  const verCuenta = (cliente) => {
    setClienteActivo(cliente);
    fetch(`http://localhost:3001/fiados/${cliente.id}`)
      .then((res) => res.json())
      .then((data) => setHistorial(data));
  };

// 4. AGREGAR MOVIMIENTO (MEJORADO CON CHECK DE ERROR)
  const registrarMovimiento = (esPago) => {
    if (!montoMov || !clienteActivo) {
        alert("Por favor ingresa un monto y selecciona un cliente.");
        return;
    }

    const montoFinal = esPago ? -Math.abs(parseFloat(montoMov)) : Math.abs(parseFloat(montoMov));
    const descripcion = descMov || (esPago ? "Pago a cuenta" : "Compra fiado");

    fetch("http://localhost:3001/fiados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        cliente_id: clienteActivo.id, 
        monto: montoFinal, 
        descripcion 
      }),
    })
    .then((res) => {
        // AQUÍ ESTÁ EL CAMBIO: Verificamos si salió bien (res.ok)
        if (res.ok) {
            return res.json();
        } else {
            throw new Error("Error en el servidor");
        }
    })
    .then(() => {
        // Solo llegamos acá si no hubo error
        alert("✅ Movimiento registrado correctamente");
        setMontoMov("");
        setDescMov("");
        cargarClientes(); 
        verCuenta(clienteActivo); 
    })
    .catch((error) => {
        console.error(error);
        alert("❌ Ocurrió un error. Revisa que el servidor esté encendido y la base de datos tenga las tablas creadas.");
    });
  };

  // FILTRO BUSCADOR
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4 p-4">
      
      {/* --- COLUMNA IZQUIERDA: LISTA DE GENTE --- */}
      <div className="w-1/3 bg-white p-4 rounded-lg shadow-md flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800">📒 Libreta de Deudores</h2>
        
        {/* Formulario Nuevo Cliente */}
        <form onSubmit={crearCliente} className="flex gap-2 mb-4 border-b pb-4">
            <input 
                className="border p-2 rounded flex-1" 
                placeholder="Nombre del nuevo cliente..."
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
            />
            <button className="bg-blue-600 text-white px-3 rounded font-bold">+</button>
        </form>

        {/* Buscador */}
        <input 
            className="border p-2 rounded w-full mb-4 bg-gray-50" 
            placeholder="🔍 Buscar vecino..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
        />

        {/* Lista */}
        <div className="overflow-y-auto flex-1 space-y-2">
            {clientesFiltrados.map(c => (
                <div 
                    key={c.id} 
                    onClick={() => verCuenta(c)}
                    className={`p-3 rounded cursor-pointer border flex justify-between items-center ${
                        clienteActivo?.id === c.id ? "bg-blue-100 border-blue-500" : "hover:bg-gray-50"
                    }`}
                >
                    <span className="font-bold text-gray-700">{c.nombre}</span>
                    {/* Si debe plata, se pone rojo */}
                    <span className={`font-bold ${c.total_deuda > 0 ? "text-red-600" : "text-green-600"}`}>
                        ${c.total_deuda || 0}
                    </span>
                </div>
            ))}
        </div>
      </div>

      {/* --- COLUMNA DERECHA: CUENTA DEL VECINO --- */}
      <div className="w-2/3 bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200 flex flex-col">
        {clienteActivo ? (
            <>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{clienteActivo.nombre}</h2>
                        <p className="text-gray-500">Historial de movimientos</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Deuda Total</p>
                        <p className={`text-4xl font-bold ${
                            // Recalculamos el total visualmente sumando el historial o usando el dato de la lista
                            (clientes.find(c => c.id === clienteActivo.id)?.total_deuda || 0) > 0 ? "text-red-600" : "text-green-600"
                        }`}>
                            ${clientes.find(c => c.id === clienteActivo.id)?.total_deuda || 0}
                        </p>
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex gap-4 mb-6 bg-white p-4 rounded shadow-sm">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Monto ($)</label>
                        <input 
                            type="number" className="border p-2 rounded w-full text-lg" 
                            placeholder="0.00"
                            value={montoMov} onChange={e => setMontoMov(e.target.value)}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Detalle (Opcional)</label>
                        <input 
                            type="text" className="border p-2 rounded w-full text-lg" 
                            placeholder="Ej: Fiambres varios"
                            value={descMov} onChange={e => setDescMov(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={() => registrarMovimiento(false)} className="bg-red-100 text-red-700 px-4 py-2 rounded font-bold hover:bg-red-200 border border-red-200">
                            🔻 Anotar Deuda
                        </button>
                        <button onClick={() => registrarMovimiento(true)} className="bg-green-100 text-green-700 px-4 py-2 rounded font-bold hover:bg-green-200 border border-green-200">
                            ✅ Registrar Pago
                        </button>
                    </div>
                </div>

                {/* TABLA HISTORIAL */}
                <div className="bg-white rounded shadow overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-200 text-gray-600 text-sm uppercase">
                            <tr>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historial.map(mov => (
                                <tr key={mov.id} className="border-b">
                                    <td className="p-3 text-sm text-gray-500">{new Date(mov.fecha).toLocaleDateString()}</td>
                                    <td className="p-3">{mov.descripcion}</td>
                                    <td className={`p-3 text-right font-bold ${mov.monto > 0 ? "text-red-500" : "text-green-600"}`}>
                                        {mov.monto > 0 ? `+ $${mov.monto}` : `- $${Math.abs(mov.monto)}`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
                <p>Selecciona un vecino de la lista para ver su cuenta</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default Deudores;