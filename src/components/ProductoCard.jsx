import React from "react";

const esMetodoDigital = (metodo) => ['Mercado Pago', 'Débito', 'Transferencia'].includes(metodo);

const formatMoney = (value) => `$ ${Number(value || 0).toLocaleString("es-AR")}`;

// Tarjeta de producto memoizada: al no depender de todo el estado de Ventas,
// evita que la grilla entera se vuelva a renderizar en cada tecla del buscador.
function ProductoCard({ prod, metodo, onAgregar }) {
  const digital = esMetodoDigital(metodo);

  const stock = prod.stock;
  const sinStockDefinido = stock === '-' || stock == null;
  const stockTexto = stock === 0 ? 'Agotado' : sinStockDefinido ? '—' : stock > 99 ? '+99' : String(stock);
  const stockClase =
    stock === 0
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : stock > 0 && stock <= 5
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : 'bg-slate-100 text-slate-600 border border-slate-200';

  const categoria = prod.categoria || prod.tipo || 'Producto';
  const catClase =
    prod.tipo === 'Cigarrillo' ? 'bg-orange-50 text-orange-600'
    : prod.tipo === 'Promo' ? 'bg-purple-50 text-purple-600'
    : 'bg-blue-50 text-blue-600';

  return (
    <button
      onClick={() => onAgregar(prod)}
      className="bg-white/80 backdrop-blur-xl p-3.5 rounded-xl border border-black/[0.04] shadow-sm hover:border-blue-400 hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between text-left group h-[110px]"
      title={prod.nombre}
    >
      <div className="flex items-start justify-between gap-2 min-w-0 w-full">
        <p className="line-clamp-2 h-10 font-medium text-slate-800 text-sm min-w-0">{prod.nombre}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 whitespace-nowrap ${stockClase}`}>{stockTexto}</span>
      </div>
      <div className="flex items-end justify-between w-full mt-auto">
        {prod.tipo === 'Cigarrillo' && prod.precio_qr && prod.precio_qr !== prod.precio ? (
          <div>
            <p className={`text-base font-semibold leading-tight ${digital ? 'text-slate-400 text-xs line-through' : 'text-slate-900'}`}>{formatMoney(prod.precio)} <span className="text-[10px] font-normal text-slate-400">Efvo</span></p>
            <p className={`text-base font-semibold leading-tight ${digital ? 'text-blue-600' : 'text-slate-400 text-xs line-through'}`}>{formatMoney(prod.precio_qr)} <span className="text-[10px] font-normal text-slate-400">Digital</span></p>
          </div>
        ) : (
          <p className="text-lg font-extrabold text-slate-900 tracking-tight">{formatMoney(prod.precio)}</p>
        )}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${catClase}`}>{categoria}</span>
      </div>
    </button>
  );
}

export default React.memo(ProductoCard);