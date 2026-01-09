import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, X, Save, Package, AlertCircle, Settings } from "lucide-react";

function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  
  // Estado del Modal Producto
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [productoForm, setProductoForm] = useState({
    id: null, nombre: "", precio: "", stock: "", categoria: "Varios", codigo_barras: ""
  });

  // Estado del Modal Categorías
  const [mostrarModalCat, setMostrarModalCat] = useState(false);
  const [nuevaCat, setNuevaCat] = useState("");

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/productos");
      if (res.ok) setProductos(await res.json());
    } catch (error) { console.error(error); }
  };

  const cargarCategorias = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/categorias_productos");
      if (res.ok) setCategorias(await res.json());
    } catch (error) { console.error(error); }
  };

  // --- GESTIÓN DE CATEGORÍAS ---
  const guardarCategoria = async (e) => {
      e.preventDefault();
      if(!nuevaCat) return;
      await fetch("http://localhost:3001/api/categorias_productos", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({nombre: nuevaCat})
      });
      setNuevaCat("");
      cargarCategorias();
  };

  const eliminarCategoria = async (id) => {
      if(!confirm("¿Borrar categoría? Los productos pasarán a 'Varios' (solo visualmente hasta que los edites).")) return;
      await fetch(`http://localhost:3001/api/categorias_productos/${id}`, { method: "DELETE" });
      cargarCategorias();
  };
  // -----------------------------

  const abrirModal = (producto = null) => {
    if (producto) {
      setEditando(true);
      setProductoForm(producto);
    } else {
      setEditando(false);
      setProductoForm({ id: null, nombre: "", precio: "", stock: "", categoria: "Varios", codigo_barras: "" });
    }
    setMostrarModal(true);
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!productoForm.nombre || !productoForm.precio) return alert("Nombre y precio obligatorios");

    const datosAEnviar = {
        ...productoForm,
        precio: parseFloat(productoForm.precio) || 0,
        stock: parseInt(productoForm.stock) || 0,
        codigo_barras: productoForm.codigo_barras || ""
    };

    const metodo = editando ? "PUT" : "POST";
    const url = editando ? `http://localhost:3001/api/productos/${productoForm.id}` : "http://localhost:3001/api/productos";

    try {
      const res = await fetch(url, {
        method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(datosAEnviar)
      });
      if (res.ok) {
        cargarProductos();
        setMostrarModal(false);
      } else alert("Error al guardar.");
    } catch (error) { console.error(error); }
  };

  const eliminarProducto = async (id) => {
    if (confirm("¿Eliminar producto?")) {
      await fetch(`http://localhost:3001/api/productos/${id}`, { method: "DELETE" });
      cargarProductos();
    }
  };

  const productosFiltrados = productos.filter(p => {
    const term = busqueda.toLowerCase();
    const coincide = (p.nombre || "").toLowerCase().includes(term) || (p.codigo_barras || "").includes(term);
    const cat = filtroCategoria === "Todas" || p.categoria === filtroCategoria;
    return coincide && cat;
  });

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="text-blue-600"/> Inventario</h1>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg"
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <button onClick={() => abrirModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200">
                <Plus size={20}/> Nuevo
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Código</th>
                <th className="p-4">Precio</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{prod.nombre}</td>
                    <td className="p-4 text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded text-xs border">{prod.categoria}</span></td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{prod.codigo_barras || "-"}</td>
                    <td className="p-4 font-bold text-green-600">$ {prod.precio}</td>
                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded font-bold text-xs ${prod.stock <= 5 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>{prod.stock}</span></td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => abrirModal(prod)} className="p-2 hover:bg-blue-50 text-blue-600 rounded"><Edit size={16}/></button>
                            <button onClick={() => eliminarProducto(prod.id)} className="p-2 hover:bg-red-50 text-red-600 rounded"><Trash2 size={16}/></button>
                        </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PRODUCTO */}
      {mostrarModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">{editando ? "Editar" : "Nuevo"} Producto</h3>
                    <button onClick={() => setMostrarModal(false)} className="hover:bg-slate-700 p-1 rounded"><X/></button>
                </div>
                <form onSubmit={guardarProducto} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                        <input type="text" required className="w-full p-3 border rounded-xl bg-slate-50"
                            value={productoForm.nombre} onChange={e => setProductoForm({...productoForm, nombre: e.target.value})} autoFocus/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio</label>
                            <input type="number" required className="w-full p-3 border rounded-xl bg-slate-50 font-bold text-green-700"
                                value={productoForm.precio} onChange={e => setProductoForm({...productoForm, precio: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock</label>
                            <input type="number" className="w-full p-3 border rounded-xl bg-slate-50"
                                value={productoForm.stock} onChange={e => setProductoForm({...productoForm, stock: e.target.value})}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código (Opcional)</label>
                        <input type="text" className="w-full p-3 border rounded-xl bg-slate-50 font-mono"
                            value={productoForm.codigo_barras} onChange={e => setProductoForm({...productoForm, codigo_barras: e.target.value})}/>
                    </div>
                    
                    {/* SELECTOR DE CATEGORÍA CON BOTÓN DE GESTIÓN */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Categoría</label>
                            <button type="button" onClick={() => setMostrarModalCat(true)} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                                <Settings size={12}/> Gestionar
                            </button>
                        </div>
                        <select className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                            value={productoForm.categoria} onChange={e => setProductoForm({...productoForm, categoria: e.target.value})}>
                            <option value="Varios">Varios</option>
                            <option value="Bebidas">Bebidas</option>
                            <option value="Almacén">Almacén</option>
                            <option value="Golosinas">Golosinas</option>
                            <option value="Limpieza">Limpieza</option>
                            {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                        </select>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg mt-2">
                        Guardar
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL GESTIONAR CATEGORÍAS */}
      {mostrarModalCat && (
        <div className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-800 p-3 flex justify-between items-center text-white">
                    <h3 className="font-bold">Categorías Personalizadas</h3>
                    <button onClick={() => setMostrarModalCat(false)} className="hover:bg-slate-700 p-1 rounded"><X size={18}/></button>
                </div>
                <div className="p-4">
                    <form onSubmit={guardarCategoria} className="flex gap-2 mb-4">
                        <input type="text" placeholder="Nueva..." className="flex-1 border p-2 rounded-lg text-sm" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} autoFocus/>
                        <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={18}/></button>
                    </form>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {categorias.length === 0 ? <p className="text-center text-slate-400 text-sm">No hay categorías extra.</p> : categorias.map(c => (
                            <div key={c.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                                <span className="text-sm font-medium">{c.nombre}</span>
                                <button onClick={() => eliminarCategoria(c.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default Productos;