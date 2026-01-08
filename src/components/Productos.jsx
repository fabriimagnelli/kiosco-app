import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, X, Save, Package, AlertCircle } from "lucide-react";

function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  
  // Estado del Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [productoForm, setProductoForm] = useState({
    id: null,
    nombre: "",
    precio: "",
    stock: "",
    categoria: "Varios",
    codigo_barras: ""
  });

  // Cargar datos al inicio
  useEffect(() => {
    cargarProductos();
    cargarCategorias();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/productos");
      if (res.ok) {
        const data = await res.json();
        // PROTECCIÓN: Aseguramos que data sea un array siempre
        setProductos(Array.isArray(data) ? data : []);
      } else {
        console.error("Error al cargar productos del servidor");
        setProductos([]); 
      }
    } catch (error) { 
        console.error("Error de conexión:", error);
        setProductos([]);
    }
  };

  const cargarCategorias = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/categorias_productos");
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      }
    } catch (error) { console.error(error); }
  };

  const abrirModal = (producto = null) => {
    if (producto) {
      setEditando(true);
      setProductoForm(producto);
    } else {
      setEditando(false);
      setProductoForm({
        id: null,
        nombre: "",
        precio: "",
        stock: "",
        categoria: "Varios",
        codigo_barras: ""
      });
    }
    setMostrarModal(true);
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    
    if (!productoForm.nombre || !productoForm.precio) {
      alert("El nombre y el precio son obligatorios.");
      return;
    }

    // Convertimos datos para evitar errores de tipo
    const datosAEnviar = {
        ...productoForm,
        precio: parseFloat(productoForm.precio) || 0,
        stock: parseInt(productoForm.stock) || 0, // Si está vacío mandamos 0
        codigo_barras: productoForm.codigo_barras || ""
    };

    const metodo = editando ? "PUT" : "POST";
    const url = editando 
      ? `http://localhost:3001/api/productos/${productoForm.id}` 
      : "http://localhost:3001/api/productos";

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosAEnviar)
      });

      if (res.ok) {
        cargarProductos();
        setMostrarModal(false);
        setProductoForm({ id: null, nombre: "", precio: "", stock: "", categoria: "Varios", codigo_barras: "" });
      } else {
        alert("Error al guardar. Revisa la consola.");
      }
    } catch (error) {
      console.error("Error guardando:", error);
    }
  };

  const eliminarProducto = async (id) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      try {
        await fetch(`http://localhost:3001/api/productos/${id}`, { method: "DELETE" });
        cargarProductos();
      } catch (error) { console.error(error); }
    }
  };

  // Filtrado Seguro
  const productosFiltrados = productos.filter(p => {
    if (!p) return false; // Ignorar nulos
    const nombre = p.nombre || ""; // Evitar error si nombre es null
    const codigo = p.codigo_barras || "";

    const coincideNombre = nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCodigo = codigo.includes(busqueda);
    const coincideCategoria = filtroCategoria === "Todas" || p.categoria === filtroCategoria;
    return (coincideNombre || coincideCodigo) && coincideCategoria;
  });

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6">
      
      {/* Header y Herramientas */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600"/> Inventario de Productos
          </h1>
          <p className="text-slate-500 text-sm">Gestiona precios, stock y códigos.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o código..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
            </div>
            <button 
                onClick={() => abrirModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
                <Plus size={20}/> Nuevo
            </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Cód. Barras</th>
                <th className="p-4">Precio</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {productosFiltrados.length === 0 ? (
                <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <AlertCircle size={32} className="opacity-50"/>
                        <span>No se encontraron productos. Intenta cargar uno nuevo.</span>
                    </td>
                </tr>
              ) : (
                productosFiltrados.map((prod) => (
                  <tr key={prod.id || Math.random()} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{prod.nombre || "Sin nombre"}</td>
                    <td className="p-4 text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded text-xs border">{prod.categoria || "Varios"}</span></td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{prod.codigo_barras || "-"}</td>
                    <td className="p-4 font-bold text-green-600">$ {prod.precio}</td>
                    <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded font-bold text-xs ${prod.stock <= 5 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                            {prod.stock || 0}
                        </span>
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => abrirModal(prod)} className="p-2 hover:bg-blue-50 text-blue-600 rounded"><Edit size={16}/></button>
                            <button onClick={() => eliminarProducto(prod.id)} className="p-2 hover:bg-red-50 text-red-600 rounded"><Trash2 size={16}/></button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">{editando ? "Editar Producto" : "Nuevo Producto"}</h3>
                    <button onClick={() => setMostrarModal(false)} className="hover:bg-slate-700 p-1 rounded"><X/></button>
                </div>
                <form onSubmit={guardarProducto} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Producto</label>
                        <input type="text" required className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-slate-700"
                            value={productoForm.nombre} onChange={e => setProductoForm({...productoForm, nombre: e.target.value})} autoFocus/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio ($)</label>
                            <input type="number" required className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 outline-none font-bold text-green-700"
                                value={productoForm.precio} onChange={e => setProductoForm({...productoForm, precio: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Actual</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                                value={productoForm.stock} onChange={e => setProductoForm({...productoForm, stock: e.target.value})}/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código de Barras (Opcional)</label>
                        <div className="relative">
                            <input type="text" className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-purple-500 outline-none font-mono"
                                placeholder="Escanear o escribir..."
                                value={productoForm.codigo_barras} onChange={e => setProductoForm({...productoForm, codigo_barras: e.target.value})}/>
                            <div className="absolute left-3 top-3.5 text-slate-400"><Package size={18}/></div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                        <select className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-none"
                            value={productoForm.categoria} onChange={e => setProductoForm({...productoForm, categoria: e.target.value})}>
                            <option value="Varios">Varios</option>
                            <option value="Bebidas">Bebidas</option>
                            <option value="Almacén">Almacén</option>
                            <option value="Golosinas">Golosinas</option>
                            <option value="Limpieza">Limpieza</option>
                            {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                        </select>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 mt-2 flex justify-center items-center gap-2">
                        <Save size={20}/> Guardar Producto
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

export default Productos;