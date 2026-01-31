import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, X, Save, Cigarette } from "lucide-react";

function Cigarrillos() {
  const [cigarrillos, setCigarrillos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    id: null,
    nombre: "",
    precio: "",
    precio_qr: "",
    stock: "",
    codigo_barras: ""
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // CORRECCIÓN: Agregado /api
      const res = await fetch("http://localhost:3001/api/cigarrillos");
      if (res.ok) {
        const data = await res.json();
        setCigarrillos(data);
      }
    } catch (error) { console.error(error); }
  };

  const abrirModal = (cig = null) => {
    if (cig) {
      setEditando(true);
      setForm(cig);
    } else {
      setEditando(false);
      setForm({ id: null, nombre: "", precio: "", precio_qr: "", stock: "", codigo_barras: "" });
    }
    setMostrarModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const metodo = editando ? "PUT" : "POST";
    const url = editando 
        ? `http://localhost:3001/api/cigarrillos/${form.id}` // CORRECCIÓN: Agregado /api
        : "http://localhost:3001/api/cigarrillos"; // CORRECCIÓN: Agregado /api

    // Si no ponen precio QR, que sea igual al efectivo
    const datosEnviar = {
        ...form,
        precio_qr: form.precio_qr || form.precio
    };

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosEnviar)
        });
        if (res.ok) {
            cargarDatos();
            setMostrarModal(false);
        }
    } catch (error) { console.error(error); }
  };

  const eliminar = async (id) => {
    if (confirm("¿Borrar?")) {
        // CORRECCIÓN: Agregado /api
        await fetch(`http://localhost:3001/api/cigarrillos/${id}`, { method: "DELETE" });
        cargarDatos();
    }
  };

  const filtrados = cigarrillos.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.codigo_barras && c.codigo_barras.includes(busqueda))
  );

  return (
    <div className="flex flex-col h-full bg-slate-100 p-6 gap-6">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cigarette className="text-yellow-600"/> Inventario de cigarrillos
          </h1>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar marca..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-yellow-500"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
            </div>
            <button 
                onClick={() => abrirModal()}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-700 shadow-lg shadow-yellow-200"
            >
                <Plus size={20}/> Nuevo
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4">Marca / Variedad</th>
                <th className="p-4">Cód. Barras</th>
                <th className="p-4">Precio Efectivo</th>
                <th className="p-4">Precio Digital (QR)</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtrados.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No hay cigarrillos cargados.</td></tr>
              ) : (
                filtrados.map((cig) => (
                  <tr key={cig.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{cig.nombre}</td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{cig.codigo_barras || "-"}</td>
                    <td className="p-4 font-bold text-green-600">$ {cig.precio}</td>
                    <td className="p-4 font-bold text-blue-600">$ {cig.precio_qr}</td>
                    <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded font-bold text-xs ${cig.stock <= 5 ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                            {cig.stock}
                        </span>
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => abrirModal(cig)} className="p-2 hover:bg-blue-50 text-blue-600 rounded"><Edit size={16}/></button>
                            <button onClick={() => eliminar(cig.id)} className="p-2 hover:bg-red-50 text-red-600 rounded"><Trash2 size={16}/></button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">{editando ? "Editar Cigarrillo" : "Nuevo Cigarrillo"}</h3>
                    <button onClick={() => setMostrarModal(false)} className="hover:bg-slate-700 p-1 rounded"><X/></button>
                </div>
                <form onSubmit={guardar} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre / Marca</label>
                        <input type="text" required className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-yellow-500 outline-none font-bold text-slate-700"
                            value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} autoFocus/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Efectivo ($)</label>
                            <input type="number" required className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 outline-none font-bold text-green-700"
                                value={form.precio} onChange={e => setForm({...form, precio: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Digital/QR ($)</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-blue-600"
                                placeholder="Igual a Efvo"
                                value={form.precio_qr} onChange={e => setForm({...form, precio_qr: e.target.value})}/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock</label>
                            <input type="number" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-yellow-500 outline-none"
                                value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código</label>
                            <input type="text" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-purple-500 outline-none font-mono"
                                placeholder="Escanear..."
                                value={form.codigo_barras} onChange={e => setForm({...form, codigo_barras: e.target.value})}/>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-yellow-200 mt-2 flex justify-center items-center gap-2">
                        <Save size={20}/> Guardar
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

export default Cigarrillos;