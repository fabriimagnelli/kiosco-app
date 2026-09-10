// Script de generación de datos de prueba masivos y coherentes para el Kiosco.
// Uso: node server/generar_datos_prueba.js
// Para apuntar a la base real usada por Electron en modo dev, ejecutar con:
//   IS_ELECTRON=true USER_DATA_PATH="%APPDATA%\sacware-kiosco" node generar_datos_prueba.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

let dbPath;
if (process.env.IS_ELECTRON === "true" && process.env.USER_DATA_PATH) {
  const userDataPath = process.env.USER_DATA_PATH;
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
  dbPath = path.join(userDataPath, "kiosco.db");
  console.log("[ELECTRON] Base de datos en:", dbPath);
} else {
  dbPath = path.join(__dirname, "kiosco.db");
  console.log("[LOCAL] Base de datos en:", dbPath);
}
const db = new sqlite3.Database(dbPath);

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) { if (err) reject(err); else resolve(this); });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

// --- HELPERS ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimales = 0) => {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimales));
};
const randomItem = (arr) => arr[randomInt(0, arr.length - 1)];

const FECHA_DESDE = new Date("2026-01-01T00:00:00");
const FECHA_HASTA = new Date(); // hoy

function fechaAleatoriaEntre(desde, hasta) {
  const t = desde.getTime() + Math.random() * (hasta.getTime() - desde.getTime());
  return new Date(t);
}

function formatearFechaSQLite(fecha) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;
}

// --- DATOS BASE ---
const PRODUCTOS_BASE = [
  { nombre: "Coca Cola 1.5L", categoria: "Bebidas" },
  { nombre: "Sprite 1.5L", categoria: "Bebidas" },
  { nombre: "Agua Villa del Sur 500ml", categoria: "Bebidas" },
  { nombre: "Cerveza Quilmes 1L", categoria: "Bebidas" },
  { nombre: "Alfajor Guaymallén", categoria: "Golosinas" },
  { nombre: "Alfajor Jorgito Triple", categoria: "Golosinas" },
  { nombre: "Chocolate Milka 100g", categoria: "Golosinas" },
  { nombre: "Caramelos Sugus", categoria: "Golosinas" },
  { nombre: "Chicles Beldent", categoria: "Golosinas" },
  { nombre: "Papas Lays 150g", categoria: "Snacks" },
  { nombre: "Palitos Salados 9 de Oro", categoria: "Snacks" },
  { nombre: "Barra de Cereal Cerealitas", categoria: "Snacks" },
  { nombre: "Galletitas Oreo", categoria: "Almacén" },
  { nombre: "Yogur Serenísima 200g", categoria: "Lácteos" },
  { nombre: "Fideos Matarazzo 500g", categoria: "Almacén" },
  { nombre: "Arroz Gallo Oro 1kg", categoria: "Almacén" },
  { nombre: "Café La Virginia 250g", categoria: "Almacén" },
  { nombre: "Yerba Mate Rosamonte 1kg", categoria: "Almacén" },
  { nombre: "Detergente Magistral", categoria: "Limpieza" },
  { nombre: "Papel Higiénico Higienol x4", categoria: "Limpieza" },
];

const CIGARRILLOS_BASE = [
  "Marlboro Box",
  "Philip Morris",
  "Camel Azul",
  "Lucky Strike",
  "Parliament Azul",
];

const NOMBRES_CLIENTES = [
  "Juan Pérez", "María García", "Pedro López", "Ana Martínez", "Luis González",
  "Laura Rodríguez", "Carlos Fernández", "Sofía Silva", "Miguel Torres", "Lucía Romero",
];

const PROVEEDORES_BASE = [
  { nombre: "Distribuidora Norte SRL", rubro: "Bebidas", dia_visita: "Lunes" },
  { nombre: "Golosinas del Sur", rubro: "Golosinas", dia_visita: "Martes" },
  { nombre: "Almacén Mayorista Central", rubro: "Almacén", dia_visita: "Miércoles" },
  { nombre: "Cigarrillera Nacional", rubro: "Cigarrillos", dia_visita: "Jueves" },
  { nombre: "Limpieza Total Distribuciones", rubro: "Limpieza", dia_visita: "Viernes" },
];

