import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Usamos sessionStorage: La sesión muere al cerrar la ventana
  const [user, setUser] = useState(() => {
    return sessionStorage.getItem("usuario") || null;
  });

  // --- LIMPIEZA AUTOMÁTICA ---
  // Esto borra cualquier error viejo apenas entras
  useEffect(() => {
    localStorage.removeItem("usuario"); 
  }, []);

  const login = async (usuario, password) => {
    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      if (!response.ok) {
        throw new Error("Error del servidor");
      }

      const data = await response.json();

      if (data.success) {
        setUser(data.usuario);
        sessionStorage.setItem("usuario", data.usuario); // Guardar en sesión temporal
        return { success: true };
      } else {
        return { success: false, message: "Credenciales incorrectas" };
      }
    } catch (error) {
      console.error("Error login:", error);
      return { success: false, message: "No se pudo conectar con el servidor. Revisa la terminal." };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("usuario");
    localStorage.removeItem("usuario");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};