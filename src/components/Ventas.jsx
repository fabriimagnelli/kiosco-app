import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, User, AlertTriangle, RefreshCw, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

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

  useEffect(() => {
    cargarDatos();
    
    // VERIFICAR SI VENIMOS A EDITAR UNA VENTA
    if (location.state && location.state.ticketEditar) {
        const ticketId = location.state.ticketEditar;
        setTicketEditando(ticketId);
        cargarVentaParaEditar(ticketId);
    }
  }, [location.state]);

  const cargarDatos = () => {
    fetch("http://localhost:3001/api/productos").then(r => r.json()).then(p => {
        fetch("http://localhost:3001/api/cigarrillos").then(r2 => r2.json()).then(c => {
             // Normalizamos datos para búsqueda unificada
             const prods = p.map(x => ({...x, tipo: 'Producto'}));
             const cigs = c.map(x => ({...x, tipo: 'Cigarrillo'}));
             setProductos([...prods, ...cigs]);
        });
    });
    fetch("http://localhost:3001/api/clientes").then(r => r.json()).then(setClientes);
  };

  const cargarVentaParaEditar = (ticketId) => {
    fetch(`http://localhost:3001/api/ventas/${ticketId}`)
        .then(res => res.json())
        .then(items => {
            if(items.length > 0) {
                // Recuperar método de pago del primer item (asumimos es igual para todos)
                setMetodo(items[0].metodo_pago);
                
                // Reconstruir carrito
                const nuevoCarrito = items.map(item => ({
                    id: item.original_id, // ID original para descontar stock correctamente
                    nombre: item.producto,
                    precio: item.precio_total / item.cantidad, // Recalcular precio unitario
                    cantidad: item.cantidad,
                    tipo: item.categoria === 'cigarrillo' ? 'Cigarrillo' : 'Producto',
                    stock: item.stock_actual // Stock actual en DB
                }));
                setCarrito(nuevoCarrito);
            }
        });
  };

  const agregarAlCarrito = (prod) => {
    const existe = carrito.find(item => item.nombre === prod.nombre);
    if (existe) {
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

  const confirmarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");

    let body = {
      productos: carrito,
      metodo_pago: metodo,
      cliente_id: clienteSelec || null,
      pago_anticipado: pagoAnticipado || 0,
      metodo_anticipo: metodoAnticipo,
      ticket_a_corregir: ticketEditando // ENVIAMOS EL ID PARA REEMPLAZAR
    };

    if (ticketEditando) {
        if(!confirm(`⚠️ ESTÁS EDITANDO EL TICKET #${ticketEditando}\n\nAl confirmar, se borrará la venta anterior y se creará esta nueva en su lugar.\n¿Continuar?`)) return;
    }

    const res = await fetch("http://localhost:3001/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      alert(ticketEditando ? "✅ Venta corregida exitosamente." : "✅ Venta registrada!");
      setCarrito([]);
      setTicketEditando(null); // Salir de modo edición
      setClienteSelec("");
      setPagoAnticipado("");
      
      // Limpiar el estado de navegación para no volver a cargar la edición si recarga
      navigate("/ventas", { state: {} });
    } else {
      alert("Error: " + data.error);
    }
  };

  // Filtrado
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-100 p-4 gap-4 overflow-hidden">
      
      {/* IZQUIERDA: BUSCADOR Y PRODUCTOS */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {ticketEditando && (
            <div className="bg-orange-100 border border-orange-300 text-orange-800 p-3 rounded-xl flex items-center gap-3 font-bold animate-pulse">
                <RefreshCw className="animate-spin-slow"/>
                <span>MODO EDICIÓN: Modificando Ticket #{ticketEditando}</span>
                <button onClick={() => { setTicketEditando(null); setCarrito([]); navigate("/ventas", {state:{}}); }} className="ml-auto text-xs bg-white border border-orange-300 px-3 py-1 rounded hover:bg-orange-50">
                    Cancelar Edición
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

        {/* CARGA MANUAL DE PRODUCTOS */}
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
        
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
          {productosFiltrados.slice(0, 50).map((prod, i) => (
             <button 
               key={i} 
               onClick={() => agregarAlCarrito(prod)}
               className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between text-left group"
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
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart /> Carrito {ticketEditando ? '(Editando)' : ''}</h2>
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
            
            {/* CLIENTE (FIADO) */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                    <User size={12}/> Cliente (Opcional)
                </label>
                <select 
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                    value={clienteSelec}
                    onChange={e => setClienteSelec(e.target.value)}
                >
                    <option value="">-- Cliente General --</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                
                {clienteSelec && (
                   <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-1">
                      <input 
                        type="number" 
                        placeholder="Entrega ($)" 
                        className="w-full p-2 border rounded-lg text-sm"
                        value={pagoAnticipado}
                        onChange={e => setPagoAnticipado(e.target.value)}
                      />
                      <select 
                        className="p-2 border rounded-lg text-sm bg-white"
                        value={metodoAnticipo}
                        onChange={e => setMetodoAnticipo(e.target.value)}
                      >
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                      </select>
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
                    disabled={!!clienteSelec} // Si hay cliente, el método principal se anula (es Cta Cte)
                >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Débito">Tarjeta Débito</option>
                    <option value="Crédito">Tarjeta Crédito</option>
                    <option value="Transferencia">Transferencia</option>
                </select>
            </div>

            <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500 font-bold">Total</span>
                <span className="text-3xl font-black text-slate-800">$ {total}</span>
            </div>

            <button 
                onClick={confirmarVenta}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${ticketEditando ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
                {ticketEditando ? 'CONFIRMAR CORRECCIÓN' : 'CONFIRMAR VENTA'}
            </button>
        </div>
      </div>
    </div>
  );
}

export default Ventas;