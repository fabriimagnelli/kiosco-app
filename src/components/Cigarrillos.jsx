import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, X, Cigarette, DollarSign } from "lucide-react";

function Cigarrillos() {
  const [cigarrillos, setCigarrillos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Estados Formulario
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioQr, setPrecioQr] = useState("");
  const [stock, setStock] = useState("");
  const [codigo, setCodigo] = useState("");
  
  // Estado para MODO EDICIÓN
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/cigarrillos");
      if (res.ok) {
        const data = await res.json();
        setCigarrillos(data);
        setLoading(false);
      }
    } catch (error) { 
      console.error(error);
      setLoading(false);
    }
  };

  const guardarCigarrillo = async (e) => {
    e.preventDefault();
    
    // Validación mejorada
    if (!nombre || !nombre.trim()) {
      alert("❌ El nombre del cigarrillo es obligatorio");
      return;
    }
    if (!precio || isNaN(parseFloat(precio))) {
      alert("❌ El precio es obligatorio y debe ser un número");
      return;
    }

    const cigData = {
      nombre: nombre.trim(),
      precio: parseFloat(precio),
      precio_qr: parseFloat(precioQr) || parseFloat(precio),
      stock: parseInt(stock) || 0,
      codigo_barras: codigo.trim()
    };

    console.log("📤 Enviando cigarrillo:", cigData);

    try {
      let url = "http://localhost:3001/api/cigarrillos";
      let method = "POST";

      if (modoEdicion) {
        url = `http://localhost:3001/api/cigarrillos/${idEdicion}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cigData),
      });
      
      console.log("📊 Respuesta del servidor - Status:", res.status);
      
      const data = await res.json();
      console.log("📨 Datos recibidos:", data);
      
      if (data.id || data.updated) {
        // Reset form
        setNombre("");
        setPrecio("");
        setPrecioQr("");
        setStock("");
        setCodigo("");
        
        setModoEdicion(false);
        setIdEdicion(null);
        
        cargarDatos();
        alert(modoEdicion ? "✅ Cigarrillo actualizado correctamente" : "✅ Cigarrillo agregado correctamente");
      } else {
        const errorMsg = data.error || "Error desconocido al guardar el cigarrillo";
        console.error("❌ Error en respuesta del servidor:", data);
        alert(`❌ Error al guardar:\n${errorMsg}`);
      }
    } catch (error) {
      console.error("❌ Error en fetch:", error);
      alert(`❌ Error de conexión:\n${error.message}\n\nAsegúrate que el servidor esté corriendo en http://localhost:3001`);
    }
  };

  const prepararEdicion = (cig) => {
    setNombre(cig.nombre);
    setPrecio(cig.precio);
    setPrecioQr(cig.precio_qr || cig.precio);
    setStock(cig.stock);
    setCodigo(cig.codigo_barras || "");
    
    setModoEdicion(true);
    setIdEdicion(cig.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setIdEdicion(null);
    setNombre("");
    setPrecio("");
    setPrecioQr("");
    setStock("");
    setCodigo("");
  };

  const filtrados = cigarrillos.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.codigo_barras && c.codigo_barras.includes(busqueda))
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Cigarette className="text-yellow-600" size={32}/>
                Inventario de Cigarrillos
            </h1>
            <p className="text-slate-500 mt-1">Administra marcas, precios y stock.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO DE CARGA/EDICIÓN */}
        <div className="lg:col-span-1">
            <div className={`p-6 rounded-xl shadow-sm border sticky top-6 transition-all ${modoEdicion ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? 'text-yellow-700' : 'text-slate-700'}`}>
                    {modoEdicion ? <Edit size={20}/> : <Plus size={20} className="text-yellow-600"/>}
                    {modoEdicion ? 'Editar Cigarrillo' : 'Nuevo Cigarrillo'}
                </h3>
                
                <form onSubmit={guardarCigarrillo} className="space-y-4">
                    
                    {/* NOMBRE */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Marca / Variedad</label>
                        <input 
                            autoFocus={modoEdicion}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                            placeholder="Ej: Marlboro Gold"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* PRECIO EFECTIVO */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Precio Efectivo</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                                <input 
                                    type="number"
                                    className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-700"
                                    placeholder="0.00"
                                    value={precio}
                                    onChange={e => setPrecio(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* PRECIO QR */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Precio Digital (QR)</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                                <input 
                                    type="number"
                                    className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                                    placeholder="Igual a Efectivo"
                                    value={precioQr}
                                    onChange={e => setPrecioQr(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* STOCK */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Stock</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                                placeholder="0"
                                value={stock}
                                onChange={e => setStock(e.target.value)}
                            />
                        </div>
                        {/* CÓDIGO BARRAS */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Código Barras</label>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                                placeholder="Scannear..."
                                value={codigo}
                                onChange={e => setCodigo(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* BOTONES ACCIÓN */}
                    <div className="flex gap-2 pt-2">
                        <button 
                            type="submit"
                            className={`flex-1 py-3 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 ${modoEdicion ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                        >
                            {modoEdicion ? <Edit size={18}/> : <Plus size={18}/>}
                            {modoEdicion ? 'GUARDAR CAMBIOS' : 'AGREGAR CIGARRILLO'}
                        </button>
                        
                        {modoEdicion && (
                            <button 
                                type="button"
                                onClick={cancelarEdicion}
                                className="px-4 py-3 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors"
                            >
                                <X size={20}/>
                            </button>
                        )}
                    </div>

                </form>
            </div>
        </div>

        {/* LISTA DE CIGARRILLOS */}
        <div className="lg:col-span-2">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 sticky top-6 z-20">
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <Search className="text-slate-400" size={20}/>
                    <input 
                        className="bg-transparent outline-none w-full text-slate-700"
                        placeholder="Buscar por marca o código de barras..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Marca / Variedad</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Precio Efectivo</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Precio QR</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Stock</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando...</td></tr>
                            ) : filtrados.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No se encontraron cigarrillos.</td></tr>
                            ) : (
                                filtrados.map((cig) => (
                                    <tr key={cig.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{cig.nombre}</div>
                                            <div className="text-xs text-slate-400">Cód: {cig.codigo_barras || "-"}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="font-bold text-green-600">$ {parseFloat(cig.precio).toFixed(2)}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="font-bold text-blue-600">$ {parseFloat(cig.precio_qr).toFixed(2)}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded font-bold text-xs ${cig.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {cig.stock}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => prepararEdicion(cig)}
                                                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                                                >
                                                    <Edit size={18}/>
                                                </button>
                                                <button 
                                                    onClick={() => eliminarCigarrillo(cig.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>                    </table>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default Cigarrillos;