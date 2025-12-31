import React, { useState, useEffect, useRef } from "react";
import { Search, Trash2, ShoppingCart, Plus, QrCode, Cigarette, Package, Banknote, Calculator, PauseCircle, PlayCircle, X, Clock } from "lucide-react";

function Ventas() {
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  
  // Estados para pago
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState("");

  // ESTADOS NUEVOS: VENTAS EN ESPERA
  const [ventasPausadas, setVentasPausadas] = useState([]);
  const [mostrarPausadas, setMostrarPausadas] = useState(false);
  
  const inputBusquedaRef = useRef(null);
  const inputMixtoRef = useRef(null);

  // Estados manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState(1);

  // 1. CARGA INICIAL
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resProd, resCig] = await Promise.all([
            fetch("http://localhost:3001/productos"),
            fetch("http://localhost:3001/cigarrillos")
        ]);
        const dataProd = await resProd.json();
        const dataCig = await resCig.json();
        
        setProductos(dataProd.map(p => ({ ...p, tipo: "general" })));
        setCigarrillos(dataCig.map(c => ({ ...c, tipo: "cigarrillo" })));
      } catch (error) { console.error("Error datos:", error); }
    };
    cargarDatos();

    // Cargar ventas pausadas guardadas en localStorage (por si cierra la pestaña)
    const guardadas = JSON.parse(localStorage.getItem("ventasPausadas") || "[]");
    setVentasPausadas(guardadas);
  }, []);

  // 2. LISTENERS DE TECLADO (ATAJOS)
  useEffect(() => {
    const handleGlobalKeys = (e) => {
        if (e.key === "F5") {
            e.preventDefault();
            confirmarVenta();
        }
        if (e.key === "F4") {
            e.preventDefault();
            pausarVenta();
        }
        if (e.key === "Escape") {
            setMostrarPausadas(false);
            setBusqueda("");
            inputBusquedaRef.current?.focus();
        }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [carrito, metodoPago, montoEfectivoMixto]); // Dependencias para que las funciones lean el estado actual

  // Actualizar localStorage cuando cambian las pausadas
  useEffect(() => {
    localStorage.setItem("ventasPausadas", JSON.stringify(ventasPausadas));
  }, [ventasPausadas]);

  // Enfocar buscador al inicio
  useEffect(() => { if (inputBusquedaRef.current) inputBusquedaRef.current.focus(); }, []);
  // Enfocar mixto
  useEffect(() => { if (metodoPago === "Mixto" && inputMixtoRef.current) inputMixtoRef.current.focus(); }, [metodoPago]);

  // --- LÓGICA DE PRECIOS ---
  const obtenerPrecio = (item) => {
    if (item.tipo !== "cigarrillo") return item.precio;
    if (metodoPago === "Débito" || metodoPago === "QR") return item.precio_qr || item.precio;
    return item.precio;
  };

  const calcularTotal = (items = carrito) => items.reduce((total, item) => total + obtenerPrecio(item) * item.cantidad, 0);

  // --- FUNCIONES DEL CARRITO ---
  const agregarAlCarrito = (item) => {
    if (item.stock <= 0 && !item.es_manual) return alert("⚠️ No hay stock suficiente");
    const existe = carrito.find((i) => i.id === item.id && i.tipo === item.tipo);
    if (existe) {
      setCarrito(carrito.map((i) => i.id === item.id && i.tipo === item.tipo ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCarrito([...carrito, { ...item, cantidad: 1 }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        const productoEscaneado = productos.find(p => p.codigo_barras === busqueda);
        if (productoEscaneado) {
            agregarAlCarrito(productoEscaneado);
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

  // --- NUEVAS FUNCIONES: PAUSAR Y RECUPERAR ---
  const pausarVenta = () => {
    if (carrito.length === 0) return;
    const nuevaPausada = {
        id: Date.now(),
        hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        items: carrito,
        total: calcularTotal(carrito) // Guardamos el total calculado al momento
    };
    setVentasPausadas([nuevaPausada, ...ventasPausadas]);
    setCarrito([]);
    setMetodoPago("Efectivo");
    setBusqueda("");
    alert("⏸️ Venta puesta en espera (F4)");
    inputBusquedaRef.current?.focus();
  };

  const recuperarVenta = (venta) => {
    if (carrito.length > 0) {
        if (!confirm("⚠️ Tienes una venta actual en curso. ¿Deseas reemplazarla por la pausada? (Se perderá la actual)")) return;
    }
    setCarrito(venta.items);
    setVentasPausadas(ventasPausadas.filter(v => v.id !== venta.id));
    setMostrarPausadas(false);
  };

  const descartarPausada = (id) => {
    if(confirm("¿Borrar esta venta guardada?")) {
        setVentasPausadas(ventasPausadas.filter(v => v.id !== id));
    }
  };

  // --- CONFIRMAR VENTA ---
  const confirmarVenta = () => {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const totalVenta = calcularTotal();
    let pagoEfectivo = 0, pagoDigital = 0;

    if (metodoPago === "Efectivo") pagoEfectivo = totalVenta;
    else if (metodoPago === "Mixto") {
        const efectivoIngresado = parseFloat(montoEfectivoMixto) || 0;
        if (efectivoIngresado >= totalVenta) return alert("Si el efectivo cubre todo, usa modo 'Efectivo'");
        pagoEfectivo = efectivoIngresado;
        pagoDigital = totalVenta - efectivoIngresado;
    } else pagoDigital = totalVenta;

    const productosFinales = carrito.map(item => ({ ...item, precio: obtenerPrecio(item) }));

    fetch("http://localhost:3001/ventas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos: productosFinales, metodo_pago: metodoPago, desglose: { efectivo: pagoEfectivo, digital: pagoDigital, total: totalVenta } }),
    })
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
          alert(`✅ Venta registrada (F5).\nEfectivo: $${pagoEfectivo}\nDigital: $${pagoDigital}`);
          window.location.reload(); 
        } else alert("❌ Error al registrar");
    });
  };

  const productosFiltrados = productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const cigarrillosFiltrados = cigarrillos.filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalCalculado = calcularTotal();
  const restanteDigital = metodoPago === "Mixto" ? Math.max(0, totalCalculado - (parseFloat(montoEfectivoMixto) || 0)) : 0;

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 relative">
      
      {/* --- COLUMNA IZQUIERDA --- */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex-shrink-0">
            {/* Buscador y Botón de recuperar */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input
                        ref={inputBusquedaRef}
                        type="text"
                        placeholder="Buscar o Escanear..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                </div>
                {/* Botón para ver pausadas */}
                {ventasPausadas.length > 0 && (
                    <button 
                        onClick={() => setMostrarPausadas(true)}
                        className="bg-orange-100 text-orange-600 px-4 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-200 border border-orange-200 animate-pulse"
                    >
                        <Clock size={20}/>
                        <span>{ventasPausadas.length} Pendientes</span>
                    </button>
                )}
            </div>

            <form onSubmit={agregarProductoManual} className="bg-blue-50 p-2 rounded-xl border border-blue-100 flex gap-2 items-center">
                <input type="number" min="1" placeholder="Cant." className="w-16 p-2 rounded-lg border border-slate-300 text-center font-bold" value={manualCantidad} onChange={(e) => setManualCantidad(e.target.value)} />
                <input id="inputManualNombre" type="text" placeholder="Producto Manual..." className="flex-1 p-2 rounded-lg border border-slate-300" value={manualNombre} onChange={(e) => setManualNombre(e.target.value)} />
                <input type="number" placeholder="$ Precio" className="w-24 p-2 rounded-lg border border-slate-300 font-bold" value={manualPrecio} onChange={(e) => setManualPrecio(e.target.value)} />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-md"><Plus size={20} /></button>
            </form>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
            {(cigarrillosFiltrados.length > 0) && (
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 px-1"><Cigarette className="text-yellow-600"/> Cigarrillos</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {cigarrillosFiltrados.map((cig) => (
                            <div key={cig.id} onClick={() => agregarAlCarrito(cig)} className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${cig.stock <= 0 ? "bg-slate-100 opacity-60 grayscale border-slate-200" : "bg-white border-yellow-200 hover:border-yellow-400 hover:shadow-md"}`}>
                                <p className="font-bold text-slate-800 truncate">{cig.nombre}</p>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs text-slate-400">Stock: {cig.stock}</p>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">${cig.precio}</p>
                                        {cig.precio_qr && cig.precio_qr !== cig.precio && <p className="text-[10px] text-purple-600 font-bold">QR: ${cig.precio_qr}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 px-1"><Package className="text-blue-600"/> Productos Generales</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                    {productosFiltrados.length === 0 ? <p className="col-span-3 text-center text-slate-400 py-4">No se encontraron productos.</p> : 
                        productosFiltrados.slice(0, 100).map((prod) => (
                            <div key={prod.id} onClick={() => agregarAlCarrito(prod)} className={`p-3 rounded-xl border cursor-pointer transition-all ${prod.stock <= 0 ? "bg-red-50 border-red-100 opacity-70" : "bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm"}`}>
                                <p className="font-bold text-slate-700 text-sm truncate">{prod.nombre}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <p className={`text-xs ${prod.stock<=5 ? 'text-red-500 font-bold':'text-slate-400'}`}>Stock: {prod.stock}</p>
                                    <p className="font-bold text-blue-600 text-lg">$ {prod.precio}</p>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: CARRITO --- */}
      <div className="w-full md:w-1/3 bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col h-full relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-4 z-10">
            <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart /> Venta Actual</h2>
            {/* BOTÓN PAUSAR VENTA */}
            <button 
                onClick={pausarVenta}
                title="Pausar venta actual (F4)"
                className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors text-orange-400"
            >
                <PauseCircle size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 relative z-10 mb-2 pr-1">
            {carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 text-center">
                    <p>Carrito vacío</p>
                    <p className="text-xs mt-2">Usa F4 para pausar / F5 para cobrar</p>
                </div>
            ) : (
                carrito.map((item, index) => {
                    const precioActual = obtenerPrecio(item);
                    return (
                        <div key={index} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
                            <div className="overflow-hidden">
                                <p className="font-medium text-slate-200 truncate pr-2">{item.nombre}</p>
                                <p className="text-xs text-slate-400">{item.cantidad} x ${precioActual} {item.tipo === "cigarrillo" && <span className="ml-2 text-yellow-500 text-[10px] border border-yellow-500/30 px-1 rounded">CIG</span>}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <p className="font-bold text-base">$ {precioActual * item.cantidad}</p>
                                <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        <div className="border-t border-slate-700 pt-4 relative z-10 bg-slate-900">
            <div className="flex justify-between items-end mb-4">
                <span className="text-slate-400 text-sm">Total a Cobrar</span>
                <span className="text-3xl font-bold text-white">$ {totalCalculado.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
                {["Efectivo", "Transferencia", "Débito", "QR", "Mixto"].map((metodo) => (
                    <button
                        key={metodo}
                        onClick={() => setMetodoPago(metodo)}
                        className={`py-2 px-1 rounded-lg text-[10px] md:text-xs font-bold uppercase transition-all border flex flex-col md:flex-row justify-center items-center gap-1 ${
                            metodoPago === metodo 
                            ? "bg-blue-600 text-white border-blue-500 shadow-lg scale-105" 
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        } ${metodo === "Mixto" ? "col-span-1 border-yellow-600/50 text-yellow-500" : ""}`}
                    >
                        {metodo === "Efectivo" && <Banknote size={14} />}
                        {metodo === "QR" && <QrCode size={14} />}
                        {metodo === "Mixto" && <Calculator size={14} />}
                        {metodo}
                    </button>
                ))}
            </div>

            {metodoPago === "Mixto" && (
                <div className="bg-slate-800 p-3 rounded-xl border border-yellow-600/30 mb-3 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-xs text-yellow-500 mb-2 font-bold flex justify-between">
                        <span>PAGO COMBINADO</span>
                        <span>Faltan: ${restanteDigital.toLocaleString()}</span>
                    </p>
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-2 text-slate-400">$</span>
                            <input 
                                ref={inputMixtoRef}
                                type="number" 
                                placeholder="Efectivo" 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-6 pr-2 text-white outline-none focus:border-yellow-500"
                                value={montoEfectivoMixto}
                                onChange={(e) => setMontoEfectivoMixto(e.target.value)}
                            />
                        </div>
                        <div className="text-xs text-slate-400 text-right leading-tight">
                            <p>Efectivo: <span className="text-white font-bold">${montoEfectivoMixto || 0}</span></p>
                            <p>Digital: <span className="text-blue-400 font-bold">${restanteDigital.toLocaleString()}</span></p>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={confirmarVenta}
                title="Cobrar (F5)"
                className={`w-full py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all ${
                    metodoPago === "Mixto" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"
                }`}
            >
                {metodoPago === "Mixto" ? "COBRAR MIXTO" : "COBRAR (F5)"}
            </button>
        </div>
      </div>

      {/* --- MODAL DE VENTAS PAUSADAS --- */}
      {mostrarPausadas && (
        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-orange-500 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Clock/> Tickets en Espera</h3>
                    <button onClick={() => setMostrarPausadas(false)} className="hover:bg-orange-600 p-1 rounded"><X/></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-3">
                    {ventasPausadas.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No hay ventas pausadas.</p>
                    ) : (
                        ventasPausadas.map((v) => (
                            <div key={v.id} className="border border-slate-200 rounded-xl p-3 flex justify-between items-center hover:bg-orange-50 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-700">Hora: {v.hora}</p>
                                    <p className="text-xs text-slate-500">{v.items.length} productos - <span className="font-bold text-green-600">${v.total}</span></p>
                                    <p className="text-[10px] text-slate-400 mt-1">{v.items.map(i => i.nombre).join(", ").slice(0, 30)}...</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => descartarPausada(v.id)} className="p-2 text-red-400 hover:bg-red-100 rounded-lg"><Trash2 size={18}/></button>
                                    <button 
                                        onClick={() => recuperarVenta(v)}
                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 shadow-sm"
                                    >
                                        <PlayCircle size={18}/> Retomar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default Ventas;