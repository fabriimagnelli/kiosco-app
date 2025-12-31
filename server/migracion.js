const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("kiosco.db");

db.serialize(() => {
  db.run("ALTER TABLE productos ADD COLUMN codigo_barras TEXT", (err) => {
    if (err) console.log("La columna ya existe o hubo error:", err.message);
    else console.log("✅ Columna codigo_barras agregada con éxito.");
  });
});
db.close(); 