import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "../lib/api";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario_kiosco");
    const tokenGuardado = localStorage.getItem("token_kiosco");
    const rolGuardado = localStorage.getItem("rol_kiosco");
    // Solo restaurar sesión si hay TANTO usuario como token JWT
    if (usuarioGuardado && tokenGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {
        setUsuario(usuarioGuardado);
      }
      setRol(rolGuardado || "admin");
    } else {
      // Limpiar datos parciales (sesión vieja sin token)
      localStorage.removeItem("usuario_kiosco");
      localStorage.removeItem("token_kiosco");
      localStorage.removeItem("rol_kiosco");
    }
    setCargando(false);
  }, []);

  const login = async (nombreUsuario, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: nombreUsuario, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const userData = data.user?.nombre || nombreUsuario;
        const userRol = data.user?.rol || "admin";
        setUsuario(userData);
        setRol(userRol);
        localStorage.setItem("usuario_kiosco", JSON.stringify(userData));
        localStorage.setItem("rol_kiosco", userRol);
        // Almacenar token JWT
        if (data.token) {
          localStorage.setItem("token_kiosco", data.token);
        }
        return { success: true };
      } else {
        return { success: false, message: data.error || "Credenciales incorrectas" };
      }
    } catch (error) {
      console.error("Error de conexión al servidor:", error);
      return { success: false, message: "No se pudo conectar al servidor. Verifique que esté en ejecución." };
    }
  };

  const logout = () => {
    setUsuario(null);
    setRol(null);
    localStorage.removeItem("usuario_kiosco");
    localStorage.removeItem("token_kiosco");
    localStorage.removeItem("rol_kiosco");
  };

  const value = {
    usuario,
    rol,
    login,
    logout,
    cargando
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};