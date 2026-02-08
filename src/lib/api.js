// --- Configuración centralizada de la API ---
const API_BASE = "http://localhost:3001";

export { API_BASE };

/**
 * Obtiene el token JWT almacenado en localStorage.
 */
export const getToken = () => localStorage.getItem("token_kiosco");

/**
 * Wrapper de fetch que agrega automáticamente:
 * - La URL base del servidor
 * - El token JWT en el header Authorization
 * - Redirige al login si el token expiró (401)
 * 
 * @param {string} path - Ruta de la API (ej: "/api/productos")
 * @param {RequestInit} options - Opciones de fetch
 * @returns {Promise<Response>}
 */
export const apiFetch = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  // Agregar token de autenticación si existe
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Agregar Content-Type si hay body y no se especificó
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Si el servidor responde 401, la sesión expiró — redirigir al login
  if (res.status === 401 && path !== "/api/login") {
    localStorage.removeItem("usuario_kiosco");
    localStorage.removeItem("token_kiosco");
    // Solo redirigir si no estamos ya en login
    if (!window.location.hash.includes("/login")) {
      window.location.hash = "#/login";
      window.location.reload();
    }
    return res;
  }

  return res;
};
