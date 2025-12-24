import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LayoutDashboard, Package, ShoppingCart, FileText, 
  Cigarette, DollarSign, Truck, BookUser, Lock, 
  Calendar, LogOut, Calculator, LockOpen, Boxes, Database 
} from "lucide-react";

function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { path: "/", icon: <LayoutDashboard size={20} />, label: "Inicio" },
    { path: "/ventas", icon: <ShoppingCart size={20} />, label: "Ventas" },
    { path: "/inventario", icon: <Package size={20} />, label: "inventario" },
    { path: "/cigarrillos", icon: <Cigarette size={20} />, label: "Cigarrillos" },
    { path: "/stock", icon: <Boxes size={20} />, label: "Inventario" },
    { path: "/movimientos", icon: <DollarSign size={20} />, label: "movimientos" },
    { path: "/deudores", icon: <BookUser size={20} />, label: "Deudores" },
    { path: "/lista-proveedores", icon: <Truck size={20} />, label: "lista-proveedores" },
    { path: "/apertura", icon: <LockOpen size={20} />, label: "Apertura Caja" },
    { path: "/cierre", icon: <Lock size={20} />, label: "Cierre de Caja" },
    { path: "/balance", icon: <Calendar size={20} />, label: "Balance" },
    { path: "/reportes", icon: <FileText size={20} />, label: "Historial" },
  ];

  const isActive = (path) => location.pathname === path;

  // Función para Backup
  const hacerBackup = async () => {
    if(!confirm("¿Quieres crear una copia de seguridad ahora?")) return;
    
    try {
      const res = await fetch("http://localhost:3001/backup");
      const data = await res.json();
      if(res.ok) {
        alert("✅ " + data.message + "\nArchivo: " + data.archivo);
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (error) {
      alert("❌ Error de conexión con el servidor");
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col shadow-2xl shrink-0 font-medium">
      
      {/* HEADER CON LOGO SACWARE */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-white p-1 rounded-lg h-12 w-12 flex items-center justify-center overflow-hidden">
          {/* Asegúrate de poner tu imagen 'logo.png' en la carpeta 'public' */}
          <img src="/logo.png" alt="Logo" className="object-contain h-full w-full" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">SACWare</h1>
          <p className="text-xs text-slate-500">Sistema de Gestión</p>
        </div>
      </div>
      
      {/* NAVEGACIÓN */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <div className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
              ${isActive(item.path) 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1" 
                : "hover:bg-slate-800 hover:text-white hover:translate-x-1"}
            `}>
              <span className={isActive(item.path) ? "text-white" : "text-slate-400 group-hover:text-white"}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-2">
        <button 
          onClick={hacerBackup}
          className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full text-left rounded-lg group"
        >
          <Database size={20} className="group-hover:text-blue-400"/>
          <span className="font-medium">Crear Respaldo</span>
        </button>

        <button 
            className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-3 rounded-lg transition-all border border-red-600/20 hover:border-red-600"
            onClick={logout}
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;