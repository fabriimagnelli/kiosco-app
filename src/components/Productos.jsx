import React, { useState, useEffect } from "react";
import { Package, Plus, Trash2, Edit, Search, Barcode, DollarSign, Tag, Settings, Check } from "lucide-react";

function Productos() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados Formulario
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [stock, setStock] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("General");
  
  // Estado para MODO EDICIÓN
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);

  // Estados GESTIÓN CATEGORÍAS
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [mostrarGestorCategorias, setMostrarGestorCategorias] = useState(false);
  const [nuevaCategoriaInput, setNuevaCategoriaInput] = useState("");

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
  }, []);

  const cargarProductos = () => {
    fetch("http://localhost:3001/api/productos")
      .then((res) => res.json())
      .then((data) => {
        setProductos(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  };

  const cargarCategorias = () => {
      fetch("http://localhost:3001/api/categorias")
        .then(r => r.json())
        .then(data => {
            const cats = new Set(["General", ...data]);
            setCategoriasDisponibles([...cats]);
        });
  };

  // Función para AGREGAR categoría desde el gestor
  const agregarCategoriaManual = () => {
      const nueva = nuevaCategoriaInput.trim();
      if(!nueva) return;
      
      // Capitalizar primera letra (opcional, para que se vea bonito)
      const nombreFormatted = nueva.charAt(0).toUpperCase() + nueva.slice(1);

      // Si no existe, la agregamos a la lista localmente
      if(!categoriasDisponibles.includes(nombreFormatted)) {
          setCategoriasDisponibles([...categoriasDisponibles, nombreFormatted]);
      }
      
      // La seleccionamos automáticamente
      setCategoria(nombreFormatted);
      setNuevaCategoriaInput(""); // Limpiar input
  };

  const eliminarCategoria = async (nombreCat) => {
      if(nombreCat === 'General') return alert("No se puede eliminar la categoría General.");
      if(!confirm(`¿Eliminar la categoría "${nombreCat}"? Los productos pasarán a "General".`)) return;

      try {
          const res = await fetch(`http://localhost:3001/api/categorias/${nombreCat}`, { method: "DELETE" });
          const data = await res.json();
          if(data.success) {
              cargarCategorias();
              cargarProductos();
              if(categoria === nombreCat) setCategoria("General");
          } else {
              alert(data.error);
          }
      } catch (error) {
          console.error(error);
      }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !precio) return alert("Nombre y Precio son obligatorios");

    const prodData = {
      nombre,
      precio: parseFloat(precio),
      costo: parseFloat(costo) || 0,
      stock: parseInt(stock) || 0,
      codigo_barras: codigo,
      categoria: categoria // Enviamos la categoría seleccionada
    };

    try {
      let url = "http://localhost:3001/api/productos";
      let method = "POST";

      if (modoEdicion) {
          url = `http://localhost:3001/api/productos/${idEdicion}`;
          method = "PUT";
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prodData),
      });
      
      const data = await res.json();
      if (data.id || data.updated) {
        // Reset form
        setNombre("");
        setPrecio("");
        setCosto("");
        setStock("");
        setCodigo("");
        setCategoria("General");
        
        setModoEdicion(false);
        setIdEdicion(null);
        
        cargarProductos();
        cargarCategorias();
      } else {
        alert("Error al guardar");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const prepararEdicion = (p) => {
      setNombre(p.nombre);
      setPrecio(p.precio);
      setCosto(p.costo);
      setStock(p.stock);
      setCodigo(p.codigo_barras || "");
      setCategoria(p.categoria || "General");
      
      setModoEdicion(true);
      setIdEdicion(p.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
      setModoEdicion(false);
      setIdEdicion(null);
      setNombre("");
      setPrecio("");
      setCosto("");
      setStock("");
      setCodigo("");
      setCategoria("General");
  };

  const eliminarProducto = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await fetch(`http://localhost:3001/api/productos/${id}`, { method: "DELETE" });
      cargarProductos();
    } catch (error) {
      console.error(error);
    }
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Package className="text-purple-600" size={32}/>
                Inventario de Productosylkfjdhsfasddng
            </h1>
            <p className="text-slate-500 mt-1">Administra tus productos, precios y stock.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO DE CARGA/EDICIÓN */}
        <div className="lg:col-span-1">
            <div className={`p-6 rounded-xl shadow-sm border sticky top-6 transition-all ${modoEdicion ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? 'text-purple-700' : 'text-slate-700'}`}>
                    {modoEdicion ? <Edit size={20}/> : <Plus size={20} className="text-purple-500"/>}
                    {modoEdicion ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                
                <form onSubmit={guardarProducto} className="space-y-4">
                    
                    {/* NOMBRE */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Producto</label>
                        <input 
                            autoFocus={modoEdicion}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Ej: Alfajor Jorgito"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* PRECIO VENTA */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Precio Venta</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                                <input 
                                    type="number"
                                    className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-700"
                                    placeholder="0.00"
                                    value={precio}
                                    onChange={e => setPrecio(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* COSTO */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Costo (Opcional)</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                                <input 
                                    type="number"
                                    className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-slate-300 outline-none text-slate-500"
                                    placeholder="0.00"
                                    value={costo}
                                    onChange={e => setCosto(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* STOCK */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Stock Inicial</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="0"
                                value={stock}
                                onChange={e => setStock(e.target.value)}
                            />
                        </div>
                        {/* CÓDIGO BARRAS */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Código Barras</label>
                            <div className="relative">
                                <Barcode size={14} className="absolute left-2 top-2.5 text-slate-400"/>
                                <input 
                                    type="text"
                                    className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Scannear..."
                                    value={codigo}
                                    onChange={e => setCodigo(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* CATEGORÍA CON GESTOR */}
                    <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-slate-500">Categoría</label>
                            <button 
                                type="button"
                                onClick={() => setMostrarGestorCategorias(!mostrarGestorCategorias)}
                                className="text-xs text-purple-600 hover:underline flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-100"
                            >
                                <Settings size={12}/> Gestionar / Agregar
                            </button>
                        </div>

                        {/* GESTOR DE CATEGORÍAS (POPOVER MEJORADO) */}
                        {mostrarGestorCategorias && (
                            <div className="mb-2 p-3 bg-white rounded-lg border-2 border-purple-200 shadow-lg animate-in fade-in zoom-in duration-200 absolute w-full z-30 top-7 left-0">
                                
                                {/* 1. LISTA DE EXISTENTES */}
                                <h4 className="text-xs font-bold text-purple-800 mb-2">Categorías Existentes</h4>
                                <div className="max-h-32 overflow-y-auto space-y-1 mb-3 pr-1 custom-scrollbar">
                                    {categoriasDisponibles.map(cat => (
                                        <div key={cat} className="flex justify-between items-center bg-purple-50 p-1.5 rounded border border-purple-100 text-xs">
                                            <span className="font-medium text-purple-900">{cat}</span>
                                            {cat !== 'General' && (
                                                <button 
                                                    type="button"
                                                    onClick={() => eliminarCategoria(cat)} 
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Eliminar categoría"
                                                >
                                                    <Trash2 size={14}/>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* 2. AGREGAR NUEVA */}
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">AGREGAR NUEVA</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            className="flex-1 p-1.5 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                                            placeholder="Nombre..."
                                            value={nuevaCategoriaInput}
                                            onChange={e => setNuevaCategoriaInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarCategoriaManual())}
                                        />
                                        <button 
                                            type="button"
                                            onClick={agregarCategoriaManual}
                                            className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700"
                                            title="Confirmar"
                                        >
                                            <Check size={16}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <select 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                            value={categoria}
                            onChange={e => setCategoria(e.target.value)}
                        >
                            {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* BOTONES ACCIÓN */}
                    <div className="flex gap-2 pt-2">
                        <button 
                            type="submit"
                            className={`flex-1 py-3 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 ${modoEdicion ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                        >
                            {modoEdicion ? <Edit size={18}/> : <Plus size={18}/>}
                            {modoEdicion ? 'GUARDAR CAMBIOS' : 'AGREGAR PRODUCTO'}
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

        {/* LISTA DE PRODUCTOS */}
        <div className="lg:col-span-2">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 sticky top-6 z-20">
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <Search className="text-slate-400" size={20}/>
                    <input 
                        className="bg-transparent outline-none w-full text-slate-700"
                        placeholder="Buscar por nombre o código de barras..."
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
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Producto</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Stock</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Precio</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Cargando...</td></tr>
                            ) : productosFiltrados.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No se encontraron productos.</td></tr>
                            ) : (
                                productosFiltrados.map((prod) => (
                                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{prod.nombre}</div>
                                            <div className="text-xs text-slate-400 flex gap-2">
                                                {prod.codigo_barras && <span>CB: {prod.codigo_barras}</span>}
                                                <span className="bg-slate-100 px-1 rounded border">{prod.categoria}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded font-bold text-xs ${prod.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {prod.stock} u.
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-slate-700">
                                            $ {prod.precio.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => prepararEdicion(prod)}
                                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                                                >
                                                    <Edit size={18}/>
                                                </button>
                                                <button 
                                                    onClick={() => eliminarProducto(prod.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default Productos;