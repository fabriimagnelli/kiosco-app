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
        // Tablas
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
            editado INTEGER DEFAULT 0
        )`);

        await dbRun(`CREATE TABLE IF NOT EXISTS fiados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            monto REAL NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            descripcion TEXT,
            pagado INTEGER DEFAULT 0
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
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
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

        await dbRun(`CREATE TABLE IF NOT EXISTS retiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descripcion TEXT,
            monto REAL NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Actualizaciones de columnas
        const ensureColumn = async (table, column, definition) => {
            try {
                await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`Columna ${column} agregada a ${table}`);
            } catch (e) {
                // Ignorar si ya existe
            }
        };

        await ensureColumn("productos", "costo", "REAL DEFAULT 0");
        await ensureColumn("productos", "categoria", "TEXT DEFAULT 'General'");
        await ensureColumn("cigarrillos", "costo", "REAL DEFAULT 0");
        await ensureColumn("ventas", "pago_efectivo", "REAL DEFAULT 0");
        await ensureColumn("ventas", "pago_digital", "REAL DEFAULT 0");
        await ensureColumn("ventas", "editado", "INTEGER DEFAULT 0"); // <--- NUEVO: Para marcar reporte editado

        console.log("Base de datos inicializada correctamente.");
    } catch (e) {
        console.error("Error al inicializar DB:", e);
    }
};

initDB();

// --- RUTAS ---

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

// VENTAS (PROCESAR VENTA)
app.post("/api/ventas", async (req, res) => {
    const { productos, total, metodo_pago, pago_efectivo, pago_digital, ticket_a_corregir } = req.body;
    
    if (!productos || productos.length === 0) {
        return res.status(400).json({ error: "No hay productos en la venta" });
    }

    try {
        await dbRun("BEGIN TRANSACTION");

        // Si es una corrección, primero eliminamos la venta anterior
        if (ticket_a_corregir) {
            // No devolvemos stock aquí porque se asume que la nueva venta sobrescribe la realidad del stock
            // O si prefieres lógica estricta: devolver stock del viejo y restar el nuevo. 
            // Para simplificar "edición": borramos el registro de venta viejo y creamos el nuevo con fecha actual.
            await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [ticket_a_corregir]);
            // También borramos fiados si existía para ese ticket
            await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${ticket_a_corregir}%`]);
        }

        const ticket_id = await obtenerSiguienteTicket();
        
        // Calcular pagos proporcionales si es mixto, si no, asignar directo
        let pEfvo = 0;
        let pDig = 0;

        if (metodo_pago === 'Mixto') {
            pEfvo = parseFloat(pago_efectivo) || 0;
            pDig = parseFloat(pago_digital) || 0;
        } else if (metodo_pago === 'Efectivo') {
            pEfvo = total;
        } else {
            pDig = total;
        }

        // Variable para marcar si es editado (si viene de una corrección)
        const esEdicion = ticket_a_corregir ? 1 : 0;

        for (const item of productos) {
            const tabla = (item.categoria && item.categoria.toLowerCase() === 'cigarrillo') ? 'cigarrillos' : 'productos';
            
            // Descontar stock
            await dbRun(`UPDATE ${tabla} SET stock = stock - ? WHERE nombre = ?`, [item.cantidad, item.nombre]);

            // Registrar venta individual (MODIFICADO: Agregado campo 'editado')
            const tipo = item.tipo || 'General';
            await dbRun(`INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha, pago_efectivo, pago_digital, editado) VALUES (?,?,?,?,?,?, datetime('now', 'localtime'), ?, ?, ?)`, 
                [ticket_id, item.nombre, item.cantidad, total, metodo_pago, tipo, pEfvo, pDig, esEdicion]);
        }

        // Si es Fiado, registrar en tabla deudores
        if (metodo_pago === 'Fiado') {
             // Asumimos que viene el nombre del cliente en algún lado o es "Cliente Mostrador" si no se especifica
             // En una implementación real deberías pasar el cliente desde el front.
             // Por ahora usamos un placeholder o si el front lo manda en el futuro.
             // Como el body actual no trae cliente, usamos "Cliente Ticket #ID"
             await dbRun("INSERT INTO fiados (cliente, monto, descripcion) VALUES (?, ?, ?)", 
                 ["Cliente Varios", total, `Fiado Ticket ${ticket_id}`]);
        }

        await dbRun("COMMIT");
        res.json({ success: true, ticket_id });

    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});

