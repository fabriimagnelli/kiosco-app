const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// 1. CONECTAR FRONTEND (Carpeta dist)
app.use(express.static(path.join(__dirname, "../dist")));

// 2. BASE DE DATOS
const db = new sqlite3.Database("kiosco.db", (err) => {
  if (err) console.error("Error DB:", err.message);
  else console.log("Conectado a la base de datos SQLite.");
});

// --- CREACIÓN DE TABLAS ---
db.serialize(() => {
  // Usuarios
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT UNIQUE, password TEXT)`);
  
  // Productos y Categorías
  db.run(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, stock INTEGER, categoria TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias_productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);
  
  // Cigarrillos
  db.run(`CREATE TABLE IF NOT EXISTS cigarrillos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, precio_qr REAL, stock INTEGER)`);
  
  // Ventas
  db.run(`CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id TEXT, producto TEXT, cantidad INTEGER, 
    precio_total REAL, metodo_pago TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Gastos
  db.run(`CREATE TABLE IF NOT EXISTS gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, descripcion TEXT, categoria TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS categorias_gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT)`);

  // Clientes y Fiados
  db.run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS fiados (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  // Proveedores
  db.run(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, telefono TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS movimientos_proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, proveedor_id INTEGER, monto REAL, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  
  // Aperturas
  db.run(`CREATE TABLE IF NOT EXISTS aperturas (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, observacion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  // Usuario Admin por defecto
  db.get("SELECT count(*) as count FROM usuarios", (err, row) => {
      if (row && row.count === 0) {
          db.run("INSERT INTO usuarios (usuario, password) VALUES (?, ?)", ["admin", "1234"]);
          console.log("✅ Admin creado: admin / 1234");
      }
  });

  // Categorías de Gastos por defecto (Soluciona el botón vacío)
  db.get("SELECT count(*) as count FROM categorias_gastos", (err, row) => {
      if (row && row.count === 0) {
          const cats = ["Mercadería", "Luz", "Internet", "Alquiler", "Limpieza", "Varios"];
          cats.forEach(c => db.run("INSERT INTO categorias_gastos (nombre) VALUES (?)", [c]));
      }
  });

  console.log("Tablas verificadas correctamente.");
});

// ==========================================
// RUTAS (ENDPOINTS) - AQUÍ ESTABA EL PROBLEMA
// ==========================================

// --- LOGIN ---
app.post("/login", (req, res) => {
  const { usuario, password } = req.body;
  db.get("SELECT * FROM usuarios WHERE usuario = ? AND password = ?", [usuario, password], (err, row) => {
    if (row) res.json({ success: true, usuario: row.usuario });
    else res.status(401).json({ success: false, message: "Error credenciales" });
  });
});

// --- DASHBOARD ---
app.get("/dashboard", (req, res) => {
  const sqlVentas = `SELECT SUM(precio_total) as total, COUNT(*) as tickets FROM ventas WHERE date(fecha) = date('now', 'localtime')`;
  const sqlGastos = `SELECT SUM(monto) as total FROM gastos WHERE date(fecha) = date('now', 'localtime')`;
  const sqlStockBajo = `SELECT nombre, stock FROM productos WHERE stock <= 5 UNION SELECT nombre, stock FROM cigarrillos WHERE stock <= 5`;

  db.get(sqlVentas, [], (err, v) => {
    db.get(sqlGastos, [], (err, g) => {
        db.all(sqlStockBajo, [], (err, s) => {
            res.json({ ventas_hoy: v?.total || 0, tickets_hoy: v?.tickets || 0, gastos_hoy: g?.total || 0, bajo_stock: s || [] });
        });
    });
  });
});

// --- PRODUCTOS ---
app.get("/productos", (req, res) => db.all("SELECT * FROM productos", (err, r) => res.json(r)));
app.post("/productos", (req, res) => {
    const { nombre, precio, stock, categoria } = req.body;
    db.run("INSERT INTO productos (nombre, precio, stock, categoria) VALUES (?,?,?,?)", [nombre, precio, stock, categoria], (err) => res.json({id: this.lastID}));
});
app.put("/productos/:id", (req, res) => {
    const { nombre, precio, stock, categoria } = req.body;
    db.run("UPDATE productos SET nombre=?, precio=?, stock=?, categoria=? WHERE id=?", [nombre, precio, stock, categoria, req.params.id], () => res.json({success: true}));
});
app.delete("/productos/:id", (req, res) => {
    db.run("DELETE FROM productos WHERE id = ?", [req.params.id], () => res.json({success: true}));
});

// --- CATEGORIAS PRODUCTOS ---
app.get("/categorias_productos", (req, res) => db.all("SELECT * FROM categorias_productos", (err, r) => res.json(r)));
app.post("/categorias_productos", (req, res) => {
    db.run("INSERT INTO categorias_productos (nombre) VALUES (?)", [req.body.nombre], () => res.json({success: true}));
});

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
app.delete("/cigarrillos/:id", (req, res) => {
    db.run("DELETE FROM cigarrillos WHERE id = ?", [req.params.id], () => res.json({success: true}));
});

// --- VENTAS (REGISTRAR Y DESCONTAR STOCK) ---
app.post("/ventas", (req, res) => {
  const { productos, metodo_pago } = req.body;
  if (!productos || productos.length === 0) return res.status(400).json({ error: "Vacío" });

  const ticket_id = Date.now().toString(); 
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const stmtVenta = db.prepare("INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))");
    const stmtStockProd = db.prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
    const stmtStockCig = db.prepare("UPDATE cigarrillos SET stock = stock - ? WHERE id = ?");

    productos.forEach((item) => {
      stmtVenta.run(ticket_id, item.nombre, item.cantidad, item.precio * item.cantidad, metodo_pago, item.tipo || 'General');
      if (item.tipo === "cigarrillo") stmtStockCig.run(item.cantidad, item.id);
      else stmtStockProd.run(item.cantidad, item.id);
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

// --- HISTORIAL VENTAS (REPORTES) ---
app.get("/historial", (req, res) => {
    db.all("SELECT * FROM ventas ORDER BY fecha DESC", (err, rows) => res.json(rows));
});

// --- GASTOS ---
app.get("/gastos", (req, res) => db.all("SELECT * FROM gastos ORDER BY fecha DESC LIMIT 50", (err, r) => res.json(r)));
app.post("/gastos", (req, res) => {
    const { monto, descripcion, categoria } = req.body;
    db.run("INSERT INTO gastos (monto, descripcion, categoria, fecha) VALUES (?, ?, ?, datetime('now', 'localtime'))", [monto, descripcion, categoria], () => res.json({success: true}));
});
app.delete("/gastos/:id", (req, res) => {
    db.run("DELETE FROM gastos WHERE id=?", [req.params.id], () => res.json({success: true}));
});
// Categorías de Gastos
app.get("/categorias_gastos", (req, res) => db.all("SELECT * FROM categorias_gastos", (err, r) => res.json(r)));
app.post("/categorias_gastos", (req, res) => {
    db.run("INSERT INTO categorias_gastos (nombre) VALUES (?)", [req.body.nombre], () => res.json({success: true}));
});

// --- DEUDORES (CLIENTES) ---
app.get("/clientes", (req, res) => {
    // Traemos cliente + cálculo de deuda total
    const sql = `
      SELECT c.*, SUM(f.monto) as total_deuda 
      FROM clientes c 
      LEFT JOIN fiados f ON c.id = f.cliente_id 
      GROUP BY c.id
    `;
    db.all(sql, (err, rows) => res.json(rows));
});
app.post("/clientes", (req, res) => {
    db.run("INSERT INTO clientes (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true}));
});

// Movimientos Fiados
app.get("/fiados/:id", (req, res) => {
    db.all("SELECT * FROM fiados WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => res.json(rows));
});
app.post("/fiados", (req, res) => {
    const { cliente_id, monto, descripcion } = req.body;
    db.run("INSERT INTO fiados (cliente_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [cliente_id, monto, descripcion], () => res.json({success: true}));
});

// --- PROVEEDORES ---
app.get("/proveedores", (req, res) => {
    const sql = `
      SELECT p.*, SUM(m.monto) as total_deuda 
      FROM proveedores p 
      LEFT JOIN movimientos_proveedores m ON p.id = m.proveedor_id 
      GROUP BY p.id
    `;
    db.all(sql, (err, rows) => res.json(rows));
});
app.post("/proveedores", (req, res) => {
    db.run("INSERT INTO proveedores (nombre, telefono) VALUES (?,?)", [req.body.nombre, req.body.telefono], () => res.json({success: true}));
});

// Movimientos Proveedores
app.get("/movimientos_proveedores/:id", (req, res) => {
    db.all("SELECT * FROM movimientos_proveedores WHERE proveedor_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => res.json(rows));
});
app.post("/movimientos_proveedores", (req, res) => {
    const { proveedor_id, monto, descripcion } = req.body;
    db.run("INSERT INTO movimientos_proveedores (proveedor_id, monto, descripcion, fecha) VALUES (?,?,?, datetime('now', 'localtime'))", [proveedor_id, monto, descripcion], () => res.json({success: true}));
});

// --- APERTURA DE CAJA ---
app.post("/apertura", (req, res) => {
    const { monto, observacion } = req.body;
    db.run("INSERT INTO aperturas (monto, observacion, fecha) VALUES (?, ?, datetime('now', 'localtime'))", [monto, observacion], () => res.json({success: true}));
});

// --- BACKUP ---
app.get("/backup", (req, res) => {
  const rutaDB = path.join(__dirname, "kiosco.db");
  const nombreArchivo = `Respaldo_Kiosco_${Date.now()}.db`;
  res.download(rutaDB, nombreArchivo);
});

// ==========================================
// RUTAS FALTANTES PARA CIERRE Y BALANCE
// ==========================================

// 1. Crear tabla de CIERRES si no existe (Agrégalo junto a las otras tablas o déjalo aquí)
db.run(`CREATE TABLE IF NOT EXISTS cierres (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    tipo TEXT, 
    total_ventas REAL, 
    total_gastos REAL, 
    total_sistema REAL, 
    total_fisico REAL, 
    diferencia REAL, 
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 2. Ruta: RESUMEN DEL DÍA (Para el Cierre de Caja)
app.get("/resumen_dia_independiente", (req, res) => {
    const hoy = "date('now', 'localtime')";
    
    // Consultas SQL auxiliares
    const sqlApertura = `SELECT monto FROM aperturas WHERE date(fecha) = ${hoy} ORDER BY id DESC LIMIT 1`;
    const sqlVentasGral = `SELECT SUM(precio_total) as total FROM ventas WHERE categoria != 'cigarrillo' AND metodo_pago = 'Efectivo' AND date(fecha) = ${hoy}`;
    const sqlVentasCig = `SELECT SUM(precio_total) as total FROM ventas WHERE categoria = 'cigarrillo' AND metodo_pago = 'Efectivo' AND date(fecha) = ${hoy}`;
    const sqlDigital = `SELECT SUM(precio_total) as total FROM ventas WHERE metodo_pago != 'Efectivo' AND date(fecha) = ${hoy}`;
    const sqlGastos = `SELECT SUM(monto) as total FROM gastos WHERE date(fecha) = ${hoy}`;
    const sqlPagosProv = `SELECT SUM(monto) as total FROM movimientos_proveedores WHERE date(fecha) = ${hoy}`; // Asumiendo pagos positivos
    // Asumimos que "Cobros" son pagos de deudores (fiados negativos o lógica similar). Si no usas pagos en fiados, esto será 0.
    const sqlCobros = `SELECT SUM(ABS(monto)) as total FROM fiados WHERE monto < 0 AND date(fecha) = ${hoy}`; 

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
            
            // CÁLCULOS FINALES
            datos.general.esperado = datos.general.saldo_inicial + datos.general.ventas + datos.general.cobros - datos.general.gastos - datos.general.pagos;
            datos.cigarrillos.esperado = datos.cigarrillos.ventas;

            res.json(datos);
        });
    });
});

