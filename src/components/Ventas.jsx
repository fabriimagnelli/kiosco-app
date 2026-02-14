import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, User, RefreshCw, Plus, Printer, Percent, DollarSign, MessageSquare, Tag, CheckCircle, X, QrCode, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { beepScan, successSound, errorSound } from "../lib/sounds";
import jsPDF from "jspdf";
import { QRCodeSVG } from "qrcode.react";

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
  const [descuentoTipo, setDescuentoTipo] = useState("$"); // "$" o "%"

  // Notas de la venta
  const [notas, setNotas] = useState("");

  // Ref para foco automático
  const busquedaRef = useRef(null);

  // Datos del negocio para ticket
  const [configNegocio, setConfigNegocio] = useState({ kiosco_nombre: "", kiosco_direccion: "", kiosco_telefono: "" });

  // Modal de éxito post-venta
  const [modalExito, setModalExito] = useState(null); // { ticketId, items, metodo, total, descuento, notas }

  // Modal QR MercadoPago
  const [modalQR, setModalQR] = useState(null); // { monto, alias, nombre }

  useEffect(() => {
    cargarDatos();
    cargarConfigNegocio();
    
    if (location.state && location.state.ticketEditar) {
        const ticketId = location.state.ticketEditar;
        setTicketEditando(ticketId);
        cargarVentaParaEditar(ticketId);
    }

    // Re-enfocar al volver a la pestaña
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && busquedaRef.current) {
        busquedaRef.current.focus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [location.state]);

  const cargarConfigNegocio = async () => {
    try {
      const res = await apiFetch("/api/config");
      const data = await res.json();
      setConfigNegocio(data);
    } catch (e) { console.error("Error cargando config negocio:", e); }
  };

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
      const cigarrillos = cigs.map(x => ({...x, tipo: 'Cigarrillo', precio_qr: x.precio_qr || x.precio}));
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
      if (!prod.stock || prod.stock <= 0) {
        return alert(`No hay stock disponible de "${prod.nombre}".`);
      }
    }

    // Validar stock disponible para promos
    if (prod.tipo === 'Promo' && prod.componentes && Array.isArray(prod.componentes) && prod.componentes.length > 0) {
      for (const comp of prod.componentes) {
        const productoComponente = productos.find(p =>
          p.nombre === comp.nombre && p.tipo === comp.tipo
        );
        if (!productoComponente || productoComponente.stock < comp.cantidad) {
          return alert(`No hay suficiente stock de "${comp.nombre}" para esta promo.\nRequerido: ${comp.cantidad} | Disponible: ${productoComponente?.stock || 0}`);
        }
      }
    }

    // Determinar precio según método de pago para cigarrillos
    const esMetodoDigital = ['Mercado Pago', 'Débito', 'Transferencia'].includes(metodo);
    const precioFinal = (prod.tipo === 'Cigarrillo' && esMetodoDigital && prod.precio_qr) ? prod.precio_qr : prod.precio;

    // Sonido de escaneo/agregado
    beepScan();

    const existe = carrito.find(item => item.nombre === prod.nombre);
    if (existe) {
      if (prod.tipo !== 'Manual' && prod.stock !== '-') {
        const stock = prod.stock || 0;
        if (existe.cantidad >= stock) {
          return alert(`No hay más stock disponible de "${prod.nombre}". Disponible: ${stock}`);
        }
      }
      setCarrito(carrito.map(item => item.nombre === prod.nombre ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...prod, precio: precioFinal, precio_original: prod.precio, precio_qr: prod.precio_qr || prod.precio, cantidad: 1, descuento_item: 0, descuento_item_tipo: '$' }]);
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
        stock: '-',
        descuento_item: 0,
        descuento_item_tipo: '$'
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

  // Funciones para descuento por ítem
  const actualizarDescuentoItem = (index, valor) => {
    setCarrito(carrito.map((item, i) => i === index ? { ...item, descuento_item: parseFloat(valor) || 0 } : item));
  };

  const toggleDescuentoItemTipo = (index) => {
    setCarrito(carrito.map((item, i) => i === index ? { ...item, descuento_item_tipo: item.descuento_item_tipo === '$' ? '%' : '$', descuento_item: 0 } : item));
  };

  const calcularDescuentoItem = (item) => {
    const bruto = item.precio * item.cantidad;
    if (!item.descuento_item || item.descuento_item <= 0) return 0;
    if (item.descuento_item_tipo === '%') return bruto * (item.descuento_item / 100);
    return item.descuento_item;
  };

  const generarTicketPDF = (ticketId, items, metodoPago, totalVenta, descuentoTotal = 0, notasVenta = '') => {
    try {
      const anchoMM = 80;
      const doc = new jsPDF({ unit: "mm", format: [anchoMM, 250] });
      let y = 8;
      const margen = 4;

      const nombreNegocio = configNegocio.kiosco_nombre || "Mi Kiosco";
      const direccion = configNegocio.kiosco_direccion || "";
      const telefono = configNegocio.kiosco_telefono || "";

      // === ENCABEZADO: Datos del negocio ===
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(nombreNegocio.toUpperCase(), anchoMM / 2, y, { align: "center" });
      y += 5;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      if (direccion) {
        doc.text(direccion, anchoMM / 2, y, { align: "center" });
        y += 3.5;
      }
      if (telefono) {
        doc.text(`Tel: ${telefono}`, anchoMM / 2, y, { align: "center" });
        y += 3.5;
      }
      y += 1;

      // Línea separadora
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // Fecha y ticket
      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date().toLocaleString("es-AR")}`, margen, y);
      y += 3.5;
      doc.setFont("helvetica", "bold");
      doc.text(`Ticket #${String(ticketId).padStart(4, '0')}`, margen, y);
      y += 4;

      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // === DETALLE DE PRODUCTOS ===
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Cant", margen, y);
      doc.text("Descripción", margen + 8, y);
      doc.text("P.Unit", anchoMM - margen - 18, y, { align: "right" });
      doc.text("Subtotal", anchoMM - margen, y, { align: "right" });
      y += 1;
      doc.line(margen, y, anchoMM - margen, y);
      y += 3;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      let subtotalGeneral = 0;
      items.forEach((item) => {
        const precioUnit = Number(item.precio) || 0;
        const cant = Number(item.cantidad) || 1;
        const bruto = precioUnit * cant;
        const descItem = calcularDescuentoItem(item);
        const subtotal = bruto - descItem;
        subtotalGeneral += subtotal;

        doc.text(`${cant}`, margen + 2, y, { align: "center" });
        const nombre = (item.nombre || "Producto").length > 20 ? (item.nombre || "Producto").substring(0, 20) + ".." : (item.nombre || "Producto");
        doc.text(nombre, margen + 8, y);
        doc.text(`$${precioUnit.toFixed(0)}`, anchoMM - margen - 18, y, { align: "right" });
        doc.text(`$${subtotal.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
        y += 3.5;

        // Mostrar descuento por ítem si existe
        if (descItem > 0) {
          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          doc.text(`  Dto: -$${descItem.toFixed(0)}${item.descuento_item_tipo === '%' ? ` (${item.descuento_item}%)` : ''}`, margen + 8, y);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
          y += 3;
        }
      });

      y += 1;
      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // === SUBTOTAL ===
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Subtotal:", margen, y);
      doc.text(`$${subtotalGeneral.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
      y += 4;

      // DESCUENTO (si hay)
      if (descuentoTotal > 0) {
        doc.text("Descuento:", margen, y);
        doc.text(`-$${descuentoTotal.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
        y += 4;
      }

      // === TOTAL ===
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", margen, y);
      doc.text(`$${totalVenta.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
      y += 5;

      // Método de pago
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Método de pago: ${metodoPago}`, margen, y);
      y += 5;

      // Notas (si hay)
      if (notasVenta && notasVenta.trim()) {
        doc.setFontSize(7);
        doc.text("Notas:", margen, y);
        y += 3;
        const lineasNota = doc.splitTextToSize(notasVenta, anchoMM - margen * 2);
        lineasNota.forEach(linea => {
          doc.text(linea, margen, y);
          y += 3;
        });
        y += 2;
      }

      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // === PIE ===
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("¡Gracias por su compra!", anchoMM / 2, y, { align: "center" });
      y += 4;
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Documento no fiscal", anchoMM / 2, y, { align: "center" });

      // Ajustar altura del documento al contenido
      doc.internal.pageSize.height = y + 8;

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
      productos: carrito.map(item => ({
        ...item,
        descuento_item: calcularDescuentoItem(item)
      })),
      metodo_pago: metodo,
      cliente_id: clienteSelec || null,
      pago_anticipado: pagoAnticipado || 0,
      metodo_anticipo: metodoAnticipo,
      ticket_a_corregir: ticketEditando,
      descuento: descuentoNum,
      notas: notas
    };

    if (ticketEditando) {
        if(!confirm(`ESTÁS EDITANDO EL TICKET #${String(ticketEditando).padStart(4, '0')}\n\n¿Continuar?`)) return;
    }

    const res = await apiFetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      const ticketNum = data.ticket_id || ticketEditando || "?";
      
      successSound();
      
      // Guardar datos para el modal (antes de limpiar carrito)
      const clienteNombre = clientes.find(c => String(c.id) === String(clienteSelec))?.nombre || '';
      const clienteTelefono = clientes.find(c => String(c.id) === String(clienteSelec))?.telefono || '';
      
      setModalExito({
        ticketId: ticketNum,
        items: [...carrito],
        metodo: metodo,
        total: total,
        descuento: descuentoNum,
        notas: notas,
        esEdicion: !!ticketEditando,
        clienteNombre,
        clienteTelefono
      });

      // Mostrar QR si es método digital y hay alias de MercadoPago configurado
      const esDigital = ['Mercado Pago', 'Transferencia'].includes(metodo);
      if (esDigital && configNegocio.mp_alias) {
        setModalQR({
          monto: total,
          alias: configNegocio.mp_alias,
          nombre: configNegocio.mp_nombre || configNegocio.kiosco_nombre || ''
        });
      }

      // Limpiar estado
      setCarrito([]);
      setTicketEditando(null);
      setClienteSelec("");
      setPagoAnticipado("");
      setDescuento("");
      setNotas("");
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

  // Buscar por código de barras (incluye secundarios) al presionar Enter
  const buscarPorCodigo = async (codigo) => {
    if (!codigo || codigo.length < 3) return;
    try {
      const res = await apiFetch(`/api/buscar_codigo/${encodeURIComponent(codigo.trim())}`);
      const data = await res.json();
      if (data && data.id) {
        const tipo = data.tipo_item === 'cigarrillo' ? 'Cigarrillo' : data.tipo_item === 'promo' ? 'Promo' : 'Producto';
        agregarAlCarrito({ ...data, tipo });
        setBusqueda("");
        return true;
      }
    } catch(e) { /* silencioso */ }
    return false;
  };

  const handleBusquedaKeyDown = async (e) => {
    if (e.key === 'Enter' && busqueda.trim()) {
      e.preventDefault();
      // Si hay exactamente 1 resultado en filtro local, agregarlo
      if (productosFiltrados.length === 1) {
        agregarAlCarrito(productosFiltrados[0]);
        setBusqueda("");
        return;
      }
      // Si no, buscar por código secundario en el servidor
      const found = await buscarPorCodigo(busqueda.trim());
      if (!found && productosFiltrados.length > 0) {
        agregarAlCarrito(productosFiltrados[0]);
        setBusqueda("");
      }
    }
  };

  const subtotal = carrito.reduce((acc, item) => {
    const bruto = item.precio * item.cantidad;
    const descItem = calcularDescuentoItem(item);
    return acc + bruto - descItem;
  }, 0);
  const descuentoNum = descuentoTipo === '%' ? (subtotal * (parseFloat(descuento) || 0) / 100) : (parseFloat(descuento) || 0);
  const total = Math.max(0, subtotal - descuentoNum);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-100 p-2 md:p-4 gap-3 md:gap-4 overflow-hidden">
      
      {/* IZQUIERDA: BUSCADOR Y PRODUCTOS */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {ticketEditando && (
            <div className="bg-orange-100 border border-orange-300 text-orange-800 p-3 rounded-xl flex items-center gap-3 font-bold animate-pulse">
                <RefreshCw className="animate-spin-slow"/>
                <span>MODO EDICIÓN: Ticket #{String(ticketEditando).padStart(4, '0')}</span>
                <button onClick={() => { setTicketEditando(null); setCarrito([]); navigate("/ventas", {state:{}}); }} className="ml-auto text-xs bg-white border border-orange-300 px-3 py-1 rounded hover:bg-orange-50">
                    Cancelar
                </button>
            </div>
        )}

        <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-2 border border-slate-200">
          <Search className="text-slate-400" />
          <input 
            ref={busquedaRef}
            className="w-full outline-none text-lg" 
            placeholder="Buscar producto o escanear código..." 
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleBusquedaKeyDown}
            autoFocus
          />
        </div>

        {/* CARGA MANUAL */}
        <form onSubmit={agregarManual} className="bg-white p-3 md:p-4 rounded-2xl shadow-sm flex flex-wrap items-center gap-2 border border-slate-200">
            <Plus className="text-slate-400" />
            <input 
                className="flex-1 min-w-[120px] outline-none text-base md:text-lg" 
                placeholder="Producto manual..." 
                value={manualNombre}
                onChange={e => setManualNombre(e.target.value)}
            />
            <input 
                type="number"
                className="w-24 md:w-32 outline-none text-base md:text-lg border-l border-slate-200 pl-4" 
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
                 <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${prod.tipo === 'Cigarrillo' ? 'bg-orange-100 text-orange-600' : prod.tipo === 'Promo' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {prod.tipo}
                 </span>
                 <p className="font-bold text-slate-700 mt-2 leading-tight group-hover:text-blue-600">{prod.nombre}</p>
                 <p className="text-xs text-slate-400 mt-1">Stock: {prod.stock}</p>
               </div>
               {prod.tipo === 'Cigarrillo' && prod.precio_qr && prod.precio_qr !== prod.precio ? (
                 <div className="mt-3">
                   <p className={`text-xl font-black ${['Mercado Pago', 'Débito', 'Transferencia'].includes(metodo) ? 'text-slate-400 text-sm line-through' : 'text-green-700'}`}>$ {prod.precio} <span className="text-[10px] font-normal">Efvo</span></p>
                   <p className={`text-xl font-black ${['Mercado Pago', 'Débito', 'Transferencia'].includes(metodo) ? 'text-blue-600' : 'text-slate-400 text-sm line-through'}`}>$ {prod.precio_qr} <span className="text-[10px] font-normal">Digital</span></p>
                 </div>
               ) : (
               <p className="text-xl font-extrabold text-slate-800 mt-3">$ {prod.precio}</p>
               )}
             </button>
          ))}
        </div>
      </div>

      {/* DERECHA: CARRITO */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-xl flex flex-col border border-slate-200">
        <div className={`p-5 text-white flex justify-between items-center rounded-t-2xl ${ticketEditando ? 'bg-orange-600' : 'bg-slate-900'}`}>
          <h2 className="font-bold flex items-center gap-2 tracking-tight"><ShoppingCart /> Carrito</h2>
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
              <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-700">
                      {item.nombre} 
                      {item.tipo === 'Manual' && <span className="text-[10px] bg-slate-200 text-slate-500 px-1 ml-1 rounded">Manual</span>}
                      {item.tipo === 'Cigarrillo' && item.precio_qr && item.precio !== item.precio_original && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1 ml-1 rounded">QR</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">$ {item.precio} x {item.cantidad}</p>
                  </div>
                  <div className="flex items-center gap-3">
                      <p className="font-bold text-slate-800">$ {(item.precio * item.cantidad - calcularDescuentoItem(item)).toFixed(0)}</p>
                      <button onClick={() => eliminarDelCarrito(index)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                  </div>
                </div>
                {/* Descuento por ítem */}
                <div className="flex items-center gap-1 pt-1">
                  <Tag size={12} className="text-green-500"/>
                  <input
                    type="number"
                    placeholder="Dto"
                    min="0"
                    className="w-16 p-1 text-xs border rounded bg-white"
                    value={item.descuento_item || ''}
                    onChange={e => actualizarDescuentoItem(index, e.target.value)}
                  />
                  <button
                    onClick={() => toggleDescuentoItemTipo(index)}
                    className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                      item.descuento_item_tipo === '%' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    {item.descuento_item_tipo === '%' ? '%' : '$'}
                  </button>
                  {calcularDescuentoItem(item) > 0 && (
                    <span className="text-[10px] text-green-600 font-bold">-${calcularDescuentoItem(item).toFixed(0)}</span>
                  )}
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
                    onChange={e => {
                      const nuevoMetodo = e.target.value;
                      setMetodo(nuevoMetodo);
                      // Actualizar precios de cigarrillos según método de pago
                      const esDigital = ['Mercado Pago', 'Débito', 'Transferencia'].includes(nuevoMetodo);
                      setCarrito(prev => prev.map(item => {
                        if (item.tipo === 'Cigarrillo' && item.precio_qr) {
                          return { ...item, precio: esDigital ? item.precio_qr : item.precio_original };
                        }
                        return item;
                      }));
                    }}
                >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Débito">Tarjetas</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Fiado" className="font-bold text-red-600">Cuenta Corriente</option>
                </select>
            </div>

            {/* DESCUENTO POR TICKET */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                    <Tag size={12}/> Descuento General
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="flex-1 p-2 border rounded-lg text-sm bg-white"
                        value={descuento}
                        onChange={e => setDescuento(e.target.value)}
                    />
                    <button
                        onClick={() => { setDescuentoTipo(descuentoTipo === '$' ? '%' : '$'); setDescuento(''); }}
                        className={`px-3 py-2 rounded-lg font-bold text-sm border transition-colors ${
                            descuentoTipo === '%' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                    >
                        {descuentoTipo === '%' ? '%' : '$'}
                    </button>
                </div>
            </div>

            {/* NOTAS / COMENTARIOS */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                    <MessageSquare size={12}/> Notas (opcional)
                </label>
                <textarea
                    placeholder="Ej: Sin sal, entregar a las 18hs..."
                    className="w-full p-2 border rounded-lg text-sm bg-white resize-none"
                    rows={2}
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                />
            </div>

            <div className="flex justify-between items-center pt-2">
                {descuentoNum > 0 && (
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 line-through">$ {subtotal + descuentoNum}</span>
                    <span className="text-xs text-green-600 font-bold">-$ {descuentoNum.toFixed(0)} desc.{descuentoTipo === '%' ? ` (${descuento}%)` : ''}</span>
                  </div>
                )}
                <span className="text-slate-500 font-bold">{descuentoNum <= 0 ? "Total" : ""}</span>
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">$ {total.toFixed(0)}</span>
            </div>

            <button 
                onClick={confirmarVenta}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${ticketEditando ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
                {ticketEditando ? 'CONFIRMAR CORRECCIÓN' : (metodo === 'Fiado' ? 'CONFIRMAR FIADO' : 'CONFIRMAR VENTA')}
            </button>
        </div>
      </div>

      {/* MODAL DE ÉXITO POST-VENTA */}
      {modalExito && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setModalExito(null); setModalQR(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="text-green-600" size={36} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {modalExito.esEdicion ? '¡Venta corregida!' : '¡Venta registrada!'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Ticket #{String(modalExito.ticketId).padStart(4, '0')} — Total: ${modalExito.total.toFixed(0)}
              </p>
            </div>

            {/* QR estático de MercadoPago — mismo que el impreso en el mostrador */}
            {modalQR && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center space-y-2">
                <p className="text-sm font-bold text-cyan-800 flex items-center justify-center gap-2">
                  <QrCode size={16}/> Cobrar con MercadoPago
                </p>
                <div className="bg-white p-3 rounded-lg inline-block mx-auto">
                  <QRCodeSVG 
                    value={`https://link.mercadopago.com.ar/${modalQR.alias}`}
                    size={160}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-cyan-600">
                  Alias: <strong>{modalQR.alias}</strong>
                </p>
                <div className="bg-cyan-100 rounded-lg py-2 px-4">
                  <p className="text-xs text-cyan-600">Monto a cobrar</p>
                  <p className="text-2xl font-black text-cyan-800">${modalQR.monto.toFixed(0)}</p>
                </div>
                {modalQR.nombre && (
                  <p className="text-xs text-cyan-500">{modalQR.nombre}</p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  generarTicketPDF(modalExito.ticketId, modalExito.items, modalExito.metodo, modalExito.total, modalExito.descuento, modalExito.notas);
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors text-sm"
              >
                <Printer size={16} />
                Imprimir
              </button>
              
              {/* Botón WhatsApp */}
              <button
                onClick={() => {
                  const ticketNum = String(modalExito.ticketId).padStart(4, '0');
                  const items = modalExito.items.map(i => `  ${i.cantidad}x ${i.nombre} $${(i.precio * i.cantidad).toFixed(0)}`).join('\n');
                  const msg = `🧾 *Comprobante de compra*\n` +
                    `📍 ${configNegocio.kiosco_nombre || 'Mi Kiosco'}\n` +
                    `📅 ${new Date().toLocaleString('es-AR')}\n` +
                    `🎫 Ticket #${ticketNum}\n\n` +
                    `${items}\n\n` +
                    `💰 *TOTAL: $${modalExito.total.toFixed(0)}*\n` +
                    `💳 Método: ${modalExito.metodo}\n` +
                    (modalExito.notas ? `📝 Notas: ${modalExito.notas}\n` : '') +
                    `\n¡Gracias por su compra!`;
                  
                  // Si hay teléfono del cliente, usar ese; sino abrir sin número
                  const tel = modalExito.clienteTelefono || '';
                  const url = tel 
                    ? `https://wa.me/${tel.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`
                    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                  window.open(url, '_blank');
                }}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-colors text-sm"
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
            </div>

            <button
              onClick={() => { setModalExito(null); setModalQR(null); }}
              className="w-full flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-bold transition-colors"
            >
              <X size={18} />
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;