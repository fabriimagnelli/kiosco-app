import React, { useState, useEffect } from "react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { 
    FileText, TrendingUp, ShoppingBag, Edit, MoreVertical, Trash2, ChevronDown, ChevronUp, User, AlertCircle, Wallet, DollarSign, 
    Search, Filter, Calendar, Printer, Share2, RotateCcw, X, Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import jsPDF from "jspdf";

function Reportes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("historial"); 
  
  const [productosTop, setProductosTop] = useState([]);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [historialVentas, setHistorialVentas] = useState([]);
  
  const [ticketExpandido, setTicketExpandido] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [rentabilidad, setRentabilidad] = useState([]);

  // --- FILTROS AVANZADOS ---
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroMin, setFiltroMin] = useState("");
  const [filtroMax, setFiltroMax] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState("");

  // --- DEVOLUCIONES ---
  const [modalDevolucion, setModalDevolucion] = useState(null);
  const [itemsDevolucion, setItemsDevolucion] = useState([]);
  const [motivoDevolucion, setMotivoDevolucion] = useState("");

  // --- CONFIG NEGOCIO (para reimpresión) ---
  const [configNegocio, setConfigNegocio] = useState({ kiosco_nombre: "", kiosco_direccion: "", kiosco_telefono: "" });

  useEffect(() => {
    cargarHistorial();
    apiFetch("/api/clientes").then(r => r.json()).then(d => setClientes(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch("/api/config").then(r => r.json()).then(d => setConfigNegocio(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "rentabilidad") {
      apiFetch("/api/reportes/rentabilidad")
        .then(r => r.json())
        .then(data => setRentabilidad(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  const cargarHistorial = (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.desde || filtroDesde) params.set('desde', filtros.desde || filtroDesde);
    if (filtros.hasta || filtroHasta) params.set('hasta', filtros.hasta || filtroHasta);
    if (filtros.metodo || filtroMetodo) params.set('metodo', filtros.metodo || filtroMetodo);
    if (filtros.cliente_id || filtroCliente) params.set('cliente_id', filtros.cliente_id || filtroCliente);
    if (filtros.busqueda || filtroBusqueda) params.set('busqueda', filtros.busqueda || filtroBusqueda);
    if (filtros.min || filtroMin) params.set('min', filtros.min || filtroMin);
    if (filtros.max || filtroMax) params.set('max', filtros.max || filtroMax);

    const qs = params.toString();
    apiFetch(`/api/ventas/historial${qs ? '?' + qs : ''}`)
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
                    pago_efectivo: v.pago_efectivo || 0,
                    pago_digital: v.pago_digital || 0,
                    notas: v.notas || '',
                    descuento: v.descuento || 0,
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
          const res = await apiFetch(`/api/ventas/${ticket_id}`, { method: "DELETE" });
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

  // --- APLICAR / LIMPIAR FILTROS ---
  const aplicarFiltros = () => {
    cargarHistorial({ desde: filtroDesde, hasta: filtroHasta, metodo: filtroMetodo, cliente_id: filtroCliente, busqueda: filtroBusqueda, min: filtroMin, max: filtroMax });
  };

  const limpiarFiltros = () => {
    setFiltroDesde(""); setFiltroHasta(""); setFiltroMetodo(""); setFiltroCliente(""); setFiltroBusqueda(""); setFiltroMin(""); setFiltroMax("");
    cargarHistorial({ desde: '', hasta: '', metodo: '', cliente_id: '', busqueda: '', min: '', max: '' });
  };

  const hayFiltrosActivos = filtroDesde || filtroHasta || filtroMetodo || filtroCliente || filtroBusqueda || filtroMin || filtroMax;

  // --- REIMPRIMIR TICKET ---
  const reimprimirTicket = async (ticket) => {
    try {
      const res = await apiFetch(`/api/ventas/${ticket.ticket_id}`);
      const items = await res.json();
      if (!items || items.length === 0) return alert("No se encontraron datos del ticket.");

      const anchoMM = 80;
      const doc = new jsPDF({ unit: "mm", format: [anchoMM, 300] });
      let y = 8;
      const margen = 4;

      const nombreNegocio = configNegocio.kiosco_nombre || "Mi Kiosco";
      const direccion = configNegocio.kiosco_direccion || "";
      const telefono = configNegocio.kiosco_telefono || "";

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(nombreNegocio.toUpperCase(), anchoMM / 2, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      if (direccion) { doc.text(direccion, anchoMM / 2, y, { align: "center" }); y += 3.5; }
      if (telefono) { doc.text(`Tel: ${telefono}`, anchoMM / 2, y, { align: "center" }); y += 3.5; }
      y += 1;
      doc.line(margen, y, anchoMM - margen, y); y += 4;

      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date(ticket.fecha).toLocaleString("es-AR")}`, margen, y); y += 3.5;
      doc.setFont("helvetica", "bold");
      doc.text(`Ticket #${ticket.ticket_id}`, margen, y); y += 3.5;
      doc.setFont("helvetica", "normal");
      doc.text(`(REIMPRESIÓN)`, margen, y); y += 4;
      doc.line(margen, y, anchoMM - margen, y); y += 4;

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Cant", margen, y);
      doc.text("Descripción", margen + 8, y);
      doc.text("P.Unit", anchoMM - margen - 18, y, { align: "right" });
      doc.text("Subtotal", anchoMM - margen, y, { align: "right" });
      y += 1; doc.line(margen, y, anchoMM - margen, y); y += 3;

      doc.setFont("helvetica", "normal");
      let subtotalGen = 0;
      (ticket.lista_productos || []).forEach(item => {
        subtotalGen += item.subtotal;
        doc.text(`${item.cantidad}`, margen + 2, y, { align: "center" });
        const nombre = item.nombre.length > 20 ? item.nombre.substring(0, 20) + ".." : item.nombre;
        doc.text(nombre, margen + 8, y);
        doc.text(`$${item.precio_unitario.toFixed(0)}`, anchoMM - margen - 18, y, { align: "right" });
        doc.text(`$${item.subtotal.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
        y += 3.5;
      });

      y += 1; doc.line(margen, y, anchoMM - margen, y); y += 4;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", margen, y);
      doc.text(`$${ticket.total.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Método de pago: ${ticket.metodo}`, margen, y); y += 3.5;
      doc.text(`Cliente: ${ticket.cliente}`, margen, y); y += 5;

      // Notas si existen
      const notasTicket = items[0]?.notas;
      if (notasTicket && notasTicket.trim()) {
        doc.setFontSize(7);
        doc.text("Notas:", margen, y); y += 3;
        const lineas = doc.splitTextToSize(notasTicket, anchoMM - margen * 2);
        lineas.forEach(l => { doc.text(l, margen, y); y += 3; });
        y += 2;
      }

      doc.line(margen, y, anchoMM - margen, y); y += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("¡Gracias por su compra!", anchoMM / 2, y, { align: "center" });
      y += 4;
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Documento no fiscal", anchoMM / 2, y, { align: "center" });

      doc.internal.pageSize.height = y + 8;
      doc.save(`ticket_${ticket.ticket_id}_reimpresion.pdf`);
    } catch (e) {
      console.error("Error reimprimiendo:", e);
      alert("Error al reimprimir el ticket.");
    }
  };

  // --- COMPARTIR TICKET POR WHATSAPP ---
  const compartirTicket = (ticket) => {
    const prods = (ticket.lista_productos || []).map(p => `  ${p.cantidad}x ${p.nombre} - $${p.subtotal.toFixed(0)}`).join('\n');
    const texto = `🧾 *Ticket #${ticket.ticket_id}*\n📅 ${new Date(ticket.fecha).toLocaleString("es-AR")}\n\n${prods}\n\n💰 *Total: $${ticket.total.toFixed(0)}*\n💳 Método: ${ticket.metodo}\n👤 Cliente: ${ticket.cliente}\n\n_${configNegocio.kiosco_nombre || 'Mi Kiosco'}_`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  // --- DEVOLUCIÓN PARCIAL ---
  const abrirDevolucion = (ticket) => {
    setModalDevolucion(ticket);
    setItemsDevolucion(ticket.lista_productos.map(p => ({ ...p, devolver: 0 })));
    setMotivoDevolucion("");
    setMenuAbierto(null);
  };

  const confirmarDevolucion = async () => {
    const itemsADevolver = itemsDevolucion.filter(i => i.devolver > 0);
    if (itemsADevolver.length === 0) return alert("Seleccioná al menos un producto para devolver.");
    
    // Validar cantidades
    for (const item of itemsADevolver) {
      if (item.devolver > item.cantidad) return alert(`No se puede devolver más de ${item.cantidad} unidades de "${item.nombre}".`);
    }

    if (!confirm(`¿Confirmar devolución de ${itemsADevolver.length} item(s)?`)) return;

    try {
      const res = await apiFetch(`/api/ventas/${modalDevolucion.ticket_id}/devolucion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsADevolver.map(i => ({ producto: i.nombre, cantidad: i.devolver })),
          motivo: motivoDevolucion
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Devolución realizada. Total devuelto: $${data.totalDevuelto.toFixed(0)}`);
        setModalDevolucion(null);
        cargarHistorial();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
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
            <button 
                onClick={() => setActiveTab("rentabilidad")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "rentabilidad" ? "bg-green-100 text-green-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
                Rentabilidad
            </button>
        </div>
      </div>

      {activeTab === "historial" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* BARRA DE BÚSQUEDA Y FILTROS */}
            <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <h3 className="font-bold text-slate-700 text-lg">Últimas Ventas</h3>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex-1 md:w-64 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <Search size={16} className="text-slate-400"/>
                            <input 
                                className="bg-transparent outline-none text-sm w-full"
                                placeholder="Buscar producto o cliente..."
                                value={filtroBusqueda}
                                onChange={e => setFiltroBusqueda(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                            />
                        </div>
                        <button 
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className={`p-2 rounded-lg border transition-colors ${mostrarFiltros || hayFiltrosActivos ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Filter size={18}/>
                        </button>
                        <span className="text-sm text-slate-400">{historialVentas.length} ventas</span>
                    </div>
                </div>

                {/* PANEL DE FILTROS AVANZADOS */}
                {mostrarFiltros && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Desde</label>
                                <input type="date" className="w-full p-2 border rounded-lg text-sm bg-white" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Hasta</label>
                                <input type="date" className="w-full p-2 border rounded-lg text-sm bg-white" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Método de Pago</label>
                                <select className="w-full p-2 border rounded-lg text-sm bg-white" value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)}>
                                    <option value="">Todos</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Mercado Pago">Mercado Pago</option>
                                    <option value="Débito">Tarjetas</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Fiado">Cuenta Corriente</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Cliente</label>
                                <select className="w-full p-2 border rounded-lg text-sm bg-white" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
                                    <option value="">Todos</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Monto Mínimo</label>
                                <input type="number" placeholder="$ 0" className="w-full p-2 border rounded-lg text-sm bg-white" value={filtroMin} onChange={e => setFiltroMin(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Monto Máximo</label>
                                <input type="number" placeholder="$ 999999" className="w-full p-2 border rounded-lg text-sm bg-white" value={filtroMax} onChange={e => setFiltroMax(e.target.value)} />
                            </div>
                            <div className="col-span-2 flex items-end gap-2">
                                <button onClick={aplicarFiltros} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                                    Aplicar Filtros
                                </button>
                                {hayFiltrosActivos && (
                                    <button onClick={limpiarFiltros} className="py-2 px-4 rounded-lg text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1">
                                        <X size={14}/> Limpiar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-420px)]">
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
                                             <div className="absolute right-10 top-2 bg-white shadow-xl border border-slate-100 rounded-lg z-50 w-52 overflow-hidden flex flex-col text-left animate-in fade-in zoom-in duration-200">
                                                 <button onClick={() => { reimprimirTicket(ticket); setMenuAbierto(null); }} className="px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-medium flex items-center gap-2 border-b border-slate-50">
                                                    <Printer size={16} className="text-purple-500"/> Reimprimir Ticket
                                                 </button>
                                                 <button onClick={() => { compartirTicket(ticket); setMenuAbierto(null); }} className="px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-medium flex items-center gap-2 border-b border-slate-50">
                                                    <Share2 size={16} className="text-green-500"/> Compartir WhatsApp
                                                 </button>
                                                 <button onClick={() => abrirDevolucion(ticket)} className="px-4 py-3 hover:bg-orange-50 text-orange-600 text-sm font-medium flex items-center gap-2 border-b border-slate-50">
                                                    <RotateCcw size={16}/> Devolución Parcial
                                                 </button>
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

                                                        {/* NOTAS DE LA VENTA */}
                                                        {ticket.notas && ticket.notas.trim() && (
                                                            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                <p className="text-xs font-bold text-yellow-700 uppercase mb-1">📝 Notas</p>
                                                                <p className="text-sm text-yellow-800">{ticket.notas}</p>
                                                            </div>
                                                        )}

                                                        {/* BOTONES DE ACCIÓN RÁPIDA */}
                                                        <div className="mt-3 flex gap-2 flex-wrap">
                                                            <button onClick={() => reimprimirTicket(ticket)} className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors">
                                                                <Printer size={14}/> Reimprimir
                                                            </button>
                                                            <button onClick={() => compartirTicket(ticket)} className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                                                                <Share2 size={14}/> WhatsApp
                                                            </button>
                                                            <button onClick={() => abrirDevolucion(ticket)} className="flex items-center gap-1 px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">
                                                                <RotateCcw size={14}/> Devolución
                                                            </button>
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
      ) : activeTab === "graficos" ? (
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
      ) : activeTab === "rentabilidad" ? (
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                <DollarSign size={20} className="text-green-600"/> Rentabilidad por Producto
              </h3>
              <span className="text-sm text-slate-400">{rentabilidad.length} productos con ventas</span>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-380px)]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-4 border-b border-slate-100 bg-slate-50">Producto</th>
                    <th className="p-4 border-b border-slate-100 bg-slate-50 text-right">P. Venta</th>
                    <th className="p-4 border-b border-slate-100 bg-slate-50 text-right">Costo</th>
                    <th className="p-4 border-b border-slate-100 bg-slate-50 text-center">Uds Vendidas</th>
                    <th className="p-4 border-b border-slate-100 bg-slate-50 text-right">Ganancia Unit.</th>
                    <th className="p-4 border-b border-slate-100 bg-slate-50 text-right">Margen %</th>
                    <th className="p-4 border-b border-slate-100 bg-slate-50 text-right">Ganancia Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {rentabilidad.length === 0 ? (
                    <tr><td colSpan="7" className="p-12 text-center text-slate-400">No hay datos de ventas con costos registrados.</td></tr>
                  ) : (
                    rentabilidad.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-700">{p.nombre}</td>
                        <td className="p-4 text-right text-slate-600">${p.precio?.toFixed(2)}</td>
                        <td className="p-4 text-right text-slate-500">${p.costo?.toFixed(2)}</td>
                        <td className="p-4 text-center font-medium text-blue-600">{p.total_vendido}</td>
                        <td className="p-4 text-right">
                          <span className={`font-bold ${p.ganancia_unitaria > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${p.ganancia_unitaria?.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            p.margen > 30 ? 'bg-green-100 text-green-700' : 
                            p.margen > 15 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'}`}>
                            {p.margen?.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-800">${p.ganancia_total?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rentabilidad.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr className="font-bold text-sm">
                      <td colSpan="3" className="p-4 text-slate-600">TOTALES</td>
                      <td className="p-4 text-center text-blue-700">{rentabilidad.reduce((a, p) => a + p.total_vendido, 0)}</td>
                      <td className="p-4"></td>
                      <td className="p-4"></td>
                      <td className="p-4 text-right text-green-700 text-lg">${rentabilidad.reduce((a, p) => a + p.ganancia_total, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* === MODAL DE DEVOLUCIÓN PARCIAL === */}
      {modalDevolucion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-orange-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <RotateCcw size={20}/> Devolución Parcial
                </h3>
                <p className="text-orange-100 text-sm">Ticket #{modalDevolucion.ticket_id}</p>
              </div>
              <button onClick={() => setModalDevolucion(null)} className="p-1 hover:bg-white/20 rounded">
                <X size={20}/>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[50vh]">
              <p className="text-sm text-slate-500">Seleccioná la cantidad a devolver de cada producto:</p>
              
              {itemsDevolucion.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-700">{item.nombre}</p>
                    <p className="text-xs text-slate-400">Vendidos: {item.cantidad} | P.Unit: ${item.precio_unitario.toFixed(0)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setItemsDevolucion(prev => prev.map((it, i) => i === idx ? { ...it, devolver: Math.max(0, it.devolver - 1) } : it))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-600 font-bold hover:bg-slate-100"
                    >-</button>
                    <span className={`w-8 text-center font-bold ${item.devolver > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {item.devolver}
                    </span>
                    <button 
                      onClick={() => setItemsDevolucion(prev => prev.map((it, i) => i === idx ? { ...it, devolver: Math.min(it.cantidad, it.devolver + 1) } : it))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-600 font-bold hover:bg-slate-100"
                    >+</button>
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Motivo de devolución (opcional)</label>
                <textarea
                  className="w-full p-2 border rounded-lg text-sm bg-white resize-none"
                  rows={2}
                  placeholder="Ej: Producto dañado, error en la venta..."
                  value={motivoDevolucion}
                  onChange={e => setMotivoDevolucion(e.target.value)}
                />
              </div>

              {/* Resumen de devolución */}
              {itemsDevolucion.some(i => i.devolver > 0) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  <p className="font-bold text-orange-800 mb-1">Resumen de devolución:</p>
                  {itemsDevolucion.filter(i => i.devolver > 0).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-orange-700">
                      <span>{item.devolver}x {item.nombre}</span>
                      <span className="font-medium">-${(item.devolver * item.precio_unitario).toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-orange-900 border-t border-orange-200 mt-2 pt-2">
                    <span>Total a devolver:</span>
                    <span>${itemsDevolucion.filter(i => i.devolver > 0).reduce((acc, i) => acc + (i.devolver * i.precio_unitario), 0).toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button onClick={() => setModalDevolucion(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 border border-slate-300 hover:bg-white transition-colors">
                Cancelar
              </button>
              <button 
                onClick={confirmarDevolucion}
                disabled={!itemsDevolucion.some(i => i.devolver > 0)}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar Devolución
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Reportes;