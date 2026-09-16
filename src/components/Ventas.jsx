import React, { useState, useEffect, useRef } from "react";
import {
  Search, ShoppingCart, Trash2, CreditCard, User, RefreshCw, Plus, Printer,
  Percent, CheckCircle, X, QrCode, MessageCircle, Loader2, Minus, Banknote,
  Send, Users, ChevronDown,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { beepScan, successSound, errorSound } from "../lib/sounds";
import { useNotify } from "../context/NotificationContext";
import { QRCodeSVG } from "qrcode.react";
import ProductosGrid from "./ProductosGrid";

const METODOS = [
  { id: "Efectivo", label: "Efectivo", icon: Banknote },
  { id: "Mercado Pago", label: "Mercado Pago / QR", icon: QrCode },
  { id: "Débito", label: "Débito", icon: CreditCard },
  { id: "Transferencia", label: "Transferencia", icon: Send },
  { id: "Fiado", label: "Cuenta Corriente / Fiado", icon: Users },
];
const BILLETES = [20000, 10000, 2000, 1000];

const formatMoney = (value) => `$ ${Number(value || 0).toLocaleString("es-AR")}`;

function Ventas() {
  const location = useLocation();
  const navigate = useNavigate();
  const { confirmDialog } = useNotify();

  // Estados
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [metodo, setMetodo] = useState("Efectivo");
  const [pagaCon, setPagaCon] = useState("");
  const [ticketsEnEspera, setTicketsEnEspera] = useState([]);

  // Estados para Carga Manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");

  // Clientes y Fiados
  const [clientes, setClientes] = useState([]);
  const [clienteSelec, setClienteSelec] = useState("");

  // Estado para Edición
  const [ticketEditando, setTicketEditando] = useState(null);

  // Descuento
  const [descuento, setDescuento] = useState("");
  const [descuentoTipo, setDescuentoTipo] = useState("$"); // "$" o "%"

  // Notas de la venta
  const [notas, setNotas] = useState("");

  // Ref para foco automático
  const busquedaRef = useRef(null);
  const pagaConRef = useRef(null);
  const checkoutPanelRef = useRef(null);
  const scanBufferRef = useRef("");
  const scanLastTsRef = useRef(0);
  const toastTimerRef = useRef(null);

  // Toast rápido para feedback de escaneo
  const [scanToast, setScanToast] = useState(null);
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);
  const [checkoutExtras, setCheckoutExtras] = useState(false);
  const [guardandoCobro, setGuardandoCobro] = useState(false);

  // Datos del negocio para ticket
  const [configNegocio, setConfigNegocio] = useState({ kiosco_nombre: "", kiosco_direccion: "", kiosco_telefono: "" });

  // Modal de éxito post-venta
  const [modalExito, setModalExito] = useState(null); // { ticketId, items, metodo, total, descuento, notas }

  // Modal QR MercadoPago
  const [modalQR, setModalQR] = useState(null); // { monto, alias, nombre, qrBase64 }

  // MP Modelo Asistido — estado del pago y polling
  const [mpEstadoPago, setMpEstadoPago] = useState('idle');
  const [mpExternalRef, setMpExternalRef] = useState(null);
  const [mpPagoError, setMpPagoError] = useState(null);
  const mpPollingRef = useRef(null);
  const mpTimeoutRef = useRef(null);

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

    if (busquedaRef.current) {
      busquedaRef.current.focus();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (mpPollingRef.current) clearInterval(mpPollingRef.current);
      if (mpTimeoutRef.current) clearTimeout(mpTimeoutRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [location.state]);

  const pausarTicket = () => {
    if (carrito.length === 0) return;
    setTicketsEnEspera(prev => [...prev, {
      id: Date.now(),
      carrito: [...carrito],
      clienteSelec,
      total,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setCarrito([]);
    setClienteSelec("");
    setDescuento("");
    setNotas("");
    setMetodo("Efectivo");
    setPagaCon("");
  };

  const recuperarTicket = (ticketId) => {
    const ticket = ticketsEnEspera.find(t => t.id === ticketId);
    if (!ticket) return;
    setCarrito(ticket.carrito);
    setClienteSelec(ticket.clienteSelec || "");
    setTicketsEnEspera(prev => prev.filter(t => t.id !== ticketId));
  };

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
      const catalogoBase = [...productos, ...cigarrillos];

      // El stock de una promo es virtual: depende de cuántos combos completos entran según sus componentes
      const stockDeComponente = (comp) => {
        const encontrado = catalogoBase.find(p =>
          (comp.id != null && p.id === comp.id && p.tipo === comp.tipo) ||
          (p.nombre === comp.nombre && p.tipo === comp.tipo)
        );
        return encontrado ? (encontrado.stock || 0) : 0;
      };

      const promosList = promos.map(x => {
        const componentes = Array.isArray(x.componentes) ? x.componentes : [];
        const stockVirtual = componentes.length
          ? Math.min(...componentes.map(c => Math.floor(stockDeComponente(c) / (c.cantidad || 1))))
          : 0;
        return { ...x, tipo: 'Promo', componentes, stock: stockVirtual };
      });

      setProductos([...catalogoBase, ...promosList]);
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

  const mostrarToastRapido = (texto, tipo = "err") => {
    setScanToast({ texto, tipo });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setScanToast(null), 1800);
  };

  const cambiarMetodo = (nuevoMetodo) => {
    setMetodo(nuevoMetodo);
    // Actualizar precios de cigarrillos según método de pago
    const esDigital = ['Mercado Pago', 'Débito', 'Transferencia'].includes(nuevoMetodo);
    setCarrito(prev => prev.map(item => {
      if (item.tipo === 'Cigarrillo' && item.precio_qr) {
        return { ...item, precio: esDigital ? item.precio_qr : item.precio_original };
      }
      return item;
    }));
  };

  const abrirCheckout = () => {
    if (carrito.length === 0) {
      mostrarToastRapido("El carrito está vacío", "warn");
      return;
    }
    setPagaCon("");
    setCheckoutAbierto(true);
  };

  const cerrarCheckout = () => {
    if (guardandoCobro) return;
    setCheckoutAbierto(false);
    setTimeout(() => busquedaRef.current?.focus(), 60);
  };

  /* Los componentes vienen del catálogo ya parseados, pero se soporta el string JSON crudo de SQLite por las dudas */
  const parsearComponentes = (componentes) => {
    if (Array.isArray(componentes)) return componentes;
    if (typeof componentes === 'string' && componentes.trim()) {
      try { return JSON.parse(componentes); } catch { return []; }
    }
    return [];
  };

  const obtenerStockComponente = (comp) => {
    const encontrado = productos.find(p =>
      (comp.id != null && p.id === comp.id && p.tipo === comp.tipo) ||
      (p.nombre === comp.nombre && p.tipo === comp.tipo)
    );
    return encontrado ? (encontrado.stock || 0) : 0;
  };

  // stockDisponiblePromo = min(stock físico de cada componente / cantidad requerida por combo)
  const agregarAlCarrito = (prod) => {
    const esPromo = prod.tipo === 'Promo';
    const componentesPromo = esPromo ? parsearComponentes(prod.componentes) : [];

    if (esPromo) {
      if (componentesPromo.length === 0) {
        return mostrarToastRapido(`La promo "${prod.nombre}" no tiene componentes configurados.`, "warn");
      }
      // Se valida contra la cantidad que ya está en el carrito + la unidad que se quiere sumar
      const yaEnCarrito = carrito.find(item => item.nombre === prod.nombre && item.tipo === 'Promo')?.cantidad || 0;
      for (const comp of componentesPromo) {
        const disponible = obtenerStockComponente(comp);
        const necesario = (comp.cantidad || 1) * (yaEnCarrito + 1);
        if (disponible < necesario) {
          return mostrarToastRapido(`No hay stock suficiente de "${comp.nombre}" para la promo "${prod.nombre}". Requerido: ${necesario} | Disponible: ${disponible}`, "warn");
        }
      }
    } else if (prod.tipo !== 'Manual' && prod.stock !== '-') {
      if (!prod.stock || prod.stock <= 0) {
        return mostrarToastRapido(`No hay stock disponible de "${prod.nombre}".`, "warn");
      }
    }

    // Determinar precio según método de pago para cigarrillos
    const esMetodoDigital = ['Mercado Pago', 'Débito', 'Transferencia'].includes(metodo);
    const precioFinal = (prod.tipo === 'Cigarrillo' && esMetodoDigital && prod.precio_qr) ? prod.precio_qr : prod.precio;

    // Sonido de escaneo/agregado
    beepScan();

    const existe = carrito.find(item => item.nombre === prod.nombre);
    if (existe) {
      if (!esPromo && prod.tipo !== 'Manual' && prod.stock !== '-') {
        const stock = prod.stock || 0;
        if (existe.cantidad >= stock) {
          return mostrarToastRapido(`No hay más stock disponible de "${prod.nombre}". Disponible: ${stock}`, "warn");
        }
      }
      setCarrito(carrito.map(item => item.nombre === prod.nombre ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, {
        ...prod,
        componentes: esPromo ? componentesPromo : prod.componentes,
        precio: precioFinal,
        precio_original: prod.precio,
        precio_qr: prod.precio_qr || prod.precio,
        cantidad: 1,
        descuento_item: 0,
        descuento_item_tipo: '$'
      }]);
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

  const incrementarItem = (index) => {
    const item = carrito[index];
    if (!item) return;
    const esPromo = item.tipo === 'Promo';
    const esManual = item.tipo === 'Manual';

    if (!esPromo && !esManual && item.stock !== '-') {
      const stock = item.stock || 0;
      if (item.cantidad >= stock) {
        return mostrarToastRapido(`No hay más stock disponible de "${item.nombre}". Disponible: ${stock}`, "warn");
      }
    }

    if (esPromo) {
      const componentesPromo = parsearComponentes(item.componentes);
      for (const comp of componentesPromo) {
        const disponible = obtenerStockComponente(comp);
        const necesario = (comp.cantidad || 1) * (item.cantidad + 1);
        if (disponible < necesario) {
          return mostrarToastRapido(`No hay stock suficiente de "${comp.nombre}" para la promo "${item.nombre}". Requerido: ${necesario} | Disponible: ${disponible}`, "warn");
        }
      }
    }

    beepScan();
    setCarrito(carrito.map((it, i) => i === index ? { ...it, cantidad: it.cantidad + 1 } : it));
  };

  const decrementarItem = (index) => {
    setCarrito(prev => prev.map((it, i) => {
      if (i !== index) return it;
      if (it.cantidad - 1 <= 0) return null;
      return { ...it, cantidad: it.cantidad - 1 };
    }).filter(Boolean));
  };

  const calcularDescuentoItem = (item) => {
    const bruto = item.precio * item.cantidad;
    if (!item.descuento_item || item.descuento_item <= 0) return 0;
    if (item.descuento_item_tipo === '%') return bruto * (item.descuento_item / 100);
    return item.descuento_item;
  };

  const escHtml = (valor) =>
    String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const imprimirTicketHTML = (ticketId, items, metodoPago, totalVenta, descuentoTotal = 0, notasVenta = '') => {
    // Validación de datos antes de disparar la impresión
    if (!ticketId) { mostrarToastRapido("Falta el número de ticket para imprimir.", "warn"); return; }
    if (!Array.isArray(items) || items.length === 0) { mostrarToastRapido("No hay productos para imprimir.", "warn"); return; }
    const totalNum = Number(totalVenta);
    if (isNaN(totalNum) || totalNum < 0) { mostrarToastRapido("El total de la venta no es válido.", "warn"); return; }
    if (!metodoPago) { mostrarToastRapido("Falta el método de pago para imprimir.", "warn"); return; }

    try {
      const ticketNum = String(parseInt(ticketId, 10) || ticketId).padStart(4, '0');
      const nombreNegocio = configNegocio.kiosco_nombre || "Mi Kiosco";
      const direccion = configNegocio.kiosco_direccion || "";
      const telefono = configNegocio.kiosco_telefono || "";
      const fecha = new Date().toLocaleString("es-AR");

      const filasHtml = items.map((item) => {
        const precioUnit = Number(item.precio) || 0;
        const cant = Number(item.cantidad) || 1;
        const bruto = precioUnit * cant;
        const descItem = calcularDescuentoItem(item);
        const subtotal = bruto - descItem;
        const dtoHtml = descItem > 0
          ? ` <span style="font-size:9px;">Dto -$${descItem.toFixed(0)}${item.descuento_item_tipo === '%' ? ` (${item.descuento_item}%)` : ''}</span>`
          : '';
        return `<tr><td class="l">${cant} x ${escHtml(item.nombre || "Producto")}${dtoHtml}</td><td class="r">$ ${subtotal.toFixed(0)}</td></tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Ticket ${ticketNum}</title>
<style>
@page {
  /* La altura 'auto' hace que el rollo corte justo al terminar el contenido,
     evitando papel en blanco de más. Ancho 80mm = rollo del kiosco. */
  size: 80mm auto;
  margin: 0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  /* Ancho imprimible real de un cabezal de 80mm (entre 72mm y 76mm) */
  width: 76mm;
  margin: 0;
  padding: 4mm 2mm 6mm;
  font-family: "Courier New", Courier, monospace;
  font-size: 13px; /* Aumentado ligeramente para mejor lectura en 80mm */
  font-weight: 600;
  line-height: 1.3;
  color: #000;
}

.center { text-align: center; }
.negrita { font-weight: 700; }
.titulo { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }

/* Línea de corte que abarca todo el ancho del papel */
.corte { 
  border-top: 1px dashed #000; 
  margin: 5px 0; 
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

td, th {
  padding: 2px 0;
  vertical-align: top;
}

/* En 80mm hay espacio suficiente para que el producto y el precio entren en un solo renglón */
.col-cant { width: 10%; text-align: left; }
.col-desc { width: 65%; text-align: left; word-break: break-word; }
.col-precio { width: 25%; text-align: right; white-space: nowrap; }

/* Para filas generales de totales */
.l { text-align: left; width: 60%; }
.r { text-align: right; width: 40%; white-space: nowrap; }

.subtotal { font-size: 13px; }
.total { font-size: 15px; font-weight: 700; }
.pie { font-size: 10px; margin-top: 6px; }
</style>
</head>
<body>
  <div class="center negrita titulo">${escHtml(nombreNegocio.toUpperCase())}</div>
  ${direccion ? `<div class="center">${escHtml(direccion)}</div>` : ''}
  ${telefono ? `<div class="center">Tel: ${escHtml(telefono)}</div>` : ''}
  <div class="corte"></div>
  <div>Fecha: ${escHtml(fecha)}</div>
  <div class="negrita">Ticket #${ticketNum}</div>
  <div class="corte"></div>
  <table>${filasHtml}</table>
  <div class="corte"></div>
  <div class="r">Subtotal: $ ${Number(totalNum + Number(descuentoTotal || 0)).toFixed(0)}</div>
  ${Number(descuentoTotal || 0) > 0 ? `<div class="r">Descuento: -$ ${Number(descuentoTotal || 0).toFixed(0)}</div>` : ''}
  <div class="r negrita total">TOTAL: $ ${totalNum.toFixed(0)}</div>
  <div style="margin-top:4px;">Método de pago: ${escHtml(metodoPago)}</div>
  ${notasVenta && notasVenta.trim() ? `<div style="margin-top:4px;">Notas: ${escHtml(notasVenta)}</div>` : ''}
  <div class="corte"></div>
  <div class="center negrita">¡Gracias por su compra!</div>
  <div class="center pie">Documento no fiscal</div>
</body>
</html>`;

      // 1. Crear un iframe oculto en el body
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      let impreso = false;

      // 4. Remover el iframe del DOM una vez completada la impresión
      const limpiarIframe = () => {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      };

      const ejecutarImpresion = () => {
        if (impreso) return;
        impreso = true;
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error("Error al imprimir ticket:", err);
        }
        limpiarIframe();
      };

      const docIframe = iframe.contentDocument || iframe.contentWindow.document;

      let intentos = 0;
      const listoYImprimir = () => {
        const cuerpo = docIframe.body;
        const hayContenido = cuerpo && (cuerpo.innerHTML || "").trim().length > 0;
        if (hayContenido) {
          ejecutarImpresion();
        } else if (intentos < 10) {
          intentos += 1;
          setTimeout(listoYImprimir, 150);
        } else {
          limpiarIframe();
        }
      };

      // 2. Escribir el ticket con los estilos embebidos
      // 3. Imprimir recién con contentWindow.onload + retardo de seguridad
      iframe.onload = () => setTimeout(listoYImprimir, 250);

      docIframe.open();
      docIframe.write(html);
      docIframe.close();

      // Fallback en caso de que onload ya se haya disparado antes de asignarlo
      setTimeout(listoYImprimir, 500);
    } catch (e) {
      console.error("Error generando ticket:", e);
    }
  };

  // ==== MP Modelo Asistido — helpers ====
  const detenerPollingMP = () => {
    if (mpPollingRef.current) { clearInterval(mpPollingRef.current); mpPollingRef.current = null; }
    if (mpTimeoutRef.current) { clearTimeout(mpTimeoutRef.current); mpTimeoutRef.current = null; }
  };

  const iniciarPollingMP = (externalRef) => {
    mpPollingRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/mp/check-payment/${encodeURIComponent(externalRef)}`);
        const data = await res.json();
        if (data.status === 'approved') {
          detenerPollingMP();
          setMpEstadoPago('confirmado');
          setTimeout(() => {
            setMpEstadoPago('idle');
            setMpExternalRef(null);
            setModalQR(null);
            setModalExito(null);
          }, 3000);
        } else if (data.status === 'rejected') {
          detenerPollingMP();
          setMpEstadoPago('error');
          setMpPagoError('El pago fue rechazado por MercadoPago.');
        }
      } catch (e) { /* silencioso — polling continúa */ }
    }, 2000);
    // Timeout de 5 minutos
    mpTimeoutRef.current = setTimeout(() => {
      detenerPollingMP();
      setMpEstadoPago('error');
      setMpPagoError('Tiempo de espera agotado. Verificá el pago manualmente en MercadoPago.');
    }, 5 * 60 * 1000);
  };

  const cerrarModalVenta = () => {
    if (mpEstadoPago === 'esperando' && mpExternalRef) {
      detenerPollingMP();
      apiFetch('/api/mp/cancel-order', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_ref: mpExternalRef })
      }).catch(() => {});
    }
    detenerPollingMP();
    setMpEstadoPago('idle');
    setMpExternalRef(null);
    setMpPagoError(null);
    setModalExito(null);
    setModalQR(null);
  };

  const confirmarVenta = async () => {
    if (carrito.length === 0) {
      mostrarToastRapido("El carrito está vacío", "warn");
      return false;
    }

    // VALIDACIÓN IMPORTANTE: Si es fiado, DEBE haber cliente
    if (metodo === "Fiado" && !clienteSelec) {
        mostrarToastRapido("Para fiar, debes seleccionar un CLIENTE obligatoriamente.", "warn");
        return false;
    }

    if (ticketEditando) {
        if(!(await confirmDialog(`ESTÁS EDITANDO EL TICKET #${String(parseInt(ticketEditando, 10) || ticketEditando).padStart(4, '0')}\n\n¿Continuar?`))) return false;
    }

    let body = {
      productos: carrito.map(item => ({
        ...item,
        descuento_item: calcularDescuentoItem(item)
      })),
      metodo_pago: metodo,
      cliente_id: clienteSelec || null,
      ticket_a_corregir: ticketEditando,
      descuento: descuentoNum,
      notas: notas,
    };

    try {
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

        // Mostrar QR si es método digital
        const esDigital = ['Mercado Pago', 'Transferencia'].includes(metodo);
        const montoQR = total;

        const mpApiActiva = configNegocio.mp_api_configurada === 'true';

        if (metodo === 'Mercado Pago' && mpApiActiva && configNegocio.mp_pos_qr_image_url) {
          // --- Modelo Asistido: QR dinámico con confirmación automática ---
          const externalRef = `TKT-${ticketNum}-${Date.now()}`;
          setModalQR({
            monto: montoQR,
            alias: '',
            nombre: configNegocio.mp_nombre || configNegocio.kiosco_nombre || '',
            qrBase64: configNegocio.mp_pos_qr_image_url
          });
          setMpExternalRef(externalRef);
          setMpEstadoPago('asignando');
          // Asignar orden al POS de MP (no bloquea el UI)
          apiFetch('/api/mp/assign-order', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ external_ref: externalRef, total: montoQR, ticket_id: ticketNum })
          }).then(async res => {
            const assignData = await res.json();
            if (assignData.success) {
              setMpEstadoPago('esperando');
              iniciarPollingMP(externalRef);
            } else {
              setMpEstadoPago('error');
              setMpPagoError('No se pudo asignar la orden a MP: ' + (assignData.error || 'error desconocido'));
            }
          }).catch(() => {
            setMpEstadoPago('error');
            setMpPagoError('Error de conexión. Verificá el pago en MercadoPago manualmente.');
          });
        } else if (esDigital && (configNegocio.mp_alias || configNegocio.mp_qr_base64)) {
          // --- Modelo estático (fallback) ---
          setModalQR({
            monto: montoQR,
            alias: configNegocio.mp_alias,
            nombre: configNegocio.mp_nombre || configNegocio.kiosco_nombre || '',
            qrBase64: configNegocio.mp_qr_base64 || ''
          });
        }

        // Limpiar estado
        setCarrito([]);
        setTicketEditando(null);
        setClienteSelec("");
        setDescuento("");
        setNotas("");
        setMetodo("Efectivo");
        setPagaCon("");
        navigate("/ventas", { state: {} });
        return true;
      } else {
        mostrarToastRapido("Error: " + data.error, "err");
        return false;
      }
    } catch (err) {
      console.error("Error al registrar la venta:", err);
      mostrarToastRapido("Error de conexión. Intente nuevamente.", "err");
      return false;
    }
  };

  const confirmarDesdeCheckout = async () => {
    if (guardandoCobro || carrito.length === 0) return;

    // Validar que el pago con efectivo cubra el total
    const pagaNum = parseFloat(pagaCon) || 0;
    if (metodo === "Efectivo" && pagaNum > 0 && pagaNum < total) {
      mostrarToastRapido("El monto es menor al total", "warn");
      return;
    }

    setGuardandoCobro(true);
    const ok = await confirmarVenta();
    if (ok) {
      setCheckoutAbierto(false);
      setCheckoutExtras(false);
    }
    setGuardandoCobro(false);
  };

  const handleCheckoutKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cerrarCheckout();
    } else if (e.key === "Enter") {
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA") return;
      e.preventDefault();
      confirmarDesdeCheckout();
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  // Buscar por código de barras (incluye secundarios) al presionar Enter
  const buscarPorCodigo = async (codigo) => {
    if (!codigo || codigo.length < 2) return false;
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

  const buscarYAgregarPorCodigo = async (codigo) => {
    const valor = (codigo || "").trim();
    if (!valor) return false;

    // Prioridad 1: coincidencia exacta local por código principal
    const exactoLocal = productos.find(p => p.codigo_barras && String(p.codigo_barras).trim() === valor);
    if (exactoLocal) {
      agregarAlCarrito(exactoLocal);
      setBusqueda("");
      return true;
    }

    // Prioridad 2: búsqueda en SQLite (incluye códigos secundarios)
    const found = await buscarPorCodigo(valor);
    if (found) {
      setBusqueda("");
      return true;
    }

    return false;
  };

  const handleBusquedaKeyDown = async (e) => {
    if (e.key === 'Enter') {
      // Usar el valor real del input (e.target.value) en vez del estado,
      // porque el escáner de código de barras escribe muy rápido y React
      // puede no haber actualizado el estado aún cuando llega el Enter.
      const valorActual = (e.target.value || '').trim();
      if (!valorActual) return;
      e.preventDefault();

      const foundByCode = await buscarYAgregarPorCodigo(valorActual);
      if (foundByCode) return;

      // Fallback para búsqueda manual por nombre
      const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(valorActual.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.includes(valorActual))
      );
      if (filtrados.length > 0) {
        agregarAlCarrito(filtrados[0]);
        setBusqueda("");
        return;
      }

      setBusqueda("");
      errorSound();
      mostrarToastRapido("Producto no encontrado", "err");
    }
  };

  useEffect(() => {
    const isEditableTarget = (target) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const handleGlobalKeyDown = async (e) => {
      // Cuando el modal de checkout está abierto, sus propias teclas lo gobiernan
      if (checkoutAbierto) return;

      const target = e.target;
      const editable = isEditableTarget(target);
      const busquedaEl = busquedaRef.current;
      const focusedBusqueda = busquedaEl && document.activeElement === busquedaEl;

      if (e.key === "F12") {
        e.preventDefault();
        abrirCheckout();
        return;
      }

      if (e.key === " " && focusedBusqueda && !busqueda.trim()) {
        e.preventDefault();
        abrirCheckout();
        return;
      }

      if ((e.key === "Delete" || e.key === "Supr") && !editable) {
        if (carrito.length > 0) {
          e.preventDefault();
          setCarrito((prev) => prev.slice(0, -1));
        }
        return;
      }

      // Captura global para lectores de código de barras (teclado wedge)
      if (e.key === "Enter") {
        const rawBuffer = scanBufferRef.current.trim();
        const inputValue = (busquedaEl?.value || "").trim();
        const code = rawBuffer || inputValue;

        scanBufferRef.current = "";
        scanLastTsRef.current = 0;

        // Enter sobre el input principal lo resuelve handleBusquedaKeyDown
        if (focusedBusqueda) return;

        if (code.length >= 2) {
          e.preventDefault();
          const found = await buscarYAgregarPorCodigo(code);
          setBusqueda("");
          if (!found) {
            errorSound();
            mostrarToastRapido("Producto no encontrado", "err");
          }
          if (busquedaEl) busquedaEl.focus();
        }
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1) return;

      const now = Date.now();
      if (now - scanLastTsRef.current > 80) {
        scanBufferRef.current = "";
      }
      scanLastTsRef.current = now;
      scanBufferRef.current += e.key;
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [busqueda, carrito.length, productos, checkoutAbierto, metodo]);

  const subtotal = carrito.reduce((acc, item) => {
    const bruto = item.precio * item.cantidad;
    const descItem = calcularDescuentoItem(item);
    return acc + bruto - descItem;
  }, 0);
  const descuentoNum = descuentoTipo === '%' ? (subtotal * (parseFloat(descuento) || 0) / 100) : (parseFloat(descuento) || 0);
  const total = Math.max(0, subtotal - descuentoNum);
  const pagaConNum = parseFloat(pagaCon) || 0;
  const vuelto = Math.max(0, pagaConNum - total);

  useEffect(() => {
    if (!checkoutAbierto) return;
    // Mover el foco dentro del modal para que Enter/Escape burbujeen hasta el panel
    const t = setTimeout(() => {
      if (metodo === "Efectivo") {
        pagaConRef.current?.focus();
      } else {
        checkoutPanelRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(t);
  }, [checkoutAbierto, metodo]);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#f5f5f7] p-2 md:p-4 gap-3 md:gap-4 overflow-hidden">

      {/* IZQUIERDA: BUSCADOR Y PRODUCTOS */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {ticketEditando && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-xl flex items-center gap-3 font-medium animate-pulse">
                <RefreshCw className="animate-spin-slow"/>
                <span>MODO EDICIÓN: Ticket #{String(parseInt(ticketEditando, 10) || ticketEditando).padStart(4, '0')}</span>
                <button onClick={() => { setTicketEditando(null); setCarrito([]); navigate("/ventas", {state:{}}); }} className="ml-auto text-xs bg-white border border-orange-200 px-3 py-1 rounded-lg hover:bg-orange-50">
                    Cancelar
                </button>
            </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl p-3.5 rounded-xl flex items-center gap-2 border border-black/[0.04] shadow-sm">
          <Search className="text-slate-400" size={20} />
          <input
            ref={busquedaRef}
            className="w-full outline-none text-base bg-transparent"
            placeholder="Escanear código o buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleBusquedaKeyDown}
            autoFocus
            inputMode="text"
            autoComplete="off"
          />
        </div>

        {/* CARGA MANUAL */}
        <form onSubmit={agregarManual} className="bg-white/80 backdrop-blur-xl p-3 rounded-xl flex flex-wrap items-center gap-2 border border-black/[0.04] shadow-sm">
            <Plus className="text-slate-400" size={18} />
            <input
                className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
                placeholder="Producto manual..."
                value={manualNombre}
                onChange={e => setManualNombre(e.target.value)}
            />
            <input
                type="number"
                className="w-24 md:w-28 outline-none text-sm border-l border-black/[0.06] pl-3 bg-transparent"
                placeholder="$ Precio"
                value={manualPrecio}
                onChange={e => setManualPrecio(e.target.value)}
            />
            <button type="submit" className="bg-[#007aff] text-white font-normal text-sm px-4 py-1.5 rounded-lg hover:bg-[#0071e3] transition-colors">
                Agregar
            </button>
        </form>

        <ProductosGrid
          productos={productosFiltrados}
          metodo={metodo}
          onAgregar={agregarAlCarrito}
          busqueda={busqueda}
        />
      </div>

      {/* DERECHA: CARRITO (ticket en tiempo real) */}
      <div className="w-full lg:w-96 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm flex flex-col border border-black/[0.04] max-h-[calc(100vh-2rem)]">
        <div className={`px-4 py-2.5 text-white flex justify-between items-center rounded-t-2xl ${ticketEditando ? 'bg-orange-500' : 'bg-[#1c1c1e]'}`}>
          <h2 className="font-medium text-sm flex items-center gap-2 tracking-tight"><ShoppingCart size={15}/> Carrito</h2>
          <div className="flex items-center gap-2">
            {carrito.length > 0 && !ticketEditando && (
              <button
                type="button"
                onClick={pausarTicket}
                className="bg-white/15 hover:bg-white/25 transition-colors px-2 py-0.5 rounded-full text-xs font-medium"
              >
                Pausar
              </button>
            )}
            <span className="bg-white/15 px-2 py-0.5 rounded-full text-xs font-medium">{carrito.length} items</span>
          </div>
        </div>

        {ticketsEnEspera.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-black/[0.04] bg-amber-50">
            {ticketsEnEspera.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => recuperarTicket(t.id)}
                className="shrink-0 flex flex-col items-start px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-left hover:bg-amber-100 transition-colors"
              >
                <span className="text-[10px] font-bold text-amber-700">{t.hora}</span>
                <span className="text-xs font-semibold text-slate-700">{formatMoney(t.total)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                <ShoppingCart size={48} />
                <p className="mt-2 text-sm">Carrito vacío</p>
            </div>
          ) : (
            carrito.map((item, index) => (
              <div key={index} className="bg-[#f5f5f7] p-2.5 rounded-lg border border-black/[0.04]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-[#1d1d1f] truncate">
                      {item.nombre}
                      {item.tipo === 'Manual' && <span className="text-[10px] bg-black/[0.04] text-[#86868b] px-1 ml-1 rounded">Manual</span>}
                      {item.tipo === 'Cigarrillo' && item.precio_qr && item.precio !== item.precio_original && (
                        <span className="text-[10px] bg-blue-50 text-[#007aff] px-1 ml-1 rounded">QR</span>
                      )}
                    </p>
                    <p className="text-[13px] text-[#86868b]">
                      {formatMoney(item.precio)} <span className="text-[#86868b]/70">x {item.cantidad}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => eliminarDelCarrito(index)}
                    className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => decrementarItem(index)}
                      disabled={item.cantidad <= 1}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Restar"
                    >
                      <Minus size={14}/>
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-slate-700 tabular-nums">{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => incrementarItem(index)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
                      title="Sumar"
                    >
                      <Plus size={14}/>
                    </button>
                  </div>
                  <p className="font-bold text-sm text-[#1d1d1f] tabular-nums">{formatMoney(item.precio * item.cantidad - calcularDescuentoItem(item))}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3.5 bg-white border-t border-black/[0.05] space-y-3 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#86868b]">Total</span>
            <span className="text-2xl font-bold text-[#1d1d1f] tracking-tight tabular-nums">{formatMoney(total)}</span>
          </div>

          <button
            onClick={abrirCheckout}
            disabled={carrito.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${ticketEditando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#007aff] hover:bg-[#0071e3]'}`}
          >
            {ticketEditando ? 'COBRAR CORRECCIÓN' : 'COBRAR'}
          </button>
        </div>
      </div>

      {/* MODAL DE CHECKOUT: Finalizar Venta */}
      {checkoutAbierto && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
          onClick={cerrarCheckout}
          onKeyDown={handleCheckoutKey}
        >
          <div
            ref={checkoutPanelRef}
            tabIndex={-1}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden outline-none animate-in fade-in zoom-in"
            onClick={e => e.stopPropagation()}
          >
            {/* ENCABEZADO: Total a cobrar */}
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-500" /> Finalizar Venta
                </h3>
                <button
                  type="button"
                  onClick={cerrarCheckout}
                  disabled={guardandoCobro}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total a cobrar</p>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">{formatMoney(total)}</p>
            </div>

            {/* CUERPO */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
              {/* Selector de Cliente */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                  <User size={12}/> Cliente
                </label>
                <select
                  className={`w-full p-2.5 border rounded-xl text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-blue-100 ${metodo === 'Fiado' && !clienteSelec ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'}`}
                  value={clienteSelec}
                  onChange={e => setClienteSelec(e.target.value)}
                >
                  <option value="">-- Consumidor Final --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              {/* Métodos de Pago */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                  <CreditCard size={12}/> Método de Pago
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {METODOS.map(m => {
                    const Icono = m.icon;
                    const activo = metodo === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => cambiarMetodo(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          activo
                            ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-200 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icono size={15} /> <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                {metodo === 'Fiado' && !clienteSelec && (
                  <p className="text-[11px] text-red-500 font-semibold">Para fiar, seleccioná un cliente.</p>
                )}
              </div>

              {/* Calculadora de Vuelto (solo Efectivo) */}
              {metodo === 'Efectivo' && total > 0 && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Paga con...</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BILLETES.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setPagaCon(String(b))}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        {formatMoney(b)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPagaCon(String(total))}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-400 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                    >
                      Exacto
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-700">$</span>
                    <input
                      ref={pagaConRef}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2.5 border border-emerald-200 rounded-xl text-base font-bold bg-white text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-200 tabular-nums"
                      value={pagaCon}
                      onChange={e => setPagaCon(e.target.value)}
                    />
                  </div>
                  {pagaConNum > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-emerald-100 px-3 py-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Vuelto</span>
                      <span className="text-xl font-black text-emerald-700 tabular-nums">{formatMoney(vuelto)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Opcionales: Descuento y notas (colapsable) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCheckoutExtras(!checkoutExtras)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-2"><Percent size={15} className="text-slate-400" /> Descuento y notas</span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${checkoutExtras ? 'rotate-180' : ''}`} />
                </button>
                {checkoutExtras && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 space-y-3 animate-in fade-in">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Descuento general</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="flex-1 p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-100"
                          value={descuento}
                          onChange={e => setDescuento(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => { setDescuentoTipo(descuentoTipo === '$' ? '%' : '$'); setDescuento(''); }}
                          className={`px-3 py-2 rounded-xl font-bold text-xs border transition-colors ${descuentoTipo === '%' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
                        >
                          {descuentoTipo === '%' ? '%' : '$'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Notas de la venta</label>
                      <textarea
                        rows={2}
                        placeholder="Ej: Sin sal, entregar a las 18hs..."
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white resize-none outline-none focus:ring-2 focus:ring-blue-100"
                        value={notas}
                        onChange={e => setNotas(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ACCIONES */}
            <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={cerrarCheckout}
                disabled={guardandoCobro}
                className="py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={16} /> Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarDesdeCheckout}
                disabled={guardandoCobro || carrito.length === 0 || (metodo === 'Fiado' && !clienteSelec)}
                className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {guardandoCobro ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {guardandoCobro ? "Procesando..." : "Confirmar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO POST-VENTA */}
      {modalExito && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={cerrarModalVenta}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                (mpEstadoPago === 'asignando' || mpEstadoPago === 'esperando') ? 'bg-cyan-100' : 'bg-green-100'
              }`}>
                {(mpEstadoPago === 'asignando' || mpEstadoPago === 'esperando')
                  ? <QrCode className="text-cyan-600" size={36} />
                  : <CheckCircle className="text-green-600" size={36} />
                }
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {(mpEstadoPago === 'asignando' || mpEstadoPago === 'esperando')
                  ? 'Escanear QR para cobrar'
                  : mpEstadoPago === 'confirmado'
                    ? '¡Pago confirmado!'
                    : modalExito.esEdicion ? '¡Venta corregida!' : '¡Venta registrada!'
                }
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Ticket #{String(parseInt(modalExito.ticketId, 10) || modalExito.ticketId).padStart(4, '0')} — Total: {formatMoney(modalExito.total)}
              </p>
            </div>

            {/* QR MercadoPago */}
            {modalQR && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center space-y-2">
                <p className="text-sm font-bold text-cyan-800 flex items-center justify-center gap-2">
                  <QrCode size={16}/>
                  {mpEstadoPago !== 'idle' ? 'Escanear QR del mostrador' : 'Cobrar con MercadoPago'}
                </p>
                <div className="bg-white p-3 rounded-lg inline-block mx-auto">
                  {modalQR.qrBase64 ? (
                    <img src={modalQR.qrBase64} alt="QR Mercado Pago" className="w-40 h-40 object-contain" />
                  ) : (
                    <QRCodeSVG
                      value={`https://link.mercadopago.com.ar/${modalQR.alias}`}
                      size={160}
                      level="M"
                      includeMargin={true}
                    />
                  )}
                </div>
                {modalQR.alias && (
                  <p className="text-xs text-cyan-600">
                    Alias: <strong>{modalQR.alias}</strong>
                  </p>
                )}
                <div className="bg-cyan-100 rounded-lg py-2 px-4">
                  <p className="text-xs text-cyan-600">Monto a cobrar</p>
                  <p className="text-2xl font-black text-cyan-800">{formatMoney(modalQR.monto)}</p>
                </div>
                {modalQR.nombre && (
                  <p className="text-xs text-cyan-500">{modalQR.nombre}</p>
                )}
                {/* Estado del pago MP (Modelo Asistido) */}
                {mpEstadoPago === 'asignando' && (
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-xs mt-1">
                    <Loader2 size={14} className="animate-spin"/> Preparando orden en MercadoPago...
                  </div>
                )}
                {mpEstadoPago === 'esperando' && (
                  <div className="flex items-center justify-center gap-2 text-cyan-600 text-xs font-medium mt-1">
                    <Loader2 size={14} className="animate-spin"/> Esperando confirmación de pago...
                  </div>
                )}
                {mpEstadoPago === 'confirmado' && (
                  <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-bold mt-1">
                    <CheckCircle size={16}/> ¡Pago confirmado por MercadoPago!
                  </div>
                )}
                {mpEstadoPago === 'error' && mpPagoError && (
                  <div className="text-amber-600 text-xs bg-amber-50 rounded-lg p-2 mt-1">
                    ⚠ {mpPagoError}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  imprimirTicketHTML(
                    modalExito.ticketId,
                    modalExito.items,
                    modalExito.metodo,
                    modalExito.total,
                    modalExito.descuento,
                    modalExito.notas
                  );
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors text-sm"
              >
                <Printer size={16} />
                Imprimir
              </button>

              {/* Botón WhatsApp */}
              <button
                onClick={() => {
                  const ticketNum = String(parseInt(modalExito.ticketId, 10) || modalExito.ticketId).padStart(4, '0');
                  const items = modalExito.items.map(i => `  ${i.cantidad}x ${i.nombre} ${formatMoney(i.precio * i.cantidad)}`).join('\n');
                  const msg = `🧾 *Comprobante de compra*\n` +
                    `📍 ${configNegocio.kiosco_nombre || 'Mi Kiosco'}\n` +
                    `📅 ${new Date().toLocaleString('es-AR')}\n` +
                    `🎫 Ticket #${ticketNum}\n\n` +
                    `${items}\n\n` +
                    `💰 *TOTAL: ${formatMoney(modalExito.total)}*\n` +
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
              onClick={cerrarModalVenta}
              className="w-full flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-bold transition-colors"
            >
              <X size={18} />
              Cerrar
            </button>
          </div>
        </div>
      )}

      {scanToast && (
        <div className="fixed right-4 top-4 z-[90] animate-in fade-in slide-in-from-top-2">
          <div className={`rounded-xl border px-4 py-3 text-sm font-semibold backdrop-blur-xl shadow-lg ${
            scanToast.tipo === "ok"
              ? "border-emerald-200 bg-emerald-100/90 text-emerald-700"
              : scanToast.tipo === "warn"
              ? "border-amber-200 bg-amber-100/90 text-amber-700"
              : "border-rose-200 bg-rose-100/90 text-rose-700"
          }`}>
            {scanToast.texto}
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;