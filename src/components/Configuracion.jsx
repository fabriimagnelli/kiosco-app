import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Key,
  Building2,
  Phone,
  MapPin,
  LogOut,
  Eye,
  EyeOff,
  Download,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Users,
  Plus,
  Trash2,
  Shield,
  RefreshCw,
  BookOpen,
  QrCode,
  MessageCircle,
  Cloud,
  CloudUpload,
  Printer,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLicenseState } from "../context/LicenseContext";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { QRCodeSVG } from "qrcode.react";

const DATOS_INICIALES = {
  admin_user: "",
  admin_password: "",
  kiosco_nombre: "",
  kiosco_direccion: "",
  kiosco_telefono: "",
  mp_alias: "",
  mp_nombre: "",
  mp_qr_base64: "",
  mp_access_token: "",
  mp_user_id: "",
  mp_webhook_url: "",
  mp_api_configurada: "false",
  mp_pos_qr_image_url: "",
  whatsapp_numero: "",
};

const normalizarDatos = (payload = {}) => {
  const normalized = { ...DATOS_INICIALES };
  Object.keys(DATOS_INICIALES).forEach((key) => {
    const value = payload?.[key];
    normalized[key] = value === undefined || value === null ? DATOS_INICIALES[key] : String(value);
  });
  return normalized;
};

const GLASS_CARD =
  "overflow-hidden rounded-2xl border border-white/70 bg-white/55 p-6 backdrop-blur-xl";
const GLASS_PANEL = "rounded-xl border border-white/70 bg-white/70 p-4";
const INPUT_BASE =
  "w-full rounded-lg border border-slate-200/80 bg-white/80 p-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";

