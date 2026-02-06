import React, { useState, useEffect, Component } from "react";
// CORRECCIÓN CLAVE: Usamos HashRouter en lugar de BrowserRouter
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";

import Inicio from "./components/Inicio";
import Ventas from "./components/Ventas";
import Productos from "./components/Productos";
import Cigarrillos from "./components/Cigarrillos"; 
import Stock from "./components/Stock";
import Clientes from "./components/Deudores";
import Proveedores from "./components/Proveedores";
import Gastos from "./components/Gastos";
import Balance from "./components/Balance";         
import Reportes from "./components/Reportes";   
import Cierre from "./components/Cierre"; 
import Promos from "./components/Promos"; 
import Retiros from "./components/Retiros"; 
import Configuracion from "./components/Configuracion";

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

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};

const RutaProtegida = ({ children }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <SplashScreen />;
  if (!usuario) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

function RutasApp() {
    const { usuario, cargando } = useAuth();
    const [splashMinimo, setSplashMinimo] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setSplashMinimo(false), 500);
        return () => clearTimeout(timer);
    }, []);

    if (cargando || splashMinimo) return <SplashScreen />;

    return (
        <Routes>
            <Route path="/login" element={!usuario ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={<RutaProtegida><Inicio /></RutaProtegida>} />
            <Route path="/ventas" element={<RutaProtegida><Ventas /></RutaProtegida>} />
            <Route path="/cierre" element={<RutaProtegida><Cierre /></RutaProtegida>} />
            <Route path="/productos" element={<RutaProtegida><Productos /></RutaProtegida>} />
            <Route path="/cigarrillos" element={<RutaProtegida><Cigarrillos /></RutaProtegida>} />
            <Route path="/stock" element={<RutaProtegida><Stock /></RutaProtegida>} />
            <Route path="/promos" element={<RutaProtegida><Promos /></RutaProtegida>} />
            <Route path="/clientes" element={<RutaProtegida><Clientes /></RutaProtegida>} />
            <Route path="/proveedores" element={<RutaProtegida><Proveedores /></RutaProtegida>} />
            <Route path="/gastos" element={<RutaProtegida><Gastos /></RutaProtegida>} />
            <Route path="/balance" element={<RutaProtegida><Balance /></RutaProtegida>} />
            <Route path="/reportes" element={<RutaProtegida><Reportes /></RutaProtegida>} />
            <Route path="/retiros" element={<RutaProtegida><Retiros /></RutaProtegida>} />
            <Route path="/configuracion" element={<RutaProtegida><Configuracion /></RutaProtegida>} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

// Error Boundary para evitar pantallas en blanco por errores inesperados
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white p-8">
          <h1 className="text-2xl font-bold mb-4">Ocurrió un error inesperado</h1>
          <p className="text-slate-400 mb-6 text-center max-w-md">{this.state.error?.message || "Error desconocido"}</p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.hash = "#/login"; window.location.reload(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
            Reiniciar Aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <RutasApp />
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;