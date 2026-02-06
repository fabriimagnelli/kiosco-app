import React, { useState, useEffect } from "react";
import { User, Plus, Search, Trash2, Edit2, Phone, MapPin, Mail, Save, X, Eye, FileText, Calendar } from "lucide-react";

function Deudores() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  
  // Estados Formulario
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");

  // Estados Edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);

  // ESTADOS PARA VER HISTORIAL (NUEVO)
  const [verHistorial, setVerHistorial] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [historialSeleccionado, setHistorialSeleccionado] = useState([]);

  // ESTADOS PARA PAGAR DEUDA
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [descripcionPago, setDescripcionPago] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = () => {
    fetch("http://localhost:3001/api/clientes")
      .then((res) => res.json())
      .then((data) => setClientes(data))
      .catch((err) => console.error(err));
  };

  const prepararEdicion = (cliente) => {
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono || "");
    setDireccion(cliente.direccion || "");
    setEmail(cliente.email || "");
    setIdEdicion(cliente.id);
    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setNombre("");
    setTelefono("");
    setDireccion("");
    setEmail("");
    setModoEdicion(false);
    setIdEdicion(null);
  };

  const verDetalles = (cliente) => {
      setClienteSeleccionado(cliente);
      // Fetch historial
      fetch(`http://localhost:3001/api/fiados/${cliente.id}`)
          .then(res => res.json())
          .then(data => {
              setHistorialSeleccionado(data);
              setVerHistorial(true);
          })
          .catch(err => console.error(err));
  };

  const cerrarDetalles = () => {
      setVerHistorial(false);
      setClienteSeleccionado(null);
      setHistorialSeleccionado([]);
      limpiarFormularioPago();
  };

  const limpiarFormularioPago = () => {
      setMontoPago("");
      setMetodoPago("Efectivo");
      setDescripcionPago("");
  };

  const registrarPago = async (e) => {
      e.preventDefault();
      if (!montoPago || parseFloat(montoPago) <= 0) {
          return alert("Ingresa un monto válido mayor a 0");
      }

      setProcesandoPago(true);

      try {
          const res = await fetch("http://localhost:3001/api/fiados", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  cliente_id: clienteSeleccionado.id,
                  monto: -parseFloat(montoPago), // Negativo porque es un pago
                  descripcion: descripcionPago || "Pago de deuda",
                  metodo_pago: metodoPago
              })
          });

          const data = await res.json();
          if (data.id || data.success) {
              alert("Pago registrado correctamente");
              // Recargar historial y clientes
              fetch(`http://localhost:3001/api/fiados/${clienteSeleccionado.id}`)
                  .then(res => res.json())
                  .then(data => setHistorialSeleccionado(data));

              cargarClientes();
              limpiarFormularioPago();
          } else {
              alert("Error al registrar el pago");
          }
      } catch (error) {
          console.error(error);
          alert("Error al registrar el pago");
      } finally {
          setProcesandoPago(false);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return alert("El nombre es obligatorio");

    const clienteData = { nombre, telefono, direccion, email };

    try {
        let url = "http://localhost:3001/api/clientes";
        let method = "POST";

        if (modoEdicion) {
            url = `http://localhost:3001/api/clientes/${idEdicion}`;
            method = "PUT";
        }

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clienteData),
        });

        const data = await res.json();
        if (data.id || data.success) {
            cargarClientes();
            cancelarEdicion();
        } else {
            alert("Error al guardar");
        }
    } catch (error) {
        console.error(error);
    }
  };

  const eliminarCliente = async (id) => {
    if (!confirm("¿Eliminar este cliente? Se borrará su historial.")) return;
    try {
      await fetch(`http://localhost:3001/api/clientes/${id}`, { method: "DELETE" });
      cargarClientes();
    } catch (error) {
      console.error(error);
    }
  };

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-blue-600" size={32} /> Clientes y Deudores
          </h1>
          <p className="text-slate-500">Gestiona tu cartera de clientes y sus cuentas corrientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-1">
            <div className={`p-6 rounded-xl shadow-sm border sticky top-6 transition-all ${modoEdicion ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? 'text-blue-700' : 'text-slate-700'}`}>
                    {modoEdicion ? <Edit2 size={20}/> : <Plus size={20} className="text-blue-500"/>} 
                    {modoEdicion ? 'Editando Cliente' : 'Nuevo Cliente'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo *</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                autoFocus={modoEdicion}
                                type="text"
                                placeholder="Nombre del cliente"
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                type="text"
                                placeholder="Ej: 381..."
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                type="text"
                                placeholder="Domicilio"
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className={`flex-1 py-3 font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 text-white ${modoEdicion ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                        >
                            {modoEdicion ? <Save size={18}/> : <Plus size={18}/>}
                            {modoEdicion ? 'GUARDAR CAMBIOS' : 'AGREGAR CLIENTE'}
                        </button>
                        
                        {modoEdicion && (
                            <button 
                                type="button" 
                                onClick={cancelarEdicion}
                                className="px-4 py-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-bold"
                            >
                                <X size={20}/>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>

        {/* LISTADO */}
        <div className="lg:col-span-2 space-y-4">
            
            {/* BUSCADOR */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Search className="text-slate-400" size={20}/>
                <input 
                    type="text"
                    placeholder="Buscar cliente..."
                    className="flex-1 outline-none text-slate-600"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Cliente</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Contacto</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Saldo (Deuda)</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {clientesFiltrados.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-700 text-base">{c.nombre}</p>
                                        {c.direccion && <p className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={10}/> {c.direccion}</p>}
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {c.telefono ? (
                                            <div className="flex items-center gap-1"><Phone size={12}/> {c.telefono}</div>
                                        ) : <span className="text-slate-300 italic">Sin teléfono</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`font-bold px-2 py-1 rounded ${c.total_deuda > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            $ {c.total_deuda?.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => verDetalles(c)}
                                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Ver Historial Completo"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => prepararEdicion(c)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar Datos"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => eliminarCliente(c.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar Cliente"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>

      {/* MODAL HISTORIAL */}
      {verHistorial && clienteSeleccionado && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  
                  {/* CABECERA MODAL */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
                      <div>
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                             <User className="text-blue-600"/> {clienteSeleccionado.nombre}
                          </h2>
                          <p className="text-slate-500 text-sm mt-1 flex gap-4">
                              <span><Phone size={12} className="inline"/> {clienteSeleccionado.telefono || 'Sin tel.'}</span>
                              <span><MapPin size={12} className="inline"/> {clienteSeleccionado.direccion || 'Sin dir.'}</span>
                          </p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs uppercase text-slate-400 font-bold">Saldo Actual</p>
                          <p className={`text-2xl font-black ${clienteSeleccionado.total_deuda > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              $ {clienteSeleccionado.total_deuda?.toFixed(2)}
                          </p>
                      </div>
                  </div>

                  {/* CUERPO MODAL (TABLA HISTORIAL) */}
                  <div className="p-0 overflow-y-auto flex-1">
                      {historialSeleccionado.length === 0 ? (
                          <div className="p-10 text-center text-slate-400">
                              No hay movimientos registrados para este cliente.
                          </div>
                      ) : (
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                                  <tr>
                                      <th className="p-4">Fecha</th>
                                      <th className="p-4">Descripción</th>
                                      <th className="p-4">Método</th>
                                      <th className="p-4 text-right">Monto</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-sm">
                                  {historialSeleccionado.map((mov) => (
                                      <tr key={mov.id}>
                                          <td className="p-4 text-slate-500">
                                              {new Date(mov.fecha).toLocaleDateString()}
                                              <span className="block text-xs opacity-50">{new Date(mov.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                          </td>
                                          <td className="p-4 font-medium text-slate-700">{mov.descripcion}</td>
                                          <td className="p-4 text-slate-500">{mov.metodo_pago}</td>
                                          <td className="p-4 text-right font-bold">
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

                  {/* PIE MODAL - FORMULARIO DE PAGO */}
                  <div className="p-6 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 rounded-b-2xl space-y-4">
                      {clienteSeleccionado.total_deuda > 0 && (
                          <form onSubmit={registrarPago} className="space-y-3">
                              <div className="grid grid-cols-3 gap-3">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-600 mb-2">Monto a Pagar</label>
                                      <div className="relative">
                                          <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                          <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              placeholder="0.00"
                                              value={montoPago}
                                              onChange={(e) => setMontoPago(e.target.value)}
                                              className="w-full pl-7 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                              disabled={procesandoPago}
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-600 mb-2">Método de Pago</label>
                                      <select
                                          value={metodoPago}
                                          onChange={(e) => setMetodoPago(e.target.value)}
                                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                          disabled={procesandoPago}
                                      >
                                          <option value="Efectivo">Efectivo</option>
                                          <option value="Transferencia">Transferencia</option>
                                          <option value="Tarjeta">Tarjeta</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-600 mb-2">Descripción (Opcional)</label>
                                      <input
                                          type="text"
                                          placeholder="Ej: Pago parcial"
                                          value={descripcionPago}
                                          onChange={(e) => setDescripcionPago(e.target.value)}
                                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                          disabled={procesandoPago}
                                      />
                                  </div>
                              </div>
                              <div className="flex justify-between items-center gap-3">
                                  <div className="text-sm text-slate-600">
                                      {montoPago && <span className="font-bold text-green-600">Pago: ${parseFloat(montoPago || 0).toFixed(2)} | Nuevo Saldo: ${(clienteSeleccionado.total_deuda - parseFloat(montoPago || 0)).toFixed(2)}</span>}
                                  </div>
                                  <div className="flex gap-2">
                                      <button
                                          type="submit"
                                          disabled={procesandoPago || !montoPago}
                                          className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                      >
                                          ✓ Registrar Pago
                                      </button>
                                  </div>
                              </div>
                          </form>
                      )}
                      <div className="flex justify-end">
                          <button
                              onClick={cerrarDetalles}
                              className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors"
                          >
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