import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock,
  Package, AlertTriangle, Download, FileSpreadsheet, FileText, Calendar,
  DollarSign, BarChart3, PieChart as PieIcon, Activity, Archive,
  ChevronDown, RefreshCw, Filter, Printer, Search, Eye, ChevronRight, Receipt, MessageCircle, Trash2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { apiFetch } from "../lib/api";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// ─── Helpers ────────────────────────────────────────────────
const fmtMoney = (n) => {
  if (n == null) return "$0";
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const fmtPct = (actual, anterior) => {
  if (!anterior || anterior === 0) return actual > 0 ? "+100%" : "0%";
  const pct = ((actual - anterior) / anterior) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
};
const pctVal = (actual, anterior) => {
  if (!anterior || anterior === 0) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
};

// ─── Tab definitions ────────────────────────────────────────
const TABS = [
  { id: "historial", label: "Historial", icon: Receipt },
  { id: "comparativas", label: "Dashboard", icon: BarChart3 },
  { id: "rentabilidad", label: "Rentabilidad", icon: DollarSign },
  { id: "horas_pico", label: "Horas Pico", icon: Clock },
  { id: "tendencia", label: "Tendencia", icon: Activity },
  { id: "sin_movimiento", label: "Sin Movimiento", icon: Archive },
  { id: "exportar", label: "Exportar", icon: Download },
];

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════
function Reportes() {
  const [tab, setTab] = useState("historial");

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Header + Tabs */}
      <div className="px-6 pt-5 pb-0">
        <h2 className="text-2xl font-extrabold text-slate-800 mb-4 tracking-tight">Reportes y Análisis</h2>
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {tab === "historial" && <HistorialVentas />}
        {tab === "comparativas" && <DashboardComparativas />}
        {tab === "rentabilidad" && <Rentabilidad />}
        {tab === "horas_pico" && <HorasPico />}
        {tab === "tendencia" && <TendenciaMensual />}
        {tab === "sin_movimiento" && <SinMovimiento />}
        {tab === "exportar" && <ExportarReportes />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 27. DASHBOARD COMPARATIVAS
// ═══════════════════════════════════════════════════════════
function DashboardComparativas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    apiFetch("/api/reportes/comparativas")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  if (loading) return <Skeleton />;
  if (!data) return <ErrorMsg msg="No se pudieron cargar las comparativas" />;

  const periodos = [
    { key: "dia", label: "Hoy vs Ayer", iconActual: "Hoy", iconAnterior: "Ayer" },
    { key: "semana", label: "Semana actual vs Anterior", iconActual: "Esta semana", iconAnterior: "Semana anterior" },
    { key: "mes", label: "Mes actual vs Anterior", iconActual: "Este mes", iconAnterior: "Mes anterior" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Dashboard Comparativo</h3>
        <button onClick={cargar} className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-white">
          <RefreshCw size={18} />
        </button>
      </div>

      {periodos.map(({ key, label, iconActual, iconAnterior }) => {
        const d = data[key];
        const ventasPct = pctVal(d.actual.ventas, d.anterior.ventas);
        const ticketsPct = pctVal(d.actual.tickets, d.anterior.tickets);
        const gastosPct = pctVal(d.actual.gastos, d.anterior.gastos);
        const gananciActual = d.actual.ventas - d.actual.gastos;
        const gananciAnterior = d.anterior.ventas - d.anterior.gastos;

        return (
          <div key={key} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">{label}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ComparativeCard
                title="Ventas"
                actual={d.actual.ventas}
                anterior={d.anterior.ventas}
                pct={ventasPct}
                format="money"
                color="blue"
              />
              <ComparativeCard
                title="Tickets"
                actual={d.actual.tickets}
                anterior={d.anterior.tickets}
                pct={ticketsPct}
                format="number"
                color="indigo"
              />
              <ComparativeCard
                title="Gastos"
                actual={d.actual.gastos}
                anterior={d.anterior.gastos}
                pct={gastosPct}
                format="money"
                color="red"
                invertColor
              />
              <ComparativeCard
                title="Ganancia"
                actual={gananciActual}
                anterior={gananciAnterior}
                pct={pctVal(gananciActual, gananciAnterior)}
                format="money"
                color="green"
              />
            </div>
            {/* Mini bar chart */}
            <div className="mt-4 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: iconAnterior, ventas: d.anterior.ventas, gastos: d.anterior.gastos },
                  { name: iconActual, ventas: d.actual.ventas, gastos: d.actual.gastos },
                ]}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }} />
                  <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} name="Ventas" />
                  <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComparativeCard({ title, actual, anterior, pct, format, color, invertColor }) {
  const isPositive = invertColor ? pct <= 0 : pct >= 0;
  const Arrow = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  const val = format === "money" ? fmtMoney(actual) : actual;

  return (
    <div className="rounded-xl bg-slate-50 p-3 space-y-1">
      <p className="text-xs text-slate-500 font-medium">{title}</p>
      <p className={`text-xl font-bold text-${color}-600`}>{val}</p>
      <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
        <Arrow size={14} />
        <span>{fmtPct(actual, anterior)}</span>
        <span className="text-slate-400 font-normal ml-1">
          vs {format === "money" ? fmtMoney(anterior) : anterior}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 28. RENTABILIDAD POR PRODUCTO
// ═══════════════════════════════════════════════════════════
function Rentabilidad() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [ordenarPor, setOrdenarPor] = useState("ganancia_total");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");

  useEffect(() => {
    apiFetch("/api/reportes/rentabilidad")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categorias = useMemo(() => {
    if (!data) return [];
    const cats = [...new Set(data.productos.map((p) => p.categoria))];
    return ["Todas", ...cats];
  }, [data]);

  const productosFiltrados = useMemo(() => {
    if (!data) return [];
    let list = data.productos;
    if (categoriaFiltro !== "Todas") list = list.filter((p) => p.categoria === categoriaFiltro);
    if (filtro) list = list.filter((p) => p.nombre.toLowerCase().includes(filtro.toLowerCase()));
    list.sort((a, b) => b[ordenarPor] - a[ordenarPor]);
    return list;
  }, [data, filtro, ordenarPor, categoriaFiltro]);

  // Agrupar por categoría para pie chart
  const dataPie = useMemo(() => {
    if (!data) return [];
    const byCat = {};
    data.productos.forEach((p) => {
      if (!byCat[p.categoria]) byCat[p.categoria] = 0;
      byCat[p.categoria] += p.ganancia_total;
    });
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value: Math.max(value, 0) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (loading) return <Skeleton />;
  if (!data) return <ErrorMsg msg="No se pudieron cargar los datos de rentabilidad" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Ingresos Totales</p>
          <p className="text-2xl font-bold text-blue-600">{fmtMoney(data.totalIngresos)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Ganancia Total</p>
          <p className="text-2xl font-bold text-emerald-600">{fmtMoney(data.totalGanancia)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Margen Promedio</p>
          <p className="text-2xl font-bold text-amber-600">
            {data.totalIngresos > 0 ? ((data.totalGanancia / data.totalIngresos) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Pie Chart por categoría */}
      {dataPie.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h4 className="text-sm font-semibold text-slate-500 mb-3">Ganancia por Categoría</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {dataPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar producto..."
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
          >
            <option value="ganancia_total">Mayor ganancia total</option>
            <option value="margen_pct">Mayor margen %</option>
            <option value="margen">Mayor margen unitario</option>
            <option value="total_vendido">Más vendidos</option>
            <option value="ingresos_totales">Más ingresos</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 font-medium">Categoría</th>
                <th className="pb-2 font-medium text-right">Precio</th>
                <th className="pb-2 font-medium text-right">Costo</th>
                <th className="pb-2 font-medium text-right">Margen</th>
                <th className="pb-2 font-medium text-right">Margen %</th>
                <th className="pb-2 font-medium text-right">Vendidos</th>
                <th className="pb-2 font-medium text-right">Ganancia Total</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.slice(0, 50).map((p, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 font-medium text-slate-800">{p.nombre}</td>
                  <td className="py-2">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{p.categoria}</span>
                  </td>
                  <td className="py-2 text-right">{fmtMoney(p.precio)}</td>
                  <td className="py-2 text-right text-slate-500">{fmtMoney(p.costo)}</td>
                  <td className="py-2 text-right font-medium text-emerald-600">{fmtMoney(p.margen)}</td>
                  <td className="py-2 text-right">
                    <span className={`font-bold ${p.margen_pct > 30 ? "text-emerald-600" : p.margen_pct > 10 ? "text-amber-600" : "text-red-500"}`}>
                      {p.margen_pct}%
                    </span>
                  </td>
                  <td className="py-2 text-right">{p.total_vendido}</td>
                  <td className="py-2 text-right font-bold text-slate-800">{fmtMoney(p.ganancia_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {productosFiltrados.length > 50 && (
            <p className="text-xs text-slate-400 mt-2 text-center">Mostrando 50 de {productosFiltrados.length} productos</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 29. HORAS PICO
// ═══════════════════════════════════════════════════════════
function HorasPico() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  const cargar = (d) => {
    setLoading(true);
    apiFetch(`/api/reportes/horas_pico?dias=${d}`)
      .then((r) => r.json())
      .then((rows) => {
        // Fill all 24 hours
        const full = Array.from({ length: 24 }, (_, i) => {
          const found = rows.find((r) => r.hora === i);
          return { hora: i, label: `${String(i).padStart(2, "0")}:00`, tickets: found?.tickets || 0, total: found?.total || 0 };
        });
        setData(full);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(dias); }, [dias]);

  const maxHora = useMemo(() => data.reduce((max, d) => (d.total > max.total ? d : max), { total: 0 }), [data]);
  const totalVentas = data.reduce((s, d) => s + d.total, 0);
  const totalTickets = data.reduce((s, d) => s + d.tickets, 0);

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Reporte de Horas Pico</h3>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={dias}
          onChange={(e) => setDias(Number(e.target.value))}
        >
          <option value={7}>Últimos 7 días</option>
          <option value={15}>Últimos 15 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Hora Pico</p>
          <p className="text-2xl font-bold text-amber-600">{maxHora.label || "--:--"}</p>
          <p className="text-xs text-slate-400">{maxHora.tickets} tickets · {fmtMoney(maxHora.total)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Total Ventas período</p>
          <p className="text-2xl font-bold text-blue-600">{fmtMoney(totalVentas)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Total Tickets período</p>
          <p className="text-2xl font-bold text-indigo-600">{totalTickets}</p>
        </div>
      </div>

      {/* Gráfico de barras por hora */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h4 className="text-sm font-semibold text-slate-500 mb-3">Ventas por Hora del Día</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} interval={1} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => fmtMoney(v)} />
              <Tooltip
                formatter={(v, name) => [name === "total" ? fmtMoney(v) : v, name === "total" ? "Ventas" : "Tickets"]}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} name="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de tickets */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h4 className="text-sm font-semibold text-slate-500 mb-3">Tickets por Hora</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} interval={1} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }} />
              <Area type="monotone" dataKey="tickets" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla resumen top horas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h4 className="text-sm font-semibold text-slate-500 mb-3">Top Horarios</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...data].sort((a, b) => b.total - a.total).slice(0, 8).map((h, i) => (
            <div key={h.hora} className={`rounded-lg p-3 ${i === 0 ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${i === 0 ? "text-amber-600" : "text-slate-700"}`}>{h.label}</span>
                {i === 0 && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">PICO</span>}
              </div>
              <p className="text-sm text-slate-600">{fmtMoney(h.total)} · {h.tickets} tix</p>
              <div className="mt-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${i === 0 ? "bg-amber-500" : "bg-blue-500"}`}
                  style={{ width: `${maxHora.total > 0 ? (h.total / maxHora.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 31. TENDENCIA MENSUAL
// ═══════════════════════════════════════════════════════════
function TendenciaMensual() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/reportes/tendencia_mensual")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  const totalVentas = data.reduce((s, d) => s + d.ventas, 0);
  const totalGastos = data.reduce((s, d) => s + d.gastos, 0);
  const promedioMes = data.length > 0 ? totalVentas / data.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-lg font-bold text-slate-700">Tendencia Mensual (Últimos 12 meses)</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Ventas Totales</p>
          <p className="text-2xl font-bold text-blue-600">{fmtMoney(totalVentas)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Gastos Totales</p>
          <p className="text-2xl font-bold text-red-500">{fmtMoney(totalGastos)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Ganancia Neta</p>
          <p className={`text-2xl font-bold ${totalVentas - totalGastos >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtMoney(totalVentas - totalGastos)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Promedio/Mes</p>
          <p className="text-2xl font-bold text-indigo-600">{fmtMoney(promedioMes)}</p>
        </div>
      </div>

      {/* Gráfico principal de líneas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h4 className="text-sm font-semibold text-slate-500 mb-3">Evolución Ventas vs Gastos</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => fmtMoney(v)} />
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }} />
              <Legend />
              <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Ventas" />
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Gastos" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="ganancia" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Ganancia" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de barras de ganancia */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h4 className="text-sm font-semibold text-slate-500 mb-3">Ganancia Neta por Mes</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => fmtMoney(v)} />
              <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }} />
              <Bar dataKey="ganancia" name="Ganancia" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.ganancia >= 0 ? "#10b981" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 32. PRODUCTOS SIN MOVIMIENTO
// ═══════════════════════════════════════════════════════════
function SinMovimiento() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  const cargar = (d) => {
    setLoading(true);
    apiFetch(`/api/reportes/sin_movimiento?dias=${d}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(dias); }, [dias]);

  if (loading) return <Skeleton />;
  if (!data) return <ErrorMsg msg="No se pudieron cargar los datos" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Productos Sin Movimiento</h3>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={dias}
          onChange={(e) => { setDias(Number(e.target.value)); }}
        >
          <option value={15}>Sin ventas en 15 días</option>
          <option value={30}>Sin ventas en 30 días</option>
          <option value={60}>Sin ventas en 60 días</option>
          <option value={90}>Sin ventas en 90 días</option>
        </select>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-amber-600" />
            <p className="text-sm text-amber-700 font-medium">Productos Estancados</p>
          </div>
          <p className="text-3xl font-bold text-amber-700">{data.totalItems}</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={18} className="text-red-600" />
            <p className="text-sm text-red-700 font-medium">Capital Inmovilizado</p>
          </div>
          <p className="text-3xl font-bold text-red-700">{fmtMoney(data.capitalInmovilizado)}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Package size={18} className="text-slate-600" />
            <p className="text-sm text-slate-600 font-medium">Unidades en Stock</p>
          </div>
          <p className="text-3xl font-bold text-slate-700">
            {data.productos.reduce((s, p) => s + (p.stock || 0), 0)}
          </p>
        </div>
      </div>

      {/* Lista */}
      {data.productos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center text-slate-400">
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">¡No hay productos sin movimiento!</p>
          <p className="text-sm">Todos los productos se han vendido en los últimos {dias} días.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium text-right">Stock</th>
                  <th className="pb-2 font-medium text-right">Costo Unit.</th>
                  <th className="pb-2 font-medium text-right">Capital Retenido</th>
                  <th className="pb-2 font-medium text-right">Última Venta</th>
                  <th className="pb-2 font-medium text-right">Total Vendido</th>
                </tr>
              </thead>
              <tbody>
                {data.productos.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-800">{p.nombre}</td>
                    <td className="py-2.5">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{p.categoria}</span>
                    </td>
                    <td className="py-2.5 text-right font-medium">{p.stock}</td>
                    <td className="py-2.5 text-right text-slate-500">{fmtMoney(p.costo)}</td>
                    <td className="py-2.5 text-right font-bold text-red-600">{fmtMoney(p.stock * (p.costo || 0))}</td>
                    <td className="py-2.5 text-right text-slate-500">
                      {p.ultima_venta ? new Date(p.ultima_venta).toLocaleDateString("es-AR") : "Nunca"}
                    </td>
                    <td className="py-2.5 text-right">{p.total_vendido}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 30. EXPORTAR REPORTES A EXCEL/PDF
// ═══════════════════════════════════════════════════════════
function ExportarReportes() {
  const hoy = new Date().toISOString().split("T")[0];
  const primerDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [desde, setDesde] = useState(primerDia);
  const [hasta, setHasta] = useState(hoy);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const [resVentas, resBalance, resRentabilidad] = await Promise.all([
        apiFetch(`/api/reportes/ventas_rango?desde=${desde}&hasta=${hasta}`).then((r) => r.json()),
        apiFetch(`/api/balance_rango?desde=${desde}&hasta=${hasta}`).then((r) => r.json()),
        apiFetch("/api/reportes/rentabilidad").then((r) => r.json()),
      ]);
      setDatos({ ventas: resVentas, balance: resBalance, rentabilidad: resRentabilidad });
    } catch (e) {
      console.error(e);
      alert("Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  };

  // ── EXCEL: Ventas ──────────────────────────────────
  const exportarVentasExcel = () => {
    if (!datos) return;
    const ws = XLSX.utils.json_to_sheet(
      datos.ventas.ventas.map((v) => ({
        Ticket: v.ticket_id,
        Producto: v.producto,
        Cantidad: v.cantidad,
        "Precio Unit.": v.precio_unitario,
        Total: v.precio_total,
        "Método Pago": v.metodo_pago,
        Categoría: v.categoria,
        Fecha: new Date(v.fecha).toLocaleString("es-AR"),
        Descuento: v.descuento || 0,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");

    // Hoja resumen
    const wsResumen = XLSX.utils.json_to_sheet([
      { Concepto: "Total Ventas", Monto: datos.ventas.resumen.total_ventas },
      { Concepto: "Total Tickets", Monto: datos.ventas.resumen.total_tickets },
      { Concepto: "Efectivo", Monto: datos.ventas.resumen.total_efectivo },
      { Concepto: "Digital", Monto: datos.ventas.resumen.total_digital },
      { Concepto: "Total Gastos", Monto: datos.ventas.totalGastos },
      { Concepto: "Ganancia Neta", Monto: datos.ventas.resumen.total_ventas - datos.ventas.totalGastos },
    ]);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // Hoja gastos
    if (datos.ventas.gastos.length > 0) {
      const wsGastos = XLSX.utils.json_to_sheet(
        datos.ventas.gastos.map((g) => ({
          Descripción: g.descripcion,
          Monto: g.monto,
          Categoría: g.categoria,
          "Método Pago": g.metodo_pago,
          Fecha: new Date(g.fecha).toLocaleString("es-AR"),
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsGastos, "Gastos");
    }

    XLSX.writeFile(wb, `Ventas_${desde}_al_${hasta}.xlsx`);
  };

  // ── EXCEL: Balance ─────────────────────────────────
  const exportarBalanceExcel = () => {
    if (!datos) return;
    const b = datos.balance;
    const ws = XLSX.utils.json_to_sheet([
      { Tipo: "INGRESO", Concepto: "Ventas Kiosco (Efectivo)", Monto: b.ingresos?.kiosco_efvo || 0 },
      { Tipo: "INGRESO", Concepto: "Ventas Cigarrillos (Efectivo)", Monto: b.ingresos?.cigarros_efvo || 0 },
      { Tipo: "INGRESO", Concepto: "Ventas Digitales", Monto: b.ingresos?.digital || 0 },
      { Tipo: "INGRESO", Concepto: "Cobros Deudas", Monto: b.ingresos?.cobros_deuda || 0 },
      { Tipo: "INGRESO", Concepto: "TOTAL INGRESOS", Monto: b.total_ingresos || 0 },
      { Tipo: "", Concepto: "", Monto: "" },
      { Tipo: "EGRESO", Concepto: "Gastos Operativos", Monto: b.egresos?.gastos_varios || 0 },
      { Tipo: "EGRESO", Concepto: "Pagos Proveedores", Monto: b.egresos?.pagos_proveedores || 0 },
      { Tipo: "EGRESO", Concepto: "TOTAL EGRESOS", Monto: b.total_egresos || 0 },
      { Tipo: "", Concepto: "", Monto: "" },
      { Tipo: "RESULTADO", Concepto: "Balance Neto", Monto: b.balance || (b.total_ingresos - b.total_egresos) || 0 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance");
    XLSX.writeFile(wb, `Balance_${desde}_al_${hasta}.xlsx`);
  };

  // ── EXCEL: Rentabilidad ────────────────────────────
  const exportarRentabilidadExcel = () => {
    if (!datos) return;
    const ws = XLSX.utils.json_to_sheet(
      datos.rentabilidad.productos.map((p) => ({
        Producto: p.nombre,
        Categoría: p.categoria,
        Precio: p.precio,
        Costo: p.costo,
        "Margen $": p.margen,
        "Margen %": `${p.margen_pct}%`,
        "Uds. Vendidas": p.total_vendido,
        "Ganancia Total": p.ganancia_total,
        Stock: p.stock,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rentabilidad");
    XLSX.writeFile(wb, `Rentabilidad_Productos.xlsx`);
  };

  // ── PDF: Ventas completo ──────────────────────────
  const exportarVentasPDF = () => {
    if (!datos) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Ventas", 105, 18, null, null, "center");
    doc.setFontSize(11);
    doc.text(
      `Período: ${new Date(desde + "T00:00:00").toLocaleDateString("es-AR")} al ${new Date(hasta + "T00:00:00").toLocaleDateString("es-AR")}`,
      105, 26, null, null, "center"
    );
    doc.line(14, 30, 196, 30);

    // Resumen
    doc.setFontSize(13);
    doc.text("Resumen", 14, 38);
    autoTable(doc, {
      startY: 42,
      head: [["Concepto", "Valor"]],
      body: [
        ["Total Ventas", `$ ${datos.ventas.resumen.total_ventas?.toLocaleString()}`],
        ["Tickets", datos.ventas.resumen.total_tickets],
        ["Efectivo", `$ ${datos.ventas.resumen.total_efectivo?.toLocaleString()}`],
        ["Digital", `$ ${datos.ventas.resumen.total_digital?.toLocaleString()}`],
        ["Gastos", `$ ${datos.ventas.totalGastos?.toLocaleString()}`],
        ["Ganancia Neta", `$ ${(datos.ventas.resumen.total_ventas - datos.ventas.totalGastos)?.toLocaleString()}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    // Detalle ventas (top 100)
    const topVentas = datos.ventas.ventas.slice(0, 100);
    if (topVentas.length > 0) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.text("Detalle de Ventas", 14, finalY);
      autoTable(doc, {
        startY: finalY + 4,
        head: [["Ticket", "Producto", "Cant.", "Total", "Método", "Fecha"]],
        body: topVentas.map((v) => [
          v.ticket_id,
          v.producto?.substring(0, 25),
          v.cantidad,
          `$ ${v.precio_total?.toLocaleString()}`,
          v.metodo_pago,
          new Date(v.fecha).toLocaleDateString("es-AR"),
        ]),
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
      });
    }

    doc.save(`Ventas_${desde}_al_${hasta}.pdf`);
  };

  // ── PDF: Balance ───────────────────────────────────
  const exportarBalancePDF = () => {
    if (!datos) return;
    const doc = new jsPDF();
    const b = datos.balance;
    doc.setFontSize(20);
    doc.text("Balance General", 105, 18, null, null, "center");
    doc.setFontSize(11);
    doc.text(
      `Período: ${new Date(desde + "T00:00:00").toLocaleDateString("es-AR")} al ${new Date(hasta + "T00:00:00").toLocaleDateString("es-AR")}`,
      105, 26, null, null, "center"
    );
    doc.line(14, 30, 196, 30);

    doc.setFontSize(14);
    doc.setTextColor(0, 150, 0);
    doc.text("INGRESOS", 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [["Concepto", "Monto"]],
      body: [
        ["Ventas Kiosco (Efectivo)", `$ ${(b.ingresos?.kiosco_efvo || 0).toLocaleString()}`],
        ["Ventas Cigarrillos (Efectivo)", `$ ${(b.ingresos?.cigarros_efvo || 0).toLocaleString()}`],
        ["Ventas Digitales", `$ ${(b.ingresos?.digital || 0).toLocaleString()}`],
        ["Cobros Deudas", `$ ${(b.ingresos?.cobros_deuda || 0).toLocaleString()}`],
        ["TOTAL INGRESOS", `$ ${(b.total_ingresos || 0).toLocaleString()}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [46, 204, 113] },
    });

    const y2 = doc.lastAutoTable.finalY + 10;
    doc.setTextColor(200, 0, 0);
    doc.text("EGRESOS", 14, y2);
    autoTable(doc, {
      startY: y2 + 4,
      head: [["Concepto", "Monto"]],
      body: [
        ["Gastos Operativos", `$ ${(b.egresos?.gastos_varios || 0).toLocaleString()}`],
        ["Pagos Proveedores", `$ ${(b.egresos?.pagos_proveedores || 0).toLocaleString()}`],
        ["TOTAL EGRESOS", `$ ${(b.total_egresos || 0).toLocaleString()}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [231, 76, 60] },
    });

    const y3 = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    const neto = b.balance ?? (b.total_ingresos - b.total_egresos);
    doc.text(`RESULTADO: $ ${neto?.toLocaleString()}`, 105, y3, null, null, "center");
    doc.save(`Balance_${desde}_al_${hasta}.pdf`);
  };

  // ── PDF: Rentabilidad ──────────────────────────────
  const exportarRentabilidadPDF = () => {
    if (!datos) return;
    const doc = new jsPDF("landscape");
    doc.setFontSize(18);
    doc.text("Reporte de Rentabilidad por Producto", 148, 18, null, null, "center");
    doc.line(14, 22, 283, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Producto", "Categoría", "Precio", "Costo", "Margen", "Margen%", "Vendidos", "Ganancia"]],
      body: datos.rentabilidad.productos.slice(0, 80).map((p) => [
        p.nombre?.substring(0, 30),
        p.categoria,
        `$ ${p.precio?.toLocaleString()}`,
        `$ ${p.costo?.toLocaleString()}`,
        `$ ${p.margen?.toLocaleString()}`,
        `${p.margen_pct}%`,
        p.total_vendido,
        `$ ${p.ganancia_total?.toLocaleString()}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
    });
    doc.save(`Rentabilidad_Productos.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-lg font-bold text-slate-700">Exportar Reportes</h3>

      {/* Selector de rango */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <p className="text-sm text-slate-500 mb-3 font-medium">Seleccioná el período para los reportes de Ventas y Balance:</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Desde</label>
            <input
              type="date"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hasta</label>
            <input
              type="date"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <button
            onClick={cargar}
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:bg-slate-300 flex items-center gap-2"
          >
            {cargando ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {cargando ? "Cargando..." : "Cargar Datos"}
          </button>
        </div>
      </div>

      {/* Botones de exportación */}
      {datos ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* VENTAS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg"><BarChart3 size={20} className="text-blue-600" /></div>
              <div>
                <h4 className="font-bold text-slate-700">Reporte de Ventas</h4>
                <p className="text-xs text-slate-400">{datos.ventas.resumen.total_tickets} tickets · {fmtMoney(datos.ventas.resumen.total_ventas)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarVentasExcel} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button onClick={exportarVentasPDF} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <FileText size={16} /> PDF
              </button>
            </div>
          </div>

          {/* BALANCE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-lg"><DollarSign size={20} className="text-green-600" /></div>
              <div>
                <h4 className="font-bold text-slate-700">Balance General</h4>
                <p className="text-xs text-slate-400">Ingresos vs Egresos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarBalanceExcel} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button onClick={exportarBalancePDF} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <FileText size={16} /> PDF
              </button>
            </div>
          </div>

          {/* RENTABILIDAD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 p-2 rounded-lg"><TrendingUp size={20} className="text-amber-600" /></div>
              <div>
                <h4 className="font-bold text-slate-700">Rentabilidad</h4>
                <p className="text-xs text-slate-400">{datos.rentabilidad.productos.length} productos · {fmtMoney(datos.rentabilidad.totalGanancia)} ganancia</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarRentabilidadExcel} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button onClick={exportarRentabilidadPDF} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <FileText size={16} /> PDF
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center text-slate-400">
          <Download size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Cargá los datos primero</p>
          <p className="text-sm">Seleccioná un rango de fechas y hacé clic en "Cargar Datos"</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HISTORIAL DE VENTAS / TICKETS
// ═══════════════════════════════════════════════════════════
function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split("T")[0]);
  const [metodoFiltro, setMetodoFiltro] = useState("");
  const [ticketExpandido, setTicketExpandido] = useState(null);
  const [configNegocio, setConfigNegocio] = useState({ kiosco_nombre: "", kiosco_direccion: "", kiosco_telefono: "" });
  const [ticketAEliminar, setTicketAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    apiFetch("/api/config").then(r => r.json()).then(setConfigNegocio).catch(() => {});
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);
      if (metodoFiltro) params.append("metodo", metodoFiltro);
      if (busqueda) params.append("busqueda", busqueda);

      const res = await apiFetch(`/api/ventas/historial?${params.toString()}`);
      const data = await res.json();
      setVentas(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setVentas([]); }
    setLoading(false);
  };

  // Agrupar ventas por ticket_id
  const ticketsAgrupados = useMemo(() => {
    const agrupado = {};
    ventas.forEach(v => {
      if (!agrupado[v.ticket_id]) {
        agrupado[v.ticket_id] = {
          ticket_id: v.ticket_id,
          fecha: v.fecha,
          metodo_pago: v.metodo_pago,
          cliente: v.nombre_cliente || "Consumidor Final",
          notas: v.notas,
          items: [],
          total: 0,
          descuento: 0
        };
      }
      agrupado[v.ticket_id].items.push(v);
      agrupado[v.ticket_id].total += Number(v.precio_total) || 0;
      agrupado[v.ticket_id].descuento += Number(v.descuento_item) || 0;
    });
    // Ordenar por fecha descendente
    return Object.values(agrupado).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [ventas]);

  const imprimirTicket = (ticket) => {
    try {
      const anchoMM = 80;
      const doc = new jsPDF({ unit: "mm", format: [anchoMM, 250] });
      let y = 8;
      const margen = 4;

      const nombreNegocio = configNegocio.kiosco_nombre || "Mi Kiosco";
      const direccion = configNegocio.kiosco_direccion || "";
      const telefono = configNegocio.kiosco_telefono || "";

      // Encabezado
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(nombreNegocio.toUpperCase(), anchoMM / 2, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      if (direccion) { doc.text(direccion, anchoMM / 2, y, { align: "center" }); y += 3.5; }
      if (telefono) { doc.text(`Tel: ${telefono}`, anchoMM / 2, y, { align: "center" }); y += 3.5; }
      y += 1;
      doc.setLineWidth(0.3);
      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // Fecha y ticket
      doc.setFontSize(8);
      const fechaTicket = ticket.fecha ? new Date(ticket.fecha).toLocaleString("es-AR") : new Date().toLocaleString("es-AR");
      doc.text(`Fecha: ${fechaTicket}`, margen, y);
      y += 3.5;
      doc.setFont("helvetica", "bold");
      doc.text(`Ticket #${String(parseInt(ticket.ticket_id, 10) || ticket.ticket_id).padStart(4, '0')}`, margen, y);
      y += 4;
      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // Columnas
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Cant", margen, y);
      doc.text("Descripción", margen + 8, y);
      doc.text("P.Unit", anchoMM - margen - 18, y, { align: "right" });
      doc.text("Subtotal", anchoMM - margen, y, { align: "right" });
      y += 1;
      doc.line(margen, y, anchoMM - margen, y);
      y += 3;

      doc.setFont("helvetica", "normal");
      let subtotalGeneral = 0;
      ticket.items.forEach(item => {
        const cant = Number(item.cantidad) || 1;
        const precioUnit = Number(item.precio_unitario) || (Number(item.precio_total) / cant);
        const subtotal = Number(item.precio_total) || 0;
        subtotalGeneral += subtotal;

        doc.text(`${cant}`, margen + 2, y, { align: "center" });
        const nombre = (item.producto || "Producto").length > 20 ? (item.producto || "Producto").substring(0, 20) + ".." : (item.producto || "Producto");
        doc.text(nombre, margen + 8, y);
        doc.text(`$${precioUnit.toFixed(0)}`, anchoMM - margen - 18, y, { align: "right" });
        doc.text(`$${subtotal.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
        y += 3.5;

        if (Number(item.descuento_item) > 0) {
          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          doc.text(`  Dto: -$${Number(item.descuento_item).toFixed(0)}`, margen + 8, y);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
          y += 3;
        }
      });

      y += 1;
      doc.line(margen, y, anchoMM - margen, y);
      y += 4;

      // Total
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", margen, y);
      doc.text(`$${ticket.total.toFixed(0)}`, anchoMM - margen, y, { align: "right" });
      y += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Método de pago: ${ticket.metodo_pago}`, margen, y);
      y += 4;
      if (ticket.cliente !== "Consumidor Final") {
        doc.text(`Cliente: ${ticket.cliente}`, margen, y);
        y += 4;
      }
      if (ticket.notas && ticket.notas.trim()) {
        doc.setFontSize(7);
        doc.text("Notas:", margen, y); y += 3;
        const lineas = doc.splitTextToSize(ticket.notas, anchoMM - margen * 2);
        lineas.forEach(l => { doc.text(l, margen, y); y += 3; });
        y += 2;
      }

      doc.line(margen, y, anchoMM - margen, y);
      y += 4;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("¡Gracias por su compra!", anchoMM / 2, y, { align: "center" });
      y += 4;
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Documento no fiscal — Reimpresión", anchoMM / 2, y, { align: "center" });

      doc.internal.pageSize.height = y + 8;
      doc.save(`ticket_${ticket.ticket_id}.pdf`);
    } catch (e) { console.error("Error imprimiendo ticket:", e); }
  };

  const eliminarTicket = async (ticketId) => {
    setEliminando(true);
    try {
      const res = await apiFetch(`/api/ventas/${ticketId}`, { method: "DELETE" });
      if (res.ok) {
        setTicketAEliminar(null);
        cargarHistorial();
      } else {
        const data = await res.json();
        alert("Error al eliminar: " + (data.error || "Error desconocido"));
      }
    } catch (e) {
      console.error(e);
      alert("Error al eliminar el ticket");
    }
    setEliminando(false);
  };

  const metodoColor = (m) => {
    const map = { "Efectivo": "bg-green-100 text-green-700", "Mercado Pago": "bg-blue-100 text-blue-700", "Débito": "bg-purple-100 text-purple-700", "Transferencia": "bg-cyan-100 text-cyan-700", "Fiado": "bg-red-100 text-red-700", "Mixto": "bg-indigo-100 text-indigo-700" };
    return map[m] || "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-700">Historial de Ventas</h3>
        <button onClick={cargarHistorial} className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-white">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Desde</label>
            <input type="date" className="block w-full p-2 border rounded-lg text-sm" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Hasta</label>
            <input type="date" className="block w-full p-2 border rounded-lg text-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Método</label>
            <select className="block w-full p-2 border rounded-lg text-sm bg-white" value={metodoFiltro} onChange={e => setMetodoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Mercado Pago">Mercado Pago</option>
              <option value="Débito">Tarjetas</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Mixto">Mixto</option>
              <option value="Fiado">Cuenta Corriente</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase">Buscar</label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
              <Search size={14} className="text-slate-400" />
              <input type="text" placeholder="Producto o cliente..." className="w-full outline-none text-sm" value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => e.key === 'Enter' && cargarHistorial()} />
            </div>
          </div>
          <button onClick={cargarHistorial} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2">
            <Filter size={14} /> Filtrar
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      {ticketsAgrupados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
            <p className="text-2xl font-bold text-blue-600">{ticketsAgrupados.length}</p>
            <p className="text-xs text-slate-500">Tickets</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
            <p className="text-2xl font-bold text-green-600">{fmtMoney(ticketsAgrupados.reduce((s, t) => s + t.total, 0))}</p>
            <p className="text-xs text-slate-500">Total vendido</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-600">{fmtMoney(ticketsAgrupados.reduce((s, t) => s + t.total, 0) / ticketsAgrupados.length)}</p>
            <p className="text-xs text-slate-500">Ticket promedio</p>
          </div>
        </div>
      )}

      {/* Lista de tickets */}
      {loading ? (
        <Skeleton />
      ) : ticketsAgrupados.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center text-slate-400">
          <Receipt size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No hay ventas en este período</p>
          <p className="text-sm">Ajustá los filtros o el rango de fechas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ticketsAgrupados.map(ticket => {
            const expandido = ticketExpandido === ticket.ticket_id;
            return (
              <div key={ticket.ticket_id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-all">
                {/* Fila principal del ticket */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setTicketExpandido(expandido ? null : ticket.ticket_id)}
                >
                  <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandido ? "rotate-90" : ""}`} />
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-slate-800 min-w-[80px]">#{String(parseInt(ticket.ticket_id, 10) || ticket.ticket_id).padStart(4, '0')}</span>
                    <span className="text-sm text-slate-500">
                      {new Date(ticket.fecha).toLocaleDateString("es-AR")} {new Date(ticket.fecha).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${metodoColor(ticket.metodo_pago)}`}>
                      {ticket.metodo_pago}
                    </span>
                    {ticket.cliente !== "Consumidor Final" && (
                      <span className="text-xs text-slate-500">• {ticket.cliente}</span>
                    )}
                    <span className="text-xs text-slate-400">{ticket.items.length} item{ticket.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="font-bold text-lg text-slate-800">{fmtMoney(ticket.total)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); imprimirTicket(ticket); }}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Imprimir ticket"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setTicketAEliminar(ticket); }}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar ticket"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Detalle expandido */}
                {expandido && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 animate-in fade-in slide-in-from-top-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase">
                          <th className="text-left pb-2">Producto</th>
                          <th className="text-center pb-2">Cant</th>
                          <th className="text-right pb-2">P. Unit</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticket.items.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-200">
                            <td className="py-1.5 text-slate-700">{item.producto}</td>
                            <td className="py-1.5 text-center text-slate-600">{item.cantidad}</td>
                            <td className="py-1.5 text-right text-slate-600">{fmtMoney(item.precio_unitario || (item.precio_total / item.cantidad))}</td>
                            <td className="py-1.5 text-right font-medium text-slate-800">{fmtMoney(item.precio_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ticket.notas && (
                      <p className="mt-2 text-xs text-slate-500 italic">Notas: {ticket.notas}</p>
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setTicketAEliminar(ticket)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                      <button
                        onClick={() => {
                          const ticketNum = String(parseInt(ticket.ticket_id, 10) || ticket.ticket_id).padStart(4, '0');
                          const items = ticket.items.map(i => `  ${i.cantidad}x ${i.producto} $${Number(i.precio_total).toFixed(0)}`).join('\n');
                          const msg = `🧾 *Comprobante de compra*\n` +
                            `📍 ${configNegocio.kiosco_nombre || 'Mi Kiosco'}\n` +
                            `📅 ${new Date(ticket.fecha).toLocaleString('es-AR')}\n` +
                            `🎫 Ticket #${ticketNum}\n\n` +
                            `${items}\n\n` +
                            `💰 *TOTAL: ${fmtMoney(ticket.total)}*\n` +
                            `💳 Método: ${ticket.metodo_pago}\n` +
                            `\n¡Gracias por su compra!`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                      <button
                        onClick={() => imprimirTicket(ticket)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Printer size={14} /> Reimprimir Ticket
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {ticketAEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !eliminando && setTicketAEliminar(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Eliminar Ticket</h3>
                <p className="text-sm text-slate-500">#{String(parseInt(ticketAEliminar.ticket_id, 10) || ticketAEliminar.ticket_id).padStart(4, '0')}</p>
              </div>
            </div>
            <p className="text-slate-600 mb-2">
              ¿Estás seguro de que querés eliminar este ticket?
            </p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Total:</span>
                <span className="font-bold text-slate-800">{fmtMoney(ticketAEliminar.total)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Método:</span>
                <span className="text-slate-700">{ticketAEliminar.metodo_pago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items:</span>
                <span className="text-slate-700">{ticketAEliminar.items.length} producto{ticketAEliminar.items.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-4">
              ⚠️ Esta acción es irreversible. El stock de los productos será restaurado.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setTicketAEliminar(null)}
                disabled={eliminando}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarTicket(ticketAEliminar.ticket_id)}
                disabled={eliminando}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {eliminando ? (
                  <><RefreshCw size={14} className="animate-spin" /> Eliminando...</>
                ) : (
                  <><Trash2 size={14} /> Eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-2xl" />
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
      <p className="text-red-600 font-medium">{msg}</p>
    </div>
  );
}

export default Reportes;
