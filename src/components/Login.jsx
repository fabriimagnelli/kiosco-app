import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Lock, ArrowRight } from "lucide-react";

function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth(); // Usamos la función del contexto

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        login(data.usuario); // ¡Éxito! Guardamos sesión
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl animate-fade-in mx-4">
        
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">MI KIOSCO</h1>
            <p className="text-slate-500 text-sm mt-1">Inicia sesión para gestionar tu negocio</p>
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
            Sistema de Gestión v1.0
        </p>
      </div>
    </div>
  );
}

export default Login;