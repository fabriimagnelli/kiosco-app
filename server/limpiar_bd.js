const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("kiosco.db");

console.log("🧹 Iniciando limpieza de la Base de Datos...");

db.serialize(() => {
  // Limpiar todos los datos manteniendo la estructura de tablas
  const tablasALimpiar = [
    "detalle_ventas",
    "ventas",
    "fiados",
    "clientes_deudores",
    "gastos",
    "movimientos_proveedores",
    "proveedores",
    "productos",
    "categorias",
    "categoria_gasto",
    "medio_pago"
  ];

  tablasALimpiar.forEach((tabla) => {
    db.run(`DELETE FROM ${tabla}`, (err) => {
      if (err) {
        // Ignorar error si la tabla no existe
        if (err.message.includes("no such table")) {
          console.log(`ℹ️ ${tabla} no existe (ignorado)`);
        } else {
          console.error(`❌ Error limpiando ${tabla}:`, err.message);
        }
      } else {
        console.log(`✅ ${tabla} limpiada`);
      }
    });
  });

  // Resetear los auto-increment (VACUUM para optimizar)
  db.run("VACUUM", (err) => {
    if (err) {
      console.error("❌ Error al optimizar la BD:", err.message);
    } else {
      console.log("✅ Base de datos optimizada");
    }
  });

  // Mensaje final
  setTimeout(() => {
    console.log("\n✨ ¡Base de datos limpiada exitosamente!");
    console.log("El sistema está listo para usar con datos nuevos.\n");
    db.close();
  }, 500);
});

db.on("error", (err) => {
  console.error("❌ Error en la BD:", err.message);
  process.exit(1);
});
