const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("kiosco.db");

console.log("🌱 Iniciando carga masiva de datos...");

const categorias = ["Bebidas", "Golosinas", "Almacén", "Limpieza", "Lácteos", "Snacks", "Librería"];

const productos = [
  { n: "Coca Cola 1.5L", p: 1800, c: "Bebidas" }, { n: "Sprite 500ml", p: 1000, c: "Bebidas" },
  { n: "Agua Villavicencio", p: 800, c: "Bebidas" }, { n: "Cerveza Quilmes", p: 2500, c: "Bebidas" },
  { n: "Alfajor Jorgito", p: 600, c: "Golosinas" }, { n: "Chicle Beldent", p: 300, c: "Golosinas" },
  { n: "Chocolate Block", p: 2100, c: "Golosinas" }, { n: "Caramelos Sugus", p: 100, c: "Golosinas" },
  { n: "Yerba Playadito", p: 3500, c: "Almacén" }, { n: "Azúcar Ledesma", p: 1200, c: "Almacén" },
  { n: "Fideos Matarazzo", p: 1100, c: "Almacén" }, { n: "Arroz Gallo", p: 1300, c: "Almacén" },
  { n: "Lavandina Ayudin", p: 1500, c: "Limpieza" }, { n: "Detergente Ala", p: 2000, c: "Limpieza" },
  { n: "Leche Serenísima", p: 1600, c: "Lácteos" }, { n: "Yogur Bebible", p: 1400, c: "Lácteos" },
  { n: "Papas Lays", p: 1900, c: "Snacks" }, { n: "Cheetos", p: 1800, c: "Snacks" },
  { n: "Cuaderno Rivadavia", p: 4500, c: "Librería" }, { n: "Birome Bic", p: 500, c: "Librería" }
];

const cigarrillos = [
  { n: "Marlboro Box 20", p: 3900, qr: 4500 }, { n: "Philip Morris 20", p: 3500, qr: 4000 },
  { n: "Chesterfield 20", p: 3200, qr: 3700 }, { n: "Camel Box", p: 4000, qr: 4600 },
  { n: "Lucky Strike", p: 3800, qr: 4300 }
];

const metodos = ["Efectivo", "Efectivo", "Efectivo", "QR", "Debito", "Transferencia"]; // Más prob. de efectivo

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().slice(0, 19).replace('T', ' ');
}

db.serialize(() => {
  // 1. Insertar Categorías
  const stmtCat = db.prepare("INSERT OR IGNORE INTO categorias_productos (nombre) VALUES (?)");
  categorias.forEach(c => stmtCat.run(c));
  stmtCat.finalize();
  console.log("✅ Categorías cargadas");

  // 2. Insertar Productos (50 copias variando un poco)
  const stmtProd = db.prepare("INSERT INTO productos (nombre, precio, stock, categoria) VALUES (?, ?, ?, ?)");
  for (let i = 0; i < 50; i++) {
    const base = productos[Math.floor(Math.random() * productos.length)];
    stmtProd.run(`${base.n} (Lote ${i})`, base.p + i*10, Math.floor(Math.random() * 50), base.c);
  }
  stmtProd.finalize();
  console.log("✅ 50 Productos cargados");

  // 3. Insertar Cigarrillos
  const stmtCig = db.prepare("INSERT INTO cigarrillos (nombre, precio, precio_qr, stock) VALUES (?, ?, ?, ?)");
  cigarrillos.forEach(c => stmtCig.run(c.n, c.p, c.qr, 20));
  stmtCig.finalize();
  console.log("✅ Cigarrillos cargados");

  // 4. GENERAR 1000 VENTAS (Últimos 30 días)
  console.log("⏳ Generando 1000 ventas históricas (esto puede tardar unos segundos)...");
  db.run("BEGIN TRANSACTION");
  const stmtVenta = db.prepare("INSERT INTO ventas (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)");
  
  const hoy = new Date();
  const haceUnMes = new Date();
  haceUnMes.setDate(hoy.getDate() - 30);

  for (let i = 0; i < 1000; i++) {
    const esCigarro = Math.random() > 0.8; // 20% prob de cigarro
    let item, precio, cat;

    if (esCigarro) {
        item = cigarrillos[Math.floor(Math.random() * cigarrillos.length)];
        cat = "cigarrillo";
        precio = item.p; 
    } else {
        item = productos[Math.floor(Math.random() * productos.length)];
        cat = "general";
        precio = item.p;
    }
    
    const metodo = metodos[Math.floor(Math.random() * metodos.length)];
    // Si es cigarro y no efectivo, subir precio (simulado)
    if(cat === "cigarrillo" && metodo !== "Efectivo") precio = item.qr || item.p * 1.2;

    const fecha = randomDate(haceUnMes, hoy);
    
    stmtVenta.run(Date.now() + i, item.n, 1, precio, metodo, cat, fecha);
  }
  stmtVenta.finalize();
  db.run("COMMIT");
  console.log("✅ 1000 Ventas generadas exitosamente");

  // 5. Insertar Gastos
  const stmtGasto = db.prepare("INSERT INTO gastos (monto, descripcion, categoria, fecha) VALUES (?, ?, ?, ?)");
  for(let i=0; i<20; i++) {
     const fecha = randomDate(haceUnMes, hoy);
     stmtGasto.run(Math.floor(Math.random() * 5000)+1000, "Gasto Vario Prueba", "General", fecha);
  }
  stmtGasto.finalize();
  console.log("✅ Gastos cargados");

});

db.close(() => {
    console.log("🚀 ¡CARGA FINALIZADA! Ya puedes iniciar el sistema.");
});