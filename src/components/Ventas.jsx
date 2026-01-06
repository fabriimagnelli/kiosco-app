import React, { useState, useEffect, useRef } from "react";
import { Search, Trash2, ShoppingCart, Plus, QrCode, Cigarette, Package, Banknote, Calculator, PauseCircle, PlayCircle, X, Clock } from "lucide-react";

function Ventas() {
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [datosConfirmacion, setDatosConfirmacion] = useState(null);
  const [ventasPausadas, setVentasPausadas] = useState([]);
  const [mostrarPausadas, setMostrarPausadas] = useState(false);
  
  const inputBusquedaRef = useRef(null);
  const inputMixtoRef = useRef(null);
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState(1);

  // CAMBIO: Rutas con /api
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resProd, resCig] = await Promise.all([
            fetch("http://localhost:3001/api/productos"),
            fetch("http://localhost:3001/api/cigarrillos")
        ]);
        const dataProd = await resProd.json();
        const dataCig = await resCig.json();
        setProductos(dataProd.map(p => ({ ...p, tipo: "general" })));
        setCigarrillos(dataCig.map(c => ({ ...c, tipo: "cigarrillo" })));
      } catch (error) { console.error("Error datos:", error); }
    };
    cargarDatos();
    const guardadas = JSON.parse(localStorage.getItem("ventasPausadas") || "[]");
    setVentasPausadas(guardadas);
  }, []);

  useEffect(() => {
    const handleGlobalKeys = (e) => {
        if (e.key === "F5") { e.preventDefault(); confirmarVenta(); }
        if (e.key === "F4") { e.preventDefault(); pausarVenta(); }
        if (e.key === "Escape") { setMostrarPausadas(false); setBusqueda(""); inputBusquedaRef.current?.focus(); }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [carrito, metodoPago, montoEfectivoMixto]); 

  useEffect(() => { localStorage.setItem("ventasPausadas", JSON.stringify(ventasPausadas)); }, [ventasPausadas]);
  useEffect(() => { if (inputBusquedaRef.current) inputBusquedaRef.current.focus(); }, []);
  useEffect(() => { if (metodoPago === "Mixto" && inputMixtoRef.current) inputMixtoRef.current.focus(); }, [metodoPago]);

  const obtenerPrecio = (item) => {
    if (item.tipo !== "cigarrillo") return item.precio;
    if (metodoPago === "Débito" || metodoPago === "QR") return item.precio_qr || item.precio;
    return item.precio;
  };

  const calcularTotal = (items = carrito) => items.reduce((total, item) => total + obtenerPrecio(item) * item.cantidad, 0);

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

  const pausarVenta = () => {
    if (carrito.length === 0) return;
    const nuevaPausada = {
        id: Date.now(),
        hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        items: carrito,
        total: calcularTotal(carrito)
    };
    setVentasPausadas([nuevaPausada, ...ventasPausadas]);
    setCarrito([]);
    setMetodoPago("Efectivo");
    setBusqueda("");
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

  const confirmarVenta = () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    const totalVenta = calcularTotal();
    let pagoEfectivo = 0, pagoDigital = 0;
    if (metodoPago === "Efectivo") pagoEfectivo = totalVenta;
    else if (metodoPago === "Mixto") {
        const efectivoIngresado = parseFloat(montoEfectivoMixto) || 0;
        if (efectivoIngresado >= totalVenta) return alert("Si efectivo cubre todo, usa modo Efectivo");
        pagoEfectivo = efectivoIngresado;
        pagoDigital = totalVenta - efectivoIngresado;
    } else pagoDigital = totalVenta;

    const productosFinales = carrito.map(item => ({ ...item, precio: obtenerPrecio(item) }));
    setDatosConfirmacion({ productosFinales, pagoEfectivo, pagoDigital, totalVenta, metodoPago });
    setMostrarConfirmacion(true);
  };

  const procesarVenta = async () => {
    if (!datosConfirmacion) return;
    try {
      // CAMBIO: Ruta con /api
      const res = await fetch("http://localhost:3001/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: datosConfirmacion.productosFinales,
          metodo_pago: datosConfirmacion.metodoPago,
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
        inputBusquedaRef.current?.focus();
      } else alert("Error: " + data.error);
    } catch (err) { alert("Error conexión: " + err.message); }
  };

  const productosFiltrados = productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const cigarrillosFiltrados = cigarrillos.filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalCalculado = calcularTotal();
  const restanteDigital = metodoPago === "Mixto" ? Math.max(0, totalCalculado - (parseFloat(montoEfectivoMixto) || 0)) : 0;

  return (
    <div className="flex flex-col md:flex-row h-full gap-4 relative">
      <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
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
      <div className="w-full md:w-1/3 bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col h-full relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 z-10">
            <h2 className="text-xl font-bold flex gap-2"><ShoppingCart /> Venta</h2>
            <button onClick={pausarVenta} className="bg-slate-700 p-2 rounded-lg text-orange-400"><PauseCircle size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 relative z-10 mb-2 pr-1">
            {carrito.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
                    <div><p className="font-medium text-slate-200">{item.nombre}</p><p className="text-xs text-slate-400">{item.cantidad} x ${obtenerPrecio(item)}</p></div>
                    <div className="flex gap-3"><p className="font-bold text-base">$ {obtenerPrecio(item) * item.cantidad}</p><button onClick={() => eliminarDelCarrito(item.id)} className="text-red-400"><Trash2 size={16} /></button></div>
                </div>
            ))}
        </div>
        <div className="border-t border-slate-700 pt-4 z-10 bg-slate-900">
            <div className="flex justify-between items-end mb-4"><span className="text-slate-400 text-sm">Total</span><span className="text-3xl font-bold text-white">$ {totalCalculado.toLocaleString()}</span></div>
            <div className="grid grid-cols-3 gap-2 mb-3">
                {["Efectivo", "Transferencia", "Débito", "QR", "Mixto"].map((metodo) => (
                    <button key={metodo} onClick={() => setMetodoPago(metodo)} className={`py-2 rounded-lg text-xs font-bold ${metodoPago === metodo ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>{metodo}</button>
                ))}
            </div>
            {metodoPago === "Mixto" && <input ref={inputMixtoRef} type="number" placeholder="Efectivo" className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-4 mb-3 text-white" value={montoEfectivoMixto} onChange={(e) => setMontoEfectivoMixto(e.target.value)} />}
            <button onClick={confirmarVenta} className="w-full py-3 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white">COBRAR (F5)</button>
        </div>
      </div>
      {mostrarConfirmacion && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4">Confirmar Venta</h3>
                  <p>Total: ${datosConfirmacion.totalVenta}</p>
                  <div className="flex gap-2 mt-4">
                      <button onClick={() => setMostrarConfirmacion(false)} className="flex-1 py-2 bg-slate-200 rounded">Cancelar</button>
                      <button onClick={procesarVenta} className="flex-1 py-2 bg-green-600 text-white rounded font-bold">Confirmar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default Ventas;