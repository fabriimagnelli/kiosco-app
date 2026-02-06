import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Lock, ArrowRight } from "lucide-react";
import { Navigate } from "react-router-dom";

// --- PANTALLA DE LOGIN ---
function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const { login, usuario: usuarioAuth } = useAuth();

  if (usuarioAuth) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!usuario.trim() || !password.trim()) {
      setError("Complete ambos campos");
      return;
    }
    setCargandoLogin(true);
    try {
      const resultado = await login(usuario, password);
      if (!resultado.success) {
        setError(resultado.message || "Error al iniciar sesión");
      }
    } catch (err) {
      setError("Error inesperado. Intente nuevamente.");
      console.error("Error login:", err);
    } finally {
      setCargandoLogin(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 overflow-hidden z-50">
      
      {/* Contenedor del Formulario */}
      <div className="w-[90%] max-w-md bg-white p-8 rounded-2xl shadow-2xl animate-fade-in relative">
        
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
                {/* Asegúrate de que logo.png esté en la carpeta public */}
                <img src="/logo.png" alt="SACWare Logo" className="h-20 w-auto object-contain drop-shadow-md" />
            </div>

            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">SACWare</h1>
            <p className="text-slate-500 text-sm mt-1">Bienvenido a tu Sistema de Gestión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Usuario</label>
                <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        className="w-full pl-10 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium"
                        placeholder="admin"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input 
                        type="password" 
                        className="w-full pl-10 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium"
                        placeholder="••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium border border-red-100">
                    {error}
                </div>
            )}

            <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={cargandoLogin}
            >
                {cargandoLogin ? "Ingresando..." : "Ingresar al Sistema"} {!cargandoLogin && <ArrowRight size={20} />}
            </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-8">
            SACWare v1.0
        </p>
      </div>
    </div>
  );
}

export default Login;