import React from "react";

const esMetodoDigital = (metodo) => ['Mercado Pago', 'Débito', 'Transferencia'].includes(metodo);

// Tarjeta de producto memoizada: al no depender de todo el estado de Ventas,
// evita que la grilla entera se vuelva a renderizar en cada tecla del buscador.
function ProductoCard({ prod, metodo, onAgregar }) {
  const digital = esMetodoDigital(metodo);

  return (
    <button
      onClick={() => onAgregar(prod)}
      className="bg-white/80 backdrop-blur-xl p-3.5 rounded-xl border border-black/[0.04] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between text-left group h-[110px]"
      title={prod.nombre}
    >
      <div className="flex items-start justify-between gap-2 min-w-0 w-full">
        <p className="font-medium text-[#1d1d1f] leading-snug group-hover:text-[#007aff] line-clamp-2 min-w-0 text-[13px]">{prod.nombre}</p>
        <span className="text-[11px] text-[#86868b] whitespace-nowrap shrink-0">{prod.stock}</span>
      </div>
      <div className="flex items-end justify-between w-full mt-auto">
        {prod.tipo === 'Cigarrillo' && prod.precio_qr && prod.precio_qr !== prod.precio ? (
          <div>
            <p className={`text-base font-semibold leading-tight ${digital ? 'text-[#86868b] text-xs line-through' : 'text-[#1d1d1f]'}`}>$ {prod.precio} <span className="text-[10px] font-normal text-[#86868b]">Efvo</span></p>
            <p className={`text-base font-semibold leading-tight ${digital ? 'text-[#007aff]' : 'text-[#86868b] text-xs line-through'}`}>$ {prod.precio_qr} <span className="text-[10px] font-normal text-[#86868b]">Digital</span></p>
          </div>
        ) : (
          <p className="text-lg font-semibold text-[#1d1d1f]">$ {prod.precio}</p>
        )}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${prod.tipo === 'Cigarrillo' ? 'bg-orange-50 text-orange-500' : prod.tipo === 'Promo' ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-[#007aff]'}`}>
          {prod.tipo}
        </span>
      </div>
    </button>
  );
}

export default React.memo(ProductoCard);
