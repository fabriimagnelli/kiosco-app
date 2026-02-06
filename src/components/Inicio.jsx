import React, { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, TrendingDown, AlertTriangle, TrendingUp, Award, PieChart as PieIcon, Download, RefreshCw, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function Inicio() {
  const [dashboard, setDashboard] = useState(null);
  const [ventasSemana, setVentasSemana] = useState([]);
  const [productosTop, setProductosTop] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  
  const [currentVersion, setCurrentVersion] = useState("1.0.0");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3001/api/dashboard")
      .then((res) => res.json())
      .then(setDashboard)
      .catch((err) => console.error("Error Dashboard:", err));

    fetch("http://localhost:3001/api/reportes/ventas_semana")
      .then((res) => res.json())
      .then(setVentasSemana)
      .catch((err) => console.error("Error Ventas Semana:", err));
    
    fetch("http://localhost:3001/api/reportes/productos_top")
      .then((res) => res.json())
      .then(setProductosTop)
      .catch((err) => console.error("Error Top Productos:", err));

    fetch("http://localhost:3001/api/reportes/metodos_pago")
      .then((res) => res.json())
      .then(setMetodosPago)
      .catch((err) => console.error("Error Metodos Pago:", err));
      
    checkVersionSystem();
  }, []);

  const checkVersionSystem = async () => {
    try {
        const resVer = await fetch("http://localhost:3001/api/system/version");
        const dataVer = await resVer.json();
        setCurrentVersion(dataVer.version || "1.0.0");
        const resCheck = await fetch("http://localhost:3001/api/system/check-update");
        const dataCheck = await resCheck.json();
        if (dataCheck.updateAvailable) setShowUpdateModal(true);
    } catch (error) { console.error("Error updates:", error); }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
        const res = await fetch("http://localhost:3001/api/system/update", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            alert(`Actualizado a ${data.new_version}. Recargando...`);
            window.location.reload();
        } else {
            alert("Error: " + (data.error || "Intente manualmente."));
            setUpdating(false);
        }
    } catch (error) {
        alert("Error de conexión.");
        setUpdating(false);
    }
  };

  const predictNextVersion = (ver) => {
      if(!ver) return "?.?.?";
      let parts = ver.split('.').map(Number);
      if(parts.length === 3) parts[2] += 1;
      return parts.join('.');
  };

  if (!dashboard) return <div className="p-10 text-center text-slate-500">Cargando tablero...</div>;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50 relative">
      
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

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><DollarSign size={28} /></div>
          <div><p className="text-slate-500 text-sm font-bold uppercase">Ventas Hoy</p><p className="text-2xl font-bold text-slate-800">$ {dashboard.ventas_hoy?.toLocaleString()}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><ShoppingCart size={28} /></div>
          <div><p className="text-slate-500 text-sm font-bold uppercase">Tickets Hoy</p><p className="text-2xl font-bold text-slate-800">{dashboard.tickets_hoy}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-red-100 p-3 rounded-xl text-red-600"><TrendingDown size={28} /></div>
          <div><p className="text-slate-500 text-sm font-bold uppercase">Gastos Hoy</p><p className="text-2xl font-bold text-slate-800">$ {dashboard.gastos_hoy?.toLocaleString()}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><AlertTriangle size={28} /></div>
          <div><p className="text-slate-500 text-sm font-bold uppercase">Stock Bajo</p><p className="text-2xl font-bold text-slate-800">{dashboard.bajo_stock?.length} Prod.</p></div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><TrendingUp className="text-blue-500"/> Evolución de Ventas (7 días)</h3>
            <div className="h-64 w-full">
                {ventasSemana.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ventasSemana}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}}/>
                            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400">Sin datos suficientes</div>}
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieIcon className="text-purple-500"/> Métodos de Pago</h3>
            <div className="flex-1 min-h-[200px] relative">
                 {metodosPago.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={metodosPago} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                                {metodosPago.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                 ) : <div className="h-full flex items-center justify-center text-slate-400">Sin ventas aún</div>}
            </div>
        </div>
      </div>

      {/* LISTAS INFERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Award className="text-yellow-500"/> Productos Más Vendidos</h3>
            <div className="space-y-3">
                {productosTop.map((prod, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? "bg-yellow-100 text-yellow-700" : index === 1 ? "bg-gray-200 text-gray-700" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-white border text-slate-500"}`}>{index + 1}</span>
                            <span className="font-medium text-slate-700">{prod.name}</span>
                        </div>
                        <span className="font-bold text-blue-600">{prod.value} un.</span>
                    </div>
                ))}
                {productosTop.length === 0 && <p className="text-slate-400 text-center py-4">Sin datos aún.</p>}
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500"/> Alerta de Reposición</h3>
            <div className="space-y-2 overflow-y-auto max-h-64 custom-scrollbar pr-2">
                {dashboard.bajo_stock?.length > 0 ? (
                    dashboard.bajo_stock.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border-b border-slate-50 last:border-0 hover:bg-red-50 transition-colors rounded">
                            <span className="text-slate-600 text-sm">{item.nombre}</span>
                            <span className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded-full">Quedan {item.stock}</span>
                        </div>
                    ))
                ) : <div className="flex flex-col items-center justify-center h-40 text-green-600 gap-2"><Award size={32}/><p>¡Stock Saludable!</p></div>}
            </div>
        </div>
      </div>

    </div>
  );
}

export default Inicio;