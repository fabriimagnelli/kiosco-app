import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { isSoundEnabled, toggleSound } from "../lib/sounds";
import { 
  Home, ShoppingCart, Package, Users, Truck, DollarSign, LogOut, Archive, PieChart,
  FileText, Scale, Cigarette, ShoppingBag, TrendingUp, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LockOpen, Monitor, Building2, Calculator,
  Search, Moon, Sun, Volume2, VolumeX, Menu, X
} from "lucide-react";

function Sidebar({ isOpen, toggleSidebar, onOpenSearch, mobileOpen, setMobileOpen }) {
  const { logout, usuario, rol } = useAuth();
  const { tema, toggleTema } = useTheme();
  const [sonidoActivo, setSonidoActivo] = useState(isSoundEnabled());
  const location = useLocation();
  const navigate = useNavigate();

  // Cerrar sidebar mobile al navegar
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Submenú de Productos
  const productosSubRoutes = ["/productos", "/stock", "/promos", "/cigarrillos", "/calculadora"];
  const isProductosSection = productosSubRoutes.includes(location.pathname);
  const [productosOpen, setProductosOpen] = useState(isProductosSection);

  useEffect(() => {
    if (isProductosSection) setProductosOpen(true);
  }, [location.pathname]);

  const btnBase = `flex items-center gap-3 w-full p-2.5 rounded-lg transition-all font-medium text-[13px] mb-0.5 ${
    isOpen ? "justify-start" : "justify-center"
  }`;
  
  const btnActive = "bg-blue-500/15 text-blue-500";
  const btnInactive = "text-slate-400 hover:bg-white/5 hover:text-slate-200";

  // Estilos para sub-items del menú desplegable
  const subBtnBase = "flex items-center gap-2.5 w-full p-2 rounded-lg transition-all font-medium text-xs";
  const subBtnActive = "bg-blue-500/10 text-blue-400";
  const subBtnInactive = "text-slate-400 hover:bg-white/5 hover:text-slate-200";

  return (
    <>
    {/* Overlay para mobile */}
    {mobileOpen && (
      <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
    )}

    <div className={`
      ${isOpen ? "w-60" : "w-[68px]"} 
      bg-[#1c1c1e] h-full flex flex-col justify-between transition-all duration-300 flex-shrink-0 relative z-40 border-r border-white/[0.06]
      fixed md:relative
      ${mobileOpen ? "translate-x-0 w-60" : "-translate-x-full md:translate-x-0"}
    `}>
      
      {/* Botón cerrar en mobile */}
      <button 
        onClick={() => setMobileOpen(false)}
        className="absolute top-4 right-4 bg-white/10 text-white p-1.5 rounded-lg md:hidden z-50 hover:bg-white/20"
      >
        <X size={18} />
      </button>

      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 bg-[#007aff] text-white p-1 rounded-full shadow-md border-2 border-[#1c1c1e] hover:bg-[#0071e3] transition-colors z-50 hidden md:block"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className={`p-4 flex items-center ${isOpen ? "justify-start gap-3" : "justify-center"} border-b border-white/[0.06] h-20 transition-all`}>
        <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />
        <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
            <h1 className="text-white font-semibold text-base tracking-tight leading-none whitespace-nowrap">
              SAC<span className="text-[#007aff] font-bold">Ware</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wider mt-1 font-medium whitespace-nowrap uppercase">
                GESTIÓN COMERCIAL
            </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-0.5">
        
        {/* Botón Búsqueda Global */}
        <button
          onClick={onOpenSearch}
          className={`flex items-center gap-3 w-full p-2.5 rounded-lg transition-all font-normal text-xs mb-2 text-slate-500 hover:bg-white/5 hover:text-slate-300 ${isOpen ? "justify-start" : "justify-center"}`}
          title="Búsqueda Global (Ctrl+K)"
        >
          <Search size={17} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Buscar...</span>
          {isOpen && <kbd className="ml-auto text-[9px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500 font-mono">Ctrl+K</kbd>}
        </button>

        {isOpen && <p className="text-[10px] font-medium text-slate-600 uppercase mb-1.5 mt-2 px-2 fade-in tracking-wider">Caja</p>}
        
        <Link to="/" className={`${btnBase} ${isActive("/") ? btnActive : btnInactive}`} title="Inicio (F1)">
          <Home size={20} className="flex-shrink-0" /> 
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Inicio</span>
          {isOpen && <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F1</span>}
        </Link>

        <Link to="/ventas" className={`${btnBase} ${isActive("/ventas") ? btnActive : btnInactive}`} title="Ventas (F2)">
          <ShoppingCart size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Ventas</span>
          {isOpen && <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F2</span>}
        </Link>

        <Link to="/cierre" className={`${btnBase} ${isActive("/cierre") ? btnActive : btnInactive}`} title="Cierre (F3)">
          <Archive size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Cierre</span>
          {isOpen && <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F3</span>}
        </Link>

        <div className={`my-2 border-t border-white/[0.06] mx-auto ${isOpen ? "w-full" : "w-10"}`}></div>

        {isOpen && <p className="text-[10px] font-medium text-slate-600 uppercase mb-1.5 px-2 fade-in tracking-wider">Gestión</p>}

        <Link to="/retiros" className={`${btnBase} ${isActive("/retiros") ? btnActive : btnInactive}`} title="Retiros">
          <TrendingUp size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Retiros</span>
        </Link>

        {/* Productos - Grupo con submenú desplegable */}
        <div>
          <button
            onClick={() => {
              if (isOpen) {
                setProductosOpen(!productosOpen);
              } else {
                navigate("/productos");
              }
            }}
            className={`${btnBase} ${isProductosSection ? btnActive : btnInactive}`}
            title="Productos"
          >
            <Package size={19} className="flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Productos</span>
            {isOpen && (
              <ChevronDown 
                size={14} 
                className={`ml-auto transition-transform duration-200 ${productosOpen ? "rotate-180" : ""}`} 
              />
            )}
          </button>
          
          {/* Submenú desplegable */}
          <div className={`overflow-hidden transition-all duration-200 ${isOpen && productosOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="ml-4 pl-3 border-l border-white/[0.06] space-y-0.5 mt-1 mb-1">
              <Link to="/productos" className={`${subBtnBase} ${isActive("/productos") ? subBtnActive : subBtnInactive}`} title="Productos (F4)">
                <Package size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Productos</span>
                <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F4</span>
              </Link>
              <Link to="/cigarrillos" className={`${subBtnBase} ${isActive("/cigarrillos") ? subBtnActive : subBtnInactive}`} title="Cigarrillos">
                <Cigarette size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Cigarrillos</span>
              </Link>
              <Link to="/promos" className={`${subBtnBase} ${isActive("/promos") ? subBtnActive : subBtnInactive}`} title="Promos y Combos">
                <ShoppingBag size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Promos</span>
              </Link>
              <Link to="/stock" className={`${subBtnBase} ${isActive("/stock") ? subBtnActive : subBtnInactive}`} title="Stock (F5)">
                <PieChart size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Stock</span>
                <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F5</span>
              </Link>
              <Link to="/calculadora" className={`${subBtnBase} ${isActive("/calculadora") ? subBtnActive : subBtnInactive}`} title="Calculadora de Precios">
                <Calculator size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Calculadora</span>
              </Link>
            </div>
          </div>
        </div>

        <div className={`my-2 border-t border-white/[0.06] mx-auto ${isOpen ? "w-full" : "w-10"}`}></div>

        {isOpen && <p className="text-[10px] font-medium text-slate-600 uppercase mb-1.5 px-2 fade-in tracking-wider">Admin</p>}

        <Link to="/clientes" className={`${btnBase} ${isActive("/clientes") ? btnActive : btnInactive}`} title="Clientes">
          <Users size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Clientes</span>
        </Link>

        <Link to="/proveedores" className={`${btnBase} ${isActive("/proveedores") ? btnActive : btnInactive}`} title="Proveedores">
          <Truck size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Proveedores</span>
        </Link>

        <Link to="/gastos" className={`${btnBase} ${isActive("/gastos") ? btnActive : btnInactive}`} title="Gastos (F7)">
          <DollarSign size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Gastos</span>
          {isOpen && <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F7</span>}
        </Link>

        <Link to="/balance" className={`${btnBase} ${isActive("/balance") ? btnActive : btnInactive}`} title="Balance">
          <Scale size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Balance</span>
        </Link>

        <Link to="/conciliacion" className={`${btnBase} ${isActive("/conciliacion") ? btnActive : btnInactive}`} title="Conciliación Bancaria">
          <Building2 size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Conciliación</span>
        </Link>

        <Link to="/reportes" className={`${btnBase} ${isActive("/reportes") ? btnActive : btnInactive}`} title="Reportes (F6)">
          <FileText size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Reportes</span>
          {isOpen && <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F6</span>}
        </Link>
        
        {/* NUEVO BOTÓN DE CONFIGURACIÓN */}
        <Link to="/configuracion" className={`${btnBase} ${isActive("/configuracion") ? btnActive : btnInactive}`} title="Configuración (F8)">
          <Settings size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Configuración</span>
          {isOpen && <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-slate-500">F8</span>}
        </Link>

        <Link to="/cajas" className={`${btnBase} ${isActive("/cajas") ? btnActive : btnInactive}`} title="Gestión de Cajas">
          <Monitor size={19} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Cajas</span>
        </Link>

      </nav>

      <div className="p-4 border-t border-white/[0.06] bg-[#1c1c1e]">

        {/* Toggles rápidos: Tema + Sonido */}
        <div className={`flex ${isOpen ? "gap-2 mb-3" : "flex-col gap-2 mb-3 items-center"}`}>
          <button
            onClick={toggleTema}
            className="flex items-center gap-2 p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex-1"
            title={tema === "claro" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          >
            {tema === "claro" ? <Moon size={16} /> : <Sun size={16} className="text-yellow-400" />}
            {isOpen && <span className="text-xs font-normal">{tema === "claro" ? "Oscuro" : "Claro"}</span>}
          </button>
          <button
            onClick={() => { toggleSound(); setSonidoActivo(!sonidoActivo); }}
            className="flex items-center gap-2 p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex-1"
            title={sonidoActivo ? "Desactivar sonidos" : "Activar sonidos"}
          >
            {sonidoActivo ? <Volume2 size={16} className="text-green-400" /> : <VolumeX size={16} />}
            {isOpen && <span className="text-xs font-normal">{sonidoActivo ? "Sonido" : "Silencio"}</span>}
          </button>
        </div>

        <div 
          onClick={() => navigate("/configuracion")}
          className={`flex items-center gap-3 mb-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors ${isOpen ? "justify-start" : "justify-center"}`}
          title="Ir a Configuración"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 font-medium text-xs flex-shrink-0">
            {usuario ? usuario.charAt(0).toUpperCase() : "U"}
          </div>
          
          <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
            <p className="text-white text-sm font-medium truncate">{usuario || "Usuario"}</p>
            <p className="text-xs text-slate-500 font-normal">{rol === 'admin' ? 'Administrador' : rol === 'supervisor' ? 'Supervisor' : 'Cajero'}</p>
          </div>
        </div>
        <p className={`text-[10px] text-slate-600 text-center transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}>v{__APP_VERSION__}</p>
      </div>

    </div>
    </>
  );
}

export default Sidebar;