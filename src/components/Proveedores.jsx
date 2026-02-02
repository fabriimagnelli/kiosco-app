import React, { useState, useEffect } from "react";
import { Truck, Plus, Search, Trash2, Edit2, Phone, MapPin, Calendar, Tag, Save, X, Eye } from "lucide-react";

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // Estados Formulario
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [diaVisita, setDiaVisita] = useState("");
  const [rubro, setRubro] = useState("");

  // Estados Edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);

  // ESTADOS HISTORIAL (NUEVO)
  const [verHistorial, setVerHistorial] = useState(false);
  const [provSeleccionado, setProvSeleccionado] = useState(null);
  const [historialSeleccionado, setHistorialSeleccionado] = useState([]);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = () => {
    fetch("http://localhost:3001/api/proveedores")
      .then((res) => res.json())
      .then((data) => setProveedores(data))
      .catch((err) => console.error(err));
  };

  const prepararEdicion = (prov) => {
    setNombre(prov.nombre);
    setTelefono(prov.telefono || "");
    setDireccion(prov.direccion || "");
    setDiaVisita(prov.dia_visita || "");
    setRubro(prov.rubro || "");
    setIdEdicion(prov.id);
    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setNombre("");
    setTelefono("");
    setDireccion("");
    setDiaVisita("");
    setRubro("");
    setModoEdicion(false);
    setIdEdicion(null);
  };

  const verDetalles = (prov) => {
      setProvSeleccionado(prov);
      fetch(`http://localhost:3001/api/movimientos_proveedores/${prov.id}`)
          .then(res => res.json())
          .then(data => {
              setHistorialSeleccionado(data);
              setVerHistorial(true);
          })
          .catch(err => console.error(err));
  };

  const cerrarDetalles = () => {
      setVerHistorial(false);
      setProvSeleccionado(null);
      setHistorialSeleccionado([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return alert("El nombre es obligatorio");

    const provData = { nombre, telefono, direccion, dia_visita: diaVisita, rubro };

    try {
      let url = "http://localhost:3001/api/proveedores";
      let method = "POST";

      if (modoEdicion) {
          url = `http://localhost:3001/api/proveedores/${idEdicion}`;
          method = "PUT";
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provData),
      });

      const data = await res.json();
      if (data.success || data.id) {
        cargarProveedores();
        cancelarEdicion();
      } else {
        alert("Error al guardar");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarProveedor = async (id) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try {
      await fetch(`http://localhost:3001/api/proveedores/${id}`, { method: "DELETE" });
      cargarProveedores();
    } catch (error) {
      console.error(error);
    }
  };
  
  // Calcular saldo total (sumatoria de movimientos)
  const calcularSaldo = (movimientos) => {
      if(!movimientos) return 0;
      // Positivos son deuda (compras), negativos son pagos
      // Queremos mostrar cuánto DEBO al proveedor.
      // Si la suma es positiva, le debo. Si es negativa, tengo saldo a favor.
      // (Asumiendo que el backend envía todo junto en 'proveedores' no hace falta calcularlo aquí si ya viniera, 
      // pero 'proveedores' endpoint no trae el saldo en la query actual de index.js para proveedores, asi que ojo)
      // CORRECCIÓN: El endpoint GET /api/proveedores NO estaba calculando el saldo. 
      // Para mostrarlo en la tabla principal, deberíamos modificar el backend.
      // Por ahora, mostraré el saldo DENTRO del modal que sí trae los movimientos.
      return movimientos.reduce((acc, mov) => acc + mov.monto, 0);
  };

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="text-indigo-600" size={32} /> Proveedores
          </h1>
          <p className="text-slate-500">Gestiona tus proveedores y días de visita.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-1">
            <div className={`p-6 rounded-xl shadow-sm border sticky top-6 transition-all ${modoEdicion ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {modoEdicion ? <Edit2 size={20}/> : <Plus size={20} className="text-indigo-500"/>} 
                    {modoEdicion ? 'Editando Proveedor' : 'Nuevo Proveedor'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Empresa / Nombre *</label>
                        <div className="relative">
                            <Truck size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                autoFocus={modoEdicion}
                                type="text"
                                placeholder="Nombre del proveedor"
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Rubro</label>
                        <div className="relative">
                            <Tag size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                type="text"
                                placeholder="Ej: Bebidas, Golosinas..."
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={rubro}
                                onChange={(e) => setRubro(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Día de Visita</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <select
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                value={diaVisita}
                                onChange={(e) => setDiaVisita(e.target.value)}
                            >
                                <option value="">Sin día fijo</option>
                                <option value="Lunes">Lunes</option>
                                <option value="Martes">Martes</option>
                                <option value="Miércoles">Miércoles</option>
                                <option value="Jueves">Jueves</option>
                                <option value="Viernes">Viernes</option>
                                <option value="Sábado">Sábado</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                type="text"
                                placeholder="Teléfono de contacto"
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className={`flex-1 py-3 font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 text-white ${modoEdicion ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                        >
                            {modoEdicion ? <Save size={18}/> : <Plus size={18}/>}
                            {modoEdicion ? 'GUARDAR CAMBIOS' : 'AGREGAR PROVEEDOR'}
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
                    placeholder="Buscar proveedor..."
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
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Proveedor</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Rubro/Día</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Contacto</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {proveedoresFiltrados.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-700 text-base">{p.nombre}</p>
                                        {p.direccion && <p className="text-slate-500 text-xs flex items-center gap-1"><MapPin size={10}/> {p.direccion}</p>}
                                    </td>
                                    <td className="p-4">
                                        {p.rubro && (
                                            <span className="block text-xs font-bold text-indigo-600 mb-1">{p.rubro}</span>
                                        )}
                                        {p.dia_visita ? (
                                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs border border-green-100">
                                                <Calendar size={10}/> {p.dia_visita}
                                            </span>
                                        ) : <span className="text-slate-400 text-xs italic">Sin día</span>}
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {p.telefono ? (
                                            <div className="flex items-center gap-1"><Phone size={12}/> {p.telefono}</div>
                                        ) : <span className="text-slate-300 italic">-</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => verDetalles(p)}
                                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Ver Historial"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => prepararEdicion(p)}
                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Editar Datos"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => eliminarProveedor(p.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar Proveedor"
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
      {verHistorial && provSeleccionado && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  
                  {/* CABECERA */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
                      <div>
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                             <Truck className="text-indigo-600"/> {provSeleccionado.nombre}
                          </h2>
                          <p className="text-slate-500 text-sm mt-1 flex gap-4">
                              <span><Phone size={12} className="inline"/> {provSeleccionado.telefono || 'Sin tel.'}</span>
                              {provSeleccionado.rubro && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{provSeleccionado.rubro}</span>}
                          </p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs uppercase text-slate-400 font-bold">Saldo Pendiente (Deuda)</p>
                          <p className={`text-2xl font-black ${calcularSaldo(historialSeleccionado) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              $ {calcularSaldo(historialSeleccionado).toFixed(2)}
                          </p>
                      </div>
                  </div>

                  {/* TABLA HISTORIAL */}
                  <div className="p-0 overflow-y-auto flex-1">
                      {historialSeleccionado.length === 0 ? (
                          <div className="p-10 text-center text-slate-400">
                              No hay movimientos registrados para este proveedor.
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
                                                  <span className="text-red-600 flex justify-end items-center gap-1">
                                                      (Compra) +${mov.monto.toFixed(2)}
                                                  </span>
                                              ) : (
                                                  <span className="text-green-600 flex justify-end items-center gap-1">
                                                      (Pago) -${Math.abs(mov.monto).toFixed(2)}
                                                  </span>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                  </div>

                  {/* PIE */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
                      <button 
                          onClick={cerrarDetalles}
                          className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors"
                      >
                          Cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

export default Proveedores;