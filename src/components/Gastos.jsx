import React, { useState, useEffect } from "react";

function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  
  // FORMULARIO GASTO
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaSel, setCategoriaSel] = useState("");

  // FORMULARIO NUEVA CATEGORÍA
  const [nuevaCat, setNuevaCat] = useState("");
  const [modoNuevaCat, setModoNuevaCat] = useState(false);

  // 1. CARGAR DATOS
  useEffect(() => {
    cargarGastos();
    cargarCategorias();
  }, []);

  const cargarGastos = () => {
    fetch("http://localhost:3001/gastos")
      .then(res => res.json())
      .then(data => setGastos(data));
  };

  const cargarCategorias = () => {
    fetch("http://localhost:3001/categorias_gastos")
      .then(res => res.json())
      .then(data => {
        setCategorias(data);
        if (data.length > 0 && !categoriaSel) setCategoriaSel(data[0].nombre);
      });
  };

// 2. REGISTRAR GASTO (VERSIÓN HONESTA)
  const guardarGasto = (e) => {
    e.preventDefault();
    if (!monto || !descripcion) return;

    fetch("http://localhost:3001/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto, descripcion, categoria: categoriaSel }),
    })
    .then((res) => {
        if (res.ok) return res.json(); // Si sale bien, seguimos
        throw new Error("Error en el servidor"); // Si sale mal, cortamos
    })
    .then(() => {
      // Solo llegamos acá si todo salió perfecto
      alert("✅ Gasto registrado correctamente");
      setMonto("");
      setDescripcion("");
      cargarGastos();
    })
    .catch(() => {
        alert("❌ Error: No se pudo guardar. Revisa la terminal del servidor.");
    });
  };

  // 3. CREAR CATEGORÍA
  const crearCategoria = () => {
    if (!nuevaCat) return;
    fetch("http://localhost:3001/categorias_gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaCat }),
    }).then(() => {
      setNuevaCat("");
      setModoNuevaCat(false);
      cargarCategorias();
    });
  };

  // 4. BORRAR GASTO
  const borrarGasto = (id) => {
    if (confirm("¿Borrar este gasto?")) {
        fetch(`http://localhost:3001/gastos/${id}`, { method: "DELETE" })
            .then(() => cargarGastos());
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-6">
      
      {/* IZQUIERDA: FORMULARIO */}
      <div className="w-1/3 bg-red-50 p-6 rounded-lg shadow-md border border-red-100 h-fit">
        <h2 className="text-2xl font-bold mb-6 text-red-800">💸 Registrar Salida</h2>
        
        <form onSubmit={guardarGasto} className="flex flex-col gap-4">
            
            {/* MONTO */}
            <div>
                <label className="block text-sm font-bold text-gray-700">Monto ($)</label>
                <input 
                    type="number" 
                    className="w-full p-3 border border-red-200 rounded text-xl font-bold text-red-600"
                    placeholder="0.00"
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    required
                />
            </div>

            {/* DESCRIPCIÓN */}
            <div>
                <label className="block text-sm font-bold text-gray-700">Descripción</label>
                <input 
                    type="text" 
                    className="w-full p-3 border border-red-200 rounded"
                    placeholder="Ej: Pago de Luz"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    required
                />
            </div>

            {/* CATEGORÍA */}
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold text-gray-700">Categoría</label>
                    <button type="button" onClick={() => setModoNuevaCat(!modoNuevaCat)} className="text-xs text-blue-600 underline">
                        {modoNuevaCat ? "Cancelar" : "+ Nueva Categoría"}
                    </button>
                </div>
                
                {modoNuevaCat ? (
                    <div className="flex gap-2">
                        <input className="flex-1 border p-2 rounded" placeholder="Nombre categoría..." value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} />
                        <button type="button" onClick={crearCategoria} className="bg-blue-600 text-white px-3 rounded font-bold">OK</button>
                    </div>
                ) : (
                    <select 
                        className="w-full p-3 border border-red-200 rounded bg-white"
                        value={categoriaSel}
                        onChange={e => setCategoriaSel(e.target.value)}
                    >
                        {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                )}
            </div>

            <button className="bg-red-600 text-white py-3 rounded font-bold hover:bg-red-700 shadow mt-4">
                Confirmar Retiro
            </button>
        </form>
      </div>

      {/* DERECHA: LISTADO DE GASTOS */}
      <div className="w-2/3 bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
        <h3 className="bg-gray-800 text-white p-4 font-bold text-lg">Historial de Gastos (Últimos 50)</h3>
        
        <div className="overflow-y-auto flex-1">
            <table className="min-w-full text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
                    <tr>
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Descripción</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4 text-right">Monto</th>
                        <th className="p-4"></th>
                    </tr>
                </thead>
                <tbody>
                    {gastos.map(g => (
                        <tr key={g.id} className="border-b hover:bg-red-50">
                            <td className="p-4 text-gray-500 text-sm">{new Date(g.fecha).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-gray-800">{g.descripcion}</td>
                            <td className="p-4"><span className="bg-gray-200 px-2 py-1 rounded text-xs">{g.categoria}</span></td>
                            <td className="p-4 text-right text-red-600 font-bold">- ${g.monto}</td>
                            <td className="p-4 text-center">
                                <button onClick={() => borrarGasto(g.id)} className="text-red-400 hover:text-red-600 font-bold">X</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default Gastos;