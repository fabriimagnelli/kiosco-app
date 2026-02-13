import React, { useState } from "react";
import { 
  ShoppingCart, Package, BarChart3, Users, FileText, Settings, Archive, 
  DollarSign, ArrowRight, X, Keyboard, ChevronRight
} from "lucide-react";

const pasos = [
  {
    titulo: "¡Bienvenido a SACWare!",
    descripcion: "Tu sistema de gestión comercial todo-en-uno. Te guiamos por las funciones principales en solo unos pasos.",
    icono: <img src="/logo.png" alt="SACWare" className="w-20 h-20 object-contain drop-shadow-lg" />,
    color: "from-blue-600 to-indigo-700"
  },
  {
    titulo: "Punto de Venta",
    descripcion: "Registrá ventas rápidamente. Buscá productos por nombre o código de barras, agregá al carrito y cobrá con efectivo, QR o tarjeta. Usá F2 para ir directo a Ventas.",
    icono: <ShoppingCart size={48} className="text-white" />,
    color: "from-green-500 to-emerald-600"
  },
  {
    titulo: "Productos y Stock",
    descripcion: "Gestioná tu catálogo completo: productos, cigarrillos, promos y control de stock. Todo agrupado en el menú 'Productos' del sidebar.",
    icono: <Package size={48} className="text-white" />,
    color: "from-orange-500 to-amber-600"
  },
  {
    titulo: "Cierre de Caja",
    descripcion: "Al final de cada turno, hacé el cierre de caja con F3. El sistema calcula automáticamente ventas, retiros y diferencias.",
    icono: <Archive size={48} className="text-white" />,
    color: "from-purple-500 to-violet-600"
  },
  {
    titulo: "Clientes y Fiados",
    descripcion: "Llevá registro de clientes deudores, sus compras fiadas y pagos. Ideal para el manejo de cuentas corrientes.",
    icono: <Users size={48} className="text-white" />,
    color: "from-cyan-500 to-blue-600"
  },
  {
    titulo: "Reportes y Balance",
    descripcion: "Accedé a reportes detallados de ventas, ganancias y movimientos. Tomá decisiones basadas en datos reales de tu negocio.",
    icono: <BarChart3 size={48} className="text-white" />,
    color: "from-pink-500 to-rose-600"
  },
  {
    titulo: "Atajos de Teclado",
    descripcion: "Navegá más rápido: F1 Inicio, F2 Ventas, F3 Cierre, F4 Productos, F5 Stock, F6 Reportes, F7 Gastos, F8 Config, Ctrl+K Búsqueda global.",
    icono: <Keyboard size={48} className="text-white" />,
    color: "from-slate-600 to-slate-800"
  },
  {
    titulo: "¡Todo listo!",
    descripcion: "Ya conocés lo esencial. Podés volver a ver esta guía desde Configuración. ¡Éxitos con tu negocio!",
    icono: <Settings size={48} className="text-white" />,
    color: "from-blue-600 to-indigo-700"
  }
];

function Tutorial({ onClose }) {
  const [paso, setPaso] = useState(0);
  const actual = pasos[paso];
  const esUltimo = paso === pasos.length - 1;

  const handleFinish = () => {
    localStorage.setItem("sacware_tutorial_visto", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header con gradiente */}
        <div className={`bg-gradient-to-r ${actual.color} p-8 text-center relative`}>
          <button 
            onClick={handleFinish}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={16} />
          </button>
          
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {actual.icono}
          </div>
          <h2 className="text-2xl font-bold text-white">{actual.titulo}</h2>
        </div>

        {/* Cuerpo */}
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-6">
            {actual.descripcion}
          </p>

          {/* Indicadores de progreso */}
          <div className="flex justify-center gap-1.5 mb-6">
            {pasos.map((_, i) => (
              <button
                key={i}
                onClick={() => setPaso(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === paso ? "w-8 bg-blue-600" : i < paso ? "w-2 bg-blue-300" : "w-2 bg-slate-200 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            {paso > 0 && (
              <button
                onClick={() => setPaso(paso - 1)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Anterior
              </button>
            )}
            {paso === 0 && (
              <button
                onClick={handleFinish}
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Omitir
              </button>
            )}
            <button
              onClick={() => esUltimo ? handleFinish() : setPaso(paso + 1)}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {esUltimo ? "¡Empezar!" : "Siguiente"} 
              {!esUltimo && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tutorial;
