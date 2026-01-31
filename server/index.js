const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend compilado
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
    } catch (e) {
        return 1;
    }
};

// --- INICIALIZACIÓN DB ---
const initDB = async () => {
    try {
        // Tablas existentes
        await dbRun(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL,
            costo REAL DEFAULT 0,
            stock INTEGER DEFAULT 0,
            codigo_barras TEXT,
            categoria TEXT DEFAULT 'General'
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS cigarrillos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL,
            costo REAL DEFAULT 0,
            stock INTEGER DEFAULT 0,
            pack TEXT DEFAULT '20'
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER,
            producto TEXT,
            cantidad INTEGER,
            precio_total REAL,
            metodo_pago TEXT,
            categoria TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            pago_efectivo REAL DEFAULT 0,
            pago_digital REAL DEFAULT 0,
            editado INTEGER DEFAULT 0,
            cierre_id INTEGER DEFAULT NULL
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS fiados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            cliente_id INTEGER,
            monto REAL NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            descripcion TEXT,
            pagado INTEGER DEFAULT 0,
            metodo_pago TEXT DEFAULT 'Efectivo'
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT,
            direccion TEXT,
            email TEXT
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT,
            direccion TEXT,
            dia_visita TEXT,
            rubro TEXT
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descripcion TEXT NOT NULL,
            monto REAL NOT NULL,
            categoria TEXT DEFAULT 'General',
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            cierre_id INTEGER DEFAULT NULL,
            metodo_pago TEXT DEFAULT 'Efectivo'
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS caja_diaria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT UNIQUE,
            inicio_caja REAL DEFAULT 0,
            total_efectivo REAL DEFAULT 0,
            total_digital REAL DEFAULT 0,
            gastos REAL DEFAULT 0,
            retiros REAL DEFAULT 0,
            diferencia REAL DEFAULT 0,
            cerrado INTEGER DEFAULT 0
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS movimientos_proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proveedor_id INTEGER,
            monto REAL,
            descripcion TEXT,
            metodo_pago TEXT DEFAULT 'Efectivo',
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS caja_cigarrillos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT UNIQUE,
            inicio REAL DEFAULT 0
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS retiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descripcion TEXT,
            monto REAL NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            cierre_id INTEGER DEFAULT NULL
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS historial_cierres (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            tipo TEXT DEFAULT 'General',
            total_ventas REAL,
            total_gastos REAL,
            total_efectivo_real REAL,
            monto_retiro REAL,
            observacion TEXT
        )`);

        // Actualizaciones de columnas (Migraciones automáticas)
        const ensureColumn = async (table, column, definition) => {
            try {
                await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`Columna ${column} agregada a ${table}`);
            } catch (e) { }
        };

        await ensureColumn("gastos", "metodo_pago", "TEXT DEFAULT 'Efectivo'");
        
        await ensureColumn("fiados", "cliente", "TEXT");
        await ensureColumn("fiados", "cliente_id", "INTEGER");
        await ensureColumn("fiados", "descripcion", "TEXT");
        await ensureColumn("fiados", "pagado", "INTEGER DEFAULT 0");
        await ensureColumn("fiados", "metodo_pago", "TEXT DEFAULT 'Efectivo'");

        await ensureColumn("productos", "costo", "REAL DEFAULT 0");
        await ensureColumn("productos", "categoria", "TEXT DEFAULT 'General'");
        await ensureColumn("cigarrillos", "costo", "REAL DEFAULT 0");
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
    } catch (e) {
        console.error("Error al inicializar DB:", e);
    }
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
        
        res.json({
            ventas_hoy: ventasHoy.total || 0,
            tickets_hoy: ventasHoy.tickets || 0,
            gastos_hoy: gastosHoy.total || 0,
            bajo_stock: [...prodBajo, ...cigBajo]
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. RESUMEN INDEPENDIENTE
app.get("/api/resumen_dia_independiente", async (req, res) => {
    try {
        const ventas = await dbAll("SELECT * FROM ventas WHERE date(fecha) = date('now', 'localtime')");
        const gastos = await dbAll("SELECT * FROM gastos WHERE date(fecha) = date('now', 'localtime')");
        const retiros = await dbAll("SELECT * FROM retiros WHERE date(fecha) = date('now', 'localtime')");

        let totalEfvo = 0;
        let totalDig = 0;
        
        ventas.forEach(v => {
            if (v.pago_efectivo !== undefined && (v.pago_efectivo > 0 || v.pago_digital > 0)) {
                totalEfvo += v.pago_efectivo;
                totalDig += v.pago_digital;
            } else {
                if (v.metodo_pago === 'Efectivo') totalEfvo += v.precio_total;
                else if (v.metodo_pago === 'Transferencia' || v.metodo_pago === 'Debito') totalDig += v.precio_total;
                else if (v.metodo_pago === 'Mixto') {
                    totalEfvo += v.precio_total / 2;
                    totalDig += v.precio_total / 2;
                }
            }
        });

        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalRetiros = retiros.reduce((sum, r) => sum + r.monto, 0);

        res.json({
            total_efectivo: totalEfvo,
            total_digital: totalDig,
            total_gastos: totalGastos,
            total_retiros: totalRetiros,
            ventas_total: totalEfvo + totalDig
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. RUTAS DE CIERRE Y RETIROS

// RETIROS
app.get("/api/retiros", async (req, res) => {
    try {
        const manuales = await dbAll("SELECT id, fecha, descripcion, monto, 'MANUAL' as tipo FROM retiros");
        
        const cierres = await dbAll(`
            SELECT 
                id, 
                fecha, 
                CASE 
                    WHEN tipo = 'cigarrillos' THEN 'Retiro Caja Cigarrillos' 
                    ELSE 'Retiro Caja General' 
                END as descripcion, 
                monto_retiro as monto, 
                'CIERRE' as tipo, 
                id as cierre_id, 
                total_ventas, 
                total_gastos, 
                total_efectivo_real as total_fisico 
            FROM historial_cierres 
            WHERE monto_retiro > 0
        `);

        const historial = [...manuales, ...cierres];
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const total = historial.reduce((acc, item) => acc + item.monto, 0);

        res.json({ historial, total });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/retiros", (req, res) => {
    const { descripcion, monto } = req.body;
    db.run("INSERT INTO retiros (descripcion, monto) VALUES (?,?)", [descripcion, monto], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});

app.delete("/api/retiros/:id", (req, res) => {
    db.run("DELETE FROM retiros WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});

// Cierres
app.get("/api/cierre/general", async (req, res) => {
    try {
        const caja = await dbGet("SELECT * FROM caja_diaria WHERE fecha = date('now', 'localtime')");
        const saldoInicial = caja ? caja.inicio_caja : 0;

        const ventas = await dbAll("SELECT * FROM ventas WHERE cierre_id IS NULL AND LOWER(categoria) NOT LIKE '%cigarrillo%'");
        const gastosData = await dbAll("SELECT * FROM gastos WHERE cierre_id IS NULL");
        
        const cobrosData = await dbAll("SELECT * FROM fiados WHERE date(fecha) = date('now', 'localtime') AND monto < 0");

        let totalEfvo = 0;
        let totalDig = 0;
        let cobrosEfvo = 0;
        let cobrosDig = 0;

        // Sumar Ventas
        ventas.forEach(v => {
            if (v.pago_efectivo > 0 || v.pago_digital > 0) {
                totalEfvo += v.pago_efectivo;
                totalDig += v.pago_digital;
            } else {
                if (v.metodo_pago === 'Efectivo') totalEfvo += v.precio_total;
                else if (v.metodo_pago === 'Transferencia' || v.metodo_pago === 'Debito') totalDig += v.precio_total;
                else if (v.metodo_pago === 'Mixto') {
                    totalEfvo += v.precio_total / 2;
                    totalDig += v.precio_total / 2;
                }
            }
        });

        // Sumar Cobros de Deudores
        cobrosData.forEach(c => {
            const montoPositivo = Math.abs(c.monto);
            if (c.metodo_pago === 'Transferencia' || c.metodo_pago === 'Digital') {
                cobrosDig += montoPositivo;
            } else {
                cobrosEfvo += montoPositivo;
            }
        });

        let gastosGrales = 0;
        let pagosProveedores = 0;

        // FILTRAR GASTOS PARA CAJA FÍSICA (Solo restamos si se pagó en Efectivo)
        gastosData.forEach(g => {
            if (g.metodo_pago === 'Efectivo') {
                if (g.categoria && g.categoria.toLowerCase().includes('proveedor')) {
                    pagosProveedores += g.monto;
                } else {
                    gastosGrales += g.monto;
                }
            }
        });
        
        const esperado = saldoInicial + totalEfvo + cobrosEfvo - gastosGrales - pagosProveedores;
        const totalDigital = totalDig + cobrosDig;

        res.json({
            saldo_inicial: saldoInicial,
            ventas: totalEfvo, 
            cobros: cobrosEfvo, 
            gastos: gastosGrales,
            proveedores: pagosProveedores,
            digital: totalDigital, 
            esperado: esperado
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/cierre/cigarrillos", async (req, res) => {
    try {
        const caja = await dbGet("SELECT * FROM caja_cigarrillos WHERE fecha = date('now', 'localtime')");
        const saldoInicial = caja ? caja.inicio : 0;

        const ventas = await dbAll("SELECT * FROM ventas WHERE cierre_id IS NULL AND LOWER(categoria) LIKE '%cigarrillo%'");
        
        let total = 0;
        let cantidadPack = 0;

        ventas.forEach(v => {
            total += v.precio_total;
            cantidadPack += v.cantidad;
        });

        res.json({
            saldo_inicial: saldoInicial,
            ventas: total,
            cantidad: cantidadPack,
            items: ventas
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/cierres_unificado", async (req, res) => {
    const { tipo, total_efectivo_real, monto_retiro, observacion, total_ventas, total_gastos } = req.body;
    const hoy = new Date().toISOString().split('T')[0];

    try {
        await dbRun("BEGIN TRANSACTION");

        await dbRun("INSERT INTO historial_cierres (tipo, total_ventas, total_gastos, total_efectivo_real, monto_retiro, observacion) VALUES (?, ?, ?, ?, ?, ?)", 
            [tipo || 'General', total_ventas || 0, total_gastos || 0, total_efectivo_real, monto_retiro, observacion]
        );
        
        const cierreRow = await dbGet("SELECT last_insert_rowid() as id");
        const cierreId = cierreRow.id;

        const nuevoInicio = total_efectivo_real - monto_retiro;

        if (tipo === 'cigarrillos') {
            await dbRun("UPDATE ventas SET cierre_id = ? WHERE cierre_id IS NULL AND LOWER(categoria) LIKE '%cigarrillo%'", [cierreId]);
            const existeCaja = await dbGet("SELECT * FROM caja_cigarrillos WHERE fecha = ?", [hoy]);
            if(existeCaja) {
                await dbRun("UPDATE caja_cigarrillos SET inicio = ? WHERE fecha = ?", [nuevoInicio, hoy]);
            } else {
                await dbRun("INSERT INTO caja_cigarrillos (fecha, inicio) VALUES (?, ?)", [hoy, nuevoInicio]);
            }
        } else {
            await dbRun("UPDATE ventas SET cierre_id = ? WHERE cierre_id IS NULL AND LOWER(categoria) NOT LIKE '%cigarrillo%'", [cierreId]);
            await dbRun("UPDATE gastos SET cierre_id = ? WHERE cierre_id IS NULL", [cierreId]);
            await dbRun("UPDATE retiros SET cierre_id = ? WHERE cierre_id IS NULL", [cierreId]);

            const existeCaja = await dbGet("SELECT * FROM caja_diaria WHERE fecha = ?", [hoy]);
            if (existeCaja) {
                await dbRun(`UPDATE caja_diaria SET inicio_caja = ?, total_efectivo = 0, total_digital = 0, gastos = 0, retiros = 0, cerrado = 0 WHERE fecha = ?`, [nuevoInicio, hoy]);
            } else {
                await dbRun("INSERT INTO caja_diaria (fecha, inicio_caja) VALUES (?, ?)", [hoy, nuevoInicio]);
            }
        }

        await dbRun("COMMIT");
        res.json({ success: true });

    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});


// 4. CLIENTES
app.get("/api/clientes", (req, res) => {
    db.all("SELECT c.*, COALESCE(SUM(f.monto), 0) as total_deuda FROM clientes c LEFT JOIN fiados f ON c.id = f.cliente_id GROUP BY c.id ORDER BY c.nombre", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post("/api/clientes", (req, res) => {
    const { nombre, telefono, direccion, email } = req.body;
    db.run("INSERT INTO clientes (nombre, telefono, direccion, email) VALUES (?,?,?,?)",
        [nombre, telefono, direccion, email],
        function (err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ id: this.lastID });
        }
    );
});

app.delete("/api/clientes/:id", (req, res) => {
    db.run("DELETE FROM clientes WHERE id=?", req.params.id, function (err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// 5. FIADOS Y MOVIMIENTOS
app.get("/api/fiados", (req, res) => {
    db.all("SELECT * FROM fiados ORDER BY fecha DESC", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.get("/api/fiados/:id", (req, res) => {
    db.all("SELECT * FROM fiados WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows || []);
    });
});

app.post("/api/fiados", (req, res) => {
    const { cliente_id, monto, descripcion, metodo_pago } = req.body;
    
    db.get("SELECT nombre FROM clientes WHERE id = ?", [cliente_id], (err, row) => {
        const nombreCliente = row ? row.nombre : "Desconocido";
        
        db.run("INSERT INTO fiados (cliente, cliente_id, monto, descripcion, metodo_pago) VALUES (?,?,?,?,?)", 
            [nombreCliente, cliente_id, monto, descripcion, metodo_pago || 'Efectivo'], 
            function(err) {
                if(err) res.status(500).json({error: err.message});
                else res.json({id: this.lastID});
            }
        );
    });
});

app.delete("/api/fiados/:id", (req, res) => {
    db.run("DELETE FROM fiados WHERE id=?", req.params.id, function(err) {
        if(err) res.status(500).json({error: err.message});
        else res.json({success: true});
    });
});

// 6. PROVEEDORES
app.get("/api/proveedores", (req, res) => {
    db.all("SELECT * FROM proveedores ORDER BY nombre", [], (err, rows) => res.json(rows || []));
});
app.post("/api/proveedores", (req, res) => {
    const { nombre, telefono, direccion, dia_visita, rubro } = req.body;
    db.run("INSERT INTO proveedores (nombre, telefono, direccion, dia_visita, rubro) VALUES (?,?,?,?,?)",
        [nombre, telefono, direccion, dia_visita, rubro], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});
app.delete("/api/proveedores/:id", (req, res) => {
    db.run("DELETE FROM proveedores WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});

app.get("/api/movimientos_todos", (req, res) => {
    const sql = `
        SELECT m.*, p.nombre as proveedor_nombre 
        FROM movimientos_proveedores m 
        JOIN proveedores p ON m.proveedor_id = p.id 
        ORDER BY m.fecha DESC`;
    db.all(sql, [], (err, rows) => {
        if(err) res.status(500).json({error: err.message});
        else res.json(rows || []);
    });
});

// MOVIMIENTOS PROVEEDORES CORREGIDO (Registra en GASTOS si es Efectivo)
app.post("/api/movimientos_proveedores", async (req, res) => {
    const { proveedor_id, monto, descripcion, metodo_pago } = req.body;
    const metodo = metodo_pago || 'Efectivo';

    try {
        await dbRun("BEGIN TRANSACTION");

        // 1. Guardar en historial de proveedor
        await dbRun("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, metodo_pago) VALUES (?,?,?,?)",
            [proveedor_id, monto, descripcion, metodo]
        );

        // Obtenemos nombre del proveedor para el detalle
        const prov = await dbGet("SELECT nombre FROM proveedores WHERE id = ?", [proveedor_id]);
        const nombreProv = prov ? prov.nombre : "Proveedor Desconocido";
        const montoAbs = Math.abs(monto); // El monto viene negativo si es pago, lo hacemos positivo para gastos

        // 2. Si es PAGO (monto negativo)
        if (monto < 0) {
            if (metodo === 'Fondo Retiros') {
                // Descontar del colchón de retiros
                await dbRun("INSERT INTO retiros (descripcion, monto) VALUES (?, ?)", 
                    [`Pago Proveedor: ${nombreProv}`, monto] // Mantenemos negativo para restar del fondo
                );
            } else if (metodo === 'Efectivo' || !metodo) {
                // Descontar de la caja chica (registrando como GASTO)
                await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", 
                    [`Pago a ${nombreProv}: ${descripcion || ''}`, montoAbs, 'Proveedores', 'Efectivo']
                );
            }
        }

        await dbRun("COMMIT");
        res.json({ success: true });

    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/movimientos_proveedores/:id", (req, res) => {
    db.run("DELETE FROM movimientos_proveedores WHERE id=?", [req.params.id], function(err) {
        if(err) res.status(500).json({error: err.message});
        else res.json({deleted: this.changes});
    });
});

// --- RESTO DE RUTAS ---

// PRODUCTOS
app.get("/api/productos", (req, res) => {
    db.all("SELECT * FROM productos ORDER BY nombre", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post("/api/productos", (req, res) => {
    const { nombre, precio, costo, stock, codigo_barras, categoria } = req.body;
    db.run("INSERT INTO productos (nombre, precio, costo, stock, codigo_barras, categoria) VALUES (?,?,?,?,?,?)",
        [nombre, precio, costo, stock, codigo_barras, categoria || 'General'],
        function (err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ id: this.lastID });
        }
    );
});

app.put("/api/productos/:id", (req, res) => {
    const { nombre, precio, costo, stock, codigo_barras, categoria } = req.body;
    db.run("UPDATE productos SET nombre=?, precio=?, costo=?, stock=?, codigo_barras=?, categoria=? WHERE id=?",
        [nombre, precio, costo, stock, codigo_barras, categoria, req.params.id],
        function (err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ updated: this.changes });
        }
    );
});

app.delete("/api/productos/:id", (req, res) => {
    db.run("DELETE FROM productos WHERE id=?", req.params.id, function (err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// CIGARRILLOS
app.get("/api/cigarrillos", (req, res) => {
    db.all("SELECT * FROM cigarrillos ORDER BY nombre", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post("/api/cigarrillos", (req, res) => {
    const { nombre, precio, costo, stock, pack } = req.body;
    db.run("INSERT INTO cigarrillos (nombre, precio, costo, stock, pack) VALUES (?,?,?,?,?)",
        [nombre, precio, costo, stock, pack],
        function (err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ id: this.lastID });
        }
    );
});

app.put("/api/cigarrillos/:id", (req, res) => {
    const { nombre, precio, costo, stock, pack } = req.body;
    db.run("UPDATE cigarrillos SET nombre=?, precio=?, costo=?, stock=?, pack=? WHERE id=?",
        [nombre, precio, costo, stock, pack, req.params.id],
        function (err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ updated: this.changes });
        }
    );
});

app.delete("/api/cigarrillos/:id", (req, res) => {
    db.run("DELETE FROM cigarrillos WHERE id=?", req.params.id, function (err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ deleted: this.changes });
    });
});

// VENTAS
app.post("/api/ventas", async (req, res) => {
    const { productos, metodo_pago, ticket_a_corregir, cliente_id } = req.body;
    
    const pagoAnticipado = parseFloat(req.body.pago_anticipado) || 0;
    const metodoAnticipo = req.body.metodo_anticipo || 'Efectivo';

    if (!productos || productos.length === 0) {
        return res.status(400).json({ error: "No hay productos en la venta" });
    }

    const total = productos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);

    try {
        await dbRun("BEGIN TRANSACTION");

        if (ticket_a_corregir) {
            await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [ticket_a_corregir]);
            await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${ticket_a_corregir}%`]);
        }

        const ticket_id = await obtenerSiguienteTicket();
        
        let pEfvo = 0;
        let pDig = 0;

        if (metodo_pago === 'Mixto') {
            pEfvo = parseFloat(req.body.pago_efectivo) || 0;
            pDig = parseFloat(req.body.pago_digital) || 0;
        } else if (metodo_pago === 'Efectivo') {
            pEfvo = total;
        } else if (metodo_pago === 'Fiado') {
            if (metodoAnticipo === 'Efectivo') pEfvo = pagoAnticipado;
            else pDig = pagoAnticipado;
        } else {
            pDig = total;
        }

        const esEdicion = ticket_a_corregir ? 1 : 0;

        for (const item of productos) {
            let tabla = null;
            if (item.tipo === 'Cigarrillo' || (item.categoria && item.categoria.toLowerCase().includes('cigarrillo'))) {
                tabla = 'cigarrillos';
            } else if (item.tipo === 'Producto') {
                tabla = 'productos';
            }

            if (tabla) {
                const productoDB = await dbGet(`SELECT stock FROM ${tabla} WHERE nombre = ?`, [item.nombre]);
                if (!productoDB) throw new Error(`Producto no encontrado en stock: ${item.nombre}`);
                if (productoDB.stock < item.cantidad) throw new Error(`Stock insuficiente para ${item.nombre}. Disponible: ${productoDB.stock}`);
                await dbRun(`UPDATE ${tabla} SET stock = stock - ? WHERE nombre = ?`, [item.cantidad, item.nombre]);
            }

            let categoriaGuardar = item.tipo || 'General';
            if (tabla === 'cigarrillos' || item.tipo === 'Cigarrillo') {
                categoriaGuardar = 'Cigarrillo';
            }

            await dbRun(`INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha, pago_efectivo, pago_digital, editado) VALUES (?,?,?,?,?,?, datetime('now', 'localtime'), ?, ?, ?)`, 
                [ticket_id, item.nombre, item.cantidad, total, metodo_pago, categoriaGuardar, pEfvo, pDig, esEdicion]);
        }

        if (metodo_pago === 'Fiado') {
             if(!cliente_id) throw new Error("Debe seleccionar un cliente para fiar.");
             
             const cli = await dbGet("SELECT nombre FROM clientes WHERE id = ?", [cliente_id]);
             const nombreCliente = cli ? cli.nombre : "Cliente Desconocido";
             
             const deuda = total - pagoAnticipado;

             if(deuda > 0) {
                 await dbRun("INSERT INTO fiados (cliente, cliente_id, monto, descripcion) VALUES (?, ?, ?, ?)", 
                     [nombreCliente, cliente_id, deuda, `Fiado Ticket ${ticket_id}`]);
             }
        }

        await dbRun("COMMIT");
        res.json({ success: true, ticket_id });

    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/ventas/:ticket_id", async (req, res) => {
    const { ticket_id } = req.params;
    try {
        await dbRun("BEGIN TRANSACTION");
        
        const items = await dbAll("SELECT * FROM ventas WHERE ticket_id = ?", [ticket_id]);
        
        if (items.length === 0) {
            await dbRun("ROLLBACK");
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        for (const item of items) {
            let tabla = null;
            if (item.categoria && item.categoria.toLowerCase().includes('cigarrillo')) {
                tabla = 'cigarrillos';
            } else if (item.categoria !== 'Manual') {
                tabla = 'productos';
            }

             if(tabla){
                await dbRun(`UPDATE ${tabla} SET stock = stock + ? WHERE nombre = ?`, [item.cantidad, item.producto]);
             }
        }

        await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [ticket_id]);
        await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${ticket_id}%`]);

        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/ventas/historial", (req, res) => {
    db.all("SELECT * FROM ventas ORDER BY fecha DESC", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

// GASTOS (SOLUCIÓN A TU PROBLEMA DE CAJA)
app.get("/api/gastos", (req, res) => {
    db.all("SELECT * FROM gastos ORDER BY fecha DESC", [], (err, rows) => res.json(rows || []));
});

app.post("/api/gastos", async (req, res) => {
    const { descripcion, monto, categoria, metodo_pago } = req.body;
    const metodo = metodo_pago || 'Efectivo';

    try {
        await dbRun("BEGIN TRANSACTION");

        await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", 
            [descripcion, monto, categoria, metodo]
        );

        // Si se paga con RETIROS, se inserta en retiros para descontar del fondo
        if (metodo === 'Retiros') {
            await dbRun("INSERT INTO retiros (descripcion, monto) VALUES (?, ?)", 
                [`Gasto: ${descripcion}`, -Math.abs(monto)]
            );
        }

        await dbRun("COMMIT");
        res.json({ success: true });

    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/gastos/:id", (req, res) => {
    db.run("DELETE FROM gastos WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});

// --- MANEJO DE RUTAS SPA ---
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});