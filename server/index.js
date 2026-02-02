const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
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

// --- HELPERS ---
const obtenerSiguienteTicket = async () => {
    try {
        const row = await dbGet("SELECT MAX(ticket_id) as maxId FROM ventas");
        return (row && row.maxId) ? row.maxId + 1 : 1;
    } catch (e) { return 1; }
};

const garantizarCajaDiaria = async () => {
    try {
        const cajaHoy = await dbGet("SELECT * FROM caja_diaria WHERE fecha = date('now', 'localtime')");
        if (cajaHoy) return cajaHoy;

        const ultimoCierre = await dbGet("SELECT * FROM historial_cierres WHERE tipo = 'General' OR tipo = 'general' ORDER BY id DESC LIMIT 1");
        
        let saldoInicial = 0;
        if (ultimoCierre) {
            saldoInicial = (ultimoCierre.total_efectivo_real || 0) - (ultimoCierre.monto_retiro || 0);
        }

        console.log(`Iniciando nuevo día. Saldo traído del cierre anterior: $${saldoInicial}`);
        await dbRun("INSERT INTO caja_diaria (fecha, inicio_caja) VALUES (date('now', 'localtime'), ?)", [saldoInicial]);
        
        return { inicio_caja: saldoInicial };
    } catch (e) {
        console.error("Error garantizando caja diaria:", e);
        return { inicio_caja: 0 };
    }
};

