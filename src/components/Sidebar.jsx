import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Home, ShoppingCart, Package, DollarSign, 
  TrendingUp, Archive, FileText, Users, 
  Truck, PieChart, Calculator, LogOut, Key, Cigarette 
} from "lucide-react";

function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path 
    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
    : "text-slate-400 hover:bg-slate-800 hover:text-white";

  const NavItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className={`flex items-center gap-3 p-2.5 mx-2 rounded-xl transition-all duration-200 font-medium text-sm ${isActive(to)}`}>
      <Icon size={18} /> 
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="w-64 bg-slate-900 h-full flex flex-col justify-between border-r border-slate-800 flex-shrink-0">
      
      <div className="p-5 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-2 px-2">
           <img src="/SACWare-logo-sin-fondo-cambio.png" alt="Logo" className="w-8 h-8 object-contain" />
           <div>
             <h1 className="text-xl font-bold text-white tracking-tight leading-none">SACWare</h1>
             <p className="text-xs text-slate-500 font-medium">Sistema de Gestión</p>
           </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pb-2">
        
        <div className="px-3">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 mt-2 px-3">Principal</p>
          <NavItem to="/" icon={Home} label="Inicio" />
          <NavItem to="/ventas" icon={ShoppingCart} label="Ventas" />
        </div>

        <div className="px-3">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 mt-3 px-3">Gestión</p>
          <NavItem to="/inventario" icon={Package} label="Productos" />
          <NavItem to="/cigarrillos" icon={Cigarette} label="Cigarrillos" /> {/* LINK RESTAURADO */}
          <NavItem to="/stock" icon={TrendingUp} label="Control Stock" />
          <NavItem to="/movimientos" icon={DollarSign} label="Gastos y Retiros" />
        </div>

        <div className="px-3">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 mt-3 px-3">Finanzas</p>
          <NavItem to="/cierre" icon={Archive} label="Cierre de Caja" />
          <NavItem to="/balance" icon={PieChart} label="Balance General" />
          <NavItem to="/reportes" icon={FileText} label="Reportes Históricos" />
        </div>

        <div className="px-3">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 mt-3 px-3">Contactos</p>
          <NavItem to="/deudores" icon={Users} label="Clientes (Fiados)" />
          <NavItem to="/lista-proveedores" icon={Truck} label="Proveedores" />
        </div>

        <div className="px-3">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 mt-3 px-3">Utilidades</p>
          <NavItem to="/apertura" icon={Key} label="Apertura Caja" />
          <NavItem to="/calculadora" icon={Calculator} label="Calculadora" />
        </div>

      </nav>

      <div className="p-3 border-t border-slate-800 bg-slate-900 z-10 flex-shrink-0">
        <button 
          onClick={logout} 
          className="flex w-full items-center justify-center gap-2 p-2.5 rounded-xl text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300 transition-all border border-red-500/10 hover:border-red-500/20"
        >
          <LogOut size={18} /> 
          <span className="font-bold text-sm">Cerrar Sesión</span>
        </button>
      </div>

    </div>
  );
}

export default Sidebar;