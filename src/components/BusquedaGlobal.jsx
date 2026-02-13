import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, X, Home, ShoppingCart, Package, Archive, PieChart, FileText, 
  Settings, DollarSign, Users, Truck, Scale, Building2, Monitor, 
  TrendingUp, ShoppingBag, Cigarette, Calculator, ArrowRight, Keyboard,
  CornerDownLeft
} from "lucide-react";
import { apiFetch } from "../lib/api";

// Secciones navegables de la app
const secciones = [
  { nombre: "Inicio", ruta: "/", icono: Home, atajo: "F1", categoria: "Navegación" },
  { nombre: "Ventas", ruta: "/ventas", icono: ShoppingCart, atajo: "F2", categoria: "Navegación" },
  { nombre: "Cierre de Caja", ruta: "/cierre", icono: Archive, atajo: "F3", categoria: "Navegación" },
  { nombre: "Productos", ruta: "/productos", icono: Package, atajo: "F4", categoria: "Navegación" },
  { nombre: "Stock", ruta: "/stock", icono: PieChart, atajo: "F5", categoria: "Navegación" },
  { nombre: "Reportes", ruta: "/reportes", icono: FileText, atajo: "F6", categoria: "Navegación" },
  { nombre: "Gastos", ruta: "/gastos", icono: DollarSign, atajo: "F7", categoria: "Navegación" },
  { nombre: "Configuración", ruta: "/configuracion", icono: Settings, atajo: "F8", categoria: "Navegación" },
  { nombre: "Retiros", ruta: "/retiros", icono: TrendingUp, categoria: "Navegación" },
  { nombre: "Promos y Combos", ruta: "/promos", icono: ShoppingBag, categoria: "Navegación" },
  { nombre: "Cigarrillos", ruta: "/cigarrillos", icono: Cigarette, categoria: "Navegación" },
  { nombre: "Calculadora de Precios", ruta: "/calculadora", icono: Calculator, categoria: "Navegación" },
  { nombre: "Clientes / Deudores", ruta: "/clientes", icono: Users, categoria: "Navegación" },
  { nombre: "Proveedores", ruta: "/proveedores", icono: Truck, categoria: "Navegación" },
  { nombre: "Balance", ruta: "/balance", icono: Scale, categoria: "Navegación" },
  { nombre: "Conciliación Bancaria", ruta: "/conciliacion", icono: Building2, categoria: "Navegación" },
  { nombre: "Gestión de Cajas", ruta: "/cajas", icono: Monitor, categoria: "Navegación" },
];

function BusquedaGlobal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [seleccion, setSeleccion] = useState(0);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef(null);

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResultados([]);
      setSeleccion(0);
      setCargando(true);
      
      Promise.all([
        apiFetch("/api/productos").then(r => r.json()).catch(() => []),
        apiFetch("/api/clientes").then(r => r.json()).catch(() => []),
        apiFetch("/api/cigarrillos").then(r => r.json()).catch(() => []),
      ]).then(([prods, clients, cigs]) => {
        setProductos([
          ...(Array.isArray(prods) ? prods : []).map(p => ({ ...p, _tipo: "Producto" })),
          ...(Array.isArray(cigs) ? cigs : []).map(c => ({ ...c, _tipo: "Cigarrillo" })),
        ]);
        setClientes(Array.isArray(clients) ? clients : []);
        setCargando(false);
      });

      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Buscar
  useEffect(() => {
    if (!query.trim()) {
      // Sin query: mostrar secciones
      setResultados(secciones.map(s => ({ tipo: "seccion", ...s })));
      setSeleccion(0);
      return;
    }

    const q = query.toLowerCase().trim();
    const res = [];

    // Buscar secciones
    secciones.forEach(s => {
      if (s.nombre.toLowerCase().includes(q)) {
        res.push({ tipo: "seccion", ...s });
      }
    });

    // Buscar productos (max 8)
    let prodCount = 0;
    for (const p of productos) {
      if (prodCount >= 8) break;
      const nombre = (p.nombre || "").toLowerCase();
      const codigo = (p.codigo_barras || p.codigo || "").toLowerCase();
      if (nombre.includes(q) || codigo.includes(q)) {
        res.push({
          tipo: "producto",
          nombre: p.nombre,
          detalle: `$${Number(p.precio || 0).toLocaleString("es-AR")} · ${p._tipo}${p.codigo_barras ? ` · ${p.codigo_barras}` : ""}`,
          ruta: "/ventas",
          icono: p._tipo === "Cigarrillo" ? Cigarette : Package,
          categoria: "Productos"
        });
        prodCount++;
      }
    }

    // Buscar clientes (max 5)
    let clientCount = 0;
    for (const c of clientes) {
      if (clientCount >= 5) break;
      const nombre = (c.nombre || "").toLowerCase();
      if (nombre.includes(q)) {
        res.push({
          tipo: "cliente",
          nombre: c.nombre,
          detalle: `Deuda: $${Number(c.deuda || 0).toLocaleString("es-AR")}`,
          ruta: "/clientes",
          icono: Users,
          categoria: "Clientes"
        });
        clientCount++;
      }
    }

    setResultados(res);
    setSeleccion(0);
  }, [query, productos, clientes]);

  // Teclado
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSeleccion(prev => Math.min(prev + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSeleccion(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && resultados[seleccion]) {
      seleccionarResultado(resultados[seleccion]);
    }
  };

  const seleccionarResultado = (item) => {
    if (item.ruta) {
      navigate(item.ruta);
    }
    onClose();
  };

  if (!isOpen) return null;

  // Agrupar resultados por categoría
  const agrupados = {};
  resultados.forEach(r => {
    const cat = r.categoria || "Resultados";
    if (!agrupados[cat]) agrupados[cat] = [];
    agrupados[cat].push(r);
  });

  let globalIndex = -1;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 border border-slate-200 dark:border-slate-700">
        
        {/* Input de búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search size={20} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar productos, clientes, secciones..."
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm"
            autoFocus
          />
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono">
            ESC
          </kbd>
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Resultados */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {cargando ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-slate-400">Cargando datos...</span>
            </div>
          ) : resultados.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Search size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No se encontraron resultados para "<strong>{query}</strong>"</p>
            </div>
          ) : (
            Object.entries(agrupados).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[10px] font-bold text-slate-400 uppercase px-3 py-1.5 sticky top-0 bg-white dark:bg-slate-800">{cat}</p>
                {items.map((item) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const Icono = item.icono;
                  return (
                    <button
                      key={`${item.tipo}-${item.nombre}-${idx}`}
                      onClick={() => seleccionarResultado(item)}
                      onMouseEnter={() => setSeleccion(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                        seleccion === idx 
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" 
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        seleccion === idx ? "bg-blue-100 dark:bg-blue-800/50" : "bg-slate-100 dark:bg-slate-700"
                      }`}>
                        {Icono && <Icono size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.nombre}</p>
                        {item.detalle && <p className="text-xs text-slate-400 truncate">{item.detalle}</p>}
                      </div>
                      {item.atajo && (
                        <kbd className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-400">
                          {item.atajo}
                        </kbd>
                      )}
                      {seleccion === idx && (
                        <CornerDownLeft size={14} className="text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">↑↓</kbd> Navegar</span>
            <span className="flex items-center gap-1"><kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Enter</kbd> Ir</span>
            <span className="flex items-center gap-1"><kbd className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Esc</kbd> Cerrar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusquedaGlobal;