// --- INICIALIZACIÓN DB ---
const initDB = async () => {
    try {
        await dbRun(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, precio REAL NOT NULL, costo REAL DEFAULT 0, stock INTEGER DEFAULT 0, codigo_barras TEXT, categoria TEXT DEFAULT 'General')`);
        await dbRun(`CREATE TABLE IF NOT EXISTS cigarrillos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, precio REAL NOT NULL, costo REAL DEFAULT 0, stock INTEGER DEFAULT 0, pack TEXT DEFAULT '20')`);
        await dbRun(`CREATE TABLE IF NOT EXISTS ventas (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER, producto TEXT, cantidad INTEGER, precio_total REAL, precio_unitario REAL DEFAULT 0, cliente_id INTEGER DEFAULT NULL, metodo_pago TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, pago_efectivo REAL DEFAULT 0, pago_digital REAL DEFAULT 0, editado INTEGER DEFAULT 0, cierre_id INTEGER DEFAULT NULL)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS fiados (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente TEXT NOT NULL, cliente_id INTEGER, monto REAL NOT NULL, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, descripcion TEXT, pagado INTEGER DEFAULT 0, metodo_pago TEXT DEFAULT 'Efectivo', cierre_id INTEGER DEFAULT NULL)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, telefono TEXT, direccion TEXT, email TEXT)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, telefono TEXT, direccion TEXT, dia_visita TEXT, rubro TEXT)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, descripcion TEXT NOT NULL, monto REAL NOT NULL, categoria TEXT DEFAULT 'General', fecha DATETIME DEFAULT CURRENT_TIMESTAMP, cierre_id INTEGER DEFAULT NULL, metodo_pago TEXT DEFAULT 'Efectivo')`);
        await dbRun(`CREATE TABLE IF NOT EXISTS caja_diaria (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT UNIQUE, inicio_caja REAL DEFAULT 0, total_efectivo REAL DEFAULT 0, total_digital REAL DEFAULT 0, gastos REAL DEFAULT 0, retiros REAL DEFAULT 0, diferencia REAL DEFAULT 0, cerrado INTEGER DEFAULT 0)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS movimientos_proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER, monto REAL, descripcion TEXT, metodo_pago TEXT DEFAULT 'Efectivo', fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS caja_cigarrillos (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT UNIQUE, inicio REAL DEFAULT 0)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS retiros (id INTEGER PRIMARY KEY AUTOINCREMENT, descripcion TEXT, monto REAL NOT NULL, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, cierre_id INTEGER DEFAULT NULL)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS historial_cierres (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, tipo TEXT DEFAULT 'General', total_ventas REAL, total_gastos REAL, total_efectivo_real REAL, monto_retiro REAL, observacion TEXT)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS promos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, precio REAL NOT NULL, codigo_barras TEXT, componentes TEXT)`);

        const ensureColumn = async (table, column, definition) => { try { await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); } catch (e) { } };
        await ensureColumn("gastos", "metodo_pago", "TEXT DEFAULT 'Efectivo'");
        await ensureColumn("fiados", "cliente", "TEXT");
        await ensureColumn("fiados", "cliente_id", "INTEGER");
        await ensureColumn("fiados", "descripcion", "TEXT");
        await ensureColumn("fiados", "pagado", "INTEGER DEFAULT 0");
        await ensureColumn("fiados", "metodo_pago", "TEXT DEFAULT 'Efectivo'");
        await ensureColumn("fiados", "cierre_id", "INTEGER DEFAULT NULL");
        await ensureColumn("productos", "costo", "REAL DEFAULT 0");
        await ensureColumn("productos", "categoria", "TEXT DEFAULT 'General'");
        await ensureColumn("cigarrillos", "costo", "REAL DEFAULT 0");
        await ensureColumn("ventas", "precio_unitario", "REAL DEFAULT 0");
        await ensureColumn("ventas", "cliente_id", "INTEGER DEFAULT NULL");
        await ensureColumn("ventas", "pago_efectivo", "REAL DEFAULT 0");
        await ensureColumn("ventas", "pago_digital", "REAL DEFAULT 0");
        await ensureColumn("ventas", "editado", "INTEGER DEFAULT 0");
        await ensureColumn("historial_cierres", "total_ventas", "REAL DEFAULT 0");
        await ensureColumn("historial_cierres", "total_gastos", "REAL DEFAULT 0");
        await ensureColumn("historial_cierres", "total_efectivo_real", "REAL DEFAULT 0");
        await ensureColumn("historial_cierres", "monto_retiro", "REAL DEFAULT 0");
        await ensureColumn("historial_cierres", "observacion", "TEXT");
        await ensureColumn("historial_cierres", "tipo", "TEXT DEFAULT 'General'");
        await ensureColumn("ventas", "cierre_id", "INTEGER DEFAULT NULL");
        await ensureColumn("gastos", "cierre_id", "INTEGER DEFAULT NULL");
        await ensureColumn("retiros", "cierre_id", "INTEGER DEFAULT NULL");

        console.log("Base de datos inicializada correctamente.");
    } catch (e) { console.error("Error al inicializar DB:", e); }
};

initDB();

// --- RUTAS ---

// 1. DASHBOARD
app.get("/api/dashboard", async (req, res) => {
    try {
        const ventasHoy = await dbGet("SELECT SUM(precio_total) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE date(fecha) = date('now', 'localtime')");
        const gastosHoy = await dbGet("SELECT SUM(monto) as total FROM gastos WHERE date(fecha) = date('now', 'localtime')");
        const prodBajo = await dbAll("SELECT nombre, stock FROM productos WHERE stock <= 5");
        const cigBajo = await dbAll("SELECT nombre, stock FROM cigarrillos WHERE stock <= 5");
        res.json({ ventas_hoy: ventasHoy.total || 0, tickets_hoy: ventasHoy.tickets || 0, gastos_hoy: gastosHoy.total || 0, bajo_stock: [...prodBajo, ...cigBajo] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. RESUMEN INDEPENDIENTE
app.get("/api/resumen_dia_independiente", async (req, res) => {
    try {
        const ventas = await dbAll("SELECT * FROM ventas WHERE date(fecha) = date('now', 'localtime')");
        const gastos = await dbAll("SELECT * FROM gastos WHERE date(fecha) = date('now', 'localtime')");
        const retiros = await dbAll("SELECT * FROM retiros WHERE date(fecha) = date('now', 'localtime')");
        let totalEfvo = 0, totalDig = 0;
        ventas.forEach(v => {
            if (v.pago_efectivo !== undefined && (v.pago_efectivo > 0 || v.pago_digital > 0)) { totalEfvo += v.pago_efectivo; totalDig += v.pago_digital; } 
            else {
                if (v.metodo_pago === 'Efectivo') totalEfvo += v.precio_total;
                else if (v.metodo_pago === 'Transferencia' || v.metodo_pago === 'Debito') totalDig += v.precio_total;
                else if (v.metodo_pago === 'Mixto') { totalEfvo += v.precio_total / 2; totalDig += v.precio_total / 2; }
            }
        });
        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalRetiros = retiros.reduce((sum, r) => sum + r.monto, 0);
        res.json({ total_efectivo: totalEfvo, total_digital: totalDig, total_gastos: totalGastos, total_retiros: totalRetiros, ventas_total: totalEfvo + totalDig });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. RETIROS
app.get("/api/retiros", async (req, res) => {
    try {
        const manuales = await dbAll("SELECT id, fecha, descripcion, monto, 'MANUAL' as tipo FROM retiros");
        const cierres = await dbAll(`SELECT id, fecha, CASE WHEN tipo = 'cigarrillos' THEN 'Retiro Caja Cigarrillos' ELSE 'Retiro Caja General' END as descripcion, monto_retiro as monto, 'CIERRE' as tipo, id as cierre_id, total_ventas, total_gastos, total_efectivo_real as total_fisico FROM historial_cierres WHERE monto_retiro > 0`);
        const historial = [...manuales, ...cierres];
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const total = historial.reduce((acc, item) => acc + item.monto, 0);
        res.json({ historial, total });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/retiros", (req, res) => { db.run("INSERT INTO retiros (descripcion, monto) VALUES (?,?)", [req.body.descripcion, req.body.monto], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });
app.delete("/api/retiros/:id", (req, res) => { db.run("DELETE FROM retiros WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });

// 4. CIERRES DE CAJA
app.get("/api/cierre/general", async (req, res) => {
    try {
        const caja = await garantizarCajaDiaria();
        const saldoInicial = caja ? caja.inicio_caja : 0;
        const ventas = await dbAll("SELECT * FROM ventas WHERE cierre_id IS NULL AND LOWER(categoria) NOT LIKE '%cigarrillo%'");
        const gastosData = await dbAll("SELECT * FROM gastos WHERE cierre_id IS NULL");
        const cobrosData = await dbAll("SELECT * FROM fiados WHERE cierre_id IS NULL AND date(fecha) = date('now', 'localtime') AND monto < 0");

        let totalEfvo = 0, totalDig = 0, cobrosEfvo = 0, cobrosDig = 0;
        ventas.forEach(v => {
            if (v.pago_efectivo > 0 || v.pago_digital > 0) { totalEfvo += v.pago_efectivo; totalDig += v.pago_digital; } 
            else {
                if (v.metodo_pago === 'Efectivo') totalEfvo += v.precio_total;
                else if (v.metodo_pago === 'Transferencia' || v.metodo_pago === 'Debito') totalDig += v.precio_total;
                else if (v.metodo_pago === 'Mixto') { totalEfvo += v.precio_total / 2; totalDig += v.precio_total / 2; }
            }
        });
        cobrosData.forEach(c => { const m = Math.abs(c.monto); if (c.metodo_pago === 'Transferencia' || c.metodo_pago === 'Digital') cobrosDig += m; else cobrosEfvo += m; });
        let gastosGrales = 0, pagosProv = 0;
        gastosData.forEach(g => { if (g.metodo_pago === 'Efectivo') { if (g.categoria && g.categoria.toLowerCase().includes('proveedor')) pagosProv += g.monto; else gastosGrales += g.monto; } });
        
        const esperado = saldoInicial + totalEfvo + cobrosEfvo - gastosGrales - pagosProv;
        const totalDigital = totalDig + cobrosDig;
        res.json({ saldo_inicial: saldoInicial, ventas: totalEfvo, cobros: cobrosEfvo, gastos: gastosGrales, proveedores: pagosProv, digital: totalDigital, esperado: esperado });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/cierre/cigarrillos", async (req, res) => {
    try {
        const caja = await dbGet("SELECT * FROM caja_cigarrillos WHERE fecha = date('now', 'localtime')");
        const saldoInicial = caja ? caja.inicio : 0;
        const ventas = await dbAll("SELECT * FROM ventas WHERE cierre_id IS NULL AND LOWER(categoria) LIKE '%cigarrillo%'");
        let total = 0, cant = 0;
        ventas.forEach(v => { total += v.precio_total; cant += v.cantidad; });
        res.json({ saldo_inicial: saldoInicial, ventas: total, cantidad: cant, items: ventas });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/cierres_unificado", async (req, res) => {
    const { tipo, total_efectivo_real, monto_retiro, observacion, total_ventas, total_gastos, nuevo_inicio_manual } = req.body;
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO historial_cierres (tipo, total_ventas, total_gastos, total_efectivo_real, monto_retiro, observacion, fecha) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))", 
            [tipo || 'General', total_ventas || 0, total_gastos || 0, total_efectivo_real, monto_retiro, observacion]
        );
        const cierreRow = await dbGet("SELECT last_insert_rowid() as id");
        const cierreId = cierreRow.id;

        let nuevoInicio = total_efectivo_real - monto_retiro;
        if (nuevo_inicio_manual !== undefined && nuevo_inicio_manual !== null) {
            nuevoInicio = parseFloat(nuevo_inicio_manual);
        }

        const fechaLocal = "date('now', 'localtime')";

        if (tipo === 'cigarrillos') {
            await dbRun("UPDATE ventas SET cierre_id = ? WHERE cierre_id IS NULL AND LOWER(categoria) LIKE '%cigarrillo%'", [cierreId]);
            const existeCaja = await dbGet(`SELECT * FROM caja_cigarrillos WHERE fecha = ${fechaLocal}`);
            if(existeCaja) await dbRun(`UPDATE caja_cigarrillos SET inicio = ? WHERE fecha = ${fechaLocal}`, [nuevoInicio]);
            else await dbRun(`INSERT INTO caja_cigarrillos (fecha, inicio) VALUES (${fechaLocal}, ?)`, [nuevoInicio]);
        } else {
            await dbRun("UPDATE ventas SET cierre_id = ? WHERE cierre_id IS NULL AND LOWER(categoria) NOT LIKE '%cigarrillo%'", [cierreId]);
            await dbRun("UPDATE gastos SET cierre_id = ? WHERE cierre_id IS NULL", [cierreId]);
            await dbRun("UPDATE retiros SET cierre_id = ? WHERE cierre_id IS NULL", [cierreId]);
            await dbRun(`UPDATE fiados SET cierre_id = ? WHERE cierre_id IS NULL AND date(fecha) = ${fechaLocal} AND monto < 0`, [cierreId]);

            const existeCaja = await dbGet(`SELECT * FROM caja_diaria WHERE fecha = ${fechaLocal}`);
            if (existeCaja) {
                await dbRun(`UPDATE caja_diaria SET inicio_caja = ?, total_efectivo = 0, total_digital = 0, gastos = 0, retiros = 0, cerrado = 0 WHERE fecha = ${fechaLocal}`, [nuevoInicio]);
            } else {
                await dbRun(`INSERT INTO caja_diaria (fecha, inicio_caja) VALUES (${fechaLocal}, ?)`, [nuevoInicio]);
            }
        }
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

// 5. PROMOS
app.get("/api/promos", (req, res) => {
    db.all("SELECT * FROM promos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const promos = rows.map(p => ({ ...p, componentes: p.componentes ? JSON.parse(p.componentes) : [] }));
        res.json(promos);
    });
});
app.post("/api/promos", (req, res) => {
    const { nombre, precio, codigo_barras, componentes } = req.body;
    db.run("INSERT INTO promos (nombre, precio, codigo_barras, componentes) VALUES (?,?,?,?)", [nombre, precio, codigo_barras, JSON.stringify(componentes)], function(err) { if (err) return res.status(500).json({ error: err.message }); res.json({ id: this.lastID }); });
});
app.put("/api/promos/:id", (req, res) => {
    const { nombre, precio, codigo_barras, componentes } = req.body;
    db.run("UPDATE promos SET nombre=?, precio=?, codigo_barras=?, componentes=? WHERE id=?", [nombre, precio, codigo_barras, JSON.stringify(componentes), req.params.id], function(err) { if (err) return res.status(500).json({ error: err.message }); res.json({ success: true }); });
});
app.delete("/api/promos/:id", (req, res) => { db.run("DELETE FROM promos WHERE id=?", [req.params.id], function(err) { if (err) return res.status(500).json({ error: err.message }); res.json({ success: true }); }); });

// 6. CLIENTES
app.get("/api/clientes", (req, res) => { db.all("SELECT c.*, COALESCE(SUM(f.monto), 0) as total_deuda FROM clientes c LEFT JOIN fiados f ON c.id = f.cliente_id GROUP BY c.id ORDER BY c.nombre", [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });
app.post("/api/clientes", (req, res) => { db.run("INSERT INTO clientes (nombre, telefono, direccion, email) VALUES (?,?,?,?)", [req.body.nombre, req.body.telefono, req.body.direccion, req.body.email], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ id: this.lastID }); }); });
app.put("/api/clientes/:id", (req, res) => {
    const { nombre, telefono, direccion, email } = req.body;
    db.run("UPDATE clientes SET nombre=?, telefono=?, direccion=?, email=? WHERE id=?", [nombre, telefono, direccion, email, req.params.id], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ success: true }); });
});
app.delete("/api/clientes/:id", (req, res) => { db.run("DELETE FROM clientes WHERE id=?", req.params.id, function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ deleted: this.changes }); }); });

// 7. FIADOS
app.get("/api/fiados", (req, res) => { db.all("SELECT * FROM fiados ORDER BY fecha DESC", [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });
app.get("/api/fiados/:id", (req, res) => { db.all("SELECT * FROM fiados WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows || []); }); });
app.post("/api/fiados", (req, res) => {
    db.get("SELECT nombre FROM clientes WHERE id = ?", [req.body.cliente_id], (err, row) => {
        db.run("INSERT INTO fiados (cliente, cliente_id, monto, descripcion, metodo_pago) VALUES (?,?,?,?,?)", 
            [row ? row.nombre : "Desconocido", req.body.cliente_id, req.body.monto, req.body.descripcion, req.body.metodo_pago || 'Efectivo'], 
            function(err) { if(err) res.status(500).json({error: err.message}); else res.json({id: this.lastID}); }
        );
    });
});
app.delete("/api/fiados/:id", (req, res) => { db.run("DELETE FROM fiados WHERE id=?", req.params.id, function(err) { if(err) res.status(500).json({error: err.message}); else res.json({success: true}); }); });

// 8. PROVEEDORES
app.get("/api/proveedores", (req, res) => { db.all("SELECT * FROM proveedores ORDER BY nombre", [], (err, rows) => res.json(rows || [])); });
app.post("/api/proveedores", (req, res) => { db.run("INSERT INTO proveedores (nombre, telefono, direccion, dia_visita, rubro) VALUES (?,?,?,?,?)", [req.body.nombre, req.body.telefono, req.body.direccion, req.body.dia_visita, req.body.rubro], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });
app.put("/api/proveedores/:id", (req, res) => {
    const { nombre, telefono, direccion, dia_visita, rubro } = req.body;
    db.run("UPDATE proveedores SET nombre=?, telefono=?, direccion=?, dia_visita=?, rubro=? WHERE id=?", [nombre, telefono, direccion, dia_visita, rubro, req.params.id], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ success: true }); });
});
app.delete("/api/proveedores/:id", (req, res) => { db.run("DELETE FROM proveedores WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });

// 9. MOVIMIENTOS PROVEEDORES
app.get("/api/movimientos_todos", (req, res) => { db.all(`SELECT m.*, p.nombre as proveedor_nombre FROM movimientos_proveedores m JOIN proveedores p ON m.proveedor_id = p.id ORDER BY m.fecha DESC`, [], (err, rows) => { if(err) res.status(500).json({error: err.message}); else res.json(rows || []); }); });
app.get("/api/movimientos_proveedores/:id", (req, res) => {
    db.all("SELECT * FROM movimientos_proveedores WHERE proveedor_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => {
        if(err) res.status(500).json({error: err.message});
        else res.json(rows || []);
    });
});
app.post("/api/movimientos_proveedores", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, metodo_pago) VALUES (?,?,?,?)", [req.body.proveedor_id, req.body.monto, req.body.descripcion, req.body.metodo_pago || 'Efectivo']);
        if (req.body.monto < 0) {
            const prov = await dbGet("SELECT nombre FROM proveedores WHERE id = ?", [req.body.proveedor_id]);
            const desc = `Pago Proveedor: ${prov ? prov.nombre : ''}`;
            if (req.body.metodo_pago === 'Fondo Retiros') await dbRun("INSERT INTO retiros (descripcion, monto) VALUES (?, ?)", [desc, req.body.monto]);
            else if (!req.body.metodo_pago || req.body.metodo_pago === 'Efectivo') await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", [desc, Math.abs(req.body.monto), 'Proveedores', 'Efectivo']);
        }
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});
app.delete("/api/movimientos_proveedores/:id", (req, res) => { db.run("DELETE FROM movimientos_proveedores WHERE id=?", [req.params.id], function(err) { if(err) res.status(500).json({error: err.message}); else res.json({deleted: this.changes}); }); });

// 10. PRODUCTOS & CATEGORÍAS
app.get("/api/productos", (req, res) => { db.all("SELECT * FROM productos ORDER BY nombre", [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });
app.post("/api/productos", (req, res) => { db.run("INSERT INTO productos (nombre, precio, costo, stock, codigo_barras, categoria) VALUES (?,?,?,?,?,?)", [req.body.nombre, req.body.precio, req.body.costo, req.body.stock, req.body.codigo_barras, req.body.categoria || 'General'], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ id: this.lastID }); }); });
app.put("/api/productos/:id", (req, res) => { db.run("UPDATE productos SET nombre=?, precio=?, costo=?, stock=?, codigo_barras=?, categoria=? WHERE id=?", [req.body.nombre, req.body.precio, req.body.costo, req.body.stock, req.body.codigo_barras, req.body.categoria, req.params.id], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ updated: this.changes }); }); });
app.delete("/api/productos/:id", (req, res) => { db.run("DELETE FROM productos WHERE id=?", req.params.id, function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ deleted: this.changes }); }); });

app.get("/api/categorias", (req, res) => {
    db.all("SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != '' ORDER BY categoria", [], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        const cats = rows.map(r => r.categoria);
        res.json(cats);
    });
});
app.delete("/api/categorias/:nombre", (req, res) => {
    const catToDelete = req.params.nombre;
    if(catToDelete === 'General') return res.status(400).json({error: "No se puede eliminar la categoría base."});
    db.run("UPDATE productos SET categoria = 'General' WHERE categoria = ?", [catToDelete], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({success: true, message: "Categoría eliminada y productos movidos a General"});
    });
});

// 11. CIGARRILLOS
app.get("/api/cigarrillos", (req, res) => { db.all("SELECT * FROM cigarrillos ORDER BY nombre", [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });
app.post("/api/cigarrillos", (req, res) => { db.run("INSERT INTO cigarrillos (nombre, precio, costo, stock, pack) VALUES (?,?,?,?,?)", [req.body.nombre, req.body.precio, req.body.costo, req.body.stock, req.body.pack], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ id: this.lastID }); }); });
app.put("/api/cigarrillos/:id", (req, res) => { db.run("UPDATE cigarrillos SET nombre=?, precio=?, costo=?, stock=?, pack=? WHERE id=?", [req.body.nombre, req.body.precio, req.body.costo, req.body.stock, req.body.pack, req.params.id], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ updated: this.changes }); }); });
app.delete("/api/cigarrillos/:id", (req, res) => { db.run("DELETE FROM cigarrillos WHERE id=?", req.params.id, function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ deleted: this.changes }); }); });

// 12. VENTAS
app.post("/api/ventas", async (req, res) => {
    const { productos, metodo_pago, ticket_a_corregir, cliente_id } = req.body;
    const pagoAnticipado = parseFloat(req.body.pago_anticipado) || 0;
    const metodoAnticipo = req.body.metodo_anticipo || 'Efectivo';
    if (!productos || productos.length === 0) return res.status(400).json({ error: "No hay productos en la venta" });
    const total = productos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    try {
        await dbRun("BEGIN TRANSACTION");
        if (ticket_a_corregir) { await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [ticket_a_corregir]); await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${ticket_a_corregir}%`]); }
        const ticket_id = await obtenerSiguienteTicket();
        let pEfvo = 0, pDig = 0;
        if (metodo_pago === 'Mixto') { pEfvo = parseFloat(req.body.pago_efectivo) || 0; pDig = parseFloat(req.body.pago_digital) || 0; } 
        else if (metodo_pago === 'Efectivo') pEfvo = total;
        else if (metodo_pago === 'Fiado') { if (metodoAnticipo === 'Efectivo') pEfvo = pagoAnticipado; else pDig = pagoAnticipado; } 
        else pDig = total;
        const esEdicion = ticket_a_corregir ? 1 : 0;
        for (const item of productos) {
            let tabla = null;
            if (item.tipo === 'Cigarrillo' || (item.categoria && item.categoria.toLowerCase().includes('cigarrillo'))) tabla = 'cigarrillos'; else if (item.tipo === 'Producto') tabla = 'productos';
            if (tabla) {
                const productoDB = await dbGet(`SELECT stock FROM ${tabla} WHERE nombre = ?`, [item.nombre]);
                if (!productoDB) throw new Error(`Producto no encontrado: ${item.nombre}`);
                if (productoDB.stock < item.cantidad) throw new Error(`Stock insuficiente ${item.nombre}: ${productoDB.stock}`);
                await dbRun(`UPDATE ${tabla} SET stock = stock - ? WHERE nombre = ?`, [item.cantidad, item.nombre]);
            }
            let cat = item.tipo || 'General'; if (tabla === 'cigarrillos' || item.tipo === 'Cigarrillo') cat = 'Cigarrillo';
            await dbRun(`INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, precio_unitario, cliente_id, metodo_pago, categoria, fecha, pago_efectivo, pago_digital, editado) VALUES (?,?,?,?,?,?,?,?, datetime('now', 'localtime'), ?, ?, ?)`, 
                [ticket_id, item.nombre, item.cantidad, total, item.precio, cliente_id, metodo_pago, cat, pEfvo, pDig, esEdicion]);
        }
        if (metodo_pago === 'Fiado') {
             if(!cliente_id) throw new Error("Debe seleccionar un cliente.");
             const cli = await dbGet("SELECT nombre FROM clientes WHERE id = ?", [cliente_id]);
             const deuda = total - pagoAnticipado;
             if(deuda > 0) await dbRun("INSERT INTO fiados (cliente, cliente_id, monto, descripcion) VALUES (?, ?, ?, ?)", [cli ? cli.nombre : "Desconocido", cliente_id, deuda, `Fiado Ticket ${ticket_id}`]);
        }
        await dbRun("COMMIT");
        res.json({ success: true, ticket_id });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});
