import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, Search, Trash2, PlusCircle, 
  CreditCard, Banknote, QrCode 
} from "lucide-react";

function Ventas() {
  const [productos, setProductos] = useState([]);
  const [cigarrillos, setCigarrillos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [busqueda, setBusqueda] = useState("");

  // Cargar datos al iniciar
  useEffect(() => {
    fetch("http://localhost:3001/productos")
      .then(r => r.json())
      .then(setProductos);
    fetch("http://localhost:3001/cigarrillos")
      .then(r => r.json())
      .then(setCigarrillos);
  }, []);

  // Actualizar precios si cambia el método de pago
  useEffect(() => {
    const nuevoCarrito = carrito.map(item => {
        if (item.tipo === "cigarrillo") {
            const usaRecargo = (metodoPago === "QR" || metodoPago === "Debito");
            const precioCorrecto = usaRecargo 
                ? (item.precio_qr || item.precio_base) 
                : item.precio_base;
            return { ...item, precio: precioCorrecto };
        }
        return item;
    });
    setCarrito(nuevoCarrito);
  }, [metodoPago]);

  // --- FUNCIÓN AGREGAR CON VALIDACIÓN DE STOCK ---
  const agregarProducto = (prod, tipo) => {
    // Verificamos si ya está en el carrito
    const enCarrito = carrito.find(
        item => item.id === prod.id && item.tipo === tipo
    );
    const cantidadEnCarrito = enCarrito ? enCarrito.cantidad : 0;
    
    // VALIDACIÓN: Si no hay stock suficiente
    if (prod.stock <= 0 || (cantidadEnCarrito >= prod.stock)) {
        return alert(`⚠️ ¡No hay suficiente stock de ${prod.nombre}!`);
    }

    const usaRecargo = (metodoPago === "QR" || metodoPago === "Debito");
    const precioAUsar = (tipo === "cigarrillo" && usaRecargo) 
        ? (prod.precio_qr || prod.precio) 
        : prod.precio;

    if (enCarrito) {
        setCarrito(carrito.map(item => 
            (item.id === prod.id && item.tipo === tipo) 
            ? { ...item, cantidad: item.cantidad + 1 } 
            : item
        ));
    } else {
        const item = { 
            ...prod, 
            tipo, 
            cantidad: 1, 
            precio: precioAUsar, 
            precio_base: prod.precio, 
            precio_qr: prod.precio_qr 
        };
        setCarrito([...carrito, item]);
    }
  };

  const eliminarDelCarrito = (index) => {
    const nuevo = [...carrito];
    nuevo.splice(index, 1);
    setCarrito(nuevo);
  };

  const confirmarVenta = () => {
    if (carrito.length === 0) return;
    if (!confirm("¿Confirmar venta?")) return;

    fetch("http://localhost:3001/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos: carrito, metodo_pago: metodoPago }),
    }).then(() => {
      alert("✅ Venta registrada!");
      setCarrito([]);
      // Recargamos stock visualmente
      fetch("http://localhost:3001/productos")
        .then(r => r.json()).then(setProductos);
      fetch("http://localhost:3001/cigarrillos")
        .then(r => r.json()).then(setCigarrillos);
    });
  };

  // Cálculo del total
  const total = carrito.reduce(
      (sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0
  );
  
  const prodFiltrados = productos.filter(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const cigFiltrados = cigarrillos.filter(c => 
      c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      
      {/* IZQUIERDA: CATÁLOGO */}
      <div className="w-2/3 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
        
        {/* BARRA DE BÚSQUEDA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={busqueda} 
                    onChange={e => setBusqueda(e.target.value)} 
                />
            </div>
        </div>
        
        {/* LISTA DE PRODUCTOS */}
        <div>
            <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                <PlusCircle size={20} className="text-blue-600"/> Productos Generales
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {prodFiltrados.map(p => (
                    <button 
                        key={p.id} 
                        onClick={() => agregarProducto(p, "producto")} 
                        disabled={p.stock <= 0}
                        className={`p-4 rounded-xl border text-left transition-all group relative overflow-hidden ${
                            p.stock <= 0 
                            ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed grayscale" 
                            : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer"
                        }`}
                    >
                        <div className="font-bold text-slate-800 group-hover:text-blue-700 truncate">
                            {p.nombre}
                        </div>
                        <div className="text-green-600 font-bold mt-1 text-lg">
                            ${p.precio}
                        </div>
                        <div className={`text-xs mt-2 font-medium ${
                            p.stock <= 0 ? "text-red-500" : "text-slate-400"
                        }`}>
                            {p.stock <= 0 ? "AGOTADO" : `Stock: ${p.stock}`}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* LISTA DE CIGARRILLOS */}
        <div>
            <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                <PlusCircle size={20} className="text-yellow-600"/> Cigarrillos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {cigFiltrados.map(c => (
                    <button 
                        key={c.id} 
                        onClick={() => agregarProducto(c, "cigarrillo")} 
                        disabled={c.stock <= 0}
                        className={`p-4 rounded-xl border text-left transition-all group ${
                            c.stock <= 0 
                            ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed" 
                            : "bg-white border-yellow-200 hover:border-yellow-400 hover:shadow-md cursor-pointer"
                        }`}
                    >
                        <div className="font-bold text-slate-800 group-hover:text-yellow-700 truncate">
                            {c.nombre}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 space-y-1">
                             <div className="flex justify-between">
                                <span>Efvo:</span> <span className="font-bold text-green-600">${c.precio}</span>
                             </div>
                             <div className="flex justify-between">
                                <span>QR:</span> <span className="font-bold text-blue-600">${c.precio_qr || c.precio}</span>
                             </div>
                        </div>
                        <div className={`text-xs mt-2 font-medium ${
                            c.stock <= 0 ? "text-red-500" : "text-slate-400"
                        }`}>
                            {c.stock <= 0 ? "AGOTADO" : `Stock: ${c.stock}`}
                        </div>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* DERECHA: CARRITO */}
      <div className="w-1/3 bg-white shadow-xl flex flex-col border-l border-slate-200 z-20">
        <div className="p-6 bg-slate-900 text-white shadow-md">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart size={24}/> Tu Pedido
            </h2>
            <p className="text-slate-400 text-xs mt-1">
                {carrito.length} ítems en el carrito
            </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50">
            {carrito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                    <ShoppingCart size={48} className="mb-2"/>
                    <p>El carrito está vacío</p>
                </div>
            ) : (
                carrito.map((item, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center animate-fade-in">
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{item.nombre}</p>
                            <p className="text-xs text-slate-500">
                                {item.cantidad} x ${item.precio} 
                                <span className="ml-2 px-1 rounded bg-slate-100 border border-slate-200 text-[10px] uppercase">
                                    {item.tipo}
                                </span>
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-700">
                                ${item.precio * item.cantidad}
                            </span>
                            <button onClick={() => eliminarDelCarrito(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>

        <div className="bg-white p-6 border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">
                Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-2 mb-6">
                <button onClick={() => setMetodoPago("Efectivo")} className={`p-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === "Efectivo" ? "bg-green-50 border-green-500 text-green-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <Banknote size={16}/> Efectivo
                </button>
                <button onClick={() => setMetodoPago("Transferencia")} className={`p-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === "Transferencia" ? "bg-purple-50 border-purple-500 text-purple-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <CreditCard size={16}/> Transf.
                </button>
                <button onClick={() => setMetodoPago("QR")} className={`p-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === "QR" ? "bg-blue-50 border-blue-500 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <QrCode size={16}/> QR
                </button>
                <button onClick={() => setMetodoPago("Debito")} className={`p-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === "Debito" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <CreditCard size={16}/> Débito
                </button>
            </div>

            <div className="flex justify-between items-end mb-4">
                <span className="text-slate-500 font-medium">Total a Pagar</span>
                <span className="text-3xl font-bold text-slate-900">${total}</span>
            </div>

            <button 
                onClick={confirmarVenta} 
                disabled={carrito.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95 ${
                    carrito.length === 0 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30"
                }`}
            >
                CONFIRMAR VENTA
            </button>
        </div>
      </div>
    </div>
  );
}

export default Ventas;