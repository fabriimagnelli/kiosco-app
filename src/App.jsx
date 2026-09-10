import React, { useState, useEffect, Component } from "react";
// CORRECCIÓN CLAVE: Usamos HashRouter en lugar de BrowserRouter
import { HashRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LicenseProvider, useLicenseState } from "./context/LicenseContext";
import { NotificationProvider } from "./context/NotificationContext";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import BusquedaGlobal from "./components/BusquedaGlobal";
import Tutorial from "./components/Tutorial";
import { Download, X, RefreshCw, Menu, Cloud, CloudOff } from "lucide-react";

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
import Cajas from "./components/Cajas";
import Conciliacion from "./components/Conciliacion";
import Calculadora from "./components/Calculadora";
import ActivationScreen from "./components/ActivationScreen";

const SplashScreen = () => (
  <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
    <div className="relative animate-bounce-slow">
       <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
       <img src="/logo.png" alt="SACWare Loading" className="w-48 md:w-64 relative z-10 drop-shadow-2xl"/>
    </div>
    <div className="mt-8 flex flex-col items-center gap-2">
       <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
       <p className="text-slate-400 text-xs font-semibold tracking-[0.25em] uppercase animate-pulse">CARGANDO...</p>
    </div>
  </div>
);

const LicenseGate = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [checkingManual, setCheckingManual] = useState(false);
  const [activating, setActivating] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [activationMessage, setActivationMessage] = useState("");
  const [activationReason, setActivationReason] = useState("");
  const [licenciaInput, setLicenciaInput] = useState("");
  const [licenseState, setLicenseState] = useState(null);

  const normalizeLicensePayload = (response) => ({
    activa: response?.activa === true,
    diasRestantes: Number(response?.diasRestantes || 0),
    motivo: response?.motivo || "unknown",
    fechaVencimiento: response?.fechaVencimiento || null,
  });

  const verificarLicencia = async (forceSync = false) => {
    if (!window.api) {
      const blocked = { activa: false, diasRestantes: 0, motivo: "no-ipc" };
      console.log("[LICENSE_GATE] Respuesta IPC (sin bridge):", blocked);
      setLicenseState(blocked);
      return;
    }

    const response = await window.api.request("check-license", { forceSync });
    console.log("[LICENSE_GATE] Respuesta IPC check-license:", response);
    setLicenseState(normalizeLicensePayload(response));
  };

  useEffect(() => {
    // Bypass de licencia 
    setLicenseState({ activa: true, diasRestantes: 9999, motivo: "bypass", fechaVencimiento: null });
    setChecking(false);
  }, []);

  const handleRetry = async () => {
    setCheckingManual(true);
    setActivationMessage("");
    setActivationReason("");
    try {
      if (window.api?.checkLicense) {
        const data = await window.api.checkLicense({ forceSync: true });
        console.log("[LICENSE_GATE] Respuesta IPC check-license (manual):", data);
        setLicenseState(normalizeLicensePayload(data));
      } else {
        await verificarLicencia(true);
      }
    } catch (_) {
      setLicenseState({ activa: false, diasRestantes: 0, motivo: "internal-error" });
    } finally {
      setCheckingManual(false);
    }
  };

  const handleActivate = async (event) => {
    event.preventDefault();
    if (!licenciaInput.trim()) return;

    setActivating(true);
    setActivationMessage("");
    setActivationReason("");
    try {
      const data = await window.api?.activateLicense?.({ licenciaKey: licenciaInput.trim() });
      console.log("[LICENSE_GATE] Respuesta IPC activate-license:", data);
      const nextState = normalizeLicensePayload(data);
      setLicenseState(nextState);
      setActivationReason(data?.motivo || data?.reason || "");
      setActivationMessage(
        data?.activa
          ? "Licencia activada correctamente. La app se volverá a verificar en breve."
          : data?.motivo === "hardware-mismatch" || data?.reason === "hardware-mismatch"
            ? ""
            : "No se pudo activar la licencia. Verificá el código e intentá nuevamente."
      );
      if (data?.activa) {
        setLicenciaInput("");
        setTimeout(() => {
          verificarLicencia(true);
        }, 500);
        setRenewalModalOpen(false);
      }
    } catch (error) {
      setActivationMessage(error?.message || "No se pudo activar la licencia.");
      setLicenseState({ activa: false, diasRestantes: 0, motivo: "activation-error" });
    } finally {
      setActivating(false);
    }
  };

  if (checking || licenseState === null) return <SplashScreen />;

  // Fail-Closed estricto: cualquier estado distinto de activa===true bloquea la app.
  if (licenseState.activa !== true) {
    return (
      <ActivationScreen
        diasRestantes={licenseState.diasRestantes}
        motivo={licenseState.motivo}
        onRetry={handleRetry}
        loading={checkingManual}
        onActivate={handleActivate}
        activationMessage={activationMessage}
        activationReason={activationReason}
        licenciaInput={licenciaInput}
        setLicenciaInput={setLicenciaInput}
        activating={activating}
        mode="blocked"
      />
    );
  }

  const contextValue = {
    licenseState,
    refreshLicenseStatus: () => handleRetry(),
    requestRenewalFlow: () => {
      setActivationMessage("");
      setActivationReason("");
      setLicenciaInput("");
      setRenewalModalOpen(true);
    },
  };

  return (
    <LicenseProvider value={contextValue}>
      {children}
      {renewalModalOpen ? (
        <ActivationScreen
          diasRestantes={licenseState.diasRestantes}
          motivo={licenseState.motivo}
          onRetry={handleRetry}
          loading={checkingManual}
          onActivate={handleActivate}
          activationMessage={activationMessage}
          activationReason={activationReason}
          licenciaInput={licenciaInput}
          setLicenciaInput={setLicenciaInput}
          activating={activating}
          mode="renewal"
          onClose={() => setRenewalModalOpen(false)}
        />
      ) : null}
    </LicenseProvider>
  );
};

