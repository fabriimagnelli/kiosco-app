import React, { useState, useEffect } from "react";
import { Wallet, Plus, Trash2, DollarSign, TrendingDown, Calendar, CreditCard, ChevronDown } from "lucide-react";

function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  
  // Formulario
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaSel, setCategoriaSel] = useState("");
  const [metodo, setMetodo] = useState("Efectivo");
  
  // Categorías
  const [nuevaCat, setNuevaCat] = useState("");
  const [modoNuevaCat, setModoNuevaCat] = useState(false);

  // Filtro de Totales
  const [filtroFecha, setFiltroFecha] = useState("hoy"); // hoy, semana, mes, todos

  useEffect(() => {
    cargarGastos();
    cargarCategorias();
  }, []);

  const cargarGastos = () => {
    fetch("http://localhost:3001/api/gastos").then(res => res.json()).then(setGastos);
  };

  const cargarCategorias = () => {
    fetch("http://localhost:3001/api/categorias_gastos")
      .then(res => res.json())
      .then(data => {
        setCategorias(data);
        if (data.length > 0 && !categoriaSel) setCategoriaSel(data[0].nombre);
      });
  };

  const agregarGasto = (e) => {
    e.preventDefault();
    if (!monto || !descripcion) return alert("Completa los campos");

    // Guardamos el método en la descripción para que el backend lo pueda filtrar
    const descripcionFinal = metodo === "Efectivo" 
        ? descripcion 
        : `${descripcion} [${metodo}]`;

    fetch("http://localhost:3001/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        monto: parseFloat(monto), 
        descripcion: descripcionFinal,
        categoria: categoriaSel 
      }),
    }).then(() => {
      setMonto("");
      setDescripcion("");
      setMetodo("Efectivo");
      cargarGastos();
    });
  };

  const crearCategoria = () => {
    if (!nuevaCat) return;
    fetch("http://localhost:3001/api/categorias_gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaCat }),
    }).then(() => {
      setNuevaCat("");
      setModoNuevaCat(false);
      cargarCategorias();
    });
  };

  const eliminarCategoria = () => {
    const catActual = categorias.find(c => c.nombre === categoriaSel);
    if (!catActual) return;

    if (!confirm(`¿Seguro que quieres eliminar la categoría "${catActual.nombre}"?`)) return;

    fetch(`http://localhost:3001/api/categorias_gastos/${catActual.id}`, { method: "DELETE" })
      .then(res => {
        if(res.ok) {
            cargarCategorias(); // Recargar la lista para que desaparezca
            // Opcional: limpiar selección
            setCategoriaSel("");
        } else {
            alert("Error al eliminar");
        }
      });
  };

  const eliminarGasto = (id) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    fetch(`http://localhost:3001/api/gastos/${id}`, { method: "DELETE" })
      .then(() => cargarGastos());
  };

  // Lógica de Filtrado de Totales
  const getGastosFiltrados = () => {
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    // Inicio de semana (Lunes)
    const diaSemana = hoy.getDay() || 7; 
    const inicioSemana = new Date(inicioHoy);
    inicioSemana.setDate(inicioHoy.getDate() - diaSemana + 1);

    // Inicio de mes
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    return gastos.filter(g => {
        const fechaGasto = new Date(g.fecha);
        if (filtroFecha === "hoy") return fechaGasto >= inicioHoy;
        if (filtroFecha === "semana") return fechaGasto >= inicioSemana;
        if (filtroFecha === "mes") return fechaGasto >= inicioMes;
        return true;
    });
  };

  const gastosMostrados = getGastosFiltrados();
  const totalGastos = gastosMostrados.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);

  return (
    <div className="flex flex-col h-full gap-6 bg-slate-100 p-6">
      
      {/* SECCIÓN SUPERIOR */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Formulario de Ingreso */}
        <div className="w-full lg:w-2/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <TrendingDown className="text-red-500"/> Registrar Gasto
                </h2>
                {/* Selector de Categoría (o crear nueva) */}
                <div className="flex items-center gap-2">
                    {modoNuevaCat ? (
                        <div className="flex gap-2">
                            <input className="border p-1.5 rounded text-sm" placeholder="Nueva Categoría..." value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} />
                            <button type="button" onClick={crearCategoria} className="bg-blue-600 text-white px-2 rounded text-xs font-bold">OK</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <select className="bg-slate-50 border p-2 rounded-lg text-sm font-bold text-slate-700 outline-none" value={categoriaSel} onChange={e => setCategoriaSel(e.target.value)}>
                                {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                            </select>
                            {/* Botón Eliminar Categoría */}
                            <button 
                                type="button" 
                                onClick={eliminarCategoria} 
                                className="text-slate-400 hover:text-red-500 transition-colors"
                                title="Eliminar esta categoría"
                            >
                                <Trash2 size={16} />
                            </button>
                            <button type="button" onClick={() => setModoNuevaCat(true)} className="text-xs text-blue-600 font-bold hover:underline">+ Crear</button>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={agregarGasto} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Descripción</label>
                    <input 
                        className="w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-red-200 outline-none transition-all" 
                        placeholder="Ej: Pago Proveedor Coca-Cola" 
                        value={descripcion} 
                        onChange={e => setDescripcion(e.target.value)} 
                    />
                </div>
                
                <div className="w-full md:w-48">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Medio de Pago</label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-3 text-slate-400" size={18}/>
                        <select 
                            className="w-full pl-10 pr-3 py-3 bg-slate-50 border rounded-xl appearance-none focus:ring-2 focus:ring-red-200 outline-none cursor-pointer text-sm font-medium"
                            value={metodo}
                            onChange={e => setMetodo(e.target.value)}
                        >
                            <option value="Efectivo">Efectivo (Caja)</option>
                            <option value="Mercado Pago">Mercado Pago</option>
                            <option value="Débito">Tarjeta Débito</option>
                            <option value="Crédito">Tarjeta Crédito</option>
                            <option value="Transferencia">Transferencia</option>
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-32">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Monto</label>
                    <div className="relative">
                        <DollarSign className="absolute left-2 top-3 text-slate-400" size={16}/>
                        <input 
                            type="number" 
                            className="w-full pl-7 pr-3 py-3 bg-slate-50 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-red-200 outline-none" 
                            placeholder="0.00" 
                            value={monto} 
                            onChange={e => setMonto(e.target.value)} 
                        />
                    </div>
                </div>

                <button className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl font-bold transition-colors shadow-md flex items-center gap-2 justify-center w-full md:w-auto h-[48px]">
                    <Plus size={20}/>
                </button>
            </form>
        </div>

        {/* Tarjeta de Total con Filtro */}
        <div className="w-full lg:w-1/3 bg-slate-800 text-white p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={100} /></div>
            
            <div className="z-10 flex flex-col items-center w-full">
                <div className="flex justify-between w-full items-center mb-2">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Gastos</p>
                    <div className="relative group">
                        <button className="flex items-center gap-1 text-xs font-bold bg-slate-700 px-2 py-1 rounded hover:bg-slate-600 transition-colors">
                            {filtroFecha === "hoy" ? "Hoy" : filtroFecha === "semana" ? "Esta Semana" : filtroFecha === "mes" ? "Este Mes" : "Todos"} 
                            <ChevronDown size={12}/>
                        </button>
                        {/* Dropdown Filtro */}
                        <div className="absolute right-0 top-full mt-1 bg-white text-slate-800 rounded-lg shadow-xl overflow-hidden hidden group-hover:block w-32 border z-20">
                            <button onClick={() => setFiltroFecha("hoy")} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Hoy</button>
                            <button onClick={() => setFiltroFecha("semana")} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Esta Semana</button>
                            <button onClick={() => setFiltroFecha("mes")} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Este Mes</button>
                            <button onClick={() => setFiltroFecha("todos")} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Histórico</button>
                        </div>
                    </div>
                </div>
                
                <p className="text-5xl font-bold text-red-400 mb-2">$ {totalGastos.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Mostrando {gastosMostrados.length} registros</p>
            </div>
        </div>
      </div>

      {/* LISTA DE GASTOS */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
            <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Descripción / Método</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Categoría</th>
                        <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase">Monto</th>
                        <th className="p-4 w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    {gastos.map((g) => (
                        <tr key={g.id} className="border-b hover:bg-slate-50 transition-colors group">
                            <td className="p-4 text-slate-500 text-sm font-medium flex items-center gap-2">
                                <Calendar size={14} className="text-slate-300"/>
                                {new Date(g.fecha).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-slate-700 font-medium">{g.descripcion}</td>
                            <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">{g.categoria}</span></td>
                            <td className="p-4 text-right font-bold text-red-500 text-lg">$ {g.monto}</td>
                            <td className="p-4 text-right">
                                <button onClick={() => eliminarGasto(g.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                    {gastos.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-slate-400">No hay gastos registrados en este período.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default Gastos;