// 3. Ruta: GUARDAR CIERRE
app.post("/cierres", (req, res) => {
    const { tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia } = req.body;
    db.run(
        "INSERT INTO cierres (tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia, fecha) VALUES (?,?,?,?,?,?, datetime('now', 'localtime'))",
        [tipo, total_ventas, total_gastos, total_sistema, total_fisico, diferencia],
        (err) => {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true });
        }
    );
});

// 4. Ruta: BALANCE POR RANGO DE FECHAS
app.get("/balance_rango", (req, res) => {
    const { desde, hasta } = req.query;
    if(!desde || !hasta) return res.status(400).json({error: "Faltan fechas"});

    const filtroFecha = `date(fecha) BETWEEN date('${desde}') AND date('${hasta}')`;

    const queries = {
        kiosco_efvo: `SELECT SUM(precio_total) as t FROM ventas WHERE categoria != 'cigarrillo' AND metodo_pago = 'Efectivo' AND ${filtroFecha}`,
        cigarros_efvo: `SELECT SUM(precio_total) as t FROM ventas WHERE categoria = 'cigarrillo' AND metodo_pago = 'Efectivo' AND ${filtroFecha}`,
        digital: `SELECT SUM(precio_total) as t FROM ventas WHERE metodo_pago != 'Efectivo' AND ${filtroFecha}`,
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
                    ingresos: {
                        kiosco_efvo: resultados.kiosco_efvo,
                        cigarros_efvo: resultados.cigarros_efvo,
                        digital: resultados.digital,
                        cobros_deuda: resultados.cobros_deuda
                    },
                    egresos: {
                        gastos_varios: resultados.gastos_varios,
                        pagos_proveedores: resultados.pagos_proveedores
                    },
                    total_ingresos,
                    total_egresos,
                    balance_neto: total_ingresos - total_egresos
                });
            }
        });
    });
});

// --- SERVIR FRONTEND ---
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Servidor Kiosco arreglado corriendo en http://localhost:${port}`);
});