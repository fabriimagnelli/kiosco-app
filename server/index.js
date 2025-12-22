const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// 1. CONECTAR FRONTEND (Carpeta dist)
app.use(express.static(path.join(__dirname, "../dist")));

// 2. BASE DE DATOS
const db = new sqlite3.Database("kiosco.db", (err) => {
  if (err) console.error("Error DB:", err.message);
  else console.log("Conectado a la base de datos SQLite.");
});

// 3. RUTAS PRINCIPALES
app.post("/login", (req, res) => {
  const { usuario, password } = req.body;
  db.get("SELECT * FROM usuarios WHERE usuario = ? AND password = ?", [usuario, password], (err, row) => {
    if (row) res.json({ success: true, usuario: row.usuario });
    else res.status(401).json({ success: false, message: "Error" });
  });
});

app.get("/productos", (req, res) => db.all("SELECT * FROM productos", (err, r) => res.json(r)));
app.post("/ventas", (req, res) => {
    res.json({ message: "Venta registrada (Simulada para prueba)" });
});

// Rutas "dummy" para que no de error 404 si el frontend las pide
app.get("/cigarrillos", (req, res) => db.all("SELECT * FROM cigarrillos", (err, r) => res.json(r)));
app.get("/categorias_productos", (req, res) => db.all("SELECT * FROM categorias_productos", (err, r) => res.json(r)));
app.get("/clientes", (req, res) => db.all("SELECT * FROM clientes", (err, r) => res.json(r)));
app.get("/proveedores", (req, res) => db.all("SELECT * FROM proveedores", (err, r) => res.json(r)));
app.get("/gastos", (req, res) => db.all("SELECT * FROM gastos", (err, r) => res.json(r)));
app.get("/dashboard", (req, res) => res.json({ventas_hoy:0, tickets_hoy:0, gastos_hoy:0, bajo_stock:[]}));

// --- RUTA PARA BACKUP (COPIA DE SEGURIDAD) ---
app.get("/backup", (req, res) => {
  const fecha = new Date();
  // Formato seguro para nombre de archivo: AAAA-MM-DD_HH-MM
  const nombreFecha = fecha.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
  const nombreArchivo = `Respaldo_${nombreFecha}.db`;
  
  // Rutas
  const rutaDB = path.join(__dirname, "kiosco.db");
  const carpetaBackups = path.join(__dirname, "../Backups");
  const rutaDestino = path.join(carpetaBackups, nombreArchivo);

  // 1. Crear carpeta Backups si no existe
  if (!fs.existsSync(carpetaBackups)) {
    fs.mkdirSync(carpetaBackups);
  }

  // 2. Copiar el archivo
  fs.copyFile(rutaDB, rutaDestino, (err) => {
    if (err) {
      console.error("Error Backup:", err);
      return res.status(500).json({ error: "No se pudo crear el respaldo" });
    }
    res.json({ message: "¡Copia de seguridad creada exitosamente!", archivo: nombreArchivo });
  });
});

// Opción extra: Descargar el archivo directamente (Download)
app.get("/descargar_db", (req, res) => {
  const rutaDB = path.join(__dirname, "kiosco.db");
  res.download(rutaDB, `Kiosco_Respaldo_${Date.now()}.db`);
});

// 4. REDIRECCIÓN FINAL (CORREGIDA)
// Usamos /(.*)/ en lugar de "*" para evitar el PathError
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Servidor listo en http://localhost:${port}`);
});