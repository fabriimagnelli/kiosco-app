const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("kiosco.db");

console.log("⏳ Iniciando reparación de la Base de Datos...");

db.serialize(() => {
  // 1. Agregar columna CATEGORIA a Productos
  db.run("ALTER TABLE productos ADD COLUMN categoria TEXT", (err) => {
    if (!err) console.log("✅ Columna 'categoria' agregada a Productos.");
    else console.log("ℹ️ Productos ya estaba lista o dio error: " + err.message);
  });

  // 2. Agregar columnas a Ventas (por si faltan)
  db.run("ALTER TABLE ventas ADD COLUMN categoria TEXT", (err) => {
    if (!err) console.log("✅ Columna 'categoria' agregada a Ventas.");
    else console.log("ℹ️ Ventas 'categoria' ya estaba lista.");
  });
  
  db.run("ALTER TABLE ventas ADD COLUMN ticket_id TEXT", (err) => {
    if (!err) console.log("✅ Columna 'ticket_id' agregada a Ventas.");
  });

  // 3. Crear tablas nuevas si no existen (Deudores, Proveedores, etc.)
  // Esto ya lo hace el servidor, pero lo forzamos aquí por seguridad
  db.run(`CREATE TABLE IF NOT EXISTS fiados (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS movimientos_proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias_gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);
  
  console.log("✨ ¡Reparación terminada! Ya puedes cerrar esto.");
});