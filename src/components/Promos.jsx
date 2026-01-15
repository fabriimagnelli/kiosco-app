import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Search, X, ShoppingBag, Pencil } from "lucide-react";

function Promos() {
  const [promos, setPromos] = useState([]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  
  // Estado para el modal de creación
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaPromo, setNuevaPromo] = useState({
    id: null, // Agregado para saber si es edición
    nombre: "",
    precio: "",
    codigo_barras: "",
    componentes: [] 
  });
  const [busquedaProd, setBusquedaProd] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [resPromos, resProd, resCig] = await Promise.all([
        fetch("http://localhost:3001/api/promos"),
        fetch("http://localhost:3001/api/productos"),
        fetch("http://localhost:3001/api/cigarrillos")
      ]);
      
      const dataPromos = await resPromos.json();
      const dataProd = await resProd.json();
      const dataCig = await resCig.json();

      setPromos(dataPromos);

      // Unificar productos para el buscador
      const listaProd = dataProd.map(p => ({ ...p, tipo: "General" }));
      const listaCig = dataCig.map(c => ({ ...c, tipo: "Cigarrillo" }));
      setProductosDisponibles([...listaProd, ...listaCig]);

    } catch (error) { console.error("Error cargando datos:", error); }
  };

  const agregarComponente = (producto) => {
    const existe = nuevaPromo.componentes.find(c => c.id === producto.id && c.tipo === producto.tipo);
    if (existe) {
      setNuevaPromo({
        ...nuevaPromo,
        componentes: nuevaPromo.componentes.map(c => 
          (c.id === producto.id && c.tipo === producto.tipo) ? { ...c, cantidad: c.cantidad + 1 } : c
        )
      });
    } else {
      setNuevaPromo({
        ...nuevaPromo,
        componentes: [...nuevaPromo.componentes, { ...producto, cantidad: 1 }]
      });
    }
  };

  const quitarComponente = (index) => {
    const nuevos = [...nuevaPromo.componentes];
    nuevos.splice(index, 1);
    setNuevaPromo({ ...nuevaPromo, componentes: nuevos });
  };

  const abrirModalCrear = () => {
    setNuevaPromo({ id: null, nombre: "", precio: "", codigo_barras: "", componentes: [] });
    setMostrarModal(true);
  };

  const editarPromo = (promo) => {
    // Reconstruimos los componentes completos buscando en productosDisponibles
    // Esto es necesario para que aparezcan los nombres en la lista de la derecha del modal
    const componentesCompletos = promo.componentes.map(comp => {
        // La DB guarda 'producto' o 'cigarrillo', el frontend usa 'General' o 'Cigarrillo'
        const tipoFrontend = comp.tipo_producto === 'cigarrillo' ? 'Cigarrillo' : 'General';
        
        const original = productosDisponibles.find(p => p.id === comp.producto_id && p.tipo === tipoFrontend);
        
        return {
            ...original, // Trae nombre, precio, etc.
            id: comp.producto_id,
            tipo: tipoFrontend,
            cantidad: comp.cantidad
        };
    }).filter(c => c.nombre); // Filtrar si por error no se encuentra el producto original

    setNuevaPromo({
        id: promo.id,
        nombre: promo.nombre,
        precio: promo.precio,
        codigo_barras: promo.codigo_barras || "",
        componentes: componentesCompletos
    });
    setMostrarModal(true);
  };

  const guardarPromo = async () => {
    if (!nuevaPromo.nombre || !nuevaPromo.precio || nuevaPromo.componentes.length === 0) {
      alert("Completa el nombre, precio y agrega al menos un producto.");
      return;
    }

    try {
      const url = nuevaPromo.id 
        ? `http://localhost:3001/api/promos/${nuevaPromo.id}` 
        : "http://localhost:3001/api/promos";
        
      const method = nuevaPromo.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaPromo)
      });

      if (res.ok) {
        alert(nuevaPromo.id ? "✅ Promo actualizada" : "✅ Promo creada");
        setMostrarModal(false);
        setNuevaPromo({ id: null, nombre: "", precio: "", codigo_barras: "", componentes: [] });
        cargarDatos();
      } else {
        alert("Error al guardar promo");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarPromo = async (id) => {
    if(!window.confirm("¿Borrar esta promo?")) return;
    await fetch(`http://localhost:3001/api/promos/${id}`, { method: "DELETE" });
    cargarDatos();
  };

  const productosFiltrados = productosDisponibles.filter(p => 
    p.nombre.toLowerCase().includes(busquedaProd.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Promos y Combos</h1>
          <p className="text-slate-500">Crea paquetes que descuenten stock automáticamente.</p>
        </div>
        <button 
          onClick={abrirModalCrear}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
        >
          <Plus size={20} /> Crear Nueva Promo
        </button>
      </div>

      {/* Lista de Promos Existentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {promos.length === 0 ? (
          <div className="col-span-full text-center py-10 text-slate-400">
            No hay promociones creadas.
          </div>
        ) : (
          promos.map(promo => (
            <div key={promo.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-2">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600 mb-2 inline-block">
                        <ShoppingBag size={20} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => editarPromo(promo)} className="text-slate-300 hover:text-blue-500"><Pencil size={18}/></button>
                        <button onClick={() => eliminarPromo(promo.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                </div>
                <h3 className="font-bold text-lg text-slate-800">{promo.nombre}</h3>
                <p className="text-slate-500 text-sm mb-4">Código: {promo.codigo_barras || 'N/A'}</p>
                
                {/* Lista pequeña de componentes */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {promo.componentes && promo.componentes.slice(0, 3).map((comp, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border">
                            {comp.cantidad} un.
                        </span>
                    ))}
                    {promo.componentes && promo.componentes.length > 3 && <span className="text-[10px] text-slate-400">...</span>}
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600">$ {promo.precio}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL CREAR/EDITAR PROMO */}
      {mostrarModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">{nuevaPromo.id ? "Editar Combo" : "Configurar Nuevo Combo"}</h3>
              <button onClick={() => setMostrarModal(false)} className="hover:bg-slate-700 p-1 rounded"><X/></button>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                
                {/* COLUMNA IZQUIERDA: Buscador */}
                <div className="w-full md:w-1/2 p-4 border-r border-slate-200 flex flex-col bg-slate-50">
                    <h4 className="font-bold text-slate-700 mb-2">1. Seleccionar Productos</h4>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Buscar ingredientes..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                            value={busquedaProd}
                            onChange={e => setBusquedaProd(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {productosFiltrados.map(prod => (
                            <div key={`${prod.tipo}-${prod.id}`} 
                                 onClick={() => agregarComponente(prod)}
                                 className="bg-white p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all flex justify-between items-center group">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{prod.nombre}</p>
                                    <p className="text-xs text-slate-500">{prod.tipo} | Stock: {prod.stock}</p>
                                </div>
                                <Plus size={18} className="text-blue-400 group-hover:text-blue-600"/>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLUMNA DERECHA: Resumen */}
                <div className="w-full md:w-1/2 p-4 flex flex-col bg-white">
                    <h4 className="font-bold text-slate-700 mb-4">2. Detalles del Combo</h4>
                    
                    <div className="space-y-3 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded bg-slate-50 focus:bg-white outline-none focus:border-blue-500 font-bold"
                                placeholder="Ej: Promo Fernet"
                                value={nuevaPromo.nombre}
                                onChange={e => setNuevaPromo({...nuevaPromo, nombre: e.target.value})}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio Venta</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border border-slate-300 rounded bg-slate-50 focus:bg-white outline-none focus:border-green-500 font-bold text-green-700"
                                    placeholder="0.00"
                                    value={nuevaPromo.precio}
                                    onChange={e => setNuevaPromo({...nuevaPromo, precio: e.target.value})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código (Opcional)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border border-slate-300 rounded bg-slate-50 focus:bg-white outline-none focus:border-blue-500"
                                    placeholder="Escanear..."
                                    value={nuevaPromo.codigo_barras}
                                    onChange={e => setNuevaPromo({...nuevaPromo, codigo_barras: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-hidden flex flex-col">
                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Contenido</h5>
                        <div className="overflow-y-auto flex-1 custom-scrollbar space-y-2">
                            {nuevaPromo.componentes.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm mt-4">Agrega productos</p>
                            ) : (
                                nuevaPromo.componentes.map((comp, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-slate-100 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-200 text-slate-700 w-6 h-6 flex items-center justify-center rounded font-bold text-xs">{comp.cantidad}</span>
                                            <span className="text-slate-700 truncate max-w-[150px]">{comp.nombre || "Producto desconocido"}</span>
                                        </div>
                                        <button onClick={() => quitarComponente(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={guardarPromo}
                        className="mt-4 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 flex justify-center items-center gap-2 active:scale-95"
                    >
                        <Save size={20}/> {nuevaPromo.id ? "Actualizar Promo" : "Guardar Promo"}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Promos;