const METODOS_PAGO = ["Efectivo", "Mercado Pago", "Débito"];

const CONCEPTOS_GASTOS = [
  { descripcion: "Pago a proveedor", categoria: "Proveedores" },
  { descripcion: "Artículos de limpieza", categoria: "Limpieza" },
  { descripcion: "Pago de alquiler", categoria: "Alquiler" },
  { descripcion: "Factura de luz", categoria: "Servicios (Luz/Agua/Internet)" },
  { descripcion: "Factura de internet", categoria: "Servicios (Luz/Agua/Internet)" },
  { descripcion: "Sueldo empleado", categoria: "Sueldos" },
  { descripcion: "Compra de mercadería", categoria: "Mercadería" },
  { descripcion: "Mantenimiento heladera", categoria: "Mantenimiento" },
  { descripcion: "Pago de impuestos", categoria: "Impuestos" },
  { descripcion: "Retiro para gastos personales", categoria: "Retiros Personales" },
];

async function limpiarTablas() {
  const tablas = [
    "productos", "cigarrillos", "clientes", "proveedores",
    "ventas", "gastos", "fiados", "retiros", "historial_cierres", "caja_diaria",
  ];
  for (const tabla of tablas) {
    await dbRun(`DELETE FROM ${tabla}`);
  }
  const sequenceTable = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'");
  if (sequenceTable.length > 0) {
    await dbRun(`DELETE FROM sqlite_sequence WHERE name IN (${tablas.map(() => "?").join(",")})`, tablas);
  }
  console.log("🧹 Tablas limpiadas.");
}

async function insertarProductos() {
  const ids = [];
  for (const p of PRODUCTOS_BASE) {
    const precio = randomInt(500, 6000);
    const costo = Math.round(precio * randomFloat(0.55, 0.75, 2));
    const stock = randomInt(10, 150);
    const codigo = String(randomInt(7790000000000, 7799999999999));
    const r = await dbRun(
      "INSERT INTO productos (nombre, precio, costo, stock, codigo_barras, categoria) VALUES (?,?,?,?,?,?)",
      [p.nombre, precio, costo, stock, codigo, p.categoria]
    );
    ids.push({ id: r.lastID, nombre: p.nombre, precio, categoria: p.categoria });
  }
  console.log(`📦 ${ids.length} productos insertados.`);
  return ids;
}

async function insertarCigarrillos() {
  const ids = [];
  for (const nombre of CIGARRILLOS_BASE) {
    const precio = randomInt(2500, 4500);
    const precioQr = precio;
    const costo = Math.round(precio * 0.8);
    const stock = randomInt(20, 100);
    const codigo = String(randomInt(7780000000000, 7789999999999));
    const r = await dbRun(
      "INSERT INTO cigarrillos (nombre, precio, precio_qr, costo, stock, codigo_barras) VALUES (?,?,?,?,?,?)",
      [nombre, precio, precioQr, costo, stock, codigo]
    );
    ids.push({ id: r.lastID, nombre, precio });
  }
  console.log(`🚬 ${ids.length} cigarrillos insertados.`);
  return ids;
}

async function insertarClientes() {
  const ids = [];
  for (const nombre of NOMBRES_CLIENTES) {
    const telefono = `11${randomInt(20000000, 69999999)}`;
    const direccion = `Calle Falsa ${randomInt(100, 9999)}`;
    const email = nombre.toLowerCase().replace(/\s+/g, ".") + "@correo.com";
    const r = await dbRun(
      "INSERT INTO clientes (nombre, telefono, direccion, email) VALUES (?,?,?,?)",
      [nombre, telefono, direccion, email]
    );
    ids.push({ id: r.lastID, nombre });
  }
  console.log(`👥 ${ids.length} clientes insertados.`);
  return ids;
}

async function insertarProveedores() {
  let count = 0;
  for (const p of PROVEEDORES_BASE) {
    const telefono = `11${randomInt(20000000, 69999999)}`;
    const direccion = `Av. Siempreviva ${randomInt(100, 9999)}`;
    await dbRun(
      "INSERT INTO proveedores (nombre, telefono, direccion, dia_visita, rubro) VALUES (?,?,?,?,?)",
      [p.nombre, telefono, direccion, p.dia_visita, p.rubro]
    );
    count++;
  }
  console.log(`🚚 ${count} proveedores insertados.`);
}

