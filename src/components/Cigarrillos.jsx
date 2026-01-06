import React, { useState, useEffect } from "react";
import { ScanBarcode } from "lucide-react"; // Opcional si quieres icono

function Cigarrillos() {
  const [cigarrillos, setCigarrillos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  // CAMBIO: Inicializado codigo_barras en el estado
  const [form, setForm] = useState({ nombre: "", precio: "", precio_qr: "", stock: "", codigo_barras: "" });
  const [idEditando, setIdEditando] = useState(null);

  const cargar = () => fetch("http://localhost:3001/api/cigarrillos").then(r => r.json()).then(setCigarrillos);
  useEffect(() => { cargar(); }, []);

  const guardar = (e) => {
    e.preventDefault();
    const metodo = idEditando ? "PUT" : "POST";
    const url = idEditando ? `http://localhost:3001/api/cigarrillos/${idEditando}` : "http://localhost:3001/api/cigarrillos";
    
    fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    }).then(() => { 
        alert("Guardado"); 
        // Reset form incluyendo codigo_barras
        setForm({ nombre: "", precio: "", precio_qr: "", stock: "", codigo_barras: "" }); 
        setIdEditando(null); 
        cargar(); 
    });
  };

  const editar = (c) => { 
      // Al editar, cargamos todos los datos incluyendo codigo_barras
      setForm({
          nombre: c.nombre,
          precio: c.precio,
          precio_qr: c.precio_qr,
          stock: c.stock,
          codigo_barras: c.codigo_barras || "" 
      }); 
      setIdEditando(c.id); 
  };

  const borrar = (id) => { if(confirm("¿Borrar?")) fetch(`http://localhost:3001/api/cigarrillos/${id}`, { method: "DELETE" }).then(cargar); };

  // CAMBIO: Filtrado por nombre O código de barras
  const filtrados = cigarrillos.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (c.codigo_barras && c.codigo_barras.includes(busqueda))
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-6 p-6">
      <div className="w-full md:w-1/3 bg-white p-6 rounded-lg shadow-md h-fit border border-grey-200">
        <h2 className="text-xl font-bold mb-4 text-yellow-700">{idEditando ? "Editar" : "Nuevo"} Cigarrillo</h2>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          {/* CAMBIO: Input de Código de Barras */}
          <div>
            <label className="text-xs text-gray-500 font-bold">Código de Barras</label>
            <div className="flex items-center border rounded bg-gray-50">
                <span className="pl-2 text-gray-400">|||</span>
                <input 
                    type="text" 
                    placeholder="Escanear o escribir..." 
                    className="p-2 w-full bg-transparent outline-none" 
                    value={form.codigo_barras} 
                    onChange={e => setForm({...form, codigo_barras: e.target.value})} 
                />
            </div>
          </div>

          <div>
             <label className="text-xs text-gray-500 font-bold">Marca / Nombre</label>
             <input type="text" placeholder="Ej: Marlboro Box" className="border p-2 rounded w-full" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
                <label className="text-xs text-gray-500 font-bold">Efectivo/Transf</label>
                <input type="number" placeholder="$" className="border p-2 rounded w-full font-bold text-green-700" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} required />
            </div>
            <div className="flex-1">
                <label className="text-xs text-gray-500 font-bold">QR/Débito</label>
                <input type="number" placeholder="$" className="border p-2 rounded w-full font-bold text-blue-700" value={form.precio_qr} onChange={e => setForm({...form, precio_qr: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold">Stock Inicial</label>
            <input type="number" placeholder="Cantidad" className="border p-2 rounded w-full" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
          </div>
          <button className="bg-yellow-600 text-white py-3 rounded font-bold hover:bg-yellow-700 mt-2 shadow-sm">
            {idEditando ? "Guardar Cambios" : "Agregar Cigarrillo"}
          </button>
          {idEditando && <button type="button" onClick={() => {setIdEditando(null); setForm({ nombre: "", precio: "", precio_qr: "", stock: "", codigo_barras: "" });}} className="text-sm text-gray-500 underline text-center">Cancelar edición</button>}
        </form>
      </div>

      <div className="w-full md:w-2/3 bg-white rounded-lg shadow-md p-4 overflow-hidden flex flex-col">
        <input type="text" placeholder="Buscar por nombre o código..." className="w-full border p-3 mb-4 rounded-lg bg-slate-50" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-sm">
                <thead className="bg-yellow-50 text-yellow-800 sticky top-0">
                    <tr>
                        <th className="p-3">Marca</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Efvo</th>
                        <th className="p-3">QR/Tarj</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {filtrados.map(c => (
                        <tr key={c.id} className="border-b hover:bg-yellow-50/50">
                            <td className="p-3 font-bold text-gray-700">{c.nombre}</td>
                            <td className="p-3 text-gray-400 text-xs font-mono">{c.codigo_barras || "-"}</td>
                            <td className="p-3 text-green-600 font-bold">${c.precio}</td>
                            <td className="p-3 text-blue-600 font-bold">${c.precio_qr || c.precio}</td>
                            <td className="p-3 font-medium">{c.stock}</td>
                            <td className="p-3">
                                <button onClick={() => editar(c)} className="mr-3 hover:scale-110 transition-transform">✏️</button>
                                <button onClick={() => borrar(c.id)} className="hover:scale-110 transition-transform">🗑️</button>
                            </td>
                        </tr>
                    ))}
                    {filtrados.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">No se encontraron cigarrillos.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
export default Cigarrillos;