const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
let multer, sharp;
try {
    multer = require("multer");
    sharp = require("sharp");
} catch (e) {
    console.warn("[WARN] multer/sharp no disponibles, la subida de imágenes estará deshabilitada:", e.message);
}

const app = express();
const port = 3001;

// Secreto JWT — se regenera en cada inicio del servidor (sesiones expiran al reiniciar)
const JWT_SECRET = crypto.randomBytes(64).toString("hex");
const JWT_EXPIRATION = "24h";

app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE UPLOADS (IMÁGENES DE PRODUCTOS) ---
const uploadsPath = process.env.IS_ELECTRON === "true" && process.env.USER_DATA_PATH
    ? path.join(process.env.USER_DATA_PATH, "uploads")
    : path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const upload = multer ? multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Solo se permiten imágenes"), false);
    }
}) : null;

// --- CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS ---
const publicPath = process.env.SERVER_ROOT 
    ? path.join(process.env.SERVER_ROOT, "public") 
    : path.join(__dirname, "public");
console.log("Sirviendo frontend desde:", publicPath);
app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

// --- CONFIGURACIÓN BASE DE DATOS ---
let dbPath;
if (process.env.IS_ELECTRON === "true" && process.env.USER_DATA_PATH) {
    const userDataPath = process.env.USER_DATA_PATH;
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }
    dbPath = path.join(userDataPath, "kiosco.db");
    console.log("[ELECTRON] Base de datos en:", dbPath);
} else {
    dbPath = path.join(__dirname, "kiosco.db");
    console.log("[LOCAL] Base de datos en:", dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error DB:", err.message);
    else console.log("Conectado a SQLite");
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

// --- HELPERS LÓGICA ---
const obtenerSiguienteTicket = async () => {
    try {
        // Secuencial diario: reinicia cada día con formato día-secuencia
        // Pero mantiene un número global secuencial simple (1, 2, 3...)
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

        console.log(`Iniciando nuevo día. Saldo: $${saldoInicial}`);
        await dbRun("INSERT INTO caja_diaria (fecha, inicio_caja) VALUES (date('now', 'localtime'), ?)", [saldoInicial]);
        return { inicio_caja: saldoInicial };
    } catch (e) {
        console.error("Error garantizando caja:", e);
        return { inicio_caja: 0 };
    }
};

// --- INICIALIZACIÓN DB ---
const initDB = async () => {
    try {
        await dbRun(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, precio REAL NOT NULL, costo REAL DEFAULT 0, stock INTEGER DEFAULT 0, codigo_barras TEXT, categoria TEXT DEFAULT 'General')`);
        await dbRun(`CREATE TABLE IF NOT EXISTS cigarrillos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, precio REAL NOT NULL, precio_qr REAL DEFAULT 0, costo REAL DEFAULT 0, stock INTEGER DEFAULT 0, codigo_barras TEXT, pack TEXT DEFAULT '20')`);
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
        await dbRun(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, password TEXT NOT NULL, rol TEXT DEFAULT 'cajero', activo INTEGER DEFAULT 1)`);
        
        await dbRun(`CREATE TABLE IF NOT EXISTS configuracion (key TEXT PRIMARY KEY, value TEXT)`);
        
        // Sincronizar version de package.json a la DB automaticamente
        const isElectron = process.env.IS_ELECTRON === 'true';
        // En Electron empaquetado: package.json está en resources/app.asar/
        // En desarrollo: está en la raíz del proyecto (../package.json desde server/)
        const pkgSearchPaths = isElectron
            ? [path.join(process.resourcesPath || '', 'app.asar', 'package.json'), path.join(__dirname, '..', 'package.json')]
            : [path.join(__dirname, '..', 'package.json'), path.join(__dirname, 'package.json')];
        let appVersion = '1.0.0';
        for (const p of pkgSearchPaths) {
            try {
                const pkgData = JSON.parse(fs.readFileSync(p, 'utf-8'));
                if (pkgData.version) { appVersion = pkgData.version; break; }
            } catch(e) { /* intentar siguiente ruta */ }
        }
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('sistema_version', ?)", [appVersion]);
        console.log(`[DB] Version del sistema sincronizada: v${appVersion}`);

        // Migraciones de columnas
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
        await ensureColumn("cigarrillos", "precio_qr", "REAL DEFAULT 0");
        await ensureColumn("cigarrillos", "codigo_barras", "TEXT");
        await ensureColumn("cigarrillos", "pack", "TEXT DEFAULT '20'");
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
        await ensureColumn("proveedores", "direccion", "TEXT");
        await ensureColumn("proveedores", "dia_visita", "TEXT");
        await ensureColumn("proveedores", "rubro", "TEXT");
        await ensureColumn("clientes", "telefono", "TEXT");
        await ensureColumn("clientes", "direccion", "TEXT");
        await ensureColumn("clientes", "email", "TEXT");
        await ensureColumn("clientes", "puntos", "INTEGER DEFAULT 0");
        await ensureColumn("clientes", "limite_credito", "REAL DEFAULT 0");
        await ensureColumn("clientes", "puntos_canjeados", "INTEGER DEFAULT 0");

        // Tabla historial de puntos de fidelización
        await dbRun(`CREATE TABLE IF NOT EXISTS puntos_historial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            puntos INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            descripcion TEXT DEFAULT '',
            ticket_id INTEGER,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        await ensureColumn("productos", "stock_minimo", "INTEGER DEFAULT 5");
        await ensureColumn("cigarrillos", "stock_minimo", "INTEGER DEFAULT 5");
        await ensureColumn("ventas", "descuento", "REAL DEFAULT 0");
        await ensureColumn("ventas", "notas", "TEXT DEFAULT ''");
        await ensureColumn("ventas", "descuento_item", "REAL DEFAULT 0");

        // Nuevas columnas para productos (imagen, unidad de medida)
        await ensureColumn("productos", "imagen", "TEXT DEFAULT ''");
        await ensureColumn("productos", "unidad_medida", "TEXT DEFAULT 'unidad'");

        // Tabla de códigos de barras múltiples
        await dbRun(`CREATE TABLE IF NOT EXISTS codigos_barras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            tipo_producto TEXT DEFAULT 'producto',
            codigo TEXT NOT NULL,
            descripcion TEXT DEFAULT '',
            UNIQUE(codigo)
        )`);

        // Tabla de historial de precios
        await dbRun(`CREATE TABLE IF NOT EXISTS historial_precios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            tipo_producto TEXT DEFAULT 'producto',
            precio_anterior REAL,
            precio_nuevo REAL,
            costo_anterior REAL,
            costo_nuevo REAL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            usuario TEXT DEFAULT ''
        )`);

        // Tabla de devoluciones parciales
        await dbRun(`CREATE TABLE IF NOT EXISTS devoluciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_ticket_id INTEGER NOT NULL,
            producto TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            monto REAL NOT NULL,
            motivo TEXT DEFAULT '',
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // --- TABLAS NUEVAS: Caja y Finanzas ---

        // 22. Aperturas de caja (historial)
        await dbRun(`CREATE TABLE IF NOT EXISTS aperturas_caja (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caja_id INTEGER DEFAULT 1,
            monto REAL NOT NULL,
            observacion TEXT DEFAULT '',
            usuario TEXT DEFAULT '',
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 24. Arqueo de caja con foto
        await ensureColumn("historial_cierres", "foto_arqueo", "TEXT DEFAULT ''");

        // 25. Múltiples cajas simultáneas
        await dbRun(`CREATE TABLE IF NOT EXISTS cajas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            activa INTEGER DEFAULT 1,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        // Insertar caja principal si no existe
        const cajaDefault = await dbGet("SELECT id FROM cajas WHERE id = 1");
        if (!cajaDefault) {
            await dbRun("INSERT INTO cajas (id, nombre, activa) VALUES (1, 'Caja Principal', 1)");
        }
        await ensureColumn("ventas", "caja_id", "INTEGER DEFAULT 1");
        await ensureColumn("gastos", "caja_id", "INTEGER DEFAULT 1");
        await ensureColumn("retiros", "caja_id", "INTEGER DEFAULT 1");
        await ensureColumn("historial_cierres", "caja_id", "INTEGER DEFAULT 1");
        await ensureColumn("caja_diaria", "caja_id", "INTEGER DEFAULT 1");
        await ensureColumn("aperturas_caja", "caja_id", "INTEGER DEFAULT 1");

        // 33. Órdenes de compra a proveedores
        await dbRun(`CREATE TABLE IF NOT EXISTS ordenes_compra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proveedor_id INTEGER NOT NULL,
            estado TEXT DEFAULT 'pendiente',
            observacion TEXT DEFAULT '',
            total REAL DEFAULT 0,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_entrega TEXT DEFAULT '',
            fecha_recibido TEXT DEFAULT '',
            recibido_por TEXT DEFAULT ''
        )`);
        await dbRun(`CREATE TABLE IF NOT EXISTS ordenes_compra_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_id INTEGER NOT NULL,
            producto_id INTEGER,
            tipo_producto TEXT DEFAULT 'producto',
            nombre TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            costo_unitario REAL DEFAULT 0,
            cantidad_recibida INTEGER DEFAULT 0
        )`);

        // 34. Precio de costo por proveedor
        await dbRun(`CREATE TABLE IF NOT EXISTS producto_proveedor (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            tipo_producto TEXT DEFAULT 'producto',
            proveedor_id INTEGER NOT NULL,
            costo REAL DEFAULT 0,
            codigo_proveedor TEXT DEFAULT '',
            es_principal INTEGER DEFAULT 0,
            ultima_compra TEXT DEFAULT '',
            UNIQUE(producto_id, tipo_producto, proveedor_id)
        )`);

        // 26. Conciliación bancaria
        await dbRun(`CREATE TABLE IF NOT EXISTS conciliacion_bancaria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_desde TEXT NOT NULL,
            fecha_hasta TEXT NOT NULL,
            total_sistema REAL DEFAULT 0,
            total_banco REAL DEFAULT 0,
            diferencia REAL DEFAULT 0,
            observacion TEXT DEFAULT '',
            items TEXT DEFAULT '[]',
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migración: asegurar que la tabla usuarios tenga la estructura correcta
        try {
            await dbGet("SELECT nombre FROM usuarios LIMIT 1");
        } catch (e) {
            // La tabla existe pero no tiene la columna 'nombre' — recrearla
            console.log("[MIGRACIÓN] Recreando tabla usuarios con estructura correcta...");
            await dbRun("DROP TABLE IF EXISTS usuarios");
            await dbRun(`CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, password TEXT NOT NULL, rol TEXT DEFAULT 'cajero', activo INTEGER DEFAULT 1)`);
        }

        console.log("DB inicializada.");

        // --- Migración: hashear contraseña si está en texto plano ---
        try {
            const passRow = await dbGet("SELECT value FROM configuracion WHERE key='admin_password'");
            if (passRow && passRow.value && !passRow.value.startsWith("$2a$") && !passRow.value.startsWith("$2b$")) {
                const hashed = await bcrypt.hash(passRow.value, 10);
                await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('admin_password', ?)", [hashed]);
                console.log("[SEGURIDAD] Contraseña admin migrada a bcrypt.");
            }
        } catch (migErr) {
            console.error("Error migrando contraseña:", migErr);
        }

    } catch (e) { console.error("Error initDB:", e); }
};

initDB();

// --- MIDDLEWARE DE AUTENTICACIÓN JWT ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token de autenticación requerido" });
    }
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Token inválido o expirado. Inicie sesión nuevamente." });
    }
};

// Proteger todas las rutas /api excepto /api/login
app.use("/api", (req, res, next) => {
    if (req.path === "/login") return next();
    authMiddleware(req, res, next);
});

// --- RUTAS API ---

// === NUEVA RUTA: LIMPIEZA DEL SISTEMA ===
app.delete("/api/system/reset-transactions", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        
        // Tablas que SE BORRAN (Datos transaccionales)
        const tablesToDelete = [
            "ventas", 
            "gastos", 
            "caja_diaria", 
            "caja_cigarrillos", 
            "retiros", 
            "historial_cierres", 
            "movimientos_proveedores", 
            "fiados"
        ];
        
        for (const table of tablesToDelete) {
            await dbRun(`DELETE FROM ${table}`);
            // Reiniciamos el contador de IDs a 1
            await dbRun(`DELETE FROM sqlite_sequence WHERE name='${table}'`); 
        }

        // Tablas que SE CONSERVAN (Datos Maestros):
        // - productos
        // - cigarrillos
        // - clientes
        // - proveedores
        // - promos
        // - configuracion

        await dbRun("COMMIT");
        console.log("Limpieza de transacciones completada.");
        res.json({ success: true, message: "Sistema limpiado correctamente. Productos y Clientes conservados." });
    } catch (e) {
        await dbRun("ROLLBACK");
        console.error("Error en limpieza:", e);
        res.status(500).json({ error: e.message });
    }
});
// =========================================

// SISTEMA ACTUALIZACIÓN 
app.get("/api/system/version", async (req, res) => {
    try {
        // Leer version desde package.json (fuente unica de verdad)
        const isElectron = process.env.IS_ELECTRON === 'true';
        const pkgSearchPaths = isElectron
            ? [path.join(process.resourcesPath || '', 'app.asar', 'package.json'), path.join(__dirname, '..', 'package.json')]
            : [path.join(__dirname, '..', 'package.json'), path.join(__dirname, 'package.json')];
        let version = null;
        for (const p of pkgSearchPaths) {
            try {
                const pkgData = JSON.parse(fs.readFileSync(p, 'utf-8'));
                if (pkgData.version) { version = pkgData.version; break; }
            } catch(e) { /* intentar siguiente */ }
        }
        if (!version) {
            // Fallback a la DB
            const ver = await dbGet("SELECT value FROM configuracion WHERE key = 'sistema_version'");
            version = ver ? ver.value : '1.0.0';
        }
        res.json({ version });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/system/check-update", (req, res) => {
    if (process.env.IS_ELECTRON === "true") return res.json({ updateAvailable: false });
    exec("git fetch origin && git status -uno", (err, stdout) => {
        if (err) return res.json({ updateAvailable: false });
        res.json({ updateAvailable: stdout.includes("behind") });
    });
});

app.post("/api/system/update", async (req, res) => {
    if (process.env.IS_ELECTRON === "true") return res.status(400).json({ error: "Actualice descargando el nuevo instalador." });
    exec("git pull", async (error, stdout) => {
        if (error) return res.status(500).json({ error: "Falló git pull" });
        res.json({ success: true, log: stdout });
    });
});

// DASHBOARD
app.get("/api/dashboard", async (req, res) => {
    try {
        const ventasHoy = await dbGet("SELECT SUM(precio_total) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE date(fecha) = date('now', 'localtime')");
        const gastosHoy = await dbGet("SELECT SUM(monto) as total FROM gastos WHERE date(fecha) = date('now', 'localtime')");
        const prodBajo = await dbAll("SELECT nombre, stock, stock_minimo FROM productos WHERE stock <= COALESCE(stock_minimo, 5)");
        const cigBajo = await dbAll("SELECT nombre, stock, stock_minimo FROM cigarrillos WHERE stock <= COALESCE(stock_minimo, 5)");

        // 35. Proveedores que visitan hoy
        const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const hoyDia = diasSemana[new Date().getDay()];
        const visitasHoy = await dbAll("SELECT id, nombre, telefono, rubro FROM proveedores WHERE dia_visita = ?", [hoyDia]);

        // Órdenes de compra pendientes
        const ordenesPendientes = await dbGet("SELECT COUNT(*) as total FROM ordenes_compra WHERE estado = 'pendiente' OR estado = 'parcial'");

        // 36. Proveedores con mayor deuda
        const topDeudas = await dbAll(`
            SELECT p.id, p.nombre, COALESCE(SUM(m.monto), 0) as saldo
            FROM proveedores p
            LEFT JOIN movimientos_proveedores m ON m.proveedor_id = p.id
            GROUP BY p.id
            HAVING saldo > 0
            ORDER BY saldo DESC LIMIT 5
        `);

        res.json({ ventas_hoy: ventasHoy.total || 0, tickets_hoy: ventasHoy.tickets || 0, gastos_hoy: gastosHoy.total || 0, bajo_stock: [...prodBajo, ...cigBajo], visitas_hoy: visitasHoy, ordenes_pendientes: ordenesPendientes?.total || 0, top_deudas_proveedores: topDeudas });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// REPORTES
app.get("/api/reportes/ventas_semana", (req, res) => {
    db.all(`SELECT strftime('%d/%m', fecha) as fecha, SUM(precio_total) as total FROM ventas WHERE date(fecha) >= date('now', '-6 days', 'localtime') GROUP BY date(fecha) ORDER BY date(fecha) ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.get("/api/reportes/productos_top", (req, res) => {
    db.all(`SELECT producto as name, SUM(cantidad) as value FROM ventas GROUP BY producto ORDER BY value DESC LIMIT 5`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.get("/api/reportes/metodos_pago", (req, res) => {
    db.all(`SELECT metodo_pago as name, SUM(precio_total) as value FROM ventas GROUP BY metodo_pago`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ name: r.name || 'Otros', value: r.value })));
    });
});

