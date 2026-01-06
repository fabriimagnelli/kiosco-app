// src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Home, ShoppingCart, Package, Users, Truck, DollarSign, LogOut, Archive, PieChart,
  Unlock, FileText, Scale, Cigarette,
  ChevronLeft, ChevronRight // Importamos iconos para el botón de colapsar
} from "lucide-react";

// Recibimos isOpen y toggleSidebar desde App.jsx
function Sidebar({ isOpen, toggleSidebar }) {
  const { logout, usuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Ajustamos las clases base dependiendo si está abierto o cerrado
  // Si está cerrado (isOpen false), centramos los iconos (justify-center)
  // Si está abierto, los alineamos a la izquierda (justify-start)
  const btnBase = `flex items-center gap-3 w-full p-3 rounded-xl transition-all font-medium text-sm mb-1 ${
    isOpen ? "justify-start" : "justify-center"
  }`;
  
  const btnActive = "bg-blue-600 text-white shadow-lg shadow-blue-500/30";
  const btnInactive = "text-slate-400 hover:bg-slate-800 hover:text-white";

  return (
    // Ancho dinámico: w-64 si está abierto, w-20 si está cerrado
    <div className={`${isOpen ? "w-64" : "w-20"} bg-slate-900 h-full flex flex-col justify-between transition-all duration-300 flex-shrink-0 relative z-20 border-r border-slate-800 shadow-xl`}>
      
      {/* BOTÓN DE COLAPSAR (Flotante en el borde o integrado en el header) */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 bg-blue-600 text-white p-1 rounded-full shadow-lg border-2 border-slate-900 hover:bg-blue-500 transition-colors z-50"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* HEADER LOGO */}
      <div className={`p-4 flex items-center ${isOpen ? "justify-start gap-3" : "justify-center"} border-b border-slate-800 h-24 transition-all`}>
        <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-10 h-10 object-contain drop-shadow-md" 
        />
        {/* Ocultamos texto si está cerrado */}
        <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
            <h1 className="text-white font-semibold text-lg tracking-wide leading-none whitespace-nowrap">
              SAC<span className="text-blue-500 font-bold">Ware</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wider mt-1 font-light whitespace-nowrap">
                GESTIÓN COMERCIAL
            </p>
        </div>
      </div>

      {/* MENÚ SCROLLABLE */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        
        {/* TÍTULOS DE SECCIÓN (Solo visibles si está abierto) */}
        {isOpen && <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 mt-2 px-2 fade-in">Caja</p>}
        
        <Link to="/" className={`${btnBase} ${isActive("/") ? btnActive : btnInactive}`} title="Inicio">
          <Home size={20} className="flex-shrink-0" /> 
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Inicio</span>
        </Link>

        <Link to="/apertura" className={`${btnBase} ${isActive("/apertura") ? btnActive : btnInactive}`} title="Apertura">
          <Unlock size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Apertura</span>
        </Link>

        <Link to="/ventas" className={`${btnBase} ${isActive("/ventas") ? btnActive : btnInactive}`} title="Ventas">
          <ShoppingCart size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Ventas</span>
        </Link>

        <Link to="/cierre" className={`${btnBase} ${isActive("/cierre") ? btnActive : btnInactive}`} title="Cierre">
          <Archive size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Cierre</span>
        </Link>

        <div className={`my-2 border-t border-slate-800 mx-auto ${isOpen ? "w-full" : "w-10"}`}></div>

        {isOpen && <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 px-2 fade-in">Inventario</p>}

        <Link to="/productos" className={`${btnBase} ${isActive("/productos") ? btnActive : btnInactive}`} title="Productos">
          <Package size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Productos</span>
        </Link>

        <Link to="/cigarrillos" className={`${btnBase} ${isActive("/cigarrillos") ? btnActive : btnInactive}`} title="Cigarrillos">
          <Cigarette size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Cigarrillos</span>
        </Link>

        <Link to="/stock" className={`${btnBase} ${isActive("/stock") ? btnActive : btnInactive}`} title="Stock">
          <PieChart size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Stock</span>
        </Link>

        <div className={`my-2 border-t border-slate-800 mx-auto ${isOpen ? "w-full" : "w-10"}`}></div>

        {isOpen && <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 px-2 fade-in">Admin</p>}

        <Link to="/clientes" className={`${btnBase} ${isActive("/clientes") ? btnActive : btnInactive}`} title="Clientes">
          <Users size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Clientes</span>
        </Link>

        <Link to="/proveedores" className={`${btnBase} ${isActive("/proveedores") ? btnActive : btnInactive}`} title="Proveedores">
          <Truck size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Proveedores</span>
        </Link>

        <Link to="/gastos" className={`${btnBase} ${isActive("/gastos") ? btnActive : btnInactive}`} title="Gastos">
          <DollarSign size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Gastos</span>
        </Link>

        <Link to="/balance" className={`${btnBase} ${isActive("/balance") ? btnActive : btnInactive}`} title="Balance">
          <Scale size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Balance</span>
        </Link>

        <Link to="/reportes" className={`${btnBase} ${isActive("/reportes") ? btnActive : btnInactive}`} title="Reportes">
          <FileText size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Reportes</span>
        </Link>

      </nav>

      {/* USUARIO */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className={`flex items-center gap-3 mb-4 ${isOpen ? "justify-start" : "justify-center"}`}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-600 flex-shrink-0">
            {usuario ? usuario.charAt(0).toUpperCase() : "U"}
          </div>
          
          <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
            <p className="text-white text-sm font-bold truncate">{usuario || "Usuario"}</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all font-medium text-sm"
          title="Cerrar Sesión"
        >
          <LogOut size={18} /> 
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Salir</span>
        </button>
      </div>

    </div>
  );
}

export default Sidebar;