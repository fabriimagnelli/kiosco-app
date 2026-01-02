import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";

// --- IMPORTAMOS TODAS LAS PANTALLAS ---
import Inicio from "./components/Inicio";
import Ventas from "./components/Ventas";
import Productos from "./components/Productos";
import Cigarrillos from "./components/Cigarrillos"; 
import Stock from "./components/Stock";
import Clientes from "./components/Deudores";
import Proveedores from "./components/Proveedores";
import Gastos from "./components/Gastos";
import Apertura from "./components/Apertura";       
import Balance from "./components/Balance";         
import Reportes from "./components/Reportes";   
    
// CAMBIO IMPORTANTE: Importamos el nuevo contenedor "Cierre" en lugar de "CierreGeneral"
import Cierre from "./components/Cierre"; 

// --- PANTALLA DE CARGA ---
const SplashScreen = () => (
  <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
    <div className="relative animate-bounce-slow">
      <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <img src="/logo.png" alt="SACWare Loading" className="w-48 md:w-64 relative z-10 drop-shadow-2xl"/>
    </div>
    <div className="mt-8 flex flex-col items-center gap-2">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="text-slate-400 text-sm font-medium tracking-widest animate-pulse">CARGANDO...</p>
    </div>
  </div>
);

// Layout Principal
const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};

// Ruta Protegida
const RutaProtegida = ({ children }) => {
  const { usuario, cargando } = useAuth();
  
  if (cargando) return <SplashScreen />;
  if (!usuario) return <Navigate to="/login" />;
  
  return <Layout>{children}</Layout>;
};

// Rutas de la Aplicación
function RutasApp() {
    const { usuario, cargando } = useAuth();
    const [splashMinimo, setSplashMinimo] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setSplashMinimo(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    if (cargando || splashMinimo) return <SplashScreen />;

    return (
        <Routes>
            {/* LOGIN */}
            <Route path="/login" element={!usuario ? <Login /> : <Navigate to="/" />} />
            
            {/* RUTAS PRINCIPALES */}
            <Route path="/" element={<RutaProtegida><Inicio /></RutaProtegida>} />
            <Route path="/apertura" element={<RutaProtegida><Apertura /></RutaProtegida>} />
            <Route path="/ventas" element={<RutaProtegida><Ventas /></RutaProtegida>} />
            
            {/* CAMBIO: La ruta de cierre ahora apunta al componente contenedor Cierre */}
            <Route path="/cierre" element={<RutaProtegida><Cierre /></RutaProtegida>} />
            
            {/* GESTIÓN */}
            <Route path="/productos" element={<RutaProtegida><Productos /></RutaProtegida>} />
            <Route path="/cigarrillos" element={<RutaProtegida><Cigarrillos /></RutaProtegida>} />
            <Route path="/stock" element={<RutaProtegida><Stock /></RutaProtegida>} />
            
            {/* TERCEROS Y ADMIN */}
            <Route path="/clientes" element={<RutaProtegida><Clientes /></RutaProtegida>} />
            <Route path="/proveedores" element={<RutaProtegida><Proveedores /></RutaProtegida>} />
            <Route path="/gastos" element={<RutaProtegida><Gastos /></RutaProtegida>} />
            
            {/* REPORTES Y BALANCE */}
            <Route path="/balance" element={<RutaProtegida><Balance /></RutaProtegida>} />
            <Route path="/reportes" element={<RutaProtegida><Reportes /></RutaProtegida>} />
            
            {/* CUALQUIER RUTA DESCONOCIDA VA AL INICIO */}
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RutasApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;