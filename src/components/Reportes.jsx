import React, { useState, useEffect } from "react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { 
    FileText, TrendingUp, ShoppingBag, Edit, MoreVertical, Trash2, ChevronDown, ChevronUp, User, AlertCircle, Wallet 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function Reportes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("historial"); 
  
  const [productosTop, setProductosTop] = useState([]);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [historialVentas, setHistorialVentas] = useState([]);
  
  const [ticketExpandido, setTicketExpandido] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = () => {
    fetch("http://localhost:3001/api/ventas/historial")
      .then(r => r.json())
      .then(data => {
        const agrupado = {};
        const conteoProductos = {};
        const conteoPagos = {};
        const ventasPorDia = {};
        const hace7dias = new Date();
        hace7dias.setDate(hace7dias.getDate() - 7);

        data.forEach(v => {
            // 1. Agrupar por Ticket
            if(!agrupado[v.ticket_id]) {
                agrupado[v.ticket_id] = {
                    ticket_id: v.ticket_id,
                    fecha: v.fecha,
                    total: v.precio_total, 
                    metodo: v.metodo_pago,
                    cliente: v.cliente || v.nombre_cliente || "Consumidor Final", 
                    editado: v.editado,
                    // CAPTURAMOS LOS PAGOS REALIZADOS
                    pago_efectivo: v.pago_efectivo || 0,
                    pago_digital: v.pago_digital || 0,
                    lista_productos: [] 
                };

                const metodo = v.metodo_pago || "Otros";
                conteoPagos[metodo] = (conteoPagos[metodo] || 0) + 1;

                const fechaVenta = new Date(v.fecha);
                if (fechaVenta >= hace7dias) {
                    const dia = fechaVenta.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                    if (!ventasPorDia[dia]) ventasPorDia[dia] = 0;
                    ventasPorDia[dia] += v.precio_total;
                }
            }

            // 2. Agregar producto a la lista
            agrupado[v.ticket_id].lista_productos.push({
                nombre: v.nombre_producto || v.producto || "Item",
                cantidad: v.cantidad || 1,
                precio_unitario: v.precio_unitario || 0,
                subtotal: (v.cantidad || 1) * (v.precio_unitario || 0)
            });

            // 3. Productos Top
            const nombreProd = v.nombre_producto || v.producto || v.nombre || "Producto";
            conteoProductos[nombreProd] = (conteoProductos[nombreProd] || 0) + 1;
        });

        setHistorialVentas(Object.values(agrupado).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));

        const arrayProductos = Object.keys(conteoProductos).map(key => ({ name: key, value: conteoProductos[key] }));
        setProductosTop(arrayProductos.sort((a, b) => b.value - a.value).slice(0, 5));

        const arrayVentas = Object.keys(ventasPorDia).map(key => ({ fecha: key, total: ventasPorDia[key] }));
        setVentasSemana(arrayVentas.reverse());

        const arrayPagos = Object.keys(conteoPagos).map(key => ({ name: key, value: conteoPagos[key] }));
        setMetodosPago(arrayPagos);
      })
      .catch(err => console.error("Error cargando historial:", err));
  };

  const eliminarVenta = async (ticket_id) => {
      if(!confirm(`¿Estás seguro de eliminar el Ticket #${ticket_id}? Se devolverá el stock.`)) return;
      try {
          const res = await fetch(`http://localhost:3001/api/ventas/${ticket_id}`, { method: "DELETE" });
          const data = await res.json();
          if(data.success) {
              cargarHistorial();
              setMenuAbierto(null);
          } else {
              alert("Error: " + data.error);
          }
      } catch (error) {
          console.error(error);
          alert("Error de conexión");
      }
  };

  const editarVenta = (ticket) => {
      navigate("/ventas", { state: { ticketEditar: ticket.ticket_id } });
  };

  const toggleExpand = (id) => {
      if (ticketExpandido === id) setTicketExpandido(null);
      else setTicketExpandido(id);
  };

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
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-sm uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="p-4 border-b border-slate-100 bg-slate-50 w-10"></th>
                            <th className="p-4 border-b border-slate-100 bg-slate-50">Ticket ID</th>
                            <th className="p-4 border-b border-slate-100 bg-slate-50">Fecha</th>
                            <th className="p-4 border-b border-slate-100 bg-slate-50">Método</th>
                            <th className="p-4 border-b border-slate-100 bg-slate-50 text-right">Total</th>
                            <th className="p-4 border-b border-slate-100 text-center bg-slate-50">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historialVentas.map((ticket) => (
                            <React.Fragment key={ticket.ticket_id}>
                                {/* FILA PRINCIPAL */}
                                <tr 
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${ticketExpandido === ticket.ticket_id ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => toggleExpand(ticket.ticket_id)}
                                >
                                    <td className="p-4 text-slate-400">
                                        {ticketExpandido === ticket.ticket_id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                    </td>
                                    <td className="p-4 text-slate-700 font-medium">#{ticket.ticket_id}</td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {new Date(ticket.fecha).toLocaleString()}
                                        {ticket.editado === 1 && <span className="block text-xs text-orange-500 font-bold mt-1">(Editado)</span>}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                            ${ticket.metodo === 'Efectivo' ? 'bg-green-100 text-green-700' : 
                                              ticket.metodo === 'Fiado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {ticket.metodo}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-slate-700">${ticket.total.toFixed(2)}</td>
                                    
                                    <td className="p-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                                         <button 
                                            onClick={() => setMenuAbierto(menuAbierto === ticket.ticket_id ? null : ticket.ticket_id)}
                                            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                                         >
                                            <MoreVertical size={20} />
                                         </button>
                                         {menuAbierto === ticket.ticket_id && (
                                             <div className="absolute right-10 top-2 bg-white shadow-xl border border-slate-100 rounded-lg z-50 w-48 overflow-hidden flex flex-col text-left animate-in fade-in zoom-in duration-200">
                                                 <button onClick={() => editarVenta(ticket)} className="px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-medium flex items-center gap-2 border-b border-slate-50">
                                                    <Edit size={16} className="text-blue-500"/> Editar / Corregir
                                                 </button>
                                                 <button onClick={() => eliminarVenta(ticket.ticket_id)} className="px-4 py-3 hover:bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2">
                                                    <Trash2 size={16}/> Eliminar Reporte
                                                 </button>
                                             </div>
                                         )}
                                         {menuAbierto === ticket.ticket_id && <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)}></div>}
                                    </td>
                                </tr>

                                {/* FILA DE DETALLES */}
                                {ticketExpandido === ticket.ticket_id && (
                                    <tr className="bg-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <td colSpan="6" className="p-0">
                                            <div className="p-6 border-b border-slate-200 shadow-inner">
                                                <div className="flex flex-col md:flex-row gap-8">
                                                    {/* INFO EXTRA (Cliente y Pago) */}
                                                    <div className="w-full md:w-1/3 space-y-6">
                                                        {/* Sección Cliente */}
                                                        <div>
                                                            <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                                                                <User size={18} className="text-blue-500"/> Cliente
                                                            </h4>
                                                            <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm">
                                                                {ticket.cliente}
                                                            </div>
                                                        </div>

                                                        {/* NUEVA SECCIÓN: Detalle del Pago */}
                                                        <div>
                                                            <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                                                                <Wallet size={18} className="text-green-600"/> Detalle del Pago
                                                            </h4>
                                                            <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm space-y-2 shadow-sm">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-slate-500">Total Venta:</span>
                                                                    <span className="font-bold text-slate-800 text-lg">${ticket.total.toFixed(2)}</span>
                                                                </div>
                                                                
                                                                {/* Si hubo entrega (Efectivo o Digital) */}
                                                                {(ticket.pago_efectivo > 0 || ticket.pago_digital > 0) && (
                                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-green-600">
                                                                        <span>Entrega / Seña:</span>
                                                                        <span className="font-medium">-${(ticket.pago_efectivo + ticket.pago_digital).toFixed(2)}</span>
                                                                    </div>
                                                                )}

                                                                {/* Si es Fiado, mostramos lo que resta */}
                                                                {ticket.metodo === 'Fiado' && (
                                                                    <div className="bg-red-50 p-2 rounded border border-red-100 flex justify-between items-center text-red-700 mt-2">
                                                                        <span className="font-semibold flex items-center gap-1"><AlertCircle size={14}/> Resta (Deuda):</span>
                                                                        <span className="font-bold text-lg">
                                                                            ${(ticket.total - (ticket.pago_efectivo + ticket.pago_digital)).toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* TABLA PRODUCTOS */}
                                                    <div className="w-full md:w-2/3">
                                                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                            <ShoppingBag size={18} className="text-green-500"/> Productos Vendidos
                                                        </h4>
                                                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-100 text-slate-500 font-semibold">
                                                                    <tr>
                                                                        <th className="p-3 text-left">Producto</th>
                                                                        <th className="p-3 text-center">Cant.</th>
                                                                        <th className="p-3 text-right">P. Unit</th>
                                                                        <th className="p-3 text-right">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {ticket.lista_productos.map((prod, idx) => (
                                                                        <tr key={idx} className="hover:bg-slate-50">
                                                                            <td className="p-3 text-slate-700">{prod.nombre}</td>
                                                                            <td className="p-3 text-center text-slate-500">x{prod.cantidad}</td>
                                                                            <td className="p-3 text-right text-slate-500">${prod.precio_unitario.toFixed(2)}</td>
                                                                            <td className="p-3 text-right font-medium text-slate-700">
                                                                                ${prod.subtotal.toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
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
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={20}/> Ventas de la Semana</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ventasSemana}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="fecha" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                                <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`}/>
                                <Tooltip formatter={(value) => [`$${value}`, 'Ventas']} contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4">Métodos de Pago</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={metodosPago} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {metodosPago.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
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
        </div>
      )}

    </div>
  );
}

export default Reportes;