// 27. DASHBOARD COMPARATIVAS — Hoy vs Ayer, Semana vs Anterior, Mes vs Anterior
app.get("/api/reportes/comparativas", async (req, res) => {
    try {
        // HOY vs AYER
        const hoy = await dbGet(`SELECT COALESCE(SUM(precio_total),0) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE date(fecha) = date('now','localtime')`);
        const ayer = await dbGet(`SELECT COALESCE(SUM(precio_total),0) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE date(fecha) = date('now','-1 day','localtime')`);
        const gastosHoy = await dbGet(`SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE date(fecha) = date('now','localtime')`);
        const gastosAyer = await dbGet(`SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE date(fecha) = date('now','-1 day','localtime')`);

        // ESTA SEMANA vs ANTERIOR (lun-dom)
        const semanaActual = await dbGet(`SELECT COALESCE(SUM(precio_total),0) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE date(fecha) >= date('now','weekday 0','-6 days','localtime') AND date(fecha) <= date('now','localtime')`);
        const semanaAnterior = await dbGet(`SELECT COALESCE(SUM(precio_total),0) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE date(fecha) >= date('now','weekday 0','-13 days','localtime') AND date(fecha) < date('now','weekday 0','-6 days','localtime')`);
        const gastosSemanaActual = await dbGet(`SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE date(fecha) >= date('now','weekday 0','-6 days','localtime') AND date(fecha) <= date('now','localtime')`);
        const gastosSemanaAnterior = await dbGet(`SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE date(fecha) >= date('now','weekday 0','-13 days','localtime') AND date(fecha) < date('now','weekday 0','-6 days','localtime')`);

        // ESTE MES vs ANTERIOR
        const mesActual = await dbGet(`SELECT COALESCE(SUM(precio_total),0) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')`);
        const mesAnterior = await dbGet(`SELECT COALESCE(SUM(precio_total),0) as total, COUNT(DISTINCT ticket_id) as tickets FROM ventas WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', '-1 month', 'localtime')`);
        const gastosMesActual = await dbGet(`SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')`);
        const gastosMesAnterior = await dbGet(`SELECT COALESCE(SUM(monto),0) as total FROM gastos WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', '-1 month', 'localtime')`);

        res.json({
            dia: { actual: { ventas: hoy.total, tickets: hoy.tickets, gastos: gastosHoy.total }, anterior: { ventas: ayer.total, tickets: ayer.tickets, gastos: gastosAyer.total } },
            semana: { actual: { ventas: semanaActual.total, tickets: semanaActual.tickets, gastos: gastosSemanaActual.total }, anterior: { ventas: semanaAnterior.total, tickets: semanaAnterior.tickets, gastos: gastosSemanaAnterior.total } },
            mes: { actual: { ventas: mesActual.total, tickets: mesActual.tickets, gastos: gastosMesActual.total }, anterior: { ventas: mesAnterior.total, tickets: mesAnterior.tickets, gastos: gastosMesAnterior.total } }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 29. REPORTE DE HORAS PICO — En qué horarios se vende más
app.get("/api/reportes/horas_pico", async (req, res) => {
    try {
        const { dias } = req.query; // días hacia atrás, default 30
        const d = parseInt(dias) || 30;
        const rows = await dbAll(`
            SELECT CAST(strftime('%H', fecha) AS INTEGER) as hora,
                   COUNT(DISTINCT ticket_id) as tickets,
                   COALESCE(SUM(precio_total),0) as total
            FROM ventas
            WHERE date(fecha) >= date('now', '-${d} days', 'localtime')
            GROUP BY hora ORDER BY hora ASC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 31. TENDENCIA MENSUAL — Evolución ventas/gastos mes a mes (últimos 12 meses)
app.get("/api/reportes/tendencia_mensual", async (req, res) => {
    try {
        const ventas = await dbAll(`
            SELECT strftime('%Y-%m', fecha) as mes, COALESCE(SUM(precio_total),0) as total
            FROM ventas
            WHERE date(fecha) >= date('now','-12 months','localtime')
            GROUP BY mes ORDER BY mes ASC
        `);
        const gastos = await dbAll(`
            SELECT strftime('%Y-%m', fecha) as mes, COALESCE(SUM(monto),0) as total
            FROM gastos
            WHERE date(fecha) >= date('now','-12 months','localtime')
            GROUP BY mes ORDER BY mes ASC
        `);
        // Merge
        const meses = {};
        ventas.forEach(v => { meses[v.mes] = { mes: v.mes, ventas: v.total, gastos: 0 }; });
        gastos.forEach(g => { if (!meses[g.mes]) meses[g.mes] = { mes: g.mes, ventas: 0, gastos: 0 }; meses[g.mes].gastos = g.total; });
        const data = Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes)).map(m => ({
            ...m,
            ganancia: m.ventas - m.gastos,
            label: new Date(m.mes + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
        }));
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 32. PRODUCTOS SIN MOVIMIENTO — Inventario "muerto" que no se vende
app.get("/api/reportes/sin_movimiento", async (req, res) => {
    try {
        const { dias } = req.query; // días sin venta, default 30
        const d = parseInt(dias) || 30;
        const productos = await dbAll(`
            SELECT p.id, p.nombre, p.precio, p.costo, p.stock, p.categoria,
                   MAX(v.fecha) as ultima_venta,
                   COALESCE(SUM(v.cantidad),0) as total_vendido
            FROM productos p
            LEFT JOIN ventas v ON v.producto = p.nombre
            GROUP BY p.id
            HAVING p.stock > 0 AND (MAX(v.fecha) IS NULL OR date(MAX(v.fecha)) < date('now', '-${d} days', 'localtime'))
            ORDER BY p.stock * p.costo DESC
        `);
        const cigarrillos = await dbAll(`
            SELECT c.id, c.nombre, c.precio, c.costo, c.stock, 'Cigarrillos' as categoria,
                   MAX(v.fecha) as ultima_venta,
                   COALESCE(SUM(v.cantidad),0) as total_vendido
            FROM cigarrillos c
            LEFT JOIN ventas v ON v.producto = c.nombre
            GROUP BY c.id
            HAVING c.stock > 0 AND (MAX(v.fecha) IS NULL OR date(MAX(v.fecha)) < date('now', '-${d} days', 'localtime'))
            ORDER BY c.stock * c.costo DESC
        `);
        const todos = [...productos, ...cigarrillos];
        const capitalInmovilizado = todos.reduce((s, p) => s + (p.stock * (p.costo || 0)), 0);
        res.json({ productos: todos, capitalInmovilizado, totalItems: todos.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// REPORTE DE VENTAS DETALLADO POR RANGO (para exportar Excel/PDF)
app.get("/api/reportes/ventas_rango", async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) return res.status(400).json({ error: "Se requieren 'desde' y 'hasta'" });
        const ventas = await dbAll(`
            SELECT v.ticket_id, v.producto, v.cantidad, v.precio_unitario, v.precio_total,
                   v.metodo_pago, v.categoria, v.fecha, v.descuento
            FROM ventas v WHERE date(v.fecha) BETWEEN ? AND ?
            ORDER BY v.fecha DESC
        `, [desde, hasta]);
        const resumen = await dbGet(`
            SELECT COALESCE(SUM(precio_total),0) as total_ventas,
                   COUNT(DISTINCT ticket_id) as total_tickets,
                   COALESCE(SUM(CASE WHEN metodo_pago='Efectivo' OR pago_efectivo>0 THEN precio_total ELSE 0 END),0) as total_efectivo,
                   COALESCE(SUM(CASE WHEN metodo_pago IN ('Transferencia','Debito','MercadoPago') OR pago_digital>0 THEN precio_total ELSE 0 END),0) as total_digital
            FROM ventas WHERE date(fecha) BETWEEN ? AND ?
        `, [desde, hasta]);
        const gastos = await dbAll(`SELECT descripcion, monto, categoria, metodo_pago, fecha FROM gastos WHERE date(fecha) BETWEEN ? AND ? ORDER BY fecha DESC`, [desde, hasta]);
        const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
        res.json({ ventas, resumen, gastos, totalGastos });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// BALANCE POR RANGO DE FECHAS
app.get("/api/balance_rango", async (req, res) => {
    try {
        const { desde, hasta } = req.query;

        if (!desde || !hasta) {
            return res.status(400).json({ error: "Se requieren parámetros 'desde' y 'hasta'" });
        }

        // INGRESOS: Ventas por categoría y método de pago
        const ventasKioscoEfvo = await dbGet(
            `SELECT COALESCE(SUM(precio_total), 0) as total FROM ventas
             WHERE categoria = 'Kiosco' AND date(fecha) BETWEEN ? AND ?
             AND (metodo_pago = 'Efectivo' OR pago_efectivo > 0)`,
            [desde, hasta]
        );

        const ventasCigarrosEfvo = await dbGet(
            `SELECT COALESCE(SUM(precio_total), 0) as total FROM ventas
             WHERE categoria = 'Cigarrillos' AND date(fecha) BETWEEN ? AND ?
             AND (metodo_pago = 'Efectivo' OR pago_efectivo > 0)`,
            [desde, hasta]
        );

        const ventasDigital = await dbGet(
            `SELECT COALESCE(SUM(precio_total), 0) as total FROM ventas
             WHERE date(fecha) BETWEEN ? AND ?
             AND (metodo_pago IN ('Transferencia', 'Debito', 'MercadoPago') OR pago_digital > 0)`,
            [desde, hasta]
        );

        const cobrosDeudas = await dbGet(
            `SELECT COALESCE(SUM(monto), 0) as total FROM fiados
             WHERE pagado = 1 AND date(fecha) BETWEEN ? AND ?`,
            [desde, hasta]
        );

        // EGRESOS
        const gastosVarios = await dbGet(
            `SELECT COALESCE(SUM(monto), 0) as total FROM gastos
             WHERE date(fecha) BETWEEN ? AND ?`,
            [desde, hasta]
        );

        const pagosProveedores = await dbGet(
            `SELECT COALESCE(SUM(monto), 0) as total FROM movimientos_proveedores
             WHERE date(fecha) BETWEEN ? AND ?`,
            [desde, hasta]
        );

        const kiosco_efvo = ventasKioscoEfvo?.total || 0;
        const cigarros_efvo = ventasCigarrosEfvo?.total || 0;
        const digital = ventasDigital?.total || 0;
        const cobros_deuda = cobrosDeudas?.total || 0;
        const gastos_varios = gastosVarios?.total || 0;
        const pagos_proveedores = pagosProveedores?.total || 0;

        const total_ingresos = kiosco_efvo + cigarros_efvo + digital + cobros_deuda;
        const total_egresos = gastos_varios + pagos_proveedores;
        const balance = total_ingresos - total_egresos;

        res.json({
            ingresos: {
                kiosco_efvo,
                cigarros_efvo,
                digital,
                cobros_deuda
            },
            total_ingresos,
            egresos: {
                gastos_varios,
                pagos_proveedores
            },
            total_egresos,
            balance
        });
    } catch (e) {
        console.error("Error en /api/balance_rango:", e);
        res.status(500).json({ error: e.message });
    }
});

// RESUMEN
app.get("/api/resumen_dia_independiente", async (req, res) => {
    try {
        const ventas = await dbAll("SELECT * FROM ventas WHERE date(fecha) = date('now', 'localtime')");
        const gastos = await dbAll("SELECT * FROM gastos WHERE date(fecha) = date('now', 'localtime')");
        const retiros = await dbAll("SELECT * FROM retiros WHERE date(fecha) = date('now', 'localtime')");
        let totalEfvo = 0, totalDig = 0;
        ventas.forEach(v => {
            if (v.pago_efectivo > 0 || v.pago_digital > 0) { totalEfvo += v.pago_efectivo; totalDig += v.pago_digital; } 
            else {
                if (v.metodo_pago === 'Efectivo') totalEfvo += v.precio_total;
                else if (['Transferencia','Debito'].includes(v.metodo_pago)) totalDig += v.precio_total;
                else if (v.metodo_pago === 'Mixto') { totalEfvo += v.precio_total / 2; totalDig += v.precio_total / 2; }
            }
        });
        const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
        const totalRetiros = retiros.reduce((sum, r) => sum + r.monto, 0);
        res.json({ total_efectivo: totalEfvo, total_digital: totalDig, total_gastos: totalGastos, total_retiros: totalRetiros, ventas_total: totalEfvo + totalDig });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// RETIROS
app.get("/api/retiros", async (req, res) => {
    try {
        const manuales = await dbAll("SELECT id, fecha, descripcion, monto, 'MANUAL' as tipo FROM retiros");
        const cierres = await dbAll(`SELECT id, fecha, CASE WHEN tipo = 'cigarrillos' THEN 'Retiro Caja Cigarrillos' ELSE 'Retiro Caja General' END as descripcion, monto_retiro as monto, 'CIERRE' as tipo, id as cierre_id FROM historial_cierres WHERE monto_retiro > 0`);
        // Combinar y ordenar por fecha, manteniendo los más recientes primero
        const historial = [...manuales, ...cierres].sort((a, b) => {
            const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
            const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
            return dateB - dateA;
        });
        const total = historial.reduce((acc, item) => acc + (item.monto || 0), 0);
        res.json({ historial, total });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/retiros", (req, res) => {
    const fecha = new Date().toLocaleString('es-AR');
    db.run("INSERT INTO retiros (descripcion, monto, fecha) VALUES (?,?,?)", [req.body.descripcion, req.body.monto, fecha], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true}));
});
app.delete("/api/retiros/:id", (req, res) => { db.run("DELETE FROM retiros WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });

// === 22. APERTURA DE CAJA ===
app.post("/api/apertura", async (req, res) => {
    try {
        const { monto, observacion, caja_id } = req.body;
        const cajaId = caja_id || 1;
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum < 0) return res.status(400).json({ error: "Monto inválido" });

        // Registrar apertura en historial
        await dbRun(
            "INSERT INTO aperturas_caja (caja_id, monto, observacion, usuario, fecha) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))",
            [cajaId, montoNum, observacion || '', req.user?.nombre || '']
        );

        // Actualizar caja_diaria con el monto de apertura
        const existeCaja = await dbGet("SELECT * FROM caja_diaria WHERE fecha = date('now', 'localtime') AND caja_id = ?", [cajaId]);
        if (existeCaja) {
            await dbRun("UPDATE caja_diaria SET inicio_caja = ? WHERE fecha = date('now', 'localtime') AND caja_id = ?", [montoNum, cajaId]);
        } else {
            await dbRun("INSERT INTO caja_diaria (fecha, inicio_caja, caja_id) VALUES (date('now', 'localtime'), ?, ?)", [montoNum, cajaId]);
        }

        res.json({ success: true, message: "Caja abierta correctamente" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/apertura/estado", async (req, res) => {
    try {
        const cajaId = req.query.caja_id || 1;
        const cajaHoy = await dbGet("SELECT * FROM caja_diaria WHERE fecha = date('now', 'localtime') AND caja_id = ?", [cajaId]);
        const ultimaApertura = await dbGet("SELECT * FROM aperturas_caja WHERE caja_id = ? ORDER BY id DESC LIMIT 1", [cajaId]);
        res.json({
            abierta: !!cajaHoy,
            inicio_caja: cajaHoy ? cajaHoy.inicio_caja : 0,
            ultima_apertura: ultimaApertura || null
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/apertura/historial", async (req, res) => {
    try {
        const aperturas = await dbAll("SELECT * FROM aperturas_caja ORDER BY fecha DESC LIMIT 50");
        res.json(aperturas || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === 23. HISTORIAL DE CIERRES DETALLADO ===
app.get("/api/historial_cierres/:id", async (req, res) => {
    try {
        const cierre = await dbGet("SELECT * FROM historial_cierres WHERE id = ?", [req.params.id]);
        if (!cierre) return res.status(404).json({ error: "Cierre no encontrado" });

        // Obtener ventas asociadas a este cierre
        const ventas = await dbAll("SELECT * FROM ventas WHERE cierre_id = ? ORDER BY fecha DESC", [cierre.id]);
        const gastos = await dbAll("SELECT * FROM gastos WHERE cierre_id = ? ORDER BY fecha DESC", [cierre.id]);
        const retiros = await dbAll("SELECT * FROM retiros WHERE cierre_id = ? ORDER BY fecha DESC", [cierre.id]);

        // Calcular desglose
        let ventasEfectivo = 0, ventasDigital = 0, totalVentasProductos = 0;
        const ventasPorProducto = {};
        ventas.forEach(v => {
            totalVentasProductos += v.precio_total;
            if (v.pago_efectivo > 0 || v.pago_digital > 0) {
                ventasEfectivo += v.pago_efectivo;
                ventasDigital += v.pago_digital;
            } else {
                if (v.metodo_pago === 'Efectivo') ventasEfectivo += v.precio_total;
                else if (['Transferencia','Debito'].includes(v.metodo_pago)) ventasDigital += v.precio_total;
                else if (v.metodo_pago === 'Mixto') { ventasEfectivo += v.precio_total / 2; ventasDigital += v.precio_total / 2; }
            }
            const key = v.producto || 'Sin nombre';
            if (!ventasPorProducto[key]) ventasPorProducto[key] = { nombre: key, cantidad: 0, total: 0 };
            ventasPorProducto[key].cantidad += v.cantidad;
            ventasPorProducto[key].total += v.precio_total;
        });

        const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
        const totalRetiros = retiros.reduce((s, r) => s + r.monto, 0);

        res.json({
            ...cierre,
            detalle: {
                ventas_efectivo: ventasEfectivo,
                ventas_digital: ventasDigital,
                total_ventas_productos: totalVentasProductos,
                ventas_por_producto: Object.values(ventasPorProducto).sort((a, b) => b.total - a.total),
                gastos: gastos,
                total_gastos: totalGastos,
                retiros: retiros,
                total_retiros: totalRetiros,
                cantidad_tickets: [...new Set(ventas.map(v => v.ticket_id))].length
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === 24. SUBIR FOTO DE ARQUEO ===
if (upload) {
    app.post("/api/cierres/:id/foto_arqueo", upload.single("foto"), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: "No se envió imagen" });
            const filename = `arqueo_${req.params.id}_${Date.now()}.webp`;
            await sharp(req.file.buffer).resize(1200, 1200, { fit: "inside" }).webp({ quality: 80 }).toFile(path.join(uploadsPath, filename));
            await dbRun("UPDATE historial_cierres SET foto_arqueo = ? WHERE id = ?", [filename, req.params.id]);
            res.json({ success: true, foto: filename });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
} else {
    app.post("/api/cierres/:id/foto_arqueo", (req, res) => res.status(501).json({ error: "Subida de imágenes no disponible" }));
}

// === 25. MÚLTIPLES CAJAS ===
app.get("/api/cajas", async (req, res) => {
    try {
        const cajas = await dbAll("SELECT * FROM cajas ORDER BY id");
        res.json(cajas || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/cajas", async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
        const result = await dbRun("INSERT INTO cajas (nombre) VALUES (?)", [nombre]);
        res.json({ success: true, id: result.lastID });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/cajas/:id", async (req, res) => {
    try {
        const { nombre, activa } = req.body;
        await dbRun("UPDATE cajas SET nombre = ?, activa = ? WHERE id = ?", [nombre, activa ? 1 : 0, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/cajas/:id", async (req, res) => {
    try {
        if (parseInt(req.params.id) === 1) return res.status(400).json({ error: "No se puede eliminar la caja principal" });
        await dbRun("DELETE FROM cajas WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === 26. CONCILIACIÓN BANCARIA ===
app.get("/api/conciliacion/ventas_digitales", async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) return res.status(400).json({ error: "Se requieren parámetros 'desde' y 'hasta'" });

        // Ventas digitales del período
        const ventas = await dbAll(`
            SELECT id, ticket_id, producto, cantidad, precio_total, metodo_pago, pago_digital, fecha
            FROM ventas 
            WHERE date(fecha) BETWEEN ? AND ? 
            AND (metodo_pago IN ('Transferencia', 'Debito', 'MercadoPago') OR pago_digital > 0)
            ORDER BY fecha DESC
        `, [desde, hasta]);

        const totalSistema = ventas.reduce((s, v) => {
            if (v.pago_digital > 0) return s + v.pago_digital;
            return s + v.precio_total;
        }, 0);

        // Agrupar por día
        const porDia = {};
        ventas.forEach(v => {
            const dia = v.fecha ? v.fecha.split(' ')[0].split('T')[0] : 'Sin fecha';
            if (!porDia[dia]) porDia[dia] = { fecha: dia, total: 0, cantidad: 0 };
            porDia[dia].total += v.pago_digital > 0 ? v.pago_digital : v.precio_total;
            porDia[dia].cantidad++;
        });

        res.json({
            ventas,
            total_sistema: totalSistema,
            por_dia: Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha))
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/conciliacion", async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, total_sistema, total_banco, diferencia, observacion, items } = req.body;
        await dbRun(
            "INSERT INTO conciliacion_bancaria (fecha_desde, fecha_hasta, total_sistema, total_banco, diferencia, observacion, items) VALUES (?,?,?,?,?,?,?)",
            [fecha_desde, fecha_hasta, total_sistema || 0, total_banco || 0, diferencia || 0, observacion || '', JSON.stringify(items || [])]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/conciliacion/historial", async (req, res) => {
    try {
        const conciliaciones = await dbAll("SELECT * FROM conciliacion_bancaria ORDER BY fecha DESC LIMIT 50");
        res.json((conciliaciones || []).map(c => ({ ...c, items: JSON.parse(c.items || '[]') })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// CIERRE GENERAL
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
                else if (['Transferencia','Debito'].includes(v.metodo_pago)) totalDig += v.precio_total;
                else if (v.metodo_pago === 'Mixto') { totalEfvo += v.precio_total / 2; totalDig += v.precio_total / 2; }
            }
        });
        cobrosData.forEach(c => { const m = Math.abs(c.monto); if (['Transferencia','Digital'].includes(c.metodo_pago)) cobrosDig += m; else cobrosEfvo += m; });
        let gastosGrales = 0, pagosProv = 0;
        gastosData.forEach(g => {
            // Contar TODOS los gastos sin importar el método de pago (Efectivo, Retiros, Transferencia, etc.)
            if (g.categoria && g.categoria.toLowerCase().includes('proveedor')) {
                pagosProv += g.monto;
            } else {
                gastosGrales += g.monto;
            }
        });

        const esperado = saldoInicial + totalEfvo + cobrosEfvo - gastosGrales - pagosProv;
        res.json({ saldo_inicial: saldoInicial, ventas: totalEfvo, cobros: cobrosEfvo, gastos: gastosGrales, proveedores: pagosProv, digital: totalDig + cobrosDig, esperado: esperado });
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
            [tipo || 'General', total_ventas || 0, total_gastos || 0, total_efectivo_real, monto_retiro, observacion]);
        const cierreRow = await dbGet("SELECT last_insert_rowid() as id");
        const cierreId = cierreRow.id;
        
        let nuevoInicio = total_efectivo_real - monto_retiro;
        if (nuevo_inicio_manual !== undefined && nuevo_inicio_manual !== null) nuevoInicio = parseFloat(nuevo_inicio_manual);
        
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
            if (existeCaja) await dbRun(`UPDATE caja_diaria SET inicio_caja = ?, total_efectivo = 0, total_digital = 0, gastos = 0, retiros = 0, cerrado = 0 WHERE fecha = ${fechaLocal}`, [nuevoInicio]);
            else await dbRun(`INSERT INTO caja_diaria (fecha, inicio_caja) VALUES (${fechaLocal}, ?)`, [nuevoInicio]);
        }
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

// PROMOS
app.get("/api/promos", (req, res) => {
    db.all("SELECT * FROM promos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const promos = (rows || []).map(p => {
            try {
                return { ...p, componentes: p.componentes ? JSON.parse(p.componentes) : [] };
            } catch (e) {
                return { ...p, componentes: [] };
            }
        });
        res.json(promos);
    });
});
app.post("/api/promos", (req, res) => {
    const { nombre, precio, codigo_barras, componentes } = req.body;

    // Validación de datos
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ error: "El nombre es requerido y debe ser texto" });
    }
    if (!precio || isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
        return res.status(400).json({ error: "El precio es requerido y debe ser un número mayor a 0" });
    }
    if (!Array.isArray(componentes) || componentes.length === 0) {
        return res.status(400).json({ error: "Debe agregar al menos un componente/producto" });
    }

    db.run(
        "INSERT INTO promos (nombre, precio, codigo_barras, componentes) VALUES (?,?,?,?)",
        [nombre.trim(), parseFloat(precio), codigo_barras || '', JSON.stringify(componentes)],
        function(err) {
            if (err) return res.status(500).json({ error: "Error al guardar: " + err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});
app.put("/api/promos/:id", (req, res) => {
    const { nombre, precio, codigo_barras, componentes } = req.body;
    const id = parseInt(req.params.id);

    // Validación de ID
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "ID de promo inválido" });
    }

    // Validación de datos
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ error: "El nombre es requerido y debe ser texto" });
    }
    if (!precio || isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
        return res.status(400).json({ error: "El precio es requerido y debe ser un número mayor a 0" });
    }
    if (!Array.isArray(componentes) || componentes.length === 0) {
        return res.status(400).json({ error: "Debe agregar al menos un componente/producto" });
    }

    db.run(
        "UPDATE promos SET nombre=?, precio=?, codigo_barras=?, componentes=? WHERE id=?",
        [nombre.trim(), parseFloat(precio), codigo_barras || '', JSON.stringify(componentes), id],
        function(err) {
            if (err) return res.status(500).json({ error: "Error al actualizar: " + err.message });
            if (this.changes === 0) {
                return res.status(404).json({ error: "Promo no encontrada" });
            }
            res.json({ success: true });
        }
    );
});
app.delete("/api/promos/:id", (req, res) => { db.run("DELETE FROM promos WHERE id=?", [req.params.id], function(err) { if (err) return res.status(500).json({ error: err.message }); res.json({ success: true }); }); });

// CLIENTES, FIADOS, PROVEEDORES...
app.get("/api/clientes", async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT c.*,
                COALESCE((SELECT SUM(f.monto) FROM fiados f WHERE f.cliente_id = c.id), 0) as total_deuda,
                COALESCE((SELECT MAX(f.fecha) FROM fiados f WHERE f.cliente_id = c.id AND f.monto > 0), NULL) as ultimo_fiado_fecha,
                COALESCE((SELECT COUNT(*) FROM ventas v WHERE v.cliente_id = c.id), 0) as total_compras,
                COALESCE((SELECT SUM(v.precio_total) FROM ventas v WHERE v.cliente_id = c.id), 0) as total_gastado
            FROM clientes c ORDER BY c.nombre
        `);
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/clientes", (req, res) => {
    db.run("INSERT INTO clientes (nombre, telefono, direccion, email, limite_credito) VALUES (?,?,?,?,?)",
        [req.body.nombre, req.body.telefono, req.body.direccion, req.body.email, parseFloat(req.body.limite_credito) || 0],
        function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ id: this.lastID }); });
});
app.put("/api/clientes/:id", (req, res) => {
    db.run("UPDATE clientes SET nombre=?, telefono=?, direccion=?, email=?, limite_credito=? WHERE id=?",
        [req.body.nombre, req.body.telefono, req.body.direccion, req.body.email, parseFloat(req.body.limite_credito) || 0, req.params.id],
        function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ success: true }); });
});
app.delete("/api/clientes/:id", async (req, res) => {
    try {
        await dbRun("DELETE FROM puntos_historial WHERE cliente_id=?", [req.params.id]);
        await dbRun("DELETE FROM fiados WHERE cliente_id=?", [req.params.id]);
        await dbRun("DELETE FROM clientes WHERE id=?", [req.params.id]);
        res.json({ deleted: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- HISTORIAL DE COMPRAS POR CLIENTE ---
app.get("/api/clientes/:id/compras", async (req, res) => {
    try {
        // Traer ventas agrupadas por ticket_id
        const compras = await dbAll(`
            SELECT ticket_id, MIN(fecha) as fecha, metodo_pago,
                SUM(precio_total) as total,
                GROUP_CONCAT(producto || ' x' || cantidad, ', ') as detalle,
                COUNT(*) as items
            FROM ventas WHERE cliente_id = ?
            GROUP BY ticket_id
            ORDER BY fecha DESC
            LIMIT 100
        `, [req.params.id]);
        res.json(compras);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- SISTEMA DE PUNTOS / FIDELIZACIÓN ---

// Obtener configuración de puntos (cuántos puntos por peso gastado, valor de canje)
app.get("/api/configuracion/puntos", async (req, res) => {
    try {
        const ptsPorPeso = await dbGet("SELECT value FROM configuracion WHERE key='puntos_por_peso'");
        const valorCanje = await dbGet("SELECT value FROM configuracion WHERE key='puntos_valor_canje'");
        const puntosActivos = await dbGet("SELECT value FROM configuracion WHERE key='puntos_activos'");
        res.json({
            puntos_por_peso: parseFloat(ptsPorPeso?.value) || 1,    // 1 punto por cada $X gastado
            puntos_valor_canje: parseFloat(valorCanje?.value) || 100, // Cada 100 puntos = $X descuento
            puntos_activos: puntosActivos?.value === '1' || puntosActivos?.value === 'true' || false
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/configuracion/puntos", async (req, res) => {
    try {
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('puntos_por_peso', ?)", [req.body.puntos_por_peso || 1]);
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('puntos_valor_canje', ?)", [req.body.puntos_valor_canje || 100]);
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('puntos_activos', ?)", [req.body.puntos_activos ? '1' : '0']);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Historial de puntos de un cliente
app.get("/api/clientes/:id/puntos", async (req, res) => {
    try {
        const historial = await dbAll("SELECT * FROM puntos_historial WHERE cliente_id = ? ORDER BY fecha DESC LIMIT 50", [req.params.id]);
        res.json(historial);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Canjear puntos
app.post("/api/clientes/:id/canjear_puntos", async (req, res) => {
    try {
        const puntosACanjear = parseInt(req.body.puntos) || 0;
        if (puntosACanjear <= 0) return res.status(400).json({ error: "Puntos inválidos" });
        const cliente = await dbGet("SELECT puntos FROM clientes WHERE id=?", [req.params.id]);
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
        if (cliente.puntos < puntosACanjear) return res.status(400).json({ error: "Puntos insuficientes" });
        
        const valorCanje = await dbGet("SELECT value FROM configuracion WHERE key='puntos_valor_canje'");
        const valorPorPunto = parseFloat(valorCanje?.value) || 100;
        const descuento = (puntosACanjear / valorPorPunto);
        
        await dbRun("UPDATE clientes SET puntos = puntos - ?, puntos_canjeados = puntos_canjeados + ? WHERE id=?", [puntosACanjear, puntosACanjear, req.params.id]);
        await dbRun("INSERT INTO puntos_historial (cliente_id, puntos, tipo, descripcion) VALUES (?,?,?,?)",
            [req.params.id, -puntosACanjear, 'canje', `Canje por $${descuento.toFixed(2)} de descuento`]);
        
        res.json({ success: true, descuento, puntos_restantes: cliente.puntos - puntosACanjear });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Ajustar puntos manualmente (admin)
app.post("/api/clientes/:id/ajustar_puntos", async (req, res) => {
    try {
        const puntos = parseInt(req.body.puntos) || 0;
        if (puntos === 0) return res.status(400).json({ error: "Monto inválido" });
        await dbRun("UPDATE clientes SET puntos = MAX(0, puntos + ?) WHERE id=?", [puntos, req.params.id]);
        await dbRun("INSERT INTO puntos_historial (cliente_id, puntos, tipo, descripcion) VALUES (?,?,?,?)",
            [req.params.id, puntos, 'ajuste', req.body.descripcion || 'Ajuste manual']);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- RECORDATORIO DE DEUDAS VENCIDAS ---
app.get("/api/clientes/alertas/deudas", async (req, res) => {
    try {
        const diasLimite = parseInt(req.query.dias) || 7;
        const alertas = await dbAll(`
            SELECT c.id, c.nombre, c.telefono, c.limite_credito,
                COALESCE(SUM(f.monto), 0) as total_deuda,
                MIN(CASE WHEN f.monto > 0 THEN f.fecha END) as fiado_mas_antiguo,
                CAST(julianday('now', 'localtime') - julianday(MIN(CASE WHEN f.monto > 0 THEN f.fecha END)) AS INTEGER) as dias_desde_primer_fiado
            FROM clientes c
            JOIN fiados f ON c.id = f.cliente_id
            GROUP BY c.id
            HAVING total_deuda > 0
            AND dias_desde_primer_fiado >= ?
            ORDER BY dias_desde_primer_fiado DESC
        `, [diasLimite]);
        res.json(alertas);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Validar límite de crédito antes de fiar
app.get("/api/clientes/:id/validar_credito", async (req, res) => {
    try {
        const montoNuevo = parseFloat(req.query.monto) || 0;
        const cliente = await dbGet(`
            SELECT c.limite_credito,
                COALESCE((SELECT SUM(f.monto) FROM fiados f WHERE f.cliente_id = c.id), 0) as deuda_actual
            FROM clientes c WHERE c.id = ?
        `, [req.params.id]);
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
        
        const limite = cliente.limite_credito || 0;
        const deudaActual = cliente.deuda_actual || 0;
        const nuevaDeuda = deudaActual + montoNuevo;
        
        res.json({
            limite_credito: limite,
            deuda_actual: deudaActual,
            nueva_deuda: nuevaDeuda,
            permitido: limite <= 0 || nuevaDeuda <= limite, // 0 = sin límite
            excedente: limite > 0 ? Math.max(0, nuevaDeuda - limite) : 0
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/fiados", (req, res) => { db.all("SELECT * FROM fiados ORDER BY fecha DESC", [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });
app.get("/api/fiados/:id", (req, res) => { db.all("SELECT * FROM fiados WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows || []); }); });
app.post("/api/fiados", (req, res) => {
    db.get("SELECT nombre FROM clientes WHERE id = ?", [req.body.cliente_id], (err, row) => {
        db.run("INSERT INTO fiados (cliente, cliente_id, monto, descripcion, metodo_pago) VALUES (?,?,?,?,?)", 
            [row ? row.nombre : "Desconocido", req.body.cliente_id, req.body.monto, req.body.descripcion, req.body.metodo_pago || 'Efectivo'], 
            function(err) { if(err) res.status(500).json({error: err.message}); else res.json({id: this.lastID}); });
    });
});
app.delete("/api/fiados/:id", (req, res) => { db.run("DELETE FROM fiados WHERE id=?", req.params.id, function(err) { if(err) res.status(500).json({error: err.message}); else res.json({success: true}); }); });

app.get("/api/proveedores", (req, res) => { db.all("SELECT * FROM proveedores ORDER BY nombre", [], (err, rows) => res.json(rows || [])); });
app.post("/api/proveedores", (req, res) => { db.run("INSERT INTO proveedores (nombre, telefono, direccion, dia_visita, rubro) VALUES (?,?,?,?,?)", [req.body.nombre, req.body.telefono, req.body.direccion, req.body.dia_visita, req.body.rubro], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });
app.put("/api/proveedores/:id", (req, res) => {
  db.run("UPDATE proveedores SET nombre=?, telefono=?, direccion=?, dia_visita=?, rubro=? WHERE id=?",
    [req.body.nombre, req.body.telefono, req.body.direccion, req.body.dia_visita, req.body.rubro, req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Proveedor no encontrado" });
      } else {
        res.json({ success: true });
      }
    }
  );
});
app.delete("/api/proveedores/:id", (req, res) => { db.run("DELETE FROM proveedores WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });

app.get("/api/movimientos_todos", (req, res) => { db.all(`SELECT m.*, p.nombre as proveedor_nombre FROM movimientos_proveedores m JOIN proveedores p ON m.proveedor_id = p.id ORDER BY m.fecha DESC`, [], (err, rows) => { if(err) res.status(500).json({error: err.message}); else res.json(rows || []); }); });
app.get("/api/movimientos_proveedores/:id", (req, res) => { db.all("SELECT * FROM movimientos_proveedores WHERE proveedor_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => { if(err) res.status(500).json({error: err.message}); else res.json(rows || []); }); });
app.post("/api/movimientos_proveedores", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, metodo_pago) VALUES (?,?,?,?)", [req.body.proveedor_id, req.body.monto, req.body.descripcion, req.body.metodo_pago || 'Efectivo']);
        if (req.body.monto < 0) {
            const prov = await dbGet("SELECT nombre FROM proveedores WHERE id = ?", [req.body.proveedor_id]);
            const desc = `Pago Proveedor: ${prov ? prov.nombre : ''}`;
            if (req.body.metodo_pago === 'Retiros') {
                console.log(`[DEBUG] Insertando en retiros: desc="${desc}", monto=${req.body.monto}`);
                const fecha = new Date().toLocaleString('es-AR');
                await dbRun("INSERT INTO retiros (descripcion, monto, fecha) VALUES (?, ?, ?)", [desc, req.body.monto, fecha]);
                await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", [desc, Math.abs(req.body.monto), 'Proveedores', 'Retiros']);
            } else if (!req.body.metodo_pago || req.body.metodo_pago === 'Efectivo') {
                await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", [desc, Math.abs(req.body.monto), 'Proveedores', 'Efectivo']);
            } else {
                await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", [desc, Math.abs(req.body.monto), 'Proveedores', req.body.metodo_pago]);
            }
        }
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) {
        console.error(`[ERROR] movimientos_proveedores:`, e.message);
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});
app.delete("/api/movimientos_proveedores/:id", (req, res) => { db.run("DELETE FROM movimientos_proveedores WHERE id=?", [req.params.id], function(err) { if(err) res.status(500).json({error: err.message}); else res.json({deleted: this.changes}); }); });

// === 33. ÓRDENES DE COMPRA ===
app.get("/api/ordenes_compra", async (req, res) => {
    try {
        const { estado, proveedor_id } = req.query;
        let sql = `SELECT o.*, p.nombre as proveedor_nombre FROM ordenes_compra o JOIN proveedores p ON o.proveedor_id = p.id`;
        const params = [];
        const where = [];
        if (estado) { where.push("o.estado = ?"); params.push(estado); }
        if (proveedor_id) { where.push("o.proveedor_id = ?"); params.push(proveedor_id); }
        if (where.length) sql += " WHERE " + where.join(" AND ");
        sql += " ORDER BY o.fecha_creacion DESC";
        const ordenes = await dbAll(sql, params);
        res.json(ordenes);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/ordenes_compra/:id", async (req, res) => {
    try {
        const orden = await dbGet(`SELECT o.*, p.nombre as proveedor_nombre FROM ordenes_compra o JOIN proveedores p ON o.proveedor_id = p.id WHERE o.id = ?`, [req.params.id]);
        if (!orden) return res.status(404).json({ error: "Orden no encontrada" });
        const items = await dbAll("SELECT * FROM ordenes_compra_items WHERE orden_id = ?", [req.params.id]);
        res.json({ ...orden, items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ordenes_compra", async (req, res) => {
    try {
        const { proveedor_id, observacion, fecha_entrega, items } = req.body;
        if (!proveedor_id || !items || !items.length) return res.status(400).json({ error: "Proveedor e items requeridos" });
        const total = items.reduce((s, i) => s + (i.cantidad * i.costo_unitario), 0);
        await dbRun("BEGIN TRANSACTION");
        const result = await dbRun("INSERT INTO ordenes_compra (proveedor_id, observacion, total, fecha_entrega) VALUES (?,?,?,?)",
            [proveedor_id, observacion || '', total, fecha_entrega || '']);
        const ordenId = result.lastID;
        for (const item of items) {
            await dbRun("INSERT INTO ordenes_compra_items (orden_id, producto_id, tipo_producto, nombre, cantidad, costo_unitario) VALUES (?,?,?,?,?,?)",
                [ordenId, item.producto_id || null, item.tipo_producto || 'producto', item.nombre, item.cantidad, item.costo_unitario || 0]);
        }
        await dbRun("COMMIT");
        res.json({ success: true, id: ordenId });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

app.put("/api/ordenes_compra/:id", async (req, res) => {
    try {
        const { estado, observacion, fecha_entrega, items } = req.body;
        if (estado) await dbRun("UPDATE ordenes_compra SET estado=? WHERE id=?", [estado, req.params.id]);
        if (observacion !== undefined) await dbRun("UPDATE ordenes_compra SET observacion=? WHERE id=?", [observacion, req.params.id]);
        if (fecha_entrega !== undefined) await dbRun("UPDATE ordenes_compra SET fecha_entrega=? WHERE id=?", [fecha_entrega, req.params.id]);
        if (items && items.length) {
            const total = items.reduce((s, i) => s + (i.cantidad * i.costo_unitario), 0);
            await dbRun("DELETE FROM ordenes_compra_items WHERE orden_id=?", [req.params.id]);
            for (const item of items) {
                await dbRun("INSERT INTO ordenes_compra_items (orden_id, producto_id, tipo_producto, nombre, cantidad, costo_unitario) VALUES (?,?,?,?,?,?)",
                    [req.params.id, item.producto_id || null, item.tipo_producto || 'producto', item.nombre, item.cantidad, item.costo_unitario || 0]);
            }
            await dbRun("UPDATE ordenes_compra SET total=? WHERE id=?", [total, req.params.id]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recibir orden (actualiza stock, registra movimiento proveedor, actualiza costos)
app.post("/api/ordenes_compra/:id/recibir", async (req, res) => {
    try {
        const { items_recibidos, observacion } = req.body;
        const orden = await dbGet("SELECT * FROM ordenes_compra WHERE id=?", [req.params.id]);
        if (!orden) return res.status(404).json({ error: "Orden no encontrada" });
        if (orden.estado === 'recibido') return res.status(400).json({ error: "Orden ya fue recibida" });
        await dbRun("BEGIN TRANSACTION");
        let totalRecibido = 0;
        for (const item of items_recibidos) {
            const cantRecibida = item.cantidad_recibida || item.cantidad;
            totalRecibido += cantRecibida * (item.costo_unitario || 0);
            await dbRun("UPDATE ordenes_compra_items SET cantidad_recibida=? WHERE id=?", [cantRecibida, item.id]);
            // Actualizar stock del producto
            if (item.producto_id) {
                const tabla = item.tipo_producto === 'cigarrillo' ? 'cigarrillos' : 'productos';
                await dbRun(`UPDATE ${tabla} SET stock = stock + ? WHERE id = ?`, [cantRecibida, item.producto_id]);
                // Actualizar costo si cambió
                if (item.costo_unitario > 0) {
                    await dbRun(`UPDATE ${tabla} SET costo = ? WHERE id = ?`, [item.costo_unitario, item.producto_id]);
                }
            }
        }
        // Verificar si todos los items fueron recibidos completos
        const itemsOrden = await dbAll("SELECT cantidad, cantidad_recibida FROM ordenes_compra_items WHERE orden_id=?", [req.params.id]);
        const todosCompletos = itemsOrden.every(i => i.cantidad_recibida >= i.cantidad);
        const nuevoEstado = todosCompletos ? 'recibido' : 'parcial';
        await dbRun("UPDATE ordenes_compra SET estado=?, fecha_recibido=datetime('now','localtime') WHERE id=?", [nuevoEstado, req.params.id]);
        // Registrar movimiento como deuda con proveedor
        if (totalRecibido > 0) {
            await dbRun("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, metodo_pago) VALUES (?,?,?,?)",
                [orden.proveedor_id, totalRecibido, `Orden #${req.params.id} - ${observacion || 'Recepción de mercadería'}`, 'Cuenta Corriente']);
        }
        await dbRun("COMMIT");
        res.json({ success: true, estado: nuevoEstado, totalRecibido });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

app.delete("/api/ordenes_compra/:id", async (req, res) => {
    try {
        await dbRun("DELETE FROM ordenes_compra_items WHERE orden_id=?", [req.params.id]);
        await dbRun("DELETE FROM ordenes_compra WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === 34. PRECIO DE COSTO POR PROVEEDOR ===
app.get("/api/producto_proveedor/:producto_id", async (req, res) => {
    try {
        const { tipo } = req.query;
        const rows = await dbAll(`
            SELECT pp.*, p.nombre as proveedor_nombre
            FROM producto_proveedor pp
            JOIN proveedores p ON pp.proveedor_id = p.id
            WHERE pp.producto_id = ? AND pp.tipo_producto = ?
            ORDER BY pp.es_principal DESC, pp.costo ASC
        `, [req.params.producto_id, tipo || 'producto']);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/producto_proveedor", async (req, res) => {
    try {
        const { producto_id, tipo_producto, proveedor_id, costo, codigo_proveedor, es_principal } = req.body;
        // Si es principal, quitar principal de los demás
        if (es_principal) {
            await dbRun("UPDATE producto_proveedor SET es_principal=0 WHERE producto_id=? AND tipo_producto=?", [producto_id, tipo_producto || 'producto']);
        }
        await dbRun(`INSERT OR REPLACE INTO producto_proveedor (producto_id, tipo_producto, proveedor_id, costo, codigo_proveedor, es_principal, ultima_compra)
            VALUES (?,?,?,?,?,?,datetime('now','localtime'))`,
            [producto_id, tipo_producto || 'producto', proveedor_id, costo, codigo_proveedor || '', es_principal ? 1 : 0]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/producto_proveedor/:id", async (req, res) => {
    try {
        await dbRun("DELETE FROM producto_proveedor WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === 35. CALENDARIO DE VISITAS ===
app.get("/api/proveedores/visitas/semana", async (req, res) => {
    try {
        const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        const resultado = {};
        for (const dia of dias) {
            const provs = await dbAll("SELECT id, nombre, telefono, rubro FROM proveedores WHERE dia_visita = ? ORDER BY nombre", [dia]);
            resultado[dia] = provs;
        }
        res.json(resultado);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === 36. DEUDA CON PROVEEDORES (Saldo) ===
app.get("/api/proveedores/deudas/resumen", async (req, res) => {
    try {
        const deudas = await dbAll(`
            SELECT p.id, p.nombre, p.telefono, p.rubro,
                   COALESCE(SUM(m.monto), 0) as saldo,
                   COUNT(m.id) as total_movimientos,
                   MAX(m.fecha) as ultimo_movimiento
            FROM proveedores p
            LEFT JOIN movimientos_proveedores m ON m.proveedor_id = p.id
            GROUP BY p.id
            ORDER BY saldo DESC
        `);
        const totalDeuda = deudas.filter(d => d.saldo > 0).reduce((s, d) => s + d.saldo, 0);
        const totalFavor = deudas.filter(d => d.saldo < 0).reduce((s, d) => s + Math.abs(d.saldo), 0);
        res.json({ proveedores: deudas, totalDeuda, totalFavor });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Proveedores con saldo incluido en listado principal
app.get("/api/proveedores_con_saldo", async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT p.*, COALESCE(SUM(m.monto), 0) as saldo
            FROM proveedores p
            LEFT JOIN movimientos_proveedores m ON m.proveedor_id = p.id
            GROUP BY p.id
            ORDER BY p.nombre
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/productos", (req, res) => { db.all("SELECT * FROM productos ORDER BY nombre", [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });
app.post("/api/productos", (req, res) => { db.run("INSERT INTO productos (nombre, precio, costo, stock, codigo_barras, categoria, stock_minimo, unidad_medida) VALUES (?,?,?,?,?,?,?,?)", [req.body.nombre, req.body.precio, req.body.costo, req.body.stock, req.body.codigo_barras, req.body.categoria || 'General', req.body.stock_minimo || 5, req.body.unidad_medida || 'unidad'], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const prodId = this.lastID;
    // Registrar precio inicial en historial
    db.run("INSERT INTO historial_precios (producto_id, tipo_producto, precio_anterior, precio_nuevo, costo_anterior, costo_nuevo) VALUES (?,?,?,?,?,?)",
        [prodId, 'producto', 0, req.body.precio, 0, req.body.costo || 0]);
    res.json({ id: prodId });
}); });

// --- EXPORTAR PRODUCTOS CSV --- (antes de rutas con :id)
app.get("/api/productos/exportar/csv", async (req, res) => {
    try {
        const productos = await dbAll("SELECT nombre, precio, costo, stock, codigo_barras, categoria, stock_minimo, unidad_medida FROM productos ORDER BY nombre");
        const header = "nombre;precio;costo;stock;codigo_barras;categoria;stock_minimo;unidad_medida";
        const lines = productos.map(p => `"${p.nombre}";${p.precio};${p.costo};${p.stock};"${p.codigo_barras || ''}";"${p.categoria}";"${p.stock_minimo}";"${p.unidad_medida || 'unidad'}"`);
        const csv = [header, ...lines].join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=productos_${new Date().toISOString().slice(0,10)}.csv`);
        res.send("\uFEFF" + csv); // BOM para Excel
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/productos/:id", async (req, res) => {
    try {
        // Obtener precios actuales para historial
        const actual = await dbGet("SELECT precio, costo FROM productos WHERE id=?", [req.params.id]);
        const precioNuevo = parseFloat(req.body.precio);
        const costoNuevo = parseFloat(req.body.costo) || 0;
        
        // Registrar cambio de precio si hubo diferencia
        if (actual && (actual.precio !== precioNuevo || actual.costo !== costoNuevo)) {
            await dbRun("INSERT INTO historial_precios (producto_id, tipo_producto, precio_anterior, precio_nuevo, costo_anterior, costo_nuevo, usuario) VALUES (?,?,?,?,?,?,?)",
                [req.params.id, 'producto', actual.precio, precioNuevo, actual.costo, costoNuevo, req.body.usuario || '']);
        }
        
        await dbRun("UPDATE productos SET nombre=?, precio=?, costo=?, stock=?, codigo_barras=?, categoria=?, stock_minimo=?, unidad_medida=? WHERE id=?",
            [req.body.nombre, precioNuevo, costoNuevo, req.body.stock, req.body.codigo_barras, req.body.categoria, req.body.stock_minimo || 5, req.body.unidad_medida || 'unidad', req.params.id]);
        res.json({ updated: 1 });
    } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete("/api/productos/:id", async (req, res) => {
    try {
        // Limpiar imagen si existe
        const prod = await dbGet("SELECT imagen FROM productos WHERE id=?", [req.params.id]);
        if (prod && prod.imagen) {
            const imgPath = path.join(uploadsPath, prod.imagen);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
        // Limpiar códigos de barras adicionales  
        await dbRun("DELETE FROM codigos_barras WHERE producto_id=? AND tipo_producto='producto'", [req.params.id]);
        // Limpiar historial de precios
        await dbRun("DELETE FROM historial_precios WHERE producto_id=? AND tipo_producto='producto'", [req.params.id]);
        await dbRun("DELETE FROM productos WHERE id=?", [req.params.id]);
        res.json({ deleted: 1 });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- IMAGEN DE PRODUCTO ---
if (upload && sharp) {
app.post("/api/productos/:id/imagen", upload.single("imagen"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se envió imagen" });
        const filename = `prod_${req.params.id}_${Date.now()}.webp`;
        const outputPath = path.join(uploadsPath, filename);
        
        // Redimensionar y convertir a webp con sharp
        await sharp(req.file.buffer)
            .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);
        
        // Borrar imagen anterior si existe
        const prod = await dbGet("SELECT imagen FROM productos WHERE id=?", [req.params.id]);
        if (prod && prod.imagen) {
            const oldPath = path.join(uploadsPath, prod.imagen);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        
        await dbRun("UPDATE productos SET imagen=? WHERE id=?", [filename, req.params.id]);
        res.json({ success: true, imagen: filename });
    } catch(e) { res.status(500).json({ error: e.message }); }
});
} else {
    app.post("/api/productos/:id/imagen", (req, res) => res.status(501).json({ error: "Subida de imágenes no disponible (multer/sharp no instalados)" }));
}
app.delete("/api/productos/:id/imagen", async (req, res) => {
    try {
        const prod = await dbGet("SELECT imagen FROM productos WHERE id=?", [req.params.id]);
        if (prod && prod.imagen) {
            const imgPath = path.join(uploadsPath, prod.imagen);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
        await dbRun("UPDATE productos SET imagen='' WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- CÓDIGOS DE BARRAS MÚLTIPLES ---
app.get("/api/productos/:id/codigos", (req, res) => {
    db.all("SELECT * FROM codigos_barras WHERE producto_id=? AND tipo_producto='producto' ORDER BY id", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});
app.post("/api/productos/:id/codigos", async (req, res) => {
    try {
        const { codigo, descripcion } = req.body;
        if (!codigo || !codigo.trim()) return res.status(400).json({ error: "Código requerido" });
        // Verificar que no exista en productos ni en codigos_barras
        const existeProd = await dbGet("SELECT id, nombre FROM productos WHERE codigo_barras=?", [codigo.trim()]);
        const existeCig = await dbGet("SELECT id, nombre FROM cigarrillos WHERE codigo_barras=?", [codigo.trim()]);
        const existeCB = await dbGet("SELECT cb.id, p.nombre FROM codigos_barras cb JOIN productos p ON cb.producto_id=p.id WHERE cb.codigo=?", [codigo.trim()]);
        if (existeProd) return res.status(400).json({ error: `Código ya asignado a "${existeProd.nombre}"` });
        if (existeCig) return res.status(400).json({ error: `Código ya asignado al cigarrillo "${existeCig.nombre}"` });
        if (existeCB) return res.status(400).json({ error: `Código ya asignado como secundario de "${existeCB.nombre}"` });
        
        await dbRun("INSERT INTO codigos_barras (producto_id, tipo_producto, codigo, descripcion) VALUES (?,?,?,?)",
            [req.params.id, 'producto', codigo.trim(), descripcion || '']);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete("/api/codigos_barras/:id", (req, res) => {
    db.run("DELETE FROM codigos_barras WHERE id=?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// --- HISTORIAL DE PRECIOS ---
app.get("/api/productos/:id/historial_precios", (req, res) => {
    db.all("SELECT * FROM historial_precios WHERE producto_id=? AND tipo_producto='producto' ORDER BY fecha DESC LIMIT 50", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// --- BUSCAR POR CÓDIGO DE BARRAS (busca en principal + secundarios) ---
app.get("/api/buscar_codigo/:codigo", async (req, res) => {
    try {
        const codigo = req.params.codigo.trim();
        // 1. Buscar en productos.codigo_barras
        let prod = await dbGet("SELECT *, 'producto' as tipo_item FROM productos WHERE codigo_barras=?", [codigo]);
        if (prod) return res.json(prod);
        // 2. Buscar en cigarrillos.codigo_barras
        let cig = await dbGet("SELECT *, 'cigarrillo' as tipo_item FROM cigarrillos WHERE codigo_barras=?", [codigo]);
        if (cig) return res.json(cig);
        // 3. Buscar en promos.codigo_barras
        let promo = await dbGet("SELECT *, 'promo' as tipo_item FROM promos WHERE codigo_barras=?", [codigo]);
        if (promo) return res.json(promo);
        // 4. Buscar en codigos_barras (secundarios)
        const cb = await dbGet("SELECT producto_id, tipo_producto FROM codigos_barras WHERE codigo=?", [codigo]);
        if (cb) {
            const tabla = cb.tipo_producto === 'cigarrillo' ? 'cigarrillos' : 'productos';
            const item = await dbGet(`SELECT *, '${cb.tipo_producto}' as tipo_item FROM ${tabla} WHERE id=?`, [cb.producto_id]);
            if (item) return res.json(item);
        }
        res.json(null);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/categorias", (req, res) => { db.all("SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != '' ORDER BY categoria", [], (err, rows) => { if(err) return res.status(500).json({error: err.message}); res.json(rows.map(r => r.categoria)); }); });
app.delete("/api/categorias/:nombre", (req, res) => {
    if(req.params.nombre === 'General') return res.status(400).json({error: "No se puede eliminar la categoría base."});
    db.run("UPDATE productos SET categoria = 'General' WHERE categoria = ?", [req.params.nombre], function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({success: true, message: "Categoría eliminada"});
    });
});

app.get("/api/cigarrillos", (req, res) => { db.all("SELECT * FROM cigarrillos ORDER BY nombre", [], (err, rows) => { if (err) res.status(500).json({ error: err.message }); else res.json(rows); }); });
app.post("/api/cigarrillos", (req, res) => { db.run("INSERT INTO cigarrillos (nombre, precio, precio_qr, costo, stock, codigo_barras, stock_minimo) VALUES (?,?,?,?,?,?,?)", [req.body.nombre, req.body.precio, req.body.precio_qr || req.body.precio, req.body.costo || 0, req.body.stock, req.body.codigo_barras || '', req.body.stock_minimo || 5], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ id: this.lastID }); }); });
app.put("/api/cigarrillos/:id", (req, res) => { db.run("UPDATE cigarrillos SET nombre=?, precio=?, precio_qr=?, costo=?, stock=?, codigo_barras=?, stock_minimo=? WHERE id=?", [req.body.nombre, req.body.precio, req.body.precio_qr || req.body.precio, req.body.costo || 0, req.body.stock, req.body.codigo_barras || '', req.body.stock_minimo || 5, req.params.id], function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ updated: this.changes }); }); });
app.delete("/api/cigarrillos/:id", (req, res) => { db.run("DELETE FROM cigarrillos WHERE id=?", req.params.id, function (err) { if (err) res.status(500).json({ error: err.message }); else res.json({ deleted: this.changes }); }); });

app.post("/api/ventas", async (req, res) => {
    const { productos, metodo_pago, ticket_a_corregir, cliente_id } = req.body;
    const pagoAnticipado = parseFloat(req.body.pago_anticipado) || 0;
    const metodoAnticipo = req.body.metodo_anticipo || 'Efectivo';
    const descuento = parseFloat(req.body.descuento) || 0;
    const notas = req.body.notas || '';
    if (!productos || productos.length === 0) return res.status(400).json({ error: "No hay productos" });
    const subtotal = productos.reduce((acc, p) => {
        const precioItem = p.precio * p.cantidad;
        const descItem = parseFloat(p.descuento_item) || 0;
        return acc + precioItem - descItem;
    }, 0);
    const total = Math.max(0, subtotal - descuento);
    try {
        await dbRun("BEGIN TRANSACTION");
        if (ticket_a_corregir) { await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [ticket_a_corregir]); await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${ticket_a_corregir}%`]); }
        const ticket_id = await obtenerSiguienteTicket();
        let pEfvo = 0, pDig = 0;
        if (metodo_pago === 'Mixto') { pEfvo = parseFloat(req.body.pago_efectivo) || 0; pDig = parseFloat(req.body.pago_digital) || 0; }
        else if (metodo_pago === 'Efectivo') pEfvo = total;
        else if (metodo_pago === 'Fiado') { if (metodoAnticipo === 'Efectivo') pEfvo = pagoAnticipado; else pDig = pagoAnticipado; }
        else pDig = total;

        for (const item of productos) {
            // Si es una promo, descontar stock de sus componentes
            if (item.tipo === 'Promo' && item.componentes && Array.isArray(item.componentes) && item.componentes.length > 0) {
                // Validar stock de cada componente
                for (const comp of item.componentes) {
                    const stockActual = await dbGet(
                        `SELECT stock FROM ${comp.tipo === 'Cigarrillo' ? 'cigarrillos' : 'productos'} WHERE nombre = ?`,
                        [comp.nombre]
                    );
                    const cantidadNecesaria = comp.cantidad * item.cantidad; // cantidad del componente × cantidad de promos
                    if (!stockActual || stockActual.stock < cantidadNecesaria) {
                        throw new Error(`No hay suficiente stock de "${comp.nombre}" para esta promo. Requerido: ${cantidadNecesaria} | Disponible: ${stockActual?.stock || 0}`);
                    }
                    // Descontar stock por nombre que es más confiable
                    await dbRun(
                        `UPDATE ${comp.tipo === 'Cigarrillo' ? 'cigarrillos' : 'productos'} SET stock = stock - ? WHERE nombre = ?`,
                        [cantidadNecesaria, comp.nombre]
                    );
                }
                // Registrar la promo como venta (sin descontar de tabla promo ya que no tiene stock)
                let cat = 'Promo';
                const descItem = parseFloat(item.descuento_item) || 0;
                await dbRun(`INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, precio_unitario, cliente_id, metodo_pago, categoria, fecha, pago_efectivo, pago_digital, editado, notas, descuento, descuento_item) VALUES (?,?,?,?,?,?,?,?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?)`,
                    [ticket_id, item.nombre, item.cantidad, (item.precio * item.cantidad) - descItem, item.precio, cliente_id, metodo_pago, cat, pEfvo, pDig, ticket_a_corregir ? 1 : 0, notas, descuento, descItem]);
            } else {
                // Productos y cigarrillos normales - VALIDAR STOCK ANTES DE DESCONTAR
                let tabla = (item.tipo === 'Cigarrillo' || (item.categoria && item.categoria.toLowerCase().includes('cigarrillo'))) ? 'cigarrillos' : (item.tipo === 'Producto' ? 'productos' : null);

                if (tabla) {
                    // VALIDAR STOCK DISPONIBLE
                    const stockActual = await dbGet(
                        `SELECT stock FROM ${tabla} WHERE nombre = ?`,
                        [item.nombre]
                    );
                    if (!stockActual || stockActual.stock < item.cantidad) {
                        throw new Error(`No hay suficiente stock de "${item.nombre}". Requerido: ${item.cantidad} | Disponible: ${stockActual?.stock || 0}`);
                    }
                    // DESCONTAR STOCK
                    await dbRun(`UPDATE ${tabla} SET stock = stock - ? WHERE nombre = ?`, [item.cantidad, item.nombre]);
                }

                let cat = item.tipo || 'General'; if (tabla === 'cigarrillos' || item.tipo === 'Cigarrillo') cat = 'Cigarrillo';
                const descItem = parseFloat(item.descuento_item) || 0;
                await dbRun(`INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, precio_unitario, cliente_id, metodo_pago, categoria, fecha, pago_efectivo, pago_digital, editado, notas, descuento, descuento_item) VALUES (?,?,?,?,?,?,?,?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?)`,
                    [ticket_id, item.nombre, item.cantidad, (item.precio * item.cantidad) - descItem, item.precio, cliente_id, metodo_pago, cat, pEfvo, pDig, ticket_a_corregir ? 1 : 0, notas, descuento, descItem]);
            }
        }
        if (metodo_pago === 'Fiado') {
             if(!cliente_id) throw new Error("Debe seleccionar un cliente.");
             const cli = await dbGet("SELECT nombre, limite_credito FROM clientes WHERE id = ?", [cliente_id]);
             const deuda = total - pagoAnticipado;
             // Validar límite de crédito
             if (cli && cli.limite_credito > 0 && deuda > 0) {
                 const deudaActual = await dbGet("SELECT COALESCE(SUM(monto), 0) as total FROM fiados WHERE cliente_id = ?", [cliente_id]);
                 const nuevaDeuda = (deudaActual?.total || 0) + deuda;
                 if (nuevaDeuda > cli.limite_credito) {
                     throw new Error(`Límite de crédito excedido. Límite: $${cli.limite_credito.toFixed(2)}, Deuda actual: $${(deudaActual?.total || 0).toFixed(2)}, Nuevo fiado: $${deuda.toFixed(2)}`);
                 }
             }
             if(deuda > 0) await dbRun("INSERT INTO fiados (cliente, cliente_id, monto, descripcion) VALUES (?, ?, ?, ?)", [cli ? cli.nombre : "Desconocido", cliente_id, deuda, `Fiado Ticket ${ticket_id}`]);
        }
        // Acumular puntos de fidelización si el cliente está identificado
        if (cliente_id && metodo_pago !== 'Fiado') {
            try {
                const puntosActivos = await dbGet("SELECT value FROM configuracion WHERE key='puntos_activos'");
                if (puntosActivos?.value === '1') {
                    const ptsPorPeso = await dbGet("SELECT value FROM configuracion WHERE key='puntos_por_peso'");
                    const ratio = parseFloat(ptsPorPeso?.value) || 1;
                    const puntosGanados = Math.floor(total / ratio); // 1 punto por cada $ratio
                    if (puntosGanados > 0) {
                        await dbRun("UPDATE clientes SET puntos = puntos + ? WHERE id = ?", [puntosGanados, cliente_id]);
                        await dbRun("INSERT INTO puntos_historial (cliente_id, puntos, tipo, descripcion, ticket_id) VALUES (?,?,?,?,?)",
                            [cliente_id, puntosGanados, 'compra', `Compra Ticket #${ticket_id} ($${total.toFixed(2)})`, ticket_id]);
                    }
                }
            } catch(ptsErr) { console.error('[PUNTOS] Error acumulando puntos:', ptsErr.message); }
        }
        await dbRun("COMMIT");
        res.json({ success: true, ticket_id });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

app.delete("/api/ventas/:ticket_id", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        const items = await dbAll("SELECT * FROM ventas WHERE ticket_id = ?", [req.params.ticket_id]);
        if (items.length === 0) { await dbRun("ROLLBACK"); return res.status(404).json({ error: "No encontrada" }); }
        for (const item of items) {
            // Si es una promo, restaurar stock de componentes
            if (item.categoria === 'Promo') {
                const promo = await dbGet("SELECT componentes FROM promos WHERE nombre = ?", [item.producto]);
                if (promo && promo.componentes) {
                    try {
                        const componentes = JSON.parse(promo.componentes);
                        for (const comp of componentes) {
                            const cantidadNecesaria = comp.cantidad * item.cantidad;
                            await dbRun(
                                `UPDATE ${comp.tipo === 'Cigarrillo' ? 'cigarrillos' : 'productos'} SET stock = stock + ? WHERE nombre = ?`,
                                [cantidadNecesaria, comp.nombre]
                            );
                        }
                    } catch (e) {
                        console.error("Error al parsear componentes:", e);
                    }
                }
            } else {
                // Productos y cigarrillos normales
                let tabla = (item.categoria && item.categoria.toLowerCase().includes('cigarrillo')) ? 'cigarrillos' : (item.categoria !== 'Manual' ? 'productos' : null);
                if(tabla) await dbRun(`UPDATE ${tabla} SET stock = stock + ? WHERE nombre = ?`, [item.cantidad, item.producto]);
            }
        }
        await dbRun("DELETE FROM ventas WHERE ticket_id = ?", [req.params.ticket_id]);
        await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${req.params.ticket_id}%`]);
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

// HISTORIAL CON FILTROS AVANZADOS
app.get("/api/ventas/historial", async (req, res) => {
    try {
        const { desde, hasta, metodo, cliente_id, categoria, min, max, busqueda } = req.query;
        let where = [];
        let params = [];

        if (desde) { where.push("date(v.fecha) >= ?"); params.push(desde); }
        if (hasta) { where.push("date(v.fecha) <= ?"); params.push(hasta); }
        if (metodo) { where.push("v.metodo_pago = ?"); params.push(metodo); }
        if (cliente_id) { where.push("v.cliente_id = ?"); params.push(cliente_id); }
        if (categoria) { where.push("v.categoria = ?"); params.push(categoria); }
        if (busqueda) { where.push("(v.producto LIKE ? OR c.nombre LIKE ?)"); params.push(`%${busqueda}%`, `%${busqueda}%`); }

        const whereClause = where.length > 0 ? "WHERE " + where.join(" AND ") : "";
        const sql = `SELECT v.*, c.nombre as nombre_cliente FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id ${whereClause} ORDER BY v.fecha DESC`;
        const rows = await dbAll(sql, params);

        // Filtrar por monto total de ticket (min/max) post-query
        if (min || max) {
            const agrupado = {};
            rows.forEach(r => {
                if (!agrupado[r.ticket_id]) agrupado[r.ticket_id] = 0;
                agrupado[r.ticket_id] += r.precio_total;
            });
            const minVal = parseFloat(min) || 0;
            const maxVal = parseFloat(max) || Infinity;
            const ticketsValidos = Object.keys(agrupado).filter(t => agrupado[t] >= minVal && agrupado[t] <= maxVal).map(Number);
            const filtrados = rows.filter(r => ticketsValidos.includes(r.ticket_id));
            return res.json(filtrados);
        }

        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// OBTENER DETALLE DE UN TICKET ESPECÍFICO (para reimpresión)
app.get("/api/ventas/:ticket_id", async (req, res) => {
    try {
        const items = await dbAll(
            `SELECT v.*, c.nombre as nombre_cliente FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id WHERE v.ticket_id = ? ORDER BY v.id`,
            [req.params.ticket_id]
        );
        if (items.length === 0) return res.status(404).json({ error: "Ticket no encontrado" });
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DEVOLUCIÓN PARCIAL
app.post("/api/ventas/:ticket_id/devolucion", async (req, res) => {
    const { items, motivo } = req.body;
    const ticketId = parseInt(req.params.ticket_id);
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "No hay items para devolver" });
    try {
        await dbRun("BEGIN TRANSACTION");
        let totalDevuelto = 0;
        for (const item of items) {
            // Verificar que la venta existe
            const ventaItem = await dbGet(
                "SELECT * FROM ventas WHERE ticket_id = ? AND producto = ?",
                [ticketId, item.producto]
            );
            if (!ventaItem) throw new Error(`Producto "${item.producto}" no encontrado en el ticket`);
            if (item.cantidad > ventaItem.cantidad) throw new Error(`No se puede devolver más de ${ventaItem.cantidad} unidades de "${item.producto}"`);

            const montoDevolucion = item.cantidad * ventaItem.precio_unitario;
            totalDevuelto += montoDevolucion;

            // Registrar devolución
            await dbRun(
                "INSERT INTO devoluciones (venta_ticket_id, producto, cantidad, monto, motivo) VALUES (?,?,?,?,?)",
                [ticketId, item.producto, item.cantidad, montoDevolucion, motivo || '']
            );

            // Restaurar stock
            if (ventaItem.categoria === 'Promo') {
                const promo = await dbGet("SELECT componentes FROM promos WHERE nombre = ?", [item.producto]);
                if (promo && promo.componentes) {
                    const componentes = JSON.parse(promo.componentes);
                    for (const comp of componentes) {
                        await dbRun(
                            `UPDATE ${comp.tipo === 'Cigarrillo' ? 'cigarrillos' : 'productos'} SET stock = stock + ? WHERE nombre = ?`,
                            [comp.cantidad * item.cantidad, comp.nombre]
                        );
                    }
                }
            } else if (ventaItem.categoria !== 'Manual') {
                const tabla = (ventaItem.categoria && ventaItem.categoria.toLowerCase().includes('cigarrillo')) ? 'cigarrillos' : 'productos';
                await dbRun(`UPDATE ${tabla} SET stock = stock + ? WHERE nombre = ?`, [item.cantidad, item.producto]);
            }

            // Actualizar cantidad en ventas (si se devuelve todo, eliminar la fila)
            if (item.cantidad >= ventaItem.cantidad) {
                await dbRun("DELETE FROM ventas WHERE ticket_id = ? AND producto = ?", [ticketId, item.producto]);
            } else {
                const nuevaCantidad = ventaItem.cantidad - item.cantidad;
                const nuevoPrecioTotal = nuevaCantidad * ventaItem.precio_unitario;
                await dbRun(
                    "UPDATE ventas SET cantidad = ?, precio_total = ? WHERE ticket_id = ? AND producto = ?",
                    [nuevaCantidad, nuevoPrecioTotal, ticketId, item.producto]
                );
            }
        }

        // Si se devolvió todo el ticket, limpiar fiados
        const remaining = await dbAll("SELECT * FROM ventas WHERE ticket_id = ?", [ticketId]);
        if (remaining.length === 0) {
            await dbRun("DELETE FROM fiados WHERE descripcion LIKE ?", [`%Ticket ${ticketId}%`]);
        }

        await dbRun("COMMIT");
        res.json({ success: true, totalDevuelto, itemsRestantes: remaining.length });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

// OBTENER DEVOLUCIONES
app.get("/api/devoluciones", async (req, res) => {
    try {
        const devs = await dbAll("SELECT * FROM devoluciones ORDER BY fecha DESC");
        res.json(devs || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/gastos", (req, res) => { db.all("SELECT * FROM gastos ORDER BY fecha DESC", [], (err, rows) => res.json(rows || [])); });
app.post("/api/gastos", async (req, res) => {
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago) VALUES (?,?,?,?)", [req.body.descripcion, req.body.monto, req.body.categoria, req.body.metodo_pago || 'Efectivo']);
        if (req.body.metodo_pago === 'Retiros') {
            const fecha = new Date().toLocaleString('es-AR');
            await dbRun("INSERT INTO retiros (descripcion, monto, fecha) VALUES (?, ?, ?)", [`Gasto: ${req.body.descripcion}`, -Math.abs(req.body.monto), fecha]);
        }
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

// --- GESTIÓN DE CONFIGURACIÓN Y CREDENCIALES ---

// Obtener toda la configuración (Datos Kiosco + Credenciales)
app.get("/api/config", async (req, res) => {
    try {
        const configs = await dbAll("SELECT * FROM configuracion");
        const configObj = {};
        configs.forEach(c => configObj[c.key] = c.value);
        
        if (!configObj.admin_user) configObj.admin_user = "admin";
        if (!configObj.kiosco_nombre) configObj.kiosco_nombre = "Mi Kiosco";
        if (!configObj.kiosco_direccion) configObj.kiosco_direccion = "";
        if (!configObj.mp_alias) configObj.mp_alias = "";
        if (!configObj.mp_nombre) configObj.mp_nombre = "";
        if (!configObj.whatsapp_numero) configObj.whatsapp_numero = "";
        if (!configObj.sync_url) configObj.sync_url = "";
        if (!configObj.sync_token) configObj.sync_token = "";

        // NO devolver el hash de la contraseña al frontend
        configObj.admin_password = "";

        res.json(configObj);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Guardar configuración
app.post("/api/config", async (req, res) => {
    const { admin_user, admin_password, kiosco_nombre, kiosco_direccion, kiosco_telefono, mp_alias, mp_nombre, whatsapp_numero, sync_url, sync_token } = req.body;
    try {
        await dbRun("BEGIN TRANSACTION");
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('admin_user', ?)", [admin_user]);
        
        // Solo actualizar contraseña si el usuario escribió una nueva
        if (admin_password && admin_password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(admin_password, 10);
            await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('admin_password', ?)", [hashedPassword]);
        }
        
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('kiosco_nombre', ?)", [kiosco_nombre]);
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('kiosco_direccion', ?)", [kiosco_direccion]);
        await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('kiosco_telefono', ?)", [kiosco_telefono]);
        // Integraciones
        if (mp_alias !== undefined) await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('mp_alias', ?)", [mp_alias || '']);
        if (mp_nombre !== undefined) await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('mp_nombre', ?)", [mp_nombre || '']);
        if (whatsapp_numero !== undefined) await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('whatsapp_numero', ?)", [whatsapp_numero || '']);
        if (sync_url !== undefined) await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('sync_url', ?)", [sync_url || '']);
        if (sync_token !== undefined) await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('sync_token', ?)", [sync_token || '']);
        await dbRun("COMMIT");
        res.json({ success: true });
    } catch (e) {
        await dbRun("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});

// Endpoint de Login — verifica usuarios table primero, luego config legacy
app.post("/api/login", async (req, res) => {
    const { usuario, password } = req.body;
    try {
        // 1. Buscar en tabla usuarios
        const userRow = await dbGet("SELECT * FROM usuarios WHERE nombre = ? AND activo = 1", [usuario]);
        if (userRow) {
            let ok = false;
            if (userRow.password.startsWith("$2a$") || userRow.password.startsWith("$2b$")) {
                ok = await bcrypt.compare(password, userRow.password);
            } else {
                ok = password === userRow.password;
                if (ok) {
                    const hashed = await bcrypt.hash(password, 10);
                    await dbRun("UPDATE usuarios SET password = ? WHERE id = ?", [hashed, userRow.id]);
                }
            }
            if (ok) {
                const token = jwt.sign({ usuario: userRow.nombre, rol: userRow.rol, id: userRow.id }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
                return res.json({ success: true, user: { nombre: userRow.nombre, rol: userRow.rol }, token });
            }
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        // 2. Fallback: admin legacy en configuracion
        const dbUser = await dbGet("SELECT value FROM configuracion WHERE key='admin_user'");
        const dbPass = await dbGet("SELECT value FROM configuracion WHERE key='admin_password'");
        
        const validUser = dbUser ? dbUser.value : 'admin';
        const storedPass = dbPass ? dbPass.value : null;

        if (usuario !== validUser) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        let passwordValida = false;
        if (storedPass) {
            if (storedPass.startsWith("$2a$") || storedPass.startsWith("$2b$")) {
                // Contraseña hasheada — comparar con bcrypt
                passwordValida = await bcrypt.compare(password, storedPass);
            } else {
                // Contraseña legacy en texto plano — comparar directamente y migrar
                passwordValida = password === storedPass;
                if (passwordValida) {
                    const hashed = await bcrypt.hash(password, 10);
                    await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('admin_password', ?)", [hashed]);
                    console.log("[SEGURIDAD] Contraseña migrada a bcrypt durante login.");
                }
            }
        } else {
            // Sin contraseña en DB — default 'admin'
            passwordValida = password === 'admin';
            if (passwordValida) {
                const hashed = await bcrypt.hash('admin', 10);
                await dbRun("INSERT OR REPLACE INTO configuracion (key, value) VALUES ('admin_password', ?)", [hashed]);
            }
        }

        if (passwordValida) {
            // Generar token JWT
            const token = jwt.sign(
                { usuario: validUser, rol: "admin" },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRATION }
            );
            res.json({ success: true, user: { nombre: validUser }, token });
        } else {
            res.status(401).json({ error: "Credenciales incorrectas" });
        }
    } catch (e) {
        console.error("Error en login:", e);
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/gastos/:id", (req, res) => { db.run("DELETE FROM gastos WHERE id=?", [req.params.id], (err) => err ? res.status(500).json({error: err.message}) : res.json({success: true})); });

// --- GESTIÓN DE USUARIOS ---
app.get("/api/usuarios", async (req, res) => {
    try {
        const usuarios = await dbAll("SELECT id, nombre, rol, activo FROM usuarios ORDER BY nombre");
        res.json(usuarios || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/usuarios", async (req, res) => {
    const { nombre, password, rol } = req.body;
    if (!nombre || !password) return res.status(400).json({ error: "Nombre y contraseña son obligatorios" });
    try {
        const hashed = await bcrypt.hash(password, 10);
        await dbRun("INSERT INTO usuarios (nombre, password, rol) VALUES (?,?,?)", [nombre.trim(), hashed, rol || 'cajero']);
        res.json({ success: true });
    } catch (e) {
        if (e.message.includes("UNIQUE")) return res.status(400).json({ error: "Ya existe un usuario con ese nombre" });
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/usuarios/:id", async (req, res) => {
    const { nombre, password, rol, activo } = req.body;
    try {
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await dbRun("UPDATE usuarios SET nombre=?, password=?, rol=?, activo=? WHERE id=?", [nombre, hashed, rol, activo ?? 1, req.params.id]);
        } else {
            await dbRun("UPDATE usuarios SET nombre=?, rol=?, activo=? WHERE id=?", [nombre, rol, activo ?? 1, req.params.id]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/usuarios/:id", async (req, res) => {
    try {
        await dbRun("DELETE FROM usuarios WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- BACKUP DE BASE DE DATOS ---
app.get("/api/backup", async (req, res) => {
    try {
        const backupDir = path.join(path.dirname(dbPath), "backups");
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const fecha = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const backupFile = path.join(backupDir, `kiosco_backup_${fecha}.db`);
        fs.copyFileSync(dbPath, backupFile);
        // Mantener solo los últimos 10 backups
        const backups = fs.readdirSync(backupDir).filter(f => f.endsWith(".db")).sort();
        while (backups.length > 10) {
            fs.unlinkSync(path.join(backupDir, backups.shift()));
        }
        res.json({ success: true, file: backupFile, fecha });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/backup/list", async (req, res) => {
    try {
        const backupDir = path.join(path.dirname(dbPath), "backups");
        if (!fs.existsSync(backupDir)) return res.json([]);
        const backups = fs.readdirSync(backupDir).filter(f => f.endsWith(".db")).sort().reverse().map(f => {
            const stats = fs.statSync(path.join(backupDir, f));
            return { nombre: f, tamaño: (stats.size / 1024).toFixed(1) + " KB", fecha: stats.mtime };
        });
        res.json(backups);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/backup/restore", async (req, res) => {
    try {
        const { nombre } = req.body;
        const backupDir = path.join(path.dirname(dbPath), "backups");
        const backupFile = path.join(backupDir, nombre);
        if (!fs.existsSync(backupFile)) return res.status(404).json({ error: "Backup no encontrado" });
        // Hacer backup del actual antes de restaurar
        const fecha = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        fs.copyFileSync(dbPath, path.join(backupDir, `pre_restore_${fecha}.db`));
        fs.copyFileSync(backupFile, dbPath);
        res.json({ success: true, message: "Base de datos restaurada. Reinicie la aplicación." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Backup automático al iniciar el servidor
(() => {
    try {
        if (fs.existsSync(dbPath)) {
            const backupDir = path.join(path.dirname(dbPath), "backups");
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
            const fecha = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            fs.copyFileSync(dbPath, path.join(backupDir, `auto_${fecha}.db`));
            // Limpiar backups viejos (máx 10)
            const backups = fs.readdirSync(backupDir).filter(f => f.endsWith(".db")).sort();
            while (backups.length > 10) fs.unlinkSync(path.join(backupDir, backups.shift()));
            console.log("[BACKUP] Backup automático realizado.");
        }
    } catch (e) { console.error("[BACKUP] Error:", e.message); }
})();

// --- SINCRONIZACIÓN EN LA NUBE ---
// Exportar base de datos como archivo para sync
app.get("/api/sync/export", async (req, res) => {
    try {
        if (!fs.existsSync(dbPath)) return res.status(404).json({ error: "Base de datos no encontrada" });
        res.download(dbPath, `kiosco_sync_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Subir backup al servidor remoto configurado
app.post("/api/sync/push", async (req, res) => {
    try {
        const configSyncUrl = await dbGet("SELECT value FROM configuracion WHERE key='sync_url'");
        const configSyncToken = await dbGet("SELECT value FROM configuracion WHERE key='sync_token'");
        const syncUrl = configSyncUrl?.value;
        const syncToken = configSyncToken?.value || '';

        if (!syncUrl) return res.status(400).json({ error: "No hay URL de sincronización configurada. Configurala en Ajustes." });

        // Leer DB como buffer
        const dbBuffer = fs.readFileSync(dbPath);
        const base64 = dbBuffer.toString('base64');

        const configNombre = await dbGet("SELECT value FROM configuracion WHERE key='kiosco_nombre'");
        const nombre = configNombre?.value || 'kiosco';

        const response = await fetch(syncUrl + '/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${syncToken}`
            },
            body: JSON.stringify({
                nombre: nombre,
                fecha: new Date().toISOString(),
                data: base64,
                size: dbBuffer.length
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: `Error del servidor remoto: ${errorText}` });
        }

        const result = await response.json();
        res.json({ success: true, message: "Backup subido exitosamente", ...result });
    } catch (e) {
        res.status(500).json({ error: `Error de sincronización: ${e.message}` });
    }
});

// Descargar backup del servidor remoto
app.post("/api/sync/pull", async (req, res) => {
    try {
        const configSyncUrl = await dbGet("SELECT value FROM configuracion WHERE key='sync_url'");
        const configSyncToken = await dbGet("SELECT value FROM configuracion WHERE key='sync_token'");
        const syncUrl = configSyncUrl?.value;
        const syncToken = configSyncToken?.value || '';

        if (!syncUrl) return res.status(400).json({ error: "No hay URL de sincronización configurada" });

        const response = await fetch(syncUrl + '/download', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${syncToken}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: `Error del servidor remoto: ${errorText}` });
        }

        const result = await response.json();
        if (!result.data) return res.status(400).json({ error: "No hay backup disponible en el servidor remoto" });

        // Hacer backup local antes de restaurar
        const backupDir = path.join(path.dirname(dbPath), "backups");
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const fecha = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        fs.copyFileSync(dbPath, path.join(backupDir, `pre_sync_${fecha}.db`));

        // Restaurar
        const dbBuffer = Buffer.from(result.data, 'base64');
        fs.writeFileSync(dbPath, dbBuffer);

        res.json({ success: true, message: "Base de datos sincronizada. Reinicie la app.", fecha: result.fecha });
    } catch (e) {
        res.status(500).json({ error: `Error de sincronización: ${e.message}` });
    }
});

// Estado de última sincronización
app.get("/api/sync/status", async (req, res) => {
    try {
        const configSyncUrl = await dbGet("SELECT value FROM configuracion WHERE key='sync_url'");
        const lastSync = await dbGet("SELECT value FROM configuracion WHERE key='last_sync'");
        res.json({
            configured: !!(configSyncUrl?.value),
            last_sync: lastSync?.value || null,
            url: configSyncUrl?.value || ''
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- HISTORIAL DE CIERRES ---
app.get("/api/historial_cierres", async (req, res) => {
    try {
        const cierres = await dbAll("SELECT * FROM historial_cierres ORDER BY fecha DESC");
        res.json(cierres || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- RENTABILIDAD ---
app.get("/api/reportes/rentabilidad", async (req, res) => {
    try {
        const productos = await dbAll(`
            SELECT p.nombre, p.precio, p.costo, p.categoria, p.stock,
                   COALESCE(SUM(v.cantidad), 0) as total_vendido,
                   COALESCE(SUM(v.precio_total), 0) as ingresos_totales
            FROM productos p
            LEFT JOIN ventas v ON v.producto = p.nombre
            GROUP BY p.id
            ORDER BY (COALESCE(SUM(v.cantidad), 0) * (p.precio - p.costo)) DESC
        `);
        const cigarrillos = await dbAll(`
            SELECT c.nombre, c.precio, c.costo, 'Cigarrillos' as categoria, c.stock,
                   COALESCE(SUM(v.cantidad), 0) as total_vendido,
                   COALESCE(SUM(v.precio_total), 0) as ingresos_totales
            FROM cigarrillos c
            LEFT JOIN ventas v ON v.producto = c.nombre
            GROUP BY c.id
            ORDER BY (COALESCE(SUM(v.cantidad), 0) * (c.precio - c.costo)) DESC
        `);
        const todos = [...productos, ...cigarrillos].map(p => ({
            ...p,
            margen: p.precio - p.costo,
            margen_pct: p.costo > 0 ? (((p.precio - p.costo) / p.costo) * 100).toFixed(1) : 0,
            ganancia_total: (p.precio - p.costo) * p.total_vendido
        }));
        const totalIngresos = todos.reduce((s, p) => s + p.ingresos_totales, 0);
        const totalGanancia = todos.reduce((s, p) => s + p.ganancia_total, 0);
        res.json({ productos: todos, totalIngresos, totalGanancia });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- IMPORTAR PRODUCTOS CSV ---
app.post("/api/productos/importar", async (req, res) => {
    const { productos: items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "No hay productos para importar" });
    let insertados = 0, actualizados = 0, errores = 0;
    try {
        await dbRun("BEGIN TRANSACTION");
        for (const item of items) {
            if (!item.nombre || !item.precio) { errores++; continue; }
            const existe = await dbGet("SELECT id FROM productos WHERE nombre = ? OR (codigo_barras IS NOT NULL AND codigo_barras != '' AND codigo_barras = ?)", [item.nombre, item.codigo_barras || '']);
            if (existe) {
                await dbRun("UPDATE productos SET precio=?, costo=?, stock=?, codigo_barras=?, categoria=? WHERE id=?",
                    [parseFloat(item.precio), parseFloat(item.costo) || 0, parseInt(item.stock) || 0, item.codigo_barras || '', item.categoria || 'General', existe.id]);
                actualizados++;
            } else {
                await dbRun("INSERT INTO productos (nombre, precio, costo, stock, codigo_barras, categoria) VALUES (?,?,?,?,?,?)",
                    [item.nombre, parseFloat(item.precio), parseFloat(item.costo) || 0, parseInt(item.stock) || 0, item.codigo_barras || '', item.categoria || 'General']);
                insertados++;
            }
        }
        await dbRun("COMMIT");
        res.json({ success: true, insertados, actualizados, errores });
    } catch (e) { await dbRun("ROLLBACK"); res.status(500).json({ error: e.message }); }
});

// SPA FALLBACK
app.get(/.*/, (req, res) => { 
    res.sendFile(path.join(publicPath, 'index.html')); 
});

const server = app.listen(port, () => { console.log(`Servidor corriendo en http://localhost:${port}`); });

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Puerto ${port} en uso. Intentando liberar...`);
        // Intentar matar el proceso anterior y reintentar
        const killCmd = process.platform === 'win32' 
            ? `netstat -ano | findstr :${port}` 
            : `lsof -ti:${port}`;
        exec(killCmd, (error, stdout) => {
            if (!error && stdout.trim()) {
                const lines = stdout.trim().split('\n');
                const pids = [...new Set(lines.map(l => l.trim().split(/\s+/).pop()).filter(p => p && /^\d+$/.test(p)))];
                pids.forEach(pid => {
                    try {
                        if (process.platform === 'win32') {
                            exec(`taskkill /PID ${pid} /F`, () => {});
                        } else {
                            process.kill(parseInt(pid), 'SIGTERM');
                        }
                    } catch(e) {}
                });
                // Reintentar después de matar
                setTimeout(() => {
                    app.listen(port, () => console.log(`Servidor corriendo en http://localhost:${port} (reintento)`));
                }, 1500);
            } else {
                console.error(`No se pudo liberar el puerto ${port}. ¿Hay otra instancia abierta?`);
            }
        });
    } else {
        console.error('Error del servidor:', err);
    }
});