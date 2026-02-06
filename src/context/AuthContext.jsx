import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario_kiosco");
    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {
        setUsuario(usuarioGuardado);
      }
    }
    setCargando(false);
  }, []);

  const login = async (nombreUsuario, password) => {
    try {
      const res = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: nombreUsuario, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const userData = data.user?.nombre || nombreUsuario;
        setUsuario(userData);
        localStorage.setItem("usuario_kiosco", JSON.stringify(userData));
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
    localStorage.removeItem("usuario_kiosco");
  };

  const value = {
    usuario,
    login,
    logout,
    cargando
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};