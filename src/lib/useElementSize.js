import { useCallback, useLayoutEffect, useRef, useState } from "react";

// Mide el ancho/alto real de un elemento usando ResizeObserver, para poder
// calcular en tiempo real cuántas tarjetas de producto entran sin generar scroll.
export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleResize = useCallback((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const { width, height } = entry.contentRect;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleResize]);

  return [ref, size];
}
