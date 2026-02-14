import React, { useState, useEffect } from "react";
import { Settings, Save, User, Key, Building2, Phone, MapPin, LogOut, Eye, EyeOff, Database, Download, RotateCcw, Loader2, CheckCircle, AlertTriangle, Users, Plus, Trash2, Shield, RefreshCw, BookOpen, QrCode, MessageCircle, Cloud, CloudUpload, CloudDownload, ExternalLink, Printer } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { QRCodeSVG } from "qrcode.react";

function Configuracion() {
  const { logout, rol: rolActual } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Backup states
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);

  // User management states
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUser, setNuevoUser] = useState({ nombre: "", password: "", rol: "cajero" });
  const [userLoading, setUserLoading] = useState(false);

  // Update state
  const [updateAvailable, setUpdateAvailable] = useState(null);

  // Sync states
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  // Estados de datos
  const [datos, setDatos] = useState({
    admin_user: "",
    admin_password: "",
    kiosco_nombre: "",
    kiosco_direccion: "",
    kiosco_telefono: "",
    mp_alias: "",
    mp_nombre: "",
    whatsapp_numero: "",
    sync_url: "",
    sync_token: ""
  });

  useEffect(() => {
    cargarConfiguracion();
    cargarBackups();
    if (rolActual === "admin") cargarUsuarios();
    // Verificar si hay actualización pendiente
    if (window.electronAPI) {
      window.electronAPI.getUpdateStatus().then(status => {
        if (status) setUpdateAvailable(status);
      }).catch(() => {});
      window.electronAPI.onUpdateReady((data) => setUpdateAvailable(data));
    }
  }, []);

  const cargarBackups = async () => {
    try {
      const res = await apiFetch("/api/backup/list");
      const data = await res.json();
      setBackups(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error backups:", e); }
  };

  const crearBackup = async () => {
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      const res = await apiFetch("/api/backup");
      const data = await res.json();
      if (data.success) {
        setBackupMsg({ tipo: "ok", texto: "Backup creado correctamente" });
        cargarBackups();
      } else { setBackupMsg({ tipo: "err", texto: data.error }); }
    } catch (e) { setBackupMsg({ tipo: "err", texto: "Error de conexión" }); }
    finally { setBackupLoading(false); }
  };

  const restaurarBackup = async (archivo) => {
    if (!confirm(`¿Restaurar la base de datos desde "${archivo}"?\nEsto reemplazará TODOS los datos actuales.`)) return;
    setBackupLoading(true);
    try {
      const res = await apiFetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivo })
      });
      const data = await res.json();
      if (data.success) {
        alert("Base de datos restaurada. La app se recargará.");
        window.location.reload();
      } else { alert("Error: " + data.error); }
    } catch (e) { alert("Error de conexión"); }
    finally { setBackupLoading(false); }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await apiFetch("/api/usuarios");
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    if (!nuevoUser.nombre || !nuevoUser.password) return alert("Nombre y contraseña son obligatorios");
    setUserLoading(true);
    try {
      const res = await apiFetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoUser)
      });
      const data = await res.json();
      if (data.success) {
        setNuevoUser({ nombre: "", password: "", rol: "cajero" });
        cargarUsuarios();
      } else { alert("Error: " + data.error); }
    } catch (e) { alert("Error de conexión"); }
    finally { setUserLoading(false); }
  };

  const eliminarUsuario = async (id, nombre) => {
    if (!confirm(`¿Eliminar el usuario "${nombre}"?`)) return;
    try {
      await apiFetch(`/api/usuarios/${id}`, { method: "DELETE" });
      cargarUsuarios();
    } catch (e) { console.error(e); }
  };

  const toggleUsuarioActivo = async (user) => {
    try {
      await apiFetch(`/api/usuarios/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, activo: user.activo ? 0 : 1 })
      });
      cargarUsuarios();
    } catch (e) { console.error(e); }
  };

  const cargarConfiguracion = async () => {
    try {
      const res = await apiFetch("/api/config");
      const data = await res.json();
      setDatos(data);
    } catch (error) {
      console.error("Error cargando config:", error);
    }
  };

  const handleChange = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
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

  const syncPush = async () => {
    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const res = await apiFetch("/api/sync/push", { method: "POST" });
      const data = await res.json();
      if (data.success) { setSyncMsg({ tipo: "ok", texto: "Backup subido al servidor remoto exitosamente" }); }
      else { setSyncMsg({ tipo: "err", texto: data.error || "Error al subir" }); }
    } catch (e) { setSyncMsg({ tipo: "err", texto: "Error de conexión con el servidor" }); }
    finally { setSyncLoading(false); }
  };

  const syncPull = async () => {
    if (!confirm("¿Descargar y restaurar la base de datos desde el servidor remoto?\nEsto reemplazará TODOS los datos locales.")) return;
    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const res = await apiFetch("/api/sync/pull", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Base de datos sincronizada. La app se recargará.");
        window.location.reload();
      } else { setSyncMsg({ tipo: "err", texto: data.error || "Error al descargar" }); }
    } catch (e) { setSyncMsg({ tipo: "err", texto: "Error de conexión" }); }
    finally { setSyncLoading(false); }
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

  return (
    // AGREGADO: h-full y overflow-y-auto para permitir hacer scroll
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in fade-in duration-500 h-full overflow-y-auto">
      
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
          <Settings className="text-purple-600" size={32} />
          Configuración y Administración
        </h1>
        <p className="text-slate-500 mt-1">Gestiona los datos de tu negocio y credenciales de acceso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
        
        {/* COLUMNA IZQUIERDA: FORMULARIOS */}
        <div className="space-y-6">
            
            <form onSubmit={guardarCambios} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Building2 size={20} className="text-blue-500"/> Datos del Kiosco
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Negocio</label>
                        <input 
                            name="kiosco_nombre"
                            value={datos.kiosco_nombre}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Ej: Kiosco Centro"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                name="kiosco_direccion"
                                value={datos.kiosco_direccion}
                                onChange={handleChange}
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Calle Alpes 123"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                name="kiosco_telefono"
                                value={datos.kiosco_telefono}
                                onChange={handleChange}
                                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="959-1114"
                            />
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-slate-100"/>

                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <User size={20} className="text-green-500"/> Credenciales de Acceso
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Usuario Administrador</label>
                        <input 
                            name="admin_user"
                            value={datos.admin_user}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nueva Contraseña</label>
                        <p className="text-xs text-slate-400 mb-1">Dejar vacío para mantener la actual</p>
                        <div className="relative">
                            <Key size={16} className="absolute left-3 top-3 text-slate-400"/>
                            <input 
                                type={mostrarPassword ? "text" : "password"}
                                name="admin_password"
                                value={datos.admin_password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-9 pr-10 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                            />
                            <button 
                                type="button"
                                onClick={() => setMostrarPassword(!mostrarPassword)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-600"
                            >
                                {mostrarPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>
                </div>

                <hr className="my-6 border-slate-100"/>

                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <QrCode size={20} className="text-cyan-500"/> MercadoPago (QR)
                </h2>
                <p className="text-xs text-slate-400 mb-3">Configurá tu alias para generar un QR fijo que podés imprimir y pegar en el mostrador.</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Alias de MercadoPago</label>
                        <input 
                            name="mp_alias"
                            value={datos.mp_alias}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                            placeholder="Ej: mikiosco.mp"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del titular</label>
                        <input 
                            name="mp_nombre"
                            value={datos.mp_nombre}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>
                </div>

                {/* Vista previa del QR para imprimir */}
                {datos.mp_alias && (
                  <div className="mt-4 bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center space-y-3">
                    <p className="text-sm font-bold text-cyan-800">Tu QR de cobro</p>
                    <div id="qr-mp-preview" className="bg-white p-4 rounded-lg inline-block mx-auto">
                      <p className="text-xs font-bold text-slate-600 mb-2">{datos.mp_nombre || datos.kiosco_nombre || 'Mi Kiosco'}</p>
                      <QRCodeSVG
                        value={`https://link.mercadopago.com.ar/${datos.mp_alias}`}
                        size={200}
                        level="M"
                        includeMargin={true}
                      />
                      <p className="text-xs text-slate-500 mt-2">Alias: <strong>{datos.mp_alias}</strong></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const printW = window.open('', '_blank', 'width=400,height=600');
                        const el = document.getElementById('qr-mp-preview');
                        printW.document.write(`
                          <html><head><title>QR MercadoPago</title>
                          <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;margin:0;}
                          h2{margin-bottom:4px} p{margin:4px 0;color:#666;font-size:14px;}</style></head>
                          <body>
                            <h2>${datos.mp_nombre || datos.kiosco_nombre || 'Mi Kiosco'}</h2>
                            <p>Escaneá para pagar</p>
                            ${el.innerHTML}
                            <p style="margin-top:12px;font-size:12px;color:#999;">Alias: ${datos.mp_alias}</p>
                          </body></html>`);
                        printW.document.close();
                        setTimeout(() => { printW.print(); }, 500);
                      }}
                      className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors mx-auto"
                    >
                      <Printer size={14}/> Imprimir QR para el mostrador
                    </button>
                  </div>
                )}

                <hr className="my-6 border-slate-100"/>

                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <MessageCircle size={20} className="text-green-500"/> WhatsApp
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Número de WhatsApp del negocio</label>
                        <input 
                            name="whatsapp_numero"
                            value={datos.whatsapp_numero}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="Ej: 5491112345678 (con código de país)"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Formato internacional sin + ni espacios. Ej: 5491112345678</p>
                    </div>
                </div>

                <hr className="my-6 border-slate-100"/>

                <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Cloud size={20} className="text-blue-500"/> Sincronización en la Nube
                </h2>
                <p className="text-xs text-slate-400 mb-3">Configura un servidor para respaldar tus datos automáticamente.</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">URL del servidor de sync</label>
                        <input 
                            name="sync_url"
                            value={datos.sync_url}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="https://mi-servidor.com/api/sync"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Token de autenticación (opcional)</label>
                        <input 
                            name="sync_token"
                            value={datos.sync_token}
                            onChange={handleChange}
                            type="password"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Token secreto"
                        />
                    </div>
                </div>

                <div className="mt-8">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-all flex justify-center items-center gap-2 shadow-lg"
                    >
                        <Save size={18}/> {loading ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </form>
        </div>

        {/* COLUMNA DERECHA: ACCIONES */}
        <div className="space-y-6">

            {/* TARJETA ACTUALIZAR SISTEMA (Solo visible si hay actualización) */}
            {updateAvailable && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border-2 border-blue-300 animate-in fade-in slide-in-from-top-2 duration-300">
                <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <RefreshCw size={20} className="text-blue-600 animate-spin" style={{ animationDuration: '3s' }}/> Actualización Disponible
                </h3>
                <p className="text-sm text-blue-600 mb-1">Versión <strong>v{updateAvailable.version}</strong> lista para instalar.</p>
                <p className="text-xs text-blue-400 mb-4">La app se reiniciará automáticamente para aplicar la actualización.</p>
                <button 
                    onClick={instalarActualizacion}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-xl"
                >
                    <Download size={18}/> Actualizar Sistema
                </button>
            </div>
            )}
            
            {/* TARJETA CERRAR SESIÓN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2">Sesión Actual</h3>
                <p className="text-sm text-slate-500 mb-4">Estás logueado como administrador. Cierra sesión si terminaste tu turno.</p>
                <button 
                    onClick={manejarCierreSesion}
                    className="w-full border border-slate-300 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                >
                    <LogOut size={18}/> Cerrar Sesión
                </button>
            </div>

            {/* TARJETA TUTORIAL */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <BookOpen size={20} className="text-indigo-500"/> Guía de Inicio
                </h3>
                <p className="text-sm text-slate-500 mb-4">¿Necesitás repasar las funciones principales? Volvé a ver el tutorial de bienvenida.</p>
                <button 
                    onClick={() => { localStorage.removeItem("sacware_tutorial_visto"); window.location.reload(); }}
                    className="w-full border border-indigo-300 text-indigo-700 py-2 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex justify-center items-center gap-2"
                >
                    <BookOpen size={18}/> Ver Tutorial
                </button>
            </div>

            {/* TARJETA BACKUPS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Database size={20} className="text-blue-500"/> Respaldo de Datos
                </h3>
                <p className="text-sm text-slate-500 mb-4">El sistema crea backups automáticos al iniciar. También puedes crear uno manual.</p>
                
                {backupMsg && (
                  <div className={`mb-3 p-2 rounded-lg text-sm flex items-center gap-2 ${backupMsg.tipo === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {backupMsg.tipo === "ok" ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                    {backupMsg.texto}
                  </div>
                )}

                <button 
                    onClick={crearBackup}
                    disabled={backupLoading}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 mb-4 disabled:opacity-60"
                >
                    {backupLoading ? <Loader2 size={18} className="animate-spin"/> : <Download size={18}/>}
                    {backupLoading ? "Procesando..." : "Crear Backup Manual"}
                </button>

                {backups.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Backups disponibles ({backups.length})</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {backups.map((b, i) => {
                        const nombre = typeof b === 'string' ? b : b.nombre;
                        const detalle = typeof b === 'object' ? ` (${b.tamaño})` : '';
                        return (
                          <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                            <span className="text-slate-600 truncate flex-1 mr-2" title={nombre}>{nombre}{detalle}</span>
                            <button
                              onClick={() => restaurarBackup(nombre)}
                              className="text-orange-600 hover:text-orange-800 font-bold flex items-center gap-1 flex-shrink-0"
                            >
                              <RotateCcw size={14}/> Restaurar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* TARJETA SINCRONIZACIÓN EN LA NUBE */}
            {datos.sync_url && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Cloud size={20} className="text-blue-500"/> Sincronización en la Nube
                </h3>
                <p className="text-sm text-slate-500 mb-4">Subí o descargá tu base de datos del servidor remoto.</p>
                
                {syncMsg && (
                  <div className={`mb-3 p-2 rounded-lg text-sm flex items-center gap-2 ${syncMsg.tipo === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {syncMsg.tipo === "ok" ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                    {syncMsg.texto}
                  </div>
                )}

                <div className="space-y-2">
                  <button 
                    onClick={syncPush}
                    disabled={syncLoading}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    {syncLoading ? <Loader2 size={16} className="animate-spin"/> : <CloudUpload size={16}/>}
                    Subir backup al servidor
                  </button>
                  <button 
                    onClick={syncPull}
                    disabled={syncLoading}
                    className="w-full border border-blue-300 text-blue-700 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                  >
                    {syncLoading ? <Loader2 size={16} className="animate-spin"/> : <CloudDownload size={16}/>}
                    Descargar desde el servidor
                  </button>
                </div>
            </div>
            )}

            {/* TARJETA GESTIÓN DE USUARIOS (Solo Admin) */}
            {rolActual === "admin" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Users size={20} className="text-purple-500"/> Gestión de Usuarios
                </h3>

                {/* Formulario nuevo usuario */}
                <form onSubmit={crearUsuario} className="space-y-2 mb-4">
                  <input 
                    placeholder="Nombre de usuario"
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    value={nuevoUser.nombre}
                    onChange={e => setNuevoUser({...nuevoUser, nombre: e.target.value})}
                  />
                  <input 
                    type="password"
                    placeholder="Contraseña"
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    value={nuevoUser.password}
                    onChange={e => setNuevoUser({...nuevoUser, password: e.target.value})}
                  />
                  <select
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                    value={nuevoUser.rol}
                    onChange={e => setNuevoUser({...nuevoUser, rol: e.target.value})}
                  >
                    <option value="cajero">Cajero</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <button 
                    type="submit" 
                    disabled={userLoading}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 flex justify-center items-center gap-2 text-sm"
                  >
                    <Plus size={16}/> Crear Usuario
                  </button>
                </form>

                {/* Lista de usuarios */}
                {usuarios.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {usuarios.map(u => (
                      <div key={u.id} className={`flex items-center justify-between p-2 rounded-lg border text-sm ${u.activo ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100 opacity-60'}`}>
                        <div className="flex items-center gap-2">
                          <Shield size={14} className={u.rol === 'admin' ? 'text-red-500' : u.rol === 'supervisor' ? 'text-yellow-500' : 'text-blue-500'}/>
                          <span className="font-medium text-slate-700">{u.nombre}</span>
                          <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded uppercase">{u.rol}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => toggleUsuarioActivo(u)} 
                            className={`text-[10px] px-2 py-1 rounded font-bold ${u.activo ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button onClick={() => eliminarUsuario(u.id, u.nombre)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            )}

        </div>

      </div>
    </div>
  );
}

export default Configuracion;