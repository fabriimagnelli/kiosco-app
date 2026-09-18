import React, { useEffect, useMemo, useState, useDeferredValue } from "react";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { useElementSize } from "../lib/useElementSize";
import ProductoCard from "./ProductoCard";

// Dimensiones de referencia (deben coincidir con las clases de ProductoCard)
const CARD_MIN_WIDTH = 150; // ancho mínimo legible de una tarjeta
const CARD_HEIGHT = 110;    // alto fijo de la tarjeta (h-[110px])
const GAP = 10;             // gap-2.5 = 0.625rem = 10px
const CONTROLS_HEIGHT = 36; // alto reservado para la barra de paginación

/**
 * Grilla de productos con paginación dinámica.
 * En vez de listar todo el catálogo con scroll vertical, mide el espacio
 * disponible en tiempo real (ResizeObserver) y calcula cuántas columnas x
 * filas entran sin recortarse, mostrando el resto en páginas siguientes.
 */
function ProductosGrid({ productos, metodo, onAgregar, busqueda }) {
  const deferredProductos = useDeferredValue(productos);
  const [containerRef, { width, height }] = useElementSize();
  const [pagina, setPagina] = useState(0);

  // Cuántas tarjetas entran por página según el tamaño real del contenedor
  const { columnas, porPagina } = useMemo(() => {
    if (!width || !height) return { columnas: 1, porPagina: 1 };
    const cols = Math.max(1, Math.floor((width + GAP) / (CARD_MIN_WIDTH + GAP)));
    const alturaUtil = Math.max(0, height - CONTROLS_HEIGHT);
    const filas = Math.max(1, Math.floor((alturaUtil + GAP) / (CARD_HEIGHT + GAP)));
    return { columnas: cols, porPagina: cols * filas };
  }, [width, height]);

  const totalPaginas = Math.max(1, Math.ceil(deferredProductos.length / porPagina));

  // Al buscar (o cambiar el tamaño de página) siempre se vuelve al inicio
  useEffect(() => {
    setPagina(0);
  }, [busqueda, porPagina]);

  // Si el catálogo se achica (venta, filtro, etc.) y la página quedó fuera de rango
  useEffect(() => {
    setPagina((p) => Math.min(p, totalPaginas - 1));
  }, [totalPaginas]);

  const productosPagina = useMemo(() => {
    const inicio = pagina * porPagina;
    return deferredProductos.slice(inicio, inicio + porPagina);
  }, [deferredProductos, pagina, porPagina]);

  // PageUp/PageDown para paginar sin chocar con el buscador (que usa el input de texto)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "PageDown") {
        e.preventDefault();
        setPagina((p) => Math.min(totalPaginas - 1, p + 1));
      } else if (e.key === "PageUp") {
        e.preventDefault();
        setPagina((p) => Math.max(0, p - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPaginas]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 grid content-start gap-2.5 transition-opacity duration-150 ${productos !== deferredProductos ? 'opacity-50' : 'opacity-100'}`}
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
      >
        {productosPagina.length === 0 ? (
          <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <PackageSearch size={40} />
            <p className="mt-2 text-sm">No se encontraron productos</p>
          </div>
        ) : (
          productosPagina.map((prod) => (
            <ProductoCard
              key={`${prod.tipo}-${prod.id ?? prod.nombre}`}
              prod={prod}
              metodo={metodo}
              onAgregar={onAgregar}
            />
          ))
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 shrink-0" style={{ height: CONTROLS_HEIGHT }}>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={pagina === 0}
            className="p-1.5 rounded-lg bg-white/80 border border-black/[0.04] shadow-sm disabled:opacity-30 hover:bg-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-medium text-[#86868b] tabular-nums">
            Página {pagina + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            disabled={pagina >= totalPaginas - 1}
            className="p-1.5 rounded-lg bg-white/80 border border-black/[0.04] shadow-sm disabled:opacity-30 hover:bg-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(ProductosGrid);
