import React, { useState, useEffect, useRef } from "react";
import { Search, Trash2, ShoppingCart, Plus, QrCode, Cigarette, Package, Banknote, Calculator, PauseCircle, PlayCircle, X, Clock, ShoppingBag, User, UserPlus, Check, CreditCard } from "lucide-react";

function Ventas() {
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);
  const [promos, setPromos] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  
  // Estados de Pago
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  
  // NUEVOS ESTADOS PARA ENTREGA PARCIAL
  const [montoEntrega, setMontoEntrega] = useState(""); 
  const [metodoEntrega, setMetodoEntrega] = useState("Efectivo");

  // Modales
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [datosConfirmacion, setDatosConfirmacion] = useState(null);
  const [mostrarPausadas, setMostrarPausadas] = useState(false);
  const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
  
  const [ventasPausadas, setVentasPausadas] = useState([]);
  
  const inputBusquedaRef = useRef(null);
  const inputMixtoRef = useRef(null);
  const inputEntregaRef = useRef(null); // Ref para el input de entrega
  
  // Manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState(1);
  
  // Nuevo Cliente
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteTel, setNuevoClienteTel] = useState("");

  useEffect(() => {
    cargarDatos();
    const guardadas = JSON.parse(localStorage.getItem("ventasPausadas") || "[]");
    setVentasPausadas(guardadas);
  }, []);

  const cargarDatos = async () => {
      try {
        const [resProd, resCig, resPromos, resCli] = await Promise.all([
            fetch("http://localhost:3001/api/productos"),
            fetch("http://localhost:3001/api/cigarrillos"),
            fetch("http://localhost:3001/api/promos"),
            fetch("http://localhost:3001/api/clientes")
        ]);
        
        setProductos((await resProd.json()).map(p => ({ ...p, tipo: "general" })));
        setCigarrillos((await resCig.json()).map(c => ({ ...c, tipo: "cigarrillo" })));
        setPromos((await resPromos.json()).map(pr => ({ ...pr, tipo: "Promo", stock: 999 })));
        setClientes(await resCli.json());
      } catch (error) { console.error("Error datos:", error); }
  };

  useEffect(() => {
    const handleGlobalKeys = (e) => {
        if (e.key === "F5") { e.preventDefault(); confirmarVenta(); }
        if (e.key === "F4") { e.preventDefault(); pausarVenta(); }
        if (e.key === "Escape") { 
            setMostrarPausadas(false); 
            setMostrarModalClientes(false);
            setBusqueda(""); 
            inputBusquedaRef.current?.focus(); 
        }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [carrito, metodoPago, montoEfectivoMixto, clienteSeleccionado, montoEntrega, metodoEntrega]); 

  useEffect(() => { localStorage.setItem("ventasPausadas", JSON.stringify(ventasPausadas)); }, [ventasPausadas]);
  useEffect(() => { if (inputBusquedaRef.current) inputBusquedaRef.current.focus(); }, []);
  useEffect(() => { if (metodoPago === "Mixto" && inputMixtoRef.current) inputMixtoRef.current.focus(); }, [metodoPago]);
  
  // Enfocar input de entrega al seleccionar cliente
  useEffect(() => { if (clienteSeleccionado && inputEntregaRef.current) inputEntregaRef.current.focus(); }, [clienteSeleccionado]);

  const obtenerPrecio = (item) => {
    if (item.tipo !== "cigarrillo") return item.precio;
    // Si hay entrega parcial con método digital, cobramos precio QR? 
    // Simplificación: Si el método de entrega es digital, precio cigarrillo es QR, sino normal.
    // OJO: Al ser fiado parcial, se suele cobrar el precio "caro" o "barato" según política.
    // Aquí usaremos la lógica estándar: si el método de pago PRINCIPAL es digital, usa precio QR.
    // Al ser fiado, asumimos precio efectivo salvo que la entrega sea digital.
    if (metodoPago === "Débito" || metodoPago === "QR") return item.precio_qr || item.precio;
    if (clienteSeleccionado && (metodoEntrega === "Débito" || metodoEntrega === "QR" || metodoEntrega === "Transferencia")) return item.precio_qr || item.precio;
    
    return item.precio;
  };

  const calcularTotal = (items = carrito) => items.reduce((total, item) => total + obtenerPrecio(item) * item.cantidad, 0);

  const agregarAlCarrito = (item) => {
    if (item.tipo !== "Promo" && item.stock <= 0 && !item.es_manual) return alert("⚠️ No hay stock suficiente");
    const existe = carrito.find((i) => i.id === item.id && i.tipo === item.tipo);
    if (existe) {
      setCarrito(carrito.map((i) => i.id === item.id && i.tipo === item.tipo ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCarrito([...carrito, { ...item, cantidad: 1 }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        const todosLosItems = [...productos, ...cigarrillos, ...promos];
        const itemEscaneado = todosLosItems.find(p => p.codigo_barras === busqueda);
        if (itemEscaneado) {
            agregarAlCarrito(itemEscaneado);
            setBusqueda("");
            e.preventDefault();
        }
    }
  };

  const agregarProductoManual = (e) => {
    e.preventDefault();
    if (!manualNombre || !manualPrecio) return;
    const productoManual = {
      id: `manual-${Date.now()}`, nombre: manualNombre, precio: parseFloat(manualPrecio), precio_qr: parseFloat(manualPrecio),
      cantidad: parseInt(manualCantidad) || 1, categoria: "Varios", es_manual: true, tipo: "general", stock: 9999
    };
    setCarrito([...carrito, productoManual]);
    setManualNombre(""); setManualPrecio(""); setManualCantidad(1);
    document.getElementById("inputManualNombre").focus();
  };

  const eliminarDelCarrito = (id) => setCarrito(carrito.filter((item) => item.id !== id));

  const pausarVenta = () => {
    if (carrito.length === 0) return;
    const nuevaPausada = {
        id: Date.now(),
        hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        items: carrito,
        total: calcularTotal(carrito)
    };
    setVentasPausadas([nuevaPausada, ...ventasPausadas]);
    setCarrito([]); setMetodoPago("Efectivo"); setBusqueda(""); setClienteSeleccionado(null);
    setMontoEntrega(""); // Reset entrega
    alert("⏸️ Venta puesta en espera (F4)");
    inputBusquedaRef.current?.focus();
  };

  const recuperarVenta = (venta) => {
    if (carrito.length > 0) { if (!confirm("⚠️ ¿Reemplazar venta actual?")) return; }
    setCarrito(venta.items);
    setVentasPausadas(ventasPausadas.filter(v => v.id !== venta.id));
    setMostrarPausadas(false);
  };

  const descartarPausada = (id) => { if(confirm("¿Borrar?")) setVentasPausadas(ventasPausadas.filter(v => v.id !== id)); };

  // --- LÓGICA DE FIADO ---
  const handleBotonFiar = () => setMostrarModalClientes(true);
  
  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setMetodoPago("Fiar");
    setMontoEntrega(""); // Reseteamos entrega al cambiar cliente
    setMetodoEntrega("Efectivo");
    setMostrarModalClientes(false);
  };

  const cancelarFiado = () => {
      setClienteSeleccionado(null);
      setMetodoPago("Efectivo");
      setMontoEntrega("");
  };

  const crearClienteRapido = async (e) => {
    e.preventDefault();
    if (!nuevoClienteNombre) return;
    try {
        await fetch("http://localhost:3001/api/clientes", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: nuevoClienteNombre, telefono: nuevoClienteTel })
        });
        const res = await fetch("http://localhost:3001/api/clientes");
        const nuevosClientes = await res.json();
        setClientes(nuevosClientes);
        const creado = nuevosClientes.find(c => c.nombre === nuevoClienteNombre);
        if (creado) seleccionarCliente(creado);
        setNuevoClienteNombre(""); setNuevoClienteTel("");
    } catch (error) { alert("Error al crear cliente"); }
  };

  const confirmarVenta = () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    
    // Validación Fiado
    if (metodoPago === "Fiar" && !clienteSeleccionado) {
        alert("⚠️ Selecciona un cliente para fiar.");
        setMostrarModalClientes(true);
        return;
    }

    const totalVenta = calcularTotal();
    let pagoEfectivo = 0, pagoDigital = 0;
    
    // LOGICA PAGOS
    if (clienteSeleccionado) {
        // CASO FIADO (TOTAL O PARCIAL)
        const entrega = parseFloat(montoEntrega) || 0;
        if (entrega > totalVenta) return alert("⚠️ La entrega no puede ser mayor al total.");
        
        // Si hay entrega, asignamos a caja según método
        if (metodoEntrega === "Efectivo") pagoEfectivo = entrega;
        else pagoDigital = entrega;
        
        // El resto queda como deuda (se calcula en backend o frontend para mostrar)
        
    } else {
        // CASO VENTA NORMAL
        if (metodoPago === "Efectivo") pagoEfectivo = totalVenta;
        else if (metodoPago === "Mixto") {
            const efectivoIngresado = parseFloat(montoEfectivoMixto) || 0;
            if (efectivoIngresado >= totalVenta) return alert("Si efectivo cubre todo, usa modo Efectivo");
            pagoEfectivo = efectivoIngresado;
            pagoDigital = totalVenta - efectivoIngresado;
        } else {
            pagoDigital = totalVenta;
        }
    }

    const productosFinales = carrito.map(item => ({ ...item, precio: obtenerPrecio(item) }));
    setDatosConfirmacion({ 
        productosFinales, 
        pagoEfectivo, 
        pagoDigital, 
        totalVenta, 
        metodoPago: clienteSeleccionado ? "Fiar" : metodoPago,
        clienteId: clienteSeleccionado?.id,
        // Datos extra para fiado
        entregaInicial: parseFloat(montoEntrega) || 0,
        metodoEntrega: metodoEntrega
    });
    setMostrarConfirmacion(true);
  };

  const procesarVenta = async () => {
    if (!datosConfirmacion) return;
    try {
      const res = await fetch("http://localhost:3001/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: datosConfirmacion.productosFinales,
          metodo_pago: datosConfirmacion.metodoPago,
          cliente_id: datosConfirmacion.clienteId, 
          // Enviamos datos de la entrega parcial
          pago_anticipado: datosConfirmacion.entregaInicial,
          metodo_anticipo: datosConfirmacion.metodoEntrega,
          desglose: {
            efectivo: datosConfirmacion.pagoEfectivo,
            digital: datosConfirmacion.pagoDigital,
            total: datosConfirmacion.totalVenta
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Venta registrada");
        setCarrito([]); setMetodoPago("Efectivo"); setBusqueda(""); setMostrarConfirmacion(false); setDatosConfirmacion(null);
        setClienteSeleccionado(null); setMontoEntrega("");
        inputBusquedaRef.current?.focus();
      } else alert("Error: " + data.error);
    } catch (err) { alert("Error conexión: " + err.message); }
  };

  const productosFiltrados = productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const cigarrillosFiltrados = cigarrillos.filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const promosFiltradas = promos.filter((pr) => pr.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalCalculado = calcularTotal();

  // Calcular deuda restante en tiempo real para mostrar en UI
  const deudaRestante = clienteSeleccionado ? Math.max(0, totalCalculado - (parseFloat(montoEntrega) || 0)) : 0;

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 relative">
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
        {/* BUSCADOR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex-shrink-0">
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input ref={inputBusquedaRef} type="text" placeholder="Buscar..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
                </div>
                {ventasPausadas.length > 0 && <button onClick={() => setMostrarPausadas(true)} className="bg-orange-100 text-orange-600 px-4 rounded-xl font-bold flex gap-2 border border-orange-200"><Clock size={20}/> {ventasPausadas.length}</button>}
            </div>
            <form onSubmit={agregarProductoManual} className="bg-blue-50 p-2 rounded-xl border flex gap-2 items-center">
                <input type="number" className="w-16 p-2 rounded-lg border text-center font-bold" value={manualCantidad} onChange={(e) => setManualCantidad(e.target.value)} />
                <input id="inputManualNombre" type="text" placeholder="Manual..." className="flex-1 p-2 rounded-lg border" value={manualNombre} onChange={(e) => setManualNombre(e.target.value)} />
                <input type="number" placeholder="$" className="w-24 p-2 rounded-lg border font-bold" value={manualPrecio} onChange={(e) => setManualPrecio(e.target.value)} />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={20} /></button>
            </form>
        </div>
        
        {/* LISTA PRODUCTOS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
            {(promosFiltradas.length > 0) && (
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 px-1 flex items-center gap-2"><ShoppingBag size={18} className="text-purple-600"/> Promos</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {promosFiltradas.map((promo) => (
                            <div key={promo.id} onClick={() => agregarAlCarrito(promo)} className="p-3 rounded-xl border cursor-pointer hover:border-purple-400 bg-white border-purple-100 shadow-sm relative overflow-hidden group">
                                <p className="font-bold text-slate-800 truncate pr-6">{promo.nombre}</p>
                                <p className="font-bold text-purple-600 text-right mt-2 text-lg">$ {promo.precio}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {(cigarrillosFiltrados.length > 0) && (
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 px-1">Cigarrillos</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {cigarrillosFiltrados.map((cig) => (
                            <div key={cig.id} onClick={() => agregarAlCarrito(cig)} className="p-3 rounded-xl border cursor-pointer hover:border-yellow-400 bg-white">
                                <p className="font-bold text-slate-800 truncate">{cig.nombre}</p>
                                <p className="font-bold text-green-600 text-right mt-2">${cig.precio}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <h3 className="font-bold text-slate-700 mb-2 px-1">Productos</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                    {productosFiltrados.slice(0, 100).map((prod) => (
                        <div key={prod.id} onClick={() => agregarAlCarrito(prod)} className="p-3 rounded-xl border cursor-pointer hover:border-blue-300 bg-white">
                            <p className="font-bold text-slate-700 truncate">{prod.nombre}</p>
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-slate-400">Stock: {prod.stock}</p>
                                <p className="font-bold text-blue-600 text-lg">$ {prod.precio}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* SIDEBAR DERECHO (TICKET) */}
      <div className="w-full md:w-1/3 bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col h-full relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 z-10">
            <h2 className="text-xl font-bold flex gap-2"><ShoppingCart /> Venta</h2>
            <button onClick={pausarVenta} className="bg-slate-700 p-2 rounded-lg text-orange-400"><PauseCircle size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 relative z-10 mb-2 pr-1">
            {carrito.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
                    <div>
                        <p className="font-medium text-slate-200">
                            {item.nombre} {item.tipo === "Promo" && <span className="text-[10px] bg-purple-500 px-1 rounded text-white ml-1">PROMO</span>}
                        </p>
                        <p className="text-xs text-slate-400">{item.cantidad} x ${obtenerPrecio(item)}</p>
                    </div>
                    <div className="flex gap-3"><p className="font-bold text-base">$ {obtenerPrecio(item) * item.cantidad}</p><button onClick={() => eliminarDelCarrito(item.id)} className="text-red-400"><Trash2 size={16} /></button></div>
                </div>
            ))}
        </div>
        
        <div className="border-t border-slate-700 pt-4 z-10 bg-slate-900">
            <div className="flex justify-between items-end mb-4"><span className="text-slate-400 text-sm">Total</span><span className="text-3xl font-bold text-white">$ {totalCalculado.toLocaleString()}</span></div>
            
            {/* SECCIÓN PAGOS */}
            {!clienteSeleccionado ? (
                // MODO NORMAL
                <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {["Efectivo", "Transferencia", "Débito", "QR", "Mixto"].map((metodo) => (
                            <button key={metodo} onClick={() => setMetodoPago(metodo)} className={`py-2 rounded-lg text-xs font-bold ${metodoPago === metodo ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>{metodo}</button>
                        ))}
                        {/* BOTÓN FIAR */}
                        <button onClick={handleBotonFiar} className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 bg-slate-800 text-orange-400 hover:bg-slate-700`}>
                            <User size={14}/> Fiar
                        </button>
                    </div>
                    {metodoPago === "Mixto" && <input ref={inputMixtoRef} type="number" placeholder="Efectivo" className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-4 mb-3 text-white" value={montoEfectivoMixto} onChange={(e) => setMontoEfectivoMixto(e.target.value)} />}
                </>
            ) : (
                // MODO CLIENTE / FIADO
                <div className="bg-slate-800 rounded-xl p-3 mb-3 border border-orange-500/50">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-orange-400 font-bold flex items-center gap-2"><User size={16}/> {clienteSeleccionado.nombre.split(" ")[0]}</span>
                        <button onClick={cancelarFiado} className="text-xs text-slate-400 hover:text-white"><X size={14}/></button>
                    </div>
                    
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Entrega / Pago Inicial (Opcional)</label>
                            <div className="flex gap-2">
                                <input 
                                    ref={inputEntregaRef}
                                    type="number" 
                                    placeholder="$ 0" 
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold"
                                    value={montoEntrega}
                                    onChange={e => setMontoEntrega(e.target.value)}
                                />
                                <select 
                                    className="bg-slate-900 border border-slate-600 rounded-lg px-2 text-xs text-white"
                                    value={metodoEntrega}
                                    onChange={e => setMetodoEntrega(e.target.value)}
                                >
                                    <option value="Efectivo">Efvo</option>
                                    <option value="Transferencia">Transf</option>
                                    <option value="Débito">Débito</option>
                                    <option value="QR">QR</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700">
                            <span className="text-slate-400">Se anota deuda:</span>
                            <span className="font-bold text-orange-400">$ {deudaRestante.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
            
            <button onClick={confirmarVenta} className="w-full py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white">COBRAR (F5)</button>
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN */}
      {mostrarConfirmacion && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4">Confirmar Venta</h3>
                  {datosConfirmacion.clienteId && (
                    <div className="mb-4 space-y-2">
                         <div className="bg-orange-50 border border-orange-200 p-3 rounded text-sm text-orange-800">
                            <p className="font-bold flex items-center gap-2"><User size={16}/> {clienteSeleccionado.nombre}</p>
                            <div className="flex justify-between mt-1">
                                <span>Total:</span>
                                <span className="font-bold">${datosConfirmacion.totalVenta}</span>
                            </div>
                            <div className="flex justify-between text-green-700">
                                <span>Paga ahora ({datosConfirmacion.metodoEntrega}):</span>
                                <span className="font-bold">-${datosConfirmacion.entregaInicial}</span>
                            </div>
                            <div className="flex justify-between text-red-600 border-t border-orange-200 mt-1 pt-1">
                                <span>Queda debiendo:</span>
                                <span className="font-bold">${Math.max(0, datosConfirmacion.totalVenta - datosConfirmacion.entregaInicial)}</span>
                            </div>
                        </div>
                    </div>
                  )}
                  {!datosConfirmacion.clienteId && <p className="text-xl font-bold text-center my-4">$ {datosConfirmacion.totalVenta.toLocaleString()}</p>}
                  
                  <div className="flex gap-2 mt-4">
                      <button onClick={() => setMostrarConfirmacion(false)} className="flex-1 py-2 bg-slate-200 rounded text-slate-800 font-bold">Cancelar</button>
                      <button onClick={procesarVenta} className="flex-1 py-2 bg-green-600 text-white rounded font-bold">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL VENTAS PAUSADAS */}
      {mostrarPausadas && (
        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Clock/> Ventas en Espera</h3>
                    <button onClick={() => setMostrarPausadas(false)} className="hover:bg-slate-700 p-1 rounded"><X/></button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                    {ventasPausadas.length === 0 ? <p className="text-center text-slate-500 py-8">No hay ventas pausadas.</p> : ventasPausadas.map((venta) => (
                        <div key={venta.id} className="border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="font-bold text-slate-800 text-lg">$ {venta.total.toLocaleString()}</p>
                                <p className="text-sm text-slate-500 flex items-center gap-2"><Clock size={14}/> {venta.hora} | <Package size={14}/> {venta.items.length} items</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => recuperarVenta(venta)} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 flex items-center gap-2"><PlayCircle size={18}/> Retomar</button>
                                <button onClick={() => descartarPausada(venta.id)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* MODAL SELECCIONAR CLIENTE (FIAR) */}
      {mostrarModalClientes && (
        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><User/> Seleccionar Cliente</h3>
                    <button onClick={() => setMostrarModalClientes(false)} className="hover:bg-slate-700 p-1 rounded"><X/></button>
                </div>
                
                {/* Formulario Nuevo Cliente Rápido */}
                <form onSubmit={crearClienteRapido} className="bg-slate-50 p-4 border-b border-slate-200 flex gap-2">
                    <input type="text" placeholder="Nuevo cliente..." className="flex-1 p-2 border rounded-lg text-sm" value={nuevoClienteNombre} onChange={e => setNuevoClienteNombre(e.target.value)} required />
                    <input type="text" placeholder="Tel..." className="w-24 p-2 border rounded-lg text-sm" value={nuevoClienteTel} onChange={e => setNuevoClienteTel(e.target.value)}/>
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><UserPlus size={18}/></button>
                </form>

                <div className="p-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {clientes.map(c => (
                        <button key={c.id} onClick={() => seleccionarCliente(c)} className="w-full text-left p-3 hover:bg-blue-50 rounded-lg flex justify-between items-center group transition-colors">
                            <div>
                                <p className="font-bold text-slate-700">{c.nombre}</p>
                                <p className="text-xs text-slate-400">{c.telefono || "Sin teléfono"}</p>
                            </div>
                            <span className="text-blue-600 opacity-0 group-hover:opacity-100"><Check size={18}/></span>
                        </button>
                    ))}
                    {clientes.length === 0 && <p className="text-center text-slate-400 py-4">No hay clientes registrados.</p>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;