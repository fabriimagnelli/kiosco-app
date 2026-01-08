const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "kiosco.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Error al abrir DB:", err.message);
    else console.log("✅ Base de datos abierta para reparación.");
});

function agregarColumnaSiNoExiste(tabla, columna, tipo) {
    return new Promise((resolve, reject) => {
        // 1. Verificar si la columna ya existe
        db.all(`PRAGMA table_info(${tabla})`, (err, rows) => {
            if (err) {
                console.error(`❌ Error leyendo tabla ${tabla}:`, err.message);
                return resolve();
            }

            const existe = rows.some(row => row.name === columna);
            if (existe) {
                console.log(`ℹ️ La columna '${columna}' ya existe en '${tabla}'.`);
                resolve();
            } else {
                // 2. Si no existe, agregarla
                console.log(`⚠️ Agregando columna '${columna}' a '${tabla}'...`);
                db.run(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${tipo}`, (errAlter) => {
                    if (errAlter) {
                        console.error(`❌ Error agregando columna: ${errAlter.message}`);
                    } else {
                        console.log(`✅ Columna '${columna}' agregada con éxito a '${tabla}'.`);
                    }
                    resolve();
                });
            }
        });
    });
}

db.serialize(async () => {
    console.log("--- INICIANDO REPARACIÓN ---");
    
    // Reparar Productos
    await agregarColumnaSiNoExiste("productos", "codigo_barras", "TEXT");
    
    // Reparar Cigarrillos
    await agregarColumnaSiNoExiste("cigarrillos", "codigo_barras", "TEXT");
    
    // Reparar Ventas (para reporte de categorías y pagos)
    await agregarColumnaSiNoExiste("ventas", "pago_efectivo", "REAL DEFAULT 0");
    await agregarColumnaSiNoExiste("ventas", "pago_digital", "REAL DEFAULT 0");
    await agregarColumnaSiNoExiste("ventas", "categoria", "TEXT");

    console.log("--- REPARACIÓN FINALIZADA ---");
});