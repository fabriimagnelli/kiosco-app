import React, { useState, useEffect } from "react";
import { Monitor, Plus, Trash2, Edit2, Check, X, Power, PowerOff, AlertTriangle } from "lucide-react";
import { apiFetch } from "../lib/api";

function Cajas() {
  const [cajas, setCajas] = useState([]);
  const [nuevaCaja, setNuevaCaja] = useState("");
  const [editando, setEditando] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarCajas();
  }, []);

  const cargarCajas = async () => {
    try {
      const res = await apiFetch("/api/cajas");
      const data = await res.json();
      setCajas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const crearCaja = async () => {
    if (!nuevaCaja.trim()) return;
    try {
      const res = await apiFetch("/api/cajas", {
        method: "POST",
        body: JSON.stringify({ nombre: nuevaCaja.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNuevaCaja("");
        cargarCajas();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const guardarEdicion = async (id) => {
    if (!editNombre.trim()) return;
    const caja = cajas.find(c => c.id === id);
    try {
      await apiFetch(`/api/cajas/${id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre: editNombre.trim(), activa: caja.activa }),
      });
      setEditando(null);
      cargarCajas();
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const toggleActiva = async (caja) => {
    try {
      await apiFetch(`/api/cajas/${caja.id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre: caja.nombre, activa: !caja.activa }),
      });
      cargarCajas();
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const eliminarCaja = async (id, nombre) => {
    if (id === 1) return alert("No se puede eliminar la caja principal.");
    if (!confirm(`¿Eliminar la caja "${nombre}"?\nLas ventas asociadas no se eliminan.`)) return;
    try {
      const res = await apiFetch(`/api/cajas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) cargarCajas();
      else alert("Error: " + data.error);
    } catch (e) {
      alert("Error de conexión");
    }
  };

  if (cargando) return <div className="flex justify-center items-center h-full"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
            <Monitor className="text-blue-600" size={28} />
            Gestión de Cajas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Administrá múltiples puntos de venta simultáneos.</p>
        </div>

        {/* Alerta informativa */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
          <div className="text-sm text-amber-800">
            <p className="font-bold mb-1">¿Cómo funciona?</p>
            <p>Cada caja puede tener su propia apertura y cierre de turno. La <strong>Caja Principal</strong> no se puede eliminar. Podés desactivar temporalmente cajas que no estés usando.</p>
          </div>
        </div>

        {/* Crear nueva caja */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Plus size={18} className="text-blue-600"/> Nueva Caja
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ej: Caja 2, Mostrador Sur..."
              className="flex-1 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={nuevaCaja}
              onChange={(e) => setNuevaCaja(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearCaja()}
            />
            <button
              onClick={crearCaja}
              disabled={!nuevaCaja.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Plus size={16}/> Crear
            </button>
          </div>
        </div>

        {/* Lista de cajas */}
        <div className="space-y-3">
          {cajas.map((caja) => (
            <div
              key={caja.id}
              className={`bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between transition-all ${
                caja.activa ? "border-slate-200" : "border-red-200 bg-red-50/30 opacity-70"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${caja.activa ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-400"}`}>
                  <Monitor size={24} />
                </div>
                
                {editando === caja.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      className="border-b-2 border-blue-500 p-1 font-bold text-slate-800 outline-none bg-transparent"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && guardarEdicion(caja.id)}
                    />
                    <button onClick={() => guardarEdicion(caja.id)} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200">
                      <Check size={16}/>
                    </button>
                    <button onClick={() => setEditando(null)} className="p-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200">
                      <X size={16}/>
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{caja.nombre}</p>
                    <p className="text-xs text-slate-400">
                      ID: {caja.id} · {caja.activa ? "Activa" : "Inactiva"}
                      {caja.id === 1 && " · Principal"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editando !== caja.id && (
                  <>
                    <button
                      onClick={() => { setEditando(caja.id); setEditNombre(caja.nombre); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Renombrar"
                    >
                      <Edit2 size={16}/>
                    </button>
                    
                    <button
                      onClick={() => toggleActiva(caja)}
                      className={`p-2 rounded-lg transition-colors ${
                        caja.activa 
                          ? "text-orange-500 hover:bg-orange-50" 
                          : "text-green-500 hover:bg-green-50"
                      }`}
                      title={caja.activa ? "Desactivar" : "Activar"}
                    >
                      {caja.activa ? <PowerOff size={16}/> : <Power size={16}/>}
                    </button>

                    {caja.id !== 1 && (
                      <button
                        onClick={() => eliminarCaja(caja.id, caja.nombre)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {cajas.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            No hay cajas registradas.
          </div>
        )}
      </div>
    </div>
  );
}

export default Cajas;
