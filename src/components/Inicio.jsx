import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  TrendingUp, ShoppingCart, AlertTriangle, 
  DollarSign, Package, ArrowRight, Activity 
} from "lucide-react";

function Inicio() {
  const [datos, setDatos] = useState({
    ventas_hoy: 0,
    tickets_hoy: 0,
    gastos_hoy: 0,
    bajo_stock: []
  });
  const [saludo, setSaludo] = useState("");

  useEffect(() => {
    // 1. Cargar Datos
    fetch("http://localhost:3001/dashboard")
      .then(r => r.json())
      .then(setDatos);

    // 2. Definir saludo según hora
    const hora = new Date().getHours();
    if (hora < 12) setSaludo("Buenos días");
    else if (hora < 20) setSaludo("Buenas tardes");
    else setSaludo("Buenas noches");
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-100 p-8 overflow-y-auto custom-scrollbar">
      
      {/* HEADER: SALUDO */}
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{saludo}, Admin.</h1>
            <p className="text-slate-500 mt-1">Aquí tienes el resumen de tu negocio hoy.</p>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Fecha</p>
            <p className="text-xl font-bold text-slate-700">{new Date().toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* SECCIÓN 1: KPIs (TARJETAS PRINCIPALES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* TARJETA VENTAS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ventas Hoy</p>
                <h3 className="text-3xl font-bold text-slate-800">$ {datos.ventas_hoy.toLocaleString()}</h3>
                <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                    <Activity size={14} /> {datos.tickets_hoy} operaciones
                </p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-4 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <TrendingUp size={28} />
            </div>
        </div>

        {/* TARJETA CAJA NETO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Balance Diario</p>
                <h3 className={`text-3xl font-bold ${datos.ventas_hoy - datos.gastos_hoy >= 0 ? "text-slate-800" : "text-red-600"}`}>
                    $ {(datos.ventas_hoy - datos.gastos_hoy).toLocaleString()}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-2">
                    Ingresos - Gastos
                </p>
            </div>
            <div className="bg-green-50 text-green-600 p-4 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
                <DollarSign size={28} />
            </div>
        </div>

        {/* TARJETA GASTOS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos / Retiros</p>
                <h3 className="text-3xl font-bold text-slate-800">$ {datos.gastos_hoy.toLocaleString()}</h3>
                <p className="text-xs text-red-500 font-medium mt-2">
                    Salidas registradas hoy
                </p>
            </div>
            <div className="bg-red-50 text-red-500 p-4 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                <ArrowRight size={28} className="rotate-[-45deg]" />
            </div>
        </div>
      </div>

      {/* SECCIÓN 2: PANELES INFERIORES */}
      <div className="flex flex-col md:flex-row gap-6 h-full">
        
        {/* IZQUIERDA: ACCESOS RÁPIDOS */}
        <div className="w-full md:w-2/3 bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            <h3 className="text-xl font-bold mb-6 relative z-10">Accesos Rápidos</h3>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
                <Link to="/ventas" className="bg-slate-800 hover:bg-blue-600 p-4 rounded-xl transition-all border border-slate-700 hover:border-blue-500 group flex flex-col gap-2">
                    <ShoppingCart className="text-blue-400 group-hover:text-white" />
                    <span className="font-semibold">Nueva Venta</span>
                </Link>

                <Link to="/movimientos" className="bg-slate-800 hover:bg-red-600 p-4 rounded-xl transition-all border border-slate-700 hover:border-red-500 group flex flex-col gap-2">
                    <DollarSign className="text-red-400 group-hover:text-white" />
                    <span className="font-semibold">Retirar Dinero</span>
                </Link>

                <Link to="/stock" className="bg-slate-800 hover:bg-indigo-600 p-4 rounded-xl transition-all border border-slate-700 hover:border-indigo-500 group flex flex-col gap-2">
                    <Package className="text-indigo-400 group-hover:text-white" />
                    <span className="font-semibold">Ver Stock</span>
                </Link>
                
                <Link to="/cierre" className="bg-slate-800 hover:bg-yellow-600 p-4 rounded-xl transition-all border border-slate-700 hover:border-yellow-500 group flex flex-col gap-2">
                    <ArrowRight className="text-yellow-400 group-hover:text-white" />
                    <span className="font-semibold">Cerrar Caja</span>
                </Link>
            </div>
        </div>

        {/* DERECHA: ALERTA DE STOCK */}
        <div className="w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-red-50 flex items-center justify-between">
                <h3 className="font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle size={18} /> Stock Bajo
                </h3>
                <span className="text-xs bg-white text-red-600 px-2 py-1 rounded font-bold shadow-sm">Urgente</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
                {datos.bajo_stock.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <Package size={40} className="mb-2 opacity-50" />
                        <p className="text-sm">¡Todo perfecto! No hay productos urgentes.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-slate-50">
                            {datos.bajo_stock.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-4 font-semibold text-slate-700">{p.nombre}</td>
                                    <td className="p-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${p.stock === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                                            {p.stock} un.
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                <Link to="/stock" className="text-xs font-bold text-blue-600 hover:underline">
                    Ver inventario completo
                </Link>
            </div>
        </div>

      </div>
    </div>
  );
}

export default Inicio;  