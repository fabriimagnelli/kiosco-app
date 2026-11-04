/**
 * Utilidades para manejo seguro de fechas y horas en hora local (es-AR).
 * Evita problemas de desfase UTC (ej: UTC-3 mostrando 3 horas después o cambiando de día después de las 21hs).
 */

/**
 * Parsea cualquier fecha o timestamp (de SQLite, ISO o formato local argentino)
 * y devuelve un objeto Date en hora local.
 * 
 * - Si es "YYYY-MM-DD HH:MM:SS" (SQLite localtime) -> lo interpreta en hora local.
 * - Si es "YYYY-MM-DD" (solo fecha) -> agrega "T00:00:00" para evitar desfase UTC.
 * - Si es "D/M/YYYY, HH:MM:SS" (formato legacy de retiros) -> extrae día, mes, año y hora correctamente.
 * - Si tiene sufijo "Z" u offset -> respeta el huso y convierte a la hora local.
 */
export const parseDateSafe = (fecha) => {
  if (!fecha) return null;
  if (fecha instanceof Date) return Number.isNaN(fecha.getTime()) ? null : fecha;
  const texto = String(fecha).trim();
  if (!texto) return null;

  // Formato legacy "D/M/YYYY, HH:MM:SS" o "DD/MM/YYYY HH:MM:SS"
  const dmyMatch = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const [, d, m, y, h, min, s] = dmyMatch;
    const parsed = new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      h ? parseInt(h, 10) : 0,
      min ? parseInt(min, 10) : 0,
      s ? parseInt(s, 10) : 0
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Si ya tiene indicador de timezone (ej: Z o +03:00 / -03:00)
  if (/Z$|[+-]\d{2}:\d{2}$/.test(texto)) {
    const d = new Date(texto);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Si es YYYY-MM-DD o YYYY-MM-DD HH:MM:SS
  const iso = texto.includes("T") ? texto : texto.replace(" ", "T");
  // Si solo viene fecha sin hora, agregar T00:00:00 para forzar interpretación local
  const finalIso = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;
  const d = new Date(finalIso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Devuelve la fecha local en formato "YYYY-MM-DD".
 * A diferencia de new Date().toISOString().split('T')[0], NUNCA cambia al día siguiente
 * después de las 21:00 hs en Argentina (UTC-3).
 */
export const getLocalDateString = (d = new Date()) => {
  if (!d) return "";
  const dateObj = typeof d === "string" || typeof d === "number" ? parseDateSafe(d) : d;
  if (!dateObj || Number.isNaN(dateObj.getTime())) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha para mostrar al usuario en formato argentino (DD/MM/YYYY).
 */
export const formatFecha = (fecha, options = {}) => {
  const d = parseDateSafe(fecha);
  if (!d) return "-";
  return d.toLocaleDateString("es-AR", options);
};

/**
 * Formatea la hora para mostrar al usuario (HH:MM).
 */
export const formatHora = (fecha, options = { hour: "2-digit", minute: "2-digit" }) => {
  const d = parseDateSafe(fecha);
  if (!d) return "-";
  return d.toLocaleTimeString("es-AR", options);
};

/**
 * Formatea fecha y hora combinadas (DD/MM/YYYY, HH:MM).
 */
export const formatFechaHora = (fecha) => {
  const d = parseDateSafe(fecha);
  if (!d) return "-";
  return `${d.toLocaleDateString("es-AR")}, ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
};
