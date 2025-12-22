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

// --- AGREGAR ESTO JUSTO AQUÍ DEBAJO ---
db.serialize(() => {
  // 1. Tabla Usuarios
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE,
    password TEXT
  )`);

  // 2. Tablas de Productos y Ventas (Las que ya tenías)
  db.run(`CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    precio REAL,
    stock INTEGER,
    categoria TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT,
    producto TEXT,
    cantidad INTEGER,
    precio_total REAL,
    metodo_pago TEXT,
    categoria TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
    db.run(`CREATE TABLE IF NOT EXISTS cigarrillos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    precio REAL,
    precio_qr REAL,
    stock INTEGER
  )`);
   db.run(`CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monto REAL,
    descripcion TEXT,
    categoria TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 3. TABLAS NUEVAS (ESTAS SON LAS QUE TE FALTAN) 👇
  
  // Clientes y Fiados
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    telefono TEXT
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS fiados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    monto REAL,
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Proveedores y Cuenta Corriente
  db.run(`CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    telefono TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS movimientos_proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER,
    monto REAL,
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
    // Historial de Cierres
  db.run(`CREATE TABLE IF NOT EXISTS historial_cierres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT,
    total_ventas REAL,
    total_gastos REAL,
    total_sistema REAL,
    total_fisico REAL,
    diferencia REAL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
    
    // Aperturas de caja
    db.run(`CREATE TABLE IF NOT EXISTS aperturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monto REAL,
    observacion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log("Tablas verificadas/creadas correctamente.");
});
// ----------------------------------------

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

