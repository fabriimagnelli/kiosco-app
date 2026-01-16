import React, { useState, useEffect } from "react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { FileText, TrendingUp, ShoppingBag, Edit, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Reportes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("historial"); // Por defecto mostramos historial
  
  const [productosTop, setProductosTop] = useState([]);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [historialVentas, setHistorialVentas] = useState([]);

  useEffect(() => {
    cargarEstadisticas();
    cargarHistorial();
  }, []);

  const cargarEstadisticas = () => {
    fetch("http://localhost:3001/api/reportes/productos_top").then(r=>r.json()).then(setProductosTop);
    fetch("http://localhost:3001/api/reportes/ventas_semana").then(r=>r.json()).then(setVentasSemana);
    fetch("http://localhost:3001/api/reportes/metodos_pago").then(r=>r.json()).then(setMetodosPago);
  };

  const cargarHistorial = () => {
    fetch("http://localhost:3001/api/ventas")
      .then(r => r.json())
      .then(data => {
        // Agrupar por Ticket ID
        const agrupado = {};
        data.forEach(v => {
            if(!agrupado[v.ticket_id]) {
                agrupado[v.ticket_id] = {
                    ticket_id: v.ticket_id,
                    fecha: v.fecha,
                    total: 0,
                    metodo: v.metodo_pago,
                    items: 0
                };
            }
            agrupado[v.ticket_id].total += v.precio_total;
            agrupado[v.ticket_id].items += 1;
        });
        setHistorialVentas(Object.values(agrupado).sort((a,b) => new Date(b.fecha) - new Date(a.fecha)));
      });
  };

  const editarVenta = (ticket) => {
    if(!confirm(`¿Deseas editar el Ticket #${ticket.ticket_id}? Esto cargará los productos en Ventas y borrará este registro al confirmar.`)) return;
    navigate("/ventas", { state: { ticketEditar: ticket.ticket_id } });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6 bg-slate-100 min-h-full flex flex-col gap-6">
      
      {/* TABS DE NAVEGACIÓN */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm w-fit">
        <button 
            onClick={() => setActiveTab("historial")}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'historial' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
            Historial de Ventas
        </button>
        <button 
            onClick={() => setActiveTab("estadisticas")}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'estadisticas' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
            Estadísticas y Gráficos
        </button>
      </div>

      {activeTab === "historial" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText size={18}/> Últimas Ventas</h3>
                 <button onClick={cargarHistorial} className="text-xs text-blue-600 font-bold hover:underline">Actualizar</button>
             </div>
             <div className="overflow-y-auto flex-1">
                 <table className="w-full text-left">
                     <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase sticky top-0">
                         <tr>
                             <th className="p-4">Ticket</th>
                             <th className="p-4">Fecha</th>
                             <th className="p-4">Método</th>
                             <th className="p-4 text-center">Items</th>
                             <th className="p-4 text-right">Total</th>
                             <th className="p-4 text-center">Acción</th>
                         </tr>
                     </thead>
                     <tbody>
                         {historialVentas.map(ticket => (
                             <tr key={ticket.ticket_id} className="border-b hover:bg-slate-50">
                                 <td className="p-4 font-bold text-slate-700">#{ticket.ticket_id}</td>
                                 <td className="p-4 text-sm text-slate-500">{new Date(ticket.fecha).toLocaleString()}</td>
                                 <td className="p-4">
                                     <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold border border-blue-100">
                                         {ticket.metodo}
                                     </span>
                                 </td>
                                 <td className="p-4 text-center text-sm">{ticket.items}</td>
                                 <td className="p-4 text-right font-bold text-lg text-green-600">$ {ticket.total.toLocaleString()}</td>
                                 <td className="p-4 text-center">
                                     <button 
                                        onClick={() => editarVenta(ticket)}
                                        className="bg-orange-50 text-orange-600 p-2 rounded-lg hover:bg-orange-100 hover:text-orange-700 transition-colors flex items-center gap-2 mx-auto text-xs font-bold"
                                     >
                                        <Edit size={14}/> Editar / Corregir
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {activeTab === "estadisticas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            
            {/* VENTAS SEMANALES */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={20}/> Ventas de la Semana</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ventasSemana}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="name" tick={{fontSize: 12}}/>
                            <YAxis tick={{fontSize: 12}}/>
                            <Tooltip cursor={{fill: 'transparent'}}/>
                            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* MÉTODOS DE PAGO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><FileText size={20}/> Métodos de Pago</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={metodosPago} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                {metodosPago.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* PRODUCTOS MÁS VENDIDOS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><ShoppingBag size={20}/> Productos Más Vendidos</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productosTop} layout="vertical" margin={{left: 20}}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                            <XAxis type="number" hide/>
                            <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}}/>
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default Reportes;