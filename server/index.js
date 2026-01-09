const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../dist")));

// Conexión DB
const dbPath = path.join(__dirname, "kiosco.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error DB:", err.message);
    else console.log("Conectado a la base de datos SQLite:", dbPath);
});

// Helpers Async
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { err ? reject(err) : resolve(row); });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { err ? reject(err) : resolve(rows); });
});

// --- FUNCIÓN PARA AGREGAR COLUMNAS DE FORMA SEGURA ---
const ensureColumn = (table, column, definition) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (!err && rows && !rows.some(r => r.name === column)) {
            console.log(`🔧 Migración: Agregando ${column} a ${table}`);
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (e) => {
                if(e) console.error(`Error alter table ${table}:`, e.message);
            });
        }
    });
};

// --- INICIALIZACIÓN DB ---
db.serialize(() => {
  // Tablas base
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, stock INTEGER, categoria TEXT, codigo_barras TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias_productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS cigarrillos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, precio_qr REAL, stock INTEGER, codigo_barras TEXT)`);
  
  // Promos
  db.run(`CREATE TABLE IF NOT EXISTS promos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, codigo_barras TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS detalle_promos (id INTEGER PRIMARY KEY AUTOINCREMENT, promo_id INTEGER, producto_id INTEGER, tipo_producto TEXT, cantidad INTEGER, FOREIGN KEY(promo_id) REFERENCES promos(id))`);

  // Ventas y otros
  db.run(`CREATE TABLE IF NOT EXISTS ventas (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id TEXT, producto TEXT, cantidad INTEGER, precio_total REAL, metodo_pago TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, pago_efectivo REAL DEFAULT 0, pago_digital REAL DEFAULT 0)`);
  db.run(`CREATE TABLE IF NOT EXISTS gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, descripcion TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias_gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS fiados (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS movimientos_proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS aperturas (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, observacion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS cierres (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT, total_ventas REAL, total_gastos REAL, total_sistema REAL, total_fisico REAL, diferencia REAL, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  // --- MIGRACIONES AUTOMÁTICAS (Fix para tu error) ---
  ensureColumn("productos", "codigo_barras", "TEXT");
  ensureColumn("cigarrillos", "codigo_barras", "TEXT");
  ensureColumn("ventas", "pago_efectivo", "REAL DEFAULT 0");
  ensureColumn("ventas", "pago_digital", "REAL DEFAULT 0");
  ensureColumn("ventas", "categoria", "TEXT");
  ensureColumn("ventas", "categoria", "TEXT");
  // === INICIO DEL BLOQUE DE REPARACIÓN (Copiar y Pegar esto) ===
  
  // 1. Aseguramos que existan las columnas que usa el sistema nuevo
  ensureColumn("productos", "precio", "REAL");
  ensureColumn("productos", "categoria", "TEXT");

  // 2. Migramos los datos viejos (si existen) a las columnas nuevas
  // Copia precio_venta -> precio (si el precio nuevo está vacío)
  db.run("UPDATE productos SET precio = precio_venta WHERE (precio IS NULL OR precio = 0) AND precio_venta IS NOT NULL", (err) => {
      if (!err) console.log("♻️ Precios migrados correctamente.");
  });

  // Copia la categoría por defecto si está vacía
  db.run("UPDATE productos SET categoria = 'Varios' WHERE categoria IS NULL OR categoria = ''");
  
  // === FIN DEL BLOQUE DE REPARACIÓN ===
  
  // Semilla
  db.get("SELECT count(*) as count FROM usuarios", (err, row) => {
      if (row && row.count === 0) db.run("INSERT INTO usuarios (usuario, password) VALUES (?, ?)", ["admin", "1234"]);
  });
});

// ================= RUTAS =================

// PRODUCTOS (Con manejo de errores robusto)
app.get("/api/productos", (req, res) => {
    db.all("SELECT * FROM productos", (err, rows) => {
        if (err) { console.error(err); return res.json([]); }
        res.json(rows || []);
    });
});
app.post("/api/productos", (req, res) => {
    const { nombre, precio, stock, categoria, codigo_barras } = req.body;
    // Nos aseguramos que codigo_barras sea string, aunque venga null
const code = codigo_barras && codigo_barras.trim() !== "" ? codigo_barras : null; 

    db.run("INSERT INTO productos (nombre, precio, stock, categoria, codigo_barras) VALUES (?,?,?,?,?)", 
        [nombre, precio, stock, categoria, code], // <--- Aquí usamos la variable 'code' corregida
        function(err) {
            if(err) return res.status(500).json({error: err.message});
            res.json({id: this.lastID});
        }
    );
});
app.put("/api/productos/:id", (req, res) => {
    const { nombre, precio, stock, categoria, codigo_barras } = req.body;
    db.run("UPDATE productos SET nombre=?, precio=?, stock=?, categoria=?, codigo_barras=? WHERE id=?", 
        [nombre, precio, stock, categoria, codigo_barras, req.params.id], 
        (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})
    );
});
app.delete("/api/productos/:id", (req, res) => db.run("DELETE FROM productos WHERE id = ?", [req.params.id], () => res.json({success: true})));

// CIGARRILLOS
app.get("/api/cigarrillos", (req, res) => db.all("SELECT * FROM cigarrillos", (err, r) => res.json(r || [])));
app.post("/api/cigarrillos", (req, res) => {
    const { nombre, precio, precio_qr, stock, codigo_barras } = req.body;
    db.run("INSERT INTO cigarrillos (nombre, precio, precio_qr, stock, codigo_barras) VALUES (?,?,?,?,?)", 
        [nombre, precio, precio_qr, stock, codigo_barras || ""], 
        () => res.json({success: true})
    );
});
app.put("/api/cigarrillos/:id", (req, res) => {
    const { nombre, precio, precio_qr, stock, codigo_barras } = req.body;
    db.run("UPDATE cigarrillos SET nombre=?, precio=?, precio_qr=?, stock=?, codigo_barras=? WHERE id=?", 
        [nombre, precio, precio_qr, stock, codigo_barras, req.params.id], 
        () => res.json({success: true})
    );
});
app.delete("/api/cigarrillos/:id", (req, res) => db.run("DELETE FROM cigarrillos WHERE id = ?", [req.params.id], () => res.json({success: true})));

// PROMOS
app.get("/api/promos", async (req, res) => {
    try {
        const promos = await dbAll("SELECT * FROM promos");
        const detalles = await dbAll("SELECT * FROM detalle_promos");
        const completas = promos.map(p => ({ ...p, componentes: detalles.filter(d => d.promo_id === p.id) }));
        res.json(completas);
    } catch (e) { res.status(500).json({error: e.message}); }
});
app.post("/api/promos", async (req, res) => {
    const { nombre, precio, codigo_barras, componentes } = req.body;
    try {
        await dbRun("BEGIN TRANSACTION");
        const promoId = await new Promise((res, rej) => {
            db.run("INSERT INTO promos (nombre, precio, codigo_barras) VALUES (?,?,?)", [nombre, precio, codigo_barras], function(err){ err ? rej(err) : res(this.lastID); });
        });
        for (const c of componentes) {
            let tipo = (c.tipo === 'Cigarrillo' || c.tipo === 'cigarrillo') ? 'cigarrillo' : 'producto';
            await dbRun("INSERT INTO detalle_promos (promo_id, producto_id, tipo_producto, cantidad) VALUES (?,?,?,?)", [promoId, c.id, tipo, c.cantidad]);
        }
        await dbRun("COMMIT");
        res.json({ success: true, id: promoId });
    } catch (error) { await dbRun("ROLLBACK"); res.status(500).json({ error: error.message }); }
});
app.put("/api/promos/:id", async (req, res) => {
    const { nombre, precio, codigo_barras, componentes } = req.body;
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("UPDATE promos SET nombre=?, precio=?, codigo_barras=? WHERE id=?", [nombre, precio, codigo_barras, req.params.id]);
        await dbRun("DELETE FROM detalle_promos WHERE promo_id = ?", [req.params.id]);
        for (const c of componentes) {
            let tipo = (c.tipo === 'Cigarrillo' || c.tipo === 'cigarrillo') ? 'cigarrillo' : 'producto';
            await dbRun("INSERT INTO detalle_promos (promo_id, producto_id, tipo_producto, cantidad) VALUES (?,?,?,?)", [req.params.id, c.id, tipo, c.cantidad]);
        }
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (error) { await dbRun("ROLLBACK"); res.status(500).json({ error: error.message }); }
});
app.delete("/api/promos/:id", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("DELETE FROM detalle_promos WHERE promo_id = ?", [req.params.id]);
        await dbRun("DELETE FROM promos WHERE id = ?", [req.params.id]);
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

// VENTAS
app.get("/api/ventas", (req, res) => db.all("SELECT * FROM ventas ORDER BY fecha DESC", (err, r) => res.json(r || [])));
app.get("/api/historial", (req, res) => {
    db.all("SELECT * FROM ventas ORDER BY fecha DESC", (err, rows) => {
        if (err) { console.error(err); return res.json([]); }
        res.json(rows || []);
    });
});
// REEMPLAZAR BLOQUE app.post("/api/ventas" ... COMPLETO
app.post("/api/ventas", async (req, res) => {
    // Recibimos nuevos parámetros: pago_anticipado y metodo_anticipo
    const { productos, metodo_pago, desglose, cliente_id, pago_anticipado, metodo_anticipo } = req.body;
    
    if (!productos || productos.length === 0) return res.status(400).json({ error: "Carrito vacío" });
    const ticket_id = Date.now().toString(); 
    
    try {
        await dbRun("BEGIN TRANSACTION");
        
        const totalVenta = productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        
        // 1. Lógica de Ratios (Cuánto fue efectivo y cuánto digital para la estadística)
        let rEfvo = 0, rDig = 0;
        let pagoEfvoTotal = 0, pagoDigTotal = 0;

        if (cliente_id) {
            // --- CASO FIADO (TOTAL O PARCIAL) ---
            const entrega = parseFloat(pago_anticipado) || 0;
            
            // Si hubo entrega, calculamos ratios sobre el TOTAL de la venta
            // Ejemplo: Venta $1000, Entrega $400 (Efvo).
            // rEfvo = 0.4 (40% de la venta fue pagada en efectivo hoy)
            // rDig = 0
            // El 60% restante es deuda y no suma a caja diaria.
            if (entrega > 0) {
                if (metodo_anticipo === 'Efectivo') {
                    rEfvo = entrega / totalVenta;
                    pagoEfvoTotal = entrega;
                } else {
                    rDig = entrega / totalVenta;
                    pagoDigTotal = entrega;
                }
            }
            // Si entrega es 0, rEfvo y rDig quedan en 0 (Todo deuda)
            
        } else {
            // --- CASO VENTA NORMAL ---
            if (desglose && desglose.total > 0) { 
                rEfvo = desglose.efectivo / desglose.total; 
                rDig = desglose.digital / desglose.total;
            } else { 
                if (metodo_pago === 'Efectivo') { rEfvo = 1; rDig = 0; }
                else { rEfvo = 0; rDig = 1; }
            }
        }

        // 2. Registrar items
        for (const item of productos) {
            const total = item.precio * item.cantidad;
            // Calculamos la parte proporcional que SÍ se pagó
            const pEfvo = total * rEfvo; 
            const pDig = total * rDig;
            const tipo = item.tipo || 'General';
            
            await dbRun(`INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha, pago_efectivo, pago_digital) VALUES (?,?,?,?,?,?, datetime('now', 'localtime'), ?, ?)`, 
                [ticket_id, item.nombre, item.cantidad, total, metodo_pago, tipo, pEfvo, pDig]);
            
            // 3. Stock
            if (!item.es_manual && item.id) {
                if (item.tipo === "Promo") {
                    const ings = await dbAll("SELECT * FROM detalle_promos WHERE promo_id = ?", [item.id]);
                    for (const ing of ings) {
                        const tabla = ing.tipo_producto === 'cigarrillo' ? 'cigarrillos' : 'productos';
                        await dbRun(`UPDATE ${tabla} SET stock = stock - ? WHERE id = ?`, [ing.cantidad * item.cantidad, ing.producto_id]);
                    }
                } else {
                    const tabla = item.tipo === "cigarrillo" ? 'cigarrillos' : 'productos';
                    await dbRun(`UPDATE ${tabla} SET stock = stock - ? WHERE id = ?`, [item.cantidad, item.id]);
                }
            }
        }

        // 4. Registrar Deuda (Solo lo que falta pagar)
        if (cliente_id) {
            const entrega = parseFloat(pago_anticipado) || 0;
            const deuda = totalVenta - entrega;
            
            if (deuda > 0) { // Solo si queda algo por pagar
                // Formateamos descripción: "Compra... (Entrega: $X)"
                let desc = `Compra (Ticket ${ticket_id.slice(-4)})`;
                if (entrega > 0) desc += ` - Entrega $${entrega} (${metodo_anticipo})`;
                
                await dbRun("INSERT INTO fiados (cliente_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", 
                    [cliente_id, deuda, desc]);
            }
        }

        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (error) { await dbRun("ROLLBACK"); res.status(500).json({ error: error.message }); }
});

// LOGIN
app.post("/api/login", (req, res) => {
    db.get("SELECT * FROM usuarios WHERE usuario = ? AND password = ?", [req.body.usuario, req.body.password], (err, row) => {
      row ? res.json({ success: true, usuario: row.usuario }) : res.status(401).json({ success: false });
    });
});

// DASHBOARD
app.get("/api/dashboard", (req, res) => {
    const cierre = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'GENERAL')";
    db.get(`SELECT SUM(precio_total) as total, COUNT(*) as tickets FROM ventas WHERE fecha > ${cierre}`, [], (e, v) => {
        db.get(`SELECT SUM(monto) as total FROM gastos WHERE fecha > ${cierre}`, [], (e, g) => {
            db.all(`SELECT nombre, stock FROM productos WHERE stock <= 5 UNION SELECT nombre, stock FROM cigarrillos WHERE stock <= 5`, [], (e, s) => {
                res.json({ ventas_hoy: v?.total || 0, tickets_hoy: v?.tickets || 0, gastos_hoy: g?.total || 0, bajo_stock: s || [] });
            });
        });
    });
});

// OTROS ENDPOINTS (Mantenidos simples)
app.get("/api/categorias_productos", (req, res) => db.all("SELECT * FROM categorias_productos", (e, r) => res.json(r || [])));
app.post("/api/categorias_productos", (req, res) => db.run("INSERT INTO categorias_productos (nombre) VALUES (?)", [req.body.nombre], function() { res.json({id: this.lastID}) }));
app.delete("/api/categorias_productos/:id", (req, res) => db.run("DELETE FROM categorias_productos WHERE id = ?", [req.params.id], () => res.json({success: true})));

app.get("/api/gastos", (req, res) => db.all("SELECT * FROM gastos ORDER BY fecha DESC", (e, r) => res.json(r || [])));
app.post("/api/gastos", (req, res) => db.run("INSERT INTO gastos (monto, descripcion, categoria, fecha) VALUES (?, ?, ?, datetime('now', 'localtime'))", [req.body.monto, req.body.descripcion, req.body.categoria], () => res.json({success: true})));
app.delete("/api/gastos/:id", (req, res) => db.run("DELETE FROM gastos WHERE id=?", [req.params.id], () => res.json({success: true})));

app.get("/api/clientes", (req, res) => db.all("SELECT c.*, SUM(f.monto) as total_deuda FROM clientes c LEFT JOIN fiados f ON c.id = f.cliente_id GROUP BY c.id", (e, r) => res.json(r || [])));
app.post("/api/clientes", (req, res) => db.run("INSERT INTO clientes (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true})));
app.get("/api/fiados/:id", (req, res) => db.all("SELECT * FROM fiados WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (e, r) => res.json(r || [])));
app.post("/api/fiados", (req, res) => db.run("INSERT INTO fiados (cliente_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [req.body.cliente_id, req.body.monto, req.body.descripcion], () => res.json({success: true})));

app.get("/api/proveedores", (req, res) => db.all("SELECT p.*, SUM(m.monto) as total_deuda FROM proveedores p LEFT JOIN movimientos_proveedores m ON p.id = m.proveedor_id GROUP BY p.id", (e, r) => res.json(r || [])));
app.post("/api/proveedores", (req, res) => db.run("INSERT INTO proveedores (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true})));
app.post("/api/movimientos_proveedores", (req, res) => db.run("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [req.body.proveedor_id, req.body.monto, req.body.descripcion], () => res.json({success: true})));

app.post("/api/apertura", (req, res) => db.run("INSERT INTO aperturas (monto, observacion, fecha) VALUES (?, ?, datetime('now', 'localtime'))", [req.body.monto, req.body.observacion], () => res.json({success: true})));
app.post("/api/cierres", (req, res) => {
    const { tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia } = req.body;
    db.run("INSERT INTO cierres (tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia, fecha) VALUES (?,?,?,?,?,?, datetime('now', 'localtime'))",
        [tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia],
        () => res.json({ success: true }));
});

// REEMPLAZAR BLOQUE app.get("/api/resumen_dia_independiente" ... COMPLETO
app.get("/api/resumen_dia_independiente", async (req, res) => {
    try {
        // Fechas de últimos cierres
        const sqlFechaGral = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'GENERAL')";
        const sqlFechaCig = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'CIGARRILLOS')";
        
        // 1. Apertura de Caja
        const apertura = await dbGet(`SELECT IFNULL(monto, 0) as m FROM aperturas WHERE fecha > ${sqlFechaGral} ORDER BY id DESC LIMIT 1`);
        
        // 2. Ventas (Corregido: Usamos LOWER para ignorar mayúsculas/minúsculas)
        // Todo lo que NO sea cigarrillo se considera General
        const vGral = await dbGet(`SELECT IFNULL(SUM(pago_efectivo), 0) as t FROM ventas WHERE LOWER(categoria) != 'cigarrillo' AND fecha > ${sqlFechaGral}`);
        const vCig = await dbGet(`SELECT IFNULL(SUM(pago_efectivo), 0) as t FROM ventas WHERE LOWER(categoria) = 'cigarrillo' AND fecha > ${sqlFechaCig}`);
        const vDig = await dbGet(`SELECT IFNULL(SUM(pago_digital), 0) as t FROM ventas WHERE fecha > ${sqlFechaGral}`);
        
        // 3. Gastos y Pagos (Salidas de caja)
        const gastos = await dbGet(`SELECT IFNULL(SUM(monto), 0) as t FROM gastos WHERE fecha > ${sqlFechaGral}`);
        const pagosProv = await dbGet(`SELECT IFNULL(SUM(monto), 0) as t FROM movimientos_proveedores WHERE fecha > ${sqlFechaGral}`);
        
        // 4. Cobros de Fiados (Entradas de caja)
        // Nota: Asumimos que los cobros de fiado (monto negativo en tabla fiados) son ingresos de efectivo
        const cobros = await dbGet(`SELECT IFNULL(SUM(ABS(monto)), 0) as t FROM fiados WHERE monto < 0 AND fecha > ${sqlFechaGral}`);
        
        const saldoIni = apertura ? apertura.m : 0;
        const totGral = vGral ? vGral.t : 0;
        const totCig = vCig ? vCig.t : 0;
        const totDig = vDig ? vDig.t : 0;
        const totGastos = gastos ? gastos.t : 0;
        const totProv = pagosProv ? pagosProv.t : 0;
        const totCobros = cobros ? cobros.t : 0;
        
        // Cálculo del dinero que debería haber en el cajón (Físico Esperado)
        // Apertura + Ventas Efectivo + Cobros Fiado - Gastos - Pagos Proveedores
        const esperadoCaja = saldoIni + totGral + totCobros - totGastos - totProv;

        res.json({
            general: { 
                saldo_inicial: saldoIni, 
                ventas: totGral, 
                cobros: totCobros, 
                gastos: totGastos, 
                proveedores: totProv, // Enviamos este dato nuevo
                digital: totDig, 
                esperado: esperadoCaja 
            },
            cigarrillos: { 
                ventas: totCig, 
                esperado: totCig 
            },
            digital: totDig
        });
    } catch (e) { res.status(500).json({error: e.message}); }
});

// ================= REPORTES FALTANTES =================

// 1. Top 5 Productos
app.get("/api/reportes/productos_top", (req, res) => {
    const sql = "SELECT producto as name, SUM(cantidad) as value FROM ventas GROUP BY producto ORDER BY value DESC LIMIT 5";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// 2. Ventas de la semana
app.get("/api/reportes/ventas_semana", (req, res) => {
    const sql = "SELECT strftime('%Y-%m-%d', fecha) as fecha, SUM(precio_total) as total FROM ventas WHERE fecha >= date('now', '-6 days') GROUP BY strftime('%Y-%m-%d', fecha) ORDER BY fecha ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Rellenar días vacíos
        const resultado = [];
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const fechaStr = d.toISOString().split('T')[0];
            const dato = rows.find(r => r.fecha === fechaStr);
            resultado.push({ name: new Date(fechaStr).toLocaleDateString('es-AR', {weekday: 'short'}), total: dato ? dato.total : 0 });
        }
        res.json(resultado);
    });
});

// 3. Métodos de Pago
app.get("/api/reportes/metodos_pago", (req, res) => {
    db.all("SELECT metodo_pago as name, COUNT(*) as value FROM ventas GROUP BY metodo_pago", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.listen(port, () => console.log(`🚀 SERVIDOR OK - http://localhost:${port}`));