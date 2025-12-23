const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("kiosco.db");

console.log("⏳ Iniciando actualización de la Base de Datos...");

db.serialize(() => {
  // 1. CREAR TABLAS NUEVAS (Si no existen)
  const nuevasTablas = [
    `CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`,
    `CREATE TABLE IF NOT EXISTS fiados (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`,
    `CREATE TABLE IF NOT EXISTS movimientos_proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS categorias_gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`,
    `CREATE TABLE IF NOT EXISTS categorias_productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`,
    `CREATE TABLE IF NOT EXISTS historial_cierres (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT, total_ventas REAL, total_gastos REAL, total_sistema REAL, total_fisico REAL, diferencia REAL, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS aperturas (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, observacion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`
  ];

  nuevasTablas.forEach((sql) => {
    db.run(sql, (err) => {
      if (err) console.error("Error creando tabla:", err.message);
    });
  });

  // 2. AGREGAR COLUMNAS FALTANTES (El truco para que no falle lo viejo)
  const columnasFaltantes = [
    { tabla: "productos", columna: "categoria TEXT" },
    { tabla: "ventas", columna: "categoria TEXT" },
    { tabla: "ventas", columna: "ticket_id TEXT" },
    { tabla: "cigarrillos", columna: "precio_qr REAL" },
    { tabla: "gastos", columna: "categoria TEXT" }
  ];

  columnasFaltantes.forEach((item) => {
    db.run(`ALTER TABLE ${item.tabla} ADD COLUMN ${item.columna}`, (err) => {
      // Si da error es porque YA existe, así que lo ignoramos (es bueno)
      if (!err) {
        console.log(`✅ Se agregó la columna '${item.columna}' a la tabla '${item.tabla}'`);
      }
    });
  });

  console.log("✨ ¡Base de Datos actualizada! Ya puedes cerrar esta ventana.");
});