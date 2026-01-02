const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../dist")));

const db = new sqlite3.Database("kiosco.db", (err) => {
  if (err) console.error("Error DB:", err.message);
  else console.log("Conectado a la base de datos SQLite.");
});

// --- MIGRACIÓN Y TABLAS ---
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, stock INTEGER, categoria TEXT, codigo_barras TEXT)`);
  db.run("ALTER TABLE productos ADD COLUMN codigo_barras TEXT", (err) => {}); 

  db.run(`CREATE TABLE IF NOT EXISTS categorias_productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS cigarrillos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, precio_qr REAL, stock INTEGER)`);
  
  db.run(`CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id TEXT, producto TEXT, cantidad INTEGER, 
    precio_total REAL, metodo_pago TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    pago_efectivo REAL DEFAULT 0, pago_digital REAL DEFAULT 0
  )`);
  db.run("ALTER TABLE ventas ADD COLUMN pago_efectivo REAL DEFAULT 0", (err) => {});
  db.run("ALTER TABLE ventas ADD COLUMN pago_digital REAL DEFAULT 0", (err) => {});

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

  db.get("SELECT count(*) as count FROM usuarios", (err, row) => {
      if (row && row.count === 0) db.run("INSERT INTO usuarios (usuario, password) VALUES (?, ?)", ["admin", "1234"]);
  });
  db.get("SELECT count(*) as count FROM categorias_gastos", (err, row) => {
      if (row && row.count === 0) {
          ["Mercadería", "Luz", "Internet", "Alquiler", "Limpieza", "Varios"].forEach(c => db.run("INSERT INTO categorias_gastos (nombre) VALUES (?)", [c]));
      }
  });
});

// ==========================================
// RUTAS
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

// --- REPORTES PARA GRÁFICOS (NUEVO) ---
app.get("/reportes/ventas_semana", (req, res) => {
    // Devuelve fecha (DD/MM) y total vendido de los últimos 7 días
    const sql = `
        SELECT strftime('%d/%m', fecha) as fecha, SUM(precio_total) as total 
        FROM ventas 
        WHERE fecha >= date('now', '-6 days', 'localtime') 
        GROUP BY strftime('%Y-%m-%d', fecha) 
        ORDER BY fecha ASC
    `;
    db.all(sql, [], (err, rows) => res.json(rows || []));
});

app.get("/reportes/productos_top", (req, res) => {
    // Top 5 productos más vendidos (cantidad)
    const sql = `SELECT producto as name, SUM(cantidad) as value FROM ventas GROUP BY producto ORDER BY value DESC LIMIT 5`;
    db.all(sql, [], (err, rows) => res.json(rows || []));
});

app.get("/reportes/metodos_pago", (req, res) => {
   // Totales por método de pago para gráfico de torta
   const sql = `SELECT metodo_pago as name, SUM(precio_total) as value FROM ventas GROUP BY metodo_pago`;
   db.all(sql, [], (err, rows) => res.json(rows || []));
});
// --------------------------------------

// --- PRODUCTOS ---
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
app.post("/productos/aumento_masivo", (req, res) => {
    const { porcentaje, categoria } = req.body;
    if (!porcentaje || isNaN(porcentaje)) return res.status(400).json({ error: "Porcentaje inválido" });
    let sql = "UPDATE productos SET precio = precio + (precio * ? / 100)";
    let params = [porcentaje];
    if (categoria && categoria !== "Todas") { sql += " WHERE categoria = ?"; params.push(categoria); }
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, cambios: this.changes });
    });
});

app.get("/categorias_productos", (req, res) => db.all("SELECT * FROM categorias_productos", (err, r) => res.json(r)));
app.post("/categorias_productos", (req, res) => db.run("INSERT INTO categorias_productos (nombre) VALUES (?)", [req.body.nombre], () => res.json({success: true})));

// --- CIGARRILLOS ---
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

// --- VENTAS ---
// AGREGAR ESTO:

app.get("/ventas", (req, res) => {
    db.all("SELECT * FROM ventas ORDER BY fecha DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post("/ventas", (req, res) => {
  const { productos, metodo_pago, desglose } = req.body;
  if (!productos || productos.length === 0) return res.status(400).json({ error: "Vacío" });

  const ticket_id = Date.now().toString(); 
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const stmtVenta = db.prepare(`INSERT INTO ventas 
        (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha, pago_efectivo, pago_digital) 
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)`);
    
    const stmtStockProd = db.prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
    const stmtStockCig = db.prepare("UPDATE cigarrillos SET stock = stock - ? WHERE id = ?");

    let ratioEfectivo = 1; let ratioDigital = 0;
    if (desglose && desglose.total > 0) {
        ratioEfectivo = desglose.efectivo / desglose.total;
        ratioDigital = desglose.digital / desglose.total;
    } else {
        if (metodo_pago === 'Efectivo') { ratioEfectivo = 1; ratioDigital = 0; }
        else { ratioEfectivo = 0; ratioDigital = 1; }
    }

    productos.forEach((item) => {
      const totalLinea = item.precio * item.cantidad;
      const parteEfectivo = totalLinea * ratioEfectivo;
      const parteDigital = totalLinea * ratioDigital;
      stmtVenta.run(ticket_id, item.nombre, item.cantidad, totalLinea, metodo_pago, item.tipo || 'General', parteEfectivo, parteDigital);

      if (!item.es_manual && item.id) {
          if (item.tipo === "cigarrillo") stmtStockCig.run(item.cantidad, item.id);
          else stmtStockProd.run(item.cantidad, item.id);
      }
    });

    stmtVenta.finalize();
    stmtStockProd.finalize();
    stmtStockCig.finalize();

    db.run("COMMIT", (err) => {
        if(err) { db.run("ROLLBACK"); res.status(500).send(err); }
        else res.json({ success: true });
    });
  });
});

app.get("/historial", (req, res) => db.all("SELECT * FROM ventas ORDER BY fecha DESC", (err, rows) => res.json(rows)));

// --- GASTOS ---
app.get("/gastos", (req, res) => db.all("SELECT * FROM gastos ORDER BY fecha DESC LIMIT 50", (err, r) => res.json(r)));
app.post("/gastos", (req, res) => db.run("INSERT INTO gastos (monto, descripcion, categoria, fecha) VALUES (?, ?, ?, datetime('now', 'localtime'))", [req.body.monto, req.body.descripcion, req.body.categoria], () => res.json({success: true})));
app.delete("/gastos/:id", (req, res) => db.run("DELETE FROM gastos WHERE id=?", [req.params.id], () => res.json({success: true})));
app.get("/categorias_gastos", (req, res) => db.all("SELECT * FROM categorias_gastos", (err, r) => res.json(r)));
app.post("/categorias_gastos", (req, res) => db.run("INSERT INTO categorias_gastos (nombre) VALUES (?)", [req.body.nombre], () => res.json({success: true})));

// --- DEUDORES & PROVEEDORES ---
app.get("/clientes", (req, res) => db.all("SELECT c.*, SUM(f.monto) as total_deuda FROM clientes c LEFT JOIN fiados f ON c.id = f.cliente_id GROUP BY c.id", (err, rows) => res.json(rows)));
app.post("/clientes", (req, res) => db.run("INSERT INTO clientes (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true})));
app.get("/fiados/:id", (req, res) => db.all("SELECT * FROM fiados WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => res.json(rows)));
app.post("/fiados", (req, res) => db.run("INSERT INTO fiados (cliente_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [req.body.cliente_id, req.body.monto, req.body.descripcion], () => res.json({success: true})));

app.get("/proveedores", (req, res) => db.all("SELECT p.*, SUM(m.monto) as total_deuda FROM proveedores p LEFT JOIN movimientos_proveedores m ON p.id = m.proveedor_id GROUP BY p.id", (err, rows) => res.json(rows)));
app.post("/proveedores", (req, res) => db.run("INSERT INTO proveedores (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true})));
app.get("/movimientos_proveedores/:id", (req, res) => db.all("SELECT * FROM movimientos_proveedores WHERE proveedor_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => res.json(rows)));
app.post("/movimientos_proveedores", (req, res) => db.run("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [req.body.proveedor_id, req.body.monto, req.body.descripcion], () => res.json({success: true})));

// --- CAJA ---
app.post("/apertura", (req, res) => db.run("INSERT INTO aperturas (monto, observacion, fecha) VALUES (?, ?, datetime('now', 'localtime'))", [req.body.monto, req.body.observacion], () => res.json({success: true})));
app.get("/backup", (req, res) => res.download(path.join(__dirname, "kiosco.db"), `Respaldo_Kiosco_${Date.now()}.db`));

// --- RESUMEN DEL DÍA ---
app.get("/resumen_dia_independiente", (req, res) => {
    const sqlFechaGeneral = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'GENERAL')";
    const sqlFechaCig = "(SELECT IFNULL(MAX(fecha), '1900-01-01') FROM cierres WHERE tipo = 'CIGARRILLOS')";

    const sqlApertura = `SELECT monto FROM aperturas WHERE fecha > ${sqlFechaGeneral} ORDER BY id DESC LIMIT 1`;
    const sqlVentasGral = `SELECT SUM(pago_efectivo) as total FROM ventas WHERE categoria != 'cigarrillo' AND fecha > ${sqlFechaGeneral}`;
    const sqlVentasCig = `SELECT SUM(pago_efectivo) as total FROM ventas WHERE categoria = 'cigarrillo' AND fecha > ${sqlFechaCig}`; 
    const sqlDigital = `SELECT SUM(pago_digital) as total FROM ventas WHERE fecha > ${sqlFechaGeneral}`;
    const sqlGastos = `SELECT SUM(monto) as total FROM gastos WHERE fecha > ${sqlFechaGeneral}`;
    const sqlPagosProv = `SELECT SUM(monto) as total FROM movimientos_proveedores WHERE fecha > ${sqlFechaGeneral}`;
    const sqlCobros = `SELECT SUM(ABS(monto)) as total FROM fiados WHERE monto < 0 AND fecha > ${sqlFechaGeneral}`; 

    db.serialize(() => {
        let datos = {
            general: { saldo_inicial: 0, ventas: 0, cobros: 0, gastos: 0, pagos: 0, esperado: 0 },
            cigarrillos: { ventas: 0, esperado: 0 },
            digital: 0
        };

        db.get(sqlApertura, (err, row) => { if(row) datos.general.saldo_inicial = row.monto; });
        db.get(sqlVentasGral, (err, row) => { if(row) datos.general.ventas = row.total || 0; });
        db.get(sqlVentasCig, (err, row) => { if(row) datos.cigarrillos.ventas = row.total || 0; });
        db.get(sqlDigital, (err, row) => { if(row) datos.digital = row.total || 0; });
        db.get(sqlGastos, (err, row) => { if(row) datos.general.gastos = row.total || 0; });
        db.get(sqlPagosProv, (err, row) => { if(row) datos.general.pagos = row.total || 0; });
        db.get(sqlCobros, (err, row) => { 
            if(row) datos.general.cobros = row.total || 0; 
            datos.general.esperado = (datos.general.saldo_inicial || 0) + (datos.general.ventas || 0) + (datos.general.cobros || 0) - (datos.general.gastos || 0) - (datos.general.pagos || 0);
            datos.cigarrillos.esperado = datos.cigarrillos.ventas || 0;
            res.json(datos);
        });
    });
});

app.post("/cierres", (req, res) => {
    const { tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia } = req.body;
    db.run("INSERT INTO cierres (tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia, fecha) VALUES (?,?,?,?,?,?, datetime('now', 'localtime'))",
        [tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia],
        (err) => err ? res.status(500).json({ error: err.message }) : res.json({ success: true }));
});

app.get("/balance_rango", (req, res) => {
    const { desde, hasta } = req.query;
    if(!desde || !hasta) return res.status(400).json({error: "Faltan fechas"});
    const filtroFecha = `date(fecha) BETWEEN date('${desde}') AND date('${hasta}')`;

    const queries = {
        kiosco_efvo: `SELECT SUM(pago_efectivo) as t FROM ventas WHERE categoria != 'cigarrillo' AND ${filtroFecha}`,
        cigarros_efvo: `SELECT SUM(pago_efectivo) as t FROM ventas WHERE categoria = 'cigarrillo' AND ${filtroFecha}`,
        digital: `SELECT SUM(pago_digital) as t FROM ventas WHERE ${filtroFecha}`,
        cobros_deuda: `SELECT SUM(ABS(monto)) as t FROM fiados WHERE monto < 0 AND ${filtroFecha}`,
        gastos_varios: `SELECT SUM(monto) as t FROM gastos WHERE ${filtroFecha}`,
        pagos_proveedores: `SELECT SUM(monto) as t FROM movimientos_proveedores WHERE ${filtroFecha}`
    };

    let resultados = {};
    let completados = 0;
    const totalQueries = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], (err, row) => {
            resultados[key] = row?.t || 0;
            completados++;
            if(completados === totalQueries) {
                const total_ingresos = resultados.kiosco_efvo + resultados.cigarros_efvo + resultados.digital + resultados.cobros_deuda;
                const total_egresos = resultados.gastos_varios + resultados.pagos_proveedores;
                res.json({
                    ingresos: resultados,
                    total_ingresos, total_egresos, balance_neto: total_ingresos - total_egresos
                });
            }
        });
    });
});

app.get(/(.*)/, (req, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));
app.listen(port, () => console.log(`🚀 SERVIDOR CORREGIDO AHORA - http://localhost:${port}`));