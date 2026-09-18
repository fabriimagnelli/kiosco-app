import React, { useState, useEffect, useRef, useMemo } from "react";
import { Package, Plus, Trash2, Edit, Search, Barcode, DollarSign, Settings, Check, X, Upload, FileSpreadsheet, Download, Image, History, Tag, Printer, Camera, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Weight, TrendingUp, Loader2 } from "lucide-react";
import { apiFetch, exportProductosCsv, getUploadUrl } from "../lib/api";
import { useNotify } from "../context/NotificationContext";

const UNIDADES_MEDIDA = [
  { value: 'unidad', label: 'Unidad (u.)' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'gramo', label: 'Gramo (g)' },
  { value: 'litro', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'metro', label: 'Metro (m)' },
  { value: 'pack', label: 'Pack' },
  { value: 'docena', label: 'Docena' },
  { value: 'caja', label: 'Caja' },
];

const UNIDAD_ABREV = { unidad: 'u.', kg: 'kg', gramo: 'g', litro: 'l', ml: 'ml', metro: 'm', pack: 'pack', docena: 'doc', caja: 'caja' };

// Fila, por página: renderizar cientos de filas completas a la vez satura la CPU
const POR_PAGINA = 20;

function Productos() {
  const { toast, confirmDialog } = useNotify();
  const [productos, setProductos] = useState([]);
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina, setPagina] = useState(0);
  const [loading, setLoading] = useState(true);

  // Estados Formulario
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [stock, setStock] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("General");
  const [unidadMedida, setUnidadMedida] = useState("unidad");
  
  // Estado para MODO EDICIÓN
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEdicion, setIdEdicion] = useState(null);
  const [stockMinimo, setStockMinimo] = useState("5");

  // Estados GESTIÓN CATEGORÍAS
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [mostrarGestorCategorias, setMostrarGestorCategorias] = useState(false);
  const [nuevaCategoriaInput, setNuevaCategoriaInput] = useState("");

  // CSV Import/Export
  const [mostrarCSV, setMostrarCSV] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvImporting, setCsvImporting] = useState(false);

  // Imagen
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Códigos de barras múltiples
  const [codigosExtra, setCodigosExtra] = useState([]);
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevaCodigoDesc, setNuevaCodigoDesc] = useState("");
  const [mostrarCodigos, setMostrarCodigos] = useState(false);

  // Historial de precios
  const [historialPrecios, setHistorialPrecios] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(null);

  // Etiquetas
  const [productosEtiqueta, setProductosEtiqueta] = useState([]);
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(false);

  // Selección masiva (acumulativa entre búsquedas)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectAllRef = useRef(null);
  const debounceBusquedaRef = useRef(null);

  // Ajuste masivo de precios
  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  const [ajusteOperacion, setAjusteOperacion] = useState("aumento");
  const [ajusteTipo, setAjusteTipo] = useState("porcentaje");
  const [ajusteValor, setAjusteValor] = useState("");
  const [ajusteRedondear, setAjusteRedondear] = useState(true);
  const [ajustando, setAjustando] = useState(false);

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    return () => {
      if (debounceBusquedaRef.current) clearTimeout(debounceBusquedaRef.current);
    };
  }, []);

  // Debounce: el input responde al instante, el filtrado espera 200ms de inactividad
  const manejarCambioBusqueda = (e) => {
    const valor = e.target.value;
    setInputBusqueda(valor);
    if (debounceBusquedaRef.current) clearTimeout(debounceBusquedaRef.current);
    debounceBusquedaRef.current = setTimeout(() => {
      setBusquedaDebounced(valor);
      debounceBusquedaRef.current = null;
    }, 200);
  };

  const limpiarBusqueda = () => {
    if (debounceBusquedaRef.current) {
      clearTimeout(debounceBusquedaRef.current);
      debounceBusquedaRef.current = null;
    }
    setInputBusqueda("");
    setBusquedaDebounced("");
  };

  const cargarProductos = () => {
    apiFetch("/api/productos")
      .then((res) => res.json())
      .then((data) => { setProductos(data); setLoading(false); })
      .catch((err) => console.error(err));
  };

  const cargarCategorias = () => {
    apiFetch("/api/categorias").then(r => r.json()).then(data => {
      const cats = new Set(["General", ...data]);
      setCategoriasDisponibles([...cats]);
    });
  };

  const agregarCategoriaManual = () => {
    const nueva = nuevaCategoriaInput.trim();
    if (!nueva) return;
    const nombreFormatted = nueva.charAt(0).toUpperCase() + nueva.slice(1);
    if (!categoriasDisponibles.includes(nombreFormatted)) {
      setCategoriasDisponibles([...categoriasDisponibles, nombreFormatted]);
    }
    setCategoria(nombreFormatted);
    setNuevaCategoriaInput("");
  };

  const eliminarCategoria = async (nombreCat) => {
    if (nombreCat === 'General') return toast("No se puede eliminar la categoría General.", "warn");
    if (!(await confirmDialog(`¿Eliminar la categoría "${nombreCat}"? Los productos pasarán a "General".`))) return;
    try {
      const res = await apiFetch(`/api/categorias/${nombreCat}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { cargarCategorias(); cargarProductos(); if (categoria === nombreCat) setCategoria("General"); }
      else { toast(data.error, "err"); }
    } catch (error) { console.error(error); }
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !nombre.trim()) { toast("El nombre del producto es obligatorio", "warn"); return; }
    if (!precio || isNaN(parseFloat(precio))) { toast("El precio es obligatorio y debe ser un número", "warn"); return; }

    const prodData = {
      nombre: nombre.trim(), precio: parseFloat(precio), costo: parseFloat(costo) || 0,
      stock: parseInt(stock) || 0, codigo_barras: codigo.trim(), categoria: categoria || "General",
      stock_minimo: parseInt(stockMinimo) || 5, unidad_medida: unidadMedida || "unidad"
    };

    try {
      let url = "/api/productos";
      let method = "POST";
      if (modoEdicion) { url = `/api/productos/${idEdicion}`; method = "PUT"; }

      const res = await apiFetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prodData),
      });
      const data = await res.json();

      if (data.id || data.updated) {
        const prodId = data.id || idEdicion;
        // Subir imagen si se seleccionó una nueva
        if (imagenFile && prodId) {
          const formData = new FormData();
          formData.append("imagen", imagenFile);
          await apiFetch(`/api/productos/${prodId}/imagen`, { method: "POST", body: formData, headers: {} });
        }
        resetForm();
        cargarProductos();
        cargarCategorias();
        toast(modoEdicion ? "Producto actualizado correctamente" : "Producto agregado correctamente", "ok");
      } else {
        toast(`Error al guardar el producto: ${data.error || "Error desconocido"}`, "err");
      }
    } catch (error) {
      toast(`Error de conexión: ${error.message}`, "err");
    }
  };

  const resetForm = () => {
    setNombre(""); setPrecio(""); setCosto(""); setStock(""); setCodigo("");
    setCategoria("General"); setStockMinimo("5"); setUnidadMedida("unidad");
    setModoEdicion(false); setIdEdicion(null);
    setImagenFile(null); setImagenPreview(null);
    setCodigosExtra([]); setNuevoCodigo(""); setNuevaCodigoDesc("");
    setMostrarCodigos(false);
  };

  const prepararEdicion = async (p) => {
    setNombre(p.nombre); setPrecio(p.precio); setCosto(p.costo); setStock(p.stock);
    setCodigo(p.codigo_barras || ""); setCategoria(p.categoria || "General");
    setStockMinimo(p.stock_minimo ?? 5); setUnidadMedida(p.unidad_medida || "unidad");
    setModoEdicion(true); setIdEdicion(p.id);
    setImagenFile(null);
    setImagenPreview(p.imagen ? getUploadUrl(p.imagen) : null);
    // Cargar códigos extra
    try {
      const res = await apiFetch(`/api/productos/${p.id}/codigos`);
      setCodigosExtra(await res.json());
    } catch (e) { setCodigosExtra([]); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => resetForm();

  const eliminarProducto = async (id) => {
    if (!(await confirmDialog("¿Eliminar este producto?"))) return;
    try { await apiFetch(`/api/productos/${id}`, { method: "DELETE" }); cargarProductos(); }
    catch (error) { console.error(error); }
  };

  // --- Imagen ---
  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast("La imagen es muy grande (máx 5MB)", "warn"); return; }
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  };

  const eliminarImagen = async () => {
    if (modoEdicion && idEdicion) {
      await apiFetch(`/api/productos/${idEdicion}/imagen`, { method: "DELETE" });
    }
    setImagenFile(null); setImagenPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Códigos de barras múltiples ---
  const agregarCodigoExtra = async () => {
    if (!nuevoCodigo.trim()) return;
    if (!modoEdicion || !idEdicion) { toast("Guardá el producto primero para agregar códigos extra", "warn"); return; }
    try {
      const res = await apiFetch(`/api/productos/${idEdicion}/codigos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: nuevoCodigo.trim(), descripcion: nuevaCodigoDesc.trim() })
      });
      const data = await res.json();
      if (data.error) { toast(data.error, "err"); return; }
      const res2 = await apiFetch(`/api/productos/${idEdicion}/codigos`);
      setCodigosExtra(await res2.json());
      setNuevoCodigo(""); setNuevaCodigoDesc("");
    } catch (e) { toast("Error al agregar código", "err"); }
  };

  const eliminarCodigoExtra = async (cbId) => {
    try { await apiFetch(`/api/codigos_barras/${cbId}`, { method: "DELETE" }); setCodigosExtra(codigosExtra.filter(c => c.id !== cbId)); }
    catch (e) { console.error(e); }
  };

  // --- Historial de precios ---
  const verHistorialPrecios = async (prodId) => {
    if (mostrarHistorial === prodId) { setMostrarHistorial(null); return; }
    try {
      const res = await apiFetch(`/api/productos/${prodId}/historial_precios`);
      setHistorialPrecios(await res.json());
      setMostrarHistorial(prodId);
    } catch (e) { setHistorialPrecios([]); }
  };

  // --- Filtro (con debounce: no recalcula en cada tecla) ---
  const productosFiltrados = useMemo(() => {
    const valor = busquedaDebounced.toLowerCase();
    if (!valor) return productos;
    return productos.filter((p) =>
      p.nombre.toLowerCase().includes(valor) ||
      (p.codigo_barras && p.codigo_barras.includes(valor))
    );
  }, [productos, busquedaDebounced]);

  // --- Paginación local: nunca renderizar cientos de filas a la vez ---
  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / POR_PAGINA));

  useEffect(() => {
    setPagina(0);
  }, [busquedaDebounced]);

  useEffect(() => {
    setPagina((p) => Math.min(p, totalPaginas - 1));
  }, [totalPaginas]);

  const productosPagina = useMemo(() => {
    const inicio = pagina * POR_PAGINA;
    return productosFiltrados.slice(inicio, inicio + POR_PAGINA);
  }, [productosFiltrados, pagina]);

  // --- Selección masiva ---
  // selectedIds se conserva al cambiar de página o al buscar (se acumula).
  const productosSeleccionados = productos.filter((p) => selectedIds.has(p.id));
  // El encabezado solo considera los productos visibles de la página actual
  const todosVisiblesSeleccionados = productosPagina.length > 0 && productosPagina.every((p) => selectedIds.has(p.id));
  const algunosVisiblesSeleccionados = productosPagina.some((p) => selectedIds.has(p.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = algunosVisiblesSeleccionados && !todosVisiblesSeleccionados;
    }
  });

  const toggleSeleccion = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSeleccionVisibles = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (todosVisiblesSeleccionados) {
        productosPagina.forEach((p) => next.delete(p.id));
      } else {
        productosPagina.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const calcularNuevoPrecio = (p) => {
    const v = parseFloat(ajusteValor);
    if (isNaN(v) || v <= 0) return null;
    let nuevo;
    if (ajusteTipo === "porcentaje") {
      nuevo = ajusteOperacion === "aumento" ? p.precio * (1 + v / 100) : p.precio * (1 - v / 100);
    } else {
      nuevo = ajusteOperacion === "aumento" ? p.precio + v : Math.max(0, p.precio - v);
    }
    nuevo = Math.max(0, nuevo);
    return ajusteRedondear ? Math.round(nuevo) : Math.round(nuevo * 100) / 100;
  };

  const confirmarAjuste = async () => {
    const v = parseFloat(ajusteValor);
    if (isNaN(v) || v <= 0) { toast("Ingresá un valor válido mayor a 0", "warn"); return; }
    if (productosSeleccionados.length === 0) { toast("No hay productos seleccionados", "warn"); return; }
    setAjustando(true);
    try {
      const res = await apiFetch("/api/productos/ajuste_masivo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], operacion: ajusteOperacion, tipo: ajusteTipo, valor: v, redondear: ajusteRedondear })
      });
      const data = await res.json();
      if (data.success) {
        toast(`Precios actualizados: ${data.actualizados} producto${data.actualizados === 1 ? '' : 's'}`, "ok");
        setSelectedIds(new Set());
        setMostrarAjuste(false);
        setAjusteValor("");
        cargarProductos();
      } else {
        toast("Error: " + (data.error || "Error desconocido"), "err");
      }
    } catch (e) {
      console.error("Error en ajuste masivo:", e);
      toast("Error de conexión al ajustar precios.", "err");
    } finally {
      setAjustando(false);
    }
  };

  // --- CSV ---
  const handleCSVFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) return toast("El CSV debe tener al menos un encabezado y una fila.", "warn");
      const sep = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map(v => v.trim().replace(/"/g, ""));
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
        rows.push({
          nombre: obj.nombre || obj.producto || obj.name || "",
          precio: parseFloat(obj.precio || obj.price || 0),
          costo: parseFloat(obj.costo || obj.cost || 0),
          stock: parseInt(obj.stock || obj.cantidad || 0),
          codigo_barras: obj.codigo_barras || obj.codigo || obj.barcode || "",
          categoria: obj.categoria || obj.category || "General",
          unidad_medida: obj.unidad_medida || obj.unidad || "unidad"
        });
      }
      setCsvPreview(rows.filter(r => r.nombre));
      setMostrarCSV(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const importarCSV = async () => {
    if (csvPreview.length === 0) return;
    setCsvImporting(true);
    try {
      const res = await apiFetch("/api/productos/importar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos: csvPreview })
      });
      const data = await res.json();
      if (data.success) {
        toast(`Importación exitosa: ${data.insertados || 0} nuevos, ${data.actualizados || 0} actualizados, ${data.errores || 0} errores`, "ok");
        cargarProductos(); cargarCategorias();
        setMostrarCSV(false); setCsvPreview([]);
      } else { toast("Error: " + data.error, "err"); }
    } catch (e) { toast("Error de conexión", "err"); }
    finally { setCsvImporting(false); }
  };

  const exportarCSV = async () => {
    const result = await exportProductosCsv();
    if (!result?.ok && !result?.body?.canceled) {
      toast(result?.body?.error || "No se pudo exportar el archivo CSV", "err");
    }
  };

  // --- Etiquetas ---
  const toggleEtiqueta = (prod) => {
    setProductosEtiqueta(prev => {
      const exists = prev.find(p => p.id === prod.id);
      if (exists) return prev.filter(p => p.id !== prod.id);
      return [...prev, prod];
    });
  };

  const imprimirEtiquetas = () => {
    if (productosEtiqueta.length === 0) { toast("Seleccioná al menos un producto", "warn"); return; }
    const win = window.open('', '_blank');
    const etiquetasHtml = productosEtiqueta.map(p => `
      <div style="border:2px solid #333;padding:10px 14px;margin:5px;display:inline-block;min-width:220px;font-family:Arial,sans-serif;page-break-inside:avoid;border-radius:6px;">
        <div style="font-size:10px;color:#888;margin-bottom:2px;">${p.categoria || 'General'}</div>
        <div style="font-size:14px;font-weight:bold;margin-bottom:4px;color:#222;">${p.nombre}</div>
        <div style="font-size:28px;font-weight:900;color:#000;">$${p.precio.toFixed(2)}</div>
        ${p.unidad_medida && p.unidad_medida !== 'unidad' ? `<div style="font-size:10px;color:#666;">por ${UNIDAD_ABREV[p.unidad_medida] || p.unidad_medida}</div>` : ''}
        ${p.codigo_barras ? `<div style="font-size:11px;color:#999;margin-top:6px;font-family:monospace;letter-spacing:2px;">${p.codigo_barras}</div>` : ''}
      </div>
    `).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Etiquetas de Precio</title><style>@media print{body{margin:0}@page{margin:5mm}}</style></head><body style="display:flex;flex-wrap:wrap;gap:5px;padding:10px;">${etiquetasHtml}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  // =================== RENDER ===================

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
            <Package className="text-purple-600" size={32} />
            Inventario de Productos
          </h1>
          <p className="text-slate-500 mt-1">Administra tus productos, precios y stock.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 cursor-pointer shadow-md transition-all text-sm">
            <Upload size={16} /> Importar CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVFile} />
          </label>
          <button onClick={exportarCSV} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all text-sm">
            <Download size={16} /> Exportar CSV
          </button>
          <button
            onClick={() => setMostrarEtiquetas(!mostrarEtiquetas)}
            className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all text-sm ${mostrarEtiquetas ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
          >
            <Printer size={16} /> Etiquetas {productosEtiqueta.length > 0 && `(${productosEtiqueta.length})`}
          </button>
        </div>
      </div>

      {/* BARRA ETIQUETAS */}
      {mostrarEtiquetas && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="text-orange-600" size={20} />
            <span className="text-orange-800 font-medium text-sm">
              {productosEtiqueta.length === 0
                ? "Seleccioná productos de la tabla para generar etiquetas"
                : `${productosEtiqueta.length} producto${productosEtiqueta.length > 1 ? 's' : ''} seleccionado${productosEtiqueta.length > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex gap-2">
            {productosEtiqueta.length > 0 && (
              <>
                <button onClick={() => setProductosEtiqueta([])} className="px-3 py-1.5 text-xs rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-100">Limpiar</button>
                <button onClick={imprimirEtiquetas} className="px-4 py-1.5 text-xs rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 flex items-center gap-1">
                  <Printer size={14} /> Imprimir Etiquetas
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* =============== FORMULARIO =============== */}
        <div className="lg:col-span-1">
          <div className={`p-6 rounded-xl shadow-sm border sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto transition-all ${modoEdicion ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${modoEdicion ? 'text-purple-700' : 'text-slate-700'}`}>
              {modoEdicion ? <Edit size={20} /> : <Plus size={20} className="text-purple-500" />}
              {modoEdicion ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>

            <form onSubmit={guardarProducto} className="space-y-4">

              {/* IMAGEN */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Imagen (opcional)</label>
                <div className="flex items-center gap-3">
                  {imagenPreview ? (
                    <div className="relative group">
                      <img src={imagenPreview} alt="preview" className="w-16 h-16 object-cover rounded-lg border-2 border-purple-200" />
                      <button type="button" onClick={eliminarImagen} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <Camera size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagenChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-600 font-medium transition-colors">
                      <Image size={12} className="inline mr-1" /> {imagenPreview ? 'Cambiar' : 'Subir foto'}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">Max 5MB • Se optimiza a WebP</p>
                  </div>
                </div>
              </div>

              {/* NOMBRE */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Producto</label>
                <input autoFocus={modoEdicion} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej: Alfajor Jorgito" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Precio Venta</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400" />
                    <input type="number" step="0.01" className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-slate-700" placeholder="0.00" value={precio} onChange={e => setPrecio(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Costo (Opcional)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-2 top-2.5 text-slate-400" />
                    <input type="number" step="0.01" className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-slate-300 outline-none text-slate-500" placeholder="0.00" value={costo} onChange={e => setCosto(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Stock Inicial</label>
                  <input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Código Barras</label>
                  <div className="relative">
                    <Barcode size={14} className="absolute left-2 top-2.5 text-slate-400" />
                    <input type="text" className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Scannear..." value={codigo} onChange={e => setCodigo(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* CÓDIGOS EXTRA - solo en edición */}
              {modoEdicion && (
                <div>
                  <button type="button" onClick={() => setMostrarCodigos(!mostrarCodigos)} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-1">
                    <Barcode size={12} /> Códigos adicionales ({codigosExtra.length})
                    {mostrarCodigos ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {mostrarCodigos && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2">
                      {codigosExtra.map(cb => (
                        <div key={cb.id} className="flex justify-between items-center bg-white px-2 py-1 rounded text-xs border">
                          <div>
                            <span className="font-mono font-bold">{cb.codigo}</span>
                            {cb.descripcion && <span className="text-slate-400 ml-2">({cb.descripcion})</span>}
                          </div>
                          <button type="button" onClick={() => eliminarCodigoExtra(cb.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                      ))}
                      <div className="flex gap-1 mt-1">
                        <input type="text" placeholder="Código..." value={nuevoCodigo} onChange={e => setNuevoCodigo(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarCodigoExtra())}
                          className="flex-1 p-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none font-mono" />
                        <input type="text" placeholder="Desc. (opc)" value={nuevaCodigoDesc} onChange={e => setNuevaCodigoDesc(e.target.value)} className="w-24 p-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-400 outline-none" />
                        <button type="button" onClick={agregarCodigoExtra} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"><Plus size={14} /></button>
                      </div>
                      <p className="text-[10px] text-blue-500">Un producto puede tener varios códigos (caja, unidad, pack)</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Stock Mínimo</label>
                  <div className="relative">
                    <AlertTriangle size={14} className="absolute left-2 top-2.5 text-orange-400" />
                    <input type="number" className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none" placeholder="5" value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Alerta si stock ≤ este nro</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Unidad de Medida</label>
                  <div className="relative">
                    <Weight size={14} className="absolute left-2 top-2.5 text-slate-400" />
                    <select className="w-full pl-7 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-sm" value={unidadMedida} onChange={e => setUnidadMedida(e.target.value)}>
                      {UNIDADES_MEDIDA.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* CATEGORÍA CON GESTOR */}
              <div className="relative">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500">Categoría</label>
                  <button type="button" onClick={() => setMostrarGestorCategorias(!mostrarGestorCategorias)} className="text-xs text-purple-600 hover:underline flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    <Settings size={12} /> Gestionar / Agregar
                  </button>
                </div>
                {mostrarGestorCategorias && (
                  <div className="mb-2 p-3 bg-white rounded-lg border-2 border-purple-200 shadow-lg animate-in fade-in zoom-in duration-200 absolute w-full z-30 top-7 left-0">
                    <h4 className="text-xs font-bold text-purple-800 mb-2">Categorías Existentes</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 mb-3 pr-1 custom-scrollbar">
                      {categoriasDisponibles.map(cat => (
                        <div key={cat} className="flex justify-between items-center bg-purple-50 p-1.5 rounded border border-purple-100 text-xs">
                          <span className="font-medium text-purple-900">{cat}</span>
                          {cat !== 'General' && (
                            <button type="button" onClick={() => eliminarCategoria(cat)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar categoría"><Trash2 size={14} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">AGREGAR NUEVA</label>
                      <div className="flex gap-2">
                        <input type="text" className="flex-1 p-1.5 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500 outline-none" placeholder="Nombre..." value={nuevaCategoriaInput} onChange={e => setNuevaCategoriaInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarCategoriaManual())} />
                        <button type="button" onClick={agregarCategoriaManual} className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700"><Check size={16} /></button>
                      </div>
                    </div>
                  </div>
                )}
                <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white" value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* BOTONES */}
              <div className="flex gap-2 pt-2">
                <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center gap-2 ${modoEdicion ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                  {modoEdicion ? <Edit size={18} /> : <Plus size={18} />}
                  {modoEdicion ? 'GUARDAR CAMBIOS' : 'AGREGAR PRODUCTO'}
                </button>
                {modoEdicion && (
                  <button type="button" onClick={cancelarEdicion} className="px-4 py-3 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors"><X size={20} /></button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* =============== LISTA DE PRODUCTOS =============== */}
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 sticky top-6 z-20">
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <Search className="text-slate-400" size={20} />
              <input className="bg-transparent outline-none w-full text-slate-700" placeholder="Buscar por nombre o código de barras..." value={inputBusqueda} onChange={manejarCambioBusqueda} />
              {inputBusqueda && <button onClick={limpiarBusqueda} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[50vh] md:max-h-[600px]">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 border-b border-slate-200 bg-slate-50 w-10">
                      <input ref={selectAllRef} type="checkbox" checked={todosVisiblesSeleccionados} onChange={toggleSeleccionVisibles} className="w-4 h-4 accent-purple-600 cursor-pointer" title="Seleccionar todos los visibles" />
                    </th>
                    {mostrarEtiquetas && <th className="p-3 border-b border-slate-200 bg-slate-50 w-10"></th>}
                    <th className="p-4 border-b border-slate-200 bg-slate-50">Producto</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Stock</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-right">Precio</th>
                    <th className="p-4 border-b border-slate-200 bg-slate-50 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={mostrarEtiquetas ? 6 : 5} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                  ) : productosFiltrados.length === 0 ? (
                    <tr><td colSpan={mostrarEtiquetas ? 6 : 5} className="p-8 text-center text-slate-400">No se encontraron productos.</td></tr>
                  ) : (
                    productosPagina.map((prod) => (
                      <React.Fragment key={prod.id}>
                        <tr className={`hover:bg-slate-50 transition-colors ${productosEtiqueta.find(p => p.id === prod.id) ? 'bg-orange-50' : selectedIds.has(prod.id) ? 'bg-blue-50/50' : ''}`}>
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={selectedIds.has(prod.id)} onChange={() => toggleSeleccion(prod.id)} className="w-4 h-4 accent-purple-600 cursor-pointer" />
                          </td>
                          {mostrarEtiquetas && (
                            <td className="p-3 text-center">
                              <input type="checkbox" checked={!!productosEtiqueta.find(p => p.id === prod.id)} onChange={() => toggleEtiqueta(prod)} className="w-4 h-4 accent-orange-600 cursor-pointer" />
                            </td>
                          )}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {prod.imagen ? (
                                <img src={getUploadUrl(prod.imagen)} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 border border-slate-200">
                                  <Package size={16} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-700 truncate">{prod.nombre}</div>
                                <div className="text-xs text-slate-400 flex gap-2 flex-wrap">
                                  {prod.codigo_barras && <span className="font-mono">CB: {prod.codigo_barras}</span>}
                                  <span className="bg-slate-100 px-1 rounded border">{prod.categoria}</span>
                                  {prod.unidad_medida && prod.unidad_medida !== 'unidad' && (
                                    <span className="bg-blue-50 text-blue-600 px-1 rounded border border-blue-100">{UNIDAD_ABREV[prod.unidad_medida] || prod.unidad_medida}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded font-bold text-xs ${prod.stock <= (prod.stock_minimo ?? 5) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                              {prod.stock} {UNIDAD_ABREV[prod.unidad_medida] || 'u.'}
                            </span>
                            {prod.stock <= (prod.stock_minimo ?? 5) && (
                              <div className="text-[10px] text-red-500 mt-0.5 flex items-center justify-center gap-0.5">
                                <AlertTriangle size={10} /> Mín: {prod.stock_minimo ?? 5}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="font-bold text-slate-700">$ {prod.precio.toFixed(2)}</div>
                            {prod.costo > 0 && (
                              <div className="text-[10px] text-green-600">
                                Margen: {((1 - prod.costo / prod.precio) * 100).toFixed(0)}%
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => prepararEdicion(prod)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-full transition-colors" title="Editar">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => verHistorialPrecios(prod.id)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Historial de precios">
                                <History size={16} />
                              </button>
                              <button onClick={() => eliminarProducto(prod.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Eliminar">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* HISTORIAL DE PRECIOS EXPANDIBLE */}
                        {mostrarHistorial === prod.id && (
                          <tr>
                            <td colSpan={mostrarEtiquetas ? 6 : 5} className="p-0">
                              <div className="bg-blue-50 border-y border-blue-200 p-4 animate-in fade-in slide-in-from-top duration-200">
                                <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1"><History size={14} /> Historial de Precios — {prod.nombre}</h4>
                                {historialPrecios.length === 0 ? (
                                  <p className="text-xs text-blue-500">Sin cambios de precio registrados.</p>
                                ) : (
                                  <div className="max-h-40 overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-blue-600">
                                          <th className="text-left p-1">Fecha</th>
                                          <th className="text-right p-1">Precio Ant.</th>
                                          <th className="text-right p-1">Precio Nuevo</th>
                                          <th className="text-right p-1">Variación</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-blue-100">
                                        {historialPrecios.map(h => {
                                          const variacion = h.precio_anterior > 0 ? (((h.precio_nuevo - h.precio_anterior) / h.precio_anterior) * 100).toFixed(1) : null;
                                          return (
                                            <tr key={h.id}>
                                              <td className="p-1 text-slate-600">{new Date(h.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                              <td className="p-1 text-right">${h.precio_anterior?.toFixed(2)}</td>
                                              <td className="p-1 text-right font-bold">${h.precio_nuevo?.toFixed(2)}</td>
                                              <td className={`p-1 text-right font-bold ${variacion > 0 ? 'text-red-600' : variacion < 0 ? 'text-green-600' : ''}`}>
                                                {variacion !== null ? `${variacion > 0 ? '+' : ''}${variacion}%` : '—'}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                  className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                  title="Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  Página {pagina + 1} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={pagina >= totalPaginas - 1}
                  className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
                  title="Siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            <div className="bg-slate-50 px-4 py-2 border-t text-xs text-slate-500 flex justify-between">
              <span>{productosFiltrados.length} de {productos.length} productos</span>
              <span className="text-red-500 font-medium">
                {productos.filter(p => p.stock <= (p.stock_minimo ?? 5)).length} con stock bajo
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL CSV PREVIEW */}
      {mostrarCSV && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-green-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2"><FileSpreadsheet size={20} /> Vista Previa CSV</h3>
              <button onClick={() => { setMostrarCSV(false); setCsvPreview([]); }} className="hover:bg-green-700 p-1 rounded"><X size={20} /></button>
            </div>
            <div className="p-3 bg-green-50 border-b border-green-100 text-green-800 text-xs">
              Se encontraron {csvPreview.length} productos. Formato: nombre;precio;costo;stock;codigo_barras;categoria;unidad_medida
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="p-2 border-b">Nombre</th>
                    <th className="p-2 border-b text-right">Precio</th>
                    <th className="p-2 border-b text-right">Costo</th>
                    <th className="p-2 border-b text-center">Stock</th>
                    <th className="p-2 border-b">Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvPreview.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-medium text-slate-700">{p.nombre}</td>
                      <td className="p-2 text-right">${p.precio}</td>
                      <td className="p-2 text-right text-slate-500">${p.costo}</td>
                      <td className="p-2 text-center">{p.stock}</td>
                      <td className="p-2 text-slate-500">{p.categoria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <button onClick={() => { setMostrarCSV(false); setCsvPreview([]); }} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">Cancelar</button>
              <button onClick={importarCSV} disabled={csvImporting} className="flex-[2] bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 disabled:opacity-60">
                <Upload size={18} /> {csvImporting ? "Importando..." : `Importar ${csvPreview.length} Productos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FLOTANTE SELECCIÓN */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-xl px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="text-sm font-semibold whitespace-nowrap">{selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
          <button onClick={() => setMostrarAjuste(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-1.5">
            <TrendingUp size={16} /> Ajustar Precios
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white text-sm transition-colors">Limpiar selección</button>
        </div>
      )}

      {/* MODAL AJUSTE MASIVO */}
      {mostrarAjuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 p-2 rounded-lg"><TrendingUp size={20} /></span>
                Ajuste Masivo de Precios
              </h3>
              <button onClick={() => setMostrarAjuste(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
            </div>
            <div className="bg-purple-50 border border-purple-100 px-3 py-2 rounded-lg text-purple-800 text-xs font-bold">
              {productosSeleccionados.length} producto{productosSeleccionados.length !== 1 ? 's' : ''} seleccionado{productosSeleccionados.length !== 1 ? 's' : ''}: se actualizará el precio de venta.
            </div>
            <div className="space-y-4">
              {/* Operación */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Operación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setAjusteOperacion("aumento")} className={`py-2 rounded-xl font-bold text-sm border-2 transition-all ${ajusteOperacion === "aumento" ? "bg-green-600 text-white border-green-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>+ Aumento</button>
                  <button onClick={() => setAjusteOperacion("rebaja")} className={`py-2 rounded-xl font-bold text-sm border-2 transition-all ${ajusteOperacion === "rebaja" ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>- Rebaja</button>
                </div>
              </div>
              {/* Tipo */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de cálculo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setAjusteTipo("porcentaje")} className={`py-2 rounded-xl font-bold text-sm border-2 transition-all ${ajusteTipo === "porcentaje" ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>% Porcentaje</button>
                  <button onClick={() => setAjusteTipo("fijo")} className={`py-2 rounded-xl font-bold text-sm border-2 transition-all ${ajusteTipo === "fijo" ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>$ Monto Fijo</button>
                </div>
              </div>
              {/* Valor */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{ajusteTipo === "porcentaje" ? "Porcentaje (%)" : "Monto ($)"}</label>
                <input type="number" min="0" step="0.01" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold" placeholder={ajusteTipo === "porcentaje" ? "Ej: 10" : "Ej: 500"} value={ajusteValor} onChange={e => setAjusteValor(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), confirmarAjuste())} />
              </div>
              {/* Redondeo */}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 select-none">
                <input type="checkbox" checked={ajusteRedondear} onChange={e => setAjusteRedondear(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                Redondear precios resultantes al entero más cercano
              </label>
              {/* Vista previa */}
              {productosSeleccionados.length > 0 && calcularNuevoPrecio(productosSeleccionados[0]) !== null && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Vista previa</label>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 max-h-36 overflow-y-auto custom-scrollbar divide-y divide-slate-100 text-xs">
                    {productosSeleccionados.slice(0, 20).map(p => {
                      const nuevo = calcularNuevoPrecio(p);
                      return (
                        <div key={p.id} className="flex items-center justify-between px-3 py-1.5">
                          <span className="text-slate-600 truncate mr-3">{p.nombre}</span>
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-slate-400 line-through">${p.precio.toFixed(2)}</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className={`font-bold ${nuevo >= p.precio ? 'text-red-600' : 'text-green-600'}`}>${nuevo.toFixed(2)}</span>
                          </span>
                        </div>
                      );
                    })}
                    {productosSeleccionados.length > 20 && (
                      <div className="px-3 py-1.5 text-slate-400 font-medium">... y {productosSeleccionados.length - 20} más</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setMostrarAjuste(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">Cancelar</button>
              <button onClick={confirmarAjuste} disabled={ajustando} className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 disabled:opacity-60">
                {ajustando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {ajustando ? "Actualizando..." : "Confirmar Actualización"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Productos;
