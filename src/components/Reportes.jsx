import React, { useState, useEffect } from "react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { FileText, TrendingUp, ShoppingBag, Edit, ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Reportes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("historial"); // Por defecto mostramos historial
  
  const [productosTop, setProductosTop] = useState([]);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [historialVentas, setHistorialVentas] = useState([]);
  const [menuAbierto, setMenuAbierto] = useState(null); // Controla qué menú de fila está abierto

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
    fetch("http://localhost:3001/api/ventas/historial")
      .then(r=>r.json())
      .then(data => {
        // Agrupar por ticket_id
        const agrupado = {};
        data.forEach(v => {
            if(!agrupado[v.ticket_id]) {
                agrupado[v.ticket_id] = {
                    ticket_id: v.ticket_id,
                    fecha: v.fecha,
                    total: 0,
                    metodo: v.metodo_pago,
                    items: 0,
                    editado: v.editado // Capturamos si fue editado
                };
            }
            agrupado[v.ticket_id].total = v.precio_total; // El total ya viene calculado o es la suma
            // NOTA: Si tu backend guarda lineas separadas, deberias sumar aqui si precio_total es por linea.
            // Pero en tu POST guardas 'precio_total' repetido en cada linea con el total del ticket?
            // Re-leyendo tu POST: guardas 'total' (total del ticket) en CADA linea en la columna 'precio_total'.
            // Entonces sobrescribir está bien.
            
            agrupado[v.ticket_id].items += 1;
        });
        setHistorialVentas(Object.values(agrupado));
      });
  };

  const eliminarVenta = async (ticket_id) => {
      if(!confirm(`¿Estás seguro de eliminar el Ticket #${ticket_id}? Se devolverá el stock de los productos.`)) return;
      
      try {
          const res = await fetch(`http://localhost:3001/api/ventas/${ticket_id}`, { method: "DELETE" });
          const data = await res.json();
          if(data.success) {
              cargarHistorial();
              cargarEstadisticas(); // Actualizar gráficos también
              setMenuAbierto(null);
          } else {
              alert("Error al eliminar: " + data.error);
          }
      } catch (error) {
          console.error(error);
          alert("Error de conexión");
      }
  };

  const editarVenta = (ticket) => {
      // Navegar a ventas con los datos para editar
      // Necesitamos recuperar los items de este ticket.
      // Como aquí solo tenemos el resumen, podríamos hacer un fetch rápido o pasar el ID y que Ventas lo busque.
      // Pero tu sistema actual parece que pasaba 'ticket' completo.
      // Para mantener compatibilidad, idealmente Ventas.jsx debería saber buscar por ID si le faltan items,
      // o aquí hacemos un fetch de los items de ese ticket antes de navegar.
      
      // Opción rápida: Navegar y que Ventas resuelva (o si ya tenías lógica de "recargar compra")
      // Asumiremos que Ventas recibe el objeto ticket y sabe qué hacer.
      navigate("/", { state: { ticketAEditar: ticket } });
  };

  // Colores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <FileText className="text-blue-600" size={32}/>
                Reportes y Estadísticas
            </h1>
            <p className="text-slate-500 mt-1">Visualiza el rendimiento de tu negocio</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
                onClick={() => setActiveTab("historial")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "historial" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
                Historial de Ventas
            </button>
            <button 
                onClick={() => setActiveTab("graficos")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "graficos" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
                Gráficos
            </button>
        </div>
      </div>

      {activeTab === "historial" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-lg">Últimas Ventas</h3>
                <span className="text-sm text-slate-400">{historialVentas.length} transacciones</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-sm uppercase tracking-wider">
                        <tr>
                            <th className="p-4 border-b border-slate-100">Ticket ID</th>
                            <th className="p-4 border-b border-slate-100">Fecha</th>
                            <th className="p-4 border-b border-slate-100">Método</th>
                            <th className="p-4 border-b border-slate-100">Items</th>
                            <th className="p-4 border-b border-slate-100 text-right">Total</th>
                            <th className="p-4 border-b border-slate-100 text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historialVentas.map((ticket) => (
                            <tr key={ticket.ticket_id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-700 font-medium">#{ticket.ticket_id}</td>
                                <td className="p-4 text-sm text-slate-500">
                                    {new Date(ticket.fecha).toLocaleString()}
                                    {ticket.editado === 1 && (
                                        <span className="block text-xs text-orange-500 font-bold mt-1">(Editado)</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                        ${ticket.metodo === 'Efectivo' ? 'bg-green-100 text-green-700' : 
                                          ticket.metodo === 'Fiado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {ticket.metodo}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-600">{ticket.items} productos</td>
                                <td className="p-4 text-right font-bold text-slate-700">${ticket.total.toFixed(2)}</td>
                                
                                {/* NUEVA COLUMNA DE ACCIÓN CON MENÚ DESPLEGABLE */}
                                <td className="p-4 text-center relative">
                                     <button 
                                        onClick={() => setMenuAbierto(menuAbierto === ticket.ticket_id ? null : ticket.ticket_id)}
                                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                                     >
                                        <MoreVertical size={20} />
                                     </button>

                                     {/* MENÚ DESPLEGABLE */}
                                     {menuAbierto === ticket.ticket_id && (
                                         <div className="absolute right-10 top-2 bg-white shadow-xl border border-slate-100 rounded-lg z-50 w-48 overflow-hidden flex flex-col text-left animate-in fade-in zoom-in duration-200">
                                             <button 
                                                onClick={() => editarVenta(ticket)}
                                                className="px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-medium flex items-center gap-2 border-b border-slate-50"
                                             >
                                                <Edit size={16} className="text-blue-500"/> Editar / Corregir
                                             </button>
                                             <button 
                                                onClick={() => eliminarVenta(ticket.ticket_id)}
                                                className="px-4 py-3 hover:bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2"
                                             >
                                                <Trash2 size={16}/> Eliminar Reporte
                                             </button>
                                         </div>
                                     )}
                                     
                                     {/* Fondo transparente para cerrar menú al hacer click fuera */}
                                     {menuAbierto === ticket.ticket_id && (
                                        <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)}></div>
                                     )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {historialVentas.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        No hay ventas registradas aún.
                    </div>
                )}
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* GRÁFICO DE VENTAS SEMANALES */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={20}/> Ventas de la Semana</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ventasSemana}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="fecha" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`}/>
                            <Tooltip 
                                contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value) => [`$${value}`, 'Ventas']}
                            />
                            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* MÉTODOS DE PAGO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4">Métodos de Pago</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={metodosPago}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
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