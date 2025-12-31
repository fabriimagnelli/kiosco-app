import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  DollarSign, 
  LogOut, 
  Archive, 
  PieChart,
  Unlock,      // Para Apertura
  FileText,    // Para Reportes
  Scale,       // Para Balance
  Cigarette    // Para Cigarrillos
} from "lucide-react";

function Sidebar() {
  const { logout, usuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Estilos originales: w-20 en móvil/cerrado, md:w-64 en escritorio
  const btnBase = "flex items-center gap-3 w-full p-3 rounded-xl transition-all font-bold text-sm mb-1 justify-center md:justify-start";
  const btnActive = "bg-blue-600 text-white shadow-lg shadow-blue-500/30";
  const btnInactive = "text-slate-400 hover:bg-slate-800 hover:text-white";

  return (
    <div className="w-20 md:w-64 bg-slate-900 h-full flex flex-col justify-between transition-all duration-300 flex-shrink-0 relative z-20 border-r border-slate-800">
      
      {/* LOGO */}
      <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-slate-800 h-20">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg text-white font-bold text-xl flex-shrink-0">
          S
        </div>
        <h1 className="text-white font-bold text-xl hidden md:block tracking-wide">
          SAC<span className="text-blue-500">Ware</span>
        </h1>
      </div>

      {/* MENÚ SCROLLABLE */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-4 space-y-1">
        
        {/* SECCIÓN CAJA (Operativa diaria) */}
        <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 text-center md:text-left hidden md:block">Caja</p>
        
        <Link to="/" className={`${btnBase} ${isActive("/") ? btnActive : btnInactive}`} title="Inicio">
          <Home size={20} /> <span className="hidden md:block">Inicio</span>
        </Link>

        <Link to="/apertura" className={`${btnBase} ${isActive("/apertura") ? btnActive : btnInactive}`} title="Apertura de Caja">
          <Unlock size={20} /> <span className="hidden md:block">Apertura</span>
        </Link>

        <Link to="/ventas" className={`${btnBase} ${isActive("/ventas") ? btnActive : btnInactive}`} title="Ventas">
          <ShoppingCart size={20} /> <span className="hidden md:block">Ventas</span>
        </Link>

        <Link to="/cierre" className={`${btnBase} ${isActive("/cierre") ? btnActive : btnInactive}`} title="Cierre de Caja">
          <Archive size={20} /> <span className="hidden md:block">Cierre</span>
        </Link>

        <div className="my-2 border-t border-slate-800 w-10 md:w-full mx-auto"></div>

        {/* SECCIÓN GESTIÓN (Productos y Stock) */}
        <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 text-center md:text-left hidden md:block">Inventario</p>

        <Link to="/productos" className={`${btnBase} ${isActive("/productos") ? btnActive : btnInactive}`} title="Productos">
          <Package size={20} /> <span className="hidden md:block">Productos</span>
        </Link>

        <Link to="/cigarrillos" className={`${btnBase} ${isActive("/cigarrillos") ? btnActive : btnInactive}`} title="Cigarrillos">
          <Cigarette size={20} /> <span className="hidden md:block">Cigarrillos</span>
        </Link>

        <Link to="/stock" className={`${btnBase} ${isActive("/stock") ? btnActive : btnInactive}`} title="Stock General">
          <PieChart size={20} /> <span className="hidden md:block">Stock</span>
        </Link>

        <div className="my-2 border-t border-slate-800 w-10 md:w-full mx-auto"></div>

        {/* SECCIÓN ADMINISTRACIÓN (Finanzas y Personas) */}
        <p className="text-[10px] font-bold text-slate-600 uppercase mb-2 text-center md:text-left hidden md:block">Admin</p>

        <Link to="/clientes" className={`${btnBase} ${isActive("/clientes") ? btnActive : btnInactive}`} title="Clientes">
          <Users size={20} /> <span className="hidden md:block">Clientes</span>
        </Link>

        <Link to="/proveedores" className={`${btnBase} ${isActive("/proveedores") ? btnActive : btnInactive}`} title="Proveedores">
          <Truck size={20} /> <span className="hidden md:block">Proveedores</span>
        </Link>

        <Link to="/gastos" className={`${btnBase} ${isActive("/gastos") ? btnActive : btnInactive}`} title="Gastos">
          <DollarSign size={20} /> <span className="hidden md:block">Gastos</span>
        </Link>

        <Link to="/balance" className={`${btnBase} ${isActive("/balance") ? btnActive : btnInactive}`} title="Balance">
          <Scale size={20} /> <span className="hidden md:block">Balance</span>
        </Link>

        <Link to="/reportes" className={`${btnBase} ${isActive("/reportes") ? btnActive : btnInactive}`} title="Reportes">
          <FileText size={20} /> <span className="hidden md:block">Reportes</span>
        </Link>

      </nav>

      {/* USUARIO */}
      <div className="p-2 md:p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center justify-center md:justify-start gap-3 mb-4 md:px-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-600">
            {usuario ? usuario.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden md:block overflow-hidden">
            <p className="text-white text-sm font-bold truncate">{usuario || "Usuario"}</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all font-bold text-sm"
          title="Cerrar Sesión"
        >
          <LogOut size={18} /> <span className="hidden md:block">Salir</span>
        </button>
      </div>

    </div>
  );
}

export default Sidebar;