import React, { useState, useEffect } from "react";
import { User, Plus, Search, Trash2, Edit2, Phone, MapPin, Save, X, Eye, Calendar, Star, Gift, AlertTriangle, TrendingUp, Clock, Bell, DollarSign, CreditCard, Award, ChevronDown, ChevronUp, History, Shield, Percent, Loader2, CheckCircle } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useNotify } from "../context/NotificationContext";

// Formato de números en es-AR: separador de miles con punto y decimales con coma (ej: 1.000,00)
const fmtMonto = (n, dec = 2) => (Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtNro = (n) => (Number(n) || 0).toLocaleString("es-AR");

// La BD guarda las fechas en UTC (CURRENT_TIMESTAMP de SQLite). Se interpretan como UTC
// y se muestran convertidas a la hora local, así la hora coincide con la de la venta.
const parseFechaDB = (fecha) => {
  if (!fecha) return null;
  const texto = String(fecha);
  const iso = texto.includes("T") ? texto : texto.replace(" ", "T");
  const d = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtFecha = (fecha) => { const d = parseFechaDB(fecha); return d ? d.toLocaleDateString("es-AR") : "—"; };
const fmtHora = (fecha) => { const d = parseFechaDB(fecha); return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"; };

// Traduce un saldo con signo a algo entendible por el cajero: nunca se muestran números negativos
const formatearSaldo = (monto) => {
  const valor = monto || 0;
  if (valor > 0) return { texto: `$ ${fmtMonto(valor)}`, etiqueta: "Debe", clase: "text-red-600", claseBadge: "bg-red-100 text-red-600" };
  if (valor < 0) return { texto: `$ ${fmtMonto(Math.abs(valor))}`, etiqueta: "A favor", clase: "text-green-600", claseBadge: "bg-green-100 text-green-600" };
  return { texto: "$ 0,00", etiqueta: "Al día", clase: "text-slate-500", claseBadge: "bg-slate-100 text-slate-500" };
};

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const formatearPeriodo = (periodo) => {
  const [anio, mes] = String(periodo || "").split("-");
  if (!anio || !mes) return "Nunca";
  const idx = parseInt(mes, 10) - 1;
  return `${MESES[idx] || mes} ${anio}`;
};

function Deudores() {
  const { toast, confirmDialog } = useNotify();
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Form
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [limiteCredito, setLimiteCredito] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);

  // Modal detalle
  const [verHistorial, setVerHistorial] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);
  const [historialFiados, setHistorialFiados] = useState([]);
  const [historialPuntos, setHistorialPuntos] = useState([]);
  const [tabActiva, setTabActiva] = useState("fiados");

  // Pago
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [descripcionPago, setDescripcionPago] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [guardarExcedente, setGuardarExcedente] = useState(false); // si el excedente se acredita como saldo a favor

  // Puntos
  const [puntosConfig, setPuntosConfig] = useState({ puntos_por_peso: 1, puntos_valor_canje: 100, puntos_activos: false });
  const [mostrarConfigPuntos, setMostrarConfigPuntos] = useState(false);
  const [puntosACanjear, setPuntosACanjear] = useState("");
  const [ajustePuntos, setAjustePuntos] = useState("");
  const [ajusteDesc, setAjusteDesc] = useState("");

  // Alertas deudas
  const [alertasDeuda, setAlertasDeuda] = useState([]);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);

  // Recargo por mora
  const [mostrarRecargo, setMostrarRecargo] = useState(false);
  const [moraPorcentaje, setMoraPorcentaje] = useState("");
  const [aplicandoRecargo, setAplicandoRecargo] = useState(false);

  // Configuración recargo automático mensual
  const [moraActiva, setMoraActiva] = useState(false);
  const [moraDiaMes, setMoraDiaMes] = useState("1");
  const [moraUltimoPeriodo, setMoraUltimoPeriodo] = useState(null);
  const [guardandoMoraConfig, setGuardandoMoraConfig] = useState(false);

  // Orden
  const [ordenarPor, setOrdenarPor] = useState("nombre");

  useEffect(() => {
    cargarClientes();
    cargarConfigPuntos();
    cargarAlertasDeuda(7);
    cargarConfiguracionMora();
    verificarRecargoAutomatico();
  }, []);

  const cargarClientes = () => {
    apiFetch("/api/clientes")
      .then(r => r.json())
      .then(data => { 
        if (Array.isArray(data)) {
            setClientes(data);
        } else {
            console.error("Error desde el servidor al cargar clientes:", data);
            setClientes([]);
        }
        setLoading(false); 
      })
      .catch(err => {
          console.error("Error de red o parseo:", err);
          setClientes([]);
          setLoading(false);
      });
  };

  const cargarConfigPuntos = () => {
    apiFetch("/api/configuracion/puntos").then(r => r.json()).then(setPuntosConfig).catch(() => {});
  };

  const cargarAlertasDeuda = (dias) => {
    apiFetch(`/api/clientes/alertas/deudas?dias=${dias}`).then(r => r.json()).then(setAlertasDeuda).catch(() => {});
  };

  function cargarConfiguracionMora() {
    apiFetch("/api/clientes/configuracion_mora").then(r => r.json()).then(cfg => {
      if (!cfg || cfg.error) return;
      setMoraActiva(!!cfg.mora_activa);
      setMoraPorcentaje(cfg.mora_porcentaje ? String(cfg.mora_porcentaje) : "");
      setMoraDiaMes(cfg.mora_dia_mes ? String(cfg.mora_dia_mes) : "1");
      setMoraUltimoPeriodo(cfg.mora_ultimo_periodo || null);
    }).catch(() => {});
  }

  async function verificarRecargoAutomatico() {
    try {
      const res = await apiFetch("/api/fiados/recargo_mora/automatico", { method: "POST" });
      const data = await res.json();
      if (data.success && data.ejecutado) {
        toast(`Se aplicó el recargo mensual automático por mora a ${data.aplicados || 0} clientes${data.monto_total > 0 ? ` por $ ${fmtMonto(data.monto_total)}` : ""}.`, "ok");
        cargarClientes();
        cargarConfiguracionMora();
      }
    } catch (err) {
      console.error("Error verificando recargo automático:", err);
    }
  }

  async function guardarConfiguracionMora() {
    const p = parseFloat(moraPorcentaje);
    if (!moraPorcentaje || isNaN(p) || p <= 0 || p > 100) {
      toast("Ingresá un porcentaje válido (mayor a 0 y hasta 100)", "warn");
      return;
    }
    const dia = parseInt(moraDiaMes, 10);
    if (isNaN(dia) || dia < 1 || dia > 31) {
      toast("Ingresá un día del mes válido (1 a 31)", "warn");
      return;
    }
    setGuardandoMoraConfig(true);
    try {
      const res = await apiFetch("/api/clientes/configuracion_mora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mora_activa: moraActiva ? 1 : 0,
          mora_porcentaje: p,
          mora_dia_mes: dia,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast(moraActiva ? "Configuración de recargo automático guardada" : "Recargo automático desactivado", "ok");
        setMoraUltimoPeriodo(data.mora_ultimo_periodo || null);
      } else {
        toast("Error al guardar: " + (data.error || "Error desconocido"), "err");
      }
    } catch (err) {
      console.error("Error guardando configuración de recargo:", err);
      toast("Error de conexión al guardar la configuración.", "err");
    } finally {
      setGuardandoMoraConfig(false);
    }
  }

  async function aplicarRecargoMora() {
    const p = parseFloat(moraPorcentaje);
    if (!moraPorcentaje || isNaN(p) || p <= 0 || p > 100) {
      toast("Ingresá un porcentaje válido (mayor a 0 y hasta 100)", "warn");
      return;
    }
    if (clientesConDeuda.length === 0) {
      toast("No hay clientes con deuda activa para aplicar el recargo", "warn");
      return;
    }
    const ok = await confirmDialog(
      `¿Aplicar recargo del ${p}% por mora a todos los clientes con saldo deudor activo?\n\n` +
      `Clientes afectados: ${fmtNro(clientesConDeuda.length)}\nMonto total a sumar: $ ${fmtMonto(previewMontoTotal)}`
    );
    if (!ok) return;
    setAplicandoRecargo(true);
    try {
      const res = await apiFetch("/api/clientes/aplicar_mora_manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ porcentaje: p }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Recargo por mora aplicado a ${data.aplicados || 0} cuentas por $ ${fmtMonto(data.monto_total || 0)}`, "ok");
        setMostrarRecargo(false);
        cargarClientes();
      } else {
        toast("Error al aplicar: " + (data.error || "Error desconocido"), "err");
      }
    } catch (err) {
      console.error("Error aplicando recargo:", err);
      toast("Error de conexión al aplicar el recargo.", "err");
    } finally {
      setAplicandoRecargo(false);
    }
  }

  const prepararEdicion = (c) => {
    setNombre(c.nombre);
    setTelefono(c.telefono || "");
    setDireccion(c.direccion || "");
    setEmail(c.email || "");
    setLimiteCredito(c.limite_credito > 0 ? String(c.limite_credito) : "");
    setSaldoInicial("");
    setIdEdicion(c.id);
    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setNombre(""); setTelefono(""); setDireccion(""); setEmail(""); setLimiteCredito(""); setSaldoInicial("");
    setModoEdicion(false); setIdEdicion(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return toast("El nombre es obligatorio", "warn");
    const data = { nombre, telefono, direccion, email, limite_credito: parseFloat(limiteCredito) || 0, monto_ajuste: parseFloat(saldoInicial) || 0 };
    try {
      const url = modoEdicion ? `/api/clientes/${idEdicion}` : "/api/clientes";
      const method = modoEdicion ? "PUT" : "POST";
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.id || result.success) {
        toast(modoEdicion ? "Cliente actualizado correctamente" : "Cliente agregado correctamente", "ok");
        cargarClientes();
        cancelarEdicion();
      }
      else toast("Error al guardar", "err");
    } catch (err) { console.error(err); }
  };

  const eliminarCliente = async (id) => {
    if (!(await confirmDialog("¿Eliminar este cliente y todo su historial?"))) return;
    try {
      await apiFetch(`/api/clientes/${id}`, { method: "DELETE" });
      cargarClientes();
    } catch (err) { console.error(err); }
  };

  // --- Modal cliente ---
  const verDetalles = async (cliente) => {
    setClienteSel(cliente);
    setTabActiva("fiados");
    try {
      const [fiados, puntos] = await Promise.all([
        apiFetch(`/api/fiados/${cliente.id}`).then(r => r.json()),
        apiFetch(`/api/clientes/${cliente.id}/puntos`).then(r => r.json()),
      ]);
      setHistorialFiados(fiados);
      setHistorialPuntos(puntos);
      setVerHistorial(true);
    } catch (err) { console.error(err); }
  };

  const cerrarDetalles = () => {
    setVerHistorial(false); setClienteSel(null); setHistorialFiados([]); setHistorialPuntos([]);
    setMontoPago(""); setMetodoPago("Efectivo"); setDescripcionPago(""); setGuardarExcedente(false);
    setPuntosACanjear(""); setAjustePuntos(""); setAjusteDesc("");
  };

  const eliminarFiado = async (fiadoId) => {
    if (!(await confirmDialog("¿Eliminar esta transacción? La deuda volverá al estado anterior."))) return;
    try {
      const res = await apiFetch(`/api/fiados/${fiadoId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        const nuevosFiados = await apiFetch(`/api/fiados/${clienteSel.id}`).then(r => r.json());
        setHistorialFiados(nuevosFiados);
        cargarClientes();
      } else {
        toast("Error al eliminar la transacción", "err");
      }
    } catch (err) { console.error(err); toast("Error al eliminar", "err"); }
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    const montoPagoNum = parseFloat(montoPago) || 0;
    if (!montoPago || montoPagoNum <= 0) return toast("Ingresa un monto válido mayor a 0", "warn");

    // Si el cliente entrega de más y no se guarda como saldo a favor, solo se cancela la deuda (el resto es vuelto en mano)
    const hayExcedente = montoPagoNum > deudaActualSel;
    const montoARegistrar = (hayExcedente && !guardarExcedente) ? deudaActualSel : montoPagoNum;

    setProcesandoPago(true);
    try {
      const res = await apiFetch("/api/fiados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteSel.id, monto: -montoARegistrar, descripcion: descripcionPago || "Pago de deuda", metodo_pago: metodoPago })
      });
      const data = await res.json();
      if (data.id || data.success) {
        toast("Pago registrado", "ok");
        const nuevosFiados = await apiFetch(`/api/fiados/${clienteSel.id}`).then(r => r.json());
        setHistorialFiados(nuevosFiados);
        cargarClientes();
        setMontoPago(""); setDescripcionPago(""); setGuardarExcedente(false);
      }
    } catch (err) { console.error(err); toast("Error al registrar pago", "err"); }
    finally { setProcesandoPago(false); }
  };

  // --- Puntos ---
  const canjearPuntos = async () => {
    const pts = parseInt(puntosACanjear);
    if (!pts || pts <= 0) return toast("Ingresá una cantidad válida de puntos", "warn");
    if (pts > (clienteSel?.puntos || 0)) return toast("Puntos insuficientes", "warn");
    try {
      const res = await apiFetch(`/api/clientes/${clienteSel.id}/canjear_puntos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntos: pts })
      });
      const data = await res.json();
      if (data.success) {
        toast(`Canjeados ${pts} puntos = $ ${fmtMonto(data.descuento)} de descuento`, "ok");
        setPuntosACanjear("");
        cargarClientes();
        const histPts = await apiFetch(`/api/clientes/${clienteSel.id}/puntos`).then(r => r.json());
        setHistorialPuntos(histPts);
        setClienteSel(prev => ({ ...prev, puntos: data.puntos_restantes }));
      } else { toast(data.error || "Error al canjear", "err"); }
    } catch (err) { console.error(err); }
  };

  const ajustarPuntos = async () => {
    const pts = parseInt(ajustePuntos);
    if (!pts) return toast("Ingresá una cantidad válida", "warn");
    try {
      await apiFetch(`/api/clientes/${clienteSel.id}/ajustar_puntos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntos: pts, descripcion: ajusteDesc || "Ajuste manual" })
      });
      setAjustePuntos(""); setAjusteDesc("");
      cargarClientes();
      const histPts = await apiFetch(`/api/clientes/${clienteSel.id}/puntos`).then(r => r.json());
      setHistorialPuntos(histPts);
      setClienteSel(prev => ({ ...prev, puntos: Math.max(0, (prev.puntos || 0) + pts) }));
    } catch (err) { console.error(err); }
  };

  const guardarConfigPuntos = async () => {
    try {
      await apiFetch("/api/configuracion/puntos", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(puntosConfig)
      });
      toast("Configuración de puntos guardada", "ok");
    } catch (err) { console.error(err); }
  };

  // Filtrado y ordenamiento
  const clientesFiltrados = clientes
    .filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.telefono || "").includes(busqueda))
    .sort((a, b) => {
      if (ordenarPor === "deuda") return (b.total_deuda || 0) - (a.total_deuda || 0);
      if (ordenarPor === "puntos") return (b.puntos || 0) - (a.puntos || 0);
      if (ordenarPor === "gastado") return (b.total_gastado || 0) - (a.total_gastado || 0);
      return a.nombre.localeCompare(b.nombre);
    });

  const deudaActualSel = historialFiados.reduce((acc, m) => acc + m.monto, 0);

  // Vista previa del recargo, calculada localmente sobre el listado de clientes
  const clientesConDeuda = clientes.filter(c => (c.total_deuda || 0) > 0);
  const pctRecargo = parseFloat(moraPorcentaje);
  const previewValido = moraPorcentaje !== "" && !isNaN(pctRecargo) && pctRecargo > 0 && pctRecargo <= 100;
  const previewMontoTotal = previewValido
    ? clientesConDeuda.reduce((acc, c) => acc + (c.total_deuda || 0) * (pctRecargo / 100), 0)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
            <User className="text-blue-600" size={32} /> Clientes y Fidelización
          </h1>
          <p className="text-slate-500 mt-1">Gestiona clientes, créditos, puntos y deudas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Alerta deudas */}
          <button
            onClick={() => { cargarAlertasDeuda(diasAlerta); setMostrarAlertas(!mostrarAlertas); }}
            className={`relative px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all text-sm ${alertasDeuda.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            <Bell size={16} /> Deudas Vencidas
            {alertasDeuda.length > 0 && (
              <span className="bg-white text-red-600 text-xs font-black px-1.5 py-0.5 rounded-full">{alertasDeuda.length}</span>
            )}
          </button>
          {/* Config puntos */}
          <button
            onClick={() => setMostrarConfigPuntos(!mostrarConfigPuntos)}
            className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all text-sm ${puntosConfig.puntos_activos ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
          >
            <Star size={16} /> Puntos {puntosConfig.puntos_activos ? 'ON' : 'OFF'}
          </button>
          {/* Aplicar recargo por mora */}
          <button
            onClick={() => setMostrarRecargo(!mostrarRecargo)}
            className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all text-sm ${mostrarRecargo ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Percent size={16} /> Recargo por Mora
          </button>
        </div>
      </div>

      {/* PANEL ALERTAS DEUDAS */}
      {mostrarAlertas && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18} /> Deudas que superan</h3>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={diasAlerta} onChange={e => setDiasAlerta(e.target.value)}
                className="w-16 p-1.5 text-sm border border-red-300 rounded-lg text-center focus:ring-2 focus:ring-red-400 outline-none" />
              <span className="text-red-700 text-sm font-medium">días</span>
              <button onClick={() => cargarAlertasDeuda(diasAlerta)} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 font-bold">Buscar</button>
            </div>
          </div>
          {alertasDeuda.length === 0 ? (
            <p className="text-red-500 text-sm">No hay deudas que superen {diasAlerta} días. ¡Todo al día!</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alertasDeuda.map(a => (
                <div key={a.id} className="bg-white border border-red-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700">{a.nombre}</span>
                    {a.telefono && <span className="text-slate-400 text-xs ml-2"><Phone size={10} className="inline" /> {a.telefono}</span>}
                    <div className="text-xs text-red-500 mt-0.5">
                      <Clock size={10} className="inline" /> Primer fiado: {new Date(a.fiado_mas_antiguo).toLocaleDateString('es-AR')} ({a.dias_desde_primer_fiado} días)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-red-600 text-lg">$ {fmtMonto(a.total_deuda)}</span>
                    {a.limite_credito > 0 && a.total_deuda > a.limite_credito && (
                      <div className="text-[10px] text-red-500 font-bold">EXCEDE LÍMITE (${fmtNro(a.limite_credito)})</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PANEL CONFIG PUNTOS */}
      {mostrarConfigPuntos && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-top duration-200">
          <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3"><Star size={18} /> Configuración del Sistema de Puntos</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">Sistema Activo</label>
              <button
                onClick={() => setPuntosConfig(p => ({ ...p, puntos_activos: !p.puntos_activos }))}
                className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${puntosConfig.puntos_activos ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}
              >
                {puntosConfig.puntos_activos ? '✓ ACTIVADO' : 'DESACTIVADO'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">1 punto cada $</label>
              <input type="number" step="0.01" min="0.01" value={puntosConfig.puntos_por_peso}
                onChange={e => setPuntosConfig(p => ({ ...p, puntos_por_peso: e.target.value }))}
                className="w-full p-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm" />
              <p className="text-[10px] text-amber-600 mt-1">Ej: 100 = 1 punto por cada $100 gastados</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">Valor canje (puntos por $1)</label>
              <input type="number" step="1" min="1" value={puntosConfig.puntos_valor_canje}
                onChange={e => setPuntosConfig(p => ({ ...p, puntos_valor_canje: e.target.value }))}
                className="w-full p-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm" />
              <p className="text-[10px] text-amber-600 mt-1">Ej: 100 = cada 100 puntos = $1 de descuento</p>
            </div>
            <button onClick={guardarConfigPuntos} className="py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 text-sm">
              Guardar Config
            </button>
          </div>
        </div>
      )}

      {/* MODAL RECARGO POR MORA */}
      {mostrarRecargo && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-blue-800 flex items-center gap-2"><Percent size={18} /> Aplicar Recargo por Mora</h3>
            <button type="button" onClick={() => setMostrarRecargo(false)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-100 hover:text-blue-600 transition-colors" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          {/* Fila 1: porcentaje + aplicar manual */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-blue-700 mb-1">Porcentaje de recargo (%)</label>
              <input
                type="number" step="0.1" min="0.1" max="100" placeholder="Ej: 5 o 10"
                value={moraPorcentaje} onChange={e => setMoraPorcentaje(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold" />
            </div>
            <button
              type="button" onClick={aplicarRecargoMora} disabled={aplicandoRecargo || !previewValido || clientesConDeuda.length === 0}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 text-sm transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
            >
              {aplicandoRecargo ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {aplicandoRecargo ? "Aplicando..." : "Aplicar Recargo (Manual)"}
            </button>
          </div>

          {/* Fila 2: automatización mensual + guardar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-4 border-t border-blue-200 pt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMoraActiva(a => !a)}
                aria-pressed={moraActiva}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${moraActiva ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${moraActiva ? 'translate-x-5' : ''}`} />
              </button>
              <div>
                <p className="text-sm font-bold text-slate-700">Aplicar automáticamente cada mes</p>
                <p className="text-[11px] text-slate-500">Se ejecuta solo el día indicado, una sola vez por mes.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 mb-1">Día del mes (1 a 31)</label>
              <input
                type="number" min="1" max="31" value={moraDiaMes}
                onChange={e => setMoraDiaMes(e.target.value)} disabled={!moraActiva}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
              <p className="text-[10px] text-blue-600 mt-1">Día en que se aplica el recargo (ej: 10 para cada día 10)</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button" onClick={guardarConfiguracionMora} disabled={guardandoMoraConfig}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 text-blue-700 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
              >
                {guardandoMoraConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar Configuración
              </button>
            </div>
          </div>

          {/* Fila 3: estado + vista previa local */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-blue-200 pt-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                Última ejecución automática: {moraUltimoPeriodo ? formatearPeriodo(moraUltimoPeriodo) : 'Nunca'}
              </span>
              <span className={`px-3 py-1.5 rounded-full font-bold ${moraActiva ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {moraActiva ? `Próxima ejecución programada: Día ${moraDiaMes || '…'}` : 'Recargo automático desactivado'}
              </span>
            </div>
            <div className="flex-1 min-w-[220px] rounded-xl bg-white border border-blue-200 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 flex items-center gap-1 mb-2">
                <Eye size={12} /> Vista Previa
              </p>
              {previewValido ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600">Clientes afectados</p>
                    <p className="text-2xl font-black text-blue-800">{fmtNro(clientesConDeuda.length)}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600">Monto total a sumar</p>
                    <p className="text-2xl font-black text-blue-800">$ {fmtMonto(previewMontoTotal)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Ingresá un porcentaje válido (1 a 100) para ver la proyección.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESUMEN RÁPIDO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-1"><User size={16} className="text-blue-500" /><p className="text-xs text-blue-600 font-normal">Total Clientes</p></div>
          <p className="text-2xl font-semibold text-blue-700">{fmtNro(clientes.length)}</p>
          <p className="text-[11px] text-blue-400 mt-1 font-light">{fmtNro(clientes.filter(c => c.total_deuda > 0).length)} con deuda</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-red-500" /><p className="text-xs text-red-600 font-normal">Deuda Total</p></div>
          <p className="text-2xl font-semibold text-red-700">$ {fmtMonto(clientes.reduce((a, c) => a + Math.max(0, c.total_deuda || 0), 0))}</p>
          <p className="text-[11px] text-red-400 mt-1 font-light">{fmtNro(clientes.filter(c => c.total_deuda > 0).length)} clientes</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-emerald-500" /><p className="text-xs text-emerald-600 font-normal">Total Vendido</p></div>
          <p className="text-2xl font-semibold text-emerald-700">$ {fmtMonto(clientes.reduce((a, c) => a + (c.total_gastado || 0), 0))}</p>
          <p className="text-[11px] text-emerald-400 mt-1 font-light">{fmtNro(clientes.reduce((a, c) => a + (c.total_compras || 0), 0))} compras</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Star size={16} className="text-amber-500" /><p className="text-xs text-amber-600 font-normal">Puntos Totales</p></div>
          <p className="text-2xl font-semibold text-amber-700">{fmtNro(clientes.reduce((a, c) => a + (c.puntos || 0), 0))}</p>
          <p className="text-[11px] text-amber-400 mt-1 font-light">{fmtNro(clientes.filter(c => (c.puntos || 0) > 0).length)} con puntos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========= FORMULARIO ========= */}
        <div className="lg:col-span-1">
          <div className={`p-6 rounded-xl shadow-sm border sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto transition-all ${modoEdicion ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? 'text-blue-700' : 'text-slate-700'}`}>
              {modoEdicion ? <Edit2 size={20} /> : <Plus size={20} className="text-blue-500" />}
              {modoEdicion ? 'Editando Cliente' : 'Nuevo Cliente'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Completo *</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input autoFocus={modoEdicion} className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nombre del cliente" value={nombre} onChange={e => setNombre(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="381..." value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Domicilio" value={direccion} onChange={e => setDireccion(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Límite de Crédito</label>
                <div className="relative">
                  <Shield size={14} className="absolute left-3 top-2.5 text-orange-400" />
                  <input type="number" step="0.01" min="0" className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none" placeholder="0 = sin límite" value={limiteCredito} onChange={e => setLimiteCredito(e.target.value)} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Máximo de fiado permitido. 0 o vacío = ilimitado.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cargar Deuda / Traspaso</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-2.5 text-blue-400" />
                  <input type="number" step="0.01" min="0" className="w-full pl-9 p-2 border border-blue-200 text-blue-700 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Monto a sumar a la deuda..." value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Monto que se suma a la deuda (al crear o editar el cliente).</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className={`flex-1 py-3 font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 text-white ${modoEdicion ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                  {modoEdicion ? <Save size={18} /> : <Plus size={18} />}
                  {modoEdicion ? 'GUARDAR CAMBIOS' : 'AGREGAR CLIENTE'}
                </button>
                {modoEdicion && (
                  <button type="button" onClick={cancelarEdicion} className="px-4 py-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-bold"><X size={20} /></button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ========= LISTADO ========= */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* BUSCADOR + ORDENAR */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
              <Search className="text-slate-400" size={18} />
              <input className="bg-transparent outline-none w-full text-sm" placeholder="Buscar por nombre o teléfono..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              {busqueda && <button onClick={() => setBusqueda("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 font-medium focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="nombre">Ordenar: Nombre</option>
              <option value="deuda">Ordenar: Mayor Deuda</option>
              <option value="puntos">Ordenar: Más Puntos</option>
              <option value="gastado">Ordenar: Más Gastado</option>
            </select>
          </div>

          {/* TABLA */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[50vh] md:max-h-[600px]">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-4 border-b border-slate-200 bg-slate-50">Cliente</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Compras</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Deuda</th>
                    {puntosConfig.puntos_activos && <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Puntos</th>}
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={puntosConfig.puntos_activos ? 5 : 4} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                  ) : clientesFiltrados.length === 0 ? (
                    <tr><td colSpan={puntosConfig.puntos_activos ? 5 : 4} className="p-8 text-center text-slate-400">No se encontraron clientes.</td></tr>
                  ) : clientesFiltrados.map(c => (
                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.limite_credito > 0 && c.total_deuda > c.limite_credito ? 'bg-red-50' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                            {c.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-700 truncate">{c.nombre}</div>
                            <div className="text-xs text-slate-400 flex gap-2">
                              {c.telefono && <span><Phone size={10} className="inline" /> {c.telefono}</span>}
                              {c.direccion && <span><MapPin size={10} className="inline" /> {c.direccion}</span>}
                            </div>
                            {c.limite_credito > 0 && (
                              <div className="text-[10px] text-orange-500 font-medium mt-0.5">
                                <Shield size={10} className="inline" /> Límite: ${fmtNro(c.limite_credito)}
                                {c.total_deuda > c.limite_credito && <span className="text-red-600 font-bold ml-1">EXCEDIDO</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-slate-700 font-bold">{fmtNro(c.total_compras)}</div>
                        <div className="text-[10px] text-green-500">${fmtNro(c.total_gastado)}</div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-bold px-2 py-1 rounded text-sm ${formatearSaldo(c.total_deuda).claseBadge}`}>
                          {formatearSaldo(c.total_deuda).texto}
                        </span>
                        {c.total_deuda < 0 && (
                          <div className="text-[9px] text-green-500 font-medium mt-0.5">A favor</div>
                        )}
                      </td>
                      {puntosConfig.puntos_activos && (
                        <td className="p-4 text-center">
                          <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                            <Star size={12} className="fill-amber-400 text-amber-400" /> {fmtNro(c.puntos)}
                          </span>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => verDetalles(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Ver Detalle"><Eye size={16} /></button>
                          <button onClick={() => prepararEdicion(c)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-full transition-colors" title="Editar"><Edit2 size={16} /></button>
                          <button onClick={() => eliminarCliente(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-4 py-2 border-t text-xs text-slate-500 flex justify-between">
              <span>{fmtNro(clientesFiltrados.length)} de {fmtNro(clientes.length)} clientes</span>
              <span className="text-red-500 font-medium">{fmtNro(clientes.filter(c => c.total_deuda > 0).length)} con deuda</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODAL DETALLE CLIENTE ==================== */}
      {verHistorial && clienteSel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

            {/* CABECERA */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">{clienteSel.nombre.charAt(0).toUpperCase()}</div>
                    {clienteSel.nombre}
                  </h2>
                  <p className="text-slate-500 text-xs mt-1 flex gap-4 ml-12">
                    {clienteSel.telefono && <span><Phone size={10} className="inline" /> {clienteSel.telefono}</span>}
                    {clienteSel.direccion && <span><MapPin size={10} className="inline" /> {clienteSel.direccion}</span>}
                    {clienteSel.limite_credito > 0 && <span className="text-orange-500"><Shield size={10} className="inline" /> Límite: ${fmtNro(clienteSel.limite_credito)}</span>}
                  </p>
                </div>
                <div className="flex gap-3 text-right">
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Saldo</p>
                    <p className={`text-xl font-black ${formatearSaldo(deudaActualSel).clase}`}>
                      {formatearSaldo(deudaActualSel).texto}
                    </p>
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${formatearSaldo(deudaActualSel).clase} opacity-70`}>
                      {formatearSaldo(deudaActualSel).etiqueta}
                    </p>
                  </div>
                  {puntosConfig.puntos_activos && (
                    <div>
                      <p className="text-[10px] uppercase text-amber-400 font-bold">Puntos</p>
                      <p className="text-xl font-black text-amber-600 flex items-center gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" /> {fmtNro(clienteSel.puntos)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* TABS */}
              <div className="flex gap-1 mt-4 ml-12">
                {[
                  { key: "fiados", label: "Fiados", icon: CreditCard },
                  ...(puntosConfig.puntos_activos ? [{ key: "puntos", label: "Puntos", icon: Star }] : [])
                ].map(tab => (
                  <button key={tab.key}
                    onClick={() => setTabActiva(tab.key)}
                    className={`px-4 py-2 rounded-t-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${tabActiva === tab.key ? 'bg-white text-blue-700 border border-b-white border-slate-200 -mb-[1px] z-10' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTENIDO TABS */}
            <div className="flex-1 overflow-y-auto">

              {/* TAB: FIADOS */}
              {tabActiva === "fiados" && (
                <div>
                  {historialFiados.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No hay movimientos de fiados.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3">Método</th>
                          <th className="p-3 text-right">Monto</th>
                          <th className="p-3 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {historialFiados.map(mov => (
                          <tr key={mov.id} className="hover:bg-slate-50 group">
                            <td className="p-3 text-slate-500 text-xs">
                              {fmtFecha(mov.fecha)}
                              <span className="block text-[10px] opacity-50">{fmtHora(mov.fecha)}</span>
                            </td>
                            <td className="p-3 font-medium text-slate-700">{mov.descripcion}</td>
                            <td className="p-3 text-slate-500 text-xs">{mov.metodo_pago}</td>
                            <td className="p-3 text-right font-bold">
                              {mov.monto > 0 ? (
                                <span className="text-red-600">+ ${fmtMonto(mov.monto)}</span>
                              ) : (
                                <span className="text-green-600">- ${fmtMonto(Math.abs(mov.monto))}</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => eliminarFiado(mov.id)}
                                className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                title="Eliminar transacción"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB: PUNTOS */}
              {tabActiva === "puntos" && puntosConfig.puntos_activos && (
                <div>
                  {/* Canjear / Ajustar */}
                  <div className="p-4 bg-amber-50 border-b border-amber-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Canjear */}
                      <div className="bg-white rounded-lg border border-amber-200 p-3">
                        <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><Gift size={14} /> Canjear Puntos</h4>
                        <div className="flex gap-2">
                          <input type="number" min="1" placeholder={`Max: ${fmtNro(clienteSel.puntos)}`} value={puntosACanjear} onChange={e => setPuntosACanjear(e.target.value)}
                            className="flex-1 p-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" />
                          <button onClick={canjearPuntos} disabled={!puntosACanjear || parseInt(puntosACanjear) <= 0}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 disabled:opacity-50">
                            Canjear
                          </button>
                        </div>
                        {puntosACanjear > 0 && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            = ${fmtMonto(parseInt(puntosACanjear) / (parseFloat(puntosConfig.puntos_valor_canje) || 100))} de descuento
                          </p>
                        )}
                      </div>
                      {/* Ajuste manual */}
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Award size={14} /> Ajuste Manual</h4>
                        <div className="flex gap-2">
                          <input type="number" placeholder="+/- puntos" value={ajustePuntos} onChange={e => setAjustePuntos(e.target.value)}
                            className="w-24 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-400 outline-none" />
                          <input type="text" placeholder="Motivo..." value={ajusteDesc} onChange={e => setAjusteDesc(e.target.value)}
                            className="flex-1 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-slate-400 outline-none" />
                          <button onClick={ajustarPuntos} disabled={!ajustePuntos}
                            className="px-3 py-2 bg-slate-600 text-white rounded-lg font-bold text-xs hover:bg-slate-700 disabled:opacity-50">
                            Ajustar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Historial */}
                  {historialPuntos.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">Sin movimientos de puntos.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-500 text-xs uppercase sticky top-0">
                        <tr>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Descripción</th>
                          <th className="p-3 text-right">Puntos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {historialPuntos.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500 text-xs">{new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${h.tipo === 'compra' ? 'bg-green-100 text-green-700' : h.tipo === 'canje' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {h.tipo === 'compra' ? 'Compra' : h.tipo === 'canje' ? 'Canje' : 'Ajuste'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 text-xs">{h.descripcion}</td>
                            <td className="p-3 text-right font-bold">
                              <span className={h.puntos > 0 ? 'text-green-600' : 'text-red-600'}>
                                {h.puntos > 0 ? '+' : ''}{fmtNro(h.puntos)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* PIE: FORMULARIO DE PAGO */}
            <div className="p-5 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 rounded-b-2xl space-y-3">
              {deudaActualSel > 0 && (
                <form onSubmit={registrarPago} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Monto a Pagar</label>
                      <div className="relative flex gap-1.5">
                        <div className="relative flex-1">
                          <DollarSign size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                          <input type="number" step="0.01" min="0" placeholder="0.00" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                            className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" disabled={procesandoPago} />
                        </div>
                        <button type="button" onClick={() => setMontoPago(String(deudaActualSel.toFixed(2)))} disabled={procesandoPago}
                          className="px-2.5 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors disabled:opacity-50 whitespace-nowrap">
                          Pagar Total
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Método</label>
                      <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" disabled={procesandoPago}>
                        <option value="Efectivo">Efectivo</option>
                        <option value="MercadoPago">Mercado Pago</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Descripción</label>
                      <input type="text" placeholder="Pago parcial..." value={descripcionPago} onChange={e => setDescripcionPago(e.target.value)}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" disabled={procesandoPago} />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-sm">
                      {montoPago && parseFloat(montoPago) > 0 && (() => {
                        const montoPagoNum = parseFloat(montoPago);
                        const excedente = montoPagoNum - deudaActualSel;
                        if (montoPagoNum < deudaActualSel) {
                          return (
                            <span className="font-bold text-red-600">
                              Pago: ${fmtMonto(montoPagoNum)} | Resta pagar: ${fmtMonto(deudaActualSel - montoPagoNum)}
                            </span>
                          );
                        }
                        if (montoPagoNum === deudaActualSel) {
                          return (
                            <span className="font-bold text-green-600">
                              Deuda saldada por completo (${fmtMonto(0)})
                            </span>
                          );
                        }
                        return (
                          <div className="space-y-1">
                            <span className="font-bold text-blue-600 block">
                              Excedente: ${fmtMonto(excedente)} {guardarExcedente ? "→ se acredita como saldo a favor" : "→ se entrega como vuelto"}
                            </span>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                              <input type="checkbox" checked={guardarExcedente} onChange={e => setGuardarExcedente(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                              Guardar excedente como saldo a favor del cliente
                            </label>
                          </div>
                        );
                      })()}
                    </div>
                    <button type="submit" disabled={procesandoPago || !montoPago}
                      className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shrink-0">
                      <DollarSign size={16} /> Registrar Pago
                    </button>
                  </div>
                </form>
              )}
              <div className="flex justify-end">
                <button onClick={cerrarDetalles} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors text-sm">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Deudores;
