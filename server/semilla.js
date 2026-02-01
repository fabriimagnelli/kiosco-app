const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// USAR __dirname PARA ASEGURAR QUE LEEMOS LA DB CORRECTA
const dbPath = path.join(__dirname, "kiosco.db");
const db = new sqlite3.Database(dbPath);

console.log("🚀 Iniciando carga MASIVA de datos para pruebas de estrés...");

// --- GENERADORES DE DATOS ---

const marcas = ["Coca Cola", "Pepsi", "Arcor", "Bagley", "Lays", "Serenísima", "Villavicencio", "Baggio", "Milka", "Terrabusi", "Luchetti", "Knorr", "Paty", "Brahma", "Quilmes"];
const tipos = ["Gaseosa", "Alfajor", "Galletitas", "Papas Fritas", "Yogur", "Agua", "Jugo", "Chocolate", "Fideos", "Arroz", "Cerveza", "Puré de Tomate"];
const variantes = ["1.5L", "500ml", "Original", "Light", "Zero", "Grande", "Mediano", "Pack", "500g", "1kg"];
const categorias = ["Bebidas", "Golosinas", "Almacén", "Lácteos", "Snacks", "Limpieza"];

const nombres = ["Juan", "Maria", "Pedro", "Ana", "Luis", "Laura", "Carlos", "Sofia", "Miguel", "Lucia", "Jorge", "Valentina", "Diego", "Paula", "Martin", "Elena"];
const apellidos = ["Perez", "Garcia", "Lopez", "Martinez", "Gonzalez", "Rodriguez", "Fernandez", "Silva", "Luna", "Gomez", "Diaz", "Romero", "Sosa", "Torres"];

const metodos = ["Efectivo", "Efectivo", "Efectivo", "Transferencia", "Debito", "Mixto"]; 

// --- FUNCIONES AUXILIARES ---

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDate(diasAtras) {
  const hoy = new Date();
  const pasada = new Date();
  pasada.setDate(hoy.getDate() - diasAtras);
  const fechaAleatoria = new Date(pasada.getTime() + Math.random() * (hoy.getTime() - pasada.getTime()));
  
  // Formato YYYY-MM-DD HH:MM:SS
  const pad = (n) => n.toString().padStart(2, '0');
  return `${fechaAleatoria.getFullYear()}-${pad(fechaAleatoria.getMonth()+1)}-${pad(fechaAleatoria.getDate())} ${pad(fechaAleatoria.getHours())}:${pad(fechaAleatoria.getMinutes())}:${pad(fechaAleatoria.getSeconds())}`;
}

// --- ARRAYS GENERADOS ---

let productosBase = [];
// Generar 60 productos variados
for(let i=0; i<60; i++) {
    const marca = randomItem(marcas);
    const tipo = randomItem(tipos);
    const variante = randomItem(variantes);
    const nombre = `${tipo} ${marca} ${variante}`;
    const precio = randomInt(500, 8000);
    const costo = Math.floor(precio * 0.6); // 40% margen
    productosBase.push({
        n: nombre, 
        p: precio, 
        c: costo, 
        cat: randomItem(categorias),
        stock: randomInt(20, 200) // Stock inicial alto para aguantar las ventas
    });
}

const cigarrillosBase = [
  { n: "Marlboro Box 20", p: 4200, c: 3800 },
  { n: "Marlboro Gold 20", p: 4200, c: 3800 },
  { n: "Philip Morris Box 20", p: 3900, c: 3500 },
  { n: "Philip Morris Caps", p: 4000, c: 3600 },
  { n: "Chesterfield 20", p: 3500, c: 3100 },
  { n: "Camel Box 20", p: 4200, c: 3800 },
  { n: "Lucky Strike", p: 4000, c: 3600 },
  { n: "Parliament", p: 5500, c: 4800 }
];

const proveedores = [
  { n: "Coca Cola Distribuidora", r: "Bebidas" },
  { n: "Arcor Directo", r: "Golosinas" },
  { n: "Massalin Particulares", r: "Cigarrillos" },
  { n: "Mayorista El Tío", r: "Almacén" },
  { n: "Lácteos del Sur", r: "Lácteos" },
  { n: "Cervecería Quilmes", r: "Bebidas" }
];


