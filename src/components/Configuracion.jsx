import React, { useState, useEffect } from "react";
import { Settings, Save, User, Key, Building2, Phone, MapPin, LogOut, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Configuracion() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Estados de datos
  const [datos, setDatos] = useState({
    admin_user: "",
    admin_password: "",
    kiosco_nombre: "",
    kiosco_direccion: "",
    kiosco_telefono: ""
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/config");
      const data = await res.json();
      setDatos(data);
    } catch (error) {
      console.error("Error cargando config:", error);
    }
  };

  const handleChange = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Configuración guardada correctamente!");
      } else {
        alert("Error al guardar");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const manejarCierreSesion = () => {
    if (confirm("¿Estás seguro que quieres cerrar sesión?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    // AGREGADO: h-full y overflow-y-auto para permitir hacer scroll
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in duration-500 h-full overflow-y-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Settings className="text-purple-600" size={32} />
          Configuración y Administración
        </h1>
        <p className="text-slate-500 mt-1">Gestiona los datos de tu negocio y credenciales de acceso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
        
        {/* COLUMNA IZQUIERDA: FORMULARIOS */}
        <div className="space-y-6">
            
            <form onSubmit={guardarCambios} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Building2 size={20} className="text-blue-500"/> Datos del Kiosco
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Negocio</label>
                        <input 
                            name="kiosco_nombre"
                            value={datos.kiosco_nombre}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Ej: Kiosco Pepe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                name="kiosco_direccion"
                                value={datos.kiosco_direccion}
                                onChange={handleChange}
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Calle Falsa 123"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono (Opcional)</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                name="kiosco_telefono"
                                value={datos.kiosco_telefono}
                                onChange={handleChange}
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Para mostrar en tickets..."
                            />
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-slate-100"/>

                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <User size={20} className="text-green-500"/> Credenciales de Acceso
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Usuario Administrador</label>
                        <input 
                            name="admin_user"
                            value={datos.admin_user}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Contraseña</label>
                        <div className="relative">
                            <Key size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                type={mostrarPassword ? "text" : "password"}
                                name="admin_password"
                                value={datos.admin_password}
                                onChange={handleChange}
                                className="w-full pl-9 pr-10 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                            />
                            <button 
                                type="button"
                                onClick={() => setMostrarPassword(!mostrarPassword)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-600"
                            >
                                {mostrarPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-all flex justify-center items-center gap-2 shadow-lg"
                    >
                        <Save size={18}/> {loading ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </form>
        </div>

        {/* COLUMNA DERECHA: ACCIONES */}
        <div className="space-y-6">
            
            {/* TARJETA CERRAR SESIÓN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2">Sesión Actual</h3>
                <p className="text-sm text-slate-500 mb-4">Estás logueado como administrador. Cierra sesión si terminaste tu turno.</p>
                <button 
                    onClick={manejarCierreSesion}
                    className="w-full border border-slate-300 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                >
                    <LogOut size={18}/> Cerrar Sesión
                </button>
            </div>

            {/* SECCIÓN "ZONA DE PELIGRO" ELIMINADA POR SOLICITUD DEL USUARIO */}

        </div>

      </div>
    </div>
  );
}

export default Configuracion;