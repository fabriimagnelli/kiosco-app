import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

// --- ESTO ES LO QUE FALTABA ---
// Este "hook" permite a los otros archivos usar las funciones de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    return sessionStorage.getItem("usuario") || null;
  });

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

      if (!response.ok) throw new Error("Error del servidor");

      const data = await response.json();

      if (data.success) {
        setUser(data.usuario);
        sessionStorage.setItem("usuario", data.usuario);
        return { success: true };
      } else {
        return { success: false, message: "Credenciales incorrectas" };
      }
    } catch (error) {
      console.error("Error login:", error);
      return { success: false, message: "No se pudo conectar con el servidor." };
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