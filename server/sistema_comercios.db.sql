BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "categoria_gasto" (
	"id"	INTEGER NOT NULL,
	"nombre"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "categorias" (
	"id"	INTEGER,
	"nombre"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "clientes_deudores" (
	"id"	INTEGER NOT NULL,
	"nombre"	TEXT NOT NULL,
	"telefono"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "detalle_ventas" (
	"id"	INTEGER NOT NULL,
	"venta_id"	INTEGER NOT NULL,
	"producto_id"	INTEGER NOT NULL,
	"cantidad"	REAL NOT NULL,
	"precio_historico"	REAL NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("producto_id") REFERENCES "productos"("id"),
	FOREIGN KEY("venta_id") REFERENCES "ventas"("id")
);
CREATE TABLE IF NOT EXISTS "fiados" (
	"id"	INTEGER NOT NULL,
	"cliente_id"	INTEGER NOT NULL,
	"monto"	REAL NOT NULL,
	"fecha"	TEXT NOT NULL,
	"estado"	TEXT DEFAULT 'pendiente',
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("cliente_id") REFERENCES "clientes_deudores"("id")
);
CREATE TABLE IF NOT EXISTS "gastos" (
	"id"	INTEGER NOT NULL,
	"descripcion"	TEXT,
	"monto"	REAL NOT NULL,
	"fecha"	TEXT NOT NULL,
	"categoria_gasto_id"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("categoria_gasto_id") REFERENCES "categoria_gasto"("id")
);
CREATE TABLE IF NOT EXISTS "medio_pago" (
	"id"	INTEGER,
	"nombre"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "movimientos_proveedores" (
	"id"	INTEGER NOT NULL,
	"proveedor_id"	INTEGER NOT NULL,
	"fecha"	TEXT NOT NULL,
	"monto"	REAL NOT NULL,
	"tipo"	TEXT NOT NULL,
	"saldo_restante"	REAL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("proveedor_id") REFERENCES "proveedores"("id")
);
CREATE TABLE IF NOT EXISTS "productos" (
	"id"	INTEGER NOT NULL,
	"nombre"	TEXT NOT NULL,
	"codigo_barras"	TEXT UNIQUE,
	"precio_costo"	REAL,
	"precio_venta"	REAL,
	"stock"	REAL,
	"es_fiambre"	INTEGER,
	"categoria_id"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("categoria_id") REFERENCES "categorias"("id")
);
CREATE TABLE IF NOT EXISTS "proveedores" (
	"id"	INTEGER,
	"nombre"	TEXT NOT NULL,
	"telefono"	NUMERIC,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "ventas" (
	"id"	INTEGER NOT NULL,
	"fecha"	TEXT NOT NULL,
	"total"	REAL,
	"medio_pago_id"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("medio_pago_id") REFERENCES "medio_pago"("id")
);
INSERT INTO "categorias" VALUES (1,'bebidas');
INSERT INTO "detalle_ventas" VALUES (1,1,1,2.0,1500.0);
INSERT INTO "medio_pago" VALUES (1,'mercado pago');
INSERT INTO "productos" VALUES (1,'coca cola 1,5L','779123456',1000.0,1500.0,24.0,0,1);
INSERT INTO "ventas" VALUES (1,'2025/12/17',1500.0,1);
COMMIT;
