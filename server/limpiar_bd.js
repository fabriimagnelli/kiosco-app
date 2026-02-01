const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "kiosco.db");
const db = new sqlite3.Database(dbPath);

console.log("🔥 Iniciando DESTRUCCIÓN TOTAL de la Base de Datos...");

db.serialize(() => {
  // Lista de todas las tablas posibles
  const tablas = [
    "ventas", "detalle_ventas", "productos", "cigarrillos", 
    "fiados", "clientes", "proveedores", "gastos", 
    "caja_diaria", "movimientos_proveedores", "caja_cigarrillos", 
    "retiros", "historial_cierres", "categorias", "categoria_gasto", "medio_pago"
  ];

  db.run("BEGIN TRANSACTION");

  tablas.forEach((tabla) => {
    // DROP TABLE elimina la tabla y su estructura por completo
    db.run(`DROP TABLE IF EXISTS ${tabla}`, (err) => {
      if (err) {
        console.error(`❌ Error borrando ${tabla}:`, err.message);
      } else {
        console.log(`💥 Tabla '${tabla}' eliminada por completo.`);
      }
    });
  });

  // También reseteamos las secuencias internas de SQLite
  db.run("DELETE FROM sqlite_sequence", () => {
    console.log("🔄 Secuencias reiniciadas.");
  });

  db.run("COMMIT", (err) => {
    if (err) {
      console.error("❌ Error al finalizar:", err.message);
      db.run("ROLLBACK");
    } else {
      console.log("✅ Base de datos eliminada. Ahora está vacía y sin tablas.");
    }
    db.close();
  });
});