const Layout = ({ children }) => {
  const { licenseState } = useLicenseState() || {};
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // --- Estado de actualización ---
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // --- Búsqueda global ---
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  // --- Tutorial / Onboarding ---
  const [mostrarTutorial, setMostrarTutorial] = useState(() => {
    return !localStorage.getItem("sacware_tutorial_visto");
  });

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      try {
        await window.api?.processPendingBackups?.();
      } catch (_) {
        // No bloquear UI por fallos de sync diferido.
      }
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Verificar actualización pendiente al montar
  useEffect(() => {
    if (window.electronAPI) {
      // Consultar si ya hay una actualización descargada
      window.electronAPI.getUpdateStatus().then(status => {
        if (status) {
          setUpdateAvailable(status);
          // Mostrar alerta una vez por sesión
          if (!sessionStorage.getItem('updateAlertShown')) {
            sessionStorage.setItem('updateAlertShown', 'true');
            setShowUpdateModal(true);
          }
        }
      }).catch(() => {});

      // Escuchar si se descarga una nueva actualización mientras el sistema está abierto
      window.electronAPI.onUpdateReady((data) => {
        setUpdateAvailable(data);
        if (!sessionStorage.getItem('updateAlertShown')) {
          sessionStorage.setItem('updateAlertShown', 'true');
          setShowUpdateModal(true);
        }
      });
    }
  }, []);

  const instalarActualizacion = () => {
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K / Cmd+K para búsqueda global (siempre activo)
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setBusquedaAbierta(prev => !prev);
        return;
      }

      // No activar atajos F si el foco está en un input/textarea/select
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const atajos = {
        F1: "/",
        F2: "/ventas",
        F3: "/cierre",
        F4: "/productos",
        F5: "/stock",
        F6: "/reportes",
        F7: "/gastos",
        F8: "/configuracion",
        // F9: "/calculadora",
        F10: "/clientes",
      };

      if (atajos[e.key]) {
        e.preventDefault();
        navigate(atajos[e.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-[#f5f5f7] overflow-hidden font-sans text-[#1d1d1f]">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        onOpenSearch={() => setBusquedaAbierta(true)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        {/*
        <div className="absolute right-4 top-4 z-50">
          <div
            title={isOnline
              ? "Conectado - Copias de seguridad automáticas activas"
              : "Sin conexión - Se respaldará al reconectar"
            }
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md shadow-sm ${
              isOnline
                ? "border-cyan-200 bg-cyan-50/85 text-cyan-700"
                : "border-amber-200 bg-amber-50/85 text-amber-700"
            }`}
          >
            {isOnline ? <Cloud size={14} /> : <CloudOff size={14} />}
            <span className="hidden sm:inline">{isOnline ? "Nube activa" : "Sin conexión"}</span>
          </div>
        </div>
        */}

        {licenseState && licenseState.diasRestantes > 0 && licenseState.diasRestantes <= 5 ? (
          <div className="z-40 border-b border-amber-300/60 bg-gradient-to-r from-amber-100/95 via-orange-100/95 to-amber-100/95 px-4 py-2 text-center text-sm font-medium text-amber-900 shadow-sm backdrop-blur">
            Tu licencia de uso vence en <strong>{licenseState.diasRestantes}</strong> días. Por favor, contacta a SACWare para renovar tu suscripción.
          </div>
        ) : null}
        
        {/* BOTÓN HAMBURGUESA MOBILE */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            <span className="font-bold text-sm text-slate-800">SAC<span className="text-blue-500">Ware</span></span>
          </div>
        </div>
        
        {/* BANNER DE ACTUALIZACIÓN PERSISTENTE */}
        {updateAvailable && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between z-30 shadow-md animate-in slide-in-from-top-1 duration-300">
            <div className="flex items-center gap-2 text-sm">
              <Download size={16} className="animate-bounce"/>
              <span className="font-medium">
                Nueva versión <strong>v{updateAvailable.version}</strong> disponible
              </span>
            </div>
            <button 
              onClick={instalarActualizacion}
              className="bg-white text-blue-700 px-4 py-1 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14}/> Actualizar ahora
            </button>
          </div>
        )}

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>

      {/* BÚSQUEDA GLOBAL (Ctrl+K) */}
      <BusquedaGlobal isOpen={busquedaAbierta} onClose={() => setBusquedaAbierta(false)} />

      {/* TUTORIAL / ONBOARDING (primera vez) */}
      {mostrarTutorial && <Tutorial onClose={() => setMostrarTutorial(false)} />}

      {/* MODAL DE ALERTA DE ACTUALIZACIÓN (una vez por sesión) */}
      {showUpdateModal && updateAvailable && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Download size={32} className="text-white"/>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">¡Nueva Actualización Disponible!</h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-slate-600 mb-2">
                Se descargó la versión <strong className="text-blue-700">v{updateAvailable.version}</strong> de SACWare Kiosco.
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Incluye mejoras y correcciones. Te recomendamos actualizar cuando puedas.
                También podés hacerlo desde <strong>Configuración</strong>.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Más tarde
                </button>
                <button 
                  onClick={instalarActualizacion}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16}/> Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
            <Route path="/cajas" element={<RutaProtegida><Cajas /></RutaProtegida>} />
            <Route path="/conciliacion" element={<RutaProtegida><Conciliacion /></RutaProtegida>} />
            <Route path="/calculadora" element={<RutaProtegida><Calculadora /></RutaProtegida>} />
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
          <h1 className="text-2xl font-extrabold mb-4 tracking-tight">Ocurrió un error inesperado</h1>
          <p className="text-slate-400 mb-6 text-center max-w-md font-medium">{this.state.error?.message || "Error desconocido"}</p>
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
      <NotificationProvider>
        <LicenseGate>
          <ThemeProvider>
            <AuthProvider>
              <HashRouter>
                <RutasApp />
              </HashRouter>
            </AuthProvider>
          </ThemeProvider>
        </LicenseGate>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;