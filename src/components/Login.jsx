import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Lock, ArrowRight } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

// --- COMPONENTE DE SEGURIDAD ---
// Este componente revisa si hay usuario. Si no hay, te manda al Login.
export const RutaProtegida = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// --- PANTALLA DE LOGIN ---
function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, user } = useAuth(); // Usamos la función del contexto

  // Si ya estás logueado, te manda al inicio
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Llamamos a la función login del AuthContext
    const resultado = await login(usuario, password);

    if (!resultado.success) {
      setError(resultado.message);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl animate-fade-in mx-4">
        
        <div className="text-center mb-8">
            {/* LOGO */}
            <div className="flex justify-center mb-4">
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
                        className="w-full pl-10 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
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
                        className="w-full pl-10 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all"
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

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex justify-center items-center gap-2 active:scale-95">
                Ingresar al Sistema <ArrowRight size={20} />
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