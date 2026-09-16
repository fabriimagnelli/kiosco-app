import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  ChevronRight,
  CircleDollarSign,
  Download,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotificationContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444"];

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: "12px",
  fontWeight: 600,
};

const formatCurrency = (value) => `$ ${Number(value || 0).toLocaleString("es-AR")}`;

const formatAxisValue = (value) => {
  const num = Number(value) || 0;
  if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k`;
  return `${num}`;
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "object") {
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.result)) return value.result;
    if (Array.isArray(value.results)) return value.results;
    return [];
  }
  return [];
};

const normalizeDashboardPayload = (payload) => {
  const safe = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  return {
    ventas_hoy: Number(safe.ventas_hoy ?? 0),
    tickets_hoy: Number(safe.tickets_hoy ?? 0),
    gastos_hoy: Number(safe.gastos_hoy ?? 0),
    bajo_stock: ensureArray(safe.bajo_stock),
    visitas_hoy: ensureArray(safe.visitas_hoy),
    top_deudas_proveedores: ensureArray(safe.top_deudas_proveedores),
  };
};

function KpiCard({ icon: Icon, badgeClass, label, value, sub }) {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-200 p-5">
      <div className={`absolute right-4 top-4 w-10 h-10 rounded-xl flex items-center justify-center ${badgeClass}`}>
        <Icon size={20} />
      </div>
      <div className="pr-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-slate-400 font-medium">{sub}</p>
      </div>
    </div>
  );
}

function Inicio() {
  const { toast } = useNotify();
  const { usuario } = useAuth() || {};

  const [dashboard, setDashboard] = useState(null);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [productosTop, setProductosTop] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [periodo, setPeriodo] = useState("hoy");

  const [currentVersion, setCurrentVersion] = useState("1.0.0");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    apiFetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => setDashboard(normalizeDashboardPayload(data)))
      .catch((err) => {
        console.error("Error Dashboard:", err);
        setDashboard(normalizeDashboardPayload({}));
      });

    apiFetch("/api/reportes/ventas_semana")
      .then((res) => res.json())
      .then((data) => setVentasSemana(ensureArray(data)))
      .catch((err) => {
        console.error("Error Ventas Semana:", err);
        setVentasSemana([]);
      });

    apiFetch("/api/reportes/productos_top")
      .then((res) => res.json())
      .then((data) => setProductosTop(ensureArray(data)))
      .catch((err) => {
        console.error("Error Top Productos:", err);
        setProductosTop([]);
      });

    apiFetch("/api/reportes/metodos_pago")
      .then((res) => res.json())
      .then((data) => setMetodosPago(ensureArray(data)))
      .catch((err) => {
        console.error("Error Metodos Pago:", err);
        setMetodosPago([]);
      });

    checkVersionSystem();
  }, []);

  const checkVersionSystem = async () => {
    try {
      const resVer = await apiFetch("/api/system/version");
      const dataVer = await resVer.json();
      setCurrentVersion(dataVer.version || "1.0.0");
      const resCheck = await apiFetch("/api/system/check-update");
      const dataCheck = await resCheck.json();
      if (dataCheck.updateAvailable) setShowUpdateModal(true);
    } catch (error) {
      console.error("Error updates:", error);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await apiFetch("/api/system/update", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast(`Actualizado a ${data.new_version}. Recargando...`, "ok");
        window.location.reload();
      } else {
        toast("Error: " + (data.error || "Intente manualmente."), "err");
        setUpdating(false);
      }
    } catch (error) {
      toast("Error de conexión.", "err");
      setUpdating(false);
    }
  };

  const predictNextVersion = (ver) => {
    if (!ver) return "?.?.?";
    const parts = ver.split(".").map(Number);
    if (parts.length === 3) parts[2] += 1;
    return parts.join(".");
  };

  const hoy = new Date();
  const fechaUpper = hoy
    .toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();

  const horaDeAhora = hoy.getHours();
  const saludo = horaDeAhora < 12 ? "Buenos días" : horaDeAhora < 18 ? "Buenas tardes" : "Buenas noches";

  const nombreUsuario =
    typeof usuario === "object" && usuario !== null
      ? usuario.nombre || "Administrador"
      : usuario || "Administrador";

  const ventasSemanaSafe = ensureArray(ventasSemana);
  const productosTopSafe = ensureArray(productosTop);
  const metodosPagoSafe = ensureArray(metodosPago);
  const bajoStockSafe = ensureArray(dashboard?.bajo_stock);

  const ventasChartData = periodo === "7d" ? ventasSemanaSafe : ventasSemanaSafe.slice(-1);

  const totalMetodos = useMemo(
    () => metodosPagoSafe.reduce((acc, m) => acc + (Number(m.value) || 0), 0),
    [metodosPagoSafe]
  );

  const totalUnidades = useMemo(
    () => productosTopSafe.reduce((acc, p) => acc + (Number(p.value) || 0), 0),
    [productosTopSafe]
  );

  const maxUnidades = useMemo(
    () => Math.max(...productosTopSafe.map((p) => Number(p.value) || 0), 1),
    [productosTopSafe]
  );

  const maxStock = useMemo(
    () => Math.max(...bajoStockSafe.map((i) => Number(i.stock) || 0), 1),
    [bajoStockSafe]
  );

  const positionBadge = (index) =>
    index === 0
      ? "bg-yellow-400 text-yellow-950"
      : index === 1
      ? "bg-slate-300 text-slate-700"
      : index === 2
      ? "bg-orange-400 text-orange-950"
      : "bg-slate-100 text-slate-500";

  if (!dashboard) return <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400 font-medium text-sm">Cargando tablero...</div>;

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-6 space-y-5 md:space-y-6 bg-slate-50 relative">

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
            <div className="bg-blue-600 p-6 flex items-center justify-center flex-col gap-3">
              <div className="bg-white/20 p-3 rounded-full animate-bounce">
                <Download className="text-white w-8 h-8" />
              </div>
              <h2 className="text-white text-xl font-bold">¡Nueva Actualización!</h2>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-slate-600">Nueva versión disponible.</p>
              <div className="flex items-center justify-center gap-4 text-sm font-mono bg-slate-100 p-3 rounded-lg">
                <div className="flex flex-col"><span className="text-slate-400 text-xs">Actual</span><span className="font-bold text-slate-700">{currentVersion}</span></div>
                <div className="text-blue-500">➜</div>
                <div className="flex flex-col"><span className="text-blue-500 text-xs font-bold">Nueva</span><span className="font-bold text-blue-600">{predictNextVersion(currentVersion)}</span></div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowUpdateModal(false)} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold transition-colors flex items-center justify-center gap-2" disabled={updating}><X size={18} /> Rechazar</button>
                <button onClick={handleUpdate} className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2" disabled={updating}>
                  {updating ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />} {updating ? "Actualizando..." : "Actualizar Ahora"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400">Inicio</span>
        </nav>

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">{fechaUpper}</p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {saludo} <span className="text-blue-600">•</span> {nombreUsuario}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Aquí tienes el resumen operativo y métricas de tu turno.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm">
              <button
                onClick={() => setPeriodo("hoy")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${periodo === "hoy" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                Hoy
              </button>
              <button
                onClick={() => setPeriodo("7d")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${periodo === "7d" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                Últimos 7 días
              </button>
            </div>
            <Link
              to="/ventas"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-sm transition-all active:scale-95"
            >
              <Plus size={16} /> Nueva Venta
            </Link>
          </div>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        <KpiCard
          icon={CircleDollarSign}
          badgeClass="bg-cyan-100 text-cyan-600"
          label="Ventas Hoy"
          value={formatCurrency(dashboard.ventas_hoy)}
          sub="Ingresos acumulados de la jornada"
        />
        <KpiCard
          icon={ShoppingCart}
          badgeClass="bg-violet-100 text-violet-600"
          label="Tickets Emitidos"
          value={`${Number(dashboard.tickets_hoy || 0).toLocaleString("es-AR")}`}
          sub="operaciones hoy"
        />
        <KpiCard
          icon={TrendingDown}
          badgeClass="bg-rose-100 text-rose-500"
          label="Gastos del Turno"
          value={formatCurrency(dashboard.gastos_hoy)}
          sub="Total erogado en el turno actual"
        />
        <KpiCard
          icon={AlertTriangle}
          badgeClass="bg-amber-100 text-amber-600"
          label="Stock Crítico"
          value={`${bajoStockSafe.length}`}
          sub="requieren reposición inmediata"
        />
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 md:p-6">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </span>
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">Evolución de Ventas</h3>
              <p className="mt-0.5 text-xs text-slate-400 font-medium">
                {periodo === "7d" ? "Ventas registradas en los últimos 7 días." : "Ventas registradas durante la jornada de hoy."}
              </p>
            </div>
          </div>

          <div className="h-64 md:h-72 mt-5 w-full">
            {ventasChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasChartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} width={48} tickFormatter={formatAxisValue} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={tooltipStyle}
                    formatter={(value) => [formatCurrency(value), "Ventas"]}
                    labelStyle={{ color: "#475569", fontSize: 12, fontWeight: 600 }}
                    separator=": "
                  />
                  <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Sin datos suficientes</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 md:p-6 flex flex-col">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <PieChartIcon size={18} />
            </span>
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">Distribución de Cobros</h3>
              <p className="mt-0.5 text-xs text-slate-400 font-medium">Todos los métodos de pago utilizados.</p>
            </div>
          </div>

          <div className="relative flex-1 min-h-[220px] mt-3">
            {metodosPagoSafe.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metodosPagoSafe}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      cornerRadius={6}
                      strokeWidth={2}
                      stroke="#ffffff"
                    >
                      {metodosPagoSafe.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatCurrency(value), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                  <span className="text-lg font-extrabold text-slate-800 tracking-tight">{formatCurrency(totalMetodos)}</span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                <PieChartIcon size={28} className="text-slate-300" />
                Sin ventas aún
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {metodosPagoSafe.map((metodo, index) => {
              const pct = totalMetodos > 0 ? Math.round((Number(metodo.value) / totalMetodos) * 100) : 0;
              return (
                <div key={index} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-600 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate">{metodo.name}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LISTAS INFERIORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">Ranking de Más Vendidos</h3>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Top productos por unidades vendidas.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-full shrink-0 tabular-nums">
              {totalUnidades} un.
            </span>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1.5">
            {productosTopSafe.length > 0 ? (
              productosTopSafe.map((prod, index) => {
                const unidades = Number(prod.value) || 0;
                const pct = Math.min(100, Math.round((unidades / maxUnidades) * 100));
                return (
                  <div key={index} className="bg-slate-50/70 border border-slate-100 rounded-xl px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${positionBadge(index)}`}>{index + 1}</span>
                        <span className="text-sm font-semibold text-slate-800 truncate">{prod.name}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600 shrink-0 tabular-nums">{unidades} un.</span>
                    </div>
                    <div className="mt-2.5 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                <Award size={28} className="text-slate-300" />
                <p className="text-sm font-medium">Sin ventas aún.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">Reposición de Stock</h3>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Productos que requieren atención inmediata.</p>
              </div>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full shrink-0">
              {bajoStockSafe.length} {bajoStockSafe.length === 1 ? "producto" : "productos"} por debajo del mínimo
            </span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1.5">
            {bajoStockSafe.length > 0 ? (
              bajoStockSafe.map((item, index) => {
                const stock = Number(item.stock) || 0;
                const sinStock = stock <= 0;
                const pct = Math.min(100, Math.max(0, Math.round((stock / maxStock) * 100)));
                return (
                  <div key={index} className="border border-slate-100 rounded-xl p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sinStock ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"}`}>
                          <AlertTriangle size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.nombre}</p>
                          <p className="text-[11px] text-slate-400 font-medium">Stock mínimo: {Number(item.stock_minimo || 0).toLocaleString("es-AR")} un.</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${sinStock ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                        {sinStock ? "Sin stock" : `Quedan ${Number(stock).toLocaleString("es-AR")} un.`}
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${sinStock ? "bg-red-500" : "bg-orange-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-emerald-600">
                <Award size={28} className="text-emerald-400" />
                <p className="text-sm font-semibold">Stock al día</p>
                <p className="text-xs text-slate-400">Todos los productos están por encima del mínimo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inicio;