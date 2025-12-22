import React, { useState, useEffect } from "react";

function Cigarrillos() {
  const [cigarrillos, setCigarrillos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({ nombre: "", precio: "", precio_qr: "", stock: "" });
  const [idEditando, setIdEditando] = useState(null);

  const cargar = () => fetch("http://localhost:3001/cigarrillos").then(r => r.json()).then(setCigarrillos);
  useEffect(() => { cargar(); }, []);

  const guardar = (e) => {
    e.preventDefault();
    const metodo = idEditando ? "PUT" : "POST";
    const url = idEditando ? `http://localhost:3001/cigarrillos/${idEditando}` : "http://localhost:3001/cigarrillos";
    
    fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    }).then(() => { alert("Guardado"); setForm({ nombre: "", precio: "", precio_qr: "", stock: "" }); setIdEditando(null); cargar(); });
  };

  const editar = (c) => { setForm(c); setIdEditando(c.id); };
  const borrar = (id) => { if(confirm("¿Borrar?")) fetch(`http://localhost:3001/cigarrillos/${id}`, { method: "DELETE" }).then(cargar); };

  const filtrados = cigarrillos.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-6">
      <div className="w-1/3 bg-white p-6 rounded-lg shadow-md h-fit border border-yellow-200">
        <h2 className="text-xl font-bold mb-4 text-yellow-700">{idEditando ? "Editar" : "Nuevo"} Cigarrillo</h2>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <input type="text" placeholder="Marca" className="border p-2 rounded" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
          <div className="flex gap-2">
            <div className="flex-1">
                <label className="text-xs text-gray-500">Efectivo/Transf</label>
                <input type="number" placeholder="$" className="border p-2 rounded w-full font-bold text-green-700" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} required />
            </div>
            <div className="flex-1">
                <label className="text-xs text-gray-500">QR/Débito</label>
                <input type="number" placeholder="$" className="border p-2 rounded w-full font-bold text-blue-700" value={form.precio_qr} onChange={e => setForm({...form, precio_qr: e.target.value})} required />
            </div>
          </div>
          <input type="number" placeholder="Stock" className="border p-2 rounded" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
          <button className="bg-yellow-600 text-white py-2 rounded font-bold hover:bg-yellow-700">Guardar</button>
        </form>
      </div>

      <div className="w-2/3 bg-white rounded-lg shadow-md p-4 overflow-y-auto">
        <input type="text" placeholder="🔍 Buscar..." className="w-full border p-2 mb-4 rounded" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <table className="w-full text-left text-sm">
            <thead className="bg-yellow-50 text-yellow-800"><tr><th className="p-2">Marca</th><th className="p-2">Efvo</th><th className="p-2">QR/Tarj</th><th className="p-2">Stock</th><th className="p-2">Acción</th></tr></thead>
            <tbody>
                {filtrados.map(c => (
                    <tr key={c.id} className="border-b">
                        <td className="p-2 font-bold">{c.nombre}</td>
                        <td className="p-2 text-green-600 font-bold">${c.precio}</td>
                        <td className="p-2 text-blue-600 font-bold">${c.precio_qr || c.precio}</td>
                        <td className="p-2">{c.stock}</td>
                        <td className="p-2"><button onClick={() => editar(c)} className="mr-2">✏️</button><button onClick={() => borrar(c.id)}>🗑️</button></td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
export default Cigarrillos;