function Configuracion() {
  const { logout, rol: rolActual } = useAuth();
  const { licenseState, requestRenewalFlow, refreshLicenseStatus } = useLicenseState() || {};
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUser, setNuevoUser] = useState({ nombre: "", password: "", rol: "cajero" });
  const [userLoading, setUserLoading] = useState(false);

  const [updateAvailable, setUpdateAvailable] = useState(null);

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [cloudBackupLoading, setCloudBackupLoading] = useState(false);
  const [cloudBackupMsg, setCloudBackupMsg] = useState(null);
  const [lastCloudBackupAt, setLastCloudBackupAt] = useState(null);
  const [cloudBackupPending, setCloudBackupPending] = useState(false);

  const [mpApiMsg, setMpApiMsg] = useState(null);
  const [mpSetupLoading, setMpSetupLoading] = useState(false);
  const [mpSetupMsg, setMpSetupMsg] = useState(null);
  const [mostrarMpAvanzado, setMostrarMpAvanzado] = useState(false);

  const [datos, setDatos] = useState(() => ({ ...DATOS_INICIALES }));

  useEffect(() => {
    cargarConfiguracion();
    cargarEstadoBackupCloud();
    if (rolActual === "admin") cargarUsuarios();

    if (window.electronAPI) {
      window.electronAPI
        .getUpdateStatus()
        .then((status) => {
          if (status) setUpdateAvailable(status);
        })
        .catch(() => {});

      window.electronAPI.onUpdateReady((data) => setUpdateAvailable(data));
      window.electronAPI.onBackupUpdated((data) => {
        setCloudBackupPending(!!data?.pending);
        if (data?.lastBackupAt) {
          setLastCloudBackupAt(data.lastBackupAt);
          setCloudBackupMsg({ tipo: "ok", texto: "Backup en la nube actualizado automáticamente." });
        }
      });
    }

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const formatearUltimoBackup = (value) => {
    if (!value) return "Nunca";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Nunca";

    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const hour = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    if (sameDay) return `Hoy a las ${hour}`;
    if (isYesterday) return `Ayer a las ${hour}`;

    return date.toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const cargarEstadoBackupCloud = async () => {
    try {
      if (!window.api?.getLastBackupAt) return;
      const result = await window.api.getLastBackupAt();
      setCloudBackupPending(!!result?.pending);
      if (result?.success && result?.lastBackupAt) {
        setLastCloudBackupAt(result.lastBackupAt);
      } else {
        setLastCloudBackupAt(null);
      }
    } catch (error) {
      console.error("Error consultando último backup cloud:", error);
    }
  };

  const respaldarAhoraCloud = async () => {
    setCloudBackupMsg(null);

    if (!navigator.onLine) {
      try {
        await window.api?.markBackupPending?.();
        setCloudBackupPending(true);
      } catch (_) {
        // Ignorar para no interrumpir UX local.
      }
      setCloudBackupMsg({
        tipo: "warn",
        texto:
          "No hay conexión a internet. Reconéctate para subir el respaldo. Lo encolamos para sincronizar al volver online.",
      });
      return;
    }

    setCloudBackupLoading(true);
    try {
      const result = await window.api?.forceBackup?.();
      if (result?.success) {
        setCloudBackupPending(false);
        setCloudBackupMsg({ tipo: "ok", texto: "Backup en la nube subido correctamente." });
        await cargarEstadoBackupCloud();
      } else {
        if (result?.pending) {
          setCloudBackupPending(true);
          setCloudBackupMsg({
            tipo: "warn",
            texto: "No se pudo subir ahora. Se encoló para reintentar al reconectar.",
          });
          return;
        }
        console.error("Error cloud backup (resultado no exitoso):", result?.error || result);
        setCloudBackupMsg({
          tipo: "err",
          texto: "No se pudo completar el respaldo en este momento. Por favor, reintenta en unos minutos.",
        });
      }
    } catch (error) {
      console.error("Error cloud backup (exception):", error);
      setCloudBackupMsg({
        tipo: "err",
        texto: "No se pudo completar el respaldo en este momento. Por favor, reintenta en unos minutos.",
      });
    } finally {
      setCloudBackupLoading(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await apiFetch("/api/usuarios");
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    if (!nuevoUser.nombre || !nuevoUser.password) {
      alert("Nombre y contraseña son obligatorios");
      return;
    }

    setUserLoading(true);
    try {
      const res = await apiFetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoUser),
      });
      const data = await res.json();
      if (data.success) {
        setNuevoUser({ nombre: "", password: "", rol: "cajero" });
        cargarUsuarios();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setUserLoading(false);
    }
  };

  const eliminarUsuario = async (id, nombre) => {
    if (!confirm(`¿Eliminar el usuario "${nombre}"?`)) return;
    try {
      await apiFetch(`/api/usuarios/${id}`, { method: "DELETE" });
      cargarUsuarios();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleUsuarioActivo = async (user) => {
    try {
      await apiFetch(`/api/usuarios/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, activo: user.activo ? 0 : 1 }),
      });
      cargarUsuarios();
    } catch (e) {
      console.error(e);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const res = await apiFetch("/api/config");
      const data = await res.json();
      setDatos(normalizarDatos(data));
    } catch (error) {
      console.error("Error cargando config:", error);
    }
  };

  const handleChange = (e) => {
    setDatos((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Configuración guardada correctamente!");
      } else {
        alert("Error al guardar");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const guardarYObtenerUserId = async () => {
    setMpApiMsg(null);
    if (!datos.mp_access_token || datos.mp_access_token.trim() === "") {
      setMpApiMsg({ tipo: "err", texto: "Ingresá el Access Token primero." });
      return;
    }

    setLoading(true);
    try {
      const saveRes = await apiFetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) {
        setMpApiMsg({ tipo: "err", texto: "Error al guardar: " + (saveData.error || "") });
        return;
      }

      setDatos((prev) => ({ ...prev, mp_access_token: "" }));

      const res = await apiFetch("/api/mp/fetch-user-id", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDatos((prev) => ({ ...prev, mp_user_id: String(data.user_id) }));
        setMpApiMsg({
          tipo: "ok",
          texto: `Token guardado. User ID: ${data.user_id}${data.name ? " (" + data.name + ")" : ""}`,
        });
      } else {
        setMpApiMsg({ tipo: "err", texto: "Token guardado pero error al obtener User ID: " + data.error });
      }
    } catch (e) {
      setMpApiMsg({ tipo: "err", texto: "Error de conexión" });
    } finally {
      setLoading(false);
    }
  };

  const crearSucursalYCaja = async () => {
    setMpSetupLoading(true);
    setMpSetupMsg(null);
    try {
      const res = await apiFetch("/api/mp/setup-store", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDatos((prev) => ({
          ...prev,
          mp_api_configurada: "true",
          mp_pos_qr_image_url: data.qr_image_url,
        }));
        setMpSetupMsg({ tipo: "ok", texto: "¡Sucursal y caja creadas! El QR para mostrador quedó generado." });
      } else {
        setMpSetupMsg({ tipo: "err", texto: data.error });
      }
    } catch (e) {
      setMpSetupMsg({ tipo: "err", texto: "Error de conexión" });
    } finally {
      setMpSetupLoading(false);
    }
  };

  const imprimirQRMostrador = () => {
    const printW = window.open("", "_blank");
    printW.document.write(`
      <html><head><title>QR MercadoPago Mostrador</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;margin:0;}
      h2{margin-bottom:4px} p{margin:4px 0;color:#666;font-size:14px;}</style></head>
      <body><h2>${datos.kiosco_nombre || "Mi Kiosco"}</h2>
      <p>Escaneá para pagar</p>
      <img src="${datos.mp_pos_qr_image_url}" style="width:250px;height:250px;object-fit:contain"/>
      <p style="margin-top:12px;font-size:12px;color:#999;">MercadoPago</p>
      </body></html>`);
    printW.document.close();
    printW.focus();
    setTimeout(() => printW.print(), 500);
  };

  const manejarCierreSesion = () => {
    if (confirm("¿Estás seguro que quieres cerrar sesión?")) {
      logout();
      navigate("/login");
    }
  };

  const instalarActualizacion = () => {
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  const subirImagenQr = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDatos((prev) => ({ ...prev, mp_qr_base64: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const fechaVencimientoFormateada = licenseState?.fechaVencimiento
    ? new Date(licenseState.fechaVencimiento).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Sin fecha registrada";

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
        <div className="mb-6 md:mb-8">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-800 md:text-3xl">
            <Settings className="text-emerald-600" size={32} />
            Configuración y Administración
          </h1>
          <p className="mt-1 text-slate-500">Unificá tus datos, accesos y cobros en un solo flujo limpio.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <form onSubmit={guardarCambios} className="space-y-6">
            <section className={GLASS_CARD}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <Building2 size={20} className="text-emerald-600" /> Datos del Negocio
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nombre del negocio
                  </label>
                  <input
                    name="kiosco_nombre"
                    value={datos.kiosco_nombre}
                    onChange={handleChange}
                    className={INPUT_BASE}
                    placeholder="Ej: Kiosco Centro"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Dirección</label>
                  <div className="relative">
                    <MapPin size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                    <input
                      name="kiosco_direccion"
                      value={datos.kiosco_direccion}
                      onChange={handleChange}
                      className={`${INPUT_BASE} pl-9`}
                      placeholder="Calle Alpes 123"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Teléfono</label>
                  <div className="relative">
                    <Phone size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                    <input
                      name="kiosco_telefono"
                      value={datos.kiosco_telefono}
                      onChange={handleChange}
                      className={`${INPUT_BASE} pl-9`}
                      placeholder="959-1114"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Número de WhatsApp
                  </label>
                  <div className="relative">
                    <MessageCircle size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                    <input
                      name="whatsapp_numero"
                      value={datos.whatsapp_numero}
                      onChange={handleChange}
                      className={`${INPUT_BASE} pl-9`}
                      placeholder="5491112345678"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Formato internacional sin + ni espacios. Ejemplo: 5491112345678
                  </p>
                </div>
              </div>
            </section>

            <section className={GLASS_CARD}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <Users size={20} className="text-emerald-600" /> Usuarios y Accesos
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Usuario administrador
                  </label>
                  <input
                    name="admin_user"
                    value={datos.admin_user}
                    onChange={handleChange}
                    className={INPUT_BASE}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nueva contraseña
                  </label>
                  <p className="mb-1 text-[11px] text-slate-500">Dejá vacío para mantener la actual.</p>
                  <div className="relative">
                    <Key size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                    <input
                      type={mostrarPassword ? "text" : "password"}
                      name="admin_password"
                      value={datos.admin_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`${INPUT_BASE} pl-9 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 transition hover:text-emerald-700"
                    >
                      {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {rolActual === "admin" && (
                  <div className={`${GLASS_PANEL} space-y-3`}>
                    <p className="text-sm font-semibold text-slate-700">Alta de cajeros y operadores</p>
                    <div className="space-y-2">
                      <input
                        placeholder="Nombre de usuario"
                        className={INPUT_BASE}
                        value={nuevoUser.nombre}
                        onChange={(e) => setNuevoUser({ ...nuevoUser, nombre: e.target.value })}
                      />
                      <input
                        type="password"
                        placeholder="Contraseña"
                        className={INPUT_BASE}
                        value={nuevoUser.password}
                        onChange={(e) => setNuevoUser({ ...nuevoUser, password: e.target.value })}
                      />
                      <select
                        className={INPUT_BASE}
                        value={nuevoUser.rol}
                        onChange={(e) => setNuevoUser({ ...nuevoUser, rol: e.target.value })}
                      >
                        <option value="cajero">Cajero</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <button
                        type="button"
                        onClick={crearUsuario}
                        disabled={userLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {userLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear usuario
                      </button>
                    </div>

                    {usuarios.length > 0 && (
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        {usuarios.map((u) => (
                          <div
                            key={u.id}
                            className={`flex items-center justify-between rounded-lg border p-2 text-sm ${
                              u.activo ? "border-slate-200/80 bg-white" : "border-rose-200/80 bg-rose-50/60 opacity-70"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Shield
                                size={14}
                                className={
                                  u.rol === "admin"
                                    ? "text-rose-500"
                                    : u.rol === "supervisor"
                                    ? "text-amber-500"
                                    : "text-blue-500"
                                }
                              />
                              <span className="font-medium text-slate-700">{u.nombre}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600">{u.rol}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleUsuarioActivo(u)}
                                className={`rounded px-2 py-1 text-[10px] font-bold ${
                                  u.activo ? "text-amber-700 hover:bg-amber-50" : "text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                {u.activo ? "Desactivar" : "Activar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarUsuario(u.id, u.nombre)}
                                className="rounded p-1 text-rose-500 transition hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={manejarCierreSesion}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            </section>

            <section className={GLASS_CARD}>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
                <QrCode size={20} className="text-emerald-600" /> Métodos de Cobro (QR)
              </h2>
              <p className="mb-4 text-sm text-slate-600">
                Configurá tu alias y cargá el QR estático oficial de Mercado Pago para cobros en mostrador.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Alias</label>
                  <input
                    name="mp_alias"
                    value={datos.mp_alias}
                    onChange={handleChange}
                    className={INPUT_BASE}
                    placeholder="Ej: mikiosco.mp"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nombre del titular
                  </label>
                  <input
                    name="mp_nombre"
                    value={datos.mp_nombre}
                    onChange={handleChange}
                    className={INPUT_BASE}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Imagen QR</label>
                  {datos.mp_qr_base64 ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <img src={datos.mp_qr_base64} alt="QR Mercado Pago" className="h-32 w-32 object-contain" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-emerald-700">QR cargado correctamente</p>
                        <label className="block cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                          Cambiar imagen
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => subirImagenQr(e.target.files?.[0])}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setDatos((prev) => ({ ...prev, mp_qr_base64: "" }))}
                          className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          Eliminar QR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center transition hover:bg-emerald-50">
                      <QrCode size={32} className="text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-700">Hacé clic para subir la imagen del QR</span>
                      <span className="text-xs text-slate-500">PNG, JPG o WEBP</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => subirImagenQr(e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
              </div>

              {(datos.mp_qr_base64 || datos.mp_alias) && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
                  <p className="mb-2 text-sm font-bold text-emerald-800">Vista previa de cobro</p>
                  <div id="qr-mp-preview" className="mx-auto inline-block rounded-lg bg-white p-4">
                    <p className="mb-2 text-xs font-bold text-slate-600">{datos.mp_nombre || datos.kiosco_nombre || "Mi Kiosco"}</p>
                    {datos.mp_qr_base64 ? (
                      <img src={datos.mp_qr_base64} alt="QR Mercado Pago" className="mx-auto h-48 w-48 object-contain" />
                    ) : (
                      <QRCodeSVG
                        value={`https://link.mercadopago.com.ar/${datos.mp_alias}`}
                        size={200}
                        level="M"
                        includeMargin={true}
                      />
                    )}
                    {datos.mp_alias ? <p className="mt-2 text-xs text-slate-500">Alias: {datos.mp_alias}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const printW = window.open("", "_blank", "width=400,height=600");
                      const el = document.getElementById("qr-mp-preview");
                      printW.document.write(`
                        <html><head><title>QR MercadoPago</title>
                        <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;margin:0;}
                        h2{margin-bottom:4px} p{margin:4px 0;color:#666;font-size:14px;}</style></head>
                        <body>
                          <h2>${datos.mp_nombre || datos.kiosco_nombre || "Mi Kiosco"}</h2>
                          <p>Escaneá para pagar</p>
                          ${el?.innerHTML || ""}
                          ${datos.mp_alias ? `<p style=\"margin-top:12px;font-size:12px;color:#999;\">Alias: ${datos.mp_alias}</p>` : ""}
                        </body></html>`);
                      printW.document.close();
                      setTimeout(() => {
                        printW.print();
                      }, 500);
                    }}
                    className="mx-auto mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Printer size={14} /> Imprimir QR para mostrador
                  </button>
                </div>
              )}

              <div className="mt-5 border-t border-white/80 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarMpAvanzado((prev) => !prev)}
                  className="text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900"
                >
                  {mostrarMpAvanzado ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
                </button>

                {mostrarMpAvanzado && (
                  <div className={`${GLASS_PANEL} mt-3 space-y-4`}>
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {datos.mp_api_configurada === "true" ? "Configurado y activo" : "Sin configurar"}
                    </div>

                    <p className="text-xs text-slate-600">
                      Integración API para cobro QR automático con confirmación de pago y creación de punto de cobro.
                    </p>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Access Token
                      </label>
                      <input
                        name="mp_access_token"
                        value={datos.mp_access_token}
                        onChange={handleChange}
                        type="password"
                        autoComplete="new-password"
                        className={`${INPUT_BASE} font-mono text-xs`}
                        placeholder="APP_USR-..."
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Por seguridad, el token guardado no se muestra. Ingresalo solo para actualizarlo.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        URL de notificaciones (opcional)
                      </label>
                      <input
                        name="mp_webhook_url"
                        value={datos.mp_webhook_url || ""}
                        onChange={handleChange}
                        className={`${INPUT_BASE} font-mono text-xs`}
                        placeholder="https://tu-dominio.com/api/mp/webhook"
                      />
                    </div>

                    {datos.mp_user_id && (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        Cuenta conectada (ID): <strong className="text-slate-800">{datos.mp_user_id}</strong>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={guardarYObtenerUserId}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                        Conectar cuenta
                      </button>

                      <button
                        type="button"
                        onClick={crearSucursalYCaja}
                        disabled={mpSetupLoading || !datos.mp_user_id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {mpSetupLoading ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                        {datos.mp_api_configurada === "true" ? "Re-crear punto" : "Crear punto"}
                      </button>
                    </div>

                    {mpApiMsg && (
                      <div
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          mpApiMsg.tipo === "ok"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {mpApiMsg.tipo === "ok" ? (
                            <CheckCircle size={14} className="mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          )}
                          {mpApiMsg.texto}
                        </div>
                      </div>
                    )}

                    {mpSetupMsg && (
                      <div
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          mpSetupMsg.tipo === "ok"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {mpSetupMsg.tipo === "ok" ? (
                            <CheckCircle size={14} className="mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          )}
                          {mpSetupMsg.texto}
                        </div>
                      </div>
                    )}

                    {datos.mp_pos_qr_image_url && (
                      <div className="rounded-xl border border-emerald-200 bg-white p-4 text-center">
                        <p className="mb-2 text-sm font-bold text-emerald-800">QR de Mostrador (API)</p>
                        <img
                          src={datos.mp_pos_qr_image_url}
                          alt="QR Mostrador"
                          className="mx-auto h-44 w-44 object-contain"
                        />
                        <button
                          type="button"
                          onClick={imprimirQRMostrador}
                          className="mx-auto mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <Printer size={14} /> Imprimir QR API
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className={GLASS_CARD}>
              <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800">
                <BookOpen size={18} className="text-emerald-600" /> Guía de Inicio
              </h3>
              <p className="mb-4 text-sm text-slate-600">
                Volvé a mostrar el tutorial de bienvenida para repasar funciones clave.
              </p>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("sacware_tutorial_visto");
                  window.location.reload();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <BookOpen size={16} /> Ver tutorial
              </button>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>

          <div className="space-y-6">
            {licenseState ? (
              <section className={GLASS_CARD}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Licencia SaaS</p>
                    <h3 className="mt-2 text-lg font-bold text-slate-800">
                      Estado: {licenseState.activa ? "Activa" : "Inactiva"}
                    </h3>
                  </div>
                  <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {licenseState.diasRestantes > 0 ? `${licenseState.diasRestantes} días` : "Vencida"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 rounded-xl border border-white/70 bg-white/70 p-4 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Vence el:</span> {fechaVencimientoFormateada}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Días restantes:</span>{" "}
                    {Math.max(0, Number(licenseState.diasRestantes || 0))}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => requestRenewalFlow && requestRenewalFlow()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 font-semibold text-white transition hover:brightness-110"
                  >
                    <Key size={16} /> Ingresar nueva clave
                  </button>
                  <button
                    type="button"
                    onClick={() => refreshLicenseStatus && refreshLicenseStatus()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <RefreshCw size={16} /> Actualizar estado
                  </button>
                </div>
              </section>
            ) : null}

            <section className={GLASS_CARD}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Cloud Backups</p>
                  <h3 className="mt-2 text-lg font-bold text-slate-800">Copias de Seguridad en la Nube</h3>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    isOnline
                      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                      : "border-amber-200 bg-amber-100 text-amber-700"
                  }`}
                >
                  {isOnline ? "Conectado" : "Sin conexión"}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-white/70 bg-white/70 p-4 text-sm text-slate-700">
                Última copia: <strong>{formatearUltimoBackup(lastCloudBackupAt)}</strong>
              </div>

              {cloudBackupPending ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <Cloud size={14} /> Copia en espera de conexión...
                </div>
              ) : null}

              {cloudBackupMsg ? (
                <div
                  className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                    cloudBackupMsg.tipo === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : cloudBackupMsg.tipo === "warn"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {cloudBackupMsg.texto}
                </div>
              ) : null}

              <button
                type="button"
                onClick={respaldarAhoraCloud}
                disabled={cloudBackupLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cloudBackupLoading ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                {cloudBackupLoading ? "Subiendo..." : "Respaldar ahora"}
              </button>
            </section>

            {updateAvailable && (
              <section className={GLASS_CARD}>
                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                  <RefreshCw size={20} className="animate-spin text-emerald-600" style={{ animationDuration: "3s" }} />
                  Actualización Disponible
                </h3>
                <p className="mb-1 text-sm text-slate-700">
                  Versión <strong>v{updateAvailable.version}</strong> lista para instalar.
                </p>
                <p className="mb-4 text-xs text-slate-500">
                  La app se reiniciará automáticamente para aplicar la actualización.
                </p>
                <button
                  type="button"
                  onClick={instalarActualizacion}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800"
                >
                  <Download size={16} /> Actualizar Sistema
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuracion;