async function insertarVentas(productos, cigarrillos, clientes) {
  const TOTAL_TICKETS = 300;
  const itemsDisponibles = [
    ...productos.map((p) => ({ ...p, tipo: "Producto" })),
    ...cigarrillos.map((c) => ({ ...c, tipo: "Cigarrillo" })),
  ];

  let filasInsertadas = 0;

  for (let ticketId = 1; ticketId <= TOTAL_TICKETS; ticketId++) {
    const fecha = formatearFechaSQLite(fechaAleatoriaEntre(FECHA_DESDE, FECHA_HASTA));
    const metodoPago = randomItem(METODOS_PAGO);
    const asignarCliente = Math.random() < 0.3;
    const clienteId = asignarCliente ? randomItem(clientes).id : null;

    const cantidadItemsTicket = randomInt(1, 4);
    for (let i = 0; i < cantidadItemsTicket; i++) {
      const item = randomItem(itemsDisponibles);
      const cantidad = randomInt(1, 3);
      const precioUnitario = item.precio;
      const precioTotal = precioUnitario * cantidad;
      const esEfectivo = metodoPago === "Efectivo";

      await dbRun(
        `INSERT INTO ventas
          (ticket_id, producto, cantidad, precio_total, precio_unitario, cliente_id, metodo_pago, categoria, fecha, pago_efectivo, pago_digital, editado)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,0)`,
        [
          ticketId, item.nombre, cantidad, precioTotal, precioUnitario, clienteId, metodoPago, item.tipo, fecha,
          esEfectivo ? precioTotal : 0,
          esEfectivo ? 0 : precioTotal,
        ]
      );
      filasInsertadas++;
    }
  }

  console.log(`🧾 ${TOTAL_TICKETS} tickets generados (${filasInsertadas} filas de venta).`);
}

async function insertarGastos() {
  const TOTAL_GASTOS = 50;
  for (let i = 0; i < TOTAL_GASTOS; i++) {
    const concepto = randomItem(CONCEPTOS_GASTOS);
    const monto = randomInt(1000, 80000);
    const metodoPago = randomItem(METODOS_PAGO);
    const fecha = formatearFechaSQLite(fechaAleatoriaEntre(FECHA_DESDE, FECHA_HASTA));
    await dbRun(
      "INSERT INTO gastos (descripcion, monto, categoria, fecha, metodo_pago) VALUES (?,?,?,?,?)",
      [concepto.descripcion, monto, concepto.categoria, fecha, metodoPago]
    );
  }
  console.log(`💸 ${TOTAL_GASTOS} gastos insertados.`);
}

async function insertarFiados(clientes) {
  const TOTAL_FIADOS = 20;
  for (let i = 0; i < TOTAL_FIADOS; i++) {
    const cliente = randomItem(clientes);
    const monto = randomInt(500, 15000);
    const fecha = formatearFechaSQLite(fechaAleatoriaEntre(FECHA_DESDE, FECHA_HASTA));
    const pagado = Math.random() < 0.5 ? 1 : 0;
    const metodoPago = randomItem(METODOS_PAGO);
    await dbRun(
      "INSERT INTO fiados (cliente, cliente_id, monto, fecha, descripcion, pagado, metodo_pago) VALUES (?,?,?,?,?,?,?)",
      [cliente.nombre, cliente.id, monto, fecha, "Fiado - Compra en kiosco", pagado, metodoPago]
    );
  }
  console.log(`📒 ${TOTAL_FIADOS} fiados insertados.`);
}

(async () => {
  try {
    console.log("🚀 Generando datos de prueba...");
    await limpiarTablas();

    const productos = await insertarProductos();
    const cigarrillos = await insertarCigarrillos();
    const clientes = await insertarClientes();
    await insertarProveedores();

    await insertarVentas(productos, cigarrillos, clientes);
    await insertarGastos();
    await insertarFiados(clientes);

    console.log("¡Datos de prueba generados con éxito!");
  } catch (error) {
    console.error("❌ Error generando datos de prueba:", error);
  } finally {
    db.close();
  }
})();
