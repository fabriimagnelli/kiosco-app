import React, { useState, useEffect } from "react";
import { Search, AlertTriangle, Download, Copy, Package, Cigarette, TrendingUp, CheckCircle, X } from "lucide-react";

function Stock() {
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);
  const [itemsUnificados, setItemsUnificados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos"); // 'todos', 'bajo', 'general', 'cigarrillos'

  // Modal Lista de Compra
  const [mostrarListaCompra, setMostrarListaCompra] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // CORRECCIÓN: Se agregó '/api' a las rutas para coincidir con el servidor
        const [resProd, resCig] = await Promise.all([
            fetch("http://localhost:3001/api/productos"),
            fetch("http://localhost:3001/api/cigarrillos")
        ]);

        if (!resProd.ok || !resCig.ok) {
            throw new Error("Error en la respuesta del servidor");
        }

        const dataProd = await resProd.json();
        const dataCig = await resCig.json();
        
        setProductos(dataProd);
        setCigarrillos(dataCig);

        // Unificamos para la tabla general
        // Aseguramos que dataProd y dataCig sean arrays antes de mapear (por seguridad)
        const listaProd = Array.isArray(dataProd) ? dataProd.map(p => ({ ...p, tipo: "General", icono: <Package size={16}/> })) : [];
        const listaCig = Array.isArray(dataCig) ? dataCig.map(c => ({ ...c, tipo: "Cigarrillo", icono: <Cigarette size={16}/> })) : [];
        
        setItemsUnificados([...listaProd, ...listaCig]);

      } catch (error) { console.error("Error cargando stock:", error); }
    };
    cargarDatos();
  }, []);

  // CÁLCULOS
  const totalItems = itemsUnificados.length;
  const itemsBajoStock = itemsUnificados.filter(i => i.stock <= 5);
  const valorTotalVenta = itemsUnificados.reduce((acc, item) => acc + (item.precio * item.stock), 0);

  // FILTRADO
  const itemsFiltrados = itemsUnificados.filter(item => {
    const coincideTexto = item.nombre.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideTexto) return false;

    if (filtro === "bajo") return item.stock <= 5;
    if (filtro === "general") return item.tipo === "General";
    if (filtro === "cigarrillos") return item.tipo === "Cigarrillo";
    return true;
  });

  // GENERAR TEXTO PARA WHATSAPP
  const copiarListaCompra = () => {
    const texto = itemsBajoStock.map(i => `- ${i.nombre} (Quedan: ${i.stock})`).join("\n");
    const mensaje = `*LISTA DE REPOSICIÓN - KIOSCO*\n\n${texto}`;
    navigator.clipboard.writeText(mensaje);
    alert("✅ Lista copiada al portapapeles. ¡Pegala en WhatsApp!");
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6 overflow-hidden relative">
      
      {/* 1. TARJETAS SUPERIORES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Package size={24}/></div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Total Artículos</p>
                <p className="text-xl font-bold text-slate-800">{totalItems} productos</p>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg text-green-600"><TrendingUp size={24}/></div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Valor Inventario (Venta)</p>
                <p className="text-xl font-bold text-green-700">$ {valorTotalVenta.toLocaleString()}</p>
            </div>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 cursor-pointer transition-all ${
            itemsBajoStock.length > 0 ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-white border-slate-200"
        }`} onClick={() => setMostrarListaCompra(true)}>
            <div className="bg-red-100 p-2 rounded-lg text-red-600"><AlertTriangle size={24}/></div>
            <div>
                <p className="text-xs font-bold text-red-800 uppercase">Reponer Urgente</p>
                <p className="text-xl font-bold text-red-600">{itemsBajoStock.length} artículos</p>
            </div>
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center flex-shrink-0">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
            <input 
                type="text" 
                placeholder="Buscar en stock..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
            />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
            {["todos", "bajo", "general", "cigarrillos"].map(f => (
                <button 
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold capitalize transition-all ${
                        filtro === f ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    {f === "bajo" ? "⚠️ Bajo Stock" : f}
                </button>
            ))}
        </div>

        <button 
            onClick={() => setMostrarListaCompra(true)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700 shadow-lg shadow-slate-300"
        >
            <Download size={18}/> Generar Pedido
        </button>
      </div>

      {/* 3. TABLA UNIFICADA */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 shadow-sm z-10">
                    <tr>
                        <th className="p-4">Producto</th>
                        <th className="p-4">Rubro</th>
                        <th className="p-4">Precio Venta</th>
                        <th className="p-4 text-center">Stock Actual</th>
                        <th className="p-4 text-right">Valor Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {itemsFiltrados.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-slate-400">No se encontraron productos.</td></tr>
                    ) : (
                        itemsFiltrados.map((item, index) => (
                            <tr key={`${item.tipo}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-700">{item.nombre}</td>
                                <td className="p-4 text-slate-500 flex items-center gap-2">
                                    {item.icono} <span className="text-xs bg-slate-100 px-2 py-0.5 rounded border uppercase">{item.tipo}</span>
                                </td>
                                <td className="p-4 text-slate-600">$ {item.precio}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                                        item.stock <= 0 ? "bg-red-100 text-red-700" :
                                        item.stock <= 5 ? "bg-orange-100 text-orange-700" :
                                        "bg-blue-50 text-blue-700"
                                    }`}>
                                        {item.stock} un.
                                    </span>
                                </td>
                                <td className="p-4 text-right font-bold text-slate-800">
                                    $ {(item.precio * item.stock).toLocaleString()}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MODAL LISTA DE REPOSICIÓN --- */}
      {mostrarListaCompra && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><AlertTriangle className="text-yellow-400"/> Reposición Sugerida</h3>
                    <button onClick={() => setMostrarListaCompra(false)} className="hover:bg-slate-700 p-1 rounded"><X/></button>
                </div>
                
                <div className="p-4 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs flex gap-2">
                    <AlertTriangle size={16}/>
                    <p>Estos productos tienen 5 unidades o menos. ¡Es hora de comprar!</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {itemsBajoStock.length === 0 ? (
                        <div className="text-center py-8 text-green-600">
                            <CheckCircle size={48} className="mx-auto mb-2"/>
                            <p className="font-bold">¡Todo en orden!</p>
                            <p className="text-sm">No hay productos con stock crítico.</p>
                        </div>
                    ) : (
                        itemsBajoStock.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-2 border-b border-slate-100 last:border-0 text-sm">
                                <span className="font-medium text-slate-700">{item.nombre}</span>
                                <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">Quedan {item.stock}</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                    <button 
                        onClick={() => setMostrarListaCompra(false)}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        Cerrar
                    </button>
                    {itemsBajoStock.length > 0 && (
                        <button 
                            onClick={copiarListaCompra}
                            className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 transition-all active:scale-95 flex justify-center items-center gap-2"
                        >
                            <Copy size={18}/> Copiar Lista
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default Stock;