import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, User, RefreshCw, Plus, Printer } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import jsPDF from "jspdf";

function Ventas() {
  const location = useLocation();
  const navigate = useNavigate();

  // Estados
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [metodo, setMetodo] = useState("Efectivo");
  
  // Estados para Carga Manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  
  // Clientes y Fiados
  const [clientes, setClientes] = useState([]);
  const [clienteSelec, setClienteSelec] = useState("");
  const [pagoAnticipado, setPagoAnticipado] = useState("");
  const [metodoAnticipo, setMetodoAnticipo] = useState("Efectivo");

  // Estado para Edición
  const [ticketEditando, setTicketEditando] = useState(null);
  
  // Descuento
  const [descuento, setDescuento] = useState("");

  useEffect(() => {
    cargarDatos();
    
    if (location.state && location.state.ticketEditar) {
        const ticketId = location.state.ticketEditar;
        setTicketEditando(ticketId);
        cargarVentaParaEditar(ticketId);
    }
  }, [location.state]);

  const cargarDatos = async () => {
    try {
      const [prodsRes, cigsRes, promosRes, clientsRes] = await Promise.all([
        apiFetch("/api/productos").then(r => r.json()).catch(() => []),
        apiFetch("/api/cigarrillos").then(r => r.json()).catch(() => []),
        apiFetch("/api/promos").then(r => r.json()).catch(() => []),
        apiFetch("/api/clientes").then(r => r.json()).catch(() => [])
      ]);

      const prods = Array.isArray(prodsRes) ? prodsRes : [];
      const cigs = Array.isArray(cigsRes) ? cigsRes : [];
      const promos = Array.isArray(promosRes) ? promosRes : [];
      const clients = Array.isArray(clientsRes) ? clientsRes : [];

      const productos = prods.map(x => ({...x, tipo: 'Producto'}));
      const cigarrillos = cigs.map(x => ({...x, tipo: 'Cigarrillo'}));
      const promosList = promos.map(x => ({...x, tipo: 'Promo'}));

      setProductos([...productos, ...cigarrillos, ...promosList]);
      setClientes(clients);
    } catch(err) {
      console.error("Error cargando datos:", err);
    }
  };

  const cargarVentaParaEditar = (ticketId) => {
    apiFetch(`/api/ventas/${ticketId}`)
        .then(res => res.json())
        .then(items => {
            if(items.length > 0) {
                setMetodo(items[0].metodo_pago);
                const nuevoCarrito = items.map(item => ({
                    id: item.original_id,
                    nombre: item.producto,
                    precio: item.precio_total / item.cantidad,
                    cantidad: item.cantidad,
                    tipo: item.categoria === 'cigarrillo' || item.categoria === 'Cigarrillo' ? 'Cigarrillo' : 'Producto',
                    stock: item.stock_actual
                }));
                setCarrito(nuevoCarrito);
            }
        });
  };

  const agregarAlCarrito = (prod) => {
    // Validar stock para TODOS los productos (no solo promos)
    if (prod.tipo !== 'Manual' && prod.stock !== '-') {
      // Si no es un artículo manual y tiene stock definido, validar
      if (!prod.stock || prod.stock <= 0) {
        return alert(`No hay stock disponible de "${prod.nombre}".`);
      }
    }

    // Validar stock disponible para promos (incluye stock de componentes)
    if (prod.tipo === 'Promo' && prod.componentes && Array.isArray(prod.componentes) && prod.componentes.length > 0) {
      for (const comp of prod.componentes) {
        // Buscar por nombre que es más confiable que ID
        const productoComponente = productos.find(p =>
          p.nombre === comp.nombre && p.tipo === comp.tipo
        );

        if (!productoComponente || productoComponente.stock < comp.cantidad) {
          return alert(`No hay suficiente stock de "${comp.nombre}" para esta promo.\nRequerido: ${comp.cantidad} | Disponible: ${productoComponente?.stock || 0}`);
        }
      }
    }

    const existe = carrito.find(item => item.nombre === prod.nombre);
    if (existe) {
      // Validar que la cantidad total no exceda el stock
      if (prod.tipo !== 'Manual' && prod.stock !== '-') {
        const stock = prod.stock || 0;
        if (existe.cantidad >= stock) {
          return alert(`No hay más stock disponible de "${prod.nombre}". Disponible: ${stock}`);
        }
      }
      setCarrito(carrito.map(item => item.nombre === prod.nombre ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  const agregarManual = (e) => {
    e.preventDefault();
    if (!manualNombre.trim() || !manualPrecio) return;

    const nuevoItem = {
        id: `manual-${Date.now()}`, 
        nombre: manualNombre,
        precio: parseFloat(manualPrecio),
        cantidad: 1,
        tipo: 'Manual',
        stock: '-' 
    };

    setCarrito([...carrito, nuevoItem]);
    setManualNombre("");
    setManualPrecio("");
  };

  const eliminarDelCarrito = (index) => {
    const nuevo = [...carrito];
    nuevo.splice(index, 1);
    setCarrito(nuevo);
  };

  const generarTicketPDF = (ticketId, items, metodoPago, totalVenta, descuentoTotal = 0) => {
    try {
      // Ticket térmico 80mm (~226pt de ancho)
      const anchoMM = 80;
      const doc = new jsPDF({ unit: "mm", format: [anchoMM, 200] });
      let y = 10;
      const margen = 5;
      const ancho = anchoMM - margen * 2;

      // ENCABEZADO
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("KIOSCO", anchoMM / 2, y, { align: "center" });
      y += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleString("es-AR"), anchoMM / 2, y, { align: "center" });
      y += 4;
      doc.text(`Ticket #${ticketId}`, anchoMM / 2, y, { align: "center" });
      y += 5;

      // Línea separadora
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // PRODUCTOS
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Cant.", margen, y);
      doc.text("Producto", margen + 10, y);
      doc.text("Subtot.", anchoMM - margen, y, { align: "right" });
      y += 4;
      doc.setFont("helvetica", "normal");

      items.forEach((item) => {
        const subtotal = item.precio * item.cantidad;
        doc.text(`${item.cantidad}`, margen, y);
        const nombre = item.nombre.length > 22 ? item.nombre.substring(0, 22) + "..." : item.nombre;
        doc.text(nombre, margen + 10, y);
        doc.text(`$${subtotal.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
        y += 4;
      });

      y += 2;
      doc.line(margen, y, anchoMM - margen, y);
      y += 5;

      // DESCUENTO (si hay)
      if (descuentoTotal > 0) {
        doc.setFont("helvetica", "normal");
        doc.text("Descuento:", margen, y);
        doc.text(`-$${descuentoTotal.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
        y += 5;
      }

      // TOTAL
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", margen, y);
      doc.text(`$${totalVenta.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
      y += 6;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Pago: ${metodoPago}`, anchoMM / 2, y, { align: "center" });
      y += 6;
      doc.text("¡Gracias por su compra!", anchoMM / 2, y, { align: "center" });

      // Ajustar altura del documento
      const alturaFinal = y + 10;
      doc.internal.pageSize.height = alturaFinal;

      doc.save(`ticket_${ticketId}.pdf`);
    } catch (e) {
      console.error("Error generando PDF:", e);
    }
  };

  const confirmarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");

    // VALIDACIÓN IMPORTANTE: Si es fiado, DEBE haber cliente
    if (metodo === "Fiado" && !clienteSelec) {
        return alert("Para fiar, debes seleccionar un CLIENTE obligatoriamente.");
    }

    let body = {
      productos: carrito,
      metodo_pago: metodo,
      cliente_id: clienteSelec || null,
      pago_anticipado: pagoAnticipado || 0,
      metodo_anticipo: metodoAnticipo,
      ticket_a_corregir: ticketEditando,
      descuento: descuentoNum
    };

    if (ticketEditando) {
        if(!confirm(`ESTÁS EDITANDO EL TICKET #${ticketEditando}\n\n¿Continuar?`)) return;
    }

    const res = await apiFetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      // Generar ticket PDF
      const ticketNum = data.ticket_id || ticketEditando || "?";
      generarTicketPDF(ticketNum, carrito, metodo, total, descuentoNum);

      alert(ticketEditando ? "Venta corregida." : "Venta registrada!");
      setCarrito([]);
      setTicketEditando(null);
      setClienteSelec("");
      setPagoAnticipado("");
      setDescuento("");
      setMetodo("Efectivo");
      navigate("/ventas", { state: {} });
    } else {
      alert("Error: " + data.error);
    }
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const descuentoNum = parseFloat(descuento) || 0;
  const total = Math.max(0, subtotal - descuentoNum);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-100 p-4 gap-4 overflow-hidden">
      
      {/* IZQUIERDA: BUSCADOR Y PRODUCTOS */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {ticketEditando && (
            <div className="bg-orange-100 border border-orange-300 text-orange-800 p-3 rounded-xl flex items-center gap-3 font-bold animate-pulse">
                <RefreshCw className="animate-spin-slow"/>
                <span>MODO EDICIÓN: Ticket #{ticketEditando}</span>
                <button onClick={() => { setTicketEditando(null); setCarrito([]); navigate("/ventas", {state:{}}); }} className="ml-auto text-xs bg-white border border-orange-300 px-3 py-1 rounded hover:bg-orange-50">
                    Cancelar
                </button>
            </div>
        )}

        <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-2 border border-slate-200">
          <Search className="text-slate-400" />
          <input 
            className="w-full outline-none text-lg" 
            placeholder="Buscar producto o escanear código..." 
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            autoFocus
          />
        </div>

        {/* CARGA MANUAL */}
        <form onSubmit={agregarManual} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-2 border border-slate-200">
            <Plus className="text-slate-400" />
            <input 
                className="flex-1 outline-none text-lg" 
                placeholder="Ingresar nombre producto manual..." 
                value={manualNombre}
                onChange={e => setManualNombre(e.target.value)}
            />
            <input 
                type="number"
                className="w-32 outline-none text-lg border-l border-slate-200 pl-4" 
                placeholder="$ Precio"
                value={manualPrecio}
                onChange={e => setManualPrecio(e.target.value)}
            />
            <button type="submit" className="bg-slate-900 text-white font-bold px-4 py-1 rounded-lg hover:bg-slate-800">
                Agregar
            </button>
        </form>
        
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-2 content-start">
          {productosFiltrados.slice(0, busqueda ? 100 : 50).map((prod, i) => (
             <button 
               key={i} 
               onClick={() => agregarAlCarrito(prod)}
               className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between text-left group h-fit"
             >
               <div>
                 <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${prod.tipo === 'Cigarrillo' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {prod.tipo}
                 </span>
                 <p className="font-bold text-slate-700 mt-2 leading-tight group-hover:text-blue-600">{prod.nombre}</p>
                 <p className="text-xs text-slate-400 mt-1">Stock: {prod.stock}</p>
               </div>
               <p className="text-xl font-black text-slate-800 mt-3">$ {prod.precio}</p>
             </button>
          ))}
        </div>
      </div>

      {/* DERECHA: CARRITO */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-xl flex flex-col border border-slate-200">
        <div className={`p-5 text-white flex justify-between items-center rounded-t-2xl ${ticketEditando ? 'bg-orange-600' : 'bg-slate-900'}`}>
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart /> Carrito</h2>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{carrito.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                <ShoppingCart size={48} />
                <p className="mt-2 text-sm">Carrito vacío</p>
            </div>
          ) : (
            carrito.map((item, index) => (
              <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-700">
                    {item.nombre} 
                    {item.tipo === 'Manual' && <span className="text-[10px] bg-slate-200 text-slate-500 px-1 ml-1 rounded">Manual</span>}
                  </p>
                  <p className="text-xs text-slate-500">$ {item.precio} x {item.cantidad}</p>
                </div>
                <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-800">$ {item.precio * item.cantidad}</p>
                    <button onClick={() => eliminarDelCarrito(index)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
            
            {/* CLIENTE (Opcional o Requerido si es Fiado) */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                    <User size={12}/> Cliente {metodo === 'Fiado' ? '(Obligatorio)' : '(Opcional)'}
                </label>
                <select 
                    className={`w-full p-2 border rounded-lg text-sm bg-white ${metodo === 'Fiado' && !clienteSelec ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    value={clienteSelec}
                    onChange={e => setClienteSelec(e.target.value)}
                >
                    <option value="">-- Consumidor Final --</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                
                {/* ENTREGA / PAGO ANTICIPADO (Solo si hay cliente seleccionado) */}
                {clienteSelec && (
                   <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400">Entrega</label>
                          <input 
                            type="number" 
                            placeholder="$ 0.00" 
                            className="w-full p-2 border rounded-lg text-sm"
                            value={pagoAnticipado}
                            onChange={e => setPagoAnticipado(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-400">Método Entrega</label>
                          <select 
                            className="p-2 border rounded-lg text-sm bg-white w-full"
                            value={metodoAnticipo}
                            onChange={e => setMetodoAnticipo(e.target.value)}
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Mercado Pago</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Transferencia">Targetas</option>
                          </select>
                      </div>
                   </div>
                )}
            </div>

            {/* MÉTODO DE PAGO */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                    <CreditCard size={12}/> Método de Pago
                </label>
                <select 
                    className="w-full p-3 border rounded-xl font-bold text-slate-700 bg-white"
                    value={metodo}
                    onChange={e => setMetodo(e.target.value)}
                >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Débito">Tarjetas</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Fiado" className="font-bold text-red-600">Cuenta Corriente</option>
                </select>
            </div>

            {/* DESCUENTO */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                    Descuento ($)
                </label>
                <input
                    type="number"
                    placeholder="0"
                    min="0"
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                    value={descuento}
                    onChange={e => setDescuento(e.target.value)}
                />
            </div>

            <div className="flex justify-between items-center pt-2">
                {descuentoNum > 0 && (
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 line-through">$ {subtotal}</span>
                    <span className="text-xs text-green-600 font-bold">-$ {descuentoNum} desc.</span>
                  </div>
                )}
                <span className="text-slate-500 font-bold">{descuentoNum <= 0 ? "Total" : ""}</span>
                <span className="text-3xl font-black text-slate-800">$ {total}</span>
            </div>

            <button 
                onClick={confirmarVenta}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${ticketEditando ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
                {ticketEditando ? 'CONFIRMAR CORRECCIÓN' : (metodo === 'Fiado' ? 'CONFIRMAR FIADO' : 'CONFIRMAR VENTA')}
            </button>
        </div>
      </div>
    </div>
  );
}

export default Ventas;