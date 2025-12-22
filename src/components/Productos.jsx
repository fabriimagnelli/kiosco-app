import React, { useState, useEffect } from "react";
import { Package, Trash2, Edit, Save, Plus, Tag } from "lucide-react";

function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  
  const [form, setForm] = useState({ nombre: "", precio: "", stock: "", categoria: "" });
  const [idEditando, setIdEditando] = useState(null);
  const [nuevaCat, setNuevaCat] = useState(""); // Para crear categorías al vuelo

  // Cargar datos
  const cargar = () => {
    fetch("http://localhost:3001/productos").then(r => r.json()).then(setProductos);
    fetch("http://localhost:3001/categorias_productos").then(r => r.json()).then(setCategorias);
  };
  
  useEffect(() => { cargar(); }, []);

  // Guardar Producto
  const guardar = (e) => {
    e.preventDefault();
    // Si no eligió categoría, ponemos "General" por defecto
    const productoAGuardar = { ...form, categoria: form.categoria || "General" };

    const metodo = idEditando ? "PUT" : "POST";
    const url = idEditando ? `http://localhost:3001/productos/${idEditando}` : "http://localhost:3001/productos";
    
    fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productoAGuardar)
    }).then(() => {
      alert("✅ Producto guardado");
      setForm({ nombre: "", precio: "", stock: "", categoria: "" });
      setIdEditando(null);
      cargar();
    });
  };

  // Crear Categoría Rápida
  const crearCategoria = () => {
    if(!nuevaCat) return;
    fetch("http://localhost:3001/categorias_productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCat })
    }).then(() => {
        setNuevaCat("");
        fetch("http://localhost:3001/categorias_productos").then(r => r.json()).then(setCategorias);
    });
  };

  const editar = (p) => { setForm(p); setIdEditando(p.id); };
  const borrar = (id) => { if(confirm("¿Borrar?")) fetch(`http://localhost:3001/productos/${id}`, { method: "DELETE" }).then(cargar); };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-100 p-6 gap-6">
      
      {/* IZQUIERDA: FORMULARIO */}
      <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
        <div className="flex items-center gap-2 mb-6 border-b pb-4">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Package size={24}/></div>
            <h2 className="text-xl font-bold text-slate-800">{idEditando ? "Editar" : "Nuevo"} Producto</h2>
        </div>

        <form onSubmit={guardar} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
            <input type="text" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Precio ($)</label>
                <input type="number" className="w-full border p-3 rounded-lg font-bold text-slate-700" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} required />
            </div>
            <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Stock Inicial</label>
                <input type="number" className="w-full border p-3 rounded-lg" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
            </div>
          </div>

          {/* SELECCIÓN DE CATEGORÍA */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Tag size={12}/> Categoría</label>
            <div className="flex gap-2">
                <select 
                    className="flex-1 border p-3 rounded-lg bg-white" 
                    value={form.categoria} 
                    onChange={e => setForm({...form, categoria: e.target.value})}
                >
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
            </div>
            {/* MINI FORM PARA CREAR CATEGORÍA */}
            <div className="mt-2 flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200">
                <input 
                    type="text" 
                    placeholder="Nueva categoría..." 
                    className="flex-1 bg-transparent text-sm outline-none"
                    value={nuevaCat}
                    onChange={e => setNuevaCat(e.target.value)}
                />
                <button type="button" onClick={crearCategoria} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1 rounded transition-colors">
                    <Plus size={16}/>
                </button>
            </div>
          </div>

          <button className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 mt-2 flex justify-center gap-2">
            <Save size={20}/> Guardar Producto
          </button>
          {idEditando && <button type="button" onClick={() => {setIdEditando(null); setForm({nombre:"", precio:"", stock:"", categoria:""})}} className="text-slate-500 text-sm hover:underline text-center">Cancelar edición</button>}
        </form>
      </div>

      {/* DERECHA: LISTA */}
      <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
            <input type="text" placeholder="🔍 Buscar producto..." className="w-full border p-3 rounded-lg outline-none focus:border-blue-500" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 sticky top-0 shadow-sm">
                    <tr><th className="p-4">Nombre</th><th className="p-4">Categoría</th><th className="p-4">Precio</th><th className="p-4">Stock</th><th className="p-4">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filtrados.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-slate-700">{p.nombre}</td>
                            <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs uppercase font-bold">{p.categoria || 'Gral'}</span></td>
                            <td className="p-4 text-green-600 font-bold">${p.precio}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stock <= 5 ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}>{p.stock} un.</span></td>
                            <td className="p-4 flex gap-2">
                                <button onClick={() => editar(p)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit size={16}/></button>
                                <button onClick={() => borrar(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default Productos;