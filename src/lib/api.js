const API_BASE = "";

export { API_BASE };

const decodeBase64 = (value) => {
  const binary = atob(value || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const encodeBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

const buildResponse = (result) => {
  const headers = Object.fromEntries(
    Object.entries(result.headers || {}).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    ok: result.ok,
    status: result.status,
    headers: {
      get: (name) => headers[String(name).toLowerCase()] ?? null,
    },
    json: async () => {
      if (result.bodyType === "json") return result.body;
      if (result.bodyType === "base64") {
        return JSON.parse(new TextDecoder().decode(decodeBase64(result.body)));
      }
      return JSON.parse(result.body || "null");
    },
    text: async () => {
      if (result.bodyType === "text") return result.body ?? "";
      if (result.bodyType === "base64") {
        return new TextDecoder().decode(decodeBase64(result.body));
      }
      return JSON.stringify(result.body ?? null);
    },
    blob: async () => {
      if (result.bodyType === "base64") {
        return new Blob([decodeBase64(result.body)]);
      }
      if (result.bodyType === "text") {
        return new Blob([result.body ?? ""]);
      }
      return new Blob([JSON.stringify(result.body ?? null)], { type: "application/json" });
    },
  };
};

const parseRequestBody = (body, headers) => {
  if (!body || typeof body !== "string") return body;
  const contentType = headers["Content-Type"] || headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(body);
  }
  return body;
};

const serializeUpload = async (formData) => {
  for (const [fieldName, value] of formData.entries()) {
    if (value instanceof File || value instanceof Blob) {
      const buffer = await value.arrayBuffer();
      return {
        fieldName,
        name: value.name || "archivo.bin",
        type: value.type || "application/octet-stream",
        size: value.size ?? buffer.byteLength,
        buffer: encodeBase64(buffer),
      };
    }
  }
  throw new Error("No se encontró archivo en el formulario");
};

export const getUploadUrl = (fileName) => window.api?.getUploadUrl(fileName) ?? null;

export const exportProductosCsv = async () => {
  if (!window.api?.exportProductosCsv) {
    throw new Error("La exportación CSV solo está disponible dentro de Electron");
  }

  return window.api.exportProductosCsv();
};

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
  if (!window.api?.request) {
    throw new Error("La capa IPC de Electron no está disponible");
  }

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

  let result;
  if (options.body instanceof FormData) {
    result = await window.api.uploadFile({
      path,
      method: options.method || "POST",
      file: await serializeUpload(options.body),
    });
  } else {
    result = await window.api.request({
      path,
      method: options.method || "GET",
      headers,
      body: parseRequestBody(options.body, headers),
    });
  }

  const res = buildResponse(result);

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
