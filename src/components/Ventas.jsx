import React, { useState, useEffect, useRef } from "react";
import { Search, Trash2, ShoppingCart, Plus, ScanBarcode, QrCode, Cigarette, Package } from "lucide-react";

function Ventas() {
  // --- ESTADOS SEPARADOS PARA MEJOR ORGANIZACIÓN ---
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  
  const inputBusquedaRef = useRef(null);

  // Estados para venta manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState(1);

  // CARGA DE DATOS (SEPARADA)
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resProd = await fetch("http://localhost:3001/productos");
        const dataProd = await resProd.json();
        // Agregamos tipo 'general'
        setProductos(dataProd.map(p => ({ ...p, tipo: "general" })));

        const resCig = await fetch("http://localhost:3001/cigarrillos");
        const dataCig = await resCig.json();
        // Agregamos tipo 'cigarrillo'
        setCigarrillos(dataCig.map(c => ({ ...c, tipo: "cigarrillo" })));
      } catch (error) {
        console.error("Error cargando productos:", error);
      }
    };
    cargarDatos();
  }, []);

  // Foco en buscador al iniciar
  useEffect(() => {
    if (inputBusquedaRef.current) inputBusquedaRef.current.focus();
  }, []);

  // --- LÓGICA DE PRECIOS DINÁMICOS ---
  const obtenerPrecio = (item) => {
    // Si NO es cigarrillo, el precio es el base
    if (item.tipo !== "cigarrillo") return item.precio;

    // Si es cigarrillo, depende del pago seleccionado ABAJO
    if (metodoPago === "Débito" || metodoPago === "QR") {
        return item.precio_qr || item.precio; // Precio con recargo
    } else {
        return item.precio; // Precio normal
    }
  };

  const agregarAlCarrito = (item) => {
    if (item.stock <= 0 && !item.es_manual) {
      return alert("⚠️ No hay stock suficiente");
    }

    const existe = carrito.find((i) => i.id === item.id && i.tipo === item.tipo);
    
    if (existe) {
      setCarrito(
        carrito.map((i) =>
          i.id === item.id && i.tipo === item.tipo ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      );
    } else {
      setCarrito([...carrito, { ...item, cantidad: 1 }]);
    }
  };

  // --- NUEVA FUNCIÓN: DETECTAR ESCANEO ---
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        // Buscamos coincidencia EXACTA por código de barras en productos generales
        // (Asumimos que cigarrillos no llevan código de barras o se cargan manual, si lo tienen, agregar aquí la búsqueda también)
        const productoEscaneado = productos.find(p => p.codigo_barras === busqueda);
        
        if (productoEscaneado) {
            agregarAlCarrito(productoEscaneado);
            setBusqueda(""); // Limpiamos el buscador para el siguiente producto
            e.preventDefault(); // Evitamos comportamiento por defecto
        }
    }
  };

  const agregarProductoManual = (e) => {
    e.preventDefault();
    if (!manualNombre || !manualPrecio) return;

    const productoManual = {
      id: `manual-${Date.now()}`, 
      nombre: manualNombre,
      precio: parseFloat(manualPrecio),
      precio_qr: parseFloat(manualPrecio),
      cantidad: parseInt(manualCantidad) || 1, 
      categoria: "Varios",
      es_manual: true, 
      tipo: "general",
      stock: 9999
    };

    setCarrito([...carrito, productoManual]);
    setManualNombre("");
    setManualPrecio("");
    setManualCantidad(1);
    document.getElementById("inputManualNombre").focus();
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + obtenerPrecio(item) * item.cantidad, 0);
  };

  const confirmarVenta = () => {
    if (carrito.length === 0) return alert("El carrito está vacío");

    // Preparamos los productos con el precio FINAL aplicado
    const productosFinales = carrito.map(item => ({
        ...item,
        precio: obtenerPrecio(item) // "Quemamos" el precio final según el pago
    }));

    fetch("http://localhost:3001/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos: productosFinales, metodo_pago: metodoPago }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("✅ Venta registrada correctamente");
          window.location.reload(); 
        } else {
          alert("❌ Error al registrar venta");
        }
      });
  };

  // --- FILTRADO SEPARADO ---
  // Filtramos ambas listas según la búsqueda
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const cigarrillosFiltrados = cigarrillos.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      
      {/* --- COLUMNA IZQUIERDA: CATÁLOGO --- */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
        
        {/* 1. BUSCADOR Y MANUAL (FIJO ARRIBA) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex-shrink-0">
            <div className="relative mb-4">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input
                    ref={inputBusquedaRef}
                    type="text"
                    // MODIFICADO: Placeholder indicando escaneo
                    placeholder="Buscar producto o Escanear..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg transition-all"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={handleKeyDown} // <--- ESCUCHAMOS EL ENTER DEL ESCÁNER
                    autoFocus
                />
            </div>

            {/* Barra Manual Compacta */}
            <form onSubmit={agregarProductoManual} className="bg-blue-50 p-2 rounded-xl border border-blue-100 flex gap-2 items-center">
                <input type="number" min="1" placeholder="Cant." className="w-16 p-2 rounded-lg border border-slate-300 text-center font-bold" value={manualCantidad} onChange={(e) => setManualCantidad(e.target.value)} />
                <input id="inputManualNombre" type="text" placeholder="Producto Manual..." className="flex-1 p-2 rounded-lg border border-slate-300" value={manualNombre} onChange={(e) => setManualNombre(e.target.value)} />
                <input type="number" placeholder="$ Precio" className="w-24 p-2 rounded-lg border border-slate-300 font-bold" value={manualPrecio} onChange={(e) => setManualPrecio(e.target.value)} />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-md"><Plus size={20} /></button>
            </form>
        </div>

        {/* 2. ÁREA DE LISTAS (CON SCROLL) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
            
            {/* SECCIÓN CIGARRILLOS (Siempre visible primero) */}
            {(cigarrillosFiltrados.length > 0) && (
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 px-1">
                        <Cigarette className="text-yellow-600"/> Cigarrillos
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {cigarrillosFiltrados.map((cig) => (
                            <div
                                key={cig.id}
                                onClick={() => agregarAlCarrito(cig)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${
                                    cig.stock <= 0 ? "bg-slate-100 opacity-60 grayscale border-slate-200" : "bg-white border-yellow-200 hover:border-yellow-400 hover:shadow-md"
                                }`}
                            >
                                <p className="font-bold text-slate-800 truncate">{cig.nombre}</p>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs text-slate-400">Stock: {cig.stock}</p>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">${cig.precio}</p>
                                        {cig.precio_qr && cig.precio_qr !== cig.precio && (
                                            <p className="text-[10px] text-purple-600 font-bold">QR: ${cig.precio_qr}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECCIÓN PRODUCTOS GENERALES */}
            <div>
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 px-1">
                    <Package className="text-blue-600"/> Productos Generales
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                    {productosFiltrados.length === 0 ? (
                        <p className="col-span-3 text-center text-slate-400 py-4">No se encontraron productos.</p>
                    ) : (
                        productosFiltrados.slice(0, 100).map((prod) => (
                            <div
                                key={prod.id}
                                onClick={() => agregarAlCarrito(prod)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                    prod.stock <= 0 ? "bg-red-50 border-red-100 opacity-70" : "bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm"
                                }`}
                            >
                                <p className="font-bold text-slate-700 text-sm truncate">{prod.nombre}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <p className={`text-xs ${prod.stock<=5 ? 'text-red-500 font-bold':'text-slate-400'}`}>Stock: {prod.stock}</p>
                                    <p className="font-bold text-blue-600 text-lg">$ {prod.precio}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>

      {/* --- COLUMNA DERECHA: CARRITO --- */}
      <div className="w-full md:w-1/3 bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col h-full relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 z-10">
            <ShoppingCart /> Venta Actual
        </h2>

        {/* Lista del Carrito */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 relative z-10 mb-2 pr-1">
            {carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                    <p>Carrito vacío</p>
                </div>
            ) : (
                carrito.map((item, index) => {
                    const precioActual = obtenerPrecio(item);
                    return (
                        <div key={index} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
                            <div className="overflow-hidden">
                                <p className="font-medium text-slate-200 truncate pr-2">{item.nombre}</p>
                                <p className="text-xs text-slate-400">
                                    {item.cantidad} x ${precioActual} 
                                    {item.tipo === "cigarrillo" && <span className="ml-2 text-yellow-500 text-[10px] border border-yellow-500/30 px-1 rounded">CIG</span>}
                                </p>
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

        {/* Totales y Pagos */}
        <div className="border-t border-slate-700 pt-4 relative z-10 bg-slate-900">
            <div className="flex justify-between items-end mb-4">
                <span className="text-slate-400 text-sm">Total a Cobrar</span>
                <span className="text-3xl font-bold text-white">$ {calcularTotal().toLocaleString()}</span>
            </div>

            {/* BOTONES DE PAGO INTEGRADOS */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {["Efectivo", "Transferencia", "Débito", "QR"].map((metodo) => (
                    <button
                        key={metodo}
                        onClick={() => setMetodoPago(metodo)}
                        className={`py-2 rounded-lg text-xs font-bold uppercase transition-all border flex justify-center items-center gap-1 ${
                            metodoPago === metodo 
                            ? "bg-blue-600 text-white border-blue-500 shadow-lg" 
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        }`}
                    >
                        {metodo === "QR" && <QrCode size={14} />}
                        {metodo}
                    </button>
                ))}
            </div>

            <button
                onClick={confirmarVenta}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all"
            >
                COBRAR
            </button>
        </div>
      </div>
    </div>
  );
}

export default Ventas;