app.delete("/api/ventas/:ticket_id", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        const items = await dbAll("SELECT * FROM ventas WHERE ticket_id = ?", [req.params.ticket_id]);
        if (items.length === 0) { await dbRun("ROLLBACK"); return res.status(404).json({ error: "Venta no encontrada" }); }
        for (const item of items) {
            let tabla = null;
            if (item.categoria && item.categoria.toLowerCase().includes('cigarrillo')) tabla = 'cigarrillos'; else if (item.categoria !== 'Manual') tabla = 'productos';
            if(tabla) await dbRun(`UPDATE ${tabla} SET stock = stock + ? WHERE nombre = ?`, [item.cantidad, item.producto]);
        }
        await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [req.params.ticket_id]);
        await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${req.params.ticket_id}%`]);
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});
app.get("/api/ventas/historial", (req, res) => { db.all(`SELECT v.*, c.nombre as nombre_cliente FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id ORDER BY v.fecha DESC`, [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });

// 13. GASTOS
app.get("/api/gastos", (req, res) => { db.all("SELECT * FROM gastos ORDER BY fecha DESC", [], (err, rows) => res.json(rows || [])); });
app.post("/api/gastos", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", [req.body.descripcion, req.body.monto, req.body.categoria, req.body.metodo_pago || 'Efectivo']);
        if (req.body.metodo_pago === 'Retiros') await dbRun("INSERT INTO retiros (descripcion, monto) VALUES (?, ?)", [`Gasto: ${req.body.descripcion}`, -Math.abs(req.body.monto)]);
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});
app.delete("/api/gastos/:id", (req, res) => { db.run("DELETE FROM gastos WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });

// SPA FALLBACK
app.get(/.*/, (req, res) => { res.sendFile(path.join(__dirname, '../dist/index.html')); });

app.listen(port, () => { console.log(`Servidor corriendo en http://localhost:${port}`); });