db.serialize(() => {
  db.run("BEGIN TRANSACTION");

  console.log("👥 Generando clientes...");
  const stmtCli = db.prepare("INSERT INTO clientes (nombre, telefono, direccion) VALUES (?,?,?)");
  for(let i=0; i<40; i++) {
      const nombre = `${randomItem(nombres)} ${randomItem(apellidos)}`;
      stmtCli.run(nombre, `351${randomInt(100000, 999999)}`, `Calle Falsa ${randomInt(1, 1000)}`);
  }
  stmtCli.finalize();

  console.log("🚚 Generando proveedores...");
  const stmtProv = db.prepare("INSERT INTO proveedores (nombre, rubro) VALUES (?,?)");
  proveedores.forEach(p => stmtProv.run(p.n, p.r));
  stmtProv.finalize();

  console.log("📦 Generando inventario de productos...");
  const stmtProd = db.prepare("INSERT INTO productos (nombre, precio, costo, stock, categoria, codigo_barras) VALUES (?,?,?,?,?,?)");
  productosBase.forEach((p, i) => {
    stmtProd.run(p.n, p.p, p.c, p.stock, p.cat, `779${randomInt(100000000, 999999999)}`);
  });
  stmtProd.finalize();

  console.log("🚬 Generando stock de cigarrillos...");
  const stmtCig = db.prepare("INSERT INTO cigarrillos (nombre, precio, costo, stock, pack) VALUES (?,?,?,?, '20')");
  cigarrillosBase.forEach(c => stmtCig.run(c.n, c.p, c.c, randomInt(50, 150)));
  stmtCig.finalize();

  // --- VENTAS MASIVAS ---
  const CANTIDAD_VENTAS = 3500; // Número de tickets a generar
  const DIAS_HISTORIAL = 180;   // Últimos 6 meses

  console.log(`💰 Generando ${CANTIDAD_VENTAS} ventas históricas (esto tomará unos segundos)...`);
  
  const stmtVenta = db.prepare(`
    INSERT INTO ventas 
    (ticket_id, producto, cantidad, precio_total, metodo_pago, categoria, fecha, pago_efectivo, pago_digital, editado, cierre_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
  `);

  let ticketId = 1;

  for (let i = 0; i < CANTIDAD_VENTAS; i++) {
    const itemsEnTicket = randomInt(1, 6); // 1 a 6 productos por ticket
    const metodo = randomItem(metodos);
    const fecha = randomDate(DIAS_HISTORIAL);

    let totalTicket = 0;
    let itemsParaInsertar = [];

    for (let j = 0; j < itemsEnTicket; j++) {
      const esCigarro = Math.random() > 0.85; // 15% prob de que sea cigarro
      let item, categoria;

      if (esCigarro) {
        item = randomItem(cigarrillosBase);
        categoria = "Cigarrillo";
      } else {
        item = randomItem(productosBase);
        categoria = item.cat;
      }

      const cantidad = randomInt(1, 3);
      const subtotal = item.p * cantidad;
      totalTicket += subtotal;

      itemsParaInsertar.push({ nombre: item.n, cantidad: cantidad, cat: categoria });
    }

    // Calcular desglose de pagos
    let pagoEfvo = 0;
    let pagoDig = 0;

    if (metodo === "Efectivo") {
        pagoEfvo = totalTicket;
    } else if (metodo === "Mixto") {
        pagoEfvo = Math.floor(totalTicket / 2);
        pagoDig = totalTicket - pagoEfvo;
    } else {
        pagoDig = totalTicket;
    }

    // Insertar cada item del ticket
    itemsParaInsertar.forEach(it => {
      stmtVenta.run(
        ticketId,
        it.nombre,
        it.cantidad,
        totalTicket,
        metodo,
        it.cat,
        fecha,
        pagoEfvo,
        pagoDig
      );
    });

    ticketId++;
    
    if (i % 500 === 0) process.stdout.write("."); // Barra de progreso simple
  }
  console.log(""); // Salto de linea
  stmtVenta.finalize();

  // --- GASTOS ---
  console.log("💸 Generando gastos variados...");
  const conceptosGastos = ["Limpieza", "Bolsas", "Luz", "Internet", "Alquiler", "Proveedor Varios", "Mantenimiento"];
  const stmtGasto = db.prepare("INSERT INTO gastos (descripcion, monto, categoria, metodo_pago, fecha) VALUES (?, ?, ?, ?, ?)");
  
  for(let i=0; i<300; i++) {
     const concepto = randomItem(conceptosGastos);
     let monto = randomInt(2000, 15000);
     if (concepto === "Alquiler") monto = 150000;
     
     stmtGasto.run(
         `Gasto ${concepto}`, 
         monto, 
         "Varios", 
         randomItem(["Efectivo", "Debito"]), 
         randomDate(DIAS_HISTORIAL)
     );
  }
  stmtGasto.finalize();

  db.run("COMMIT", () => {
    console.log(`\n✨ ¡CARGA COMPLETA!\n- Clientes: 40\n- Productos: ~60\n- Ventas: ${CANTIDAD_VENTAS} tickets\n- Gastos: 300\n\nReinicia el servidor para ver los datos.`);
    db.close();
  });
});