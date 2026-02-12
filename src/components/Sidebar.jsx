import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Home, ShoppingCart, Package, Users, Truck, DollarSign, LogOut, Archive, PieChart,
  FileText, Scale, Cigarette, ShoppingBag, TrendingUp, Settings,
  ChevronLeft, ChevronRight, LockOpen, Monitor, Building2
} from "lucide-react";

function Sidebar({ isOpen, toggleSidebar }) {
  const { logout, usuario, rol } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const btnBase = `flex items-center gap-3 w-full p-3 rounded-xl transition-all font-medium text-sm mb-1 ${
    isOpen ? "justify-start" : "justify-center"
  }`;
  
  const btnActive = "bg-blue-600 text-white shadow-lg shadow-blue-500/30";
  const btnInactive = "text-slate-400 hover:bg-slate-800 hover:text-white";

  return (
    <div className={`${isOpen ? "w-64" : "w-20"} bg-slate-900 h-full flex flex-col justify-between transition-all duration-300 flex-shrink-0 relative z-20 border-r border-slate-800 shadow-xl`}>
      
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 bg-blue-600 text-white p-1 rounded-full shadow-lg border-2 border-slate-900 hover:bg-blue-500 transition-colors z-50"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className={`p-4 flex items-center ${isOpen ? "justify-start gap-3" : "justify-center"} border-b border-slate-800 h-24 transition-all`}>
        <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
        <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
            <h1 className="text-white font-semibold text-lg tracking-wide leading-none whitespace-nowrap">
              SAC<span className="text-blue-500 font-bold">Ware</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-wider mt-1 font-light whitespace-nowrap">
                GESTIÓN COMERCIAL
            </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        
        {isOpen && <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 mt-2 px-2 fade-in">Caja</p>}
        
        <Link to="/" className={`${btnBase} ${isActive("/") ? btnActive : btnInactive}`} title="Inicio (F1)">
          <Home size={20} className="flex-shrink-0" /> 
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Inicio</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F1</span>}
        </Link>

        <Link to="/ventas" className={`${btnBase} ${isActive("/ventas") ? btnActive : btnInactive}`} title="Ventas (F2)">
          <ShoppingCart size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Ventas</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F2</span>}
        </Link>

        <Link to="/apertura" className={`${btnBase} ${isActive("/apertura") ? btnActive : btnInactive}`} title="Apertura de Caja">
          <LockOpen size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Apertura</span>
        </Link>

        <Link to="/cierre" className={`${btnBase} ${isActive("/cierre") ? btnActive : btnInactive}`} title="Cierre (F3)">
          <Archive size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Cierre</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F3</span>}
        </Link>

        <div className={`my-2 border-t border-slate-800 mx-auto ${isOpen ? "w-full" : "w-10"}`}></div>

        {isOpen && <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 px-2 fade-in">Gestión</p>}

        <Link to="/retiros" className={`${btnBase} ${isActive("/retiros") ? btnActive : btnInactive}`} title="Retiros">
          <TrendingUp size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Retiros</span>
        </Link>

        <Link to="/stock" className={`${btnBase} ${isActive("/stock") ? btnActive : btnInactive}`} title="Stock (F5)">
          <PieChart size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Stock</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F5</span>}
        </Link>

        <Link to="/promos" className={`${btnBase} ${isActive("/promos") ? btnActive : btnInactive}`} title="Promos y Combos">
          <ShoppingBag size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Promos</span>
        </Link>

        <Link to="/productos" className={`${btnBase} ${isActive("/productos") ? btnActive : btnInactive}`} title="Productos (F4)">
          <Package size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Productos</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F4</span>}
        </Link>

        <Link to="/cigarrillos" className={`${btnBase} ${isActive("/cigarrillos") ? btnActive : btnInactive}`} title="Cigarrillos">
          <Cigarette size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Cigarrillos</span>
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

        <Link to="/gastos" className={`${btnBase} ${isActive("/gastos") ? btnActive : btnInactive}`} title="Gastos (F7)">
          <DollarSign size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Gastos</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F7</span>}
        </Link>

        <Link to="/balance" className={`${btnBase} ${isActive("/balance") ? btnActive : btnInactive}`} title="Balance">
          <Scale size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Balance</span>
        </Link>

        <Link to="/conciliacion" className={`${btnBase} ${isActive("/conciliacion") ? btnActive : btnInactive}`} title="Conciliación Bancaria">
          <Building2 size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Conciliación</span>
        </Link>

        <Link to="/reportes" className={`${btnBase} ${isActive("/reportes") ? btnActive : btnInactive}`} title="Reportes (F6)">
          <FileText size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Reportes</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F6</span>}
        </Link>
        
        {/* NUEVO BOTÓN DE CONFIGURACIÓN */}
        <Link to="/configuracion" className={`${btnBase} ${isActive("/configuracion") ? btnActive : btnInactive}`} title="Configuración (F8)">
          <Settings size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Configuración</span>
          {isOpen && <span className="ml-auto text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400">F8</span>}
        </Link>

        <Link to="/cajas" className={`${btnBase} ${isActive("/cajas") ? btnActive : btnInactive}`} title="Gestión de Cajas">
          <Monitor size={20} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-opacity ${isOpen ? "opacity-100 block" : "opacity-0 hidden"}`}>Cajas</span>
        </Link>

      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div 
          onClick={() => navigate("/configuracion")}
          className={`flex items-center gap-3 mb-4 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors ${isOpen ? "justify-start" : "justify-center"}`}
          title="Ir a Configuración"
        >
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-600 flex-shrink-0">
            {usuario ? usuario.charAt(0).toUpperCase() : "U"}
          </div>
          
          <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
            <p className="text-white text-sm font-bold truncate">{usuario || "Usuario"}</p>
            <p className="text-xs text-slate-500">{rol === 'admin' ? 'Administrador' : rol === 'supervisor' ? 'Supervisor' : 'Cajero'}</p>
          </div>
        </div>
        <p className={`text-[10px] text-slate-600 text-center transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}>v{__APP_VERSION__}</p>
      </div>

    </div>
  );
}

export default Sidebar;