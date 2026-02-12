import React, { useState, useEffect } from "react";
import { LockOpen, DollarSign, Save, Clock, User, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

function Apertura() {
  const [monto, setMonto] = useState("");
  const [observacion, setObservacion] = useState("");
  const [estado, setEstado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [verHistorial, setVerHistorial] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    cargarEstado();
  }, []);

  const cargarEstado = async () => {
    try {
      const [resEstado, resHistorial] = await Promise.all([
        apiFetch("/api/apertura/estado").then(r => r.json()),
        apiFetch("/api/apertura/historial").then(r => r.json())
      ]);
      setEstado(resEstado);
      setHistorial(Array.isArray(resHistorial) ? resHistorial : []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const abrirCaja = async (e) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) < 0) return alert("Ingresa un monto válido");

    try {
      const res = await apiFetch("/api/apertura", {
        method: "POST",
        body: JSON.stringify({ monto: parseFloat(monto), observacion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al abrir caja");
      
      alert("Caja abierta con éxito.");
      setMonto("");
      setObservacion("");
      navigate("/ventas");
    } catch (err) {
      console.error(err);
      alert(err.message || "Hubo un error al conectar con el servidor.");
    }
  };

  if (cargando) return <div className="flex justify-center items-center h-full"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="flex justify-center items-start h-full bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-lg w-full space-y-6">
        
        {/* ESTADO ACTUAL */}
        {estado && estado.abierta && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="text-green-600" size={24} />
            <div>
              <p className="font-bold text-green-800">Caja ya abierta hoy</p>
              <p className="text-sm text-green-600">Inicio: ${estado.inicio_caja?.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* FORMULARIO DE APERTURA */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-3 shadow-sm">
              <LockOpen size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Apertura de Caja</h2>
            <p className="text-slate-500 text-sm text-center">
              {estado?.abierta 
                ? "Podés actualizar el monto de apertura si lo necesitás." 
                : "Ingresa el monto inicial para comenzar el turno."}
            </p>
          </div>

          <form onSubmit={abrirCaja} className="space-y-5">
            <div>
              <label className="block text-slate-700 font-semibold mb-2 flex items-center gap-2">
                <DollarSign size={18} className="text-green-600" /> Monto Inicial
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ej: 5000"
                className="w-full border border-slate-300 p-4 rounded-xl text-2xl font-bold text-center text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 text-sm font-semibold mb-2">Observación</label>
              <input
                type="text"
                placeholder="Ej: Billetes chicos, Turno Mañana..."
                className="w-full border border-slate-300 p-3 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              <Save size={20} />
              {estado?.abierta ? "ACTUALIZAR APERTURA" : "CONFIRMAR APERTURA"}
            </button>
          </form>
        </div>

        {/* HISTORIAL DE APERTURAS */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          <button
            onClick={() => setVerHistorial(!verHistorial)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <span className="font-bold text-slate-700 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" /> Historial de Aperturas
            </span>
            <span className="text-sm text-slate-400">{historial.length} registros</span>
          </button>

          {verHistorial && (
            <div className="border-t border-slate-100 max-h-72 overflow-y-auto">
              {historial.length === 0 ? (
                <p className="text-center text-slate-400 p-6">Sin aperturas registradas</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historial.map((a) => (
                    <div key={a.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-700">${parseFloat(a.monto).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> {new Date(a.fecha).toLocaleString("es-AR")}
                        </p>
                        {a.observacion && (
                          <p className="text-xs text-slate-500 mt-1">{a.observacion}</p>
                        )}
                      </div>
                      {a.usuario && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg flex items-center gap-1">
                          <User size={10} /> {a.usuario}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Apertura;