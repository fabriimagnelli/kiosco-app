const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../dist")));

// Servir `index.html` para navegaciones del navegador (SPA) cuando el navegador solicita HTML.
// Esto evita que la ruta del frontend (ej: /ventas) devuelva la API JSON cuando el usuario abre esa URL directamente.
// Nota: el middleware que sirve `index.html` para navegaciones SPA
// se insertará *después* de las rutas API para asegurar que las
// llamadas a la API reciban JSON y que sólo las navegaciones del
// navegador obtengan el `index.html`.

// Conexión DB (ruta explícita para evitar confusión de directorio de trabajo)
const dbPath = path.join(__dirname, "kiosco.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error DB:", err.message);
    else console.log("Conectado a la base de datos SQLite:", dbPath);
});

// Helper para usar Async/Await con SQLite (Evita errores de sincronización)
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// --- MIGRACIÓN Y TABLAS ---
db.serialize(() => {
  // Crear tablas base
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, stock INTEGER, categoria TEXT, codigo_barras TEXT)`);
  
  // Agregar columnas faltantes a productos (sin error si ya existen)
  db.run("ALTER TABLE productos ADD COLUMN codigo_barras TEXT", () => {}); 

  db.run(`CREATE TABLE IF NOT EXISTS categorias_productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS cigarrillos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, precio_qr REAL, stock INTEGER)`);
  
  // Crear tabla ventas si no existe
  db.run(`CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id TEXT, producto TEXT, cantidad INTEGER, 
    precio_total REAL, metodo_pago TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    pago_efectivo REAL DEFAULT 0, pago_digital REAL DEFAULT 0
  )`);

  // --- REPARACIÓN AUTOMÁTICA DE BASE DE DATOS ---
  // Intentamos agregar las columnas que faltan. Si ya existen, SQLite ignorará el error o el callback vacío lo capturará.
  db.run("ALTER TABLE ventas ADD COLUMN pago_efectivo REAL DEFAULT 0", () => {});
  db.run("ALTER TABLE ventas ADD COLUMN pago_digital REAL DEFAULT 0", () => {});
  db.run("ALTER TABLE ventas ADD COLUMN categoria TEXT", () => {});

  // Resto de tablas
  db.run(`CREATE TABLE IF NOT EXISTS gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, descripcion TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias_gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS fiados (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS movimientos_proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS aperturas (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, observacion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  
  db.run(`CREATE TABLE IF NOT EXISTS cierres (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT, total_ventas REAL, total_gastos REAL, 
    total_sistema REAL, total_fisico REAL, diferencia REAL, fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Usuario Admin por defecto
  db.get("SELECT count(*) as count FROM usuarios", (err, row) => {
      if (row && row.count === 0) db.run("INSERT INTO usuarios (usuario, password) VALUES (?, ?)", ["admin", "1234"]);
  });
  // Categorías de gastos por defecto
  db.get("SELECT count(*) as count FROM categorias_gastos", (err, row) => {
      if (row && row.count === 0) {
          ["Mercadería", "Luz", "Internet", "Alquiler", "Limpieza", "Varios"].forEach(c => db.run("INSERT INTO categorias_gastos (nombre) VALUES (?)", [c]));
      }
  });
});

// ==========================================
// RUTAS (Usando Wrappers Seguros)
// ==========================================

app.post("/login", (req, res) => {
  const { usuario, password } = req.body;
  db.get("SELECT * FROM usuarios WHERE usuario = ? AND password = ?", [usuario, password], (err, row) => {
    if (row) res.json({ success: true, usuario: row.usuario });
    else res.status(401).json({ success: false, message: "Error credenciales" });
  });
});

app.get("/dashboard", (req, res) => {
  const sqlUltimoCierre = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'GENERAL')";
  const sqlVentas = `SELECT SUM(precio_total) as total, COUNT(*) as tickets FROM ventas WHERE fecha > ${sqlUltimoCierre}`;
  const sqlGastos = `SELECT SUM(monto) as total FROM gastos WHERE fecha > ${sqlUltimoCierre}`;
  const sqlStockBajo = `SELECT nombre, stock FROM productos WHERE stock <= 5 UNION SELECT nombre, stock FROM cigarrillos WHERE stock <= 5`;

  db.get(sqlVentas, [], (err, v) => {
    db.get(sqlGastos, [], (err, g) => {
        db.all(sqlStockBajo, [], (err, s) => {
            res.json({ ventas_hoy: v?.total || 0, tickets_hoy: v?.tickets || 0, gastos_hoy: g?.total || 0, bajo_stock: s || [] });
        });
    });
  });
});

// --- VENTAS (CORREGIDO Y BLINDADO) ---
app.get("/ventas", (req, res) => {
    db.all("SELECT * FROM ventas ORDER BY fecha DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post("/ventas", async (req, res) => {
    const { productos, metodo_pago, desglose } = req.body;
    if (!productos || productos.length === 0) return res.status(400).json({ error: "Carrito vacío" });
  
    const ticket_id = Date.now().toString(); 
    
    try {
        await dbRun("BEGIN TRANSACTION");
  
        let ratioEfectivo = 1; let ratioDigital = 0;
        if (desglose && desglose.total > 0) {
            ratioEfectivo = desglose.efectivo / desglose.total;
            ratioDigital = desglose.digital / desglose.total;
        } else {
            if (metodo_pago === 'Efectivo') { ratioEfectivo = 1; ratioDigital = 0; }
            else { ratioEfectivo = 0; ratioDigital = 1; }
        }
  
        for (const item of productos) {
            const totalLinea = item.precio * item.cantidad;
            const parteEfectivo = totalLinea * ratioEfectivo;
            const parteDigital = totalLinea * ratioDigital;
            const tipoProducto = item.tipo || 'General'; // Evita nulos
  
            // Insertar Venta
            await dbRun(`INSERT INTO ventas 
                (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha, pago_efectivo, pago_digital) 
                VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)`, 
                [ticket_id, item.nombre, item.cantidad, totalLinea, metodo_pago, tipoProducto, parteEfectivo, parteDigital]
            );
  
            // Actualizar Stock
            if (!item.es_manual && item.id) {
                if (item.tipo === "cigarrillo") {
                    await dbRun("UPDATE cigarrillos SET stock = stock - ? WHERE id = ?", [item.cantidad, item.id]);
                } else {
                    await dbRun("UPDATE productos SET stock = stock - ? WHERE id = ?", [item.cantidad, item.id]);
                }
            }
        }
  
        await dbRun("COMMIT");
        res.json({ success: true });
  
    } catch (error) {
        console.error("❌ Error en transacción de venta:", error);
        await dbRun("ROLLBACK");
        // Devolvemos JSON siempre, nunca texto/HTML para evitar el crash del frontend
        res.status(500).json({ error: "Error interno al procesar venta: " + error.message });
    }
});

app.get("/historial", (req, res) => db.all("SELECT * FROM ventas ORDER BY fecha DESC", (err, rows) => res.json(rows)));

// --- PRODUCTOS, CIGARRILLOS, GASTOS, ETC ---
// (Mantenemos la lógica simple de callback para estas operaciones unitarias)
app.get("/productos", (req, res) => db.all("SELECT * FROM productos", (err, r) => res.json(r)));
app.post("/productos", (req, res) => {
    const { nombre, precio, stock, categoria, codigo_barras } = req.body;
    db.run("INSERT INTO productos (nombre, precio, stock, categoria, codigo_barras) VALUES (?,?,?,?,?)", [nombre, precio, stock, categoria, codigo_barras], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({id: this.lastID});
    });
});
app.put("/productos/:id", (req, res) => {
    const { nombre, precio, stock, categoria, codigo_barras } = req.body;
    db.run("UPDATE productos SET nombre=?, precio=?, stock=?, categoria=?, codigo_barras=? WHERE id=?", [nombre, precio, stock, categoria, codigo_barras, req.params.id], (err) => res.json({success: true}));
});
app.delete("/productos/:id", (req, res) => db.run("DELETE FROM productos WHERE id = ?", [req.params.id], () => res.json({success: true})));

app.get("/cigarrillos", (req, res) => db.all("SELECT * FROM cigarrillos", (err, r) => res.json(r)));
app.post("/cigarrillos", (req, res) => {
    const { nombre, precio, precio_qr, stock } = req.body;
    db.run("INSERT INTO cigarrillos (nombre, precio, precio_qr, stock) VALUES (?,?,?,?)", [nombre, precio, precio_qr, stock], () => res.json({success: true}));
});
app.put("/cigarrillos/:id", (req, res) => {
    const { nombre, precio, precio_qr, stock } = req.body;
    db.run("UPDATE cigarrillos SET nombre=?, precio=?, precio_qr=?, stock=? WHERE id=?", [nombre, precio, precio_qr, stock, req.params.id], () => res.json({success: true}));
});
app.delete("/cigarrillos/:id", (req, res) => db.run("DELETE FROM cigarrillos WHERE id = ?", [req.params.id], () => res.json({success: true})));

// --- CATEGORÍAS DE PRODUCTOS ---
app.get("/categorias_productos", (req, res) => db.all("SELECT * FROM categorias_productos", (err, r) => res.json(r || [])));
app.post("/categorias_productos", (req, res) => db.run("INSERT INTO categorias_productos (nombre) VALUES (?)", [req.body.nombre], function(err) {
    if(err) return res.status(500).json({error: err.message});
    res.json({id: this.lastID});
}));
app.put("/categorias_productos/:id", (req, res) => {
    db.run("UPDATE categorias_productos SET nombre=? WHERE id=?", [req.body.nombre, req.params.id], () => res.json({success: true}));
});
app.delete("/categorias_productos/:id", (req, res) => db.run("DELETE FROM categorias_productos WHERE id = ?", [req.params.id], () => res.json({success: true})));

app.get("/gastos", (req, res) => db.all("SELECT * FROM gastos ORDER BY fecha DESC LIMIT 50", (err, r) => res.json(r)));
app.post("/gastos", (req, res) => db.run("INSERT INTO gastos (monto, descripcion, categoria, fecha) VALUES (?, ?, ?, datetime('now', 'localtime'))", [req.body.monto, req.body.descripcion, req.body.categoria], () => res.json({success: true})));
app.delete("/gastos/:id", (req, res) => db.run("DELETE FROM gastos WHERE id=?", [req.params.id], () => res.json({success: true})));
app.get("/categorias_gastos", (req, res) => db.all("SELECT * FROM categorias_gastos", (err, r) => res.json(r)));
app.post("/categorias_gastos", (req, res) => db.run("INSERT INTO categorias_gastos (nombre) VALUES (?)", [req.body.nombre], () => res.json({success: true})));

// --- REPORTES Y OTROS ---
app.get("/clientes", (req, res) => db.all("SELECT c.*, SUM(f.monto) as total_deuda FROM clientes c LEFT JOIN fiados f ON c.id = f.cliente_id GROUP BY c.id", (err, rows) => res.json(rows)));
app.post("/clientes", (req, res) => db.run("INSERT INTO clientes (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true})));
app.delete("/clientes/:id", (req, res) => {
    db.run("DELETE FROM fiados WHERE cliente_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({error: err.message});
        db.run("DELETE FROM clientes WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({success: true});
        });
    });
});
app.get("/fiados/:id", (req, res) => db.all("SELECT * FROM fiados WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => res.json(rows)));
app.post("/fiados", (req, res) => db.run("INSERT INTO fiados (cliente_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [req.body.cliente_id, req.body.monto, req.body.descripcion], () => res.json({success: true})));

app.get("/proveedores", (req, res) => db.all("SELECT p.*, SUM(m.monto) as total_deuda FROM proveedores p LEFT JOIN movimientos_proveedores m ON p.id = m.proveedor_id GROUP BY p.id", (err, rows) => res.json(rows)));
app.post("/proveedores", (req, res) => db.run("INSERT INTO proveedores (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true})));
app.delete("/proveedores/:id", (req, res) => {
    db.run("DELETE FROM movimientos_proveedores WHERE proveedor_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({error: err.message});
        db.run("DELETE FROM proveedores WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({success: true});
        });
    });
});
app.get("/movimientos_proveedores/:id", (req, res) => db.all("SELECT * FROM movimientos_proveedores WHERE proveedor_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => res.json(rows)));
app.post("/movimientos_proveedores", (req, res) => db.run("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [req.body.proveedor_id, req.body.monto, req.body.descripcion], () => res.json({success: true})));

app.post("/apertura", (req, res) => db.run("INSERT INTO aperturas (monto, observacion, fecha) VALUES (?, ?, datetime('now', 'localtime'))", [req.body.monto, req.body.observacion], () => res.json({success: true})));
app.get("/backup", (req, res) => res.download(path.join(__dirname, "kiosco.db"), `Respaldo_Kiosco_${Date.now()}.db`));

// --- RESUMEN DEL DÍA ---
app.get("/resumen_dia_independiente", (req, res) => {
    const sqlFechaGeneral = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'GENERAL')";
    const sqlFechaCig = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'CIGARRILLOS')";

    const sqlApertura = `SELECT IFNULL(monto, 0) as monto FROM aperturas WHERE fecha > ${sqlFechaGeneral} ORDER BY id DESC LIMIT 1`;
    const sqlVentasGral = `SELECT IFNULL(SUM(pago_efectivo), 0) as total FROM ventas WHERE categoria = 'general' AND fecha > ${sqlFechaGeneral}`;
    const sqlVentasCig = `SELECT IFNULL(SUM(pago_efectivo), 0) as total FROM ventas WHERE categoria = 'cigarrillo' AND fecha > ${sqlFechaCig}`; 
    const sqlDigital = `SELECT IFNULL(SUM(pago_digital), 0) as total FROM ventas WHERE fecha > ${sqlFechaGeneral}`;
    const sqlGastos = `SELECT IFNULL(SUM(monto), 0) as total FROM gastos WHERE fecha > ${sqlFechaGeneral}`;
    const sqlPagosProv = `SELECT IFNULL(SUM(monto), 0) as total FROM movimientos_proveedores WHERE fecha > ${sqlFechaGeneral}`;
    const sqlCobros = `SELECT IFNULL(SUM(ABS(monto)), 0) as total FROM fiados WHERE monto < 0 AND fecha > ${sqlFechaGeneral}`; 

    let datos = {
        general: { saldo_inicial: 0, ventas: 0, cobros: 0, gastos: 0, pagos: 0, digital: 0, esperado: 0 },
        cigarrillos: { ventas: 0, esperado: 0 },
        digital: 0
    };
    let consultasCompletadas = 0;
    const totalConsultas = 7;

    const finalizarRespuesta = () => {
        consultasCompletadas++;
        if (consultasCompletadas === totalConsultas) {
            // CÁLCULO: Saldo Inicial + Ventas + Cobros - Gastos + Pagos (pagos ya vienen negativos en BD)
            datos.general.esperado = (datos.general.saldo_inicial || 0) + (datos.general.ventas || 0) + (datos.general.cobros || 0) - (datos.general.gastos || 0) + (datos.general.pagos || 0);
            datos.cigarrillos.esperado = datos.cigarrillos.ventas || 0;
            res.json(datos);
        }
    };

    db.get(sqlApertura, (err, row) => { if(row) datos.general.saldo_inicial = row.monto || 0; finalizarRespuesta(); });
    db.get(sqlVentasGral, (err, row) => { if(row) datos.general.ventas = row.total || 0; finalizarRespuesta(); });
    db.get(sqlVentasCig, (err, row) => { if(row) datos.cigarrillos.ventas = row.total || 0; finalizarRespuesta(); });
    db.get(sqlDigital, (err, row) => { if(row) { datos.digital = row.total || 0; datos.general.digital = row.total || 0; } finalizarRespuesta(); });
    db.get(sqlGastos, (err, row) => { if(row) datos.general.gastos = row.total || 0; finalizarRespuesta(); });
    db.get(sqlPagosProv, (err, row) => { if(row) datos.general.pagos = row.total || 0; finalizarRespuesta(); });
    db.get(sqlCobros, (err, row) => { if(row) datos.general.cobros = row.total || 0; finalizarRespuesta(); });
});

app.post("/cierres", (req, res) => {
    const { tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia } = req.body;
    db.run("INSERT INTO cierres (tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia, fecha) VALUES (?,?,?,?,?,?, datetime('now', 'localtime'))",
        [tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia],
        (err) => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});

// --- RUTAS DE REPORTES (endpoints faltantes) ---
app.get("/reportes/ventas_comanal1", (req, res) => res.json([]));
app.get("/reportes/productos_top1", (req, res) => res.json([]));
app.get("/reportes/cigarrillos_paro1", (req, res) => res.json([]));
app.get("/reportes/:tipo", (req, res) => res.json([]));

// Servir `index.html` para navegaciones del navegador (SPA) cuando el navegador solicita HTML.
// Esto está después de las rutas API para no interferir con ellas.
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
        return res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
    next();
});

// Rutas no encontradas (respondo JSON para llamadas API)
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Iniciamos el servidor y manejamos errores comunes para facilitar diagnóstico
const server = app.listen(port, () => console.log(`🚀 SERVIDOR BLINDADO - http://localhost:${port}`));

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Puerto ${port} en uso. Cierra el proceso que lo usa o cambia el puerto.`);
    } else {
        console.error('Error del servidor:', err);
    }
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});