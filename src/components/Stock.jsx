import React, { useState, useEffect } from "react";
import { Package, AlertTriangle, TrendingUp, CheckCircle, ChevronRight } from "lucide-react";

function Stock() {
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/productos").then(r => r.json()).then(setProductos);
    fetch("http://localhost:3001/cigarrillos").then(r => r.json()).then(setCigarrillos);
  }, []);

  // 1. Filtrar los que están agotados (Alerta)
  const agotados = [
    ...productos.filter(p => p.stock <= 0),
    ...cigarrillos.filter(c => c.stock <= 0)
  ];

  // 2. Agrupar productos POR CATEGORÍA
  const productosPorCategoria = productos.reduce((acc, prod) => {
    const cat = prod.categoria || "Sin Categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(prod);
    return acc;
  }, {});

  // 3. Ordenamos las categorías alfabéticamente
  const categoriasOrdenadas = Object.keys(productosPorCategoria).sort();

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6 overflow-hidden">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Package className="text-blue-600"/> Inventario Organizado
      </h2>

      <div className="flex gap-6 h-full overflow-hidden">
        
        {/* IZQUIERDA: LISTA DIVIDIDA POR CATEGORÍAS */}
        <div className="w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600"/> Existencias
                </h3>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 custom-scrollbar space-y-6">
                
                {/* SECCIÓN ESPECIAL CIGARRILLOS (Siempre primero) */}
                <div className="bg-yellow-50 rounded-xl border border-yellow-200 overflow-hidden">
                    <div className="bg-yellow-100/50 p-3 font-bold text-yellow-800 flex items-center gap-2">
                        <ChevronRight size={16}/> CIGARRILLOS
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-2">
                        {cigarrillos.filter(c => c.stock > 0).map(c => (
                            <div key={c.id} className="bg-white p-3 rounded border border-yellow-100 flex justify-between items-center shadow-sm">
                                <span className="font-medium text-slate-700">{c.nombre}</span>
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{c.stock} un.</span>
                            </div>
                        ))}
                        {cigarrillos.filter(c => c.stock > 0).length === 0 && <p className="text-sm text-yellow-600 p-2">No hay cigarrillos en stock.</p>}
                    </div>
                </div>

                {/* RESTO DE CATEGORÍAS (Bucle) */}
                {categoriasOrdenadas.map(cat => (
                    <div key={cat} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-100 p-3 font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider text-sm">
                            <ChevronRight size={16}/> {cat}
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-2">
                            {productosPorCategoria[cat].filter(p => p.stock > 0).map(p => (
                                <div key={p.id} className="bg-white p-3 rounded border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                    <span className="font-medium text-slate-700 truncate mr-2">{p.nombre}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${p.stock <= 5 ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {p.stock} un.
                                    </span>
                                </div>
                            ))}
                             {productosPorCategoria[cat].filter(p => p.stock > 0).length === 0 && <p className="text-sm text-slate-400 p-2 italic">Sin stock en esta categoría.</p>}
                        </div>
                    </div>
                ))}

            </div>
        </div>

        {/* DERECHA: ALERTA DE FALTANTES (SE MANTIENE IGUAL PORQUE ES ÚTIL) */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-red-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-red-100 bg-red-50">
                <h3 className="font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-600"/> Agotados (Stock 0)
                </h3>
                <p className="text-xs text-red-500 mt-1">Reponer urgentemente</p>
            </div>

            <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                {agotados.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                        <CheckCircle size={48} className="mb-2 text-green-500"/>
                        <p>¡Todo en orden!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {agotados.map((p, i) => (
                            <div key={i} className="bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-700">{p.nombre}</p>
                                    <p className="text-xs text-red-400 uppercase">{p.categoria || (p.precio_qr ? "Cigarro" : "General")}</p>
                                </div>
                                <span className="bg-white text-red-600 font-bold px-2 py-1 rounded text-xs border border-red-100">0</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}

export default Stock;