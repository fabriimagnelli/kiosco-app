import React, { useState, useEffect } from "react";
import { DollarSign, Calendar, Tag, Plus, Trash2, Search, Filter, TrendingDown } from "lucide-react";

function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Formulario
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("General");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [proveedorId, setProveedorId] = useState("");

  // Estados para Filtros
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  // Lista de Categorías Fijas
  const CATEGORIAS = [
    "General",
    "Proveedores",
    "Mercadería",
    "Servicios (Luz/Agua/Internet)",
    "Alquiler",
    "Sueldos",
    "Mantenimiento",
    "Impuestos",
    "Retiros Personales",
    "Otros"
  ];

  useEffect(() => {
    cargarGastos();
    cargarProveedores();
  }, []);

  const cargarGastos = () => {
    fetch("http://localhost:3001/api/gastos")
      .then((res) => res.json())
      .then((data) => {
        setGastos(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  };

  const cargarProveedores = () => {
    fetch("http://localhost:3001/api/proveedores")
      .then((res) => res.json())
      .then((data) => setProveedores(data || []))
      .catch((err) => console.error(err));
  };

  const agregarGasto = async (e) => {
    e.preventDefault();
    if (!descripcion || !monto) return alert("Completa todos los campos");
    if (categoria === "Proveedores" && !proveedorId) return alert("Selecciona un proveedor");

    try {
      // Si es pago a proveedor, registrar SOLO en movimientos_proveedores
      // El backend crea el gasto automáticamente
      if (categoria === "Proveedores" && proveedorId) {
        const res = await fetch("http://localhost:3001/api/movimientos_proveedores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proveedor_id: parseInt(proveedorId),
            monto: -parseFloat(monto), // Negativo porque es un pago
            descripcion: descripcion,
            metodo_pago: metodoPago
          })
        });
        const data = await res.json();
        if (data.success) {
          setDescripcion("");
          setMonto("");
          setCategoria("General");
          setProveedorId("");
          cargarGastos();
          alert("Pago registrado correctamente");
        } else {
          alert("Error al registrar el pago");
        }
      } else {
        // Para otros gastos, registrar normalmente en gastos
        const nuevoGasto = {
          descripcion,
          monto: parseFloat(monto),
          categoria,
          metodo_pago: metodoPago,
        };

        const res = await fetch("http://localhost:3001/api/gastos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevoGasto),
        });
        const data = await res.json();
        if (data.success) {
          setDescripcion("");
          setMonto("");
          setCategoria("General");
          cargarGastos();
          alert("Gasto registrado correctamente");
        } else {
          alert("Error al guardar");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    }
  };

  const eliminarGasto = async (id) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await fetch(`http://localhost:3001/api/gastos/${id}`, { method: "DELETE" });
      cargarGastos();
    } catch (error) {
      console.error(error);
    }
  };

  // --- LÓGICA TOTAL DEL MES ---
  const calcularTotalMes = () => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    return gastos.reduce((total, gasto) => {
      const fechaGasto = new Date(gasto.fecha);
      if (fechaGasto.getMonth() === mesActual && fechaGasto.getFullYear() === anioActual) {
        return total + (parseFloat(gasto.monto) || 0);
      }
      return total;
    }, 0);
  };

  // --- LÓGICA DE FILTRADO ---
  const gastosFiltrados = gastos.filter((gasto) => {
    let coincideFecha = true;
    if (filtroFecha) {
      const fechaGasto = new Date(gasto.fecha).toISOString().split("T")[0];
      coincideFecha = fechaGasto === filtroFecha;
    }

    let coincideCategoria = true;
    if (filtroCategoria !== "Todas") {
      coincideCategoria = gasto.categoria === filtroCategoria;
    }

    return coincideFecha && coincideCategoria;
  });

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER Y TOTAL DEL MES */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="text-red-600" size={32} /> Control de Gastos
          </h1>
          <p className="text-slate-500">Registra las salidas de dinero de tu caja.</p>
        </div>

        <div className="bg-red-50 px-6 py-4 rounded-xl border border-red-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-white rounded-full text-red-600 shadow-sm">
                <Calendar size={24}/>
            </div>
            <div>
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Total Gastos ({new Date().toLocaleString('es-AR', { month: 'long' })})</p>
                <p className="text-2xl font-black text-slate-800">$ {calcularTotalMes().toLocaleString()}</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO DE GASTOS */}
        <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-6">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-blue-500"/> Nuevo Gasto
                </h3>
                <form onSubmit={agregarGasto} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                        <input
                            type="text"
                            placeholder="Ej: Pago Proveedor Coca-Cola"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Monto</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                        <div className="relative">
                            <Tag size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <select
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value)}
                            >
                                {CATEGORIAS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {categoria === "Proveedores" && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Proveedor</label>
                            <select
                                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50 font-medium text-slate-700"
                                value={proveedorId}
                                onChange={(e) => setProveedorId(e.target.value)}
                            >
                                <option value="">-- Selecciona un proveedor --</option>
                                {proveedores.map(proveedor => (
                                    <option key={proveedor.id} value={proveedor.id}>
                                        {proveedor.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Método de Pago</label>
                        <div className="flex gap-2">
                            {["Efectivo", "Transferencia", "Retiros"].map((metodo) => (
                                <button
                                    key={metodo}
                                    type="button"
                                    onClick={() => setMetodoPago(metodo)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                                        metodoPago === metodo
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    {metodo}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95"
                    >
                        REGISTRAR GASTO
                    </button>
                </form>
            </div>
        </div>

        {/* LISTADO DE GASTOS */}
        <div className="lg:col-span-2 space-y-4">
            
            {/* BARRA DE FILTROS */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter size={18} className="text-slate-400"/>
                    <span className="text-sm font-bold text-slate-600">Filtros:</span>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <input 
                            type="date"
                            className="w-full sm:w-40 p-2 text-sm border rounded-lg outline-none focus:border-blue-500 text-slate-600"
                            value={filtroFecha}
                            onChange={(e) => setFiltroFecha(e.target.value)}
                        />
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                        <select 
                            className="w-full sm:w-40 p-2 text-sm border rounded-lg outline-none focus:border-blue-500 text-slate-600 bg-white"
                            value={filtroCategoria}
                            onChange={(e) => setFiltroCategoria(e.target.value)}
                        >
                            <option value="Todas">Todas las Cat.</option>
                            {CATEGORIAS.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {(filtroFecha || filtroCategoria !== "Todas") && (
                        <button 
                            onClick={() => { setFiltroFecha(""); setFiltroCategoria("Todas"); }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold"
                        >
                            Borrar
                        </button>
                    )}
                </div>
            </div>

            {/* TABLA DE RESULTADOS CON SCROLL */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* CORRECCIÓN SCROLL: Altura máxima y overflow-y */}
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <table className="w-full text-left border-collapse">
                        {/* CORRECCIÓN STICKY: Cabecera fija */}
                        <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Fecha</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Descripción</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Categoría</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50">Método</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Monto</th>
                                <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {gastosFiltrados.length > 0 ? (
                                gastosFiltrados.map((g) => (
                                    <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-slate-500">
                                            {new Date(g.fecha).toLocaleDateString()}
                                            <span className="block text-xs opacity-50">{new Date(g.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">{g.descripcion}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs border border-slate-200">
                                                {g.categoria}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500">{g.metodo_pago}</td>
                                        <td className="p-4 text-right font-bold text-red-600">
                                            - $ {g.monto.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => eliminarGasto(g.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400">
                                        No se encontraron gastos con estos filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default Gastos;