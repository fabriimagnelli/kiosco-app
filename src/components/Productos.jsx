import React, { useState, useEffect } from "react";
import { Package, Trash2, Edit, Save, Plus, Tag, TrendingUp, X, ScanBarcode } from "lucide-react";

function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({ nombre: "", precio: "", stock: "", categoria: "", codigo_barras: "" });
  const [idEditando, setIdEditando] = useState(null);
  const [nuevaCat, setNuevaCat] = useState(""); 
  const [mostrarModalAumento, setMostrarModalAumento] = useState(false);
  const [aumentoPorcentaje, setAumentoPorcentaje] = useState("");
  const [aumentoCategoria, setAumentoCategoria] = useState("Todas");

  // CAMBIO: Rutas con /api
  const cargar = () => {
    fetch("http://localhost:3001/api/productos").then(r => r.json()).then(setProductos);
    fetch("http://localhost:3001/api/categorias_productos").then(r => r.json()).then(setCategorias);
  };
  
  useEffect(() => { cargar(); }, []);

  const buscarProductoPorCodigoDeBarras = async (codigoBarras) => {
    if (!codigoBarras.trim()) return;
    try {
      const response = await fetch("http://localhost:3001/api/productos");
      const todosProductos = await response.json();
      const productoExistente = todosProductos.find(p => p.codigo_barras === codigoBarras);
      
      if (productoExistente) {
        setForm({
          nombre: productoExistente.nombre,
          precio: productoExistente.precio || "",
          stock: "",
          categoria: productoExistente.categoria || "",
          codigo_barras: codigoBarras
        });
      } else {
        setForm({
          nombre: "",
          precio: "",
          stock: "",
          categoria: "",
          codigo_barras: codigoBarras
        });
      }
    } catch (error) { console.error("Error buscar:", error); }
  };

  const guardar = (e) => {
    e.preventDefault();
    const productoAGuardar = { ...form, categoria: form.categoria || "General" };
    const metodo = idEditando ? "PUT" : "POST";
    // CAMBIO: Rutas con /api
    const url = idEditando ? `http://localhost:3001/api/productos/${idEditando}` : "http://localhost:3001/api/productos";
    
    fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productoAGuardar)
    }).then(() => {
      alert("✅ Producto guardado");
      setForm({ nombre: "", precio: "", stock: "", categoria: "", codigo_barras: "" });
      setIdEditando(null);
      cargar();
    });
  };

  const crearCategoria = () => {
    if(!nuevaCat) return;
    fetch("http://localhost:3001/api/categorias_productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCat })
    }).then(() => {
        setNuevaCat("");
        fetch("http://localhost:3001/api/categorias_productos").then(r => r.json()).then(setCategorias);
    });
  };

  const editar = (p) => { setForm(p); setIdEditando(p.id); };
  const borrar = (id) => { if(confirm("¿Borrar?")) fetch(`http://localhost:3001/api/productos/${id}`, { method: "DELETE" }).then(cargar); };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-6 p-6">
      <div className="w-full md:w-1/3 bg-white p-6 rounded-lg shadow-md h-fit border border-grey-200">
        <h2 className="text-xl font-bold mb-4 text--700">{idEditando ? "Editar" : "Nuevo"} Producto</h2>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          {/* CAMBIO: Input de Código de Barras */}
          <div>
            <label className="text-xs text-gray-500 font-bold">Código de Barras</label>
            <div className="flex items-center border rounded bg-gray-50">
                <span className="pl-2 text-gray-400">|||</span>
                <input 
                    type="text" 
                    placeholder="Escanear o escribir..." 
                    className="p-2 w-full bg-transparent outline-none" 
                    value={form.codigo_barras} 
                    onChange={e => setForm({...form, codigo_barras: e.target.value})} 
                />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
            <input type="text" className="w-full border p-3 rounded-lg" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Precio</label>
                <input type="number" className="w-full border p-3 rounded-lg" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} required />
            </div>
            <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Stock</label>
                <input type="number" className="w-full border p-3 rounded-lg" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
            <div className="flex gap-2">
                <select className="flex-1 border p-3 rounded-lg" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
            </div>
            <div className="mt-2 flex gap-2">
                <input type="text" placeholder="Nueva categoría..." className="flex-1 border p-2 rounded text-sm" value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}/>
                <button type="button" onClick={crearCategoria} className="bg-slate-200 p-2 rounded"><Plus size={16}/></button>
            </div>
          </div>
          <button className="bg-blue-600 text-white py-3 rounded-xl font-bold">Guardar Producto</button>
          {idEditando && <button type="button" onClick={() => {setIdEditando(null); setForm({nombre:"", precio:"", stock:"", categoria:"", codigo_barras: ""})}} className="text-slate-500 text-sm">Cancelar</button>}
        </form>
      </div>

      <div className="w-full md:w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-slate-50">
            <input type="text" placeholder="Buscar producto..." className="w-full border p-3 rounded-lg" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="overflow-y-auto flex-1 p-4">
            <table className="w-full text-left text-sm">
                <thead><tr><th className="p-2">Nombre</th><th className="p-2">Cat</th><th className="p-2">Precio</th><th className="p-2">Stock</th><th className="p-2">Acciones</th></tr></thead>
                <tbody>
                    {filtrados.map(p => (
                        <tr key={p.id} className="border-b">
                            <td className="p-2 font-bold">{p.nombre}</td>
                            <td className="p-2">{p.categoria}</td>
                            <td className="p-2 text-green-600 font-bold">${p.precio}</td>
                            <td className="p-2">{p.stock}</td>
                            <td className="p-2 flex gap-2">
                                <button onClick={() => editar(p)} className="text-blue-500"><Edit size={16}/></button>
                                <button onClick={() => borrar(p.id)} className="text-red-500"><Trash2 size={16}/></button>
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