// NUEVA RUTA: ELIMINAR VENTA (Devolviendo Stock)
app.delete("/api/ventas/:ticket_id", async (req, res) => {
    const { ticket_id } = req.params;
    try {
        await dbRun("BEGIN TRANSACTION");
        
        // 1. Recuperar items para devolver stock
        const items = await dbAll("SELECT * FROM ventas WHERE ticket_id = ?", [ticket_id]);
        
        if (items.length === 0) {
            await dbRun("ROLLBACK");
            return res.status(404).json({ error: "Venta no encontrada" });
        }

        for (const item of items) {
            // Determinar tabla
            // NOTA: Asegúrate que la categoría guardada coincida con tu lógica ('cigarrillo' vs 'General'/'Golosina'/etc)
            // En el POST guardas item.categoria. Si es 'cigarrillo' usa tabla cigarrillos.
            const tabla = (item.categoria && item.categoria.toLowerCase() === 'cigarrillo') ? 'cigarrillos' : 'productos';
            
            // Devolver stock
            await dbRun(`UPDATE ${tabla} SET stock = stock + ? WHERE nombre = ?`, [item.cantidad, item.producto]);
        }

        // 2. Eliminar de ventas
        await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [ticket_id]);

        // 3. Eliminar deuda asociada en fiados si existe (buscando por descripción)
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

// FIADOS
app.get("/api/fiados", (req, res) => {
    db.all("SELECT * FROM fiados ORDER BY fecha DESC", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.post("/api/fiados", (req, res) => {
    const { cliente, monto, descripcion } = req.body;
    db.run("INSERT INTO fiados (cliente, monto, descripcion) VALUES (?,?,?)", [cliente, monto, descripcion], function(err) {
        if(err) res.status(500).json({error: err.message});
        else res.json({id: this.lastID});
    });
});

app.put("/api/fiados/:id", (req, res) => { // Pagar fiado (parcial o total)
    const { pago } = req.body; 
    // Esto es simplificado. Lo ideal es restar monto o marcar pagado.
    // Vamos a restar del monto. Si llega a 0, pagado = 1.
    db.get("SELECT * FROM fiados WHERE id=?", [req.params.id], (err, row) => {
        if(err || !row) return res.status(404).json({error: "No encontrado"});
        
        const nuevoMonto = row.monto - pago;
        const pagado = nuevoMonto <= 0 ? 1 : 0;
        
        db.run("UPDATE fiados SET monto=?, pagado=? WHERE id=?", [nuevoMonto < 0 ? 0 : nuevoMonto, pagado, req.params.id], function(e) {
            if(e) res.status(500).json({error: e.message});
            else res.json({success: true});
        });
    });
});

app.delete("/api/fiados/:id", (req, res) => {
    db.run("DELETE FROM fiados WHERE id=?", req.params.id, function(err) {
        if(err) res.status(500).json({error: err.message});
        else res.json({success: true});
    });
});

// PROVEEDORES
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

// GASTOS
app.get("/api/gastos", (req, res) => {
    db.all("SELECT * FROM gastos ORDER BY fecha DESC", [], (err, rows) => res.json(rows || []));
});
app.post("/api/gastos", (req, res) => {
    const { descripcion, monto, categoria } = req.body;
    db.run("INSERT INTO gastos (descripcion, monto, categoria) VALUES (?,?,?)", [descripcion, monto, categoria], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});
app.delete("/api/gastos/:id", (req, res) => {
    db.run("DELETE FROM gastos WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});

// RETIROS
app.get("/api/retiros", (req, res) => {
    db.all("SELECT * FROM retiros ORDER BY fecha DESC", [], (err, rows) => res.json(rows || []));
});
app.post("/api/retiros", (req, res) => {
    const { descripcion, monto } = req.body;
    db.run("INSERT INTO retiros (descripcion, monto) VALUES (?,?)", [descripcion, monto], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});
app.delete("/api/retiros/:id", (req, res) => {
    db.run("DELETE FROM retiros WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});

// CAJA DIARIA (APERTURA / CIERRE)
app.get("/api/caja/hoy", (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];
    db.get("SELECT * FROM caja_diaria WHERE fecha = ?", [hoy], (err, row) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(row || null); // Si es null, no se abrió caja
    });
});

app.post("/api/caja/abrir", (req, res) => {
    const { inicio } = req.body;
    const hoy = new Date().toISOString().split('T')[0];
    db.run("INSERT INTO caja_diaria (fecha, inicio_caja) VALUES (?, ?)", [hoy, inicio], function(err) {
        if(err) {
            // Si ya existe, actualizamos inicio si no está cerrada? O retornamos error.
            // Asumimos simple: si ya existe, error o ignorar.
            res.status(400).json({ error: "Caja ya abierta hoy" });
        } else {
            res.json({ success: true });
        }
    });
});

app.post("/api/caja/cerrar", async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];
    try {
        // Calcular totales del día
        const ventas = await dbAll("SELECT * FROM ventas WHERE date(fecha) = date('now', 'localtime')");
        const gastos = await dbAll("SELECT * FROM gastos WHERE date(fecha) = date('now', 'localtime')");
        const retiros = await dbAll("SELECT * FROM retiros WHERE date(fecha) = date('now', 'localtime')");

        let totalEfvo = 0;
        let totalDig = 0;
        
        ventas.forEach(v => {
            // Si tiene desglosado pago_efectivo y pago_digital usar eso
            // Si son viejos registros sin eso, usar logica anterior (metodo_pago)
            if (v.pago_efectivo !== undefined && (v.pago_efectivo > 0 || v.pago_digital > 0)) {
                totalEfvo += v.pago_efectivo;
                totalDig += v.pago_digital;
            } else {
                if (v.metodo_pago === 'Efectivo') totalEfvo += v.precio_total;
                else if (v.metodo_pago === 'Transferencia' || v.metodo_pago === 'Debito') totalDig += v.precio_total;
                else if (v.metodo_pago === 'Mixto') {
                    // Fallback si no guardó desglose
                    totalEfvo += v.precio_total / 2; 
                    totalDig += v.precio_total / 2;
                }
            }
        });

        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalRetiros = retiros.reduce((sum, r) => sum + r.monto, 0);

        // Recuperar inicio caja
        const caja = await dbGet("SELECT * FROM caja_diaria WHERE fecha = ?", [hoy]);
        const inicio = caja ? caja.inicio_caja : 0;
        
        const esperadoCaja = inicio + totalEfvo - totalGastos - totalRetiros;

        db.run(`UPDATE caja_diaria SET 
            total_efectivo = ?, 
            total_digital = ?, 
            gastos = ?, 
            retiros = ?, 
            cerrado = 1 
            WHERE fecha = ?`, 
            [totalEfvo, totalDig, totalGastos, totalRetiros, hoy], 
            function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ 
                success: true, 
                resumen: { inicio, totalEfvo, totalDig, totalGastos, totalRetiros, esperado: esperadoCaja }
            });
        });
        
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.get("/api/caja/estado", async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];
    try {
        const caja = await dbGet("SELECT * FROM caja_diaria WHERE fecha = ?", [hoy]);
        if (!caja) return res.json({ abierta: false });

        // Calcular en tiempo real
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
            }
        });

        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalRetiros = retiros.reduce((sum, r) => sum + r.monto, 0);
        const esperadoCaja = caja.inicio_caja + totalEfvo - totalGastos - totalRetiros;

        res.json({ 
            abierta: true, 
            datos: { 
                inicio: caja.inicio_caja, 
                totalEfvo, totalDig, totalGastos, totalRetiros, 
                esperado: esperadoCaja 
            }
        });
    } catch (e) { res.status(500).json({error: e.message}); }
});

// REPORTES
app.get("/api/reportes/productos_top", (req, res) => db.all("SELECT producto as name, SUM(cantidad) as value FROM ventas GROUP BY producto ORDER BY value DESC LIMIT 5", (e, r) => res.json(r || [])));
app.get("/api/reportes/metodos_pago", (req, res) => db.all("SELECT metodo_pago as name, COUNT(*) as value FROM ventas GROUP BY metodo_pago", (e, r) => res.json(r || [])));
app.get("/api/reportes/ventas_semana", (req, res) => {
    const sql = "SELECT strftime('%Y-%m-%d', fecha) as fecha, SUM(precio_total) as total FROM ventas WHERE fecha >= date('now', '-6 days') GROUP BY strftime('%Y-%m-%d', fecha) ORDER BY fecha ASC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const resultado = [];
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const fechaStr = d.toISOString().split('T')[0];
            const dato = rows.find(r => r.fecha === fechaStr);
            resultado.push({ fecha: fechaStr, total: dato ? dato.total : 0 });
        }
        res.json(resultado);
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});