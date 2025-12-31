import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  // AGREGAMOS ESTADO DE CARGA (IMPORTANTE)
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Revisar si hay sesión guardada al iniciar
    const usuarioGuardado = localStorage.getItem("usuario_kiosco");
    if (usuarioGuardado) {
      setUsuario(usuarioGuardado);
    }
    // Una vez revisado, terminamos la carga
    setCargando(false);
  }, []);

  const login = (user) => {
    setUsuario(user);
    localStorage.setItem("usuario_kiosco", user);
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem("usuario_kiosco");
  };

  const value = {
    usuario,
    login,
    logout,
    cargando // Exportamos el estado de carga
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};